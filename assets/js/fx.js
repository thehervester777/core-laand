/* =========================================================
   Core Agency — immersion layer
   cursor · hero depth · card tilt + glare · ink-in copy · card entrances
   draw-on ticks · stat depth · button ripple · footer wordmark
   ---------------------------------------------------------
   Purely additive: nothing here replaces an existing animation.
   Budget rules (same as the rest of the page):
   - transforms + opacity only; no per-frame layout reads
   - one smoothing loop for the cursor, and it sleeps when the pointer rests
   - pointer effects exist only for mouse / trackpad devices
   - everything honours prefers-reduced-motion
   ========================================================= */
(() => {
  'use strict';
  const CA = window.CA;
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!CA || !gsap || !ScrollTrigger) return;
  const { $, $$ } = CA;

  const FINE = '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)';
  const safe = (name, fn) => {
    try { fn(); } catch (err) { console.error('[Core Agency] fx · ' + name + ' failed', err); }
  };

  // While the page scrolls, content slides under a resting pointer and the browser fires enter / leave events
  // for it. Reacting to those would tilt cards the visitor never aimed at, so pointer effects wait for the scroll to settle.
  let lastScroll = 0;
  window.addEventListener('scroll', () => { lastScroll = performance.now(); }, { passive: true });
  const scrolling = () => performance.now() - lastScroll < 140;

  /* ---------- cursor ----------
     The native pointer stays (no added latency, fully accessible). A ring trails it with
     frame-rate independent easing, stretches along its direction of travel, grows over anything
     clickable and steps aside over text fields. The loop stops once the ring has caught up. */
  const setupCursor = (mm) => {
    mm.add(FINE, () => {
      const el = document.createElement('div');
      el.className = 'fx-cursor';
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML = '<span class="fx-cursor__stretch"><span class="fx-cursor__ring"></span></span>';
      document.body.appendChild(el);
      const stretch = el.firstElementChild;

      const setX = gsap.quickSetter(el, 'x', 'px');
      const setY = gsap.quickSetter(el, 'y', 'px');
      const setRot = gsap.quickSetter(stretch, 'rotation', 'deg');
      const setSx = gsap.quickSetter(stretch, 'scaleX');

      let tx = 0, ty = 0, x = 0, y = 0, rot = 0, sx = 1;
      let inside = false;
      let running = false;

      const tick = (time, delta) => {
        const k = 1 - Math.exp(-Math.min(delta, 64) / 72); // same feel at 60 / 120 / 144 Hz
        const nx = x + (tx - x) * k;
        const ny = y + (ty - y) * k;
        const vx = nx - x;
        const vy = ny - y;
        x = nx;
        y = ny;
        const speed = Math.hypot(vx, vy);
        if (speed > 0.6) rot = (Math.atan2(vy, vx) * 180) / Math.PI;
        sx += (Math.min(1.5, 1 + speed * 0.028) - sx) * 0.22;
        setX(x);
        setY(y);
        setRot(rot);
        setSx(sx);
        if (Math.abs(tx - x) < 0.05 && Math.abs(ty - y) < 0.05 && Math.abs(sx - 1) < 0.002) stop();
      };
      const go = () => { if (!running) { running = true; gsap.ticker.add(tick); } };
      function stop() { if (running) { running = false; gsap.ticker.remove(tick); } }

      const onMove = (e) => {
        if (e.pointerType && e.pointerType !== 'mouse') return;
        tx = e.clientX;
        ty = e.clientY;
        if (!inside) { // first sighting: appear exactly under the pointer, no flight from the corner
          inside = true;
          x = tx; y = ty;
          setX(x); setY(y);
          el.classList.add('is-on');
        }
        go();
      };

      const LINK = 'a[href], button:not(:disabled), [role="button"], summary, label[for], select, input[type="range"], [data-magnetic]';
      const TEXT = 'input:not([type="range"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"]), textarea';
      const onOver = (e) => {
        const t = e.target;
        if (!(t instanceof Element)) return;
        if (t.closest(TEXT)) { el.classList.add('is-hidden'); el.classList.remove('is-link', 'is-card'); return; }
        el.classList.remove('is-hidden');
        const link = Boolean(t.closest(LINK));
        el.classList.toggle('is-link', link);
        el.classList.toggle('is-card', !link && Boolean(t.closest('.fx-tilt')));
      };
      const onDown = (e) => { if (e.button === 0) el.classList.add('is-press'); };
      const onUp = () => el.classList.remove('is-press');
      const root = document.documentElement;
      const onLeave = () => el.classList.add('is-hidden');
      const onEnter = () => el.classList.remove('is-hidden');

      window.addEventListener('pointermove', onMove, { passive: true });
      document.addEventListener('pointerover', onOver, { passive: true });
      window.addEventListener('pointerdown', onDown, { passive: true });
      window.addEventListener('pointerup', onUp, { passive: true });
      window.addEventListener('blur', onUp);
      root.addEventListener('mouseleave', onLeave);
      root.addEventListener('mouseenter', onEnter);

      return () => {
        stop();
        window.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerover', onOver);
        window.removeEventListener('pointerdown', onDown);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('blur', onUp);
        root.removeEventListener('mouseleave', onLeave);
        root.removeEventListener('mouseenter', onEnter);
        el.remove();
      };
    });
  };

  /* ---------- hero depth ----------
     The pointer moves four layers by different amounts: orbit rings, glow, floating chips and
     (already in hero.js) the device. Parallax is what makes the scene read as a space.
     The dot grid deliberately stays put: it carries a CSS mask, and moving a masked layer forces the
     compositor to re-mask it on every pointer move (measured: ~1% of frames dropped, nothing else cost anything). */
  const setupHeroDepth = (mm) => {
    const intro = $('.intro');
    const hero = intro && $('.hero', intro);
    if (!hero) return;
    mm.add(FINE, () => {
      const rings = CA.state && CA.state.rings;
      const chips = $$('[data-chip]', intro);
      const glow = $('.hero__glow', hero);

      if (glow) gsap.set(glow, { xPercent: -50, x: 0 }); // keep its centring resize-safe once GSAP drives it
      const to = (target, prop, dur) => gsap.quickTo(target, prop, { duration: dur, ease: 'power3.out' });
      const chipX = chips.map((c) => to(c, 'x', 1.4));
      const glowX = glow && to(glow, 'x', 1.9);
      const glowY = glow && to(glow, 'y', 1.9);
      const ringX = rings && rings.shift ? to(rings.shift, 'x', 1.7) : null;
      const ringY = rings && rings.shift ? to(rings.shift, 'y', 1.7) : null;
      const depth = [-22, 26, -24]; // max ±13px: enough to read as depth, never enough to touch the CTAs

      const apply = (nx, ny) => {
        chipX.forEach((fn, i) => fn(nx * depth[i % depth.length]));
        if (glowX) { glowX(nx * -70); glowY(ny * -44); }
        if (ringX) { ringX(nx * -90); ringY(ny * -62); }
      };
      const onMove = (e) => apply(e.clientX / window.innerWidth - 0.5, e.clientY / window.innerHeight - 0.5);
      const onLeave = () => apply(0, 0);
      hero.addEventListener('pointermove', onMove, { passive: true });
      hero.addEventListener('pointerleave', onLeave);

      return () => {
        hero.removeEventListener('pointermove', onMove);
        hero.removeEventListener('pointerleave', onLeave);
        gsap.set(chips, { x: 0 });
        if (glow) gsap.set(glow, { x: 0, y: 0 });
        if (rings && rings.shift) { rings.shift.x = 0; rings.shift.y = 0; }
      };
    });
  };

  /* ---------- card tilt + glare ----------
     A card leans toward the pointer in 3D and a soft highlight follows it, like light on glass.
     Geometry is measured when the pointer enters (and refreshed at ~6 Hz while it moves),
     never per frame, so there is no layout work on the hot path. */
  const makeTilt = (el, max, { clear = false } = {}) => {
    el.classList.add('fx-tilt');
    const glare = document.createElement('span');
    glare.className = 'fx-glare';
    glare.setAttribute('aria-hidden', 'true');
    el.appendChild(glare);
    // A 3D transform forces a compositor layer. Keeping one on every card all the time costs frames while
    // the page scrolls, so the card only carries a transform while the pointer is on it (and for the settle).
    let hovering = false;
    let release = null;
    const arm = () => { if (release) { release.kill(); release = null; } gsap.set(el, { transformPerspective: 1100 }); };
    const disarm = () => {
      release = gsap.delayedCall(1.0, () => {
        release = null;
        if (hovering) return;
        gsap.set(el, { transformPerspective: 0, rotationX: 0, rotationY: 0 });
        if (clear) gsap.set(el, { clearProps: 'transform' });
      });
    };

    const rx = gsap.quickTo(el, 'rotationX', { duration: 0.85, ease: 'power3.out' });
    const ry = gsap.quickTo(el, 'rotationY', { duration: 0.85, ease: 'power3.out' });
    const gx = gsap.quickSetter(glare, 'x', 'px');
    const gy = gsap.quickSetter(glare, 'y', 'px');
    let rect = null;
    let stamp = 0;
    let w = 1;
    let h = 1;
    const measure = () => {
      rect = el.getBoundingClientRect();
      w = el.offsetWidth || 1;
      h = el.offsetHeight || 1;
      stamp = performance.now();
    };
    const begin = () => { hovering = true; arm(); measure(); el.classList.add('is-hover'); };
    const onEnter = (e) => {
      if ((e.pointerType && e.pointerType !== 'mouse') || scrolling()) return;
      begin();
    };
    const onMove = (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      if (!hovering) { if (scrolling()) return; begin(); } // entered while the page was moving: start once it settles
      if (!rect || performance.now() - stamp > 160) measure();
      const px = Math.min(1, Math.max(0, (e.clientX - rect.left) / (rect.width || 1)));
      const py = Math.min(1, Math.max(0, (e.clientY - rect.top) / (rect.height || 1)));
      ry((px - 0.5) * 2 * max);
      rx(-(py - 0.5) * 2 * max);
      gx(px * w);
      gy(py * h);
    };
    const onLeave = () => {
      if (!hovering) return;
      hovering = false; el.classList.remove('is-hover'); rect = null; rx(0); ry(0); disarm();
    };
    el.addEventListener('pointerenter', onEnter, { passive: true });
    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerleave', onLeave, { passive: true });
    return () => {
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      if (release) release.kill();
      gsap.set(el, { transformPerspective: 0, rotationX: 0, rotationY: 0 });
      if (clear) gsap.set(el, { clearProps: 'transform' });
      el.classList.remove('fx-tilt', 'is-hover');
      glare.remove();
    };
  };

  const setupTilt = (mm) => {
    mm.add(FINE, () => {
      const offs = [
        ...$$('.icard__art').map((el) => makeTilt(el, 7, { clear: true })),
        ...$$('.ucard__widget').map((el) => makeTilt(el, 4.5)),
      ];
      return () => offs.forEach((off) => off());
    });
  };

  /* ---------- ink-in copy ----------
     Section intros light up word by word as they scroll through the reading zone —
     the same device the philosophy statement uses, extended to every lead paragraph. */
  const setupInk = (mm) => {
    if (CA.reduced) return;
    const groups = $$('main .lead')
      .filter((el) => !el.closest('.hero') && !el.hasAttribute('data-reveal'))
      .map((el) => ({ el, words: CA.splitWords(el, { mask: false }) }));
    mm.add(CA.mq.motion, () => {
      groups.forEach(({ el, words }) => {
        gsap.set(words, { opacity: 0.3 }); // still readable before it is reached
        gsap.to(words, {
          opacity: 1, ease: 'none', stagger: { amount: 0.9 },
          scrollTrigger: { trigger: el, start: 'top 90%', end: 'bottom 58%', scrub: true },
        });
      });
    });
  };

  /* ---------- use-case cards: choreographed entrance + floating widget ---------- */
  const setupCards = (mm) => {
    if (CA.reduced) return;
    const ucards = $$('[data-ucard]');
    const prepared = ucards.map((card) => {
      const h3 = $('h3', card);
      return {
        card,
        words: h3 ? CA.splitWords(h3) : [],
        lines: [$('.ucard__kicker', card), $('.ucard__copy > p', card)].filter(Boolean),
        widget: $('.ucard__widget', card),
      };
    });

    mm.add(CA.mq.motion, () => {
      prepared.forEach(({ card, words, lines }) => {
        gsap.set(words, { yPercent: 118 });
        gsap.set(lines, { autoAlpha: 0, y: 22 });
        ScrollTrigger.create({
          trigger: card, start: 'top 72%', once: true,
          onEnter: () => {
            if (CA.isPast(card)) { gsap.set(words, { clearProps: 'transform' }); gsap.set(lines, { clearProps: 'transform,opacity,visibility' }); return; }
            gsap.timeline({ defaults: { ease: 'expo.out' } })
              .to(lines[0] || {}, { autoAlpha: 1, y: 0, duration: 0.9 }, 0)
              .to(words, { yPercent: 0, duration: 1.15, stagger: 0.05, onComplete: () => gsap.set(words, { clearProps: 'transform' }) }, 0.08)
              .to(lines.slice(1), { autoAlpha: 1, y: 0, duration: 1, stagger: 0.1, onComplete: () => gsap.set(lines, { clearProps: 'transform,opacity,visibility' }) }, 0.35);
          },
        });
      });
    });

    // the widget glides up a beat behind its copy, then settles when the card docks
    mm.add(CA.mq.desktop, () => {
      prepared.forEach(({ card, widget }) => {
        if (!widget) return;
        gsap.fromTo(widget, { y: 64 }, {
          y: 0, ease: 'none',
          scrollTrigger: { trigger: card, start: 'top bottom', end: 'top 38%', scrub: true },
        });
      });
    });
  };

  /* ---------- ticks draw themselves ---------- */
  const setupTicks = (mm) => {
    if (CA.reduced) return;
    const items = $$('.checks li, .ticks li');
    if (!items.length) return;
    mm.add(CA.mq.motion, () => {
      const icon = (li) => $('.icon', li);
      gsap.set(items, { autoAlpha: 0, x: -16 });
      gsap.set(items.map(icon).filter(Boolean), { strokeDasharray: 20, strokeDashoffset: 20 }); // 20 ≈ length of the check path
      ScrollTrigger.batch(items, {
        start: 'top 94%', once: true,
        onEnter: (batch) => {
          const past = batch.filter((n) => CA.isPast(n));
          const live = batch.filter((n) => !past.includes(n));
          const clear = (list) => {
            gsap.set(list, { clearProps: 'transform,opacity,visibility' });
            gsap.set(list.map(icon).filter(Boolean), { clearProps: 'strokeDasharray,strokeDashoffset' });
          };
          if (past.length) clear(past);
          if (!live.length) return;
          gsap.to(live, { autoAlpha: 1, x: 0, duration: 0.95, ease: 'expo.out', stagger: 0.09, overwrite: true });
          gsap.to(live.map(icon).filter(Boolean), {
            strokeDashoffset: 0, duration: 0.7, ease: 'power2.out', stagger: 0.09, delay: 0.2,
            onComplete: () => clear(live),
          });
        },
      });
    });
  };

  /* ---------- stat numbers drift at three depths ---------- */
  const setupStats = (mm) => {
    const nums = $$('.stat__num');
    if (!nums.length) return;
    mm.add(CA.mq.motion, () => {
      nums.forEach((el, i) => {
        const a = 12 + i * 9;
        gsap.fromTo(el, { y: a }, {
          y: -a, ease: 'none',
          scrollTrigger: { trigger: el.closest('.stats') || el, start: 'top bottom', end: 'bottom top', scrub: true },
        });
      });
    });
  };

  /* ---------- button ripple ---------- */
  const setupRipple = () => {
    if (CA.reduced) return;
    document.addEventListener('pointerdown', (e) => {
      const btn = e.target instanceof Element && e.target.closest('.btn');
      if (!btn || btn.disabled || e.button > 0) return;
      const r = btn.getBoundingClientRect();
      const px = e.clientX - r.left;
      const py = e.clientY - r.top;
      const size = Math.hypot(Math.max(px, r.width - px), Math.max(py, r.height - py)) * 2;
      const dot = document.createElement('span');
      dot.className = 'fx-ripple';
      dot.style.cssText = `left:${(px - size / 2).toFixed(1)}px;top:${(py - size / 2).toFixed(1)}px;width:${size.toFixed(1)}px;height:${size.toFixed(1)}px`;
      btn.appendChild(dot);
      gsap.fromTo(dot, { scale: 0, opacity: 0.24 }, { scale: 1, opacity: 0, duration: 0.95, ease: 'expo.out', onComplete: () => dot.remove() });
    }, { passive: true });
  };

  /* ---------- footer wordmark: letters lean away from the pointer ---------- */
  const setupWordmark = (mm) => {
    const word = $('[data-footer-word]');
    if (!word) return;
    mm.add(FINE, () => {
      const chars = $$('.ch', word);
      if (!chars.length) return;
      const lean = chars.map((c) => gsap.quickTo(c, 'skewX', { duration: 0.75, ease: 'power3.out' }));
      const push = chars.map((c) => gsap.quickTo(c, 'x', { duration: 0.75, ease: 'power3.out' }));
      let centers = [];
      let sigma = 120;
      const measure = () => {
        centers = chars.map((c) => {
          const r = c.getBoundingClientRect();
          return r.left + r.width / 2 - (gsap.getProperty(c, 'x') || 0); // rest position, ignoring the push
        });
        sigma = Math.max(60, word.clientWidth * 0.085);
      };
      let measured = false;
      const onEnter = () => { if (!scrolling()) { measure(); measured = true; } };
      const onMove = (e) => {
        if (scrolling()) return;
        if (!measured) { measure(); measured = true; }
        chars.forEach((_, i) => {
          const d = (e.clientX - centers[i]) / sigma;
          const w = Math.exp(-(d * d) / 2);
          push[i](-d * w * sigma * 0.16);
          lean[i](-d * w * 7);
        });
      };
      const onLeave = () => { measured = false; chars.forEach((_, i) => { push[i](0); lean[i](0); }); };
      word.addEventListener('pointerenter', onEnter, { passive: true });
      word.addEventListener('pointermove', onMove, { passive: true });
      word.addEventListener('pointerleave', onLeave, { passive: true });
      ScrollTrigger.addEventListener('refresh', measure);
      return () => {
        word.removeEventListener('pointerenter', onEnter);
        word.removeEventListener('pointermove', onMove);
        word.removeEventListener('pointerleave', onLeave);
        ScrollTrigger.removeEventListener('refresh', measure);
        gsap.set(chars, { x: 0, skewX: 0 });
      };
    });
  };

  CA.init.fx = (mm) => {
    safe('cursor', () => setupCursor(mm));
    safe('hero depth', () => setupHeroDepth(mm));
    safe('tilt', () => setupTilt(mm));
    safe('ink', () => setupInk(mm));
    safe('cards', () => setupCards(mm));
    safe('ticks', () => setupTicks(mm));
    safe('stats', () => setupStats(mm));
    safe('ripple', () => setupRipple());
    safe('wordmark', () => setupWordmark(mm));
  };
})();
