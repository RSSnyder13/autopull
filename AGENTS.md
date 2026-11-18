# Rules for working on this repo

This file is for people and agents changing the loops, the brain template or the factory. The rules for agents working inside a founder's brain are in `brain/AGENTS.md`.

- **Loops are skills.** Each loop lives in `loops/<loop>/SKILL.md`. A folder with only a `README.md` is a planned loop and is not loaded as a skill.
- **No AI Rob content in this repo.** A loop names the AI Rob job it needs ("run extreme deal review", "write the call plan") and never copies AI Rob's instructions, doctrine or wording.
- **Loops write only into the founder's brain,** using the paths in `brain/AGENTS.md`. If a loop needs a new file, add it to `brain/` and to the table in `brain/AGENTS.md`.
- **Refer to plugin files with `${CLAUDE_PLUGIN_ROOT}`** (for example `${CLAUDE_PLUGIN_ROOT}/factory/`), never with `../` paths.
- **Factory tests:** `node --test factory/test/*.test.js` before changing `factory/engine.js` or `factory/server.js`.
