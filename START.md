# Before anything

Every loop, and every factory prompt that calls AI Rob, runs these two checks first, in this order. Do not skip one because the founder asked for something specific: if a check fails, that check is the next step.

## 1. AI Rob is set up

AI Rob is the judgment layer. Nothing in these loops runs without it.

Check, in order:
1. An `ai-rob` skill is installed. Load it.
2. If not, a Skillfully connector is available with a skill named exactly `ai-rob`. Load it from there.

If neither works, stop here. Do no gathering, filing or setup. Tell the founder, in one short message:

> These loops need AI Rob to run. Set it up at https://airobsnyder.com/, then ask me again.

Then end. When they come back, run this check again before anything else.

## 2. The factory is set up

The factory is set up when all of these exist in the working folder:
- A GTM brain: an `AGENTS.md` with the brain's folders (copied from `${CLAUDE_PLUGIN_ROOT}/brain/`).
- A written case study in `gtm/case-study.md` and a written sales process in `gtm/sales-process.md` (more than the template's "Empty until then" text).
- The factory in `factory/`, with a `factory.json`.

If any are missing, tell the founder in one line that the factory has to be set up first, then run the `audit` loop. When the audit is done, carry on with what they asked for.

The only thing that skips this check is the `audit` loop itself.

## 3. Then do what they asked
