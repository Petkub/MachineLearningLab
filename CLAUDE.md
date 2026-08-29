# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Teaching material for a NOAI Thailand Stage-2 pre-camp bootcamp (NumPy → Pandas → sklearn → PyTorch),
delivered as (a) self-contained HTML slide decks and (b) Google Colab notebooks.
No build system, no package manager, no tests. Everything is static files.

`noai_stage2_teaching_plan.md` is the curriculum spec — read it before adding/reordering
content, it defines the 4-day structure, the 80/20 scope, and what is *intentionally excluded*.

## Running

Decks must be served over HTTP — `file://` breaks fonts/KaTeX on WSL:

```bash
cd HTMLSlides && python3 -m http.server 8000   # → http://localhost:8000
```

Notebooks: no venv on this box. Install with
`pip install --user --break-system-packages <pkg>` before executing them locally.
Validate a notebook without running it:

```bash
python3 -c "import json,sys; json.load(open('colab_exercises/noai_day3_sklearn.ipynb'))"
```

## Architecture

### Deck engine (`HTMLSlides/shared/js/deck.js`)

Single IIFE `Deck`, auto-inits on `DOMContentLoaded`. A deck is one `index.html` containing
`<section class="slide">` elements; the engine does the rest:

- Scales `.deck` to a fixed **1280×720** logical canvas via `transform: scale()`. All slide
  layout is authored against those dimensions — do not use viewport units inside slides.
- Fragment reveal: `.fragment` → `.fragment.visible` on next(). Fires `fragment:reveal`
  on the slide element; slides also get `slide:enter` / `slide:exit` — that's the hook for
  animating per-deck widgets.
- Builds chrome (brackets/footer/label), controls, progress bar, side-nav, home button.
- KaTeX auto-render (`$…$`, `$$…$$`, `\(…\)`, `\[…\]`) via CDN.
- `highlightCode()` is a hand-rolled **C++** tokenizer over `pre.code > code` — inherited from
  the CP-slides ancestor of this repo. It mangles Python (`def`, `import`, f-strings are not in
  its keyword set). Prefer non-`pre.code` markup for Python listings, or accept plain text.
- `mountWidgets()` calls `window.Widgets[el.dataset.widget](el)` for every `[data-widget]`.

Keys: `←/→/Space/PageUp/PageDown` nav, `Home/End`, `F` fullscreen, `H` home, `D` draw overlay.

### Widgets: two systems, only one in use

`shared/js/widgets/*.js` (~40 files: segtree-vis, dsu-vis, knapsack-table, …) is the **legacy
competitive-programming library, currently referenced by zero decks**. Decks only load
`registry.js` (which just creates `window.Widgets = {}`).

Every interactive element in the ML decks is instead an **inline `<script>` at the bottom of
that deck's own `index.html`**, with its styles in an inline `<style>` in the same file.
Follow that pattern for new interactives — keep the deck self-contained. Only promote something
to `shared/` when a second deck genuinely needs it.

`shared/css/theme.css` holds slide chrome/typography and the color tokens
(`--ink`, `--cream`, `--bg`, `--ink-soft`, …). `shared/css/widgets.css` is mostly legacy-widget styling.

### `draw-tool.js`

SVG annotation overlay (pen/highlighter/eraser/shape), per-slide stroke storage, toggled with `D`.
Initialized by the engine when present. Large and self-contained; it owns its own z-index stack.

### Deck layout trap — divider slides

The engine shows/hides slides purely via `.slide { display:none }` / `.slide.active { display:flex }`.
**Never put a bare `display:` on `.slide.divider`** (or any slide-class variant) in a deck's inline
CSS — it outranks the engine's hide rule, so *every* divider stays rendered and swallows clicks on
the widgets of whatever slide is actually visible. The working idiom (see `00-noai-day1-numpy`):

```css
.slide.divider { /* looks only — no display */ }
.slide.divider.active { display: grid; place-items: center; }
```

When a widget stops responding to clicks, probe `document.elementFromPoint(x, y)` first to find the
real overlay. Do not "fix" it by raising the active slide's z-index.

## Content structure

- `HTMLSlides/index.html` — landing page; card links are hand-maintained. Adding a deck means
  adding its card here.
- `HTMLSlides/decks/00-noai-*` — the live 3-day NOAI track (overview, day1 numpy, day2 pandas,
  day3 sklearn). These are the decks under active development.
- `HTMLSlides/decks/01-10-*` — older per-topic ML decks (numpy, pandas, matplotlib, ml-pipeline,
  classification, clustering, neural-net, training-loop, transfer-race-day).
- `HTMLSlides/noai-teacher-guide.html` — standalone teacher-facing page, not a deck (no engine).
- `HTMLSlides/README.md` — **stale**: describes the CP-slides ancestor (`_template/`, brute-force,
  binary-search decks) that no longer exists here. Trust this file over it.
- `colab_exercises/*.ipynb` — student notebooks. `noai_day{1,2,3}_*.ipynb` pair with the 00- decks;
  `noai_day*_homework.ipynb` are the take-homes. Exercises are marked with `TODO` in code cells.
  Keep deck content and its paired notebook in sync when editing either.

## Conventions

- Commits: Conventional Commits, scoped by day/deck — `feat(day3): …`, `docs(day3): …`.
- Visual identity: JetBrains Mono throughout, cream (`--cream`) highlight pills, 3px black borders,
  hard offset shadows (`box-shadow: 4px 4px 0 var(--ink)`). Match it in new slides.
- Everything is vanilla ES2015+ / CSS variables / SVG. CDN for JetBrains Mono and KaTeX only.
