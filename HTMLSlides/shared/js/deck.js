// ==========================================================================
// Deck Engine — slide nav, fragments, scaling, KaTeX, widget mount
// Extensible: future decks just include this + provide .slide elements.
// ==========================================================================

const Deck = (() => {
  const state = {
    slides: [],
    current: 0,
    fragmentIndex: 0,
    deckEl: null,
    title: 'Slide',
  };

  function init(opts = {}) {
    state.deckEl = document.querySelector('.deck');
    state.slides = Array.from(document.querySelectorAll('.slide'));
    state.title = opts.title || document.title;
    state.homeHref = opts.homeHref || '../../index.html';

    if (!state.slides.length) return;

    buildChrome();
    buildControls();
    buildHomeButton();
    buildSideNav();
    if (window.DrawTool) window.DrawTool.init(state);
    bindKeys();
    bindResize();
    fit();
    highlightCode();
    renderMath();
    mountWidgets();
    goTo(0, { instant: true });
    updateProgress();
  }

  // ----------------------------------------------------------- chrome / scale
  function buildChrome() {
    const frame = document.createElement('div');
    frame.className = 'frame';
    frame.innerHTML = `
      <div class="bracket tl"></div>
      <div class="bracket tr"></div>
      <div class="bracket bl"></div>
      <div class="bracket br"></div>
    `;
    state.deckEl.appendChild(frame);

    const bar = document.createElement('div');
    bar.className = 'footer-bar';
    state.deckEl.appendChild(bar);

    const label = document.createElement('div');
    label.className = 'page-label';
    label.id = 'page-label';
    label.textContent = state.title;
    state.deckEl.appendChild(label);
  }

  function fit() {
    const sw = 1280;
    const sh = 720;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = Math.min(vw / sw, vh / sh) * 0.95;
    state.deckEl.style.transform = `scale(${scale})`;
  }

  function bindResize() {
    window.addEventListener('resize', fit);
  }

  // ----------------------------------------------------------- navigation
  function bindKeys() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        prev();
      } else if (e.key === 'Home') {
        goTo(0);
      } else if (e.key === 'End') {
        goTo(state.slides.length - 1);
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'h' || e.key === 'H') {
        if (window.DrawTool && document.querySelector('.draw-overlay.active')) return;
        if (state.homeHref) window.location.href = state.homeHref;
      }
    });
  }

  function getCurrentSlideId() {
    return state.current;
  }
  function getDeckEl() { return state.deckEl; }

  function next() {
    const slide = state.slides[state.current];
    const frags = slide.querySelectorAll('.fragment:not(.visible)');
    if (frags.length) {
      frags[0].classList.add('visible');
      // dispatch event for widgets to react
      slide.dispatchEvent(new CustomEvent('fragment:reveal', {
        detail: { fragment: frags[0] }
      }));
      return;
    }
    if (state.current < state.slides.length - 1) goTo(state.current + 1);
  }

  function prev() {
    const slide = state.slides[state.current];
    const frags = Array.from(slide.querySelectorAll('.fragment.visible'));
    if (frags.length) {
      frags[frags.length - 1].classList.remove('visible');
      return;
    }
    if (state.current > 0) goTo(state.current - 1, { reverse: true });
  }

  function goTo(idx, { instant = false, reverse = false } = {}) {
    if (idx < 0 || idx >= state.slides.length) return;
    const prev = state.current;
    state.slides.forEach((s, i) => {
      s.classList.remove('enter-right', 'enter-left', 'exit-left', 'exit-right');
      const wasActive = s.classList.contains('active');
      const becomingActive = i === idx;
      s.classList.toggle('active', becomingActive);
      if (becomingActive) {
        if (reverse) {
          s.querySelectorAll('.fragment').forEach(f => f.classList.add('visible'));
        }
        if (!instant && prev !== idx) {
          s.classList.add(reverse ? 'enter-left' : 'enter-right');
        }
        s.dispatchEvent(new CustomEvent('slide:enter'));
      } else if (wasActive && !instant) {
        s.classList.add(reverse ? 'exit-right' : 'exit-left');
        s.dispatchEvent(new CustomEvent('slide:exit'));
      } else {
        s.dispatchEvent(new CustomEvent('slide:exit'));
      }
    });
    state.current = idx;
    updateCounter();
    updateProgress();
    updateSideNav();
  }

  // ----------------------------------------------------------- controls UI
  function buildControls() {
    const bar = document.createElement('div');
    bar.className = 'controls';
    bar.innerHTML = `
      <button id="ctrl-prev" title="Previous (←)">‹</button>
      <span class="counter"><span id="ctrl-cur">1</span> / <span id="ctrl-total">${state.slides.length}</span></span>
      <button id="ctrl-next" title="Next (→)">›</button>
      <button id="ctrl-full" title="Fullscreen (F)">⛶</button>
    `;
    document.body.appendChild(bar);

    const prog = document.createElement('div');
    prog.className = 'progress';
    prog.id = 'progress';
    document.body.appendChild(prog);

    document.getElementById('ctrl-prev').onclick = prev;
    document.getElementById('ctrl-next').onclick = next;
    document.getElementById('ctrl-full').onclick = toggleFullscreen;
  }

  function buildSideNav() {
    const nav = document.createElement('div');
    nav.className = 'side-nav';
    nav.id = 'side-nav';

    const toggle = document.createElement('button');
    toggle.className = 'side-nav-toggle';
    toggle.title = 'Collapse / expand';
    toggle.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>';
    toggle.addEventListener('click', () => {
      nav.classList.toggle('collapsed');
    });
    nav.appendChild(toggle);

    const list = document.createElement('div');
    list.className = 'side-nav-list';
    state.slides.forEach((slide, i) => {
      const item = document.createElement('button');
      item.className = 'side-nav-item';
      item.dataset.idx = i;
      const h = slide.querySelector('h1, h2, h3');
      const label = h ? h.textContent.trim().slice(0, 32) : `Slide ${i + 1}`;
      item.title = label;
      item.innerHTML = `<span class="sn-num">${String(i + 1).padStart(2, '0')}</span><span class="sn-lab">${label}</span>`;
      item.addEventListener('click', () => goTo(i));
      list.appendChild(item);
    });
    nav.appendChild(list);
    document.body.appendChild(nav);
    state.sideNav = nav;
    updateSideNav();
  }

  function updateSideNav() {
    const nav = state.sideNav;
    if (!nav) return;
    nav.querySelectorAll('.side-nav-item').forEach((it, i) => {
      it.classList.toggle('active', i === state.current);
    });
  }

  function buildHomeButton() {
    const a = document.createElement('a');
    a.className = 'home-btn';
    a.href = state.homeHref;
    a.title = 'Home (H)';
    a.setAttribute('aria-label', 'Back to home');
    a.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9h5v-6h4v6h5v-9"/></svg>';
    document.body.appendChild(a);
  }

  function updateCounter() {
    const cur = document.getElementById('ctrl-cur');
    if (cur) cur.textContent = state.current + 1;
  }

  function updateProgress() {
    const p = ((state.current + 1) / state.slides.length) * 100;
    const el = document.getElementById('progress');
    if (el) el.style.width = p + '%';
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  }

  // ----------------------------------------------------------- code highlighter (C++)
  // Lightweight tokenizer for `pre.code > code` blocks. Idempotent.
  function highlightCode() {
    const KW = new Set([
      'auto','bool','break','case','catch','char','class','const','constexpr','continue',
      'default','delete','do','double','else','enum','explicit','extern','false','float',
      'for','friend','goto','if','inline','int','long','mutable','namespace','new','noexcept',
      'nullptr','operator','private','protected','public','register','return','short','signed',
      'sizeof','static','static_cast','struct','switch','template','this','throw','true','try',
      'typedef','typename','union','unsigned','using','virtual','void','volatile','while',
      'string','vector','pair','map','set','unordered_map','unordered_set','multiset','multimap',
      'priority_queue','queue','stack','deque','array','tuple','make_pair','make_tuple',
      'size_t','ll','ld','endl','cin','cout','cerr','std','swap','sort','reverse','min','max',
      'lower_bound','upper_bound','find','count','begin','end','rbegin','rend','push','pop',
      'push_back','pop_back','emplace','emplace_back','insert','erase','clear','empty','size',
      'front','back','top','first','second','include'
    ]);
    const RET = new Set(['return','break','continue','throw']);
    const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    function tok(src) {
      let out = '', i = 0, n = src.length;
      while (i < n) {
        const c = src[i], c2 = src.substr(i, 2);
        // line comment
        if (c2 === '//') {
          let j = src.indexOf('\n', i); if (j < 0) j = n;
          out += `<span class="cmt">${esc(src.slice(i, j))}</span>`; i = j; continue;
        }
        // block comment
        if (c2 === '/*') {
          let j = src.indexOf('*/', i + 2); j = j < 0 ? n : j + 2;
          out += `<span class="cmt">${esc(src.slice(i, j))}</span>`; i = j; continue;
        }
        // preprocessor (line starts with #)
        if (c === '#' && (i === 0 || src[i-1] === '\n')) {
          let j = src.indexOf('\n', i); if (j < 0) j = n;
          out += `<span class="kw">${esc(src.slice(i, j))}</span>`; i = j; continue;
        }
        // string literal
        if (c === '"' || c === "'") {
          let j = i + 1;
          while (j < n && src[j] !== c) { if (src[j] === '\\') j++; j++; }
          j = Math.min(j + 1, n);
          out += `<span class="str">${esc(src.slice(i, j))}</span>`; i = j; continue;
        }
        // number
        if (/[0-9]/.test(c)) {
          let j = i;
          while (j < n && /[0-9a-fA-FxXeE._']/.test(src[j])) j++;
          out += `<span class="num">${esc(src.slice(i, j))}</span>`; i = j; continue;
        }
        // identifier
        if (/[A-Za-z_]/.test(c)) {
          let j = i;
          while (j < n && /[A-Za-z0-9_]/.test(src[j])) j++;
          const word = src.slice(i, j);
          // check if followed by ( → function call
          let k = j; while (k < n && src[k] === ' ') k++;
          const isCall = src[k] === '(';
          if (RET.has(word)) out += `<span class="ret">${esc(word)}</span>`;
          else if (KW.has(word)) out += `<span class="kw">${esc(word)}</span>`;
          else if (isCall) out += `<span class="fn">${esc(word)}</span>`;
          else out += esc(word);
          i = j; continue;
        }
        out += esc(c); i++;
      }
      return out;
    }

    document.querySelectorAll('pre.code > code').forEach(code => {
      if (code.dataset.hl) return;
      code.dataset.hl = '1';
      const raw = code.textContent;
      code.innerHTML = tok(raw);
    });
  }

  // ----------------------------------------------------------- math + widgets
  function renderMath() {
    if (window.renderMathInElement) {
      renderMathInElement(document.body, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$',  right: '$',  display: false },
          { left: '\\[', right: '\\]', display: true },
          { left: '\\(', right: '\\)', display: false },
        ],
        throwOnError: false,
      });
    }
  }

  function mountWidgets() {
    document.querySelectorAll('[data-widget]').forEach(el => {
      const name = el.dataset.widget;
      const fn = window.Widgets && window.Widgets[name];
      if (typeof fn === 'function') {
        try { fn(el); } catch (err) { console.error('widget error', name, err); }
      } else {
        console.warn('Unknown widget:', name);
      }
    });
  }

  return { init, next, prev, goTo, getCurrentSlideId, getDeckEl };
})();

window.addEventListener('DOMContentLoaded', () => Deck.init());
