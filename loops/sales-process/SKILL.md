---
name: sales-process
description: The sales process loop. Every morning it preps the founder for the day's sales calls (which call it is, the plan or script, coaching reminders), reminds them before each call, runs an extreme deal review after each call with next steps and a drafted recap, and every week checks whether last week's changes worked and suggests updates to the case study, the sales process and the founder's coaching. Use for "set up the sales process loop", "prep my calls", "review my call", "weekly sales review", or when a sales call was just recorded.
version: 0.1.0
---

# Sales process loop

Everything is saved in the founder's GTM brain. Paths below are in the brain; its `AGENTS.md` has the full map and the rules (never overwrite, write a new version). Every step marked **AI Rob** needs AI Rob loaded first, as the brain's `AGENTS.md` says.

This loop's own files, in the brain:
- `loops/sales-process/settings.md`: when it runs, where it notifies the founder, and whether they want to review changes first. Created from `templates/settings.md`.
- `loops/sales-process/changes.md`: every change suggested or made, its hypothesis, and later whether it worked. Created from `templates/changes.md`.
- `loops/sales-process/runs/YYYY-MM-DD.md`: what each run did and what it sent the founder.

## Before anything

Run the checks in `${CLAUDE_PLUGIN_ROOT}/START.md` every time this loop runs, before any step below. If AI Rob isn't set up, send the founder to https://airobsnyder.com/ and stop. If the factory isn't set up (brain, case study, sales process, `factory/`), run the `audit` loop first, then come back here.

## Get started

* Copy `templates/settings.md` and `templates/changes.md` into `loops/sales-process/`. Ask the founder the questions in `settings.md`.
* Set up the schedule: every morning, before each call, after each call, and every week (see `settings.md`).

## Every day

### Prep for calls

* See what calls are on the calendar, use **AI Rob** to determine if it's a sales call, and if so, determine which call it is per `gtm/sales-process.md` + relevant context (e.g., call 1, call 2, group call, etc).
   * Add relevant folders or files to the GTM brain. If it's a new deal, create `deals/<person-company>/deal.md` (format in `deals/README.md`). If it's an existing deal, read its `deal.md` and latest review first.
   * Use **AI Rob** to create the relevant call script / plan + relevant assets (e.g., deck), save them in the deal's folder, give them to the founder & notify them.
   * Send what **AI Rob** determines to be relevant coaching reminders from the most recent calls.
* Do all of these things in the morning and send them all in one bundle to the founder. If the factory's morning brief is on, they go into that brief.
   * If a sales call is scheduled same-day, run this prep process when you find out the call is scheduled. Ideally you can already see this in the founder's email; run the prep process immediately.

### Just before / during calls

* Send the founder a reminder for the upcoming call, with the call plan.
* (Optional) Prep a space for the founder where they can paste the transcript or ask questions based on what's happening during the call (e.g., with Granola notes).

### Immediately after calls

* Get the transcript and have **AI Rob** run extreme deal review. Store it in `deals/<person-company>/reviews/<YYYY-MM-DD-HHMM>/`, add a line to the deal's timeline, write the new current state in `deal.md`, and add a row to `gtm/sales.md`. The review covers:
   * Coaching feedback
   * Lessons about PULL / the case study
   * Learnings about the sales process
   * Next steps (+ draft action items, e.g., a recap email). Send this to the founder so they can take the next action.

## Every week

Fridays by default, but any day the founder wants, at any cadence they prefer (`settings.md`).

* Have **AI Rob** run across the week's deal reviews and the relevant data. If the factory is running, run the factory refresh first (`factory/prompts/refresh.md`). If not, look at whatever data you have access to (e.g., Stripe records).
   * If there were changes to the sales process, or coaching for the founder, suggested or made in last week's loop (`changes.md`):
      * Have **AI Rob** look at whether they were actually used in the sales conversations.
      * Have **AI Rob** determine whether they had the intended effect or not (or unclear).
      * Have **AI Rob** decide whether to continue with last week's changes, roll them back, or tweak them. Write the result in `changes.md`.
   * Based on the reviews, have **AI Rob** suggest to the founder:
      * Updates to their repeatable case study, with a hypothesis of what exactly changes and what they should expect as a result (e.g., different targeting to people who actually have PULL, which should double their close rate if they can get these people to talk to them).
      * Updates to their sales process to make it more aerodynamic, with a hypothesis of what exactly will change as a result (e.g., cutting the demo down to just the "your unblocked life" flow will save X minutes of the call and reduce Q&A, leaving time to fit the "detailed fit" question into call 1, which should increase conversion to call 2).
      * The most important coaching improvements to better the founder's performance in sales calls. If there are multiple sellers, split the improvements out by person.
   * Add each suggestion to `changes.md` with its hypothesis.
* Every time you do this, check `settings.md` for whether the founder wants to review changes first or have AI Rob update these things automatically and notify them (whether they want to be IN the loop). If it isn't set, ask. Once the founder says they don't want to be in the loop, just make the changes and notify them of what AI Rob changed and that they can roll it back.
   * Changes to the sales process go in as a new dated version of `gtm/sales-process.md`.
   * Changes to the case study always wait for the founder's yes, then go in as a new version of `gtm/case-study.md`.
   * Coaching goes into the next morning's prep.
