# Haiku 5.5 launch: five retention-first variations

Five different 30-second motion-graphics films for the Claude Haiku 5.5 release. Each is a separate direction (layout, motion language, palette, score), all built on the shared engine in `engine/core.js`, with the same brand guardrails. Read this whole file before writing code.

## Shared format
- 1920 x 1080, 60 fps, exactly 30.000 s (1800 frames). Safe area: keep text `H.SAFE` (150 px) from every edge.
- Everything is drawn in code from `t`. No images, photos or external assets. Deterministic: no `Math.random`, no wall clock.
- Fonts: `H.FONT.sans` (Geist) and `H.FONT.mono` (Geist Mono) only.
- Scene API as in `DESIGN.md`: `H.scene({ id, start, end, draw(ctx, t, local, dur) })`. Scenes are called from `start - 0.5` to `end + 0.5`, so they cross-fade. Each scene fades itself in and out. Read `engine/core.js` for the helper list. Do not edit it.
- The variation palette is NOT `H.COLOR`. Use the global `V` set by the variation's `palette.js`: `V.dark.{bg,surface,text,mute}`, `V.light.{bg,surface,text,mute}`, `V.accent`.

## Retention rules (apply to every variation)
1. **Hook:** by 0.4 s something is moving at full intensity; by 1.0 s "Haiku 5.5" or "5.5" is on screen.
2. **Change clock:** a new visual event (cut, reveal, camera move, text swap, pattern change) at least every 1.2 s on average. No held frame longer than 1.5 s, except the end card.
3. **Three acts:** 0 to 10 s setup, 10 to 20 s build (denser, faster), 20 to 27 s payoff (peak density), 27 to 30 s end card (clean and readable, held at least 1.5 s).
4. **Pattern interrupts** at 10.0 s and 20.0 s: a full-frame change of state (invert, flash, whip, splash or zoom). These are the cues the audio hits.
5. **Cut grid:** every cut and cue time is on a 0.5 s grid. Scene boundaries are 5.0, 10.0, 15.0, 20.0, 25.0 s.
6. **Readability:** any text stays on screen at least 1.0 s. Flash words may be 0.5 s, but at most three in a row.
7. **Final frame:** readable and held at least 1.5 s, on the brand colour of that variation.

## Copy bank (only these strings may appear as text)
`5.5` / `Haiku` / `Haiku 5.5` / `Claude` / `Fast.` / `Sharp.` / `Everyday.` / `Small model, big aim.` / `Fast replies, sharp reasoning.` / `Ready when you are.` / `Quick to answer.` / `Sharp in the details.` / `Built for everyday work.` / `Three things, done well.` / `Summary ready in one pass.` / `Meet Haiku 5.5.` / `claude-haiku-5-5` / `$ claude --model claude-haiku-5-5`
Code snippets must match the source already in s05 of the main film, or be a shorter piece of it. Make NO benchmark, speed, price, availability or comparison claims.

## Layout of each variation
```
variations/<id>/
  index.html        loads ../../engine/core.js, ../../fonts, palette.js and the scenes in order (generated)
  palette.js        window.V = { dark, light, accent }   (given, do not edit)
  scenes/*.js       one file per scene (you write these)
  audio/make_score.py   (audio builder writes this)
```
Render one variation: `node render.mjs --page variations/<id>/index.html --name <id> --audio out/variations/<id>/score.wav --outdir out/variations/<id>`.
Stills: `node render.mjs --page variations/<id>/index.html --times 3.2,4.1 --dir out/stills/<scene id>`.

## Variation 1: `v1-beat-cut`. "Beat Cut", hard cuts and kinetic type
Energy: the fastest film. Words hit on the grid. Palette: dark/light alternation with the vermilion seal.

| Scene file | Window | Beats |
|---|---|---|
| `s1_hook.js` | 0-5 s | 0.0 "5.5" slams full-frame (scale 2.6 to 1, blur 18 to 0 over 0.25 s). Hard flash to dark at 0.5. "HAIKU" letter-hits at 0.5 to 1.0 (0.04 s stagger). 1.0 cut: "5.5" right. 1.5 "Fast." 2.0 "Sharp." 2.5 "Everyday." (hard cuts, 0.5 s each). 3.0 cut to light: "Small model, big aim." 4.0 cut. |
| `s2_stack.js` | 5-10 s | Word stack: "Quick" / "to" / "answer." then "Sharp" / "in" / "the" / "details." Each word hard-cuts on a 0.5 s grid. 9.5 flash to vermilion. |
| `s3_flash.js` | 10-15 s | 10.0 pattern interrupt: full-frame invert (light to dark), with a 0.1 s white strobe. 10.5 to 13.0 kinetic square grid (3 x 5 squares scale in and out on the grid). 13.0 to 14.5 mono code line: `$ claude --model claude-haiku-5-5` typed fast, cursor on. |
| `s4_tiles.js` | 15-20 s | The 17 syllable tiles (5-7-5) reflow in five hard cuts: each row cut to a new arrangement every 0.5 s, then settle into the haiku. |
| `s5_build.js` | 20-25 s | 20.0 pattern interrupt: flash to vermilion, then invert. The mark (three bars 5:7:5 plus the seal) assembles in four hard cuts at 0.5 s. "Built for everyday work." flashes at 23.5. |
| `s6_end.js` | 25-30 s | 25.0 "Haiku 5.5" giant, mask rise at 25.2 (0.04 s stagger). 26.5 "Meet Haiku 5.5." 27.5 `claude-haiku-5-5` caption. Hold 28.5 to 30.0 readable. Fade to dark only in the final 0.4 s. |

Audio: 120 BPM. Hard cuts on the beat grid. Flash hits at 0.0, 0.5, 10.0, 20.0, 25.0.

## Variation 2: `v2-syllable-grid`. "Syllable Grid", rhythmic cell field
Energy: hypnotic. A living grid of cells sweeps and pulses on a metronome, and the camera pushes through it.

| Scene file | Window | Beats |
|---|---|---|
| `s1_wave.js` | 0-5 s | 0.0 a 12 x 7 cell field fills the frame. Cells flip in a diagonal wave every 0.5 s (scaleY 1 to 0 to 1, colour dark to accent). By 1.0 the centre cells part to show "Haiku 5.5". |
| `s2_count.js` | 5-10 s | Cells collapse into three rows of 5, 7 and 5 tiles. Each tile holds its syllable (copy: small mod el big aim / fast re plies sharp rea son ing / read y when you are) and pops on the 0.25 s grid. |
| `s3_zoom.js` | 10-15 s | 10.0 pattern interrupt: a whip-zoom (scale 1 to 0.18, motion blur) so the tile rows become one tiny cell in a much larger grid. Then the camera pushes through layered grids with parallax (two depths). |
| `s4_promises.js` | 15-20 s | Three columns of cells become three cards, 1.5 s each: "Quick to answer." (a stopwatch made of cells), "Sharp in the details." (a target made of cells), "Built for everyday work." (a loop made of cells). Hard cut between cards. |
| `s5_peak.js` | 20-25 s | 20.0 pattern interrupt: full invert, then the grid strobes on 0.25 s steps. The "5.5" is revealed by cells lighting in sequence. |
| `s6_end.js` | 25-30 s | 25.0 cells converge into the seal stamp. 26.5 "Meet Haiku 5.5." 27.5 `claude-haiku-5-5`. Hold 28.5 to 30.0 readable. |

Palette: cobalt night (see `palette.js`). Audio: 120 BPM, a sine-bass pulse and a click on every wave step.

## Variation 3: `v3-terminal`. "Terminal", developer-first
Energy: real-feeling tooling. Typed input, streamed output, results that land every 1.2 s.

| Scene file | Window | Beats |
|---|---|---|
| `s1_boot.js` | 0-5 s | 0.0 accent flash. The terminal window appears at 0.3. `$ claude --model claude-haiku-5-5` types from 0.5 to 2.0. Enter at 2.0. "Haiku 5.5" ready line streams at 2.5. Cursor blinks on the 0.5 s grid. |
| `s2_task.js` | 5-10 s | A prompt types: `summarize this release note`. Output streams letter by letter: "Summary ready in one pass." Then three short lines appear in turn on the 0.5 s grid: "Faster drafts." "Sharper edits." "Same care." (copy bank only: use "Quick to answer." instead of "Faster drafts." if you prefer). |
| `s3_split.js` | 10-15 s | 10.0 pattern interrupt: the terminal splits into a 3 x 4 grid of small windows, each typing a different short command in turn (copy: `$ claude --model claude-haiku-5-5` repeated with different flags only). Cuts every 0.5 s. |
| `s4_diff.js` | 15-20 s | A short code diff animates line by line (4 lines of added, 2 removed), with the added lines in the accent colour and the removed lines struck through in mute. Use the source snippet from the main film. |
| `s5_seal.js` | 20-25 s | 20.0 pattern interrupt: the terminal collapses to a point. The vermilion seal (`5.5`) stamps at 20.5 with the same sprite recipe as the main film. "Built for everyday work." types at 22.0. |
| `s6_end.js` | 25-30 s | 25.0 terminal clears. "Meet Haiku 5.5." types from 25.5. `claude-haiku-5-5` caption at 27.0. Cursor holds, readable, to 30.0. |

Palette: terminal green on near-black. Audio: 120 BPM, typing ticks on the 0.125 s grid, tone on each output line.

## Variation 4: `v4-brush`. "Ink Brush", calligraphic and organic
Energy: the most organic. Procedural brush strokes sweep in on a rhythm and texture changes every cut.

| Scene file | Window | Beats |
|---|---|---|
| `s1_stroke.js` | 0-5 s | 0.0 a fast full-width brush stroke (noise-displaced, tapered, motion trail). 0.5 a second stroke. By 1.0 the three poem lines are painted as horizontal strokes (5, 7, 5 widths) on the 0.5 s grid. |
| `s2_words.js` | 5-10 s | Poem words are wiped in by brush strokes every 1.0 s (small model, big aim / fast replies, sharp reasoning / ready when you are). |
| `s3_splash.js` | 10-15 s | 10.0 pattern interrupt: a cinnabar splash spreads from the centre, then the frame fills with ink. Bloom rings expand on the grid. |
| `s4_sweep.js` | 15-20 s | Eight rapid parallel brush sweeps cross the frame, one every 0.5 s, carrying "Quick to answer.", "Sharp in the details." and "Built for everyday work." in turn. |
| `s5_seal.js` | 20-25 s | 20.0 pattern interrupt: light to dark. The seal stamps at 20.5 with an ink bleed (use the seal sprite recipe from the main film). "Three things, done well." wipes in at 22.0. |
| `s6_end.js` | 25-30 s | 25.0 "Meet Haiku 5.5." painted in with a wipe. 27.0 `claude-haiku-5-5` caption. Seal stamp at 27.0 bottom-right. Hold 28.5 to 30.0 readable. |

Palette: rice paper with ink and a cinnabar accent. Audio: 60 BPM feel (every 1.0 s beat) with brush-swish transients on the 0.5 s grid.

## Variation 5: `v5-planes`. "Parallax Planes", pseudo-3D
Energy: constant camera motion. Cards fly past in perspective, then the camera settles on the message.

Projection: for a point (x, y) at depth z with the camera at (camX, camY, 0) and focal length F, the screen point is `sx = W/2 + (x - camX) * F / z` and `sy = H/2 + (y - camY) * F / z`. Draw cards far to near (largest z first). Animate z and camX over time. Keep it 2D canvas math, no libraries.

| Scene file | Window | Beats |
|---|---|---|
| `s1_tunnel.js` | 0-5 s | 0.0 the camera is inside a tunnel of cards and they whip past (fast z decrease). "5.5" card lands in front at 1.0. The camera slows and steadies by 2.0. |
| `s2_tiles.js` | 5-10 s | The 17 syllable tiles float on planes in 3D. The camera orbits the poem (camX sweeps, z stays in range). Tiles lock to the 5-7-5 layout at 9.0. |
| `s3_break.js` | 10-15 s | 10.0 pattern interrupt: the camera passes through a card (amber wipe). Then a wide view of nine cards with "Fast.", "Sharp.", "Everyday." and the 5.5 seal. |
| `s4_code.js` | 15-20 s | A large code card rises from below. The source snippet types in (4 to 6 lines, the model string in the accent). The output chip "Summary ready in one pass." slides in at 17.8. |
| `s5_mark.js` | 20-25 s | 20.0 pattern interrupt: the cards collapse to a point and re-expand. The three mark bars (5:7:5) fly in as planes and align to the mark at 23.0 (bars arrive on the 0.25 s grid). The seal card stamps at 24.0. |
| `s6_end.js` | 25-30 s | The camera settles to the front plane. "Meet Haiku 5.5." on the front card at 25.5. `claude-haiku-5-5` caption at 27.0. Hold readable 28.5 to 30.0. |

Palette: graphite with an amber accent. Audio: 120 BPM with a rising filtered sweep on each camera move.

## Audio (per variation)
- Own score: `variations/<id>/audio/make_score.py`, numpy only, writes `out/variations/<id>/score.wav`.
- 30.000 s, 48 kHz, 24-bit PCM stereo. Peak at or below -1.0 dBFS, no NaNs, silent or faded at both ends.
- Hits on the cut grid and on the pattern interrupts listed above. Original synthesis only: no samples, no copyrighted material.
- Each audio builder works from its own tempo and cue list above.

## Deliverable
Each variation renders to `out/variations/<id>/<id>.mp4`. Final message from each builder: under 120 words, with the files written, what was built, and any gap.
