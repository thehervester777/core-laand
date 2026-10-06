/* =========================================================
   Core Agency — bootstrap
   preloader → init every section → reveal the hero
   ========================================================= */
(() => {
  'use strict';
  const CA = window.CA;
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!CA || !gsap || !ScrollTrigger) return;
  const { $, $$ } = CA;

  const root = document.documentElement;
  gsap.registerPlugin(ScrollTrigger);
  // (limitCallbacks is deliberately off: it would skip `onEnter` reveals after anchor jumps)
  ScrollTrigger.config({ ignoreMobileResize: true });
  gsap.defaults({ ease: 'power3.out' });
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  const preloader = $('.preloader');
  const safe = (name, fn) => {
    try { fn(); } catch (err) { console.error('[Core Agency] ' + name + ' failed', err); }
  };

  /* ---------- preloader ---------- */
  CA.runPreloader = (ready) =>
    new Promise((resolve) => {
      if (CA.reduced || !preloader) { ready.then(resolve); return; }

      const ring = $('.pl-ring', preloader);
      const dot = $('.pl-dot', preloader);
      const count = $('[data-count]', preloader);
      const words = $$('.preloader__word span', preloader).map((w) => {
        const i = document.createElement('i');
        i.textContent = w.textContent;
        w.textContent = '';
        w.appendChild(i);
        return i;
      });

      ring.setAttribute('pathLength', '1');
      gsap.set(ring, { strokeDasharray: '0 1' });
      gsap.set(words, { yPercent: 115 });
      gsap.set(dot, { scale: 0, transformOrigin: '50% 50%' });

      const n = { v: 0 };
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      let shownCount = '';
      tl.to(ring, { strokeDasharray: '0.76 0.24', duration: 1.0, ease: 'power2.inOut' }, 0.1)
        .to(dot, { scale: 1, duration: 0.8, ease: 'back.out(2.2)' }, 0.45)
        .to(words, { yPercent: 0, duration: 0.9, stagger: 0.08, ease: 'expo.out' }, 0.3)
        .to(n, {
          v: 100, duration: 1.4, ease: 'power2.inOut',
          onUpdate: () => { const s = CA.pad2(Math.round(n.v)); if (s !== shownCount) { shownCount = s; count.textContent = s; } },
        }, 0);

      const minimum = new Promise((r) => tl.eventCallback('onComplete', r));
      Promise.all([minimum, ready]).then(() => {
        gsap.timeline()
          .to('.preloader__inner', { y: -40, autoAlpha: 0, duration: 0.6, ease: 'power3.in' }, 0)
          .to('.preloader__meta', { autoAlpha: 0, duration: 0.35 }, 0)
          .to(preloader, { yPercent: -100, duration: 1.0, ease: 'expo.inOut' }, 0.35)
          .add(resolve, 0.75)
          .set(preloader, { display: 'none' });
      });
    });

  /* ---------- page ---------- */
  CA.setupLenis();
  CA.setupRoll();
  CA.setupMenu();
  CA.setupAnchors();
  CA.setupMagnetic();

  const fontsReady = Promise.race([
    document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve(),
    new Promise((r) => setTimeout(r, 3500)),
  ]);

  // Section setup runs in page order (ScrollTrigger needs that) but yields between chunks, so the
  // preloader keeps animating smoothly even on slow devices instead of freezing for one long task.
  const breathe = () => new Promise((r) => setTimeout(r, 0));
  const initPage = async () => {
    const mm = gsap.matchMedia();
    CA.mm = mm;
    safe('hero', () => CA.init.hero(mm));         await breathe();
    safe('story', () => CA.init.story(mm));       await breathe();
    safe('solutions', () => CA.init.solutions(mm)); await breathe();
    safe('proof', () => CA.init.proof(mm));       await breathe();
    safe('close', () => CA.init.close(mm));       await breathe();
    safe('marquee', () => CA.setupMarquee());
    safe('reveals', () => CA.setupReveals());     await breathe();
    safe('global', () => CA.setupGlobal());
    ScrollTrigger.refresh();
  };

  const ready = fontsReady
    .then(() => new Promise((r) => setTimeout(r, 30))) // let late layout settle; no rAF dependency
    .then(initPage)
    .catch((err) => console.error('[Core Agency] init failed', err));

  CA.runPreloader(ready).then(() => {
    if (CA.heroIntro) safe('intro', () => CA.heroIntro());
    root.classList.remove('is-loading');
    if (CA.lenis) CA.lenis.start();
    ScrollTrigger.refresh();
  });

  // belt and braces: never leave the visitor behind a curtain
  setTimeout(() => {
    if (preloader && preloader.style.display !== 'none' && root.classList.contains('is-loading')) {
      preloader.style.display = 'none';
      root.classList.remove('is-loading');
      if (CA.lenis) CA.lenis.start();
    }
  }, 12000);

  // keep layout math honest once late resources (fonts, scrollbar) settle
  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
