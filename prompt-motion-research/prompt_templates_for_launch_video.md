# Launch-video prompt templates (30 seconds, new AI model release)

Three original templates for a coding agent to build a 30-second motion-graphics launch film. Each is self-contained: fill the inputs, paste the block, and run it. The storyboards are written in beats at 120 BPM (one beat = 0.5 s, 60 beats = 30.00 s). If the music is a different tempo, conform it to 120 BPM or re-time the beats, but keep the total at 30.00 s and keep the drop on beat 16 (8.00 s).

Brand rule for all three: every claim on screen must come from the team's claims sheet, verbatim. No benchmark numbers, rankings, percentages, user counts, prices or customer names unless the team supplies them with a source. If a claim is missing, the template uses the typographic fallback, not an invented line.

---

## Template 1: Mark in Motion (abstract, typographic, no UI)

Use when the team has no approved product screenshots and wants a teaser-style film.

### Inputs
- `{{MODEL_NAME}}`: exact product name and capitalisation.
- `{{POSITIONING}}`: one sentence from the team, eight words or fewer after the team's edit.
- `{{CAP_1}}`, `{{CAP_2}}`, `{{CAP_3}}`: three capability words or short phrases, three words or fewer each, from the claims sheet.
- `{{LOGO_SVG}}`: the approved mark, used as supplied.
- `{{CTA_URL}}`: the launch URL.
- `{{INK}}`, `{{PAPER}}`, `{{ACCENT}}`: up to three hex colours. Fallback: `#111214`, `#F4F2EE`, `#E8553D`.
- `{{WORDMARK_FONT}}`: a licensed face. Fallback: Inter (open licence).
- `{{MUSIC_TRACK}}`: a licensed track at 120 BPM with a clear drop, and its drop time in seconds (fallback: drop at 8.00 s).

### Direction
- **Style.** One shape, one hairline, one accent. Every element arrives by a mask reveal or a shape morph. No objects appear from nothing.
- **Palette.** Paper field, ink type, accent used only on the shape and the final word.
- **Typography.** One family. Headlines are one line, three words or fewer, revealed from a baseline mask.
- **Motion rules.** Enters use `cubic-bezier(0.2, 0.8, 0.2, 1)` over 0.5 s to 0.9 s. Exits use `cubic-bezier(0.7, 0, 0.84, 0)`. Overshoot is at most 2%. One primary move per beat. Anything that moves starts before the previous move settles, so the motion overlaps.

### Storyboard (30.00 s)

| # | Time | Beats | What happens | Copy | Sound |
|---|---|---|---|---|---|
| 1 | 0.00–1.50 | 0–2 | Black field. Accent hairline draws across centre, 0.9 s ease-out. | none | tick at 0.00 |
| 2 | 1.50–4.00 | 3–7 | `{{CAP_1}}` mask-reveals above the hairline. Holds 1.5 s, exits downward at 3.50 s. | `{{CAP_1}}` | click on reveal |
| 3 | 4.00–8.00 | 8–15 | Hairline thickens and grows into a solid accent square at 36% frame width. Corners ease from square to circle between 6.00 s and 7.50 s. | none | low swell from 4.00 s; impact on 8.00 s (drop) |
| 4 | 8.00–10.50 | 16–20 | Accent fills the frame edge to edge in 0.3 s, overscaling past the corners. Then it contracts to a dot at centre. | none | impact at 8.00 s |
| 5 | 10.50–13.50 | 21–26 | Dot slides left and stretches into a pill. `{{CAP_2}}` mask-reveals inside it. | `{{CAP_2}}` | click |
| 6 | 13.50–17.50 | 27–34 | Pill re-forms into three squares in a row, first one accent. `{{CAP_3}}` reveals beneath them. | `{{CAP_3}}` | three clicks, one per square |
| 7 | 17.50–22.00 | 35–43 | Squares converge into a single line, and `{{MODEL_NAME}}` mask-reveals at about 70% frame width. | `{{MODEL_NAME}}` | soft chime at 17.50 s |
| 8 | 22.00–27.00 | 44–53 | Name holds. `{{POSITIONING}}` reveals below it. Hairline returns under both. | `{{POSITIONING}}` | click |
| 9 | 27.00–30.00 | 54–59 | Logo and `{{CTA_URL}}` mask-reveal on paper. Hold 1.5 s. Last frame is the poster. | logo, URL | resolve tone at 27.00 s |

Row durations sum to 30.00 s.

### Banned
- Particles, shockwave rings, lens flares, glows on type, RGB split, glitch.
- Crossfades, whip-pans, spins, 3D flips, zoom-blur.
- Gradients anywhere, including the accent.
- Bouncy easing; overshoot above 2%.
- Full stops in on-screen copy. Max 8 words on any screen.
- Redrawn or recoloured logo. Use `{{LOGO_SVG}}` as supplied.

### Deliverable
- **Master.** 1920×1080, 16:9, 60 fps, H.264 High profile, yuv420p, MP4 with faststart, 12–16 Mbps.
- **Audio.** AAC-LC, 48 kHz, stereo, 256 kbps. Integrated loudness −14 LUFS (±0.5), true peak −1 dBTP or lower. Music conformed to 120 BPM. Sound effects placed by measured peak. Only licensed or generated audio.
- **Extras.** Poster PNG of the final frame. A contact sheet with one frame per beat, labelled with timecodes. A cue sheet listing tempo, drop time and each sound's timestamp.

---

## Template 2: Cursor Walkthrough (the product in use)

Use when the team has real, approved product screenshots and a real example prompt and result.

### Inputs
- `{{MODEL_NAME}}` and `{{PRODUCT_NAME}}` (if different).
- `{{PRODUCT_UI_STILLS}}`: at least three real screenshots, at least twice the master resolution, with rights cleared.
- `{{EXAMPLE_PROMPT}}`: the exact text the team wants typed. It must be real text from the product's own docs or from a user the team has permission to quote.
- `{{RESULT_STILLS}}`: two or three real outputs with rights cleared and a credit line each.
- `{{CAP_1}}`, `{{CAP_2}}`, `{{CAP_3}}`: capability names as they appear in the product UI, if they appear there. If not, skip them.
- `{{CTA_LABEL}}` and `{{CTA_URL}}`.
- `{{INK}}`, `{{PAPER}}`, `{{ACCENT}}`. Fallback: `#111214`, `#FAFAF8`, `#2F6BFF`.
- `{{MUSIC_TRACK}}`, 120 BPM, with its drop time (fallback: drop at 8.00 s).

Fallback: if any screenshot is missing, the template stops and asks for it. It does not draw a fake interface.

### Direction
- **Style.** The product's own UI is the hero. The camera follows the cursor. Nothing else competes for attention.
- **Palette.** The product's neutrals plus `{{ACCENT}}` on the cursor target and the active state only.
- **Typography.** The product's UI font for the UI; `{{MODEL_NAME}}` in one licensed display face for the close.
- **Motion rules.** The cursor is the only thing that acts: every change follows a real click, drag or keypress. The camera uses `cubic-bezier(0.16, 1, 0.3, 1)`, one move at a time, never two at once. UI state changes take 180 ms to 260 ms, using a mask or a shared-element move. No fades, no blur-ins, no shadows above 8% opacity.

### Storyboard (30.00 s)

| # | Time | Beats | What happens | Copy | Sound |
|---|---|---|---|---|---|
| 1 | 0.00–2.00 | 0–3 | Full product UI, empty prompt field. Cursor enters bottom-right and hovers the field. | none | none |
| 2 | 2.00–5.00 | 4–9 | Click in the field. `{{EXAMPLE_PROMPT}}` types in at a steady rate. Send is pressed at 4.50 s. | the typed prompt | click at 2.00 s and 4.50 s |
| 3 | 5.00–8.00 | 10–15 | Camera pushes toward the results area. First result mask-reveals. | none | whoosh, quiet |
| 4 | 8.00–11.00 | 16–21 | Drop at 8.00 s: `{{RESULT_STILLS}}[0]` locks to the frame. `{{CAP_1}}` appears as a chip under the result header. | `{{CAP_1}}` | impact at 8.00 s |
| 5 | 11.00–14.00 | 22–27 | Cursor clicks a second chip. Result swaps by a shared-element move to `{{RESULT_STILLS}}[1]`. | none | click |
| 6 | 14.00–18.00 | 28–35 | Cursor drags a control to a new value, and `{{CAP_2}}` labels the control. Result updates in step with the drag. | `{{CAP_2}}` | tick per notch |
| 7 | 18.00–22.00 | 36–43 | Cursor clicks export. A file tile slides out of the result, and `{{CAP_3}}` labels it. | `{{CAP_3}}` | click, soft slide |
| 8 | 22.00–26.00 | 44–51 | Camera pulls back to the full product frame. `{{MODEL_NAME}}` mask-reveals over the frame. | `{{MODEL_NAME}}` | low tone |
| 9 | 26.00–30.00 | 52–59 | Cursor rests on `{{CTA_LABEL}}` and holds 1.5 s. End card with `{{CTA_URL}}`. | CTA, URL | resolve tone at 26.00 s |

Row durations sum to 30.00 s. Credit lines for `{{RESULT_STILLS}}` appear in small type under each result for at least 2 s.

### Banned
- Fake interface elements, placeholder cards, lorem ipsum, or any feature the product does not have.
- Any control, button or option that is not in the supplied screenshots.
- Cursor moves that do not do anything on screen.
- Crossfades, blur-ins, zoom-blur, camera shake, lens flares.
- Glow on UI text, gradients on UI chrome, shadows above 8% opacity.
- Holds longer than 1.5 s, except the end card (2.5 s maximum).
- Full stops in on-screen copy.

### Deliverable
- **Master.** 1920×1080, 16:9, 60 fps, H.264 High profile, yuv420p, MP4 with faststart, 12–16 Mbps.
- **Audio.** AAC-LC, 48 kHz, stereo, 256 kbps. Integrated loudness −14 LUFS (±0.5), true peak −1 dBTP or lower. Clicks placed by measured peak. Only licensed or generated audio.
- **Extras.** Poster PNG of the final frame. Contact sheet of 8 stills before the full render, then one frame per beat. A list of every on-screen string with its source (prompt, UI, or copy sheet).

---

## Template 3: Index Sheet (editorial grid of real outputs)

Use when the model's strength is in what it makes, and the team has rights to show real outputs.

### Inputs
- `{{MODEL_NAME}}`.
- `{{POSITIONING}}`: one sentence, eight words or fewer.
- `{{EXAMPLE_OUTPUTS}}`: six to twelve real outputs, each with a credit line and rights cleared. Use at least six.
- `{{CAP_1}}`, `{{CAP_2}}`, `{{CAP_3}}`: three capabilities from the claims sheet, three words or fewer each.
- `{{CTA_URL}}`.
- `{{INK}}`, `{{PAPER}}`, `{{ACCENT}}`. Fallback: `#16140F`, `#F3EFE6`, `#D9482B`.
- `{{WORDMARK_FONT}}`: one licensed editorial face. Fallback: a free serif with a matching grotesque for small type.
- `{{MUSIC_TRACK}}`, 120 BPM, with drop time (fallback: drop at 8.00 s).

### Direction
- **Style.** An editorial spread on paper. A 12-column grid. Real outputs are the only images. A numbered index (01 to 03) gives the three capabilities. The numbers are indices, not claims.
- **Palette.** Paper, ink, and the accent used for index numerals and one rule.
- **Typography.** One display face for the model name and capabilities. One small grotesque for credit lines.
- **Motion rules.** Tiles enter on beats, one every two beats, with `cubic-bezier(0.2, 0.8, 0.2, 1)`. Index lines draw in from the left, 0.3 s apart. One camera move per scene: a static frame, or a single 3% push. Cuts are allowed only on beats.

### Storyboard (30.00 s)

| # | Time | Beats | What happens | Copy | Sound |
|---|---|---|---|---|---|
| 1 | 0.00–2.00 | 0–3 | Paper field. `{{MODEL_NAME}}` mask-reveals across the frame. | `{{MODEL_NAME}}` | tick at 0.00 |
| 2 | 2.00–6.00 | 4–11 | Six real outputs enter in a grid, one every two beats. | credit lines, small | click per tile |
| 3 | 6.00–9.00 | 12–17 | Drop at 8.00 s. Grid collapses into a column on the left. Index `01` and `{{CAP_1}}` slide in. | `01 {{CAP_1}}` | impact at 8.00 s |
| 4 | 9.00–12.00 | 18–23 | One real output expands to fill the right 60% of the frame. Credit line sits under it. | credit line | click |
| 5 | 12.00–15.00 | 24–29 | Hard cut on beat 24 to index `02` and `{{CAP_2}}`, with a different real output. | `02 {{CAP_2}}` | cut click |
| 6 | 15.00–18.00 | 30–35 | Index `03` and `{{CAP_3}}` join. The grid reforms as a 2×3 field of outputs. | `03 {{CAP_3}}` | click |
| 7 | 18.00–22.00 | 36–43 | Index card: the three capabilities as lines, each drawing in 0.3 s apart. | three lines | a tick per line |
| 8 | 22.00–26.00 | 44–51 | Index lines collapse. `{{MODEL_NAME}}` returns large. `{{POSITIONING}}` reveals beneath. | name, positioning | low tone |
| 9 | 26.00–30.00 | 52–59 | Final frame: name, logo mark and `{{CTA_URL}}` on paper. Hold 2.0 s. The final frame is the poster. | name, URL | resolve tone at 26.00 s |

Row durations sum to 30.00 s.

### Banned
- Stock imagery, generic "AI" visuals (glowing brains, neural nets, circuit boards, particle nebulae).
- Any output the team has no rights to show. Any output without a credit line.
- Numbers of any kind that are not on the claims sheet.
- Crossfades, glows, gradients, blur-ins, 3D perspective, spins.
- Bouncy easing; overshoot above 2%.
- Full stops in on-screen copy.
- A cut on any beat other than 24 or on the drop, unless it is a deliberate rhythmic cut.

### Deliverable
- **Master.** 1920×1080, 16:9, 60 fps, H.264 High profile, yuv420p, MP4 with faststart, 12–16 Mbps.
- **Audio.** AAC-LC, 48 kHz, stereo, 256 kbps. Integrated loudness −14 LUFS (±0.5), true peak −1 dBTP or lower. Tile clicks placed by measured peak. Only licensed or generated audio.
- **Extras.** Poster PNG of the final frame. A credit sheet listing each output, its creator and its rights basis. A contact sheet with one frame per beat.

---

## Shared checks for all three templates

1. Confirm the total runtime is 30.00 s and the drop lands on beat 16 (8.00 s).
2. Render eight stills at the storyboard's key moments before the full render. Stop and fix anything unreadable, cramped or off-grid.
3. Scan frame differences in the full render. Any single-frame spike at least three times its neighbours is a pop; fix it unless it sits on a beat.
4. Check every string on screen against the claims sheet. Any number that is not on the sheet is an error.
5. Check legibility at 1080p and on a phone-sized preview. Keep copy inside a 90% safe area.
