# Vice Cover Studio v3 — Sundown

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/roymaster46/gta6-cover-art-v3/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/roymaster46/gta6-cover-art-v3/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Turn your crew's photos into a GTA-style movie poster — **SUNDOWN: Kings of the Coast** — and export it as a PNG to share. Built for the [gta6-cover-art-01](https://make.fun/bounty/gta6-cover-art-01) bounty on make.fun. Everything runs offline in the browser; no photo ever leaves your device.

## What it makes

A 16:9 movie poster, drawn on canvas by the new **Sundown** renderer:

- **A painted sunset backdrop, in code** — sky gradient, striped retro sun with rays, a city skyline silhouette and palm silhouettes behind the panels. No flat background.
- **Seven slanted portrait strips** — a hero strip rising into the sunset, flanked by the driver, boss, mechanic, captain, rider, lookout and wheelman — each with a soft drop shadow, a gold rim keyline and an inner shadow.
- **Face-aware crops** — every sample photo carries a measured face box, so each face is centred in its strip and never covered by lettering. The studio checks this live and reports it under the export button.
- **A chrome title below every chin** — big retro Anton lettering with a gold-to-pink gradient, sun stripes and a pink glow, on a dark scrim under the hero's chin; the title never covers a mouth.
- **Pink neon script subtitle** in Yellowtail, a press-quote top bar (five gold stars, VOL. 03, ★ WANTED ★), an orange tagline ribbon, a gold **ORIGINAL COVER ART** starburst seal in a clean corner, and a billing block with COMING SOON and a barcode.
- **A whole-poster grade** — warm golden wash, seeded film grain, light leaks, vignette and a halftone whisper, over the whole poster and under the lettering.

## The studio

1. **Words** — edit the title, subtitle, tagline and press quote; the poster repaints live.
2. **Layout** — five strip arrangements: Sundown (hero centre), Coast Left, Strip Right, Skyline Wide and Palms Arc.
3. **Grade** — six Vice City colour grades: Sunset, Neon Nights, Golden Hour, Dusk Blue, Palm Teal and Rose Fade.
4. **Finish** — sliders for grain, vignette, light leak and strip slant.
5. **Strips** — click a strip on the poster (or in the list) to edit it: drop in your own photo, then zoom, pan and flip it into place. One photo can fill all seven strips, or each strip can hold a different one. A seven-portrait sample crew loads on open so the poster is complete immediately, and the wide sunset scene can be loaded into any strip.
6. **Export** — one click saves a PNG at **1920 × 1080**, **1080 × 1080** or **1080 × 1350**. Square and portrait exports keep the whole poster, fitted on a blurred crop of itself, so the title is never cut off.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network request: `app/` is plain static files, the Anton and Yellowtail fonts are vendored under `app/fonts/`, and the eight sample photos were made with an image model for this entry.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the kit's vendored `vendor/makefun-app.ts`. Screenshots live in `screenshots/` (see `shots.json` for how each was taken).

## License

MIT — see [LICENSE](LICENSE). All characters are original; no Rockstar Games logo, artwork or font is used.
