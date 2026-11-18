# Autopull (by Rob Snyder)

Self-improving automations that run your go-to-market, help you find pull, and tighten your PMF. 

Autopull's goal is for you to spend zero mental effort on anything other than working with customers.

## Automations

Email me about which automations you want next - rob@reframeb2b.com

| Automation | What it does |
|---|---|
| `setup` | Runs an audit across your GTM data, builds your GTM factory, sets up a weekly metrics review. |
| `sales-process` | Audits and improves your sales process; preps you for your calls, automates next steps, suggests sales process changes every week. |
| `linkedin-outbound` | (Coming soon) - Runs safe outbound on LinkedIn and makes adjustments every week. |
| `cold-calls` | (Coming soon) - Reviews cold calls and suggests improvements every week. |
| `inbound-geo-seo` | (Coming soon, maybe) - Generates content for GEO/SEO. |
| `linkedin-thought-leadership` | (Coming soon, maybe) - Drafts post ideas for founders. |
| `website` | (Coming soon, maybe) - Generates and adjusts your website so it fits what customers need. |

## Install

Autopull needs AI Rob installed in the same app first: https://airobsnyder.com/. Then pick your app below and ask it to "set up Autopull".

### Claude Code

```
/plugin marketplace add RSSnyder13/autopull
/plugin install autopull@autopull
```

### Claude desktop app (Cowork)

Customize → Plugins → Add marketplace → enter `RSSnyder13/autopull`, then install **Autopull**.

### Codex (CLI, desktop app, IDE)

```
codex plugin marketplace add RSSnyder13/autopull
codex plugin add autopull@autopull
```

Start a new thread after installing so Codex picks up the skills.

### ChatGPT and Claude.ai (skill upload)

These apps take skills as zip files, one per automation.

1. Download `autopull-setup.zip` and `autopull-sales-process.zip` from the latest [release](https://github.com/RSSnyder13/autopull/releases).
2. ChatGPT: Skills → Create → Upload from your computer. Claude.ai: Settings → Capabilities → Skills → Upload skill.
3. Upload `autopull-setup.zip` first, then the others.

The factory homepage is a small Node app. Apps that can't run a local server (ChatGPT, Claude.ai) still build and update the brain and the factory files; open the homepage from a coding agent or your own computer.

### Publishing a new version

Bump `version` in `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` and `.codex-plugin/plugin.json`, then push a tag (`git tag v0.2.0 && git push --tags`). The release workflow builds the skill zips (`npm run build:skills`) and attaches them to the release.

## What's open and what isn't

- **Open (this repo):** the loops, the GTM brain template, and the factory (the model, the engine that does the math, and the homepage).
- **AI Rob (paid):** the judgment the loops call. Grading PULL, reviewing calls and deals, writing scripts and coaching, proposing changes. The loops never copy AI Rob's instructions. They only save what AI Rob concluded about the founder's own evidence.

## What's in here

```
.claude-plugin/ Claude plugin + marketplace manifests
.codex-plugin/  Codex plugin manifest
.agents/        Codex marketplace manifest
automations/    one folder per automation (each is a skill)
brain/          the GTM brain template, copied into your private repo
factory/        the factory app: model, engine, homepage, morning brief
scripts/        builds the skill zips for ChatGPT and Claude.ai
```
