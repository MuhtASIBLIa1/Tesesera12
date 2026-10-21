/*
 * Tessera — rule engine
 * ---------------------------------------------------------------
 * This file holds the questions, the document rules and the pure
 * functions that decide which documents apply, why they apply,
 * and how ready the application is.
 *
 * It never touches the page (no DOM code), which means it can be
 * tested on its own (see tests.html) and explained clearly in the
 * project report.
 *
 * All rules are FICTIONAL and exist for research purposes only.
 */
(function (root) {
  'use strict';

  /* ---------- 1. The fictional application ---------- */

  const APPLICATION = {
    institution: 'Northgate University',
    name: 'Student Support Application',
    session: '2026/27'
  };

  /* ---------- 2. Questions the student answers ---------- */

  const YES_NO = [
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' }
  ];

  // "phrases" turn an answer into plain English for explanations,
  // e.g. "Needed because you are requesting financial support."
  const QUESTIONS = [
    {
      id: 'feeStatus',
      label: 'Fee status',
      help: 'Home or international, as shown on your offer letter.',
      options: [
        { value: 'home', label: 'Home' },
        { value: 'international', label: 'International' }
      ],
      phrases: { home: 'your fee status is home', international: 'your fee status is international' }
    },
    {
      id: 'financialSupport',
      label: 'Financial support',
      help: 'A hardship grant or bursary towards living costs.',
      options: YES_NO,
      phrases: { yes: 'you are requesting financial support' }
    },
    {
      id: 'dependants',
      label: 'Dependants',
      help: 'Children or adults who rely on you financially.',
      options: YES_NO,
      showIf: { q: 'financialSupport', is: 'yes' },
      phrases: { yes: 'you have dependants' }
    },
    {
      id: 'disabilitySupport',
      label: 'Disability or learning support',
      help: 'Adjustments such as extra exam time or assistive software.',
      options: YES_NO,
      phrases: { yes: 'you are requesting disability or learning support' }
    },
    {
      id: 'under18',
      label: 'Under 18 at the start of the course',
      help: 'The course starts on 21 September 2026.',
      options: YES_NO,
      phrases: { yes: 'you are under 18' }
    },
    {
      id: 'previousStudy',
      label: 'Studied at another university',
      help: 'Any earlier higher-education study, finished or not.',
      options: YES_NO,
      phrases: { yes: 'you have studied at university before' }
    }
  ];

  const DEFAULT_ANSWERS = {
    feeStatus: 'home',
    financialSupport: 'no',
    dependants: 'no',
    disabilitySupport: 'no',
    under18: 'no',
    previousStudy: 'no'
  };

  // Example profile shown the first time the app opens.
  const SAMPLE_ANSWERS = {
    feeStatus: 'international',
    financialSupport: 'yes',
    dependants: 'no',
    disabilitySupport: 'no',
    under18: 'no',
    previousStudy: 'yes'
  };
  const SAMPLE_READY = ['photo-id', 'offer-letter', 'immigration-status', 'english-test'];

  /* ---------- 3. Document rules ----------
   * when.all : every condition must be true   (empty list = always)
   * when.any : at least one condition must be true
   * requires : documents that must be ready first (only counted
   *            when they also apply to this student)
   */
  const DOCUMENTS = [
    {
      id: 'photo-id', rule: 'R1', name: 'Photo ID', category: 'Identity', icon: 'id',
      reason: 'Every applicant has to prove their identity before any support can be paid.',
      when: { all: [] },
      shows: ['Your full name, matching your application', 'Your photo and date of birth', 'An expiry date that has not passed'],
      accepted: 'Passport, UK photocard driving licence or national identity card.',
      requires: []
    },
    {
      id: 'offer-letter', rule: 'R2', name: 'Offer or enrolment letter', category: 'Academic', icon: 'doc',
      reason: 'Support is only available to students who hold an offer or are already enrolled.',
      when: { all: [] },
      shows: ['Your student ID number', 'Course title and start date', 'Your fee status'],
      accepted: 'Unconditional offer letter or current enrolment certificate.',
      requires: []
    },
    {
      id: 'immigration-status', rule: 'R3', name: 'Visa or eVisa share code', category: 'Immigration', icon: 'globe',
      reason: 'International students must show a valid student visa before support is assessed.',
      when: { all: [{ q: 'feeStatus', is: 'international' }] },
      shows: ['Visa type: Student', 'Dates that cover the start of your course', 'A share code you can give to the university'],
      accepted: 'Student visa or eVisa share code.',
      requires: ['offer-letter'],
      blockNote: 'Your visa is based on the course details in your offer letter.'
    },
    {
      id: 'english-test', rule: 'R4', name: 'English language certificate', category: 'Academic', icon: 'language',
      reason: 'International applicants need evidence of English at the level stated on their offer.',
      when: { all: [{ q: 'feeStatus', is: 'international' }] },
      shows: ['Overall score and test date', 'The score for each component', 'Your name exactly as on your passport'],
      accepted: 'IELTS Academic, PTE Academic or another approved test.',
      requires: []
    },
    {
      id: 'bank-statements', rule: 'R5', name: 'Bank statements', category: 'Finance', icon: 'bank',
      reason: 'Financial support is means-tested, so the panel needs to see your current income and spending.',
      when: { all: [{ q: 'financialSupport', is: 'yes' }] },
      shows: ['Three consecutive months, ending within the last 30 days', 'Your name and account number', 'Every page, including blank ones'],
      accepted: 'Downloaded PDF statements or stamped paper statements.',
      requires: []
    },
    {
      id: 'income-declaration', rule: 'R6', name: 'Household income declaration', category: 'Finance', icon: 'chart',
      reason: 'The grant amount depends on total household income, which bank statements alone do not show.',
      when: { all: [{ q: 'financialSupport', is: 'yes' }] },
      shows: ['Income for everyone in your household', 'Totals that match your bank statements', 'Your signature and the date'],
      accepted: 'Northgate form SS-2, completed and signed.',
      requires: ['bank-statements'],
      blockNote: 'The totals on this form come from your bank statements.'
    },
    {
      id: 'dependant-evidence', rule: 'R7', name: 'Evidence of dependants', category: 'Finance', icon: 'people',
      reason: 'Students with dependants can receive a higher award, which needs proof of each dependant.',
      when: { all: [{ q: 'financialSupport', is: 'yes' }, { q: 'dependants', is: 'yes' }] },
      shows: ['Each dependant’s full name and date of birth', 'Your relationship to them', 'An address that matches yours'],
      accepted: 'Birth certificates or a Child Benefit award letter.',
      requires: []
    },
    {
      id: 'medical-evidence', rule: 'R8', name: 'Medical or diagnostic evidence', category: 'Support', icon: 'heart',
      reason: 'Disability and learning support is arranged around a confirmed condition or diagnosis.',
      when: { all: [{ q: 'disabilitySupport', is: 'yes' }] },
      shows: ['The condition or diagnosis', 'How it affects your studies', 'The name and signature of a qualified professional'],
      accepted: 'A letter from your GP, a specialist report or a diagnostic assessment.',
      requires: []
    },
    {
      id: 'support-statement', rule: 'R9', name: 'Personal support statement', category: 'Support', icon: 'pencil',
      reason: 'The panel reads your statement alongside your evidence to decide what support to offer.',
      when: { any: [{ q: 'financialSupport', is: 'yes' }, { q: 'disabilitySupport', is: 'yes' }] },
      shows: ['Which support you are asking for', 'Why you need it, in your own words', 'References to the evidence you are sending'],
      accepted: 'Up to 500 words, written by you.',
      requires: ['bank-statements', 'medical-evidence'],
      blockNote: 'Your statement refers to your evidence, so gather that first.'
    },
    {
      id: 'guardian-consent', rule: 'R10', name: 'Parent or guardian consent', category: 'Identity', icon: 'shield',
      reason: 'Applicants under 18 need a parent or guardian to agree to the application.',
      when: { all: [{ q: 'under18', is: 'yes' }] },
      shows: ['Your guardian’s full name and contact details', 'Their relationship to you', 'Their signature and the date'],
      accepted: 'Northgate form SS-4.',
      requires: ['photo-id'],
      blockNote: 'Your guardian confirms the identity shown on your photo ID.'
    },
    {
      id: 'transcript', rule: 'R11', name: 'Previous university transcript', category: 'Academic', icon: 'cap',
      reason: 'Earlier study can change the support you are eligible for, so it has to be declared.',
      when: { all: [{ q: 'previousStudy', is: 'yes' }] },
      shows: ['Each year of study you completed', 'Credits or modules taken', 'The name of the awarding university'],
      accepted: 'An official transcript or Higher Education Achievement Report (HEAR).',
      requires: []
    }
  ];

  /* ---------- 4. Engine ---------- */

  const docById = Object.fromEntries(DOCUMENTS.map(d => [d.id, d]));
  const questionById = Object.fromEntries(QUESTIONS.map(q => [q.id, q]));

  function isQuestionVisible(question, answers) {
    if (!question.showIf) return true;
    return answers[question.showIf.q] === question.showIf.is;
  }

  // Fills gaps with defaults and resets answers to hidden questions,
  // so a stale "dependants: yes" cannot trigger a rule.
  function effectiveAnswers(answers) {
    const out = Object.assign({}, DEFAULT_ANSWERS, answers || {});
    QUESTIONS.forEach(q => {
      if (!isQuestionVisible(q, out)) out[q.id] = DEFAULT_ANSWERS[q.id];
    });
    return out;
  }

  function describeCondition(c) {
    const q = questionById[c.q];
    const opt = q.options.find(o => o.value === c.is);
    return {
      q: c.q,
      is: c.is,
      question: q.label,
      answer: opt ? opt.label : c.is,
      phrase: (q.phrases && q.phrases[c.is]) || (q.label + ' is ' + (opt ? opt.label : c.is))
    };
  }

  // Decides whether one document applies, and records why.
  function evaluate(doc, answers) {
    const a = effectiveAnswers(answers);
    const mode = doc.when.any ? 'any' : 'all';
    const list = doc.when[mode] || [];
    const conditions = list.map(c => Object.assign(describeCondition(c), { met: a[c.q] === c.is }));
    const applies = mode === 'all' ? conditions.every(c => c.met) : conditions.some(c => c.met);
    return {
      applies,
      mode,
      always: list.length === 0,
      conditions,
      matched: conditions.filter(c => c.met)
    };
  }

  function joinList(items) {
    if (items.length <= 1) return items.join('');
    return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
  }

  // Plain-English reason shown next to every document.
  function explain(doc, answers) {
    const ev = evaluate(doc, answers);
    if (ev.always) return 'Every applicant needs this.';
    if (!ev.applies) return 'Not needed for your answers.';
    return 'Needed because ' + joinList(ev.matched.map(m => m.phrase)) + '.';
  }

  // The main function: which documents apply, their status, and readiness.
  function assess(answers, readyIds) {
    const ready = new Set(readyIds || []);
    const applicable = DOCUMENTS.filter(d => evaluate(d, answers).applies);
    const applicableIds = new Set(applicable.map(d => d.id));

    const docs = applicable.map(d => {
      const prerequisites = d.requires.filter(id => applicableIds.has(id));
      const blockers = prerequisites.filter(id => !ready.has(id));
      const isReady = ready.has(d.id);
      const status = isReady ? 'ready' : (blockers.length ? 'blocked' : 'todo');
      const unlocks = applicable.filter(o => o.requires.includes(d.id)).map(o => o.id);
      return { doc: d, status, prerequisites, blockers, unlocks, explanation: explain(d, answers) };
    });

    const readyCount = docs.filter(x => x.status === 'ready').length;
    const todo = docs.filter(x => x.status === 'todo');
    const blocked = docs.filter(x => x.status === 'blocked');
    const total = docs.length;

    // Next step: a document you can start now, preferring one that unblocks others.
    const next = todo.slice().sort((x, y) => y.unlocks.length - x.unlocks.length)[0] || null;

    return {
      docs,
      total,
      readyCount,
      todoCount: todo.length,
      blockedCount: blocked.length,
      percent: total ? Math.round((readyCount / total) * 100) : 0,
      complete: total > 0 && readyCount === total,
      next
    };
  }

  // Which documents were added or removed when answers changed.
  function diffApplicable(before, after) {
    const was = new Set(DOCUMENTS.filter(d => evaluate(d, before).applies).map(d => d.id));
    const now = new Set(DOCUMENTS.filter(d => evaluate(d, after).applies).map(d => d.id));
    return {
      added: [...now].filter(id => !was.has(id)),
      removed: [...was].filter(id => !now.has(id))
    };
  }

  const api = {
    APPLICATION, QUESTIONS, DOCUMENTS, DEFAULT_ANSWERS, SAMPLE_ANSWERS, SAMPLE_READY,
    isQuestionVisible, effectiveAnswers, evaluate, explain, assess, diffApplicable, joinList,
    getDocument: id => docById[id],
    getQuestion: id => questionById[id]
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TesseraRules = api;
})(typeof window !== 'undefined' ? window : globalThis);
