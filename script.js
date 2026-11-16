/* ==========================================================================
   Karthikeyan Shanmugaraj — Portfolio (Apple-style edition) · script.js
   --------------------------------------------------------------------------
   Vanilla ES6+, zero dependencies. Every feature is a small init function,
   called at the bottom — comment one out to disable it.

   TABLE OF CONTENTS
     0. CONFIG  ← the only part you normally need to edit
     1. Helpers & the shared scroll engine
     2. Bind config to the page
     3. Navigation: mobile menu, scroll-spy
     4. Reveal, word-highlight, counters, marquee
     5. Scroll-linked effects: hero, progress, timeline, pinned story
     6. Pointer effects: hero parallax, tilt, spotlight, magnetic buttons
     7. Projects scroller
     8. Hub tabs (segmented control)
     9. Dialogs: resume preview + award lightbox
    10. Copy-to-clipboard, toast, placeholder links
   ========================================================================== */
(() => {
  'use strict';

  /* ------------------------------------------------------------------------
     0. CONFIG — edit these, then you're done.
     ------------------------------------------------------------------------ */
  const CONFIG = {
    // Keep your PDF next to index.html under this name (or change it here).
    resumeFile: 'Karthikeyan_Resume.pdf',

    email:    'karthikeyanautomationengineer@gmail.com',
    linkedin: 'https://www.linkedin.com/in/karthikeyan-s-automation',

    // Add your GitHub profile URL, e.g. 'https://github.com/your-username'.
    // While empty, GitHub links show a "Link coming soon" toast.
    github: '',
  };

  /* ------------------------------------------------------------------------
     1. HELPERS & SHARED SCROLL ENGINE
     ------------------------------------------------------------------------ */
  const $  = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const clamp = (n, min = 0, max = 1) => Math.min(max, Math.max(min, n));

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer  = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const root = document.documentElement;

  /* One rAF-throttled scroll loop for every scroll-linked effect.
     Each registered "reader" measures and returns a "writer" (or null) —
     all reads happen before all writes, so there's no layout thrashing. */
  const readers = [];
  let scrollQueued = false;

  function runScrollEngine() {
    scrollQueued = false;
    const writers = readers.map((read) => read());
    writers.forEach((write) => write && write());
  }
  function queueScroll() {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(runScrollEngine);
  }
  function onScrollFrame(reader) { readers.push(reader); }

  /* ------------------------------------------------------------------------
     2. BIND CONFIG TO THE PAGE
     ------------------------------------------------------------------------ */
  function bindConfig() {
    $$('[data-resume-download], [data-resume-open]').forEach((a) => {
      a.setAttribute('href', CONFIG.resumeFile);
      if (a.hasAttribute('download')) a.setAttribute('download', CONFIG.resumeFile);
    });

    $$('[data-link="email"]').forEach((a) => {
      a.setAttribute('href', `mailto:${CONFIG.email}`);
      if (a.classList.contains('copy-row__value')) {
        // Prefer wrapping at the "@" over breaking the address mid-word on narrow screens.
        const [local, domain] = CONFIG.email.split('@');
        a.textContent = '';
        a.append(local, document.createElement('wbr'), `@${domain}`);
      }
    });

    $$('[data-link="linkedin"]').forEach((a) => {
      a.setAttribute('href', CONFIG.linkedin);
      if (a.classList.contains('copy-row__value')) a.textContent = CONFIG.linkedin.replace(/^https?:\/\/(www\.)?/, '');
    });

    if (CONFIG.github) {
      $$('[data-link="github"]').forEach((a) => {
        a.setAttribute('href', CONFIG.github);
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener');
      });
    }

    const year = $('#year');
    if (year) year.textContent = new Date().getFullYear();
  }

  /* ------------------------------------------------------------------------
     3. NAVIGATION
     ------------------------------------------------------------------------ */
  function initMenu() {
    const button = $('.menu-btn');
    const menu = $('#menu');
    if (!button || !menu) return;

    const behind = [$('#main'), $('.footer')].filter(Boolean);
    const isOpen = () => root.classList.contains('menu-open');

    const setOpen = (open, { returnFocus = true } = {}) => {
      root.classList.toggle('menu-open', open);
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      behind.forEach((el) => { el.inert = open; });          // keep keyboard focus inside the menu
      if (open) requestAnimationFrame(() => $('a', menu)?.focus());
      else if (returnFocus) button.focus();
    };

    button.addEventListener('click', () => setOpen(!isOpen()));
    // Navigating from the menu: unlock scroll first so the smooth anchor jump works.
    $$('a', menu).forEach((a) => a.addEventListener('click', () => setOpen(false, { returnFocus: false })));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) setOpen(false); });
    window.matchMedia('(min-width: 56rem)').addEventListener('change', (e) => { if (e.matches && isOpen()) setOpen(false, { returnFocus: false }); });
  }

  /* Highlights the nav link of the section crossing the middle of the viewport.
     A section's  data-nav="x"  says which link (#x) it belongs to. */
  function initScrollSpy() {
    if (!('IntersectionObserver' in window)) return;
    const links = $$('.nav__links a, .menu__links a');
    const sections = $$('main [data-nav]');
    const hero = $('[data-hero]');

    const setActive = (key) => links.forEach((a) => {
      const on = Boolean(key) && a.getAttribute('href') === `#${key}`;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target === hero ? null : entry.target.dataset.nav);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach((s) => observer.observe(s));
    if (hero) observer.observe(hero);
  }

  /* ------------------------------------------------------------------------
     4. REVEAL, WORDS, COUNTERS, MARQUEE
     ------------------------------------------------------------------------ */
  function initReveal() {
    $$('[data-stagger]').forEach((group) => {
      $$(':scope > .reveal', group).forEach((el, i) => {
        if (!el.style.getPropertyValue('--d')) el.style.setProperty('--d', `${Math.min(i, 6) * 80}ms`);
      });
    });

    const items = $$('.reveal');
    if (!('IntersectionObserver' in window)) { items.forEach((el) => el.classList.add('is-visible')); return; }

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    items.forEach((el) => observer.observe(el));
  }

  /* Splits [data-words] text into word spans (keeping inline markup like <strong>) and
     lights them up one by one as the paragraph scrolls through the viewport. */
  function initWords() {
    const blocks = $$('[data-words]').map((el) => {
      const words = [];
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const textNodes = [];
      while (walker.nextNode()) textNodes.push(walker.currentNode);

      textNodes.forEach((node) => {
        const fragment = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { fragment.append(part); return; }
          const span = document.createElement('span');
          span.className = 'w';
          span.textContent = part;
          fragment.append(span);
          words.push(span);
        });
        node.replaceWith(fragment);
      });
      return { el, words, last: [] };
    });

    if (reduceMotion) { blocks.forEach((b) => b.words.forEach((w) => w.style.setProperty('--o', '1'))); return; }

    blocks.forEach((block) => onScrollFrame(() => {
      const rect = block.el.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = clamp((vh * 0.88 - rect.top) / (vh * 0.43 + rect.height));
      return () => {
        const n = block.words.length;
        block.words.forEach((word, i) => {
          const o = (0.2 + 0.8 * clamp(progress * (n + 3) - i)).toFixed(2);
          if (block.last[i] !== o) { block.last[i] = o; word.style.setProperty('--o', o); }
        });
      };
    }));
  }

  function initCounters() {
    const counters = $$('[data-count]');
    if (!counters.length || reduceMotion || !('IntersectionObserver' in window)) return;

    const format = (el, value) => `${el.dataset.prefix || ''}${Math.round(value)}${el.dataset.suffix || ''}`;
    const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

    const run = (el) => {
      const target = Number(el.dataset.count);
      const start = performance.now();
      const duration = 1800;
      const frame = (now) => {
        const t = clamp((now - start) / duration);
        el.textContent = format(el, target * easeOutExpo(t));
        if (t < 1) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    };

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        obs.unobserve(entry.target);
        run(entry.target);
      });
    }, { threshold: 0.6 });

    counters.forEach((el) => { el.textContent = format(el, 0); observer.observe(el); });
  }

  /* Infinite tool marquee: duplicate the list once and slide by -50%. */
  function initMarquee() {
    const marquee = $('[data-marquee]');
    if (!marquee || reduceMotion) return;
    const track = $('.marquee__track', marquee);
    const group = $('.marquee__group', marquee);
    if (!track || !group) return;

    const clone = group.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    track.append(clone);
    marquee.classList.add('is-running');
  }

  /* ------------------------------------------------------------------------
     5. SCROLL-LINKED EFFECTS
     ------------------------------------------------------------------------ */
  function initScrollLinked() {
    // Thin rainbow page-progress bar.
    const bar = $('.progress');
    if (bar) {
      onScrollFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const p = max > 0 ? clamp(window.scrollY / max) : 0;
        return () => bar.style.setProperty('--sp', p.toFixed(4));
      });
    }

    if (reduceMotion) return;

    // Hero fades/scales away as you scroll past it (--hp: 0 → 1).
    const hero = $('[data-hero]');
    if (hero) {
      let last = -1;
      onScrollFrame(() => {
        const p = clamp(window.scrollY / (hero.offsetHeight * 0.8));
        if (p === last) return null;
        return () => { last = p; hero.style.setProperty('--hp', p.toFixed(3)); };
      });
    }

    // Timeline line draws itself (--tp: 0 → 1).
    $$('[data-timeline]').forEach((timeline) => {
      onScrollFrame(() => {
        const rect = timeline.getBoundingClientRect();
        const p = clamp((window.innerHeight * 0.62 - rect.top) / rect.height);
        return () => timeline.style.setProperty('--tp', p.toFixed(3));
      });
    });
  }

  /* Pinned story: on tall desktop screens the section pins and scroll position picks the active step.
     Everywhere else (phones, short screens, reduced motion) it's a normal stacked list. */
  function initStory() {
    const story = $('[data-story]');
    if (!story) return;

    const steps = $$('.step', story);
    const navItems = $$('.story__nav li', story);
    const pinnedQuery = window.matchMedia('(min-width: 64rem) and (min-height: 36rem)');
    let activeIndex = -1;

    const activate = (index) => {
      if (index === activeIndex) return;
      activeIndex = index;
      steps.forEach((step, i) => step.classList.toggle('is-active', i === index));
      navItems.forEach((item, i) => item.classList.toggle('is-active', i === index));
    };

    // Stacked mode: each step "activates" (runs its animations) as it scrolls into view.
    let stackedObserver = null;
    const enableStacked = () => {
      if (!('IntersectionObserver' in window)) { steps.forEach((s) => s.classList.add('is-active')); return; }
      stackedObserver = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-active');
          obs.unobserve(entry.target);
        });
      }, { threshold: 0.25 });
      steps.forEach((s) => { s.classList.remove('is-active'); stackedObserver.observe(s); });
    };

    const apply = () => {
      const pinned = pinnedQuery.matches && !reduceMotion;
      story.classList.toggle('story--pinned', pinned);
      if (stackedObserver) { stackedObserver.disconnect(); stackedObserver = null; }
      activeIndex = -1;
      if (pinned) activate(0); else enableStacked();
      queueScroll();
    };
    pinnedQuery.addEventListener('change', apply);
    apply();

    onScrollFrame(() => {
      if (!story.classList.contains('story--pinned')) return null;
      const rect = story.getBoundingClientRect();
      const total = story.offsetHeight - window.innerHeight;
      const p = total > 0 ? clamp(-rect.top / total) : 0;
      const index = Math.min(steps.length - 1, Math.floor(p * steps.length));
      return () => { story.style.setProperty('--story-p', p.toFixed(3)); activate(index); };
    });
  }

  /* ------------------------------------------------------------------------
     6. POINTER EFFECTS (fine pointers only, skipped for reduced motion)
     ------------------------------------------------------------------------ */
  function initPointerEffects() {
    if (!finePointer || reduceMotion) return;

    // Hero: floating cards drift at different depths, the window tilts toward the cursor.
    const hero = $('[data-hero]');
    const stage = $('.hero__stage');
    const win = $('.hero__window');
    if (hero && stage && win) {
      hero.addEventListener('pointermove', (e) => {
        const rect = hero.getBoundingClientRect();
        const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
        stage.style.setProperty('--mx', nx.toFixed(3));
        stage.style.setProperty('--my', ny.toFixed(3));
        win.style.setProperty('--ry', `${(nx * 6).toFixed(2)}deg`);
        win.style.setProperty('--rx', `${(-ny * 4).toFixed(2)}deg`);
      }, { passive: true });
      hero.addEventListener('pointerleave', () => {
        ['--mx', '--my', '--rx', '--ry'].forEach((v) => { stage.style.removeProperty(v); win.style.removeProperty(v); });
      });
    }

    // Generic tilt (resume sheet).
    $$('[data-tilt]:not(.hero__window)').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        el.style.setProperty('--ry', `${(x * 5).toFixed(2)}deg`);
        el.style.setProperty('--rx', `${(-y * 4).toFixed(2)}deg`);
      }, { passive: true });
      el.addEventListener('pointerleave', () => { el.style.removeProperty('--rx'); el.style.removeProperty('--ry'); });
    });

    // Card spotlight — one delegated listener, rAF-throttled.
    let frame = 0;
    document.addEventListener('pointermove', (e) => {
      const card = e.target instanceof Element ? e.target.closest('.tile, .sheet') : null;
      if (!card || frame) return;
      frame = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
        card.style.setProperty('--my', `${e.clientY - rect.top}px`);
        frame = 0;
      });
    }, { passive: true });

    // Magnetic + glow buttons.
    $$('.btn--magnetic').forEach((btn) => {
      const pull = 0.28;
      btn.addEventListener('pointermove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        btn.style.setProperty('--gx', `${x}px`);
        btn.style.setProperty('--gy', `${y}px`);
        btn.style.setProperty('--tx', `${((x - rect.width / 2) * pull).toFixed(1)}px`);
        btn.style.setProperty('--ty', `${((y - rect.height / 2) * pull * 1.2).toFixed(1)}px`);
      });
      btn.addEventListener('pointerleave', () => { btn.style.removeProperty('--tx'); btn.style.removeProperty('--ty'); });
    });
  }

  /* ------------------------------------------------------------------------
     7. PROJECTS SCROLLER
     ------------------------------------------------------------------------ */
  function initScroller() {
    const scroller = $('[data-scroller]');
    const prev = $('[data-scroller-prev]');
    const next = $('[data-scroller-next]');
    if (!scroller || !prev || !next) return;

    const behavior = reduceMotion ? 'auto' : 'smooth';
    const stepSize = () => {
      const card = $('.hl', scroller);
      const gap = parseFloat(getComputedStyle(scroller).columnGap) || 16;
      return card ? card.getBoundingClientRect().width + gap : scroller.clientWidth * 0.8;
    };
    const update = () => {
      prev.disabled = scroller.scrollLeft <= 2;
      next.disabled = scroller.scrollLeft >= scroller.scrollWidth - scroller.clientWidth - 2;
    };

    prev.addEventListener('click', () => scroller.scrollBy({ left: -stepSize(), behavior }));
    next.addEventListener('click', () => scroller.scrollBy({ left: stepSize(), behavior }));
    scroller.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
    scroller.addEventListener('keydown', (e) => {
      if (e.target !== scroller) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); scroller.scrollBy({ left: stepSize(), behavior }); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); scroller.scrollBy({ left: -stepSize(), behavior }); }
    });
    window.addEventListener('resize', update);
    update();
  }

  /* ------------------------------------------------------------------------
     8. HUB TABS — WAI-ARIA tabs (arrows / Home / End) + sliding thumb
     ------------------------------------------------------------------------ */
  function initSegmented() {
    $$('[data-seg]').forEach((seg) => {
      const tabs = $$('[role="tab"]', seg);

      const moveThumb = () => {
        const selected = tabs.find((t) => t.getAttribute('aria-selected') === 'true');
        if (!selected) return;
        seg.style.setProperty('--x', `${selected.offsetLeft}px`);
        seg.style.setProperty('--w', `${selected.offsetWidth}px`);
        seg.classList.add('is-ready');
      };

      const select = (tab, focus = false) => {
        tabs.forEach((t) => {
          const on = t === tab;
          t.setAttribute('aria-selected', String(on));
          t.tabIndex = on ? 0 : -1;
          const panel = document.getElementById(t.getAttribute('aria-controls'));
          if (panel) panel.hidden = !on;
        });
        moveThumb();
        if (focus) tab.focus();
      };

      tabs.forEach((tab, i) => {
        tab.addEventListener('click', () => select(tab));
        tab.addEventListener('keydown', (e) => {
          const map = {
            ArrowRight: tabs[(i + 1) % tabs.length],
            ArrowLeft:  tabs[(i - 1 + tabs.length) % tabs.length],
            Home: tabs[0],
            End:  tabs[tabs.length - 1],
          };
          if (map[e.key]) { e.preventDefault(); select(map[e.key], true); }
        });
      });

      moveThumb();
      window.addEventListener('resize', moveThumb);
      if (document.fonts?.ready) document.fonts.ready.then(moveThumb);
    });
  }

  /* ------------------------------------------------------------------------
     9. DIALOGS
        Resume: desktop-width + a built-in PDF viewer → in-page modal; otherwise the plain
        link opens the PDF in a new tab. Awards: click a card → certificate lightbox.
     ------------------------------------------------------------------------ */
  function wireDialog(modal) {
    $$('[data-modal-close]', modal).forEach((btn) => btn.addEventListener('click', () => modal.close()));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.close(); });   // click on the dimmed backdrop
    modal.addEventListener('close', () => root.classList.remove('modal-open'));
  }

  function initResumeModal() {
    const modal = $('#resume-modal');
    const frame = $('#resume-frame');
    if (!modal || !frame || typeof modal.showModal !== 'function') return;

    const canPreview = () =>
      navigator.pdfViewerEnabled !== false && window.matchMedia('(min-width: 768px)').matches;

    $$('[data-resume-open]').forEach((trigger) => {
      trigger.addEventListener('click', (e) => {
        if (!canPreview()) return;                 // fall through to the normal link (new tab)
        e.preventDefault();
        if (!frame.getAttribute('src')) frame.setAttribute('src', `${CONFIG.resumeFile}#view=FitH`);
        root.classList.add('modal-open');
        modal.showModal();
      });
    });
    wireDialog(modal);
  }

  function initAwardModal() {
    const modal = $('#award-modal');
    const image = $('#award-img');
    const title = $('#award-modal-title');
    if (!modal || !image || typeof modal.showModal !== 'function') return;

    $$('[data-award-open]').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        image.setAttribute('src', link.getAttribute('href'));
        image.setAttribute('alt', `${link.dataset.title} certificate`);
        title.textContent = link.dataset.title;
        root.classList.add('modal-open');
        modal.showModal();
      });
    });
    wireDialog(modal);
  }

  /* ------------------------------------------------------------------------
     10. COPY-TO-CLIPBOARD, TOAST, PLACEHOLDER LINKS
     ------------------------------------------------------------------------ */
  const toast = $('#toast');
  let toastTimer = 0;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2200);
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
    } catch (_) { /* fall through to the legacy path */ }

    const previouslyFocused = document.activeElement;
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
    area.remove();
    if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    return ok;
  }

  function initCopy() {
    const labels = { email: 'Email address', linkedin: 'LinkedIn URL' };
    $$('[data-copy]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const key = btn.dataset.copy;
        const value = CONFIG[key];
        if (!value) return;
        const ok = await copyText(value);
        showToast(ok ? `${labels[key] || 'Link'} copied to clipboard` : `Couldn't copy — please copy it manually`);
        if (!ok) return;
        btn.classList.add('is-copied');
        window.setTimeout(() => btn.classList.remove('is-copied'), 1800);
      });
    });
  }

  /* Any <a href="#"> is a placeholder: show a friendly toast instead of jumping to the top.
     Replace the href with a real URL and this handler ignores the link automatically. */
  function initPlaceholderLinks() {
    document.addEventListener('click', (e) => {
      const link = e.target instanceof Element ? e.target.closest('a[href="#"]') : null;
      if (!link) return;
      e.preventDefault();
      showToast('Link coming soon');
    });
  }

  /* ------------------------------------------------------------------------
     INIT
     ------------------------------------------------------------------------ */
  bindConfig();
  initMenu();
  initScrollSpy();
  initReveal();
  initWords();
  initCounters();
  initMarquee();
  initScrollLinked();
  initStory();
  initPointerEffects();
  initScroller();
  initSegmented();
  initResumeModal();
  initAwardModal();
  initCopy();
  initPlaceholderLinks();

  // Start the scroll engine (and keep it running).
  window.addEventListener('scroll', queueScroll, { passive: true });
  window.addEventListener('resize', queueScroll);
  queueScroll();
})();
