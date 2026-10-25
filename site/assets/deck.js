/* Slide deck runtime: fixed 1600×900 stage scaled to the viewport, step fragments,
   keyboard / click / swipe navigation, hash deep links and a shared animation loop. */
(() => {
  const W = 1600, H = 900;
  const stage = document.getElementById('stage');
  const slides = [...stage.querySelectorAll('.slide')];
  const count = document.getElementById('count');
  const bar = document.getElementById('bar');
  const persian = document.documentElement.lang === 'fa';
  if (persian) { document.getElementById('prev').textContent = '→'; document.getElementById('next').textContent = '←'; }

  const Deck = window.Deck = {
    W, H, scale: 1, dpr: Math.min(window.devicePixelRatio || 1, 2),
    slides, index: 0, step: 0,
    renderers: new Map(), resizeHooks: [], stepHooks: new Map(),
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    render(slide, fn) { if (!this.renderers.has(slide)) this.renderers.set(slide, []); this.renderers.get(slide).push(fn); },
    onStep(slide, fn) { if (!this.stepHooks.has(slide)) this.stepHooks.set(slide, []); this.stepHooks.get(slide).push(fn); },
    onResize(fn) { this.resizeHooks.push(fn); fn(); },
    /* Size a canvas for crisp drawing at the current scale; returns the pixel ratio to use. */
    fit(canvas, w, h) {
      const k = this.scale * this.dpr;
      canvas.width = Math.round(w * k); canvas.height = Math.round(h * k);
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      return k;
    },
  };

  /* Brand logos and line icons */
  const ICONS = {
    card: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 10h18M7 15h4"/>',
    lead: '<circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M19 8v6M16 11h6"/>',
    quiet: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    loyal: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.5 7l8.5 6 8.5-6"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  };
  Deck.logo = key => {
    const b = window.BRANDS[key];
    return b ? `<svg viewBox="0 0 24 24" role="img" aria-label="${b.title}"><path fill="${b.hex}" d="${b.path}"/></svg>` : '';
  };
  Deck.icon = key => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[key] || ''}</svg>`;
  const hydrate = root => {
    root.querySelectorAll('[data-logos]').forEach(el => {
      el.innerHTML = el.dataset.logos.split(/\s+/).map(k => `<i class="logo" data-logo="${k}" title="${window.BRANDS[k]?.title || k}"></i>`).join('');
    });
    root.querySelectorAll('i.logo[data-logo]').forEach(el => { if (!el.firstChild) el.innerHTML = Deck.logo(el.dataset.logo); });
    root.querySelectorAll('[data-ico]').forEach(el => { if (!el.firstChild) el.innerHTML = Deck.icon(el.dataset.ico); });
  };
  Deck.hydrate = hydrate;
  hydrate(document);

  const stepsOf = s => Math.max(+s.dataset.steps || 0, ...[...s.querySelectorAll('[data-f]')].map(e => +e.dataset.f));

  function applyStep(slide, step) {
    slide.dataset.step = step;
    slide.querySelectorAll('[data-f]').forEach(e => e.classList.toggle('on', step >= +e.dataset.f));
    slide.querySelectorAll('[data-only]').forEach(e => e.classList.toggle('on', step === +e.dataset.only));
    (Deck.stepHooks.get(slide) || []).forEach(fn => fn(step));
  }

  function go(i, step = 0, push = true) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    const changed = i !== Deck.index || !slides[i].classList.contains('active');
    if (changed) {
      slides.forEach((s, k) => s.classList.toggle('active', k === i));
    }
    Deck.index = i; Deck.step = Math.max(0, Math.min(stepsOf(slides[i]), step));
    applyStep(slides[i], Deck.step);
    const n = String(i + 1).padStart(2, '0'), total = String(slides.length).padStart(2, '0');
    count.textContent = `${n} / ${total}`;
    bar.style.width = `${((i + 1) / slides.length) * 100}%`;
    document.title = `${slides[i].dataset.title || (persian ? 'مِریت' : 'Merit')} · ${persian ? 'مِریت' : 'Merit'}`;
    if (push) history.replaceState(null, '', `#${i + 1}`);
  }

  const next = () => (Deck.step < stepsOf(slides[Deck.index])) ? go(Deck.index, Deck.step + 1) : go(Deck.index + 1, 0);
  const prev = () => (Deck.step > 0) ? go(Deck.index, Deck.step - 1) : go(Deck.index - 1, stepsOf(slides[Math.max(0, Deck.index - 1)]));
  Deck.next = next; Deck.prev = prev; Deck.go = go;

  const fullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.(); else document.exitFullscreen?.();
  };

  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if ([(persian ? 'ArrowLeft' : 'ArrowRight'), 'PageDown', ' ', 'Enter', 'ArrowDown'].includes(k)) { e.preventDefault(); next(); }
    else if ([(persian ? 'ArrowRight' : 'ArrowLeft'), 'PageUp', 'Backspace', 'ArrowUp'].includes(k)) { e.preventDefault(); prev(); }
    else if (k === 'Home') go(0); else if (k === 'End') go(slides.length - 1, 99);
    else if (k === 'f' || k === 'F') fullscreen();
  });
  document.getElementById('next').addEventListener('click', e => { e.stopPropagation(); next(); });
  document.getElementById('prev').addEventListener('click', e => { e.stopPropagation(); prev(); });
  document.getElementById('fs').addEventListener('click', e => { e.stopPropagation(); fullscreen(); });
  document.getElementById('deck').addEventListener('click', e => {
    if (e.target.closest('.hud, a')) return;
    (persian ? e.clientX > innerWidth * 0.7 : e.clientX < innerWidth * 0.3) ? prev() : next();
  });
  let tx = null, ty = null;
  addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
  addEventListener('touchend', e => {
    if (tx === null) return;
    const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { (persian ? dx > 0 : dx < 0) ? next() : prev(); }
    tx = null;
  }, { passive: true });

  function resize() {
    Deck.scale = Math.min(innerWidth / W, innerHeight / H);
    Deck.dpr = Math.min(window.devicePixelRatio || 1, 2);
    stage.style.transform = `translate(-50%, -50%) scale(${Deck.scale})`;
    Deck.resizeHooks.forEach(fn => fn());
  }
  addEventListener('resize', resize);
  resize();

  let last = performance.now();
  function loop(t) {
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    if (!document.hidden) (Deck.renderers.get(slides[Deck.index]) || []).forEach(fn => fn(t, dt));
    requestAnimationFrame(loop);
  }

  addEventListener('hashchange', () => { const i = parseInt(location.hash.slice(1), 10); if (i) go(i - 1, 0, false); });
  /* The deck may be mounted after load (the password gate decrypts it into the page), so start
     immediately when the document is already parsed. Later scripts register their hooks first. */
  const start = () => {
    const i = parseInt(location.hash.slice(1), 10);
    go(i ? i - 1 : 0, 0, false);
    requestAnimationFrame(loop);
  };
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', start);
  else setTimeout(start, 0);
})();
