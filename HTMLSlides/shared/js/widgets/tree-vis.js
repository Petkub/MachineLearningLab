// Rooted tree visualizer — click node to highlight subtree, BFS/DFS sweep.
// data-widget="tree-vis"
// data-edges='[[1,2],[1,3],[2,4],[2,5],[3,6],[3,7],[5,8]]'   parent-child pairs
// data-root="1"                                                 root id, default = 1
(function () {
  function mount(el) {
    if (el.dataset.mounted) return;
    el.dataset.mounted = '1';

    const edges = JSON.parse(el.dataset.edges || '[[1,2],[1,3],[2,4],[2,5],[3,6],[3,7],[5,8]]');
    const rootId = parseInt(el.dataset.root || '1', 10);

    // build child map
    const children = {};
    const allIds = new Set([rootId]);
    for (const [u, v] of edges) {
      if (!children[u]) children[u] = [];
      children[u].push(v);
      allIds.add(u); allIds.add(v);
    }

    let highlight = new Set();   // subtree highlight
    let visitOrder = [];          // BFS/DFS sequence
    let visitIdx = -1;             // -1 = nothing active
    let busy = false;
    let mode = 'subtree';

    const wrap = document.createElement('div');
    wrap.className = 'tv-root';
    el.appendChild(wrap);

    const treeBox = document.createElement('div');
    treeBox.className = 'tv-treebox';
    treeBox.innerHTML = `<svg class="tv-svg" viewBox="0 0 720 320" preserveAspectRatio="xMidYMid meet"></svg>`;
    wrap.appendChild(treeBox);

    const ctrl = document.createElement('div');
    ctrl.className = 'tv-controls';
    ctrl.innerHTML = `
      <button class="aw-btn" data-act="bfs">BFS</button>
      <button class="aw-btn" data-act="dfs">DFS</button>
      <button class="aw-btn" data-act="reset">Reset</button>
      <span style="margin-left:auto; font-size:13px; color:var(--ink-mute)">Click any node &rarr; highlight subtree</span>
    `;
    wrap.appendChild(ctrl);

    const seqBox = document.createElement('div');
    seqBox.className = 'tv-seqbox';
    seqBox.innerHTML = `<div class="tv-cap">visit order</div><div class="tv-seq"></div>`;
    wrap.appendChild(seqBox);

    const status = document.createElement('div');
    status.className = 'tv-status';
    wrap.appendChild(status);

    // layout: assign x by leaf order, y by depth
    function layout() {
      const pos = {};
      let leafIdx = 0;
      const depths = {};
      function place(u, depth) {
        depths[u] = depth;
        const kids = children[u] || [];
        if (kids.length === 0) {
          pos[u] = { x: leafIdx + 0.5, y: depth };
          leafIdx++;
        } else {
          for (const c of kids) place(c, depth + 1);
          const xs = kids.map(c => pos[c].x);
          pos[u] = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: depth };
        }
      }
      place(rootId, 0);
      const maxDepth = Math.max(...Object.values(depths));
      const W = 720, H = 280;
      const padX = 36, padY = 28;
      const dx = (W - 2 * padX) / Math.max(1, leafIdx);
      const dy = (H - 2 * padY) / Math.max(1, maxDepth);
      for (const id in pos) {
        pos[id] = { x: padX + pos[id].x * dx, y: padY + pos[id].y * dy };
      }
      return pos;
    }

    function getSubtree(u) {
      const out = new Set([u]);
      const kids = children[u] || [];
      for (const c of kids) {
        for (const x of getSubtree(c)) out.add(x);
      }
      return out;
    }

    function bfsOrder() {
      const out = [];
      const q = [rootId];
      while (q.length) {
        const u = q.shift();
        out.push(u);
        for (const c of (children[u] || [])) q.push(c);
      }
      return out;
    }

    function dfsOrder() {
      const out = [];
      function rec(u) {
        out.push(u);
        for (const c of (children[u] || [])) rec(c);
      }
      rec(rootId);
      return out;
    }

    const pos = layout();

    function render() {
      const svg = treeBox.querySelector('svg');
      let html = '';
      // edges
      for (const [u, v] of edges) {
        html += `<line x1="${pos[u].x}" y1="${pos[u].y}" x2="${pos[v].x}" y2="${pos[v].y}" stroke="#222" stroke-width="2"/>`;
      }
      // nodes
      for (const id of allIds) {
        const p = pos[id];
        let fill = '#fde9a3', textFill = '#1a1a1a';
        const inSweep = visitOrder.length > 0 && visitIdx >= 0;
        if (inSweep && visitOrder[visitIdx] === id) { fill = '#d62828'; textFill = '#fff'; }
        else if (inSweep && visitOrder.slice(0, Math.max(0, visitIdx)).includes(id)) { fill = '#1d3fb6'; textFill = '#fff'; }
        else if (highlight.has(id)) { fill = '#7048e8'; textFill = '#fff'; }
        else if (id === rootId) { fill = '#2f9e44'; textFill = '#fff'; }
        html += `<g style="cursor:pointer" data-nid="${id}">
          <circle cx="${p.x}" cy="${p.y}" r="18" fill="${fill}" stroke="#1a1a1a" stroke-width="2"/>
          <text x="${p.x}" y="${p.y + 5}" text-anchor="middle" font-family="JetBrains Mono" font-weight="800" font-size="14" fill="${textFill}" pointer-events="none">${id}</text>
        </g>`;
      }
      svg.innerHTML = html;
      renderSeq();
    }

    // delegate click on svg ONCE (not re-attach per render)
    treeBox.querySelector('svg').addEventListener('click', (e) => {
      if (busy) return;
      const g = e.target.closest('g[data-nid]');
      if (!g) return;
      const id = parseInt(g.dataset.nid, 10);
      highlight = getSubtree(id);
      visitOrder = []; visitIdx = -1;
      status.innerHTML = `subtree of node <b>${id}</b>: ${highlight.size} node(s) {${[...highlight].sort((a,b)=>a-b).join(', ')}}`;
      render();
    });

    function renderSeq() {
      const seq = seqBox.querySelector('.tv-seq');
      if (visitOrder.length === 0) {
        seq.innerHTML = `<span class="tv-empty">&mdash;</span>`;
        return;
      }
      seq.innerHTML = visitOrder.map((v, i) => {
        let cls = '';
        if (i === visitIdx) cls = 'tv-tok-hot';
        else if (visitIdx >= 0 && i < visitIdx) cls = 'tv-tok-done';
        return `<span class="tv-tok ${cls}">${v}</span>`;
      }).join('');
    }

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    async function sweep(kind) {
      if (busy) return;
      busy = true;
      highlight = new Set();
      visitOrder = (kind === 'bfs') ? bfsOrder() : dfsOrder();
      visitIdx = -1;
      status.innerHTML = `${kind.toUpperCase()} from root <b>${rootId}</b>...`;
      render();
      await sleep(500);
      for (let i = 0; i < visitOrder.length; i++) {
        visitIdx = i;
        render();
        await sleep(450);
      }
      visitIdx = visitOrder.length;
      render();
      status.innerHTML = `${kind.toUpperCase()} order: [${visitOrder.join(', ')}]`;
      busy = false;
    }

    function reset() {
      if (busy) return;
      highlight = new Set();
      visitOrder = []; visitIdx = -1;
      status.textContent = 'click a node to see subtree, or run BFS/DFS.';
      render();
    }

    ctrl.addEventListener('click', (e) => {
      const a = e.target.dataset.act;
      if (a === 'bfs') sweep('bfs');
      if (a === 'dfs') sweep('dfs');
      if (a === 'reset') reset();
    });

    // Also fix click handler updating insert with click outside same widget
    status.textContent = 'click a node to see subtree, or run BFS/DFS.';
    highlight = new Set();
    visitOrder = [];
    visitIdx = -1;
    render();
  }

  window.Widgets = window.Widgets || {};
  window.Widgets['tree-vis'] = mount;
})();
