// T/F monotonic tape — visualize check(x) over x range, animate BSTA convergence.
// data-widget="tf-tape" data-min="1" data-max="14" data-threshold="9"
// data-pattern="ttf" (default) — T,T,...,F,F (maximization). Use "ftt" for minimization.
(function () {
  function mount(el) {
    const min = parseInt(el.dataset.min || '1', 10);
    const max = parseInt(el.dataset.max || '14', 10);
    const threshold = parseInt(el.dataset.threshold || '9', 10);
    const pattern = el.dataset.pattern || 'ttf'; // ttf = T...T F...F (max). ftt = F...F T...T (min)

    function checkVal(x) {
      return pattern === 'ttf' ? (x <= threshold) : (x >= threshold);
    }

    const root = document.createElement('div');
    root.className = 'tf-root';
    el.appendChild(root);

    const cells = document.createElement('div');
    cells.className = 'tf-cells';
    root.appendChild(cells);

    const cellEls = [];
    for (let v = min; v <= max; v++) {
      const c = document.createElement('div');
      c.className = 'tf-cell';
      const isT = checkVal(v);
      c.classList.add(isT ? 'tf-true' : 'tf-false');
      c.innerHTML = `<span class="tf-val">${v}</span><span class="tf-tag">${isT ? 'T' : 'F'}</span>`;
      cells.appendChild(c);
      cellEls.push(c);
    }

    // Pointer markers (lo, hi, mid) — sized to cells width
    const ptrs = document.createElement('div');
    ptrs.className = 'tf-ptrs';
    ptrs.innerHTML = `
      <div class="tf-ptr tf-ptr-lo"><div class="tf-arrow">▲</div><span>lo</span></div>
      <div class="tf-ptr tf-ptr-hi"><div class="tf-arrow">▲</div><span>hi</span></div>
      <div class="tf-ptr tf-ptr-mid"><div class="tf-arrow">▲</div><span>mid</span></div>
    `;
    cells.parentNode.insertBefore(ptrs, cells.nextSibling);
    // Match width to cells row
    requestAnimationFrame(() => {
      ptrs.style.width = cells.offsetWidth + 'px';
    });

    const status = document.createElement('div');
    status.className = 'tf-status';
    root.appendChild(status);

    const controls = document.createElement('div');
    controls.className = 'tf-controls';
    controls.innerHTML = `
      <button class="aw-btn" data-act="reset">Reset</button>
      <button class="aw-btn" data-act="step">Step</button>
      <button class="aw-btn" data-act="auto">Auto</button>
      <span class="tf-mode">${pattern === 'ttf' ? 'Maximize: largest x with check(x)=T' : 'Minimize: smallest x with check(x)=T'}</span>
    `;
    root.appendChild(controls);

    let lo, hi, ans, autoTimer;

    function cellCenterX(idx) {
      const c = cellEls[idx];
      return c.offsetLeft + c.offsetWidth / 2;
    }

    function placePtr(cls, valIdx, hide = false) {
      const p = ptrs.querySelector(cls);
      if (hide) { p.style.opacity = '0'; return; }
      p.style.opacity = '1';
      p.style.transform = `translateX(${cellCenterX(valIdx)}px)`;
    }

    function reset() {
      stopAuto();
      lo = 0;
      hi = cellEls.length - 1;
      ans = pattern === 'ttf' ? min - 1 : max + 1;
      cellEls.forEach(c => c.classList.remove('tf-active', 'tf-current'));
      placePtr('.tf-ptr-lo', lo);
      placePtr('.tf-ptr-hi', hi);
      placePtr('.tf-ptr-mid', null, true);
      status.textContent = `lo=${min + lo}, hi=${min + hi}`;
    }

    function step() {
      if (lo > hi) {
        status.textContent = `Done. ans = ${ans}`;
        stopAuto();
        return;
      }
      const mid = Math.floor((lo + hi) / 2);
      const midVal = min + mid;
      placePtr('.tf-ptr-mid', mid);
      cellEls.forEach(c => c.classList.remove('tf-current'));
      cellEls[mid].classList.add('tf-current');
      const ok = checkVal(midVal);

      if (pattern === 'ttf') {
        // maximization: T → ans = midVal, lo = mid+1; F → hi = mid-1
        if (ok) { ans = midVal; lo = mid + 1; }
        else { hi = mid - 1; }
      } else {
        // minimization: T → ans = midVal, hi = mid-1; F → lo = mid+1
        if (ok) { ans = midVal; hi = mid - 1; }
        else { lo = mid + 1; }
      }

      if (ok && pattern === 'ttf') cellEls[mid].classList.add('tf-active');
      if (ok && pattern === 'ftt') cellEls[mid].classList.add('tf-active');

      status.textContent = `mid=${midVal}, check=${ok ? 'T' : 'F'} → ans=${ans === min - 1 || ans === max + 1 ? '?' : ans}, lo=${min + Math.max(lo, 0)}, hi=${min + Math.max(hi, -1)}`;

      if (lo <= hi) {
        placePtr('.tf-ptr-lo', Math.min(lo, cellEls.length - 1));
        placePtr('.tf-ptr-hi', Math.max(hi, 0));
      }
    }

    function startAuto() {
      stopAuto();
      autoTimer = setInterval(() => {
        if (lo > hi) { stopAuto(); return; }
        step();
      }, 800);
    }
    function stopAuto() { if (autoTimer) clearInterval(autoTimer); autoTimer = null; }

    controls.addEventListener('click', (e) => {
      const a = e.target.dataset.act;
      if (a === 'reset') reset();
      if (a === 'step') step();
      if (a === 'auto') startAuto();
    });

    requestAnimationFrame(reset);
  }

  window.Widgets['tf-tape'] = mount;
})();
