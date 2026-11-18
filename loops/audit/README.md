# Audit loop

Planned. The audit sets up the factory. Every other loop sends the founder here first if the factory isn't set up (see `${CLAUDE_PLUGIN_ROOT}/START.md`). It needs AI Rob set up first.

It does five things, all of them the factory:

1. **Brain.** Copies `${CLAUDE_PLUGIN_ROOT}/brain/` into the working folder and runs `git init`. The factory lives in the brain.
2. **Case study and sales process.** Has AI Rob write the first `gtm/case-study.md` and `gtm/sales-process.md`. These are the factory's inputs: the case study is who moves through it and what "hit X" means, the sales process is its stages. This is AI Rob work, not setup, and nothing else writes them.
3. **Factory.** Copies `${CLAUDE_PLUGIN_ROOT}/factory/` into the brain's `factory/`, writes `config.json`, and runs the first refresh (`factory/prompts/refresh.md`) to build `factory.json`.
4. **Schedule.** Sets the refresh and the morning brief to run on a schedule.
5. **Next loop.** Reads the factory's bottleneck and says which loop to turn on next.

When this loop is written, add `SKILL.md` here. Until then this folder is not loaded as a skill, so an agent that is sent here does these five steps directly.
