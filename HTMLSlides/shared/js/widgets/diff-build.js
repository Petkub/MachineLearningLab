// Difference array build animator.
// Steps left-to-right: d[1] = a[1]; d[i] = a[i] - a[i-1].
// data-widget="diff-build"
// data-values="3,5,5,8,6,9"
(function () {
  function mount(el) {
    if (el.dataset.mounted) return;
    el.dataset.mounted = '1';

    const values = (el.dataset.values || '3,5,5,8,6,9')
      .split(',').map(s => parseInt(s.trim(), 10));
    const n = values.length;
    const d = new Array(n + 1).fill(0);
    d[1] = values[0];
    for (let i = 2; i <= n; i++) d[i] = values[i - 1] - values[i - 2];

    // step = how many d cells revealed. 0 = none. n = all filled.
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
    const dRow = buildRow('d[i]');

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
      // a row: index 0 empty, 1..n shown. Highlight a[step] red, a[step-1] green when step >= 2.
      let aIdx = '', aVal = '';
      aIdx += `<div class="pb-idx-cell">0</div>`;
      aVal += `<div class="pb-cell pb-empty">&mdash;</div>`;
      for (let i = 1; i <= n; i++) {
        let cls = '';
        if (step >= 2 && i === step) cls = 'pb-a-active';
        else if (step >= 2 && i === step - 1) cls = 'pb-p-prev';
        else if (step === 1 && i === 1) cls = 'pb-a-active';
        aIdx += `<div class="pb-idx-cell">${i}</div>`;
        aVal += `<div class="pb-cell ${cls}">${values[i - 1]}</div>`;
      }
      aRow.idx.innerHTML = aIdx;
      aRow.val.innerHTML = aVal;

      // d row: d[0] dash. d[i<step] done. d[step] active. else empty.
      let dIdx = '', dVal = '';
      dIdx += `<div class="pb-idx-cell">0</div>`;
      dVal += `<div class="pb-cell pb-empty">&mdash;</div>`;
      for (let i = 1; i <= n; i++) {
        let cls = 'pb-empty';
        let val = '?';
        if (i < step) { cls = 'pb-done'; val = d[i]; }
        else if (i === step) { cls = 'pb-p-active'; val = d[i]; }
        dIdx += `<div class="pb-idx-cell">${i}</div>`;
        dVal += `<div class="pb-cell ${cls}">${val}</div>`;
      }
      dRow.idx.innerHTML = dIdx;
      dRow.val.innerHTML = dVal;

      // formula
      if (step === 0) {
        formula.innerHTML = `Press <b>Step &rarr;</b> to begin. Base: <b>d[1] = a[1]</b>.`;
      } else if (step === 1) {
        formula.innerHTML = `<b style="color:var(--accent-red)">d[1]</b> = <b style="color:var(--accent-blue)">a[1]</b> = <b style="color:var(--accent-red)">${d[1]}</b> &nbsp;<i>(base case)</i>`;
      } else {
        const i = step;
        formula.innerHTML = `<b style="color:var(--accent-red)">d[${i}]</b> = <span style="color:var(--accent-blue)">a[${i}]</span> &minus; <span style="color:var(--accent-green)">a[${i - 1}]</span> = <b style="color:var(--accent-blue)">${values[i - 1]}</b> &minus; <b style="color:var(--accent-green)">${values[i - 2]}</b> = <b style="color:var(--accent-red)">${d[i]}</b>`;
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
        }, 800);
      }
    });

    render();
  }

  window.Widgets = window.Widgets || {};
  window.Widgets['diff-build'] = mount;
})();
