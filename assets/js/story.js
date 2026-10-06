/* =========================================================
   Story chapter — numbers · engine (pinned, three live scenes)
   ========================================================= */
(() => {
  'use strict';
  const CA = window.CA;
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!CA) return;
  const { $, $$ } = CA;

  /* decorative QR pattern (not a real code) */
  const buildQR = (svg) => {
    if (!svg) return;
    const N = 29;
    let seed = 11;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const inFinder = (x, y) => (x < 8 && y < 8) || (x > N - 9 && y < 8) || (x < 8 && y > N - 9);
    const cells = [];
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        if (inFinder(x, y)) continue;
        if (rnd() > 0.52) cells.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
      }
    }
    const finder = (x, y) =>
      `<path fill-rule="evenodd" d="M${x} ${y}h7v7h-7zM${x + 1} ${y + 1}v5h5v-5z"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3"/>`;
    svg.innerHTML = `<g fill="currentColor">${cells.join('')}${finder(0, 0)}${finder(N - 7, 0)}${finder(0, N - 7)}</g>`;
  };

  CA.init.story = (mm) => {
    /* ---------- numbers ---------- */
    mm.add(CA.mq.motion, () => {
      const restore = [];
      $$('.stat__num[data-count]').forEach((el) => {
        const finalText = el.textContent;
        restore.push(() => { el.textContent = finalText; });
        el.textContent = (el.dataset.prefix || '') + (el.dataset.decimals ? (0).toFixed(+el.dataset.decimals) : '0') + (el.dataset.suffix || '');
        ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: () => CA.countUp(el) });
      });
      return () => restore.forEach((fn) => fn());
    });

    /* ---------- engine ---------- */
    const engine = $('[data-engine]');
    if (!engine) return;
    const stage = $('[data-stage]', engine);
    const panels = $$('.panel', stage);
    const steps = $$('.step', engine);
    const dots = $$('[data-stage-dots] button', engine);
    const bar = $('[data-engine-bar]', engine);
    const netOn = $('.net--on', stage);
    const netOff = $('.net--off', stage);
    buildQR($('[data-qr]', stage));

    /* scene factory — every scene is a restart-safe, time-based timeline.
       Ambient loops are CSS keyframes switched on by an `.is-live` class (see story.css), so the
       stage costs nothing while it is off screen and no JS runs per frame for them. */
    let stageVisible = false; // kept up to date by watchLoops()
    const makeScene = (tl, panel) => ({
      tl, panel, parkCall: null,
      start() {
        if (this.parkCall) { this.parkCall.kill(); this.parkCall = null; }
        this.tl.restart();
        if (stageVisible) this.panel.classList.add('is-live');
      },
      park() {
        if (this.parkCall) this.parkCall.kill();
        this.parkCall = gsap.delayedCall(0.6, () => { this.tl.pause(0); this.panel.classList.remove('is-live'); });
      },
      finish() {
        if (this.parkCall) { this.parkCall.kill(); this.parkCall = null; }
        this.tl.progress(1).pause();
        this.panel.classList.remove('is-live');
      },
      suspend() { this.panel.classList.remove('is-live'); },
      resume() { this.panel.classList.add('is-live'); },
    });
    const prime = (tl) => { tl.progress(0.0001).progress(0); return tl; };

    const sceneOffline = () => {
      const p = panels[0];
      const slash = $('.off__slash', p);
      const wifi = $('.off__wifi', p);
      const tOn = $('.t--on', p), tOff = $('.t--off', p), tSync = $('.t--sync', p);
      const tks = $$('.tk', p);
      const stQ = tks.map((t) => $('.st--q', t));
      const stS = tks.map((t) => $('.st--s', t));
      const bar2 = $('[data-sync-bar]', p);
      const count = $('[data-sync-count]', p);
      const cnt = { n: 0 };
      const tl = gsap.timeline({ paused: true });
      tl.set(slash, { rotation: -45, scaleX: 0, transformOrigin: '50% 50%' }, 0)
        .set([netOff, tOff, tSync, ...stS], { autoAlpha: 0 }, 0)
        .set([netOn, tOn, ...stQ], { autoAlpha: 1 }, 0)
        .set(wifi, { opacity: 1 }, 0)
        .set(tks, { autoAlpha: 0, x: 26 }, 0)
        .set(bar2, { scaleX: 0 }, 0)
        .set(cnt, { n: 0 }, 0)
        .call(() => { count.textContent = '0'; }, null, 0)
        // the connection drops
        .to(slash, { scaleX: 1, duration: 0.45, ease: 'power3.out' }, 0.9)
        .to(wifi, { opacity: 0.4, duration: 0.3 }, 0.9)
        .to([netOn, tOn], { autoAlpha: 0, duration: 0.3 }, 0.9)
        .to([netOff, tOff], { autoAlpha: 1, duration: 0.3 }, 1.05)
        // …but the counter keeps selling
        .to(tks, { autoAlpha: 1, x: 0, duration: 0.7, stagger: 0.6, ease: 'power3.out' }, 1.45)
        // the connection returns
        .to(slash, { scaleX: 0, duration: 0.35, ease: 'power3.in' }, 4.1)
        .to(wifi, { opacity: 1, duration: 0.3 }, 4.1)
        .to([netOff, tOff], { autoAlpha: 0, duration: 0.3 }, 4.1)
        .to([netOn, tSync], { autoAlpha: 1, duration: 0.3 }, 4.25)
        .to(bar2, { scaleX: 1, duration: 1.2, ease: 'power2.inOut' }, 4.4)
        .to(cnt, { n: 3, duration: 1.2, ease: 'none', snap: { n: 1 }, onUpdate: () => { const s = String(cnt.n); if (count.textContent !== s) count.textContent = s; } }, 4.4)
        .to(stQ, { autoAlpha: 0, duration: 0.25, stagger: 0.4 }, 4.7)
        .to(stS, { autoAlpha: 1, duration: 0.25, stagger: 0.4 }, 4.7)
        .to(tSync, { autoAlpha: 0, duration: 0.3 }, 6.1)
        .to(tOn, { autoAlpha: 1, duration: 0.3 }, 6.1);
      return makeScene(prime(tl), p);
    };

    const sceneCheckout = () => {
      const p = panels[1];
      const scan = $('.qr__scan', p);
      const code = $('.qr__code', p);
      const pms = $$('.pm', p);
      const results = $$('.res', p);
      const dist = () => code.clientHeight - parseFloat(getComputedStyle(scan).top) * 2 - 3;
      const tl = gsap.timeline({ paused: true });
      tl.set(scan, { y: 0, autoAlpha: 0 }, 0)
        .set(results, { autoAlpha: 0, y: 20 }, 0)
        .set($$('.pm__hl', p), { opacity: 0 }, 0)
        .set($$('.pm i b', p), { scale: 0 }, 0)
        .to(scan, { autoAlpha: 1, duration: 0.2 }, 0.35)
        .to(scan, { y: () => dist(), duration: 0.85, ease: 'sine.inOut', repeat: 1, yoyo: true }, 0.35)
        .to(scan, { autoAlpha: 0, duration: 0.2 }, 2.1)
        .to($('.pm__hl', pms[0]), { opacity: 1, duration: 0.4 }, 2.05)
        .to($('i b', pms[0]), { scale: 1, duration: 0.45, ease: 'back.out(2.4)' }, 2.1)
        .to(results[0], { autoAlpha: 1, y: 0, duration: 0.7 }, 2.6)
        .to(results[1], { autoAlpha: 1, y: 0, duration: 0.7 }, 3.3);
      return makeScene(prime(tl), p);
    };

    const sceneNetwork = () => {
      const p = panels[2];
      const lks = $$('.lk', p);
      const nds = $$('.nd', p);
      const kpis = $$('.net__kpis li', p);
      const kpiVal = $('[data-kpi]', p);
      const rev = { v: 0 };
      let lastWrite = 0;
      // text changes cost a layout each — a ~11 fps ticker looks identical and is far cheaper
      const writeRev = (force) => {
        const now = performance.now();
        if (!force && now - lastWrite < 90) return;
        lastWrite = now;
        kpiVal.textContent = CA.taka(rev.v);
      };
      const tl = gsap.timeline({ paused: true });
      // nodes fade in with opacity only — SVG attribute transforms are the expensive path
      tl.set(lks, { opacity: 0 }, 0)
        .set(nds, { opacity: 0 }, 0)
        .set(kpis, { autoAlpha: 0, y: 16 }, 0)
        .set(rev, { v: 0 }, 0)
        .call(() => { kpiVal.textContent = CA.taka(0); }, null, 0)
        .to(lks, { opacity: 1, duration: 0.6, stagger: 0.08 }, 0.3)
        .to(nds, { opacity: 1, duration: 0.6, stagger: 0.09 }, 0.45)
        .to(kpis, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.1 }, 0.8)
        .to(rev, { v: 4821340, duration: 2.4, ease: 'power2.out', onUpdate: () => writeRev(false), onComplete: () => writeRev(true) }, 0.9);
      // (the travelling pulses and the hub halo are CSS keyframes, gated by .is-live)
      return makeScene(prime(tl), p);
    };

    const scenes = [sceneOffline(), sceneCheckout(), sceneNetwork()];

    /* step switching shared by every mode */
    let current = -1;
    const setStep = (i, { animate = true } = {}) => {
      if (i === current) return;
      const prev = current;
      current = i;

      steps.forEach((s, k) => {
        s.classList.toggle('is-active', k === i);
        const head = $('.step__head', s);
        if (head) head.setAttribute('aria-expanded', String(k === i));
      });
      dots.forEach((d, k) => (k === i ? d.setAttribute('aria-current', 'true') : d.removeAttribute('aria-current')));

      panels.forEach((p, k) => {
        if (!animate) { gsap.set(p, { autoAlpha: k === i ? 1 : 0, y: 0 }); return; }
        if (k === i) {
          const from = prev === -1 ? 0 : prev < i ? 36 : -36;
          gsap.fromTo(p, { y: from, autoAlpha: prev === -1 ? 0 : 0 }, { y: 0, autoAlpha: 1, duration: 0.8, ease: 'power3.out', overwrite: 'auto' });
        } else {
          gsap.to(p, { autoAlpha: 0, y: k < i ? -36 : 36, duration: 0.5, ease: 'power2.inOut', overwrite: 'auto' });
        }
      });

      scenes.forEach((sc, k) => {
        if (k === i) animate ? sc.start() : sc.finish();
        else if (k === prev) animate ? sc.park() : sc.finish();
      });
      if (!animate) {
        gsap.set(netOn, { autoAlpha: 1 });
        gsap.set(netOff, { autoAlpha: 0 });
      }
    };

    const watchLoops = (target) =>
      CA.visible(target, (v) => {
        stageVisible = v;
        scenes.forEach((sc, k) => { if (v && k === current) sc.resume(); else sc.suspend(); });
      }, { margin: '0px' });

    /* ---------- desktop: pinned, scroll-driven ---------- */
    mm.add(CA.mq.desktop, () => {
      engine.classList.add('is-pinned');
      current = -1;
      const setBar = gsap.quickSetter(bar, 'scaleX');
      const clickers = [];
      const stopWatch = watchLoops(engine);

      const stepAt = (p) => Math.min(2, Math.floor(p * 3));
      const pin = ScrollTrigger.create({
        trigger: engine,
        start: 'top top',
        end: () => '+=' + Math.round(window.innerHeight * 3),
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          setBar(self.progress);
          if (self.isActive) setStep(stepAt(self.progress));
        },
      });

      // start the first scene as the section approaches, reset it when we leave upwards.
      // (reads the pin's real progress, so a jump into the middle of the section lands on the right step)
      const approach = ScrollTrigger.create({
        trigger: engine,
        start: 'top 78%',
        end: 'top top',
        onEnter: () => { if (pin.progress < 1) setStep(pin.progress > 0 ? stepAt(pin.progress) : 0); },
        onLeaveBack: () => { current = -1; scenes.forEach((s) => s.park()); },
      });

      steps.forEach((s, k) => {
        const head = $('.step__head', s);
        const fn = () => {
          const span = pin.end - pin.start;
          CA.scrollTo(pin.start + span * ((k + 0.5) / 3), { duration: 1.6 });
        };
        head.addEventListener('click', fn);
        clickers.push(() => head.removeEventListener('click', fn));
      });

      return () => {
        engine.classList.remove('is-pinned');
        clickers.forEach((fn) => fn());
        stopWatch();
        pin.kill();
        approach.kill();
        scenes.forEach((s) => s.park());
        current = -1;
      };
    });

    /* ---------- mobile: stage cycles on its own ---------- */
    mm.add(CA.mq.mobile, () => {
      current = -1;
      let idx = 0;
      let timer = null;
      let manual = false;
      const go = (i) => { idx = i; setStep(i); };
      const tick = () => { if (!manual) go((idx + 1) % 3); };
      const startTimer = () => { stopTimer(); timer = setInterval(tick, 7600); };
      const stopTimer = () => { if (timer) clearInterval(timer); timer = null; };

      const st = ScrollTrigger.create({
        trigger: stage, start: 'top 80%', end: 'bottom 10%',
        onEnter: () => { go(idx); startTimer(); },
        onEnterBack: () => { go(idx); startTimer(); },
        onLeave: stopTimer,
        onLeaveBack: () => { stopTimer(); current = -1; scenes.forEach((s) => s.park()); },
      });
      const handlers = dots.map((d, k) => {
        const fn = () => { manual = true; go(k); };
        d.addEventListener('click', fn);
        return () => d.removeEventListener('click', fn);
      });
      const stopWatch = watchLoops(stage);

      return () => {
        stopTimer();
        stopWatch();
        st.kill();
        handlers.forEach((h) => h());
        scenes.forEach((s) => s.park());
        current = -1;
      };
    });

    /* ---------- reduced motion: static tabs, no scene playback ---------- */
    mm.add('(prefers-reduced-motion: reduce)', () => {
      current = -1;
      setStep(0, { animate: false });
      const handlers = dots.map((d, k) => {
        const fn = () => setStep(k, { animate: false });
        d.addEventListener('click', fn);
        return () => d.removeEventListener('click', fn);
      });
      return () => handlers.forEach((h) => h());
    });
  };
})();
