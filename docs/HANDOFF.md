# Merit deck: handoff for finishing the remaining slides

Read [CONCEPT.md](CONCEPT.md) first. The hard graphics are done; this file says exactly how to add the remaining
slides so they match. Keep quality equal to the built slides: check every slide in screenshots before pushing.

## What is built (do not redesign)

| File | Owns |
|---|---|
| `site/assets/portrait.js` | **Merit Portrait engine** (`window.Merit`): silhouette, seven evidence rings, pen-plotter reveal, highlight, band tint, anchors, morphs. API documented at the top of the file. |
| `site/assets/scenes.js` | Canvas scenes per slide, using the `scene(id, setup)` helper. |
| `site/assets/deck.js` | Navigation, fragments, scaling, hash links. Generic; no changes needed. |
| `site/assets/style.css` | Tokens and the styles of every slide. |
| `site/index.html` | Slides. All 14 slides are built. |

Remaining slides go where `<!-- TODO(slide NN · …) -->` comments sit in `site/index.html`, in that order.

## Conventions

- **Stage:** every slide is a `<section class="slide">` on a fixed 1600×900 stage; position things in px.
- **Steps:** `data-f="n"` shows an element from step n on; `data-only="n"` shows it only at step n. Set
  `data-steps="N"` on the section when a canvas needs more steps than the DOM fragments imply.
- **Entrance animation:** add class `anim` with `style="--d:.3s"` to stagger elements when a slide becomes active.
- **Type:** headings `h2.serif` (64px), italics for the emotional half of a line (`<i>`), kicker `div.kicker` (mono,
  uppercase), body Inter 16–20px, data in mono. Use `.cap` for subtitles.
- **Color:** only tokens from `:root` (`--ink`, `--graphite`, `--paper-2`, `--l1`…`--l7`, `--ok`, `--warn`). A layer's
  color always means that layer (05 blue = collaboration everywhere).
- **Cards:** `#FBF9F4` background, `1px solid var(--line)`, radius 16px, a 4px colored left border for the layer.
- **Figures:** any customer, person or number is fictional: add `<div class="illus">Illustrative data</div>`.
- **Logos:** `<i class="logo xs" data-logo="github"></i>`; available keys are in `site/assets/icons.js`. Brands
  missing from Simple Icons (Slack, Teams, LinkedIn, Workday) are written as `<span class="chip">Slack</span>`.
- **Canvas scenes:** add a `<canvas class="cv" data-cv="name"></canvas>` to the slide and in `scenes.js`:

```js
scene('s-myslide', st => {
  const P = new M.Portrait({ bases: [/* 7 strengths 0..1 */], seed: 31, N: 140 });
  return (t, dt) => {
    clear(st);
    const el = (t - st.t0) / 1000, since = (t - st.stepAt) / 1000;   // seconds on slide / in step
    P.draw(st.ctx, 800, 480, 420, { reveal: M.LAYERS.map((_, i) => easeIO((el - i * 0.2) / 0.9)), t,
      highlight: st.step >= 1 ? 0 : null, dim: 0.2 });
  };
});
```

  Use `N: 90–140` for small portraits (fast), 180–220 for large ones. `P.anchor(ring, theta)` + `M.toPx(...)` gives a
  pixel point on a ring to draw connector lines to (see the engine scene's `link()` for the curve style).
- **Never** add libraries, change `portrait.js` geometry, or use emotional/tone language for voice features.

## Remaining slides (content is final; layout is guidance)

**02 · Three confusions.** Kicker "The problem". Three huge serif lines, one per step (`data-f` 0/1/2):
"<span class=mute>Activity</span> is not impact." · "<span class=mute>Confidence</span> is not competence." ·
"<span class=mute>Visibility</span> is not value." Step 3 foot line: "Most performance tools only measure the first
word of each sentence." (Muted = `color: var(--graphite)`.)

**04 · Psychometrics: describe, never decide.** Title: "Psychology at the core. <i>Never as a filter.</i>" Center: a
medium portrait with ring 01 highlighted (`highlight: 0`). Left card "Self-insight & team chemistry": chips MBTI,
CliftonStrengths, DISC → "Working-With-Me Card · team balance · coaching language". Right card "Decisions": chips Big
Five / HEXACO, Structured interview, Work sample → "Evidence for hiring and growth". Foot (small, graphite): "The
publishers of MBTI and CliftonStrengths say their tools are not for hiring or selection. Merit keeps it that way."

**06 · The algorithms.** Title: "One engine. <i>Six algorithms around it.</i>" A portrait in the center; six cards
(three left, three right, like the engine slide) connected with `link()` curves to its rings, revealed one per step:
Signal-to-Success (02 color), Contribution Graph (05), Growth Trajectory (03), Fairness Guard (07), Team Chemistry
(01), Retention Radar (06). Card copy = CONCEPT.md §3.

**07 · Fairness Guard.** Title: "The only algorithm that <i>audits the evaluator.</i>" Three bias checks as cards with
small DOM bar charts, one per step, each ending in a flag chip:
1. Recency bias: "78% of this rating cites the last 3 weeks of a 13-week quarter."
2. Proximity bias: "In-office reports rated +0.6 higher than remote reports with equal evidence."
3. Similarity bias: "Ratings track shared background more than shared outcomes."
Step 4 line: "Merit shows the manager before the review is submitted, not after the damage."

**09 · Outputs.** Title: "Out comes understanding. <i>For everyone involved.</i>" Six cards in a 3×2 grid, each with a
small portrait (canvas, `N: 90`) or icon and two lines: Candidate Evidence Dossier · 30/60/90 Ramp · 1:1 Card ·
Drafted Review (both sides see the receipts) · Staffing Engine · My Mirror + Working-With-Me Card. Copy = CONCEPT.md §4.

**10 · Tap & Speak.** Title: "Twelve people. <i>Seven minutes.</i>" Left: a 4×3 grid of small portraits; one is active
(scaled up, ring highlighted, a pulsing mic and a CSS waveform). Right panel: the active person's three evidence
bullets, a voice transcript line ("Lena carried the incident load this month and still shipped the auth refactor."),
and a "Blind Spot" card in 05 blue: "Her unblocking work isn't in your notes: 14 teammates this month."

**11 · Hiring Calibration Loop.** Title: "Six months later, <i>Merit checks its own homework.</i>" A horizontal bar chart
(DOM) "How well each signal predicted success here": Structured interview 0.62 · Work sample 0.58 · Big Five
conscientiousness 0.41 · Years of experience 0.18 · Résumé keywords 0.09 · Gut-feel "culture fit" 0.05. Bars grow on
entry; the weak ones fade at step 1 with the line "Interviewers get calibrated. Hiring gets less wrong every quarter."

**12 · Trust rules.** Title: "Seven rules <i>Merit never breaks.</i>" A clean two-column list of the seven rules from
CONCEPT.md §5, each with its layer-colored number. No icons needed.

**13 · Positioning.** Title: "Everyone sees a slice. <i>Merit sees the person.</i>" Table: They do · Examples · Merit's
edge, rows from CONCEPT.md §7. Last row highlighted: Merit · "one evidence trail from first résumé to fifth year".

## Verify, build, publish

1. `cd site && python3 -m http.server 8770 &` then `node scripts/screenshot.cjs /tmp/shots` (add `3,5` to limit
   slides). Open the PNGs and fix every overlap, clipped text and console error before committing.
2. Build the protected site: `DECK_PASSWORD='…' node scripts/build-protected.mjs` (ask the owner for the password;
   never write it into any file, commit message or log). Commit `site/` and `public/` together.
3. Push the working branch, then the same commit to `main`. Pages deploys `public/` from `main` via
   `.github/workflows/pages.yml`.
