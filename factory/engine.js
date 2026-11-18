/*
 * AI Rob (the GTM agent): the case study factory engine.
 *
 * Pure math over factory.json. The agent (Claude Code, Codex, ...) does the
 * judgment: grading PULL, mapping each buyer onto stages, writing archetypes.
 * This file does the arithmetic so numbers are deterministic and testable:
 * fall-off by step, time per stage, inflow, capacity, PULL vs no PULL,
 * the six standards, the bottleneck ranking, and the projection to $100M.
 *
 * Runs unchanged in the browser (window.FactoryEngine) and in Node (require).
 * Model: MODEL.md in this folder.
 */
(function (root, make) {
  if (typeof module === "object" && module.exports) module.exports = make();
  else root.FactoryEngine = make();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const DAY = 86400000;
  const TARGET_ARR = 100e6;

  // Standards v1.0
  const BANDS = {
    big: { label: "$100k+", pipeline: 3, cycleDays: 90 },
    moderate: { label: "$25k to $99k", pipeline: 10, cycleDays: 30 },
    small: { label: "under $25k", pipeline: 15, cycleDays: 14 },
  };
  const BARS = { pullRate: 0.6, closeRate: 0.5, successRate: 0.95, successWithinDays: 30 };

  const DEFAULT_STAGES = [
    { id: "reached", name: "Reached out", machine: "pipeline" },
    { id: "replied", name: "Replied", machine: "pipeline" },
    { id: "booked", name: "Meeting booked", machine: "pipeline" },
    { id: "met", name: "First conversation", machine: "sales" },
    { id: "pull", name: "PULL", machine: "sales" },
    { id: "conceptual", name: "Conceptual fit", machine: "sales" },
    { id: "detailed", name: "Detailed fit", machine: "sales" },
    { id: "planning", name: "Project planning", machine: "sales" },
    { id: "closed", name: "Closed", machine: "sales" },
    { id: "indicator", name: "Hit X (leading indicator)", machine: "delivery" },
    { id: "renewed", name: "Renewed", machine: "delivery" },
  ];
  const DEFAULT_MILESTONES = { inflow: "met", pull: "pull", close: "closed", success: "indicator" };
  const DEFAULT_SETTINGS = { windowWeeks: 4, inflowWeeks: 12, staleDays: 45, horizonWeeks: 520, simRuns: 200, seed: 7 };

  // ---------- small utils ----------
  const toDate = (s) => (s instanceof Date ? s : new Date(String(s).length <= 10 ? s + "T00:00:00Z" : s));
  const days = (a, b) => (toDate(b) - toDate(a)) / DAY;
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const sum = (xs) => xs.reduce((a, b) => a + b, 0);
  const mean = (xs) => (xs.length ? sum(xs) / xs.length : null);
  function quantile(xs, q) {
    if (!xs.length) return null;
    const s = xs.slice().sort((a, b) => a - b);
    const pos = (s.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
    return s[lo] + (s[hi] - s[lo]) * (pos - lo);
  }
  const median = (xs) => quantile(xs, 0.5);
  function weekStart(d) {
    const x = toDate(d);
    const dow = (x.getUTCDay() + 6) % 7; // Monday = 0
    return new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate() - dow));
  }
  const iso = (d) => toDate(d).toISOString().slice(0, 10);
  const stepKey = (a, b) => a + ">" + b;

  // Deterministic RNG + samplers for the Monte Carlo (variation).
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function normal(r) {
    let u = 0, v = 0;
    while (u === 0) u = r();
    while (v === 0) v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function gamma(r, k) {
    if (k < 1) return gamma(r, k + 1) * Math.pow(r(), 1 / k);
    const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
    for (;;) {
      let x, v;
      do { x = normal(r); v = 1 + c * x; } while (v <= 0);
      v = v * v * v;
      const u = r();
      if (u < 1 - 0.0331 * x * x * x * x) return d * v;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  }
  function beta(r, a, b) { const x = gamma(r, a); return x / (x + gamma(r, b)); }
  function poisson(r, lambda) {
    if (lambda <= 0) return 0;
    if (lambda > 30) return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * normal(r)));
    const L = Math.exp(-lambda);
    let k = 0, p = 1;
    do { k++; p *= r(); } while (p > L);
    return k - 1;
  }

  // ---------- model normalization ----------
  function prepare(model) {
    const m = model || {};
    const stages = m.stages && m.stages.length ? m.stages : DEFAULT_STAGES;
    const idx = {};
    stages.forEach((s, i) => (idx[s.id] = i));
    const milestones = Object.assign({}, DEFAULT_MILESTONES, m.milestones || {});
    const settings = Object.assign({}, DEFAULT_SETTINGS, m.settings || {});
    const company = Object.assign({ band: "moderate", arr: 0, acv: null, annualChurn: null }, m.company || {});
    const asOf = toDate(m.asOf || m.generatedAt || new Date().toISOString());
    // the founder can remove records that are not sales (an internal sync, a
    // recruiting call); they stay in the file so the removal can be undone
    const all = m.entities || [];
    const entities = all.filter((e) => !e.excluded).map((e) => normEntity(e, idx, asOf, settings));
    const excluded = all.filter((e) => e.excluded);
    const goal = normGoal(m.goal);
    return {
      raw: m, stages, idx, milestones, settings, company, asOf, entities, excluded, goal,
      targetArr: goal.kind === "arr" ? goal.target : TARGET_ARR,
      band: BANDS[company.band] ? company.band : "moderate",
      caseStudies: m.caseStudies || [],
      capacity: m.capacity || [],
      pipelineCounts: m.pipelineCounts || [],
      levers: m.levers || [],
    };
  }

  function normEntity(e, idx, asOf, settings) {
    const events = (e.events || []).filter((v) => v && idx[v.stage] != null).map((v) => ({ stage: v.stage, at: v.at }))
      .sort((a, b) => idx[a.stage] - idx[b.stage]);
    const reachedAt = {};
    let maxIdx = -1, lastAt = null;
    for (const v of events) {
      reachedAt[v.stage] = v.at;
      maxIdx = Math.max(maxIdx, idx[v.stage]);
      if (v.at && (!lastAt || toDate(v.at) > toDate(lastAt))) lastAt = v.at;
    }
    const lost = !!(e.exit && e.exit.at !== undefined);
    const stalled = !lost && lastAt && days(lastAt, asOf) > settings.staleDays;
    return Object.assign({}, e, {
      pull: e.pull || "unknown", events, reachedAt, maxIdx, lastAt,
      lost, stalled, open: !lost && !stalled,
      startAt: null, // set per-milestone in analyze()
    });
  }

  // The founder's goal: an ARR target (optionally by a date) or a number of new
  // retained customers a week. Defaults to $100M ARR.
  function normGoal(g) {
    g = g || {};
    if (g.kind === "customers" && isNum(g.perWeek) && g.perWeek > 0) return { kind: "customers", perWeek: g.perWeek, label: g.label || null };
    const target = isNum(g.target) && g.target > 0 ? g.target : TARGET_ARR;
    const by = g.by && !isNaN(toDate(g.by)) ? iso(g.by) : null;
    return { kind: "arr", target, by, label: g.label || null };
  }

  const pullGroup = (p) => (p === "extreme" || p === "yes" ? "pull" : p === "no" ? "nopull" : "unknown");

  function applyFilters(P, f) {
    f = f || {};
    let from = f.from ? toDate(f.from) : null;
    if (!from && f.days) from = new Date(P.asOf - f.days * DAY);
    const to = f.to ? toDate(f.to) : null;
    const inflow = P.milestones.inflow;
    return P.entities.filter((e) => {
      if (f.caseStudy && f.caseStudy !== "all" && e.caseStudy !== f.caseStudy) return false;
      if (f.channel && f.channel !== "all" && e.channel !== f.channel) return false;
      if (f.owner && f.owner !== "all" && e.owner !== f.owner) return false;
      if (f.pull && f.pull !== "all") {
        if (f.pull === "extreme" ? e.pull !== "extreme" : pullGroup(e.pull) !== f.pull) return false;
      }
      const start = e.reachedAt[inflow] || (e.events[0] && e.events[0].at);
      if (from && (!start || toDate(start) < from)) return false;
      if (to && (!start || toDate(start) > to)) return false;
      return true;
    });
  }

  // ---------- fall-off by step ----------
  // got: the deal got to this stage at all. reached: it got there on the
  // factory's main line, which runs through PULL. A deal graded "no PULL" that
  // closes anyway was pushed; it is counted in the push branch, not here.
  function got(P, e, stageId) { return e.maxIdx >= P.idx[stageId]; }
  function reached(P, e, stageId) {
    if (!got(P, e, stageId)) return false;
    const pIdx = P.idx[P.milestones.pull];
    return !(e.pull === "no" && pIdx != null && P.idx[stageId] >= pIdx);
  }

  function stepStats(P, ents, a, b) {
    const s = { from: a, to: b, key: stepKey(a, b), entered: 0, continued: 0, lost: 0, stalled: 0, open: 0, pending: 0 };
    const isSuccess = b === P.milestones.success;
    for (const e of ents) {
      if (!reached(P, e, a)) continue;
      s.entered++;
      if (reached(P, e, b)) s.continued++;
      else if (b === P.milestones.pull && e.pull === "no") s.lost++; // graded: no PULL
      else if (e.lost) s.lost++;
      else if (isSuccess) {
        // success is only resolved once the window to hit X has passed
        const closedAt = e.reachedAt[a];
        if (closedAt && days(closedAt, P.asOf) > BARS.successWithinDays) s.lost++;
        else s.pending++;
      } else if (e.stalled && P.idx[a] < P.idx[P.milestones.success]) s.stalled++; // renewals are not "stalled" before they are due
      else s.open++;
    }
    s.resolved = s.continued + s.lost + s.stalled;
    s.conv = s.resolved ? s.continued / s.resolved : null;
    return s;
  }

  function aggregateCount(P, stageId, f) {
    let n = 0, any = false;
    for (const row of P.pipelineCounts) {
      if (f && f.channel && f.channel !== "all" && row.channel !== f.channel) continue;
      if (f && f.owner && f.owner !== "all" && row.owner && row.owner !== f.owner) continue;
      if (f && f.days && toDate(row.week) < new Date(P.asOf - f.days * DAY)) continue;
      if (row.counts && isNum(row.counts[stageId])) { n += row.counts[stageId]; any = true; }
    }
    return any ? n : null;
  }

  function funnel(P, ents, f) {
    const inflowIdx = P.idx[P.milestones.inflow];
    const counts = P.stages.map((s, i) => {
      const fromEnts = ents.filter((e) => reached(P, e, s.id)).length;
      const agg = i < inflowIdx ? aggregateCount(P, s.id, f) : null;
      return { id: s.id, name: s.name, machine: s.machine, count: agg != null ? Math.max(agg, fromEnts) : fromEnts, aggregate: agg != null };
    });
    const steps = [];
    for (let i = 0; i < P.stages.length - 1; i++) {
      const a = P.stages[i].id, b = P.stages[i + 1].id;
      if (i < inflowIdx) {
        // top of funnel is counted in aggregate (outreach is not one entity per person)
        const ca = counts[i].count, cb = counts[i + 1].count;
        steps.push({ from: a, to: b, key: stepKey(a, b), aggregate: true, entered: ca, continued: Math.min(ca, cb),
          lost: Math.max(0, ca - cb), stalled: 0, open: 0, pending: 0, resolved: ca, conv: ca ? Math.min(1, cb / ca) : null });
      } else steps.push(stepStats(P, ents, a, b));
    }
    // the push branch: deals with no PULL that the seller kept pushing
    const nop = ents.filter((e) => e.pull === "no" && got(P, e, P.milestones.inflow));
    const pWon = nop.filter((e) => got(P, e, P.milestones.close)).length;
    const pLost = nop.filter((e) => !got(P, e, P.milestones.close) && (e.lost || e.stalled)).length;
    const push = { deals: nop.length, won: pWon, resolved: pWon + pLost, closeRate: pWon + pLost ? pWon / (pWon + pLost) : null };
    return { stages: counts, steps, push };
  }

  // ---------- time by stage ----------
  function durations(P, ents) {
    const out = [];
    for (let i = 0; i < P.stages.length - 1; i++) {
      const a = P.stages[i].id, b = P.stages[i + 1].id, xs = [];
      for (const e of ents) if (e.reachedAt[a] && e.reachedAt[b]) xs.push(days(e.reachedAt[a], e.reachedAt[b]));
      out.push({ key: stepKey(a, b), from: a, to: b, n: xs.length, median: median(xs), p25: quantile(xs, 0.25), p75: quantile(xs, 0.75), min: xs.length ? Math.min(...xs) : null });
    }
    return out;
  }

  function spanDays(P, ents, a, b) {
    const xs = [];
    for (const e of ents) if (e.reachedAt[a] && e.reachedAt[b]) xs.push(days(e.reachedAt[a], e.reachedAt[b]));
    return xs;
  }

  function timelines(P, ents) {
    const start = P.milestones.inflow, sIdx = P.idx[start];
    const rows = ents.filter((e) => e.reachedAt[start]).map((e) => ({
      id: e.id, name: e.name, company: e.company, pull: e.pull, caseStudy: e.caseStudy,
      status: got(P, e, P.milestones.close) ? "won" : e.lost ? "lost" : e.stalled ? "stalled" : "open",
      points: e.events.filter((v) => P.idx[v.stage] >= sIdx && v.at).map((v) => ({ stage: v.stage, day: days(e.reachedAt[start], v.at) })),
      lastDay: e.lastAt ? days(e.reachedAt[start], e.lost && e.exit.at ? e.exit.at : (e.open ? P.asOf : e.lastAt)) : 0,
    }));
    const build = (cohort, agg) => {
      let cum = 0; const pts = [{ stage: start, day: 0 }];
      const end = P.idx[P.milestones.success] != null ? P.idx[P.milestones.success] : P.stages.length - 1;
      for (let i = sIdx; i < end; i++) {
        const xs = spanDays(P, cohort, P.stages[i].id, P.stages[i + 1].id);
        if (!xs.length) break;
        cum += agg(xs);
        pts.push({ stage: P.stages[i + 1].id, day: cum });
      }
      return pts;
    };
    const extreme = ents.filter((e) => e.pull === "extreme");
    return {
      rows,
      median: build(ents, median),
      extremeFastest: build(extreme.length ? extreme : ents.filter((e) => pullGroup(e.pull) === "pull"), (xs) => Math.min(...xs)),
    };
  }

  // ---------- inflow ----------
  function inflow(P, ents, f) {
    const n = P.settings.inflowWeeks, end = weekStart(P.asOf);
    const weeks = [];
    for (let i = n - 1; i >= 0; i--) weeks.push(iso(new Date(end - i * 7 * DAY)));
    const channels = {};
    const byWeek = weeks.map((w, i) => ({ week: w, total: 0, byChannel: {}, partial: i === weeks.length - 1 }));
    const inflowStage = P.milestones.inflow;
    for (const e of ents) {
      const at = e.reachedAt[inflowStage];
      if (!at) continue;
      const w = iso(weekStart(at)), row = byWeek.find((r) => r.week === w);
      if (!row) continue;
      const ch = e.channel || "Unknown";
      channels[ch] = true;
      row.total++;
      row.byChannel[ch] = (row.byChannel[ch] || 0) + 1;
    }
    // averages use completed weeks only; the current week is still filling up
    const recent = byWeek.slice(-P.settings.windowWeeks - 1, -1);
    // top-of-funnel aggregates by week (pipeline machine)
    const topStage = P.stages[0].id;
    const agg = weeks.map((w) => {
      let v = null;
      for (const row of P.pipelineCounts) {
        if (iso(weekStart(row.week)) !== w) continue;
        if (f && f.channel && f.channel !== "all" && row.channel !== f.channel) continue;
        if (row.counts && isNum(row.counts[topStage])) v = (v || 0) + row.counts[topStage];
      }
      return v;
    });
    return {
      stage: inflowStage, weeks: byWeek, channels: Object.keys(channels),
      avgPerWeek: mean(recent.map((r) => r.total)), bar: BANDS[P.band].pipeline,
      top: { stage: topStage, weeks: weeks.map((w, i) => ({ week: w, count: agg[i] })) },
    };
  }

  // ---------- effort + capacity ----------
  function effort(ents) {
    const withE = ents.filter((e) => e.effort);
    const pick = (k) => withE.map((e) => e.effort[k]).filter(isNum);
    return {
      n: withE.length,
      meetings: mean(pick("meetings")), hours: mean(pick("hours")), touches: mean(pick("touches")),
      total: { meetings: sum(pick("meetings")), hours: sum(pick("hours")), touches: sum(pick("touches")) },
    };
  }

  function capacity(P, ents) {
    if (!P.capacity.length) return null;
    const all = effort(ents.filter((e) => e.reachedAt[P.milestones.inflow]));
    const ext = effort(ents.filter((e) => e.pull === "extreme"));
    const sellers = P.capacity.map((c) => {
      const sellingHours = isNum(c.sellingHours) ? c.sellingHours : c.weeklyHours;
      const booked = c.bookedSalesHours || 0;
      return {
        owner: c.owner, weeklyHours: c.weeklyHours, sellingHours, booked,
        free: Math.max(0, sellingHours - booked), utilization: sellingHours ? booked / sellingHours : null,
        maxDeals: all.hours ? sellingHours / all.hours : null,
        maxDealsExtreme: ext.hours ? sellingHours / ext.hours : null,
      };
    });
    const sellingHours = sum(sellers.map((s) => s.sellingHours));
    const booked = sum(sellers.map((s) => s.booked));
    return {
      sellers, sellingHours, booked, utilization: sellingHours ? booked / sellingHours : null,
      hoursPerDeal: all.hours, hoursPerDealExtreme: ext.hours,
      maxDealsPerWeek: all.hours ? sellingHours / all.hours : null,
      maxDealsPerWeekExtreme: ext.hours ? sellingHours / ext.hours : null,
    };
  }

  // ---------- PULL vs no PULL ----------
  function cohortStats(P, ents) {
    const start = P.milestones.inflow, close = P.milestones.close;
    const deals = ents.filter((e) => got(P, e, start));
    const won = deals.filter((e) => got(P, e, close));
    const lost = deals.filter((e) => !got(P, e, close) && (e.lost || e.stalled));
    const eff = effort(deals), wonN = won.length;
    return {
      deals: deals.length, won: wonN, lost: lost.length, open: deals.length - wonN - lost.length,
      closeRate: wonN + lost.length ? wonN / (wonN + lost.length) : null,
      daysToClose: median(spanDays(P, won, start, close)),
      effortPerDeal: { meetings: eff.meetings, hours: eff.hours, touches: eff.touches, n: eff.n },
      effortTotal: eff.total,
      effortPerWin: wonN && eff.n ? { meetings: eff.total.meetings / wonN, hours: eff.total.hours / wonN, touches: eff.total.touches / wonN } : null,
    };
  }

  function pullCompare(P, ents) {
    const pull = cohortStats(P, ents.filter((e) => pullGroup(e.pull) === "pull"));
    const nopull = cohortStats(P, ents.filter((e) => pullGroup(e.pull) === "nopull"));
    const extreme = cohortStats(P, ents.filter((e) => e.pull === "extreme"));
    const ratio = (a, b) => (isNum(a) && isNum(b) && a > 0 ? b / a : null);
    return {
      pull, nopull, extreme,
      delta: {
        closeRatePts: isNum(pull.closeRate) && isNum(nopull.closeRate) ? (pull.closeRate - nopull.closeRate) * 100 : null,
        daysToClose: isNum(pull.daysToClose) && isNum(nopull.daysToClose) ? nopull.daysToClose - pull.daysToClose : null,
        fasterX: ratio(pull.daysToClose, nopull.daysToClose),
        hoursPerWinX: ratio(pull.effortPerWin && pull.effortPerWin.hours, nopull.effortPerWin && nopull.effortPerWin.hours),
        meetingsPerWinX: ratio(pull.effortPerWin && pull.effortPerWin.meetings, nopull.effortPerWin && nopull.effortPerWin.meetings),
      },
    };
  }

  // ---------- the six standards ----------
  function standards(P, ents, fun, inf) {
    const bar = BANDS[P.band], M = P.milestones;
    const step = (a, b) => fun.steps.find((s) => s.key === stepKey(a, b));
    const composite = (a, b) => {
      const st = stepStats(P, ents, a, b);
      // close covers several sales stages; resolve it over the whole span
      let won = 0, lostN = 0;
      for (const e of ents) {
        if (!reached(P, e, a)) continue;
        if (reached(P, e, b)) won++;
        else if (e.lost || e.stalled) lostN++;
      }
      return { n: won + lostN, value: won + lostN ? won / (won + lostN) : st.conv };
    };
    const gates = gatesOf(P, ents);
    const pullStep = step(M.inflow, M.pull) || stepStats(P, ents, M.inflow, M.pull);
    const close = composite(M.pull, M.close);
    const cycle = spanDays(P, ents, M.pull, M.close);
    const succ = (() => {
      let ok = 0, n = 0;
      for (const e of ents) {
        const c = e.reachedAt[M.close];
        if (!c && !got(P, e, M.close)) continue;
        const s = e.reachedAt[M.success];
        if (s && c && days(c, s) <= BARS.successWithinDays) { ok++; n++; }
        else if (c && days(c, P.asOf) > BARS.successWithinDays) n++;
        else if (!c && got(P, e, M.success)) { ok++; n++; }
      }
      return { n, value: n ? ok / n : null };
    })();
    const grade = (v, b, lowerIsBetter) => (v == null ? "unknown" : (lowerIsBetter ? v <= b : v >= b) ? "pass" : "miss");
    return [
      { id: "caseStudy", label: "Repeatable case study", value: gates.repeatable.count, bar: 3, unit: "repeats",
        status: gates.repeatable.pass ? "pass" : "miss",
        note: !P.caseStudies.length ? "No archetype written yet" : gates.repeatable.pass ? "Repeats 3+ times" : gates.repeatable.count + " of 3 needed (bought and hit X)" },
      { id: "pipeline", label: "Pipeline", value: inf.avgPerWeek, bar: bar.pipeline, unit: "first meetings / week",
        status: inf.avgPerWeek == null || !ents.length ? "unknown" : grade(inf.avgPerWeek, bar.pipeline), n: ents.length },
      { id: "pullRate", label: "Pull rate", value: pullStep.conv, bar: BARS.pullRate, unit: "of first meetings", n: pullStep.resolved,
        status: grade(pullStep.conv, BARS.pullRate) },
      { id: "closeRate", label: "Close rate", value: close.value, bar: BARS.closeRate, unit: "of pull meetings", n: close.n,
        status: grade(close.value, BARS.closeRate) },
      { id: "cycleTime", label: "Cycle time", value: median(cycle), bar: bar.cycleDays, unit: "days, pull to signed", n: cycle.length,
        status: grade(median(cycle), bar.cycleDays, true) },
      { id: "successRate", label: "Success rate", value: succ.value, bar: BARS.successRate, unit: "hit X within a month", n: succ.n,
        status: grade(succ.value, BARS.successRate) },
    ];
  }

  // REAL PULL -> CASE STUDY -> REPEATABLE CASE STUDY 
  function gatesOf(P, ents) {
    const M = P.milestones;
    const pulled = ents.filter((e) => pullGroup(e.pull) === "pull" || reached(P, e, M.pull));
    const bought = pulled.filter((e) => reached(P, e, M.close));
    const succeeded = bought.filter((e) => reached(P, e, M.success));
    // repeats are counted inside one archetype: the one with the most successes
    const byCs = {};
    for (const e of succeeded) byCs[e.caseStudy || "_"] = (byCs[e.caseStudy || "_"] || 0) + 1;
    const best = Object.keys(byCs).sort((a, b) => byCs[b] - byCs[a])[0];
    const count = best ? byCs[best] : 0;
    return {
      realPull: { pass: pulled.length > 0, count: pulled.length },
      caseStudy: { pass: succeeded.length > 0 || bought.length > 0, count: succeeded.length, bought: bought.length },
      repeatable: { pass: count >= 3 && !!P.caseStudies.length, count, caseStudy: best && best !== "_" ? best : null },
    };
  }

  // ---------- the flow model (machines in series) ----------
  function chainOf(P, fun) {
    const inflowIdx = P.idx[P.milestones.inflow];
    let top = inflowIdx;
    for (let i = 0; i < inflowIdx; i++) if (fun.stages[i].aggregate && fun.stages[i].count > 0) { top = i; break; }
    const succIdx = P.idx[P.milestones.success];
    const end = isNum(succIdx) ? succIdx : P.idx[P.milestones.close];
    return P.stages.slice(top, end + 1).map((s) => s.id);
  }

  // Top-of-funnel volume per week, calibrated so the model's first meetings
  // match the first meetings actually held in the window.
  function weeklyTop(P, fun, inf, chain, rates) {
    if (chain[0] === P.milestones.inflow) return inf.avgPerWeek || 0;
    let yieldToInflow = 1;
    for (let i = 1; i < chain.length && chain[i - 1] !== P.milestones.inflow; i++) yieldToInflow *= rates[stepKey(chain[i - 1], chain[i])] || 0;
    if (inf.avgPerWeek && yieldToInflow > 0) return inf.avgPerWeek / yieldToInflow;
    const weeks = inf.top.weeks.slice(-P.settings.windowWeeks - 1, -1).map((w) => w.count).filter(isNum);
    return weeks.length ? mean(weeks) : 0;
  }

  // Steady state: volume at each stage per week, capped at the inflow stage by
  // calendar capacity. Output = retained customers per week.
  function flow(P, chain, rates, topPerWeek, cap) {
    const vol = [topPerWeek];
    let capped = false;
    for (let i = 1; i < chain.length; i++) {
      let v = vol[i - 1] * (isNum(rates[stepKey(chain[i - 1], chain[i])]) ? rates[stepKey(chain[i - 1], chain[i])] : 0);
      if (chain[i] === P.milestones.inflow && isNum(cap) && v > cap) { v = cap; capped = true; }
      vol.push(v);
    }
    if (chain[0] === P.milestones.inflow && isNum(cap) && vol[0] > cap) {
      const k = cap / vol[0];
      for (let i = 0; i < vol.length; i++) vol[i] *= k;
      capped = true;
    }
    const at = (id) => { const i = chain.indexOf(id); return i < 0 ? null : vol[i]; };
    // pushed deals: first meetings without PULL that close anyway
    const M = P.milestones, pr = rates[stepKey(M.inflow, M.pull)], sr = rates[stepKey(M.close, M.success)];
    const pushedCloses = isNum(rates.pushClose) && isNum(pr) && at(M.inflow) != null ? at(M.inflow) * (1 - pr) * rates.pushClose : 0;
    const pushedRetained = pushedCloses * (isNum(sr) ? sr : 1);
    const mainRetained = at(M.success) != null ? at(M.success) : at(M.close);
    return {
      volumes: chain.map((id, i) => ({ stage: id, perWeek: vol[i] })),
      meetingsPerWeek: at(M.inflow), closesPerWeek: (at(M.close) || 0) + pushedCloses,
      retainedPerWeek: (mainRetained || 0) + pushedRetained, pushedPerWeek: pushedRetained,
      capped,
    };
  }

  function ratesFor(P, fun, chain, cohortFun) {
    const r = {};
    for (let i = 1; i < chain.length; i++) {
      const k = stepKey(chain[i - 1], chain[i]);
      const own = cohortFun && cohortFun.steps.find((s) => s.key === k);
      const base = fun.steps.find((s) => s.key === k);
      r[k] = own && own.conv != null && (own.resolved >= 2 || own.aggregate) ? own.conv : base ? base.conv : null;
    }
    const cp = cohortFun && cohortFun.push;
    r.pushClose = cp && cp.resolved >= 2 ? cp.closeRate : fun.push ? fun.push.closeRate : null;
    return r;
  }

  // ---------- levers + bottleneck ----------
  function levers(P, ents, fun, chain, rates, top, cap, inf, capInfo) {
    const base = flow(P, chain, rates, top, cap);
    const out = [];
    const extreme = ents.filter((e) => e.pull === "extreme");
    const pulled = ents.filter((e) => pullGroup(e.pull) === "pull");
    const exFun = funnel(P, extreme.length >= 3 ? extreme : pulled);
    const M = P.milestones, name = (id) => (P.stages[P.idx[id]] || {}).name || id;
    const add = (l) => {
      const inputs = { rates: l.rates || rates, top: isNum(l.top) ? l.top : top, cap: l.cap !== undefined ? l.cap : cap };
      const after = flow(P, chain, inputs.rates, inputs.top, inputs.cap);
      // kept off the JSON: what the factory looks like with this lever pulled
      Object.defineProperty(l, "inputs", { value: inputs, enumerable: false });
      out.push(Object.assign(l, { gain: after.retainedPerWeek - base.retainedPerWeek, after: after.retainedPerWeek }));
    };
    // 1) each step to what is achievable (the standard, or what the PULL cohort already does)
    for (let i = 1; i < chain.length; i++) {
      const a = chain[i - 1], b = chain[i], k = stepKey(a, b), cur = rates[k];
      if (!isNum(cur)) continue;
      let target = null, why = null, label = name(a) + " → " + name(b);
      if (a === M.inflow && b === M.pull) {
        // targeting: the standard, or the best channel already pulling above it
        label = "Targeting: first meetings with PULL";
        target = BARS.pullRate; why = "The 60% pull-rate standard";
        const byCh = {};
        for (const e of ents) if (e.channel) (byCh[e.channel] = byCh[e.channel] || []).push(e);
        for (const ch of Object.keys(byCh)) {
          const st = stepStats(P, byCh[ch], a, b);
          if (st.resolved >= 5 && st.conv > target) { target = Math.min(0.95, st.conv); why = "Your " + ch + " meetings already pull at " + Math.round(st.conv * 100) + "% (n=" + st.resolved + ")"; }
        }
      } else {
        if (b === M.success) { target = BARS.successRate; why = "The 95% success-rate standard"; }
        const ex = exFun.steps.find((s) => s.key === k);
        if (ex && ex.conv != null && ex.resolved >= 3 && (target == null || Math.min(0.95, ex.conv) > target)) {
          target = Math.min(0.95, ex.conv); why = (extreme.length >= 3 ? "What your extreme-PULL deals already do" : "What your PULL deals already do") + " (n=" + ex.resolved + ")";
        }
      }
      if (target != null && target > cur + 1e-9) {
        add({ id: "step:" + k, kind: "conversion", step: k, label, current: cur, achievable: target, why,
          rates: Object.assign({}, rates, { [k]: target }) });
      }
    }
    // the close-rate standard spans several sales stages
    const pIdx = chain.indexOf(M.pull), cIdx = chain.indexOf(M.close);
    if (pIdx >= 0 && cIdx > pIdx) {
      let prod = 1;
      for (let i = pIdx + 1; i <= cIdx; i++) prod *= isNum(rates[stepKey(chain[i - 1], chain[i])]) ? rates[stepKey(chain[i - 1], chain[i])] : 0;
      if (prod < BARS.closeRate) {
        const n = cIdx - pIdx, f = prod > 0 ? Math.pow(BARS.closeRate / prod, 1 / n) : null;
        if (f) {
          const r2 = Object.assign({}, rates);
          for (let i = pIdx + 1; i <= cIdx; i++) { const k = stepKey(chain[i - 1], chain[i]); r2[k] = Math.min(1, r2[k] * f); }
          add({ id: "standard:closeRate", kind: "conversion", step: stepKey(M.pull, M.close), label: "Close rate (PULL → Closed)", current: prod, achievable: BARS.closeRate, why: "The 50% close-rate standard", rates: r2 });
        }
      }
    }
    // 2) volume: pipeline to the standard, and calendars filled
    const meetings = base.meetingsPerWeek || 0, bar = BANDS[P.band].pipeline;
    if (meetings < bar) {
      const scale = meetings > 0 ? bar / meetings : null;
      if (scale) add({ id: "volume:standard", kind: "volume", label: "Pipeline to " + bar + " first meetings / week", current: meetings, achievable: bar, why: "The pipeline standard for your band", top: top * scale, cap: Math.max(isNum(cap) ? cap : 0, bar) });
    }
    if (capInfo && isNum(capInfo.maxDealsPerWeek) && capInfo.maxDealsPerWeek > meetings * 1.05 && meetings > 0) {
      add({ id: "volume:calendar", kind: "volume", label: "Fill sellers' calendars", current: meetings, achievable: capInfo.maxDealsPerWeek, why: "Free selling hours ÷ hours per deal", top: top * (capInfo.maxDealsPerWeek / meetings), cap: capInfo.maxDealsPerWeek });
    }
    // 3) custom levers the agent wrote (e.g. "LinkedIn allows 150 requests / week")
    for (const L of P.levers) {
      if (L.step && isNum(L.achievable)) add({ id: "custom:" + (L.id || L.step), kind: "conversion", step: L.step, label: L.label || L.step, current: rates[L.step], achievable: L.achievable, why: L.why, rates: Object.assign({}, rates, { [L.step]: L.achievable }) });
      else if (L.inflow && isNum(L.achievable) && top > 0) add({ id: "custom:" + (L.id || "inflow"), kind: "volume", label: L.label || "Inflow", current: top, achievable: L.achievable, why: L.why, top: L.achievable, cap: null });
    }
    out.sort((a, b) => b.gain - a.gain);
    out.forEach((l) => delete l.rates);
    return { baseline: base, list: out };
  }

  function bottleneckOf(P, gates, lev, stds) {
    if (!gates.realPull.pass) return { kind: "gate", id: "realPull", title: "Find who has PULL", why: "Not one conversation shows real PULL yet. Until you know who has it, nothing downstream matters." };
    if (!gates.caseStudy.pass) return { kind: "gate", id: "caseStudy", title: "Get one case study", why: "Someone has PULL, but nobody has bought and hit X yet. Get one. By hand. Goblin mode." };
    if (!gates.repeatable.pass) return { kind: "gate", id: "repeatable", title: P.caseStudies.length ? "Repeat the case study by hand" : "Write the archetype down",
      why: P.caseStudies.length ? gates.repeatable.count + " of 3 customers in one archetype have bought and hit X. Repeat it by hand before you build anything." : "Customers are succeeding, but nobody has written down who they are and why they bought. Do that first." };
    const top = lev.list[0];
    if (top && top.gain > 1e-6) return { kind: "lever", id: top.id, title: top.label, why: "Worth +" + top.gain.toFixed(2) + " retained customers / week, the largest achievable gain in the factory.", lever: top };
    const unknown = stds.find((s) => s.status === "unknown");
    if (unknown) return { kind: "unknown", id: unknown.id, title: "Measure your " + unknown.label.toLowerCase(), why: "You cannot run a factory around a number you cannot name." };
    return { kind: "none", id: "none", title: "Nothing measurable is holding you back", why: "Every number with a bar clears it. Time to raise the bar (Standards v2.0)." };
  }

  // ---------- projection to $100M ----------
  function project(P, opts) {
    const H = opts.horizonWeeks || P.settings.horizonWeeks;
    const acv = opts.acv || P.company.acv || 0;
    const target = opts.target || P.targetArr;
    const churn = isNum(opts.annualChurn) ? opts.annualChurn : isNum(P.company.annualChurn) ? P.company.annualChurn : 0.1;
    const wChurn = 1 - Math.pow(1 - churn, 1 / 52);
    const lag = Math.max(0, Math.round(opts.lagWeeks || 0));
    const before = opts.baselinePerWeek || 0, after = opts.retainedPerWeek || 0;
    const arr = [], step = 4;
    let a = P.company.arr || 0, hit = null;
    for (let w = 0; w <= H; w++) {
      if (w % step === 0 || w === H) arr.push({ week: w, arr: a });
      if (hit == null && a >= target) hit = w;
      const ramp = w < lag ? before + (after - before) * (w / Math.max(1, lag)) : after;
      a = a * (1 - wChurn) + ramp * acv;
    }
    return { arr, hitWeek: hit, hitDate: hit == null ? null : iso(new Date(+P.asOf + hit * 7 * DAY)), arr12: arrAt(arr, 52), arr36: arrAt(arr, 156), acv, annualChurn: churn, target };
  }
  function arrAt(series, w) { const p = series.find((x) => x.week >= w); return p ? p.arr : series[series.length - 1].arr; }

  // Variation: sample each step's rate from its own evidence, inflow from Poisson.
  function monteCarlo(P, chain, fun, rates, top, cap, opts) {
    const R = rng(P.settings.seed), runs = P.settings.simRuns, H = opts.horizonWeeks || P.settings.horizonWeeks;
    const acv = opts.acv || P.company.acv || 0, target = opts.target || P.targetArr;
    const churn = isNum(opts.annualChurn) ? opts.annualChurn : isNum(P.company.annualChurn) ? P.company.annualChurn : 0.1;
    const wChurn = 1 - Math.pow(1 - churn, 1 / 52);
    const ev = {};
    for (const s of fun.steps) ev[s.key] = s;
    if (fun.push) ev.pushClose = fun.push;
    const marks = [], hits = [], step = 4;
    for (let w = 0; w <= H; w += step) marks.push([]);
    for (let r = 0; r < runs; r++) {
      const sampled = {};
      for (const k of Object.keys(rates)) {
        if (rates[k] == null) { sampled[k] = null; continue; }
        const e = ev[k], target = rates[k];
        if (!isNum(target)) { sampled[k] = 0; continue; }
        // spread from the evidence behind this step, centred on the rate used
        // mean-preserving: centred on the rate used, as wide as the evidence is thin
        const k2 = (e && e.resolved ? Math.min(e.resolved, 200) : 4) + 2;
        sampled[k] = beta(R, Math.max(0.05, target * k2), Math.max(0.05, (1 - target) * k2));
      }
      const f = flow(P, chain, sampled, 1, null);
      const yieldPerTop = f.retainedPerWeek || 0;
      let a = P.company.arr || 0, hit = null;
      for (let w = 0; w <= H; w++) {
        if (w % step === 0) marks[w / step].push(a);
        if (hit == null && a >= target) hit = w;
        // a full calendar holds a fixed number of meetings; otherwise inflow varies
        const inflowW = isNum(cap) && chain[0] === P.milestones.inflow && top >= cap ? cap : poisson(R, top);
        a = a * (1 - wChurn) + poisson(R, inflowW * yieldPerTop) * acv;
      }
      hits.push(hit == null ? Infinity : hit);
    }
    const band = marks.map((xs, i) => ({ week: i * step, p10: quantile(xs, 0.1), p50: quantile(xs, 0.5), p90: quantile(xs, 0.9) }));
    const hq = (q) => { const v = quantile(hits, q); return isFinite(v) ? v : null; };
    return { band, hitWeek: { p10: hq(0.1), p50: hq(0.5), p90: hq(0.9) } };
  }

  function sellersNeeded(P, perSellerRetainedPerWeek, acv, churn, years, target) {
    if (!(perSellerRetainedPerWeek > 0) || !acv) return null;
    const c = isNum(churn) ? churn : 0.1, T = years, a0 = P.company.arr || 0, X = target || P.targetArr;
    const keep = Math.pow(1 - c, T);
    const needPerYear = c > 0 ? ((X - a0 * keep) * c) / (1 - keep) : (X - a0) / T;
    return Math.ceil(needPerYear / (perSellerRetainedPerWeek * 52 * acv));
  }

  // ---------- goal seek ----------
  // Retained customers a week needed to reach `target` ARR in `weeks`, from the
  // projection's own recurrence: ARR(w+1) = ARR(w) * k + r * ACV, k = 1 - weekly churn.
  function requiredPerWeek(P, target, weeks, opts) {
    opts = opts || {};
    const acv = opts.acv || P.company.acv || 0, a0 = P.company.arr || 0;
    if (!acv || !(weeks > 0)) return null;
    if (a0 >= target) return 0;
    const churn = isNum(opts.annualChurn) ? opts.annualChurn : isNum(P.company.annualChurn) ? P.company.annualChurn : 0.1;
    const k = Math.pow(1 - churn, 1 / 52), kT = Math.pow(k, weeks);
    return k < 1 ? ((target - a0 * kT) * (1 - k)) / (acv * (1 - kT)) : (target - a0) / (acv * weeks);
  }

  // What reaching the goal by a date takes, in the founder's units: retained
  // customers, first meetings and sellers a week, at a given factory's yield.
  function required(P, goal, f, sellers, opts) {
    if (!goal || !goal.by) return null;
    const weeks = Math.max(1, Math.round(days(P.asOf, goal.by) / 7));
    const perWeek = requiredPerWeek(P, goal.target || P.targetArr, weeks, opts);
    if (perWeek == null) return { by: iso(goal.by), weeks, retainedPerWeek: null };
    const yieldPerMeeting = f && f.meetingsPerWeek > 0 ? f.retainedPerWeek / f.meetingsPerWeek : null;
    const perSeller = f && sellers > 0 ? f.retainedPerWeek / sellers : null;
    return {
      by: iso(goal.by), weeks, target: goal.target || P.targetArr, retainedPerWeek: perWeek,
      multiple: f && f.retainedPerWeek > 0 ? perWeek / f.retainedPerWeek : null,
      meetingsPerWeek: yieldPerMeeting ? perWeek / yieldPerMeeting : null,
      sellers: perSeller ? Math.ceil(perWeek / perSeller) : null,
    };
  }
  function sellerCount(P, capInfo) {
    return Math.max(1, capInfo && capInfo.sellers.length ? capInfo.sellers.length : (P.company.sellers || []).length || 1);
  }

  // ---------- scenarios ----------
  // A scenario is a set of overrides the agent writes from a question like
  // "what if we only sell to X and fill our calendars?"
  function scenario(P, base, sc) {
    sc = sc || {};
    const cohort = sc.cohort ? applyFilters(P, sc.cohort) : null;
    const cFun = cohort ? funnel(P, cohort) : null;
    let chain = base.chain;
    let rates = ratesFor(P, base.funnel, chain, cFun);
    if (sc.rates) rates = Object.assign({}, rates, sc.rates);
    let top = base.top, cap = base.cap;
    const capInfo = base.capacity;
    let hoursPerDeal = capInfo && capInfo.hoursPerDeal;
    if (cohort) { const e = effort(cohort); if (isNum(e.hours)) hoursPerDeal = e.hours; }
    if (isNum(sc.hoursPerDeal)) hoursPerDeal = sc.hoursPerDeal;
    const sellingHours = (capInfo ? capInfo.sellingHours : 0) + (sc.sellersAdded || 0) * (sc.hoursPerSeller || (capInfo && capInfo.sellers.length ? capInfo.sellingHours / capInfo.sellers.length : 20));
    const capMax = hoursPerDeal && sellingHours ? sellingHours / hoursPerDeal : null;
    if (sc.fillCalendar || isNum(sc.meetingsPerWeek)) {
      // pin the inflow stage directly: calendars are the constraint, not outreach
      const iIdx = chain.indexOf(P.milestones.inflow);
      chain = chain.slice(iIdx);
      top = isNum(sc.meetingsPerWeek) ? sc.meetingsPerWeek : capMax != null ? capMax : BANDS[P.band].pipeline;
      cap = capMax;
    } else if (isNum(sc.topPerWeek)) top = sc.topPerWeek;
    else if (capMax != null) cap = capMax;
    const f = flow(P, chain, rates, top, cap);
    const lagSrc = cohort || base.ents;
    const lagDays = sc.fastest ? sum(durations(P, lagSrc).filter((d) => P.idx[d.from] >= P.idx[P.milestones.inflow] && P.idx[d.to] <= P.idx[P.milestones.close] && d.min != null).map((d) => d.min))
      : median(spanDays(P, lagSrc, P.milestones.inflow, P.milestones.close));
    const goal = sc.goal ? normGoal(Object.assign({ kind: "arr" }, sc.goal)) : null;
    const opts = { acv: sc.acv, annualChurn: sc.annualChurn, horizonWeeks: sc.horizonWeeks, target: goal && goal.kind === "arr" ? goal.target : undefined };
    const proj = project(P, Object.assign({ baselinePerWeek: base.flow.retainedPerWeek, retainedPerWeek: f.retainedPerWeek, lagWeeks: (lagDays || 0) / 7 }, opts));
    const mc = monteCarlo(P, chain, cFun || base.funnel, rates, top, cap, opts);
    const sellers = Math.max(1, (capInfo ? capInfo.sellers.length : 1) + (sc.sellersAdded || 0));
    return {
      label: sc.label || "Scenario", params: sc, chain, rates, flow: f, meetingsPerWeek: f.meetingsPerWeek, lagDays,
      closesPerWeek: f.closesPerWeek, retainedPerWeek: f.retainedPerWeek,
      newArrPerYear: (f.retainedPerWeek || 0) * 52 * (sc.acv || P.company.acv || 0),
      projection: proj, monteCarlo: mc,
      sellersFor100M5y: sellersNeeded(P, (f.retainedPerWeek || 0) / sellers, sc.acv || P.company.acv, isNum(sc.annualChurn) ? sc.annualChurn : P.company.annualChurn, 5),
      required: goal ? required(P, goal, f, sellers, opts) : null,
    };
  }

  // ---------- data quality ----------
  function quality(P, ents, stds, capInfo) {
    const out = (P.raw.dataQuality || []).slice();
    const add = (level, message, fix) => out.push({ level, message, fix, source: "engine" });
    if (!P.raw.entities || !P.raw.entities.length) add("critical", "No conversations in here yet.", "Connect your call recorder, or just paste me a few calls.");
    if (!P.capacity.length) add("warning", "No calendar data, so capacity and seller effort are unknown.", "Connect your calendar.");
    if (!ents.some((e) => e.effort)) add("warning", "No effort data per deal (meetings, hours, touches).", "Connect calendar and email so effort can be counted.");
    if (!P.pipelineCounts.length) add("info", "Top of funnel (outreach, replies) is not tracked, so the pipeline machine starts at first meetings.", "Connect your outreach tool or log weekly counts.");
    const unk = ents.filter((e) => e.pull === "unknown" && e.reachedAt[P.milestones.inflow]).length;
    if (unk) add("info", unk + " conversation" + (unk > 1 ? "s have" : " has") + " no PULL grade yet.", "Refresh and I will grade them.");
    if (!P.company.acv) add("warning", "No contract size (ACV), so ARR cannot be projected.", "Tell me your typical first contract value.");
    if (!isNum(P.company.annualChurn)) add("info", "Churn not known; projections assume 10% a year of retained customers.", "Tell me your churn or renewal rate.");
    for (const s of stds) if (s.status !== "unknown" && isNum(s.n) && s.n > 0 && s.n < 5) add("info", s.label + " is based on only " + s.n + " data point" + (s.n > 1 ? "s" : "") + ".", "Treat it as a rough guess, not a fact.");
    if (P.raw.generatedAt && days(P.raw.generatedAt, new Date()) > 7) add("warning", "Data is " + Math.round(days(P.raw.generatedAt, new Date())) + " days old.", "Refresh.");
    return out;
  }

  // ---------- case studies ----------
  function caseStudies(P, ents) {
    const succIds = new Set(ents.filter((e) => got(P, e, P.milestones.success)).map((e) => e.id));
    const total = succIds.size;
    const byId = {};
    for (const e of P.entities) byId[e.id] = e;
    return P.caseStudies.map((cs) => {
      const tagged = P.entities.filter((e) => e.caseStudy === cs.id).map((e) => ({ entity: e.id, grade: null }));
      const listed = (cs.fits || []).slice();
      for (const t of tagged) if (!listed.some((f) => f.entity === t.entity)) listed.push(t);
      const fits = listed.map((f) => {
        const e = byId[f.entity] || {};
        return Object.assign({}, f, {
          name: e.name || f.entity, company: e.company, pull: e.pull,
          status: !e.id ? "unknown" : got(P, e, P.milestones.success) ? "succeeded" : got(P, e, P.milestones.close) ? "customer" : e.lost ? "lost" : e.stalled ? "stalled" : "prospect",
        });
      });
      const won = fits.filter((f) => f.status === "succeeded").length;
      return Object.assign({}, cs, { fits, counts: { fits: fits.length, customers: fits.filter((f) => f.status === "customer" || f.status === "succeeded").length, succeeded: won },
        shareOfOutput: total ? fits.filter((f) => succIds.has(f.entity)).length / total : null });
    });
  }

  // ---------- the goal: today's pace vs the bottleneck solved ----------
  function goalView(P, base, bottleneck, extreme, capInfo, lagDays, ctx) {
    const g = P.goal, sellers = sellerCount(P, capInfo);
    const range = (mc) => ({ p10: mc.hitWeek.p10, p50: mc.hitWeek.p50, p90: mc.hitWeek.p90 });
    // where ARR levels off at a steady weekly output: new ARR = ARR lost to churn
    const churn = isNum(P.company.annualChurn) ? P.company.annualChurn : 0.1, wChurn = 1 - Math.pow(1 - churn, 1 / 52);
    const plateau = (r) => (r == null || !P.company.acv ? null : wChurn > 0 ? (r * P.company.acv) / wChurn : Infinity);
    const nowMc = monteCarlo(P, ctx.chain, ctx.fun, ctx.rates, ctx.top, null, {});
    const now = { retainedPerWeek: base.retainedPerWeek, meetingsPerWeek: base.meetingsPerWeek, hitWeek: base.projection.hitWeek, hitDate: base.projection.hitDate, range: range(nowMc), plateauArr: plateau(base.retainedPerWeek), arr: base.projection.arr };
    let solved;
    const L = bottleneck.kind === "lever" && bottleneck.lever;
    if (L && L.inputs) {
      const i = L.inputs, f = flow(P, ctx.chain, i.rates, i.top, i.cap);
      const proj = project(P, { baselinePerWeek: base.retainedPerWeek, retainedPerWeek: f.retainedPerWeek, lagWeeks: (lagDays || 0) / 7 });
      const mc = monteCarlo(P, ctx.chain, ctx.fun, i.rates, i.top, i.cap, {});
      solved = { kind: "lever", title: bottleneck.title, retainedPerWeek: f.retainedPerWeek, meetingsPerWeek: f.meetingsPerWeek, hitWeek: proj.hitWeek, hitDate: proj.hitDate, range: range(mc), plateauArr: plateau(f.retainedPerWeek), arr: proj.arr, volumes: f.volumes };
    } else solved = { kind: bottleneck.kind, title: bottleneck.title, retainedPerWeek: null, hitWeek: null, hitDate: null };
    const out = { goal: g, now, solved, ceiling: { retainedPerWeek: extreme.retainedPerWeek, hitWeek: extreme.projection.hitWeek, hitDate: extreme.projection.hitDate, plateauArr: plateau(extreme.retainedPerWeek), arr: extreme.projection.arr } };
    if (g.kind === "customers") {
      out.now.progress = (base.retainedPerWeek || 0) / g.perWeek;
      if (solved.retainedPerWeek != null) out.solved.progress = solved.retainedPerWeek / g.perWeek;
    } else {
      out.weeksSooner = now.hitWeek != null && solved.hitWeek != null ? now.hitWeek - solved.hitWeek : null;
      out.required = required(P, g, base, sellers, {});
      if (g.by) out.byDate = g.by;
    }
    return out;
  }

  // The same factory split into cohort lanes (the depth axis of the factory view).
  function lanesOf(P, ents, f) {
    const lane = (xs) => ({ n: xs.length, funnel: funnel(P, xs, f), durations: durations(P, xs) });
    return {
      everyone: lane(ents),
      extreme: lane(ents.filter((e) => e.pull === "extreme")),
      pull: lane(ents.filter((e) => pullGroup(e.pull) === "pull")),
      nopull: lane(ents.filter((e) => pullGroup(e.pull) === "nopull")),
    };
  }

  // Tasks the agent wrote (deal reviews, coaching, the morning plan): open
  // first, bottleneck work first, then by due date.
  function tasksOf(P) {
    const byId = {};
    for (const e of P.raw.entities || []) byId[e.id] = e;
    const xs = (P.raw.tasks || []).filter((t) => t && t.title).map((t) => {
      const e = t.entity && byId[t.entity];
      return Object.assign({ done: false }, t, e ? { entityName: e.name + (e.company ? ", " + e.company : "") } : {});
    });
    return xs.sort((a, b) => (a.done - b.done) || ((b.bottleneck ? 1 : 0) - (a.bottleneck ? 1 : 0)) || String(a.due || "9").localeCompare(String(b.due || "9")));
  }

  // ---------- main ----------
  function analyze(model, opts) {
    opts = opts || {};
    const P = prepare(model);
    const ents = applyFilters(P, opts.filters);
    const fun = funnel(P, ents, opts.filters);
    const inf = inflow(P, ents, opts.filters);
    const capInfo = capacity(P, ents);
    const stds = standards(P, ents, fun, inf);
    const gates = gatesOf(P, ents);
    const chain = chainOf(P, fun);
    const rates = ratesFor(P, fun, chain, null);
    const top = weeklyTop(P, fun, inf, chain, rates);
    const cap = capInfo ? capInfo.maxDealsPerWeek : null;
    const lev = levers(P, ents, fun, chain, rates, top, null, inf, capInfo);
    const bottleneck = bottleneckOf(P, gates, lev, stds);
    const base = { chain, funnel: fun, top, cap: null, capacity: capInfo, flow: lev.baseline, ents };
    const lagDays = median(spanDays(P, ents, P.milestones.inflow, P.milestones.close));
    const baselineProj = project(P, { baselinePerWeek: lev.baseline.retainedPerWeek, retainedPerWeek: lev.baseline.retainedPerWeek });
    const extreme = scenario(P, base, { label: "Extreme PULL, calendars full", cohort: { pull: "extreme" }, fillCalendar: true, fastest: true });
    const scen = opts.scenario ? scenario(P, base, opts.scenario) : null;
    const bar = BANDS[P.band];
    const baseline = Object.assign({}, lev.baseline, { lagDays, projection: baselineProj, newArrPerYear: (lev.baseline.retainedPerWeek || 0) * 52 * (P.company.acv || 0) });
    const gv = goalView(P, baseline, bottleneck, extreme, capInfo, lagDays, { chain, fun, rates, top });
    const laneEnts = applyFilters(P, Object.assign({}, opts.filters, { pull: null }));
    return {
      asOf: iso(P.asOf), generatedAt: P.raw.generatedAt || null, company: P.company, band: Object.assign({ id: P.band }, bar),
      bars: BARS, stages: P.stages, milestones: P.milestones, filters: opts.filters || {},
      options: {
        caseStudies: P.caseStudies.map((c) => ({ id: c.id, name: c.name })),
        channels: [...new Set(P.entities.map((e) => e.channel).filter(Boolean))],
        owners: [...new Set(P.entities.map((e) => e.owner).filter(Boolean))],
      },
      counts: { entities: ents.length, all: P.entities.length, excluded: P.excluded.length },
      funnel: fun, durations: durations(P, ents), timelines: timelines(P, ents), inflow: inf,
      capacity: capInfo, pullCompare: pullCompare(P, ents), standards: stds, gates,
      chain, rates, topPerWeek: top, baseline,
      levers: lev.list, bottleneck, extreme, scenario: scen,
      goal: P.goal, goalView: gv, lanes: lanesOf(P, laneEnts, opts.filters),
      tasks: tasksOf(P), plan: P.raw.plan || null, suggestions: P.raw.suggestions || null,
      excluded: P.excluded.map((e) => ({ id: e.id, name: e.name, company: e.company, reason: e.excluded.reason || null, at: e.excluded.at || null })),
      caseStudies: caseStudies(P, ents), gtmStrategy: P.raw.gtmStrategy || null, coaching: P.raw.coaching || null,
      dataQuality: quality(P, ents, stds, capInfo),
    };
  }

  // ---------- formatting shared by the app and the brief ----------
  function money(x) {
    if (!isNum(x)) return "—";
    const a = Math.abs(x);
    if (a >= 1e9) return "$" + (x / 1e9).toFixed(1) + "B";
    if (a >= 1e6) return "$" + (x / 1e6).toFixed(a >= 1e7 ? 0 : 1) + "M";
    if (a >= 1e3) return "$" + Math.round(x / 1e3) + "k";
    return "$" + Math.round(x);
  }
  const pct = (x) => (isNum(x) ? Math.round(x * 100) + "%" : "—");
  const num = (x, d) => (isNum(x) ? (Math.abs(x) >= 10 || d === 0 ? Math.round(x).toString() : x.toFixed(d == null ? 1 : d)) : "—");
  function weeksLabel(w) {
    if (w == null) return "not within 10 years";
    if (w < 9) return w + " weeks";
    if (w < 104) return Math.round(w / 4.345) + " months";
    return (w / 52).toFixed(1) + " years";
  }

  return { analyze, scenario: (model, sc, opts) => analyze(model, Object.assign({}, opts, { scenario: sc })).scenario,
    BANDS, BARS, DEFAULT_STAGES, DEFAULT_MILESTONES, TARGET_ARR, fmt: { money, pct, num, weeksLabel },
    _internal: { quantile, median, weekStart, flow, prepare, funnel, applyFilters, project, requiredPerWeek } };
});
