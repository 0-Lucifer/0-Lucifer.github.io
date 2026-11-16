/* Ahammed Jumma · portfolio interactions
   Vanilla JS + GSAP (ScrollTrigger, SplitText) + Lenis. No build step. */
(() => {
  'use strict';

  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined' && typeof window.SplitText !== 'undefined';
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const storage = (kind) => { try { return window[kind]; } catch (e) { return null; } };
  const store = {
    get(key, kind = 'localStorage') { try { return storage(kind)?.getItem(key) ?? null; } catch (e) { return null; } },
    set(key, val, kind = 'localStorage') { try { storage(kind)?.setItem(key, val); } catch (e) { /* private mode */ } },
  };

  let lenis = null;
  const bus = new EventTarget();

  /* ------------------------------------------------------------------ */
  /* Small utilities                                                      */
  /* ------------------------------------------------------------------ */
  function cssVar(name) { return getComputedStyle(root).getPropertyValue(name).trim(); }

  function toast(msg) {
    const t = $('.toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('is-on');
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove('is-on'), 2200);
  }

  function onVisible(el, start, stop, threshold = 0) {
    if (!el) return;
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { threshold });
    io.observe(el);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else if (el.getBoundingClientRect().bottom > 0 && el.getBoundingClientRect().top < innerHeight) start();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Theme                                                                */
  /* ------------------------------------------------------------------ */
  function currentTheme() {
    return root.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  }
  function syncThemeColor() {
    const bg = currentTheme() === 'light' ? '#f4f1eb' : '#0b0b0c';
    $$('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', bg));
  }
  function initTheme() {
    const btn = $('.theme-toggle');
    if (root.getAttribute('data-theme')) syncThemeColor();
    matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => bus.dispatchEvent(new Event('theme')));
    btn?.addEventListener('click', (e) => {
      const next = currentTheme() === 'dark' ? 'light' : 'dark';
      const apply = () => {
        root.setAttribute('data-theme', next);
        store.set('theme', next);
        syncThemeColor();
        bus.dispatchEvent(new Event('theme'));
      };
      if (document.startViewTransition && !reduceMotion) {
        const r = btn.getBoundingClientRect();
        root.style.setProperty('--tx', `${r.left + r.width / 2}px`);
        root.style.setProperty('--ty', `${r.top + r.height / 2}px`);
        root.classList.add('theme-vt');
        const vt = document.startViewTransition(apply);
        vt.finished.finally(() => root.classList.remove('theme-vt'));
      } else apply();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Clock, year, copy                                                    */
  /* ------------------------------------------------------------------ */
  function initClock() {
    const fmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Dhaka' });
    const tick = () => $$('.js-clock').forEach((el) => { el.textContent = fmt.format(new Date()); });
    tick();
    setInterval(tick, 20000);
    $$('.js-year').forEach((el) => { el.textContent = new Date().getFullYear(); });
  }

  function initCopy() {
    $$('.js-copy').forEach((b) => b.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(b.dataset.copy); toast('Email copied'); }
      catch (e) { toast(b.dataset.copy); }
    }));
  }

  /* ------------------------------------------------------------------ */
  /* Navigation: anchors, mobile menu, hide on scroll                     */
  /* ------------------------------------------------------------------ */
  function scrollToTarget(target) {
    if (lenis) lenis.scrollTo(target, { duration: 1.5, offset: 0 });
    else if (target === 0) window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    else target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function initNav() {
    const nav = $('.nav');
    const menuBtn = $('.menu-btn');
    const menu = $('#mobileMenu');

    const setMenu = (open) => {
      menuBtn.setAttribute('aria-expanded', String(open));
      menu.hidden = !open;
      root.classList.toggle('menu-open', open);
      nav.classList.remove('is-hidden');
      if (open) {
        lenis?.stop();
        if (hasGSAP && !reduceMotion) gsap.fromTo($$('a', menu), { yPercent: 60, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: .8, ease: 'expo.out', stagger: .05 });
      } else lenis?.start();
    };
    menuBtn?.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
    $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); } });
    matchMedia('(min-width: 961px)').addEventListener('change', (e) => { if (e.matches && !menu.hidden) setMenu(false); });

    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      if (id === '#' ) return;
      const target = id === '#top' ? 0 : $(id);
      if (target === null) return;
      e.preventDefault();
      scrollToTarget(target);
    });

    let lastY = scrollY;
    let ticking = false;
    const update = () => {
      const y = scrollY;
      nav.classList.toggle('is-scrolled', y > 24);
      const goingDown = y > lastY + 2;
      const goingUp = y < lastY - 2;
      if (goingDown && y > innerHeight * .6 && !root.classList.contains('menu-open')) nav.classList.add('is-hidden');
      else if (goingUp || y < 120) nav.classList.remove('is-hidden');
      lastY = y;
      ticking = false;
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  /* ------------------------------------------------------------------ */
  /* Case study overlay                                                   */
  /* ------------------------------------------------------------------ */
  const caseState = { trigger: null, card: null };

  function insetFor(el) {
    const r = el.getBoundingClientRect();
    const t = Math.max(0, r.top), l = Math.max(0, r.left);
    const b = Math.max(0, innerHeight - r.bottom), rt = Math.max(0, innerWidth - r.right);
    return `inset(${t}px ${rt}px ${b}px ${l}px round 30px)`;
  }
  function inView(el) {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  }
  function setInert(on) { ['.nav', 'main', '.footer', '.mobile-menu'].forEach((s) => { const el = $(s); if (el) el.inert = on; }); }

  function openCase(id, trigger) {
    const tpl = document.getElementById(`case-${id}`);
    const overlay = $('#caseOverlay');
    if (!tpl || !overlay) return;
    const panel = $('.case__panel', overlay);
    const content = $('.case__content', overlay);
    caseState.trigger = trigger || null;
    caseState.card = trigger?.closest('.card') || $(`.card[data-case="${id}"]`);

    content.replaceChildren(tpl.content.cloneNode(true));
    overlay.hidden = false;
    panel.scrollTop = 0;
    root.classList.add('case-open');
    setInert(true);
    lenis?.stop();
    $('.cursor')?.classList.remove('is-view', 'is-link');
    history.replaceState(null, '', `#work/${id}`);

    if (hasGSAP && !reduceMotion) {
      const from = caseState.card && inView(caseState.card) ? insetFor(caseState.card) : 'inset(100% 0px 0px 0px round 0px)';
      gsap.fromTo(panel, { clipPath: from }, { clipPath: 'inset(0px 0px 0px 0px round 0px)', duration: 1, ease: 'expo.inOut' });
      gsap.from([...$$('.case__head > *', content), ...$$('.case__grid > *', content)], { y: 60, autoAlpha: 0, duration: 1.1, ease: 'expo.out', stagger: .07, delay: .45 });
    }
    $('.case__close', overlay).focus({ preventScroll: true });
  }

  function closeCase() {
    const overlay = $('#caseOverlay');
    if (!overlay || overlay.hidden) return;
    const panel = $('.case__panel', overlay);
    const done = () => {
      overlay.hidden = true;
      $('.case__content', overlay).replaceChildren();
      if (hasGSAP) gsap.set(panel, { clearProps: 'clipPath' });
      root.classList.remove('case-open');
      setInert(false);
      lenis?.start();
      caseState.trigger?.focus({ preventScroll: true });
    };
    history.replaceState(null, '', location.pathname + location.search);
    if (hasGSAP && !reduceMotion) {
      const to = caseState.card && inView(caseState.card) ? insetFor(caseState.card) : 'inset(100% 0px 0px 0px round 0px)';
      gsap.to(panel, { clipPath: to, duration: .85, ease: 'expo.inOut', onComplete: done });
    } else done();
  }

  function initCases() {
    const overlay = $('#caseOverlay');
    if (!overlay) return;
    $$('[data-open]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); openCase(b.dataset.open, b); }));
    $$('.card').forEach((card) => card.addEventListener('click', (e) => {
      if (e.target.closest('a, button')) return;
      openCase(card.dataset.case, $('.btn-case', card));
    }));
    $('.case__close', overlay).addEventListener('click', closeCase);
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); closeCase(); return; }
      if (e.key !== 'Tab') return;
      const f = $$('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])', overlay).filter((el) => el.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  function openCaseFromHash() {
    const m = location.hash.match(/^#work\/([a-z0-9-]+)$/);
    if (m && document.getElementById(`case-${m[1]}`)) openCase(m[1], $(`.btn-case[data-open="${m[1]}"]`));
  }

  /* ------------------------------------------------------------------ */
  /* Project index: accordion + filters                                   */
  /* ------------------------------------------------------------------ */
  function refreshLater(ms = 700) {
    if (!hasGSAP) return;
    clearTimeout(refreshLater._h);
    refreshLater._h = setTimeout(() => ScrollTrigger.refresh(), ms);
  }

  function initIndex() {
    $$('.row__head').forEach((btn) => btn.addEventListener('click', () => {
      const row = btn.closest('.row');
      const open = !row.classList.contains('is-open');
      row.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
      refreshLater();
    }));

    const filters = $$('.filter');
    filters.forEach((btn) => btn.addEventListener('click', () => {
      const f = btn.dataset.filter;
      filters.forEach((b) => { b.classList.toggle('is-active', b === btn); b.setAttribute('aria-pressed', String(b === btn)); });
      const rows = $$('.row');
      rows.forEach((r) => r.classList.toggle('is-hidden', f !== 'all' && !r.dataset.tags.split(' ').includes(f)));
      const shown = rows.filter((r) => !r.classList.contains('is-hidden'));
      if (hasGSAP && !reduceMotion) gsap.fromTo(shown, { y: 26, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .7, ease: 'expo.out', stagger: .05, overwrite: true });
      refreshLater(50);
    }));
  }

  /* ------------------------------------------------------------------ */
  /* Skill card spotlight                                                 */
  /* ------------------------------------------------------------------ */
  function initSpotlight() {
    if (!finePointer) return;
    $$('.skill').forEach((el) => el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    }));
  }

  /* ------------------------------------------------------------------ */
  /* Card micro-demos (run once a card becomes active)                    */
  /* ------------------------------------------------------------------ */
  const STREAM = 'Plants are tiny chefs. They take sunlight, water from the soil and the air we breathe out, and cook them into sugar for energy. The oxygen left over is what we breathe in.';

  function streamText(el) {
    if (!el || el.dataset.running) return;
    el.dataset.running = '1';
    if (reduceMotion) { el.textContent = STREAM; return; }
    const words = STREAM.split(' ');
    let i = 0;
    const step = () => {
      if (i >= words.length) { setTimeout(() => { el.textContent = ''; i = 0; step(); }, 4200); return; }
      el.textContent += (i ? ' ' : '') + words[i++];
      setTimeout(step, 60 + Math.random() * 110);
    };
    step();
  }

  function cyclePrice(card) {
    const chips = $$('.shop__weights span', card);
    const price = $('.js-price', card);
    if (!chips.length || card.dataset.running) return;
    card.dataset.running = '1';
    const prices = [450, 850, 1600];
    let i = 0;
    const show = () => {
      chips.forEach((c, k) => c.classList.toggle('is-on', k === i));
      if (hasGSAP && !reduceMotion) {
        const o = { v: parseFloat(price.textContent) || 0 };
        gsap.to(o, { v: prices[i], duration: .6, ease: 'power2.out', onUpdate: () => { price.textContent = Math.round(o.v); } });
      } else price.textContent = prices[i];
      i = (i + 1) % prices.length;
    };
    show();
    if (!reduceMotion) setInterval(show, 1900);
  }

  function activateCard(card) {
    if (!card || card.classList.contains('is-active')) return;
    card.classList.add('is-active');
    if (card.dataset.case === 'offline') streamText($('.js-stream', card));
    if (card.dataset.case === 'candle') cyclePrice(card);
  }

  /* ------------------------------------------------------------------ */
  /* Hero flow field (canvas)                                             */
  /* ------------------------------------------------------------------ */
  function heroField() {
    const canvas = $('.hero__canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, parts = [], raf = 0, running = false, t = Math.random() * 100;
    let colors = { fg: '#f2efe9', acc: '#d4ff3f' };
    const mouse = { x: -1e4, y: -1e4 };

    const readColors = () => { colors = { fg: cssVar('--fg') || colors.fg, acc: cssVar('--accent-text') || colors.acc }; };
    const spawn = (p = {}) => {
      p.x = Math.random() * w; p.y = Math.random() * h; p.px = p.x; p.py = p.y;
      p.life = 60 + Math.random() * 260; p.acc = Math.random() < .13; p.s = .55 + Math.random() * 1.15;
      return p;
    };
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(950, Math.max(220, (w * h) / 1500)));
      parts = Array.from({ length: n }, () => spawn());
    };
    const angle = (x, y) => (Math.sin(x * .0023 + t * .7) + Math.cos(y * .0031 - t * .5) + Math.sin((x - y) * .0012 + t * .3)) * 1.25;

    const step = () => {
      t += .0035;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,.075)';
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
      const fg = new Path2D(), acc = new Path2D();
      for (const p of parts) {
        p.px = p.x; p.py = p.y;
        const a = angle(p.x, p.y);
        let vx = Math.cos(a) * p.s * 1.4, vy = Math.sin(a) * p.s * 1.4;
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 25600) {
          const d = Math.sqrt(d2) || 1, f = 1 - d / 160;
          vx += (dx / d) * f * 2.6 + (-dy / d) * f * 2.4;
          vy += (dy / d) * f * 2.6 + (dx / d) * f * 2.4;
        }
        p.x += vx; p.y += vy; p.life -= 1;
        if (p.life < 0 || p.x < -10 || p.x > w + 10 || p.y < -10 || p.y > h + 10) { spawn(p); continue; }
        const path = p.acc ? acc : fg;
        path.moveTo(p.px, p.py); path.lineTo(p.x, p.y);
      }
      ctx.lineCap = 'round';
      ctx.lineWidth = 1.1; ctx.globalAlpha = .5; ctx.strokeStyle = colors.fg; ctx.stroke(fg);
      ctx.lineWidth = 1.4; ctx.globalAlpha = .95; ctx.strokeStyle = colors.acc; ctx.stroke(acc);
      ctx.globalAlpha = 1;
    };
    const loop = () => { step(); raf = requestAnimationFrame(loop); };
    const start = () => { if (!running && !reduceMotion) { running = true; raf = requestAnimationFrame(loop); } };
    const stop = () => { running = false; cancelAnimationFrame(raf); };

    readColors(); resize();
    bus.addEventListener('theme', () => { readColors(); ctx.clearRect(0, 0, w, h); if (reduceMotion) for (let i = 0; i < 160; i++) step(); });
    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { resize(); if (reduceMotion) for (let i = 0; i < 160; i++) step(); }, 150); });
    addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    }, { passive: true });
    document.addEventListener('pointerleave', () => { mouse.x = mouse.y = -1e4; });

    if (reduceMotion) { for (let i = 0; i < 160; i++) step(); return; }
    onVisible(canvas, start, stop);
  }

  /* ------------------------------------------------------------------ */
  /* TDFlow: flow matching visual (noise → anatomy)                       */
  /* ------------------------------------------------------------------ */
  function flowViz() {
    const canvas = $('.flow-viz');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const label = $('.js-flow-t');
    const N = 460;
    let w = 0, h = 0, pts = [], raf = 0, running = false, phase = 0, last = 0, color = '#d4ff3f', dim = '#8b877f';

    const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    const target = (i) => {
      if (i / N < .7) { // cortex outline with gyri, two hemispheres
        const th = Math.random() * Math.PI * 2;
        const r = .8 + .055 * Math.sin(th * 9) + .03 * Math.sin(th * 23 + 1);
        let x = Math.cos(th) * r * 1.16, y = Math.sin(th) * r * .9;
        if (Math.abs(x) < .14 && y < 0) y *= .78;
        return [x, y];
      }
      if (i / N < .8) { const y = Math.random() * 1.4 - .8; return [(Math.random() - .5) * .03, y]; } // midline
      const k = Math.floor(Math.random() * 4), s = Math.random() * 2 - 1; // sulci
      const y0 = [-.48, -.14, .2, .5][k];
      return [s * .82, y0 + .09 * Math.sin(s * 8 + k * 1.7)];
    };
    const build = () => {
      pts = Array.from({ length: N }, (_, i) => {
        const [x1, y1] = target(i);
        return { x0: gauss() * .4, y0: gauss() * .4, x1, y1, bend: (Math.random() - .5) * 1.1 };
      });
    };
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const ease = (x) => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const draw = (t) => {
      const e = ease(t);
      const sc = Math.min(w, h) * .4, cx = w / 2, cy = h / 2 + 6;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,.16)';
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
      const p = new Path2D();
      const arc = Math.sin(Math.PI * e) * .55;
      for (const q of pts) {
        const dx = q.x1 - q.x0, dy = q.y1 - q.y0;
        const x = q.x0 + dx * e - dy * q.bend * arc;
        const y = q.y0 + dy * e + dx * q.bend * arc;
        const X = cx + x * sc, Y = cy + y * sc;
        p.moveTo(X + 1.3, Y); p.arc(X, Y, 1.3, 0, Math.PI * 2);
      }
      ctx.fillStyle = t > .02 ? color : dim;
      ctx.fill(p);
      if (label) label.textContent = t.toFixed(2);
    };
    // timeline: flow 0→1 (3.4s), hold (1.6s), fade + resample (.6s)
    const loop = (now) => {
      const dt = Math.min(64, now - (last || now)); last = now;
      phase += dt / 1000;
      if (phase < 3.4) draw(phase / 3.4);
      else if (phase < 5) draw(1);
      else if (phase < 5.6) { ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(0, 0, w, h); ctx.globalCompositeOperation = 'source-over'; }
      else { phase = 0; build(); }
      raf = requestAnimationFrame(loop);
    };
    const readColors = () => { color = cssVar('--accent-text') || color; dim = cssVar('--muted') || dim; };
    const start = () => { if (!running) { running = true; last = 0; raf = requestAnimationFrame(loop); } };
    const stop = () => { running = false; cancelAnimationFrame(raf); };

    build(); resize(); readColors();
    bus.addEventListener('theme', () => { readColors(); if (reduceMotion) { ctx.clearRect(0, 0, w, h); for (let i = 0; i < 8; i++) draw(1); } });
    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { resize(); if (reduceMotion) for (let i = 0; i < 8; i++) draw(1); }, 150); });
    if (reduceMotion) { for (let i = 0; i < 8; i++) draw(1); return; }
    onVisible(canvas, start, stop, .1);
  }

  /* ------------------------------------------------------------------ */
  /* CitizenLink: interactive family graph                                */
  /* ------------------------------------------------------------------ */
  function familyGraph() {
    const svg = $('.family-graph');
    if (!svg) return;
    const NS = 'http://www.w3.org/2000/svg';
    const readout = $('.js-graph-readout');
    const N = {
      A: [62, 40], B: [132, 40], C: [288, 40], D: [358, 40],
      E: [50, 115], S1: [112, 115, 1], F: [172, 115], G: [250, 115], H: [330, 115], S2: [394, 115, 1],
      I: [80, 190], S4: [122, 190, 1], J: [180, 190], K: [242, 190], S3: [302, 190, 1], L: [362, 190],
      N: [151, 265], M: [272, 265],
    };
    const marriages = [['A', 'B'], ['C', 'D'], ['E', 'S1'], ['F', 'G'], ['H', 'S2'], ['J', 'S4'], ['K', 'S3']];
    const parents = { E: ['A', 'B'], F: ['A', 'B'], G: ['C', 'D'], H: ['C', 'D'], I: ['E', 'S1'], J: ['F', 'G'], K: ['F', 'G'], L: ['H', 'S2'], N: ['J', 'S4'], M: ['K', 'S3'] };
    const children = {};
    Object.entries(parents).forEach(([c, ps]) => ps.forEach((p) => { (children[p] ||= []).push(c); }));
    const el = (tag, attrs) => { const n = document.createElementNS(NS, tag); Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v)); return n; };

    const gEdges = el('g', {}), gNodes = el('g', {});
    svg.append(gEdges, gNodes);
    const edges = [];
    marriages.forEach(([a, b]) => {
      const [x1, y1] = N[a], [x2] = N[b];
      const line = el('path', { d: `M${x1} ${y1}H${x2}`, class: 'fg-edge fg-marriage' });
      gEdges.append(line);
      edges.push({ node: line, kind: 'm', a, b });
    });
    Object.entries(parents).forEach(([c, [p1, p2]]) => {
      const mx = (N[p1][0] + N[p2][0]) / 2, py = N[p1][1], [cx, cy] = N[c];
      const my = py + (cy - py) / 2;
      const path = el('path', { d: `M${mx} ${py}V${my - 8}Q${mx} ${my} ${mx + Math.sign(cx - mx) * Math.min(8, Math.abs(cx - mx))} ${my}H${cx - Math.sign(cx - mx) * Math.min(8, Math.abs(cx - mx))}Q${cx} ${my} ${cx} ${my + 8}V${cy}`, class: 'fg-edge' });
      gEdges.append(path);
      edges.push({ node: path, kind: 'c', c, p1, p2 });
    });
    const nodes = {};
    let seed = 7;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    Object.entries(N).forEach(([id, [x, y, spouse]]) => {
      const g = el('g', { class: `fg-node${spouse ? ' is-spouse' : ''}`, transform: `translate(${x} ${y})` });
      const c = el('circle', { r: spouse ? 5 : 7 });
      const t = el('text', { y: 21 });
      t.textContent = `…${String(Math.floor(1000 + rnd() * 8999))}`;
      g.append(c, t);
      gNodes.append(g);
      nodes[id] = g;
    });

    const lineage = (id) => {
      const up = new Set(), down = new Set();
      const goUp = (n) => (parents[n] || []).forEach((p) => { if (!up.has(p)) { up.add(p); goUp(p); } });
      const goDown = (n) => (children[n] || []).forEach((k) => { if (!down.has(k)) { down.add(k); goDown(k); } });
      goUp(id); goDown(id);
      return { up, down };
    };
    const focus = (id) => {
      const { up, down } = lineage(id);
      const lit = new Set([id, ...up, ...down]);
      svg.classList.add('has-focus');
      Object.entries(nodes).forEach(([k, g]) => { g.classList.toggle('is-lit', lit.has(k)); g.classList.toggle('is-focus', k === id); });
      edges.forEach((e) => {
        const on = e.kind === 'm' ? lit.has(e.a) && lit.has(e.b) : lit.has(e.c) && (lit.has(e.p1) || lit.has(e.p2));
        e.node.classList.toggle('is-lit', on);
      });
      if (readout) readout.textContent = `${up.size} ancestors · ${down.size} descendants`;
    };
    const clear = () => {
      svg.classList.remove('has-focus');
      $$('.is-lit, .is-focus', svg).forEach((n) => n.classList.remove('is-lit', 'is-focus'));
    };

    let hovering = false, auto = 0, idx = 0;
    const tour = ['J', 'K', 'F', 'I', 'M', 'G', 'N', 'L'];
    const cycle = () => { if (!hovering) focus(tour[idx++ % tour.length]); };
    const startTour = () => { if (!auto && !reduceMotion) { cycle(); auto = setInterval(cycle, 2600); } };
    const stopTour = () => { clearInterval(auto); auto = 0; };

    Object.entries(nodes).forEach(([id, g]) => {
      g.addEventListener('pointerenter', () => { hovering = true; focus(id); });
      g.addEventListener('pointerleave', () => { hovering = false; });
    });
    svg.addEventListener('pointerleave', () => { hovering = false; });

    if (hasGSAP && !reduceMotion) {
      const parentEdges = edges.filter((e) => e.kind === 'c').map((e) => e.node);
      const marriageEdges = edges.filter((e) => e.kind === 'm').map((e) => e.node);
      parentEdges.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });
      gsap.set(marriageEdges, { opacity: 0 });
      gsap.set($$('circle', svg), { scale: 0, transformOrigin: '50% 50%' });
      gsap.set($$('text', svg), { opacity: 0 });
      ScrollTrigger.create({
        trigger: svg, start: 'top 75%', once: true,
        onEnter: () => {
          const tl = gsap.timeline({ onComplete: () => { parentEdges.forEach((p) => { p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; }); startTour(); } });
          tl.to($$('circle', svg), { scale: 1, duration: .7, ease: 'back.out(2)', stagger: { each: .04, from: 'start' } })
            .to(marriageEdges, { opacity: 1, duration: .5, stagger: .05 }, .3)
            .to(parentEdges, { strokeDashoffset: 0, duration: 1, ease: 'power2.inOut', stagger: .06 }, .4)
            .to($$('text', svg), { opacity: 1, duration: .6, stagger: .02 }, .9);
        },
      });
      onVisible(svg, () => { if (svg.dataset.ready) startTour(); }, stopTour);
      ScrollTrigger.create({ trigger: svg, start: 'top 75%', once: true, onEnter: () => setTimeout(() => { svg.dataset.ready = '1'; }, 2200) });
    } else {
      focus('J');
    }
    void clear;
  }

  /* ------------------------------------------------------------------ */
  /* Custom cursor + magnetic elements                                    */
  /* ------------------------------------------------------------------ */
  function initPointer() {
    if (!finePointer || reduceMotion || !hasGSAP) return;
    const c = $('.cursor');
    const xTo = gsap.quickTo(c, 'x', { duration: .5, ease: 'power3' });
    const yTo = gsap.quickTo(c, 'y', { duration: .5, ease: 'power3' });
    addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      c.classList.add('is-on');
      xTo(e.clientX); yTo(e.clientY);
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => c.classList.remove('is-on'));
    document.addEventListener('pointerover', (e) => {
      const t = e.target;
      const overCard = !!t.closest('.card') && !root.classList.contains('case-open');
      c.classList.toggle('is-view', overCard);
      c.classList.toggle('is-link', !overCard && !!t.closest('a, button, .fg-node, label'));
    });
    addEventListener('pointerdown', () => c.classList.add('is-down'));
    addEventListener('pointerup', () => c.classList.remove('is-down'));

    $$('.magnetic').forEach((el) => {
      const mx = gsap.quickTo(el, 'x', { duration: .7, ease: 'elastic.out(1, .4)' });
      const my = gsap.quickTo(el, 'y', { duration: .7, ease: 'elastic.out(1, .4)' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        mx((e.clientX - (r.left + r.width / 2)) * .32);
        my((e.clientY - (r.top + r.height / 2)) * .32);
      });
      el.addEventListener('pointerleave', () => { mx(0); my(0); });
    });
  }

  /* ------------------------------------------------------------------ */
  /* GSAP scenes                                                          */
  /* ------------------------------------------------------------------ */
  function setupHero() {
    const splits = $$('[data-hero-chars]').map((el) => new SplitText(el, { type: 'chars', charsClass: 'char' }));
    const chars = splits.flatMap((s) => s.chars);
    if (reduceMotion) { root.classList.add('hero-ready'); return gsap.timeline({ paused: true }); }
    gsap.set(chars, { yPercent: 115, rotate: 5 });
    gsap.set(['.hero__eyebrow', '[data-hero-fade]'], { autoAlpha: 0, y: 26 });
    root.classList.add('hero-ready');
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
    tl.to(chars, { yPercent: 0, rotate: 0, duration: 1.5, stagger: .05 })
      .to('.hero__eyebrow', { autoAlpha: 1, y: 0, duration: 1.1 }, .25)
      .to('[data-hero-fade]', { autoAlpha: 1, y: 0, duration: 1.2, stagger: .1 }, .55)
      .from('.nav', { yPercent: -100, duration: 1.2, clearProps: 'transform' }, .35);
    // gentle parallax of the name as the hero leaves
    gsap.to('.hero__content', { yPercent: -18, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    return tl;
  }

  function runLoader(onDone) {
    const loader = $('.loader');
    if (!loader || root.classList.contains('skip-intro')) { loader?.remove(); onDone(); return; }
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    lenis?.stop();
    const digits = $('.loader__digits');
    const o = { v: 0 };
    gsap.timeline()
      .to(o, { v: 100, duration: 1.7, ease: 'power2.inOut', onUpdate: () => { digits.textContent = Math.round(o.v); } })
      .to('.loader__bar i', { scaleX: 1, duration: 1.7, ease: 'power2.inOut' }, 0)
      .to(loader, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.05, ease: 'expo.inOut' }, '+=.12')
      .add(() => { lenis?.start(); onDone(); }, '-=.6')
      .add(() => { loader.remove(); store.set('introSeen', '1', 'sessionStorage'); });
  }

  function marquee() {
    const track = $('.marquee__track');
    if (!track) return;
    if (reduceMotion) return;
    const tw = gsap.to(track, { xPercent: -50, duration: 42, ease: 'none', repeat: -1 });
    tw.totalTime(tw.duration() * 200);
    let settle;
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: (self) => {
        const v = self.getVelocity();
        const dir = self.direction;
        gsap.to(tw, { timeScale: dir * Math.min(7, 1 + Math.abs(v) / 350), duration: .2, overwrite: true });
        clearTimeout(settle);
        settle = setTimeout(() => gsap.to(tw, { timeScale: dir, duration: 1.2, overwrite: true }), 120);
      },
    });
  }

  function splitTitles() {
    $$('[data-split-lines]').forEach((el) => {
      new SplitText(el, {
        type: 'lines', mask: 'lines', autoSplit: true,
        onSplit: (self) => gsap.from(self.lines, {
          yPercent: 108, duration: 1.3, ease: 'expo.out', stagger: .1,
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        }),
      });
    });
  }

  function scrubWords() {
    const el = $('[data-scrub-words]');
    if (!el) return;
    const split = new SplitText(el, { type: 'words' });
    gsap.fromTo(split.words, { opacity: .13 }, {
      opacity: 1, ease: 'none', stagger: .1,
      scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 52%', scrub: true },
    });
  }

  function reveals() {
    const items = $$('[data-reveal]');
    gsap.set(items, { y: 56, autoAlpha: 0 });
    ScrollTrigger.batch(items, {
      start: 'top 90%', once: true,
      onEnter: (batch) => gsap.to(batch, { y: 0, autoAlpha: 1, duration: 1.2, ease: 'expo.out', stagger: .09, overwrite: true }),
    });
  }

  function portrait() {
    const frame = $('.portrait__frame');
    if (!frame) return;
    const img = $('img', frame);
    gsap.fromTo(frame, { clipPath: 'inset(100% 0% 0% 0% round 28px)' }, {
      clipPath: 'inset(0% 0% 0% 0% round 28px)', duration: 1.5, ease: 'expo.inOut',
      scrollTrigger: { trigger: frame, start: 'top 85%', once: true },
    });
    gsap.fromTo(img, { yPercent: -14, scale: 1.12 }, {
      yPercent: 0, scale: 1, ease: 'none',
      scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true },
    });
    gsap.from('.portrait__badge', { scale: 0, rotate: -90, duration: 1.2, ease: 'back.out(1.6)', scrollTrigger: { trigger: frame, start: 'top 70%', once: true } });
  }

  function counters() {
    $$('[data-count]').forEach((el) => {
      const target = parseFloat(el.dataset.count);
      const dec = parseInt(el.dataset.decimals || '0', 10);
      const o = { v: 0 };
      el.textContent = (0).toFixed(dec);
      ScrollTrigger.create({
        trigger: el, start: 'top 92%', once: true,
        onEnter: () => gsap.to(o, { v: target, duration: 2.2, ease: 'power3.out', onUpdate: () => { el.textContent = o.v.toFixed(dec); } }),
      });
    });
  }

  function workGallery() {
    const pin = $('.work__pin');
    const track = $('.work__track');
    const cards = $$('.card');
    const bar = $('.work__bar i');
    const count = $('.js-work-index');
    if (!pin || !track) return;
    const setIndex = (i) => { if (count) count.textContent = String(i + 1).padStart(2, '0'); };

    const mm = gsap.matchMedia();
    mm.add({ desktop: '(min-width: 960px)', mobile: '(max-width: 959px)' }, (ctx) => {
      if (ctx.conditions.desktop) {
        const dist = () => Math.max(0, track.scrollWidth - innerWidth);
        const tween = gsap.to(track, {
          x: () => -dist(), ease: 'none',
          scrollTrigger: {
            trigger: pin, start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: .8,
            invalidateOnRefresh: true, anticipatePin: 1,
            onUpdate: (self) => { if (bar) bar.style.transform = `scaleX(${self.progress})`; },
          },
        });
        cards.forEach((card, i) => {
          ScrollTrigger.create({
            trigger: card, containerAnimation: tween, start: 'left 70%', end: 'right 30%',
            onToggle: (self) => { if (self.isActive) { setIndex(i); activateCard(card); } },
          });
          gsap.fromTo($$('.card__viz > *', card), { xPercent: 7 }, {
            xPercent: -7, ease: 'none',
            scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true },
          });
        });
        activateCard(cards[0]);
      } else {
        cards.forEach((card) => {
          gsap.from(card, { y: 60, autoAlpha: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: card, start: 'top 90%', once: true } });
          ScrollTrigger.create({ trigger: card, start: 'top 70%', once: true, onEnter: () => activateCard(card) });
        });
      }
    });
  }

  function contactTitle() {
    const big = $('[data-contact-chars]');
    if (!big) return;
    const split = new SplitText(big, { type: 'chars', charsClass: 'char' });
    gsap.from(split.chars, {
      yPercent: 70, rotate: 8, autoAlpha: 0, duration: 1.3, ease: 'expo.out', stagger: .04,
      scrollTrigger: { trigger: big, start: 'top 88%', once: true },
    });
    if (finePointer) {
      big.addEventListener('pointerenter', () => {
        gsap.to(split.chars, { yPercent: -14, duration: .28, ease: 'power2.out', stagger: { each: .03, yoyo: true, repeat: 1 }, overwrite: 'auto' });
      });
    }
  }

  function navActive() {
    const links = Object.fromEntries($$('.nav__links a').map((a) => [a.getAttribute('href').slice(1), a]));
    const groups = [['about', '#about', '#about'], ['research', '#research', '#research'], ['work', '#work', '#more'], ['experience', '#experience', '#education'], ['contact', '#contact', '#contact']];
    const set = (id) => Object.entries(links).forEach(([k, a]) => a.classList.toggle('is-active', k === id));
    groups.forEach(([id, start, end]) => {
      ScrollTrigger.create({
        trigger: start, endTrigger: end, start: 'top 55%', end: 'bottom 55%',
        onToggle: (self) => { if (self.isActive) set(id); else if (links[id]?.classList.contains('is-active')) set(null); },
      });
    });
    gsap.to('.progress i', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .3 } });
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                                 */
  /* ------------------------------------------------------------------ */
  function initBasics() {
    initTheme();
    initClock();
    initCopy();
    initNav();
    initCases();
    initIndex();
    initSpotlight();
  }

  function boot() {
    if (!hasGSAP) {
      root.classList.replace('js', 'no-js');
      window.__siteReady = true;
      initBasics();
      $$('.card').forEach(activateCard);
      heroField(); flowViz(); familyGraph();
      openCaseFromHash();
      return;
    }

    gsap.registerPlugin(ScrollTrigger, SplitText);
    window.__siteReady = true;

    if (!reduceMotion && window.Lenis) {
      lenis = new Lenis({ lerp: .1, smoothWheel: true, wheelMultiplier: 1 });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    }

    initBasics();
    const fonts = Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), wait(2500)]);
    const heroTl = setupHero();
    heroField();
    marquee();
    initPointer();

    runLoader(() => {
      heroTl.play();
      openCaseFromHash();
    });

    fonts.then(() => {
      if (reduceMotion) {
        $$('.card').forEach(activateCard);
        flowViz(); familyGraph(); navActive();
        return;
      }
      splitTitles();
      scrubWords();
      reveals();
      portrait();
      counters();
      workGallery();
      flowViz();
      familyGraph();
      contactTitle();
      navActive();
      ScrollTrigger.refresh();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
