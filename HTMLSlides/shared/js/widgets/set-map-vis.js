// set / map visualizer — animates STL ops on sorted balanced-BST view.
// data-widget="set-map-vis"
// data-mode="set" | "map"   (default "set")
// data-values="5,2,8,3"     initial inserts (set)
// data-pairs='[["abc",2],["xyz",1]]'   initial pairs (map)
(function () {
  function mount(el) {
    if (el.dataset.mounted) return;
    el.dataset.mounted = '1';

    let mode = el.dataset.mode === 'map' ? 'map' : 'set';
    const initialSet = el.dataset.values
      ? el.dataset.values.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
      : [5, 2, 8, 3, 9];
    const initialMap = el.dataset.pairs
      ? JSON.parse(el.dataset.pairs)
      : [['abc', 2], ['xyz', 1], ['def', 4]];

    let setData = [];          // sorted unique ints
    let mapData = [];          // sorted [k,v] by k
    let busy = false;
    let hotIdx = -1;           // active position
    let foundIdx = -1;         // success
    let missIdx = -1;          // not-found marker
    let scanRange = null;      // [lo, hi] band
    let iterPos = null;        // null = no iterator, integer 0..n = iterator position (n = end())

    function buildInitial() {
      setData = Array.from(new Set(initialSet)).sort((a, b) => a - b);
      mapData = initialMap.slice().sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
    }
    buildInitial();

    const wrap = document.createElement('div');
    wrap.className = 'sm-root';
    el.appendChild(wrap);

    const header = document.createElement('div');
    header.className = 'sm-header';
    header.innerHTML = `
      <div class="sm-title"><code class="sm-title-code"></code></div>
      <div class="sm-toggle">
        <button class="aw-btn sm-tab" data-tab="set">set&lt;int&gt;</button>
        <button class="aw-btn sm-tab" data-tab="map">map&lt;string,int&gt;</button>
      </div>`;
    wrap.appendChild(header);

    const view = document.createElement('div');
    view.className = 'sm-view';
    wrap.appendChild(view);

    const status = document.createElement('div');
    status.className = 'sm-status';
    wrap.appendChild(status);

    const ctrl = document.createElement('div');
    ctrl.className = 'sm-controls';
    wrap.appendChild(ctrl);

    function setStatus(html) {
      status.innerHTML = html;
      if (window.renderMathInElement) {
        try {
          renderMathInElement(status, {
            delimiters: [
              { left: '$$', right: '$$', display: true },
              { left: '$', right: '$', display: false }
            ],
            throwOnError: false
          });
        } catch (e) { /* ignore */ }
      }
    }

    function renderSet() {
      header.querySelector('.sm-title-code').textContent = `set<int> s = { ${setData.join(', ') || '∅'} };`;
      if (setData.length === 0) {
        view.innerHTML = `<div class="sm-empty">empty set &mdash; begin() == end()</div>`;
        return;
      }
      const cells = setData.map((v, i) => {
        const cls = ['sm-cell'];
        if (i === foundIdx) cls.push('sm-found');
        else if (i === hotIdx) cls.push('sm-hot');
        else if (iterPos === i) cls.push('sm-iter-cell');
        else if (scanRange && i >= scanRange[0] && i <= scanRange[1]) cls.push('sm-band');
        const ptr = (iterPos === i)
          ? `<div class="sm-iter">▼<span>it</span></div>`
          : '';
        return `<div class="sm-cell-wrap">${ptr}<div class="${cls.join(' ')}"><div class="sm-val">${v}</div></div></div>`;
      }).join('');
      const endPill = (iterPos === setData.length)
        ? `<div class="sm-end-wrap"><div class="sm-iter">▼<span>it</span></div><div class="sm-end-pill">end()</div></div>`
        : `<div class="sm-end-wrap sm-end-dim"><div class="sm-end-pill">end()</div></div>`;
      let miss = '';
      if (missIdx >= 0 && missIdx < setData.length) {
        miss = `<div class="sm-miss" style="left:calc(${missIdx} * (100% / ${setData.length}))">▼</div>`;
      }
      view.innerHTML = `<div class="sm-arr">${cells}${endPill}</div>${miss}`;
    }

    function renderMap() {
      const items = mapData.map(([k, v]) => `"${k}": ${v}`).join(', ');
      header.querySelector('.sm-title-code').textContent = `map<string,int> m = { ${items || '∅'} };`;
      if (mapData.length === 0) {
        view.innerHTML = `<div class="sm-empty">empty map &mdash; begin() == end()</div>`;
        return;
      }
      const rows = mapData.map(([k, v], i) => {
        const cls = ['sm-row'];
        if (i === foundIdx) cls.push('sm-found');
        else if (i === hotIdx) cls.push('sm-hot');
        else if (iterPos === i) cls.push('sm-iter-cell');
        else if (scanRange && i >= scanRange[0] && i <= scanRange[1]) cls.push('sm-band');
        const ptr = (iterPos === i)
          ? `<div class="sm-row-iter">it &rarr;</div>`
          : `<div class="sm-row-iter sm-row-iter-empty"></div>`;
        return `<div class="sm-row-wrap">${ptr}<div class="${cls.join(' ')}"><div class="sm-key">"${k}"</div><div class="sm-arrow">→</div><div class="sm-mval">${v}</div></div></div>`;
      }).join('');
      const endRow = `<div class="sm-row-wrap">${
        iterPos === mapData.length
          ? `<div class="sm-row-iter">it &rarr;</div>`
          : `<div class="sm-row-iter sm-row-iter-empty"></div>`
      }<div class="sm-end-pill sm-end-pill-row${iterPos === mapData.length ? '' : ' sm-end-dim'}">end()</div></div>`;
      view.innerHTML = `<div class="sm-rows">${rows}${endRow}</div>`;
    }

    function render() {
      header.querySelectorAll('.sm-tab').forEach(b => {
        b.classList.toggle('sm-tab-active', b.dataset.tab === mode);
      });
      if (mode === 'set') renderSet();
      else renderMap();
    }

    function buildControls() {
      if (mode === 'set') {
        ctrl.innerHTML = `
          <label>val<input type="number" class="sm-in" value="6" style="width:60px"></label>
          <button class="aw-btn" data-act="insert">insert</button>
          <button class="aw-btn" data-act="erase">erase</button>
          <button class="aw-btn" data-act="count">count</button>
          <button class="aw-btn" data-act="lb">lower_bound</button>
          <button class="aw-btn" data-act="ub">upper_bound</button>
          <button class="aw-btn sm-iter-btn" data-act="begin">begin()</button>
          <button class="aw-btn sm-iter-btn" data-act="advance">++it</button>
          <button class="aw-btn sm-iter-btn" data-act="end">end()</button>
          <button class="aw-btn" data-act="reset">reset</button>`;
      } else {
        ctrl.innerHTML = `
          <label>key<input type="text" class="sm-in-k" value="hi" style="width:60px"></label>
          <label>val<input type="number" class="sm-in-v" value="1" style="width:50px"></label>
          <button class="aw-btn" data-act="set">m[k]=v</button>
          <button class="aw-btn" data-act="inc">m[k]++</button>
          <button class="aw-btn" data-act="count">count</button>
          <button class="aw-btn" data-act="erase">erase</button>
          <button class="aw-btn" data-act="find">find</button>
          <button class="aw-btn sm-iter-btn" data-act="begin">begin()</button>
          <button class="aw-btn sm-iter-btn" data-act="advance">++it</button>
          <button class="aw-btn sm-iter-btn" data-act="end">end()</button>
          <button class="aw-btn" data-act="reset">reset</button>`;
      }
    }

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    function clearMarks() {
      hotIdx = -1; foundIdx = -1; missIdx = -1; scanRange = null;
    }

    // Animated binary search returning insertion point (lower_bound).
    async function bsearchLower(arr, target, cmp) {
      let lo = 0, hi = arr.length;
      while (lo < hi) {
        scanRange = [lo, hi - 1];
        const mid = (lo + hi) >> 1;
        hotIdx = mid;
        setStatus(`scan <b>[${lo}, ${hi - 1}]</b>, mid = <b>${mid}</b>.`);
        render();
        await sleep(420);
        if (cmp(arr[mid], target) < 0) lo = mid + 1;
        else hi = mid;
      }
      scanRange = null; hotIdx = -1;
      return lo;
    }

    // ---- set ops ----
    async function setInsert(v) {
      clearMarks();
      const idx = await bsearchLower(setData, v, (a, b) => a - b);
      if (idx < setData.length && setData[idx] === v) {
        foundIdx = idx;
        setStatus(`<b>${v}</b> already in set &mdash; no-op (set has no dupes).`);
        render();
        return;
      }
      setData.splice(idx, 0, v);
      foundIdx = idx;
      setStatus(`inserted <b>${v}</b> at position <b>${idx}</b>. $O(\\log n)$.`);
      render();
    }

    async function setErase(v) {
      clearMarks();
      const idx = await bsearchLower(setData, v, (a, b) => a - b);
      if (idx >= setData.length || setData[idx] !== v) {
        missIdx = idx;
        setStatus(`<b>${v}</b> not in set &mdash; erase no-op.`);
        render();
        return;
      }
      hotIdx = idx;
      setStatus(`erasing <b>${v}</b> at position <b>${idx}</b>...`);
      render();
      await sleep(500);
      setData.splice(idx, 1);
      clearMarks();
      setStatus(`erased <b>${v}</b>.`);
      render();
    }

    async function setCount(v) {
      clearMarks();
      const idx = await bsearchLower(setData, v, (a, b) => a - b);
      if (idx < setData.length && setData[idx] === v) {
        foundIdx = idx;
        setStatus(`<code>s.count(${v})</code> = <b>1</b>.`);
      } else {
        missIdx = idx;
        setStatus(`<code>s.count(${v})</code> = <b>0</b>.`);
      }
      render();
    }

    async function setLB(v) {
      clearMarks();
      const idx = await bsearchLower(setData, v, (a, b) => a - b);
      if (idx >= setData.length) {
        missIdx = setData.length;
        setStatus(`<code>lower_bound(${v})</code> = <b>s.end()</b> (no element &ge; ${v}).`);
      } else {
        foundIdx = idx;
        setStatus(`<code>lower_bound(${v})</code> &rarr; first &ge; ${v} = <b>${setData[idx]}</b>.`);
      }
      render();
    }

    async function setUB(v) {
      clearMarks();
      // upper_bound = lower_bound on (v + 1) for ints.
      const idx = await bsearchLower(setData, v + 0.5, (a, b) => a - b);
      if (idx >= setData.length) {
        missIdx = setData.length;
        setStatus(`<code>upper_bound(${v})</code> = <b>s.end()</b> (no element &gt; ${v}).`);
      } else {
        foundIdx = idx;
        setStatus(`<code>upper_bound(${v})</code> &rarr; first &gt; ${v} = <b>${setData[idx]}</b>.`);
      }
      render();
    }

    function iterBegin() {
      clearMarks();
      iterPos = 0;
      const cur = mode === 'set'
        ? (setData.length ? setData[0] : 'end()')
        : (mapData.length ? `"${mapData[0][0]}"` : 'end()');
      setStatus(setData.length === 0 && mode === 'set'
        ? `<code>begin() == end()</code> (container empty).`
        : mapData.length === 0 && mode === 'map'
          ? `<code>begin() == end()</code> (container empty).`
          : `<code>auto it = ${mode === 'set' ? 's' : 'm'}.begin();</code> &rarr; points at <b>${cur}</b>.`);
      render();
    }

    function iterEnd() {
      clearMarks();
      iterPos = mode === 'set' ? setData.length : mapData.length;
      setStatus(`<code>auto it = ${mode === 'set' ? 's' : 'm'}.end();</code> &rarr; one past last. Cannot dereference.`);
      render();
    }

    async function iterAdvance() {
      if (iterPos === null) {
        setStatus(`call <code>begin()</code> first to get an iterator.`);
        return;
      }
      const n = mode === 'set' ? setData.length : mapData.length;
      if (iterPos >= n) {
        setStatus(`<code>it == end()</code> already &mdash; cannot advance further.`);
        render();
        return;
      }
      clearMarks();
      iterPos++;
      render();
      await sleep(150);
      if (iterPos >= n) {
        setStatus(`<code>++it</code> &rarr; reached <b>end()</b>. Loop terminates.`);
      } else {
        const cur = mode === 'set' ? setData[iterPos] : `"${mapData[iterPos][0]}" &rarr; ${mapData[iterPos][1]}`;
        setStatus(`<code>++it</code> &rarr; now at <b>${cur}</b>.`);
      }
      render();
    }

    // ---- map ops ----
    function cmpStr(a, b) { return a < b ? -1 : a > b ? 1 : 0; }

    async function mapSet(k, v) {
      clearMarks();
      const idx = await bsearchLower(mapData.map(p => p[0]), k, cmpStr);
      if (idx < mapData.length && mapData[idx][0] === k) {
        mapData[idx][1] = v;
        foundIdx = idx;
        setStatus(`updated <code>m["${k}"]</code> = <b>${v}</b>.`);
      } else {
        mapData.splice(idx, 0, [k, v]);
        foundIdx = idx;
        setStatus(`inserted <code>m["${k}"]</code> = <b>${v}</b> at position <b>${idx}</b>.`);
      }
      render();
    }

    async function mapInc(k) {
      clearMarks();
      const idx = await bsearchLower(mapData.map(p => p[0]), k, cmpStr);
      if (idx < mapData.length && mapData[idx][0] === k) {
        mapData[idx][1]++;
        foundIdx = idx;
        setStatus(`<code>m["${k}"]++</code> &rarr; now <b>${mapData[idx][1]}</b>.`);
      } else {
        mapData.splice(idx, 0, [k, 1]);
        foundIdx = idx;
        setStatus(`<code>m["${k}"]</code> defaulted to 0, then ++ &rarr; <b>1</b>.`);
      }
      render();
    }

    async function mapCount(k) {
      clearMarks();
      const idx = await bsearchLower(mapData.map(p => p[0]), k, cmpStr);
      if (idx < mapData.length && mapData[idx][0] === k) {
        foundIdx = idx;
        setStatus(`<code>m.count("${k}")</code> = <b>1</b>.`);
      } else {
        missIdx = idx;
        setStatus(`<code>m.count("${k}")</code> = <b>0</b>.`);
      }
      render();
    }

    async function mapErase(k) {
      clearMarks();
      const idx = await bsearchLower(mapData.map(p => p[0]), k, cmpStr);
      if (idx >= mapData.length || mapData[idx][0] !== k) {
        missIdx = idx;
        setStatus(`<code>"${k}"</code> not in map &mdash; erase no-op.`);
        render();
        return;
      }
      hotIdx = idx;
      setStatus(`erasing <code>"${k}"</code>...`);
      render();
      await sleep(500);
      mapData.splice(idx, 1);
      clearMarks();
      setStatus(`erased <code>"${k}"</code>.`);
      render();
    }

    async function mapFind(k) {
      clearMarks();
      const idx = await bsearchLower(mapData.map(p => p[0]), k, cmpStr);
      if (idx < mapData.length && mapData[idx][0] === k) {
        foundIdx = idx;
        setStatus(`<code>m.find("${k}")</code> &rarr; value = <b>${mapData[idx][1]}</b>.`);
      } else {
        missIdx = idx;
        setStatus(`<code>m.find("${k}")</code> = <b>m.end()</b>.`);
      }
      render();
    }

    // ---- wiring ----
    function readSetVal() {
      const v = parseInt(ctrl.querySelector('.sm-in').value, 10);
      return isNaN(v) ? null : v;
    }

    function readMapKV() {
      const k = ctrl.querySelector('.sm-in-k').value.trim();
      const v = parseInt(ctrl.querySelector('.sm-in-v').value, 10);
      return { k, v: isNaN(v) ? 0 : v };
    }

    ctrl.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-act]');
      if (!btn || busy) return;
      busy = true;
      try {
        const act = btn.dataset.act;
        if (mode === 'set') {
          const v = readSetVal();
          if (act === 'insert' && v !== null) await setInsert(v);
          else if (act === 'erase' && v !== null) await setErase(v);
          else if (act === 'count' && v !== null) await setCount(v);
          else if (act === 'lb' && v !== null) await setLB(v);
          else if (act === 'ub' && v !== null) await setUB(v);
          else if (act === 'begin') iterBegin();
          else if (act === 'end') iterEnd();
          else if (act === 'advance') await iterAdvance();
          else if (act === 'reset') {
            buildInitial(); clearMarks(); iterPos = null;
            setStatus(`reset.`); render();
          }
        } else {
          const { k, v } = readMapKV();
          if (act === 'set' && k) await mapSet(k, v);
          else if (act === 'inc' && k) await mapInc(k);
          else if (act === 'count' && k) await mapCount(k);
          else if (act === 'erase' && k) await mapErase(k);
          else if (act === 'find' && k) await mapFind(k);
          else if (act === 'begin') iterBegin();
          else if (act === 'end') iterEnd();
          else if (act === 'advance') await iterAdvance();
          else if (act === 'reset') {
            buildInitial(); clearMarks(); iterPos = null;
            setStatus(`reset.`); render();
          }
        }
      } finally { busy = false; }
    });

    header.addEventListener('click', (e) => {
      const tab = e.target.closest('.sm-tab');
      if (!tab || busy) return;
      mode = tab.dataset.tab;
      buildInitial(); clearMarks(); iterPos = null;
      buildControls();
      setStatus(`switched to <b>${mode}</b>.`);
      render();
    });

    buildControls();
    setStatus(mode === 'set'
      ? `try insert / erase / lower_bound on sorted set.`
      : `try m[k]++ to count occurrences. Iteration is sorted by key.`);
    render();
  }

  window.Widgets = window.Widgets || {};
  window.Widgets['set-map-vis'] = mount;
})();
