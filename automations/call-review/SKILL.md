---
name: call-review
description: The call-review automation. After every sales call it gets the transcript, has AI Rob run an extreme deal review (PULL, coaching, lessons on the case study and the sales process, the next step), drafts the next step (recap or follow-up email, buyer doc, agreement), and files everything in the deal's folder. Use for "review my call", "review my call with ...", when the founder pastes a transcript, when a sales call was just recorded, or the hourly scheduled run.
version: 0.2.0
---

# Call review

> `${CLAUDE_PLUGIN_ROOT}` is the Autopull folder, two levels up from this `SKILL.md`. If the variable isn't set (Codex, ChatGPT, Claude.ai), use that folder.

Every sales call ends with a review and the next step already drafted. Paths below are in the founder's GTM brain; its `AGENTS.md` has the map and the rules. Every step marked **AI Rob** needs AI Rob loaded first, as the brain's `AGENTS.md` says.

## Before anything

Run the checks in `${CLAUDE_PLUGIN_ROOT}/START.md`. If AI Rob isn't set up, send the founder to https://airobsnyder.com/ and stop. If the factory isn't set up, run the `setup` automation first, then come back here.

## 1. Find the calls to review

* The call the founder named or pasted, or, on the hourly run, every sales call on the calendar that ended since the last "Call review" section in `automations/runs/`.
* Get each transcript from the call recorder. If it isn't there yet, leave it for the next run. If it still isn't there three hours after the call, ask the founder for it once.
* Skip calls that already have a review folder.

## 2. The review (AI Rob)

Have **AI Rob** run extreme deal review on the call, with the deal's history, the prep plan for this call, and the current `gtm/sales-process.md` and `gtm/case-study.md`. Save it as `deals/<deal>/reviews/<YYYY-MM-DD-HHMM>/review.md`. It covers:
* **PULL:** the grade and the deciding evidence, in the buyer's words.
* **Coaching:** what the seller did well and what to change, for this seller by name.
* **Case study:** what this call says about who has PULL and why.
* **Sales process:** whether the plan for this step was followed, and whether the step itself worked.
* **Next step:** what has to happen next, by when, and who does it.

## 3. Draft the next step (AI Rob)

Have **AI Rob** draft whatever the next step needs, in the same review folder: `follow-up.md` (the recap or follow-up email), and `buyer-doc.md` or `agreement.md` if the next step calls for them.

* If email is connected and `automations/settings.md` allows email drafts, also put the follow-up in the founder's drafts, as a reply in the thread with this buyer.
* Draft, never send, unless `automations/settings.md` says otherwise.

## 4. Update the deal

* In `deal.md`: update the fields (`stage`, `pull`, `next_step`, `last_contact`), write a new "Now" section linking the review, and add a timeline line.
* Add a row to `gtm/sales.md`.
* If `factory/factory.json` exists, upsert this deal's `deal-review` task (as `factory/prompts/refresh.md` step 4 describes) and run `node cli.js validate` in `factory/`.
* Add a "Call review" section to `automations/runs/YYYY-MM-DD.md`.

## 5. Send it

One message per call, as soon as it's ready: the PULL grade in one line, the one coaching point, the next step, and the drafted follow-up (or where it is). Send where `automations/settings.md` says.

If AI Rob had nothing for something that happened on the call, or the founder rewrites the draft, follow `${CLAUDE_PLUGIN_ROOT}/FEEDBACK.md`.
