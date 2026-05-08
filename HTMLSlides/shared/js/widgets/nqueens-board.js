// N-Queens backtracking animator. Row-by-row placement, conflict flash, undo on dead-end.
// data-widget="nqueens-board" data-n="4"
(function () {
  function mount(el) {
    if (el.dataset.mounted) return;
    el.dataset.mounted = '1';

    const n = parseInt(el.dataset.n || '4', 10);
    // Build full backtracking trace.
    const steps = [];
    function isSafe(col, r, c) {
      for (let i = 0; i < r; i++) {
        if (col[i] === c) return false;
        if (Math.abs(col[i] - c) === r - i) return false;
      }
      return true;
    }
    function solve(col, r) {
      if (r === n) {
        steps.push({ type: 'solution', col: col.slice() });
        return;
      }
      for (let c = 0; c < n; c++) {
        steps.push({ type: 'try', col: col.slice(), r, c });
        if (!isSafe(col, r, c)) {
          steps.push({ type: 'conflict', col: col.slice(), r, c });
          continue;
        }
        col[r] = c;
        steps.push({ type: 'place', col: col.slice(), r, c });
        solve(col, r + 1);
        col[r] = -1;
        steps.push({ type: 'remove', col: col.slice(), r, c });
      }
    }
    solve(new Array(n).fill(-1), 0);

    let step = 0;
    const MAX = steps.length - 1;
    let solutionCount = 0;
    function countSolutionsUpTo(k) {
      let cnt = 0;
      for (let i = 0; i <= k; i++) if (steps[i].type === 'solution') cnt++;
      return cnt;
    }

    const root = document.createElement('div');
    root.className = 'nq-root';
    el.appendChild(root);

    const cell = 60;
    const W = n * cell + 4;
    const H = n * cell + 4;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('class', 'nq-svg');
    root.appendChild(svg);

    // checker squares
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const sq = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        sq.setAttribute('x', 2 + c * cell); sq.setAttribute('y', 2 + r * cell);
        sq.setAttribute('width', cell); sq.setAttribute('height', cell);
        sq.setAttribute('fill', (r + c) % 2 === 0 ? '#fde9a3' : '#fff5d4');
        sq.setAttribute('stroke', '#111'); sq.setAttribute('stroke-width', '1');
        sq.dataset.r = r; sq.dataset.c = c;
        sq.classList.add('nq-cell');
        svg.appendChild(sq);
      }
    }

    // queens layer (one per row, hidden when col=-1)
    const queens = [];
    for (let r = 0; r < n; r++) {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('font-family', 'JetBrains Mono, monospace');
      t.setAttribute('font-size', '34');
      t.setAttribute('font-weight', '700');
      t.setAttribute('fill', '#111');
      t.textContent = '♛'; // black queen unicode
      g.appendChild(t);
      g.style.opacity = '0';
      svg.appendChild(g);
      queens.push({ g, text: t });
    }
    function placeQueen(r, c) {
      if (c < 0 || c >= n) { queens[r].g.style.opacity = '0'; return; }
      const x = 2 + c * cell + cell / 2;
      const y = 2 + r * cell + cell * 0.7;
      queens[r].text.setAttribute('x', x);
      queens[r].text.setAttribute('y', y);
      queens[r].g.style.opacity = '1';
    }

    // try-marker (red square or pulse)
    const tryMark = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    tryMark.setAttribute('width', cell); tryMark.setAttribute('height', cell);
    tryMark.setAttribute('fill', 'transparent');
    tryMark.setAttribute('stroke', '#d62828');
    tryMark.setAttribute('stroke-width', '4');
    tryMark.style.opacity = '0';
    svg.appendChild(tryMark);

    const status = document.createElement('div');
    status.className = 'nq-status';
    root.appendChild(status);

    const meta = document.createElement('div');
    meta.className = 'nq-meta';
    root.appendChild(meta);

    const ctrl = document.createElement('div');
    ctrl.className = 'nq-controls';
    ctrl.innerHTML = `
      <button class="aw-btn" data-act="prev">&larr; Back</button>
      <button class="aw-btn" data-act="next">Step &rarr;</button>
      <button class="aw-btn" data-act="play">Play</button>
      <button class="aw-btn" data-act="reset">Reset</button>
    `;
    root.appendChild(ctrl);

    function render() {
      const s = steps[step];
      // queens reflect current col[]
      for (let r = 0; r < n; r++) placeQueen(r, s.col[r]);
      // try-marker
      if (s.type === 'try' || s.type === 'conflict') {
        tryMark.setAttribute('x', 2 + s.c * cell);
        tryMark.setAttribute('y', 2 + s.r * cell);
        tryMark.setAttribute('stroke', s.type === 'conflict' ? '#d62828' : '#1d3fb6');
        tryMark.style.opacity = '1';
      } else {
        tryMark.style.opacity = '0';
      }

      // status
      if (s.type === 'try') {
        status.innerHTML = `Try row <b>${s.r}</b>, column <b>${s.c}</b>. Check <code>is_safe</code>.`;
      } else if (s.type === 'conflict') {
        status.innerHTML = `<span style="color:var(--accent-red)"><b>Conflict</b></span> at (${s.r}, ${s.c}). Skip — try next column.`;
      } else if (s.type === 'place') {
        status.innerHTML = `<span style="color:var(--accent-green)"><b>Place</b></span> queen at (${s.r}, ${s.c}). Recurse to row ${s.r + 1}.`;
      } else if (s.type === 'remove') {
        status.innerHTML = `Dead end &mdash; <span style="color:var(--accent-red)"><b>backtrack</b></span>: remove queen from (${s.r}, ${s.c}).`;
      } else if (s.type === 'solution') {
        status.innerHTML = `<b style="color:var(--accent-green)">SOLUTION found.</b>`;
      }

      meta.innerHTML = `solutions found: <b>${countSolutionsUpTo(step)}</b> &nbsp;·&nbsp; step: ${step + 1} / ${steps.length}`;
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
        }, 450);
      }
    });

    render();
  }

  window.Widgets = window.Widgets || {};
  window.Widgets['nqueens-board'] = mount;
})();
