// knapsack-table — 0/1 knapsack 2D animator.
// Item × capacity table. Step fills row-by-row, current cell red, two source
// cells (skip = (i-1,w), take = (i-1,w-w_i)+v_i) highlighted blue. Status
// line shows skip vs take values + winner.
//
// Attrs:
//   data-weights : csv "2,3,4,5"
//   data-values  : csv "3,4,5,6"
//   data-cap     : int  W
//   data-autoplay: "1"
(function () {
  function csv(s) { return (s || '').split(',').map(x => +x.trim()).filter(Number.isFinite); }
  function readNum(v, def) { const n = +v; return Number.isFinite(n) ? n : def; }

  function mount(el) {
    if (el.dataset.mounted) return;
    el.dataset.mounted = '1';

    const W = readNum(el.dataset.cap, 7);
    const ws = csv(el.dataset.weights || '2,3,4,5');
    const vs = csv(el.dataset.values  || '3,4,5,6');
    const n  = Math.min(ws.length, vs.length);
    const autoplay = el.dataset.autoplay === '1';
    let speed = 1;

    // Compute full table dp[0..n][0..W]
    const dp = Array.from({length: n+1}, () => Array(W+1).fill(0));
    for (let i = 1; i <= n; i++) {
      for (let w = 0; w <= W; w++) {
        const skip = dp[i-1][w];
        const take = (w >= ws[i-1]) ? dp[i-1][w-ws[i-1]] + vs[i-1] : -1;
        dp[i][w] = Math.max(skip, take);
      }
    }

    // Order: row by row, left to right. Skip (0, *) since base = 0.
    const order = [];
    for (let i = 1; i <= n; i++) {
      for (let w = 0; w <= W; w++) order.push([i, w]);
    }

    // Build DOM
    const wrap = document.createElement('div');
    wrap.className = 'kt-wrap';

    const itemBar = document.createElement('div');
    itemBar.className = 'kt-items';
    itemBar.innerHTML = ws.map((w,i) =>
      `<div class="kt-item" data-i="${i+1}">
         <div class="kt-item-id">item ${i+1}</div>
         <div class="kt-item-w">w=${w}</div>
         <div class="kt-item-v">v=${vs[i]}</div>
       </div>`).join('');
    wrap.appendChild(itemBar);

    const grid = document.createElement('div');
    grid.className = 'kt-grid';
    grid.style.gridTemplateColumns = `auto repeat(${W+1}, minmax(42px, 1fr))`;
    wrap.appendChild(grid);

    // header
    const corner = document.createElement('div');
    corner.className = 'kt-corner';
    corner.innerHTML = '<small>i \\ w</small>';
    grid.appendChild(corner);
    for (let w = 0; w <= W; w++) {
      const h = document.createElement('div');
      h.className = 'kt-h';
      h.textContent = w;
      grid.appendChild(h);
    }

    const cells = [];
    for (let i = 0; i <= n; i++) {
      const rh = document.createElement('div');
      rh.className = 'kt-h kt-rh';
      rh.textContent = i;
      grid.appendChild(rh);
      cells[i] = [];
      for (let w = 0; w <= W; w++) {
        const c = document.createElement('div');
        c.className = 'kt-c';
        c.dataset.i = i; c.dataset.w = w;
        // base row: pre-fill 0
        if (i === 0) { c.textContent = '0'; c.classList.add('filled', 'base'); }
        c.addEventListener('click', () => {
          stopAuto();
          const idx = order.findIndex(([ii,jj]) => ii===i && jj===w);
          if (idx >= 0) { step = idx; applyStep(); }
        });
        grid.appendChild(c);
        cells[i][w] = c;
      }
    }

    // status + controls
    const status = document.createElement('div');
    status.className = 'kt-status';
    status.textContent = 'press play';
    wrap.appendChild(status);

    const ctrl = document.createElement('div');
    ctrl.className = 'kt-ctrl';
    ctrl.innerHTML = `
      <button class="kt-prev">‹</button>
      <button class="kt-play">play</button>
      <button class="kt-next">›</button>
      <button class="kt-reset">reset</button>
      <span class="kt-speed">
        <span class="kt-lbl">speed</span>
        <button class="kt-sp" data-sp="0.5">.5×</button>
        <button class="kt-sp active" data-sp="1">1×</button>
        <button class="kt-sp" data-sp="2">2×</button>
      </span>
    `;
    wrap.appendChild(ctrl);
    el.appendChild(wrap);

    let step = -1;
    let timer = null;

    function clearHL() {
      for (let i = 0; i <= n; i++)
        for (let w = 0; w <= W; w++)
          cells[i][w].classList.remove('cur', 'dep-skip', 'dep-take');
      itemBar.querySelectorAll('.kt-item').forEach(x => x.classList.remove('cur'));
    }

    function applyStep() {
      // reset fills (keep base row)
      for (let i = 1; i <= n; i++)
        for (let w = 0; w <= W; w++) {
          cells[i][w].textContent = '';
          cells[i][w].classList.remove('filled');
        }
      clearHL();
      for (let s = 0; s <= step; s++) {
        const [i, w] = order[s];
        cells[i][w].textContent = dp[i][w];
        cells[i][w].classList.add('filled');
      }
      if (step < 0) { status.textContent = 'press play'; return; }

      const [i, w] = order[step];
      cells[i][w].classList.add('cur');
      itemBar.querySelector(`.kt-item[data-i="${i}"]`).classList.add('cur');

      const wi = ws[i-1], vi = vs[i-1];
      const skipVal = dp[i-1][w];
      cells[i-1][w].classList.add('dep-skip');

      let msg = `dp[${i}][${w}] = max( skip=dp[${i-1}][${w}]=${skipVal}`;
      if (w >= wi) {
        const takeVal = dp[i-1][w-wi] + vi;
        cells[i-1][w-wi].classList.add('dep-take');
        msg += `, take=dp[${i-1}][${w-wi}]+${vi}=${takeVal}`;
        msg += ` ) → ${dp[i][w]}`;
      } else {
        msg += ` ) → ${dp[i][w]}   (w=${w} < w_${i}=${wi}, can't take)`;
      }
      status.textContent = msg;
    }

    function nextStep() { if (step < order.length - 1) { step++; applyStep(); return true; } return false; }
    function prevStep() { if (step >= 0) { step--; applyStep(); } }
    function reset() { stopAuto(); step = -1; applyStep(); }

    function startAuto() {
      stopAuto();
      ctrl.querySelector('.kt-play').textContent = 'pause';
      timer = setInterval(() => { if (!nextStep()) stopAuto(); }, 750 / speed);
    }
    function stopAuto() {
      if (timer) { clearInterval(timer); timer = null; }
      ctrl.querySelector('.kt-play').textContent = 'play';
    }

    ctrl.querySelector('.kt-next').onclick = () => { stopAuto(); nextStep(); };
    ctrl.querySelector('.kt-prev').onclick = () => { stopAuto(); prevStep(); };
    ctrl.querySelector('.kt-reset').onclick = reset;
    ctrl.querySelector('.kt-play').onclick = () => { if (timer) stopAuto(); else startAuto(); };
    ctrl.querySelectorAll('.kt-sp').forEach(b => {
      b.onclick = () => {
        speed = +b.dataset.sp;
        ctrl.querySelectorAll('.kt-sp').forEach(x => x.classList.toggle('active', +x.dataset.sp === speed));
        if (timer) startAuto();
      };
    });

    applyStep();
    if (autoplay) setTimeout(startAuto, 400);
  }

  window.Widgets['knapsack-table'] = mount;
})();
