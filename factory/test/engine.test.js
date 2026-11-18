"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const E = require("../engine.js");

const AS_OF = "2026-10-05"; // a Monday
const DAY = 86400000;
const d = (n) => new Date(+new Date(AS_OF + "T00:00:00Z") - n * DAY).toISOString().slice(0, 10);
const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

const STAGES = [
  { id: "met", name: "First conversation", machine: "sales" },
  { id: "pull", name: "PULL", machine: "sales" },
  { id: "closed", name: "Closed", machine: "sales" },
  { id: "indicator", name: "Hit X", machine: "delivery" },
];

// Rob's first worked example: 10 conversations a week,
// 40% with demand + fit, 50% of those close, everyone gets to hell yes.
function workedExample({ weeks = 4, perWeek = 10, pull = 0.4, closeRate = 0.5 } = {}) {
  const entities = [];
  let n = 0;
  for (let w = 1; w <= weeks; w++) {
    for (let i = 0; i < perWeek; i++) {
      const met = d(w * 7 + 60 - (i % 5)); // old enough that everything resolved
      const hasPull = i < perWeek * pull;
      const wins = i < perWeek * pull * closeRate;
      const ev = [{ stage: "met", at: met }];
      if (hasPull) ev.push({ stage: "pull", at: met });
      if (wins) ev.push({ stage: "closed", at: d(w * 7 + 40) }, { stage: "indicator", at: d(w * 7 + 30) });
      entities.push({ id: "e" + ++n, caseStudy: "a", pull: hasPull ? "yes" : "no", channel: "LinkedIn", owner: "F",
        events: ev, exit: wins ? null : { at: d(w * 7 + 45), reason: "x" } });
    }
  }
  // shift: put the meetings inside the 4-week window for the pipeline standard
  for (const e of entities) {
    const shift = 60;
    e.events = e.events.map((v) => ({ stage: v.stage, at: new Date(+new Date(v.at) + shift * DAY).toISOString().slice(0, 10) }));
    if (e.exit) e.exit.at = new Date(+new Date(e.exit.at) + shift * DAY).toISOString().slice(0, 10);
  }
  return { asOf: AS_OF, company: { band: "moderate", acv: 50000, arr: 0, annualChurn: 0 }, stages: STAGES,
    caseStudies: [{ id: "a", name: "A" }], entities, settings: { staleDays: 9999 } };
}

test("flow reproduces the worked example and its achievable gains", () => {
  const P = E._internal.prepare({ stages: STAGES, asOf: AS_OF });
  const chain = ["met", "pull", "closed", "indicator"];
  const rates = { "met>pull": 0.4, "pull>closed": 0.5, "closed>indicator": 1 };
  const out = (r, top) => E._internal.flow(P, chain, r, top, null).retainedPerWeek;
  close(out(rates, 10), 2);
  close(out(rates, 12.5) - 2, 0.5); // +25% conversations: 1 extra customer every 2 weeks
  close(out({ ...rates, "met>pull": 0.75 }, 10) - 2, 1.75); // retarget to 75%: roughly 2 a week
  close(out({ ...rates, "pull>closed": 0.75 }, 10) - 2, 1); // sales to 75%: 1 a week
});

test("worked example from entities: standards, levers and bottleneck", () => {
  const a = E.analyze(workedExample());
  const s = Object.fromEntries(a.standards.map((x) => [x.id, x]));
  close(s.pullRate.value, 0.4);
  assert.equal(s.pullRate.status, "miss");
  close(s.closeRate.value, 0.5);
  assert.equal(s.closeRate.status, "pass");
  assert.equal(s.successRate.value, 1);
  assert.equal(s.caseStudy.status, "pass");
  close(a.baseline.retainedPerWeek, 2);
  assert.equal(a.bottleneck.kind, "lever");
  assert.equal(a.bottleneck.id, "step:met>pull");
  close(a.levers[0].gain, 1); // 40% -> the 60% standard: +1 customer / week
});

test("the gates come first when there is no repeatable case study", () => {
  const base = { asOf: AS_OF, company: { band: "small" }, stages: STAGES };
  const mk = (pull, extra) => ({ id: Math.random().toString(36).slice(2), pull, events: [{ stage: "met", at: d(10) }].concat(extra || []) });
  let a = E.analyze({ ...base, entities: [mk("no"), mk("no"), mk("unknown")] });
  assert.equal(a.bottleneck.id, "realPull");
  a = E.analyze({ ...base, entities: [mk("yes", [{ stage: "pull", at: d(10) }]), mk("no")] });
  assert.equal(a.bottleneck.id, "caseStudy");
  const won = () => mk("extreme", [{ stage: "pull", at: d(10) }, { stage: "closed", at: d(5) }, { stage: "indicator", at: d(1) }]);
  a = E.analyze({ ...base, entities: [won(), won()], caseStudies: [{ id: "x" }] });
  assert.equal(a.bottleneck.id, "repeatable");
  a = E.analyze({ ...base, entities: [], caseStudies: [] });
  assert.equal(a.bottleneck.id, "realPull");
  assert.ok(a.dataQuality.some((q) => q.level === "critical"));
});

test("pushed deals: no-PULL closes stay out of the close-rate standard but count in the comparison", () => {
  const m = workedExample();
  // one no-PULL deal gets pushed to close
  const pushed = m.entities.find((e) => e.pull === "no");
  pushed.exit = null;
  pushed.events.push({ stage: "closed", at: d(5) });
  const a = E.analyze(m);
  close(a.standards.find((x) => x.id === "closeRate").value, 0.5);
  assert.equal(a.pullCompare.nopull.won, 1);
  close(a.pullCompare.pull.closeRate, 0.5);
  close(a.pullCompare.nopull.closeRate, 1 / 24);
  assert.ok(a.baseline.pushedPerWeek > 0);
});

test("PULL vs no PULL: time to close, close rate and effort per win", () => {
  const mk = (id, pull, metAgo, closeAgo, hours, lost) => ({
    id, pull, events: [{ stage: "met", at: d(metAgo) }].concat(pull !== "no" ? [{ stage: "pull", at: d(metAgo) }] : [])
      .concat(closeAgo != null ? [{ stage: "closed", at: d(closeAgo) }] : []),
    exit: lost ? { at: d(1), reason: "x" } : null, effort: { meetings: hours / 2, hours, touches: hours * 2 },
  });
  const a = E.analyze({ asOf: AS_OF, stages: STAGES, entities: [
    mk("p1", "yes", 40, 30, 4), mk("p2", "extreme", 40, 20, 4), mk("p3", "yes", 40, null, 2, true),
    mk("n1", "no", 90, 10, 20), mk("n2", "no", 40, null, 6, true), mk("n3", "no", 40, null, 6, true), mk("n4", "no", 40, null, 6, true),
  ] });
  const c = a.pullCompare;
  close(c.pull.closeRate, 2 / 3);
  close(c.nopull.closeRate, 1 / 4);
  assert.equal(c.pull.daysToClose, 15); // median of 10 and 20
  assert.equal(c.nopull.daysToClose, 80);
  close(c.pull.effortPerWin.hours, 10 / 2);
  close(c.nopull.effortPerWin.hours, 38);
  close(c.delta.hoursPerWinX, 38 / 5);
  close(c.delta.closeRatePts, (2 / 3 - 1 / 4) * 100);
});

test("success is pending, not lost, until the one-month window passes", () => {
  const a = E.analyze({ asOf: AS_OF, stages: STAGES, entities: [
    { id: "a", pull: "yes", events: [{ stage: "met", at: d(40) }, { stage: "pull", at: d(40) }, { stage: "closed", at: d(10) }] },
    { id: "b", pull: "yes", events: [{ stage: "met", at: d(90) }, { stage: "pull", at: d(90) }, { stage: "closed", at: d(60) }] },
    { id: "c", pull: "yes", events: [{ stage: "met", at: d(90) }, { stage: "pull", at: d(90) }, { stage: "closed", at: d(60) }, { stage: "indicator", at: d(50) }] },
  ] });
  const step = a.funnel.steps.find((s) => s.key === "closed>indicator");
  assert.equal(step.pending, 1);
  assert.equal(step.lost, 1);
  close(step.conv, 0.5);
  close(a.standards.find((s) => s.id === "successRate").value, 0.5);
});

test("projection: constant output with no churn grows ARR linearly", () => {
  const m = workedExample();
  const a = E.analyze(m);
  const p = a.baseline.projection;
  const at52 = p.arr.find((x) => x.week === 52).arr;
  close(at52, 2 * 50000 * 52, 1);
  // $100M at 2 customers x $50k a week = 1000 weeks: beyond the 10-year horizon
  assert.equal(p.hitWeek, null);
});

test("filters cut every view consistently", () => {
  const m = require(path.join(__dirname, "..", "sample", "factory.json"));
  const all = E.analyze(m);
  const ex = E.analyze(m, { filters: { pull: "extreme" } });
  assert.ok(ex.counts.entities < all.counts.entities);
  assert.ok(ex.timelines.rows.every((r) => r.pull === "extreme"));
  assert.equal(ex.standards.find((s) => s.id === "pullRate").value, 1);
  const li = E.analyze(m, { filters: { channel: "LinkedIn" } });
  assert.deepEqual(li.inflow.channels, ["LinkedIn"]);
});

test("sample: archetypes list the customers that fit them", () => {
  const m = require(path.join(__dirname, "..", "sample", "factory.json"));
  const a = E.analyze(m);
  const cs = a.caseStudies.find((c) => c.id === "first-audit");
  const tagged = m.entities.filter((e) => e.caseStudy === "first-audit").map((e) => e.id).sort();
  assert.deepEqual(cs.fits.map((f) => f.entity).sort(), tagged);
  assert.ok(cs.counts.succeeded > 0);
  assert.ok(cs.shareOfOutput > 0.5);
});

test("sample: bottleneck, extreme scenario, and a deterministic Monte Carlo", () => {
  const m = require(path.join(__dirname, "..", "sample", "factory.json"));
  const a = E.analyze(m);
  assert.equal(a.bottleneck.id, m.coaching.bottleneckId);
  assert.ok(a.extreme.retainedPerWeek > a.baseline.retainedPerWeek * 2);
  assert.ok(a.extreme.projection.hitWeek > 0);
  assert.ok(a.extreme.sellersFor100M5y >= 1);
  const b = E.analyze(m);
  assert.deepEqual(a.extreme.monteCarlo.hitWeek, b.extreme.monteCarlo.hitWeek);
  const mc = a.extreme.monteCarlo.hitWeek;
  assert.ok(mc.p10 <= mc.p50 && (mc.p90 == null || mc.p50 <= mc.p90));
});

test("scenario: only one archetype, calendars full", () => {
  const m = require(path.join(__dirname, "..", "sample", "factory.json"));
  const s = E.scenario(m, { label: "Only first-audit", cohort: { caseStudy: "first-audit" }, fillCalendar: true });
  assert.ok(s.meetingsPerWeek > 0);
  assert.ok(s.retainedPerWeek > 0);
  assert.equal(s.label, "Only first-audit");
  const more = E.scenario(m, { cohort: { caseStudy: "first-audit" }, fillCalendar: true, sellersAdded: 2 });
  assert.ok(more.meetingsPerWeek > s.meetingsPerWeek);
});

test("goal view: solving the bottleneck gets there sooner", () => {
  const m = workedExample();
  m.company.arr = 1e6;
  m.goal = { kind: "arr", target: 20e6 };
  const a = E.analyze(m);
  const g = a.goalView;
  assert.equal(g.solved.kind, "lever");
  close(g.now.retainedPerWeek, 2);
  close(g.solved.retainedPerWeek, a.bottleneck.lever.after);
  assert.ok(g.now.hitWeek > 0 && g.solved.hitWeek > 0);
  assert.ok(g.solved.hitWeek < g.now.hitWeek);
  assert.equal(g.weeksSooner, g.now.hitWeek - g.solved.hitWeek);
  assert.equal(a.baseline.projection.target, 20e6);
});

test("goal view: a gate has nothing to project, and churn sets the plateau", () => {
  const a = E.analyze({ asOf: AS_OF, stages: STAGES, company: { acv: 10000, annualChurn: 0.1 },
    entities: [{ id: "a", pull: "no", events: [{ stage: "met", at: d(10) }] }] });
  assert.equal(a.goalView.solved.kind, "gate");
  assert.equal(a.goalView.solved.hitWeek, null);
  const b = E.analyze(workedExample());
  // no churn: ARR never levels off
  assert.equal(b.goalView.now.plateauArr, Infinity);
});

test("goal seek: the required rate reaches the target on the date", () => {
  const m = workedExample();
  m.company.arr = 500000; m.company.annualChurn = 0.1;
  const P = E._internal.prepare(m);
  const weeks = 104, target = 10e6;
  const r = E._internal.requiredPerWeek(P, target, weeks);
  const p = E._internal.project(P, { baselinePerWeek: r * 1.0001, retainedPerWeek: r * 1.0001, target });
  assert.ok(Math.abs(p.hitWeek - weeks) <= 1, "hit week " + p.hitWeek);
  const s = E.scenario(m, { label: "10M in 2y", goal: { target, by: d(-weeks * 7) } });
  close(s.required.retainedPerWeek, r, 1e-3);
  assert.ok(s.required.meetingsPerWeek > s.required.retainedPerWeek);
  assert.ok(s.required.sellers >= 1);
});

test("a customers-a-week goal reports progress", () => {
  const m = workedExample();
  m.goal = { kind: "customers", perWeek: 4 };
  const g = E.analyze(m).goalView;
  close(g.now.progress, 0.5);
  assert.ok(g.solved.progress > g.now.progress);
});

test("removed records leave every number, and are listed for undo", () => {
  const m = workedExample();
  const all = E.analyze(m);
  m.entities[0].excluded = { at: AS_OF, reason: "internal", by: "founder" };
  const a = E.analyze(m);
  assert.equal(a.counts.entities, all.counts.entities - 1);
  assert.equal(a.counts.excluded, 1);
  assert.equal(a.excluded[0].id, m.entities[0].id);
  assert.equal(a.funnel.stages.find((s) => s.id === "met").count, all.funnel.stages.find((s) => s.id === "met").count - 1);
});

test("cohort lanes split the factory, and tasks sort bottleneck first", () => {
  const m = require(path.join(__dirname, "..", "sample", "factory.json"));
  const a = E.analyze(m, { filters: { pull: "extreme" } });
  const L = a.lanes;
  // lanes ignore the PULL filter so compare always shows every cohort
  assert.equal(L.everyone.n, E.analyze(m).counts.entities);
  assert.equal(L.pull.n + L.nopull.n + m.entities.filter((e) => !e.excluded && (e.pull || "unknown") === "unknown").length, L.everyone.n);
  assert.ok(L.extreme.n <= L.pull.n);
  const t = a.tasks;
  const firstDone = t.findIndex((x) => x.done);
  assert.ok(firstDone === -1 || t.slice(firstDone).every((x) => x.done));
  assert.ok(t[0].bottleneck);
  assert.ok(t.find((x) => x.source === "deal-review").entityName);
});

test("case study fields can be bullets, and validate checks them", () => {
  const L = require("../lib.js");
  const m = JSON.parse(JSON.stringify(require(path.join(__dirname, "..", "sample", "factory.json"))));
  assert.ok(Array.isArray(m.caseStudies[0].pull.unavoidable), "sample shows U as bullets");
  assert.ok(m.caseStudies[0].fits.some((f) => f.u), "sample fits name their U");
  assert.deepEqual(L.validate(m).errors, []);
  m.caseStudies[0].pull.unavoidable = [1, 2];
  m.caseStudies[0].status = "proven";
  const v = L.validate(m);
  assert.ok(v.errors.some((e) => /pull\.unavoidable/.test(e)));
  assert.ok(v.warnings.some((w) => /status should be/.test(w)));
});
