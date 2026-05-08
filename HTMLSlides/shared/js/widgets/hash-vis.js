// Hash table visualizer — bucket array, insert key animates into hash(key) % m.
// Toggle good vs bad hash to show collision pile-up.
// data-widget="hash-vis"
// data-buckets="8"   number of buckets, default 8
(function () {
  function mount(el) {
    if (el.dataset.mounted) return;
    el.dataset.mounted = '1';

    const m = parseInt(el.dataset.buckets || '8', 10);
    let mode = 'good';   // 'good' | 'bad'
    let buckets = Array.from({ length: m }, () => []);
    let lastKey = null;
    let lastBucket = null;
    let busy = false;

    // good hash: golden-ratio mix
    function goodHash(k) {
      let x = (k | 0);
      x = ((x ^ (x >>> 16)) * 0x85ebca6b) | 0;
      x = ((x ^ (x >>> 13)) * 0xc2b2ae35) | 0;
      x = (x ^ (x >>> 16)) >>> 0;
      return x % m;
    }
    // bad hash: just k % m, attacker uses multiples of m to collide
    function badHash(k) {
      return ((k % m) + m) % m;
    }

    function hash(k) { return mode === 'good' ? goodHash(k) : badHash(k); }

    const wrap = document.createElement('div');
    wrap.className = 'hsh-root';
    el.appendChild(wrap);

    const board = document.createElement('div');
    board.className = 'hsh-board';
    wrap.appendChild(board);

    const status = document.createElement('div');
    status.className = 'hsh-status';
    wrap.appendChild(status);

    const ctrl = document.createElement('div');
    ctrl.className = 'hsh-controls';
    ctrl.innerHTML = `
      <label>key<input type="number" class="hsh-in" value="42" style="width:80px"></label>
      <button class="aw-btn" data-act="insert">Insert</button>
      <button class="aw-btn" data-act="attack">Attack &times;5</button>
      <button class="aw-btn" data-act="reset">Reset</button>
      <span class="hsh-mode">
        <button class="aw-btn hsh-toggle" data-act="mode">${mode} hash</button>
      </span>
    `;
    wrap.appendChild(ctrl);

    function render() {
      let html = '';
      for (let b = 0; b < m; b++) {
        const items = buckets[b];
        const isHot = (b === lastBucket);
        const overload = items.length >= 4;
        let cls = 'hsh-bucket';
        if (isHot) cls += ' hsh-hot';
        if (overload) cls += ' hsh-overload';
        html += `<div class="${cls}">
          <div class="hsh-bidx">b[${b}]</div>
          <div class="hsh-items">${items.map(k => `<span class="hsh-chip ${k===lastKey?'hsh-chip-hot':''}">${k}</span>`).join('')}</div>
          <div class="hsh-count">${items.length}</div>
        </div>`;
      }
      board.innerHTML = html;
    }

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    async function insert(k) {
      if (busy) return;
      busy = true;
      const b = hash(k);
      lastKey = k; lastBucket = b;
      const collide = buckets[b].length > 0;
      buckets[b].push(k);
      const fmt = mode === 'good' ? `mix(${k}) % ${m}` : `${k} % ${m}`;
      status.innerHTML = `hash(${k}) = ${fmt} = <b>${b}</b>` + (collide ? ` &mdash; <span class="tk-red">collision!</span> bucket size = ${buckets[b].length}` : ` &mdash; empty bucket.`);
      render();
      await sleep(400);
      busy = false;
    }

    async function attack() {
      if (busy) return;
      busy = true;
      // attacker picks 5 keys that all hash to bucket 3 (under bad hash: multiples of m + 3)
      const target = 3;
      const keys = [];
      if (mode === 'bad') {
        for (let i = 1; i <= 5; i++) keys.push(m * i + target);
      } else {
        // under good hash, attacker can't easily target — pick 5 random keys
        for (let i = 0; i < 5; i++) keys.push(Math.floor(Math.random() * 9999));
      }
      for (const k of keys) {
        const b = hash(k);
        lastKey = k; lastBucket = b;
        buckets[b].push(k);
        status.innerHTML = `attacker pushes <b>${k}</b> &rarr; bucket <b>${b}</b>` + (mode === 'bad' ? ` (target ${target})` : ` (random)`);
        render();
        await sleep(450);
      }
      const maxLen = Math.max(...buckets.map(b => b.length));
      const totalKeys = buckets.reduce((s, b) => s + b.length, 0);
      status.innerHTML = `inserted 5 keys. mode = <b>${mode}</b>. max bucket = <b>${maxLen}</b> / ${totalKeys} keys total. ` +
        (mode === 'bad' && maxLen >= 4 ? `<span class="tk-red">all collided &rarr; O(n) per op &rarr; TLE.</span>` : `spread evenly &rarr; O(1) avg.`);
      busy = false;
    }

    function reset() {
      if (busy) return;
      buckets = Array.from({ length: m }, () => []);
      lastKey = null; lastBucket = null;
      status.textContent = `reset. m = ${m} buckets. mode = ${mode} hash.`;
      render();
    }

    ctrl.addEventListener('click', (e) => {
      const a = e.target.dataset.act;
      if (!a) return;
      if (a === 'insert') {
        const k = parseInt(ctrl.querySelector('.hsh-in').value, 10);
        if (!isNaN(k)) insert(k);
      }
      if (a === 'attack') attack();
      if (a === 'reset') reset();
      if (a === 'mode') {
        if (busy) return;
        mode = mode === 'good' ? 'bad' : 'good';
        ctrl.querySelector('.hsh-toggle').textContent = `${mode} hash`;
        reset();
      }
    });

    status.textContent = `m = ${m} buckets. mode = ${mode} hash. insert keys or run Attack.`;
    render();
  }

  window.Widgets = window.Widgets || {};
  window.Widgets['hash-vis'] = mount;
})();
