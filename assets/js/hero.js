/* =========================================================
   Intro scene — hero entrance · orbit rings · device loop · iris → philosophy
   ========================================================= */
(() => {
  'use strict';
  const CA = window.CA;
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!CA) return;
  const { $, $$ } = CA;

  /* ---------- orbit rings (canvas) ----------
     A viewport-sized canvas instead of a 2300px SVG: five strokes, a few dots, no oversized layers,
     and it only draws while the hero is actually visible. */
  const createRings = (canvas, hero, dev) => {
    const ctx = canvas.getContext('2d');
    const TAU = Math.PI * 2;
    const rings = [
      { r: 430, w: 150, dash: false },
      { r: 620, w: -120, dash: true },
      { r: 830, w: 190, dash: false, arc: true },
      { r: 1060, w: -240, dash: true },
      { r: 1290, w: 300, dash: false },
    ];
    const ang = (x, y) => Math.atan2(y - 1000, x - 1000);
    const nodes = [
      { ring: 1, a: ang(794.8, 436.2), halo: 0 },
      { ring: 1, a: ang(1563.8, 1205.2) },
      { ring: 1, a: ang(540.4, 1385.7) },
      { ring: 2, a: ang(1514.2, 387.2), halo: 1.1 },
      { ring: 2, a: ang(227.3, 793) },
      { ring: 2, a: ang(1273.6, 1751.8) },
      { ring: 3, a: ang(1180, -19) },
      { ring: 3, a: ang(64, 1260) },
    ];

    const api = {
      intro: { s: 1, a: 1 }, // entrance (scale + alpha)
      scroll: { s: 1 },      // scroll-driven expansion
      shift: { x: 0, y: 0 }, // pointer parallax offset (driven by fx.js)
    };
    let W = 0, H = 0, dpr = 1, baseCx = 0, baseCy = 0, unit = 1;
    let running = false;
    let visible = true;
    let covered = false;

    const resize = () => {
      W = hero.clientWidth;
      H = hero.clientHeight;
      if (!W || !H) return;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      const o = CA.offsetWithin(dev, hero);
      baseCx = W / 2;
      baseCy = o.y + dev.offsetHeight / 2;
      unit = Math.min(2300, 2 * Math.max(W, H)) / 2000;
      draw(gsap.ticker.time);
    };

    function draw(time) {
      if (!W) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const alpha = api.intro.a;
      if (alpha < 0.01) return;

      const s = unit * api.intro.s * api.scroll.s;
      const cx = baseCx + api.shift.x;
      const cy = baseCy + api.shift.y + (gsap.getProperty(dev, 'y') || 0);
      const far = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy));
      const inside = cx >= 0 && cx <= W && cy >= 0 && cy <= H;
      const near = inside ? 0 : Math.hypot(Math.max(0, -cx, cx - W), Math.max(0, -cy, cy - H));

      ctx.globalAlpha = alpha;
      ctx.lineCap = 'round';
      const lw = Math.max(1, 1.5 * s);

      for (let i = 0; i < rings.length; i++) {
        const ring = rings[i];
        const r = ring.r * s;
        if (r > far + 8 || r < near - 8) { ring.skip = true; continue; }
        ring.skip = false;
        const rot = (time / ring.w) * TAU;
        ring.rot = rot;

        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, TAU);
        if (ring.dash) {
          ctx.setLineDash([2 * s, 13 * s]);
          ctx.lineDashOffset = -rot * r;
          ctx.strokeStyle = 'rgba(10,27,51,0.3)';
        } else {
          ctx.setLineDash([]);
          ctx.strokeStyle = 'rgba(10,27,51,0.13)';
        }
        ctx.lineWidth = lw;
        ctx.stroke();

        if (ring.arc) {
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.arc(cx, cy, r, rot, rot + 260 / 830);
          ctx.strokeStyle = '#2f6beb';
          ctx.lineWidth = Math.max(1.5, 4 * s);
          ctx.stroke();
        }
      }

      ctx.setLineDash([]);
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const ring = rings[n.ring];
        if (ring.skip) continue;
        const a = n.a + ring.rot;
        const x = cx + Math.cos(a) * ring.r * s;
        const y = cy + Math.sin(a) * ring.r * s;
        if (x < -40 || x > W + 40 || y < -40 || y > H + 40) continue;

        if (n.halo !== undefined) {
          const p = (((time + n.halo * 0.7) % 2.2) + 2.2) % 2.2 / 2.2;
          const pe = 1 - (1 - p) * (1 - p);
          ctx.beginPath();
          ctx.arc(x, y, (24 + 16 * pe) * s, 0, TAU);
          ctx.strokeStyle = `rgba(47,107,235,${(0.3 * (1 - pe)).toFixed(3)})`;
          ctx.lineWidth = Math.max(1, 2 * s);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(x, y, 9 * s, 0, TAU);
        ctx.fillStyle = '#f3f6fa';
        ctx.fill();
        ctx.strokeStyle = '#2f6beb';
        ctx.lineWidth = Math.max(1.5, 3.5 * s);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    const tick = (time) => draw(time);
    const sync = () => {
      const want = visible && !covered && !CA.reduced;
      if (want && !running) { running = true; gsap.ticker.add(tick); }
      else if (!want && running) { running = false; gsap.ticker.remove(tick); }
    };

    CA.visible(hero, (v) => { visible = v; hero.classList.toggle('is-live', v); sync(); }, { margin: '0px' });
    if ('ResizeObserver' in window) new ResizeObserver(() => resize()).observe(hero);
    ScrollTrigger.addEventListener('refresh', resize);
    resize();

    return Object.assign(api, {
      resize,
      redraw: () => draw(gsap.ticker.time),
      setCovered(v) { if (covered !== v) { covered = v; sync(); } },
      start: sync,
    });
  };

  CA.init.hero = (mm) => {
    const intro = $('.intro');
    const hero = $('.hero', intro);
    const phil = $('.philosophy', intro);
    const iris = $('[data-iris]', intro);
    const copy = $('[data-hero-copy]', intro);
    const dev = $('[data-dev]', intro);
    const devIn = $('[data-dev-in]', intro);
    const device = $('[data-device]', intro);
    const canvas = $('[data-rings]', intro);
    const chips = $$('[data-chip]', intro);
    const eyebrow = $('.hero__eyebrow', intro);
    const lead = $('.hero__lead', intro);
    const ctas = $$('.hero__cta > *', intro);
    const header = $('.header');
    const stage = $('.hero__stage', intro);

    const state = (CA.state = CA.state || {});
    const rings = createRings(canvas, hero, dev);
    state.rings = rings;

    /* ---------- split text ---------- */
    let titleWords = [];
    let philWords = [];
    if (!CA.reduced) {
      titleWords = $$('.hero__title .ln', intro).flatMap((ln) => CA.splitWords(ln));
      philWords = CA.splitWords($('.philosophy__text', phil), { mask: false });

      // initial hidden state for the entrance (the preloader is covering the page)
      gsap.set(titleWords, { yPercent: 118 });
      gsap.set([eyebrow, lead, ...ctas], { autoAlpha: 0, y: 26 });
      gsap.set(devIn, { y: 170, autoAlpha: 0, rotateX: 14, transformPerspective: 1600, transformOrigin: '50% 100%' });
      gsap.set(chips, { autoAlpha: 0, scale: 0.82 });
      gsap.set(header, { yPercent: -100 });
      rings.intro.s = 0.72;
      rings.intro.a = 0;
    }

    /* ---------- entrance (called when the preloader lifts) ---------- */
    CA.heroIntro = () => {
      if (CA.reduced) return gsap.timeline();
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
      tl.to(header, { yPercent: 0, duration: 1, ease: 'power3.out' }, 0.2)
        .to(eyebrow, { autoAlpha: 1, y: 0, duration: 1 }, 0.05)
        .to(titleWords, { yPercent: 0, duration: 1.35, stagger: 0.055 }, 0.1)
        .to([lead, ...ctas], { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.09 }, 0.62)
        .to(rings.intro, { s: 1, a: 1, duration: 2.4, ease: 'power3.out' }, 0.2)
        .to(devIn, { y: 0, autoAlpha: 1, rotateX: 0, duration: 1.9, ease: 'power4.out' }, 0.35)
        .to(chips, { autoAlpha: 1, scale: 1, duration: 1.1, stagger: 0.14, ease: 'back.out(1.7)' }, 1.15)
        .add(() => {
          // drop the temporary transforms again so nothing stays promoted for no reason
          gsap.set(titleWords, { clearProps: 'transform' });
          gsap.set([eyebrow, lead, ...ctas], { clearProps: 'transform,opacity,visibility' });
          gsap.set(devIn, { clearProps: 'transform,opacity,visibility' });
          state.introDone = true;
          applyLoop();
        }, 2.6);
      return tl;
    };

    /* ---------- device: live sale loop ---------- */
    const lines = $$('.pl', device);
    const totalEls = [$('[data-pos-total]', device), $('[data-pos-total-b]', device)];
    const subEl = $('[data-pos-sub]', device);
    const vatEl = $('[data-pos-vat]', device);
    const paid = $('[data-pos-paid]', device);
    const charge = $('[data-pos-charge]', device);
    const fmt2 = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const buildLoop = () => {
      const sums = [1340, 1712, 2202];
      const sale = { sub: 0 };
      let shown = '';
      const render = () => {
        const vat = sale.sub * 0.05;
        const total = fmt2(sale.sub + vat);
        if (total === shown) return; // only touch the DOM when something visibly changed
        shown = total;
        subEl.textContent = fmt2(sale.sub);
        vatEl.textContent = fmt2(vat);
        totalEls.forEach((el) => { el.textContent = total; });
      };
      const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 1.6 });
      tl.set(lines, { autoAlpha: 0, y: 14 }, 0)
        .set(paid, { autoAlpha: 0, yPercent: 40 }, 0)
        .set(sale, { sub: 0 }, 0)
        .call(render, null, 0);
      lines.forEach((line, i) => {
        const t = 0.5 + i * 1.0;
        const thumb = $('.pl__thumb', line);
        tl.to(line, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out' }, t)
          .fromTo(thumb, { scale: 0.55 }, { scale: 1, duration: 0.7, ease: 'back.out(2.4)' }, t)
          .to(sale, { sub: sums[i], duration: 0.7, ease: 'power2.out', onUpdate: render }, t);
      });
      tl.to(charge, { scale: 0.95, duration: 0.14, yoyo: true, repeat: 1, ease: 'power2.inOut' }, 3.9)
        .to(paid, { autoAlpha: 1, yPercent: 0, duration: 0.7, ease: 'back.out(1.6)' }, 4.1)
        .to(paid, { autoAlpha: 0, yPercent: 40, duration: 0.5, ease: 'power2.in' }, 7.0)
        .to(lines, { autoAlpha: 0, y: -8, duration: 0.45, stagger: 0.06, ease: 'power2.in' }, 7.2);
      tl.progress(0.0001).progress(0); // make sure the first frame already reflects time 0
      return tl;
    };

    /* play / freeze / pause control for the loop
       'play'   – hero at the top, the sale rings up on a loop
       'freeze' – scrolled: park on the finished sale so the device always looks complete
       'pause'  – hero offscreen */
    state.mode = 'play';
    state.frozen = false;
    function applyLoop() {
      const loop = state.loop;
      if (!loop || !state.introDone) return;
      if (state.mode === 'freeze') {
        if (!state.frozen) { state.frozen = true; loop.time(5.7, false).pause(); }
      } else if (state.mode === 'pause') {
        loop.pause();
      } else if (state.frozen) {
        state.frozen = false;
        loop.restart();
      } else {
        loop.play();
      }
    }
    state.setMode = (m) => { if (state.mode !== m) { state.mode = m; applyLoop(); } };

    /* ---------- ambient motion: pointer tilt + the sale loop ---------- */
    mm.add(CA.mq.motion, () => {
      state.loop = buildLoop();
      state.frozen = false;
      if (state.introDone) applyLoop();

      let onMove;
      if (CA.fine) {
        const rx = gsap.quickTo(device, 'rotationX', { duration: 1.1, ease: 'power3.out' });
        const ry = gsap.quickTo(device, 'rotationY', { duration: 1.1, ease: 'power3.out' });
        gsap.set(device, { transformPerspective: 1600 });
        onMove = (e) => {
          const nx = e.clientX / window.innerWidth - 0.5;
          const ny = e.clientY / window.innerHeight - 0.5;
          ry(nx * 5);
          rx(-ny * 4);
        };
        hero.addEventListener('pointermove', onMove, { passive: true });
      }
      rings.start();
      return () => {
        if (onMove) hero.removeEventListener('pointermove', onMove);
        if (state.loop) state.loop.pause();
      };
    });

    /* ---------- desktop: pinned hero → iris → philosophy ---------- */
    mm.add(CA.mq.desktop, () => {
      intro.classList.add('is-pinned');
      gsap.set(philWords, { opacity: 0.14 });
      gsap.set(phil, { autoAlpha: 0 });

      const H = () => window.innerHeight;
      const W = () => document.documentElement.clientWidth;
      const targetY = () => H() * 0.52; // where the device ends up
      const devCenter = () => {
        const o = CA.offsetWithin(dev, hero);
        return o.y + dev.offsetHeight / 2;
      };
      const rise = () => Math.max(0, devCenter() - targetY());
      const cy = () => devCenter() - rise();
      const cx = () => W() / 2;
      const radius = () => Math.hypot(Math.max(cx(), W() - cx()), Math.max(cy(), H() - cy())) + 60;

      // the header flips to its light-on-dark look once the iris has swallowed it
      const THEME_T = 4.35;
      CA.introThemeFn = () => (tl.time() > THEME_T ? 'dark' : 'light');

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: intro,
          start: 'top top',
          end: () => '+=' + Math.round(H() * 3.2),
          pin: true,
          scrub: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: () => {
            const t = tl.time();
            state.setMode(t > 0.25 ? 'freeze' : 'play');
            rings.setCovered(t > 4.8); // iris has covered everything: stop drawing
          },
        },
      });

      tl.to(copy, { yPercent: -16, autoAlpha: 0, duration: 2.0, ease: 'power2.in' }, 0)
        .to(dev, { y: () => -rise(), duration: 2.8, ease: 'power2.inOut' }, 0)
        .to(rings.scroll, { s: 1.55, duration: 6, ease: 'power1.in' }, 0)
        .to(chips[0], { y: -50, duration: 2.8 }, 0)
        .to(chips[1], { y: -34, duration: 2.8 }, 0)
        .to(chips[2], { y: -78, duration: 2.8 }, 0)
        .fromTo(
          iris,
          { clipPath: () => `circle(0px at ${cx()}px ${cy()}px)` },
          { clipPath: () => `circle(${radius()}px at ${cx()}px ${cy()}px)`, duration: 2.5, ease: 'power2.in' },
          2.2
        )
        .to(phil, { autoAlpha: 1, duration: 0.5, ease: 'power1.out' }, 4.5)
        .to(philWords, { opacity: 1, duration: 0.5, ease: 'power1.out', stagger: { amount: 4.2 } }, 4.9)
        .to({}, { duration: 0.7 }, '>');

      return () => {
        intro.classList.remove('is-pinned');
        CA.introThemeFn = null;
        rings.scroll.s = 1;
        rings.setCovered(false);
        state.setMode('play');
      };
    });

    /* ---------- mobile: no pin, words light up on scroll ---------- */
    mm.add(CA.mq.mobile, () => {
      gsap.set(philWords, { opacity: 0.14 });
      gsap.to(philWords, {
        opacity: 1, ease: 'none', stagger: { amount: 1 },
        scrollTrigger: { trigger: '.philosophy__text', start: 'top 82%', end: 'bottom 52%', scrub: true },
      });
      const stopVis = CA.visible(hero, (v) => state.setMode(v ? 'play' : 'pause'), { margin: '0px' });
      // light parallax on the device
      gsap.to(dev, { y: -40, ease: 'none', scrollTrigger: { trigger: stage, start: 'top bottom', end: 'bottom top', scrub: true } });
      return () => stopVis();
    });

    /* ---------- reduced motion: one static frame ---------- */
    mm.add('(prefers-reduced-motion: reduce)', () => {
      rings.redraw();
    });
  };
})();
