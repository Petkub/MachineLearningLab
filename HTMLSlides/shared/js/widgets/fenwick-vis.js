// Fenwick / BIT visualizer — coverage bars + climb/descend animation.
// data-widget="fenwick-vis"
// data-values="3,1,4,1,5,9,2,6"
// data-mode="coverage" | "update" | "query"
// data-i (update target index)  data-delta
// data-r (query prefix end)
(function () {
  const svgNS = 'http://www.w3.org/2000/svg';

  function lowbit(i) { return i & -i; }

  function mount(el) {
    const values = (el.dataset.values || '3,1,4,1,5,9,2,6')
      .split(',').map(s => parseInt(s.trim(), 10));
    const mode = el.dataset.mode || 'coverage';
    const upI = parseInt(el.dataset.i || '5', 10);
    const upDelta = parseInt(el.dataset.delta || '3', 10);
    const qR = parseInt(el.dataset.r || '6', 10);

    const n = values.length;
    const bit = new Array(n + 1).fill(0);

    function bitUpdate(i, x) {
      for (; i <= n; i += lowbit(i)) bit[i] += x;
    }
    function bitPrefix(i) {
      let s = 0;
      for (; i > 0; i -= lowbit(i)) s += bit[i];
      return s;
    }
    for (let i = 1; i <= n; i++) bitUpdate(i, values[i - 1]);

    const root = document.createElement('div');
    root.className = 'fw-root';
    el.appendChild(root);

    const W = 720, H = 280;
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('class', 'fw-svg');
    root.appendChild(svg);

    const status = document.createElement('div');
    status.className = 'fw-status';
    root.appendChild(status);

    const cellW = Math.min(60, (W - 80) / n);
    const startX = (W - cellW * n) / 2;
    const cellY = H - 50;
    const barTop = 30;

    let highlightI = null;
    let touched = new Set();

    function render() {
      svg.innerHTML = '';
      // coverage bars (always show)
      for (let i = 1; i <= n; i++) {
        const lb = lowbit(i);
        const span = lb;
        const x = startX + (i - span) * cellW;
        const y = barTop + (Math.log2(lb)) * 22;
        const w = span * cellW;
        const fill = touched.has(i) ? '#fde9a3' : '#fff';
        const stroke = highlightI === i ? '#d62828' : '#111';
        const sw = highlightI === i ? 3 : 1.5;
        const r = document.createElementNS(svgNS, 'rect');
        r.setAttribute('x', x + 1); r.setAttribute('y', y);
        r.setAttribute('width', w - 2); r.setAttribute('height', 18);
        r.setAttribute('fill', fill);
        r.setAttribute('stroke', stroke); r.setAttribute('stroke-width', sw);
        svg.appendChild(r);

        const t = document.createElementNS(svgNS, 'text');
        t.setAttribute('x', x + w / 2); t.setAttribute('y', y + 13);
        t.setAttribute('text-anchor', 'middle');
        t.setAttribute('font-family', 'JetBrains Mono, monospace');
        t.setAttribute('font-size', '11');
        t.setAttribute('font-weight', '700');
        t.textContent = `bit[${i}]=${bit[i]}`;
        svg.appendChild(t);
      }
      // array cells along bottom
      for (let i = 1; i <= n; i++) {
        const x = startX + (i - 1) * cellW;
        const fill = highlightI === i ? '#fde9a3' : '#fff';
        const r = document.createElementNS(svgNS, 'rect');
        r.setAttribute('x', x + 1); r.setAttribute('y', cellY);
        r.setAttribute('width', cellW - 2); r.setAttribute('height', 36);
        r.setAttribute('fill', fill);
        r.setAttribute('stroke', '#111'); r.setAttribute('stroke-width', 2);
        svg.appendChild(r);

        const tv = document.createElementNS(svgNS, 'text');
        tv.setAttribute('x', x + cellW / 2); tv.setAttribute('y', cellY + 18);
        tv.setAttribute('text-anchor', 'middle');
        tv.setAttribute('font-family', 'JetBrains Mono, monospace');
        tv.setAttribute('font-size', '14');
        tv.setAttribute('font-weight', '700');
        tv.textContent = values[i - 1];
        svg.appendChild(tv);

        const ti = document.createElementNS(svgNS, 'text');
        ti.setAttribute('x', x + cellW / 2); ti.setAttribute('y', cellY + 32);
        ti.setAttribute('text-anchor', 'middle');
        ti.setAttribute('font-family', 'JetBrains Mono, monospace');
        ti.setAttribute('font-size', '10');
        ti.setAttribute('fill', '#666');
        ti.textContent = i;
        svg.appendChild(ti);
      }
    }

    let script = [];
    let scriptIdx = 0;
    let timer = null;

    function compile() {
      script = []; scriptIdx = 0; highlightI = null; touched = new Set();
      if (mode === 'update') {
        let i = upI;
        while (i <= n) {
          script.push({ kind: 'update', i });
          i += lowbit(i);
        }
        // restore (we already ran initial build)
        status.textContent = `Update i=${upI}, +${upDelta}. Climb i += i & -i.`;
      } else if (mode === 'query') {
        let i = qR;
        while (i > 0) {
          script.push({ kind: 'query', i });
          i -= lowbit(i);
        }
        status.textContent = `Prefix sum prefix(${qR}). Descend i -= i & -i.`;
      } else {
        status.textContent = `Coverage: each bit[i] sums lowbit(i) elements ending at i.`;
      }
      render();
    }

    function step() {
      if (scriptIdx >= script.length) return;
      const s = script[scriptIdx++];
      highlightI = s.i;
      touched.add(s.i);
      const lb = lowbit(s.i);
      if (s.kind === 'update') {
        bit[s.i] += upDelta;
        status.textContent = `bit[${s.i}] += ${upDelta} (lowbit=${lb}). Now bit[${s.i}]=${bit[s.i]}. Next i = ${s.i + lb <= n ? s.i + lb : 'done'}.`;
      } else {
        status.textContent = `add bit[${s.i}]=${bit[s.i]} (lowbit=${lb}). Next i = ${s.i - lb > 0 ? s.i - lb : 'done'}.`;
        if (scriptIdx === script.length) {
          let total = 0;
          for (const j of touched) total += bit[j];
          status.textContent += ` Sum = ${total}.`;
        }
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

    if (mode !== 'coverage') {
      const ctl = document.createElement('div');
      ctl.className = 'fw-controls';
      ctl.innerHTML = `
        <button class="aw-btn" data-act="reset">Reset</button>
        <button class="aw-btn" data-act="step">Step</button>
        <button class="aw-btn" data-act="auto">Auto</button>
      `;
      root.appendChild(ctl);
      ctl.addEventListener('click', (e) => {
        const a = e.target.dataset.act;
        if (a === 'reset') {
          // rebuild bit
          for (let i = 0; i <= n; i++) bit[i] = 0;
          for (let i = 1; i <= n; i++) bitUpdate(i, values[i - 1]);
          compile();
        }
        if (a === 'step') step();
        if (a === 'auto') auto();
      });
    }

    compile();
  }

  window.Widgets['fenwick-vis'] = mount;
})();
