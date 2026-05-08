// Binary Search Tree visualizer — insert/find with path animation, in-order sweep.
// Optional AVL self-balancing mode (rotations animated via re-render).
// data-widget="bst-vis"
// data-values="50,30,70,20,40,60,80"   initial inserts
(function () {
  function mount(el) {
    if (el.dataset.mounted) return;
    el.dataset.mounted = '1';

    const initial = el.dataset.values
      ? el.dataset.values.split(',').map(s => parseInt(s.trim(), 10))
      : [50, 30, 70, 20, 40, 60, 80];

    let root = null;
    let pathHi = new Set();
    let activeId = null;
    let foundId = null;
    let busy = false;
    let nextId = 1;
    let balanced = false;

    function newNode(v) {
      return { id: nextId++, v, l: null, r: null, h: 1 };
    }

    function h(n) { return n ? n.h : 0; }
    function upd(n) { n.h = 1 + Math.max(h(n.l), h(n.r)); }
    function bf(n) { return n ? h(n.l) - h(n.r) : 0; }

    function rotR(y) {
      const x = y.l, T2 = x.r;
      x.r = y; y.l = T2;
      upd(y); upd(x);
      return x;
    }
    function rotL(x) {
      const y = x.r, T2 = y.l;
      y.l = x; x.r = T2;
      upd(x); upd(y);
      return y;
    }

    let lastRot = null; // string describing last rotation for status

    function insertAVL(node, v) {
      if (!node) return newNode(v);
      if (v < node.v) node.l = insertAVL(node.l, v);
      else if (v > node.v) node.r = insertAVL(node.r, v);
      else return node;
      upd(node);
      const b = bf(node);
      if (b > 1 && v < node.l.v) { lastRot = `LL @ ${node.v} → rotate right`; return rotR(node); }
      if (b < -1 && v > node.r.v) { lastRot = `RR @ ${node.v} → rotate left`; return rotL(node); }
      if (b > 1 && v > node.l.v) { lastRot = `LR @ ${node.v} → rotate left-right`; node.l = rotL(node.l); return rotR(node); }
      if (b < -1 && v < node.r.v) { lastRot = `RL @ ${node.v} → rotate right-left`; node.r = rotR(node.r); return rotL(node); }
      return node;
    }

    function insertRaw(node, v) {
      if (!node) return newNode(v);
      if (v < node.v) node.l = insertRaw(node.l, v);
      else if (v > node.v) node.r = insertRaw(node.r, v);
      return node;
    }

    function buildInitial() {
      root = null; nextId = 1;
      const ins = balanced ? insertAVL : insertRaw;
      initial.forEach(v => { root = ins(root, v); });
    }

    buildInitial();

    const wrap = document.createElement('div');
    wrap.className = 'bv-root';
    el.appendChild(wrap);

    const treeBox = document.createElement('div');
    treeBox.className = 'bv-treebox';
    treeBox.innerHTML = `<svg class="bv-svg" viewBox="0 0 720 300" preserveAspectRatio="xMidYMid meet"></svg>`;
    wrap.appendChild(treeBox);

    const inorderBox = document.createElement('div');
    inorderBox.className = 'bv-inorder';
    inorderBox.innerHTML = `<div class="bv-cap">in-order</div><div class="bv-seq"></div>`;
    wrap.appendChild(inorderBox);

    const status = document.createElement('div');
    status.className = 'bv-status';
    wrap.appendChild(status);

    const ctrl = document.createElement('div');
    ctrl.className = 'bv-controls';
    ctrl.innerHTML = `
      <label>val<input type="number" class="bv-in" value="35" style="width:60px"></label>
      <button class="aw-btn" data-act="insert">Insert</button>
      <button class="aw-btn" data-act="find">Find</button>
      <button class="aw-btn" data-act="inorder">In-order</button>
      <button class="aw-btn" data-act="reset">Reset</button>
      <button class="aw-btn bv-mode" data-act="mode">mode: <b class="bv-mode-lbl">plain BST</b></button>
    `;
    wrap.appendChild(ctrl);

    function setStatus(html) { status.innerHTML = html; }

    function layout(node, depth, ctx) {
      if (!node) return;
      layout(node.l, depth + 1, ctx);
      ctx.pos[node.id] = { x: ctx.idx * ctx.dx + ctx.dx / 2, y: 28 + depth * ctx.dy, depth };
      ctx.idx++;
      ctx.maxDepth = Math.max(ctx.maxDepth, depth);
      layout(node.r, depth + 1, ctx);
    }

    function countNodes(node) {
      if (!node) return 0;
      return 1 + countNodes(node.l) + countNodes(node.r);
    }

    function render() {
      const svg = treeBox.querySelector('svg');
      const W = 720, H = 300;
      const n = countNodes(root);
      if (n === 0) {
        svg.innerHTML = `<text x="${W/2}" y="${H/2}" text-anchor="middle" font-family="JetBrains Mono" fill="#888">empty tree</text>`;
        renderInorder([]);
        return;
      }
      const ctx = { pos: {}, idx: 0, dx: W / n, dy: 50, maxDepth: 0 };
      layout(root, 0, ctx);

      let edges = '';
      function walkE(node) {
        if (!node) return;
        if (node.l) edges += `<line x1="${ctx.pos[node.id].x}" y1="${ctx.pos[node.id].y}" x2="${ctx.pos[node.l.id].x}" y2="${ctx.pos[node.l.id].y}" stroke="#222" stroke-width="2"/>`;
        if (node.r) edges += `<line x1="${ctx.pos[node.id].x}" y1="${ctx.pos[node.id].y}" x2="${ctx.pos[node.r.id].x}" y2="${ctx.pos[node.r.id].y}" stroke="#222" stroke-width="2"/>`;
        walkE(node.l); walkE(node.r);
      }
      walkE(root);

      let nodes = '';
      function walkN(node) {
        if (!node) return;
        const p = ctx.pos[node.id];
        let fill = '#fde9a3', textFill = '#1a1a1a';
        if (node.id === foundId) { fill = '#2f9e44'; textFill = '#fff'; }
        else if (node.id === activeId) { fill = '#d62828'; textFill = '#fff'; }
        else if (pathHi.has(node.id)) { fill = '#1d3fb6'; textFill = '#fff'; }
        nodes += `<g><circle cx="${p.x}" cy="${p.y}" r="18" fill="${fill}" stroke="#1a1a1a" stroke-width="2"/>
          <text x="${p.x}" y="${p.y + 5}" text-anchor="middle" font-family="JetBrains Mono" font-weight="800" font-size="14" fill="${textFill}">${node.v}</text></g>`;
        walkN(node.l); walkN(node.r);
      }
      walkN(root);

      svg.innerHTML = edges + nodes;
    }

    function renderInorder(arr, hiIdx) {
      const seq = inorderBox.querySelector('.bv-seq');
      seq.innerHTML = arr.map((v, i) => `<span class="bv-tok ${i === hiIdx ? 'bv-tok-hot' : ''}">${v}</span>`).join('');
    }

    function inorderArr(node, out) {
      if (!node) return;
      inorderArr(node.l, out);
      out.push({ v: node.v, id: node.id });
      inorderArr(node.r, out);
    }

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    // Walk path for animation, then commit insert via insertAVL/insertRaw.
    async function insert(v) {
      if (busy) return;
      busy = true;
      pathHi = new Set(); activeId = null; foundId = null;
      if (!root) {
        root = newNode(v);
        foundId = root.id;
        setStatus(`tree empty &rarr; new root <b>${v}</b>.`);
        render();
        busy = false;
        return;
      }
      // Animate path walk first.
      let cur = root, dup = false;
      while (cur) {
        activeId = cur.id; pathHi.add(cur.id);
        setStatus(`compare <b>${v}</b> vs <b>${cur.v}</b>.`);
        render();
        await sleep(450);
        if (v === cur.v) { dup = true; break; }
        cur = (v < cur.v) ? cur.l : cur.r;
      }
      if (dup) {
        foundId = activeId; activeId = null;
        setStatus(`<b>${v}</b> already in tree (BST has no duplicates).`);
        render();
        busy = false;
        return;
      }
      // Commit the insert (with optional balancing).
      lastRot = null;
      if (balanced) root = insertAVL(root, v);
      else root = insertRaw(root, v);
      // Find the just-inserted node id (deepest matching value on path).
      function findId(n) {
        if (!n) return null;
        if (n.v === v) return n.id;
        return findId(v < n.v ? n.l : n.r);
      }
      foundId = findId(root); activeId = null; pathHi = new Set();
      let msg = `inserted <b>${v}</b>.`;
      if (balanced && lastRot) msg += ` <span class="tk-purple">balance: ${lastRot}</span>`;
      else if (balanced) msg += ` <span class="tk-green">balanced — no rotation needed</span>`;
      setStatus(msg);
      render();
      busy = false;
    }

    async function find(v) {
      if (busy) return;
      busy = true;
      pathHi = new Set(); activeId = null; foundId = null;
      let cur = root;
      while (cur) {
        activeId = cur.id; pathHi.add(cur.id);
        setStatus(`compare <b>${v}</b> vs <b>${cur.v}</b>.`);
        render();
        await sleep(450);
        if (v === cur.v) {
          foundId = cur.id; activeId = null;
          setStatus(`found <b>${v}</b>.`);
          render();
          busy = false;
          return;
        }
        cur = (v < cur.v) ? cur.l : cur.r;
      }
      activeId = null;
      setStatus(`<b>${v}</b> not in tree.`);
      render();
      busy = false;
    }

    async function inorderSweep() {
      if (busy) return;
      busy = true;
      pathHi = new Set(); activeId = null; foundId = null;
      const arr = [];
      inorderArr(root, arr);
      const vals = arr.map(x => x.v);
      renderInorder(vals);
      for (let i = 0; i < arr.length; i++) {
        activeId = arr[i].id;
        renderInorder(vals, i);
        render();
        await sleep(320);
      }
      activeId = null;
      setStatus(`in-order traversal &rarr; sorted: [${vals.join(', ')}]`);
      render();
      busy = false;
    }

    function reset() {
      if (busy) return;
      buildInitial();
      pathHi = new Set(); activeId = null; foundId = null;
      setStatus(`reset (mode: <b>${balanced ? 'AVL balanced' : 'plain BST'}</b>).`);
      render();
    }

    function toggleMode() {
      if (busy) return;
      balanced = !balanced;
      ctrl.querySelector('.bv-mode-lbl').textContent = balanced ? 'AVL balanced' : 'plain BST';
      buildInitial();
      pathHi = new Set(); activeId = null; foundId = null;
      setStatus(balanced
        ? `<b>AVL balanced</b> mode — every insert rebalances via rotations to keep $h = O(\\log n)$.`
        : `<b>plain BST</b> mode — no rebalancing. Worst case skews to chain ($h = O(n)$).`);
      render();
    }

    ctrl.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const a = btn.dataset.act;
      if (!a) return;
      const v = parseInt(ctrl.querySelector('.bv-in').value, 10);
      if (a === 'insert' && !isNaN(v)) insert(v);
      else if (a === 'find' && !isNaN(v)) find(v);
      else if (a === 'inorder') inorderSweep();
      else if (a === 'reset') reset();
      else if (a === 'mode') toggleMode();
    });

    setStatus(`BST loaded. insert/find/in-order to step. Toggle mode for AVL balancing.`);
    render();
  }

  window.Widgets = window.Widgets || {};
  window.Widgets['bst-vis'] = mount;
})();
