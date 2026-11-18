#!/usr/bin/env node
// Posts the brief to Slack through an incoming webhook ($SLACK_WEBHOOK_URL).
// Reads the brief from $FACTORY_BRIEF_FILE.
"use strict";
const fs = require("fs");

const url = process.env.SLACK_WEBHOOK_URL;
if (!url) { console.error("Set SLACK_WEBHOOK_URL (Slack: Apps > Incoming Webhooks)."); process.exit(1); }
const md = fs.readFileSync(process.env.FACTORY_BRIEF_FILE, "utf8");
// Slack mrkdwn: **bold** -> *bold*, headings -> bold lines
const text = md.replace(/^# (.*)$/m, "*$1*").replace(/\*\*(.+?)\*\*/g, "*$1*");

fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) })
  .then((r) => { if (!r.ok) throw new Error("Slack returned " + r.status); console.log("Brief posted to Slack."); })
  .catch((e) => { console.error(e.message); process.exit(1); });
