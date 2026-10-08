# Claude Haiku 5.5: 30-second launch film. Production brief

Shared contract for every scene builder and the audio builder. Read it fully before writing code.

## Format
- 1920 x 1080, 60 fps, exactly 30.000 s (1800 frames). Output: H.264 + AAC, `out/haiku-5-5-launch.mp4`.
- Tempo 120 BPM. One bar = 2.0 s. A beat = 0.5 s. Scene cuts land on beats.
- Safe area: keep all text at least `H.SAFE` (150 px) from every edge.
- Everything is drawn in code, on one canvas, from `t`. No photos, no stock footage, no external images, no emoji, no logos from other brands.

## Concept
"Form, compressed." A haiku carries a whole thought in 5-7-5 syllables. The film uses that form as its visual grammar:
17 syllable tiles in three lines, a vermilion artist's seal (a hanko) as the only accent, and a "5.5" that forms out of particles.
Copy is plain. Make NO benchmark, speed, price or availability claims. Only the copy listed below may appear as text.

## Copy (exact strings)
- Poem, as tiles: row 1 `small mod el big aim`; row 2 `fast re plies sharp rea son ing`; row 3 `read y when you are`.
- Title: `Claude` (small label) and `Haiku 5.5` (display).
- Promises: `Quick to answer.` / `Sharp in the details.` / `Built for everyday work.` Headline above them: `Three things, done well.`
- Code (see s05). Output bubble: `Summary ready in one pass.`
- Lockup caption: `claude-haiku-5-5` (mono).
- Outro: `Meet Haiku 5.5.` and `claude-haiku-5-5` (mono).

## Colour (use H.COLOR only; never hard-code other colours)
- `ink` #0E0E10 (dark background), `ink2` #1C1C21 (surface on ink), `paper` #F2EFE7 (light background),
  `paper2` #E4DED0 (hairlines on paper), `mute` #8C8980 (secondary text), `seal` #E4572E (the one accent).
- Use `seal` sparingly: the hanko, the "5.5" numerals, one highlight per scene at most. No gradients on UI, no glow, no neon.

## Type (H.FONT.sans = Geist, H.FONT.mono = Geist Mono)
- Display: Geist 600, 180 to 260 px, tracking about -0.03em (pass tracking in px, e.g. -0.03 * size).
- Headline: Geist 600, 96 to 120 px. Labels: Geist 500, 40 to 56 px. Captions: Geist Mono 500, 28 to 36 px, tracking +0.08em, may be uppercase.
- Always measure text with H.measure before placing it. Never let text clip the frame or collide with another element.

## Motion rules
- Entrances: `H.easeOutExpo`, 0.6 to 0.9 s. Moves: `H.easeInOutCubic`. Stamps and pops: `H.easeOutSoft` (about 1.3% overshoot, the maximum).
- Stagger text by 0.04 to 0.08 s per glyph or word. Mask-rise (clip to a box, slide the text up) is the default text entrance.
- Exits: fade or reverse over at least 0.25 s. Never hard-pop an element unless it is a deliberate cut.
- Everything depends only on `t` / `local`. Never read the wall clock, never use Math.random (use `H.prng(seed)` at file load), never use frame counters.
- Per-frame cost under about 10 ms. Rasterise any offscreen work once, at file load, into an offscreen canvas.
- Blur is allowed sparingly (`ctx.filter = 'blur(6px)'`, at most about 12 px). No particles except in s04. No drop shadows except the code window in s05.

## Timeline (absolute seconds). Audio and scenes must agree on these cue times
| Scene | id (file) | Start | End | Background |
|---|---|---|---|---|
| 1 | s01_seal | 0.0 | 3.0 | paper |
| 2 | s02_syllables | 3.0 | 7.0 | paper |
| 3 | s03_title | 7.0 | 11.0 | ink |
| 4 | s04_particles | 11.0 | 15.0 | ink |
| 5 | s05_code | 15.0 | 19.0 | paper |
| 6 | s06_promises | 19.0 | 23.0 | ink |
| 7 | s07_mark | 23.0 | 26.5 | paper |
| 8 | s08_outro | 26.5 | 30.0 | ink |

Cue times (CUE name = time in seconds):
- STAMP 0.50 (seal impact, s01). STAMP2 27.00 (seal impact, s08).
- TILE row 1: 3.25, 3.375, 3.50, 3.625, 3.75. Row 2: 4.00, 4.125, 4.25, 4.375, 4.50, 4.625, 4.75. Row 3: 5.25, 5.375, 5.50, 5.625, 5.75.
- TITLE_KICK 7.00 (title drop). Title letters start 7.20.
- PARTICLE_GATHER 11.00 to 12.00. PARTICLE_FLOW 13.00. RISER 13.00 to 15.00.
- CODE_TYPE 15.40 to 17.60 (typing). OUTPUT_IN 17.80.
- ICON 19.20 / 19.70 / 20.20 (icons 1, 2, 3 draw in).
- BAR 23.00 / 23.25 / 23.50 (mark bars). WORDMARK 24.50.
- OUTRO_TEXT 26.60.

## Scene specs
### s01_seal (0.0 to 3.0), paper
- Hairline grid in paper2 (1 px lines, 120 px spacing) draws in from the top-left between 0.0 and 1.0 s; fade it out by 3.0 s.
- A vermilion hanko: rounded square, 220 px, with the glyph "5.5" carved out of it (knocked out with a destination-out fill, or drawn as paper-coloured shapes on the seal). Add a subtle procedural ink texture: speckles from H.prng, inside the seal only, under 12% opacity.
- The seal stamps in at STAMP (0.50): scale 1.35 to 1.0 with H.easeOutSoft over 0.35 s, rotation -4 deg to 0, opacity 0 to 1 over 0.15 s.
- At 2.0 to 2.8 s it moves to the centre (ease in-out). It is the only element on screen. Fade everything out between 2.7 and 3.0 s.

### s02_syllables (3.0 to 7.0), paper
- Three rows of ink tiles, centred horizontally, row centres at y = 380, 540, 700. Tile = rounded rect (radius 20 px), ink fill, height 128 px, width = text width + 56 px, gap 24 px between tiles.
- Tile text: Geist 500, 64 px, paper colour, lower-case, centred.
- Row 1 has 5 tiles, row 2 has 7, row 3 has 5 (17 total), in the order listed in the copy.
- Each tile enters at its TILE cue: slides up 24 px and fades in over 0.35 s with H.easeOutExpo.
- At 6.0 small mute mono labels "5", "7", "5" appear at the left of each row (Geist Mono, 28 px). At 6.2 the rows slide up together 40 px, and the seal from s01 returns small (96 px) at the top-right safe area.
- Fade everything out between 6.6 and 7.0. The s03 title is already coming in on ink.

### s03_title (7.0 to 11.0), ink
- Background fills ink from 6.6 (ink cross-fades in over paper from the previous scene).
- Small seal (72 px) moves to the top-left safe area at TITLE_KICK.
- "Claude" as a mono label, mute colour, 36 px, uppercase, tracking +0.2em, at y 470. The label fades in at 7.1.
- "Haiku 5.5" in Geist 600, about 240 px, paper colour. The "5.5" is in seal colour. Letters mask-rise from a baseline mask, stagger 0.05 s, starting at 7.2 with H.easeOutExpo over 0.9 s. Centre it on the canvas.
- Hold 9.0 to 10.4. Then mask-fall (the reverse) between 10.4 and 11.0. Ink fades out between 10.8 and 11.0.

### s04_particles (11.0 to 15.0), ink
- Coded image: rasterise the glyphs "5.5" once at load (Geist 600, about 640 px, centred) onto an offscreen canvas. Sample points on a grid of about 12 px and keep those inside the glyph. Use about 2000 to 3000 points.
- Particles start at prng positions around the canvas. PARTICLE_GATHER (11.0 to 12.0): they travel to the sampled targets with H.easeInOutCubic. Radius 2.5 to 4 px. About one in ten are seal colour, the rest paper.
- Hold the number from 12.0 to 13.0. PARTICLE_FLOW (13.0): the particles drift along a smooth flow field (sin/cos of position and time, deterministic) and re-gather into three rows of dots: 5, 7, 5 dots per row, mirroring the haiku. Seal-coloured dots stay as the accents.
- RISER 13.0 to 15.0: a rising line of dots accelerates to the right edge (purely visual). Fade out between 14.7 and 15.0.

### s05_code (15.0 to 19.0), paper
- Code window: rounded 24 px, ink fill, 1200 x 620 px, centred slightly high (y offset -40). Soft shadow allowed here only (blur 40 px, 18% ink). Title bar: three 14 px dots (mute), and the file name "haiku.ts" in mono mute at the centre.
- Code is typed character by character between CODE_TYPE (15.4 to 17.6) with a blinking caret (on for 0.5 s, off 0.5 s, from local time). Geist Mono 500, 30 px, line height 46 px, left padding 56 px. Text colour ink; comments mute; the string "claude-haiku-5-5" in seal.
- Code (type exactly, including the blank lines):
```
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const reply = await client.messages.create({
  model: "claude-haiku-5-5",
  max_tokens: 512,
  messages: [{ role: "user", content: "Summarize this release note." }],
});
```
- OUTPUT_IN 17.8: a rounded bubble below the window (paper2 fill, 0.35 s easeOutExpo) with `Summary ready in one pass.` in Geist 500 40 px, ink. Hold to 18.8, fade out by 19.0.

### s06_promises (19.0 to 23.0), ink
- Headline "Three things, done well." Geist 600, 104 px, paper, at the top third, mask-rise at 19.0.
- Three columns, centred, each 460 px wide with 120 px gutters. Each has a coded icon, 160 px square, drawn with 8 px paper strokes and round caps, drawn on with stroke-dash over 0.9 s at ICON cues. Then a label below in Geist 500 48 px, paper.
  1. Icon: a stopwatch (circle, a tick at the top, a needle that sweeps 0 to 280 deg). Label: `Quick to answer.`
  2. Icon: a target (three concentric rings, one ring replaced by a seal-colour fill at the centre). Label: `Sharp in the details.`
  3. Icon: an endless loop (lemniscate path). Label: `Built for everyday work.`
- Fade everything out between 22.5 and 23.0.

### s07_mark (23.0 to 26.5), paper
- Mark: three bars, each 56 px tall, 28 px apart, rounded radius 14, ink. Widths are 5u, 7u, 5u with u = 52 px (260, 364, 260). Bars slide in from the left at BAR cues (23.00, 23.25, 23.50) with H.easeOutExpo over 0.6 s.
- The vermilion seal sits at the bottom-right of the mark, 120 px, and stamps in at 24.0 (no sound cue, just the motion).
- At WORDMARK (24.5) the mark moves to the left (ease in-out over 0.8 s, centre x from 960 to 700). "Haiku 5.5" in Geist 600, 200 px, ink, slides in from the right and sits to the right of the mark. The "5.5" in seal colour.
- Caption `claude-haiku-5-5` in Geist Mono 500, 32 px, mute, below the wordmark at 25.2.
- Hold until 26.2. Fade out between 26.2 and 26.5.

### s08_outro (26.5 to 30.0), ink
- "Meet Haiku 5.5." Geist 600, about 200 px, paper; "5.5" in seal colour; centred at about y 470. Mask-rise from OUTRO_TEXT (26.6), stagger 0.06 s per word.
- Mono caption `claude-haiku-5-5` in mute, 34 px, below, fades in at 27.6.
- The seal stamps in bottom-right at STAMP2 (27.00): scale 1.35 to 1.0 over 0.35 s, rotation -3 deg, same look as s01.
- Hold a clean readable frame from 28.6 to 29.4. Fade everything to ink from 29.4 to 30.0 (the last frame is a plain ink frame).

## Engine API (engine/core.js, read it, do not edit it)
- `H.scene({ id, start, end, draw(ctx, t, local, dur) })` registers a scene. `local = t - start`, `dur = end - start`. Scenes are drawn in registration order (later on top) and are called from `start - 0.5` to `end + 0.5`, so they can cross-fade. Scenes must fade themselves in and out.
- `H.text(ctx, str, x, y, { size, weight, family, color, align, baseline, alpha, tracking })`. `tracking` is in px.
- `H.measure(ctx, str, size, weight, family, tracking)` returns width in px.
- `H.rrect(ctx, x, y, w, h, r)` builds a rounded-rect path (call `ctx.fill()` / `ctx.stroke()` after).
- `H.ramp(t, a, b)` returns 0 to 1 between times a and b, clamped. `H.clamp(x, a, b)`, `H.lerp(a, b, t)`.
- `H.easeOutExpo`, `H.easeOutSoft`, `H.easeOutCubic`, `H.easeOutQuart`, `H.easeInOutCubic`, `H.easeInCubic`.
- `H.prng(seed)` returns a function giving numbers in [0, 1). `H.hash(n)` returns a deterministic value in [0, 1).
- `H.COLOR`, `H.FONT`, `H.W`, `H.H`, `H.FPS`, `H.SAFE`.
- Offscreen canvas: `const c = document.createElement('canvas'); c.width = ...; const g = c.getContext('2d');`.
- Always wrap your own draws in `ctx.save()` / `ctx.restore()` where you change state (the engine also saves around each scene).

## Rules for scene builders
1. Write only your own file under `scenes/`. Do not edit `engine/core.js`, `index.html`, `render.mjs`, `DESIGN.md` or other scenes. If you need something the engine lacks, write a local helper with a prefix for your scene id.
2. Keep the registration line exactly `H.scene({ id: "<file id>", start: <start>, end: <end>, draw(ctx, t, local, dur) { ... } });` with the times from the table.
3. Check your work visually. From the repo root: `node render.mjs --times 3.2,3.8,5,6.5 --dir out/stills/<your id>` (times in seconds). View the PNGs with the Read tool. Check the entrance, the peak, and the exit, and check for text collisions and clipping. Do a few of them at least.
4. Do not render the full film. Do not run `npm install`. Do not commit to git. Do not write outside `scenes/` and `out/stills/<your id>/`.
5. Any text on screen must come from the copy list above.
6. Final message to the lead, under 120 words: the file path, what you implemented, the cue times you used, and anything you could not verify.
