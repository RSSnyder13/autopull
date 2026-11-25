Run this founder's morning plan. Load AI Rob first (see "AI Rob" in the brain's `AGENTS.md`) and ask it to write the morning plan. If AI Rob can't be loaded, do nothing else: tell the founder to set it up at https://airobsnyder.com/ and stop. Read `gtm/overrides.md` in the brain first.

1. Refresh the model by following `prompts/refresh.md` (this also runs the deal reviews if they are on).
2. Read today's `automations/runs/YYYY-MM-DD.md` in the brain: the call prep and the deals that need the founder today go into the plan.
3. Read today's calendar. AI Rob writes `plan` in `factory.json`: `{ date: today, summary, blocks: [{ at, until, title, why, bottleneck, taskIds }] }`, with the bottleneck work in the first free blocks of the morning, around meetings already booked, then the deal-review tasks. Run `node cli.js validate`.
4. Run `node cli.js brief` to produce the message and read it back. If the advice no longer matches the engine's bottleneck, have AI Rob fix `coaching` and run the brief again.
5. Deliver it the way `config.json` says (`setup.notify.channel`): either `node cli.js brief --notify`, or through the connector (Gmail, Slack). Subject: "Your plan for today". Keep the link.
6. Print one line confirming where it was sent.
