// dp-table-fill — animated DP table with auto-play, speed control, dep arrows.
// data-rows / data-cols : count
// data-cells / data-deps : JSON 2D
// data-rowlabel / data-collabel
// data-autoplay : "1" to start auto on mount
// data-speed    : "1" default (0.5 / 1 / 2)
(function () {
  const SVGNS = 'http://www.w3.org/2000/svg';
  let _id = 0;

  function readNum(v, def) {
    if (v == null || v === '') return def;
    const n = +v;
    return Number.isFinite(n) ? n : def;
  }

  function mount(el) {
    if (el.dataset.mounted) return;
    el.dataset.mounted = '1';
    const uid = ++_id;

    const rows = readNum(el.dataset.rows, 3);
    const cols = readNum(el.dataset.cols, 5);
    const cells = JSON.parse(el.dataset.cells || '[]');
    const deps  = JSON.parse(el.dataset.deps || '[]');
    const rowLabel = el.dataset.rowlabel || '';
    const colLabel = el.dataset.collabel || '';
    const autoplay = el.dataset.autoplay === '1';
    let speed = readNum(el.dataset.speed, 1);

    const wrap = document.createElement('div');
    wrap.className = 'dpt-wrap';

    const stage = document.createElement('div');
    stage.className = 'dpt-stage';
    wrap.appendChild(stage);

    const grid = document.createElement('div');
    grid.className = 'dpt-grid';
    grid.style.gridTemplateColumns = `auto repeat(${cols + 1}, minmax(46px, 1fr))`;
    stage.appendChild(grid);

    // header row
    const corner = document.createElement('div');
    corner.className = 'dpt-corner';
    corner.innerHTML = rowLabel || colLabel
      ? `<small>${rowLabel}\\${colLabel}</small>` : '';
    grid.appendChild(corner);
    for (let j = 0; j <= cols; j++) {
      const h = document.createElement('div');
      h.className = 'dpt-h';
      h.textContent = j;
      grid.appendChild(h);
    }

    // body
    const cellEls = [];
    for (let i = 0; i <= rows; i++) {
      const rh = document.createElement('div');
      rh.className = 'dpt-h';
      rh.textContent = i;
      grid.appendChild(rh);
      cellEls[i] = [];
      for (let j = 0; j <= cols; j++) {
        const c = document.createElement('div');
        c.className = 'dpt-c';
        c.dataset.i = i; c.dataset.j = j;
        c.addEventListener('click', () => { stopAuto(); focusCell(i, j); });
        grid.appendChild(c);
        cellEls[i][j] = c;
      }
    }

    // controls
    const ctrl = document.createElement('div');
    ctrl.className = 'dpt-ctrl';
    ctrl.innerHTML = `
      <button class="dpt-prev">‹</button>
      <button class="dpt-play">play</button>
      <button class="dpt-next">›</button>
      <button class="dpt-reset">reset</button>
      <span class="dpt-speed">
        <span class="dpt-lbl">speed</span>
        <button class="dpt-sp" data-sp="0.5">.5×</button>
        <button class="dpt-sp" data-sp="1">1×</button>
        <button class="dpt-sp" data-sp="2">2×</button>
      </span>
      <span class="dpt-status"></span>
    `;
    wrap.appendChild(ctrl);
    el.appendChild(wrap);

    const order = [];
    for (let i = 0; i <= rows; i++) {
      for (let j = 0; j <= cols; j++) order.push([i, j]);
    }
    let step = -1;
    let timer = null;

    function setSpeedActive() {
      ctrl.querySelectorAll('.dpt-sp').forEach(b => {
        b.classList.toggle('active', +b.dataset.sp === speed);
      });
    }
    setSpeedActive();

    function setCell(i, j, val) {
      const c = cellEls[i][j];
      c.textContent = val == null ? '' : val;
      c.classList.toggle('filled', val != null && val !== '');
    }

    function clearHighlights() {
      cellEls.flat().forEach(c => {
        c.classList.remove('cur'); c.classList.remove('dep');
      });
    }

    function focusCell(i, j) {
      clearHighlights();
      cellEls[i][j].classList.add('cur');
      const list = (deps[i] && deps[i][j]) || [];
      list.forEach(([di, dj]) => {
        if (cellEls[di] && cellEls[di][dj]) cellEls[di][dj].classList.add('dep');
      });
    }

    function applyStep() {
      cellEls.flat().forEach(c => { c.textContent = ''; c.classList.remove('filled', 'cur', 'dep'); });
      for (let s = 0; s <= step; s++) {
        const [i, j] = order[s];
        const v = cells[i] && cells[i][j];
        if (v != null) setCell(i, j, v);
      }
      if (step >= 0) {
        const [i, j] = order[step];
        focusCell(i, j);
      }
      ctrl.querySelector('.dpt-status').textContent =
        step < 0 ? 'press play' : `cell (${order[step][0]},${order[step][1]})`;
    }

    function nextStep() {
      if (step < order.length - 1) { step++; applyStep(); return true; }
      return false;
    }
    function prevStep() {
      if (step >= 0) { step--; applyStep(); }
    }
    function reset() { stopAuto(); step = -1; applyStep(); }

    function startAuto() {
      stopAuto();
      const interval = 700 / speed;
      ctrl.querySelector('.dpt-play').textContent = 'pause';
      timer = setInterval(() => {
        if (!nextStep()) stopAuto();
      }, interval);
    }
    function stopAuto() {
      if (timer) { clearInterval(timer); timer = null; }
      ctrl.querySelector('.dpt-play').textContent = 'play';
    }
    function togglePlay() {
      if (timer) stopAuto(); else startAuto();
    }

    ctrl.querySelector('.dpt-next').onclick = () => { stopAuto(); nextStep(); };
    ctrl.querySelector('.dpt-prev').onclick = () => { stopAuto(); prevStep(); };
    ctrl.querySelector('.dpt-reset').onclick = () => reset();
    ctrl.querySelector('.dpt-play').onclick = togglePlay;
    ctrl.querySelectorAll('.dpt-sp').forEach(b => {
      b.onclick = () => {
        speed = +b.dataset.sp;
        setSpeedActive();
        if (timer) startAuto(); // restart with new speed
      };
    });

    applyStep();
    if (autoplay) setTimeout(startAuto, 400);

    // re-draw arrows on resize
    window.addEventListener('resize', () => {
      if (step < 0) return;
      const [i, j] = order[step];
      focusCell(i, j);
    });
  }

  window.Widgets['dp-table-fill'] = mount;
})();
