# Site audit: prompt-motion.com

Captured 2026-10-08. 232 entries. Sources: homepage and all 232 `/<slug>` pages (static), the stylesheet and client JS chunks, and live Chromium 141 (Playwright 1.56.1) at 1440x900 and 390x844.

**Not verified:** video playback and preview autoplay (the bundled Chromium has no H.264), LCP, bytes actually fetched by `preload="auto"`, the Popular ranking metric, and the signup and submit flows (not exercised, to avoid real submissions).

## 1. Information architecture

- `/` gallery: header (logo, Submit, @p4nthera_ link), hero (h1, subtitle, signup card), filter bar (Prompt/Skill, Popular/Recent, Pause previews), masonry of 232 cards, footer.
- `/<slug>` entry page on direct load. Clicking a card opens the same entry as an intercepting modal over the grid. The URL changes to `/<slug>`, but `document.title` stays "Prompt Motion". Escape returns to `/`. Prev/next buttons and ArrowLeft/ArrowRight step through the current filtered and sorted list.
- Unknown slugs: HTTP 404, `<title>Not found</title>`, `noindex`.
- No other routes: `/about`, `/submit`, `/skills`, `/api`, `/feed.xml`, `/rss.xml`, `/llms.txt`, `/sitemap.xml` and `/manifest.webmanifest` all return 404.

## 2. Copy inventory

Static strings only. Entry titles, handles and prompts are excluded as creator content.

| Area | Strings |
|---|---|
| Header | Prompt Motion, Submit, @p4nthera_ |
| Hero | h1 "Prompt Motion"; "A collection of motion videos made with Claude Opus 5.5, with the prompts and skills behind them." |
| Signup | "Get new videos and prompts by email"; "An email when new ones are added, plus a weekly recap. Unsubscribe anytime."; placeholder "Your email"; toggle "Subscribe" (visually clipped; aria "Collapse signup" / "Open signup"); success "You're subscribed" |
| Filter | Filter:, Prompt, Skill, Popular, Recent, Pause previews |
| Badges | Prompt, Skill |
| Submit dialog | "Submit a video"; "Know a motion video made with Claude Opus 5.5? Send the post on X."; "Post URL"; "Where's the prompt or skill?"; In the main post / In the comments / In a separate post; Cancel, Submit, Close |
| Entry | All videos; View post (opens in a new tab); Prompt; Copy prompt / Copied; Show all / Show less; "This prompt was taken directly from @handle's post."; Model, Iterations, Stack, Effort, Posted; Play, Seek, Unmute; Previous entry, Next entry |
| Skill entry | Skill; Copy install command; View repo |
| Footer | "Videos and prompts belong to their creators, linked on each entry."; Curated by @p4nthera_ |
| 404 | "This page doesn't exist"; "The link may be broken, or the entry may have been removed from the gallery." |

Metadata values: Model is "Opus 5.5" on all 232. Iterations: One-shot, A few rounds, Many rounds. Effort: Max, High, Medium.

## 3. Components

- **Gallery:** JS-measured masonry. 4 columns at 1440px, 1 column at 390px (container-query breakpoints 560, 900, 1160px).
- **EntryCard:** a link with aria-label "title, by @handle". Visible content is the poster (alt=""), a hidden preview video, an avatar with fallback letter, the @handle and a badge. **The title is not visible on the grid.**
- **Entry modal and page:** media panel (Play, Seek, Unmute), creator block (avatar, name, handle, View post), h1, Prompt or Skill section with Copy, source line, dl metadata, "All videos" link, footer. Two columns on desktop, stacked on mobile.
- **FilterBar:** Radix toggle group, select and pause toggle.
- **SubmitDialog:** Post URL (required), three-option radio (required), Cancel/Submit, honeypot `website` input.

## 4. Design tokens

Source: `assets/035fha7vccr51.css`.

- **Colour, light only:** background #fff, foreground #111, muted-foreground #6b6b6b, muted and secondary #f2f2f2, border and input #e5e5e5, ring #c4c4c4, destructive #e40014. `color-scheme: light`. The dark variants never match because they are scoped under `:where(.never-dark ...)`. Verified: the page stays light under `prefers-color-scheme: dark`.
- **Radius:** base 10px, md 8px, 3xl 22px (signup card), cards 12px, chips full pill.
- **Type:** Geist, variable 100 to 900. Homepage h1 30px/500 with -0.025em tracking (24px on mobile). Entry h1 20px/500. Body 16/24, labels 14/20, badges 12/16. Geist Mono is declared and preloaded, but no element on `/` or an entry page uses it.
- **Spacing and layout:** 4px base. Max width 1400px. Gutters 16, 24, 32px.
- **Motion:** default 150ms `cubic-bezier(.4,0,.2,1)`; preview fade 300ms; modal shared-layout spring (0.45s, bounce 0). Reduced motion sets transitions to 0.01ms and previews default to paused.
- **Focus:** global 2px outline, 3px offset. Cards show a 2px #111 ring.

## 5. Responsive behaviour

- Breakpoints: 640, 768, 1024, 1280, 1536px. The hero switches to two columns at 1024px.
- No horizontal overflow at either width. The 390px homepage is 72,813px tall.
- On mobile the entry video is full-bleed (x=0, 390px wide) while the text keeps a 16px gutter. This is inconsistent.

## 6. Interactions

Verified live unless marked.

- **Card click:** opens the modal described above. Escape closes it. ArrowLeft and ArrowRight move to the previous and next entry.
- **Filter:** Prompt shows 229 cards and Skill shows 4. This is client state only. The URL does not change and it resets on reload.
- **Sort:** Recent is date descending (checked against the data). Popular is the server order. The ranking metric is not in the payload, so it is not verified.
- **Pause previews:** stored in localStorage `pm:previews` as `paused` or `playing`. Survives reload. Defaults to paused under reduced motion.
- **Previews (from code):** play when at least 25% of the card is visible (IntersectionObserver). Hovering does not start them. Hover only darkens the card ring and the handle colour. Playback not verified.
- **Copy prompt:** shows "Copied". **Show all:** expands clamped prompts (216px to 1,656px for a 2,711-character prompt).
- **Signup:** email is required. Submission posts to a Next.js server action named `subscribe`. Not invoked.
- **Autoplay on hover:** no. Previews are in-view, as above.

## 7. SEO and metadata

- **Homepage:** title "Prompt Motion". Description set. OG title, description, site_name, and a 1200x630 PNG image (254 KB) with alt. Twitter `summary_large_image`, creator @p4nthera_.
- **Entry:** title is the bare entry title with no site suffix. Description "By @handle". OG image is the poster.
- **Missing:** canonical, og:url, JSON-LD (zero on both page types), theme-color, sitemap (404), manifest (404). robots.txt has no `Sitemap:` line.
- **robots.txt:** `Content-Signal: search=yes, ai-train=no, use=reference`. ClaudeBot and other training crawlers are disallowed.
- **Icons:** favicon.ico (48px), icon.svg, apple-icon.png (180px).

## 8. Accessibility

**Good:** `lang="en"`, one h1 per page, posters have `alt=""` inside labelled links, preview videos are `aria-hidden` with `tabindex=-1`, reduced motion is honoured, Escape closes dialogs, and tab order is logical (logo, Submit, X, email, toggle, chips, sort, pause, cards).

**Issues:**
1. Utility-styled controls (Submit, chips, sort, pause) get their focus indicator from a 3px halo of #c4c4c4 at 50%, about 1.3:1 on white. Their border is 1.7:1. Both are below the 3:1 guidance for focus indicators.
2. Chip borders (#e5e5e5) are 1.3:1, and they are the only boundary the chips have.
3. The signup toggle is icon-only. Its visible "Subscribe" text is clipped out of view, and its accessible name ("Collapse signup" / "Open signup") does not contain any visible label (WCAG 2.5.3).
4. The mobile signup toggle is 20px tall, below the 24px WCAG 2.2 AA minimum. Submit and the X link are 28px.
5. Grid titles exist only in aria-label, so sighted users see no titles on `/`.
6. Entry videos have no caption tracks.
7. The modal keeps `document.title` as "Prompt Motion".

Contrast: body 18.9:1; muted text 5.3:1 on white and 4.8:1 on #f2f2f2 (both pass AA).

## 9. Performance

- **Posters:** 232 webp files, median 14 KB, 5.0 MB total. Blur placeholders are inline data URIs. 13 are eager (9 hero, 4 first cards), the rest lazy.
- **Previews:** 232 H.264 MP4s, median 96 KB, 30.8 MB total, about 4 seconds, no audio, faststart. The first 4 use `preload="auto"` and the rest `metadata`. A full scroll mounts 221 preview elements.
- **Full videos:** 2.71 GB total. Median 7.0 MB. 85 are over 10 MB, 31 over 25 MB, 7 over 50 MB. Largest is 119 MB (ryzoft-4f85bd). Entry pages set `preload="auto"` and the request is issued on load. Recommend `preload="metadata"` with the poster shown first. Only MP4/H.264, with no WebM or AV1 source.
- **Avatars:** not lazy. All 232 are requested within 2.5s of load (0.56 MB total).
- **Fonts:** two woff2 preloads. The Geist Mono primary subset (about 23 KB) is preloaded but unused.
- **Load:** DOMContentLoaded 900ms, load 964ms (desktop, local headless). LCP not captured.
- **Caching:** media served `immutable`, max-age one year.
- **Console:** one "Deprecated API for given entry type" warning, no errors.

## 10. Issues summary

- `/sitemap.xml` and `/manifest.webmanifest` return 404. The file `sitemap.xml` in the scratch folder is that 404 body, not a sitemap.
- Entry pages preload full-size videos (section 9).
- Focus and target-size issues (section 8).
- The three skill-only entries have no prompt or source line. This looks intended.

## Files

- Inventory: `analysis/site_inventory.json`
- Live data: `analysis/live_results.json`, `live_extra.json`, `live_extra2.json`, `live_styles.json`, `live_initial_load.json`, `media_sizes.json`, `video_size_dist.json`
- Screenshots: `screenshots/` (17 PNG, including `home_1440_full.png`, `home_390_full.png`, `detail_1440_full.png`, `detail_390_full.png`, `detail_modal_1440.png`)
- Scripts: `tools/`. Downloaded CSS, fonts and JS: `assets/`
