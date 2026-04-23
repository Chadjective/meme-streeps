#!/usr/bin/env node
/**
 * Builds data/walken/gemini_image_prompts.md from walk_to_walken.json + _visual_profile.json.
 *
 * Every output prompt is SELF-CONTAINED — paste one block into Gemini and go.
 * It includes: likeness anchor, scene, mood routing, negative prompt, aspect ratio, technical suffix.
 *
 * Mood is routed by tags in priority order: funny > uplifting > tender > defiant > dark > ominous > default.
 *
 * Usage: node scripts/build-gemini-prompts.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRIES_PATH = join(ROOT, 'data', 'walken', 'walk_to_walken.json');
const PROFILE_PATH = join(ROOT, 'data', 'walken', '_visual_profile.json');
const OUT_PATH = join(ROOT, 'data', 'walken', 'gemini_image_prompts.md');
const TXT_PATH = join(ROOT, 'data', 'walken', 'gemini_image_prompts.txt');

const MOOD_PRIORITY = ['funny', 'uplifting', 'tender', 'defiant', 'dark', 'ominous'];

function pickMood(tags = []) {
  const set = new Set(tags);
  for (const m of MOOD_PRIORITY) if (set.has(m)) return m;
  return 'default';
}

/**
 * Strip redundant style suffixes from the legacy full_prompt so they don't
 * collide with the global technical suffix. This keeps the scene description
 * but removes "cinematic, 35mm film grain, high detail" type tails.
 */
function stripTailStyle(s) {
  if (!s) return '';
  return s
    .replace(/,\s*cinematic[^.]*$/i, '')
    .replace(/,\s*35mm[^.]*$/i, '')
    .replace(/,\s*high detail[^.]*$/i, '')
    .replace(/,\s*professional cinematography[^.]*$/i, '')
    .replace(/\.$/, '')
    .trim();
}

/**
 * Strip the leading "Christopher Walken " from legacy scene descriptions so
 * the global likeness anchor can own identity once at the top of the prompt.
 */
function stripLeadingIdentity(s) {
  return s.replace(/^Christopher Walken\s+/i, '').replace(/^A (man|figure) resembling Christopher Walken[^,.]*[,.]?\s*/i, '');
}

function buildPrompt({ entry, likeness, moodStyle, technical, negative }) {
  const rawScene = entry.image_prompt.full_prompt || '';
  const scene = stripLeadingIdentity(stripTailStyle(rawScene));
  // Prompt assembled in a consistent order: identity → action → mood → technical → negative
  const parts = [
    likeness + '.',
    scene.charAt(0).toUpperCase() + scene.slice(1) + '.',
    moodStyle + '.',
    technical + '.',
    'Negative prompt: ' + negative + '.',
  ];
  return parts.join(' ');
}

const data = JSON.parse(readFileSync(ENTRIES_PATH, 'utf8'));
const profile = JSON.parse(readFileSync(PROFILE_PATH, 'utf8'));
const gs = profile.gemini_global_settings;
const moodMap = profile.mood_style_routing.styles;

const withPrompts = data.entries.filter((e) => e.image_prompt && e.image_prompt.full_prompt);

// Group for readable ToC
const byMood = {};
for (const e of withPrompts) {
  const m = pickMood(e.tags);
  (byMood[m] = byMood[m] || []).push(e);
}

const lines = [];
lines.push('# Walken — Gemini Image Prompts (v2)');
lines.push('');
lines.push('Source: `data/walken/walk_to_walken.json` · Profile: `data/walken/_visual_profile.json`');
lines.push('');
lines.push('Every prompt below is **self-contained** — paste one block into Gemini and go. Global settings (aspect ratio, likeness anchor, negative prompt, technical suffix) are already baked into each block.');
lines.push('');
lines.push('---');
lines.push('');
lines.push('## Global settings (baked into every prompt)');
lines.push('');
lines.push('- **Aspect ratio:** ' + gs.aspect_ratio);
lines.push('- **Likeness anchor:** ' + gs.likeness_anchor);
lines.push('- **Technical suffix:** ' + gs.technical_suffix);
lines.push('- **Negative prompt:** ' + gs.negative_prompt);
lines.push('');
lines.push('## Mood routing');
lines.push('');
lines.push('Each entry is routed to a mood style based on its tags. Priority: ' + MOOD_PRIORITY.join(' > ') + ' > default.');
lines.push('');
for (const [k, v] of Object.entries(moodMap)) {
  lines.push('- **' + k + ':** ' + v);
}
lines.push('');
lines.push('## Naming convention');
lines.push('');
lines.push('Save each generated image as `<id>.jpg` (e.g. `walk-019.jpg`) so the PWA wires images to entries automatically.');
lines.push('');
lines.push('---');
lines.push('');

// Table of contents by mood
lines.push('## Table of contents');
lines.push('');
for (const m of [...MOOD_PRIORITY, 'default']) {
  if (!byMood[m]) continue;
  lines.push('- **' + m + '** (' + byMood[m].length + ' prompts): ' + byMood[m].map((e) => '`' + e.id + '`').join(', '));
}
lines.push('');
lines.push('---');
lines.push('');

// Per-mood sections
for (const m of [...MOOD_PRIORITY, 'default']) {
  if (!byMood[m]) continue;
  lines.push('## Mood: ' + m + '  (' + byMood[m].length + ' prompts)');
  lines.push('');
  lines.push('_Style: ' + moodMap[m] + '._');
  lines.push('');

  for (const e of byMood[m]) {
    const prompt = buildPrompt({
      entry: e,
      likeness: gs.likeness_anchor,
      moodStyle: moodMap[m],
      technical: gs.technical_suffix,
      negative: gs.negative_prompt,
    });
    lines.push('### ' + e.id + '  —  score ' + e.meme_score + '  ·  archetype: `' + e.image_prompt.archetype + '`');
    lines.push('');
    lines.push('> **Pun:** ' + e.pun_version);
    lines.push('');
    lines.push('**Copy-paste prompt:**');
    lines.push('');
    lines.push('```');
    lines.push(prompt);
    lines.push('```');
    lines.push('');
  }
  lines.push('---');
  lines.push('');
}

lines.push('## Stats');
lines.push('');
lines.push('- Total entries in collection: ' + data.entries.length);
lines.push('- Entries with image prompts: ' + withPrompts.length);
for (const m of [...MOOD_PRIORITY, 'default']) {
  if (byMood[m]) lines.push('  - ' + m + ': ' + byMood[m].length);
}
lines.push('');

writeFileSync(OUT_PATH, lines.join('\n'), 'utf8');

// Plain-text companion — pure prompts only, separated by ===== <id> ===== headers.
// For copy-paste into Gemini with zero markdown noise.
const txtLines = [];
txtLines.push('# Walken — Gemini Image Prompts (plain text)');
txtLines.push('# Each block below is one ready-to-paste Gemini prompt.');
txtLines.push('# Copy everything between one ===== header and the next.');
txtLines.push('# Save each generated image as <id>.jpg (matches the ===== header).');
txtLines.push('');

for (const m of [...MOOD_PRIORITY, 'default']) {
  if (!byMood[m]) continue;
  for (const e of byMood[m]) {
    const prompt = buildPrompt({
      entry: e,
      likeness: gs.likeness_anchor,
      moodStyle: moodMap[m],
      technical: gs.technical_suffix,
      negative: gs.negative_prompt,
    });
    txtLines.push('===== ' + e.id + ' =====');
    txtLines.push(prompt);
    txtLines.push('');
  }
}
writeFileSync(TXT_PATH, txtLines.join('\n'), 'utf8');

console.log('Wrote', withPrompts.length, 'prompts to', OUT_PATH.replace(ROOT + '\\', ''));
console.log('Wrote', withPrompts.length, 'prompts to', TXT_PATH.replace(ROOT + '\\', ''));
console.log('Mood distribution:');
for (const m of [...MOOD_PRIORITY, 'default']) {
  if (byMood[m]) console.log('  ' + m + ': ' + byMood[m].length);
}
