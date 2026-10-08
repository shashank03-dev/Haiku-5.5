# prompt-motion.com: research notes

A reference study of the 232 motion-graphics videos on prompt-motion.com. Each one was made with Claude Opus 5.5 from a prompt, and the site publishes the prompt, model and metadata for each.

Start with `prompt_playbook.md` for what the strongest prompts have in common, `prompt_templates_for_launch_video.md` for the three templates written for a launch film, and `catalog.md` for one row per entry.

## Contents

| File | What it is |
|---|---|
| `catalog.md` | All 232 entries: title (linked to the site), handle, declared or inferred stack, model/effort/iterations, quality rating, prompt length, paraphrased prompt summary, and data flags |
| `prompt_playbook.md` | Recurring prompt archetypes, the constraint vocabulary that produced the most controlled output, anti-patterns, and the skill-tagged entries |
| `prompt_templates_for_launch_video.md` | Three original prompt templates for a 30-second model-launch film, each with a timed storyboard that sums to 30 s |
| `prompt_corpus_stats.json` | Counts behind the playbook: effort, iterations, declared stack, tags, prompt length, XML-style tags, constraint families, duplicates |
| `analysis/batch_01.json` to `batch_08.json` | Per-entry analysis (29 entries per file): paraphrased prompt summary, inferred pipeline, visual style, motion techniques, fidelity notes, standout ideas, quality rating |

## Method

1. **Scrape.** The homepage carries every entry's metadata in its server-rendered payload. Each entry's own page carries the full prompt, model, iterations and posting date. All 232 pages were fetched.
2. **Visual analysis.** For each entry, the 4-second preview MP4 was downloaded, four keyframes were extracted at 15%, 40%, 65% and 90% of its length, and those stills were judged for layout, palette, typography, motion cues and fidelity to the prompt. Where the preview missed the output, the full video was sampled instead.
3. **Prompt analysis.** All 229 prompts were read and grouped by archetype, constraint family and structure. Counts are heuristic, to about ±10%.

## Reading the data honestly

- **Previews are 4 seconds long.** Most entries run longer (roughly half are 15 s, a few are 30 s, one is 300 s). Claims about late beats, audio or full-length structure are unverified unless a full video was sampled, and the analysis files mark the ones that were.
- **Quality ratings are a judgement from stills and palette sampling**, not a measure of the full piece. Distribution: 2 entries rated 2, 70 rated 3, 154 rated 4, 6 rated 5. "Best" in the playbook means most specified, since there is no ground-truth quality score.
- **Stacks are mostly inferred.** 55 entries declare their stack. The other 177 are inferred from the stills, with confidence high for 1, medium for 39 and low for 137.
- **Some entries look like data problems.** The flags column in `catalog.md` lists them. Six entries show a subject that differs from their prompt, three pairs are near-copies or byte-identical previews, three are silent, one prompt still has template placeholders, and one asks for motion design but returns a finished ad.
- **Three entries are skill-tagged with no prompt** (lexnlin-6161a6, anthonyriera-9b1b2a, jake11moran-a269c4). They are kept separate from the prompt analysis.

## Licence and what is not in this repository

prompt-motion.com's robots.txt sets `Content-Signal: search=yes,ai-train=no,use=reference`. This study is reference use: it describes how each video was made and links back to the creator. The full verbatim prompts, the raw scrape and the downloaded media stay out of the repository. They are kept in the working session's scratchpad and are not committed. The prompts belong to their creators, and each catalogue row links to the entry's page on the site.

Videos and prompts belong to their creators. Attribution for each entry is on its page on prompt-motion.com.
