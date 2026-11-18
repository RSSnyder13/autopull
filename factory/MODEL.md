# The factory model

The case study factory written down as a model a machine can run: the parts of the factory, the buyers moving through it, and what the engine needs to find the bottleneck and project the path to the founder's goal.

## The split: judgment vs. arithmetic

- **AI Rob does the judgment.** Grading PULL on each conversation, deciding which case study a buyer fits, mapping each buyer's history onto stages, writing the case studies and the GTM strategy, writing the coaching, and turning a founder's question into a scenario.
- **The engine (`engine.js`) does the arithmetic.** Fall-off, time per stage, inflow, capacity, PULL vs no PULL, the standards, the lever ranking, the bottleneck, the projection, the goal seek and the simulations. Never do this math by hand. Run `node cli.js analyze` and quote it, so the founder gets the same number from the homepage, the brief and the agent.

## The model file (`factory.json`)

One JSON file in the founder's workspace. Everything below is optional except `entities`, and a sparse model is still a valid model: a founder with three calls gets a factory with three calls in it.

### `company`
`name`, `product`, `acv` (typical first contract, dollars a year), `band` (`big` $100k+, `moderate` $25k to $99k, `small` under $25k), `arr` (current), `annualChurn` (fraction of retained customers lost a year; leave it out if unknown and the engine assumes 10% and flags it), `sellers`.

### `goal`
What the founder is aiming at. Default `{ "kind": "arr", "target": 100000000 }` ($100M ARR). Optional `by` (a date) turns on the goal seek. Or `{ "kind": "customers", "perWeek": 2 }` for a founder whose goal is "add 2 customers a week". The founder can change it on the page; keep it on every refresh.

### `stages` and `milestones`
Stages are ordered and belong to a machine: `pipeline`, `sales` or `delivery`. The default line:

- **Pipeline:** Reached out → Replied → Meeting booked
- **Sales:** First conversation → PULL → Conceptual fit → Detailed fit → Project planning → Closed
- **Delivery:** Hit X → Renewed

A deal reaches a stage only when it actually cleared that stage's exit; "more or less" does not count. Rename stages to the founder's words (and name X concretely, for example "Hit X: first audit passed on the workspace"), but keep the machines and the order. Pipeline stages can differ by channel. Keep the shared ones on the main line and put the channel detail in `pipelineCounts`.

`milestones` tells the engine which stages carry the standards: `inflow` (first meeting held, default `met`), `pull`, `close`, `success` (X). Change them only if you renamed those stage ids.

### `entities`: one per buyer or opportunity
```json
{ "id": "d042", "name": "Ana B.", "company": "Summit Ridge Labs", "title": "Controller",
  "caseStudy": "first-audit", "pull": "extreme", "pullEvidence": "Fieldwork in 6 weeks; PBC list already sent.",
  "channel": "Referral", "owner": "Maya",
  "events": [{ "stage": "booked", "at": "2026-08-01" }, { "stage": "met", "at": "2026-08-04" }, { "stage": "pull", "at": "2026-08-04" }],
  "exit": null, "effort": { "meetings": 3, "hours": 4, "touches": 6 }, "sources": ["https://..."] }
```
- `pull` is `extreme`, `yes`, `no`, or `unknown`, graded by AI Rob. Put the deciding evidence, in the buyer's words where possible, in `pullEvidence`.
- `events` only lists stages the deal actually cleared, each with a date. A deal graded `no` that keeps moving is a **pushed** deal: log its real stages and do not log `pull`. The engine keeps pushed deals off the factory's main line (they are not the case study) and counts them on a separate push branch, because they still cost seller time and occasionally close.
- `exit` is `{ "at": date, "reason": "..." }` when the deal is lost, or `null`. A deal with no movement for `settings.staleDays` (45 by default) counts as **stalled**: no movement is itself the finding.
- `effort` is the seller's time on this deal: meetings held, calendar hours, and emails or messages (touches). Take it from the calendar and the inbox. It drives seller effort per win and calendar capacity.
- Never put a company name into a case study's description. Names live only on entities.
- `excluded` is `{ "at": date, "reason": "...", "by": "founder" }` on a record that is not a sales conversation (an internal sync, a recruiting call, a duplicate). The engine leaves it out of everything and lists it so it can be restored. Never delete such a record and never clear the flag on a refresh: that is how the founder cleans their own data.

### `caseStudies`: archetypes, not customer stories
An archetypal case study is a template of the situation where it would be weird not to buy. It is not a write-up of one customer.

Each archetype has:
- `pull`: `project`, `unavoidable`, `options`, `limitations`. Each is a string or a list of strings (bullets); `unavoidable` is usually a list.
- `supply`, `unblockedLife`, `pricing`
- `extremeProfile` (who exactly has the extreme version), `whoToTarget` (where to find them), `market` (`accounts` and a note; say plainly when it is a rough estimate)
- `note`: what the buyers who fit share, and what is specific to each. One or two sentences.
- `status`: `hypothesis`, `emerging` or `repeatable` (below)
- `fits`: the real customers and prospects who fit it, as `{ entity, grade: strong | partial | weak, evidence, u? }`. `u` is the Unavoidable bullet this buyer has, in a few words, or "inferred".

**Status** is set from who has hit X, not who has paid:
- `hypothesis`: no buyer who fits it has hit X yet.
- `emerging`: one or two buyers who fit it have hit X.
- `repeatable`: three or more have hit X.

### `gtmStrategy`: how this factory works
`updatedAt`, plus `sections` of `{ id, title, body, refs }`. Use these sections:
- `target`: who we target and why, which is the archetype.
- `reach`: how we reach them.
- `sales`: how a deal moves through each stage and what has to be true to move it on.
- `delivery`: how customers get to X.
- `pricing`
- `bet`: the current bottleneck and the bet being made on it.

`refs` (optional) name the evidence behind each claim (`caseStudies`, `pull`, `inflow`, `capacity`, `levers`). Write it in the founder's words, plainly. The page shows it when the founder opens the case study.

### `capacity`: one row per seller
`{ owner, weeklyHours, sellingHours, bookedSalesHours }`. `sellingHours` is the time this person could spend selling in a week. `bookedSalesHours` is the time actually booked on sales meetings, averaged over the last four weeks of their calendar.

### `pipelineCounts`: top of funnel in aggregate
Outreach is not one entity per person. Log weekly counts per channel: `{ week, channel, counts: { reached, replied, booked } }`.

### Also in the model
- `levers` (optional): achievable levels that only you know. Two kinds:
  - `{ "id": "li-cap", "inflow": true, "achievable": 150, "label": "LinkedIn allows 150 requests a week", "why": "..." }` sets the weekly volume at the first stage of the line.
  - `{ "step": "reached>replied", "achievable": 0.08, ... }` sets one step's conversion.

  The engine ranks them with everything else.
- `coaching`: `{ bottleneckId, headline, move, today, ladder: [...], why, generatedAt }`. This is what AI Rob says to do about the bottleneck. `bottleneckId` must equal the engine's bottleneck id. If it doesn't, the dashboard and the brief flag the advice as stale.
- `tasks`: what the founder should do, as `{ id, title, why, source: deal-review | coaching | plan | founder, entity?, bottleneck: bool, due?, done, doneAt?, link? }`. Deal reviews write one per changed deal (its next action, with `link` to the review file). Coaching writes the bottleneck tasks. The founder ticks them off on the page; keep `done` on every refresh. The engine sorts them: open first, bottleneck first, then by due date.
- `plan`: the morning plan, `{ date, summary, blocks: [{ at, until, title, why, bottleneck, taskIds }] }`, built from today's calendar with the bottleneck work in the first free blocks of the morning. The page and the brief only show it on the day it was written for.
- `suggestions`: `{ simulations: [{ label, scenario? }], generatedAt }`, the what-ifs worth running for this founder, written on refresh. One without a `scenario` is sent to chat.
- `dataQuality`: `{ level: info | warning | critical, message, fix }` for anything missing, stale or rough. The engine adds its own on top.
- `settings`: `windowWeeks` (4), `inflowWeeks` (12), `staleDays` (45), `horizonWeeks` (520), `simRuns` (200), `seed`.

Validate with `node cli.js validate` after every write.

