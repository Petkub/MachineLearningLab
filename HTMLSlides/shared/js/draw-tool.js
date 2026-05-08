// ==========================================================================
// DrawTool — vector (SVG) overlay drawing on top of slides
// Per-tool settings: color, size, stabilization, tip sharpness.
// Eraser: pixel (rasterizes nothing — visual cut via per-stroke clip) /
//   stroke (geometric hit test, removes whole strokes).
// Per-slide stroke storage. Toggle: D key. Esc exits.
// ==========================================================================

(function () {
  const SVGNS = 'http://www.w3.org/2000/svg';
  const DrawTool = {};

  const COLORS = ['#111111', '#d62828', '#1d3fb6', '#2f9e44', '#7048e8', '#e64980'];

  // Per-tool defaults — each tool keeps own settings.
  // stabilize: 0..0.95   higher = smoother lag
  // sharpness: 0..1      0 = very soft curves, 1 = polyline (sharpest)
  const TOOL_DEFAULTS = {
    pen: {
      color: '#111111', size: 2.5, min: 0.5, max: 12, step: 0.5,
      stabilize: 0.65, sharpness: 0.35,
      style: 'fountain', // 'fountain' | 'ballpoint'
      taper: 0.7,        // 0..1 — tip narrowing strength (fountain only)
    },
    highlighter: {
      color: '#fde047', size: 18, min: 6, max: 48, step: 1,
      stabilize: 0.3, sharpness: 0.3,
    },
    eraser: {
      color: null, size: 16, min: 6, max: 60, step: 1,
      stabilize: 0, sharpness: 0, mode: 'stroke',
    },
    shape: {
      color: '#111111', size: 2.5, min: 1, max: 10, step: 0.5,
      stabilize: 0, sharpness: 0,
      kind: 'rect',
      cells: 6,
      cols: 6,
      filled: false,
      arrow: false,
    },
    select: { color: null, size: 1, min: 1, max: 1, step: 1, stabilize: 0, sharpness: 0 },
  };

  const SHAPES = [
    { id: 'line',     label: 'line',     group: 'prim' },
    { id: 'rect',     label: 'rect',     group: 'prim' },
    { id: 'circle',   label: 'circle',   group: 'prim' },
    { id: 'triangle', label: 'tri',      group: 'prim' },
    { id: 'array',    label: 'array',    group: 'comp' },
    { id: 'grid',     label: 'grid',     group: 'comp' },
    { id: 'node',     label: 'tree node',group: 'comp' },
  ];

  const state = {
    deckEl: null,
    overlay: null,
    svg: null,
    inkLayer: null,
    livePath: null,
    toolbar: null,
    enabled: false,
    tool: 'pen',
    tools: JSON.parse(JSON.stringify(TOOL_DEFAULTS)),
    drawing: false,
    points: [],
    filtered: { x: 0, y: 0 },
    strokes: {},        // strokes[slideIdx] = [strokeRecord]
    nodes: {},          // nodes[slideIdx]   = [SVGPathElement]
    currentSlide: 0,
    selected: new Set(),  // stroke indices on current page
    selectMode: null,     // 'rubber' | 'move'
    moveStart: null,
    rubberBox: null,
    mode: 'slide',        // 'slide' | 'whiteboard'
    wbStrokes: [[]],      // wbStrokes[pageIdx] = strokeList
    wbNodes: [[]],        // wbNodes[pageIdx]   = node refs
    wbCurrent: 0,
    redoStack: { slide: {}, wb: {} },
  };

  function curTool() { return state.tools[state.tool]; }

  function curStrokes() {
    if (state.mode === 'whiteboard') {
      if (!state.wbStrokes[state.wbCurrent]) state.wbStrokes[state.wbCurrent] = [];
      return state.wbStrokes[state.wbCurrent];
    }
    if (!state.strokes[state.currentSlide]) state.strokes[state.currentSlide] = [];
    return state.strokes[state.currentSlide];
  }
  function curNodesArr() {
    if (state.mode === 'whiteboard') {
      if (!state.wbNodes[state.wbCurrent]) state.wbNodes[state.wbCurrent] = [];
      return state.wbNodes[state.wbCurrent];
    }
    if (!state.nodes[state.currentSlide]) state.nodes[state.currentSlide] = [];
    return state.nodes[state.currentSlide];
  }
  function setCurNodesArr(arr) {
    if (state.mode === 'whiteboard') state.wbNodes[state.wbCurrent] = arr;
    else state.nodes[state.currentSlide] = arr;
  }

  function init(deckState) {
    state.deckEl = deckState.deckEl;
    buildOverlay();
    buildToolbar();
    buildWbBar();
    bindKeys();
    bindSlideEvents();
  }

  function buildWbBar() {
    const bar = document.createElement('div');
    bar.className = 'wb-controls';
    bar.innerHTML = `
      <button id="wb-prev" title="Previous page (←)">‹</button>
      <span class="counter"><span id="wb-cur">1</span> / <span id="wb-total">1</span></span>
      <button id="wb-next" title="Next page (→)">›</button>
      <span class="wb-sep"></span>
      <button id="wb-add" title="Add page">+</button>
      <button id="wb-del" title="Delete page">−</button>
    `;
    document.body.appendChild(bar);
    state.wbBar = bar;
    bar.querySelector('#wb-prev').onclick = () => wbGoTo(state.wbCurrent - 1);
    bar.querySelector('#wb-next').onclick = () => wbGoTo(state.wbCurrent + 1);
    bar.querySelector('#wb-add').onclick = wbAddPage;
    bar.querySelector('#wb-del').onclick = wbDeletePage;
  }

  // ----------------------------------------------------------- overlay
  function buildOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'draw-overlay';
    state.overlay = overlay;

    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 1280 720');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.classList.add('draw-svg');
    state.svg = svg;

    // mask for pixel-erase: white = visible, black strokes = cut
    const defs = document.createElementNS(SVGNS, 'defs');
    const mask = document.createElementNS(SVGNS, 'mask');
    mask.setAttribute('id', 'dt-erase-mask');
    const maskBg = document.createElementNS(SVGNS, 'rect');
    maskBg.setAttribute('width', '1280');
    maskBg.setAttribute('height', '720');
    maskBg.setAttribute('fill', 'white');
    mask.appendChild(maskBg);
    const eraseGroup = document.createElementNS(SVGNS, 'g');
    eraseGroup.setAttribute('id', 'dt-erase-paths');
    mask.appendChild(eraseGroup);
    defs.appendChild(mask);
    svg.appendChild(defs);
    state.eraseLayer = eraseGroup;

    const ink = document.createElementNS(SVGNS, 'g');
    ink.classList.add('draw-ink');
    ink.setAttribute('mask', 'url(#dt-erase-mask)');
    svg.appendChild(ink);
    state.inkLayer = ink;

    // hint layer above ink — pull-edge live preview
    const hint = document.createElementNS(SVGNS, 'g');
    hint.classList.add('dt-hint-layer');
    svg.appendChild(hint);
    state.hintLayer = hint;

    overlay.appendChild(svg);
    state.deckEl.appendChild(overlay);

    svg.addEventListener('pointerdown', onDown);
    svg.addEventListener('pointermove', onMove);
    svg.addEventListener('pointerup', onUp);
    svg.addEventListener('pointercancel', onUp);
    svg.addEventListener('pointerleave', onUp);
  }

  // ----------------------------------------------------------- toolbar
  function buildToolbar() {
    const tb = document.createElement('div');
    tb.className = 'draw-toolbar';
    tb.innerHTML = `
      <button class="dt-btn dt-toggle" data-act="toggle" title="Draw mode (D)">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
      </button>
      <button class="dt-btn dt-wb" data-act="whiteboard" title="Whiteboard mode (W)">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="13" rx="1"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>
      </button>
      <div class="dt-tray">
        <button class="dt-btn dt-tool" data-tool="pen" title="Pen (P)">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l3-1 11.2-11.2a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L3 15.2 2 18l2 2z"/><path d="M14 6l4 4"/><path d="M3 22h7"/></svg>
        </button>
        <button class="dt-btn dt-tool" data-tool="highlighter" title="Highlighter">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l6-6 4 4-6 6z"/><path d="M9 11l-3 3v4h4l3-3"/><path d="M3 22h12"/><path d="M5 18l-2 4"/></svg>
        </button>
        <button class="dt-btn dt-tool" data-tool="eraser" title="Eraser (E)">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6 6h11"/><path d="M16 3l5 5L9 20H4v-5L16 3z"/></svg>
        </button>
        <button class="dt-btn dt-tool" data-tool="shape" title="Shapes (S)">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="8" height="8"/><circle cx="17" cy="7" r="4"/><path d="M3 21h8L7 13z"/><path d="M14 14h7v7h-7z"/></svg>
        </button>
        <button class="dt-btn dt-tool" data-tool="select" title="Select (V)">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3l14 7-6 2-2 6z"/></svg>
        </button>
        <div class="dt-slot dt-pstyle-slot">
          <div class="dt-pen-styles">
            <button class="dt-btn dt-pstyle" data-pstyle="fountain" title="Fountain pen">
              <span>fountain</span>
            </button>
            <button class="dt-btn dt-pstyle" data-pstyle="ballpoint" title="Ballpoint pen">
              <span>ball</span>
            </button>
          </div>
          <div class="dt-select-opts">
            <button class="dt-btn" data-act="sel-lock" title="Lock / unlock selection (L)">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
              <span>lock</span>
            </button>
            <button class="dt-btn" data-act="sel-del" title="Delete selection (Del)">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>
              <span>del</span>
            </button>
            <button class="dt-btn" data-act="sel-clear" title="Deselect (Esc)">
              <span>clear</span>
            </button>
          </div>
          <div class="dt-shape-opts">
            <select class="dt-shape-kind" title="Shape">
              ${SHAPES.map(s => `<option value="${s.id}">${s.label}</option>`).join('')}
            </select>
            <label class="dt-shape-num" title="Cells / rows">
              <span class="dt-lab">n</span>
              <input class="dt-cells" type="number" min="1" max="40" step="1" value="6">
            </label>
            <label class="dt-shape-num dt-shape-cols" title="Columns (grid only)">
              <span class="dt-lab">m</span>
              <input class="dt-cols" type="number" min="1" max="40" step="1" value="6">
            </label>
            <button class="dt-btn dt-shape-filled" data-act="shape-filled" title="Filled fill">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
            </button>
            <button class="dt-btn dt-shape-arrow" data-act="shape-arrow" title="Arrowhead (line)">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h14"/><path d="M14 6l6 6-6 6"/></svg>
            </button>
          </div>
        </div>
        <span class="dt-sep"></span>
        <div class="dt-slot dt-color-slot">
          <div class="dt-colors">
            ${COLORS.map(c => `<button class="dt-color" data-color="${c}" style="background:${c}"></button>`).join('')}
          </div>
          <div class="dt-erase-modes">
            <button class="dt-btn dt-emode" data-emode="pixel" title="Erase by pixel">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="9" stroke-dasharray="2 3"/></svg>
              <span>pixel</span>
            </button>
            <button class="dt-btn dt-emode" data-emode="stroke" title="Erase by stroke">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18 C 8 8, 14 8, 20 18"/><path d="M3 21h18"/></svg>
              <span>stroke</span>
            </button>
          </div>
        </div>
        <span class="dt-sep"></span>
        <label class="dt-slider" title="Size">
          <span class="dt-lab">size</span>
          <input class="dt-size" type="range" min="0.5" max="20" step="0.5" value="2">
          <span class="dt-size-val">2</span>
        </label>
        <label class="dt-slider dt-stab" title="Stabilization — smoother strokes, slight lag">
          <span class="dt-lab">stab</span>
          <input class="dt-stabilize" type="range" min="0" max="0.95" step="0.05" value="0.55">
          <span class="dt-stab-val">0.55</span>
        </label>
        <label class="dt-slider dt-sharp" title="Tip sharpness — 0 soft curves, 1 sharp polyline">
          <span class="dt-lab">tip</span>
          <input class="dt-sharpness" type="range" min="0" max="1" step="0.05" value="0.5">
          <span class="dt-sharp-val">0.50</span>
        </label>
        <label class="dt-slider dt-taper" title="Fountain pen tip taper — narrow at start/end">
          <span class="dt-lab">taper</span>
          <input class="dt-taperv" type="range" min="0" max="1" step="0.05" value="0.7">
          <span class="dt-taper-val">0.70</span>
        </label>
        <span class="dt-sep"></span>
        <button class="dt-btn" data-act="undo" title="Undo (Ctrl+Z)">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6.7 3L3 13"/></svg>
        </button>
        <button class="dt-btn" data-act="redo" title="Redo (Ctrl+Shift+Z)">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6.7 3L21 13"/></svg>
        </button>
        <button class="dt-btn" data-act="clear" title="Clear slide">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>
        </button>
      </div>
    `;
    document.body.appendChild(tb);
    state.toolbar = tb;

    tb.addEventListener('click', (e) => {
      const tool = e.target.closest('[data-tool]');
      const emode = e.target.closest('[data-emode]');
      const pstyle = e.target.closest('[data-pstyle]');
      const act = e.target.closest('[data-act]');
      const color = e.target.closest('[data-color]');
      if (tool) setTool(tool.dataset.tool);
      else if (emode) setEraserMode(emode.dataset.emode);
      else if (pstyle) setPenStyle(pstyle.dataset.pstyle);
      else if (color) setColor(color.dataset.color);
      else if (act) {
        const a = act.dataset.act;
        if (a === 'toggle') toggle();
        else if (a === 'whiteboard') toggleWhiteboard();
        else if (a === 'wb-prev') wbGoTo(state.wbCurrent - 1);
        else if (a === 'wb-next') wbGoTo(state.wbCurrent + 1);
        else if (a === 'wb-add') wbAddPage();
        else if (a === 'wb-del') wbDeletePage();
        else if (a === 'undo') undo();
        else if (a === 'redo') redo();
        else if (a === 'clear') clearSlide();
        else if (a === 'shape-filled') {
          state.tools.shape.filled = !state.tools.shape.filled;
          syncToolbarToTool();
        } else if (a === 'shape-arrow') {
          state.tools.shape.arrow = !state.tools.shape.arrow;
          syncToolbarToTool();
        } else if (a === 'sel-lock') toggleLockSelection();
        else if (a === 'sel-del') deleteSelection();
        else if (a === 'sel-clear') clearSelection();
      }
    });

    tb.querySelector('.dt-shape-kind').addEventListener('change', (e) => {
      state.tools.shape.kind = e.target.value;
      syncToolbarToTool();
    });
    tb.querySelector('.dt-cells').addEventListener('input', (e) => {
      state.tools.shape.cells = +e.target.value || 1;
    });
    tb.querySelector('.dt-cols').addEventListener('input', (e) => {
      state.tools.shape.cols = +e.target.value || 1;
    });

    bindSlider(tb, '.dt-size', '.dt-size-val', 'size', v => v);
    bindSlider(tb, '.dt-stabilize', '.dt-stab-val', 'stabilize', v => (+v).toFixed(2));
    bindSlider(tb, '.dt-sharpness', '.dt-sharp-val', 'sharpness', v => (+v).toFixed(2));
    bindSlider(tb, '.dt-taperv', '.dt-taper-val', 'taper', v => (+v).toFixed(2));

    setTool('pen', { enable: false });
    updateWbCounter();
  }

  function bindSlider(tb, inputSel, valSel, prop, fmt) {
    const input = tb.querySelector(inputSel);
    const out = tb.querySelector(valSel);
    input.addEventListener('input', (e) => {
      const v = +e.target.value;
      curTool()[prop] = v;
      out.textContent = fmt(v);
    });
  }

  function bindKeys() {
    // capture-phase: intercept slide nav keys when in whiteboard mode
    document.addEventListener('keydown', (e) => {
      if (state.mode !== 'whiteboard') return;
      if (e.target.matches('input,textarea,select')) return;
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.stopPropagation(); e.preventDefault();
        wbGoTo(state.wbCurrent + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.stopPropagation(); e.preventDefault();
        wbGoTo(state.wbCurrent - 1);
      }
    }, true);

    document.addEventListener('keydown', (e) => {
      if (e.target.matches('input,textarea')) return;
      if (e.key === 'd' || e.key === 'D') { e.preventDefault(); toggle(); }
      else if (e.key === 'Escape' && state.enabled) {
        e.preventDefault();
        if (state.selected.size) clearSelection();
        else toggle(false);
      }
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        if (state.enabled) { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        if (state.enabled) { e.preventDefault(); redo(); }
      } else if (state.enabled && (e.key === 'p' || e.key === 'P')) setTool('pen');
      else if (state.enabled && (e.key === 'e' || e.key === 'E')) setTool('eraser');
      else if (state.enabled && (e.key === 's' || e.key === 'S')) setTool('shape');
      else if (state.enabled && (e.key === 'v' || e.key === 'V')) setTool('select');
      else if (state.enabled && (e.key === 'w' || e.key === 'W')) { e.preventDefault(); toggleWhiteboard(); }
      else if (state.enabled && state.tool === 'select' && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault(); toggleLockSelection();
      } else if (state.enabled && state.tool === 'select' && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault(); deleteSelection();
      }
    });
  }

  function bindSlideEvents() {
    document.querySelectorAll('.slide').forEach((s, i) => {
      s.addEventListener('slide:enter', () => {
        state.currentSlide = i;
        state.selected.clear();
        if (state.mode === 'slide') rebuildLayer();
      });
    });
  }

  // ----------------------------------------------------------- toolbar sync
  function setTool(t, opts = {}) {
    if (state.tool === 'select' && t !== 'select') state.selected.clear();
    state.tool = t;
    state.toolbar.querySelectorAll('[data-tool]').forEach(b => {
      b.classList.toggle('active', b.dataset.tool === t);
    });
    if (opts.enable !== false && !state.enabled) toggle(true);
    syncToolbarToTool();
    rebuildLayer();
  }

  function setColor(c) {
    if (state.tool === 'eraser') return;
    curTool().color = c;
    state.toolbar.querySelectorAll('[data-color]').forEach(b => {
      b.classList.toggle('active', b.dataset.color === c);
    });
  }

  function setEraserMode(m) {
    state.tools.eraser.mode = m;
    state.toolbar.querySelectorAll('[data-emode]').forEach(b => {
      b.classList.toggle('active', b.dataset.emode === m);
    });
  }

  function setPenStyle(st) {
    state.tools.pen.style = st;
    state.toolbar.querySelectorAll('[data-pstyle]').forEach(b => {
      b.classList.toggle('active', b.dataset.pstyle === st);
    });
    syncToolbarToTool();
  }

  function syncToolbarToTool() {
    const t = curTool();
    const tb = state.toolbar;
    setSlider(tb, '.dt-size', '.dt-size-val', t.size, t.min, t.max, t.step, v => v);

    const isEraser = state.tool === 'eraser';
    const isPen = state.tool === 'pen';
    const isShape = state.tool === 'shape';
    const isSelect = state.tool === 'select';
    const isFountain = isPen && t.style === 'fountain';

    tb.classList.toggle('eraser-mode', isEraser);
    tb.classList.toggle('pen-mode', isPen);
    tb.classList.toggle('shape-mode', isShape);
    tb.classList.toggle('select-mode', isSelect);
    tb.classList.toggle('fountain-mode', isFountain);

    // hide controls irrelevant to current tool
    setHidden(tb.querySelector('.dt-stab'), isEraser || isSelect || isShape);
    setHidden(tb.querySelector('.dt-sharp'), isEraser || isSelect || isShape);
    setHidden(tb.querySelector('.dt-taper'), !isFountain);
    setHidden(tb.querySelector('.dt-pen-styles'), !isPen);
    setHidden(tb.querySelector('.dt-shape-opts'), !isShape);
    setHidden(tb.querySelector('.dt-select-opts'), !isSelect);
    setHidden(tb.querySelector('.dt-erase-modes'), !isEraser);
    setHidden(tb.querySelector('.dt-colors'), isEraser || isSelect);
    setHidden(tb.querySelector('.dt-size').closest('.dt-slider'), isSelect);

    // shape opts
    const sh = state.tools.shape;
    tb.querySelector('.dt-shape-kind').value = sh.kind;
    tb.querySelector('.dt-cells').value = sh.cells;
    tb.querySelector('.dt-cols').value = sh.cols;
    tb.querySelector('.dt-shape-filled').classList.toggle('active', sh.filled);
    tb.querySelector('.dt-shape-arrow').classList.toggle('active', sh.arrow);
    const showCols = ['grid'].includes(sh.kind);
    const showCells = ['array', 'grid'].includes(sh.kind);
    const showArrow = ['line'].includes(sh.kind);
    tb.querySelector('.dt-shape-num:not(.dt-shape-cols)').style.display = showCells ? '' : 'none';
    tb.querySelector('.dt-shape-cols').style.display = showCols ? '' : 'none';
    tb.querySelector('.dt-shape-arrow').style.display = showArrow ? '' : 'none';

    if (!isEraser) {
      setSlider(tb, '.dt-stabilize', '.dt-stab-val', t.stabilize, 0, 0.95, 0.05,
                v => (+v).toFixed(2));
      setSlider(tb, '.dt-sharpness', '.dt-sharp-val', t.sharpness, 0, 1, 0.05,
                v => (+v).toFixed(2));
    }
    if (isFountain) {
      setSlider(tb, '.dt-taperv', '.dt-taper-val', t.taper ?? 0.7, 0, 1, 0.05,
                v => (+v).toFixed(2));
    }

    tb.querySelectorAll('[data-color]').forEach(b => {
      b.classList.toggle('active', t.color && b.dataset.color === t.color);
    });
    tb.querySelectorAll('[data-emode]').forEach(b => {
      b.classList.toggle('active', b.dataset.emode === state.tools.eraser.mode);
    });
    tb.querySelectorAll('[data-pstyle]').forEach(b => {
      b.classList.toggle('active', isPen && b.dataset.pstyle === t.style);
    });
  }

  function setHidden(el, hidden) {
    if (!el) return;
    el.classList.toggle('dt-hidden', !!hidden);
  }

  function setDisabled(el, dis) {
    if (!el) return;
    el.classList.toggle('dt-disabled', !!dis);
    el.querySelectorAll('input,select,button').forEach(c => {
      if (dis) c.setAttribute('disabled', '');
      else c.removeAttribute('disabled');
    });
  }

  function setSlider(tb, inputSel, valSel, value, min, max, step, fmt) {
    const input = tb.querySelector(inputSel);
    const out = tb.querySelector(valSel);
    input.min = min; input.max = max; input.step = step;
    input.value = value;
    out.textContent = fmt(value);
  }

  function toggle(force) {
    state.enabled = (force === undefined) ? !state.enabled : force;
    state.overlay.classList.toggle('active', state.enabled);
    state.toolbar.classList.toggle('active', state.enabled);
    const tg = state.toolbar.querySelector('.dt-toggle');
    if (tg) tg.classList.toggle('on', state.enabled);
  }

  function toggleWhiteboard(force) {
    const next = force === undefined
      ? (state.mode === 'whiteboard' ? 'slide' : 'whiteboard')
      : (force ? 'whiteboard' : 'slide');
    setMode(next);
  }

  function setMode(m) {
    state.mode = m;
    state.selected.clear();
    document.body.classList.toggle('wb-mode', m === 'whiteboard');
    state.toolbar.querySelector('.dt-wb').classList.toggle('on', m === 'whiteboard');
    state.toolbar.classList.toggle('whiteboard-mode', m === 'whiteboard');
    updateWbCounter();
    rebuildLayer();
  }

  function wbGoTo(i) {
    if (state.mode !== 'whiteboard') return;
    if (i < 0 || i >= state.wbStrokes.length) return;
    state.wbCurrent = i;
    state.selected.clear();
    updateWbCounter();
    rebuildLayer();
  }
  function wbAddPage() {
    if (state.mode !== 'whiteboard') return;
    state.wbStrokes.splice(state.wbCurrent + 1, 0, []);
    state.wbNodes.splice(state.wbCurrent + 1, 0, []);
    state.wbCurrent++;
    updateWbCounter();
    rebuildLayer();
  }
  function wbDeletePage() {
    if (state.mode !== 'whiteboard') return;
    if (state.wbStrokes.length <= 1) {
      // last page → just clear it
      state.wbStrokes[0] = [];
      state.wbNodes[0] = [];
      rebuildLayer();
      return;
    }
    state.wbStrokes.splice(state.wbCurrent, 1);
    state.wbNodes.splice(state.wbCurrent, 1);
    if (state.wbCurrent >= state.wbStrokes.length) state.wbCurrent = state.wbStrokes.length - 1;
    updateWbCounter();
    rebuildLayer();
  }

  function updateWbCounter() {
    const cur = document.getElementById('wb-cur');
    const tot = document.getElementById('wb-total');
    if (cur) cur.textContent = state.wbCurrent + 1;
    if (tot) tot.textContent = state.wbStrokes.length;
  }

  // ----------------------------------------------------------- input
  function eventToSvg(e) {
    const rect = state.svg.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (1280 / rect.width);
    const y = (e.clientY - rect.top) * (720 / rect.height);
    const pressure = (e.pointerType === 'pen' && e.pressure > 0) ? e.pressure : 0;
    return { x, y, t: e.timeStamp || performance.now(), p: pressure };
  }

  function getCoalesced(e) {
    if (e.getCoalescedEvents) {
      const c = e.getCoalescedEvents();
      if (c && c.length) return c.map(eventToSvg);
    }
    return [eventToSvg(e)];
  }

  function onDown(e) {
    if (!state.enabled) return;
    state.svg.setPointerCapture(e.pointerId);
    const p = eventToSvg(e);
    if (state.tool === 'select') {
      const idx = strokeIndexAt(p);
      const additive = e.shiftKey;
      if (idx >= 0) {
        if (additive) {
          if (state.selected.has(idx)) state.selected.delete(idx);
          else state.selected.add(idx);
        } else if (!state.selected.has(idx)) {
          state.selected.clear();
          state.selected.add(idx);
        }
        state.selectMode = 'move';
        state.moveStart = p;
        state.drawing = true;
        rebuildLayer();
        return;
      }
      // empty space → rubber-band
      if (!additive) state.selected.clear();
      state.selectMode = 'rubber';
      state.moveStart = p;
      state.drawing = true;
      spawnRubberBox(p);
      rebuildLayer();
      return;
    }
    if (state.tool === 'shape') {
      // tree-pull: click near rim of existing node → drag to spawn child
      if (state.tools.shape.kind === 'node') {
        const hit = nodeAtRim(p, 18);
        if (hit) {
          state.drawing = true;
          state.shapeMode = 'pull';
          state.pullParent = hit;
          state.pullEnd = p;
          spawnLivePullEdge();
          return;
        }
      }
      state.drawing = true;
      state.shapeMode = 'place';
      state.shapeAnchor = p;
      state.points = [p, p];
      spawnLiveShape();
      return;
    }
    if (state.tool === 'eraser') {
      state.drawing = true;
      if (state.tools.eraser.mode === 'stroke') eraseStrokeAt(p);
      else { state.points = [p]; state.filtered = { x: p.x, y: p.y }; spawnLivePath(); }
      return;
    }
    state.drawing = true;
    state.points = [p];
    state.filtered = { x: p.x, y: p.y };
    spawnLivePath();
  }

  function onMove(e) {
    if (!state.drawing) return;
    const raws = getCoalesced(e);

    if (state.tool === 'select') {
      const p = raws[raws.length - 1];
      if (state.selectMode === 'move') {
        const dx = p.x - state.moveStart.x;
        const dy = p.y - state.moveStart.y;
        translateSelection(dx, dy);
        state.moveStart = p;
        rebuildLayer();
      } else if (state.selectMode === 'rubber') {
        updateRubberBox(state.moveStart, p);
      }
      return;
    }

    if (state.tool === 'shape') {
      const p = raws[raws.length - 1];
      if (state.shapeMode === 'pull') {
        state.pullEnd = p;
        updateLivePullEdge();
        return;
      }
      state.points = [state.shapeAnchor, p];
      updateLiveShape();
      return;
    }

    if (state.tool === 'eraser' && state.tools.eraser.mode === 'stroke') {
      raws.forEach(eraseStrokeAt);
      return;
    }

    const t = curTool();
    const a = t.stabilize || 0;
    for (const raw of raws) {
      const f = state.filtered;
      f.x = f.x * a + raw.x * (1 - a);
      f.y = f.y * a + raw.y * (1 - a);
      const last = state.points[state.points.length - 1];
      const dx = f.x - last.x, dy = f.y - last.y;
      if (dx * dx + dy * dy < 0.25) continue;
      state.points.push({ x: f.x, y: f.y, t: raw.t, p: raw.p });
    }
    updateLivePath();
  }

  function onUp(e) {
    if (!state.drawing) return;
    state.drawing = false;

    if (state.tool === 'select') {
      if (state.selectMode === 'rubber') {
        const p = e ? eventToSvg(e) : state.moveStart;
        finalizeRubberBox(state.moveStart, p, e && e.shiftKey);
        clearRubberBox();
      }
      state.selectMode = null;
      state.moveStart = null;
      rebuildLayer();
      return;
    }

    if (state.tool === 'shape') {
      if (state.shapeMode === 'pull') {
        const parent = state.pullParent;
        const end = e ? eventToSvg(e) : state.pullEnd;
        const c = nodeCenter(parent);
        const r = nodeRadius(parent);
        const d = Math.hypot(end.x - c.x, end.y - c.y);
        clearLivePullEdge();
        state.shapeMode = null;
        state.pullParent = null;
        if (d < r + 24) return; // too short → cancel
        commitChildFromParent(parent, end);
        return;
      }
      const a = state.shapeAnchor;
      const b = e ? eventToSvg(e) : state.points[state.points.length - 1];
      const dx = b.x - a.x, dy = b.y - a.y;
      if (Math.hypot(dx, dy) < 4) { removeLivePath(); return; }
      commitShape(a, b);
      removeLivePath();
      return;
    }

    if (state.tool === 'eraser') {
      if (state.tools.eraser.mode === 'pixel') {
        // commit pixel-erase as a stroke (renders as cut over inked layer via mask)
        commitStroke();
      }
      removeLivePath();
      return;
    }

    if (e && state.points.length) {
      state.points.push(eventToSvg(e)); // sharp tip on lift
    }
    if (state.points.length < 1) { state.points = []; removeLivePath(); return; }
    commitStroke();
    removeLivePath();
  }

  // ----------------------------------------------------------- stroke commit
  function spawnLivePath() {
    const t = curTool();
    const path = document.createElementNS(SVGNS, 'path');
    applyAttrs(path, {
      tool: state.tool, color: t.color, size: t.size,
    });
    const target = state.tool === 'eraser' ? state.eraseLayer : state.inkLayer;
    target.appendChild(path);
    state.livePath = path;
    updateLivePath();
  }

  function updateLivePath() {
    if (!state.livePath) return;
    const t = curTool();
    const liveStroke = {
      tool: state.tool,
      points: state.points,
      size: t.size,
      sharpness: t.sharpness ?? 0.5,
      style: t.style,
      taper: t.taper,
    };
    state.livePath.setAttribute('d', buildPathFor(liveStroke));
  }

  function removeLivePath() {
    if (state.livePath && state.livePath.parentNode) {
      state.livePath.parentNode.removeChild(state.livePath);
    }
    state.livePath = null;
    state.points = [];
  }

  function commitStroke() {
    clearRedo();
    const t = curTool();
    const stroke = {
      tool: state.tool,
      color: t.color,
      size: t.size,
      sharpness: t.sharpness ?? 0.5,
      style: t.style,
      taper: t.taper,
      points: state.points.slice(),
    };
    const list = curStrokes();
    const nodes = curNodesArr();

    const path = document.createElementNS(SVGNS, 'path');
    applyAttrs(path, stroke);
    path.setAttribute('d', buildPathFor(stroke));
    const target = stroke.tool === 'eraser' ? state.eraseLayer : state.inkLayer;
    target.appendChild(path);

    list.push(stroke);
    nodes.push(path);
  }

  function applyAttrs(path, s) {
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    if (s.tool === 'highlighter') {
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', s.color);
      path.setAttribute('stroke-width', s.size);
      path.setAttribute('stroke-opacity', '0.32');
      path.style.mixBlendMode = 'multiply';
    } else if (s.tool === 'eraser') {
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', '#000');
      path.setAttribute('stroke-width', s.size);
    } else if (s.tool === 'pen' && s.style === 'fountain') {
      // ribbon polygon — fill, no stroke
      path.setAttribute('fill', s.color);
      path.setAttribute('stroke', 'none');
    } else {
      // ballpoint pen
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', s.color);
      path.setAttribute('stroke-width', s.size);
    }
  }

  // ----------------------------------------------------------- path builders
  function buildPathFor(s) {
    if (s.tool === 'pen' && s.style === 'fountain') {
      return buildFountainRibbon(s);
    }
    return buildSmoothPath(s.points, s.sharpness ?? 0.5);
  }

  // Catmull-Rom-to-Bezier centerline path.
  function buildSmoothPath(pts, sharpness) {
    if (!pts.length) return '';
    if (pts.length === 1) {
      const p = pts[0];
      return `M ${p.x} ${p.y} L ${p.x + 0.01} ${p.y + 0.01}`;
    }
    if (pts.length === 2) {
      return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
    }
    const k = (1 - clamp(sharpness, 0, 1)) * (2 / 3);
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const c1x = p1.x + (p2.x - p0.x) * k;
      const c1y = p1.y + (p2.y - p0.y) * k;
      const c2x = p2.x - (p3.x - p1.x) * k;
      const c2y = p2.y - (p3.y - p1.y) * k;
      d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  }

  // Fountain pen: dense centerline resample, variable width by velocity/pressure,
  // taper at ends, output filled ribbon polygon for buttery curves.
  function buildFountainRibbon(s) {
    const raw = s.points;
    if (!raw.length) return '';
    if (raw.length === 1) {
      const p = raw[0];
      const r = Math.max(0.4, s.size / 2);
      return circleD(p.x, p.y, r);
    }

    const sharpness = s.sharpness ?? 0.35;
    const center = resampleCentermline(raw, sharpness, 2.0); // step ~2 svg-units
    if (center.length < 2) return circleD(raw[0].x, raw[0].y, s.size / 2);

    // velocity per centerline sample
    const vels = computeVelocities(center);
    const smoothedVel = smoothArray(vels, 5);

    // width per sample
    const baseW = s.size;
    const minW = baseW * 0.35;
    const maxW = baseW * 1.15;
    const taper = clamp(s.taper ?? 0.7, 0, 1);
    const widths = new Array(center.length);
    const n = center.length;
    for (let i = 0; i < n; i++) {
      // velocity → width inverse: faster = thinner
      const v = smoothedVel[i];
      const vNorm = clamp(v / 1.5, 0, 1); // 1.5 svg-unit/ms = fast
      let w = maxW - (maxW - minW) * vNorm;

      // pressure override if present
      const pr = center[i].p || 0;
      if (pr > 0) {
        w = minW + (maxW - minW) * pr;
      }

      // end taper — narrow at first/last few samples
      const taperRange = Math.min(8, Math.floor(n * 0.15));
      if (taperRange > 0) {
        const headT = clamp(i / taperRange, 0, 1);
        const tailT = clamp((n - 1 - i) / taperRange, 0, 1);
        const tEnd = Math.min(headT, tailT);
        w *= 1 - taper * (1 - tEnd);
      }

      widths[i] = Math.max(0.1, w);
    }

    // build offset polygon
    const left = [];
    const right = [];
    for (let i = 0; i < n; i++) {
      const p = center[i];
      let tx, ty;
      if (i === 0) { tx = center[1].x - p.x; ty = center[1].y - p.y; }
      else if (i === n - 1) { tx = p.x - center[i - 1].x; ty = p.y - center[i - 1].y; }
      else { tx = center[i + 1].x - center[i - 1].x; ty = center[i + 1].y - center[i - 1].y; }
      const len = Math.hypot(tx, ty) || 1;
      const nx = -ty / len, ny = tx / len; // perpendicular
      const half = widths[i] / 2;
      left.push({ x: p.x + nx * half, y: p.y + ny * half });
      right.push({ x: p.x - nx * half, y: p.y - ny * half });
    }

    // emit: forward along left edge (smooth), arc-cap, reverse along right edge, arc-cap
    let d = `M ${left[0].x} ${left[0].y}`;
    for (let i = 1; i < left.length; i++) {
      const a = left[i - 1], b = left[i];
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      d += ` Q ${a.x} ${a.y} ${mx} ${my}`;
    }
    d += ` L ${left[left.length - 1].x} ${left[left.length - 1].y}`;
    // tail cap
    const tail = center[n - 1];
    const tailR = widths[n - 1] / 2;
    d += ` A ${tailR} ${tailR} 0 0 1 ${right[n - 1].x} ${right[n - 1].y}`;
    // back along right
    for (let i = right.length - 2; i >= 0; i--) {
      const a = right[i + 1], b = right[i];
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      d += ` Q ${a.x} ${a.y} ${mx} ${my}`;
    }
    d += ` L ${right[0].x} ${right[0].y}`;
    // head cap
    const head = center[0];
    const headR = widths[0] / 2;
    d += ` A ${headR} ${headR} 0 0 1 ${left[0].x} ${left[0].y}`;
    d += ' Z';
    return d;
  }

  function circleD(cx, cy, r) {
    return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
  }

  // Sample centerline via Catmull-Rom curve at fixed arc-length step.
  function resampleCentermline(pts, sharpness, step) {
    if (pts.length < 2) return pts.slice();
    const k = (1 - clamp(sharpness, 0, 1)) * (2 / 3);
    const out = [{ x: pts[0].x, y: pts[0].y, t: pts[0].t, p: pts[0].p }];
    let leftover = 0;

    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const c1x = p1.x + (p2.x - p0.x) * k;
      const c1y = p1.y + (p2.y - p0.y) * k;
      const c2x = p2.x - (p3.x - p1.x) * k;
      const c2y = p2.y - (p3.y - p1.y) * k;

      // adaptive sample count based on chord length
      const chord = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const samples = Math.max(2, Math.ceil(chord / step) * 2);
      let prev = { x: p1.x, y: p1.y };
      for (let j = 1; j <= samples; j++) {
        const u = j / samples;
        const x = bez(p1.x, c1x, c2x, p2.x, u);
        const y = bez(p1.y, c1y, c2y, p2.y, u);
        const dx = x - prev.x, dy = y - prev.y;
        const dist = Math.hypot(dx, dy);
        leftover += dist;
        if (leftover >= step) {
          const tInterp = lerp(p1.t || 0, p2.t || 0, u);
          const pInterp = lerp(p1.p || 0, p2.p || 0, u);
          out.push({ x, y, t: tInterp, p: pInterp });
          leftover = 0;
        }
        prev = { x, y };
      }
    }
    const last = pts[pts.length - 1];
    out.push({ x: last.x, y: last.y, t: last.t, p: last.p });
    return out;
  }

  function bez(p0, p1, p2, p3, u) {
    const v = 1 - u;
    return v*v*v*p0 + 3*v*v*u*p1 + 3*v*u*u*p2 + u*u*u*p3;
  }
  function lerp(a, b, u) { return a + (b - a) * u; }

  function computeVelocities(pts) {
    const v = new Array(pts.length).fill(0);
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i].x - pts[i - 1].x;
      const dy = pts[i].y - pts[i - 1].y;
      const dt = Math.max(1, (pts[i].t || 0) - (pts[i - 1].t || 0));
      v[i] = Math.hypot(dx, dy) / dt;
    }
    v[0] = v[1] || 0;
    return v;
  }

  function smoothArray(arr, window) {
    const out = new Array(arr.length);
    const r = Math.floor(window / 2);
    for (let i = 0; i < arr.length; i++) {
      let sum = 0, count = 0;
      for (let j = i - r; j <= i + r; j++) {
        if (j >= 0 && j < arr.length) { sum += arr[j]; count++; }
      }
      out[i] = sum / count;
    }
    return out;
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // ----------------------------------------------------------- tree helpers
  function getTreeNodes() {
    const list = curStrokes();
    return list.filter(s => s.tool === 'shape' && s.kind === 'node');
  }

  // node hit-test: pointer near rim within hitTol → return node + radius.
  function nodeAtRim(p, tol) {
    const nodes = getTreeNodes();
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const c = nodeCenter(n), r = nodeRadius(n);
      const d = Math.hypot(p.x - c.x, p.y - c.y);
      if (d >= r - tol && d <= r + tol * 2) return n;
    }
    return null;
  }

  function appendStroke(s) {
    clearRedo();
    const list = curStrokes();
    const nodes = curNodesArr();
    list.push(s);
    const node = document.createElementNS(SVGNS, 'g');
    node.classList.add('dt-shape');
    renderShapeInto(node, s.kind, s.a || { x: 0, y: 0 }, s.b || { x: 0, y: 0 }, s);
    state.inkLayer.appendChild(node);
    nodes.push(node);
  }

  // ----------------------------------------------------------- select / lock
  function strokeBBox(s) {
    if (s.tool === 'shape' && s.kind === 'edge') {
      const from = findNodeById(s.from), to = findNodeById(s.to);
      if (!from || !to) return null;
      const c1 = nodeCenter(from), c2 = nodeCenter(to);
      return { x1: Math.min(c1.x, c2.x), y1: Math.min(c1.y, c2.y),
               x2: Math.max(c1.x, c2.x), y2: Math.max(c1.y, c2.y) };
    }
    if (s.tool === 'shape' && s.a && s.b) {
      return { x1: Math.min(s.a.x, s.b.x), y1: Math.min(s.a.y, s.b.y),
               x2: Math.max(s.a.x, s.b.x), y2: Math.max(s.a.y, s.b.y) };
    }
    if (s.points && s.points.length) {
      let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
      const pad = (s.size || 2) / 2;
      for (const p of s.points) {
        if (p.x < x1) x1 = p.x; if (p.x > x2) x2 = p.x;
        if (p.y < y1) y1 = p.y; if (p.y > y2) y2 = p.y;
      }
      return { x1: x1 - pad, y1: y1 - pad, x2: x2 + pad, y2: y2 + pad };
    }
    return null;
  }

  function strokeIndexAt(p) {
    const list = curStrokes();
    const tol = 8;
    for (let i = list.length - 1; i >= 0; i--) {
      const s = list[i];
      if (s.locked) continue;
      // node: circle hit
      if (s.tool === 'shape' && s.kind === 'node') {
        const c = nodeCenter(s), r = nodeRadius(s);
        if (Math.hypot(p.x - c.x, p.y - c.y) <= r + tol) return i;
        continue;
      }
      // edge: distance to segment
      if (s.tool === 'shape' && s.kind === 'edge') {
        const from = findNodeById(s.from), to = findNodeById(s.to);
        if (!from || !to) continue;
        const c1 = nodeCenter(from), c2 = nodeCenter(to);
        if (segDistSq(c1, c2, p) <= tol * tol) return i;
        continue;
      }
      const bb = strokeBBox(s);
      if (!bb) continue;
      if (p.x >= bb.x1 - tol && p.x <= bb.x2 + tol &&
          p.y >= bb.y1 - tol && p.y <= bb.y2 + tol) {
        // pen/highlighter: refine via segment distance
        if (s.points) {
          const tol2 = (tol + (s.size || 2) / 2) ** 2;
          for (let j = 0; j < s.points.length - 1; j++) {
            if (segDistSq(s.points[j], s.points[j + 1], p) <= tol2) return i;
          }
          continue;
        }
        return i;
      }
    }
    return -1;
  }

  function translateSelection(dx, dy) {
    const list = curStrokes();
    state.selected.forEach(i => {
      const s = list[i];
      if (!s || s.locked) return;
      if (s.tool === 'shape' && s.kind === 'edge') return; // edge follows nodes
      if (s.a) { s.a.x += dx; s.a.y += dy; }
      if (s.b) { s.b.x += dx; s.b.y += dy; }
      if (s.points) {
        for (const p of s.points) { p.x += dx; p.y += dy; }
      }
    });
  }

  function spawnRubberBox(p) {
    const r = svgEl('rect', {
      x: p.x, y: p.y, width: 0, height: 0,
      fill: 'rgba(29,63,182,0.08)', stroke: 'rgba(29,63,182,0.7)',
      'stroke-width': 1, 'stroke-dasharray': '4 3',
    });
    state.hintLayer.appendChild(r);
    state.rubberBox = r;
  }
  function updateRubberBox(a, b) {
    if (!state.rubberBox) return;
    const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
    const w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y);
    state.rubberBox.setAttribute('x', x);
    state.rubberBox.setAttribute('y', y);
    state.rubberBox.setAttribute('width', w);
    state.rubberBox.setAttribute('height', h);
  }
  function clearRubberBox() {
    if (state.rubberBox && state.rubberBox.parentNode) {
      state.rubberBox.parentNode.removeChild(state.rubberBox);
    }
    state.rubberBox = null;
  }
  function finalizeRubberBox(a, b, additive) {
    const x1 = Math.min(a.x, b.x), y1 = Math.min(a.y, b.y);
    const x2 = Math.max(a.x, b.x), y2 = Math.max(a.y, b.y);
    if (Math.abs(x2 - x1) < 3 && Math.abs(y2 - y1) < 3) return;
    if (!additive) state.selected.clear();
    const list = curStrokes();
    list.forEach((s, i) => {
      if (s.locked) return;
      const bb = strokeBBox(s);
      if (!bb) return;
      if (bb.x1 >= x1 && bb.x2 <= x2 && bb.y1 >= y1 && bb.y2 <= y2) {
        state.selected.add(i);
      }
    });
  }

  function clearSelection() {
    state.selected.clear();
    rebuildLayer();
  }

  function deleteSelection() {
    const list = curStrokes();
    if (!list) return;
    clearRedo();
    const idx = Array.from(state.selected).sort((a, b) => b - a);
    idx.forEach(i => {
      const s = list[i];
      if (s && !s.locked) list.splice(i, 1);
    });
    state.selected.clear();
    rebuildLayer();
  }

  function toggleLockSelection() {
    const list = curStrokes();
    if (!list || !state.selected.size) return;
    // if any selected unlocked → lock all; else unlock all
    let anyUnlocked = false;
    state.selected.forEach(i => { if (list[i] && !list[i].locked) anyUnlocked = true; });
    state.selected.forEach(i => {
      if (list[i]) list[i].locked = anyUnlocked;
    });
    if (anyUnlocked) state.selected.clear(); // locked → deselect
    rebuildLayer();
  }

  // selection ring overlay — drawn into hint layer
  function renderSelectionRings() {
    const layer = state.hintLayer;
    if (!layer) return;
    [...layer.querySelectorAll('.dt-sel-ring')].forEach(n => n.remove());
    if (state.tool !== 'select') return;
    const list = curStrokes();
    state.selected.forEach(i => {
      const s = list[i];
      if (!s) return;
      const bb = strokeBBox(s);
      if (!bb) return;
      const pad = 6;
      const r = svgEl('rect', {
        class: 'dt-sel-ring',
        x: bb.x1 - pad, y: bb.y1 - pad,
        width: bb.x2 - bb.x1 + pad * 2, height: bb.y2 - bb.y1 + pad * 2,
        fill: 'none', stroke: '#1d3fb6', 'stroke-width': 1.5,
        'stroke-dasharray': '5 4', rx: 3, ry: 3,
      });
      layer.appendChild(r);
    });
    // also lock indicator on locked strokes
    list.forEach(s => {
      if (!s.locked) return;
      const bb = strokeBBox(s);
      if (!bb) return;
      const r = svgEl('rect', {
        class: 'dt-sel-ring',
        x: bb.x1 - 3, y: bb.y1 - 3,
        width: bb.x2 - bb.x1 + 6, height: bb.y2 - bb.y1 + 6,
        fill: 'none', stroke: '#999', 'stroke-width': 1,
        'stroke-dasharray': '2 4', rx: 2, ry: 2,
      });
      layer.appendChild(r);
    });
  }

  // ----------------------------------------------------------- pull-edge
  function spawnLivePullEdge() {
    const layer = state.hintLayer;
    while (layer.firstChild) layer.removeChild(layer.firstChild);
    const line = svgEl('line', {
      stroke: state.tools.shape.color,
      'stroke-width': state.tools.shape.size,
      'stroke-dasharray': '6 5',
      'stroke-linecap': 'round',
    });
    layer.appendChild(line);
    const ghost = svgEl('circle', {
      r: 18, fill: 'rgba(0,0,0,0.06)',
      stroke: state.tools.shape.color,
      'stroke-width': 1.5, 'stroke-dasharray': '4 4',
    });
    layer.appendChild(ghost);
    state.pullLine = line;
    state.pullGhost = ghost;
    updateLivePullEdge();
  }

  function updateLivePullEdge() {
    if (!state.pullLine) return;
    const c = nodeCenter(state.pullParent);
    const r = nodeRadius(state.pullParent);
    const end = state.pullEnd;
    const dx = end.x - c.x, dy = end.y - c.y;
    const d = Math.hypot(dx, dy) || 1;
    const ux = dx / d, uy = dy / d;
    state.pullLine.setAttribute('x1', c.x + ux * r);
    state.pullLine.setAttribute('y1', c.y + uy * r);
    state.pullLine.setAttribute('x2', end.x);
    state.pullLine.setAttribute('y2', end.y);
    state.pullGhost.setAttribute('cx', end.x);
    state.pullGhost.setAttribute('cy', end.y);
  }

  function clearLivePullEdge() {
    const layer = state.hintLayer;
    if (layer) while (layer.firstChild) layer.removeChild(layer.firstChild);
    state.pullLine = null;
    state.pullGhost = null;
  }

  function commitChildFromParent(parent, end) {
    const t = state.tools.shape;
    const r = nodeRadius(parent);
    const id = 'n' + Math.random().toString(36).slice(2, 9);
    const groupId = 'g' + Math.random().toString(36).slice(2, 9);
    const child = {
      tool: 'shape', kind: 'node', id, groupId,
      a: { x: end.x - r, y: end.y - r },
      b: { x: end.x + r, y: end.y + r },
      r, color: t.color, size: t.size, filled: t.filled,
    };
    const edge = {
      tool: 'shape', kind: 'edge', groupId,
      from: parent.id, to: id,
      color: t.color, size: t.size,
    };
    appendStroke(child);
    appendStroke(edge);
  }

  // ----------------------------------------------------------- shape tool
  function spawnLiveShape() {
    const g = document.createElementNS(SVGNS, 'g');
    g.classList.add('dt-shape-live');
    state.inkLayer.appendChild(g);
    state.livePath = g;
    updateLiveShape();
  }

  function updateLiveShape() {
    if (!state.livePath) return;
    const g = state.livePath;
    while (g.firstChild) g.removeChild(g.firstChild);
    const sh = state.tools.shape;
    const a = state.points[0], b = state.points[1];
    renderShapeInto(g, sh.kind, a, b, sh);
  }

  function commitShape(a, b) {
    clearRedo();
    const t = state.tools.shape;
    const stroke = {
      tool: 'shape',
      kind: t.kind,
      a: { x: a.x, y: a.y },
      b: { x: b.x, y: b.y },
      color: t.color,
      size: t.size,
      cells: t.cells,
      cols: t.cols,
      filled: t.filled,
      arrow: t.arrow,
    };
    if (t.kind === 'node') {
      stroke.id = 'n' + Math.random().toString(36).slice(2, 9);
      stroke.r = Math.max(8,
        Math.min(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) / 2);
    }
    const list = curStrokes();
    const nodes = curNodesArr();

    list.push(stroke);
    const g = document.createElementNS(SVGNS, 'g');
    g.classList.add('dt-shape');
    renderShapeInto(g, stroke.kind, stroke.a, stroke.b, stroke);
    state.inkLayer.appendChild(g);
    nodes.push(g);
  }

  function renderShapeInto(g, kind, a, b, opt) {
    if (kind === 'edge') return drawEdge(g, opt);
    if (!a || !b) return;
    const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
    const w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y);
    const stroke = opt.color, sw = opt.size;
    const fill = opt.filled ? opt.color : 'none';

    switch (kind) {
      case 'line':     return drawLine(g, a, b, opt);
      case 'rect':     return drawRect(g, x, y, w, h, stroke, sw, fill);
      case 'circle':   return drawCircle(g, a, b, stroke, sw, fill);
      case 'triangle': return drawTriangle(g, x, y, w, h, stroke, sw, fill);
      case 'array':    return drawArray(g, x, y, w, h, opt);
      case 'grid':     return drawGrid(g, x, y, w, h, opt);
      case 'node':     return drawNode(g, a, b, opt);
    }
  }

  function svgEl(name, attrs) {
    const e = document.createElementNS(SVGNS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function drawLine(g, a, b, opt) {
    g.appendChild(svgEl('line', {
      x1: a.x, y1: a.y, x2: b.x, y2: b.y,
      stroke: opt.color, 'stroke-width': opt.size, 'stroke-linecap': 'round',
    }));
    if (opt.arrow) {
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const head = Math.max(8, opt.size * 4);
      const ax = b.x - Math.cos(ang) * head;
      const ay = b.y - Math.sin(ang) * head;
      const w = head * 0.5;
      const lx = ax - Math.sin(ang) * w, ly = ay + Math.cos(ang) * w;
      const rx = ax + Math.sin(ang) * w, ry = ay - Math.cos(ang) * w;
      g.appendChild(svgEl('polygon', {
        points: `${b.x},${b.y} ${lx},${ly} ${rx},${ry}`,
        fill: opt.color, stroke: opt.color, 'stroke-width': opt.size,
        'stroke-linejoin': 'round',
      }));
    }
  }

  function drawRect(g, x, y, w, h, stroke, sw, fill) {
    g.appendChild(svgEl('rect', {
      x, y, width: w, height: h, stroke, 'stroke-width': sw, fill,
      rx: 2, ry: 2,
    }));
  }

  function drawCircle(g, a, b, stroke, sw, fill) {
    const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    const rx = Math.abs(b.x - a.x) / 2, ry = Math.abs(b.y - a.y) / 2;
    g.appendChild(svgEl('ellipse', { cx, cy, rx, ry, stroke, 'stroke-width': sw, fill }));
  }

  function drawTriangle(g, x, y, w, h, stroke, sw, fill) {
    const pts = `${x + w / 2},${y} ${x + w},${y + h} ${x},${y + h}`;
    g.appendChild(svgEl('polygon', {
      points: pts, stroke, 'stroke-width': sw, fill, 'stroke-linejoin': 'round',
    }));
  }

  function drawArray(g, x, y, w, h, opt) {
    const n = Math.max(1, opt.cells | 0);
    const cw = w / n;
    for (let i = 0; i < n; i++) {
      g.appendChild(svgEl('rect', {
        x: x + i * cw, y, width: cw, height: h,
        stroke: opt.color, 'stroke-width': opt.size,
        fill: opt.filled ? opt.color : 'none',
      }));
      g.appendChild(svgEl('text', {
        x: x + i * cw + cw / 2, y: y + h + 16,
        'text-anchor': 'middle', 'font-family': 'JetBrains Mono, monospace',
        'font-size': 12, fill: opt.color,
      })).textContent = i;
    }
  }

  function drawGrid(g, x, y, w, h, opt) {
    const rows = Math.max(1, opt.cells | 0);
    const cols = Math.max(1, opt.cols | 0);
    const cw = w / cols, ch = h / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        g.appendChild(svgEl('rect', {
          x: x + c * cw, y: y + r * ch, width: cw, height: ch,
          stroke: opt.color, 'stroke-width': opt.size,
          fill: opt.filled ? opt.color : 'none',
        }));
      }
    }
  }

  function drawNode(g, a, b, opt) {
    const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    let r;
    if (opt.r) r = opt.r;
    else r = Math.max(8, Math.min(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) / 2);
    g.appendChild(svgEl('circle', {
      cx, cy, r,
      stroke: opt.color, 'stroke-width': opt.size,
      fill: opt.filled ? opt.color : '#fff',
    }));
  }

  // edge between two nodes, resolved by id at render time
  function drawEdge(g, opt) {
    const from = findNodeById(opt.from);
    const to = findNodeById(opt.to);
    if (!from || !to) return;
    const c1 = nodeCenter(from), c2 = nodeCenter(to);
    const r1 = nodeRadius(from), r2 = nodeRadius(to);
    const dx = c2.x - c1.x, dy = c2.y - c1.y;
    const d = Math.hypot(dx, dy) || 1;
    const ux = dx / d, uy = dy / d;
    g.appendChild(svgEl('line', {
      x1: c1.x + ux * r1, y1: c1.y + uy * r1,
      x2: c2.x - ux * r2, y2: c2.y - uy * r2,
      stroke: opt.color, 'stroke-width': opt.size, 'stroke-linecap': 'round',
    }));
  }

  function findNodeById(id) {
    const list = curStrokes();
    return list.find(s => s.tool === 'shape' && s.kind === 'node' && s.id === id);
  }
  function nodeCenter(s) { return { x: (s.a.x + s.b.x) / 2, y: (s.a.y + s.b.y) / 2 }; }
  function nodeRadius(s) {
    if (s.r) return s.r;
    return Math.max(8, Math.min(Math.abs(s.b.x - s.a.x), Math.abs(s.b.y - s.a.y)) / 2);
  }

  // ----------------------------------------------------------- erase / undo
  function eraseStrokeAt(p) {
    const list = curStrokes();
    const nodes = curNodesArr();
    if (!list || !list.length) return;
    clearRedo();
    const r = state.tools.eraser.size;
    const removedIds = new Set();
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].locked) continue;
      if (strokeHitsPoint(list[i], p, r)) {
        if (list[i].kind === 'node' && list[i].id) removedIds.add(list[i].id);
        const node = nodes[i];
        if (node && node.parentNode) node.parentNode.removeChild(node);
        list.splice(i, 1);
        nodes.splice(i, 1);
      }
    }
    // erase node only — leave edges in list. drawEdge skips when endpoint missing.
    if (removedIds.size) rebuildLayer();
  }

  function strokeHitsPoint(s, p, r) {
    if (s.tool === 'shape') {
      if (s.kind === 'edge') return false;
      if (!s.a || !s.b) return false;
      // node: circular hit (must be inside node radius + small tol)
      if (s.kind === 'node') {
        const c = nodeCenter(s), nr = nodeRadius(s);
        const d = Math.hypot(p.x - c.x, p.y - c.y);
        return d <= nr + Math.min(4, r * 0.3);
      }
      // other shapes: bbox with tol
      const x1 = Math.min(s.a.x, s.b.x), y1 = Math.min(s.a.y, s.b.y);
      const x2 = Math.max(s.a.x, s.b.x), y2 = Math.max(s.a.y, s.b.y);
      return p.x >= x1 - r && p.x <= x2 + r && p.y >= y1 - r && p.y <= y2 + r;
    }
    const tol = r + (s.size || 0) / 2;
    const tol2 = tol * tol;
    const pts = s.points;
    if (!pts) return false;
    for (let i = 0; i < pts.length - 1; i++) {
      if (segDistSq(pts[i], pts[i + 1], p) <= tol2) return true;
    }
    if (pts.length === 1) {
      const dx = pts[0].x - p.x, dy = pts[0].y - p.y;
      return dx * dx + dy * dy <= tol2;
    }
    return false;
  }

  function segDistSq(a, b, p) {
    const vx = b.x - a.x, vy = b.y - a.y;
    const wx = p.x - a.x, wy = p.y - a.y;
    const c1 = vx * wx + vy * wy;
    if (c1 <= 0) return wx * wx + wy * wy;
    const c2 = vx * vx + vy * vy;
    if (c2 <= c1) {
      const dx = p.x - b.x, dy = p.y - b.y;
      return dx * dx + dy * dy;
    }
    const t = c1 / c2;
    const px = a.x + t * vx, py = a.y + t * vy;
    const dx = p.x - px, dy = p.y - py;
    return dx * dx + dy * dy;
  }

  function rebuildLayer() {
    while (state.inkLayer.firstChild) state.inkLayer.removeChild(state.inkLayer.firstChild);
    while (state.eraseLayer.firstChild) state.eraseLayer.removeChild(state.eraseLayer.firstChild);
    const list = curStrokes();
    const nodes = [];
    list.forEach(s => {
      let node;
      if (s.tool === 'shape') {
        node = document.createElementNS(SVGNS, 'g');
        node.classList.add('dt-shape');
        renderShapeInto(node, s.kind, s.a, s.b, s);
        state.inkLayer.appendChild(node);
      } else {
        node = document.createElementNS(SVGNS, 'path');
        applyAttrs(node, s);
        node.setAttribute('d', buildPathFor(s));
        const target = s.tool === 'eraser' ? state.eraseLayer : state.inkLayer;
        target.appendChild(node);
      }
      nodes.push(node);
    });
    setCurNodesArr(nodes);
    renderSelectionRings();
  }

  function curRedoStack() {
    const bucket = state.mode === 'whiteboard' ? state.redoStack.wb : state.redoStack.slide;
    const key = state.mode === 'whiteboard' ? state.wbCurrent : state.currentSlide;
    if (!bucket[key]) bucket[key] = [];
    return bucket[key];
  }

  function clearRedo() { curRedoStack().length = 0; }

  function undo() {
    const list = curStrokes();
    if (!list || !list.length) return;
    const popped = list.pop();
    curRedoStack().push(popped);
    rebuildLayer();
  }

  function redo() {
    const stack = curRedoStack();
    if (!stack.length) return;
    const s = stack.pop();
    curStrokes().push(s);
    rebuildLayer();
  }

  function clearSlide() {
    if (state.mode === 'whiteboard') {
      state.wbStrokes[state.wbCurrent] = [];
      state.wbNodes[state.wbCurrent] = [];
    } else {
      state.strokes[state.currentSlide] = [];
      state.nodes[state.currentSlide] = [];
    }
    while (state.inkLayer.firstChild) state.inkLayer.removeChild(state.inkLayer.firstChild);
    while (state.eraseLayer.firstChild) state.eraseLayer.removeChild(state.eraseLayer.firstChild);
  }

  DrawTool.init = init;
  DrawTool.toggle = toggle;
  window.DrawTool = DrawTool;
})();
