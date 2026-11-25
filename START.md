# Before anything

Every automation, and every factory prompt that calls AI Rob, runs these two checks first, in this order. Do not skip one because the founder asked for something specific: if a check fails, that check is the next step.

## 1. AI Rob is set up

AI Rob is the judgment layer. Nothing in Autopull runs without it.

Check, in order:
1. An `ai-rob` skill is installed. Load it.
2. If not, a Skillfully connector is available with a skill named exactly `ai-rob`. Load it from there.

If neither works, stop here. Do no gathering, filing or setup. Tell the founder, in one short message:

> Autopull needs AI Rob to run. Set it up at https://airobsnyder.com/, then ask me again.

Then end. When they come back, run this check again before anything else.

## 2. The factory is set up

First find the brain. It is the folder named in the request or the scheduled task. If none is named, it is the working folder, or the folder inside it, whose `AGENTS.md` has the GTM brain's "Where things are" table.

The factory is set up when all of these exist in the brain:
- The brain's folders and `automations/settings.md` (from `${CLAUDE_PLUGIN_ROOT}/brain/`).
- A written case study in `gtm/case-study.md` and a written sales process in `gtm/sales-process.md` (more than the template's "Empty until then" text).
- The factory in `factory/`, with a `factory.json`.

If any are missing, tell the founder in one line that the factory has to be set up first, then run the `setup` automation. When setup is done, carry on with what they asked for.

The only thing that skips this check is the `setup` automation itself.

## 3. Then do what they asked

Read `gtm/overrides.md` and `automations/settings.md` in the brain before the first step. When AI Rob can't do a job well, follow `${CLAUDE_PLUGIN_ROOT}/FEEDBACK.md`.
