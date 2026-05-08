// interval-dp — triangular DP table, length-first fill.
// On click a cell [l,r], sweep split point k in [l, r-1], show two child
// intervals [l,k] + [k+1,r] highlighted, and candidate cost on a status bar.
//
// Attrs:
//   data-n     : interval size (1..n)
//   data-cells : optional JSON 2D dp values (else just demo with 0s/empty)
//   data-mode  : "mcm" (matrix chain) | "generic". MCM uses data-dims for cost.
//   data-dims  : csv "30,35,15,5,10,20,25" (n+1 dims for MCM; n = chain length)
(function () {
  function csv(s) { return (s || '').split(',').map(x => +x.trim()).filter(Number.isFinite); }
  function readNum(v, def) { const n = +v; return Number.isFinite(n) ? n : def; }

  function mount(el) {
    if (el.dataset.mounted) return;
    el.dataset.mounted = '1';

    const mode = el.dataset.mode || 'mcm';
    let n;
    let dims = csv(el.dataset.dims || '30,35,15,5,10,20,25');
    if (mode === 'mcm') {
      n = dims.length - 1;
    } else {
      n = readNum(el.dataset.n, 5);
    }

    // Compute MCM dp + bestK
    const INF = Infinity;
    const dp  = Array.from({length: n+1}, () => Array(n+1).fill(0));
    const bestK = Array.from({length: n+1}, () => Array(n+1).fill(-1));
    if (mode === 'mcm') {
      for (let len = 2; len <= n; len++) {
        for (let l = 1; l + len - 1 <= n; l++) {
          const r = l + len - 1;
          dp[l][r] = INF;
          for (let k = l; k < r; k++) {
            const cost = dp[l][k] + dp[k+1][r] + dims[l-1] * dims[k] * dims[r];
            if (cost < dp[l][r]) { dp[l][r] = cost; bestK[l][r] = k; }
          }
        }
      }
    }

    // Fill order: by length, l ascending
    const order = [];
    for (let len = 1; len <= n; len++)
      for (let l = 1; l + len - 1 <= n; l++)
        order.push([l, l + len - 1]);

    // DOM
    const wrap = document.createElement('div');
    wrap.className = 'iv-wrap';

    if (mode === 'mcm') {
      const dimBar = document.createElement('div');
      dimBar.className = 'iv-dims';
      dimBar.innerHTML = '<span class="iv-lbl">dims:</span> ' +
        dims.map((d,i) => `<span class="iv-dim" data-i="${i}">p<sub>${i}</sub>=${d}</span>`).join(' ');
      wrap.appendChild(dimBar);
    }

    const grid = document.createElement('div');
    grid.className = 'iv-grid';
    grid.style.gridTemplateColumns = `auto repeat(${n}, minmax(54px, 1fr))`;
    wrap.appendChild(grid);

    // header
    const corner = document.createElement('div');
    corner.className = 'iv-corner';
    corner.innerHTML = '<small>l \\ r</small>';
    grid.appendChild(corner);
    for (let r = 1; r <= n; r++) {
      const h = document.createElement('div');
      h.className = 'iv-h';
      h.textContent = r;
      grid.appendChild(h);
    }

    const cells = [];
    for (let l = 1; l <= n; l++) {
      const rh = document.createElement('div');
      rh.className = 'iv-h iv-rh';
      rh.textContent = l;
      grid.appendChild(rh);
      cells[l] = [];
      for (let r = 1; r <= n; r++) {
        const c = document.createElement('div');
        c.className = 'iv-c';
        if (l > r) c.classList.add('iv-empty');
        c.dataset.l = l; c.dataset.r = r;
        if (l <= r) c.addEventListener('click', () => onCellClick(l, r));
        grid.appendChild(c);
        cells[l][r] = c;
      }
    }

    const status = document.createElement('div');
    status.className = 'iv-status';
    status.textContent = 'press play — fill by length';
    wrap.appendChild(status);

    const ctrl = document.createElement('div');
    ctrl.className = 'iv-ctrl';
    ctrl.innerHTML = `
      <button class="iv-prev">‹</button>
      <button class="iv-play">play</button>
      <button class="iv-next">›</button>
      <button class="iv-reset">reset</button>
      <button class="iv-sweep">sweep k</button>
      <span class="iv-speed">
        <span class="iv-lbl">speed</span>
        <button class="iv-sp" data-sp="0.5">.5×</button>
        <button class="iv-sp active" data-sp="1">1×</button>
        <button class="iv-sp" data-sp="2">2×</button>
      </span>
    `;
    wrap.appendChild(ctrl);
    el.appendChild(wrap);

    let step = -1;
    let timer = null;
    let speed = 1;
    let sweepTimer = null;

    function clearHL() {
      for (let l = 1; l <= n; l++)
        for (let r = 1; r <= n; r++) {
          cells[l][r].classList.remove('cur', 'dep-l', 'dep-r', 'split');
        }
      if (mode === 'mcm') {
        wrap.querySelectorAll('.iv-dim').forEach(d => d.classList.remove('hl'));
      }
    }

    function applyStep() {
      // reset cells
      for (let l = 1; l <= n; l++)
        for (let r = 1; r <= n; r++)
          if (l <= r) {
            cells[l][r].textContent = '';
            cells[l][r].classList.remove('filled');
          }
      clearHL();

      for (let s = 0; s <= step; s++) {
        const [l, r] = order[s];
        cells[l][r].textContent = (mode === 'mcm') ? dp[l][r] : '·';
        cells[l][r].classList.add('filled');
      }
      if (step < 0) { status.textContent = 'press play — fill by length'; return; }

      const [l, r] = order[step];
      cells[l][r].classList.add('cur');
      const len = r - l + 1;
      if (l === r) {
        status.textContent = `dp[${l}][${r}] = 0  (base, single matrix)`;
      } else if (mode === 'mcm') {
        const k = bestK[l][r];
        cells[l][k].classList.add('dep-l');
        cells[k+1][r].classList.add('dep-r');
        wrap.querySelector(`.iv-dim[data-i="${l-1}"]`)?.classList.add('hl');
        wrap.querySelector(`.iv-dim[data-i="${k}"]`)?.classList.add('hl');
        wrap.querySelector(`.iv-dim[data-i="${r}"]`)?.classList.add('hl');
        status.textContent =
          `len=${len}  dp[${l}][${r}] = dp[${l}][${k}] + dp[${k+1}][${r}] + ` +
          `p${l-1}·p${k}·p${r} = ${dp[l][k]} + ${dp[k+1][r]} + ${dims[l-1]*dims[k]*dims[r]} = ${dp[l][r]}  (best k=${k})`;
      } else {
        status.textContent = `len=${len}  dp[${l}][${r}]`;
      }
    }

    function nextStep() { if (step < order.length - 1) { step++; applyStep(); return true; } return false; }
    function prevStep() { if (step >= 0) { step--; applyStep(); } }
    function reset() { stopAuto(); stopSweep(); step = -1; applyStep(); }

    function startAuto() {
      stopAuto(); stopSweep();
      ctrl.querySelector('.iv-play').textContent = 'pause';
      timer = setInterval(() => { if (!nextStep()) stopAuto(); }, 700 / speed);
    }
    function stopAuto() {
      if (timer) { clearInterval(timer); timer = null; }
      ctrl.querySelector('.iv-play').textContent = 'play';
    }

    function onCellClick(l, r) {
      stopAuto(); stopSweep();
      const idx = order.findIndex(([ll, rr]) => ll === l && rr === r);
      if (idx >= 0) { step = idx; applyStep(); }
    }

    // Manual sweep over k for the current focused cell
    function startSweep() {
      if (step < 0) return;
      const [l, r] = order[step];
      if (l === r) return;
      stopAuto();
      let k = l;
      const showK = () => {
        clearHL();
        cells[l][r].classList.add('cur');
        cells[l][k].classList.add('dep-l');
        cells[k+1][r].classList.add('dep-r');
        if (mode === 'mcm') {
          const cost = dp[l][k] + dp[k+1][r] + dims[l-1]*dims[k]*dims[r];
          wrap.querySelector(`.iv-dim[data-i="${l-1}"]`)?.classList.add('hl');
          wrap.querySelector(`.iv-dim[data-i="${k}"]`)?.classList.add('hl');
          wrap.querySelector(`.iv-dim[data-i="${r}"]`)?.classList.add('hl');
          const star = (k === bestK[l][r]) ? ' ★ best' : '';
          status.textContent =
            `try k=${k}: dp[${l}][${k}]+dp[${k+1}][${r}]+p${l-1}·p${k}·p${r} = ` +
            `${dp[l][k]}+${dp[k+1][r]}+${dims[l-1]*dims[k]*dims[r]} = ${cost}${star}`;
        } else {
          status.textContent = `try k=${k}, splits [${l},${k}] + [${k+1},${r}]`;
        }
      };
      showK();
      sweepTimer = setInterval(() => {
        k++;
        if (k >= r) { stopSweep(); applyStep(); return; }
        showK();
      }, 900 / speed);
    }
    function stopSweep() {
      if (sweepTimer) { clearInterval(sweepTimer); sweepTimer = null; }
    }

    ctrl.querySelector('.iv-next').onclick  = () => { stopAuto(); stopSweep(); nextStep(); };
    ctrl.querySelector('.iv-prev').onclick  = () => { stopAuto(); stopSweep(); prevStep(); };
    ctrl.querySelector('.iv-reset').onclick = reset;
    ctrl.querySelector('.iv-play').onclick  = () => { if (timer) stopAuto(); else startAuto(); };
    ctrl.querySelector('.iv-sweep').onclick = startSweep;
    ctrl.querySelectorAll('.iv-sp').forEach(b => {
      b.onclick = () => {
        speed = +b.dataset.sp;
        ctrl.querySelectorAll('.iv-sp').forEach(x => x.classList.toggle('active', +x.dataset.sp === speed));
        if (timer) startAuto();
      };
    });

    applyStep();
    if (el.dataset.autoplay === '1') setTimeout(startAuto, 400);
  }

  window.Widgets['interval-dp'] = mount;
})();
