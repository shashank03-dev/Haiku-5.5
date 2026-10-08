# Prompt playbook: prompt-motion.com corpus

Source: 232 gallery entries, 229 with prompt text. Counts come from `prompt_corpus_stats.json` in this folder.

Scope limits: the data has no quality score, so "best" below means most specified, which is a proxy. Archetype counts come from a keyword-and-structure classifier, spot-checked, so expect roughly ±10% at the boundaries.

## Corpus shape

- The median prompt is 151 characters (about 26 words). 198 of 229 are single lines; 20 are multi-paragraph.
- Ten long spec-style prompts carry 48% of all prompt characters. The other 219 have a median of 151 characters.
- 203 of 229 prompts use two or fewer of 13 constraint families (duration, aspect, fps, palette, font, music, SFX, timing, easing, banned list, deliverable, QA gate, loop). The median is one.
- Effort labels do not show in the text. Max, High and Medium prompts have the same median length as undeclared ones (150 to 166 characters).

## (a) Archetypes

1. **Showreel one-liner (66).** "Show what a great motion designer you are," as a résumé reel, with nothing else. Median 151 characters. Examples: `stephanlivera-df17a2`, `shneural-2abdfa`, `jasonzhou1993-8595e0`. Thirty posts share identical text once case and punctuation are normalised.
2. **Product promo one-liner (36).** A product name or pasted link plus a push to go hard. Median 155 characters; 39% include a URL or handle. Examples: `sudeepsd-1a3485`, `robvjourney-ce3e1a`, `prasad-pilla-2c0cba`.
3. **Brief-driven explainer (16).** "Explain X," often a recipe, history or concept. Median 100 characters. Examples: `tak3sh8-be5012`, `emollick-8661a8`, `ror-fly-9950f1`, `kloss-xyz-fe0c31`.
4. **Grounded brand film (28).** Names the repo, site, Figma file or screenshots as the source of truth. Median 147 characters, plus one 15,306-character outlier. Examples: `aschapmann-131210`, `bthreeagency-b9b8d9`, `fractadev-149adc`, `daniel-haida-8691d4`.
5. **Open creative brief (50).** Full creative freedom: a self-portrait, a story, "make anything." Median 80 characters. Examples: `1littlecoder-9fef89`, `apoorvjain25-d24184`, `kamstudiolabs-c9bb28`, `faroukzy-9ff23e`.
6. **Code-as-medium piece (13).** Asks for the film to be built in HTML, Canvas, Three.js or JavaScript, often as a deterministic render. Median 134 characters. Examples: `parkerrex-1a54fe`, `dale-vaz-cc612a`, `x4b47x-9cc84f`, `buildfastwithai-ed9447`.
7. **Spec-sheet film (10).** Structured brief with XML-style tags or headers, shot-by-shot timing, build rules, gotchas and a QA gate. Median 4,199 characters. Examples: `twoclipping-221cab`, `notdwd-c2037d`, `brainextends-e19ac3`, `gdgtify-287ddf`.
8. **Fill-in scaffold (10).** A reusable template that ships with unfilled `[PLACEHOLDER]` or `{{TOKEN}}` text. Examples: `ik-builds-b8bdcf`, `alex-prompter-1ea044`, `polydao-7a572b`, `sudo-kiran-4f8b59`.

## (b) Constraint vocabulary that yields controlled output

Counts are how many of the 229 prompts use each device.

- **Duration and grid.** 146 state a duration; 87 of those are 11 to 15 seconds. Thirteen state fps (60 most often). Nineteen state an aspect ratio. Frame pins such as "f0–f359" or "hard cuts on f72" appear in the spec-sheet group.
- **Timed storyboard.** 20 give time ranges or beat indexes. Good ones use ranges that sum to the runtime ("0.00–3.00") and say what each beat must do.
- **Beat grid.** 31 mention music or beats; 12 state a BPM (120 in 8). Strong prompts convert the BPM into beat times ("beat k = 0.048 + 0.4838·k s") and pin cuts to beats.
- **Named motion law.** 15 name an easing or spring: "cubic-bezier(0.16, 1, 0.3, 1)", "exponential ease-out, 12–19% of the remaining distance per frame", "overshoot below ~2%", "springs everywhere, a tiny overshoot at most." Also: elements should not all start and stop on the same frame.
- **Palette and type limits.** 21 give a palette or hex code; 8 cap it ("one accent"). 15 name a font, sometimes with weights. One bans hues outright: "no purple, violet, magenta or orange."
- **Banned list.** Nine prompts include a labelled `Banned:` line: crossfades, particles, glows, bouncy easing, stock footage, 3D flips, the "template look." No prompt uses a `<banned>` tag; the label is plain text.
- **Determinism.** 13 prompts require frames to be a pure function of time (`seek(t)`, no CSS transitions, no timers). This is the most reliable route to repeatable renders.
- **Loop rule.** Six prompts use "loop"; nine have a loop cue. The usual wording: "the last frame is the first frame."
- **Checkpoints.** Nine prompts ask for stills or a beat map before the full render. Fifteen use QA language: "contact sheet," "render one frame per beat," "scan for single-frame pops."
- **Audio spec.** 28 mention sound or SFX. Strong ones give a loudness target ("−14 LUFS, true peak −1 dBTP"), place SFX "by measured peak," and set sourcing rules ("CC0 or generated only; log sources").
- **Deliverable.** 18 name a container or codec: MP4, H.264 yuv420p, a self-contained HTML file, a Remotion composition.
- **Truth rules.** Three forbid invented numbers; two demand verbatim copy; one limits claims to facts on the site. Example: "no invented results: no %, multipliers, customer names."
- **Input gate.** Nine prompts contain an "Ask me for…" list (usually in an inputs block); four of those also give fallback defaults. This is the clearest way to get a usable brief.

## (c) Anti-patterns, and what the strongest prompts did instead

- **Hype in place of spec.** 111 prompts use hype words, mostly the showreel template; 90 say "go all out." The model has nothing to check against. Strong prompts swap the adjective for a runtime, a beat map and a palette.
- **No duration.** 83 of 229 (36%) state none. Strong prompts put duration, resolution and fps on the first line.
- **No timing.** Only 20 give time ranges or beats. Strong prompts give a storyboard whose timestamps sum to the runtime.
- **No motion law.** 214 name no easing. Strong prompts name an ease and cap the overshoot.
- **No ban list.** Only 9 have one. Without it the default failure modes show up: crossfades, bouncing, particles, glows. Strong prompts ban the specific techniques they expect to see.
- **Invisible context.** The 30 identical showreel prompts came back with 24 distinct titles, across 1920×1080 and 1280×720. Several titles name a product the prompt never mentions. The lesson: if a source matters, name it (repo path, screenshots); if it does not, say so. Two prompts tell the model to ignore prior memory or existing tools (`reflex-cloud-72ffe5`, `nolkeeg-bf062e`).
- **Unbounded scope.** Examples: "make a 4-minute animated short that blows my mind" and "feel free to work 10+ hours." Strong prompts set a deliverable and checkpoints instead.
- **Leaked placeholders.** Ten prompts ship with unfilled tokens. Fill them, or define defaults.
- **Generic AI tells.** Three prompts ask to avoid AI-made tells or "slop," such as corner captions. Name the tells you want banned.

The ten spec-style prompts do most of these things together: named inputs with defaults, a sourced brand, a timed storyboard, a banned list, a determinism rule, gotchas, a QA loop and a deliverable spec. Copy that structure, not the length.

## (d) Many rounds versus one-shot

- 96 entries declare a round count: 89 one-shot (median 150 characters), 6 "a few rounds" (median 146), and 1 "many rounds," which is a skill with no prompt text.
- Round count does not show in the prompt. The one long "few rounds" prompt is `daniel-haida-8691d4`. `brainextends-e19ac3`, tagged one-shot, is also long-spec and asks the model to build, render, inspect and refine.
- Reading: the iteration probably happened in conversation after the first output. A prompt that writes the QA loop into the brief (render, check stills, fix) gets that loop even when the run is tagged one-shot.

## (e) Skill-tagged entries

- Four entries carry the `skill` tag. Three have no prompt text (`lexnlin-6161a6`, `anthonyriera-9b1b2a`, `jake11moran-a269c4`). One has a one-line prompt plus a skill (`buildfastwithai-53234e`).
- The gallery page shows a skill description and an install command in place of the prompt. The brief lives inside the skill: one interviews you about the film, one reads your local Claude Code history, one takes concept, brand and score as inputs.
- Treat skill entries as a separate category. Analyse the skill's instructions, not the prompt, and do not count them as prompt evidence.
