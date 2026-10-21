/*
 * Tessera — motion.js
 * ---------------------------------------------------------------
 * All the "premium" movement lives here, kept apart from the app:
 *
 *   1. Smooth scroll ............ Lenis, driven by GSAP's ticker
 *   2. Hero entrance ............ curtain wipe + characters glide up
 *   3. Custom cursor ............ dot + trailing ring with labels
 *   4. Magnetic buttons ......... pulled towards the pointer
 *   5. Scroll reveals ........... headings, blocks, scrubbed text
 *   6. Marquee .................. speed follows scroll velocity
 *   7. Pinned horizontal steps .. "How it works" on large screens
 *   8. Clip-path wipes .......... sections open up, nav jumps wipe
 *
 * If the animation libraries fail to load, or the visitor prefers
 * reduced motion, the page skips all of this and stays fully usable.
 */
(function () {
  'use strict';

  // Turn features off here (e.g. customCursor: false for a user study).
  const CONFIG = { smoothScroll: true, customCursor: true, intro: true };

  const html = document.documentElement;
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const gsap = window.gsap;
  const ST = window.ScrollTrigger;

  const api = (window.TesseraMotion = { lenis: null, go: nativeGo });

  function nativeGo(selector) {
    const el = $(selector);
    if (el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

  /* ---------- Section links and mobile menu (work with or without GSAP) ---------- */
  const menu = $('#menu');
  const menuBtn = $('#menuBtn');
  let menuOpen = false;

  function setMenu(open) {
    if (open === menuOpen) return;
    menuOpen = open;
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.textContent = open ? 'Close' : 'Menu';
    if (api.lenis) open ? api.lenis.stop() : api.lenis.start();
    if (!gsap || reduce) { menu.hidden = !open; return; }
    if (open) {
      menu.hidden = false;
      gsap.fromTo(menu, { clipPath: 'circle(0% at 100% 0%)' }, { clipPath: 'circle(150% at 100% 0%)', duration: 0.9, ease: 'expo.inOut' });
      gsap.fromTo($$('.menu-link', menu), { yPercent: 100, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.9, ease: 'expo.out', stagger: 0.06, delay: 0.3 });
    } else {
      gsap.to(menu, { clipPath: 'circle(0% at 100% 0%)', duration: 0.6, ease: 'expo.inOut', onComplete: () => { menu.hidden = true; } });
    }
  }
  menuBtn.addEventListener('click', () => setMenu(!menuOpen));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && menuOpen) setMenu(false); });

  document.addEventListener('click', e => {
    const link = e.target.closest('[data-go]');
    if (!link) return;
    const target = link.getAttribute('href');
    if (!target || target.charAt(0) !== '#') return;
    e.preventDefault();
    const label = link.dataset.label || link.textContent.replace(/→/g, '').trim();
    const wasMenu = menuOpen;
    if (wasMenu) { menuOpen = false; menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.textContent = 'Menu'; menu.hidden = true; }
    api.go(target, label);
    const el = $(target);
    if (el) {
      const focusTarget = el.querySelector('h1, h2') || el;
      if (!focusTarget.hasAttribute('tabindex')) focusTarget.setAttribute('tabindex', '-1');
      setTimeout(() => focusTarget.focus({ preventScroll: true }), gsap && !reduce ? 900 : 0);
    }
  });

  /* ---------- No animation: show everything and stop here ---------- */
  if (!gsap || !ST || reduce) {
    html.classList.add('no-motion');
    return;
  }

  gsap.registerPlugin(ST);
  const hasSplit = typeof window.SplitText !== 'undefined';
  if (hasSplit) gsap.registerPlugin(window.SplitText);

  // Safety net: if anything below throws, the page is still shown.
  const safety = setTimeout(() => html.classList.add('intro-done'), 4000);
  const run = (name, fn) => { try { fn(); } catch (err) { console.warn('[Tessera motion] ' + name + ' skipped:', err); } };

  /* ---------- 1. Smooth scroll ---------- */
  run('smooth scroll', () => {
    if (!CONFIG.smoothScroll || typeof window.Lenis === 'undefined') return;
    const lenis = new window.Lenis({ duration: 1.15, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    lenis.on('scroll', ST.update);
    gsap.ticker.add(time => lenis.raf(time * 1000)); // GSAP gives seconds, Lenis wants ms
    gsap.ticker.lagSmoothing(0);
    api.lenis = lenis;
  });

  /* ---------- 2. Hero entrance ---------- */
  // Wraps every character in <span class="char"> (inside <span class="word">
  // so words never break in the middle), keeping nested tags like .hl.
  function splitChars(root) {
    root.setAttribute('aria-label', root.textContent.replace(/\s+/g, ' ').trim());
    const chars = [];
    (function walk(node) {
      Array.from(node.childNodes).forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const word = document.createElement('span');
            word.className = 'word';
            word.setAttribute('aria-hidden', 'true');
            Array.from(part).forEach(ch => {
              const c = document.createElement('span');
              c.className = 'char';
              c.textContent = ch;
              word.appendChild(c);
              chars.push(c);
            });
            frag.appendChild(word);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    })(root);
    return chars;
  }

  run('hero entrance', () => {
    const title = $('#heroTitle');
    const chars = splitChars(title);
    gsap.set(chars, { yPercent: 115 });
    title.classList.add('is-split');
    gsap.set('[data-hero-fade]', { y: 30, autoAlpha: 0 });
    gsap.set('.hero-card', { y: 120, autoAlpha: 0 });

    if (api.lenis) api.lenis.stop();
    const tl = gsap.timeline({
      defaults: { ease: 'expo.out' },
      onComplete: () => {
        clearTimeout(safety);
        html.classList.add('intro-done');
        if (api.lenis) api.lenis.start();
      }
    });
    if (CONFIG.intro) {
      tl.from('#curtain .ct', { scale: 0, transformOrigin: '50% 50%', duration: 0.5, stagger: 0.08, ease: 'back.out(2)' }, 0.05)
        .to('#curtain .curtain-mark', { yPercent: -40, autoAlpha: 0, duration: 0.45, ease: 'power3.in' }, 0.65)
        .to('#curtain', { clipPath: 'inset(0% 0% 100% 0%)', duration: 1, ease: 'expo.inOut' }, 0.8)
        .set('#curtain', { display: 'none' });
    } else {
      gsap.set('#curtain', { display: 'none' });
    }
    tl.to(chars, { yPercent: 0, duration: 1.3, stagger: 0.024 }, CONFIG.intro ? 1.15 : 0.1)
      .to('.hl', { backgroundSize: '100% 88%', color: '#0A0A0A', duration: 0.8, ease: 'power3.inOut' }, '-=0.7')
      .to('[data-hero-fade]', { y: 0, autoAlpha: 1, duration: 1.1, stagger: 0.08 }, '-=1.1')
      .to('.hero-card', { y: 0, autoAlpha: 1, duration: 1.4, stagger: 0.12 }, '-=1.2');

    // Cards drift at different speeds as you scroll away…
    gsap.to('.hero-card', {
      yPercent: i => -40 - i * 35, ease: 'none',
      scrollTrigger: { trigger: '#top', start: 'top top', end: 'bottom top', scrub: true }
    });
    // …and tilt towards the pointer.
    const cards = $('#heroCards');
    if (cards && finePointer) {
      const rx = gsap.quickTo(cards, 'rotationX', { duration: 0.8, ease: 'power3' });
      const ry = gsap.quickTo(cards, 'rotationY', { duration: 0.8, ease: 'power3' });
      $('#top').addEventListener('pointermove', e => {
        rx((e.clientY / window.innerHeight - 0.5) * -10);
        ry((e.clientX / window.innerWidth - 0.5) * 14);
      });
    }
  });

  /* ---------- 3. Custom cursor ---------- */
  run('cursor', () => {
    if (!CONFIG.customCursor || !finePointer) return;
    html.classList.add('has-cursor');
    const dot = $('#cursor');
    const ring = $('#cursorRing');
    const label = $('#cursorLabel');
    gsap.set([dot, ring], { x: -100, y: -100 });
    const dx = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3' });
    const dy = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3' });
    const rx = gsap.quickTo(ring, 'x', { duration: 0.55, ease: 'power3' });
    const ry = gsap.quickTo(ring, 'y', { duration: 0.55, ease: 'power3' });
    window.addEventListener('pointermove', e => { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); }, { passive: true });

    const INTERACTIVE = 'a, button, label, [data-cursor]';
    function setState(el) {
      if (el && el.dataset.cursor) {
        label.textContent = el.dataset.cursor;
        ring.classList.add('has-label');
        gsap.to(ring, { scale: 1.9, duration: 0.45, ease: 'expo.out' });
        gsap.to(dot, { scale: 0, duration: 0.3 });
      } else if (el) {
        ring.classList.remove('has-label');
        gsap.to(ring, { scale: 1.5, duration: 0.45, ease: 'expo.out' });
        gsap.to(dot, { scale: 0, duration: 0.3 });
      } else {
        ring.classList.remove('has-label');
        gsap.to(ring, { scale: 1, duration: 0.45, ease: 'expo.out' });
        gsap.to(dot, { scale: 1, duration: 0.3 });
      }
    }
    document.addEventListener('pointerover', e => setState(e.target.closest(INTERACTIVE)));
    document.addEventListener('pointerdown', () => gsap.to(ring, { scale: '-=0.25', duration: 0.15 }));
    document.addEventListener('pointerup', e => setState(e.target.closest(INTERACTIVE)));
    document.documentElement.addEventListener('pointerleave', () => gsap.to([dot, ring], { autoAlpha: 0, duration: 0.3 }));
    document.documentElement.addEventListener('pointerenter', () => gsap.to([dot, ring], { autoAlpha: 1, duration: 0.3 }));
  });

  /* ---------- 4. Magnetic buttons ---------- */
  run('magnetic', () => {
    if (!finePointer) return;
    $$('[data-magnetic]').forEach(el => {
      const inner = el.querySelector('[data-magnetic-inner]');
      const x = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3' });
      const y = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3' });
      const ix = inner && gsap.quickTo(inner, 'x', { duration: 0.6, ease: 'power3' });
      const iy = inner && gsap.quickTo(inner, 'y', { duration: 0.6, ease: 'power3' });
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const offX = e.clientX - (r.left + r.width / 2);
        const offY = e.clientY - (r.top + r.height / 2);
        x(offX * 0.35); y(offY * 0.45);
        if (inner) { ix(offX * 0.18); iy(offY * 0.22); }
      });
      el.addEventListener('pointerleave', () => {
        gsap.to(inner ? [el, inner] : el, { x: 0, y: 0, duration: 1.1, ease: 'elastic.out(1, 0.35)' });
      });
    });
  });

  /* ---------- 5. Scroll reveals ---------- */
  run('heading reveals', () => {
    $$('[data-split]').forEach(el => {
      if (hasSplit) {
        window.SplitText.create(el, {
          type: 'lines', mask: 'lines', linesClass: 'split-line', autoSplit: true,
          onSplit: self => gsap.from(self.lines, {
            yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: 0.1,
            scrollTrigger: { trigger: el, start: 'top 88%', once: true }
          })
        });
      } else {
        gsap.from(el, { y: 50, autoAlpha: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
      }
    });
  });

  run('block reveals', () => {
    const items = $$('[data-reveal]').filter(el => !el.closest('#howTrack') || window.innerWidth < 1024);
    gsap.set(items, { y: 60, autoAlpha: 0 });
    ST.batch(items, {
      start: 'top 90%', once: true,
      onEnter: batch => gsap.to(batch, { y: 0, autoAlpha: 1, duration: 1.2, ease: 'expo.out', stagger: 0.1, overwrite: true })
    });
  });

  run('scrubbed text', () => {
    const text = $('#scrubText');
    if (!text) return;
    const words = hasSplit ? window.SplitText.create(text, { type: 'words' }).words : [text];
    gsap.fromTo(words, { opacity: 0.14 }, {
      opacity: 1, ease: 'none', stagger: 0.1,
      scrollTrigger: { trigger: text, start: 'top 80%', end: 'bottom 45%', scrub: true }
    });
  });

  run('counters', () => {
    $$('[data-count]').forEach(el => {
      const end = Number(el.dataset.count);
      const obj = { v: 0 };
      gsap.to(obj, {
        v: end, duration: 1.6, ease: 'power3.out',
        onUpdate: () => { el.textContent = Math.round(obj.v); },
        scrollTrigger: { trigger: el, start: 'top 90%', once: true }
      });
    });
  });

  /* ---------- 6. Marquee (speeds up and reverses with your scroll) ---------- */
  run('marquee', () => {
    const track = $('#marquee');
    const loop = gsap.to(track, { xPercent: -50, duration: 30, ease: 'none', repeat: -1 });
    loop.totalTime(loop.duration() * 100); // start far in, so it can also run backwards
    let direction = 1;
    let boost = 0;
    ST.create({
      start: 0, end: 'max',
      onUpdate: self => {
        direction = self.direction;
        boost = Math.min(Math.abs(self.getVelocity()) / 250, 6);
      }
    });
    gsap.ticker.add(() => {
      boost *= 0.93;
      loop.timeScale(direction * (1 + boost));
    });
  });

  /* ---------- 7. Pinned horizontal "How it works" ---------- */
  run('how it works', () => {
    const mm = gsap.matchMedia();
    mm.add('(min-width: 1024px)', () => {
      const pin = $('#howPin');
      const track = $('#howTrack');
      const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
      const slide = gsap.to(track, {
        x: () => -distance(), ease: 'none',
        scrollTrigger: {
          trigger: pin, start: 'top top', end: () => '+=' + distance(),
          pin: true, scrub: 1, invalidateOnRefresh: true,
          onUpdate: self => gsap.set('#howProgress', { scaleX: self.progress })
        }
      });
      // Each panel's contents rise as the panel slides into view.
      $$('.how-panel', track).forEach(panel => {
        gsap.from(panel.querySelectorAll('.how-num, .how-visual, h3, p'), {
          y: 60, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: 0.06,
          scrollTrigger: { trigger: panel, containerAnimation: slide, start: 'left 85%', once: true }
        });
      });
    });
  });

  /* ---------- 8. Clip-path wipes ---------- */
  run('section wipes', () => {
    // The app panel opens out from a rounded window as it scrolls in.
    $$('.wipe-in').forEach(el => {
      gsap.fromTo(el,
        { clipPath: 'inset(12% 7% 0% 7% round 48px)' },
        { clipPath: 'inset(0% 0% 0% 0% round 32px)', ease: 'none',
          scrollTrigger: { trigger: el, start: 'top 95%', end: 'top 40%', scrub: true } });
    });
    // The yellow footer rises like a curtain.
    $$('.wipe-up').forEach(el => {
      gsap.fromTo(el,
        { clipPath: 'inset(22% 0% 0% 0% round 40px 40px 0px 0px)' },
        { clipPath: 'inset(0% 0% 0% 0% round 0px 0px 0px 0px)', ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'top 35%', scrub: true } });
    });
  });

  // Jumping to a section: a yellow panel wipes up, the page moves underneath, the panel wipes away.
  let busy = false;
  api.go = function (selector, label) {
    const target = $(selector);
    if (!target || busy) return;
    busy = true;
    $('#wipeLabel').textContent = label || '';
    gsap.timeline({ onComplete: () => { busy = false; } })
      .set('#wipe', { visibility: 'visible', clipPath: 'inset(100% 0% 0% 0%)' })
      .to('#wipe', { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.65, ease: 'expo.inOut' })
      .fromTo('#wipeLabel', { yPercent: 60, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.5, ease: 'expo.out' }, '-=0.25')
      .add(() => {
        if (api.lenis) { api.lenis.start(); api.lenis.scrollTo(target, { immediate: true, force: true }); }
        else target.scrollIntoView();
        ST.update();
      })
      .to('#wipeLabel', { yPercent: -60, autoAlpha: 0, duration: 0.35, ease: 'power3.in' }, '+=0.15')
      .to('#wipe', { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.7, ease: 'expo.inOut' }, '-=0.15')
      .set('#wipe', { visibility: 'hidden' });
  };

  /* ---------- Nav: frosted after scrolling, hides going down ---------- */
  run('nav', () => {
    const nav = $('#nav');
    ST.create({
      start: 0, end: 'max',
      onUpdate: self => {
        const y = self.scroll();
        nav.classList.toggle('is-scrolled', y > 40);
        const hide = y > 300 && self.direction === 1 && !menuOpen;
        gsap.to(nav, { yPercent: hide ? -110 : 0, duration: 0.5, ease: 'power3.out', overwrite: 'auto' });
      }
    });
  });

  // Re-measure once web fonts have loaded (text widths change).
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ST.refresh());
})();
