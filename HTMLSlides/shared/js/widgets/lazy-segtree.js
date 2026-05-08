// lazy-segtree — range-add + range-sum w/ lazy propagation animator.
// Shows tree[v] (sum) + lazy[v] (pending add). Full-cover stops at node + tags.
// Push-down splits parent lazy onto children before recursing into partial.
//
// Attrs:
//   data-values : csv
//   data-l, data-r : range (1-indexed inclusive)
//   data-delta : add value
//   data-mode : "update" (default) | "query" (range-sum after update — uses
//               data-ql/data-qr or reuses l/r)
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
    const tree = new Array(4 * n).fill(0);
    const lazy = new Array(4 * n).fill(0);

    function build(v, l, r) {
      if (l === r) { tree[v] = values[l-1]; return; }
      const m = (l + r) >> 1;
      build(v*2, l, m);
      build(v*2+1, m+1, r);
      tree[v] = tree[v*2] + tree[v*2+1];
    }
    build(1, 1, n);

    // Record steps and snapshot tree/lazy each step
    const steps = [];
    const snaps = [{ tree: tree.slice(), lazy: lazy.slice() }];

    const wt = tree.slice();
    const wz = lazy.slice();

    function applyTag(v, l, r, val) {
      wt[v] += (r - l + 1) * val;
      wz[v] += val;
    }
    function pushDown(v, l, r) {
      if (wz[v] !== 0) {
        const m = (l + r) >> 1;
        applyTag(v*2, l, m, wz[v]);
        applyTag(v*2+1, m+1, r, wz[v]);
        wz[v] = 0;
      }
    }
    function step(action, v, l, r, extra) {
      steps.push({ action, v, l, r, extra: extra || {} });
      snaps.push({ tree: wt.slice(), lazy: wz.slice() });
    }

    function update(v, l, r, ql, qr, val) {
      step('visit', v, l, r);
      if (qr < l || r < ql) {
        step('outside', v, l, r);
        return;
      }
      if (ql <= l && r <= qr) {
        applyTag(v, l, r, val);
        step('full-cover-tag', v, l, r, { tag: val });
        return;
      }
      step('push-down', v, l, r, { lazy: wz[v] });
      pushDown(v, l, r);
      const m = (l + r) >> 1;
      update(v*2, l, m, ql, qr, val);
      update(v*2+1, m+1, r, ql, qr, val);
      const oldV = wt[v];
      wt[v] = wt[v*2] + wt[v*2+1];
      step('recombine', v, l, r, { oldVal: oldV, newVal: wt[v] });
    }
    update(1, 1, n, ql, qr, delta);

    // DOM
    const root = document.createElement('div');
    root.className = 'lst-root';
    el.appendChild(root);

    const title = document.createElement('div');
    title.className = 'lst-title';
    title.textContent = 'Lazy';
    root.appendChild(title);

    const W = 720, H = 320;
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.classList.add('lst-svg');
    root.appendChild(svg);

    const status = document.createElement('div');
    status.className = 'lst-status';
    status.textContent = `update [${ql}, ${qr}] += ${delta}`;
    root.appendChild(status);

    const counter = document.createElement('div');
    counter.className = 'lst-counter';
    counter.textContent = 'visits: 0';
    root.appendChild(counter);

    const ctrl = document.createElement('div');
    ctrl.className = 'lst-ctrl';
    ctrl.innerHTML = `
      <button class="lst-prev">‹</button>
      <button class="lst-play">play</button>
      <button class="lst-next">›</button>
      <button class="lst-reset">reset</button>
      <span class="lst-speed">
        <span class="lst-lbl">speed</span>
        <button class="lst-sp" data-sp="0.5">.5×</button>
        <button class="lst-sp active" data-sp="1">1×</button>
        <button class="lst-sp" data-sp="2">2×</button>
      </span>
    `;
    root.appendChild(ctrl);

    const nodePos = new Map();
    const nodeRange = new Map();
    function layout(v, l, r, depth, xL, xR) {
      const x = (xL + xR) / 2;
      const y = 30 + depth * 56;
      nodePos.set(v, { x, y });
      nodeRange.set(v, [l, r]);
      if (l === r) return;
      const m = (l + r) >> 1;
      layout(v*2, l, m, depth+1, xL, x);
      layout(v*2+1, m+1, r, depth+1, x, xR);
    }
    layout(1, 1, n, 0, 16, W - 16);

    let stp = -1;
    let timer = null;

    function render() {
      svg.innerHTML = '';
      const cur = stp >= 0 ? steps[stp] : null;
      const visited = new Set();
      const fullCover = new Set();
      const recombined = new Set();
      const outside = new Set();
      const pushed = new Set();
      let visitCount = 0;
      for (let s = 0; s <= stp; s++) {
        const st = steps[s];
        if (st.action === 'visit') { visited.add(st.v); visitCount++; }
        if (st.action === 'full-cover-tag') fullCover.add(st.v);
        if (st.action === 'outside') outside.add(st.v);
        if (st.action === 'recombine') recombined.add(st.v);
        if (st.action === 'push-down') pushed.add(st.v);
      }
      const snap = stp >= 0 ? snaps[stp + 1] : snaps[0];

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
          let stroke = '#bbb', sw = 1.5;
          if (cur && cur.action === 'push-down' && cur.v === v) {
            stroke = '#1d3fb6'; sw = 3;
          }
          line.setAttribute('stroke', stroke);
          line.setAttribute('stroke-width', sw);
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
        if (fullCover.has(v)) color = '#2f9e44';
        if (cur && cur.v === v) {
          if (cur.action === 'full-cover-tag') color = '#2f9e44';
          else if (cur.action === 'push-down') color = '#1d3fb6';
          else color = '#d62828';
        }

        const w = 54, h = 38;
        const rect = document.createElementNS(svgNS, 'rect');
        rect.setAttribute('x', p.x - w/2); rect.setAttribute('y', p.y - h/2);
        rect.setAttribute('width', w); rect.setAttribute('height', h);
        rect.setAttribute('fill', color);
        rect.setAttribute('stroke', '#111');
        rect.setAttribute('stroke-width', 2);
        rect.setAttribute('rx', 3);
        svg.appendChild(rect);

        const isHl = cur && cur.v === v && (cur.action === 'visit' || cur.action === 'recombine');
        const fillText = (isHl) ? '#fff' :
                         (fullCover.has(v) || (cur && cur.v === v && (cur.action === 'full-cover-tag' || cur.action === 'push-down'))) ? '#fff' : '#111';

        const tv = document.createElementNS(svgNS, 'text');
        tv.setAttribute('x', p.x); tv.setAttribute('y', p.y - 1);
        tv.setAttribute('text-anchor', 'middle');
        tv.setAttribute('font-family', 'JetBrains Mono, monospace');
        tv.setAttribute('font-weight', '700');
        tv.setAttribute('font-size', '13');
        tv.setAttribute('fill', fillText);
        tv.textContent = snap.tree[v];
        svg.appendChild(tv);

        const tr = document.createElementNS(svgNS, 'text');
        tr.setAttribute('x', p.x); tr.setAttribute('y', p.y + 12);
        tr.setAttribute('text-anchor', 'middle');
        tr.setAttribute('font-family', 'JetBrains Mono, monospace');
        tr.setAttribute('font-size', '8');
        tr.setAttribute('fill', fillText === '#111' ? '#666' : fillText);
        tr.textContent = l === r ? `[${l}]` : `[${l},${r}]`;
        svg.appendChild(tr);

        // lazy badge
        if (snap.lazy[v] !== 0) {
          const bg = document.createElementNS(svgNS, 'circle');
          bg.setAttribute('cx', p.x + w/2 - 4);
          bg.setAttribute('cy', p.y - h/2 + 4);
          bg.setAttribute('r', 9);
          bg.setAttribute('fill', '#fde9a3');
          bg.setAttribute('stroke', '#111');
          bg.setAttribute('stroke-width', 1.5);
          svg.appendChild(bg);
          const lt = document.createElementNS(svgNS, 'text');
          lt.setAttribute('x', p.x + w/2 - 4);
          lt.setAttribute('y', p.y - h/2 + 7);
          lt.setAttribute('text-anchor', 'middle');
          lt.setAttribute('font-family', 'JetBrains Mono, monospace');
          lt.setAttribute('font-weight', '700');
          lt.setAttribute('font-size', '9');
          lt.setAttribute('fill', '#111');
          lt.textContent = '+' + snap.lazy[v];
          svg.appendChild(lt);
        }
      });

      counter.textContent = `visits: ${visitCount}`;
      if (stp < 0) { status.textContent = `update [${ql}, ${qr}] += ${delta} — press play`; return; }
      const c = cur;
      if (c.action === 'visit') status.textContent = `visit node ${c.v} = [${c.l},${c.r}]`;
      else if (c.action === 'outside') status.textContent = `[${c.l},${c.r}] outside [${ql},${qr}] — return`;
      else if (c.action === 'full-cover-tag') status.textContent = `[${c.l},${c.r}] fully covered — tag node, no descent. tree += (r-l+1)·${c.extra.tag}`;
      else if (c.action === 'push-down') status.textContent = `partial cover — push-down lazy=${c.extra.lazy} to children, then recurse`;
      else if (c.action === 'recombine') status.textContent = `recombine node ${c.v}: ${c.extra.oldVal} → ${c.extra.newVal}`;
    }

    function nextStep() { if (stp < steps.length - 1) { stp++; render(); return true; } return false; }
    function prevStep() { if (stp >= 0) { stp--; render(); } }
    function reset() { stopAuto(); stp = -1; render(); }
    function startAuto() {
      stopAuto();
      ctrl.querySelector('.lst-play').textContent = 'pause';
      timer = setInterval(() => { if (!nextStep()) stopAuto(); }, 700 / speed);
    }
    function stopAuto() {
      if (timer) { clearInterval(timer); timer = null; }
      ctrl.querySelector('.lst-play').textContent = 'play';
    }

    ctrl.querySelector('.lst-next').onclick  = () => { stopAuto(); nextStep(); };
    ctrl.querySelector('.lst-prev').onclick  = () => { stopAuto(); prevStep(); };
    ctrl.querySelector('.lst-reset').onclick = reset;
    ctrl.querySelector('.lst-play').onclick  = () => { if (timer) stopAuto(); else startAuto(); };
    ctrl.querySelectorAll('.lst-sp').forEach(b => {
      b.onclick = () => {
        speed = +b.dataset.sp;
        ctrl.querySelectorAll('.lst-sp').forEach(x => x.classList.toggle('active', +x.dataset.sp === speed));
        if (timer) startAuto();
      };
    });

    render();
    if (el.dataset.autoplay === '1') setTimeout(startAuto, 400);
  }

  window.Widgets['lazy-segtree'] = mount;
})();
