#!/usr/bin/env node
/**
 * Walkenify — word-swap engine for the walk_to_walken collection.
 *
 * Rules:
 *  - Whole-word replacement by default (word-boundary regex).
 *  - Case preservation: Walk→Walken, WALK→WALKEN, walked→Walkened, Walker→Walkener.
 *  - Compound overrides: a curated allowlist of compound words that ALSO get swapped
 *    (e.g. "walkathon" → "Walkenathon"). Compounds not on the list are left alone.
 *
 * The word-form mapping (lowercase base):
 *    walk     → walken
 *    walks    → walkens
 *    walked   → walkened
 *    walking  → walkening
 *    walker   → walkener
 *    walkers  → walkeners
 *
 * Usage:
 *    import { walkenify } from './walkenify.mjs';
 *    walkenify("A journey of a thousand miles begins with a single step.")
 *
 * CLI:
 *    node scripts/walkenify.mjs "walk a mile in someone's shoes"
 */

// ---------------------------------------------------------------------------
// Form table. Order matters: longer forms first so "walking" wins over "walk".
// ---------------------------------------------------------------------------
// Targets carry the "correct" casing for a LOWERCASE input. matchCase only
// adjusts for Title / ALL-CAPS source forms on top of this baseline.
const FORMS = [
  { from: 'walking', to: 'Walkening' },
  { from: 'walkers', to: 'Walkeners' },
  { from: 'walked',  to: 'Walkened'  },
  { from: 'walker',  to: 'Walkener'  },
  { from: 'walks',   to: 'Walkens'   },
  { from: 'walk',    to: 'Walken'    },
];

// ---------------------------------------------------------------------------
// Compound allowlist. These compounds DO get the inner "walk" swapped.
// Anything not in this list is left untouched by whole-word rules.
//
// Decided:  walkathon IN, walkie-talkie IN, sidewalk IN, walkman IN,
//           boardwalk IN, jaywalk IN, moonwalk IN, crosswalk IN,
//           catwalk IN, skywalker IN (fun), cakewalk IN.
// Excluded: chalkboard OUT (chalk swap is a separate collection anyway).
//
// Feel free to edit — each entry is {pattern, replacement}. Pattern is a
// case-insensitive string that must match a whole token (word-boundary on
// both ends); replacement uses the same case-preservation logic as base forms.
// ---------------------------------------------------------------------------
// Compound overrides: target uses INTERNAL capital W on "Walken" so the
// celebrity name pops visually inside the compound (sideWalken, jayWalken).
// When "Walken" is at the start of the compound (walkman → Walkenman),
// the W is naturally capitalized as the first letter.
const COMPOUND_OVERRIDES = [
  { from: 'sidewalk',      to: 'sideWalken'      },
  { from: 'sidewalks',     to: 'sideWalkens'     },
  { from: 'boardwalk',     to: 'boardWalken'     },
  { from: 'boardwalks',    to: 'boardWalkens'    },
  { from: 'crosswalk',     to: 'crossWalken'     },
  { from: 'crosswalks',    to: 'crossWalkens'    },
  { from: 'jaywalk',       to: 'jayWalken'       },
  { from: 'jaywalking',    to: 'jayWalkening'    },
  { from: 'jaywalker',     to: 'jayWalkener'     },
  { from: 'moonwalk',      to: 'moonWalken'      },
  { from: 'moonwalking',   to: 'moonWalkening'   },
  { from: 'moonwalker',    to: 'moonWalkener'    },
  { from: 'cakewalk',      to: 'cakeWalken'      },
  { from: 'catwalk',       to: 'catWalken'       },
  { from: 'catwalks',      to: 'catWalkens'      },
  { from: 'walkman',       to: 'Walkenman'       },
  { from: 'walkathon',     to: 'Walkenathon'     },
  { from: 'walkie-talkie', to: 'Walkenie-talkie' },
  { from: 'skywalker',     to: 'skyWalkener'     },
];

// ---------------------------------------------------------------------------
// Case preservation. "Walken" is a proper noun (celebrity name), so the
// replacement is ALWAYS capitalized — lowercase input still produces a
// Title-Cased replacement. ALL-CAPS input produces an ALL-CAPS replacement.
//
//   walk   → Walken   (proper noun — always capitalized)
//   Walk   → Walken
//   WALK   → WALKEN
//   walked → Walkened
//
// Compound overrides follow the same rule: sidewalk → Sidewalken, SIDEWALK → SIDEWALKEN.
// ---------------------------------------------------------------------------
function matchCase(source, target) {
  if (!source) return target;
  const allCaps = source === source.toUpperCase() && source !== source.toLowerCase();
  if (allCaps) return target.toUpperCase();
  const titleCase = source[0] === source[0].toUpperCase();
  if (titleCase) {
    // Capitalize first letter of target; preserve any deliberate internal casing.
    return target[0].toUpperCase() + target.slice(1);
  }
  // Lowercase source → use the target's baseline casing as declared in the table.
  // (Base forms declare "Walken" — a proper noun — so that pops automatically.
  // Compound overrides declare "sideWalken" — internal capital survives.)
  return target;
}

// ---------------------------------------------------------------------------
// Build one replacer function per form. Each uses a word-boundary regex so
// "walked" inside "boardwalked" is NOT matched by the base rule — only the
// compound override table can touch compounds.
// ---------------------------------------------------------------------------
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function applyForms(input, forms, { wholeWord }) {
  let out = input;
  for (const { from, to } of forms) {
    const boundary = wholeWord ? '\\b' : '';
    const re = new RegExp(`${boundary}(${escapeRegex(from)})${boundary}`, 'gi');
    out = out.replace(re, (match) => matchCase(match, to));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Main entrypoint.
// ---------------------------------------------------------------------------
export function walkenify(text) {
  if (!text) return text;
  // Apply compound overrides FIRST so they consume tokens like "sidewalk"
  // before the base-form rule would miss them (base rule won't match inside
  // a compound anyway thanks to \b, but we still need to catch them).
  let out = applyForms(text, COMPOUND_OVERRIDES, { wholeWord: true });
  out = applyForms(out, FORMS, { wholeWord: true });
  return out;
}

export function listOverrides() {
  return COMPOUND_OVERRIDES.map((o) => `${o.from} → ${o.to}`);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const isMain = (() => {
  try {
    return resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1] || '');
  } catch {
    return false;
  }
})();

if (isMain) {
  const arg = process.argv.slice(2).join(' ');
  if (!arg) {
    console.log('Usage: node scripts/walkenify.mjs "your quote here"');
    console.log('\nCompound overrides:');
    for (const line of listOverrides()) console.log('  ' + line);
    process.exit(0);
  }
  console.log(walkenify(arg));
}
