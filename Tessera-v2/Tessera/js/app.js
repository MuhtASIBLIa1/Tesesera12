/*
 * Tessera — app.js
 * ---------------------------------------------------------------
 * The interactive checklist. It reads rules.js, draws the app and
 * saves progress. Animations are optional: if GSAP is available it
 * uses it, otherwise everything still works.
 *
 *   1. Icons and helpers
 *   2. State (answers + ready documents, saved in localStorage)
 *   3. Drawing each part of the app
 *   4. Actions (answer, tick, open details, reset)
 *   5. Events
 */
(function () {
  'use strict';

  const R = window.TesseraRules;
  const STORE_KEY = 'tessera.v2';
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const hasGsap = () => typeof window.gsap !== 'undefined';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Icons and helpers ---------- */
  const ICONS = {
    id: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="11" r="2"/><path d="M5.8 16c.6-1.3 1.7-2 3.2-2s2.6.7 3.2 2M14.5 10h4M14.5 13.5h3"/>',
    doc: '<path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.4 2.6 3.7 5.6 3.7 9s-1.3 6.4-3.7 9c-2.4-2.6-3.7-5.6-3.7-9S9.6 5.6 12 3z"/>',
    language: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 4v-4A1.5 1.5 0 0 1 4 14.5z"/><path d="M9.2 13l2.8-6.5 2.8 6.5M10.2 10.8h3.6"/>',
    bank: '<path d="M3 9.5L12 4l9 5.5M5 11v6M9.5 11v6M14.5 11v6M19 11v6M3 20h18"/>',
    chart: '<path d="M4 20V11M10 20V5M16 20v-7M21 20H3"/>',
    people: '<circle cx="9" cy="8" r="3"/><path d="M3.5 19c.8-3 2.9-4.5 5.5-4.5s4.7 1.5 5.5 4.5"/><circle cx="17" cy="9" r="2.3"/><path d="M16.2 14.6c2.2 0 3.8 1.3 4.4 3.9"/>',
    heart: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.3a4.2 4.2 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z"/>',
    pencil: '<path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/>',
    shield: '<path d="M12 3l7 3v5c0 4.6-3 8.3-7 10-4-1.7-7-5.4-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/>',
    cap: '<path d="M2 9l10-5 10 5-10 5L2 9z"/><path d="M6 11v5c1.7 1.4 3.7 2 6 2s4.3-.6 6-2v-5M22 9v6"/>',
    check: '<path d="M5 12.5l4.2 4.2L19 7"/>',
    chevron: '<path d="M9 5l7 7-7 7"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    unlock: '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 7.6-1.8"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    minus: '<path d="M7 12h10"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    star: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>'
  };
  const icon = name =>
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
  const nameList = ids => R.joinList(ids.map(id => R.getDocument(id).name));

  /* ---------- 2. State ---------- */
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (!s || !s.answers) return null;
      return {
        answers: Object.assign({}, R.DEFAULT_ANSWERS, s.answers),
        ready: Array.isArray(s.ready) ? s.ready.filter(id => R.getDocument(id)) : [],
        sample: !!s.sample
      };
    } catch (e) { return null; }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* storage blocked: still works */ }
  }

  // First visit: an example profile, so the app shows what it does.
  // For your user study, change these to R.DEFAULT_ANSWERS and [] (see README).
  const state = load() || {
    answers: Object.assign({}, R.SAMPLE_ANSWERS),
    ready: R.SAMPLE_READY.slice(),
    sample: true
  };

  let filter = 'all';
  let openId = null;
  let returnFocus = null;
  let shownIds = new Set();
  let lastToggled = null;
  const counter = { v: 0 };

  /* ---------- 3. Drawing ---------- */
  function statusPill(x) {
    if (!x) return '<span class="pill pill-mute">Not needed</span>';
    if (x.status === 'ready') return '<span class="pill pill-y">' + icon('check') + 'Ready</span>';
    if (x.status === 'blocked') return '<span class="pill pill-wait">' + icon('lock') + 'Waiting</span>';
    return '<span class="pill pill-line">To do</span>';
  }

  function buildQuestions() {
    $('#qForm').innerHTML = R.QUESTIONS.map(q =>
      '<div class="q' + (q.showIf ? ' follow' : '') + '" data-q="' + q.id + '">' +
        '<div class="q-text"><p class="q-label" id="ql-' + q.id + '">' + esc(q.label) + '</p><p class="q-help">' + esc(q.help) + '</p></div>' +
        '<div class="seg" role="radiogroup" aria-labelledby="ql-' + q.id + '">' +
          q.options.map(o => {
            const id = 'q-' + q.id + '-' + o.value;
            return '<input type="radio" name="' + q.id + '" id="' + id + '" value="' + o.value + '"' + (state.answers[q.id] === o.value ? ' checked' : '') + '>' +
                   '<label for="' + id + '">' + esc(o.label) + '</label>';
          }).join('') +
        '</div>' +
      '</div>').join('');
    updateVisibility();
  }

  function updateVisibility() {
    R.QUESTIONS.forEach(q => { $('[data-q="' + q.id + '"]').hidden = !R.isQuestionVisible(q, state.answers); });
    $('#sampleTag').hidden = !state.sample;
  }

  function drawReadiness(a) {
    const bar = $('#ringBar');
    const c = 2 * Math.PI * 54;
    bar.style.strokeDasharray = c.toFixed(2);
    bar.style.strokeDashoffset = (c * (1 - a.percent / 100)).toFixed(2);

    const pct = $('#pct');
    if (hasGsap() && !reduceMotion) {
      window.gsap.to(counter, { v: a.percent, duration: 1, ease: 'power3.out', overwrite: true, onUpdate: () => { pct.textContent = Math.round(counter.v); } });
    } else {
      counter.v = a.percent;
      pct.textContent = a.percent;
    }

    $('#headline').textContent = a.readyCount + ' of ' + plural(a.total, 'document') + ' ready';
    const left = a.total - a.readyCount;
    $('#status').innerHTML = a.complete
      ? '<span class="pill pill-y">' + icon('check') + 'Ready to submit</span><span>Everything on your list is ready.</span>'
      : '<span class="pill pill-wait">Not ready yet</span><span>' + plural(left, 'document') + ' still to collect.</span>';
    $('#tReady').textContent = a.readyCount;
    $('#tTodo').textContent = a.todoCount;
    $('#tWait').textContent = a.blockedCount;
  }

  function drawNext(a) {
    if (a.complete) {
      $('#next').innerHTML =
        '<p class="eyebrow">All done</p><div class="next-row"><span class="tile lg">' + icon('check') + '</span>' +
        '<div class="min-w-0"><h4>You have everything on your list</h4><p>Submit your application with these ' + plural(a.total, 'document') + '. The university will check each one.</p></div></div>';
      return;
    }
    const n = a.next;
    const d = n.doc;
    const unlock = n.unlocks.length ? '<p class="unlock">' + icon('unlock') + '<span>Unlocks ' + esc(nameList(n.unlocks)) + '</span></p>' : '';
    $('#next').innerHTML =
      '<p class="eyebrow">Up next</p>' +
      '<div class="next-row"><span class="tile lg">' + icon(d.icon) + '</span>' +
      '<div class="min-w-0"><h4>' + esc(d.name) + '</h4><p>' + esc(n.explanation) + '</p>' + unlock + '</div></div>' +
      '<div class="flex flex-wrap gap-3">' +
        '<button class="btn btn-y btn-sm" type="button" data-open="' + d.id + '" data-focus="next-open">See what to include</button>' +
        '<button class="btn btn-ghost btn-sm" type="button" data-toggle="' + d.id + '" data-focus="next-toggle">I have this</button>' +
      '</div>';
  }

  function docRow(x) {
    const d = x.doc;
    const why = x.status === 'blocked' ? 'Collect ' + nameList(x.blockers) + ' first' : x.explanation;
    const meta = x.status === 'blocked' ? '<span class="pill pill-wait">' + icon('lock') + 'Waiting</span>' : '';
    return '<li class="doc" data-status="' + x.status + '" data-id="' + d.id + '">' +
      '<button class="doc-check" type="button" role="checkbox" aria-checked="' + (x.status === 'ready') + '" aria-label="I have ' + esc(d.name) + '" ' +
        'data-toggle="' + d.id + '" data-focus="row-' + d.id + '" data-cursor="' + (x.status === 'ready' ? 'Undo' : 'Tick') + '"><span class="box">' + icon('check') + '</span></button>' +
      '<button class="doc-open" type="button" data-open="' + d.id + '" data-focus="open-' + d.id + '" data-cursor="Why">' +
        '<span class="tile">' + icon(d.icon) + '</span>' +
        '<span class="doc-text"><span class="doc-name">' + esc(d.name) + '</span><span class="doc-why">' + esc(why) + '</span></span>' +
        '<span class="doc-meta">' + meta + '<span class="rule-chip">' + d.rule + '</span></span>' +
      '</button></li>';
  }

  function drawDocs(a) {
    const order = { todo: 0, blocked: 1, ready: 2 };
    const list = a.docs
      .filter(x => filter === 'all' || (filter === 'todo' ? x.status !== 'ready' : x.status === 'ready'))
      .sort((x, y) => order[x.status] - order[y.status]);

    $('#docList').innerHTML = list.length
      ? list.map(docRow).join('')
      : '<li class="empty">' + (filter === 'ready' ? 'Nothing ticked yet. Tick a document when you have it.' : 'Nothing left to collect.') + '</li>';

    // Animate rows that just appeared
    const fresh = list.filter(x => !shownIds.has(x.doc.id)).map(x => $('.doc[data-id="' + x.doc.id + '"]'));
    if (hasGsap() && !reduceMotion && shownIds.size && fresh.length) {
      window.gsap.from(fresh, { y: 18, autoAlpha: 0, duration: 0.7, ease: 'expo.out', stagger: 0.06 });
    }
    if (lastToggled) {
      const box = $('.doc[data-id="' + lastToggled + '"] .box');
      if (box && hasGsap() && !reduceMotion) window.gsap.fromTo(box, { scale: 0.7 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1.2, 0.4)' });
    }
    shownIds = new Set(list.map(x => x.doc.id));
  }

  function drawRules() {
    $('#ruleRows').innerHTML = R.DOCUMENTS.map(d => {
      const ev = R.evaluate(d, state.answers);
      const cond = ev.always ? 'Every applicant'
        : ev.conditions.map(c => esc(c.question) + ' = ' + esc(c.answer)).join(' <span class="op">' + (ev.mode === 'all' ? 'and' : 'or') + '</span> ');
      const req = d.requires.length ? esc(nameList(d.requires)) : '<span class="text-mute">None</span>';
      return '<tr class="' + (ev.applies ? '' : 'off') + '"><td class="rid">' + d.rule + '</td><td class="dname">' + esc(d.name) + '</td>' +
        '<td>' + cond + '</td><td>' + req + '</td><td>' +
        (ev.applies ? '<span class="pill pill-y">Applies</span>' : '<span class="pill pill-mute">Not needed</span>') + '</td></tr>';
    }).join('');
  }

  function drawDrawer(a) {
    if (!openId) return;
    const d = R.getDocument(openId);
    const x = a.docs.find(y => y.doc.id === openId);
    const ev = R.evaluate(d, state.answers);

    $('#drawerHead').innerHTML =
      '<span class="tile lg">' + icon(d.icon) + '</span>' +
      '<div class="min-w-0"><p class="eyebrow">' + esc(d.category) + ' · Rule ' + d.rule + '</p><h2 id="drawerTitle">' + esc(d.name) + '</h2></div>' +
      '<button class="icon-btn" type="button" data-close aria-label="Close" data-focus="drawer-close" data-cursor="Close">' + icon('close') + '</button>';

    let status = statusPill(x);
    if (x && x.status === 'blocked') status += '<span>Collect ' + esc(nameList(x.blockers)) + ' first.</span>';
    if (x && x.status === 'todo') status += '<span>You can start this now.</span>';
    if (x && x.status === 'ready') status += '<span>You marked this as ready.</span>';

    const because = ev.always
      ? '<ul class="because"><li>' + icon('check') + '<span>Every applicant needs this</span><span class="r">' + d.rule + '</span></li></ul>'
      : '<ul class="because">' + ev.conditions.map(c =>
          '<li class="' + (c.met ? '' : 'unmet') + '">' + icon(c.met ? 'check' : 'minus') +
          '<span>' + esc(c.question) + ': <strong>' + esc(c.answer) + '</strong></span><span class="r">' + (c.met ? 'match' : 'no match') + '</span></li>').join('') + '</ul>' +
        '<p class="note">Rule ' + d.rule + ' applies when ' + (ev.mode === 'all' ? 'all of these match.' : 'any one of these matches.') + '</p>';

    const depRow = id => {
      const y = a.docs.find(z => z.doc.id === id);
      return '<li><button class="dep-btn" type="button" data-open="' + id + '" data-focus="dep-' + id + '"><span class="tile sm">' + icon(y.doc.icon) + '</span>' +
        '<span class="grow">' + esc(y.doc.name) + '</span>' + statusPill(y) + '</button></li>';
    };
    let deps = '';
    if (x && x.prerequisites.length) {
      deps += '<section><h3>Collect first</h3>' + (d.blockNote ? '<p class="text-mute mb-3">' + esc(d.blockNote) + '</p>' : '') +
        '<ul class="dep-list">' + x.prerequisites.map(depRow).join('') + '</ul></section>';
    }
    if (x && x.unlocks.length) {
      deps += '<section><h3>Unlocks</h3><ul class="dep-list">' + x.unlocks.map(depRow).join('') + '</ul></section>';
    }

    $('#drawerBody').innerHTML =
      '<p class="status" style="margin:0">' + status + '</p>' +
      '<section><h3>Why it’s needed</h3><p class="lead">' + esc(d.reason) + '</p></section>' +
      '<section><h3>Why it applies to you</h3>' + because + '</section>' +
      '<section><h3>What it should show</h3><ul class="ticks">' + d.shows.map(s => '<li>' + icon('check') + '<span>' + esc(s) + '</span></li>').join('') + '</ul>' +
      '<p class="accepted"><strong>Accepted:</strong> ' + esc(d.accepted) + '</p></section>' + deps;

    $('#drawerFoot').innerHTML = x
      ? '<button class="btn ' + (x.status === 'ready' ? 'btn-ghost' : 'btn-y') + '" type="button" data-toggle="' + d.id + '" data-focus="drawer-toggle">' +
          (x.status === 'ready' ? 'Mark as not ready' : 'I have this document') + '</button>' +
        (x.status === 'blocked' ? '<p class="hint">You can still tick it if you already have it.</p>' : '')
      : '<p class="hint">Not needed for your current answers.</p>';
  }

  let refreshTimer;
  function render() {
    const key = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.focus : null;
    const a = R.assess(state.answers, state.ready);
    drawReadiness(a);
    drawNext(a);
    drawDocs(a);
    drawRules();
    drawDrawer(a);
    if (key) {
      const el = $('[data-focus="' + key + '"]');
      if (el && el !== document.activeElement) el.focus({ preventScroll: true });
    }
    lastToggled = null;
    // Page height may have changed: let scroll animations re-measure.
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => { if (window.ScrollTrigger) window.ScrollTrigger.refresh(); }, 250);
    return a;
  }

  /* ---------- 4. Actions ---------- */
  let toastTimer;
  function toast(html) {
    const el = $('#toast');
    el.innerHTML = html;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3800);
  }

  function toggleReady(id) {
    const before = R.assess(state.answers, state.ready);
    const wasReady = state.ready.includes(id);
    state.ready = wasReady ? state.ready.filter(x => x !== id) : state.ready.concat(id);
    lastToggled = id;
    save();
    const after = render();
    if (!wasReady) {
      const freed = before.docs
        .filter(x => x.status === 'blocked' && after.docs.find(y => y.doc.id === x.doc.id).status === 'todo')
        .map(x => x.doc.id);
      if (after.complete) toast(icon('star') + '<span>Everything on your list is ready.</span>');
      else if (freed.length) toast(icon('unlock') + '<span>' + esc(nameList(freed)) + ' can now be started.</span>');
    }
  }

  function setAnswer(qid, value) {
    const before = Object.assign({}, state.answers);
    state.answers[qid] = value;
    state.sample = false;
    save();
    updateVisibility();
    render();
    const diff = R.diffApplicable(before, state.answers);
    const parts = [];
    if (diff.added.length) parts.push('Added ' + esc(nameList(diff.added)) + '.');
    if (diff.removed.length) parts.push('Removed ' + esc(nameList(diff.removed)) + '.');
    if (parts.length) toast(icon(diff.added.length ? 'plus' : 'minus') + '<span>' + parts.join(' ') + '</span>');
  }

  let armTimer;
  function startBlank(btn) {
    const hasProgress = !state.sample && (state.ready.length || Object.keys(R.DEFAULT_ANSWERS).some(k => state.answers[k] !== R.DEFAULT_ANSWERS[k]));
    if (hasProgress && !btn.dataset.armed) {
      btn.dataset.armed = '1';
      btn.textContent = 'Tap again to clear everything';
      armTimer = setTimeout(() => { delete btn.dataset.armed; btn.textContent = 'Start from blank'; }, 4000);
      return;
    }
    clearTimeout(armTimer);
    delete btn.dataset.armed;
    btn.textContent = 'Start from blank';
    state.answers = Object.assign({}, R.DEFAULT_ANSWERS);
    state.ready = [];
    state.sample = false;
    save();
    buildQuestions();
    render();
    toast(icon('check') + '<span>Cleared. Answer the questions to build your list.</span>');
  }

  function lenis() { return window.TesseraMotion && window.TesseraMotion.lenis; }

  function openDrawer(id, trigger) {
    if (openId) { // already open: switch document
      openId = id;
      drawDrawer(R.assess(state.answers, state.ready));
      $('#drawerBody').scrollTop = 0;
      return;
    }
    openId = id;
    returnFocus = trigger && trigger.dataset ? trigger.dataset.focus : null;
    drawDrawer(R.assess(state.answers, state.ready));
    const drawer = $('#drawer');
    const backdrop = $('#drawerBackdrop');
    drawer.hidden = false;
    backdrop.hidden = false;
    $('#drawerBody').scrollTop = 0;
    if (lenis()) lenis().stop();
    if (hasGsap() && !reduceMotion) {
      const g = window.gsap;
      g.fromTo(backdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, ease: 'power2.out' });
      g.fromTo(drawer, { clipPath: 'inset(0% 0% 0% 100%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.75, ease: 'expo.out' });
      g.from(drawer.querySelectorAll('.drawer-head > *, .drawer-body > *'), { x: 40, autoAlpha: 0, duration: 0.7, ease: 'expo.out', stagger: 0.04, delay: 0.1 });
    }
    const close = $('#drawer [data-close]');
    if (close) close.focus({ preventScroll: true });
  }

  function closeDrawer() {
    if (!openId) return;
    openId = null;
    const drawer = $('#drawer');
    const backdrop = $('#drawerBackdrop');
    const finish = () => {
      drawer.hidden = true;
      backdrop.hidden = true;
      if (lenis()) lenis().start();
      if (returnFocus) {
        const el = $('[data-focus="' + returnFocus + '"]');
        if (el) el.focus({ preventScroll: true });
      }
    };
    if (hasGsap() && !reduceMotion) {
      window.gsap.to(backdrop, { autoAlpha: 0, duration: 0.35 });
      window.gsap.to(drawer, { clipPath: 'inset(0% 0% 0% 100%)', duration: 0.5, ease: 'expo.in', onComplete: finish });
    } else finish();
  }

  /* ---------- 5. Events ---------- */
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-open],[data-toggle],[data-close],#blankBtn');
    if (!t) return;
    if (t.id === 'blankBtn') return startBlank(t);
    if (t.hasAttribute('data-toggle')) return toggleReady(t.dataset.toggle);
    if (t.hasAttribute('data-open')) return openDrawer(t.dataset.open, t);
    if (t.hasAttribute('data-close')) return closeDrawer();
  });

  $('#qForm').addEventListener('change', e => { if (e.target.type === 'radio') setAnswer(e.target.name, e.target.value); });
  $('#qForm').addEventListener('submit', e => e.preventDefault());
  $$('input[name="filter"]').forEach(input => input.addEventListener('change', () => {
    filter = input.value;
    drawDocs(R.assess(state.answers, state.ready));
  }));

  document.addEventListener('keydown', e => {
    if (!openId) return;
    if (e.key === 'Escape') { e.preventDefault(); closeDrawer(); return; }
    if (e.key === 'Tab') { // keep focus inside the open drawer
      const items = $$('#drawer button').filter(el => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------- Start ---------- */
  buildQuestions();
  render();
})();
