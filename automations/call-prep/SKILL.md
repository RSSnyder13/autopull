---
name: call-prep
description: The call-prep automation. Every morning it finds the day's sales calls, works out which call each one is (call 1, call 2, group call, close), and has AI Rob write the call plan and make the materials for it (an HTML deck, a buyer-facing doc, a simple agreement at close), with coaching reminders for the seller. Runs again for calls booked later the same day and reminds the founder before each call. Use for "prep my calls", "prep my call with ...", "make the deck for my call 2", "draft the agreement for ...", or the morning and hourly scheduled runs.
version: 0.2.0
---

# Call prep

> `${CLAUDE_PLUGIN_ROOT}` is the Autopull folder, two levels up from this `SKILL.md`. If the variable isn't set (Codex, ChatGPT, Claude.ai), use that folder.

The founder walks into every sales call with the plan, the script and the materials already made. Paths below are in the founder's GTM brain; its `AGENTS.md` has the map and the rules. Every step marked **AI Rob** needs AI Rob loaded first, as the brain's `AGENTS.md` says.

## Before anything

Run the checks in `${CLAUDE_PLUGIN_ROOT}/START.md`. If AI Rob isn't set up, send the founder to https://airobsnyder.com/ and stop. If the factory isn't set up, run the `setup` automation first, then come back here.

## 1. Find the calls

* Read the calendar for today (or the call the founder named). For each meeting with someone outside the company, have **AI Rob** decide whether it's a sales call and, if so, which step of the current `gtm/sales-process.md` it is. Use the deal's history and the invite itself.
* Skip calls that already have a prep folder for this time, unless the deal changed since.
* Write non-sales meetings you skipped in today's run log, so the founder can correct you.

## 2. Get the deal ready

* **Existing deal:** read `deals/<deal>/deal.md`, its latest review and drafts, and the last prep.
* **New deal:** create `deals/<person-company>/deal.md` (format in `deals/README.md`) with what the invite, the email thread and the CRM say. Save anything public about the buyer's situation that the plan needs in `raw/evidence/`.
* Read the seller's section of `gtm/coaching.md`.

## 3. The plan (AI Rob)

Have **AI Rob** write the call plan for this step, from the current `gtm/sales-process.md`, the deal and the case study. Save it as `deals/<deal>/prep/<YYYY-MM-DD-HHMM>/plan.md`. It covers:
* Which call this is and the one thing that has to be true by the end of it.
* What we already know about this buyer, and what we still have to find out.
* The script for this step, fitted to this buyer.
* The two or three coaching reminders that matter most for this seller on this call.
* What to do if it goes sideways (no PULL, wrong person, they ask for a pilot).

## 4. The materials (AI Rob)

Make the materials this step lists in `gtm/sales-process.md`, all in the same prep folder. Have **AI Rob** make each one:
* **Deck:** `deck.html`, one self-contained HTML file the founder can open and present. The slides AI Rob says this call needs, built on the case study.
* **Buyer doc:** `buyer-doc.md`, for example the recap and agenda a champion forwards before call 2.
* **Agreement:** `agreement.md`, the simple agreement, at the step where the deal closes.

If AI Rob has no template for one, or what it makes isn't good enough to put in front of a buyer, give the founder what it made, say so, and follow `${CLAUDE_PLUGIN_ROOT}/FEEDBACK.md`.

## 5. Record it

* Add a line to the deal's timeline: `**YYYY-MM-DD** | Prep — <which call>, plan and materials in prep/<folder>/`.
* Update `next_step` in the deal's fields.
* Add a "Call prep" section to `automations/runs/YYYY-MM-DD.md`: each call, which step, links to what you made.

## 6. Send it

* **Morning run:** send one message for the whole day. `deal-check`'s section from today's run log goes first, then one block per call: the time, who, which call, the one thing to get, links to the plan and materials, and the coaching reminders.
* **Booked later today:** send that call's block on its own as soon as it's ready.
* **Reminder:** during the day, for each call starting within the hour, send a one-line reminder with the link to its plan.

Send where `automations/settings.md` says. If nothing is connected for messages, say where the files are.
