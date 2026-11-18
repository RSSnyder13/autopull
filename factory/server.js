#!/usr/bin/env node
// AI Rob local server: the GTM agent's homepage. Serves the page, the model,
// small direct edits, and two actions that hand work to the founder's own
// agent CLI: refresh and chat.
// Listens on localhost only. Run: node server.js
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const L = require("./lib.js");

const cfg = L.loadConfig();
const STATIC = { "/": "index.html", "/index.html": "index.html", "/engine.js": "engine.js" };
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8" };
let busy = null; // one agent run at a time

function send(res, code, body, type) {
  res.writeHead(code, { "Content-Type": type || "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}
function readBody(req) {
  return new Promise((resolve) => {
    let b = "";
    req.on("data", (c) => { b += c; if (b.length > 1e6) req.destroy(); });
    req.on("end", () => { try { resolve(b ? JSON.parse(b) : {}); } catch { resolve({}); } });
  });
}

// This server runs the founder's agent CLI, so lock it to its own origin.
// Host check defeats DNS rebinding (an attacker page keeps its own host header).
// On writes: a cross-origin browser request always carries an Origin, so reject a
// present-but-foreign one; and the content-type check closes the text/plain and
// form vectors, where a body slips past as a CORS "simple request". A missing
// Origin means a non-browser client (curl, a test), which is not a CSRF vector.
const ORIGIN_HOSTS = ["localhost:" + cfg.port, "127.0.0.1:" + cfg.port];
function sameOrigin(req) {
  if (!ORIGIN_HOSTS.includes(req.headers.host)) return "bad host";
  if (req.method !== "GET") {
    const origin = req.headers.origin;
    if (origin && !ORIGIN_HOSTS.includes(origin.replace(/^https?:\/\//, ""))) return "bad origin";
    // Exact media type: "application/jsonp" or "application/json-evil" must not pass.
    if (String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase() !== "application/json") return "json only";
  }
  return null;
}

const server = http.createServer(async (req, res) => {
  try {
    const bad = sameOrigin(req);
    if (bad) return send(res, bad === "json only" ? 415 : 403, { error: bad });
    // Parsed inside the try, after the origin check: a malformed path such as "//"
    // throws here and must answer 400, not take the server down.
    let url;
    try { url = new URL(req.url, "http://localhost"); } catch { return send(res, 400, { error: "bad url" }); }
    if (req.method === "GET" && STATIC[url.pathname]) {
      const f = path.join(L.DIR, STATIC[url.pathname]);
      return send(res, 200, fs.readFileSync(f, "utf8"), TYPES[path.extname(f)]);
    }
    if (req.method === "GET" && url.pathname === "/api/model") {
      const { model, sample } = L.loadModel(cfg);
      return send(res, 200, { model, sample });
    }
    if (req.method === "GET" && url.pathname === "/api/config") {
      return send(res, 200, {
        canRefresh: !!cfg.refreshCommand, canChat: !!cfg.chatCommand, canNotify: !!cfg.notifyCommand,
        agent: cfg.agent || null, setup: cfg.setup || {}, busy, configFile: cfg._file,
      });
    }
    if (req.method === "GET" && url.pathname === "/api/versions") return send(res, 200, L.listVersions(cfg));
    if (req.method === "GET" && url.pathname === "/api/brief") return send(res, 200, { markdown: L.brief(cfg) });

    if (req.method === "POST" && url.pathname === "/api/refresh") {
      if (busy) return send(res, 409, { ok: false, output: "Already running: " + busy });
      busy = "refresh";
      try { return send(res, 200, await L.refresh(cfg)); } finally { busy = null; }
    }

    // small direct edits from the page: the goal, a task, removing a record
    if (req.method === "POST" && url.pathname === "/api/edit") {
      if (busy) return send(res, 409, { ok: false, error: "AI Rob is still working (" + busy + "). Try again in a moment." });
      const r = L.applyEdit(cfg, await readBody(req));
      return send(res, r.ok || r.sample ? 200 : 400, r);
    }

    if (req.method === "POST" && url.pathname === "/api/chat") {
      if (busy) return send(res, 409, { ok: false, answer: "Still working on the last request (" + busy + ")." });
      const body = await readBody(req);
      if (!body.message) return send(res, 400, { ok: false, answer: "Empty message." });
      busy = "chat";
      try {
        const dir = path.join(L.DIR, ".chat");
        fs.mkdirSync(dir, { recursive: true });
        const inFile = path.join(dir, "in.json"), outFile = path.join(dir, "out.json");
        const { model, sample } = L.loadModel(cfg);
        const analysis = L.E.analyze(model, { filters: body.filters || null });
        fs.writeFileSync(inFile, JSON.stringify({
          message: String(body.message).slice(0, 4000), history: (body.history || []).slice(-10), filters: body.filters || null, sample,
          bottleneck: analysis.bottleneck, standards: analysis.standards, levers: analysis.levers.slice(0, 8), extreme: { meetingsPerWeek: analysis.extreme.meetingsPerWeek, retainedPerWeek: analysis.extreme.retainedPerWeek, hitGoalWeek: analysis.extreme.projection.hitWeek },
          goal: analysis.goal, goalView: { now: { retainedPerWeek: analysis.goalView.now.retainedPerWeek, hitWeek: analysis.goalView.now.hitWeek, plateauArr: analysis.goalView.now.plateauArr }, solved: { retainedPerWeek: analysis.goalView.solved.retainedPerWeek, hitWeek: analysis.goalView.solved.hitWeek, plateauArr: analysis.goalView.solved.plateauArr }, required: analysis.goalView.required },
          tasks: analysis.tasks.filter((t) => !t.done).slice(0, 10), context: body.context || null,
        }, null, 1));
        if (fs.existsSync(outFile)) fs.unlinkSync(outFile);
        const snap = sample ? null : L.snapshot(cfg, "chat");
        const r = await L.run(cfg.chatCommand, { FACTORY_DIR: L.DIR, FACTORY_MODEL: L.modelPath(cfg), FACTORY_CHAT_IN: inFile, FACTORY_CHAT_OUT: outFile }, 10 * 60 * 1000);
        const settled = sample ? { changed: false, version: null } : L.settleSnapshot(cfg, snap);
        let out = null;
        try { out = JSON.parse(fs.readFileSync(outFile, "utf8")); } catch { /* fall back to stdout */ }
        if (!out) out = { answer: r.output || "The agent did not answer." };
        let validation = null;
        if (settled.changed) validation = L.validate(JSON.parse(fs.readFileSync(L.modelPath(cfg), "utf8")));
        return send(res, 200, Object.assign({ ok: r.ok }, out, { modelChanged: settled.changed, version: settled.version, validation }));
      } finally { busy = null; }
    }
    send(res, 404, { error: "Not found" });
  } catch (e) {
    busy = null;
    send(res, 500, { error: String(e && e.message || e) });
  }
});

server.listen(cfg.port, "127.0.0.1", () => {
  const { sample } = L.loadModel(cfg);
  console.log("AI Rob running at http://localhost:" + cfg.port + (sample ? "  (showing the sample company until the first refresh)" : ""));
});
