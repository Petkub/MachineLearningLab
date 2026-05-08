// Recursion-tree visualizer — fast exponentiation.
// data-widget="recursion-tree" data-a="2" data-p="14"
// Two-phase animation:
//   1. Expand: walk p → p/2 → ... → 0, drawing nodes left-to-right.
//   2. Combine: walk back right-to-left, computing each value = (child)^2 * a^parity.
(function () {
  const SVGNS = 'http://www.w3.org/2000/svg';
  let _id = 0;

  function mount(el) {
    if (el.dataset.mounted) return;
    el.dataset.mounted = '1';
    const uid = ++_id;
    const aInit = parseInt(el.dataset.a || '2', 10);
    const pInit = parseInt(el.dataset.p || '14', 10);

    const root = document.createElement('div');
    root.className = 'rt-root';
    el.appendChild(root);

    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('class', 'rt-svg');
    svg.setAttribute('viewBox', '0 0 1000 280');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    root.appendChild(svg);

    const ctrl = document.createElement('div');
    ctrl.className = 'rt-controls';
    ctrl.innerHTML = `
      <label>a = <input type="number" value="${aInit}" id="rt-a-${uid}" class="rt-input" min="1"/></label>
      <label>p = <input type="number" value="${pInit}" id="rt-p-${uid}" class="rt-input" min="0" max="40"/></label>
      <button id="rt-go-${uid}" class="aw-btn">trace</button>
      <span class="rt-speed">
        <span class="rt-lbl">speed</span>
        <button class="rt-sp" data-sp="0.5">.5×</button>
        <button class="rt-sp" data-sp="1">1×</button>
        <button class="rt-sp" data-sp="2">2×</button>
      </span>
      <span class="rt-status" id="rt-status-${uid}"></span>
    `;
    root.appendChild(ctrl);

    let speed = parseFloat(el.dataset.speed || '1');
    function setSpeedActive() {
      ctrl.querySelectorAll('.rt-sp').forEach(b => {
        b.classList.toggle('active', parseFloat(b.dataset.sp) === speed);
      });
    }
    setSpeedActive();
    ctrl.querySelectorAll('.rt-sp').forEach(b => {
      b.onclick = () => { speed = parseFloat(b.dataset.sp); setSpeedActive(); draw(true); };
    });

    function expand(p) {
      const out = [];
      while (p > 0) {
        out.push({ p, parity: p % 2 === 0 ? 'even' : 'odd' });
        p = Math.floor(p / 2);
      }
      out.push({ p: 0, parity: 'base' });
      return out;
    }

    function combine(a, nodes) {
      // walk back right-to-left, val[i] from val[i+1]
      const vals = new Array(nodes.length);
      vals[nodes.length - 1] = 1;
      for (let i = nodes.length - 2; i >= 0; i--) {
        const sq = vals[i + 1] * vals[i + 1];
        vals[i] = nodes[i].parity === 'even' ? sq : sq * a;
      }
      return vals;
    }

    function draw(animate) {
      const a = parseInt(document.getElementById('rt-a-' + uid).value, 10) || 2;
      const p = Math.min(40, Math.max(0, parseInt(document.getElementById('rt-p-' + uid).value, 10) || 0));
      const nodes = expand(p);
      const vals = combine(a, nodes);
      const N = nodes.length;
      const W = 1000, H = 280;
      const padX = 70, padY = 60;
      const usableW = W - padX * 2;
      const xs = (i) => padX + (N === 1 ? usableW / 2 : i * usableW / (N - 1));
      const ys = () => H / 2 + 20;
      const r = N <= 6 ? 32 : 26;

      while (svg.firstChild) svg.removeChild(svg.firstChild);
      const status = document.getElementById('rt-status-' + uid);

      // pre-compute all elements but staged via animation delays
      const stagger = animate ? Math.max(60, 220 / speed) : 0;

      // edges (retract by radius so they stop at circle border)
      for (let i = 0; i < N - 1; i++) {
        const x1 = xs(i) + r, x2 = xs(i + 1) - r;
        const len = Math.abs(x2 - x1) + 4;
        const line = document.createElementNS(SVGNS, 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', ys());
        line.setAttribute('x2', x2);
        line.setAttribute('y2', ys());
        line.setAttribute('stroke', '#222');
        line.setAttribute('stroke-width', 2);
        line.style.strokeDasharray = len;
        line.style.strokeDashoffset = animate ? len : 0;
        line.style.animation = animate
          ? `rt-stroke 360ms ${i * stagger + 100}ms forwards cubic-bezier(0.22,1,0.36,1)`
          : '';
        svg.appendChild(line);
      }

      // nodes (expand phase)
      const groups = [];
      nodes.forEach((n, i) => {
        const g = document.createElementNS(SVGNS, 'g');
        g.style.opacity = animate ? 0 : 1;
        g.style.transformOrigin = `${xs(i)}px ${ys()}px`;
        g.style.animation = animate
          ? `rt-pop 380ms ${i * stagger}ms forwards cubic-bezier(0.22,1,0.36,1)`
          : '';
        svg.appendChild(g);

        const tag = document.createElementNS(SVGNS, 'text');
        tag.setAttribute('x', xs(i));
        tag.setAttribute('y', ys() - r - 14);
        tag.setAttribute('text-anchor', 'middle');
        tag.setAttribute('font-family', 'JetBrains Mono, monospace');
        tag.setAttribute('font-size', '13');
        tag.setAttribute('font-weight', '700');
        tag.setAttribute('fill', n.parity === 'even' ? '#2f9e44' : (n.parity === 'odd' ? '#e64980' : '#1d3fb6'));
        tag.textContent = n.parity;
        g.appendChild(tag);

        const c = document.createElementNS(SVGNS, 'circle');
        c.setAttribute('cx', xs(i));
        c.setAttribute('cy', ys());
        c.setAttribute('r', r);
        c.setAttribute('fill', '#b8eef0');
        c.setAttribute('stroke', '#222');
        c.setAttribute('stroke-width', 2);
        g.appendChild(c);

        const t = document.createElementNS(SVGNS, 'text');
        t.setAttribute('x', xs(i));
        t.setAttribute('y', ys() + 5);
        t.setAttribute('text-anchor', 'middle');
        t.setAttribute('font-family', 'JetBrains Mono, monospace');
        t.setAttribute('font-size', N <= 6 ? '15' : '13');
        t.setAttribute('font-weight', '700');
        t.innerHTML = `${a}<tspan baseline-shift="super" font-size="10">${n.p}</tspan>`;
        g.appendChild(t);

        // value label below (filled during combine phase)
        const v = document.createElementNS(SVGNS, 'text');
        v.setAttribute('x', xs(i));
        v.setAttribute('y', ys() + r + 22);
        v.setAttribute('text-anchor', 'middle');
        v.setAttribute('font-family', 'JetBrains Mono, monospace');
        v.setAttribute('font-size', '14');
        v.setAttribute('font-weight', '700');
        v.setAttribute('fill', '#1d3fb6');
        v.style.opacity = animate ? 0 : 1;
        v.textContent = '= ' + vals[i];
        g.appendChild(v);

        groups.push({ g, c, v });
      });

      const expandTotal = N * stagger + 400;

      if (animate) {
        // combine phase: animate right-to-left
        for (let i = N - 1; i >= 0; i--) {
          const delay = expandTotal + (N - 1 - i) * 320;
          groups[i].v.style.animation = `rt-fade 320ms ${delay}ms forwards`;
          groups[i].c.style.animation = `rt-pulse 480ms ${delay}ms cubic-bezier(0.22,1,0.36,1)`;
        }
        if (status) {
          status.textContent = `expanding ${a}^${p} ...`;
          setTimeout(() => { status.textContent = `combining → ${a}^${p} = ${vals[0]}`; }, expandTotal);
          setTimeout(() => { status.textContent = `${a}^${p} = ${vals[0]}`; }, expandTotal + N * 320);
        }
      } else if (status) {
        status.textContent = `${a}^${p} = ${vals[0]}`;
      }
    }

    document.getElementById('rt-go-' + uid).addEventListener('click', () => draw(true));
    draw(true);
  }

  window.Widgets['recursion-tree'] = mount;
})();
