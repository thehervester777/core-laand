/* =========================================================
   Solutions chapter — industries (horizontal) · use cases (stack + widgets)
   ========================================================= */
(() => {
  'use strict';
  const CA = window.CA;
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!CA) return;
  const { $, $$ } = CA;

  /* ---------- ambient motion for each illustration ----------
     Cards 1–5 (beam, capsules, plate, stamp, arrows) animate in pure CSS — see solutions.css — and are
     switched on with the `.is-live` class. Only the size selector and the delivery truck need JS. */
  const artFx = (card, i) => {
    const svg = $('.icard__art svg', card);
    let anim = null;

    if (svg && i === 5) { // size selector cycles S → M → L
      const chips = $$('[data-sizes] .a-chip', svg);
      const txts = $$('[data-sizes] .a-txt', svg);
      const set = (k) => chips.forEach((c, j) => {
        c.classList.toggle('a-chip--on', j === k);
        txts[j].classList.toggle('a-txt--inv', j === k);
      });
      anim = gsap.timeline({ repeat: -1, paused: true })
        .call(() => set(0), null, 0).call(() => set(1), null, 1.1).call(() => set(2), null, 2.2)
        .to({}, { duration: 1.1 }, 2.2);
    }

    if (svg && i === 6) { // truck follows the route (positions come from a precomputed table)
      const path = $('#route-a', svg);
      const truck = $('[data-truck]', svg);
      const len = path.getTotalLength();
      const N = 160;
      const xs = new Float32Array(N + 1);
      const ys = new Float32Array(N + 1);
      for (let k = 0; k <= N; k++) {
        const p = path.getPointAtLength((len * k) / N);
        xs[k] = p.x;
        ys[k] = p.y;
      }
      const o = { t: 0 };
      const upd = () => {
        const f = o.t * N;
        const k = Math.min(N - 1, f | 0);
        const u = f - k;
        const x = xs[k] + (xs[k + 1] - xs[k]) * u;
        const y = ys[k] + (ys[k + 1] - ys[k]) * u;
        const a = (Math.atan2(ys[k + 1] - ys[k], xs[k + 1] - xs[k]) * 180) / Math.PI;
        truck.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${a.toFixed(1)}deg)`;
      };
      upd();
      anim = gsap.to(o, { t: 1, duration: 4.2, ease: 'power1.inOut', repeat: -1, repeatDelay: 0.4, onUpdate: upd, paused: true });
    }

    return {
      play() { card.classList.add('is-live'); if (anim) anim.play(); },
      pause() { card.classList.remove('is-live'); if (anim) anim.pause(); },
    };
  };

  /* ---------- widgets ---------- */
  const widgetStock = (root) => {
    const rows = $$('.srow', root).map((el) => ({
      el, n: +el.dataset.stock, max: +el.dataset.max,
      nEl: $('[data-n]', el), badge: $('.badge', el), label: $('[data-badge]', el),
    }));
    const toast = $('[data-toast]', root);
    const paint = (r) => {
      const low = r.n <= 5;
      r.nEl.textContent = r.n;
      r.el.classList.toggle('is-low', low);
      r.badge.classList.toggle('badge--bad', low);
      r.badge.classList.toggle('badge--ok', !low);
      r.label.firstChild.nodeValue = low ? 'Low stock: ' : 'Stock: ';
      r.el.style.setProperty('--p', Math.max(0.05, r.n / r.max).toFixed(3));
    };
    rows.forEach(paint);

    let tick = 0, timer = null, toastTl = null;
    const showToast = () => {
      if (toastTl) toastTl.kill();
      toastTl = gsap.timeline()
        .to(toast, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'expo.out' })
        .to(toast, { autoAlpha: 0, y: 14, duration: 0.5, ease: 'power2.in' }, '+=2.6');
    };
    const step = () => {
      tick++;
      const h = rows[1];
      h.n = h.n <= 12 ? 48 : h.n - (1 + (tick % 3));
      paint(h);
      if (tick % 3 === 1) showToast();
    };
    return {
      start() { if (timer) return; setTimeout(step, 500); timer = setInterval(step, 2300); },
      stop() { clearInterval(timer); timer = null; },
    };
  };

  const widgetExpiry = (root) => {
    const toast = $('[data-toast]', root);
    const bar = $('.erow__bar i', root);
    let tl = null;
    return {
      start() {
        if (tl) tl.kill();
        tl = gsap.timeline({ repeat: -1, repeatDelay: 0.8 })
          .fromTo(bar, { opacity: 1 }, { opacity: 0.5, duration: 0.7, yoyo: true, repeat: 5, ease: 'sine.inOut' }, 0)
          .to(toast, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'expo.out' }, 1.2)
          .to(toast, { autoAlpha: 0, y: 14, duration: 0.5, ease: 'power2.in' }, 4.8);
      },
      stop() { if (tl) { tl.pause(0); } },
    };
  };

  const widgetFloor = (root) => {
    const tables = $$('.tbl', root);
    const occ = $('[data-occ]', root);
    let timer = null;
    let touched = false;
    const sync = () => { occ.textContent = tables.filter((t) => t.classList.contains('is-on')).length; };
    const toggle = (t) => {
      const on = t.classList.toggle('is-on');
      t.setAttribute('aria-pressed', String(on));
      $('small', t).textContent = on ? 'Occupied' : 'Available';
      sync();
    };
    tables.forEach((t) => t.addEventListener('click', () => { touched = true; toggle(t); }));
    return {
      start() {
        if (timer || touched) return;
        timer = setInterval(() => {
          if (touched) { clearInterval(timer); timer = null; return; }
          toggle(tables[Math.floor(Math.random() * tables.length)]);
        }, 2600);
      },
      stop() { clearInterval(timer); timer = null; },
    };
  };

  const widgetTransit = (root) => {
    const rows = $$('.trow', root).map((el) => ({
      el, pct: +el.dataset.pct, cur: 0, shown: -1, trackW: 0,
      track: $('.trow__track', el), fill: $('[data-fill]', el), truck: $('[data-truck]', el), label: $('[data-pct-label]', el),
    }));
    // transforms only: no layout work while the progress animates
    const measure = () => rows.forEach((r) => { r.trackW = r.track.clientWidth; });
    const apply = (r) => {
      const p = r.cur / 100;
      r.fill.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      r.truck.style.transform = 'translateX(' + (p * r.trackW).toFixed(1) + 'px)';
      const n = Math.round(r.cur);
      if (n !== r.shown) { r.shown = n; r.label.textContent = n + '%'; }
    };
    measure();
    rows.forEach((r) => { r.cur = r.pct; apply(r); });
    if ('ResizeObserver' in window) new ResizeObserver(() => { measure(); rows.forEach(apply); }).observe(root);
    let timer = null;
    return {
      start() {
        if (timer) return;
        measure();
        rows.forEach((r, i) => {
          r.cur = 0; apply(r);
          gsap.to(r, { cur: r.pct, duration: 1.9, delay: i * 0.15, ease: 'power3.out', onUpdate: () => apply(r) });
        });
        timer = setInterval(() => {
          rows.forEach((r) => {
            r.pct = r.pct >= 98 ? 12 : r.pct + 1;
            gsap.to(r, { cur: r.pct, duration: r.pct === 12 ? 0.9 : 1.2, ease: 'power2.out', overwrite: true, onUpdate: () => apply(r) });
          });
        }, 2600);
      },
      stop() { clearInterval(timer); timer = null; rows.forEach((r) => gsap.killTweensOf(r)); },
    };
  };

  const buildWidget = (card) => {
    const root = $('[data-widget]', card);
    if (!root) return null;
    switch (root.dataset.widget) {
      case 'stock': return widgetStock(root);
      case 'expiry': return widgetExpiry(root);
      case 'floor': return widgetFloor(root);
      case 'transit': return widgetTransit(root);
      default: return null;
    }
  };

  /* ---------- init ---------- */
  CA.init.solutions = (mm) => {
    const sec = $('[data-industries]');
    const cards = sec ? $$('[data-card]', sec) : [];
    const ucards = $$('[data-ucard]');
    const widgets = ucards.map(buildWidget); // interactive in every mode

    /* industries · desktop: pinned horizontal scroll */
    if (sec) {
      const track = $('[data-track]', sec);
      const bar = $('[data-h-bar]', sec);
      const cur = $('[data-h-current]', sec);
      const fx = cards.map((c, i) => artFx(c, i));
      const total = 7;

      mm.add(CA.mq.desktop, () => {
        sec.classList.add('is-pinned');
        const vw = () => document.documentElement.clientWidth;
        const dist = () => Math.max(0, track.scrollWidth - vw());
        const setBar = gsap.quickSetter(bar, 'scaleX');
        let shown = 0;

        const move = gsap.to(track, {
          x: () => -dist(),
          ease: 'none',
          scrollTrigger: {
            trigger: sec,
            start: 'top top',
            end: () => '+=' + Math.round(dist() * 1.1),
            pin: true,
            scrub: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              setBar(self.progress);
              const idx = Math.min(total, Math.round(self.progress * (total - 1)) + 1);
              if (idx !== shown) { shown = idx; cur.textContent = CA.pad2(idx); }
            },
          },
        });

        // ambient art only plays for cards that are really on screen
        const stops = cards.map((card, i) => CA.visible(card, (v) => (v ? fx[i].play() : fx[i].pause()), { margin: '0px' }));

        cards.forEach((card, i) => {
          const svg = $('.icard__art svg', card);
          if (svg && i < total) {
            gsap.fromTo(svg, { xPercent: -5, scale: 1.08 }, {
              xPercent: 5, scale: 1.08, ease: 'none',
              scrollTrigger: { trigger: card, containerAnimation: move, start: 'left right', end: 'right left', scrub: true },
            });
          }
        });

        return () => { stops.forEach((s) => s()); sec.classList.remove('is-pinned'); fx.forEach((f) => f.pause()); };
      });

      /* industries · mobile: native swipe, animate what is on screen */
      mm.add(CA.mq.mobile, () => {
        const io = new IntersectionObserver((entries) => {
          entries.forEach((e) => {
            const i = cards.indexOf(e.target);
            if (i < 0) return;
            if (e.isIntersecting) fx[i].play(); else fx[i].pause();
          });
        }, { threshold: 0.35 });
        cards.forEach((c) => io.observe(c));
        return () => { io.disconnect(); fx.forEach((f) => f.pause()); };
      });
    }

    /* use cases · desktop: cards stack, the buried ones recede */
    mm.add(CA.mq.desktop, () => {
      const shades = [];
      ucards.forEach((card, i) => {
        const shade = document.createElement('span');
        shade.className = 'ucard__shade';
        card.appendChild(shade);
        shades.push(shade);
        const next = ucards[i + 1];
        if (!next) return;
        gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: next, start: 'top bottom',
            end: () => 'top ' + parseFloat(getComputedStyle(next).top),
            scrub: true, invalidateOnRefresh: true,
          },
        })
          .to(card, { scale: 0.935 }, 0)
          .to(shade, { opacity: 0.2 }, 0);
      });
      return () => shades.forEach((s) => s.remove());
    });

    /* use cases · widgets run only while on screen (IntersectionObserver sees sticky cards correctly) */
    mm.add(CA.mq.motion, () => {
      const stops = [];
      ucards.forEach((card, i) => {
        const w = widgets[i];
        const target = $('.ucard__widget', card);
        if (!w || !w.start || !target) return;
        stops.push(CA.visible(target, (v) => {
          target.classList.toggle('is-live', v); // also un-pauses the CSS "live" dot
          if (v) w.start(); else w.stop();
        }, { margin: '-8% 0px' }));
      });
      return () => { stops.forEach((s) => s()); widgets.forEach((w) => w && w.stop && w.stop()); };
    });
  };
})();
