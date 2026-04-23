#!/usr/bin/env node
/**
 * Builds data/walken/gemini_silly_prompts.md from silly_walken.json + _visual_profile.json.
 *
 * Mirrors build-gemini-prompts.mjs but for the standalone silly/creative collection
 * (not tied to any quote). Each entry in silly_walken.json carries its own aspect_ratio
 * and optional mood_override, so the prompt can override the global defaults per image.
 *
 * Usage: node scripts/build-silly-prompts.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRIES_PATH = join(ROOT, 'data', 'walken', 'silly_walken.json');
const PROFILE_PATH = join(ROOT, 'data', 'walken', '_visual_profile.json');
const OUT_PATH = join(ROOT, 'data', 'walken', 'gemini_silly_prompts.md');
const TXT_PATH = join(ROOT, 'data', 'walken', 'gemini_silly_prompts.txt');

const THEME_ORDER = ['absurd', 'art', 'historical', 'wholesome', 'surreal'];

function buildPrompt({ entry, likeness, moodStyle, technical, negative }) {
  const scene = entry.scene.charAt(0).toUpperCase() + entry.scene.slice(1).replace(/\.$/, '');
  // Aspect ratio is stamped into the technical directive so Gemini reads it plainly.
  const tech = technical.replace(/Portrait 3:4 aspect ratio/i, entry.aspect_ratio + ' aspect ratio');
  const parts = [
    likeness + '.',
    scene + '.',
    moodStyle + '.',
    tech + '.',
    'Negative prompt: ' + negative + '.',
  ];
  return parts.join(' ');
}

const data = JSON.parse(readFileSync(ENTRIES_PATH, 'utf8'));
const profile = JSON.parse(readFileSync(PROFILE_PATH, 'utf8'));
const gs = profile.gemini_global_settings;
const moodMap = profile.mood_style_routing.styles;

const byTheme = {};
for (const e of data.entries) {
  (byTheme[e.theme] = byTheme[e.theme] || []).push(e);
}

const lines = [];
lines.push('# Walken — Silly / Creative Image Prompts');
lines.push('');
lines.push('Source: `data/walken/silly_walken.json` · Profile: `data/walken/_visual_profile.json`');
lines.push('');
lines.push('**Standalone creative collection** — not tied to any specific quote. Intended for splash screens, loading states, Easter eggs, shareable bonus content, app decor.');
lines.push('');
lines.push('Every prompt below is self-contained: paste one block into Gemini and go.');
lines.push('');
lines.push('---');
lines.push('');
lines.push('## Global settings');
lines.push('');
lines.push('- **Default aspect:** 3:4 portrait (individual entries may override — look for `16:9` on landscape-oriented scenes)');
lines.push('- **Likeness anchor:** ' + gs.likeness_anchor);
lines.push('- **Technical suffix:** ' + gs.technical_suffix + ' (aspect ratio substituted per entry)');
lines.push('- **Negative prompt:** ' + gs.negative_prompt);
lines.push('');
lines.push('## Naming convention');
lines.push('');
lines.push('Save each generated image as `<id>.jpg` (e.g. `silly-016.jpg`). The ID maps 1:1 to `silly_walken.json`.');
lines.push('');
lines.push('---');
lines.push('');
lines.push('## Table of contents');
lines.push('');
for (const t of THEME_ORDER) {
  if (!byTheme[t]) continue;
  lines.push('- **' + t + '** (' + byTheme[t].length + '): ' + byTheme[t].map((e) => '`' + e.id + '`').join(', '));
}
lines.push('');
lines.push('---');
lines.push('');

for (const theme of THEME_ORDER) {
  if (!byTheme[theme]) continue;
  lines.push('## Theme: ' + theme + '  (' + byTheme[theme].length + ' prompts)');
  lines.push('');

  for (const e of byTheme[theme]) {
    const moodKey = e.mood_override || 'default';
    const moodStyle = moodMap[moodKey] || moodMap.default;
    const prompt = buildPrompt({
      entry: e,
      likeness: gs.likeness_anchor,
      moodStyle,
      technical: gs.technical_suffix,
      negative: gs.negative_prompt,
    });
    lines.push('### ' + e.id + '  —  ' + e.title);
    lines.push('');
    const meta = [
      'theme: `' + e.theme + '`',
      'aspect: `' + e.aspect_ratio + '`',
      'mood: `' + moodKey + '`',
    ].join('  ·  ');
    lines.push('_' + meta + '_');
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
lines.push('- Total prompts: ' + data.entries.length);
for (const t of THEME_ORDER) {
  if (byTheme[t]) lines.push('  - ' + t + ': ' + byTheme[t].length);
}
const landscapeCount = data.entries.filter((e) => e.aspect_ratio !== '3:4').length;
lines.push('- Landscape (16:9) prompts: ' + landscapeCount);
lines.push('- Portrait (3:4) prompts: ' + (data.entries.length - landscapeCount));
lines.push('');

writeFileSync(OUT_PATH, lines.join('\n'), 'utf8');

// Plain-text companion — pure prompts only, separated by ===== <id> ===== headers.
const txtLines = [];
txtLines.push('# Walken — Silly / Creative Image Prompts (plain text)');
txtLines.push('# Each block below is one ready-to-paste Gemini prompt.');
txtLines.push('# Copy everything between one ===== header and the next.');
txtLines.push('# Save each generated image as <id>.jpg (matches the ===== header).');
txtLines.push('');

for (const theme of THEME_ORDER) {
  if (!byTheme[theme]) continue;
  for (const e of byTheme[theme]) {
    const moodKey = e.mood_override || 'default';
    const moodStyle = moodMap[moodKey] || moodMap.default;
    const prompt = buildPrompt({
      entry: e,
      likeness: gs.likeness_anchor,
      moodStyle,
      technical: gs.technical_suffix,
      negative: gs.negative_prompt,
    });
    txtLines.push('===== ' + e.id + ' =====');
    txtLines.push(prompt);
    txtLines.push('');
  }
}
writeFileSync(TXT_PATH, txtLines.join('\n'), 'utf8');

console.log('Wrote', data.entries.length, 'silly prompts to', OUT_PATH.replace(ROOT + '\\', ''));
console.log('Wrote', data.entries.length, 'silly prompts to', TXT_PATH.replace(ROOT + '\\', ''));
console.log('Theme distribution:');
for (const t of THEME_ORDER) if (byTheme[t]) console.log('  ' + t + ': ' + byTheme[t].length);
console.log('Landscape:', landscapeCount, '| Portrait:', data.entries.length - landscapeCount);
