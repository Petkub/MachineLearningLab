// Boat-sink BSTA visualizer. Slider = capacity x. Boats float if load <= x, sink otherwise.
// data-widget="boat-sink"
// data-loads="3,4,5,9,10,11"
(function () {
  const svgNS = 'http://www.w3.org/2000/svg';

  function mount(el) {
    const loads = (el.dataset.loads || '3,4,5,9,10,11').split(',').map(Number);
    const minX = parseInt(el.dataset.min || '1', 10);
    const maxX = parseInt(el.dataset.max || '15', 10);

    const root = document.createElement('div');
    root.className = 'bs-root';
    el.appendChild(root);

    const W = 920, H = 320;
    const WATER_Y = 200;        // water surface y
    const FLOAT_Y = WATER_Y - 8; // hull bottom ~8px above surface (boat sits on water)
    const SINK_DELTA = 70;       // sink offset

    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('class', 'bs-svg');
    root.appendChild(svg);

    // Sky/background
    const sky = document.createElementNS(svgNS, 'rect');
    sky.setAttribute('x', 0); sky.setAttribute('y', 0);
    sky.setAttribute('width', W); sky.setAttribute('height', WATER_Y);
    sky.setAttribute('fill', '#ffffff');
    svg.appendChild(sky);

    // Water rect (under boats)
    const water = document.createElementNS(svgNS, 'rect');
    water.setAttribute('x', 0); water.setAttribute('y', WATER_Y);
    water.setAttribute('width', W); water.setAttribute('height', H - WATER_Y);
    water.setAttribute('fill', '#bfeaee');
    svg.appendChild(water);

    // Container for boats (drawn before water-line so we can layer surface ripple on top)
    const boatLayer = document.createElementNS(svgNS, 'g');
    svg.appendChild(boatLayer);

    // Water-line stripe (thin band on top of water + boats — gives "boat dipped into water" feel)
    const waterLine = document.createElementNS(svgNS, 'rect');
    waterLine.setAttribute('x', 0); waterLine.setAttribute('y', WATER_Y);
    waterLine.setAttribute('width', W); waterLine.setAttribute('height', 4);
    waterLine.setAttribute('fill', '#7fcfd5');
    waterLine.setAttribute('opacity', '0.6');
    // ripple drawn AFTER boats so it cuts across hull
    svg.appendChild(waterLine);

    const slotW = W / loads.length;
    const boats = loads.map((load, i) => {
      const cx = i * slotW + slotW * 0.5;
      const g = document.createElementNS(svgNS, 'g');
      g.setAttribute('transform', `translate(${cx} ${FLOAT_Y})`);
      g.dataset.cx = cx;
      boatLayer.appendChild(g);

      // status icon (above boat)
      const icon = document.createElementNS(svgNS, 'text');
      icon.setAttribute('x', 0); icon.setAttribute('y', -110);
      icon.setAttribute('text-anchor', 'middle');
      icon.setAttribute('font-size', '36');
      icon.setAttribute('font-weight', '700');
      g.appendChild(icon);

      // boxes — stacked on deck, ABOVE hull (negative y from hull top)
      const boxesG = document.createElementNS(svgNS, 'g');
      g.appendChild(boxesG);
      const total = load;
      const cols = Math.min(4, total);
      const rows = Math.ceil(total / cols);
      let placed = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols && placed < total; c++) {
          const bx = -((cols * 22) / 2) + c * 22 + 1;
          const by = -18 - r * 18;
          const box = document.createElementNS(svgNS, 'rect');
          box.setAttribute('x', bx); box.setAttribute('y', by);
          box.setAttribute('width', 20); box.setAttribute('height', 16);
          box.setAttribute('fill', '#e9d4a8');
          box.setAttribute('stroke', '#7a5a26');
          box.setAttribute('stroke-width', 1.5);
          boxesG.appendChild(box);
          placed++;
        }
      }

      // boat hull — top edge at y=0 (deck), bottom at y=38
      const hull = document.createElementNS(svgNS, 'path');
      hull.setAttribute('d', 'M -65 0 L 65 0 L 50 38 L -50 38 Z');
      hull.setAttribute('fill', '#8b5a2b');
      hull.setAttribute('stroke', '#3d2410');
      hull.setAttribute('stroke-width', 2);
      g.appendChild(hull);

      // load label (under boat, on water area)
      const label = document.createElementNS(svgNS, 'text');
      label.setAttribute('x', cx);
      label.setAttribute('y', H - 14);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('font-size', '22');
      label.setAttribute('font-family', 'JetBrains Mono, monospace');
      label.setAttribute('font-weight', '700');
      label.setAttribute('fill', '#111');
      label.textContent = load;
      svg.appendChild(label);

      return { g, icon, load, cx };
    });

    // Controls
    const controls = document.createElement('div');
    controls.className = 'bs-controls';
    controls.innerHTML = `
      <label class="bs-label">Capacity x = <b id="bs-x">${Math.floor((minX + maxX) / 2)}</b></label>
      <input type="range" min="${minX}" max="${maxX}" value="${Math.floor((minX + maxX) / 2)}" id="bs-slider" class="bs-slider"/>
      <div class="bs-verdict" id="bs-verdict"></div>
    `;
    root.appendChild(controls);

    const slider = controls.querySelector('#bs-slider');
    const xLabel = controls.querySelector('#bs-x');
    const verdict = controls.querySelector('#bs-verdict');

    function update() {
      const x = parseInt(slider.value, 10);
      xLabel.textContent = x;
      let allOk = true;
      boats.forEach(b => {
        const ok = b.load <= x;
        if (!ok) allOk = false;
        b.icon.textContent = ok ? '✓' : '✗';
        b.icon.setAttribute('fill', ok ? '#2f9e44' : '#d62828');
        const targetY = ok ? FLOAT_Y : FLOAT_Y + SINK_DELTA;
        const rot = ok ? 0 : (b.cx < W / 2 ? -8 : 8); // tilt as it sinks
        b.g.setAttribute('transform', `translate(${b.cx} ${targetY}) rotate(${rot})`);
        b.g.style.transition = 'transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1)';
        b.g.style.opacity = ok ? '1' : '0.92';
      });
      verdict.textContent = allOk
        ? `check(${x}) = true — all boats float`
        : `check(${x}) = false — some sink`;
      verdict.className = 'bs-verdict ' + (allOk ? 'bs-ok' : 'bs-bad');
    }

    slider.addEventListener('input', update);
    update();
  }

  window.Widgets['boat-sink'] = mount;
})();
