# GTM loops

Open-source loops that run a founder's go-to-market every day and every week, and get better each time they run. Each loop is a simple process. It gathers the data, files it in the founder's GTM brain, and calls AI Rob for the judgment: is there PULL, what should change, what to say.

The goal: founders spend zero mental effort implementing PULL, setting up tools, or figuring out growth, while growth improves week on week.

## What's open and what isn't

- **Open (this repo):** the loops, the GTM brain template, and the factory (the model, the engine that does the math, and the homepage).
- **AI Rob (paid):** the judgment the loops call. Grading PULL, reviewing calls and deals, writing scripts and coaching, proposing changes. The loops never copy AI Rob's instructions. They only save what AI Rob concluded about the founder's own evidence.

## What's in here

```
loops/          one folder per loop (each is a skill)
brain/          the GTM brain template, copied once into each founder's private repo
factory/        the factory app: model, engine, homepage, morning brief
```

## Loops

| Loop | Status |
|---|---|
| `audit` | Planned. Sets up the factory: the brain, the case study and sales process (written by AI Rob), the factory app and its schedule. Then says which loop to turn on next. Every other loop runs it first if the factory isn't set up. |
| `sales-process` | v1 draft |
| `linkedin-outbound` | In progress |
| `founder-coaching` | Planned. How the founder spends their time. |
| `personalized-outreach` | Planned |
| `cold-call` | Planned |
| `inbound-geo-seo` | Planned |
| `linkedin-thought-leadership` | Planned |
| `website` | Planned |

## Install

1. **Set up AI Rob** at https://airobsnyder.com/. It is the judgment layer: nothing here runs without it.
2. Install this repo as a Claude Code plugin (it ships `.claude-plugin/plugin.json`), or copy the loop folders you want into `.claude/skills/`.
3. In an empty folder, ask for anything (for example "prep my calls"). Every loop runs the same checks first (`START.md`):
   1. No AI Rob? You're sent to https://airobsnyder.com/ to set it up.
   2. No factory? The `audit` loop sets it up: it creates your GTM brain in that folder (a private git repo, since it holds your prospects and customers), has AI Rob write your case study and sales process, and builds the factory.
   3. Then it does what you asked.

## Three rules every loop follows

1. Never overwrite. Write a new version.
2. The newest version is the current one.
3. Case study changes wait for the founder's yes.
