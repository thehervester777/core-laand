/* =========================================================
   Core Agency — core runtime
   helpers · smooth scroll · header · menu · section HUD
   marquee · magnetic buttons · generic reveals
   ========================================================= */
(() => {
  'use strict';

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger) return;

  const CA = (window.CA = window.CA || {});
  CA.init = {};

  // The pinned, scroll-scrubbed "desktop" experience is for mouse / trackpad devices on wide screens.
  // Touch devices (phones, tablets — even in landscape) keep native scrolling with the lighter layout.
  const POINTER = '(hover: hover) and (pointer: fine)';
  CA.mq = {
    motion: '(prefers-reduced-motion: no-preference)',
    desktop: `(min-width: 1024px) and ${POINTER} and (prefers-reduced-motion: no-preference)`,
    mobile: `(prefers-reduced-motion: no-preference) and (not ((min-width: 1024px) and ${POINTER}))`,
  };
  CA.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  CA.fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- helpers ---------- */
  CA.$ = (sel, ctx = document) => ctx.querySelector(sel);
  CA.$$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const { $, $$ } = CA;

  /**
   * Run callbacks while an element is on (or near) the screen.
   * Everything that loops forever is gated through this, so nothing animates offscreen.
   * Returns a disposer.
   */
  CA.visible = (el, onChange, { margin = '120px 0px' } = {}) => {
    if (!el) return () => {};
    if (!('IntersectionObserver' in window)) { onChange(true); return () => {}; }
    const io = new IntersectionObserver(
      (entries) => onChange(entries[entries.length - 1].isIntersecting),
      { rootMargin: margin }
    );
    io.observe(el);
    return () => io.disconnect();
  };

  /** true once an element has been scrolled entirely above the viewport (used to snap instead of animate after a jump) */
  CA.isPast = (el) => el.getBoundingClientRect().bottom < -40;

  CA.pad2 = (n) => String(n).padStart(2, '0');
  CA.fmt = {
    int: new Intl.NumberFormat('en-US'),
    indian: new Intl.NumberFormat('en-IN'), // lakh / crore grouping used in Bangladesh
  };
  CA.taka = (n) => '৳' + CA.fmt.indian.format(Math.round(n));

  /** distance from the top of the document, ignoring transforms and sticky/fixed state */
  CA.docTop = (el) => {
    let y = 0;
    for (let n = el; n; n = n.offsetParent) y += n.offsetTop;
    return y;
  };
  /** offset of el inside an offsetParent ancestor, ignoring transforms */
  CA.offsetWithin = (el, ancestor) => {
    let x = 0, y = 0;
    for (let n = el; n && n !== ancestor; n = n.offsetParent) {
      x += n.offsetLeft;
      y += n.offsetTop;
    }
    return { x, y };
  };

  /**
   * Wrap every word of an element in a mask + inner span, preserving inline markup (em, span…).
   * Returns the inner spans — those are what get animated.
   */
  CA.splitWords = (root, { mask = true } = {}) => {
    const inner = [];
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'w' + (mask ? '' : ' w--plain');
            const wi = document.createElement('span');
            wi.className = 'wi';
            wi.textContent = part;
            w.appendChild(wi);
            frag.appendChild(w);
            inner.push(wi);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1) {
          walk(child);
        }
      });
    };
    walk(root);
    return inner;
  };

  /** scroll to a pixel offset or element (element positions are read from the layout, so pins can't skew them) */
  CA.scrollTo = (target, opts = {}) => {
    let y;
    if (typeof target === 'number') y = target;
    else if (target) y = CA.docTop(target.closest('.pin-spacer') || target);
    else return;
    if (CA.lenis) {
      CA.lenis.scrollTo(y, { duration: 1.9, easing: (t) => 1 - Math.pow(1 - t, 4), force: true, ...opts });
    } else {
      window.scrollTo({ top: y, behavior: CA.reduced ? 'auto' : 'smooth' });
    }
  };

  /* ---------- Lenis ---------- */
  // Smooth-scroll for mouse / trackpad users. Touch devices keep their native, GPU-driven
  // momentum scrolling — it is smoother and cheaper than anything JS can emulate there.
  CA.setupLenis = () => {
    if (CA.reduced || !window.Lenis || !CA.fine) {
      gsap.ticker.lagSmoothing(500, 33);
      return;
    }
    const lenis = new window.Lenis({
      lerp: 0.085,            // inertia: lower = silkier, higher = snappier
      wheelMultiplier: 1,
      smoothWheel: true,
      syncTouch: false,
      autoRaf: false,         // driven by the GSAP ticker so scroll + animation share one clock
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop(); // released once the preloader is done
    CA.lenis = lenis;
  };

  /* ---------- header + menu ---------- */
  CA.setTheme = (theme) => {
    if (CA.themeLocked || CA.theme === theme) return;
    CA.theme = theme;
    $('.header').dataset.theme = theme;
    const hud = $('.hud');
    if (hud) hud.dataset.theme = theme;
  };

  CA.setupMenu = () => {
    const header = $('.header');
    const menu = $('#menu');
    const burger = $('.burger');
    const links = $$('.menu__nav a', menu);
    const foot = $('.menu__foot', menu);
    let open = false;

    const toggle = (value) => {
      if (value === open) return;
      open = value;
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      menu.setAttribute('aria-hidden', String(!open));
      CA.menuOpen = open;

      if (open) {
        CA.themeLocked = false;
        CA.prevTheme = header.dataset.theme;
        header.dataset.theme = 'dark';
        CA.themeLocked = true;
        menu.classList.add('is-open');
        if (CA.lenis) CA.lenis.stop();
        else document.documentElement.style.overflow = 'hidden';
        gsap.fromTo(menu, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.9, ease: 'expo.out' });
        gsap.fromTo(links, { yPercent: 40, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.9, stagger: 0.06, delay: 0.12, ease: 'expo.out' });
        gsap.fromTo(foot, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.8, delay: 0.4, ease: 'expo.out' });
        gsap.to(header, { yPercent: 0, duration: 0.4, overwrite: 'auto' });
      } else {
        CA.themeLocked = false;
        header.dataset.theme = CA.prevTheme || 'light';
        CA.theme = header.dataset.theme;
        if (CA.lenis) CA.lenis.start();
        else document.documentElement.style.overflow = '';
        gsap.to(menu, {
          clipPath: 'inset(0 0 100% 0)', duration: 0.7, ease: 'expo.inOut',
          onComplete: () => menu.classList.remove('is-open'),
        });
      }
    };

    burger.addEventListener('click', () => toggle(!open));
    links.forEach((a) => a.addEventListener('click', () => toggle(false)));
    $$('.btn', menu).forEach((a) => a.addEventListener('click', () => toggle(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggle(false); });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => { if (e.matches) toggle(false); });
  };

  CA.setupAnchors = () => {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      if (id.length < 2) { e.preventDefault(); return; }
      if (id === '#top') { e.preventDefault(); CA.scrollTo(0); return; }
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      CA.scrollTo(el);
      if (history.replaceState) history.replaceState(null, '', id);
    });
    const totop = $('[data-totop]');
    if (totop) totop.addEventListener('click', () => CA.scrollTo(0, { duration: 2.4 }));
  };

  /* ---------- text-roll + magnetic buttons ---------- */
  CA.setupRoll = () => {
    $$('[data-roll]').forEach((el) => {
      const textNode = Array.from(el.childNodes).find((n) => n.nodeType === 3 && n.textContent.trim());
      if (!textNode) return;
      const text = textNode.textContent.trim();
      const roll = document.createElement('span');
      roll.className = 'roll';
      const inner = document.createElement('span');
      inner.className = 'roll__in';
      const a = document.createElement('span');
      a.textContent = text;
      const b = document.createElement('span');
      b.textContent = text;
      b.setAttribute('aria-hidden', 'true');
      inner.append(a, b);
      roll.appendChild(inner);
      textNode.replaceWith(roll);
    });
  };

  CA.setupMagnetic = () => {
    if (CA.reduced || !CA.fine) return;
    $$('[data-magnetic]').forEach((el) => {
      const xTo = gsap.quickTo(el, 'x', { duration: 0.7, ease: 'power3.out' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.7, ease: 'power3.out' });
      let cx = 0, cy = 0;
      el.addEventListener('pointerenter', () => {
        const r = el.getBoundingClientRect();
        cx = r.left + r.width / 2 - (gsap.getProperty(el, 'x') || 0);
        cy = r.top + r.height / 2 - (gsap.getProperty(el, 'y') || 0);
      });
      el.addEventListener('pointermove', (e) => {
        xTo((e.clientX - cx) * 0.26);
        yTo((e.clientY - cy) * 0.38);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  };

  /* ---------- marquee (velocity-reactive) ---------- */
  CA.setupMarquee = () => {
    if (CA.reduced) return;
    $$('[data-marquee]').forEach((row) => {
      const track = $('.marquee__track', row);
      const rowDir = parseFloat(row.dataset.marquee) || -1;
      const original = Array.from(track.children);
      let unit = 0;
      let pos = 0;
      let dirSmooth = 1;
      let skew = 0;
      let running = false;
      const setX = gsap.quickSetter(track, 'x', 'px');
      const setSkew = gsap.quickSetter(track, 'skewX', 'deg');

      const build = () => {
        Array.from(track.children).slice(original.length).forEach((n) => n.remove());
        unit = track.scrollWidth;
        if (!unit) return;
        const copies = Math.max(1, Math.ceil((window.innerWidth * 2) / unit));
        for (let i = 0; i < copies; i++) {
          original.forEach((n) => {
            const c = n.cloneNode(true);
            c.setAttribute('aria-hidden', 'true');
            track.appendChild(c);
          });
        }
      };
      build();
      let resizeT;
      window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(build, 200); });
      if (document.fonts) document.fonts.ready.then(build);

      const tick = (time, delta) => {
        if (!unit) return;
        const v = CA.lenis ? CA.lenis.velocity : 0;
        const target = v < -0.05 ? -1 : 1;
        dirSmooth += (target - dirSmooth) * 0.06;
        pos -= rowDir * dirSmooth * (38 * (delta / 1000) + Math.abs(v) * 0.55); // 38px/s base drift + scroll boost
        pos = ((pos % unit) + unit) % unit;
        setX(-pos);
        skew += (-v * 0.35 - skew) * 0.12;
        setSkew(gsap.utils.clamp(-6, 6, skew));
      };

      // only drift while the row is actually on screen
      CA.visible(row, (vis) => {
        if (vis && !running) { running = true; gsap.ticker.add(tick); }
        else if (!vis && running) { running = false; gsap.ticker.remove(tick); }
      }, { margin: '200px 0px' });
    });
  };

  /* ---------- count-up ---------- */
  CA.countUp = (el, { duration = 2.4 } = {}) => {
    const end = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.decimals || '0', 10);
    const pre = el.dataset.prefix || '';
    const suf = el.dataset.suffix || '';
    const fmt = (v) => (dec ? v.toFixed(dec) : CA.fmt.int.format(Math.round(v)));
    const render = (v) => {
      const next = pre + fmt(v) + suf;
      if (next !== el._txt) { el._txt = next; el.textContent = next; } // touch the DOM only when the number changes
    };
    if (CA.isPast(el)) { render(end); return null; } // jumped past it — no need to animate
    const obj = { v: 0 };
    render(0);
    return gsap.to(obj, { v: end, duration, ease: 'power3.out', onUpdate: () => render(obj.v) });
  };

  /* ---------- generic reveals ---------- */
  CA.setupReveals = () => {
    if (CA.reduced) return;

    $$('[data-split]').forEach((el) => {
      const words = CA.splitWords(el);
      gsap.set(words, { yPercent: 118 });
      ScrollTrigger.create({
        trigger: el, start: 'top 88%', once: true,
        onEnter: () => {
          if (CA.isPast(el)) { gsap.set(words, { clearProps: 'transform' }); return; }
          gsap.to(words, {
            yPercent: 0, duration: 1.15, ease: 'expo.out', stagger: 0.045,
            onComplete: () => gsap.set(words, { clearProps: 'transform' }), // drop the compositor layers again
          });
        },
      });
    });

    const items = $$('[data-reveal]');
    gsap.set(items, { autoAlpha: 0, y: 40 });
    ScrollTrigger.batch(items, {
      start: 'top 92%', once: true,
      onEnter: (batch) => {
        const past = batch.filter((n) => CA.isPast(n));
        const live = batch.filter((n) => !past.includes(n));
        if (past.length) gsap.set(past, { clearProps: 'transform,opacity,visibility' });
        if (live.length) {
          gsap.to(live, {
            autoAlpha: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.09, overwrite: true,
            onComplete: () => gsap.set(live, { clearProps: 'transform,opacity,visibility' }),
          });
        }
      },
    });
  };

  /* ---------- page-level triggers: header · theme · HUD ---------- */
  CA.setupGlobal = () => {
    const header = $('.header');
    let hidden = false;

    const showHeader = (visible) => {
      if (visible === !hidden) return;
      hidden = !visible;
      gsap.to(header, { yPercent: visible ? 0 : -110, duration: 0.7, ease: 'power3.out', overwrite: 'auto' });
    };

    // HUD ------------------------------------------------------
    const hud = $('.hud');
    const hudNum = hud ? $('.hud__num', hud) : null;
    const hudLabel = hud ? $('.hud__label', hud) : null;
    const hudLine = hud ? $('.hud__line i', hud) : null;
    const hudSections = $$('[data-hud]');
    let hudMap = [];
    let hudIndex = -1;

    const rebuildHud = () => {
      hudMap = hudSections.map((el, i) => {
        const target = el.closest('.pin-spacer') || el;
        return { i, label: el.dataset.hud, top: CA.docTop(target), height: target.offsetHeight };
      });
    };
    const setHud = (i, label) => {
      if (!hud || i === hudIndex) return;
      const first = hudIndex === -1;
      hudIndex = i;
      // masked text roll; safe to interrupt (rapid scrolling never leaves stray nodes behind)
      const swap = (box, text) => {
        const cur = box._cur || box.firstElementChild;
        Array.from(box.children).forEach((n) => { if (n !== cur) { gsap.killTweensOf(n); n.remove(); } });
        if (first) { cur.textContent = text; box._cur = cur; return; }
        const next = document.createElement('b');
        next.textContent = text;
        next.style.cssText = 'position:absolute;left:0;top:0';
        box.appendChild(next);
        box._cur = next;
        gsap.killTweensOf(cur);
        gsap.fromTo(next, { yPercent: 110 }, { yPercent: 0, duration: 0.7, ease: 'expo.out' });
        gsap.to(cur, {
          yPercent: -110, duration: 0.7, ease: 'expo.out',
          onComplete: () => { cur.remove(); next.style.cssText = ''; },
        });
      };
      swap(hudNum, CA.pad2(i + 1));
      swap(hudLabel, label);
    };
    // header theme: which surface is under the header? -------
    // Measured from layout (not from trigger positions) so pinned sections can never skew it.
    const chapters = $$('.chapter[data-theme]');
    const introEl = $('.intro');
    let regions = [];
    let endOfMain = Infinity;

    const rebuildThemes = () => {
      regions = [];
      if (introEl) {
        if (introEl.classList.contains('is-pinned')) {
          const scope = introEl.closest('.pin-spacer') || introEl;
          const top = CA.docTop(scope);
          regions.push({ top, bottom: top + scope.offsetHeight, dynamic: true });
        } else {
          const p = $('.philosophy', introEl);
          const top = CA.docTop(p);
          regions.push({ top, bottom: top + p.offsetHeight, theme: 'dark' });
        }
      }
      chapters.forEach((el) => {
        const top = CA.docTop(el);
        regions.push({ top, bottom: top + el.offsetHeight, theme: el.dataset.theme });
      });
      const last = $('.chapter--last');
      endOfMain = last ? CA.docTop(last) + last.offsetHeight : Infinity;
    };
    const applyTheme = (y) => {
      const probe = y + 36; // centre of the header bar
      let theme = 'light';
      for (const r of regions) {
        if (probe >= r.top && probe < r.bottom) theme = r.dynamic ? (CA.introThemeFn ? CA.introThemeFn() : 'light') : r.theme;
      }
      if (probe >= endOfMain) theme = 'light'; // footer is paper
      CA.setTheme(theme);
    };

    // one scroll handler drives header state, theme and HUD --
    // (a plain scroll listener, so jumps to exact boundaries such as the very top are never missed)
    let lastY = window.scrollY;
    let dir = 1;
    let maxScroll = 1;
    let lastLine = -1;
    const onScroll = () => {
      const y = window.scrollY;
      if (y !== lastY) { dir = y > lastY ? 1 : -1; lastY = y; }
      header.classList.toggle('is-solid', y > 24);
      if (!CA.menuOpen) {
        if (y < 160 || dir === -1) showHeader(true);
        else if (y > 480) showHeader(false);
      }
      applyTheme(y);
      if (hud && hudMap.length) {
        const probe = y + window.innerHeight * 0.5;
        let hit = hudMap[0];
        for (const s of hudMap) if (s.top <= probe) hit = s;
        setHud(hit.i, hit.label);
        if (hudLine) {
          const p = Math.min(1, y / maxScroll);
          if (Math.abs(p - lastLine) > 0.003) { lastLine = p; hudLine.style.transform = 'scaleX(' + p.toFixed(3) + ')'; }
        }
      }
    };

    ScrollTrigger.addEventListener('refresh', () => {
      rebuildHud();
      rebuildThemes();
      maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      onScroll();
    });
    rebuildHud();
    rebuildThemes();
    maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    window.addEventListener('scroll', onScroll, { passive: true });
    CA.setTheme('light');
    onScroll();
  };
})();
