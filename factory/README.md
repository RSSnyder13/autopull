# Factory

A live model of the founder's case study factory: every buyer moving from first outreach to hitting X, where they fall off, how long each stage takes, and which one is the bottleneck. It powers the AI Rob homepage and the morning brief.

- **`MODEL.md`**: what goes in `factory.json`.
- **`engine.js`**: all the math. The agent never does factory arithmetic by hand.
- **`cli.js`**: `validate`, `analyze` (with `--scenario` and `--filters`), `brief`, `daily`.
- **`server.js` + `index.html`**: the homepage, at http://localhost:4747.
- **`prompts/`**: what the agent runs for a refresh, the morning plan and chat. Each one calls AI Rob for the judgment.
- **`sample/`**: a sample company, shown until the first refresh.
- **`scripts/`**: notifications (desktop, Slack) and the sample generator.
- **`test/`**: `node --test test/*.test.js`.

## How it runs

The app never calls an AI service itself. It runs the founder's own agent with the commands in `config.json` (`refreshCommand`, `chatCommand`, `notifyCommand`). Copy `config.example.json` to `config.json` and set them. Examples for Claude Code and Codex are inside.

The app reads `config.json` and `factory.json` from its own folder, so the audit copies this folder into the founder's brain at `factory/`.
