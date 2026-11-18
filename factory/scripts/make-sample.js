#!/usr/bin/env node
// Generates sample/factory.json: a made-up startup used for demos and tests.
// Deterministic (seeded), so tests can pin numbers. Run: node scripts/make-sample.js
"use strict";
const fs = require("fs");
const path = require("path");

const AS_OF = "2026-10-05";
const DAY = 86400000;
let seed = 20261005;
const rand = () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (xs) => xs[Math.floor(rand() * xs.length)];
const iso = (d) => new Date(d).toISOString().slice(0, 10);
const addDays = (d, n) => new Date(+new Date(d + "T00:00:00Z") + Math.round(n) * DAY).toISOString().slice(0, 10);
const jitter = (base) => Math.max(1, base * (0.55 + rand() * 0.9));

const FIRST = ["Ana", "Ben", "Chloe", "Dev", "Elena", "Femi", "Grace", "Hiro", "Isla", "Jon", "Kai", "Lena", "Marco", "Nia", "Omar", "Priya", "Quinn", "Rosa", "Sam", "Tara", "Uma", "Victor", "Wen", "Yara", "Zoe"];
const CO = ["Harborline Logistics", "Crestfield Dental", "Pinebrook Foods", "Alder Health", "Bluecart Retail", "Summit Ridge Labs", "Ironwood Fabrication", "Lakeshore Clinics", "Oakmont Software", "Redfern Packaging", "Silverline Freight", "Tidewater Brands", "Westgate Home", "Brightpath Learning", "Coppervale Energy", "Fairhaven Pet", "Granite Peak HVAC", "Hollis & Pike", "Juniper Outdoor", "Kestrel Robotics", "Marlow Kitchens", "Northgate Vet", "Orchard Lane Cafes", "Quarry Street Media"];
const CHANNELS = [["LinkedIn", 0.45], ["Cold email", 0.25], ["Referral", 0.2], ["Conference", 0.1]];
const OWNERS = ["Maya (founder)", "Jordan (AE)"];
const chooseW = (pairs) => { let r = rand(); for (const [v, w] of pairs) { if ((r -= w) <= 0) return v; } return pairs[0][0]; };

// per PULL grade: step pass rates and typical days per step, met -> ... -> renewed
const PROFILE = {
  extreme: { pass: { pull: 1, conceptual: 0.97, detailed: 0.94, planning: 0.93, closed: 0.9, indicator: 0.96, renewed: 0.95 }, days: [1, 4, 5, 6, 5, 18, 300], effort: { meetings: 3, hours: 4, touches: 6 } },
  yes: { pass: { pull: 1, conceptual: 0.85, detailed: 0.75, planning: 0.72, closed: 0.7, indicator: 0.85, renewed: 0.9 }, days: [2, 8, 12, 14, 12, 26, 300], effort: { meetings: 5, hours: 7.5, touches: 14 } },
  no: { pass: { pull: 1, conceptual: 0.45, detailed: 0.55, planning: 0.55, closed: 0.5, indicator: 0.55, renewed: 0.7 }, days: [3, 12, 18, 22, 20, 40, 300], effort: { meetings: 5, hours: 8, touches: 22 } },
  unknown: { pass: {}, days: [], effort: { meetings: 1, hours: 1.25, touches: 3 } },
};
const ORDER = ["met", "pull", "conceptual", "detailed", "planning", "closed", "indicator", "renewed"];
const LOSS = {
  pull: "No project with a deadline; curious, not trying to buy",
  conceptual: "Good-enough option already in place",
  detailed: "Fit broke on a hard requirement",
  planning: "Could not get the approver to engage",
  closed: "Went quiet after pricing",
  indicator: "Never hit X: audit prep stayed in spreadsheets",
  renewed: "Churned at renewal",
};

const entities = [];
const pipelineCounts = [];
const weeks = 16;
const start = new Date(AS_OF + "T00:00:00Z") - weeks * 7 * DAY;
let n = 0;
for (let w = 0; w < weeks; w++) {
  const weekStart = iso(start + w * 7 * DAY);
  const booked = 7 + Math.round(rand() * 3) + (w > 10 ? 1 : 0);
  pipelineCounts.push({ week: weekStart, channel: "LinkedIn", counts: { reached: 55 + Math.round(rand() * 15), replied: 8 + Math.round(rand() * 3), booked: Math.round(booked * 0.5) } });
  pipelineCounts.push({ week: weekStart, channel: "Cold email", counts: { reached: 380 + Math.round(rand() * 60), replied: 10 + Math.round(rand() * 4), booked: Math.round(booked * 0.25) } });
  pipelineCounts.push({ week: weekStart, channel: "Referral", counts: { reached: 5, replied: 3, booked: booked - Math.round(booked * 0.5) - Math.round(booked * 0.25) } });
  const met = Math.round(booked * 0.86);
  for (let i = 0; i < met; i++) {
    const metAt = addDays(weekStart, Math.floor(rand() * 5));
    const recent = (new Date(AS_OF) - new Date(metAt)) / DAY < 6;
    const r = rand();
    let grade = r < 0.2 ? "extreme" : r < 0.42 ? "yes" : "no";
    if (recent && rand() < 0.6) grade = "unknown"; // last few calls are not graded yet
    const channel = grade === "extreme" ? chooseW([["Referral", 0.5], ["LinkedIn", 0.3], ["Conference", 0.2]])
      : grade === "no" ? chooseW([["LinkedIn", 0.5], ["Cold email", 0.38], ["Referral", 0.06], ["Conference", 0.06]]) : chooseW(CHANNELS);
    const cs = grade === "extreme" ? "first-audit" : grade === "yes" ? (rand() < 0.7 ? "first-audit" : "fractional-cfo") : grade === "no" && rand() < 0.25 ? "fractional-cfo" : null;
    const prof = PROFILE[grade];
    const id = "d" + String(++n).padStart(3, "0");
    const e = {
      id, name: pick(FIRST) + " " + String.fromCharCode(65 + Math.floor(rand() * 26)) + ".",
      company: pick(CO), title: pick(["Controller", "VP Finance", "CFO", "Head of Accounting", "Fractional CFO"]),
      caseStudy: cs, pull: grade, channel, owner: grade === "extreme" && rand() < 0.6 ? OWNERS[0] : pick(OWNERS),
      events: [{ stage: "booked", at: addDays(metAt, -3 - Math.floor(rand() * 6)) }, { stage: "met", at: metAt }],
      exit: null, sources: ["https://recorder.example/call/" + id],
      pullEvidence: grade === "extreme" ? "First audit fieldwork starts in under 60 days; auditors already sent the PBC list; two-person team." : grade === "yes" ? "Audit this year, no firm date yet; current close process is spreadsheets." : grade === "no" ? "Exploring; no audit on the calendar." : null,
    };
    let at = metAt, stopped = false, stepsDone = 0;
    if (grade !== "unknown") {
      for (let s = 1; s < ORDER.length; s++) {
        const stage = ORDER[s];
        if (grade === "no" && stage === "pull") continue; // pushed deals skip PULL
        const next = addDays(at, jitter(prof.days[s - 1]));
        if (next > AS_OF) break; // still open in this stage
        if (rand() > prof.pass[stage]) { e.exit = { at: addDays(at, jitter(prof.days[s - 1])), reason: LOSS[stage] }; if (e.exit.at > AS_OF) e.exit.at = AS_OF; stopped = true; break; }
        e.events.push({ stage, at: next }); at = next; stepsDone++;
      }
    } else if ((new Date(AS_OF) - new Date(metAt)) / DAY > 20) {
      e.exit = { at: addDays(metAt, 7), reason: "No-show to the follow-up" };
    }
    const k = Math.min(1, (stepsDone + 1) / 5);
    e.effort = { meetings: Math.max(1, Math.round(prof.effort.meetings * k)), hours: +(Math.max(1, prof.effort.hours * k)).toFixed(1), touches: Math.max(2, Math.round(prof.effort.touches * k)) };
    entities.push(e);
  }
}

// Customers from before the window (older closes) so delivery and renewal have history.
for (let i = 0; i < 6; i++) {
  const metAt = addDays(AS_OF, -260 + i * 20);
  const id = "c" + String(i + 1).padStart(3, "0");
  const ev = [{ stage: "booked", at: addDays(metAt, -5) }, { stage: "met", at: metAt }];
  let at = metAt;
  for (const [stage, d] of [["pull", 1], ["conceptual", 5], ["detailed", 6], ["planning", 7], ["closed", 6], ["indicator", 16]]) { at = addDays(at, d); ev.push({ stage, at }); }
  if (i < 2) ev.push({ stage: "renewed", at: addDays(at, 330 - i * 40 > 200 ? 200 : 200) });
  entities.push({ id, name: pick(FIRST) + " " + String.fromCharCode(65 + i) + ".", company: CO[(i * 5) % CO.length], title: "Controller", caseStudy: "first-audit", pull: "extreme", channel: i % 2 ? "Referral" : "LinkedIn", owner: OWNERS[0], events: ev.filter((x) => x.at <= AS_OF), exit: null, effort: { meetings: 3, hours: 4, touches: 6 }, sources: ["https://crm.example/deal/" + id], pullEvidence: "First audit forced by a PE sponsor; deadline set by the auditors." });
}

// What AI Rob writes on top of the data: tasks from deal reviews and coaching,
// the morning plan, and simulations worth running. No rand() calls below, so
// the deals above stay the same.
const stageIdx = (e) => Math.max(...e.events.map((v) => ORDER.indexOf(v.stage)));
const live = entities.filter((e) => !e.exit && (e.pull === "extreme" || e.pull === "yes") && stageIdx(e) >= ORDER.indexOf("pull") && stageIdx(e) < ORDER.indexOf("closed"))
  .sort((a, b) => stageIdx(b) - stageIdx(a)).slice(0, 3);
const slug = (e) => e.company.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const NEXT = { pull: "Book the conceptual-fit walkthrough on their own request list", conceptual: "Get their auditor's questions and book detailed fit", detailed: "Send the auditor-questions doc and book the detailed-fit call with their auditor on it", planning: "Send the plan to buy, working back from fieldwork, and ask who signs" };
const tasks = [
  { id: "t-bn-1", title: "Ask the three operating partners for two intros each to controllers with an audit this quarter", why: "Targeting is the bottleneck, and referral meetings already pull at over 60%.", source: "coaching", bottleneck: true, due: AS_OF, done: false },
  { id: "t-bn-2", title: "Requalify this week's cold email meetings: keep only the ones with an audit date", why: "No audit date, no PULL. Those deals almost never close.", source: "coaching", bottleneck: true, due: AS_OF, done: false },
  ...live.map((e, i) => {
    const st = ORDER[stageIdx(e)];
    return { id: "t-dr-" + e.id, title: NEXT[st] || "Book the next step", why: "Extreme deal review: " + (e.pull === "extreme" ? "extreme PULL" : "PULL") + ", stage " + st + ". " + (e.pullEvidence || ""),
      source: "deal-review", entity: e.id, bottleneck: false, due: addDays(AS_OF, i + 1), done: false, link: "deals/" + slug(e) + "/Close.md" };
  }),
  { id: "t-done-1", title: "Log last week's conference touches", source: "founder", bottleneck: false, due: addDays(AS_OF, -2), done: true, doneAt: addDays(AS_OF, -2) },
];
const plan = {
  date: AS_OF, generatedAt: AS_OF + "T06:45:00Z",
  summary: "Bottleneck first. Two hours on targeting before your 11:00 call, before the day eats it.",
  blocks: [
    { at: "08:00", until: "09:00", title: "Operating partner intro asks", why: "Bottleneck: targeting", bottleneck: true, taskIds: ["t-bn-1"] },
    { at: "09:00", until: "10:00", title: "Requalify cold email meetings by audit date", why: "Bottleneck: targeting", bottleneck: true, taskIds: ["t-bn-2"] },
    { at: "11:00", until: "11:45", title: "Call already on your calendar", why: "Run it to the stage's exit question", bottleneck: false },
    { at: "13:00", until: "14:00", title: "Deal review next steps", why: "From last night's deal reviews", bottleneck: false, taskIds: live.map((e) => "t-dr-" + e.id) },
  ],
};
const suggestions = {
  generatedAt: AS_OF + "T07:00:00Z",
  simulations: [
    { label: "What if we want $10M ARR by the end of 2028?", scenario: { label: "$10M ARR by Dec 2028", goal: { target: 10000000, by: "2028-12-31" }, why: "Today's team and rates; what it takes to get there" } },
    { label: "What if we hire another AE?", scenario: { label: "+1 AE", sellersAdded: 1, hoursPerSeller: 30, fillCalendar: true, why: "A second AE with 30 selling hours, calendars full at today's mix" } },
    { label: "What if we only booked first-audit controllers?", scenario: { label: "Only first-audit, calendars full", cohort: { caseStudy: "first-audit" }, fillCalendar: true, why: "Rates and hours per deal from first-audit deals only" } },
    { label: "What if referrals were half our first meetings?" },
  ],
};
// a record the founder removed: an internal meeting the calendar picked up
entities.push({ id: "x001", name: "Weekly pipeline sync", company: "Tallyhook (internal)", pull: "unknown", channel: "Internal", owner: OWNERS[0],
  events: [{ stage: "met", at: addDays(AS_OF, -10) }], exit: null, sources: [], excluded: { at: addDays(AS_OF, -9), reason: "Internal meeting, not a sales conversation", by: "founder" } });

const fitsFor = (cs, us) => entities.filter((e) => e.caseStudy === cs).map((e, i) => Object.assign({ entity: e.id, grade: e.pull === "extreme" ? "strong" : e.pull === "yes" ? "partial" : "weak", evidence: e.pullEvidence || "" },
  us ? { u: e.pull === "extreme" || e.pull === "yes" ? us[i % us.length] : "inferred" } : {}));

const model = {
  schema: 1,
  generatedAt: AS_OF + "T07:00:00Z",
  asOf: AS_OF,
  goal: { kind: "arr", target: 100000000 },
  company: { name: "Tallyhook (sample)", product: "Audit-prep workspace for lean finance teams", acv: 40000, band: "moderate", arr: 1150000, annualChurn: 0.08, sellers: OWNERS },
  milestones: { inflow: "met", pull: "pull", close: "closed", success: "indicator" },
  stages: [
    { id: "reached", name: "Reached out", machine: "pipeline" },
    { id: "replied", name: "Replied", machine: "pipeline" },
    { id: "booked", name: "Meeting booked", machine: "pipeline" },
    { id: "met", name: "First conversation", machine: "sales" },
    { id: "pull", name: "PULL", machine: "sales" },
    { id: "conceptual", name: "Conceptual fit", machine: "sales" },
    { id: "detailed", name: "Detailed fit", machine: "sales" },
    { id: "planning", name: "Project planning", machine: "sales" },
    { id: "closed", name: "Closed", machine: "sales" },
    { id: "indicator", name: "Hit X: first audit passed on the workspace", machine: "delivery" },
    { id: "renewed", name: "Renewed", machine: "delivery" },
  ],
  caseStudies: [
    {
      id: "first-audit", name: "The first-audit controller", status: "repeatable",
      pull: {
        project: "Get through the company's first financial audit on time, so the sponsor, the lender or the next raise gets the audited numbers it is waiting on.",
        unavoidable: [
          "Sponsor deadline: the PE sponsor set a date for audited financials.",
          "Lender covenant: the credit agreement requires audited statements by a fixed date.",
          "Fundraise or sale: the data room needs audited numbers before it opens.",
          "Unknown, inferred from behavior: they bought and loaded the auditors' list in the first week.",
        ],
        options: [
          "Outside help (big-four advisory, temps): too expensive or too slow to start, and they don't know the business.",
          "Doing it in house (spreadsheets, shared drives): can't show auditors a clean trail in time.",
        ],
        limitations: "Every option leaves the controller as the bottleneck for every auditor request.",
      },
      note: "All of them face a first audit with a small finance team and a date someone else set. What differs is who set the date: the sponsor, the lender, or a raise.",
      supply: "A workspace that turns the auditors' request list into owned tasks, with evidence attached and a live status the auditors can see.",
      unblockedLife: "Fieldwork starts on time, auditors self-serve evidence, and the controller stops being the bottleneck for every request.",
      pricing: "$40k a year, priced against one advisory engagement, signed before fieldwork starts.",
      extremeProfile: "Controller or VP Finance at a PE-backed company, 50 to 300 employees, first audit with fieldwork under 90 days out, finance team of three or fewer.",
      whoToTarget: "Portfolio companies acquired by PE in the last 12 months; ask sponsors' operating partners for intros.",
      market: { accounts: 4200, note: "US PE-backed companies in their first audit year (rough estimate)" },
      fits: fitsFor("first-audit", ["sponsor deadline", "lender covenant", "fundraise or sale"]),
    },
    {
      id: "fractional-cfo", name: "The fractional CFO juggling audits", status: "hypothesis",
      pull: {
        project: "Run audit prep for several clients at once.",
        unavoidable: "Unclear. Audits are client-driven and often not yet scheduled.",
        options: "Their own templates, or the client's staff.",
        limitations: "Templates break across clients, but most say it is manageable.",
      },
      supply: "Same workspace, multi-client.",
      unblockedLife: "One place to run every client's audit.",
      pricing: "Untested.",
      extremeProfile: "Fractional CFO with three or more clients in an audit year at the same time.",
      whoToTarget: "Not yet: the unavoidable part is missing in most calls.",
      market: { accounts: null, note: "Unknown" },
      fits: fitsFor("fractional-cfo"),
    },
  ],
  gtmStrategy: {
    updatedAt: AS_OF,
    sections: [
      { id: "target", title: "Who we target and why", body: "Controllers at PE-backed companies facing their first audit within 90 days. The sponsor's deadline makes the project unavoidable, and the alternatives are too slow or too expensive, so it would be weird for them not to buy.", refs: ["caseStudies"] },
      { id: "reach", title: "How we reach them", body: "Referrals from PE operating partners and LinkedIn to controllers at recently acquired companies. Outreach sells the conversation, not the product: one line about their audit date and a question.", refs: ["inflow", "sankey"] },
      { id: "sales", title: "How a deal moves", body: "Call 1 finds the PULL (the audit date and the request list). Conceptual fit is a walkthrough on their own list. Detailed fit is their auditor's questions. Project planning works backward from fieldwork. Sign before fieldwork.", refs: ["timeline", "sankey"] },
      { id: "delivery", title: "How customers succeed", body: "X is passing the first audit on the workspace. Onboarding loads the request list in the kickoff call and gets the auditors logged in during week one.", refs: ["sankey"] },
      { id: "pricing", title: "Pricing", body: "$40k a year, anchored to one advisory engagement, signed before fieldwork.", refs: ["caseStudies"] },
      { id: "bet", title: "Current bottleneck and the bet", body: "Most first meetings have no audit on the calendar, and a third of selling hours sit empty. The bet: fill those hours with operating-partner intros and PE CFO events, where meetings already pull. Stop booking anyone without an audit date.", refs: ["pull", "levers", "capacity"] },
    ],
  },
  coaching: {
    generatedAt: AS_OF + "T07:00:00Z",
    bottleneckId: "step:met>pull",
    headline: "Most of your first meetings have no audit on the calendar. That is the whole problem.",
    move: "Retarget. The order I want: first, controllers at PE-backed companies with fieldwork under 90 days out. Then anyone with an audit date this year. Nobody else gets a meeting. Your referral meetings already pull at over 60%. Cold email meetings almost never do, and those deals almost never close. It would be weird for a controller with fieldwork in 60 days to ignore you.",
    today: "Before your 11:00, message the three operating partners who sent you your last extreme-PULL customers. Say: \"[Customer] got through their first audit on time with us. Who else in your portfolio has fieldwork this quarter? Two intros would be huge.\"",
    ladder: [
      "DM 30 controllers at companies PE bought in the last 12 months. One question: when does fieldwork start?",
      "Still stuck? Go to the PE CFO events this month and work the floor.",
      "Still stuck? Ask your current customers' sponsors to send one intro email to the whole portfolio.",
    ],
    why: "Targeting beats every sales fix you could make. PULL deals close at many times the rate of everything else, faster, with a fraction of the seller hours. And a third of your selling hours are empty. Fill them with the same people.",
  },
  tasks,
  plan,
  suggestions,
  capacity: [
    { owner: OWNERS[0], weeklyHours: 55, sellingHours: 20, bookedSalesHours: 14 },
    { owner: OWNERS[1], weeklyHours: 45, sellingHours: 30, bookedSalesHours: 19 },
  ],
  pipelineCounts,
  levers: [{ id: "audit-opener", step: "reached>replied", label: "Reply rate to 8% with the audit-date opener", achievable: 0.08, why: "Rough: the audit-date opener got 4 replies from 50 sends" }],
  entities,
  dataQuality: [{ level: "info", message: "Conference touches are logged by hand.", fix: "Connect the event app or keep logging weekly.", source: "agent" }],
  settings: { windowWeeks: 4, inflowWeeks: 12, staleDays: 45, horizonWeeks: 520, simRuns: 200, seed: 7 },
};

fs.writeFileSync(path.join(__dirname, "..", "sample", "factory.json"), JSON.stringify(model, null, 1) + "\n");
console.log("wrote sample/factory.json with " + entities.length + " entities");
