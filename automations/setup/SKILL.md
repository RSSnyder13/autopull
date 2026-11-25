---
name: setup
description: The setup automation, and the way into Autopull. Finds the founder's GTM brain or makes one, pulls in their past sales calls, deals and current sales process, has AI Rob audit it all (who has PULL, where deals die, what to change), writes the case study and an opinionated sales process, builds the factory, and schedules the daily and weekly automations. Use for "get started", "set me up", "set up Autopull", "set up my sales process", "audit my sales", "build my factory", and whenever another automation finds the factory isn't set up.
version: 0.2.0
---

# Setup

> `${CLAUDE_PLUGIN_ROOT}` is the Autopull folder, two levels up from this `SKILL.md`. If the variable isn't set (Codex, ChatGPT, Claude.ai), use that folder.

Turns whatever sales process the founder has into Rob's: a brain that holds everything, an audit, a written case study and sales process, the factory, and the automations on a schedule. After setup the founder only works with customers. Paths below are in the founder's GTM brain unless they start with `${CLAUDE_PLUGIN_ROOT}`. Every step marked **AI Rob** needs AI Rob loaded first, as the brain's `AGENTS.md` says.

## Before anything

Run check 1 in `${CLAUDE_PLUGIN_ROOT}/START.md`: AI Rob is set up. If it isn't, send the founder to https://airobsnyder.com/ and stop. Skip check 2: this automation is what sets the factory up.

If the factory is already set up (check 2 in `START.md` passes), say so, show where the homepage is, then run only what's missing: step 6 if nothing is scheduled, and step 1's top-up of template files that are missing.

## 1. Find the brain, or make one

Look before you make. Check the working folder, then ask the founder in one question whether they already keep their company or sales knowledge somewhere you can reach: a repo, a folder, a notes vault.

* **An Autopull brain** (an `AGENTS.md` with the brain's "Where things are" table): use it. Copy in any file from `${CLAUDE_PLUGIN_ROOT}/brain/` that it doesn't have yet. Never overwrite one that exists.
* **Some other repo or knowledge base:** use it as the brain. Copy in every file from `${CLAUDE_PLUGIN_ROOT}/brain/` that doesn't clash. If `AGENTS.md`, `CLAUDE.md` or `README.md` already exist, add the template's content to the end of each as a "GTM brain" section instead. Leave the founder's own files where they are, and list the ones that hold deals, call notes or playbooks in `company/tools.md` so the audit reads them.
* **Nothing:** copy `${CLAUDE_PLUGIN_ROOT}/brain/` into the working folder and run `git init`. Tell the founder to keep it private: it holds their prospects and customers.

Write the brain's full path at the top of `automations/settings.md`. Every scheduled run uses it to find the brain.

Then ask the founder the questions in `company/company.md` and `company/product.md` and fill them in. If they don't know something yet, write "not defined yet".

## 2. Connect and pull the data

* Find out which tools the founder uses and which are connected to this agent: calendar, email, call recorder, CRM, billing, product analytics, and where they want messages. Fill in `company/tools.md`. For anything not connected, write "not connected", say what connecting it unlocks, and offer to connect it now. The calendar, the call recorder and email matter most: without them nothing runs on its own.
* Pull what the connected tools hold:
   * Every past sales call and its transcript.
   * Every deal, and how it ended: who bought, who didn't, who went quiet (CRM, billing, email).
   * What success looks like after the sale, and which customers got there (product analytics, billing, the founder). This is X in `company/product.md`.
* Create a folder in `deals/` for each buyer, as `deals/README.md` describes. If a connected tool has no transcripts, ask the founder for them and save them in `raw/calls/`.

## 3. Pull in their current sales process

Ask the founder for whatever they run today, in whatever shape it's in: call scripts, decks, a playbook, email templates, CRM stages, their own notes on what works. Save each in `raw/imports/` as it came. If they have nothing written, ask them to describe how a deal goes from first call to signed, and save that.

## 4. The audit (AI Rob)

Have **AI Rob** run the sales audit across all of it: the calls, the deals and how they ended, who got to X, and the founder's current process. Then:

* Set `pull` and `stage` on every `deal.md`, with the deciding evidence in its timeline.
* Write `reports/audit-YYYY-MM-DD.md`: who has PULL and who doesn't, where deals die and why, what the current process does that works and what it doesn't, the case study, and the first changes, each with what it should change.
* Write the first `gtm/case-study.md` and `gtm/sales-process.md`. The sales process is Rob's structure filled in with this founder's evidence: one section per step (call 1, call 2, group call, close, and any the evidence needs), each with its goal, what has to be true to move on, the script, the materials (deck, buyer doc, agreement) and the follow-up. Where it differs from what the founder ran before, say what changed and why. Anything in `gtm/overrides.md` wins.
* Write the first entry in `gtm/coaching.md`, one section per seller.
* Show the founder the audit and the case study. The case study waits for their yes, as the brain's rules say.

If AI Rob couldn't judge something, or had nothing for a part of the founder's process, follow `${CLAUDE_PLUGIN_ROOT}/FEEDBACK.md`.

## 5. Factory

* Copy `${CLAUDE_PLUGIN_ROOT}/factory/` into the brain's `factory/` (everything but `test/`; keep `sample/` so the homepage has something to show until the first refresh).
* Copy `factory/config.example.json` to `factory/config.json`. Set `refreshCommand`, `chatCommand` and `notifyCommand` for this founder's agent and where they want messages (the examples are in the file). Record the connected sources in `setup.sources`.
* Run the first refresh: follow `factory/prompts/refresh.md`. It builds `factory/factory.json`. Run `node cli.js validate` in `factory/`.
* Start the homepage (`node server.js` in `factory/`) and give the founder the link. Apps that can't run a local server skip this.

## 6. Settings and schedule

Ask the founder the questions in `automations/settings.md` and fill it in. Use the defaults for anything they don't care about. Then schedule three runs, each with the brain's path in its prompt:

| Run | When (default) | What it runs |
|---|---|---|
| Morning | Weekdays, 7:30 | `deal-check`, then `call-prep`. One message with everything for the day. |
| During the day | Every hour, 9:00 to 18:00 on weekdays | `call-review` for calls that ended, `call-prep` for calls booked today with no prep yet, and a reminder for calls in the next hour. |
| Weekly | Friday, 15:00 | `weekly-review` |

* Use the agent's own scheduler if it has one. Otherwise use cron with the agent's command line, for example: `30 7 * * 1-5 cd <brain> && claude -p "Run the Autopull morning run: deal-check, then call-prep." --permission-mode acceptEdits`.
* Write what was scheduled, and where, in `automations/settings.md`.
* Send one test message where the founder wants them and confirm they got it.

## 7. Tell the founder

One short message:
* What was set up, and what isn't connected (and what that costs them).
* The audit's headline: who has PULL, the biggest leak, the first change.
* What happens next: when the first morning message arrives, and that after each call a review and a drafted next step will arrive by themselves.
* What needs them: the case study yes, and any "review first" settings.
