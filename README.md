# Autopull (by Rob Snyder)

A self-improving sales process. Autopull takes whatever sales process you run today and turns it into mine: every call prepped, every call reviewed, every next step drafted, every stuck deal flagged, and the whole process improved every week from what your calls taught you.

Its goal is for you to spend zero mental effort on anything other than working with customers. You don't decide what to do next. You're told, with the script and the materials already made.

It doesn't do outreach. It starts when a sales call is on your calendar.

## What it does

**Once, at setup.** Finds your GTM brain (or makes one), connects your calendar, email and call recorder, pulls in your past calls, deals and current sales process, and has AI Rob audit it all: who has PULL, where your deals die, what to change first. Writes your case study and your sales process, builds your factory, and schedules everything below.

**Every morning.** One message: the deals that need you today (a buyer with PULL who went quiet, a next step that slipped), with the move already drafted. Then every sales call on today's calendar, with which call it is, the plan, the script, the deck, the buyer doc or the agreement, and your coaching reminders.

**After every call.** An extreme deal review (PULL, coaching, what the call says about your case study and your process) and the next step drafted: the recap email, the doc for the champion, the agreement.

**Every week.** Checks whether last week's changes were used and worked, writes down what the week taught, and changes your case study, sales process, scripts, materials and coaching. You choose: review the changes first, or have them applied and just get told what changed. Anything AI Rob couldn't handle goes back to AI Rob in detail, so it gets better too.

## Automations

Email me about what you want next - rob@reframeb2b.com

| Automation | When it runs | What it does |
|---|---|---|
| `setup` | Once | Finds or makes your brain, audits your sales, writes your case study and sales process, builds the factory, schedules the rest. |
| `deal-check` | Every morning | Goes through every open deal, flags the ones that need you, has AI Rob say what to do and drafts the move. |
| `call-prep` | Every morning, and when a call gets booked | Works out which call each sales call is and makes the plan, script and materials (HTML deck, buyer doc, agreement). Reminds you before each call. |
| `call-review` | After every call | Extreme deal review, the next step drafted, the deal and the factory updated. |
| `weekly-review` | Every week | Checks last week's changes, writes what the week taught, changes the case study, sales process and coaching, reports to you. |
| `live-call` | (Coming soon) | Help during the call: the next question, or the answer to an objection. |

## Install

Autopull needs AI Rob installed in the same app first: https://airobsnyder.com/. Then pick your app below and ask it to "set up Autopull".

### Claude Code

```
/plugin marketplace add RSSnyder13/autopull
/plugin install autopull@autopull
```

### Claude desktop app (Cowork)

Customize → Plugins → Add marketplace → enter `RSSnyder13/autopull`, then install **Autopull**.

### Codex (CLI, desktop app, IDE)

```
codex plugin marketplace add RSSnyder13/autopull
codex plugin add autopull@autopull
```

Start a new thread after installing so Codex picks up the skills.

### ChatGPT and Claude.ai (skill upload)

These apps take skills as zip files, one per automation.

1. Download the `autopull-*.zip` files from the latest [release](https://github.com/RSSnyder13/autopull/releases).
2. ChatGPT: Skills → Create → Upload from your computer. Claude.ai: Settings → Capabilities → Skills → Upload skill.
3. Upload `autopull-setup.zip` first, then the others.

The factory homepage is a small Node app. Apps that can't run a local server or a schedule (ChatGPT, Claude.ai) still build and update the brain and the factory files, and run each automation when you ask; for the daily runs and the homepage, use a coding agent or your own computer.

### Publishing a new version

Bump `version` in `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` and `.codex-plugin/plugin.json`, then push a tag (`git tag v0.2.0 && git push --tags`). The release workflow builds the skill zips (`npm run build:skills`) and attaches them to the release.

## What's open and what isn't

- **Open (this repo):** the automations, the GTM brain template, and the factory (the model, the engine that does the math, and the homepage).
- **AI Rob (paid):** the judgment the automations call. Grading PULL, the audit, reviewing calls and deals, writing scripts, decks, agreements and coaching, proposing changes. The automations never copy AI Rob's instructions. They only save what AI Rob concluded about the founder's own evidence.

## What's in here

```
.claude-plugin/ Claude plugin + marketplace manifests
.codex-plugin/  Codex plugin manifest
.agents/        Codex marketplace manifest
START.md        the checks every automation runs first
FEEDBACK.md     how gaps in AI Rob get reported back to AI Rob
automations/    one folder per automation (each is a skill)
brain/          the GTM brain template, copied into your private repo
factory/        the factory app: model, engine, homepage, morning brief
scripts/        builds the skill zips for ChatGPT and Claude.ai
```
