// DSU interactive visualizer.
// data-widget="dsu-vis"
// data-n="7"  (number of elements, 1..n)
// data-show-size="1"  (show size[] row, default true)
(function () {
  const svgNS = 'http://www.w3.org/2000/svg';

  function mount(el) {
    if (el.dataset.mounted) return;
    el.dataset.mounted = '1';

    const n = parseInt(el.dataset.n || '7', 10);
    const showSize = el.dataset.showSize !== '0';

    const root = document.createElement('div');
    root.className = 'dsu-root';
    el.appendChild(root);

    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 900 280');
    svg.setAttribute('class', 'dsu-svg');
    root.appendChild(svg);

    const tableWrap = document.createElement('div');
    tableWrap.className = 'dsu-table-wrap';
    root.appendChild(tableWrap);

    const status = document.createElement('div');
    status.className = 'dsu-status';
    status.textContent = 'Click two nodes, then press Union.';
    root.appendChild(status);

    const controls = document.createElement('div');
    controls.className = 'dsu-controls';
    controls.innerHTML = `
      <button class="aw-btn" data-act="union">Union</button>
      <button class="aw-btn" data-act="find">Find</button>
      <button class="aw-btn" data-act="reset">Reset</button>
    `;
    root.appendChild(controls);

    // state
    let parent = new Array(n + 1).fill(0).map((_, i) => i);
    let size = new Array(n + 1).fill(1);
    let selected = []; // up to 2

    // node positions (laid out in row, but kids get re-positioned to children of their root)
    const baseX = (i) => 60 + (i - 1) * (780 / Math.max(1, n - 1));
    const baseY = 60;
    const childY = 150;
    const childY2 = 230;

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

    // Compute layout: group by root, place root at top, children spread below.
    function layout() {
      const groups = new Map();
      for (let i = 1; i <= n; i++) {
        const r = find(i);
        if (!groups.has(r)) groups.set(r, []);
        groups.get(r).push(i);
      }
      // sort group roots by their original index
      const roots = [...groups.keys()].sort((a, b) => a - b);
      const positions = {};
      let xCursor = 60;
      const slotW = 780 / Math.max(1, n);
      roots.forEach(r => {
        const members = groups.get(r);
        const others = members.filter(m => m !== r);
        const groupW = Math.max(slotW, slotW * members.length);
        const cx = xCursor + groupW / 2;
        positions[r] = { x: cx, y: baseY };
        // children fan out below root
        others.forEach((m, idx) => {
          const offset = (idx - (others.length - 1) / 2) * 60;
          positions[m] = {
            x: cx + offset,
            y: others.length > 4 && idx >= 4 ? childY2 : childY,
          };
        });
        xCursor += groupW;
      });
      return { positions, groups };
    }

    function render() {
      const { positions, groups } = layout();
      svg.innerHTML = '';

      // edges: for each non-root node, draw line to its parent
      for (let v = 1; v <= n; v++) {
        const p = parent[v];
        if (p === v) continue;
        const a = positions[v], b = positions[p];
        if (!a || !b) continue;
        const line = document.createElementNS(svgNS, 'line');
        line.setAttribute('x1', a.x); line.setAttribute('y1', a.y);
        line.setAttribute('x2', b.x); line.setAttribute('y2', b.y);
        line.setAttribute('stroke', '#222'); line.setAttribute('stroke-width', '2');
        svg.appendChild(line);
      }

      // nodes
      for (let v = 1; v <= n; v++) {
        const pos = positions[v];
        if (!pos) continue;
        const g = document.createElementNS(svgNS, 'g');
        g.setAttribute('class', 'dsu-node');
        g.setAttribute('transform', `translate(${pos.x},${pos.y})`);
        g.style.cursor = 'pointer';

        const c = document.createElementNS(svgNS, 'circle');
        c.setAttribute('r', 22);
        const isRoot = parent[v] === v;
        const sel = selected.includes(v);
        let fill = isRoot ? '#ffb3b3' : '#ffd6d6';
        if (sel) fill = '#fde9a3';
        c.setAttribute('fill', fill);
        c.setAttribute('stroke', sel ? '#d62828' : '#222');
        c.setAttribute('stroke-width', sel ? '3' : '2');
        g.appendChild(c);

        const t = document.createElementNS(svgNS, 'text');
        t.setAttribute('text-anchor', 'middle');
        t.setAttribute('dominant-baseline', 'central');
        t.setAttribute('font-family', 'JetBrains Mono, monospace');
        t.setAttribute('font-weight', '700');
        t.setAttribute('font-size', '16');
        t.setAttribute('fill', '#111');
        t.textContent = v;
        g.appendChild(t);

        g.addEventListener('click', () => toggleSelect(v));
        svg.appendChild(g);
      }

      // table parent[] (and size[])
      let html = '<table class="dsu-tbl"><thead><tr><th>i</th>';
      for (let i = 1; i <= n; i++) html += `<th>${i}</th>`;
      html += '</tr></thead><tbody>';
      html += '<tr><td>parent[i]</td>';
      for (let i = 1; i <= n; i++) {
        const cls = parent[i] === i ? 'dsu-root-cell' : '';
        html += `<td class="${cls}">${parent[i]}</td>`;
      }
      html += '</tr>';
      if (showSize) {
        html += '<tr><td>size[i]</td>';
        for (let i = 1; i <= n; i++) {
          const cls = parent[i] === i ? 'dsu-root-cell' : '';
          html += `<td class="${cls}">${size[i]}</td>`;
        }
        html += '</tr>';
      }
      html += '</tbody></table>';
      tableWrap.innerHTML = html;
    }

    function toggleSelect(v) {
      const idx = selected.indexOf(v);
      if (idx >= 0) selected.splice(idx, 1);
      else {
        selected.push(v);
        if (selected.length > 2) selected.shift();
      }
      render();
    }

    function doUnion() {
      if (selected.length < 2) {
        status.textContent = 'Select 2 nodes first.';
        return;
      }
      const [u, v] = selected;
      const ok = unionSet(u, v);
      status.textContent = ok
        ? `union(${u}, ${v}) — merged.`
        : `union(${u}, ${v}) — already same set.`;
      selected = [];
      render();
    }

    function doFind() {
      if (selected.length < 1) {
        status.textContent = 'Select a node first.';
        return;
      }
      const v = selected[selected.length - 1];
      const r = find(v);
      status.textContent = `find(${v}) → ${r}`;
      render();
    }

    function reset() {
      parent = new Array(n + 1).fill(0).map((_, i) => i);
      size = new Array(n + 1).fill(1);
      selected = [];
      status.textContent = 'Reset. Click two nodes, then press Union.';
      render();
    }

    controls.addEventListener('click', (e) => {
      const a = e.target.dataset.act;
      if (a === 'union') doUnion();
      if (a === 'find') doFind();
      if (a === 'reset') reset();
    });

    render();
  }

  window.Widgets = window.Widgets || {};
  window.Widgets['dsu-vis'] = mount;
})();
