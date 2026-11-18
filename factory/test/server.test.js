"use strict";
// End to end: the server, refresh, chat (answer, scenario, model edit with a
// saved version) and the daily brief, with a stub standing in for the agent.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn, execFileSync } = require("child_process");

const SRC = path.join(__dirname, "..");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p100m-"));
for (const f of ["engine.js", "lib.js", "server.js", "cli.js", "index.html"]) fs.copyFileSync(path.join(SRC, f), path.join(tmp, f));
for (const d of ["sample", "test", "prompts"]) fs.cpSync(path.join(SRC, d), path.join(tmp, d), { recursive: true });
const port = 4800 + Math.floor(Math.random() * 500);
fs.writeFileSync(path.join(tmp, "config.json"), JSON.stringify({
  port, refreshCommand: "node test/stub-agent.js refresh", chatCommand: "node test/stub-agent.js chat", notifyCommand: "node test/stub-agent.js notify",
}));

let server;
const url = (p) => "http://127.0.0.1:" + port + p;
const post = (p, body) => fetch(url(p), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) }).then((r) => r.json());

test.before(async () => {
  server = spawn(process.execPath, ["server.js"], { cwd: tmp });
  for (let i = 0; i < 50; i++) {
    try { await fetch(url("/api/config")); return; } catch { await new Promise((r) => setTimeout(r, 100)); }
  }
  throw new Error("server did not start");
});
test.after(() => { server.kill(); fs.rmSync(tmp, { recursive: true, force: true }); });

test("serves the sample until the first refresh", async () => {
  const r = await fetch(url("/api/model")).then((x) => x.json());
  assert.equal(r.sample, true);
  const html = await fetch(url("/")).then((x) => x.text());
  assert.match(html, /AI Rob/);
});

test("edits on the sample are not saved", async () => {
  const r = await post("/api/edit", { op: "goal", goal: { kind: "arr", target: 5e6 } });
  assert.equal(r.ok, false);
  assert.equal(r.sample, true);
  assert.equal(fs.existsSync(path.join(tmp, "factory.json")), false);
});

test("refresh runs the agent, validates, and serves the founder's model", async () => {
  const r = await post("/api/refresh");
  assert.equal(r.ok, true);
  assert.equal(r.validation.ok, true);
  const m = await fetch(url("/api/model")).then((x) => x.json());
  assert.equal(m.sample, false);
  assert.equal(m.model.company.name, "Stub Co");
});

test("direct edits: goal, task, remove and restore, each kept as a version", async () => {
  let r = await post("/api/edit", { op: "goal", goal: { kind: "arr", target: 10e6, by: "2028-12-31" } });
  assert.equal(r.ok, true);
  assert.ok(r.version);
  let m = (await fetch(url("/api/model")).then((x) => x.json())).model;
  assert.deepEqual(m.goal, { kind: "arr", target: 10e6, by: "2028-12-31" });

  const task = m.tasks.find((t) => !t.done);
  r = await post("/api/edit", { op: "task", id: task.id, done: true });
  assert.equal(r.ok, true);
  m = (await fetch(url("/api/model")).then((x) => x.json())).model;
  assert.equal(m.tasks.find((t) => t.id === task.id).done, true);

  const e = m.entities.find((x) => !x.excluded);
  r = await post("/api/edit", { op: "exclude", entity: e.id, reason: "Recruiting call" });
  assert.equal(r.ok, true);
  m = (await fetch(url("/api/model")).then((x) => x.json())).model;
  assert.equal(m.entities.find((x) => x.id === e.id).excluded.reason, "Recruiting call");
  r = await post("/api/edit", { op: "include", entity: e.id });
  m = (await fetch(url("/api/model")).then((x) => x.json())).model;
  assert.equal(m.entities.find((x) => x.id === e.id).excluded, undefined);

  r = await post("/api/edit", { op: "goal", goal: { kind: "arr", target: -1 } });
  assert.equal(r.ok, false);
  r = await post("/api/edit", { op: "nope" });
  assert.equal(r.ok, false);
});

test("chat returns an answer and a scenario the engine can run", async () => {
  const r = await post("/api/chat", { message: "What if we only sold to first-audit controllers?" });
  assert.match(r.answer, /Stub answer/);
  assert.equal(r.scenario.cohort.caseStudy, "first-audit");
  assert.equal(r.modelChanged, false);
  const E = require(path.join(tmp, "engine.js"));
  const m = JSON.parse(fs.readFileSync(path.join(tmp, "factory.json"), "utf8"));
  assert.ok(E.scenario(m, r.scenario).retainedPerWeek > 0);
});

test("a model edit through chat keeps the previous version", async () => {
  const r = await post("/api/chat", { message: "Rename the company" });
  assert.equal(r.modelChanged, true);
  assert.ok(r.version);
  const versions = await fetch(url("/api/versions")).then((x) => x.json());
  assert.equal(versions[0].file, r.version);
  const prev = JSON.parse(fs.readFileSync(path.join(tmp, "versions", r.version), "utf8"));
  assert.equal(prev.company.name, "Stub Co");
  const m = await fetch(url("/api/model")).then((x) => x.json());
  assert.equal(m.model.company.name, "Renamed Co");
});

test("daily: refresh then send the brief through the notifier", () => {
  execFileSync(process.execPath, ["cli.js", "daily"], { cwd: tmp, stdio: "pipe" });
  const sent = fs.readFileSync(path.join(tmp, ".notified.md"), "utf8");
  assert.match(sent, /\*\*Bottleneck:\*\*/);
  assert.match(sent, /\*\*Goal:\*\* \$100M ARR/);
  assert.match(sent, /\*\*Your tasks:\*\*/);
  assert.match(sent, /The extreme possible/);
  assert.match(sent, /localhost:/);
});
