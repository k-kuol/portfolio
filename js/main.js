(() => {
  'use strict';

  /* ---------- mobile nav toggle ---------- */
  const navToggle = document.getElementById('navToggle');
  const primaryNav = document.getElementById('primaryNav');

  const closeMobileNav = () => {
    if (!navToggle || !primaryNav) return;
    primaryNav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
  };

  if (navToggle && primaryNav) {
    navToggle.addEventListener('click', () => {
      const isOpen = primaryNav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  /* ---------- reveal targets: faded in by revealPanel() on each panel show ---------- */
  document
    .querySelectorAll('.work-card, .service-card, .program-entry, .timeline-entry, .about-grid > *, .approach-card, .method-card, .profile-card, .skill-card, .education-card, .contact-row')
    .forEach((el) => el.classList.add('reveal'));

  /* ---------- panel navigation (no scrolling between sections) ---------- */
  const panels = Array.from(document.querySelectorAll('.panel'));
  const panelMap = new Map(panels.map((p) => [p.dataset.panel, p]));
  const navLinks = document.querySelectorAll('.nav-link, [data-panel-link]');

  const revealPanel = (panel) => {
    const targets = panel.querySelectorAll('.reveal');
    targets.forEach((el) => el.classList.remove('is-visible'));
    // Force reflow so the removed class registers before re-adding it.
    void panel.offsetWidth;
    requestAnimationFrame(() => {
      targets.forEach((el) => el.classList.add('is-visible'));
    });
  };

  /* ---------- stat numbers: count up on a loop while the home panel is visible ---------- */
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let statInterval = null;

  const animateStatNumbers = () => {
    document.querySelectorAll('.stat-number').forEach((el) => {
      if (!el.dataset.target) {
        const match = el.textContent.trim().match(/^(\d+)(\D*)$/);
        if (!match) return;
        el.dataset.target = match[1];
        el.dataset.suffix = match[2] || '';
      }
      const target = parseInt(el.dataset.target, 10);
      const suffix = el.dataset.suffix;
      if (reduceMotion) {
        el.textContent = `${target}${suffix}`;
        return;
      }
      const duration = 1200;
      const start = performance.now();
      const step = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        el.textContent = `${Math.round(progress * target)}${suffix}`;
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  };

  const startStatLoop = () => {
    if (statInterval || reduceMotion) return;
    statInterval = setInterval(animateStatNumbers, 5000);
  };
  const stopStatLoop = () => {
    if (!statInterval) return;
    clearInterval(statInterval);
    statInterval = null;
  };

  const setActiveNav = (name) => {
    navLinks.forEach((link) => {
      const match = link.dataset.panelLink === name;
      link.classList.toggle('is-active', match);
      if (match) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  };

  const showPanel = (name, { scrollTarget } = {}) => {
    const target = panelMap.get(name) || panelMap.get('home');
    if (!target) return;
    panels.forEach((p) => { p.hidden = p !== target; });
    setActiveNav(target.dataset.panel);
    revealPanel(target);
    if (target.dataset.panel === 'home') {
      animateStatNumbers();
      startStatLoop();
    } else {
      stopStatLoop();
    }
    if (scrollTarget) {
      requestAnimationFrame(() => {
        scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  };

  /* ---------- page loader: profile photo shown briefly between panel switches ---------- */
  const pageLoader = document.getElementById('pageLoader');
  let isTransitioning = false;

  const navigateTo = (name, { pushHistory = true, scrollTarget } = {}) => {
    if (!panelMap.has(name)) return;
    if (isTransitioning) return;

    const finish = () => {
      showPanel(name, { scrollTarget });
      if (pushHistory) {
        history.pushState({ panel: name }, '', `#${scrollTarget ? scrollTarget.id : name}`);
      }
      closeMobileNav();
    };

    if (!pageLoader || reduceMotion) {
      finish();
      return;
    }

    isTransitioning = true;
    pageLoader.classList.add('is-active');
    setTimeout(() => {
      finish();
      pageLoader.classList.remove('is-active');
      isTransitioning = false;
    }, 1000);
  };

  if (panels.length) {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;
      const name = link.getAttribute('href').slice(1);

      if (panelMap.has(name)) {
        e.preventDefault();
        navigateTo(name);
        return;
      }

      // Not a panel name — see if it's a specific card/section living inside a panel.
      const target = document.getElementById(name);
      const targetPanel = target && target.closest('.panel');
      if (!targetPanel) return; // unknown target — let native anchor behavior run
      e.preventDefault();
      navigateTo(targetPanel.dataset.panel, { scrollTarget: target });
    });

    window.addEventListener('popstate', (e) => {
      const name = (e.state && e.state.panel) || window.location.hash.slice(1) || 'home';
      showPanel(panelMap.has(name) ? name : 'home');
    });

    const initial = window.location.hash.slice(1);
    if (panelMap.has(initial)) {
      showPanel(initial);
    } else {
      const initialTarget = document.getElementById(initial);
      const initialPanel = initialTarget && initialTarget.closest('.panel');
      showPanel(initialPanel ? initialPanel.dataset.panel : 'home', { scrollTarget: initialTarget || undefined });
    }
  }

  /* ---------- portfolio filtering ---------- */
  const filterButtons = document.querySelectorAll('.filter-btn');
  const workCards = document.querySelectorAll('.work-card');
  const emptyState = document.getElementById('workEmpty');

  const applyFilter = (filter) => {
    let visibleCount = 0;
    workCards.forEach((card) => {
      const show = card.dataset.category === filter;
      card.classList.toggle('is-hidden', !show);
      if (show) visibleCount += 1;
    });
    if (emptyState) emptyState.hidden = visibleCount !== 0;
  };

  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterButtons.forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      applyFilter(btn.dataset.filter);
    });
  });

  if (filterButtons.length) {
    const initialBtn = document.querySelector('.filter-btn.is-active') || filterButtons[0];
    applyFilter(initialBtn.dataset.filter);
  }

  /* ---------- rotating platform logos (e.g. Social Media Management skill) ---------- */
  document.querySelectorAll('.skill-icon--rotate').forEach((icon) => {
    const logos = Array.from(icon.querySelectorAll('.rotate-logo'));
    if (logos.length < 2) return;
    let index = logos.findIndex((el) => el.classList.contains('is-active'));
    if (index < 0) index = 0;
    setInterval(() => {
      logos[index].classList.remove('is-active');
      index = (index + 1) % logos.length;
      logos[index].classList.add('is-active');
    }, 1800);
  });

  /* ---------- footer newsletter form (not wired to a mailing list yet) ---------- */
  const newsletterForm = document.getElementById('newsletterForm');
  const newsletterNote = document.getElementById('newsletterNote');
  if (newsletterForm && newsletterNote) {
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      newsletterNote.hidden = false;
      newsletterForm.reset();
    });
  }
})();
