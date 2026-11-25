---
name: weekly-review
description: The weekly-review automation, which is what makes the sales process improve itself. Once a week it refreshes the factory, checks whether last week's changes were used and worked, writes down what the week taught, and has AI Rob change the case study, the sales process (steps, scripts, materials, follow-ups) and each seller's coaching. It applies the changes or asks first, as the founder chose, and sends AI Rob feedback on its gaps. Use for "weekly sales review", "what did we learn this week", "improve my sales process", or the weekly scheduled run.
version: 0.2.0
---

# Weekly review

> `${CLAUDE_PLUGIN_ROOT}` is the Autopull folder, two levels up from this `SKILL.md`. If the variable isn't set (Codex, ChatGPT, Claude.ai), use that folder.

Every week the sales process gets a little better, and the founder is told what changed and why. Paths below are in the founder's GTM brain; its `AGENTS.md` has the map and the rules. Every step marked **AI Rob** needs AI Rob loaded first, as the brain's `AGENTS.md` says.

## Before anything

Run the checks in `${CLAUDE_PLUGIN_ROOT}/START.md`. If AI Rob isn't set up, send the founder to https://airobsnyder.com/ and stop. If the factory isn't set up, run the `setup` automation first, then come back here.

## 1. Refresh the factory

Follow `factory/prompts/refresh.md`, then run `node cli.js analyze` in `factory/` and keep the result. Quote numbers only from the engine. If the factory can't run here, use whatever data is connected and say what you couldn't check.

## 2. Gather the week

Read, for the week since the last report in `reports/`:
* Every review, prep and draft in `deals/`, and the rows added to `gtm/sales.md`.
* The runs in `automations/runs/`.
* Open entries in `automations/changes.md`.
* `gtm/learnings.md` (every past week), `gtm/coaching.md`, `gtm/overrides.md` and `feedback/ai-rob.md`.

## 3. Did last week's changes work? (AI Rob)

For each change in `automations/changes.md` that has no result yet, have **AI Rob**:
* Check whether it was actually used in this week's calls.
* Judge whether it had the effect its hypothesis predicted, didn't, or it's too early to tell.
* Decide: keep it, roll it back, or tweak it.

Write the result under the entry. If AI Rob predicted something that didn't happen, follow `${CLAUDE_PLUGIN_ROOT}/FEEDBACK.md`.

## 4. What the week taught (AI Rob)

Have **AI Rob** write this week's entry at the top of `gtm/learnings.md`: what we learned about who has PULL, about each step of the sales process, and about each seller. Have it read the past entries first and call out patterns that keep coming back.

## 5. Changes (AI Rob)

Have **AI Rob** suggest changes, each with a hypothesis of what exactly changes and what we expect to see:
* **Case study:** for example, targeting the people who actually have PULL, which should double the close rate if they'll take the call.
* **Sales process:** steps, scripts, the materials each step uses, and the follow-ups, to make it more aerodynamic. For example, cutting the demo to the "your unblocked life" flow should save ten minutes and leave room for the detailed-fit question in call 1, which should lift conversion to call 2.
* **Coaching:** the most important improvements for each seller, by name.

Add each to `automations/changes.md` as suggested. Then, per `automations/settings.md`:
* **Sales process and coaching, "apply and notify":** write a new dated version of `gtm/sales-process.md` and a new dated entry in `gtm/coaching.md`, and mark the changes applied. Tomorrow's prep uses them.
* **"Review first":** mark them suggested and ask the founder. Apply the ones they say yes to.
* **Case study:** always wait for the founder's yes, then write a new version of `gtm/case-study.md`.
* If the setting isn't filled in, ask the founder which they want and save the answer.

## 6. The report

Write `reports/weekly-YYYY-MM-DD.md` and send it where `automations/settings.md` says. Keep the message short; the report has the detail.
* The factory: the bottleneck and the numbers that moved, from the engine.
* What the week taught, in three lines.
* Last week's changes: kept, rolled back or tweaked, and why.
* This week's changes: what was applied (and that the founder can roll any back by asking), and what needs their yes.
* AI Rob feedback: what was sent this week, and anything waiting for the founder (see `${CLAUDE_PLUGIN_ROOT}/FEEDBACK.md`).

If the factory's brief is set up, also run `node cli.js brief --notify` in `factory/`.
