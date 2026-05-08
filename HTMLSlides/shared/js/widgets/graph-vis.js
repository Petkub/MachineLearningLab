// Graph visualizer with BFS/DFS traversal animation.
// data-widget="graph-vis"
// data-nodes='[{"id":1,"x":120,"y":80},...]'  data-edges='[[1,2],[1,3],...]'
// data-mode="bfs" | "dfs" | "static"
(function () {
  const svgNS = 'http://www.w3.org/2000/svg';

  function mount(el) {
    let nodes, edges;
    try {
      nodes = JSON.parse(el.dataset.nodes || '[]');
      edges = JSON.parse(el.dataset.edges || '[]');
    } catch (e) { console.error(e); return; }

    const mode = el.dataset.mode || 'static';
    const start = parseInt(el.dataset.start || nodes[0]?.id || 1, 10);

    const root = document.createElement('div');
    root.className = 'gv-root';
    el.appendChild(root);

    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 600 360');
    svg.setAttribute('class', 'gv-svg');
    root.appendChild(svg);

    const status = document.createElement('div');
    status.className = 'gv-status';
    root.appendChild(status);

    if (mode !== 'static') {
      const controls = document.createElement('div');
      controls.className = 'gv-controls';
      controls.innerHTML = `
        <button class="aw-btn" data-act="reset">Reset</button>
        <button class="aw-btn" data-act="step">Step</button>
        <button class="aw-btn" data-act="auto">Auto</button>
      `;
      root.appendChild(controls);
      controls.addEventListener('click', (e) => {
        const a = e.target.dataset.act;
        if (a === 'reset') reset();
        if (a === 'step') step();
        if (a === 'auto') auto();
      });
    }

    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const adj = new Map();
    nodes.forEach(n => adj.set(n.id, []));
    edges.forEach(([u, v]) => {
      adj.get(u).push(v);
      adj.get(v).push(u);
    });

    let visited, frontier, edgeUsed, autoTimer;

    function render() {
      svg.innerHTML = '';
      // edges
      edges.forEach(([u, v]) => {
        const a = nodeMap.get(u), b = nodeMap.get(v);
        const line = document.createElementNS(svgNS, 'line');
        line.setAttribute('x1', a.x); line.setAttribute('y1', a.y);
        line.setAttribute('x2', b.x); line.setAttribute('y2', b.y);
        const used = edgeUsed && edgeUsed.has(`${Math.min(u,v)}-${Math.max(u,v)}`);
        line.setAttribute('stroke', used ? '#d62828' : '#222');
        line.setAttribute('stroke-width', used ? 4 : 2);
        svg.appendChild(line);
      });
      // nodes
      nodes.forEach(n => {
        const c = document.createElementNS(svgNS, 'circle');
        c.setAttribute('cx', n.x); c.setAttribute('cy', n.y);
        c.setAttribute('r', 24);
        let fill = '#fff';
        if (visited && visited.has(n.id)) fill = '#fde9a3';
        if (frontier && frontier.includes(n.id)) fill = '#ffb454';
        c.setAttribute('fill', fill);
        c.setAttribute('stroke', '#1d3fb6'); c.setAttribute('stroke-width', 3);
        svg.appendChild(c);

        const t = document.createElementNS(svgNS, 'text');
        t.setAttribute('x', n.x); t.setAttribute('y', n.y + 6);
        t.setAttribute('text-anchor', 'middle');
        t.setAttribute('font-family', 'JetBrains Mono, monospace');
        t.setAttribute('font-size', '18');
        t.setAttribute('font-weight', '700');
        t.textContent = n.id;
        svg.appendChild(t);
      });
    }

    function reset() {
      stopAuto();
      visited = new Set();
      frontier = [start];
      edgeUsed = new Set();
      status.textContent = `${mode.toUpperCase()} from ${start}: queue/stack = [${frontier.join(', ')}]`;
      render();
    }

    function step() {
      if (!frontier || !frontier.length) return;
      const node = mode === 'bfs' ? frontier.shift() : frontier.pop();
      if (visited.has(node)) { return step(); }
      visited.add(node);
      const neigh = adj.get(node) || [];
      for (const nb of neigh) {
        if (!visited.has(nb) && !frontier.includes(nb)) {
          frontier.push(nb);
          edgeUsed.add(`${Math.min(node,nb)}-${Math.max(node,nb)}`);
        }
      }
      status.textContent = `Visited ${node}. Queue=[${frontier.join(', ')}]`;
      render();
    }

    function auto() {
      stopAuto();
      autoTimer = setInterval(() => {
        if (!frontier.length) { stopAuto(); return; }
        step();
      }, 700);
    }
    function stopAuto() { if (autoTimer) clearInterval(autoTimer); autoTimer = null; }

    if (mode === 'static') render();
    else reset();
  }

  window.Widgets['graph-vis'] = mount;
})();
