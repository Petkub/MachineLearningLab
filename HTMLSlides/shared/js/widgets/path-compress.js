// Path compression animation.
// Phase 1: walk chain to root. Phase 2: on unwind, re-point each visited node directly to root.
// data-widget="path-compress"
// data-chain="5,4,3,2,1" data-start="5"
(function () {
  function mount(el) {
    if (el.dataset.mounted) return;
    el.dataset.mounted = '1';

    const chain = (el.dataset.chain || '5,4,3,2,1').split(',').map(s => parseInt(s.trim(), 10));
    const start = parseInt(el.dataset.start || chain[0], 10);
    const n = chain.length;
    const nodes = chain.slice();

    // step 0..n-1: descend, currently at chain[step].
    // step n-1..2(n-1): compression unwind. k = step-(n-1). Frame chain[n-1-k] re-points to root.
    let step = 0;
    const MAX = 2 * (n - 1);

    const root = document.createElement('div');
    root.className = 'pc-root';
    el.appendChild(root);

    const W = 560, H = 150, pad = 50;
    const gap = (W - pad * 2) / (n - 1);
    const yMain = 70;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('class', 'pc-svg');
    root.appendChild(svg);

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <marker id="pc-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill="#111"/>
      </marker>
      <marker id="pc-arrow-red" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill="#d62828"/>
      </marker>
      <marker id="pc-arrow-green" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill="#2f9e44"/>
      </marker>
      <marker id="pc-arrow-grey" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill="#bbb"/>
      </marker>
    `;
    svg.appendChild(defs);

    // original chain edges
    const chainEdges = [];
    for (let i = 0; i < n - 1; i++) {
      const x1 = pad + i * gap + 18;
      const x2 = pad + (i + 1) * gap - 18;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x1); line.setAttribute('y1', yMain);
      line.setAttribute('x2', x2); line.setAttribute('y2', yMain);
      line.setAttribute('stroke', '#111'); line.setAttribute('stroke-width', '2.5');
      line.setAttribute('marker-end', 'url(#pc-arrow)');
      line.dataset.idx = i;
      svg.appendChild(line);
      chainEdges.push(line);
    }

    // compression arcs: from chain[i] (i < n-1) curving up to root
    const rootX = pad + (n - 1) * gap;
    const compEdges = [];
    for (let i = 0; i < n - 1; i++) {
      const sx = pad + i * gap;
      const ex = rootX;
      const arcH = 30 + (n - 2 - i) * 6; // taller arc for farther nodes
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const cx1 = sx + (ex - sx) * 0.3;
      const cx2 = ex - (ex - sx) * 0.1;
      path.setAttribute('d', `M ${sx} ${yMain - 18} C ${cx1} ${yMain - 18 - arcH}, ${cx2} ${yMain - 18 - arcH}, ${ex - 14} ${yMain - 14}`);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', '#2f9e44');
      path.setAttribute('stroke-width', '3');
      path.setAttribute('marker-end', 'url(#pc-arrow-green)');
      path.style.opacity = '0';
      path.dataset.idx = i;
      svg.appendChild(path);
      compEdges.push(path);
    }

    // nodes
    const nodeEls = [];
    for (let i = 0; i < n; i++) {
      const cx = pad + i * gap;
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', cx); c.setAttribute('cy', yMain); c.setAttribute('r', 18);
      c.setAttribute('fill', '#fff'); c.setAttribute('stroke', '#111'); c.setAttribute('stroke-width', 2);
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', cx); t.setAttribute('y', yMain + 5);
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('font-family', 'JetBrains Mono, monospace');
      t.setAttribute('font-size', 14); t.setAttribute('font-weight', 700);
      t.textContent = nodes[i];
      svg.appendChild(c); svg.appendChild(t);
      nodeEls.push({ circle: c, text: t });
    }

    // root label
    const rootLbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    rootLbl.setAttribute('x', rootX); rootLbl.setAttribute('y', yMain + 40);
    rootLbl.setAttribute('text-anchor', 'middle');
    rootLbl.setAttribute('font-family', 'JetBrains Mono, monospace');
    rootLbl.setAttribute('font-size', 11); rootLbl.setAttribute('font-weight', 700);
    rootLbl.setAttribute('fill', '#2f9e44');
    rootLbl.textContent = 'root';
    svg.appendChild(rootLbl);

    // status
    const status = document.createElement('div');
    status.className = 'pc-status';
    root.appendChild(status);

    const ctrl = document.createElement('div');
    ctrl.className = 'pc-controls';
    ctrl.innerHTML = `
      <button class="aw-btn" data-act="prev">&larr; Back</button>
      <button class="aw-btn" data-act="next">Step &rarr;</button>
      <button class="aw-btn" data-act="play">Play</button>
      <button class="aw-btn" data-act="reset">Reset</button>
    `;
    root.appendChild(ctrl);

    const ROOT_VAL = nodes[n - 1];

    function phase() { return step <= n - 1 ? 'descend' : 'unwind'; }
    function activeDepth() {
      if (phase() === 'descend') return step;
      return MAX - step;
    }

    function render() {
      const ph = phase();
      const active = activeDepth();

      // nodes
      nodeEls.forEach((ne, i) => {
        let fill = '#fff', textFill = '#111';
        if (i === active) {
          if (ph === 'unwind' && step === MAX) { fill = '#2f9e44'; textFill = '#fff'; }
          else { fill = '#d62828'; textFill = '#fff'; }
        } else if (ph === 'descend' && i < active) {
          fill = '#fde9a3';
        } else if (ph === 'unwind' && i > active) {
          // re-pointed already
          fill = '#fde9a3';
        }
        ne.circle.setAttribute('fill', fill);
        ne.text.setAttribute('fill', textFill);
      });

      // chain edges
      chainEdges.forEach((line, i) => {
        let color = '#111', w = '2.5', mk = 'url(#pc-arrow)';
        if (ph === 'descend' && i < active) {
          color = '#d62828'; w = '3.5'; mk = 'url(#pc-arrow-red)';
        } else if (ph === 'unwind') {
          // edge i: original chain[i]->chain[i+1]. Compressed once node i has been re-pointed.
          // node i re-points when active <= i (frames at depth >= active have returned + reassigned).
          if (i >= active) {
            // this edge replaced by arc — fade grey
            color = '#ddd'; w = '2'; mk = 'url(#pc-arrow-grey)';
          } else {
            color = '#d62828'; w = '3.5'; mk = 'url(#pc-arrow-red)';
          }
        }
        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', w);
        line.setAttribute('marker-end', mk);
      });

      // compression arcs: arc[i] visible when node i has been re-pointed (unwind phase, i >= active)
      compEdges.forEach((arc, i) => {
        if (ph === 'unwind' && i >= active) {
          arc.style.opacity = '1';
        } else {
          arc.style.opacity = '0';
        }
      });

      // status
      if (ph === 'descend') {
        const cur = nodes[active];
        if (step === 0) {
          status.innerHTML = `Call <code>find_set(${start})</code>. Walk to root first.`;
        } else if (step < n - 1) {
          status.innerHTML = `Recurse: <code>find_set(${cur})</code>. Still descending.`;
        } else {
          status.innerHTML = `Reached root <b>${ROOT_VAL}</b>. Begin returning + <span style="color:var(--accent-green)"><b>compressing</b></span>.`;
        }
      } else {
        if (step === MAX) {
          status.innerHTML = `Done. All visited nodes now point <b>directly</b> to root <b>${ROOT_VAL}</b>. Tree is now a <span style="color:var(--accent-green)"><b>flat star</b></span>.`;
        } else {
          const re = nodes[active];
          status.innerHTML = `<code>parent[${re}] = ${ROOT_VAL}</code>. Re-point <span style="color:var(--accent-red)">${re}</span> directly to root.`;
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
  window.Widgets['path-compress'] = mount;
})();
