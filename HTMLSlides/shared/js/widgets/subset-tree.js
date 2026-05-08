// Subset-enumeration decision tree animator.
// Each level = one item; each node branches "skip" (left) and "take" (right).
// Animates DFS preorder + backtrack. Collected leaves listed below.
// data-widget="subset-tree"
// data-items="A,B,C"
(function () {
  function mount(el) {
    if (el.dataset.mounted) return;
    el.dataset.mounted = '1';

    const items = (el.dataset.items || 'A,B,C').split(',').map(s => s.trim());
    const n = items.length;

    // Build full DFS step sequence.
    // Each node identified by binary path: array of 0/1 of length 0..n.
    // 0 = skip, 1 = take.
    // Steps: 'enter' (node visited going down), 'leaf' (collect), 'exit' (backtrack pop).
    const steps = [];
    function dfs(path) {
      steps.push({ type: 'enter', path: path.slice() });
      if (path.length === n) {
        const subset = [];
        for (let i = 0; i < n; i++) if (path[i] === 1) subset.push(items[i]);
        steps.push({ type: 'leaf', path: path.slice(), subset });
        steps.push({ type: 'exit', path: path.slice() });
        return;
      }
      // skip first
      path.push(0); dfs(path); path.pop();
      // take
      path.push(1); dfs(path); path.pop();
      steps.push({ type: 'exit', path: path.slice() });
    }
    dfs([]);

    let step = 0;
    const MAX = steps.length - 1;

    const root = document.createElement('div');
    root.className = 'st-root';
    el.appendChild(root);

    // SVG tree
    const W = Math.max(640, n * 200);
    const H = 80 + n * 90;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('class', 'st-svg');
    root.appendChild(svg);

    // node positions: at depth d, all 2^d nodes evenly spaced.
    function nodeKey(path) { return path.join(','); }
    const nodeMap = {}; // key -> {x, y, path}
    function buildPositions() {
      function go(path) {
        const d = path.length;
        const total = Math.pow(2, d);
        const idx = parseInt(path.join('') || '0', 2);
        const x = (W * (idx + 0.5)) / total;
        const y = 50 + d * 90;
        nodeMap[nodeKey(path)] = { x, y, path: path.slice() };
        if (d < n) {
          path.push(0); go(path); path.pop();
          path.push(1); go(path); path.pop();
        }
      }
      go([]);
    }
    buildPositions();

    // edges: child path -> parent path
    const edgeEls = {};
    Object.values(nodeMap).forEach(node => {
      if (node.path.length === 0) return;
      const parentPath = node.path.slice(0, -1);
      const parent = nodeMap[nodeKey(parentPath)];
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', parent.x); line.setAttribute('y1', parent.y);
      line.setAttribute('x2', node.x); line.setAttribute('y2', node.y);
      line.setAttribute('stroke', '#ddd');
      line.setAttribute('stroke-width', '2');
      svg.appendChild(line);
      // edge label (skip / take)
      const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      const lastChoice = node.path[node.path.length - 1];
      lbl.setAttribute('x', (parent.x + node.x) / 2 + (lastChoice === 0 ? -8 : 8));
      lbl.setAttribute('y', (parent.y + node.y) / 2);
      lbl.setAttribute('text-anchor', lastChoice === 0 ? 'end' : 'start');
      lbl.setAttribute('font-family', 'JetBrains Mono, monospace');
      lbl.setAttribute('font-size', '11');
      lbl.setAttribute('fill', '#888');
      lbl.textContent = lastChoice === 0 ? `skip ${items[node.path.length - 1]}` : `take ${items[node.path.length - 1]}`;
      svg.appendChild(lbl);
      edgeEls[nodeKey(node.path)] = { line, lbl };
    });

    // nodes: rendered as small circles; show partial subset inside
    const nodeEls = {};
    Object.values(nodeMap).forEach(node => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      const r = (node.path.length === n) ? 22 : 16;
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', node.x); c.setAttribute('cy', node.y); c.setAttribute('r', r);
      c.setAttribute('fill', '#fff'); c.setAttribute('stroke', '#bbb'); c.setAttribute('stroke-width', 2);
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', node.x); t.setAttribute('y', node.y + 4);
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('font-family', 'JetBrains Mono, monospace');
      t.setAttribute('font-size', '11');
      t.setAttribute('font-weight', '700');
      // subset content: items chosen so far (where path[i]==1)
      const subset = [];
      for (let i = 0; i < node.path.length; i++) if (node.path[i] === 1) subset.push(items[i]);
      t.textContent = subset.length ? '{' + subset.join(',') + '}' : '{}';
      g.appendChild(c); g.appendChild(t);
      svg.appendChild(g);
      nodeEls[nodeKey(node.path)] = { circle: c, text: t };
    });

    // Collected leaves panel
    const collected = document.createElement('div');
    collected.className = 'st-collected';
    root.appendChild(collected);

    const status = document.createElement('div');
    status.className = 'st-status';
    root.appendChild(status);

    const ctrl = document.createElement('div');
    ctrl.className = 'st-controls';
    ctrl.innerHTML = `
      <button class="aw-btn" data-act="prev">&larr; Back</button>
      <button class="aw-btn" data-act="next">Step &rarr;</button>
      <button class="aw-btn" data-act="play">Play</button>
      <button class="aw-btn" data-act="reset">Reset</button>
    `;
    root.appendChild(ctrl);

    function render() {
      // Compute state up to step:
      // - visited: set of nodes entered
      // - active path: current path (last enter not yet exited)
      // - leaves collected so far
      const visited = new Set();
      const collectedList = [];
      const stack = [];
      for (let i = 0; i <= step; i++) {
        const s = steps[i];
        if (s.type === 'enter') {
          visited.add(nodeKey(s.path));
          stack.push(nodeKey(s.path));
        } else if (s.type === 'leaf') {
          collectedList.push(s.subset);
        } else if (s.type === 'exit') {
          if (stack[stack.length - 1] === nodeKey(s.path)) stack.pop();
        }
      }
      const activeKey = stack[stack.length - 1];
      const currentStep = steps[step];

      // Color nodes
      Object.entries(nodeEls).forEach(([key, ne]) => {
        if (key === activeKey) {
          ne.circle.setAttribute('fill', '#d62828');
          ne.circle.setAttribute('stroke', '#111');
          ne.circle.setAttribute('stroke-width', '3');
          ne.text.setAttribute('fill', '#fff');
        } else if (visited.has(key)) {
          // collected leaf?
          const node = nodeMap[key];
          if (node.path.length === n) {
            ne.circle.setAttribute('fill', '#d3f9d8');
            ne.circle.setAttribute('stroke', '#2f9e44');
          } else {
            ne.circle.setAttribute('fill', '#fde9a3');
            ne.circle.setAttribute('stroke', '#888');
          }
          ne.circle.setAttribute('stroke-width', '2');
          ne.text.setAttribute('fill', '#111');
        } else {
          ne.circle.setAttribute('fill', '#fff');
          ne.circle.setAttribute('stroke', '#ccc');
          ne.circle.setAttribute('stroke-width', '2');
          ne.text.setAttribute('fill', '#aaa');
        }
      });

      // Color edges (visited child path)
      Object.entries(edgeEls).forEach(([key, e]) => {
        if (visited.has(key)) {
          e.line.setAttribute('stroke', '#444');
          e.line.setAttribute('stroke-width', '2.5');
          e.lbl.setAttribute('fill', '#333');
        } else {
          e.line.setAttribute('stroke', '#ddd');
          e.line.setAttribute('stroke-width', '2');
          e.lbl.setAttribute('fill', '#bbb');
        }
      });

      // Collected leaves list
      let html = '<b>Collected subsets:</b> ';
      if (collectedList.length === 0) {
        html += '<span style="color:#888">(none yet)</span>';
      } else {
        html += collectedList.map(s => `<span class="st-leaf">{${s.join(',')}}</span>`).join(' ');
      }
      collected.innerHTML = html;

      // Status
      if (currentStep.type === 'enter') {
        const path = currentStep.path;
        const lastChoice = path.length > 0 ? (path[path.length - 1] === 0 ? `skip ${items[path.length - 1]}` : `take ${items[path.length - 1]}`) : 'start';
        const partial = path.reduce((acc, c, i) => c ? acc.concat(items[i]) : acc, []);
        status.innerHTML = `Enter node depth ${path.length} via <b>${lastChoice}</b>. Current set: <code>{${partial.join(',')}}</code>.`;
      } else if (currentStep.type === 'leaf') {
        status.innerHTML = `Leaf reached &mdash; <span style="color:var(--accent-green)"><b>collect {${currentStep.subset.join(',')}}</b></span>.`;
      } else if (currentStep.type === 'exit') {
        const path = currentStep.path;
        const undone = path.length > 0 ? (path[path.length - 1] === 0 ? `unskip ${items[path.length - 1]}` : `untake ${items[path.length - 1]}`) : 'finish root';
        status.innerHTML = `Backtrack: pop frame, <b>${undone}</b>. Try sibling or return.`;
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
        }, 750);
      }
    });

    render();
  }

  window.Widgets = window.Widgets || {};
  window.Widgets['subset-tree'] = mount;
})();
