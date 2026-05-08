// bitmask-explorer — interactive bit panel.
// Click bits to toggle. Buttons: set/clear/toggle bit i, +1, -1, lowbit, popcount.
// Shows: bit row, decimal, hex, set notation, popcount, lowbit, two's-complement of -x.
// Optional "sweep all" iterates 0..2^n-1.
//
// Attrs:
//   data-n     : number of bits (default 5)
//   data-items : csv labels for elements (default "a,b,c,d,e...")
//   data-init  : initial mask (default 0)
(function () {
  function readNum(v, def) { const n = +v; return Number.isFinite(n) ? n : def; }
  function csv(s) { return (s || '').split(',').map(x => x.trim()).filter(x => x.length); }

  function mount(el) {
    if (el.dataset.mounted) return;
    el.dataset.mounted = '1';

    const n = Math.min(readNum(el.dataset.n, 5), 8);
    let labels = csv(el.dataset.items || '');
    if (labels.length < n) {
      const def = ['a','b','c','d','e','f','g','h'];
      labels = def.slice(0, n);
    } else {
      labels = labels.slice(0, n);
    }
    let mask = readNum(el.dataset.init, 0) & ((1 << n) - 1);

    const wrap = document.createElement('div');
    wrap.className = 'bx-wrap';

    // bit row
    const bitRow = document.createElement('div');
    bitRow.className = 'bx-bits';
    wrap.appendChild(bitRow);

    // labels under bits
    const labRow = document.createElement('div');
    labRow.className = 'bx-labels';
    wrap.appendChild(labRow);

    // info panel
    const info = document.createElement('div');
    info.className = 'bx-info';
    wrap.appendChild(info);

    // controls
    const ctrl = document.createElement('div');
    ctrl.className = 'bx-ctrl';
    ctrl.innerHTML = `
      <button class="bx-dec">−1</button>
      <button class="bx-inc">+1</button>
      <button class="bx-reset">reset</button>
      <button class="bx-clear-low">clear lowbit</button>
      <button class="bx-sweep">sweep</button>
      <span class="bx-status"></span>
    `;
    wrap.appendChild(ctrl);

    el.appendChild(wrap);

    function popcount(x) { let c = 0; while (x) { x &= x - 1; c++; } return c; }
    function ctz(x) { if (!x) return -1; let i = 0; while (!(x & 1)) { x >>= 1; i++; } return i; }

    function render() {
      bitRow.innerHTML = '';
      labRow.innerHTML = '';
      const lowbit = mask & -mask;
      const lowIdx = ctz(lowbit);
      for (let i = n - 1; i >= 0; i--) {
        const b = document.createElement('div');
        const on = (mask >> i) & 1;
        b.className = 'bx-bit' + (on ? ' on' : '') + (i === lowIdx ? ' lowbit' : '');
        b.textContent = on ? '1' : '0';
        b.dataset.i = i;
        b.title = 'bit ' + i;
        b.addEventListener('click', () => { mask ^= (1 << i); render(); });
        bitRow.appendChild(b);

        const lab = document.createElement('div');
        lab.className = 'bx-label' + (on ? ' on' : '');
        lab.innerHTML = `<small>bit ${i}</small><span>${labels[i]}</span>`;
        labRow.appendChild(lab);
      }

      const set = [];
      for (let i = 0; i < n; i++) if ((mask >> i) & 1) set.push(labels[i]);
      const setStr = set.length ? '{ ' + set.join(', ') + ' }' : '∅';

      info.innerHTML = `
        <div class="bx-line"><b>mask</b> = ${mask}<sub>10</sub> = 0x${mask.toString(16).toUpperCase()} = 0b${mask.toString(2).padStart(n, '0')}</div>
        <div class="bx-line"><b>set</b>  = ${setStr}</div>
        <div class="bx-line"><b>popcount</b> = ${popcount(mask)} &nbsp; <b>lowbit</b> = ${lowbit} ${lowIdx >= 0 ? `(bit ${lowIdx})` : ''}</div>
      `;
    }

    ctrl.querySelector('.bx-inc').onclick = () => { mask = (mask + 1) & ((1 << n) - 1); render(); };
    ctrl.querySelector('.bx-dec').onclick = () => { mask = (mask - 1 + (1 << n)) & ((1 << n) - 1); render(); };
    ctrl.querySelector('.bx-reset').onclick = () => { mask = 0; render(); };
    ctrl.querySelector('.bx-clear-low').onclick = () => { mask = mask & (mask - 1); render(); };

    let sweepTimer = null;
    ctrl.querySelector('.bx-sweep').onclick = () => {
      if (sweepTimer) {
        clearInterval(sweepTimer); sweepTimer = null;
        ctrl.querySelector('.bx-sweep').textContent = 'sweep';
        ctrl.querySelector('.bx-status').textContent = '';
        return;
      }
      ctrl.querySelector('.bx-sweep').textContent = 'stop';
      mask = 0; render();
      sweepTimer = setInterval(() => {
        mask = (mask + 1) & ((1 << n) - 1);
        render();
        ctrl.querySelector('.bx-status').textContent = `enumerating ${mask}/${(1<<n)-1}`;
        if (mask === (1 << n) - 1) {
          setTimeout(() => {
            if (sweepTimer) { clearInterval(sweepTimer); sweepTimer = null;
              ctrl.querySelector('.bx-sweep').textContent = 'sweep';
              ctrl.querySelector('.bx-status').textContent = `done — ${1 << n} subsets`;
            }
          }, 600);
        }
      }, 300);
    };

    render();
  }

  window.Widgets['bitmask-explorer'] = mount;
})();
