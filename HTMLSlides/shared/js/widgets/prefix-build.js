// Prefix sum build animator.
// Steps left-to-right: P[i] = P[i-1] + a[i].
// data-widget="prefix-build"
// data-values="3,1,4,1,5,9,2,6"
(function () {
  function mount(el) {
    if (el.dataset.mounted) return;
    el.dataset.mounted = '1';

    const values = (el.dataset.values || '3,1,4,1,5,9,2,6')
      .split(',').map(s => parseInt(s.trim(), 10));
    const n = values.length;
    const P = new Array(n + 1).fill(0);
    for (let i = 1; i <= n; i++) P[i] = P[i - 1] + values[i - 1];

    // step = how many P cells revealed. 0 = only P[0]=0. n = all filled.
    let step = 0;

    const root = document.createElement('div');
    root.className = 'pb-root';
    el.appendChild(root);

    function buildRow(label) {
      const wrap = document.createElement('div');
      wrap.className = 'pb-rowwrap';
      wrap.innerHTML = `<div class="pb-label">${label}</div>
        <div class="pb-row">
          <div class="pb-idx-row"></div>
          <div class="pb-val-row"></div>
        </div>`;
      root.appendChild(wrap);
      return {
        idx: wrap.querySelector('.pb-idx-row'),
        val: wrap.querySelector('.pb-val-row'),
      };
    }
    const aRow = buildRow('a[i]');
    const pRow = buildRow('P[i]');

    const formula = document.createElement('div');
    formula.className = 'pb-formula';
    root.appendChild(formula);

    const ctrl = document.createElement('div');
    ctrl.className = 'pb-controls';
    ctrl.innerHTML = `
      <button class="aw-btn" data-act="prev">&larr; Back</button>
      <button class="aw-btn" data-act="next">Step &rarr;</button>
      <button class="aw-btn" data-act="play">Play</button>
      <button class="aw-btn" data-act="reset">Reset</button>
    `;
    root.appendChild(ctrl);

    function render() {
      // a row: index 0 is empty, indices 1..n show a[i]
      let aIdx = '', aVal = '';
      aIdx += `<div class="pb-idx-cell">0</div>`;
      aVal += `<div class="pb-cell pb-empty">&mdash;</div>`;
      for (let i = 1; i <= n; i++) {
        const cls = (i === step) ? 'pb-a-active' : '';
        aIdx += `<div class="pb-idx-cell">${i}</div>`;
        aVal += `<div class="pb-cell ${cls}">${values[i - 1]}</div>`;
      }
      aRow.idx.innerHTML = aIdx;
      aRow.val.innerHTML = aVal;

      // P row: P[0]=0 base blue. P[step-1] = addend (green). P[step] = active red.
      let pIdx = '', pVal = '';
      const baseCls = (step === 1) ? 'pb-p-prev' : 'pb-base';
      pIdx += `<div class="pb-idx-cell">0</div>`;
      pVal += `<div class="pb-cell ${baseCls}">0</div>`;
      for (let i = 1; i <= n; i++) {
        let cls = 'pb-empty';
        let val = '?';
        if (i === step - 1) { cls = 'pb-p-prev'; val = P[i]; }
        else if (i < step) { cls = 'pb-done'; val = P[i]; }
        else if (i === step) { cls = 'pb-p-active'; val = P[i]; }
        pIdx += `<div class="pb-idx-cell">${i}</div>`;
        pVal += `<div class="pb-cell ${cls}">${val}</div>`;
      }
      pRow.idx.innerHTML = pIdx;
      pRow.val.innerHTML = pVal;

      // formula line
      if (step === 0) {
        formula.innerHTML = `Base case: <b>P[0] = 0</b>. Press <b>Step &rarr;</b>.`;
      } else {
        const i = step;
        formula.innerHTML = `<b style="color:var(--accent-red)">P[${i}]</b> = <span style="color:var(--accent-green)">P[${i - 1}]</span> + <span style="color:var(--accent-blue)">a[${i}]</span> = <b style="color:var(--accent-green)">${P[i - 1]}</b> + <b style="color:var(--accent-blue)">${values[i - 1]}</b> = <b style="color:var(--accent-red)">${P[i]}</b>`;
      }
    }

    let playTimer = null;
    function stopPlay() {
      if (playTimer) { clearInterval(playTimer); playTimer = null; }
    }

    ctrl.addEventListener('click', (e) => {
      const act = e.target.dataset.act;
      if (!act) return;
      if (act === 'next') { stopPlay(); if (step < n) step++; render(); }
      if (act === 'prev') { stopPlay(); if (step > 0) step--; render(); }
      if (act === 'reset') { stopPlay(); step = 0; render(); }
      if (act === 'play') {
        if (playTimer) { stopPlay(); return; }
        if (step >= n) step = 0;
        render();
        playTimer = setInterval(() => {
          if (step >= n) { stopPlay(); return; }
          step++;
          render();
        }, 700);
      }
    });

    render();
  }

  window.Widgets = window.Widgets || {};
  window.Widgets['prefix-build'] = mount;
})();
