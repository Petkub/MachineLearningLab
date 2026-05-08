// Difference array interactive widget — d[] + a[] + side code with live tracing.
// data-widget="diff-array"
// data-n="8"   or   data-values="0,0,0,0,0,0,0,0"
(function () {
  function mount(el) {
    if (el.dataset.mounted) return;
    el.dataset.mounted = '1';

    let initial;
    if (el.dataset.values) {
      initial = el.dataset.values.split(',').map(s => parseInt(s.trim(), 10));
    } else {
      const n = parseInt(el.dataset.n || '8', 10);
      initial = new Array(n).fill(0);
    }
    const n = initial.length;

    let d = new Array(n + 2).fill(0);
    for (let i = 1; i <= n; i++) d[i] = initial[i - 1] - (initial[i - 2] || 0);

    let a = initial.slice();
    let swept = true;
    let lastTouch = [];

    const root = document.createElement('div');
    root.className = 'da-root';
    el.appendChild(root);

    const top = document.createElement('div');
    top.className = 'da-top';
    root.appendChild(top);

    const arrCol = document.createElement('div');
    arrCol.className = 'da-arrcol';
    top.appendChild(arrCol);

    const dRow = document.createElement('div');
    dRow.className = 'da-row';
    arrCol.appendChild(dRow);

    const aRow = document.createElement('div');
    aRow.className = 'da-row';
    arrCol.appendChild(aRow);

    const ctrl = document.createElement('div');
    ctrl.className = 'da-controls';
    ctrl.innerHTML = `
      <label>l<input type="number" class="da-in da-il" min="1" max="${n}" value="2"></label>
      <label>r<input type="number" class="da-in da-ir" min="1" max="${n}" value="5"></label>
      <label>v<input type="number" class="da-in da-iv" value="3"></label>
      <button class="aw-btn" data-act="apply">Apply</button>
      <button class="aw-btn" data-act="sweep">Sweep</button>
      <button class="aw-btn" data-act="reset">Reset</button>
    `;
    arrCol.appendChild(ctrl);

    const status = document.createElement('div');
    status.className = 'da-status';
    status.textContent = 'Apply range adds. Then Sweep to materialize a[].';
    arrCol.appendChild(status);

    const codeCol = document.createElement('pre');
    codeCol.className = 'da-codebox code';
    top.appendChild(codeCol);

    const CODE = [
      { id: 'u1', text: '// Update (per range add, O(1))' },
      { id: 'u2', text: 'void range_add(int l, int r, ll v) {' },
      { id: 'u3', text: '    d[l]   += v;' },
      { id: 'u4', text: '    d[r+1] -= v;' },
      { id: 'u5', text: '}' },
      { id: 'sp', text: '' },
      { id: 's1', text: '// Finalize (once, O(n))' },
      { id: 's2', text: 'a[0] = 0;' },
      { id: 's3', text: 'for (int i = 1; i <= n; i++)' },
      { id: 's4', text: '    a[i] = a[i-1] + d[i];' },
    ];

    function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    function tint(t) {
      const KW = ['void','int','long','for','ll'];
      let out = esc(t);
      KW.forEach(k => out = out.replace(new RegExp('\\b' + k + '\\b','g'), `<span class="kw">${k}</span>`));
      out = out.replace(/\b(\d+)\b/g, '<span class="num">$1</span>');
      out = out.replace(/(\/\/[^\n]*)/g, '<span class="cmt">$1</span>');
      out = out.replace(/\b(range_add)\b/g, '<span class="fn">$1</span>');
      return out;
    }

    function renderCode(activeIds) {
      const set = new Set(Array.isArray(activeIds) ? activeIds : [activeIds]);
      codeCol.innerHTML = CODE.map(ln => {
        const hot = set.has(ln.id) ? ' da-line-hot' : '';
        return `<div class="da-line${hot}">${ln.text === '' ? '&nbsp;' : tint(ln.text)}</div>`;
      }).join('');
    }

    function render(activeIds = []) {
      let dh = '<div class="da-label">d[i]</div>';
      for (let i = 1; i <= n + 1; i++) {
        const cls = lastTouch.includes(i) ? 'da-touch' : '';
        dh += `<div class="da-cell ${cls}">
          <div class="da-idx">${i}</div>
          <div class="da-val">${d[i]}</div>
        </div>`;
      }
      dRow.innerHTML = dh;

      let ah = '<div class="da-label">a[i]</div>';
      for (let i = 1; i <= n; i++) {
        const cls = swept ? 'da-final' : 'da-stale';
        ah += `<div class="da-cell ${cls}">
          <div class="da-idx">${i}</div>
          <div class="da-val">${swept ? a[i - 1] : '?'}</div>
        </div>`;
      }
      ah += `<div class="da-cell da-pad"></div>`;
      aRow.innerHTML = ah;

      renderCode(activeIds);
    }

    function apply() {
      const l = parseInt(ctrl.querySelector('.da-il').value, 10);
      const r = parseInt(ctrl.querySelector('.da-ir').value, 10);
      const v = parseInt(ctrl.querySelector('.da-iv').value, 10);
      if (!(l >= 1 && r <= n && l <= r) || isNaN(v)) {
        status.textContent = `invalid range (need 1 <= l <= r <= ${n}).`;
        return;
      }
      d[l] += v;
      d[r + 1] -= v;
      lastTouch = [l, r + 1];
      swept = false;
      status.innerHTML = `add ${v} to a[${l}..${r}] &rarr; d[${l}] += ${v}; d[${r + 1}] &minus;= ${v}.`;
      render(['u3', 'u4']);
    }

    async function sweep() {
      let cur = 0;
      a = new Array(n).fill(0);
      for (let i = 1; i <= n; i++) {
        cur += d[i];
        a[i - 1] = cur;
      }
      swept = true;
      lastTouch = [];
      status.innerHTML = `swept: a[i] = a[i&minus;1] + d[i]. final array materialized.`;
      render(['s3', 's4']);
    }

    function reset() {
      d = new Array(n + 2).fill(0);
      for (let i = 1; i <= n; i++) d[i] = initial[i - 1] - (initial[i - 2] || 0);
      a = initial.slice();
      swept = true;
      lastTouch = [];
      status.textContent = 'reset. apply range adds, then Sweep.';
      render([]);
    }

    ctrl.addEventListener('click', (e) => {
      const btn = e.target.closest('button'); if (!btn) return;
      const act = btn.dataset.act;
      if (act === 'apply') apply();
      else if (act === 'sweep') sweep();
      else if (act === 'reset') reset();
    });

    render([]);
  }

  window.Widgets = window.Widgets || {};
  window.Widgets['diff-array'] = mount;
})();
