// Binary heap visualizer — array view + tree view, push/pop sift animation.
// data-widget="heap-vis"
// data-values="5,3,8,1,9,2"   initial values (optional)
// data-mode="max" | "min"      default max
(function () {
  function mount(el) {
    if (el.dataset.mounted) return;
    el.dataset.mounted = '1';

    const initial = el.dataset.values
      ? el.dataset.values.split(',').map(s => parseInt(s.trim(), 10))
      : [];
    let mode = el.dataset.mode === 'min' ? 'min' : 'max';

    let heap = [];
    let highlight = new Set();   // node indices flashing
    let comparing = new Set();   // node indices being compared
    let busy = false;

    function cmp(a, b) {
      return mode === 'max' ? a > b : a < b;
    }

    const root = document.createElement('div');
    root.className = 'hv-root';
    el.appendChild(root);

    const top = document.createElement('div');
    top.className = 'hv-top';
    root.appendChild(top);

    const arrayBox = document.createElement('div');
    arrayBox.className = 'hv-arraybox';
    arrayBox.innerHTML = `<div class="hv-cap">array</div><div class="hv-arr"></div>`;
    top.appendChild(arrayBox);

    const treeBox = document.createElement('div');
    treeBox.className = 'hv-treebox';
    treeBox.innerHTML = `<div class="hv-cap">tree</div><svg class="hv-svg" viewBox="0 0 520 240" preserveAspectRatio="xMidYMid meet"></svg>`;
    top.appendChild(treeBox);

    const status = document.createElement('div');
    status.className = 'hv-status';
    root.appendChild(status);

    const ctrl = document.createElement('div');
    ctrl.className = 'hv-controls';
    ctrl.innerHTML = `
      <label>val<input type="number" class="hv-in" value="7" style="width:60px"></label>
      <button class="aw-btn" data-act="push">Push</button>
      <button class="aw-btn" data-act="pop">Pop</button>
      <button class="aw-btn" data-act="reset">Reset</button>
      <span class="hv-mode">
        <button class="aw-btn hv-toggle" data-act="mode">${mode}-heap</button>
      </span>
    `;
    root.appendChild(ctrl);

    function setStatus(html) { status.innerHTML = html; }

    function render() {
      // array
      const arrEl = arrayBox.querySelector('.hv-arr');
      let ah = '';
      heap.forEach((v, i) => {
        let cls = '';
        if (highlight.has(i)) cls = 'hv-hot';
        else if (comparing.has(i)) cls = 'hv-cmp';
        ah += `<div class="hv-cell ${cls}"><div class="hv-idx">${i}</div><div class="hv-val">${v}</div></div>`;
      });
      if (heap.length === 0) ah = `<div class="hv-empty">empty</div>`;
      arrEl.innerHTML = ah;

      // tree
      const svg = treeBox.querySelector('svg');
      svg.innerHTML = renderTree(heap);
    }

    function renderTree(h) {
      if (h.length === 0) return `<text x="260" y="120" text-anchor="middle" font-family="JetBrains Mono" fill="#888" font-size="14">empty heap</text>`;
      const n = h.length;
      const depth = Math.floor(Math.log2(Math.max(1, n))) + 1;
      const W = 520, H = 240;
      const levelH = Math.min(60, (H - 20) / depth);
      const positions = [];
      for (let i = 0; i < n; i++) {
        const lvl = Math.floor(Math.log2(i + 1));
        const idxInLvl = i - (Math.pow(2, lvl) - 1);
        const slots = Math.pow(2, lvl);
        const x = ((idxInLvl + 0.5) / slots) * W;
        const y = 24 + lvl * levelH;
        positions.push({ x, y });
      }
      let edges = '';
      for (let i = 1; i < n; i++) {
        const p = (i - 1) >> 1;
        edges += `<line x1="${positions[p].x}" y1="${positions[p].y}" x2="${positions[i].x}" y2="${positions[i].y}" stroke="#222" stroke-width="2"/>`;
      }
      let nodes = '';
      for (let i = 0; i < n; i++) {
        let fill = '#fde9a3';
        let textFill = '#1a1a1a';
        if (highlight.has(i)) { fill = '#d62828'; textFill = '#fff'; }
        else if (comparing.has(i)) { fill = '#1d3fb6'; textFill = '#fff'; }
        else if (i === 0) { fill = '#2f9e44'; textFill = '#fff'; }
        nodes += `<g><circle cx="${positions[i].x}" cy="${positions[i].y}" r="18" fill="${fill}" stroke="#1a1a1a" stroke-width="2"/>
          <text x="${positions[i].x}" y="${positions[i].y + 5}" text-anchor="middle" font-family="JetBrains Mono" font-weight="800" font-size="14" fill="${textFill}">${h[i]}</text></g>`;
      }
      return edges + nodes;
    }

    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    async function siftUp(i) {
      while (i > 0) {
        const p = (i - 1) >> 1;
        comparing = new Set([i, p]);
        render();
        await sleep(450);
        if (cmp(heap[i], heap[p])) {
          [heap[i], heap[p]] = [heap[p], heap[i]];
          highlight = new Set([p]);
          comparing = new Set();
          render();
          await sleep(300);
          i = p;
        } else {
          break;
        }
      }
      comparing = new Set();
      highlight = new Set();
      render();
    }

    async function siftDown(i) {
      const n = heap.length;
      while (true) {
        const l = 2 * i + 1, r = 2 * i + 2;
        let best = i;
        if (l < n && cmp(heap[l], heap[best])) best = l;
        if (r < n && cmp(heap[r], heap[best])) best = r;
        comparing = new Set([i]);
        if (l < n) comparing.add(l);
        if (r < n) comparing.add(r);
        render();
        await sleep(450);
        if (best === i) break;
        [heap[i], heap[best]] = [heap[best], heap[i]];
        highlight = new Set([best]);
        comparing = new Set();
        render();
        await sleep(300);
        i = best;
      }
      comparing = new Set();
      highlight = new Set();
      render();
    }

    async function push(v) {
      if (busy) return;
      busy = true;
      heap.push(v);
      highlight = new Set([heap.length - 1]);
      setStatus(`push <b>${v}</b> at index ${heap.length - 1}, then sift-up.`);
      render();
      await sleep(400);
      await siftUp(heap.length - 1);
      setStatus(`pushed <b>${v}</b>. heap size = ${heap.length}.`);
      busy = false;
    }

    async function pop() {
      if (busy) return;
      if (heap.length === 0) { setStatus('heap empty.'); return; }
      busy = true;
      const top = heap[0];
      const last = heap.pop();
      if (heap.length === 0) {
        setStatus(`pop <b>${top}</b>. heap empty.`);
        render();
        busy = false;
        return;
      }
      heap[0] = last;
      highlight = new Set([0]);
      setStatus(`pop top <b>${top}</b>, move last (<b>${last}</b>) to root, then sift-down.`);
      render();
      await sleep(500);
      await siftDown(0);
      setStatus(`popped <b>${top}</b>. heap size = ${heap.length}.`);
      busy = false;
    }

    function reset() {
      if (busy) return;
      heap = [];
      highlight = new Set();
      comparing = new Set();
      // re-build from initial
      (async () => {
        busy = true;
        for (const v of initial) {
          heap.push(v);
          await siftUp(heap.length - 1);
        }
        setStatus(`reset to initial. mode = ${mode}-heap.`);
        busy = false;
      })();
    }

    ctrl.addEventListener('click', (e) => {
      const a = e.target.dataset.act;
      if (!a) return;
      if (a === 'push') {
        const v = parseInt(ctrl.querySelector('.hv-in').value, 10);
        if (!isNaN(v)) push(v);
      }
      if (a === 'pop') pop();
      if (a === 'reset') reset();
      if (a === 'mode') {
        if (busy) return;
        mode = mode === 'max' ? 'min' : 'max';
        ctrl.querySelector('.hv-toggle').textContent = `${mode}-heap`;
        // re-heapify by sifting down from last parent
        for (let i = (heap.length >> 1) - 1; i >= 0; i--) {
          let cur = i, n = heap.length;
          while (true) {
            const l = 2 * cur + 1, r = 2 * cur + 2;
            let best = cur;
            if (l < n && cmp(heap[l], heap[best])) best = l;
            if (r < n && cmp(heap[r], heap[best])) best = r;
            if (best === cur) break;
            [heap[cur], heap[best]] = [heap[best], heap[cur]];
            cur = best;
          }
        }
        setStatus(`switched to <b>${mode}-heap</b>. re-heapified.`);
        render();
      }
    });

    // initial heapify silently
    (async () => {
      busy = true;
      for (const v of initial) {
        heap.push(v);
        // silent sift-up
        let i = heap.length - 1;
        while (i > 0) {
          const p = (i - 1) >> 1;
          if (cmp(heap[i], heap[p])) {
            [heap[i], heap[p]] = [heap[p], heap[i]];
            i = p;
          } else break;
        }
      }
      setStatus(`${mode}-heap. push, pop, or toggle mode.`);
      render();
      busy = false;
    })();
  }

  window.Widgets = window.Widgets || {};
  window.Widgets['heap-vis'] = mount;
})();
