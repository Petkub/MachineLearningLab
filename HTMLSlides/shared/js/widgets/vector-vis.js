// vector-vis — resizable vector w/ capacity doubling demo.
// Cells: capacity slots (light gray when unused). Filled slots show value.
// On push_back: if size==capacity, double capacity, copy items (animated), then place new.
// Buttons: push_back (input), pop_back, clear, doubling demo (autoplay).
//
// Attrs:
//   data-init : csv initial values (default empty)
//   data-cap  : initial capacity (default max(2, init.length rounded up to power of 2))
(function () {
  function csv(s) { return (s || '').split(',').map(x => +x.trim()).filter(Number.isFinite); }
  function readNum(v, def) { const n = +v; return Number.isFinite(n) ? n : def; }
  function nextPow2(n) { let p = 1; while (p < n) p *= 2; return Math.max(p, 2); }

  function mount(el) {
    if (el.dataset.mounted) return;
    el.dataset.mounted = '1';

    const init = csv(el.dataset.init || '');
    let items = init.slice();
    let cap = readNum(el.dataset.cap, nextPow2(Math.max(items.length, 2)));
    if (cap < items.length) cap = nextPow2(items.length);

    const wrap = document.createElement('div');
    wrap.className = 'vv-wrap';

    const head = document.createElement('div');
    head.className = 'vv-head';
    wrap.appendChild(head);

    const row = document.createElement('div');
    row.className = 'vv-row';
    wrap.appendChild(row);

    const status = document.createElement('div');
    status.className = 'vv-status';
    wrap.appendChild(status);

    const ctrl = document.createElement('div');
    ctrl.className = 'vv-ctrl';
    ctrl.innerHTML = `
      <input class="vv-in" type="text" value="7" size="3" maxlength="3"/>
      <button class="vv-pb">push_back</button>
      <button class="vv-pp">pop_back</button>
      <button class="vv-clr">clear</button>
      <button class="vv-demo">demo doubling</button>
    `;
    wrap.appendChild(ctrl);
    el.appendChild(wrap);

    function render(highlightIdx, doublingFlash) {
      head.innerHTML =
        `<span class="vv-stat">size = <b>${items.length}</b></span>` +
        `<span class="vv-stat">capacity = <b>${cap}</b></span>`;
      row.innerHTML = '';
      for (let i = 0; i < cap; i++) {
        const c = document.createElement('div');
        c.className = 'vv-cell';
        if (i < items.length) {
          c.classList.add('filled');
          c.textContent = items[i];
        } else {
          c.classList.add('empty');
          c.textContent = '·';
        }
        if (highlightIdx === i) c.classList.add('cur');
        if (doublingFlash) c.classList.add('flash');
        // index label
        const lab = document.createElement('small');
        lab.textContent = i;
        c.appendChild(lab);
        row.appendChild(c);
      }
    }

    function setStatus(msg) { status.textContent = msg; }

    function pushBack(val) {
      if (items.length === cap) {
        const oldCap = cap;
        cap *= 2;
        setStatus(`capacity full (${oldCap}). double to ${cap}, copy ${items.length} items, then place ${val}.`);
        render(items.length, true);
        setTimeout(() => {
          items.push(val);
          render(items.length - 1);
          setStatus(`pushed ${val}. size=${items.length} capacity=${cap}.`);
        }, 600);
      } else {
        items.push(val);
        render(items.length - 1);
        setStatus(`pushed ${val}. size=${items.length} capacity=${cap}.`);
      }
    }

    function popBack() {
      if (!items.length) { setStatus('empty — pop_back is undefined behavior.'); return; }
      const v = items.pop();
      render();
      setStatus(`popped ${v}. size=${items.length} capacity=${cap}. (capacity unchanged)`);
    }

    function clear() {
      items = []; cap = 2;
      render();
      setStatus('cleared. size=0 capacity=2.');
    }

    function demo() {
      items = []; cap = 2;
      render();
      setStatus('demo: push 1..8, watch capacity grow 2 → 4 → 8.');
      let i = 1;
      const tick = () => {
        if (i > 8) { setStatus(`done. 8 pushes, 3 doublings (cap 2→4→8).`); return; }
        pushBack(i);
        i++;
        setTimeout(tick, 950);
      };
      setTimeout(tick, 600);
    }

    ctrl.querySelector('.vv-pb').onclick = () => {
      const raw = ctrl.querySelector('.vv-in').value;
      const v = +raw;
      if (!Number.isFinite(v)) return;
      pushBack(v);
    };
    ctrl.querySelector('.vv-pp').onclick = popBack;
    ctrl.querySelector('.vv-clr').onclick = clear;
    ctrl.querySelector('.vv-demo').onclick = demo;

    render();
    setStatus('press push_back, or click demo for capacity doubling.');
    if (el.dataset.autoplay === '1') setTimeout(demo, 400);
  }

  window.Widgets['vector-vis'] = mount;
})();
