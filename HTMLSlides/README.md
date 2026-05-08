# MyCPslide — Interactive Slide System

Extensible HTML/CSS/JS deck framework for competitive-programming teaching.
Built around the existing PDF visual identity (typewriter, cream blobs, brackets).

## Quick start

Open `index.html` in any modern browser. No build step.

For local serve (recommended for fonts/CDN):
```bash
cd HTMLSlides && python3 -m http.server 8000
# visit http://localhost:8000
```

## Directory layout

```
HTMLSlides/
├── index.html              landing page, lists all decks
├── shared/
│   ├── css/
│   │   ├── theme.css       slide chrome, typography, animations
│   │   └── widgets.css     widget styling
│   └── js/
│       ├── deck.js         slide engine (nav, fragments, KaTeX, widget mount)
│       └── widgets/
│           ├── registry.js
│           ├── array-search.js     binary-search-on-array animation
│           ├── boat-sink.js        BSTA monotonicity slider
│           ├── recursion-tree.js   fast-expo style recursion tree
│           └── graph-vis.js        BFS/DFS step-through
└── decks/
    ├── _template/          starting point for new decks
    ├── 06-brute-force/     iterative + recursive + backtracking
    ├── 07-binary-search/   plain binary search
    └── 08-bsta/            BS the Answer reference deck
```

## Authoring a new deck

1. Copy `decks/_template/` → `decks/<NN>-<topic>/`
2. Edit `index.html`: title, slides, widgets
3. Add card to `index.html` landing page

### Slide markup
```html
<section class="slide">
  <h2>Heading</h2>
  <p>Body text — KaTeX inline: $O(n \log n)$.</p>
  <ul>
    <li class="fragment">Reveals on Space/→.</li>
  </ul>
  <p class="callout">Highlighted box.</p>
</section>
```

### Title slide
```html
<section class="slide title">
  <h1>Topic</h1>
  <p class="subtitle">Tagline.</p>
  <div class="author">Petkub :D</div>
</section>
```

### Widgets
Add `data-widget="<name>"` plus widget-specific data attributes:

| Widget | Purpose | Attributes |
|---|---|---|
| `array-search` | Binary search on sorted array | `data-values="2,3,5"` `data-target="5"` |
| `boat-sink` | BSTA monotonicity, capacity slider | `data-loads="3,4,5,9,10"` `data-min` `data-max` |
| `recursion-tree` | Fast exponentiation tree | `data-a="2"` `data-p="14"` |
| `graph-vis` | Static or BFS/DFS animation | `data-nodes='[...]'` `data-edges='[...]'` `data-mode="bfs"` `data-start` |

### Math
- Inline: `$x^2 + 1$` or `\(x^2 + 1\)`
- Display: `$$\sum_{i=1}^{n} i$$` or `\[ ... \]`

### Color tokens
`tk-blue`, `tk-red`, `tk-green`, `tk-purple`, `tk-pink` for inline emphasis.

## Adding a new widget

1. Create `shared/js/widgets/<name>.js`:
   ```js
   (function () {
     function mount(el) { /* read el.dataset, render into el */ }
     window.Widgets['<name>'] = mount;
   })();
   ```
2. Add `<script>` tag to deck `index.html` (or `_template/index.html` for default availability).
3. Style in `shared/css/widgets.css`.

The deck engine auto-discovers widgets via `[data-widget]` attribute on slide enter.

## Keyboard

- `→` / `Space` / `PageDown` — next fragment or slide
- `←` / `PageUp` — back
- `Home` / `End` — first / last slide
- `F` — fullscreen

## Roadmap

Topics planned: 09 Recursion+DP I · 10 DP II · 12 Graph · 13 Shortest Path · 14 DSU+MST · 15 Segtree+Fenwick.

Future widgets: dp-table-fill, dijkstra-stepper, dsu-merge, segtree-range-query, kmp-failure, suffix-array.

## Browser support

Modern Chrome / Firefox / Safari. Uses CSS variables, ES2015+, SVG.
No build, no bundler.
