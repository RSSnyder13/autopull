// Shared by server.js and cli.js: config, the model file, versions, running
// the founder's agent CLI, the brief, and validation. Node only, no deps.
"use strict";
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const E = require("./engine.js");

const DIR = __dirname;
const P = (...xs) => path.join(DIR, ...xs);

function loadConfig() {
  const file = fs.existsSync(P("config.json")) ? P("config.json") : P("config.example.json");
  const cfg = JSON.parse(fs.readFileSync(file, "utf8"));
  return Object.assign({ port: 4747, model: "factory.json", versionsDir: "versions" }, cfg, { _file: path.basename(file) });
}

function modelPath(cfg) { return path.resolve(DIR, cfg.model || "factory.json"); }

// The founder's model, or the sample until the first refresh has run.
function loadModel(cfg) {
  const p = modelPath(cfg);
  if (fs.existsSync(p)) return { model: JSON.parse(fs.readFileSync(p, "utf8")), sample: false, path: p };
  return { model: JSON.parse(fs.readFileSync(P("sample", "factory.json"), "utf8")), sample: true, path: P("sample", "factory.json") };
}

// to the millisecond: two edits in the same second must not share a file
const stamp = () => new Date().toISOString().replace(/[:T.]/g, "-").slice(0, 23);

// Every change to the model is kept as a dated version (never overwrite history).
function snapshot(cfg, reason) {
  const p = modelPath(cfg);
  if (!fs.existsSync(p)) return null;
  const dir = path.resolve(DIR, cfg.versionsDir);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "factory-" + stamp() + "-" + reason.replace(/[^a-z0-9-]/gi, "") + ".json");
  fs.copyFileSync(p, file);
  return file;
}

// Drop the snapshot if the run did not change the model, so versions = real edits.
function settleSnapshot(cfg, snap) {
  if (!snap) return { changed: fs.existsSync(modelPath(cfg)), version: null };
  const now = fs.readFileSync(modelPath(cfg), "utf8");
  if (now === fs.readFileSync(snap, "utf8")) { fs.unlinkSync(snap); return { changed: false, version: null }; }
  return { changed: true, version: path.basename(snap) };
}

function listVersions(cfg) {
  const dir = path.resolve(DIR, cfg.versionsDir);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort().reverse().map((f) => {
    const m = f.match(/^factory-(\d{4}-\d{2}-\d{2})-(\d{2})-(\d{2})-(\d{2})(?:-(\d{3}))?-?(.*)\.json$/);
    return { file: f, at: m ? m[1] + " " + m[2] + ":" + m[3] : f, reason: m ? m[6] : "" };
  });
}

// Runs a command from the founder's own config. Inputs travel by file + env,
// never interpolated into the command string.
function run(command, env, timeoutMs) {
  return new Promise((resolve) => {
    if (!command) return resolve({ ok: false, code: null, output: "No command configured." });
    const child = spawn(command, { cwd: DIR, shell: true, env: Object.assign({}, process.env, env || {}) });
    let out = "";
    const keep = (b) => { out += b.toString(); if (out.length > 20000) out = out.slice(-20000); };
    child.stdout.on("data", keep);
    child.stderr.on("data", keep);
    const t = setTimeout(() => { child.kill("SIGTERM"); out += "\n[timed out]"; }, timeoutMs || 15 * 60 * 1000);
    child.on("close", (code) => { clearTimeout(t); resolve({ ok: code === 0, code, output: out.trim() }); });
    child.on("error", (err) => { clearTimeout(t); resolve({ ok: false, code: null, output: String(err) }); });
  });
}

async function refresh(cfg) {
  const snap = snapshot(cfg, "refresh");
  const res = await run(cfg.refreshCommand, { FACTORY_DIR: DIR, FACTORY_MODEL: modelPath(cfg) });
  const s = settleSnapshot(cfg, snap);
  let v = null;
  if (fs.existsSync(modelPath(cfg))) v = validate(JSON.parse(fs.readFileSync(modelPath(cfg), "utf8")));
  return Object.assign(res, s, { validation: v });
}

// ---------- the brief (the morning message) ----------
const STEP_GROUPS = [["Input", ["caseStudy"]], ["Pipeline", ["pipeline"]], ["Sales", ["pullRate", "closeRate", "cycleTime"]], ["Delivery", ["successRate"]]];

function goalLabel(g) {
  const f = E.fmt;
  if (g.label) return g.label;
  if (g.kind === "customers") return f.num(g.perWeek) + " new retained customers a week";
  return f.money(g.target) + " ARR" + (g.by ? " by " + g.by : "");
}

// One line each for today's pace and the bottleneck solved, in plain words.
function goalLines(a) {
  const f = E.fmt, gv = a.goalView, g = gv.goal;
  const pace = (x) => f.num(x.retainedPerWeek) + " new retained customers a week";
  const when = (x) => x.hitWeek != null ? "reach it in about " + f.weeksLabel(x.hitWeek) + (x.range && x.range.p10 != null ? " (likely " + f.weeksLabel(Math.round(x.range.p10)) + " to " + f.weeksLabel(x.range.p90 == null ? null : Math.round(x.range.p90)) + ")" : "")
    : "not within 10 years" + (x.plateauArr != null && isFinite(x.plateauArr) ? "; ARR levels off near " + f.money(x.plateauArr) : "");
  const L = [];
  if (g.kind === "customers") {
    L.push("**Today:** " + pace(gv.now) + ", " + f.pct(gv.now.progress) + " of the goal.");
    if (gv.solved.retainedPerWeek != null) L.push("**Bottleneck solved:** " + pace(gv.solved) + ", " + f.pct(gv.solved.progress) + " of the goal.");
    else L.push("**Bottleneck solved:** " + gv.solved.title.toLowerCase() + " first. Until then there is nothing to measure.");
  } else {
    L.push("**Today's pace:** " + pace(gv.now) + ", " + when(gv.now) + ".");
    if (gv.solved.retainedPerWeek != null) L.push("**Bottleneck solved:** " + pace(gv.solved) + ", " + when(gv.solved) + ".");
    else L.push("**Bottleneck solved:** " + gv.solved.title.toLowerCase() + " first. Until then there is nothing to measure.");
    if (gv.required && gv.required.retainedPerWeek != null) L.push("**To hit it by " + gv.required.by + ":** " + f.num(gv.required.retainedPerWeek) + " new retained customers a week" + (gv.required.meetingsPerWeek ? ", about " + f.num(gv.required.meetingsPerWeek) + " first meetings a week at today's rates" : "") + ".");
  }
  return L;
}

function brief(cfg, opts) {
  opts = opts || {};
  const { model, sample } = loadModel(cfg);
  const a = E.analyze(model);
  const f = E.fmt, c = model.coaching || {};
  const name = (a.company && a.company.name) || "Your company";
  const today = new Date().toISOString().slice(0, 10);
  const L = [];
  L.push("# AI Rob: your plan for " + today + " (" + name + ")");
  if (sample) L.push("_This is the sample company, not you. Run a refresh and I will work from your real data._");
  L.push("");
  L.push("**Goal:** " + goalLabel(a.goal) + ".");
  L.push(...goalLines(a));
  L.push("");
  const b = a.bottleneck;
  L.push("**Bottleneck:** " + b.title + ". " + b.why);
  if (c.bottleneckId && c.bottleneckId !== b.id) L.push("_Heads up: I wrote the advice below for a different bottleneck (" + c.bottleneckId + "). Refresh and I will redo it._");
  if (c.move) L.push("**What to do:** " + c.move);
  if (c.today) L.push("**Today:** " + c.today);
  // the morning plan is only shown on the day it was written for
  const plan = a.plan && Array.isArray(a.plan.blocks) && a.plan.blocks.length && (a.plan.date === today || a.plan.date === a.asOf) ? a.plan : null;
  if (plan) {
    L.push("");
    L.push("**Today's plan:**" + (plan.summary ? " " + plan.summary : ""));
    for (const x of plan.blocks) L.push("- " + (x.at || "") + (x.until ? " to " + x.until : "") + " " + x.title + (x.bottleneck ? " (bottleneck)" : ""));
  }
  const open = a.tasks.filter((t) => !t.done);
  if (open.length) {
    L.push("");
    L.push("**Your tasks:**");
    for (const t of open.slice(0, 5)) L.push("- " + t.title + (t.entityName ? " (" + t.entityName + ")" : "") + (t.due ? ", due " + t.due : "") + (t.bottleneck ? " (bottleneck)" : ""));
    if (open.length > 5) L.push("- and " + (open.length - 5) + " more on your homepage");
  }
  if (c.ladder && c.ladder.length) { L.push(""); L.push("**If it stalls:**"); c.ladder.forEach((x, i) => L.push(i + 1 + ". " + x)); }
  L.push("");
  L.push("**Scorecard (" + a.band.label + " contracts):**");
  const byId = Object.fromEntries(a.standards.map((s) => [s.id, s]));
  for (const [step, ids] of STEP_GROUPS) L.push("- " + step + ": " + ids.map((id) => byId[id]).filter(Boolean).map((s) => (s.status === "pass" ? "PASS" : s.status === "miss" ? "MISS" : "UNKNOWN") + " " + s.label + " " + showStd(s)).join("; "));
  const x = a.extreme;
  if (x.retainedPerWeek > 0 && a.company.acv) {
    L.push("");
    L.push("**The extreme possible:** with calendars full of extreme-PULL buyers, about " + f.num(x.retainedPerWeek) + " new retained customers a week, " + f.money(x.newArrPerYear) + " of new ARR a year. That is a ceiling with today's team. Not a forecast.");
  }
  const dq = a.dataQuality.filter((q) => q.level !== "info");
  if (dq.length) { L.push(""); L.push("**Data:** " + dq.map((q) => q.message).join(" ")); }
  if (cfg.dashboardUrl || cfg.port) { L.push(""); L.push("Open AI Rob: " + (cfg.dashboardUrl || "http://localhost:" + cfg.port)); }
  const md = L.join("\n");
  if (opts.format === "text") return md.replace(/\*\*|_/g, "").replace(/^# /m, "");
  return md;
}

function showStd(s) {
  const f = E.fmt;
  if (s.value == null) return "unknown (bar " + barText(s) + ")";
  if (s.id === "caseStudy") return s.note;
  if (s.id === "pipeline") return f.num(s.value) + " / week vs " + s.bar;
  if (s.id === "cycleTime") return Math.round(s.value) + " days vs " + s.bar;
  return f.pct(s.value) + " vs " + f.pct(s.bar);
}
function barText(s) { return s.id === "pipeline" ? s.bar + " / week" : s.id === "cycleTime" ? s.bar + " days" : s.id === "caseStudy" ? "3 repeats" : E.fmt.pct(s.bar); }

// ---------- direct founder edits (no agent run) ----------
// The page can set the goal, tick a task, and remove or restore a record.
// Each edit is versioned like every other change to the model.
function applyEdit(cfg, op) {
  op = op || {};
  const { model, sample } = loadModel(cfg);
  if (sample) return { ok: false, sample: true, error: "This is the sample company, so edits are not saved." };
  const today = new Date().toISOString().slice(0, 10);
  const m = model;
  let what;
  if (op.op === "goal") {
    const g = op.goal || {};
    if (g.kind === "customers") {
      if (!(typeof g.perWeek === "number" && g.perWeek > 0)) return { ok: false, error: "perWeek must be a positive number" };
      m.goal = { kind: "customers", perWeek: g.perWeek };
    } else {
      if (!(typeof g.target === "number" && g.target > 0)) return { ok: false, error: "target must be a positive number" };
      if (g.by && isNaN(new Date(g.by))) return { ok: false, error: "bad date" };
      m.goal = { kind: "arr", target: g.target };
      if (g.by) m.goal.by = String(g.by).slice(0, 10);
    }
    what = "goal";
  } else if (op.op === "task") {
    const t = (m.tasks || []).find((x) => x.id === op.id);
    if (!t) return { ok: false, error: "No task " + op.id };
    t.done = !!op.done;
    if (t.done) t.doneAt = today; else delete t.doneAt;
    what = "task";
  } else if (op.op === "exclude" || op.op === "include") {
    const e = (m.entities || []).find((x) => x.id === op.entity);
    if (!e) return { ok: false, error: "No record " + op.entity };
    if (op.op === "exclude") e.excluded = { at: today, reason: String(op.reason || "Not a sales conversation").slice(0, 200), by: "founder" };
    else delete e.excluded;
    what = op.op;
  } else return { ok: false, error: "Unknown edit" };
  const v = validate(m);
  if (!v.ok) return { ok: false, error: v.errors.join("; ") };
  const snap = snapshot(cfg, "edit-" + what);
  fs.writeFileSync(modelPath(cfg), JSON.stringify(m, null, 1));
  const s = settleSnapshot(cfg, snap);
  return Object.assign({ ok: true }, s);
}

async function notify(cfg, text) {
  if (!cfg.notifyCommand) return { ok: false, output: "No notifyCommand in config.json. Ask AI Rob to set up notifications." };
  const file = P(".last-brief.md");
  fs.writeFileSync(file, text);
  return run(cfg.notifyCommand, { FACTORY_BRIEF_FILE: file, FACTORY_DASHBOARD_URL: cfg.dashboardUrl || "http://localhost:" + cfg.port });
}

// ---------- validation (agents run this after writing factory.json) ----------
function validate(m) {
  const errors = [], warnings = [];
  const err = (x) => errors.push(x), warn = (x) => warnings.push(x);
  if (!m || typeof m !== "object") return { errors: ["Not a JSON object"], warnings };
  const stages = m.stages && m.stages.length ? m.stages : E.DEFAULT_STAGES;
  const ids = new Set();
  for (const s of stages) { if (!s.id) err("A stage has no id"); if (ids.has(s.id)) err("Duplicate stage id " + s.id); ids.add(s.id); if (!["pipeline", "sales", "delivery"].includes(s.machine)) err("Stage " + s.id + " has machine '" + s.machine + "' (use pipeline, sales or delivery)"); }
  const ms = Object.assign({}, E.DEFAULT_MILESTONES, m.milestones || {});
  for (const k of Object.keys(ms)) if (!ids.has(ms[k])) err("Milestone " + k + " points to unknown stage " + ms[k]);
  if (!m.company) warn("No company block");
  else {
    if (m.company.band && !E.BANDS[m.company.band]) err("company.band must be big, moderate or small");
    if (m.company.acv != null && typeof m.company.acv !== "number") err("company.acv must be a number");
  }
  const eids = new Set();
  for (const e of m.entities || []) {
    if (!e.id) { err("An entity has no id"); continue; }
    if (eids.has(e.id)) err("Duplicate entity id " + e.id);
    eids.add(e.id);
    if (e.pull && !["extreme", "yes", "no", "unknown"].includes(e.pull)) err(e.id + ": pull must be extreme, yes, no or unknown");
    for (const v of e.events || []) {
      if (!ids.has(v.stage)) err(e.id + ": unknown stage " + v.stage);
      if (!v.at || isNaN(new Date(v.at))) err(e.id + ": bad date on " + v.stage);
    }
    if (e.exit && e.exit.at && isNaN(new Date(e.exit.at))) err(e.id + ": bad exit date");
    if (e.caseStudy && !(m.caseStudies || []).some((c) => c.id === e.caseStudy)) warn(e.id + ": caseStudy " + e.caseStudy + " is not defined");
  }
  for (const c of m.caseStudies || []) {
    if (!c.id) err("A case study has no id");
    for (const k of ["project", "unavoidable", "options", "limitations"]) {
      const v = (c.pull || {})[k];
      if (v != null && typeof v !== "string" && !(Array.isArray(v) && v.every((x) => typeof x === "string"))) err("Case study " + c.id + ": pull." + k + " must be text or a list of text");
    }
    if (c.status && !["hypothesis", "emerging", "repeatable"].includes(c.status)) warn("Case study " + c.id + ": status should be hypothesis, emerging or repeatable");
    for (const f of c.fits || []) if (!eids.has(f.entity)) warn("Case study " + c.id + " lists unknown entity " + f.entity);
  }
  for (const c of m.capacity || []) if (typeof (c.sellingHours ?? c.weeklyHours) !== "number") err("capacity for " + c.owner + " needs sellingHours or weeklyHours");
  for (const r of m.pipelineCounts || []) if (!r.week || isNaN(new Date(r.week))) err("pipelineCounts row with bad week");
  if (m.goal) {
    const g = m.goal;
    if (g.kind === "customers" ? !(typeof g.perWeek === "number" && g.perWeek > 0) : !(g.target == null || (typeof g.target === "number" && g.target > 0))) err("goal needs a positive target (ARR) or perWeek (customers)");
    if (g.by && isNaN(new Date(g.by))) err("goal.by is not a date");
  }
  const tids = new Set();
  for (const t of m.tasks || []) {
    if (!t.id || !t.title) { err("A task needs an id and a title"); continue; }
    if (tids.has(t.id)) err("Duplicate task id " + t.id);
    tids.add(t.id);
    if (t.entity && !eids.has(t.entity)) warn("Task " + t.id + " points to unknown entity " + t.entity);
    if (t.due && isNaN(new Date(t.due))) err("Task " + t.id + " has a bad due date");
  }
  if (m.plan) {
    if (!m.plan.date || isNaN(new Date(m.plan.date))) err("plan.date is not a date");
    if (!Array.isArray(m.plan.blocks)) err("plan.blocks must be a list");
  }
  for (const e of m.entities || []) if (e.excluded && typeof e.excluded !== "object") err(e.id + ": excluded must be { at, reason }");
  return { errors, warnings, ok: errors.length === 0 };
}

module.exports = { DIR, loadConfig, loadModel, modelPath, snapshot, settleSnapshot, listVersions, run, refresh, brief, goalLabel, notify, validate, applyEdit, E };
