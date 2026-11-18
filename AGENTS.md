# Rules for working on this repo

This file is for people and agents changing the automations, the brain template or the factory. The rules for agents working inside a founder's brain are in `brain/AGENTS.md`.

- **Automations are skills.** Each automation lives in `automations/<automation>/SKILL.md`. A folder with only a `README.md` is a planned automation and is not loaded as a skill. Keep the table in `README.md` in step with this folder.
- **Every automation starts with `START.md`.** An automation's `SKILL.md` runs those checks before its first step: AI Rob set up (if not, send the founder to https://airobsnyder.com/ and stop), then the factory set up (if not, run the `setup` automation). Only `setup` skips the factory check.
- **No AI Rob content in this repo.** An automation names the AI Rob job it needs ("run extreme deal review", "write the call plan") and never copies AI Rob's instructions, doctrine or wording.
- **Automations write only into the founder's brain,** using the paths in `brain/AGENTS.md`. If an automation needs a new file, add it to `brain/` and to the table in `brain/AGENTS.md`.
- **Refer to plugin files with `${CLAUDE_PLUGIN_ROOT}`** (for example `${CLAUDE_PLUGIN_ROOT}/factory/`), never with `../` paths.
- **Every `SKILL.md` keeps the plugin-root note** under its title: "> `${CLAUDE_PLUGIN_ROOT}` is the Autopull folder, two levels up from this `SKILL.md`. If the variable isn't set (Codex, ChatGPT, Claude.ai), use that folder." Codex and uploaded skills don't set the variable, and `scripts/build-skill-zips.js` rewrites this line for the zips (it fails if the line is missing).
- **One version, four places.** Keep `version` the same in `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` (metadata and the plugin entry) and `.codex-plugin/plugin.json`. Release by pushing a `v*` tag.
- **Factory tests:** `node --test factory/test/*.test.js` before changing `factory/engine.js` or `factory/server.js`.
