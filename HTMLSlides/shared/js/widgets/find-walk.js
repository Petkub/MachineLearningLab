// Naive find_set walk animator.
// Shows chain tree, walks parent pointers from start to root.
// data-widget="find-walk"
// data-chain="5,4,3,2,1"  (each node's parent; last node is its own root)
// data-start="5"
(function () {
  function mount(el) {
    if (el.dataset.mounted) return;
    el.dataset.mounted = '1';

    const chain = (el.dataset.chain || '5,4,3,2,1').split(',').map(s => parseInt(s.trim(), 10));
    const start = parseInt(el.dataset.start || chain[0], 10);
    const n = chain.length;
    // chain[i] is the i-th node id walked from start. chain[n-1] is root.
    const nodes = chain.slice();

    // step 0..n-1: descending phase, currently at node chain[step].
    // step n-1..2(n-1): backtrack phase, returning value up the call stack.
    //   Let k = step - (n-1). At backtrack k, frame chain[n-1-k] just received root from child.
    let step = 0;
    const MAX = 2 * (n - 1);

    const root = document.createElement('div');
    root.className = 'fw-root';
    el.appendChild(root);

    // SVG layout: nodes laid horizontal left->right, arrows pointing right (parent).
    const W = 560, H = 110, pad = 50;
    const gap = (W - pad * 2) / (n - 1);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('class', 'fw-svg');
    root.appendChild(svg);

    // edges: arrow from chain[i] to chain[i+1]
    for (let i = 0; i < n - 1; i++) {
      const x1 = pad + i * gap + 18;
      const x2 = pad + (i + 1) * gap - 18;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x1); line.setAttribute('y1', 55);
      line.setAttribute('x2', x2); line.setAttribute('y2', 55);
      line.setAttribute('stroke', '#111');
      line.setAttribute('stroke-width', '2.5');
      line.setAttribute('marker-end', 'url(#fw-arrow)');
      line.dataset.idx = i;
      svg.appendChild(line);
    }
    // arrow marker
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `<marker id="fw-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#111"/>
    </marker>
    <marker id="fw-arrow-red" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#d62828"/>
    </marker>
    <marker id="fw-arrow-green" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#2f9e44"/>
    </marker>`;
    svg.appendChild(defs);

    const rx = pad + (n - 1) * gap;

    // nodes
    const nodeEls = [];
    for (let i = 0; i < n; i++) {
      const cx = pad + i * gap;
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', cx); c.setAttribute('cy', 55); c.setAttribute('r', 18);
      c.setAttribute('fill', '#fff'); c.setAttribute('stroke', '#111'); c.setAttribute('stroke-width', 2);
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', cx); t.setAttribute('y', 60);
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('font-family', 'JetBrains Mono, monospace');
      t.setAttribute('font-size', 14); t.setAttribute('font-weight', 700);
      t.textContent = nodes[i];
      g.appendChild(c); g.appendChild(t);
      svg.appendChild(g);
      nodeEls.push({ circle: c, text: t });
    }
    // root label
    const rootLbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    rootLbl.setAttribute('x', rx); rootLbl.setAttribute('y', 25);
    rootLbl.setAttribute('text-anchor', 'middle');
    rootLbl.setAttribute('font-family', 'JetBrains Mono, monospace');
    rootLbl.setAttribute('font-size', 11); rootLbl.setAttribute('font-weight', 700);
    rootLbl.setAttribute('fill', '#2f9e44');
    rootLbl.textContent = 'root';
    svg.appendChild(rootLbl);

    // call-stack panel
    const stackWrap = document.createElement('div');
    stackWrap.className = 'fw-stackwrap';
    stackWrap.innerHTML = `<div class="fw-stack-label">call stack</div><div class="fw-stack"></div>`;
    root.appendChild(stackWrap);
    const stackEl = stackWrap.querySelector('.fw-stack');

    // status line
    const status = document.createElement('div');
    status.className = 'fw-status';
    root.appendChild(status);

    const ctrl = document.createElement('div');
    ctrl.className = 'fw-controls';
    ctrl.innerHTML = `
      <button class="aw-btn" data-act="prev">&larr; Back</button>
      <button class="aw-btn" data-act="next">Step &rarr;</button>
      <button class="aw-btn" data-act="play">Play</button>
      <button class="aw-btn" data-act="reset">Reset</button>
    `;
    root.appendChild(ctrl);

    const ROOT_VAL = nodes[n - 1];

    function phase() {
      // 'descend' for step in [0, n-1], 'unwind' for step in [n-1, 2(n-1)].
      // n-1 is shared boundary (root reached, no frame popped yet).
      return step <= n - 1 ? 'descend' : 'unwind';
    }
    // depth currently active (deepest live frame). During descend = step. During unwind = MAX - step.
    function activeDepth() {
      if (phase() === 'descend') return step;
      return MAX - step;
    }

    function render() {
      const ph = phase();
      const active = activeDepth(); // index in chain of currently-executing frame
      // poppedDuringUnwind: in unwind phase, frames at depth > active have already returned.
      // visited (cream) = frames that received a value back (unwind, depth >= active means has returned? no).
      // simpler: cream = depth in (active, n-1] AND in unwind phase (those have returned).

      nodeEls.forEach((ne, i) => {
        let fill = '#fff', strokeFill = '#111', textFill = '#111';
        if (i === active) {
          if (ph === 'unwind' && step === MAX) { fill = '#2f9e44'; textFill = '#fff'; }
          else { fill = '#d62828'; textFill = '#fff'; }
        } else if (ph === 'descend' && i < active) {
          fill = '#fde9a3';
        } else if (ph === 'unwind') {
          if (i > active) { fill = '#fde9a3'; }   // already returned, value propagated
        }
        ne.circle.setAttribute('fill', fill);
        ne.circle.setAttribute('stroke', strokeFill);
        ne.text.setAttribute('fill', textFill);
      });

      // edges: idx i is edge chain[i]->chain[i+1].
      // descend: edges with i < active are red, arrow forward (marker-end).
      // unwind: edges with i >= active are green, arrow REVERSE (marker-start) = pointing back.
      svg.querySelectorAll('line').forEach(line => {
        const idx = parseInt(line.dataset.idx, 10);
        let color = '#111', w = '2.5', mkEnd = 'url(#fw-arrow)', mkStart = '';
        if (ph === 'descend' && idx < active) {
          color = '#d62828'; w = '3.5'; mkEnd = 'url(#fw-arrow-red)';
        } else if (ph === 'unwind') {
          if (idx >= active) {
            color = '#2f9e44'; w = '3.5';
            mkEnd = ''; mkStart = 'url(#fw-arrow-green)';
          } else {
            color = '#d62828'; w = '3.5'; mkEnd = 'url(#fw-arrow-red)';
          }
        }
        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', w);
        if (mkEnd) line.setAttribute('marker-end', mkEnd); else line.removeAttribute('marker-end');
        if (mkStart) line.setAttribute('marker-start', mkStart); else line.removeAttribute('marker-start');
      });

      // call stack: frames pushed on descend, popped on unwind.
      // Frames currently on stack = chain[0..active] in descend, chain[0..active] in unwind.
      // (When unwinding, frame `active` is the one about to receive return; frames > active already popped.)
      let stackHTML = '';
      const live = active; // top index
      for (let i = live; i >= 0; i--) {
        const v = nodes[i];
        const isTop = (i === live);
        let info;
        if (ph === 'descend') {
          if (isTop && step < n - 1) info = `<span class="fw-fr-wait">checking parent[${v}]</span>`;
          else if (isTop && step === n - 1) info = `<span class="fw-fr-ret">return ${v}</span>`;
          else info = `<span class="fw-fr-wait">waiting on child</span>`;
        } else {
          if (isTop) info = `<span class="fw-fr-ret">return ${ROOT_VAL}</span>`;
          else info = `<span class="fw-fr-wait">waiting on child</span>`;
        }
        stackHTML += `<div class="fw-frame ${isTop ? 'fw-frame-top' : ''}">find_set(${v}) &nbsp; ${info}</div>`;
      }
      stackEl.innerHTML = stackHTML;

      // status
      if (ph === 'descend') {
        const cur = nodes[active];
        if (step === 0) {
          status.innerHTML = `Call <code>find_set(${start})</code>. <span style="color:var(--accent-red)">v = ${cur}</span>. Push frame.`;
        } else if (step < n - 1) {
          const par = nodes[active];
          const child = nodes[active - 1];
          status.innerHTML = `<code>parent[${child}] = ${par}</code> &ne; ${child}. Recurse → push frame <code>find_set(${par})</code>.`;
        } else {
          status.innerHTML = `<code>parent[${nodes[active]}] == ${nodes[active]}</code> &check; &nbsp; <span style="color:var(--accent-green)"><b>return ${nodes[active]}</b></span>. Begin unwind.`;
        }
      } else {
        const receiver = nodes[active];
        const popper = nodes[active + 1];
        status.innerHTML = `Frame <code>find_set(${popper})</code> returned <b>${ROOT_VAL}</b> → <code>find_set(${receiver})</code> propagates <b>${ROOT_VAL}</b> up.`;
        if (step === MAX) {
          status.innerHTML = `Last frame returns <b>${ROOT_VAL}</b> to caller. <span style="color:var(--accent-green)"><b>find_set(${start}) = ${ROOT_VAL}</b></span>.`;
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
        }, 800);
      }
    });

    render();
  }

  window.Widgets = window.Widgets || {};
  window.Widgets['find-walk'] = mount;
})();
