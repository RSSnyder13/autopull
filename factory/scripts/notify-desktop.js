#!/usr/bin/env node
// Desktop notification that the brief is ready (macOS, Linux, Windows).
// Reads the brief from $FACTORY_BRIEF_FILE; shows its bottleneck line.
"use strict";
const fs = require("fs");
const { execFileSync } = require("child_process");

const text = fs.readFileSync(process.env.FACTORY_BRIEF_FILE, "utf8");
// The notification text is embedded in an AppleScript / PowerShell string below,
// so drop what could break out of it: control characters and the curly quotes
// PowerShell treats as quote marks (U+2018 to U+201B). ASCII quotes are escaped
// below (JSON.stringify for AppleScript, doubling for PowerShell); everything
// else, such as apostrophes, accents and URL query strings, is kept.
const clean = (s, max = 200) => Array.from(String(s).replace(/[\r\n\t]+/g, " ").replace(/[\u0000-\u001f\u007f\u2018-\u201b]/g, "")).slice(0, max).join("");
const line = clean((text.match(/\*\*Bottleneck:\*\* ([^.]+)/) || [])[1] || "Your brief is ready");
const title = "AI Rob: your plan for today";
const body = "Bottleneck: " + line + ". Open " + clean(process.env.FACTORY_DASHBOARD_URL || "the dashboard", 2000);

try {
  if (process.platform === "darwin") {
    execFileSync("osascript", ["-e", "display notification " + JSON.stringify(body) + " with title " + JSON.stringify(title)]);
  } else if (process.platform === "win32") {
    const ps = "[void][System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms');$n=New-Object System.Windows.Forms.NotifyIcon;$n.Icon=[System.Drawing.SystemIcons]::Information;$n.Visible=$true;$n.ShowBalloonTip(10000,'" + title + "','" + Array.from(body).slice(0, 250).join("").replace(/'/g, "''") + "',0);Start-Sleep 5";
    execFileSync("powershell", ["-NoProfile", "-Command", ps]);
  } else {
    // notify-send renders the body as Pango markup: escape it so agent-written text
    // or a URL with "&" shows as text and cannot inject markup.
    execFileSync("notify-send", [title, body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")]);
  }
  console.log("Notified: " + body);
} catch (e) {
  console.error("Desktop notification failed (" + e.message + "). Brief:\n" + text);
  process.exit(1);
}
