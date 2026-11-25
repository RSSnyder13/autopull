# GTM brain

This folder is the founder's GTM brain: everything known about who buys, why, how deals move, and what the automations have learned. It is a private git repo, or a folder inside the founder's own repo. Every automation reads and writes here.

## Three rules

1. **Never overwrite. Write a new version.** Add a dated entry, a new row, or a new dated file. Old versions stay. Git keeps the rest.
2. **The newest version is the current one.**
3. **Case study changes wait for the founder's yes.**

Also:
- **Say what you couldn't check.** If a tool isn't connected, write "not connected", never a zero.
- **Draft, never send,** unless the founder has said otherwise in an automation's `settings.md`.
- **No secrets in this repo.** API keys and tokens stay in the tools or in `.env` (ignored by git).

## Where things are

| Path | What it holds | Written by |
|---|---|---|
| `company/company.md` | What we sell, price, stage, the goal and its date, who sells and their hours | Founder, at setup |
| `company/product.md` | What the product does, pricing, the moment a customer "hits X" | Founder, at setup |
| `company/tools.md` | Which tools are connected and where each kind of data lives | Setup, updated when a tool is added |
| `gtm/case-study.md` | The repeatable case study. Current version on top, every past version below | Setup, then changes the founder approves |
| `gtm/sales-process.md` | Each step of the sales process: goal, exit, script, materials, follow-up. Dated versions | Setup, then the weekly review |
| `gtm/coaching.md` | What each seller should change on calls. Dated entries per seller | Setup, then the weekly review |
| `gtm/learnings.md` | What each week taught us. One dated entry per week | Weekly review |
| `gtm/sales.md` | One row per sales call | Call review |
| `gtm/post-sales.md` | Onboarding and getting customers to X | AI Rob |
| `gtm/overrides.md` | "That's not how I want to do it." Dated entries | Founder |
| `deals/<person-company>/deal.md` | One buyer or opportunity: current state on top, timeline below | Any automation that touches the deal |
| `deals/<person-company>/prep/<YYYY-MM-DD-HHMM>/` | The plan and materials for one call | Call prep |
| `deals/<person-company>/reviews/<YYYY-MM-DD-HHMM>/` | One AI Rob deal review and the drafted next step. Never edited | Call review |
| `deals/<person-company>/drafts/` | Moves drafted for a deal that needs one | Deal check |
| `automations/settings.md` | Where the brain is, the schedule, drafts, and whether the founder reviews changes first | Setup, then the founder |
| `automations/changes.md` | Every change suggested or made, its hypothesis, and whether it worked | Weekly review |
| `automations/runs/YYYY-MM-DD.md` | What each automation did that day and what it sent | Every automation |
| `reports/` | The setup audit and each weekly report. Never edited | Setup, weekly review |
| `feedback/ai-rob.md` | Every gap AI Rob had, in detail, and whether it was sent | Every automation |
| `factory/` | The factory: `factory.json` (the model), `config.json`, `versions/` | Factory refresh, and the founder on the homepage |
| `raw/calls/` | Transcripts, only when no call recorder is connected | Imports |
| `raw/imports/` | The sales process the founder ran before Autopull, as it came | Setup |
| `raw/evidence/` | Public posts and reviews about the buyer's situation | Automations that research |

## AI Rob

AI Rob is the judgment layer. Nothing here runs without it. Before any automation or factory prompt does anything, it runs the checks in the plugin's `START.md`: AI Rob is set up, then the factory is set up.

To load AI Rob:

1. If an `ai-rob` skill is installed, load it.
2. If not, and a Skillfully connector is available, load the skill named exactly `ai-rob` from it.
3. Ask for the job by name and follow its routing.

If AI Rob can't be loaded, do nothing else. Tell the founder to set it up at https://airobsnyder.com/ and ask again. Never write a PULL judgment from memory. Never copy AI Rob's instructions into this repo.

When AI Rob has no job, no asset or no answer for a situation, write it up in `feedback/ai-rob.md` as the plugin's `FEEDBACK.md` says.
