// Union by size animation.
// Two trees, compare sizes, smaller attaches under larger root.
// data-widget="union-size"
(function () {
  function mount(el) {
    if (el.dataset.mounted) return;
    el.dataset.mounted = '1';

    let step = 0;
    const MAX = 4;

    const root = document.createElement('div');
    root.className = 'us-root';
    el.appendChild(root);

    const W = 580, H = 160;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('class', 'us-svg');
    root.appendChild(svg);

    // Tree A (left, size 5): root 1, children 2 3, 2 has children 4 5
    // Tree B (right, size 2): root 6, child 7
    // After merge: 6 attaches under 1.
    const A = {
      1: { x: 140, y: 35 },
      2: { x: 80,  y: 85 },
      3: { x: 200, y: 85 },
      4: { x: 50,  y: 135 },
      5: { x: 110, y: 135 },
    };
    const Aedges = [[1,2],[1,3],[2,4],[2,5]];
    const B = {
      6: { x: 440, y: 60 },
      7: { x: 440, y: 120 },
    };
    const Bedges = [[6,7]];
    const Bmerged = {
      6: { x: 270, y: 85 },
      7: { x: 270, y: 135 },
    };

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <marker id="us-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill="#111"/>
      </marker>
      <marker id="us-arrow-green" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill="#2f9e44"/>
      </marker>
    `;
    svg.appendChild(defs);

    function makeLine(cls) {
      const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      l.setAttribute('stroke', '#111');
      l.setAttribute('stroke-width', '2.5');
      l.setAttribute('marker-end', 'url(#us-arrow)');
      l.dataset.kind = cls;
      svg.appendChild(l);
      return l;
    }

    function setLine(line, p, c) {
      // child -> parent (arrow points to parent, since parent[child] = parent)
      const dx = p.x - c.x, dy = p.y - c.y;
      const len = Math.hypot(dx, dy);
      const ux = dx / len, uy = dy / len;
      line.setAttribute('x1', c.x + ux * 18);
      line.setAttribute('y1', c.y + uy * 18);
      line.setAttribute('x2', p.x - ux * 18);
      line.setAttribute('y2', p.y - uy * 18);
    }

    const aLineEls = Aedges.map(() => makeLine('a'));
    const bLineEls = Bedges.map(() => makeLine('b'));
    const mergeLine = makeLine('merge');
    mergeLine.setAttribute('stroke', '#2f9e44');
    mergeLine.setAttribute('stroke-width', '3.5');
    mergeLine.setAttribute('marker-end', 'url(#us-arrow-green)');
    mergeLine.style.opacity = '0';

    function makeNode(id, fillRoot) {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.dataset.id = id;
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('r', 18);
      c.setAttribute('fill', fillRoot ? '#fde9a3' : '#fff');
      c.setAttribute('stroke', '#111');
      c.setAttribute('stroke-width', 2);
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('font-family', 'JetBrains Mono, monospace');
      t.setAttribute('font-size', 14);
      t.setAttribute('font-weight', 700);
      t.textContent = id;
      g.appendChild(c); g.appendChild(t);
      svg.appendChild(g);
      return { g, c, t };
    }

    const nodeEls = {};
    [1,2,3,4,5].forEach(id => { nodeEls[id] = makeNode(id, id === 1); });
    [6,7].forEach(id => { nodeEls[id] = makeNode(id, id === 6); });

    function placeNode(ne, p) {
      ne.c.setAttribute('cx', p.x); ne.c.setAttribute('cy', p.y);
      ne.t.setAttribute('x', p.x); ne.t.setAttribute('y', p.y + 5);
    }

    // labels (sizes)
    const sizeLabelA = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    sizeLabelA.setAttribute('text-anchor', 'middle');
    sizeLabelA.setAttribute('font-family', 'JetBrains Mono, monospace');
    sizeLabelA.setAttribute('font-size', '12');
    sizeLabelA.setAttribute('font-weight', '700');
    sizeLabelA.setAttribute('fill', '#1d3fb6');
    svg.appendChild(sizeLabelA);

    const sizeLabelB = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    sizeLabelB.setAttribute('text-anchor', 'middle');
    sizeLabelB.setAttribute('font-family', 'JetBrains Mono, monospace');
    sizeLabelB.setAttribute('font-size', '12');
    sizeLabelB.setAttribute('font-weight', '700');
    sizeLabelB.setAttribute('fill', '#1d3fb6');
    svg.appendChild(sizeLabelB);

    const status = document.createElement('div');
    status.className = 'us-status';
    root.appendChild(status);

    const ctrl = document.createElement('div');
    ctrl.className = 'us-controls';
    ctrl.innerHTML = `
      <button class="aw-btn" data-act="prev">&larr; Back</button>
      <button class="aw-btn" data-act="next">Step &rarr;</button>
      <button class="aw-btn" data-act="play">Play</button>
      <button class="aw-btn" data-act="reset">Reset</button>
    `;
    root.appendChild(ctrl);

    function render() {
      // node positions: B nodes shift to merged spots only when step >= 3.
      [1,2,3,4,5].forEach(id => placeNode(nodeEls[id], A[id]));
      const Bpos = (step >= 3) ? Bmerged : B;
      [6,7].forEach(id => placeNode(nodeEls[id], Bpos[id]));

      // A edges always present
      aLineEls.forEach((line, i) => {
        const [p, c] = Aedges[i];
        setLine(line, A[p], A[c]);
      });
      // B edges present always
      bLineEls.forEach((line, i) => {
        const [p, c] = Bedges[i];
        setLine(line, Bpos[p], Bpos[c]);
      });

      // merge edge: 6 -> 1, visible step >= 3
      if (step >= 3) {
        setLine(mergeLine, A[1], Bpos[6]);
        mergeLine.style.opacity = '1';
        // 6 no longer a root
        nodeEls[6].c.setAttribute('fill', '#fff');
      } else {
        mergeLine.style.opacity = '0';
        nodeEls[6].c.setAttribute('fill', '#fde9a3');
      }

      // size labels
      const sizeA = step >= 4 ? 7 : 5;
      sizeLabelA.setAttribute('x', A[1].x);
      sizeLabelA.setAttribute('y', A[1].y - 26);
      sizeLabelA.textContent = `size = ${sizeA}`;

      if (step >= 3) {
        sizeLabelB.style.opacity = '0';
      } else {
        sizeLabelB.style.opacity = '1';
        sizeLabelB.setAttribute('x', B[6].x);
        sizeLabelB.setAttribute('y', B[6].y - 26);
        sizeLabelB.textContent = `size = 2`;
      }

      // highlight roots when comparing (step 1)
      const ring = (ne, on) => ne.c.setAttribute('stroke-width', on ? 4 : 2);
      ring(nodeEls[1], step === 1);
      ring(nodeEls[6], step === 1);

      // status
      if (step === 0) {
        status.innerHTML = `Two sets. Tree A rooted at <b>1</b> (size 5), Tree B rooted at <b>6</b> (size 2). Call <code>union_set(4, 7)</code>.`;
      } else if (step === 1) {
        status.innerHTML = `<code>find_set(4) = 1</code>, <code>find_set(7) = 6</code>. Compare sizes: <code>size[1] = 5 &gt; size[6] = 2</code>.`;
      } else if (step === 2) {
        status.innerHTML = `Smaller tree (B, root 6) attaches <b>under</b> larger root <b>1</b>. <code>parent[6] = 1</code>.`;
      } else if (step === 3) {
        status.innerHTML = `<span style="color:var(--accent-green)"><b>Re-pointed.</b></span> 6 is no longer a root. Tree height grew by at most 1.`;
      } else {
        status.innerHTML = `Update size: <code>size[1] += size[6]</code> &rarr; <b>size[1] = 7</b>. Done.`;
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
        }, 1100);
      }
    });

    render();
  }

  window.Widgets = window.Widgets || {};
  window.Widgets['union-size'] = mount;
})();
