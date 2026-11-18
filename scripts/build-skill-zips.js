#!/usr/bin/env node
// Builds one uploadable skill zip per automation, for apps that take a skill
// as a zip instead of installing the whole plugin (ChatGPT Skills, Claude.ai
// Skills). Each zip holds <automation>/SKILL.md and its own files, plus the
// rest of the plugin (START.md, brain/, factory/, automations/) in
// <automation>/autopull/, which stands in for ${CLAUDE_PLUGIN_ROOT}.
//
// Usage: node scripts/build-skill-zips.js   ->  dist/autopull-<automation>.zip

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const stage = path.join(dist, 'stage');

// Only files git tracks, so a founder's local config or factory state never ships.
const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);

const pluginFiles = tracked.filter(
  (f) =>
    f === 'START.md' ||
    f.startsWith('brain/') ||
    f.startsWith('automations/') ||
    (f.startsWith('factory/') && !f.startsWith('factory/test/'))
);

const automations = [...new Set(
  tracked
    .filter((f) => /^automations\/[^/]+\/SKILL\.md$/.test(f))
    .map((f) => f.split('/')[1])
)];

const NOTE_RE = /^> `\$\{CLAUDE_PLUGIN_ROOT\}` is the Autopull folder.*$/m;
const ZIP_NOTE =
  '> `${CLAUDE_PLUGIN_ROOT}` is the `autopull/` folder next to this `SKILL.md`.';

function copy(rel, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(path.join(root, rel), to);
}

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(stage, { recursive: true });

for (const name of automations) {
  const skillDir = path.join(stage, name);
  const prefix = `automations/${name}/`;

  for (const f of tracked.filter((f) => f.startsWith(prefix))) {
    copy(f, path.join(skillDir, f.slice(prefix.length)));
  }

  const skillMd = path.join(skillDir, 'SKILL.md');
  const text = fs.readFileSync(skillMd, 'utf8');
  if (!NOTE_RE.test(text)) {
    throw new Error(`${prefix}SKILL.md is missing the \${CLAUDE_PLUGIN_ROOT} note (see AGENTS.md)`);
  }
  fs.writeFileSync(skillMd, text.replace(NOTE_RE, ZIP_NOTE));

  for (const f of pluginFiles) copy(f, path.join(skillDir, 'autopull', f));

  const zip = path.join(dist, `autopull-${name}.zip`);
  execFileSync('zip', ['-qr', zip, name], { cwd: stage });
  console.log(path.relative(root, zip));
}

fs.rmSync(stage, { recursive: true, force: true });
