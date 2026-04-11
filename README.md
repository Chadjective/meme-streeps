# Meme Streeps

The Meryl Streep Misquote Generator. Shake your phone. Get a misquote. Swipe to judge.

A mobile-first PWA that overlays real quotes onto AI-generated Streep photos, swaps words like `street`, `steep`, `sleep`, `deep`, `sweep`, `peril`, `streak`, and `creep` for `Streep` or `Meryl`, and lets you vote each one **Streets Ahead** (approved) or **For the Streets** (rejected).

## Features

- **Shake to generate** — DeviceMotion API (with iOS permission flow) or tap the button
- **Classic meme layout** — Impact font, top/bottom text split, breathing white glow, gold highlights on Streep/Meryl pun words
- **Swipe to vote** — drag left for "For the Streets", right for "Streets Ahead". Double-tap or swipe up to flip the card and see the original quote, attribution, source, and category
- **Gallery view** — chronological history of every meme you've rated, with per-tile sharing
- **Share as PNG** — one-tap generates an Instagram-ready 1080×1350 PNG with the image and text burned in, shared via Web Share API on mobile or downloaded on desktop
- **Supabase-backed voting** — anonymous device-fingerprinted votes, one per quote per device
- **Offline-capable** — PWA with service worker caching the app shell
- **Film grain, breathing glow, card flip animations** — the small details matter

## Tech Stack

- Vite + vanilla TypeScript (no framework)
- Supabase for vote storage and future leaderboard
- Canvas API for meme PNG rendering
- Web Share API with Level 2 file support
- Service worker for PWA offline support

## Project Structure

```
meme-streeps/
├── index.html
├── src/
│   ├── main.ts              # Entry: wires shake, swipe, vote, gallery, share
│   ├── quotes.ts            # Seed quote dataset (11 collections)
│   ├── images.ts            # Random image selection (no repeats)
│   ├── meme-card.ts         # Card rendering, text splitting, gold highlighting
│   ├── swipe.ts             # Touch + mouse drag, gesture discrimination
│   ├── shake.ts             # DeviceMotion with iOS permission
│   ├── voting.ts            # localStorage dedup + Supabase insert
│   ├── animations.ts        # Shake, card exit, edge flash
│   ├── gallery.ts           # Gallery localStorage CRUD
│   ├── gallery-view.ts      # Gallery screen DOM rendering
│   ├── canvas-meme.ts       # PNG meme rendering (1080×1350)
│   ├── share.ts             # Web Share API wrapper
│   ├── supabase.ts          # Supabase client singleton
│   └── style.css            # All styles
├── public/
│   ├── images/              # AI-generated Streep photos
│   ├── manifest.json        # PWA manifest
│   └── sw.js                # Service worker
├── supabase/
│   └── schema.sql           # Database migration
└── scripts/
    └── optimize-images.mjs  # Image compression helper
```

## Setup

### Prerequisites

- Node.js 18+
- A Supabase project (free tier is fine)

### Install

```bash
git clone <your-repo-url>
cd meme-streeps
npm install
```

### Environment

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Database

Run the schema in the Supabase SQL Editor:

```bash
cat supabase/schema.sql
```

This creates the `votes` table with a unique constraint on `(quote_id, device_id)`, enables RLS with anon insert/select policies, and creates a `leaderboard` view.

### Dev

```bash
npm run dev
```

Open `http://localhost:5173`. To test on a phone, find your machine's LAN IP in the Vite output and connect to that from your phone on the same WiFi.

### Build

```bash
npm run build
```

Outputs to `dist/`. Deploy anywhere that serves static files (Vercel, Netlify, Cloudflare Pages).

### Image Optimization

If you drop new images into `public/images/`, you can batch-compress them:

```bash
node scripts/optimize-images.mjs
```

This resizes to 800px wide and converts to JPEG at ~78% quality using `sharp`.

## Adding Quotes

Quotes live in `src/quotes.ts` as a TypeScript array. Each entry has:

```ts
{
  id: string;          // unique within collection
  quote: string;       // original quote text
  streepified: string; // the Streep-ified version
  attribution: string; // who said it
  source: string;      // where/when
  category: string;    // thematic grouping
  collection: string;  // e.g. "street_to_streep"
}
```

The 11 collections map pun-eligible words to `Streep` or `Meryl`:

| Collection | Substitution |
|---|---|
| `street_to_streep` | street → Streep |
| `steep_to_streep` | steep → Streep |
| `sleep_to_streep` | sleep → Streep |
| `deep_to_streep` | deep → Streep |
| `sweep_to_streep` | sweep → Streep |
| `peril_to_meryl` | peril → Meryl |
| `streak_to_streep` | streak → Streep |
| `creep_to_streep` | creep → Streep |
| `words_of_streep` | Quotes by Meryl Streep |
| `about_meryl_streep` | Quotes about Meryl Streep |
| `speeches_and_characters` | Lines from her films/speeches |

Quotes with no Streep/Meryl token are automatically filtered out at runtime (except for the three "direct Streep" collections, which are shown as-is).

## Privacy

- No accounts, no tracking.
- A random UUID is stored in localStorage as `meme-streeps-device-id` purely to prevent a single browser from voting on the same quote twice.
- Gallery history is stored locally only — never sent to the server.
- Votes in Supabase only contain the quote ID, direction, and device UUID.

## License

MIT — see [LICENSE](./LICENSE)

## Credits

- Quotes: curated public domain and fair-use attributions
- Images: AI-generated with Google Gemini
- Font stack: Oswald, Special Elite (Google Fonts), Impact (system)
