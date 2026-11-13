/* ============================================
   Motion layer: intro, smooth scroll, cursor, typed roles,
   section transitions, scroll-driven effects, animated ending.
   Every part degrades quietly if GSAP / Lenis fail to load.
   ============================================ */
(() => {
  'use strict';

  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const gsap = window.gsap;
  const ST = window.ScrollTrigger;
  const canAnimate = !!gsap && !reduce;
  if (gsap && ST) gsap.registerPlugin(ST);

  const NAV_OFFSET = -96;

  /* ---------- smooth scrolling (Lenis) ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({ duration: 1.15, smoothWheel: true });
    if (gsap) {
      if (ST) lenis.on('scroll', ST.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  // let the CV dialog and the mobile menu scroll on their own
  ['cvDialog', 'navLinks'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.setAttribute('data-lenis-prevent', '');
  });
  const cvDialog = document.getElementById('cvDialog');
  if (cvDialog && lenis) {
    new MutationObserver(() => (cvDialog.open ? lenis.stop() : lenis.start()))
      .observe(cvDialog, { attributes: true, attributeFilter: ['open'] });
  }

  const scrollToEl = (el, immediate) => {
    if (lenis) {
      lenis.scrollTo(el, { offset: NAV_OFFSET, immediate, force: true });
    } else {
      const top = el.getBoundingClientRect().top + window.scrollY + NAV_OFFSET;
      window.scrollTo({ top, behavior: immediate ? 'instant' : 'smooth' });
    }
  };

  /* ---------- animated intro ---------- */
  const intro = document.getElementById('intro');
  const endIntro = () => {
    root.classList.remove('is-intro');
    try { sessionStorage.setItem('introSeen', '1'); } catch (e) { /* storage blocked */ }
    if (lenis) lenis.start();
    if (ST) ST.refresh();
  };

  if (root.classList.contains('is-intro')) {
    if (canAnimate && intro) {
      if (lenis) lenis.stop();
      const count = document.getElementById('introCount');
      const bar = document.getElementById('introBar');
      const progress = { v: 0 };
      gsap.timeline()
        .to(progress, {
          v: 100, duration: 1.7, ease: 'power2.inOut',
          onUpdate: () => {
            if (count) count.textContent = Math.round(progress.v);
            if (bar) bar.style.transform = `scaleX(${progress.v / 100})`;
          },
        }, 0)
        .from('.intro-line > span', { yPercent: 110, duration: 1, stagger: 0.12, ease: 'power4.out' }, 0.1)
        .from('.intro-tag > *', { opacity: 0, y: 12, stagger: 0.07, duration: 0.5, ease: 'power2.out' }, 0.5)
        .to('.intro-line > span', { yPercent: -110, duration: 0.6, stagger: 0.06, ease: 'power3.in' }, '+=0.2')
        .to('.intro-tag, .intro-foot', { opacity: 0, duration: 0.3 }, '<')
        .to(intro, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.95, ease: 'power4.inOut' }, '-=0.1')
        .add(endIntro, '-=0.5');
    } else {
      endIntro();
    }
  }

  /* ---------- typed developer roles ---------- */
  const rolesWord = document.getElementById('rolesWord');
  let roleTimer = null;
  const startRoles = () => {
    if (!rolesWord) return;
    window.clearTimeout(roleTimer);
    const list = ['Junior Software Engineer', 'Frontend Developer', 'Backend Developer', 'Graphic Designer', 'Digital Communications Specialist'];
    rolesWord.textContent = list[0];
    if (reduce || list.length < 2) return;

    let i = 0;
    let chars = list[0].length;
    let deleting = true;
    const tick = () => {
      const word = list[i];
      if (deleting) {
        chars -= 1;
        rolesWord.textContent = word.slice(0, chars);
        if (chars === 0) { deleting = false; i = (i + 1) % list.length; }
        roleTimer = window.setTimeout(tick, chars === 0 ? 250 : 35);
      } else {
        chars += 1;
        rolesWord.textContent = list[i].slice(0, chars);
        const done = chars === list[i].length;
        if (done) deleting = true;
        roleTimer = window.setTimeout(tick, done ? 1800 : 70);
      }
    };
    // hold the first role, then start cycling
    roleTimer = window.setTimeout(tick, root.classList.contains('is-intro') ? 4600 : 2200);
  };
  startRoles();

  /* ---------- cinematic section transitions (nav links) ---------- */
  const curtain = document.getElementById('curtain');
  const curtainLabel = document.getElementById('curtainLabel');
  let transitioning = false;

  const focusTarget = (el) => {
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  };

  const cinematicGo = (el, label) => {
    if (!canAnimate || !curtain) { scrollToEl(el, false); focusTarget(el); return; }
    transitioning = true;
    if (curtainLabel) curtainLabel.textContent = label;
    gsap.timeline({ onComplete: () => { transitioning = false; } })
      .set(curtain, { display: 'flex' })
      .fromTo(curtain, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.55, ease: 'power4.inOut' })
      .fromTo(curtainLabel, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.4, ease: 'power3.out' }, '-=0.2')
      .add(() => { scrollToEl(el, true); focusTarget(el); })
      .to(curtainLabel, { yPercent: -60, opacity: 0, duration: 0.3, ease: 'power2.in' }, '+=0.2')
      .to(curtain, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.65, ease: 'power4.inOut' }, '-=0.1')
      .set(curtain, { display: 'none' });
  };

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link || link.classList.contains('skip-link') || e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const id = link.getAttribute('href').slice(1);
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    if (transitioning) return;

    const isNav = link.matches('.nav-link, .nav-cta, .nav-brand, .footer-nav a');
    if (isNav) cinematicGo(target, link.textContent.replace(/[↑↗→]/g, '').trim() || 'Kuol.');
    else if (lenis) lenis.scrollTo(target, { offset: NAV_OFFSET });
    else scrollToEl(target, false);
    history.replaceState(null, '', `#${id}`);
  });

  /* ---------- custom cursor ---------- */
  const cursor = document.getElementById('cursor');
  const cursorDot = document.getElementById('cursorDot');
  const cursorLabel = document.getElementById('cursorLabel');

  if (finePointer && cursor && cursorDot) {
    root.classList.add('has-cursor');
    document.querySelectorAll('.work-card .work-media').forEach((el) => { el.dataset.cursor = el.dataset.cursor || 'View'; });
    document.querySelectorAll('.joy-slides').forEach((el) => { el.dataset.cursor = el.dataset.cursor || 'Next'; });

    let mx = -100; let my = -100; let rx = mx; let ry = my;
    const follow = reduce ? 1 : 0.18;

    window.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      cursorDot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      cursor.classList.remove('is-hidden');
      cursorDot.classList.remove('is-hidden');
    }, { passive: true });

    const loop = () => {
      rx += (mx - rx) * follow;
      ry += (my - ry) * follow;
      cursor.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    document.addEventListener('mouseover', (e) => {
      const t = e.target;
      const labelled = t.closest('[data-cursor]');
      const interactive = t.closest('a, button, label, summary, [role="button"]');
      const textField = t.closest('input, textarea, select');
      const label = labelled && !interactive?.matches('.btn') ? labelled.dataset.cursor : '';
      cursor.classList.toggle('has-label', !!label);
      cursor.classList.toggle('is-hover', !!interactive && !label);
      cursor.classList.toggle('is-text', !!textField);
      cursorDot.classList.toggle('is-text', !!textField || !!label);
      if (cursorLabel) cursorLabel.textContent = label;
    });

    document.addEventListener('mouseleave', () => {
      cursor.classList.add('is-hidden');
      cursorDot.classList.add('is-hidden');
    });
    window.addEventListener('mousedown', () => cursor.classList.add('is-down'));
    window.addEventListener('mouseup', () => cursor.classList.remove('is-down'));
  }

  /* ---------- magnetic buttons ---------- */
  if (finePointer && canAnimate) {
    document.querySelectorAll('[data-magnetic], .social-chip, .nav-cta').forEach((el) => {
      const strength = el.classList.contains('social-chip') ? 0.45 : 0.3;
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - (r.left + r.width / 2)) * strength;
        const y = (e.clientY - (r.top + r.height / 2)) * strength;
        gsap.to(el, { x, y, duration: 0.4, ease: 'power3.out' });
      });
      el.addEventListener('mouseleave', () => {
        gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.4)' });
      });
    });
  }

  /* ---------- scroll-driven experiences (GSAP + ScrollTrigger) ---------- */
  const footerMark = document.getElementById('footerMark');
  if (footerMark) {
    // split the giant footer name into letters for the ending
    const text = footerMark.textContent;
    footerMark.textContent = '';
    Array.from(text).forEach((ch) => {
      const s = document.createElement('span');
      s.className = 'ch';
      s.textContent = ch === ' ' ? ' ' : ch;
      footerMark.appendChild(s);
    });
  }

  if (!canAnimate || !ST) return;

  // dark sections open up like a widening frame
  gsap.utils.toArray('.section--dark').forEach((sec) => {
    gsap.fromTo(sec,
      { clipPath: 'inset(0% 4% 0% 4% round 48px)' },
      {
        clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none',
        scrollTrigger: { trigger: sec, start: 'top bottom', end: 'top 25%', scrub: true },
      });
  });

  // the ending: a thank-you line, then the name rises letter by letter
  gsap.from('.ending > *', {
    y: 40, opacity: 0, stagger: 0.12, ease: 'power3.out', duration: 1,
    scrollTrigger: { trigger: '.ending', start: 'top 85%' },
  });
  if (footerMark) {
    gsap.from(footerMark.children, {
      yPercent: 110, rotate: 6, opacity: 0, stagger: 0.05, ease: 'none',
      scrollTrigger: { trigger: footerMark, start: 'top bottom', end: 'bottom bottom', scrub: 0.6 },
    });
  }

  window.addEventListener('load', () => ST.refresh());
})();
