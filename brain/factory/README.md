# Factory

The `setup` automation sets this up by copying the factory app here (from the plugin's `factory/` folder) and writing `config.json`. After that this folder holds:

- `factory.json`: the model of this company's case study factory (format: `MODEL.md`)
- `config.json`: which agent runs the refresh, the schedule, and where the brief is sent
- `versions/`: every earlier `factory.json`, saved automatically

Run the homepage with `node server.js`, the morning brief with `node cli.js daily`.
