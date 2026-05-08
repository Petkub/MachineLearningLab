// stack-vis — LIFO pile w/ animated push/pop/peek.
// Plates render bottom→top in DOM order so newest is at top visually.
// Buttons: push (input), pop, peek, clear, demo.
//
// Attrs:
//   data-init : csv initial bottom→top (default empty)
(function () {
  function csv(s) { return (s || '').split(',').map(x => +x.trim()).filter(Number.isFinite); }

  function mount(el) {
    if (el.dataset.mounted) return;
    el.dataset.mounted = '1';

    let items = csv(el.dataset.init || '');

    const wrap = document.createElement('div');
    wrap.className = 'sv-wrap';

    const stack = document.createElement('div');
    stack.className = 'sv-stack';
    wrap.appendChild(stack);

    const status = document.createElement('div');
    status.className = 'sv-status';
    wrap.appendChild(status);

    const ctrl = document.createElement('div');
    ctrl.className = 'sv-ctrl';
    ctrl.innerHTML = `
      <input class="sv-in" type="text" value="7" size="3" maxlength="3"/>
      <button class="sv-push">push</button>
      <button class="sv-pop">pop</button>
      <button class="sv-peek">peek</button>
      <button class="sv-clr">clear</button>
      <button class="sv-demo">demo</button>
    `;
    wrap.appendChild(ctrl);
    el.appendChild(wrap);

    function render(state) {
      // state: 'pushed' | 'popping' | 'peek' | null
      stack.innerHTML = '';
      const cap = document.createElement('div');
      cap.className = 'sv-cap';
      cap.textContent = items.length === 0 ? 'empty' : 'top ↓';
      stack.appendChild(cap);
      // top first in DOM (top of pile)
      for (let i = items.length - 1; i >= 0; i--) {
        const p = document.createElement('div');
        p.className = 'sv-plate';
        if (i === items.length - 1) {
          p.classList.add('top');
          if (state === 'pushed') p.classList.add('entering');
          if (state === 'popping') p.classList.add('leaving');
          if (state === 'peek') p.classList.add('peeking');
        }
        p.textContent = items[i];
        stack.appendChild(p);
      }
      const base = document.createElement('div');
      base.className = 'sv-base';
      base.textContent = '─── base ───';
      stack.appendChild(base);
    }

    function setStatus(msg) { status.textContent = msg; }

    function push(v) {
      items.push(v);
      render('pushed');
      setStatus(`push(${v}). top=${v}. size=${items.length}.`);
    }
    function pop() {
      if (!items.length) { setStatus('empty — pop on empty stack = UB.'); return; }
      const old = items[items.length - 1];
      render('popping');
      setStatus(`pop() → removes ${old}.`);
      setTimeout(() => {
        items.pop();
        render();
        setStatus(`popped ${old}. ` + (items.length ? `top=${items[items.length-1]}. size=${items.length}.` : 'now empty.'));
      }, 350);
    }
    function peek() {
      if (!items.length) { setStatus('empty — top() on empty stack = UB.'); return; }
      render('peek');
      setStatus(`top() = ${items[items.length-1]}. (no removal)`);
    }
    function clear() { items = []; render(); setStatus('cleared.'); }

    function demo() {
      items = []; render();
      setStatus('demo: push 7,2,5,9 then pop twice.');
      const seq = [
        () => push(7),
        () => push(2),
        () => push(5),
        () => push(9),
        () => pop(),
        () => pop(),
        () => setStatus('done. left with [7, 2]. LIFO: last in (9) came out first.'),
      ];
      let i = 0;
      const tick = () => {
        if (i >= seq.length) return;
        seq[i](); i++;
        setTimeout(tick, 850);
      };
      setTimeout(tick, 400);
    }

    ctrl.querySelector('.sv-push').onclick = () => {
      const v = +ctrl.querySelector('.sv-in').value;
      if (!Number.isFinite(v)) return;
      push(v);
    };
    ctrl.querySelector('.sv-pop').onclick = pop;
    ctrl.querySelector('.sv-peek').onclick = peek;
    ctrl.querySelector('.sv-clr').onclick = clear;
    ctrl.querySelector('.sv-demo').onclick = demo;

    render();
    setStatus('push values, or click demo.');
    if (el.dataset.autoplay === '1') setTimeout(demo, 400);
  }

  window.Widgets['stack-vis'] = mount;
})();
