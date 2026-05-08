// Kruskal MST step animator.
// data-widget="kruskal-stepper"
// data-nodes='[{"id":1,"x":120,"y":80}, ...]'
// data-edges='[[w,u,v], ...]'   weights, endpoints
(function () {
  const svgNS = 'http://www.w3.org/2000/svg';

  function mount(el) {
    if (el.dataset.mounted) return;
    el.dataset.mounted = '1';

    let nodes, edges;
    try {
      nodes = JSON.parse(el.dataset.nodes || '[]');
      edges = JSON.parse(el.dataset.edges || '[]');
    } catch (e) { console.error(e); return; }

    const n = nodes.length;
    const sortedEdges = [...edges].map(e => ({ w: e[0], u: e[1], v: e[2] }))
                                  .sort((a, b) => a.w - b.w);

    const root = document.createElement('div');
    root.className = 'kr-root';
    el.appendChild(root);

    const layout = document.createElement('div');
    layout.className = 'kr-layout';
    root.appendChild(layout);

    // svg + controls column
    const svgCol = document.createElement('div');
    svgCol.className = 'kr-svgcol';
    layout.appendChild(svgCol);

    // graph svg
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 600 400');
    svg.setAttribute('class', 'kr-svg');
    svgCol.appendChild(svg);

    const controls = document.createElement('div');
    controls.className = 'kr-controls';
    controls.innerHTML = `
      <button class="aw-btn" data-act="reset">Reset</button>
      <button class="aw-btn" data-act="step">Step</button>
      <button class="aw-btn" data-act="auto">Auto</button>
    `;
    svgCol.appendChild(controls);

    // sorted edge list
    const listWrap = document.createElement('div');
    listWrap.className = 'kr-listwrap';
    layout.appendChild(listWrap);

    const status = { textContent: '' }; // stub: status removed from UI

    let parent, size, ptr, mst, used, taken, autoTimer;

    function find(v) {
      while (parent[v] !== v) v = parent[v];
      return v;
    }
    function unionSet(u, v) {
      let a = find(u), b = find(v);
      if (a === b) return false;
      if (size[a] < size[b]) [a, b] = [b, a];
      parent[b] = a;
      size[a] += size[b];
      return true;
    }

    function reset() {
      parent = new Array(n + 1).fill(0).map((_, i) => i);
      size = new Array(n + 1).fill(1);
      ptr = 0; mst = 0; used = 0;
      taken = new Set();
      stopAuto();
      status.textContent = 'Ready. Press Step to consider next edge.';
      render();
    }

    function step() {
      if (used === n - 1 || ptr >= sortedEdges.length) {
        status.textContent = `Done. MST weight = ${mst}, edges used = ${used}.`;
        stopAuto();
        return;
      }
      const e = sortedEdges[ptr];
      const ra = find(e.u), rb = find(e.v);
      if (ra !== rb) {
        unionSet(e.u, e.v);
        mst += e.w; used++;
        taken.add(ptr);
        status.textContent = `unite(${e.u}, ${e.v}) — take edge w=${e.w}. mst=${mst}, used=${used}.`;
      } else {
        status.textContent = `unite(${e.u}, ${e.v}) — same set, skip (would form cycle).`;
      }
      ptr++;
      render();
    }

    function auto() {
      if (autoTimer) { stopAuto(); return; }
      autoTimer = setInterval(() => {
        if (used === n - 1 || ptr >= sortedEdges.length) { stopAuto(); render(); return; }
        step();
      }, 700);
    }

    function stopAuto() {
      if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
    }

    function render() {
      svg.innerHTML = '';
      const nodeMap = new Map(nodes.map(n => [n.id, n]));

      // edges
      sortedEdges.forEach((e, i) => {
        const a = nodeMap.get(e.u), b = nodeMap.get(e.v);
        if (!a || !b) return;
        const isTaken = taken.has(i);
        const isCurrent = i === ptr - 1;
        const line = document.createElementNS(svgNS, 'line');
        line.setAttribute('x1', a.x); line.setAttribute('y1', a.y);
        line.setAttribute('x2', b.x); line.setAttribute('y2', b.y);
        let stroke = '#bbb', sw = '2';
        if (isTaken) { stroke = '#2f9e44'; sw = '5'; }
        else if (isCurrent) { stroke = '#d62828'; sw = '3'; }
        line.setAttribute('stroke', stroke);
        line.setAttribute('stroke-width', sw);
        svg.appendChild(line);

        // weight label, offset perpendicular to edge + white pill background
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len, ny = dx / len; // perpendicular
        const offset = 10;
        const lx = mx + nx * offset, ly = my + ny * offset;
        const labelText = String(e.w);
        const padX = 5, padY = 2;
        const charW = 8;
        const rectW = labelText.length * charW + padX * 2;
        const rectH = 16;
        const bg = document.createElementNS(svgNS, 'rect');
        bg.setAttribute('x', lx - rectW / 2);
        bg.setAttribute('y', ly - rectH / 2);
        bg.setAttribute('width', rectW);
        bg.setAttribute('height', rectH);
        bg.setAttribute('rx', 4);
        bg.setAttribute('fill', '#fff');
        bg.setAttribute('stroke', isTaken ? '#2f9e44' : '#999');
        bg.setAttribute('stroke-width', '1.5');
        svg.appendChild(bg);
        const t = document.createElementNS(svgNS, 'text');
        t.setAttribute('x', lx); t.setAttribute('y', ly);
        t.setAttribute('text-anchor', 'middle');
        t.setAttribute('dominant-baseline', 'central');
        t.setAttribute('font-family', 'JetBrains Mono, monospace');
        t.setAttribute('font-size', '12');
        t.setAttribute('font-weight', '700');
        t.setAttribute('fill', isTaken ? '#2f9e44' : '#333');
        t.textContent = labelText;
        svg.appendChild(t);
      });

      // nodes
      nodes.forEach(node => {
        const g = document.createElementNS(svgNS, 'g');
        g.setAttribute('transform', `translate(${node.x},${node.y})`);
        const c = document.createElementNS(svgNS, 'circle');
        c.setAttribute('r', 22);
        const r = parent ? find(node.id) : node.id;
        // tint by component
        const hue = (r * 47) % 360;
        c.setAttribute('fill', `hsl(${hue}, 70%, 80%)`);
        c.setAttribute('stroke', '#1d3fb6');
        c.setAttribute('stroke-width', '3');
        g.appendChild(c);
        const t = document.createElementNS(svgNS, 'text');
        t.setAttribute('text-anchor', 'middle');
        t.setAttribute('dominant-baseline', 'central');
        t.setAttribute('font-family', 'JetBrains Mono, monospace');
        t.setAttribute('font-weight', '700');
        t.setAttribute('font-size', '15');
        t.textContent = node.id;
        g.appendChild(t);
        svg.appendChild(g);
      });

      // sorted list
      let html = '<div class="kr-listtitle">sorted edges {w, u, v}</div><table class="kr-tbl"><tbody>';
      sortedEdges.forEach((e, i) => {
        let cls = '';
        if (taken.has(i)) cls = 'kr-take';
        else if (i === ptr) cls = 'kr-cur';
        else if (i < ptr) cls = 'kr-skip';
        html += `<tr class="${cls}"><td>${i + 1}</td><td>{${e.w}, ${e.u}, ${e.v}}</td></tr>`;
      });
      html += '</tbody></table>';
      html += `<div class="kr-meta">mst = ${mst} · used = ${used}/${n - 1}</div>`;
      listWrap.innerHTML = html;
    }

    controls.addEventListener('click', (e) => {
      const a = e.target.dataset.act;
      if (a === 'reset') reset();
      if (a === 'step') step();
      if (a === 'auto') auto();
    });

    reset();
  }

  window.Widgets = window.Widgets || {};
  window.Widgets['kruskal-stepper'] = mount;
})();
