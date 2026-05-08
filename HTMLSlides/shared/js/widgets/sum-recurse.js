// Recursive sum(n) animator. Descend through frames, base case, unwind w/ values.
// data-widget="sum-recurse"
// data-n="4"
(function () {
  function mount(el) {
    if (el.dataset.mounted) return;
    el.dataset.mounted = '1';

    const n = parseInt(el.dataset.n || '4', 10);
    // step 0..n: descend (frame for sum(n)..sum(0)). step=k => active frame is sum(n-k).
    // step n..2n: unwind. step=n+k => frame sum(k) just returned, sum(k+1) computes its value.
    let step = 0;
    const MAX = 2 * n;

    const root = document.createElement('div');
    root.className = 'sr-root';
    el.appendChild(root);

    // ----- Stack panel (visual call stack) -----
    const stackWrap = document.createElement('div');
    stackWrap.className = 'sr-stackwrap';
    stackWrap.innerHTML = `<div class="sr-stack-label">call stack</div><div class="sr-stack"></div>`;
    root.appendChild(stackWrap);
    const stackEl = stackWrap.querySelector('.sr-stack');

    // ----- Status -----
    const status = document.createElement('div');
    status.className = 'sr-status';
    root.appendChild(status);

    const ctrl = document.createElement('div');
    ctrl.className = 'sr-controls';
    ctrl.innerHTML = `
      <button class="aw-btn" data-act="prev">&larr; Back</button>
      <button class="aw-btn" data-act="next">Step &rarr;</button>
      <button class="aw-btn" data-act="play">Play</button>
      <button class="aw-btn" data-act="reset">Reset</button>
    `;
    root.appendChild(ctrl);

    function phase() { return step <= n ? 'descend' : 'unwind'; }
    function activeArg() {
      // Descend: active arg = n - step.
      // Unwind: active arg = step - n (frame sum(arg) computing return value).
      if (phase() === 'descend') return n - step;
      return step - n;
    }
    function sumValue(k) { return k * (k + 1) / 2; }

    function render() {
      const ph = phase();
      const arg = activeArg();
      // Frames currently on stack:
      //   descend: sum(n), sum(n-1), ..., sum(arg). Top = sum(arg).
      //   unwind: sum(n), sum(n-1), ..., sum(arg). Top = sum(arg). (rest popped)
      const liveFrames = [];
      for (let k = n; k >= arg; k--) liveFrames.push(k);

      let html = '';
      // Render top of stack first (visually top)
      for (let i = 0; i < liveFrames.length; i++) {
        const k = liveFrames[i];
        const isTop = (i === 0);
        let info = '';
        if (ph === 'descend') {
          if (isTop && k === 0) {
            info = `<span class="sr-fr-ret">return 0</span>`;
          } else if (isTop) {
            info = `<span class="sr-fr-wait">recurse on sum(${k - 1})</span>`;
          } else {
            info = `<span class="sr-fr-wait">waiting</span>`;
          }
        } else {
          // unwind
          if (isTop) {
            info = `<span class="sr-fr-ret">return ${k} + ${sumValue(k - 1)} = ${sumValue(k)}</span>`;
          } else {
            info = `<span class="sr-fr-wait">waiting</span>`;
          }
        }
        html += `<div class="sr-frame ${isTop ? 'sr-frame-top' : ''}">sum(${k}) &nbsp; ${info}</div>`;
      }
      stackEl.innerHTML = html;

      // status
      if (ph === 'descend') {
        if (arg === 0) {
          status.innerHTML = `Base case hit. <code>sum(0) = 0</code>. Begin unwind.`;
        } else if (step === 0) {
          status.innerHTML = `Call <code>sum(${n})</code>. Push frame. Recurse on <code>sum(${n - 1})</code>.`;
        } else {
          status.innerHTML = `<code>sum(${arg + 1}) = ${arg + 1} + sum(${arg})</code>, but <code>sum(${arg})</code> not yet computed. Push frame, recurse.`;
        }
      } else {
        if (step === MAX) {
          status.innerHTML = `Last frame returns <b style="color:var(--accent-green)">sum(${n}) = ${sumValue(n)}</b>. Done.`;
        } else {
          const childVal = sumValue(arg - 1);
          status.innerHTML = `Frame <code>sum(${arg - 1})</code> returned <b>${childVal}</b>. Now <code>sum(${arg}) = ${arg} + ${childVal} = <span style="color:var(--accent-green)">${sumValue(arg)}</span></code>.`;
        }
      }
    }

    let timer = null;
    function stop() { if (timer) { clearInterval(timer); timer = null; } }

    ctrl.addEventListener('click', (e) => {
      const act = e.target.dataset.act;
      if (!act) return;
      if (act === 'next') { stop(); if (step < MAX) step++; render(); }
      if (act === 'prev') { stop(); if (step > 0) step--; render(); }
      if (act === 'reset') { stop(); step = 0; render(); }
      if (act === 'play') {
        if (timer) { stop(); return; }
        if (step >= MAX) step = 0;
        render();
        timer = setInterval(() => {
          if (step >= MAX) { stop(); return; }
          step++; render();
        }, 900);
      }
    });

    render();
  }

  window.Widgets = window.Widgets || {};
  window.Widgets['sum-recurse'] = mount;
})();
