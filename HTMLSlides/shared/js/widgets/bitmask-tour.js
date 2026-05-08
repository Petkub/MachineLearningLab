// bitmask-tour — TSP via bitmask DP, step-through animator.
// Shows: cities on plane (SVG), current (mask, last city) frontier as bit row +
// city highlight, candidate transition (j -> i) drawn as edge, status narrates.
//
// Forward DP: dp[mask][i] = min cost to visit set `mask`, ending at i, starting from city 0.
// Step order: by popcount(mask) ascending; within, mask ascending; within, last city ascending.
//
// Attrs:
//   data-cities : JSON array of {x,y} (or csv "x:y,x:y"). Default 4 cities.
(function () {
  const SVGNS = 'http://www.w3.org/2000/svg';

  function parseCities(s) {
    if (!s) return null;
    s = s.trim();
    try {
      if (s.startsWith('[')) return JSON.parse(s);
    } catch (e) {}
    return s.split(',').map(p => {
      const [x, y] = p.split(':').map(Number);
      return { x, y };
    });
  }

  function mount(el) {
    if (el.dataset.mounted) return;
    el.dataset.mounted = '1';

    const cities = parseCities(el.dataset.cities) || [
      { x: 80,  y: 90 },
      { x: 280, y: 60 },
      { x: 320, y: 220 },
      { x: 100, y: 240 },
    ];
    const n = cities.length;
    const N = 1 << n;
    const INF = Infinity;
    let speed = 1;

    // distance matrix
    const d = Array.from({length: n}, () => Array(n).fill(0));
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        d[i][j] = Math.round(Math.hypot(cities[i].x - cities[j].x, cities[i].y - cities[j].y));

    // Compute dp + best
    const dp = Array.from({length: N}, () => Array(n).fill(INF));
    const par = Array.from({length: N}, () => Array(n).fill(-1));
    dp[1][0] = 0;
    for (let mask = 1; mask < N; mask++) {
      if (!(mask & 1)) continue; // must include city 0
      for (let i = 0; i < n; i++) {
        if (!((mask >> i) & 1)) continue;
        if (dp[mask][i] === INF) continue;
        for (let nxt = 0; nxt < n; nxt++) {
          if ((mask >> nxt) & 1) continue;
          const nm = mask | (1 << nxt);
          const cost = dp[mask][i] + d[i][nxt];
          if (cost < dp[nm][nxt]) {
            dp[nm][nxt] = cost;
            par[nm][nxt] = i;
          }
        }
      }
    }
    let bestEnd = -1, bestTotal = INF;
    for (let i = 1; i < n; i++) {
      const tot = dp[N-1][i] + d[i][0];
      if (tot < bestTotal) { bestTotal = tot; bestEnd = i; }
    }

    // Build step list of relaxations actually used
    const steps = [];
    // Order by popcount, then mask, then last city
    const masks = [];
    for (let m = 1; m < N; m++) if (m & 1) masks.push(m);
    masks.sort((a, b) => {
      const pa = popcount(a), pb = popcount(b);
      if (pa !== pb) return pa - pb;
      return a - b;
    });
    function popcount(x) { let c = 0; while (x) { x &= x-1; c++; } return c; }

    for (const mask of masks) {
      for (let i = 0; i < n; i++) {
        if (!((mask >> i) & 1)) continue;
        if (dp[mask][i] === INF) continue;
        if (mask === 1 && i === 0) {
          steps.push({ mask, i, from: -1, base: true });
          continue;
        }
        const j = par[mask][i];
        if (j < 0) continue;
        steps.push({ mask, i, from: j, prevMask: mask ^ (1 << i), cost: dp[mask][i] });
      }
    }
    // final closing step
    if (bestEnd >= 0) {
      steps.push({ mask: N-1, i: bestEnd, closing: true, total: bestTotal });
    }

    // DOM
    const wrap = document.createElement('div');
    wrap.className = 'bt-wrap';

    // SVG plane
    const svgBox = document.createElement('div');
    svgBox.className = 'bt-svg-box';
    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 400 300');
    svg.classList.add('bt-svg');
    svgBox.appendChild(svg);
    wrap.appendChild(svgBox);

    // Mask row
    const maskRow = document.createElement('div');
    maskRow.className = 'bt-mask';
    wrap.appendChild(maskRow);

    // status
    const status = document.createElement('div');
    status.className = 'bt-status';
    status.textContent = 'press play';
    wrap.appendChild(status);

    // ctrl
    const ctrl = document.createElement('div');
    ctrl.className = 'bt-ctrl';
    ctrl.innerHTML = `
      <button class="bt-prev">‹</button>
      <button class="bt-play">play</button>
      <button class="bt-next">›</button>
      <button class="bt-reset">reset</button>
      <span class="bt-speed">
        <span class="bt-lbl">speed</span>
        <button class="bt-sp" data-sp="0.5">.5×</button>
        <button class="bt-sp active" data-sp="1">1×</button>
        <button class="bt-sp" data-sp="2">2×</button>
      </span>
    `;
    wrap.appendChild(ctrl);
    el.appendChild(wrap);

    let step = -1;
    let timer = null;

    function renderMask(mask, curI, fromJ) {
      maskRow.innerHTML = '';
      for (let i = n - 1; i >= 0; i--) {
        const b = document.createElement('div');
        const on = (mask >> i) & 1;
        b.className = 'bt-bit' + (on ? ' on' : '');
        if (i === curI) b.classList.add('cur');
        if (i === fromJ) b.classList.add('from');
        b.textContent = on ? '1' : '0';
        const lbl = document.createElement('small');
        lbl.textContent = i;
        b.appendChild(lbl);
        maskRow.appendChild(b);
      }
    }

    function renderSvg(mask, curI, fromJ, closing) {
      svg.innerHTML = '';
      // edges already in path: walk parents from (mask, curI)
      const path = [];
      if (mask !== undefined && curI >= 0) {
        let m = mask, c = curI;
        path.push(c);
        while (par[m][c] >= 0) {
          const p = par[m][c];
          path.push(p);
          m ^= (1 << c);
          c = p;
        }
        path.reverse();
      }
      // draw all path edges
      for (let k = 0; k + 1 < path.length; k++) {
        const a = cities[path[k]], b = cities[path[k+1]];
        const ln = document.createElementNS(SVGNS, 'line');
        ln.setAttribute('x1', a.x); ln.setAttribute('y1', a.y);
        ln.setAttribute('x2', b.x); ln.setAttribute('y2', b.y);
        ln.setAttribute('class', 'bt-edge');
        svg.appendChild(ln);
      }
      // closing edge back to 0
      if (closing && curI >= 0) {
        const a = cities[curI], b = cities[0];
        const ln = document.createElementNS(SVGNS, 'line');
        ln.setAttribute('x1', a.x); ln.setAttribute('y1', a.y);
        ln.setAttribute('x2', b.x); ln.setAttribute('y2', b.y);
        ln.setAttribute('class', 'bt-edge close');
        svg.appendChild(ln);
      }
      // current relax edge highlight
      if (fromJ >= 0 && curI >= 0 && !closing) {
        const a = cities[fromJ], b = cities[curI];
        const ln = document.createElementNS(SVGNS, 'line');
        ln.setAttribute('x1', a.x); ln.setAttribute('y1', a.y);
        ln.setAttribute('x2', b.x); ln.setAttribute('y2', b.y);
        ln.setAttribute('class', 'bt-edge active');
        svg.appendChild(ln);
      }
      // cities
      for (let i = 0; i < n; i++) {
        const c = cities[i];
        const grp = document.createElementNS(SVGNS, 'g');
        const cir = document.createElementNS(SVGNS, 'circle');
        cir.setAttribute('cx', c.x); cir.setAttribute('cy', c.y); cir.setAttribute('r', 18);
        let cls = 'bt-city';
        if ((mask >> i) & 1) cls += ' visited';
        if (i === curI) cls += ' cur';
        if (i === fromJ) cls += ' from';
        if (i === 0) cls += ' start';
        cir.setAttribute('class', cls);
        grp.appendChild(cir);
        const t = document.createElementNS(SVGNS, 'text');
        t.setAttribute('x', c.x); t.setAttribute('y', c.y + 5);
        t.setAttribute('text-anchor', 'middle');
        t.setAttribute('class', 'bt-city-label');
        t.textContent = i;
        grp.appendChild(t);
        svg.appendChild(grp);
      }
    }

    function applyStep() {
      if (step < 0) {
        renderSvg(0, -1, -1, false);
        renderMask(0, -1, -1);
        status.textContent = 'press play — fill dp[mask][i] from popcount=1 → n';
        return;
      }
      const s = steps[step];
      renderSvg(s.mask, s.i, s.from, !!s.closing);
      renderMask(s.mask, s.i, s.from);
      if (s.base) {
        status.textContent = `base: dp[{0}][0] = 0  (start at city 0)`;
      } else if (s.closing) {
        status.textContent = `close tour: dp[full][${s.i}] + d[${s.i}][0] = ${dp[N-1][s.i]} + ${d[s.i][0]} = ${s.total}  ★ optimal`;
      } else {
        const maskStr = '0b' + s.mask.toString(2).padStart(n, '0');
        status.textContent =
          `dp[${maskStr}][${s.i}] = dp[${'0b'+s.prevMask.toString(2).padStart(n,'0')}][${s.from}] + d[${s.from}][${s.i}] = ` +
          `${dp[s.prevMask][s.from]} + ${d[s.from][s.i]} = ${s.cost}`;
      }
    }

    function nextStep() { if (step < steps.length - 1) { step++; applyStep(); return true; } return false; }
    function prevStep() { if (step >= 0) { step--; applyStep(); } }
    function reset() { stopAuto(); step = -1; applyStep(); }

    function startAuto() {
      stopAuto();
      ctrl.querySelector('.bt-play').textContent = 'pause';
      timer = setInterval(() => { if (!nextStep()) stopAuto(); }, 900 / speed);
    }
    function stopAuto() {
      if (timer) { clearInterval(timer); timer = null; }
      ctrl.querySelector('.bt-play').textContent = 'play';
    }

    ctrl.querySelector('.bt-next').onclick  = () => { stopAuto(); nextStep(); };
    ctrl.querySelector('.bt-prev').onclick  = () => { stopAuto(); prevStep(); };
    ctrl.querySelector('.bt-reset').onclick = reset;
    ctrl.querySelector('.bt-play').onclick  = () => { if (timer) stopAuto(); else startAuto(); };
    ctrl.querySelectorAll('.bt-sp').forEach(b => {
      b.onclick = () => {
        speed = +b.dataset.sp;
        ctrl.querySelectorAll('.bt-sp').forEach(x => x.classList.toggle('active', +x.dataset.sp === speed));
        if (timer) startAuto();
      };
    });

    applyStep();
    if (el.dataset.autoplay === '1') setTimeout(startAuto, 400);
  }

  window.Widgets['bitmask-tour'] = mount;
})();
