(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canObserve = 'IntersectionObserver' in window;

  /* ---------- mobile nav toggle ---------- */
  const navToggle = document.getElementById('navToggle');
  const navLinksEl = document.getElementById('navLinks');

  const closeMobileNav = () => {
    if (!navToggle || !navLinksEl) return;
    navLinksEl.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
  };

  if (navToggle && navLinksEl) {
    navToggle.addEventListener('click', () => {
      const isOpen = navLinksEl.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });
    navLinksEl.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMobileNav));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMobileNav(); });
  }

  /* ---------- scroll progress bar + nav shadow ---------- */
  const progress = document.getElementById('scrollProgress');
  const navShell = document.querySelector('.nav-shell');
  let ticking = false;
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? window.scrollY / max : 0;
    if (progress) progress.style.transform = `scaleX(${ratio})`;
    if (navShell) navShell.classList.toggle('is-scrolled', window.scrollY > 40);
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  /* ---------- scroll-spy: highlight the nav link for the section in view ---------- */
  const navLinks = Array.from(document.querySelectorAll('.nav-link'));
  const spySections = navLinks
    .map((link) => document.getElementById(link.getAttribute('href').slice(1)))
    .filter(Boolean);

  if (canObserve && spySections.length) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => {
          const match = link.getAttribute('href') === `#${entry.target.id}`;
          link.classList.toggle('is-active', match);
          if (match) link.setAttribute('aria-current', 'true');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    spySections.forEach((s) => spy.observe(s));
    // clear the highlight while the hero is on screen
    const hero = document.getElementById('home');
    if (hero) spy.observe(hero);
  }

  /* ---------- marquees: duplicate content so the loop is seamless ---------- */
  document.querySelectorAll('[data-marquee]').forEach((track) => {
    Array.from(track.children).forEach((child) => {
      const clone = child.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    });
  });

  /* ---------- stacking work cards: index drives the sticky offset ---------- */
  const workCards = Array.from(document.querySelectorAll('.work-card'));
  const reindexCards = () => {
    workCards
      .filter((card) => !card.classList.contains('is-hidden'))
      .forEach((card, i) => card.style.setProperty('--i', i));
  };
  reindexCards();

  /* ---------- reveal on scroll ---------- */
  document
    .querySelectorAll('.section-head, .tile, .xp-intro, .xp-item, .program-card, .service-row, .contact-card, .filters')
    .forEach((el) => el.classList.add('reveal'));
  document.querySelectorAll('.bento .tile').forEach((el, i) => el.style.setProperty('--d', `${(i % 4) * 0.07}s`));
  document.querySelectorAll('.xp-item').forEach((el, i) => el.style.setProperty('--d', `${i * 0.08}s`));

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
    }, { threshold: 0.08, rootMargin: '0px 0px -5% 0px' });
    revealTargets.forEach((el) => revealObserver.observe(el));

    // Safety net so nothing stays invisible if the observer misses an element.
    window.setTimeout(() => revealTargets.forEach(revealElement), 9000);
  }

  /* ---------- stat numbers: count up when the bento scrolls into view ---------- */
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
      const duration = 1400;
      const start = performance.now();
      const step = (now) => {
        // rAF timestamps can predate `start`, so clamp at 0 to avoid negative counts
        const p = Math.min(Math.max((now - start) / duration, 0), 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = `${Math.round(eased * target)}${suffix}`;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  };

  const firstStat = document.querySelector('.tile--stat');
  if (firstStat && canObserve) {
    new IntersectionObserver((entries, obs) => {
      if (entries.some((e) => e.isIntersecting)) {
        animateStatNumbers();
        obs.disconnect();
      }
    }, { threshold: 0.5 }).observe(firstStat);
  }

  /* ---------- skill cards: rotate positions every 5 seconds ----------
     The first card moves to the end; every card glides from its old spot
     to its new one (FLIP). Runs only while the deck is on screen and pauses
     while a card is hovered or focused. */
  const deck = document.querySelector('.skill-cards');
  if (deck && deck.children.length > 1 && !reduceMotion && canObserve) {
    let deckTimer = null;
    let deckHeld = false;

    const rotateDeck = () => {
      if (deckHeld) return;
      const cards = Array.from(deck.children);
      const before = new Map(cards.map((c) => [c, c.getBoundingClientRect()]));
      deck.appendChild(cards[0]);
      cards.forEach((card) => {
        const a = before.get(card);
        const b = card.getBoundingClientRect();
        const dx = a.left - b.left;
        const dy = a.top - b.top;
        if (!dx && !dy) return;
        card.animate(
          [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }],
          { duration: 800, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
        );
      });
    };

    const startDeck = () => { if (!deckTimer) deckTimer = setInterval(rotateDeck, 5000); };
    const stopDeck = () => { clearInterval(deckTimer); deckTimer = null; };

    new IntersectionObserver((entries) => {
      entries.forEach((entry) => (entry.isIntersecting ? startDeck() : stopDeck()));
    }, { threshold: 0.3 }).observe(deck);

    deck.addEventListener('mouseenter', () => { deckHeld = true; });
    deck.addEventListener('mouseleave', () => { deckHeld = false; });
    deck.addEventListener('focusin', () => { deckHeld = true; });
    deck.addEventListener('focusout', () => { deckHeld = false; });
  }

  /* ---------- little joys: click a photo stack to show the next one ---------- */
  document.querySelectorAll('.joy-slides').forEach((stack) => {
    const slides = Array.from(stack.querySelectorAll('.joy-slide'));
    const count = stack.querySelector('.joy-count');
    let current = Math.max(0, slides.findIndex((s) => s.classList.contains('is-active')));
    const show = (i) => {
      slides[current].classList.remove('is-active');
      current = i;
      slides[current].classList.add('is-active');
      if (count) count.textContent = `${current + 1}/${slides.length}`;
    };
    if (slides.length < 2) {
      const hint = stack.querySelector('.joy-hint');
      if (hint) hint.hidden = true;
      return;
    }
    show(current);
    stack.addEventListener('click', () => show((current + 1) % slides.length));
  });

  /* ---------- portfolio filtering ---------- */
  const filterButtons = document.querySelectorAll('.filter-btn');
  const emptyState = document.getElementById('workEmpty');

  const applyFilter = (filter) => {
    let visibleCount = 0;
    workCards.forEach((card) => {
      const show = filter === 'all' || card.dataset.category === filter;
      card.classList.toggle('is-hidden', !show);
      if (show) visibleCount += 1;
    });
    reindexCards();
    if (emptyState) emptyState.hidden = visibleCount !== 0;
  };

  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterButtons.forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      applyFilter(btn.dataset.filter);
    });
  });

  /* ---------- full CV dialog ---------- */
  const cvDialog = document.getElementById('cvDialog');
  const openCv = document.getElementById('openCv');
  const closeCv = document.getElementById('closeCv');
  if (cvDialog && openCv && typeof cvDialog.showModal === 'function') {
    openCv.addEventListener('click', () => cvDialog.showModal());
    if (closeCv) closeCv.addEventListener('click', () => cvDialog.close());
    // click on the backdrop closes it
    cvDialog.addEventListener('click', (e) => {
      if (e.target === cvDialog) cvDialog.close();
    });
  } else if (openCv) {
    // very old browsers: fall back to the PDF
    openCv.addEventListener('click', () => {
      window.location.href = 'assets/cv/Kuol_Akech_Riak_Kuol_CV.pdf?v=6';
    });
  }

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
