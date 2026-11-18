# GTM brain

This folder is the founder's GTM brain: everything known about who buys, why, how deals move, and what the automations have learned. It is a private git repo. Every automation reads and writes here.

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
| `gtm/case-study.md` | The repeatable case study. Current version on top, every past version below | setup, then changes the founder approves |
| `gtm/sales-process.md` | Each step of the sales process with its script. Dated versions | setup, then the sales-process automation |
| `gtm/pipeline.md` | Weekly numbers per channel | Outbound automations |
| `gtm/sales.md` | One row per sales call | Sales process automation |
| `gtm/post-sales.md` | Onboarding and getting customers to X | AI Rob |
| `gtm/overrides.md` | "That's not how I want to do it." Dated entries | Founder |
| `deals/<person-company>/deal.md` | One buyer or opportunity: current state on top, timeline below | Any automation that touches the deal |
| `deals/<person-company>/reviews/<YYYY-MM-DD-HHMM>/` | One AI Rob deal review. Never edited | AI Rob extreme deal review |
| `automations/<automation>/` | Each automation's settings, the changes it is testing, and what each run did | That automation |
| `factory/` | The factory: `factory.json` (the model), `config.json`, `versions/` | Factory refresh, and the founder on the homepage |
| `raw/calls/` | Transcripts, only when no call recorder is connected | Imports |
| `raw/evidence/` | Public posts and reviews about the buyer's situation | Automations that research |

## AI Rob

AI Rob is the judgment layer. Nothing here runs without it. Before any automation or factory prompt does anything, it runs the checks in the plugin's `START.md`: AI Rob is set up, then the factory is set up.

To load AI Rob:

1. If an `ai-rob` skill is installed, load it.
2. If not, and a Skillfully connector is available, load the skill named exactly `ai-rob` from it.
3. Ask for the job by name and follow its routing.

If AI Rob can't be loaded, do nothing else. Tell the founder to set it up at https://airobsnyder.com/ and ask again. Never write a PULL judgment from memory. Never copy AI Rob's instructions into this repo.
