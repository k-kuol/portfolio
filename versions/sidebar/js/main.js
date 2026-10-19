(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canObserve = 'IntersectionObserver' in window;

  /* ---------- mobile nav toggle (sidebar collapses to a top bar) ---------- */
  const navToggle = document.getElementById('navToggle');
  const sidebarPanel = document.getElementById('sidebarPanel');

  const closeMobileNav = () => {
    if (!navToggle || !sidebarPanel) return;
    sidebarPanel.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
  };

  if (navToggle && sidebarPanel) {
    navToggle.addEventListener('click', () => {
      const isOpen = sidebarPanel.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });
    sidebarPanel.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', closeMobileNav);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMobileNav();
    });
  }

  /* ---------- scroll-spy: highlight the sidebar link for the section in view ---------- */
  const navLinks = Array.from(document.querySelectorAll('.side-nav .nav-link'));
  const spySections = navLinks
    .map((link) => document.getElementById(link.getAttribute('href').slice(1)))
    .filter(Boolean);

  const setActiveNav = (id) => {
    navLinks.forEach((link) => {
      const match = link.getAttribute('href') === `#${id}`;
      link.classList.toggle('is-active', match);
      if (match) {
        link.setAttribute('aria-current', 'true');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  };

  if (canObserve && spySections.length) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActiveNav(entry.target.id);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    spySections.forEach((section) => spy.observe(section));
  }
  setActiveNav(spySections[0] ? spySections[0].id : 'home');

  /* ---------- reveal targets: animate in as they scroll into view ----------
     Timeline rows slide in from the left; cards and headings rise up. */
  document
    .querySelectorAll('.timeline-entry')
    .forEach((el) => el.classList.add('reveal', 'reveal--left'));
  document
    .querySelectorAll('.section-head, .skill-group, .work-card, .profile-card, .resume-details, .program-entry, .service-row, .about-grid > *, .contact-layout > *')
    .forEach((el) => el.classList.add('reveal'));

  const revealTargets = Array.from(document.querySelectorAll('.reveal'));
  const revealElement = (el) => el.classList.add('is-visible');

  if (reduceMotion || !canObserve) {
    revealTargets.forEach(revealElement);
  } else {
    const revealObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        revealElement(entry.target);
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -5% 0px' });
    revealTargets.forEach((el) => revealObserver.observe(el));

    // Safety net: guarantee nothing stays permanently invisible if the
    // observer misses an element for any reason (layout timing, etc.).
    window.setTimeout(() => {
      revealTargets.forEach((el) => {
        if (!el.classList.contains('is-visible')) revealElement(el);
      });
    }, 9000);
  }

  /* ---------- stat numbers: count up on a loop while the intro is on screen ---------- */
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
        // rAF timestamps can predate `start`, so clamp at 0 to avoid negative counts
        const progress = Math.min(Math.max((now - start) / duration, 0), 1);
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

  const statsRow = document.querySelector('.stats-row');
  if (statsRow && canObserve) {
    new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateStatNumbers();
          startStatLoop();
        } else {
          stopStatLoop();
        }
      });
    }, { threshold: 0.4 }).observe(statsRow);
  }

  /* ---------- portfolio filtering ---------- */
  const filterButtons = document.querySelectorAll('.filter-btn');
  const workCards = document.querySelectorAll('.work-card');
  const emptyState = document.getElementById('workEmpty');

  const applyFilter = (filter) => {
    let visibleCount = 0;
    workCards.forEach((card) => {
      const show = filter === 'all' || card.dataset.category === filter;
      card.classList.toggle('is-hidden', !show);
      if (show) {
        visibleCount += 1;
        card.classList.add('is-visible');
      }
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

  /* ---------- open the CV panel when linked to directly ---------- */
  const cvDetails = document.getElementById('cv');
  if (cvDetails && window.location.hash === '#cv') cvDetails.open = true;

  /* ---------- rotating platform logos (Social Media Management skill) ---------- */
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

  /* ---------- newsletter form (not wired to a mailing list yet) ---------- */
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
