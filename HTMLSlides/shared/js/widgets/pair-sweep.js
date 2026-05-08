// Nested-loop pair sweep animator for brute-force pair sum.
// Two pointers (i, j) sweep all pairs (i<j), check sum vs target.
// data-widget="pair-sweep"
// data-values="2,4,7,11" data-target="9"
(function () {
  function mount(el) {
    if (el.dataset.mounted) return;
    el.dataset.mounted = '1';

    const values = (el.dataset.values || '2,4,7,11').split(',').map(s => parseInt(s.trim(), 10));
    const target = parseInt(el.dataset.target || '9', 10);
    const n = values.length;

    // build pair sequence (i, j) with j > i
    const pairs = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pairs.push([i, j]);
    let step = -1; // -1 = before any pair
    const MAX = pairs.length;

    const root = document.createElement('div');
    root.className = 'ps-root';
    el.appendChild(root);

    const cellW = 60, cellH = 50, gap = 6, padX = 30, pinH = 36;
    const W = padX * 2 + n * cellW + (n - 1) * gap;
    const H = pinH + cellH + 22;
    const arrayY = pinH;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('class', 'ps-svg');
    root.appendChild(svg);

    function cellX(i) { return padX + i * (cellW + gap); }
    function cellMidX(i) { return cellX(i) + cellW / 2; }

    // cells
    const cellEls = [];
    for (let i = 0; i < n; i++) {
      const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      r.setAttribute('x', cellX(i)); r.setAttribute('y', arrayY);
      r.setAttribute('width', cellW); r.setAttribute('height', cellH);
      r.setAttribute('fill', '#fff'); r.setAttribute('stroke', '#111');
      r.setAttribute('stroke-width', '2'); r.setAttribute('rx', '5');
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', cellMidX(i)); t.setAttribute('y', arrayY + cellH / 2 + 7);
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('font-family', 'JetBrains Mono, monospace');
      t.setAttribute('font-size', '20'); t.setAttribute('font-weight', '800');
      t.textContent = values[i];
      const idx = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      idx.setAttribute('x', cellMidX(i)); idx.setAttribute('y', arrayY + cellH + 16);
      idx.setAttribute('text-anchor', 'middle');
      idx.setAttribute('font-family', 'JetBrains Mono, monospace');
      idx.setAttribute('font-size', '12'); idx.setAttribute('fill', '#888');
      idx.textContent = i;
      svg.appendChild(r); svg.appendChild(t); svg.appendChild(idx);
      cellEls.push({ rect: r, val: t });
    }

    function makePin(label, color) {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      lbl.setAttribute('text-anchor', 'middle');
      lbl.setAttribute('font-family', 'JetBrains Mono, monospace');
      lbl.setAttribute('font-size', '12'); lbl.setAttribute('font-weight', '700');
      lbl.setAttribute('fill', color);
      lbl.textContent = label;
      const tri = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      tri.setAttribute('fill', color);
      g.appendChild(lbl); g.appendChild(tri);
      g.style.opacity = '0';
      svg.appendChild(g);
      return { g, label: lbl, tri };
    }
    function placePin(pin, idx) {
      const x = cellMidX(idx);
      pin.label.setAttribute('x', x);
      pin.label.setAttribute('y', arrayY - 18);
      pin.tri.setAttribute('d', `M ${x - 6} ${arrayY - 14} L ${x + 6} ${arrayY - 14} L ${x} ${arrayY - 4} Z`);
    }

    const iPin = makePin('i', '#1d3fb6');
    const jPin = makePin('j', '#d62828');

    const status = document.createElement('div');
    status.className = 'ps-status';
    root.appendChild(status);

    const counter = document.createElement('div');
    counter.className = 'ps-counter';
    root.appendChild(counter);

    const ctrl = document.createElement('div');
    ctrl.className = 'ps-controls';
    ctrl.innerHTML = `
      <button class="aw-btn" data-act="prev">&larr; Back</button>
      <button class="aw-btn" data-act="next">Step &rarr;</button>
      <button class="aw-btn" data-act="play">Play</button>
      <button class="aw-btn" data-act="reset">Reset</button>
    `;
    root.appendChild(ctrl);

    function render() {
      // reset
      cellEls.forEach(c => {
        c.rect.setAttribute('fill', '#fff');
        c.rect.setAttribute('stroke', '#111');
        c.rect.setAttribute('stroke-width', '2');
      });
      iPin.g.style.opacity = '0';
      jPin.g.style.opacity = '0';

      if (step < 0) {
        status.innerHTML = `Press <b>Step</b> to try first pair. Target = <b>${target}</b>.`;
        counter.innerHTML = `pairs checked: <b>0</b> / ${MAX}`;
        return;
      }
      if (step >= MAX) {
        // search ended without match — but check if there was a match earlier
        const matchIdx = pairs.findIndex(([i, j]) => values[i] + values[j] === target);
        if (matchIdx >= 0 && matchIdx < step) {
          const [mi, mj] = pairs[matchIdx];
          cellEls[mi].rect.setAttribute('fill', '#d3f9d8');
          cellEls[mj].rect.setAttribute('fill', '#d3f9d8');
          status.innerHTML = `Done. <span style="color:var(--accent-green)"><b>Match found</b></span> at pair <code>(${mi}, ${mj})</code>: ${values[mi]} + ${values[mj]} = ${target}.`;
        } else {
          status.innerHTML = `Done. No pair sums to ${target}.`;
        }
        counter.innerHTML = `pairs checked: <b>${MAX}</b> / ${MAX}`;
        return;
      }

      const [i, j] = pairs[step];
      const sum = values[i] + values[j];
      const ok = sum === target;
      placePin(iPin, i); placePin(jPin, j);
      iPin.g.style.opacity = '1'; jPin.g.style.opacity = '1';
      cellEls[i].rect.setAttribute('fill', '#cfe1ff');
      cellEls[i].rect.setAttribute('stroke', '#1d3fb6');
      cellEls[i].rect.setAttribute('stroke-width', '3');
      cellEls[j].rect.setAttribute('fill', ok ? '#d3f9d8' : '#ffd6d6');
      cellEls[j].rect.setAttribute('stroke', ok ? '#2f9e44' : '#d62828');
      cellEls[j].rect.setAttribute('stroke-width', '3');

      status.innerHTML = `<code>(i=${i}, j=${j})</code>: <code>${values[i]} + ${values[j]} = ${sum}</code>. ${sum === target ? '<b style="color:var(--accent-green)">= ' + target + ' ✓ MATCH</b>' : '≠ ' + target + ', skip.'}`;
      counter.innerHTML = `pairs checked: <b>${step + 1}</b> / ${MAX}`;
    }

    let timer = null;
    function stop() { if (timer) { clearInterval(timer); timer = null; } }

    ctrl.addEventListener('click', (e) => {
      const act = e.target.dataset.act;
      if (!act) return;
      if (act === 'next') { stop(); if (step < MAX) step++; render(); }
      if (act === 'prev') { stop(); if (step > -1) step--; render(); }
      if (act === 'reset') { stop(); step = -1; render(); }
      if (act === 'play') {
        if (timer) { stop(); return; }
        if (step >= MAX) step = -1;
        render();
        timer = setInterval(() => {
          if (step >= MAX) { stop(); return; }
          step++; render();
        }, 700);
      }
    });

    render();
  }

  window.Widgets = window.Widgets || {};
  window.Widgets['pair-sweep'] = mount;
})();
