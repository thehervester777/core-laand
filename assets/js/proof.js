/* =========================================================
   Proof chapters — ROI estimator · compare · voices · FAQ
   ========================================================= */
(() => {
  'use strict';
  const CA = window.CA;
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!CA) return;
  const { $, $$ } = CA;

  /* ---------- ROI ---------- */
  const initROI = (mm) => {
    const root = $('[data-roi]');
    if (!root) return;
    const range = $('#roi-range', root);
    const valueEl = $('[data-roi-value]', root);
    const lossEl = $('[data-roi-loss]', root);
    const hoursEl = $('[data-roi-hours]', root);
    const yearEl = $('[data-roi-year]', root);
    const bars = $$('[data-bars] i', root);
    const card = root; // [data-roi] is the card itself

    const min = +range.min;
    const max = +range.max;
    const LEAK = 0.045; // observed average revenue leakage
    const maxAnnual = max * LEAK * 12;
    const view = { loss: 0, hours: 0, year: 0 };

    const calc = (sales) => ({
      loss: sales * LEAK,
      hours: Math.round(28 * Math.pow(sales / 250000, 0.6)),
      year: sales * LEAK * 12,
    });
    // write to the DOM only when a value actually changed (this runs every frame while animating)
    const last = { loss: '', hours: '', year: '', bars: [] };
    const paint = () => {
      const loss = CA.taka(view.loss);
      if (loss !== last.loss) { last.loss = loss; lossEl.textContent = loss; }
      const hours = String(Math.round(view.hours));
      if (hours !== last.hours) { last.hours = hours; hoursEl.textContent = hours; }
      const year = CA.taka(view.year);
      if (year !== last.year) { last.year = year; yearEl.textContent = year; }
      const frac = Math.sqrt(Math.max(0, view.year) / maxAnnual);
      bars.forEach((b, i) => {
        const h = Math.max(0.04, (frac * (i + 1)) / 12).toFixed(3);
        if (last.bars[i] !== h) { last.bars[i] = h; b.style.setProperty('--h', h); }
      });
    };
    const syncInput = () => {
      const sales = +range.value;
      valueEl.textContent = CA.taka(sales);
      range.style.setProperty('--p', (((sales - min) / (max - min)) * 100).toFixed(2) + '%');
      range.setAttribute('aria-valuetext', CA.taka(sales) + ' per month');
      return sales;
    };
    let armed = false; // becomes true once the entrance animation has played
    const update = () => {
      const sales = syncInput();
      const target = calc(sales);
      if (CA.reduced || !armed) { Object.assign(view, target); paint(); return; }
      gsap.to(view, { ...target, duration: 0.6, ease: 'power3.out', overwrite: true, onUpdate: paint });
    };
    range.addEventListener('input', update);

    // static state first (also the reduced-motion result)
    Object.assign(view, calc(syncInput()));
    paint();

    mm.add(CA.mq.motion, () => {
      const metrics = $$('.metric, .roi__chart, .roi__note', root);
      Object.assign(view, { loss: 0, hours: 0, year: 0 });
      paint();
      gsap.set(card, { autoAlpha: 0, y: 70 });
      const st = ScrollTrigger.create({
        trigger: card, start: 'top 82%', once: true,
        onEnter: () => {
          if (CA.isPast(card)) { // jumped past it: show the final state straight away
            gsap.set(card, { clearProps: 'transform,opacity,visibility' });
            Object.assign(view, calc(+range.value));
            paint();
            armed = true;
            return;
          }
          gsap.to(card, { autoAlpha: 1, y: 0, duration: 1.3, ease: 'expo.out', onComplete: () => gsap.set(card, { clearProps: 'transform,opacity,visibility' }) });
          gsap.from(metrics, { y: 24, autoAlpha: 0, duration: 1, stagger: 0.1, ease: 'expo.out', delay: 0.35, clearProps: 'transform,opacity,visibility' });
          gsap.to(view, { ...calc(+range.value), duration: 1.9, delay: 0.35, ease: 'power3.out', onUpdate: paint, onComplete: () => { armed = true; } });
        },
      });
      return () => { st.kill(); armed = false; Object.assign(view, calc(syncInput())); paint(); };
    });
  };

  /* ---------- compare ---------- */
  const initCompare = (mm) => {
    const wrap = $('[data-cmp]');
    if (!wrap) return;
    const hl = $('[data-cmp-hl]', wrap);
    const heads = $$('thead th', wrap);
    const rows = $$('[data-row]', wrap);
    const marks = $$('.cmp__core .mk', wrap);

    mm.add(CA.mq.motion, () => {
      gsap.set(hl, { scaleY: 0 });
      gsap.set([...heads, ...rows], { autoAlpha: 0, y: 28 });
      gsap.set(marks, { scale: 0 });
      ScrollTrigger.create({
        trigger: wrap, start: 'top 80%', once: true,
        onEnter: () => {
          if (CA.isPast(wrap)) {
            gsap.set(hl, { scaleY: 1 });
            gsap.set([...heads, ...rows, ...marks], { clearProps: 'transform,opacity,visibility' });
            return;
          }
          gsap.timeline({ defaults: { ease: 'expo.out' }, onComplete: () => gsap.set([...heads, ...rows, ...marks], { clearProps: 'transform,opacity,visibility' }) })
            .to(hl, { scaleY: 1, duration: 1.4 }, 0)
            .to(heads, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.08 }, 0.1)
            .to(rows, { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.13 }, 0.3)
            .to(marks, { scale: 1, duration: 0.8, stagger: 0.13, ease: 'back.out(2.6)' }, 0.75);
        },
      });
    });
  };

  /* ---------- voices ---------- */
  const initVoices = (mm) => {
    const quotes = $$('[data-quote]');
    const cur = $('[data-q-current]');
    if (!quotes.length) return;

    mm.add(CA.mq.motion, () => {
      let shown = 0;
      const setCurrent = (i) => {
        if (i === shown) return;
        shown = i;
        cur.textContent = CA.pad2(i + 1);
        gsap.fromTo(cur, { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.6, ease: 'expo.out' });
      };
      quotes.forEach((q, i) => {
        gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: q, start: 'top 84%', end: 'bottom 16%', scrub: true },
        })
          .fromTo(q, { opacity: 0.16, y: 56 }, { opacity: 1, y: 0, duration: 0.32 })
          .to(q, { opacity: 1, y: 0, duration: 0.36 })
          .to(q, { opacity: 0.16, y: -56, duration: 0.32 });
        ScrollTrigger.create({
          trigger: q, start: 'top 55%', end: 'bottom 55%',
          onToggle: (self) => { if (self.isActive) setCurrent(i); },
        });
      });
    });
  };

  /* ---------- FAQ ---------- */
  const initFAQ = () => {
    const acc = $('[data-acc]');
    if (!acc) return;
    const items = $$('.acc__item', acc);
    let t;
    const setOpen = (item, open) => {
      item.classList.toggle('is-open', open);
      $('.acc__q', item).setAttribute('aria-expanded', String(open));
    };
    items.forEach((item) => {
      $('.acc__q', item).addEventListener('click', () => {
        const willOpen = !item.classList.contains('is-open');
        items.forEach((o) => setOpen(o, o === item ? willOpen : false));
        clearTimeout(t);
        t = setTimeout(() => ScrollTrigger.refresh(), 820); // page height changed
      });
    });
  };

  CA.init.proof = (mm) => {
    initROI(mm);
    initCompare(mm);
    initVoices(mm);
    initFAQ();
  };
})();
