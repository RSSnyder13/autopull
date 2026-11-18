# Rules for working on this repo

This file is for people and agents changing the automations, the brain template or the factory. The rules for agents working inside a founder's brain are in `brain/AGENTS.md`.

- **Automations are skills.** Each automation lives in `automations/<automation>/SKILL.md`. A folder with only a `README.md` is a planned automation and is not loaded as a skill. Keep the table in `README.md` in step with this folder.
- **Every automation starts with `START.md`.** An automation's `SKILL.md` runs those checks before its first step: AI Rob set up (if not, send the founder to https://airobsnyder.com/ and stop), then the factory set up (if not, run the `setup` automation). Only `setup` skips the factory check.
- **No AI Rob content in this repo.** An automation names the AI Rob job it needs ("run extreme deal review", "write the call plan") and never copies AI Rob's instructions, doctrine or wording.
- **Automations write only into the founder's brain,** using the paths in `brain/AGENTS.md`. If an automation needs a new file, add it to `brain/` and to the table in `brain/AGENTS.md`.
- **Refer to plugin files with `${CLAUDE_PLUGIN_ROOT}`** (for example `${CLAUDE_PLUGIN_ROOT}/factory/`), never with `../` paths.
- **Factory tests:** `node --test factory/test/*.test.js` before changing `factory/engine.js` or `factory/server.js`.
