#!/usr/bin/env node
// Stands in for Claude / Codex in tests. Speaks the same file protocol the
// prompts in prompts/ ask the real agent to follow.
"use strict";
const fs = require("fs");
const path = require("path");

const mode = process.argv[2];
const dir = process.env.FACTORY_DIR || path.join(__dirname, "..");
const modelFile = process.env.FACTORY_MODEL || path.join(dir, "factory.json");

if (mode === "refresh") {
  const m = JSON.parse(fs.readFileSync(path.join(dir, "sample", "factory.json"), "utf8"));
  m.company.name = "Stub Co";
  m.generatedAt = new Date().toISOString();
  fs.writeFileSync(modelFile, JSON.stringify(m, null, 1));
  console.log("refreshed");
} else if (mode === "chat") {
  const q = JSON.parse(fs.readFileSync(process.env.FACTORY_CHAT_IN, "utf8"));
  const out = { answer: "Stub answer to: " + q.message + " (bottleneck: " + q.bottleneck.id + ")" };
  if (/what if/i.test(q.message)) out.scenario = { label: "Only first-audit, calendars full", cohort: { caseStudy: "first-audit" }, fillCalendar: true };
  if (/rename/i.test(q.message)) {
    const m = JSON.parse(fs.readFileSync(modelFile, "utf8"));
    m.company.name = "Renamed Co";
    fs.writeFileSync(modelFile, JSON.stringify(m, null, 1));
    out.answer = "Renamed the company.";
  }
  fs.writeFileSync(process.env.FACTORY_CHAT_OUT, JSON.stringify(out));
} else if (mode === "notify") {
  fs.copyFileSync(process.env.FACTORY_BRIEF_FILE, path.join(dir, ".notified.md"));
  console.log("notified");
}
