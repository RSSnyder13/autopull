"use strict";
// The server runs the founder's agent CLI, so it must only answer its own origin:
// right Host (DNS rebinding), no foreign or "null" Origin on writes, JSON bodies only.
// Fork-only file, kept apart from server.test.js so Rob's tests stay untouched.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");

const SRC = path.join(__dirname, "..");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p100m-hard-"));
for (const f of ["engine.js", "lib.js", "server.js", "cli.js", "index.html"]) fs.copyFileSync(path.join(SRC, f), path.join(tmp, f));
for (const d of ["sample", "test", "prompts"]) fs.cpSync(path.join(SRC, d), path.join(tmp, d), { recursive: true });
let port;
let server;
// Ask the OS for a free port, so a taken port cannot make the probe talk to another process.
const freePort = () => new Promise((resolve, reject) => {
  const s = require("net").createServer();
  s.on("error", reject);
  s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => resolve(p)); });
});
// Raw request, so the test controls Host, Origin and Content-Type exactly.
const req = (method, p, headers, body) => new Promise((resolve, reject) => {
  const r = http.request({ host: "127.0.0.1", port, path: p, method, headers }, (res) => {
    let data = "";
    res.on("data", (c) => (data += c));
    res.on("end", () => resolve({ status: res.statusCode, body: data }));
  });
  r.on("error", reject);
  if (body !== undefined) r.write(body);
  r.end();
});
let own;
const json = { "Content-Type": "application/json" };

test.before(async () => {
  port = await freePort();
  own = "127.0.0.1:" + port;
  fs.writeFileSync(path.join(tmp, "config.json"), JSON.stringify({
    port, refreshCommand: "node test/stub-agent.js refresh", chatCommand: "node test/stub-agent.js chat", notifyCommand: "node test/stub-agent.js notify",
  }));
  server = spawn(process.execPath, ["server.js"], { cwd: tmp, stdio: ["ignore", "ignore", "inherit"] });
  for (let i = 0; i < 50; i++) {
    try { await req("GET", "/api/config", { host: own }); return; } catch { await new Promise((r) => setTimeout(r, 100)); }
  }
  throw new Error("server did not start");
});
test.after(() => { server.kill(); fs.rmSync(tmp, { recursive: true, force: true }); });

test("a request with a foreign Host is refused (DNS rebinding)", async () => {
  const r = await req("GET", "/api/config", { host: "evil.example:" + port });
  assert.equal(r.status, 403);
});

test("a write from a foreign Origin is refused", async () => {
  const r = await req("POST", "/api/edit", { host: own, origin: "https://evil.example", ...json }, "{}");
  assert.equal(r.status, 403);
});

test('a write with Origin "null" is refused', async () => {
  const r = await req("POST", "/api/edit", { host: own, origin: "null", ...json }, "{}");
  assert.equal(r.status, 403);
});

test("a write that is not JSON is refused (text/plain slips past CORS preflight)", async () => {
  const r = await req("POST", "/api/edit", { host: own, "Content-Type": "text/plain" }, "{}");
  assert.equal(r.status, 415);
});

test("a JSON write from our own origin goes through", async () => {
  const r = await req("POST", "/api/edit", { host: own, origin: "http://" + own, ...json }, JSON.stringify({ op: "goal", goal: { kind: "arr", target: 5e6 } }));
  assert.equal(r.status, 200);
});

test("a write with no Origin (curl, tests) goes through", async () => {
  const r = await req("POST", "/api/edit", { host: own, ...json }, JSON.stringify({ op: "goal", goal: { kind: "arr", target: 5e6 } }));
  assert.equal(r.status, 200);
});

test("a POST with a foreign Host is refused (the DNS-rebinding case)", async () => {
  const r = await req("POST", "/api/refresh", { host: "evil.example:" + port, ...json }, "{}");
  assert.equal(r.status, 403);
});

test("a Host with the wrong port is refused", async () => {
  const r = await req("GET", "/api/config", { host: "127.0.0.1:" + (port + 1) });
  assert.equal(r.status, 403);
});

for (const tpl of ["http://localhost.evil.com", "http://localhost:PORT@evil.com", "http://evil.com@localhost:PORT", "http://localhost:PORT.evil.com"]) {
  test("a lookalike Origin is refused: " + tpl, async () => {
    const origin = tpl.replace("PORT", port);
    const r = await req("POST", "/api/edit", { host: own, origin, ...json }, "{}");
    assert.equal(r.status, 403);
  });
}

for (const type of ["application/jsonp", "application/json-evil", "text/plain; application/json", "multipart/form-data"]) {
  test("a look-alike Content-Type is refused: " + type, async () => {
    const r = await req("POST", "/api/edit", { host: own, "Content-Type": type }, "{}");
    assert.equal(r.status, 415);
  });
}

test("application/json with a charset is accepted", async () => {
  const r = await req("POST", "/api/edit", { host: own, "Content-Type": "application/json; charset=utf-8" }, JSON.stringify({ op: "goal", goal: { kind: "arr", target: 5e6 } }));
  assert.equal(r.status, 200);
});

test("a gated endpoint runs only for our own origin (JSON POST to /api/refresh)", async () => {
  const bad = await req("POST", "/api/refresh", { host: own, origin: "https://evil.example", ...json }, "{}");
  assert.equal(bad.status, 403);
  const ok = await req("POST", "/api/refresh", { host: own, origin: "http://" + own, ...json }, "{}");
  assert.equal(ok.status, 200);
});

test("a malformed request path does not crash the server", async () => {
  const r = await req("GET", "//", { host: own });
  assert.equal(r.status, 400);
  const alive = await req("GET", "/api/config", { host: own });
  assert.equal(alive.status, 200);
});
