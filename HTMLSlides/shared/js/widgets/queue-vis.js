// queue-vis — FIFO line. Push back → animate enter from right. Pop front →
// animate leave from left. front + back markers always visible.
// Buttons: push (input), pop_front, peek front, peek back, clear, demo.
//
// Attrs:
//   data-init : csv initial front→back
(function () {
  function csv(s) { return (s || '').split(',').map(x => +x.trim()).filter(Number.isFinite); }

  function mount(el) {
    if (el.dataset.mounted) return;
    el.dataset.mounted = '1';

    let items = csv(el.dataset.init || '');

    const wrap = document.createElement('div');
    wrap.className = 'qv-wrap';

    const labels = document.createElement('div');
    labels.className = 'qv-labels';
    wrap.appendChild(labels);

    const line = document.createElement('div');
    line.className = 'qv-line';
    wrap.appendChild(line);

    const status = document.createElement('div');
    status.className = 'qv-status';
    wrap.appendChild(status);

    const ctrl = document.createElement('div');
    ctrl.className = 'qv-ctrl';
    ctrl.innerHTML = `
      <input class="qv-in" type="text" value="7" size="3" maxlength="3"/>
      <button class="qv-push">push (back)</button>
      <button class="qv-pop">pop (front)</button>
      <button class="qv-pf">peek front</button>
      <button class="qv-pb">peek back</button>
      <button class="qv-clr">clear</button>
      <button class="qv-demo">demo</button>
    `;
    wrap.appendChild(ctrl);
    el.appendChild(wrap);

    function render(state, idx) {
      labels.innerHTML = '';
      if (items.length) {
        const lf = document.createElement('span');
        lf.className = 'qv-lab front';
        lf.textContent = '↓ front';
        labels.appendChild(lf);
        const lb = document.createElement('span');
        lb.className = 'qv-lab back';
        lb.textContent = 'back ↓';
        labels.appendChild(lb);
      }
      line.innerHTML = '';
      if (!items.length) {
        const e = document.createElement('div');
        e.className = 'qv-empty';
        e.textContent = '— empty —';
        line.appendChild(e);
        return;
      }
      for (let i = 0; i < items.length; i++) {
        const c = document.createElement('div');
        c.className = 'qv-cell';
        if (i === 0) c.classList.add('front');
        if (i === items.length - 1) c.classList.add('back');
        if (state === 'pushed' && i === items.length - 1) c.classList.add('entering');
        if (state === 'popping' && i === 0) c.classList.add('leaving');
        if (state === 'peek-front' && i === 0) c.classList.add('peeking');
        if (state === 'peek-back'  && i === items.length - 1) c.classList.add('peeking');
        c.textContent = items[i];
        line.appendChild(c);
      }
    }

    function setStatus(m) { status.textContent = m; }

    function pushBack(v) {
      items.push(v);
      render('pushed');
      setStatus(`push(${v}) at back. front=${items[0]} back=${v} size=${items.length}.`);
    }
    function popFront() {
      if (!items.length) { setStatus('empty — pop on empty queue = UB.'); return; }
      const v = items[0];
      render('popping');
      setStatus(`pop() → removes ${v} from front.`);
      setTimeout(() => {
        items.shift();
        render();
        setStatus(`popped ${v}. ` + (items.length ? `front=${items[0]} size=${items.length}.` : 'now empty.'));
      }, 350);
    }
    function peekFront() {
      if (!items.length) { setStatus('empty.'); return; }
      render('peek-front');
      setStatus(`front() = ${items[0]}.`);
    }
    function peekBack() {
      if (!items.length) { setStatus('empty.'); return; }
      render('peek-back');
      setStatus(`back() = ${items[items.length-1]}.`);
    }
    function clear() { items = []; render(); setStatus('cleared.'); }

    function demo() {
      items = []; render();
      setStatus('demo: push 7,2,5,9 then pop twice.');
      const seq = [
        () => pushBack(7),
        () => pushBack(2),
        () => pushBack(5),
        () => pushBack(9),
        () => popFront(),
        () => popFront(),
        () => setStatus('done. left with [5, 9]. FIFO: first in (7) came out first.'),
      ];
      let i = 0;
      const tick = () => {
        if (i >= seq.length) return;
        seq[i](); i++;
        setTimeout(tick, 850);
      };
      setTimeout(tick, 400);
    }

    ctrl.querySelector('.qv-push').onclick = () => {
      const v = +ctrl.querySelector('.qv-in').value;
      if (!Number.isFinite(v)) return;
      pushBack(v);
    };
    ctrl.querySelector('.qv-pop').onclick = popFront;
    ctrl.querySelector('.qv-pf').onclick = peekFront;
    ctrl.querySelector('.qv-pb').onclick = peekBack;
    ctrl.querySelector('.qv-clr').onclick = clear;
    ctrl.querySelector('.qv-demo').onclick = demo;

    render();
    setStatus('push at back, pop from front. or click demo.');
    if (el.dataset.autoplay === '1') setTimeout(demo, 400);
  }

  window.Widgets['queue-vis'] = mount;
})();
