// naive-range-segtree — plain segtree, range-update without lazy.
// Demonstrates "must descend to every leaf in [l,r]" cost.
// Used side-by-side with lazy-segtree to compare.
//
// Attrs:
//   data-values : csv
//   data-l, data-r : update range (1-indexed inclusive)
//   data-delta : value to add (range-add)
//   data-mode : "update" (default)
//   data-autoplay : "1"
(function () {
  const svgNS = 'http://www.w3.org/2000/svg';

  function csv(s) { return (s || '').split(',').map(x => +x.trim()).filter(Number.isFinite); }
  function readNum(v, def) { const n = +v; return Number.isFinite(n) ? n : def; }

  function mount(el) {
    if (el.dataset.mounted) return;
    el.dataset.mounted = '1';

    const values = csv(el.dataset.values || '3,1,4,1,5,9,2,6');
    const ql = readNum(el.dataset.l, 2);
    const qr = readNum(el.dataset.r, 6);
    const delta = readNum(el.dataset.delta, 10);
    let speed = 1;

    const n = values.length;
    const seg = new Array(4 * n).fill(0);

    function build(v, l, r) {
      if (l === r) { seg[v] = values[l-1]; return; }
      const m = (l + r) >> 1;
      build(v*2, l, m);
      build(v*2+1, m+1, r);
      seg[v] = seg[v*2] + seg[v*2+1];
    }
    build(1, 1, n);

    // record steps for range-add(ql, qr, +delta) without lazy:
    // descend whole tree, when leaf in [ql,qr] add delta, then recombine.
    const steps = [];
    function record(action, v, l, r, extra) {
      steps.push({ action, v, l, r, extra: extra || {} });
    }

    // Snapshot seg array per step for replay
    const snapshots = [seg.slice()];

    const segWork = seg.slice();
    function update(v, l, r, ql, qr, delta) {
      record('visit', v, l, r);
      snapshots.push(segWork.slice());
      if (qr < l || r < ql) {
        record('outside', v, l, r);
        snapshots.push(segWork.slice());
        return;
      }
      if (l === r) {
        segWork[v] += delta;
        record('leaf-update', v, l, r, { newVal: segWork[v] });
        snapshots.push(segWork.slice());
        return;
      }
      const m = (l + r) >> 1;
      update(v*2, l, m, ql, qr, delta);
      update(v*2+1, m+1, r, ql, qr, delta);
      const oldV = segWork[v];
      segWork[v] = segWork[v*2] + segWork[v*2+1];
      record('recombine', v, l, r, { oldVal: oldV, newVal: segWork[v] });
      snapshots.push(segWork.slice());
    }
    update(1, 1, n, ql, qr, delta);

    // DOM + SVG layout
    const root = document.createElement('div');
    root.className = 'nrs-root';
    el.appendChild(root);

    const title = document.createElement('div');
    title.className = 'nrs-title';
    title.textContent = 'Naive (no lazy)';
    root.appendChild(title);

    const W = 720, H = 320;
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.classList.add('nrs-svg');
    root.appendChild(svg);

    const status = document.createElement('div');
    status.className = 'nrs-status';
    status.textContent = `update [${ql}, ${qr}] += ${delta}`;
    root.appendChild(status);

    const counter = document.createElement('div');
    counter.className = 'nrs-counter';
    counter.textContent = 'visits: 0';
    root.appendChild(counter);

    const ctrl = document.createElement('div');
    ctrl.className = 'nrs-ctrl';
    ctrl.innerHTML = `
      <button class="nrs-prev">‹</button>
      <button class="nrs-play">play</button>
      <button class="nrs-next">›</button>
      <button class="nrs-reset">reset</button>
      <span class="nrs-speed">
        <span class="nrs-lbl">speed</span>
        <button class="nrs-sp" data-sp="0.5">.5×</button>
        <button class="nrs-sp active" data-sp="1">1×</button>
        <button class="nrs-sp" data-sp="2">2×</button>
      </span>
    `;
    root.appendChild(ctrl);

    const nodePos = new Map();
    const nodeRange = new Map();
    function layout(v, l, r, depth, xL, xR) {
      const x = (xL + xR) / 2;
      const y = 28 + depth * 52;
      nodePos.set(v, { x, y });
      nodeRange.set(v, [l, r]);
      if (l === r) return;
      const m = (l + r) >> 1;
      layout(v*2, l, m, depth+1, xL, x);
      layout(v*2+1, m+1, r, depth+1, x, xR);
    }
    layout(1, 1, n, 0, 16, W - 16);

    let step = -1;
    let timer = null;

    function render() {
      svg.innerHTML = '';
      const cur = step >= 0 ? steps[step] : null;
      const visited = new Set();
      const leafTouch = new Set();
      const recombined = new Set();
      const outside = new Set();
      let visitCount = 0;
      for (let s = 0; s <= step; s++) {
        const st = steps[s];
        if (st.action === 'visit') { visited.add(st.v); visitCount++; }
        if (st.action === 'leaf-update') leafTouch.add(st.v);
        if (st.action === 'recombine') recombined.add(st.v);
        if (st.action === 'outside') outside.add(st.v);
      }
      const segNow = step >= 0 ? snapshots[step + 1] : snapshots[0];

      // edges
      nodePos.forEach((p, v) => {
        const [l, r] = nodeRange.get(v);
        if (l === r) return;
        [v*2, v*2+1].forEach(c => {
          const cp = nodePos.get(c);
          if (!cp) return;
          const line = document.createElementNS(svgNS, 'line');
          line.setAttribute('x1', p.x); line.setAttribute('y1', p.y);
          line.setAttribute('x2', cp.x); line.setAttribute('y2', cp.y);
          line.setAttribute('stroke', '#bbb');
          line.setAttribute('stroke-width', 1.5);
          svg.appendChild(line);
        });
      });

      // nodes
      nodePos.forEach((p, v) => {
        const [l, r] = nodeRange.get(v);
        let color = '#fff';
        if (outside.has(v)) color = '#eee';
        if (visited.has(v)) color = '#fff3c2';
        if (recombined.has(v)) color = '#b8eef0';
        if (leafTouch.has(v)) color = '#ffd6cc';
        if (cur && cur.v === v) color = '#d62828';

        const w = 50, h = 36;
        const rect = document.createElementNS(svgNS, 'rect');
        rect.setAttribute('x', p.x - w/2); rect.setAttribute('y', p.y - h/2);
        rect.setAttribute('width', w); rect.setAttribute('height', h);
        rect.setAttribute('fill', color);
        rect.setAttribute('stroke', '#111');
        rect.setAttribute('stroke-width', 2);
        rect.setAttribute('rx', 3);
        svg.appendChild(rect);

        const tv = document.createElementNS(svgNS, 'text');
        tv.setAttribute('x', p.x); tv.setAttribute('y', p.y - 1);
        tv.setAttribute('text-anchor', 'middle');
        tv.setAttribute('font-family', 'JetBrains Mono, monospace');
        tv.setAttribute('font-weight', '700');
        tv.setAttribute('font-size', '13');
        tv.setAttribute('fill', cur && cur.v === v ? '#fff' : '#111');
        tv.textContent = segNow[v];
        svg.appendChild(tv);

        const tr = document.createElementNS(svgNS, 'text');
        tr.setAttribute('x', p.x); tr.setAttribute('y', p.y + 13);
        tr.setAttribute('text-anchor', 'middle');
        tr.setAttribute('font-family', 'JetBrains Mono, monospace');
        tr.setAttribute('font-size', '8');
        tr.setAttribute('fill', cur && cur.v === v ? '#fff' : '#666');
        tr.textContent = l === r ? `[${l}]` : `[${l},${r}]`;
        svg.appendChild(tr);
      });

      counter.textContent = `visits: ${visitCount}`;
      if (step < 0) { status.textContent = `update [${ql}, ${qr}] += ${delta}  — press play`; return; }
      const c = cur;
      if (c.action === 'visit') status.textContent = `visit node ${c.v} = [${c.l},${c.r}]`;
      else if (c.action === 'outside') status.textContent = `node ${c.v} = [${c.l},${c.r}] outside [${ql},${qr}] — return`;
      else if (c.action === 'leaf-update') status.textContent = `leaf [${c.l}] += ${delta} → ${c.extra.newVal}`;
      else if (c.action === 'recombine') status.textContent = `recombine node ${c.v}: ${c.extra.oldVal} → ${c.extra.newVal}`;
    }

    function nextStep() { if (step < steps.length - 1) { step++; render(); return true; } return false; }
    function prevStep() { if (step >= 0) { step--; render(); } }
    function reset() { stopAuto(); step = -1; render(); }
    function startAuto() {
      stopAuto();
      ctrl.querySelector('.nrs-play').textContent = 'pause';
      timer = setInterval(() => { if (!nextStep()) stopAuto(); }, 600 / speed);
    }
    function stopAuto() {
      if (timer) { clearInterval(timer); timer = null; }
      ctrl.querySelector('.nrs-play').textContent = 'play';
    }

    ctrl.querySelector('.nrs-next').onclick  = () => { stopAuto(); nextStep(); };
    ctrl.querySelector('.nrs-prev').onclick  = () => { stopAuto(); prevStep(); };
    ctrl.querySelector('.nrs-reset').onclick = reset;
    ctrl.querySelector('.nrs-play').onclick  = () => { if (timer) stopAuto(); else startAuto(); };
    ctrl.querySelectorAll('.nrs-sp').forEach(b => {
      b.onclick = () => {
        speed = +b.dataset.sp;
        ctrl.querySelectorAll('.nrs-sp').forEach(x => x.classList.toggle('active', +x.dataset.sp === speed));
        if (timer) startAuto();
      };
    });

    render();
    if (el.dataset.autoplay === '1') setTimeout(startAuto, 400);
  }

  window.Widgets['naive-range-segtree'] = mount;
})();
