// deque-vis — both-ends animator. push_front / push_back / pop_front /
// pop_back / random access dq[i].
// Buttons: input + 4 op buttons + dq[i] + clear + demo.
//
// Attrs:
//   data-init : csv front→back
(function () {
  function csv(s) { return (s || '').split(',').map(x => +x.trim()).filter(Number.isFinite); }

  function mount(el) {
    if (el.dataset.mounted) return;
    el.dataset.mounted = '1';

    let items = csv(el.dataset.init || '');

    const wrap = document.createElement('div');
    wrap.className = 'dv-wrap';

    const labels = document.createElement('div');
    labels.className = 'dv-labels';
    wrap.appendChild(labels);

    const line = document.createElement('div');
    line.className = 'dv-line';
    wrap.appendChild(line);

    const status = document.createElement('div');
    status.className = 'dv-status';
    wrap.appendChild(status);

    const ctrl = document.createElement('div');
    ctrl.className = 'dv-ctrl';
    ctrl.innerHTML = `
      <input class="dv-in" type="text" value="7" size="3" maxlength="3"/>
      <button class="dv-pf">push_front</button>
      <button class="dv-pb">push_back</button>
      <button class="dv-popf">pop_front</button>
      <button class="dv-popb">pop_back</button>
      <input class="dv-idx" type="text" value="0" size="2" maxlength="2"/>
      <button class="dv-at">dq[i]</button>
      <button class="dv-clr">clear</button>
      <button class="dv-demo">demo</button>
    `;
    wrap.appendChild(ctrl);
    el.appendChild(wrap);

    function render(state, hlIdx) {
      labels.innerHTML = '';
      if (items.length) {
        const lf = document.createElement('span');
        lf.className = 'dv-lab front'; lf.textContent = '↓ front';
        labels.appendChild(lf);
        const lb = document.createElement('span');
        lb.className = 'dv-lab back'; lb.textContent = 'back ↓';
        labels.appendChild(lb);
      }
      line.innerHTML = '';
      if (!items.length) {
        const e = document.createElement('div');
        e.className = 'dv-empty'; e.textContent = '— empty —';
        line.appendChild(e);
        return;
      }
      for (let i = 0; i < items.length; i++) {
        const c = document.createElement('div');
        c.className = 'dv-cell';
        if (i === 0) c.classList.add('front');
        if (i === items.length - 1) c.classList.add('back');
        if (state === 'pf' && i === 0) c.classList.add('entering-l');
        if (state === 'pb' && i === items.length - 1) c.classList.add('entering-r');
        if (state === 'popf' && i === 0) c.classList.add('leaving-l');
        if (state === 'popb' && i === items.length - 1) c.classList.add('leaving-r');
        if (state === 'at' && i === hlIdx) c.classList.add('peeking');
        c.textContent = items[i];
        const lab = document.createElement('small'); lab.textContent = i;
        c.appendChild(lab);
        line.appendChild(c);
      }
    }

    function setStatus(m) { status.textContent = m; }

    function pushFront(v) {
      items.unshift(v); render('pf');
      setStatus(`push_front(${v}). size=${items.length}.`);
    }
    function pushBack(v) {
      items.push(v); render('pb');
      setStatus(`push_back(${v}). size=${items.length}.`);
    }
    function popFront() {
      if (!items.length) { setStatus('empty — pop_front UB.'); return; }
      const v = items[0]; render('popf');
      setStatus(`pop_front() → ${v}.`);
      setTimeout(() => { items.shift(); render(); setStatus(`popped ${v} from front. size=${items.length}.`); }, 350);
    }
    function popBack() {
      if (!items.length) { setStatus('empty — pop_back UB.'); return; }
      const v = items[items.length - 1]; render('popb');
      setStatus(`pop_back() → ${v}.`);
      setTimeout(() => { items.pop(); render(); setStatus(`popped ${v} from back. size=${items.length}.`); }, 350);
    }
    function at(i) {
      if (i < 0 || i >= items.length) { setStatus(`dq[${i}] out of range. size=${items.length}.`); return; }
      render('at', i);
      setStatus(`dq[${i}] = ${items[i]}. (random access — only deque among the three)`);
    }
    function clear() { items = []; render(); setStatus('cleared.'); }

    function demo() {
      items = []; render();
      setStatus('demo: push_back 5,9 then push_front 2 then pop_back, pop_front.');
      const seq = [
        () => pushBack(5),
        () => pushBack(9),
        () => pushFront(2),
        () => pushFront(7),
        () => popBack(),
        () => popFront(),
        () => setStatus('done. push/pop both ends — that is the deque superpower.'),
      ];
      let i = 0;
      const tick = () => {
        if (i >= seq.length) return;
        seq[i](); i++;
        setTimeout(tick, 850);
      };
      setTimeout(tick, 400);
    }

    ctrl.querySelector('.dv-pf').onclick = () => { const v = +ctrl.querySelector('.dv-in').value; if (Number.isFinite(v)) pushFront(v); };
    ctrl.querySelector('.dv-pb').onclick = () => { const v = +ctrl.querySelector('.dv-in').value; if (Number.isFinite(v)) pushBack(v); };
    ctrl.querySelector('.dv-popf').onclick = popFront;
    ctrl.querySelector('.dv-popb').onclick = popBack;
    ctrl.querySelector('.dv-at').onclick = () => { const i = +ctrl.querySelector('.dv-idx').value; if (Number.isFinite(i)) at(i); };
    ctrl.querySelector('.dv-clr').onclick = clear;
    ctrl.querySelector('.dv-demo').onclick = demo;

    render();
    setStatus('push/pop both ends, dq[i] random access. or click demo.');
    if (el.dataset.autoplay === '1') setTimeout(demo, 400);
  }

  window.Widgets['deque-vis'] = mount;
})();
