/* =========================================================
   Closing — demo form · footer
   ========================================================= */
(() => {
  'use strict';
  const CA = window.CA;
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!CA) return;
  const { $, $$ } = CA;

  /**
   * Demo request hand-off.
   * The page ships as a static front-end, so this resolves locally.
   * Replace the body with a real call, e.g.
   *   const res = await fetch('/api/demo-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
   *   if (!res.ok) throw new Error('Request failed');
   */
  CA.submitDemo = (data) =>
    new Promise((resolve) => {
      console.info('[Core Agency] demo request (not sent — wire up CA.submitDemo):', data);
      setTimeout(resolve, 900);
    });

  const initForm = () => {
    const form = $('[data-form]');
    if (!form) return;
    const done = $('[data-done]', form);
    const submit = $('button[type="submit"]', form);
    const labels = $$('.roll__in > span', submit);

    const rules = {
      business: (v) => (v.trim() ? '' : 'Please tell us your business name.'),
      name: (v) => (v.trim() ? '' : 'Please tell us your name.'),
      phone: (v) => (v.replace(/\D/g, '').length >= 8 ? '' : 'Enter a phone number we can call.'),
      email: (v) => (!v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'That email address doesn’t look right.'),
      type: (v) => (v ? '' : 'Choose your business type.'),
      outlets: (v) => (v ? '' : 'How many outlets do you run?'),
    };
    const check = (el) => {
      const rule = rules[el.name];
      if (!rule) return true;
      const msg = rule(el.value);
      const field = el.closest('.field');
      field.classList.toggle('is-invalid', Boolean(msg));
      $('.field__err', field).textContent = msg;
      el.setAttribute('aria-invalid', msg ? 'true' : 'false');
      return !msg;
    };
    const controls = () => $$('input, select, textarea', form).filter((el) => el.name && rules[el.name]);

    form.addEventListener('input', (e) => { if (e.target.closest('.field.is-invalid')) check(e.target); });
    form.addEventListener('focusout', (e) => { if (e.target.name && e.target.value) check(e.target); });
    form.addEventListener('change', (e) => { if (e.target.name) check(e.target); });

    const setLabel = (text) => labels.forEach((l) => { l.textContent = text; });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (form.elements.website && form.elements.website.value) return; // honeypot

      const results = controls().map(check);
      if (results.includes(false)) {
        const bad = controls().find((el) => el.closest('.field.is-invalid'));
        if (bad) bad.focus();
        if (!CA.reduced) gsap.fromTo(form, { x: -10 }, { x: 0, duration: 0.7, ease: 'elastic.out(1, 0.35)', clearProps: 'transform' });
        return;
      }

      const original = labels[0] ? labels[0].textContent : '';
      submit.disabled = true;
      setLabel('Sending…');
      try {
        await CA.submitDemo(Object.fromEntries(new FormData(form)));
        done.hidden = false;
        if (!CA.reduced) {
          gsap.fromTo(done, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 });
          gsap.from(done.children, { y: 24, autoAlpha: 0, duration: 0.8, stagger: 0.08, delay: 0.15, ease: 'expo.out' });
        }
        const done_h3 = $('h3', done);
        if (done_h3) { done_h3.setAttribute('tabindex', '-1'); done_h3.focus({ preventScroll: true }); }
      } catch (err) {
        console.error(err);
        setLabel('Something went wrong — try again');
        setTimeout(() => setLabel(original), 2600);
      } finally {
        submit.disabled = false;
        if (labels[0] && labels[0].textContent === 'Sending…') setLabel(original);
      }
    });

    const again = $('[data-again]', form);
    if (again) {
      again.addEventListener('click', () => {
        form.reset();
        $$('.field.is-invalid', form).forEach((f) => f.classList.remove('is-invalid'));
        $$('.field__err', form).forEach((n) => { n.textContent = ''; });
        done.hidden = true;
        const first = $('input', form);
        if (first) first.focus({ preventScroll: true });
      });
    }
  };

  const initFooter = (mm) => {
    const word = $('[data-footer-word]');
    if (!word) return;
    const text = word.textContent.trim();
    word.textContent = '';
    const chars = Array.from(text).map((ch) => {
      const s = document.createElement('span');
      s.className = 'ch';
      s.textContent = ch === ' ' ? ' ' : ch;
      word.appendChild(s);
      return s;
    });

    // The wordmark is sized in vw for the Pixel OS face. A wider fallback face, used when the
    // web font can't load, would clip its last letter, so shrink it just enough to fit. No-op once the real font is in.
    const first = chars[0];
    const last = chars[chars.length - 1];
    const fitWord = () => {
      const before = word.style.fontSize;
      word.style.fontSize = '';
      for (let i = 0; i < 2; i++) {
        const room = word.clientWidth;
        const need = last.getBoundingClientRect().right - first.getBoundingClientRect().left;
        if (!room || !need || need <= room * 0.96) break;
        word.style.fontSize = `${(parseFloat(getComputedStyle(word).fontSize) * room * 0.96 / need).toFixed(2)}px`;
      }
      return word.style.fontSize !== before;
    };
    fitWord();
    let fitT;
    const refit = () => { clearTimeout(fitT); fitT = setTimeout(() => { if (fitWord()) ScrollTrigger.refresh(); }, 150); };
    window.addEventListener('resize', refit);
    if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', refit);

    mm.add(CA.mq.motion, () => {
      gsap.set(chars, { yPercent: 108 });
      gsap.to(chars, {
        yPercent: 0, ease: 'none', stagger: 0.06,
        scrollTrigger: { trigger: '.chapter--last', start: 'bottom 98%', end: 'bottom 28%', scrub: true },
      });
    });
  };

  CA.init.close = (mm) => {
    initForm();
    initFooter(mm);

    mm.add(CA.mq.motion, () => {
      const form = $('[data-form]');
      if (!form) return;
      gsap.set(form, { autoAlpha: 0, y: 70 });
      ScrollTrigger.create({
        trigger: form, start: 'top 85%', once: true,
        onEnter: () => {
          if (CA.isPast(form)) { gsap.set(form, { clearProps: 'transform,opacity,visibility' }); return; }
          gsap.to(form, { autoAlpha: 1, y: 0, duration: 1.3, ease: 'expo.out', onComplete: () => gsap.set(form, { clearProps: 'transform,opacity,visibility' }) });
        },
      });
    });
  };
})();
