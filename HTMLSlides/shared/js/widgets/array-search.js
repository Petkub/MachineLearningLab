// Array binary-search visualizer.
// data-widget="array-search" data-values="2,3,4,5,6,8,9,11,12,13" data-target="13"
(function () {
  function mount(el) {
    const values = (el.dataset.values || '').split(',').map(s => parseInt(s.trim(), 10));
    const target = parseInt(el.dataset.target, 10);
    const root = document.createElement('div');
    root.className = 'aw-root';
    el.appendChild(root);

    const cells = document.createElement('div');
    cells.className = 'aw-cells';
    root.appendChild(cells);

    const status = document.createElement('div');
    status.className = 'aw-status';
    root.appendChild(status);

    const controls = document.createElement('div');
    controls.className = 'aw-controls';
    controls.innerHTML = `
      <button class="aw-btn" data-act="reset">Reset</button>
      <button class="aw-btn" data-act="step">Step</button>
      <button class="aw-btn" data-act="auto">Auto</button>
    `;
    root.appendChild(controls);

    let lo, hi, found, autoTimer;

    function reset() {
      lo = 0; hi = values.length - 1; found = -1;
      stopAuto();
      render();
    }

    function step() {
      if (found !== -1 || lo > hi) return;
      const mid = lo + Math.floor((hi - lo) / 2);
      if (values[mid] === target) { found = mid; }
      else if (values[mid] < target) { lo = mid + 1; }
      else { hi = mid - 1; }
      render(mid);
    }

    function startAuto() {
      stopAuto();
      autoTimer = setInterval(() => {
        if (found !== -1 || lo > hi) { stopAuto(); return; }
        step();
      }, 700);
    }
    function stopAuto() { if (autoTimer) clearInterval(autoTimer); autoTimer = null; }

    function render(midHighlight = -1) {
      cells.innerHTML = '';
      values.forEach((v, i) => {
        const c = document.createElement('div');
        c.className = 'aw-cell';
        c.textContent = v;
        if (i < lo || i > hi) c.classList.add('aw-out');
        if (i === midHighlight) c.classList.add('aw-mid');
        if (i === found) c.classList.add('aw-found');
        cells.appendChild(c);
      });
      if (found !== -1) status.innerHTML = `Found <b>${target}</b> at index <b>${found}</b>`;
      else if (lo > hi) status.innerHTML = `Not found`;
      else status.innerHTML = `lo=${lo}, hi=${hi}, mid=${lo + Math.floor((hi - lo) / 2)}`;
    }

    controls.addEventListener('click', (e) => {
      const a = e.target.dataset.act;
      if (a === 'reset') reset();
      if (a === 'step') step();
      if (a === 'auto') startAuto();
    });

    reset();
  }

  window.Widgets['array-search'] = mount;
})();
