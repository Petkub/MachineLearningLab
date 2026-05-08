// Two-pointers visualizer with synced code-trace.
// data-widget="two-pointers"
// data-values="1,3,5,7,8,11"
// data-mode="opposite-sum" | "window-sum"
// data-target="12"        (opposite-sum: pair target K)
// data-threshold="7"      (window-sum: smallest subarray sum >= S)
(function () {
  const CODE = {
    'opposite-sum': [
      { id: 'init',   text: 'int l = 0, r = n - 1;' },
      { id: 'while',  text: 'while (l < r) {' },
      { id: 'sum',    text: '    int s = a[l] + a[r];' },
      { id: 'eq',     text: '    if (s == K) { /* found */ break; }' },
      { id: 'lt',     text: '    if (s < K) l++;' },
      { id: 'gt',     text: '    else        r--;' },
      { id: 'end',    text: '}' },
    ],
    'window-sum': [
      { id: 'init',   text: 'int l = 0, sum = 0, best = INF;' },
      { id: 'for',    text: 'for (int r = 0; r < n; r++) {' },
      { id: 'add',    text: '    sum += a[r];' },
      { id: 'while',  text: '    while (sum >= S) {' },
      { id: 'best',   text: '        best = min(best, r - l + 1);' },
      { id: 'shrink', text: '        sum -= a[l++];' },
      { id: 'end1',   text: '    }' },
      { id: 'end2',   text: '}' },
    ],
    'window-max': [
      { id: 'init',   text: 'int l = 0, sum = 0, best = 0;' },
      { id: 'for',    text: 'for (int r = 0; r < n; r++) {' },
      { id: 'add',    text: '    sum += a[r];' },
      { id: 'while',  text: '    while (sum > S) {' },
      { id: 'shrink', text: '        sum -= a[l++];' },
      { id: 'end1',   text: '    }' },
      { id: 'best',   text: '    best = max(best, r - l + 1);' },
      { id: 'end2',   text: '}' },
    ],
  };
  const MODES = ['opposite-sum', 'window-sum', 'window-max'];

  function mount(el) {
    if (el.dataset.mounted) return;
    el.dataset.mounted = '1';

    const values = (el.dataset.values || '1,3,5,7,8,11').split(',').map(s => parseInt(s.trim(), 10));
    const initialMode = MODES.includes(el.dataset.mode) ? el.dataset.mode : 'opposite-sum';
    let mode = initialMode;
    const lockMode = el.dataset.lockMode === '1' || el.dataset.lockMode === 'true';
    const initTarget = parseInt(el.dataset.target || '13', 10);
    const initThresh = parseInt(el.dataset.threshold || '7', 10);

    let l = 0, r = values.length - 1;
    let target = initTarget, thresh = initThresh;
    let bestLen = Infinity, bestL = -1, bestR = -1;
    let foundIdxL = -1, foundIdxR = -1;
    let done = false;
    let curLine = 'init';
    let runToken = 0;

    function resetState() {
      if (mode === 'opposite-sum') { l = 0; r = values.length - 1; }
      else {
        l = 0; r = -1;
        if (mode === 'window-sum') { bestLen = Infinity; }
        else { bestLen = 0; }
        bestL = bestR = -1;
      }
      foundIdxL = foundIdxR = -1;
      done = false;
      curLine = 'init';
    }
    resetState();

    const root = document.createElement('div');
    root.className = 'tp-root';
    el.appendChild(root);

    const top = document.createElement('div');
    top.className = 'tp-top';
    root.appendChild(top);

    const arrBox = document.createElement('div');
    arrBox.className = 'tp-arrbox';
    arrBox.innerHTML = `<svg class="tp-svg" viewBox="0 0 720 180" preserveAspectRatio="xMidYMid meet"></svg>`;
    top.appendChild(arrBox);

    const codeBox = document.createElement('pre');
    codeBox.className = 'tp-codebox code';
    top.appendChild(codeBox);

    const status = document.createElement('div');
    status.className = 'tp-status';
    root.appendChild(status);

    const ctrl = document.createElement('div');
    ctrl.className = 'tp-controls';
    const showK = mode === 'opposite-sum';
    ctrl.innerHTML = `
      <label class="tp-targetlbl" style="display:${showK ? '' : 'none'}">target K<input type="number" class="tp-target" value="${target}" style="width:60px"></label>
      <label class="tp-threshlbl" style="display:${showK ? 'none' : ''}">S<input type="number" class="tp-thresh" value="${thresh}" style="width:60px"></label>
      <button class="aw-btn" data-act="step">Step</button>
      <button class="aw-btn" data-act="run">Run</button>
      <button class="aw-btn" data-act="reset">Reset</button>
      ${lockMode ? '' : `<button class="aw-btn tp-mode" data-act="mode">mode: <b class="tp-mode-lbl">${mode}</b></button>`}
    `;
    root.appendChild(ctrl);

    function setStatus(html) { status.innerHTML = html; }

    function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    // simple keyword tint
    function tintLine(t) {
      const KW = ['int','while','for','if','else','break','return','min','max','INF'];
      let out = esc(t);
      KW.forEach(k => {
        out = out.replace(new RegExp('\\b' + k + '\\b', 'g'), `<span class="kw">${k}</span>`);
      });
      out = out.replace(/\b(\d+)\b/g, '<span class="num">$1</span>');
      out = out.replace(/(\/\/[^\n]*|\/\*[^*]*\*\/)/g, '<span class="cmt">$1</span>');
      return out;
    }

    function renderCode() {
      const lines = CODE[mode];
      codeBox.innerHTML = lines.map(ln =>
        `<div class="tp-line${ln.id === curLine ? ' tp-line-hot' : ''}" data-id="${ln.id}">${tintLine(ln.text)}</div>`
      ).join('');
    }

    function render() {
      const svg = arrBox.querySelector('svg');
      const W = 720, H = 180;
      const n = values.length;
      const cellW = Math.min(70, (W - 40) / n);
      const startX = (W - cellW * n) / 2;
      const cellY = 72, cellH = 48;

      let cells = '';
      for (let i = 0; i < n; i++) {
        const x = startX + i * cellW;
        let fill = '#fff', stroke = '#1a1a1a';
        const inWindow = (mode === 'window-sum' && r >= l && i >= l && i <= r);
        const isBest = (bestL >= 0 && i >= bestL && i <= bestR);
        if (i === foundIdxL || i === foundIdxR) fill = '#2f9e44';
        else if (mode === 'opposite-sum' && (i === l || i === r)) fill = (i === l) ? '#1d3fb6' : '#d62828';
        else if (inWindow && isBest) fill = '#a5d8a8';
        else if (inWindow) fill = '#fde9a3';
        else if (isBest) fill = '#c5e1c8';
        const textFill = (i === foundIdxL || i === foundIdxR || (mode === 'opposite-sum' && (i === l || i === r))) ? '#fff' : '#1a1a1a';
        cells += `<rect x="${x}" y="${cellY}" width="${cellW - 6}" height="${cellH}" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
        cells += `<text x="${x + (cellW - 6) / 2}" y="${cellY + cellH / 2 + 5}" text-anchor="middle" font-family="JetBrains Mono" font-weight="800" font-size="16" fill="${textFill}">${values[i]}</text>`;
        cells += `<text x="${x + (cellW - 6) / 2}" y="${cellY - 6}" text-anchor="middle" font-family="JetBrains Mono" font-size="11" fill="#888">${i}</text>`;
      }

      let markers = '';
      function arrow(idx, color, label, above) {
        if (idx < 0 || idx >= n) return '';
        const x = startX + idx * cellW + (cellW - 6) / 2;
        const y = above ? cellY - 22 : cellY + cellH + 22;
        const ty = above ? y - 4 : y + 14;
        const tri = above
          ? `M ${x-7},${y} L ${x+7},${y} L ${x},${y+10} Z`
          : `M ${x-7},${y} L ${x+7},${y} L ${x},${y-10} Z`;
        return `<path d="${tri}" fill="${color}"/>
                <text x="${x}" y="${ty}" text-anchor="middle" font-family="JetBrains Mono" font-weight="800" font-size="13" fill="${color}">${label}</text>`;
      }
      if (mode === 'opposite-sum') {
        markers += arrow(l, '#1d3fb6', 'l', false);
        markers += arrow(r, '#d62828', 'r', true);
      } else {
        markers += arrow(l, '#1d3fb6', 'l', false);
        if (r >= 0) markers += arrow(r, '#d62828', 'r', true);
      }

      // Persistent best-window bracket above cells.
      let bestBracket = '';
      if (bestL >= 0 && bestR >= bestL) {
        const x1 = startX + bestL * cellW + 2;
        const x2 = startX + bestR * cellW + (cellW - 6);
        const yb = cellY - 26;
        bestBracket = `
          <line x1="${x1}" y1="${yb}" x2="${x2}" y2="${yb}" stroke="#2f9e44" stroke-width="3"/>
          <line x1="${x1}" y1="${yb}" x2="${x1}" y2="${yb + 6}" stroke="#2f9e44" stroke-width="3"/>
          <line x1="${x2}" y1="${yb}" x2="${x2}" y2="${yb + 6}" stroke="#2f9e44" stroke-width="3"/>
          <text x="${(x1 + x2) / 2}" y="${yb - 4}" text-anchor="middle" font-family="JetBrains Mono" font-weight="800" font-size="11" fill="#2f9e44">best len=${bestLen === Infinity ? '?' : bestLen}</text>
        `;
      }

      svg.innerHTML = cells + bestBracket + markers;
      renderCode();
    }

    const sleep = ms => new Promise(res => setTimeout(res, ms));

    // Each step animates through code lines while updating array state.
    async function stepOpposite(token, slow = true) {
      if (done) return;
      const tick = async (line, ms = 350) => {
        if (token !== runToken && slow) return false;
        curLine = line; render();
        if (slow) await sleep(ms);
        return true;
      };
      // while-check
      if (!(await tick('while'))) return;
      if (l >= r) {
        done = true; curLine = 'end';
        setStatus(`pointers crossed &mdash; <b>no pair sums to ${target}</b>.`);
        render(); return;
      }
      if (!(await tick('sum'))) return;
      const s = values[l] + values[r];
      setStatus(`s = a[${l}] + a[${r}] = ${values[l]} + ${values[r]} = <b>${s}</b>`);
      if (!(await tick('eq'))) return;
      if (s === target) {
        foundIdxL = l; foundIdxR = r; done = true; curLine = 'eq';
        setStatus(`s == K (${s} == ${target}) &check; <b>found pair</b>.`);
        render(); return;
      }
      if (s < target) {
        if (!(await tick('lt'))) return;
        setStatus(`s = ${s} &lt; ${target} &rarr; <span class="tk-blue">l++</span>.`);
        l++;
      } else {
        if (!(await tick('gt'))) return;
        setStatus(`s = ${s} &gt; ${target} &rarr; <span class="tk-red">r--</span>.`);
        r--;
      }
      render();
    }

    async function stepWindow(token, slow = true) {
      if (done) return;
      const n = values.length;
      const tick = async (line, ms = 350) => {
        if (token !== runToken && slow) return false;
        curLine = line; render();
        if (slow) await sleep(ms);
        return true;
      };

      if (r >= l && r >= 0) {
        let s = 0; for (let i = l; i <= r; i++) s += values[i];
        if (s >= thresh) {
          if (!(await tick('while'))) return;
          if (!(await tick('best'))) return;
          const len = r - l + 1;
          if (len < bestLen) { bestLen = len; bestL = l; bestR = r; }
          setStatus(`window [${l}..${r}] sum=${s} &ge; ${thresh}, len=${len}. best=${bestLen}.`);
          if (!(await tick('shrink'))) return;
          l++;
          setStatus(`shrink: <span class="tk-blue">l++</span> &rarr; ${l}.`);
          render();
          return;
        }
      }
      // extend r
      if (r + 1 < n) {
        if (!(await tick('for'))) return;
        if (!(await tick('add'))) return;
        r++;
        let s = 0; for (let i = l; i <= r; i++) s += values[i];
        setStatus(`extend r: window [${l}..${r}] sum=${s}.`);
        render();
        return;
      }
      // can't extend, can't shrink → done
      done = true; curLine = 'end2';
      if (bestLen === Infinity) setStatus(`done. <b>no subarray</b> with sum &ge; ${thresh}.`);
      else {
        const bestSum = values.slice(bestL, bestR + 1).reduce((a,b)=>a+b,0);
        setStatus(`done. smallest = a[${bestL}..${bestR}] = [${values.slice(bestL, bestR+1).join(', ')}], sum=${bestSum}, len <b>${bestLen}</b>.`);
      }
      render();
    }

    // window-max: longest subarray with sum <= S.
    async function stepWindowMax(token, slow = true) {
      if (done) return;
      const n = values.length;
      const tick = async (line, ms = 350) => {
        if (token !== runToken && slow) return false;
        curLine = line; render();
        if (slow) await sleep(ms);
        return true;
      };

      // shrink while sum > S
      if (r >= l && r >= 0) {
        let s = 0; for (let i = l; i <= r; i++) s += values[i];
        if (s > thresh) {
          if (!(await tick('while'))) return;
          if (!(await tick('shrink'))) return;
          l++;
          setStatus(`sum=${s} &gt; ${thresh}, shrink: <span class="tk-blue">l++</span> &rarr; ${l}.`);
          render();
          return;
        }
        // record best
        const len = r - l + 1;
        if (len > bestLen) { bestLen = len; bestL = l; bestR = r; }
        if (!(await tick('best'))) return;
        setStatus(`window [${l}..${r}] sum=${s} &le; ${thresh}, len=${len}. best=${bestLen}.`);
      }
      // extend r
      if (r + 1 < n) {
        if (!(await tick('for'))) return;
        if (!(await tick('add'))) return;
        r++;
        let s = 0; for (let i = l; i <= r; i++) s += values[i];
        setStatus(`extend r: window [${l}..${r}] sum=${s}.`);
        render();
        return;
      }
      // r at end → final shrink-or-record loop already covered, finish
      done = true; curLine = 'end2';
      if (bestLen === 0) setStatus(`done. <b>no subarray</b> with sum &le; ${thresh}.`);
      else {
        const bestSum = values.slice(bestL, bestR + 1).reduce((a,b)=>a+b,0);
        setStatus(`done. longest = a[${bestL}..${bestR}] = [${values.slice(bestL, bestR+1).join(', ')}], sum=${bestSum}, len <b>${bestLen}</b>.`);
      }
      render();
    }

    async function step(slow = true) {
      const token = ++runToken;
      if (mode === 'opposite-sum') await stepOpposite(token, slow);
      else if (mode === 'window-sum') await stepWindow(token, slow);
      else await stepWindowMax(token, slow);
    }

    async function run() {
      const token = ++runToken;
      while (!done) {
        if (token !== runToken) return;
        if (mode === 'opposite-sum') await stepOpposite(token, true);
        else if (mode === 'window-sum') await stepWindow(token, true);
        else await stepWindowMax(token, true);
        await sleep(250);
      }
    }

    function reset() {
      runToken++;
      target = parseInt(ctrl.querySelector('.tp-target').value, 10) || initTarget;
      thresh = parseInt(ctrl.querySelector('.tp-thresh').value, 10) || initThresh;
      resetState();
      const msg = {
        'opposite-sum': `opposite-ends. target K = <b>${target}</b>. Step or Run.`,
        'window-sum':   `sliding-window (min). smallest subarray sum &ge; <b>${thresh}</b>.`,
        'window-max':   `sliding-window (max). longest subarray sum &le; <b>${thresh}</b>.`,
      }[mode];
      setStatus(msg);
      render();
    }

    function toggleMode() {
      runToken++;
      const i = MODES.indexOf(mode);
      mode = MODES[(i + 1) % MODES.length];
      const lbl = ctrl.querySelector('.tp-mode-lbl');
      if (lbl) lbl.textContent = mode;
      const showK = mode === 'opposite-sum';
      ctrl.querySelector('.tp-targetlbl').style.display = showK ? '' : 'none';
      ctrl.querySelector('.tp-threshlbl').style.display = showK ? 'none' : '';
      reset();
    }

    ctrl.addEventListener('click', (e) => {
      const btn = e.target.closest('button'); if (!btn) return;
      const a = btn.dataset.act;
      if (a === 'step') step(true);
      else if (a === 'run') run();
      else if (a === 'reset') reset();
      else if (a === 'mode') toggleMode();
    });

    reset();
  }

  window.Widgets = window.Widgets || {};
  window.Widgets['two-pointers'] = mount;
})();
