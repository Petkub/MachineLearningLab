// Segment tree visualizer — tree of intervals, array leaves.
// data-widget="segtree-vis"
// data-values="3,1,4,1,5,9,2,6"
// data-mode="static" | "build" | "query" | "update"
// data-l, data-r (query mode)
// data-idx, data-val (update mode)
(function () {
  const svgNS = 'http://www.w3.org/2000/svg';

  function mount(el) {
    const values = (el.dataset.values || '3,1,4,1,5,9,2,6')
      .split(',').map(s => parseInt(s.trim(), 10));
    const mode = el.dataset.mode || 'static';
    const ql = parseInt(el.dataset.l || '1', 10);
    const qr = parseInt(el.dataset.r || values.length, 10);
    const upIdx = parseInt(el.dataset.idx || '1', 10);
    const upVal = parseInt(el.dataset.val || '0', 10);

    const n = values.length;
    const seg = new Array(4 * n).fill(0);

    function build(v, l, r) {
      if (l === r) { seg[v] = values[l - 1]; return; }
      const m = (l + r) >> 1;
      build(v * 2, l, m);
      build(v * 2 + 1, m + 1, r);
      seg[v] = seg[v * 2] + seg[v * 2 + 1];
    }
    build(1, 1, n);

    const root = document.createElement('div');
    root.className = 'st-root';
    el.appendChild(root);

    const W = 760, H = 360;
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('class', 'st-svg');
    root.appendChild(svg);

    const status = document.createElement('div');
    status.className = 'st-status';
    root.appendChild(status);

    const nodePos = new Map();
    const nodeRange = new Map();
    function layout(v, l, r, depth, xL, xR) {
      const x = (xL + xR) / 2;
      const y = 30 + depth * 56;
      nodePos.set(v, { x, y });
      nodeRange.set(v, [l, r]);
      if (l === r) return;
      const m = (l + r) >> 1;
      layout(v * 2, l, m, depth + 1, xL, x);
      layout(v * 2 + 1, m + 1, r, depth + 1, x, xR);
    }
    layout(1, 1, n, 0, 20, W - 20);

    let highlight = new Map();

    function render() {
      svg.innerHTML = '';
      // edges first
      nodePos.forEach((p, v) => {
        const [l, r] = nodeRange.get(v);
        if (l === r) return;
        [v * 2, v * 2 + 1].forEach(c => {
          const cp = nodePos.get(c);
          if (!cp) return;
          const line = document.createElementNS(svgNS, 'line');
          line.setAttribute('x1', p.x); line.setAttribute('y1', p.y);
          line.setAttribute('x2', cp.x); line.setAttribute('y2', cp.y);
          line.setAttribute('stroke', '#999');
          line.setAttribute('stroke-width', 1.5);
          svg.appendChild(line);
        });
      });
      // nodes
      nodePos.forEach((p, v) => {
        const [l, r] = nodeRange.get(v);
        const color = highlight.get(v) || '#fff';
        const rect = document.createElementNS(svgNS, 'rect');
        const w = 56, h = 38;
        rect.setAttribute('x', p.x - w / 2); rect.setAttribute('y', p.y - h / 2);
        rect.setAttribute('width', w); rect.setAttribute('height', h);
        rect.setAttribute('fill', color);
        rect.setAttribute('stroke', '#111');
        rect.setAttribute('stroke-width', 2);
        svg.appendChild(rect);

        const tVal = document.createElementNS(svgNS, 'text');
        tVal.setAttribute('x', p.x); tVal.setAttribute('y', p.y - 2);
        tVal.setAttribute('text-anchor', 'middle');
        tVal.setAttribute('font-family', 'JetBrains Mono, monospace');
        tVal.setAttribute('font-weight', '700');
        tVal.setAttribute('font-size', '14');
        tVal.textContent = seg[v];
        svg.appendChild(tVal);

        const tRng = document.createElementNS(svgNS, 'text');
        tRng.setAttribute('x', p.x); tRng.setAttribute('y', p.y + 12);
        tRng.setAttribute('text-anchor', 'middle');
        tRng.setAttribute('font-family', 'JetBrains Mono, monospace');
        tRng.setAttribute('font-size', '9');
        tRng.setAttribute('fill', '#666');
        tRng.textContent = `[${l},${r}]`;
        svg.appendChild(tRng);
      });
    }

    function querySteps(v, l, r, qL, qR) {
      const steps = [];
      function rec(v, l, r) {
        if (qR < l || r < qL) {
          steps.push({ v, kind: 'outside' });
          return 0;
        }
        if (qL <= l && r <= qR) {
          steps.push({ v, kind: 'full' });
          return seg[v];
        }
        steps.push({ v, kind: 'partial' });
        const m = (l + r) >> 1;
        const a = rec(v * 2, l, m);
        const b = rec(v * 2 + 1, m + 1, r);
        return a + b;
      }
      const ans = rec(v, l, r);
      return { steps, ans };
    }

    function updateSteps(v, l, r, idx, val) {
      const steps = [];
      function rec(v, l, r) {
        steps.push({ v, kind: 'visit' });
        if (l === r) {
          seg[v] = val;
          steps.push({ v, kind: 'set' });
          return;
        }
        const m = (l + r) >> 1;
        if (idx <= m) rec(v * 2, l, m);
        else rec(v * 2 + 1, m + 1, r);
        seg[v] = seg[v * 2] + seg[v * 2 + 1];
        steps.push({ v, kind: 'recombine' });
      }
      rec(v, l, r);
      return steps;
    }

    let scriptIdx = 0;
    let script = [];
    let timer = null;

    function compile() {
      scriptIdx = 0;
      highlight.clear();
      if (mode === 'query') {
        const { steps, ans } = querySteps(1, 1, n, ql, qr);
        script = steps.map(s => ({ ...s, ans }));
        status.textContent = `Query [${ql}, ${qr}]. Press Step.`;
      } else if (mode === 'update') {
        script = updateSteps(1, 1, n, upIdx, upVal);
        status.textContent = `Update a[${upIdx}] = ${upVal}. Press Step.`;
      } else {
        status.textContent = `Sum tree of ${values.join(', ')}.`;
      }
      render();
    }

    function step() {
      if (scriptIdx >= script.length) return;
      const s = script[scriptIdx++];
      if (mode === 'query') {
        const colorMap = { outside: '#eee', full: '#a8e6a8', partial: '#fde9a3' };
        highlight.set(s.v, colorMap[s.kind]);
        const [l, r] = nodeRange.get(s.v);
        if (s.kind === 'full') status.textContent = `Node [${l},${r}] fully inside → take seg[${s.v}] = ${seg[s.v]}.`;
        else if (s.kind === 'outside') status.textContent = `Node [${l},${r}] outside [${ql},${qr}] → return 0.`;
        else status.textContent = `Node [${l},${r}] partial → recurse on children.`;
        if (scriptIdx === script.length) status.textContent += ` Sum = ${s.ans}.`;
      } else if (mode === 'update') {
        if (s.kind === 'visit') highlight.set(s.v, '#fde9a3');
        else if (s.kind === 'set') highlight.set(s.v, '#d62828');
        else if (s.kind === 'recombine') highlight.set(s.v, '#a8e6a8');
        const [l, r] = nodeRange.get(s.v);
        if (s.kind === 'visit') status.textContent = `Descend node [${l},${r}].`;
        else if (s.kind === 'set') status.textContent = `Leaf [${l},${l}] := ${upVal}.`;
        else status.textContent = `Recombine seg[${s.v}] = seg[${2*s.v}] + seg[${2*s.v+1}] = ${seg[s.v]}.`;
      }
      render();
    }

    function auto() {
      if (timer) { clearInterval(timer); timer = null; return; }
      timer = setInterval(() => {
        if (scriptIdx >= script.length) { clearInterval(timer); timer = null; return; }
        step();
      }, 800);
    }

    if (mode !== 'static') {
      const ctl = document.createElement('div');
      ctl.className = 'st-controls';
      ctl.innerHTML = `
        <button class="aw-btn" data-act="reset">Reset</button>
        <button class="aw-btn" data-act="step">Step</button>
        <button class="aw-btn" data-act="auto">Auto</button>
      `;
      root.appendChild(ctl);
      ctl.addEventListener('click', (e) => {
        const a = e.target.dataset.act;
        if (a === 'reset') {
          // restore values for update mode
          if (mode === 'update') {
            for (let i = 0; i < 4 * n; i++) seg[i] = 0;
            build(1, 1, n);
          }
          compile();
        }
        if (a === 'step') step();
        if (a === 'auto') auto();
      });
    }

    compile();
  }

  window.Widgets['segtree-vis'] = mount;
})();
