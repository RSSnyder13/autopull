---
name: deal-check
description: The deal-check automation. Every morning it goes through every open deal and finds the ones that need the founder today (a buyer with PULL who went quiet, a next step that slipped, a call that ended with nothing booked, a deal that stalled), asks AI Rob what to do about each, and drafts the move. Use for "check my deals", "who's ghosting me", "what should I do about ...", "review my pipeline", or the morning scheduled run.
version: 0.2.0
---

# Deal check

> `${CLAUDE_PLUGIN_ROOT}` is the Autopull folder, two levels up from this `SKILL.md`. If the variable isn't set (Codex, ChatGPT, Claude.ai), use that folder.

No deal goes quiet without the founder knowing what to do about it. This automation reviews the founder's open deals only. It never does outreach to new people. Paths below are in the founder's GTM brain; its `AGENTS.md` has the map and the rules. Every step marked **AI Rob** needs AI Rob loaded first, as the brain's `AGENTS.md` says.

## Before anything

Run the checks in `${CLAUDE_PLUGIN_ROOT}/START.md`. If AI Rob isn't set up, send the founder to https://airobsnyder.com/ and stop. If the factory isn't set up, run the `setup` automation first, then come back here.

## 1. Look at every open deal

For every `deals/*/deal.md` that isn't closed or lost:
* Read the fields, the "Now" section and the latest review.
* Check what happened since: emails in and out with this buyer, meetings booked or held, CRM changes. Update `last_contact` if it moved.

## 2. Find the ones that need the founder (AI Rob)

Have **AI Rob** decide which deals need a move today. Look for:
* A buyer who went quiet, judged against what's normal at this step. Quiet with PULL comes first.
* A `next_step` whose date has passed.
* A call that ended with no next meeting booked.
* A deal with no movement for longer than `settings.staleDays` in `factory/factory.json` (45 days by default).
* A deal graded no PULL that is still taking the founder's time.

## 3. Decide and draft the move (AI Rob)

For each deal that needs a move, ask **AI Rob** what to do about it, with the deal's history and latest review. Then:
* Have **AI Rob** draft the move (a follow-up, a re-plan of the next step, going to another person on the buying team, or closing the deal out) as `deals/<deal>/drafts/YYYY-MM-DD-<move>.md`.
* If email is connected and `automations/settings.md` allows email drafts, also put it in the founder's drafts, in the thread with this buyer.
* Add a timeline line to `deal.md` and update `next_step`.
* If `factory/factory.json` exists, upsert one task for the deal (`source: "deal-review"`, `link` to the draft) and run `node cli.js validate` in `factory/`.
* If AI Rob closes a deal out, set its `stage` to lost with the reason. Never delete it.

If AI Rob has no answer for the situation, follow `${CLAUDE_PLUGIN_ROOT}/FEEDBACK.md`.

## 4. Send it

Add a "Deal check" section to `automations/runs/YYYY-MM-DD.md`: the deals that need the founder today, with PULL ones first. For each one: what's happening in one line, what to do, and the link to the draft. Also list how many open deals were checked and found fine.

* **Morning run:** don't send anything. `call-prep` runs next and sends this section in the same message.
* **Run on its own:** send the section where `automations/settings.md` says.
