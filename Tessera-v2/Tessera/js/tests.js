/*
 * Tessera — automated rule tests
 * Open tests.html in a browser to run them (no installs needed).
 * If you have Node.js you can also run:  node tests.js
 */
(function () {
  'use strict';
  const isNode = typeof window === 'undefined';
  const R = isNode ? require('./rules.js') : window.TesseraRules;

  const base = R.DEFAULT_ANSWERS;
  const withAnswers = changes => Object.assign({}, base, changes);
  const ids = (answers, ready) => R.assess(answers, ready || []).docs.map(x => x.doc.id);
  const statusOf = (answers, ready, id) => R.assess(answers, ready).docs.find(x => x.doc.id === id).status;

  function sameSet(actual, expected) {
    const a = [...actual].sort().join(',');
    const e = [...expected].sort().join(',');
    if (a !== e) throw new Error('Expected [' + e + '] but got [' + a + ']');
  }
  function equal(actual, expected) {
    if (actual !== expected) throw new Error('Expected ' + JSON.stringify(expected) + ' but got ' + JSON.stringify(actual));
  }

  const ALL_SUPPORT = withAnswers({ feeStatus: 'international', financialSupport: 'yes', dependants: 'yes', disabilitySupport: 'yes', under18: 'yes', previousStudy: 'yes' });

  const TESTS = [
    ['TC01', 'Standard home applicant sees only the two universal documents',
      () => sameSet(ids(base), ['photo-id', 'offer-letter'])],
    ['TC02', 'International applicant adds visa and English certificate',
      () => sameSet(ids(withAnswers({ feeStatus: 'international' })), ['photo-id', 'offer-letter', 'immigration-status', 'english-test'])],
    ['TC03', 'Financial support adds bank statements, income declaration and statement',
      () => sameSet(ids(withAnswers({ financialSupport: 'yes' })), ['photo-id', 'offer-letter', 'bank-statements', 'income-declaration', 'support-statement'])],
    ['TC04', 'Evidence of dependants needs financial support AND dependants',
      () => {
        if (!ids(withAnswers({ financialSupport: 'yes', dependants: 'yes' })).includes('dependant-evidence')) throw new Error('Missing dependant evidence');
      }],
    ['TC05', 'Dependants answer is ignored when financial support is No',
      () => {
        if (ids(withAnswers({ financialSupport: 'no', dependants: 'yes' })).includes('dependant-evidence')) throw new Error('Hidden answer triggered a rule');
      }],
    ['TC06', 'Disability support adds medical evidence and support statement',
      () => sameSet(ids(withAnswers({ disabilitySupport: 'yes' })), ['photo-id', 'offer-letter', 'medical-evidence', 'support-statement'])],
    ['TC07', 'Support statement appears once when both support types are requested',
      () => equal(ids(withAnswers({ financialSupport: 'yes', disabilitySupport: 'yes' })).filter(id => id === 'support-statement').length, 1)],
    ['TC08', 'Under 18 adds parent or guardian consent',
      () => { if (!ids(withAnswers({ under18: 'yes' })).includes('guardian-consent')) throw new Error('Missing consent'); }],
    ['TC09', 'Previous study adds the transcript',
      () => { if (!ids(withAnswers({ previousStudy: 'yes' })).includes('transcript')) throw new Error('Missing transcript'); }],
    ['TC10', 'All answers Yes gives all 11 documents',
      () => equal(ids(ALL_SUPPORT).length, 11)],
    ['TC11', 'Income declaration is blocked until bank statements are ready',
      () => equal(statusOf(withAnswers({ financialSupport: 'yes' }), [], 'income-declaration'), 'blocked')],
    ['TC12', 'Blocker clears once the prerequisite is ready',
      () => equal(statusOf(withAnswers({ financialSupport: 'yes' }), ['bank-statements'], 'income-declaration'), 'todo')],
    ['TC13', 'A prerequisite that does not apply never blocks (statement without disability)',
      () => equal(statusOf(withAnswers({ financialSupport: 'yes' }), ['bank-statements'], 'support-statement'), 'todo')],
    ['TC14', 'Readiness stays below 100% while a document is missing',
      () => { const a = R.assess(base, ['photo-id']); equal(a.percent, 50); equal(a.complete, false); }],
    ['TC15', 'All applicable documents ready gives 100%',
      () => { const a = R.assess(base, ['photo-id', 'offer-letter']); equal(a.percent, 100); equal(a.complete, true); }],
    ['TC16', 'Ready documents that no longer apply are not counted',
      () => { const a = R.assess(base, ['photo-id', 'offer-letter', 'bank-statements']); equal(a.total, 2); equal(a.readyCount, 2); }],
    ['TC17', 'Changing an answer reports added and removed documents',
      () => {
        const d = R.diffApplicable(withAnswers({ feeStatus: 'international' }), withAnswers({ financialSupport: 'yes' }));
        sameSet(d.added, ['bank-statements', 'income-declaration', 'support-statement']);
        sameSet(d.removed, ['immigration-status', 'english-test']);
      }],
    ['TC18', 'Next step prefers a document that unblocks others',
      () => equal(R.assess(withAnswers({ financialSupport: 'yes' }), ['photo-id', 'offer-letter']).next.doc.id, 'bank-statements')],
    ['TC19', 'Every applicable document has a plain-English explanation',
      () => R.assess(ALL_SUPPORT, []).docs.forEach(x => {
        if (!/^(Every applicant|Needed because)/.test(x.explanation)) throw new Error(x.doc.id + ' has no explanation');
      })],
    ['TC20', 'Every rule references questions and documents that exist',
      () => R.DOCUMENTS.forEach(d => {
        (d.when.all || d.when.any).forEach(c => { if (!R.getQuestion(c.q)) throw new Error(d.rule + ' uses unknown question ' + c.q); });
        d.requires.forEach(id => { if (!R.getDocument(id)) throw new Error(d.rule + ' requires unknown document ' + id); });
      })]
  ];

  const results = TESTS.map(([id, name, fn]) => {
    try { fn(); return { id, name, pass: true }; }
    catch (e) { return { id, name, pass: false, error: e.message }; }
  });
  const passed = results.filter(r => r.pass).length;

  if (isNode) {
    results.forEach(r => console.log((r.pass ? 'PASS ' : 'FAIL ') + r.id + '  ' + r.name + (r.error ? '\n      ' + r.error : '')));
    console.log('\n' + passed + ' of ' + results.length + ' tests passed');
    if (passed !== results.length) process.exitCode = 1;
  } else {
    window.TesseraTestResults = { results, passed, total: results.length };
  }
})();
