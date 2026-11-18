---
name: setup
description: The setup automation, and the way into Autopull. Runs an audit across the founder's GTM data, builds their GTM factory (the brain, the case study and sales process written by AI Rob, the factory app), and sets up a weekly metrics review. Then says which automation to turn on next. Use for "get started", "set me up", "set up Autopull", "set up my GTM brain", "build my factory", "run an audit", and whenever another automation finds the factory isn't set up.
version: 0.1.0
---

# Setup

> `${CLAUDE_PLUGIN_ROOT}` is the Autopull folder, two levels up from this `SKILL.md`. If the variable isn't set (Codex, ChatGPT, Claude.ai), use that folder.

Builds the founder's GTM factory. Every other automation sends the founder here first if the factory isn't set up. Paths below are in the founder's GTM brain unless they start with `${CLAUDE_PLUGIN_ROOT}`. Every step marked **AI Rob** needs AI Rob loaded first, as the brain's `AGENTS.md` says.

## Before anything

Run check 1 in `${CLAUDE_PLUGIN_ROOT}/START.md`: AI Rob is set up. If it isn't, send the founder to https://airobsnyder.com/ and stop. Skip check 2: this automation is what sets the factory up.

If the factory is already set up (check 2 in `START.md` passes), say so, show where the homepage is, and go to step 6.

## 1. Brain

* If the working folder has no GTM brain, copy `${CLAUDE_PLUGIN_ROOT}/brain/` into it and run `git init`. Tell the founder to keep it private: it holds their prospects and customers.
* Ask the founder the questions in `company/company.md` and `company/product.md` and fill them in. If they don't know X yet, write "not defined yet".

## 2. Audit the GTM data

* Find out which tools the founder uses and which are connected to this agent (calendar, email, call recorder, CRM, LinkedIn outreach, billing, product analytics, where they want messages). Fill in `company/tools.md`. For anything not connected, write "not connected" and say what connecting it would unlock.
* Pull what the connected tools hold: past sales calls and their transcripts, deals, customers and revenue. Create a folder in `deals/` for each buyer, as `deals/README.md` describes. If there are no transcripts in a connected tool, ask the founder for them and save them in `raw/calls/`.

## 3. Case study and sales process (AI Rob)

* Have **AI Rob** run its audit across this evidence and write the first `gtm/case-study.md` and `gtm/sales-process.md`. These are the factory's inputs: the case study is who moves through the factory and what hitting X means, the sales process is its stages.
* Show the founder the case study. It waits for their yes, as the brain's rules say.

## 4. Factory

* Copy `${CLAUDE_PLUGIN_ROOT}/factory/` into the brain's `factory/` (everything but `test/`; keep `sample/` so the homepage has something to show until the first refresh).
* Copy `factory/config.example.json` to `factory/config.json`. Set `refreshCommand`, `chatCommand` and `notifyCommand` for this founder's agent and where they want messages (the examples are in the file). Record the connected sources in `setup.sources`.
* Run the first refresh: follow `factory/prompts/refresh.md`. It builds `factory/factory.json`. Run `node cli.js validate` in `factory/`.
* Start the homepage (`node server.js` in `factory/`) and give the founder the link.

## 5. Weekly metrics review

* Ask the founder when they want the weekly review (default: Monday morning) and where to get it.
* Schedule it: once a week, run `node cli.js daily` in `factory/` (it refreshes the factory, then sends the brief). Use the agent's own scheduler if it has one, otherwise cron (the example is in `config.example.json`). Save it in `setup.schedule` in `factory/config.json`.
* If the founder also wants a morning plan every weekday, schedule the same command for weekday mornings.
* Send one test notification and confirm the founder got it.

## 6. Which automation next

* Run `node cli.js analyze` in `factory/` and read the bottleneck.
* Have **AI Rob** say which automation to turn on next for that bottleneck, from the ones in `${CLAUDE_PLUGIN_ROOT}/automations/` that have a `SKILL.md`. If the best fit is one that isn't written yet, say so, and name the best one available now.
* Tell the founder in one short message: what was set up, what isn't connected, the bottleneck, and the automation to turn on next.
