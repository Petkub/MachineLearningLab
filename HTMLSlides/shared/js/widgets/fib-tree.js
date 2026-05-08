// fib-tree — visualize fib(n) recursion tree, count duplicate subcalls.
// data-widget="fib-tree" data-n="5" data-mode="naive|memo"
(function () {
  const SVGNS = 'http://www.w3.org/2000/svg';
  let _id = 0;

  function mount(el) {
    if (el.dataset.mounted) return;
    el.dataset.mounted = '1';
    const uid = ++_id;
    const nInit = parseInt(el.dataset.n || '5', 10);
    const modeInit = el.dataset.mode || 'naive';

    const root = document.createElement('div');
    root.className = 'ft-root';
    el.appendChild(root);

    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('class', 'ft-svg');
    svg.setAttribute('viewBox', '0 0 1000 360');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    root.appendChild(svg);

    const ctrl = document.createElement('div');
    ctrl.className = 'ft-controls';
    ctrl.innerHTML = `
      <label>n = <input type="number" id="ft-n-${uid}" value="${nInit}" min="0" max="8" class="ft-input"/></label>
      <button class="aw-btn ft-mode-toggle" data-mode="naive">naive</button>
      <button class="aw-btn ft-mode-toggle" data-mode="memo">memo</button>
      <button class="aw-btn" id="ft-go-${uid}">replay</button>
      <span class="ft-speed">
        <span class="ft-lbl">speed</span>
        <button class="ft-sp" data-sp="0.5">.5×</button>
        <button class="ft-sp" data-sp="1">1×</button>
        <button class="ft-sp" data-sp="2">2×</button>
      </span>
      <span class="ft-status" id="ft-status-${uid}"></span>
    `;
    root.appendChild(ctrl);

    let speed = parseFloat(el.dataset.speed || '1');
    function setSpeedActive() {
      ctrl.querySelectorAll('.ft-sp').forEach(b => {
        b.classList.toggle('active', parseFloat(b.dataset.sp) === speed);
      });
    }
    setSpeedActive();
    ctrl.querySelectorAll('.ft-sp').forEach(b => {
      b.onclick = () => { speed = parseFloat(b.dataset.sp); setSpeedActive(); draw(true); };
    });

    let mode = modeInit;

    function build(n, memo) {
      // each node: {n, depth, x, children:[], dup:bool}
      let calls = 0;
      function rec(k, depth) {
        calls++;
        if (memo && memo.has(k)) {
          return { n: k, depth, children: [], dup: true };
        }
        if (memo) memo.add(k);
        if (k < 2) return { n: k, depth, children: [] };
        const left = rec(k - 1, depth + 1);
        const right = rec(k - 2, depth + 1);
        return { n: k, depth, children: [left, right] };
      }
      const tree = rec(n, 0);
      return { tree, calls };
    }

    function layout(tree) {
      // assign x via in-order traversal (leaf-pack)
      let leafIdx = 0;
      const nodes = [];
      function walk(t) {
        if (!t.children.length) {
          t.x = leafIdx++;
        } else {
          t.children.forEach(walk);
          t.x = (t.children[0].x + t.children[t.children.length - 1].x) / 2;
        }
        nodes.push(t);
      }
      walk(tree);
      return { nodes, leafCount: leafIdx };
    }

    function draw(animate) {
      const n = Math.min(8, Math.max(0, parseInt(document.getElementById('ft-n-' + uid).value, 10) || 0));
      const memo = mode === 'memo' ? new Set() : null;
      const { tree, calls } = build(n, memo);
      const { nodes, leafCount } = layout(tree);
      const W = 1000, H = 360, padX = 60, padY = 40;
      const usableW = W - padX * 2;
      const cols = Math.max(1, leafCount - 1);
      const rows = nodes.reduce((m, x) => Math.max(m, x.depth), 0);
      const rowH = rows ? (H - padY * 2) / rows : 0;

      const xs = (t) => padX + (cols ? t.x * usableW / cols : usableW / 2);
      const ys = (t) => padY + t.depth * rowH;

      while (svg.firstChild) svg.removeChild(svg.firstChild);
      const status = document.getElementById('ft-status-' + uid);

      // edges
      let stagger = animate ? Math.max(20, 80 / speed) : 0;
      let order = 0;
      const r = 18;
      function drawEdges(t) {
        t.children.forEach(c => {
          const x1 = xs(t), y1 = ys(t), x2 = xs(c), y2 = ys(c);
          const dx = x2 - x1, dy = y2 - y1;
          const d = Math.hypot(dx, dy) || 1;
          const ux = dx / d, uy = dy / d;
          const ax = x1 + ux * r, ay = y1 + uy * r;
          const bx = x2 - ux * r, by = y2 - uy * r;
          const elen = Math.hypot(bx - ax, by - ay) + 4;
          const line = document.createElementNS(SVGNS, 'line');
          line.setAttribute('x1', ax); line.setAttribute('y1', ay);
          line.setAttribute('x2', bx); line.setAttribute('y2', by);
          line.setAttribute('stroke', '#222'); line.setAttribute('stroke-width', 1.5);
          line.style.strokeDasharray = elen;
          line.style.strokeDashoffset = animate ? elen : 0;
          line.style.animation = animate
            ? `rt-stroke 280ms ${order * stagger + 60}ms forwards cubic-bezier(0.22,1,0.36,1)`
            : '';
          svg.appendChild(line);
          order++;
          drawEdges(c);
        });
      }
      drawEdges(tree);

      // nodes
      order = 0;
      function drawNodes(t) {
        const r = 18;
        const g = document.createElementNS(SVGNS, 'g');
        g.style.opacity = animate ? 0 : 1;
        g.style.animation = animate
          ? `rt-pop 280ms ${order * stagger}ms forwards cubic-bezier(0.22,1,0.36,1)`
          : '';
        svg.appendChild(g);

        const c = document.createElementNS(SVGNS, 'circle');
        c.setAttribute('cx', xs(t)); c.setAttribute('cy', ys(t));
        c.setAttribute('r', r);
        c.setAttribute('fill', t.dup ? '#fde9a3' : '#b8eef0');
        c.setAttribute('stroke', t.dup ? '#d62828' : '#222');
        c.setAttribute('stroke-width', t.dup ? 2.5 : 2);
        if (t.dup) c.setAttribute('stroke-dasharray', '4 3');
        g.appendChild(c);

        const txt = document.createElementNS(SVGNS, 'text');
        txt.setAttribute('x', xs(t)); txt.setAttribute('y', ys(t) + 4);
        txt.setAttribute('text-anchor', 'middle');
        txt.setAttribute('font-family', 'JetBrains Mono, monospace');
        txt.setAttribute('font-size', '12');
        txt.setAttribute('font-weight', '700');
        txt.textContent = t.n;
        g.appendChild(txt);

        order++;
        t.children.forEach(drawNodes);
      }
      drawNodes(tree);

      if (status) {
        const dupCount = countDup(tree);
        if (mode === 'naive') {
          status.textContent = `naive: ${calls} calls, ${calls - 1} edges`;
        } else {
          status.textContent = `memo: ${calls} calls, ${dupCount} cache hits (yellow)`;
        }
      }
    }

    function countDup(t) {
      let c = t.dup ? 1 : 0;
      t.children.forEach(ch => c += countDup(ch));
      return c;
    }

    ctrl.querySelectorAll('.ft-mode-toggle').forEach(b => {
      b.addEventListener('click', () => {
        mode = b.dataset.mode;
        ctrl.querySelectorAll('.ft-mode-toggle').forEach(x => x.classList.toggle('active', x === b));
        draw(true);
      });
    });
    ctrl.querySelector('.ft-mode-toggle[data-mode="' + mode + '"]').classList.add('active');

    document.getElementById('ft-go-' + uid).addEventListener('click', () => draw(true));
    draw(true);
  }

  window.Widgets['fib-tree'] = mount;
})();
