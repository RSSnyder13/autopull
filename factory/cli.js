#!/usr/bin/env node
// AI Rob (your GTM agent) command line. Used by the agent, by schedules (cron, routines),
// and by you.
//
//   node cli.js analyze [--scenario file.json] [--filters '{"pull":"extreme"}'] [--full]
//   node cli.js brief [--text] [--notify]
//   node cli.js refresh              run config.refreshCommand (the agent rebuilds factory.json)
//   node cli.js daily                refresh, then brief --notify (point your schedule here)
//   node cli.js validate [file]      check factory.json before saving it
"use strict";
const fs = require("fs");
const L = require("./lib.js");

const args = process.argv.slice(2);
const cmd = args[0];
const flag = (k) => args.includes("--" + k);
const val = (k) => { const i = args.indexOf("--" + k); return i >= 0 ? args[i + 1] : null; };

(async () => {
  const cfg = L.loadConfig();
  if (cmd === "analyze") {
    const { model, sample } = L.loadModel(cfg);
    const scenario = val("scenario") ? JSON.parse(fs.readFileSync(val("scenario"), "utf8")) : null;
    const filters = val("filters") ? JSON.parse(val("filters")) : null;
    const a = L.E.analyze(model, { filters, scenario });
    const out = flag("full") ? a : summary(a);
    out.sample = sample;
    console.log(JSON.stringify(out, null, 1));
  } else if (cmd === "brief") {
    const text = L.brief(cfg, { format: flag("text") ? "text" : "md" });
    console.log(text);
    if (flag("notify")) { const r = await L.notify(cfg, text); if (!r.ok) { console.error(r.output); process.exit(1); } }
  } else if (cmd === "refresh" || cmd === "daily") {
    const r = await L.refresh(cfg);
    console.error(r.output);
    if (r.validation && !r.validation.ok) { console.error("factory.json has errors:\n- " + r.validation.errors.join("\n- ")); process.exit(1); }
    if (!r.ok) process.exit(1);
    console.error(r.changed ? "Model updated" + (r.version ? " (previous version kept as " + r.version + ")" : "") : "Model unchanged");
    if (cmd === "daily") {
      const text = L.brief(cfg);
      const n = await L.notify(cfg, text);
      if (!n.ok) { console.error(n.output); process.exit(1); }
      console.error("Brief sent.");
    }
  } else if (cmd === "validate") {
    const file = args[1] || L.modelPath(cfg);
    const v = L.validate(JSON.parse(fs.readFileSync(file, "utf8")));
    for (const e of v.errors) console.log("ERROR " + e);
    for (const w of v.warnings) console.log("WARN  " + w);
    console.log(v.ok ? "OK" : "FAILED");
    process.exit(v.ok ? 0 : 1);
  } else {
    console.log(fs.readFileSync(__filename, "utf8").split("\n").filter((l) => l.startsWith("//")).map((l) => l.slice(3)).join("\n"));
    process.exit(cmd ? 1 : 0);
  }
})();

// What the agent needs to reason about, without the per-deal detail.
function summary(a) {
  return {
    asOf: a.asOf, company: a.company, band: a.band, counts: a.counts,
    goal: a.goal, goalView: strip(a.goalView), bottleneck: a.bottleneck, gates: a.gates, standards: a.standards,
    tasks: a.tasks.filter((t) => !t.done).slice(0, 10), plan: a.plan, excluded: a.excluded,
    levers: a.levers.slice(0, 8),
    baseline: { meetingsPerWeek: a.baseline.meetingsPerWeek, closesPerWeek: a.baseline.closesPerWeek, retainedPerWeek: a.baseline.retainedPerWeek, pushedPerWeek: a.baseline.pushedPerWeek, newArrPerYear: a.baseline.newArrPerYear, hitGoalWeek: a.baseline.projection.hitWeek, arr12: a.baseline.projection.arr12 },
    extreme: pick(a.extreme), scenario: a.scenario ? pick(a.scenario) : null,
    pullCompare: a.pullCompare, capacity: a.capacity && { utilization: a.capacity.utilization, maxDealsPerWeek: a.capacity.maxDealsPerWeek, maxDealsPerWeekExtreme: a.capacity.maxDealsPerWeekExtreme, hoursPerDeal: a.capacity.hoursPerDeal, hoursPerDealExtreme: a.capacity.hoursPerDealExtreme },
    rates: a.rates, steps: a.funnel.steps.map((s) => ({ key: s.key, conv: s.conv, resolved: s.resolved, open: s.open })),
    durations: a.durations.filter((d) => d.n),
    caseStudies: a.caseStudies.map((c) => ({ id: c.id, name: c.name, counts: c.counts, shareOfOutput: c.shareOfOutput })),
    dataQuality: a.dataQuality,
  };
}
function strip(gv) {
  const x = JSON.parse(JSON.stringify(gv));
  for (const k of ["now", "solved", "ceiling"]) if (x[k]) delete x[k].arr;
  return x;
}
function pick(s) {
  return { label: s.label, params: s.params, meetingsPerWeek: s.meetingsPerWeek, closesPerWeek: s.closesPerWeek, retainedPerWeek: s.retainedPerWeek, newArrPerYear: s.newArrPerYear,
    lagDays: s.lagDays, hitGoalWeek: s.projection.hitWeek, hitGoalDate: s.projection.hitDate, required: s.required, arr12: s.projection.arr12, arr36: s.projection.arr36, monteCarloHitWeek: s.monteCarlo.hitWeek, sellersFor100M5y: s.sellersFor100M5y };
}
