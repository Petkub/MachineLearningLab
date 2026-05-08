// Permutation enumeration tree (swap-based recursive). Animates DFS + backtrack.
// data-widget="perm-tree" data-items="1,2,3"
(function () {
  function mount(el) {
    if (el.dataset.mounted) return;
    el.dataset.mounted = '1';

    const items = (el.dataset.items || '1,2,3').split(',').map(s => s.trim());
    const n = items.length;

    const steps = [];
    const nodes = []; // {id, parent, depth, arr (snapshot), pos (slot fixed up to)}
    function addNode(parent, depth, arr, pos) {
      const id = nodes.length;
      nodes.push({ id, parent, depth, arr: arr.slice(), pos });
      return id;
    }

    function permute(arr, pos, parentId) {
      if (pos === n) {
        steps.push({ type: 'leaf', nodeId: parentId, perm: arr.slice() });
        return;
      }
      for (let j = pos; j < n; j++) {
        // child node = state after swap(pos, j)
        const child = arr.slice();
        [child[pos], child[j]] = [child[j], child[pos]];
        const cid = addNode(parentId, parentId === -1 ? 1 : nodes[parentId].depth + 1, child, pos + 1);
        steps.push({ type: 'enter', nodeId: cid, swap: [pos, j] });
        permute(child, pos + 1, cid);
        steps.push({ type: 'exit', nodeId: cid });
      }
    }
    const rootId = addNode(-1, 0, items, 0);
    steps.unshift({ type: 'enter', nodeId: rootId, swap: null });
    permute(items.slice(), 0, rootId);
    steps.push({ type: 'exit', nodeId: rootId });

    let step = 0;
    const MAX = steps.length - 1;

    const root = document.createElement('div');
    root.className = 'pt-root';
    el.appendChild(root);

    // Layout: bucket nodes by depth, distribute x evenly per layer
    const byDepth = {};
    nodes.forEach(nd => {
      (byDepth[nd.depth] = byDepth[nd.depth] || []).push(nd);
    });
    const W = Math.max(800, Object.keys(byDepth).reduce((m, d) => Math.max(m, byDepth[d].length), 0) * 130);
    const H = 60 + (n) * 90 + 30;
    const positions = {}; // id -> {x, y}
    Object.keys(byDepth).forEach(d => {
      const layer = byDepth[d];
      const count = layer.length;
      layer.forEach((nd, i) => {
        positions[nd.id] = {
          x: (W * (i + 0.5)) / count,
          y: 40 + parseInt(d, 10) * 90,
        };
      });
    });

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('class', 'pt-svg');
    root.appendChild(svg);

    // edges first
    const edgeEls = {};
    nodes.forEach(nd => {
      if (nd.parent === -1) return;
      const p = positions[nd.parent], c = positions[nd.id];
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', p.x); line.setAttribute('y1', p.y);
      line.setAttribute('x2', c.x); line.setAttribute('y2', c.y);
      line.setAttribute('stroke', '#ddd'); line.setAttribute('stroke-width', '2');
      svg.appendChild(line);
      edgeEls[nd.id] = line;
    });

    // nodes
    const nodeEls = {};
    nodes.forEach(nd => {
      const pos = positions[nd.id];
      const isLeaf = (nd.depth === n);
      const r = isLeaf ? 24 : 18;
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', pos.x); c.setAttribute('cy', pos.y); c.setAttribute('r', r);
      c.setAttribute('fill', '#fff'); c.setAttribute('stroke', '#bbb'); c.setAttribute('stroke-width', '2');
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', pos.x); t.setAttribute('y', pos.y + 4);
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('font-family', 'JetBrains Mono, monospace');
      t.setAttribute('font-size', '11'); t.setAttribute('font-weight', '700');
      t.setAttribute('fill', '#aaa');
      t.textContent = '[' + nd.arr.join(',') + ']';
      svg.appendChild(c); svg.appendChild(t);
      nodeEls[nd.id] = { circle: c, text: t };
    });

    const collected = document.createElement('div');
    collected.className = 'pt-collected';
    root.appendChild(collected);

    const status = document.createElement('div');
    status.className = 'pt-status';
    root.appendChild(status);

    const ctrl = document.createElement('div');
    ctrl.className = 'pt-controls';
    ctrl.innerHTML = `
      <button class="aw-btn" data-act="prev">&larr; Back</button>
      <button class="aw-btn" data-act="next">Step &rarr;</button>
      <button class="aw-btn" data-act="play">Play</button>
      <button class="aw-btn" data-act="reset">Reset</button>
    `;
    root.appendChild(ctrl);

    function render() {
      const visited = new Set();
      const collectedList = [];
      const stack = [];
      for (let i = 0; i <= step; i++) {
        const s = steps[i];
        if (s.type === 'enter') { visited.add(s.nodeId); stack.push(s.nodeId); }
        else if (s.type === 'leaf') collectedList.push(s.perm);
        else if (s.type === 'exit') { if (stack[stack.length - 1] === s.nodeId) stack.pop(); }
      }
      const activeId = stack[stack.length - 1];
      const cur = steps[step];

      Object.entries(nodeEls).forEach(([id, ne]) => {
        const nid = parseInt(id, 10);
        const node = nodes[nid];
        if (nid === activeId) {
          ne.circle.setAttribute('fill', '#d62828');
          ne.circle.setAttribute('stroke', '#111');
          ne.circle.setAttribute('stroke-width', '3');
          ne.text.setAttribute('fill', '#fff');
        } else if (visited.has(nid)) {
          if (node.depth === n) {
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
          ne.text.setAttribute('fill', '#aaa');
        }
      });
      Object.entries(edgeEls).forEach(([id, line]) => {
        if (visited.has(parseInt(id, 10))) {
          line.setAttribute('stroke', '#444');
          line.setAttribute('stroke-width', '2.5');
        } else {
          line.setAttribute('stroke', '#ddd');
          line.setAttribute('stroke-width', '2');
        }
      });

      let html = '<b>Permutations found:</b> ';
      if (collectedList.length === 0) html += '<span style="color:#888">(none yet)</span>';
      else html += collectedList.map(p => `<span class="pt-leaf">[${p.join(',')}]</span>`).join(' ');
      collected.innerHTML = html;

      if (cur.type === 'enter') {
        if (cur.swap) status.innerHTML = `Enter node — <code>swap(${cur.swap[0]}, ${cur.swap[1]})</code>, recurse.`;
        else status.innerHTML = `Start. Initial array <code>[${items.join(',')}]</code>.`;
      } else if (cur.type === 'leaf') {
        status.innerHTML = `Leaf reached &mdash; <span style="color:var(--accent-green)"><b>collect [${cur.perm.join(',')}]</b></span>.`;
      } else if (cur.type === 'exit') {
        status.innerHTML = `Backtrack: <code>swap</code> back to undo, try sibling.`;
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
        }, 600);
      }
    });

    render();
  }

  window.Widgets = window.Widgets || {};
  window.Widgets['perm-tree'] = mount;
})();
