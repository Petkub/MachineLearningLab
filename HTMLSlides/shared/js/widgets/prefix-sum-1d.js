// 1D prefix sum interactive widget — array + P[] + side code with live tracing.
// data-widget="prefix-sum-1d"
// data-values="3,1,4,1,5,9,2,6"
(function () {
  function mount(el) {
    if (el.dataset.mounted) return;
    el.dataset.mounted = '1';

    const values = (el.dataset.values || '3,1,4,1,5,9,2,6')
      .split(',').map(s => parseInt(s.trim(), 10));
    const n = values.length;
    const P = new Array(n + 1).fill(0);
    for (let i = 1; i <= n; i++) P[i] = P[i - 1] + values[i - 1];

    let l = 2, r = 5;
    let pulseToken = 0;

    const root = document.createElement('div');
    root.className = 'ps-root';
    el.appendChild(root);

    const top = document.createElement('div');
    top.className = 'ps-top';
    root.appendChild(top);

    const arrCol = document.createElement('div');
    arrCol.className = 'ps-arrcol';
    top.appendChild(arrCol);

    const aRow = document.createElement('div');
    aRow.className = 'ps-row';
    arrCol.appendChild(aRow);

    const pRow = document.createElement('div');
    pRow.className = 'ps-row';
    arrCol.appendChild(pRow);

    const ctrl = document.createElement('div');
    ctrl.className = 'ps-controls';
    ctrl.innerHTML = `
      <label>l = <span class="ps-l">${l}</span></label>
      <input type="range" class="ps-slider ps-sl" min="1" max="${n}" value="${l}">
      <label>r = <span class="ps-r">${r}</span></label>
      <input type="range" class="ps-slider ps-sr" min="1" max="${n}" value="${r}">
    `;
    arrCol.appendChild(ctrl);

    const status = document.createElement('div');
    status.className = 'ps-status';
    arrCol.appendChild(status);

    const codeCol = document.createElement('pre');
    codeCol.className = 'ps-codebox code';
    top.appendChild(codeCol);

    const CODE = [
      { id: 'b1', text: '// Build (once, O(n))' },
      { id: 'b2', text: 'vector<long long> P(n + 1, 0);' },
      { id: 'b3', text: 'for (int i = 1; i <= n; i++)' },
      { id: 'b4', text: '    P[i] = P[i-1] + a[i];' },
      { id: 'sp', text: '' },
      { id: 'q1', text: '// Query (per call, O(1))' },
      { id: 'q2', text: 'long long range_sum(int l, int r) {' },
      { id: 'q3', text: '    return P[r] - P[l-1];' },
      { id: 'q4', text: '}' },
    ];

    function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    function tint(t) {
      const KW = ['vector','long','int','for','return'];
      let out = esc(t);
      KW.forEach(k => out = out.replace(new RegExp('\\b' + k + '\\b','g'), `<span class="kw">${k}</span>`));
      out = out.replace(/\b(\d+)\b/g, '<span class="num">$1</span>');
      out = out.replace(/(\/\/[^\n]*)/g, '<span class="cmt">$1</span>');
      out = out.replace(/\b(range_sum)\b/g, '<span class="fn">$1</span>');
      return out;
    }

    function renderCode(activeId) {
      codeCol.innerHTML = CODE.map(ln => {
        const hot = ln.id === activeId ? ' ps-line-hot' : '';
        return `<div class="ps-line${hot}">${ln.text === '' ? '&nbsp;' : tint(ln.text)}</div>`;
      }).join('');
    }

    function render(activeLine = 'q3') {
      let aHtml = '<div class="ps-label">a[i]</div>';
      aHtml += `<div class="ps-cell ps-pad"></div>`;
      for (let i = 1; i <= n; i++) {
        const inRange = i >= l && i <= r;
        aHtml += `<div class="ps-cell ${inRange ? 'ps-hi' : ''}">
          <div class="ps-idx">${i}</div>
          <div class="ps-val">${values[i - 1]}</div>
        </div>`;
      }
      aRow.innerHTML = aHtml;

      let pHtml = '<div class="ps-label">P[i]</div>';
      for (let i = 0; i <= n; i++) {
        let cls = '';
        if (i === r) cls = 'ps-green';
        else if (i === l - 1) cls = 'ps-blue';
        pHtml += `<div class="ps-cell ${cls}">
          <div class="ps-idx">${i}</div>
          <div class="ps-val">${P[i]}</div>
        </div>`;
      }
      pRow.innerHTML = pHtml;

      const sum = P[r] - P[l - 1];
      status.innerHTML = `sum(${l}, ${r}) = <span class="tk-green">P[${r}]</span> &minus; <span class="tk-blue">P[${l - 1}]</span> = ${P[r]} &minus; ${P[l - 1]} = <b>${sum}</b>`;

      renderCode(activeLine);
    }

    function clamp() {
      if (l > r) l = r;
      ctrl.querySelector('.ps-l').textContent = l;
      ctrl.querySelector('.ps-r').textContent = r;
      ctrl.querySelector('.ps-sl').value = l;
      ctrl.querySelector('.ps-sr').value = r;
    }

    function pulseQuery() {
      const tok = ++pulseToken;
      render('q3');
      setTimeout(() => { if (tok === pulseToken) render('q3'); }, 0);
    }

    ctrl.querySelector('.ps-sl').addEventListener('input', (e) => {
      l = parseInt(e.target.value, 10);
      if (l > r) r = l;
      clamp(); pulseQuery();
    });
    ctrl.querySelector('.ps-sr').addEventListener('input', (e) => {
      r = parseInt(e.target.value, 10);
      if (r < l) l = r;
      clamp(); pulseQuery();
    });

    // Initial: animate build sweep then settle on query line.
    (async () => {
      const sleep = ms => new Promise(res => setTimeout(res, ms));
      const buildLines = ['b2', 'b3', 'b4', 'b3', 'b4', 'q3'];
      for (const ln of buildLines) {
        render(ln);
        await sleep(280);
      }
      render('q3');
    })();

    render('q3');
  }

  window.Widgets = window.Widgets || {};
  window.Widgets['prefix-sum-1d'] = mount;
})();
