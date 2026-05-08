// lis-tails — patience / tails LIS animator.
// Steps through input. For each x:
//  - binary search lower_bound on tails (visualize lo/hi/mid pins)
//  - if pos == tails.size  → push (extends LIS)
//  - else                  → replace tails[pos] (shrinks tail at that length)
// Length of tails at end = LIS length.
//
// Attrs:
//   data-values : csv "10,9,2,5,3,7,101,18"
//   data-strict : "1" (default) for strict <, "0" for non-strict <=
(function () {
  function csv(s) { return (s || '').split(',').map(x => +x.trim()).filter(Number.isFinite); }

  function mount(el) {
    if (el.dataset.mounted) return;
    el.dataset.mounted = '1';
    const values = csv(el.dataset.values || '10,9,2,5,3,7,101,18');
    const n = values.length;
    let speed = 1;

    const wrap = document.createElement('div');
    wrap.className = 'lt-wrap';

    // --- input array row
    const arrLbl = document.createElement('div');
    arrLbl.className = 'lt-lbl';
    arrLbl.textContent = 'array a[]';
    wrap.appendChild(arrLbl);

    const arr = document.createElement('div');
    arr.className = 'lt-arr';
    values.forEach((v, i) => {
      const c = document.createElement('div');
      c.className = 'lt-cell';
      c.textContent = v;
      c.dataset.i = i;
      arr.appendChild(c);
    });
    wrap.appendChild(arr);

    // --- tails row
    const tailLbl = document.createElement('div');
    tailLbl.className = 'lt-lbl';
    tailLbl.textContent = 'tails[]';
    wrap.appendChild(tailLbl);

    const tailRow = document.createElement('div');
    tailRow.className = 'lt-tails';
    wrap.appendChild(tailRow);

    // --- status
    const status = document.createElement('div');
    status.className = 'lt-status';
    status.textContent = 'press play';
    wrap.appendChild(status);

    // --- ctrl
    const ctrl = document.createElement('div');
    ctrl.className = 'lt-ctrl';
    ctrl.innerHTML = `
      <button class="lt-prev">‹</button>
      <button class="lt-play">play</button>
      <button class="lt-next">›</button>
      <button class="lt-reset">reset</button>
      <span class="lt-speed">
        <span class="lt-lbl-sm">speed</span>
        <button class="lt-sp" data-sp="0.5">.5×</button>
        <button class="lt-sp active" data-sp="1">1×</button>
        <button class="lt-sp" data-sp="2">2×</button>
      </span>
    `;
    wrap.appendChild(ctrl);
    el.appendChild(wrap);

    // --- precompute step list
    // each step = { i, x, action:'push'|'replace', pos, tailsBefore, tailsAfter, search:[{lo,hi,mid}] }
    function lowerBound(arr, x) {
      let lo = 0, hi = arr.length;
      const trace = [];
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        trace.push({lo, hi, mid, val: arr[mid]});
        if (arr[mid] < x) lo = mid + 1;
        else hi = mid;
      }
      trace.push({lo, hi, mid: -1, val: null});
      return { pos: lo, trace };
    }
    const steps = [];
    {
      const tails = [];
      for (let i = 0; i < n; i++) {
        const x = values[i];
        const before = tails.slice();
        const { pos, trace } = lowerBound(tails, x);
        const action = (pos === tails.length) ? 'push' : 'replace';
        if (action === 'push') tails.push(x);
        else tails[pos] = x;
        steps.push({ i, x, action, pos, tailsBefore: before, tailsAfter: tails.slice(), trace });
      }
    }
    const finalLen = steps.length ? steps[steps.length - 1].tailsAfter.length : 0;

    let step = -1;
    let timer = null;
    let traceTimer = null;

    function clearArr() {
      arr.querySelectorAll('.lt-cell').forEach(c => c.classList.remove('cur', 'done'));
    }

    function renderTails(tails, hl) {
      tailRow.innerHTML = '';
      // background slots = max length so layout stable
      const maxLen = Math.max(finalLen, tails.length);
      for (let i = 0; i < maxLen; i++) {
        const c = document.createElement('div');
        c.className = 'lt-tcell';
        if (i < tails.length) {
          c.textContent = tails[i];
          c.classList.add('filled');
        } else {
          c.classList.add('empty');
          c.textContent = '·';
        }
        if (hl && hl.lo != null && i >= hl.lo && i < hl.hi) c.classList.add('search-band');
        if (hl && hl.mid != null && i === hl.mid) c.classList.add('search-mid');
        if (hl && hl.replace === i) c.classList.add('replace');
        if (hl && hl.push === i) c.classList.add('push');
        tailRow.appendChild(c);
      }
    }

    function applyStep() {
      stopTrace();
      clearArr();
      if (step < 0) {
        renderTails([], null);
        status.textContent = 'press play';
        return;
      }
      const s = steps[step];
      // mark cells [0..step] in array
      for (let k = 0; k < step; k++) arr.querySelector(`.lt-cell[data-i="${k}"]`).classList.add('done');
      arr.querySelector(`.lt-cell[data-i="${step}"]`).classList.add('cur');
      // animate trace
      const trace = s.trace;
      let ti = 0;
      const showFrame = () => {
        if (ti < trace.length - 1) {
          const t = trace[ti];
          renderTails(s.tailsBefore, { lo: t.lo, hi: t.hi, mid: t.mid });
          status.textContent =
            `i=${s.i}  x=${s.x}  binary search on tails[]: lo=${t.lo} hi=${t.hi}` +
            (t.mid >= 0 ? `  mid=${t.mid}  tails[mid]=${t.val}  ` +
              (t.val < s.x ? '< x → lo = mid+1' : '≥ x → hi = mid') : '');
          ti++;
        } else {
          // final: pos found, apply action
          const hl = (s.action === 'push') ? { push: s.pos } : { replace: s.pos };
          renderTails(s.tailsAfter, hl);
          status.textContent =
            `i=${s.i}  x=${s.x}  pos=${s.pos}  ` +
            (s.action === 'push'
              ? `→ push (extends LIS to len ${s.tailsAfter.length})`
              : `→ replace tails[${s.pos}] (shrinks tail at len ${s.pos+1})`);
          stopTrace();
        }
      };
      showFrame();
      traceTimer = setInterval(showFrame, 600 / speed);
    }

    function stopTrace() { if (traceTimer) { clearInterval(traceTimer); traceTimer = null; } }

    function nextStep() { if (step < steps.length - 1) { step++; applyStep(); return true; } return false; }
    function prevStep() { if (step >= 0) { step--; applyStep(); } }
    function reset() { stopAuto(); stopTrace(); step = -1; applyStep(); }

    function startAuto() {
      stopAuto();
      ctrl.querySelector('.lt-play').textContent = 'pause';
      const advance = () => {
        if (!nextStep()) { stopAuto(); return; }
      };
      advance();
      timer = setInterval(advance, 2200 / speed);
    }
    function stopAuto() {
      if (timer) { clearInterval(timer); timer = null; }
      ctrl.querySelector('.lt-play').textContent = 'play';
    }

    ctrl.querySelector('.lt-next').onclick  = () => { stopAuto(); nextStep(); };
    ctrl.querySelector('.lt-prev').onclick  = () => { stopAuto(); prevStep(); };
    ctrl.querySelector('.lt-reset').onclick = reset;
    ctrl.querySelector('.lt-play').onclick  = () => { if (timer) stopAuto(); else startAuto(); };
    ctrl.querySelectorAll('.lt-sp').forEach(b => {
      b.onclick = () => {
        speed = +b.dataset.sp;
        ctrl.querySelectorAll('.lt-sp').forEach(x => x.classList.toggle('active', +x.dataset.sp === speed));
        if (timer) startAuto();
      };
    });

    applyStep();
    if (el.dataset.autoplay === '1') setTimeout(startAuto, 400);
  }

  window.Widgets['lis-tails'] = mount;
})();
