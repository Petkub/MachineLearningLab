// lower_bound / upper_bound visualizer (redesigned).
// Layout: phase title, array row w/ pointer triangles, predicate panel, code trace, result pills.
// data-widget="bound-vis"
// data-values="1,2,4,4,4,7,9" data-target="4"
(function () {
  function mount(el) {
    if (el.dataset.mounted) return;
    el.dataset.mounted = '1';

    const values = (el.dataset.values || '1,2,4,4,4,7,9').split(',').map(s => parseInt(s.trim(), 10));
    const target = parseInt(el.dataset.target || '4', 10);
    const n = values.length;

    function trace(predicateName) {
      const steps = [];
      let lo = 0, hi = n;
      const pred = predicateName === 'lower'
        ? (v) => v >= target
        : (v) => v > target;
      steps.push({ lo, hi, mid: null, action: 'init', pred: predicateName, codeLine: 0 });
      while (lo < hi) {
        const mid = lo + Math.floor((hi - lo) / 2);
        const ok = pred(values[mid]);
        steps.push({ lo, hi, mid, action: 'check', ok, pred: predicateName, codeLine: 1 });
        if (ok) {
          steps.push({ lo, hi: mid, mid, action: 'shrink', ok, pred: predicateName, codeLine: 2 });
          hi = mid;
        } else {
          steps.push({ lo: mid + 1, hi, mid, action: 'shrink', ok, pred: predicateName, codeLine: 3 });
          lo = mid + 1;
        }
      }
      steps.push({ lo, hi, mid: null, action: 'done', result: lo, pred: predicateName, codeLine: 4 });
      return steps;
    }

    const lowerSteps = trace('lower');
    const upperSteps = trace('upper');
    const allSteps = lowerSteps.concat(upperSteps);
    const lowerResult = lowerSteps[lowerSteps.length - 1].result;
    const upperResult = upperSteps[upperSteps.length - 1].result;
    let step = 0;

    const root = document.createElement('div');
    root.className = 'bv2-root';
    el.appendChild(root);

    // ----- Phase title -----
    const phaseTitle = document.createElement('div');
    phaseTitle.className = 'bv2-phase';
    root.appendChild(phaseTitle);

    // ----- Main grid: array left, code right -----
    const main = document.createElement('div');
    main.className = 'bv2-main';
    root.appendChild(main);

    // Array SVG
    const cellW = 60, cellH = 56, cellGap = 6;
    const pinH = 50; // space above array for pointer triangles
    const arrayY = pinH;
    const W = n * cellW + (n - 1) * cellGap + 40;
    const H = pinH + cellH + 30;
    const padX = (W - (n * cellW + (n - 1) * cellGap)) / 2;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('class', 'bv2-svg');
    main.appendChild(svg);

    function cellX(i) { return padX + i * (cellW + cellGap); }
    function cellMidX(i) { return cellX(i) + cellW / 2; }
    function gapX(i) {
      // x of left edge of cell i; for hi=n use right edge of last cell
      if (i >= n) return cellX(n - 1) + cellW + cellGap / 2;
      return cellX(i) - cellGap / 2;
    }

    // shaded final range
    const rangeRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rangeRect.setAttribute('y', arrayY - 3);
    rangeRect.setAttribute('height', cellH + 6);
    rangeRect.setAttribute('fill', '#fde9a3');
    rangeRect.setAttribute('opacity', '0');
    rangeRect.setAttribute('rx', '6');
    svg.appendChild(rangeRect);

    // cells
    const cellEls = [];
    for (let i = 0; i < n; i++) {
      const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      r.setAttribute('x', cellX(i));
      r.setAttribute('y', arrayY);
      r.setAttribute('width', cellW);
      r.setAttribute('height', cellH);
      r.setAttribute('fill', '#fff');
      r.setAttribute('stroke', '#111');
      r.setAttribute('stroke-width', '2');
      r.setAttribute('rx', '5');
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', cellMidX(i));
      t.setAttribute('y', arrayY + cellH / 2 + 7);
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('font-family', 'JetBrains Mono, monospace');
      t.setAttribute('font-size', '20');
      t.setAttribute('font-weight', '800');
      t.textContent = values[i];
      const idx = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      idx.setAttribute('x', cellMidX(i));
      idx.setAttribute('y', arrayY + cellH + 18);
      idx.setAttribute('text-anchor', 'middle');
      idx.setAttribute('font-family', 'JetBrains Mono, monospace');
      idx.setAttribute('font-size', '12');
      idx.setAttribute('fill', '#888');
      idx.textContent = i;
      svg.appendChild(r); svg.appendChild(t); svg.appendChild(idx);
      cellEls.push({ rect: r, val: t });
    }

    // ----- Pointer pins (lo, mid, hi) -----
    function makePin(label, color, useGap) {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'bv2-pin');
      const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      lbl.setAttribute('text-anchor', 'middle');
      lbl.setAttribute('font-family', 'JetBrains Mono, monospace');
      lbl.setAttribute('font-size', '12');
      lbl.setAttribute('font-weight', '700');
      lbl.setAttribute('fill', color);
      lbl.textContent = label;
      const tri = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      tri.setAttribute('fill', color);
      g.appendChild(lbl); g.appendChild(tri);
      g.dataset.useGap = useGap ? '1' : '0';
      g.style.opacity = '0';
      svg.appendChild(g);
      return { g, label: lbl, tri };
    }
    function placePin(pin, idx, useGap) {
      const x = useGap ? gapX(idx) : cellMidX(idx);
      const tipY = arrayY - 4;
      const baseY = arrayY - 22;
      pin.label.setAttribute('x', x);
      pin.label.setAttribute('y', baseY - 4);
      pin.tri.setAttribute('d', `M ${x - 6} ${baseY} L ${x + 6} ${baseY} L ${x} ${tipY} Z`);
    }

    const loPin  = makePin('lo',  '#1d3fb6', false);
    const hiPin  = makePin('hi',  '#1d3fb6', true);
    const midPin = makePin('mid', '#d62828', false);

    // ----- Code trace panel -----
    const codeBox = document.createElement('pre');
    codeBox.className = 'bv2-code';
    main.appendChild(codeBox);

    function codeLines(predName) {
      const cmp = predName === 'lower' ? '>=' : '>';
      return [
        `lo = 0; hi = a.size();`,
        `mid = lo + (hi - lo) / 2;   // a[mid] ${cmp} ${target} ?`,
        `if (true)  hi = mid;`,
        `if (false) lo = mid + 1;`,
        `return lo;`,
      ];
    }

    function renderCode(predName, activeLine) {
      const lines = codeLines(predName);
      let html = '';
      for (let i = 0; i < lines.length; i++) {
        const cls = (i === activeLine) ? 'bv2-codeline bv2-codeline-active' : 'bv2-codeline';
        html += `<div class="${cls}">${lines[i].replace(/</g, '&lt;')}</div>`;
      }
      codeBox.innerHTML = html;
    }

    // ----- Predicate panel -----
    const predPanel = document.createElement('div');
    predPanel.className = 'bv2-pred';
    root.appendChild(predPanel);

    // ----- Result strip -----
    const result = document.createElement('div');
    result.className = 'bv2-result';
    root.appendChild(result);

    // ----- Controls -----
    const ctrl = document.createElement('div');
    ctrl.className = 'bv2-controls';
    ctrl.innerHTML = `
      <button class="aw-btn" data-act="prev">&larr; Back</button>
      <button class="aw-btn" data-act="next">Step &rarr;</button>
      <button class="aw-btn" data-act="play">Play</button>
      <button class="aw-btn" data-act="reset">Reset</button>
    `;
    root.appendChild(ctrl);

    function render() {
      const s = allSteps[step];
      const phase = s.pred;
      const phaseColor = phase === 'lower' ? '#2f9e44' : '#1d3fb6';
      const cmpSym = phase === 'lower' ? '≥' : '>';

      // ----- Phase title -----
      phaseTitle.innerHTML = `<span style="color:${phaseColor}">${phase === 'lower' ? 'lower_bound' : 'upper_bound'}(${target})</span> &nbsp;<span style="color:#888;font-size:14px">predicate: a[mid] ${cmpSym} ${target}</span>`;

      // ----- Cells -----
      cellEls.forEach((c, i) => {
        let fill = '#fff', stroke = '#111', sw = '2', valColor = '#111';
        if (s.action !== 'done') {
          if (i < s.lo || i >= s.hi) {
            fill = '#f0f0f0'; valColor = '#bbb'; stroke = '#bbb';
          }
        }
        if (s.mid !== null && s.mid !== undefined && i === s.mid && s.action === 'check') {
          fill = '#ffd6d6'; stroke = '#d62828'; sw = '3';
        }
        if (s.mid !== null && s.mid !== undefined && i === s.mid && s.action === 'shrink') {
          fill = '#fde9a3'; stroke = '#111'; sw = '2';
        }
        c.rect.setAttribute('fill', fill);
        c.rect.setAttribute('stroke', stroke);
        c.rect.setAttribute('stroke-width', sw);
        c.val.setAttribute('fill', valColor);
      });

      // ----- Pins -----
      if (s.action === 'done') {
        loPin.g.style.opacity = '0';
        hiPin.g.style.opacity = '0';
        midPin.g.style.opacity = '0';
      } else {
        placePin(loPin, s.lo, false);
        placePin(hiPin, s.hi, true);
        loPin.g.style.opacity = '1';
        hiPin.g.style.opacity = '1';
        if (s.mid !== null && s.mid !== undefined) {
          placePin(midPin, s.mid, false);
          midPin.g.style.opacity = '1';
        } else {
          midPin.g.style.opacity = '0';
        }
      }

      // ----- Final range shading (only on very last step of all) -----
      const fullyDone = step === allSteps.length - 1;
      if (fullyDone && lowerResult < upperResult) {
        const x1 = cellX(lowerResult) - 4;
        const x2 = (upperResult >= n ? cellX(n - 1) + cellW : cellX(upperResult)) + 4;
        rangeRect.setAttribute('x', x1);
        rangeRect.setAttribute('width', x2 - x1);
        rangeRect.setAttribute('opacity', '0.55');
      } else {
        rangeRect.setAttribute('opacity', '0');
      }

      // ----- Code trace -----
      let codeLine = -1;
      if (s.action === 'init') codeLine = 0;
      else if (s.action === 'check') codeLine = 1;
      else if (s.action === 'shrink') codeLine = s.ok ? 2 : 3;
      else if (s.action === 'done') codeLine = 4;
      renderCode(phase, codeLine);

      // ----- Predicate panel -----
      if (s.action === 'init') {
        predPanel.innerHTML = `<div class="bv2-pred-text">Initialize <code>lo=${s.lo}</code>, <code>hi=${s.hi}</code>. Search range <code>[${s.lo}, ${s.hi})</code>.</div>`;
      } else if (s.action === 'check') {
        predPanel.innerHTML = `
          <div class="bv2-pred-formula">
            <code>a[${s.mid}]</code> = <b>${values[s.mid]}</b>
            <span class="bv2-cmp">${cmpSym}</span>
            <b>${target}</b>
            <span class="bv2-pred-q">?</span>
            <span class="bv2-stamp ${s.ok ? 'bv2-stamp-true' : 'bv2-stamp-false'}">${s.ok ? 'TRUE' : 'FALSE'}</span>
          </div>`;
      } else if (s.action === 'shrink') {
        if (s.ok) {
          predPanel.innerHTML = `<div class="bv2-pred-text">Predicate true at <code>${s.mid}</code> &rarr; answer is at most <code>${s.mid}</code>. Set <code style="color:var(--accent-blue)">hi = mid = ${s.hi}</code>.</div>`;
        } else {
          predPanel.innerHTML = `<div class="bv2-pred-text">Predicate false at <code>${s.mid}</code> &rarr; answer is past it. Set <code style="color:var(--accent-blue)">lo = mid + 1 = ${s.lo}</code>.</div>`;
        }
      } else if (s.action === 'done') {
        predPanel.innerHTML = `<div class="bv2-pred-text"><code>lo == hi == ${s.lo}</code>. Loop ends. <b style="color:${phaseColor}">return ${s.result}</b>.</div>`;
      }

      // ----- Result pills -----
      const lowerPhaseDone = step >= lowerSteps.length - 1;
      const upperPhaseDone = step >= allSteps.length - 1;
      let pills = '';
      if (lowerPhaseDone) {
        pills += `<span class="bv2-pill bv2-pill-green">lower_bound = ${lowerResult}</span>`;
      }
      if (upperPhaseDone) {
        pills += `<span class="bv2-pill bv2-pill-blue">upper_bound = ${upperResult}</span>`;
        pills += `<span class="bv2-pill bv2-pill-red">count = ${upperResult - lowerResult}</span>`;
      }
      result.innerHTML = pills;
    }

    let timer = null;
    function stop() { if (timer) { clearInterval(timer); timer = null; } }

    ctrl.addEventListener('click', (e) => {
      const act = e.target.dataset.act;
      if (!act) return;
      if (act === 'next') { stop(); if (step < allSteps.length - 1) step++; render(); }
      if (act === 'prev') { stop(); if (step > 0) step--; render(); }
      if (act === 'reset') { stop(); step = 0; render(); }
      if (act === 'play') {
        if (timer) { stop(); return; }
        if (step >= allSteps.length - 1) step = 0;
        render();
        timer = setInterval(() => {
          if (step >= allSteps.length - 1) { stop(); return; }
          step++; render();
        }, 850);
      }
    });

    render();
  }

  window.Widgets = window.Widgets || {};
  window.Widgets['bound-vis'] = mount;
})();
