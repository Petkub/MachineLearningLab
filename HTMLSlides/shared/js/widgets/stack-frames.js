// stack-frames — animated call stack push/pop. Auto-play + speed.
// data-fn="fact" data-n="4" data-autoplay="1" data-speed="1"
(function () {
  let _id = 0;

  function mount(el) {
    if (el.dataset.mounted) return;
    el.dataset.mounted = '1';
    const uid = ++_id;
    const fn = el.dataset.fn || 'fact';
    const nInit = parseInt(el.dataset.n || '4', 10);
    const autoplay = el.dataset.autoplay === '1';
    let speed = parseFloat(el.dataset.speed || '1');

    const root = document.createElement('div');
    root.className = 'sf-root';
    el.appendChild(root);

    const main = document.createElement('div');
    main.className = 'sf-main';
    root.appendChild(main);

    const stack = document.createElement('div');
    stack.className = 'sf-stack';
    stack.id = 'sf-stack-' + uid;
    main.appendChild(stack);

    const log = document.createElement('div');
    log.className = 'sf-log';
    log.id = 'sf-log-' + uid;
    main.appendChild(log);

    const ctrl = document.createElement('div');
    ctrl.className = 'sf-controls';
    ctrl.innerHTML = `
      <label>n = <input type="number" id="sf-n-${uid}" value="${nInit}" min="0" max="6" class="sf-input"/></label>
      <button class="aw-btn" id="sf-go-${uid}">play</button>
      <button class="aw-btn" id="sf-reset-${uid}">reset</button>
      <span class="sf-speed">
        <span class="sf-lbl">speed</span>
        <button class="sf-sp" data-sp="0.5">.5×</button>
        <button class="sf-sp" data-sp="1">1×</button>
        <button class="sf-sp" data-sp="2">2×</button>
      </span>
      <span class="sf-status" id="sf-status-${uid}"></span>
    `;
    root.appendChild(ctrl);

    function setSpeedActive() {
      ctrl.querySelectorAll('.sf-sp').forEach(b => {
        b.classList.toggle('active', parseFloat(b.dataset.sp) === speed);
      });
    }
    setSpeedActive();
    ctrl.querySelectorAll('.sf-sp').forEach(b => {
      b.onclick = () => { speed = parseFloat(b.dataset.sp); setSpeedActive(); };
    });

    function genTrace(n) {
      const seq = [];
      function rec(k) {
        seq.push({ op: 'push', label: `${fn}(${k})`, k });
        if (k <= 0) {
          seq.push({ op: 'return', label: `${fn}(${k})`, val: 1 });
          seq.push({ op: 'pop', label: `${fn}(${k})` });
          return 1;
        }
        const sub = rec(k - 1);
        const v = k * sub;
        seq.push({ op: 'return', label: `${fn}(${k})`, val: v });
        seq.push({ op: 'pop', label: `${fn}(${k})` });
        return v;
      }
      rec(n);
      return seq;
    }

    let timer = null;

    function play() {
      reset();
      const n = Math.min(6, Math.max(0, parseInt(document.getElementById('sf-n-' + uid).value, 10) || 0));
      const seq = genTrace(n);
      const status = document.getElementById('sf-status-' + uid);
      let i = 0;
      const tick = () => {
        if (i >= seq.length) { clearInterval(timer); timer = null; status.textContent = 'done'; return; }
        const step = seq[i++];
        if (step.op === 'push') {
          const f = document.createElement('div');
          f.className = 'sf-frame entering';
          f.dataset.label = step.label;
          f.textContent = step.label;
          stack.prepend(f);
          requestAnimationFrame(() => f.classList.remove('entering'));
          status.textContent = 'push ' + step.label;
          logLine('→ push ' + step.label);
        } else if (step.op === 'return') {
          const top = stack.querySelector('.sf-frame');
          if (top) {
            top.classList.add('returning');
            top.innerHTML = `${step.label} <b>= ${step.val}</b>`;
          }
          status.textContent = step.label + ' returns ' + step.val;
          logLine('← ' + step.label + ' = ' + step.val);
        } else if (step.op === 'pop') {
          const top = stack.querySelector('.sf-frame');
          if (top) {
            top.classList.add('exiting');
            setTimeout(() => top.remove(), 200);
          }
        }
      };
      const interval = 480 / speed;
      tick();
      timer = setInterval(tick, interval);
    }

    function logLine(s) {
      const li = document.createElement('div');
      li.className = 'sf-log-line';
      li.textContent = s;
      log.appendChild(li);
      log.scrollTop = log.scrollHeight;
    }

    function reset() {
      if (timer) { clearInterval(timer); timer = null; }
      while (stack.firstChild) stack.removeChild(stack.firstChild);
      while (log.firstChild) log.removeChild(log.firstChild);
      document.getElementById('sf-status-' + uid).textContent = '';
    }

    document.getElementById('sf-go-' + uid).addEventListener('click', play);
    document.getElementById('sf-reset-' + uid).addEventListener('click', reset);

    if (autoplay) setTimeout(play, 400);
  }

  window.Widgets['stack-frames'] = mount;
})();
