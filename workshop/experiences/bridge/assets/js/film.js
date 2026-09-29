/* ============================================================
   THE BRIDGE — the conductor.
   One master GSAP timeline plays the whole film: cold open,
   studio wordmark, title, seven realms joined by portals, the
   credits, and the post-credits stinger. The DOM is the type
   department; three.js is the camera department; audio.js is
   the sound department. Facts: docs/research-facts.md only.
   ============================================================ */
(function () {
  'use strict';
  function initializeFilm() {
  var doc = document.documentElement;
  var $ = function (q) { return document.querySelector(q); };
  var $$ = function (q) { return Array.prototype.slice.call(document.querySelectorAll(q)); };

  /* ---------------- the screenplay ---------------- */
  var SCRIPT = [
    { id: 'origin', num: 'I', name: 'ORIGIN', sub: 'BETWEEN WORLDS', realm: 'origin',
      bed: null, cardCue: 'astral-sweep', anchor: 'a-ll',
      cards: [
        { k: 'PARIS · 48.85° N — VICENZA · 45.55° N', s: 'Raised across cultures.', d: 'educated and worked between them' },
        { k: 'SCIENCES PO · 2010–16',   s: 'Political science & business law.', d: 'cum laude' },
        { k: 'LA SORBONNE',             s: 'Philosophy of science & technology.', d: 'M.Phil — magna cum laude' },
        { k: 'PITTSBURGH · 2012',       s: 'The first American chapter.', d: 'exchange year — GPA 4.0' }
      ] },
    { id: 'advocate', num: 'II', name: 'THE ADVOCATE', sub: 'THE LETTER OF THE LAW', realm: 'advocate',
      anchor: 'a-ll',
      cards: [
        { k: 'PARIS · 2018',            s: 'Called to the French bar.' },
        { k: 'PHILADELPHIA',            s: 'LL.M., Penn Carey Law.', d: 'as a Fulbright Scholar' },
        { k: 'PENN × WHARTON · 2019',   s: 'The Innovation Award.' },
        { k: 'DALLOZ · 2018',           s: 'Taking on the GAFA with contract law.' }
      ] },
    { id: 'peacemaker', num: 'III', name: 'THE PEACEMAKER', sub: 'BOTH SIDES OF THE TABLE', realm: 'peacemaker',
      anchor: 'a-uc',
      quote: { text: '“Negotiation is to human interactions what mathematics is to science: its language.”',
               cite: 'STUART DIAMOND — GETTING MORE', cue: 'harp-sweep', lead: 1.3 },
      cards: [
        { k: 'GETTING MORE',                 s: 'Trained under Stuart Diamond.' },
        { k: 'PHILADELPHIA COURTS',          s: 'Two years in court. Settled in four hours.',
          d: '“and we made them friends again”' },
        { k: 'THE LONG GAME',                s: 'A year of patient conversations.',
          d: 'helping someone in grief accept help' },
        { k: 'PARIS COURT OF APPEAL · 2024–', s: 'Court-appointed mediator.' }
      ] },
    { id: 'builder', num: 'IV', name: 'THE BUILDER', sub: 'THE MODERN SCRIBE', realm: 'builder',
      bed: null, hud: true, anchor: 'a-ll',   /* the hum moved to ch I's contact
                                                 (client, round 4: "statics" belonged
                                                 to the clouds, not the hologrid) */
      quote: { text: '“Learn to wield AI, not fear it.”', cite: 'LORENZO COLOMBANI', cue: null },
      cards: [
        { k: 'OPENAI FORUM · PARIS',  s: 'Forum Leader.', d: '2025 — 2026' },
        { k: 'WHARTON AI STUDIO',     s: 'AI tools for mental health.', d: 'board member' },
        { k: 'SCALEFREE',             s: 'Data modeling by day, agents by night.', d: 'business intelligence consultant' },
        { k: 'BUILT',                 s: 'Octalysis Explorer · Active Listening AI.',
          d: 'and a 14-chapter Data Vault course' }
      ] },
    { id: 'gamemaster', num: 'V', name: 'THE GAME MASTER', sub: 'SERIOUS THINGS, THE FUN WAY', realm: 'gamemaster',
      anchor: 'a-cl',
      cards: [
        { k: 'MAKE WORKING FUN · 2022–26', s: 'Learn serious things the fun way.' },
        { k: 'LIFEQUEST',               s: 'A quest journal for real life.', d: 'quests, XP, and all' },
        { k: 'WHAT IT FEELS LIKE',      s: 'An idle game that teaches empathy.', d: 'for depression' },
        { k: 'ESCP · 2022–23',          s: 'Professor of law & international law.' }
      ] },
    { id: 'storyteller', num: 'VI', name: 'THE STORYTELLER', sub: 'IN HIS OWN WORDS', realm: 'storyteller',
      bed: 'pages-loop', anchor: 'a-lr',
      essays: ['Aristotle Was a Data Engineer', 'AI Detection Tools Are Astrology for Academics',
               'Is AI Intelligent? Descartes Answered, 4 Centuries Ago', 'The Sound of a Dead Language',
               'When AI Assistants Play Dirty'],
      cards: [
        { k: 'MEDIUM · DALLOZ',  s: 'Essays on AI, philosophy, and law.' },
        { k: 'AUDIO STORIES',    s: 'Socrates in Paris · Mr. Howard C.', d: 'philosophy you can listen to' }
      ] },
    { id: 'assembly', num: 'VII', name: 'ASSEMBLY', sub: 'SEVEN TRADES. ONE PERSON.', realm: 'assembly',
      assembly: true, caps: [] }
  ];
  var ROLLCALL = ['CERTIFIED LAWYER', 'MEDIATOR', 'NEGOTIATOR', 'AI BUILDER', 'BI CONSULTANT', 'WRITER', 'TEACHER'];
  var FLICKER_QUOTES = [
    '“I bridge communication barriers between specialists.”',
    '“Learn serious things the fun way.”',
    '“Negotiation is … its language.”',
    '“Learn to wield AI, not fear it.”',
    '“…and we made them friends again.”'
  ];

  /* ---------------- boot & fallbacks ----------------
     The film is the default for everyone; reduced-motion never diverts
     (the gate's "Prefer to read?" link is the still path). Only genuine
     can't-play cases fall back: no GSAP, no WebGL. */
  var GS = !!(window.gsap && window.SplitText);
  var canvas = $('#stage');
  var GL = GS && FILM.stage.init(canvas);
  if (!GL) doc.classList.add('no-gl');

  function enterFallback() {
    doc.classList.add('fallback');
    document.body.classList.add('reading');
  }
  if (!GS || !GL) { enterFallback(); wireTranscriptLinks(); if (window.__WORKSHOP_BRIDGE_BOOT) window.__WORKSHOP_BRIDGE_BOOT.fail('The film requires WebGL and its local animation assets. The text version is available.'); return; }
  doc.classList.add('can-play');

  var A = FILM.audio, R = FILM.realms, P = FILM.portal, S = FILM.stage;
  var C = S.cam;
  var master = null, state = 'gate', chapterLabels = [], seekPoints = [];

  /* camera programs — one language (slow push + a single gentle secondary
     axis per chapter); art direction forbids stunt moves */
  var CAMS = {
    origin:      { dolly: [8, 4.4],   x: [-1.0, 1.0] },          /* lateral drift   */
    advocate:    { dolly: [7.5, 4.6], y: [-3.2, 1.8] },          /* rising crane    */
    peacemaker:  { dolly: [8, 5.2] },                             /* still, human    */
    builder:     { dolly: [9.0, 5.2], y: [-4.4, 1.2] },          /* crane over city */
    gamemaster:  { dolly: [7.5, 4.6] },                           /* simple push     */
    storyteller: { dolly: [6.5, 4.4], x: [2.0, -2.0] },          /* tracking shot   */
    assembly:    { dolly: [4.6, 8.4] }                            /* pull-back reveal*/
  };

  /* tail asymmetry — seconds each chapter's text block gives back to (+) or
     borrows from (−) the pre-portal breath, absorbed by the holds so chapter
     and film lengths never move. The exits must not metronome (Lorenzo,
     2026-07-08: "a little asymmetry… enough to pass unnoticed"). */
  var TAIL_ASYM = { origin: 0, advocate: -0.2, peacemaker: 0.35, builder: -0.15,
                    gamemaster: 0.25, storyteller: -0.1 };

  /* ---------------- DOM builders ---------------- */
  function el(tag, cls, html, parent) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    (parent || $('#film')).appendChild(e);
    return e;
  }

  /* wordmark letters */
  (function buildWordmark() {
    var name = 'LORENZO COLOMBANI';
    var wm = $('#wm-name');
    wm.innerHTML = name.split('').map(function (c) {
      return c === ' ' ? '<span class="L" style="width:.5em"> </span>' : '<span class="L">' + c + '</span>';
    }).join('');
    var fl = $('#wm-flicker');
    FLICKER_QUOTES.forEach(function (q, i) {
      var p = document.createElement('p');
      p.textContent = q;
      p.style.top = (18 + i * 15) + '%';
      p.style.left = (8 + (i % 3) * 24) + '%';
      p.style.transform = 'rotate(' + ((i % 2 ? 1 : -1) * (2 + i)) + 'deg)';
      fl.appendChild(p);
    });
  })();

  /* chapter cards + narrative cards + captions + quotes */
  var cardEls = {}, capEls = {}, ncardEls = {},
      quoteEl = $('#quote'), quoteP = $('#quote p'), quoteCite = $('#quote cite');
  SCRIPT.forEach(function (ch) {
    var card = el('div', 'moment chapter-card a-' + ch.id, '', $('#film'));
    card.innerHTML = '<div><p class="cc-eyebrow">CHAPTER ' + ch.num + '</p><h2>' + ch.name +
                     '</h2><p class="cc-sub">' + ch.sub + '</p></div>';
    cardEls[ch.id] = card;
    capEls[ch.id] = (ch.caps || []).map(function (c) {
      var d = document.createElement('div');
      d.className = 'cap'; d.innerHTML = c;
      $('#captions').appendChild(d);
      return d;
    });
    /* narrative cards — kicker + masked-line statement (+ italic detail) */
    ncardEls[ch.id] = (ch.cards || []).map(function (c) {
      var n = document.createElement('div');
      n.className = 'ncard k-' + ch.id + ' ' + (c.a || ch.anchor || 'a-ll');
      n.innerHTML = '<p class="nc-kicker">' + c.k + '<span class="nc-rule"></span></p>' +
                    '<p class="nc-statement">' + c.s + '</p>' +
                    (c.d ? '<p class="nc-detail">' + c.d + '</p>' : '');
      $('#ncards').appendChild(n);
      var st = n.querySelector('.nc-statement');
      /* The embed may re-split at the final viewport while held at zero.
         Once playback starts, these authored timeline references stay fixed. */
      st._split = SplitText.create(st, { type: 'lines', mask: 'lines' });
      return n;
    });
  });
  var splitViewport = { width: innerWidth, height: innerHeight };
  /* essays parade */
  var essayEls = (SCRIPT[5].essays || []).map(function (t, i) {
    var s = document.createElement('span');
    s.className = 'essay'; s.innerHTML = '<i>✦</i>' + t;
    s.style.top = (24 + (i % 5) * 12) + '%';
    $('#parade').appendChild(s);
    return s;
  });
  /* roll-call */
  var rcEls = ROLLCALL.map(function (w) {
    var d = document.createElement('div');
    d.className = 'rc'; d.textContent = w;
    $('#rollcall').appendChild(d);
    return d;
  });

  /* ---------------- little helpers ---------------- */
  function matte(tl, vh, dur, pos) {
    tl.to(['#matte-top', '#matte-bot'], { height: vh + 'vh', duration: dur, ease: 'power2.inOut' }, pos);
  }
  function hit(tl, cue, beatAt, opts) {
    var lead = Math.max(0, A.peak(cue) - ((opts && opts.offset) || 0));
    tl.call(function () { A.play(cue, opts); }, null, Math.max(0, beatAt - lead));
  }
  function showMoment(tl, sel, pos, dur) {
    tl.set(sel, { visibility: 'visible' }, pos);
    tl.fromTo(sel, { opacity: 0 }, { opacity: 1, duration: dur || 0.7, ease: 'power2.out' }, pos);
  }
  function hideMoment(tl, sel, pos, dur) {
    tl.to(sel, { opacity: 0, duration: dur || 0.6, ease: 'power2.in' }, pos);
    tl.set(sel, { visibility: 'hidden' }, pos + (dur || 0.6));
  }
  function flash(tl, pos, strength) {
    tl.fromTo('#flash', { opacity: 0 }, { opacity: strength || 0.05, duration: 0.07, ease: 'none' }, pos);
    tl.to('#flash', { opacity: 0, duration: 0.45, ease: 'power2.out' }, pos + 0.07);
  }
  /* typed line with real typewriter clicks (throttled to every 2nd char) */
  function typed(tl, elP, text, pos, cps) {
    cps = cps || 26;
    var proxy = { i: 0 }, shown = -1;
    tl.call(function () { elP.innerHTML = '<span class="caret"></span>'; }, null, pos);
    tl.to(proxy, {
      i: text.length, duration: text.length / cps, ease: 'none',
      onUpdate: function () {
        var n = Math.floor(proxy.i);
        if (n !== shown) {
          if (n > shown && n % 2 === 0) A.play('type-click');
          shown = n;
          elP.innerHTML = text.slice(0, n) + '<span class="caret"></span>';
        }
      }
    }, pos);
    tl.call(function () { A.play('type-bell'); }, null, pos + text.length / cps);
    return pos + text.length / cps;
  }

  /* ---------------- film sections ---------------- */
  function secColdOpen(tl) {
    tl.addLabel('start');
    tl.call(function () {
      R.attachMain('embers');
      S.dolly.z = 8;
      /* the fallback holds SILENT for 0.85s: on the PoC the local suite's
         takeover (canplaythrough, ~0.3–0.7s warm) replaces it before it ever
         sounds — no more "retired default theme" remnant at the top (Lorenzo,
         2026-07-08). Takeover path untouched: same canplaythrough moment,
         same opening bar. Launch builds: the score enters ~0.9s into the
         cold open's typing — a musical entrance, not a late one. */
      A.music('film', { xfade: 3, restart: true, delay: 0.85 });
      A.loop('embers-loop', { gain: 0.6 });
    }, null, 0.05);
    matte(tl, 11, 1.2, 0);
    showMoment(tl, '#coldopen', 0.4, 0.5);
    var p = $('#coldopen p');
    var t1 = typed(tl, p, 'Lawyers and engineers. Founders and philosophers. Humans and machines.', 1.0);
    var t2 = typed(tl, p, 'Every specialist speaks a different language.', t1 + 1.6, 22);
    hideMoment(tl, '#coldopen', t2 + 1.7, 0.7);
    return t2 + 2.6;
  }

  function secWordmark(tl, at) {
    tl.call(function () { A.stopLoop('embers-loop', 1.2); }, null, at);
    showMoment(tl, '#wordmark', at, 0.4);
    tl.set('#wm-flicker', { opacity: 1 }, at);
    tl.fromTo('#wm-flicker p', { opacity: 0 },
      { opacity: 0.09, duration: 0.12, ease: 'steps(1)', stagger: { each: 0.18, repeat: 9, yoyo: true } }, at);
    hit(tl, 'logo-hit', at + 2.0);
    tl.fromTo('#wm-studio', { opacity: 0, letterSpacing: '1em' },
      { opacity: 1, letterSpacing: '.5em', duration: 1.4, ease: 'power3.out' }, at + 0.2);
    tl.fromTo('#wm-name .L',
      { yPercent: 65, opacity: 0, filter: 'blur(12px)' },
      { yPercent: 0, opacity: 1, filter: 'blur(0px)', duration: 1.05, ease: 'power4.out', stagger: 0.045 }, at + 0.55);
    flash(tl, at + 2.0, 0.05);
    tl.to('#wm-flicker', { opacity: 0, duration: 0.6 }, at + 2.2);
    tl.fromTo('#wm-presents', { opacity: 0 }, { opacity: 1, duration: 0.8 }, at + 2.6);
    /* push through the wordmark like a logo */
    tl.to('#wordmark', { scale: 1.14, opacity: 0, duration: 1.1, ease: 'power3.in' }, at + 4.6);
    tl.set('#wordmark', { visibility: 'hidden', scale: 1 }, at + 5.7);
    return at + 5.9;
  }

  function secTitle(tl, at) {
    showMoment(tl, '#titlecard', at, 0.3);
    hit(tl, 'title-hit', at + 2.2);
    tl.fromTo('#titlecard h2', { scale: 0.9, opacity: 0, letterSpacing: '.3em' },
      { scale: 1, opacity: 1, letterSpacing: '.06em', duration: 2.2, ease: 'power4.out' }, at);
    flash(tl, at + 2.2, 0.07);
    tl.call(function () { S.setBloom(1.15); }, null, at + 2.2);
    tl.call(function () { S.setBloom(0.85); }, null, at + 3.2);
    tl.fromTo('#titlecard .tc-sub', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.9 }, at + 2.5);
    hideMoment(tl, '#titlecard', at + 5.2, 0.8);
    return at + 6.2;
  }

  /* one chapter of life */
  function secChapter(tl, ch, at, idx) {
    var card = cardEls[ch.id];
    tl.addLabel('ch-' + ch.id, at);
    chapterLabels.push({ label: 'ch-' + ch.id, name: 'CH ' + ch.num, script: ch });

    /* reset own pieces (makes chapter-seeks clean) */
    tl.set([card, '#loccard', '#quote', '#hud'], { opacity: 0, visibility: 'hidden' }, at);
    if (capEls[ch.id].length) tl.set(capEls[ch.id], { opacity: 0 }, at);
    if (ncardEls[ch.id].length) tl.set(ncardEls[ch.id], { opacity: 0, visibility: 'hidden' }, at);
    tl.call(function () {
      if (R.current() !== ch.realm) R.attachMain(ch.realm);
      A.stopAllLoops(0.6);
      if (ch.bed) A.loop(ch.bed);
      A.music('film');                       /* the one bed — re-asserts itself after seeks */
      A.syncTo(master.time(), 0.5);          /* score stays locked to the timeline */
    }, null, at + 0.02);

    /* camera program — each chapter gets its own move.
       Card chapters are CONTENT-DRIVEN in length (cards must never bleed into
       the next portal); quote/essay/assembly chapters keep their spec lengths. */
    var cardHold = function (n) {
      var st = n.querySelector('.nc-statement');
      return 2.8 + Math.min(1.2, st.textContent.length * 0.02);
    };
    var CH_DUR, cardsSpan = 0, holdEq = 0;
    if (ch.cards) {
      cardsSpan = 3.6;                             /* lead-in */
      ncardEls[ch.id].forEach(function (n) { cardsSpan += cardHold(n) + 0.6; });
      /* equal time per card: every card holds the chapter MEAN of the reading-
         scaled holds — a pure redistribution of the same sum, so cardsSpan,
         CH_DUR, every portal beat, and the film's total length are unchanged
         (Lorenzo, 2026-07-08: even cadence; the film keeps its length).
         TAIL_ASYM then shaves/feeds a few frames per hold so the last exit
         lands 1.1–1.7s before the portal, never the same twice. */
      holdEq = (cardsSpan - 3.6) / ncardEls[ch.id].length - 0.6
             - (TAIL_ASYM[ch.id] || 0) / ncardEls[ch.id].length;
      CH_DUR = cardsSpan + 1.3;                    /* + tail */
      if (ch.quote) CH_DUR += 4.4;                 /* center-quote moment */
      if (ch.essays) CH_DUR = cardsSpan + 0.3 + (ch.essays.length - 1) * 2.1 + 5.8 + 1.3;
      CH_DUR = Math.max(16, Math.round(CH_DUR * 10) / 10);
    } else {
      CH_DUR = ch.assembly ? 28.5 : ch.quote ? 21 : ch.essays ? 19 : 16;
    }
    var camP = CAMS[ch.id] || {};
    var dz = camP.dolly || [8, 3.6];
    var vertOff = { v: 0 };                  /* vertigo shots offset the dolly */
    tl.set(C, { x: camP.x ? camP.x[0] : 0, y: camP.y ? camP.y[0] : 0, roll: 0, fov: 55 }, at);
    var drive = { p: 0 };
    tl.fromTo(drive, { p: 0 }, {
      p: 1, duration: CH_DUR, ease: 'none',
      onUpdate: function () {
        var p = drive.p;
        S.dolly.z = dz[0] + (dz[1] - dz[0]) * p + vertOff.v;
        if (camP.x) C.x = camP.x[0] + (camP.x[1] - camP.x[0]) * p;
        if (camP.y) C.y = camP.y[0] + (camP.y[1] - camP.y[0]) * p;
        R.setProgress(p);
      }
    }, at);

    /* title card under tight matte */
    matte(tl, 11, 0.8, at);
    hit(tl, 'card-hit', at + 1.0);
    if (ch.cardCue) tl.call(function () { A.play(ch.cardCue); }, null, at + 0.4);
    showMoment(tl, card, at + 0.15, 0.9);
    tl.fromTo(card.querySelector('h2'), { scale: 0.94, filter: 'blur(6px)' },
      { scale: 1, filter: 'blur(0px)', duration: 1.1, ease: 'power3.out' }, at + 0.15);
    hideMoment(tl, card, at + 3.0, 0.6);
    matte(tl, 4, 1.0, at + 3.0);

    /* location card — only for chapters not yet on narrative cards
       (kickers carry place · year in the card system; ch VII dropped its
       "PARIS — NOW" — client, patch 1) */
    if (!ch.cards && ch.loc) {
      tl.call(function () {
        var lc = $('#loccard');
        lc.textContent = ch.loc; lc.classList.remove('on');
        A.play('loc-swish');
      }, null, at + 3.4);
      tl.set('#loccard', { visibility: 'visible' }, at + 3.4);
      tl.fromTo('#loccard', { opacity: 0, x: -28, letterSpacing: '.5em' },
        { opacity: 1, x: 0, letterSpacing: '.34em', duration: 1.0, ease: 'power3.out' }, at + 3.4);
      tl.call(function () { $('#loccard').classList.add('on'); }, null, at + 3.6);
      tl.to('#loccard', { opacity: 0, duration: 0.7 }, at + 7.4);
    }

    if (ch.assembly) return secAssembly(tl, at, CH_DUR);

    var capTimes = [];
    if (ch.cards) {
      /* narrative cards — composed, per-shot, masked line reveals */
      var cAt = at + 3.6;
      ncardEls[ch.id].forEach(function (n) {
        var st = n.querySelector('.nc-statement');
        var kick = n.querySelector('.nc-kicker');
        var rule = n.querySelector('.nc-rule');
        var det = n.querySelector('.nc-detail');
        var hold = holdEq;
        capTimes.push(cAt);
        tl.set(n, { visibility: 'visible', opacity: 1 }, cAt);
        tl.fromTo(kick, { opacity: 0, letterSpacing: '.6em' },
          { opacity: 1, letterSpacing: '.34em', duration: 0.55, ease: 'power3.out' }, cAt);
        tl.fromTo(rule, { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: 'expo.out' }, cAt + 0.15);
        tl.call(function () { A.play('loc-swish', { gain: 0.7 }); }, null, cAt);
        tl.fromTo(st._split.lines, { yPercent: 112 },
          { yPercent: 0, duration: 0.7, ease: 'expo.out', stagger: 0.06 }, cAt + 0.18);
        tl.fromTo(st, { scale: 1.012 }, { scale: 1, duration: 1.1, ease: 'sine.out' }, cAt + 0.28);
        if (det) tl.fromTo(det, { opacity: 0, y: 8 },
          { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, cAt + 0.55);
        var xAt = cAt + hold;
        tl.to(st._split.lines, { yPercent: -112, duration: 0.45, ease: 'power2.in', stagger: 0.04 }, xAt);
        if (det) tl.to(det, { opacity: 0, duration: 0.3, ease: 'power2.in' }, xAt);
        tl.to(kick, { opacity: 0, duration: 0.35 }, xAt + 0.05);
        tl.to(rule, { scaleX: 0, duration: 0.35, ease: 'power2.in' }, xAt + 0.05);
        tl.set(n, { visibility: 'hidden' }, xAt + 0.55);
        cAt = xAt + 0.6;
      });
    } else {
      /* legacy subtitles (chapters awaiting retrofit) */
      var capAt = at + 3.9, capHold = ch.quote ? 2.55 : 2.9;
      capEls[ch.id].forEach(function (c) {
        capTimes.push(capAt);
        tl.fromTo(c, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' }, capAt);
        tl.to(c, { opacity: 0, y: -10, duration: 0.45, ease: 'power2.in' }, capAt + capHold);
        capAt += capHold + 0.55;
      });
    }

    /* ---- chapter-specific dramatic beats ---- */
    if (ch.id === 'origin') {
      /* creation crackle — the clusters' first contact fizzes in the portal's
         own voice (soft, low-passed); the ch-II ignition re-owns this loop at
         full brightness, so creation literally becomes the journey. Onset
         rides CH_DUR: the spheres (r≈7.5) first touch at uProg≈.5. */
      tl.call(function () { A.loop('portal-crackle', { gain: 0.62, lp: 5500, fadeIn: 2 }); },
        null, at + CH_DUR * 0.5);   /* effective 0.34 — inside the ≤0.45 accent
        tier but no longer buried (0.165 + lp2400 was inaudible under the score:
        the lowpass ate the sparkle transients that ARE the sound) */
      /* the merge's static voice — builder-hum reassigned from ch IV (client,
         round 4: the statics belong to the clouds' first contact). Three
         rising swells + two crackle accents across the contact window;
         one-shots, not a loop, so the probe's cue log SEES them. */
      tl.call(function () { A.play('builder-hum', { gain: 0.4, lp: 3000, dur: 3, rate: 0.9 }); },
        null, at + CH_DUR * 0.5);          /* gains are multipliers on cue.g —
        effective 0.12 → 0.24 → 0.36, inside the chapter's ≤0.45 accent tier */
      tl.call(function () {
        A.play('builder-hum', { gain: 0.8, lp: 4800, dur: 3 });
        A.play('mini-crackle', { gain: 0.3 });
      }, null, at + CH_DUR * 0.62);
      tl.call(function () {
        A.play('builder-hum', { gain: 1.2, dur: 3.5, rate: 1.06 });
        A.play('mini-crackle', { gain: 0.45, rate: 1.1 });
      }, null, at + CH_DUR * 0.78);
    }
    if (ch.id === 'advocate' && capTimes.length) {
      /* the bar admission lands as one weighty court boom (no whip-cracks) */
      tl.call(function () { A.play('boom-big', { offset: 1.9, gain: 0.5 }); }, null, capTimes[0] + 0.5);
      flash(tl, capTimes[0] + 0.5, 0.04);
      tl.to(C, { keyframes: [{ shake: 0.22, duration: 0.08 },
                             { shake: 0, duration: 0.5, ease: 'power2.out' }] }, capTimes[0] + 0.5);
    }
    if (ch.id === 'peacemaker' && capTimes.length > 2) {
      /* two parties fly at each other — and meet in the middle */
      var pfx = R.fx('peacemaker');
      var meetAt = capTimes[1] + 0.5;
      /* seek-ghost seal: the fromTos at meetAt rewind to 0.9/0.5 on a backward
         seek, and a set at `at` is never re-crossed (hardSeek lands at at+0.01).
         A call just past the landing point fires on EVERY entry (patch-1 bug). */
      tl.call(function () {
        pfx.burst.material.opacity = 0;
        pfx.burst.scale.set(0.1, 0.1, 1);
      }, null, at + 0.015);
      tl.fromTo(pfx.burst.material, { opacity: 0 }, { opacity: 0, duration: 0.001 }, at);
      /* rewind-proof floor: backward sweeps to EARLIER points re-apply fromTo FROMs —
         so this one re-darkens what the meet fromTos re-light (plain sets are NOT
         re-rendered on that path; proven empirically). The at+0.015 call still owns
         same-chapter re-entries. */
      tl.set(pfx.presence.material, { opacity: 0 }, at);      /* seek reset */
      tl.to(pfx.presence.material, { opacity: 0.5, duration: 1.6, ease: 'sine.out' }, at + 0.8);
      tl.to(pfx.presence.material, { opacity: 0, duration: 0.15, ease: 'power2.in' }, meetAt);
      tl.set(pfx.cometA.position, { x: -26, y: 3, z: -22 }, meetAt - 1.6);
      tl.set(pfx.cometB.position, { x: 26, y: -2.5, z: -22 }, meetAt - 1.6);
      tl.to([pfx.cometA.material, pfx.cometB.material], { opacity: 1, duration: 0.3 }, meetAt - 1.6);
      tl.to(pfx.cometA.position, { x: -0.4, y: 0.2, duration: 1.6, ease: 'power2.in' }, meetAt - 1.6);
      tl.to(pfx.cometB.position, { x: 0.4, y: -0.2, duration: 1.6, ease: 'power2.in' }, meetAt - 1.6);
      /* the impact must sound like LAW — a grounded big-bang ON the meet
         (client, 2026-07-08: was the sparkly glitter-burst). Collision
         weight: above portal-landing level, pitched down for mass, low
         thunder as the ground-shake tail. */
      hit(tl, 'boom-big', meetAt, { offset: 1.4, gain: 1.1, rate: 0.88 });
      tl.call(function () { A.play('thunder-rumble', { gain: 0.75 }); }, null, meetAt);
      tl.to([pfx.cometA.material, pfx.cometB.material], { opacity: 0, duration: 0.18 }, meetAt);
      tl.set(pfx.burst.position, { x: 0, y: 0, z: -22 }, meetAt);
      tl.fromTo(pfx.burst.material, { opacity: 0.9 }, { opacity: 0, duration: 0.9, ease: 'power2.out', immediateRender: false }, meetAt);
      tl.fromTo(pfx.burst.scale, { x: 0.5, y: 0.5 }, { x: 10, y: 10, duration: 0.9, ease: 'power3.out' }, meetAt);
      tl.to(C, { keyframes: [{ shake: 0.6, duration: 0.08 },
                             { shake: 0, duration: 0.9, ease: 'power3.out' }] }, meetAt);
    }

    /* center quote moment — anchored after the LAST text beat of either grammar
       (cAt = cards cursor, capAt = legacy caps cursor). The old capAt-only anchor
       was undefined on card chapters: GSAP coerced the NaN position to t=0, both
       quotes played buried under the cold open, and their reserved 4.4s slots ran
       as dead air before the portal — the ch III/IV long wait (Lorenzo, 2026-07-08). */
    if (ch.quote) {
      var qAt = (ch.cards ? cAt : capAt) + 0.3;
      /* per-quote lead: the IN may slide earlier — over the last card's exit,
         a crossfade in different screen bands — while the OUT keeps its
         anchor, so the moment gains hold without moving any other beat
         (client, round 3: the Diamond quote read too fast). Quotes without
         a lead are byte-identical. */
      var qShow = qAt - (ch.quote.lead || 0);
      tl.call(function () {
        quoteP.innerHTML = ch.quote.text;
        quoteCite.textContent = '— ' + ch.quote.cite;
        if (ch.quote.cue) A.play(ch.quote.cue);
      }, null, qShow);
      showMoment(tl, '#quote', qShow, 0.9);
      tl.fromTo(quoteP, { scale: 0.97 }, { scale: 1.015, duration: qAt + 3.4 - qShow, ease: 'none' }, qShow);
      hideMoment(tl, '#quote', qAt + 3.4, 0.7);
    }

    /* HUD (builder) */
    if (ch.hud) {
      tl.call(function () { A.play('hud-on'); }, null, at + 4.2);
      showMoment(tl, '#hud', at + 4.2, 0.6);
      tl.fromTo('#hud .hdata', { opacity: 0 }, { opacity: 1, duration: 0.3, stagger: 0.5 }, at + 4.6);
      for (var hb = 0; hb < 4; hb++) {
        tl.call(function () { A.play('hud-blip'); }, null, at + 4.6 + hb * 0.5);
      }
      tl.to('#hud .hring', { rotation: 60, duration: CH_DUR - 5, ease: 'none' }, at + 4.2);
      hideMoment(tl, '#hud', at + CH_DUR - 1.2, 0.6);
    }
    /* essay parade (storyteller) — the montage closes the chapter, AFTER the
       cards (never simultaneous text); each title arrives on a page-shuffle */
    if (ch.essays) {
      var eAt = ch.cards ? cAt + 0.3 : at + 4.4;   /* rides the cards cursor, so the
                                     parade inherits the chapter's tail asymmetry */
      essayEls.forEach(function (e2, i) {
        tl.call(function () { A.play('page-shuffle', { rate: 0.9 + Math.random() * 0.25 }); }, null, eAt + i * 2.1);
        tl.fromTo(e2, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out' }, eAt + i * 2.1);
        tl.fromTo(e2, { x: 0 },
          { x: function () { return -(innerWidth + e2.offsetWidth + 120); },
            duration: 5.8, ease: 'none' }, eAt + i * 2.1);
        tl.to(e2, { opacity: 0, duration: 0.4 }, eAt + i * 2.1 + 5.4);
      });
    }
    return at + CH_DUR;
  }

  /* CHAPTER VII — roll-call, thesis, the ask */
  function secAssembly(tl, at, CH_DUR) {
    tl.call(function () { A.play('energy-flow', { gain: 0.7 }); }, null, at + 0.05);

    /* the seven trades arrive as orbs and spiral into one */
    var afx = R.fx('assembly');
    var orbs = afx.orbs;
    var orbStep = (Math.PI * 2) / orbs.length;
    orbs.forEach(function (orb, i) {
      var stone = afx.stones[i];
      var a0 = i * orbStep + 0.5;
      var pr = { a: a0, r: 15 };
      /* already there from the open — no appearance beat; hold the entry mark
         until the spiral picks each stone up (Lorenzo, 2026-07-09) */
      tl.call(function () {
        orb.position.set(Math.cos(a0) * 15, Math.sin(a0) * 15 * 0.55, -20);
        stone.position.copy(orb.position);
      }, null, at + 0.02);
      tl.set(orb.material, { opacity: 0.8 }, at + 0.02);              /* radiate harder */
      tl.set(stone.material.uniforms.uAlpha, { value: 1 }, at + 0.02);
      tl.to(pr, {
        a: pr.a + 2.6, r: 0.3, duration: 3.0, ease: 'power2.in',
        onUpdate: function () {
          orb.position.set(Math.cos(pr.a) * pr.r, Math.sin(pr.a) * pr.r * 0.55, -20);
          stone.position.copy(orb.position);
        }
      }, at + 0.3 + i * 0.12);
      tl.set(afx.snaps[i].material.uniforms.uProg, { value: 0 }, at);
      /* seek-ghost seal (same class as the ch-III burst): the flash fromTos at
         landing rewind to 0.85/0.7 on a backward seek, and a set at `at` is never
         re-crossed (hardSeek lands at at+0.01). A call just past the landing point
         fires on EVERY entry. */
      tl.call(function () {
        afx.flashes[i].material.opacity = 0;
        afx.flashes[i].scale.set(0.7, 0.7, 1);
      }, null, at + 0.015);
      tl.fromTo(afx.flashes[i].material, { opacity: 0 }, { opacity: 0, duration: 0.001 }, at);
      /* rewind-proof floor — same mechanism as the ch-III burst floor */
      tl.to(orb.material, { opacity: 0, duration: 0.16 }, at + 3.3 + i * 0.12);
      tl.to(stone.material.uniforms.uAlpha, { value: 0, duration: 0.16 }, at + 3.3 + i * 0.12);
      tl.fromTo(afx.flashes[i].material, { opacity: 0.85 },
        { opacity: 0, duration: 0.35, ease: 'power2.out', immediateRender: false }, at + 3.3 + i * 0.12);
      tl.fromTo(afx.flashes[i].scale, { x: 0.7, y: 0.7 },
        { x: 3.2, y: 3.2, duration: 0.35, ease: 'power3.out' }, at + 3.3 + i * 0.12);
      tl.fromTo(afx.snaps[i].material.uniforms.uProg, { value: 0 },
        { value: 1, duration: 1.5, ease: 'none' }, at + 3.3 + i * 0.12);
    });
    tl.call(function () { A.play('star-ping', { rate: 0.8 }); }, null, at + 3.4);

    var rcAt = at + 4.0;
    tl.set('#rollcall', { visibility: 'visible', opacity: 1 }, rcAt - 0.2);
    rcEls.forEach(function (w, i) {
      var wAt = rcAt + i * 1.15;
      hit(tl, i === ROLLCALL.length - 1 ? 'boom-big' : 'card-hit', wAt + 0.55, i === ROLLCALL.length - 1 ? { offset: 1.4 } : null);
      tl.fromTo(w, { xPercent: -50, yPercent: -50, opacity: 0, scale: 1.18, filter: 'blur(8px)' },
        { xPercent: -50, yPercent: -50, opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.55, ease: 'power4.out' }, wAt);
      tl.to(w, { xPercent: -50, yPercent: -50, opacity: 0, scale: 0.94, duration: 0.5, ease: 'power2.in' }, wAt + 0.62);
    });
    var rcEnd = rcAt + ROLLCALL.length * 1.15 + 0.4;
    flash(tl, rcEnd - 0.5, 0.06);
    tl.set('#rollcall', { visibility: 'hidden' }, rcEnd);

    /* thesis — the epic keeps carrying us */
    showMoment(tl, '#thesis', rcEnd + 0.3, 1.0);
    tl.fromTo('#thesis p', { scale: 0.97 }, { scale: 1.01, duration: 5.4, ease: 'none' }, rcEnd + 0.3);
    tl.fromTo('#thesis .th-tag', { opacity: 0 }, { opacity: 1, duration: 0.9 }, rcEnd + 2.6);
    hideMoment(tl, '#thesis', rcEnd + 5.6, 0.7);

    /* the ask */
    var ctaAt = rcEnd + 6.6;
    /* .live carries pointer-events only — the credits no longer force the
       player chrome on (client, round 4: "no reason for that"); the ended
       state still shows it via setState */
    tl.call(function () { $('#cta-moment').classList.add('live'); }, null, ctaAt);
    showMoment(tl, '#cta-moment', ctaAt, 0.9);
    hit(tl, 'boom-big', ctaAt + 0.9, { offset: 1.4, gain: 0.7 });
    tl.fromTo('#cta-moment .cta', { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: 'power4.out' }, ctaAt + 0.1);
    tl.fromTo('#cta-moment .cta-links a', { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.09 }, ctaAt + 0.9);
    /* hold, then dissolve to credits */
    var end = ctaAt + 8.5;
    tl.call(function () { $('#cta-moment').classList.remove('live'); }, null, end);
    tl.call(function () { A.play('dust-whoosh'); }, null, end);
    tl.to('#cta-moment', { opacity: 0, filter: 'blur(10px)', y: -30, duration: 1.4, ease: 'power2.in' }, end);
    tl.set('#cta-moment', { visibility: 'hidden', filter: 'blur(0px)', y: 0 }, end + 1.5);
    return end + 1.8;
  }

  function secCredits(tl, at) {
    tl.addLabel('credits', at);
    chapterLabels.push({ label: 'credits', name: 'END', script: null });
    tl.call(function () {
      A.stopAllLoops(1);
      A.music('film');
      /* end-align: the score's own finale must land on the film's tag —
         never a loop-restart under the credits */
      A.syncToEnd(master.duration() - master.time());
      $('#credits').classList.add('live');
      /* the score credit names what is actually playing */
      var sc = $('#cr-score');
      if (sc) sc.textContent = 'SCORE — "THE MASTER OF THE MYSTIC END CREDITS" · MICHAEL GIACCHINO';
      if (R.current() !== 'assembly') R.attachMain('assembly');
    }, null, at + 0.02);
    matte(tl, 11, 1.4, at);
    tl.set('#credits', { visibility: 'visible', opacity: 1 }, at);
    var roll = $('#cr-roll');
    var CR_DUR = 34;
    tl.fromTo(roll, { xPercent: -50, y: 0 }, {
      xPercent: -50,
      y: function () { return -(roll.offsetHeight + innerHeight); },
      duration: CR_DUR, ease: 'none'
    }, at + 0.3);
    /* WILL RETURN card */
    var wrAt = at + CR_DUR + 0.6;
    hit(tl, 'return-hit', wrAt + 2.0);
    tl.set('#cr-return', { visibility: 'visible' }, wrAt);
    tl.fromTo('#cr-return', { opacity: 0, letterSpacing: '.6em' },
      { opacity: 1, letterSpacing: '.34em', duration: 2.0, ease: 'power3.out' }, wrAt);
    tl.to('#cr-return', { opacity: 0, duration: 1.0 }, wrAt + 4.0);
    tl.set('#cr-return', { visibility: 'hidden' }, wrAt + 5.0);
    tl.call(function () { $('#credits').classList.remove('live'); }, null, wrAt + 5.0);
    tl.set('#credits', { opacity: 0, visibility: 'hidden' }, wrAt + 5.0);
    /* the film ends the way films end — sink to black under the score;
       the tag's realm swap happens invisibly inside this black */
    tl.to('#stage', { opacity: 0, duration: 1.2, ease: 'power2.in' }, wrAt + 4.6);
    return wrAt + 6.5;
  }

  function secStinger(tl, at) {
    tl.addLabel('stinger', at);
    tl.call(function () {
      A.music('film', { gain: 0.5 });   /* same bed, settled low — never cut */
      R.attachMain('embers');
      S.dolly.z = 8;
    }, null, at + 0.02);
    tl.to('#stage', { opacity: 1, duration: 1.8, ease: 'power2.inOut' }, at + 0.4);
    /* the world settles first; then its embers gather toward one point, the
       whole field swells, and the ring catches — the portal is made OF the
       embers (Lorenzo, 2026-07-08: floor → portal felt unrelated). The typed
       line (at+3.0) anchors the 'end' label, so the tag's length is unchanged. */
    var updraft = { p: 0 };
    tl.to(updraft, { p: 1, duration: 1.2, ease: 'power2.in',
      onUpdate: function () { R.setProgress(updraft.p); } }, at + 1.2);
    var swell = { b: 0.85 };
    tl.to(swell, { keyframes: [
      { b: 1.05, duration: 0.5, ease: 'sine.in' },
      { b: 0.85, duration: 0.9, ease: 'sine.out' }
    ], onUpdate: function () { S.setBloom(swell.b); } }, at + 1.9);
    tl.add(P.open('embers2', 2.6), at + 2.4);   /* window world ≠ stage world:
                                     the live ember field must STAY on stage */
    tl.set('#stinger', { visibility: 'visible', opacity: 1 }, at + 2.4);
    var st = $('#stinger .st-type');
    /* warmer than the old "for the people who read to the end" (client,
       round 3: congratulate, don't gatekeep). +10 chars = +0.33s of tag. */
    var t1 = typed(tl, st, 'Congratulations — you waited through the credits. Here is the post-credits scene.', at + 3.0, 30);
    tl.fromTo('#stinger .st-punch', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' }, t1 + 0.8);
    tl.call(function () {
      $('#stinger').classList.add('live');
    }, null, t1 + 1.2);
    tl.fromTo('#stinger .st-actions', { opacity: 0 }, { opacity: 1, duration: 0.7 }, t1 + 1.4);
    tl.addLabel('end', t1 + 2.4);
    tl.call(function () { setState('ended'); master.pause(); }, null, t1 + 2.4);
    return t1 + 2.4;
  }

  /* ---------------- build the master ---------------- */
  function build() {
    master = gsap.timeline({ paused: true, onUpdate: syncUI });
    A.setClock(function () { return master.time(); });   /* the score's tape-sync reference */
    var t = 0;
    master.set('#film .moment', { opacity: 0, visibility: 'hidden' }, 0);
    t = secColdOpen(master);
    t = secWordmark(master, t);
    t = secTitle(master, t);
    SCRIPT.forEach(function (ch, i) {
      /* the camera must LAND on the incoming chapter's opening frame —
         carry dolly + rig to the next program's start during the travel */
      var camN = CAMS[ch.id] || {};
      var dzN = camN.dolly || [8, 3.6];
      if (i === 0) {
        master.call(function () { R.attachMain('origin'); }, null, t - 0.6);
        master.fromTo('#stage', { opacity: 0.25 }, { opacity: 1, duration: 1.6, ease: 'power2.inOut' }, t - 0.8);
        master.to(S.dolly, { z: dzN[0], duration: 1.4, ease: 'power2.inOut' }, t - 1.2);
        master.to(C, { x: camN.x ? camN.x[0] : 0, y: camN.y ? camN.y[0] : 0,
                       duration: 1.4, ease: 'power2.inOut' }, t - 1.2);
      } else {
        var ptl = P.transitionTo(ch.realm);
        master.add(ptl, t);
        var pd = ptl.duration();
        master.to(S.dolly, { z: dzN[0], duration: pd * 0.5, ease: 'power2.inOut' }, t + pd * 0.42);
        master.to(C, { x: camN.x ? camN.x[0] : 0, y: camN.y ? camN.y[0] : 0,
                       duration: pd * 0.5, ease: 'power2.inOut' }, t + pd * 0.42);
        t += pd;
      }
      t = secChapter(master, ch, t, i);
    });
    t = secCredits(master, t);
    secStinger(master, t);
    buildSeekbar();
    /* console handle for QA drives (harmless in production) */
    window.__FILM = { master: master, seek: hardSeek, points: seekPoints, labels: master.labels };
  }

  /* ---------------- player chrome ---------------- */
  var seekEl = $('#seek'), fillEl = $('#seek .fill'), tcEl = $('#tc-readout');
  function fmt(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function syncUI() {
    document.body.dataset.bridgeTime = master.time().toFixed(2);
    var p = master.time() / master.duration();
    fillEl.style.transform = 'translateY(-50%) scaleX(' + p + ')';
    tcEl.textContent = fmt(master.time()) + ' / ' + fmt(master.duration());
  }
  function buildSeekbar() {
    var dur = master.duration();
    seekPoints = [{ t: 0, name: 'OPEN' }];
    chapterLabels.forEach(function (c) {
      seekPoints.push({ t: master.labels[c.label], name: c.name, script: c.script });
    });
    seekPoints.push({ t: master.labels['stinger'], name: 'TAG' });
    seekPoints.forEach(function (pt) {
      if (pt.t == null) return;
      var tick = document.createElement('span');
      tick.className = 'tick';
      tick.style.left = (pt.t / dur * 100) + '%';
      tick.innerHTML = '<span class="tlabel">' + pt.name + '</span>';
      seekEl.appendChild(tick);
    });
  }

  /* land only on clean points (chapter starts) — a film seek, not a scrub */
  function seekTo(time) {
    var best = seekPoints[0];
    seekPoints.forEach(function (pt) { if (pt.t != null && Math.abs(pt.t - time) < Math.abs(best.t - time)) best = pt; });
    hardSeek(best);
  }
  function neighborSeek(dir) {
    var now = master.time(), cand = null;
    var pts = seekPoints.filter(function (p) { return p.t != null; }).sort(function (a, b) { return a.t - b.t; });
    if (dir > 0) cand = pts.find(function (p) { return p.t > now + 0.5; });
    else { for (var i = pts.length - 1; i >= 0; i--) if (pts[i].t < now - 1.5) { cand = pts[i]; break; } }
    if (cand) hardSeek(cand);
  }
  function hardSeek(pt) {
    if (!master || embedDisposed || rotateGated()) return;
    if (openingLayoutNeeded()) { ensureOpeningLayout().then(function () { hardSeek(pt); }); return; }
    embedHasPlayed = true;
    var wasEnded = (state === 'ended');
    P.reset();
    A.stopAllLoops(0.15);
    gsap.set('#film .moment', { opacity: 0, visibility: 'hidden' });
    gsap.set('#loccard', { opacity: 0 });
    gsap.set($$('#captions .cap'), { opacity: 0 });
    gsap.set($$('#ncards .ncard'), { opacity: 0, visibility: 'hidden' });
    gsap.set(essayEls, { opacity: 0 });
    gsap.set('#stage', { opacity: 1 });
    C.x = 0; C.y = 0; C.roll = 0; C.fov = 55; C.shake = 0;
    $('#cta-moment').classList.remove('live');
    $('#stinger').classList.remove('live');
    $('#credits').classList.remove('live');
    master.seek(Math.max(0, pt.t + 0.01), true);
    if (state !== 'playing') setState('playing');
    if (wasEnded || master.paused()) master.play();
    A.resumeAll();
    A.syncTo(master.time());   /* the score jumps WITH the film, like a real audio track */
    syncUI();
  }

  function setState(s) {
    state = s;
    document.body.dataset.bridgeState = s;
    if (window.__WORKSHOP_BRIDGE_BOOT) window.__WORKSHOP_BRIDGE_BOOT.notify(s === 'ended' ? 'ended' : 'state', { state: s });
    document.body.classList.toggle('playing', s === 'playing');
    $('#btn-play').textContent = (s === 'playing') ? '❚❚' : '▶︎';
    $('#btn-play').setAttribute('aria-label', s === 'playing' ? 'Pause' : 'Play');
    if (s !== 'playing') document.body.classList.add('chrome');
    if (s === 'playing') lockWake(); else unlockWake();
  }
  /* the screen must not sleep mid-film (client, 2026-07-10): hold a screen
     wake lock while playing (iOS 16.4+/Android; no-op elsewhere). The OS
     auto-releases on hide; the film pauses there too, so resume re-acquires
     through setState('playing'). */
  var wakeLock = null;
  function lockWake() {
    if (!navigator.wakeLock || wakeLock) return;
    navigator.wakeLock.request('screen').then(function (l) {
      wakeLock = l; window.__wake = 1;
      l.addEventListener('release', function () { wakeLock = null; window.__wake = 0; });
    }).catch(function () {});
  }
  function unlockWake() {
    if (wakeLock) { wakeLock.release().catch(function () {}); wakeLock = null; window.__wake = 0; }
  }
  function togglePlay() {
    if (!master || embedDisposed) return;
    if (state === 'ended') { hardSeek(seekPoints[0]); return; }
    if (master.paused()) { embedPlay(); }
    else { master.pause(); A.pauseAll(); setState('paused'); }
  }

  /* chrome auto-hide */
  var idleT = null;
  function pokeChrome() {
    document.body.classList.add('chrome');
    document.body.classList.remove('idle');
    clearTimeout(idleT);
    idleT = setTimeout(function () {
      if (state === 'playing') {
        document.body.classList.remove('chrome');
        document.body.classList.add('idle');
      }
    }, 2800);
  }
  addEventListener('pointermove', function (e) {
    /* hover does not exist on a phone — touch-sourced moves (incl. iOS scroll
       pans) must not keep the chrome awake; tap (pointerdown) wakes it */
    if (e.pointerType === 'touch') return;
    window.__pokeSrc = 'move'; window.__pokes = (window.__pokes | 0) + 1;
    pokeChrome();
  }, { passive: true });
  addEventListener('pointerdown', function () {
    window.__pokeSrc = 'down'; window.__pokes = (window.__pokes | 0) + 1;
    pokeChrome();
  }, { passive: true });

  /* fullscreen mode — a first-class control (client, 2026-07-10). Requests are
     never silently swallowed: failures land in window.__fsErr (the ?audioqa
     panel prints it) so a dead call on any device names its reason. */
  function fsActive() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
  function fsEnter() {
    var root = document.documentElement, p = null;
    window.__fsErr = null;
    try {
      if (root.requestFullscreen) {
        try { p = root.requestFullscreen({ navigationUI: 'hide' }); }
        catch (eOpts) { p = root.requestFullscreen(); }  /* options bag rejected → plain retry */
      } else if (root.webkitRequestFullscreen) {
        p = root.webkitRequestFullscreen();
      } else {
        window.__fsErr = 'no fullscreen API';
      }
      if (p && p.catch) p.catch(function (e) { window.__fsErr = String(e); });
    } catch (e) { window.__fsErr = String(e); }
  }
  function fsExit() {
    try {
      if (document.exitFullscreen) document.exitFullscreen().catch(function () {});
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    } catch (e) {}
  }
  var fsBtn = $('#btn-fs');
  var fsAPI = !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
  var fsStandalone = navigator.standalone === true ||
    (window.matchMedia && matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches);
  if (fsStandalone) {
    fsBtn.style.display = 'none';          /* already chromeless — nothing to offer */
  } else if (!fsAPI) {
    /* iPhone Safari: element fullscreen does not exist (client device tests
       2026-07-10 ×2). The button becomes the guide to the true chromeless
       path — the home-screen app. */
    fsBtn.addEventListener('click', function () { $('#fshint').classList.add('on'); });
  } else {
    fsBtn.addEventListener('click', function () { if (fsActive()) fsExit(); else fsEnter(); });
  }
  function fsSync() {
    fsBtn.textContent = fsActive() ? 'EXIT FULLSCREEN' : 'FULLSCREEN';
    fsBtn.setAttribute('aria-pressed', String(fsActive()));
  }
  document.addEventListener('fullscreenchange', fsSync);
  document.addEventListener('webkitfullscreenchange', fsSync);
  /* the swipe coach (iPhone Safari): landscape chrome hides COMPLETELY on a
     user scroll; every film layer is fixed, so one swipe removes the bars
     and moves nothing else. Shown on ENTER, gone on the first scroll. */
  var coachT = null;
  function fsCoach() {
    $('#swipeup').classList.add('on');
    clearTimeout(coachT);
    coachT = setTimeout(function () { $('#swipeup').classList.remove('on'); }, 4800);
  }
  addEventListener('scroll', function () { $('#swipeup').classList.remove('on'); }, { passive: true });
  $('#fh-close').addEventListener('click', function () { $('#fshint').classList.remove('on'); });
  $('#fshint').addEventListener('click', function (e) {
    if (e.target === this) this.classList.remove('on');   /* tap-anywhere dismiss */
  });

  /* wire controls */
  $('#btn-play').addEventListener('click', togglePlay);
  $('#btn-mute').addEventListener('click', function () {
    var m = !A.muted(); A.setMuted(m);
    this.setAttribute('aria-pressed', String(m));
    this.textContent = m ? 'SOUND OFF' : 'SOUND ON';
  });
  $('#btn-restart').addEventListener('click', function () { hardSeek(seekPoints[0]); });
  $('#btn-skip').addEventListener('click', function () {
    var asm = seekPoints.find(function (p) { return p.name === 'CH VII'; });
    var cr = seekPoints.find(function (p) { return p.name === 'END'; });
    hardSeek(master.time() >= (asm ? asm.t : 1e9) ? cr : asm);
  });
  seekEl.addEventListener('click', function (e) {
    var r = seekEl.getBoundingClientRect();
    seekTo((e.clientX - r.left) / r.width * master.duration());
  });
  addEventListener('keydown', function (e) {
    if (!master || embedDisposed || state === 'gate' || document.body.classList.contains('reading') || rotateGated()) return;
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); pokeChrome(); }
    else if (e.key === 'ArrowRight') { neighborSeek(1); pokeChrome(); }
    else if (e.key === 'ArrowLeft') { neighborSeek(-1); pokeChrome(); }
    else if (e.key === 'm' || e.key === 'M') $('#btn-mute').click();
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && state === 'playing') { master.pause(); A.pauseAll(); setState('paused'); }
  });
  /* rotate gate: portrait touch pauses the film; landscape resumes only what IT paused
     (a manual pause survives the round-trip). CSS owns the overlay's visibility. */
  var rotMq = matchMedia('(orientation: portrait)');
  var pausedByRotate = false;
  function rotateGated() {
    return rotMq.matches && (matchMedia('(pointer: coarse)').matches || matchMedia('(max-width: 700px)').matches) &&
           !document.body.classList.contains('reading');
  }
  function onRotate() {
    if (embedDisposed) return;
    if (rotateGated()) {
      /* the && master guards the ENTER→build window: state is 'playing' up to
         ~900ms before master exists; go() re-runs onRotate once built */
      if (state === 'playing' && master) { master.pause(); A.pauseAll(); setState('paused'); pausedByRotate = true; }
    } else if (pausedByRotate) {
      pausedByRotate = false;
      if (state === 'paused' && !document.body.classList.contains('reading')) {
        embedPlay();
      }
    }
  }
  if (rotMq.addEventListener) rotMq.addEventListener('change', onRotate);
  else rotMq.addListener(onRotate);                          /* older Safari */
  /* convertibles: a fine↔coarse pointer flip (keyboard attach/detach) can show
     the CSS card without any orientation event — re-run the same handler */
  var coarseMq = matchMedia('(pointer: coarse)');
  if (coarseMq.addEventListener) coarseMq.addEventListener('change', onRotate);
  else if (coarseMq.addListener) coarseMq.addListener(onRotate);
  /* Viewport width can cross the narrow-desktop gate without rotating. */
  addEventListener('resize', onRotate);
  /* click on empty stage = pause/play (never on links/buttons) */
  addEventListener('click', function (e) {
    if (state === 'gate' || state === 'ended') return;
    if (e.target.closest('#player,#gate,#rotate,#fshint,a,button,#transcript')) return;
    togglePlay();
  });

  /* ---------------- the gate ---------------- */
  function enter(muted) {
    if (window.__WORKSHOP_BRIDGE_BOOT) {
      window.__WORKSHOP_BRIDGE.arm(muted).then(function () { return window.__WORKSHOP_BRIDGE.play(); }).catch(function () {});
      return;
    }
    if (state !== 'gate') return;
    /* the tap must be SEEN the instant it lands — A.start's arming window
       (≤0.9s race) used to leave the gate static and the first tap read as
       a miss, so people tapped again and credited tap two (client, round 4b:
       "I should only have to click once, no?"). One tap; the gate answers. */
    window.__gateLog && window.__gateLog.enter++;
    document.body.classList.add('entering');
    /* the PHONE mode launches itself (pointer:coarse = the detection):
       Android gets real fullscreen on the same trusted gesture; iPhone Safari
       (no element-fullscreen API exists there) gets the swipe coach — one
       swipe and Safari's landscape chrome leaves entirely. Desktop ENTER
       never auto-fullscreens; the player control is the explicit path. */
    if (matchMedia('(pointer: coarse)').matches && !fsStandalone) {
      if (fsAPI) fsEnter(); else fsCoach();
    }
    setState('playing');
    var go = function () {
      window.__gateLog && window.__gateLog.go++;
      $('#gate').classList.add('gone');
      build();
      master.play(0);
      onRotate();   /* ENTER→rotate race: if the device went portrait during
                       A.start's window, hold the freshly built film now */
      pokeChrome();
    };
    Promise.race([A.start(muted), new Promise(function (res) { setTimeout(res, 900); })]).then(go, go);
  }
  /* gate tap telemetry — the ?audioqa panel prints it, so a device report
     can say whether a "lost" first tap ever reached the page at all
     (Safari's landscape bar-summon can eat one) or just went unacknowledged */
  window.__gateLog = { pd: 0, ck: 0, pu: 0, enter: 0, go: 0 };
  [['#enter-sound', false], ['#enter-muted', true]].forEach(function (pair) {
    var el = $(pair[0]);
    el.addEventListener('pointerdown', function () { window.__gateLog.pd++; });
    /* iOS may withhold a first tap's CLICK (hover-emulation / bar-summon grey
       zone) — the raw touch pointerup IS the tap, so ENTER answers it directly.
       enter() is state-guarded: the click that may follow is a no-op, and
       mouse/pen/keyboard keep the click path (desktop unchanged). WebKit
       grants user activation on touch pointerup, so audio arming still holds. */
    el.addEventListener('pointerup', function (e) {
      window.__gateLog.pu++;
      if (e.pointerType === 'touch') enter(pair[1]);
    });
    el.addEventListener('click', function () { window.__gateLog.ck++; enter(pair[1]); });
  });

  function wireTranscriptLinks() {
    $$('.to-transcript').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        if (master && !master.paused()) { master.pause(); A.pauseAll(); setState('paused'); }
        document.body.classList.add('reading');
        window.scrollTo(0, 0);
      });
    });
    var back = $('#t-close');
    if (back) back.addEventListener('click', function () {
      document.body.classList.remove('reading');
      window.scrollTo(0, 0);
    });
  }
  wireTranscriptLinks();

  /* ?qaseek=CH IV+8 — QA-only (param-gated like ?audioqa): auto-enter muted,
     land on the named seek point (+optional offset), freeze for a still.
     Exists for tap-less device QA — the iOS Simulator has no reliable input
     synthesis from the host. */
  var qaSeek = location.search.match(/[?&]qaseek=([^&]+)/);
  if (qaSeek) setTimeout(function () {
    if (state !== 'gate') return;
    enter(true);
    setTimeout(function () {
      var spec = decodeURIComponent(qaSeek[1]).replace(/\+/g, ' ').split('/');
      var pt = seekPoints.filter(function (p) { return p.name === spec[0]; })[0];
      if (pt) hardSeek(pt);
      var off = parseFloat(spec[1]);
      /* suppressEvents FALSE: crossing calls must fire so typed text, HUD
         hides and fx resets paint exactly as a live playhead would */
      if (off) master.seek(master.time() + off, false);
      master.pause(); A.pauseAll(); setState('paused');
    }, 1400);
  }, 600);

  /* stinger buttons */
  $('#st-replay').addEventListener('click', function () {
    if (rotateGated()) return;   /* never restart the film behind the rotate card */
    hardSeek(seekPoints[0]);
  });

  /* idle embers behind the gate */
  R.attachMain('embers');
  P.init();
  gsap.ticker.add(function () { R.tick(S.time()); });

  /* Workshop transport only: authored timeline, chapters and score cues above are unchanged. */
  var embedDisposed = false, embedPrepared = false, embedHasPlayed = false, armPromise = null, playGeneration = 0;
  var embedBoot = window.__WORKSHOP_BRIDGE_BOOT, openingLayoutPromise = null;
  function openingLayoutNeeded() {
    return !embedHasPlayed && master && master.time() === 0 && !rotateGated() &&
      (splitViewport.width !== innerWidth || splitViewport.height !== innerHeight);
  }
  function ensureOpeningLayout() {
    if (!openingLayoutNeeded()) return Promise.resolve();
    if (openingLayoutPromise) return openingLayoutPromise;
    /* Keep both transports held while restored text schedules its new fonts. */
    master.pause(0); A.pauseAll(); master.kill(); P.reset();
    var statements = [];
    Object.keys(ncardEls).forEach(function (key) {
      ncardEls[key].forEach(function (card) {
        var statement = card.querySelector('.nc-statement');
        if (statement._split) statement._split.revert();
        statement._split = null; statements.push(statement);
      });
    });
    splitViewport = { width: 0, height: 0 };
    function settleFonts() {
      var width = innerWidth, height = innerHeight;
      return new Promise(function (resolve) { requestAnimationFrame(resolve); }).then(function () {
        var fontSet = document.fonts;
        var loads = statements.map(function (statement) {
          statement.getBoundingClientRect(); // Commit restored text and viewport styles.
          var style = getComputedStyle(statement);
          return fontSet ? fontSet.load(style.fontStyle + ' ' + style.fontWeight + ' ' + style.fontSize + ' ' + style.fontFamily, statement.textContent) : Promise.resolve();
        });
        return Promise.all(loads).then(function () { return fontSet ? fontSet.ready : null; });
      }).then(function () {
        return new Promise(function (resolve) { requestAnimationFrame(resolve); });
      }).then(function () {
        statements.forEach(function (statement) { statement.getBoundingClientRect(); });
        return document.fonts ? document.fonts.ready : null;
      }).then(function () {
        if (!embedDisposed && (width !== innerWidth || height !== innerHeight)) return settleFonts();
      });
    }
    openingLayoutPromise = settleFonts().then(function () {
      if (embedDisposed || rotateGated()) return;
      statements.forEach(function (statement) {
        statement._split = SplitText.create(statement, { type: 'lines', mask: 'lines' });
      });
      chapterLabels = []; seekPoints = [];
      $$('#seek .tick').forEach(function (tick) { tick.remove(); });
      splitViewport = { width: innerWidth, height: innerHeight };
      build(); master.pause(0);
    }).finally(function () { openingLayoutPromise = null; });
    return openingLayoutPromise;
  }
  function embedSnapshot() {
    return { ready: true, prepared: embedPrepared, state: embedDisposed ? 'disposed' : state,
      currentTime: master ? master.time() : 0, duration: master ? master.duration() : 0,
      preview: document.documentElement.classList.contains('portal-preview'),
      muted: A.muted(), rotateGated: rotateGated(), layoutWidth: splitViewport.width, layoutHeight: splitViewport.height, audio: A.playbackState() };
  }
  function embedMute(muted) {
    A.setMuted(!!muted);
    $('#btn-mute').setAttribute('aria-pressed', String(!!muted));
    $('#btn-mute').textContent = muted ? 'SOUND OFF' : 'SOUND ON';
  }
  function embedPrompt(message) {
    if (embedDisposed) return;
    ++playGeneration;
    if (master) master.pause();
    A.pauseAll(); pausedByRotate = false; setState('awaiting-gesture');
    $('#bridge-prompt-text').textContent = message || 'Tap to start the film with sound.';
    $('#bridge-prompt').hidden = false;
    embedBoot.notify('needs-gesture', { snapshot: embedSnapshot() });
  }
  function embedArm(muted) {
    if (embedDisposed) return Promise.reject(new Error('This film has been closed.'));
    gsap.ticker.wake();
    embedMute(muted);
    /* This call MUST remain synchronous in the parent/native trusted click. */
    var audioReady = A.start(!!muted);
    if (armPromise) return armPromise;
    document.body.classList.add('entering');
    setState('arming');
    armPromise = Promise.race([audioReady, new Promise(function (resolve) { setTimeout(resolve, 900); })]).then(function () {
      if (embedDisposed) throw new Error('This film has been closed.');
      build(); master.pause(0); embedPrepared = true;
      $('#gate').classList.add('gone');
      setState('paused');
      embedBoot.notify('armed', { snapshot: embedSnapshot() });
      return embedSnapshot();
    }).catch(function (error) {
      embedBoot.notify('error', { message: error.message });
      throw error;
    });
    return armPromise;
  }
  function embedPresent() {
    if (embedDisposed) return embedSnapshot();
    document.documentElement.classList.remove('portal-preview');
    pokeChrome();
    return embedSnapshot();
  }
  function embedRequestPlay(options) {
    if (embedDisposed) return Promise.reject(new Error('This film has been closed.'));
    if (options && options.preview === true) document.documentElement.classList.add('portal-preview');
    else embedPresent();
    return embedPlay();
  }
  function embedPlay() {
    if (embedDisposed) return Promise.reject(new Error('This film has been closed.'));
    if (!armPromise) { embedPrompt(); return Promise.resolve(embedSnapshot()); }
    var generation = ++playGeneration;
    if (rotateGated()) {
      if (master) master.pause();
      A.pauseAll(); pausedByRotate = true;
      if (embedPrepared) setState('paused');
      return armPromise.then(function () { return embedSnapshot(); });
    }
    /* Reflow holds audio until restored text and its actual-size fonts settle.
       Ordinary retry clicks still resume synchronously in the gesture. */
    var audioReady = openingLayoutNeeded() ? ensureOpeningLayout().then(function () {
      if (embedDisposed || generation !== playGeneration || rotateGated()) return false;
      return A.resumeAll();
    }) : A.resumeAll();
    return armPromise.then(function () { return audioReady; }).then(function (allowed) {
      if (embedDisposed || generation !== playGeneration) return embedSnapshot();
      if (document.hidden) { embedPause(); return embedSnapshot(); }
      if (rotateGated()) { master.pause(); A.pauseAll(); pausedByRotate = true; setState('paused'); return embedSnapshot(); }
      if (!allowed && !A.muted()) { embedPrompt(); return embedSnapshot(); }
      if (openingLayoutNeeded()) return embedPlay();
      $('#bridge-prompt').hidden = true;
      if (state === 'ended') hardSeek(seekPoints[0]);
      else { embedHasPlayed = true; master.play(); setState('playing'); }
      onRotate(); pokeChrome();
      return embedSnapshot();
    });
  }
  function embedPause() {
    ++playGeneration;
    if (embedDisposed) return embedSnapshot();
    if (master) master.pause();
    A.pauseAll(); pausedByRotate = false;
    if (embedPrepared) setState(state === 'ended' ? 'ended' : 'paused');
    return embedSnapshot();
  }
  function embedDispose() {
    if (embedDisposed) return;
    embedPause(); embedDisposed = true;
    clearTimeout(idleT); unlockWake(); A.dispose();
    if (master) master.kill();
    gsap.globalTimeline.clear(); gsap.ticker.sleep();
    var renderer = S.renderer();
    if (renderer) { renderer.dispose(); renderer.forceContextLoss(); }
    $('#bridge-prompt').hidden = true;
    embedBoot.notify('disposed');
  }
  addEventListener('bridge-audio-blocked', function () { embedPrompt('Your browser needs a tap to start sound.'); });
  addEventListener('pagehide', embedDispose);
  if (embedBoot) embedBoot.register({ arm: embedArm, play: embedRequestPlay, present: embedPresent, pause: embedPause,
    setMuted: embedMute, dispose: embedDispose, snapshot: embedSnapshot });
  /* Full-size preloading must not compete with the workshop's renderer. */
  document.body.dataset.bridgeState = state;
  gsap.ticker.sleep();
  }
  /* SplitText runs during initialization, before the timeline is built. Load
     every embedded film face first so its permanent line breaks are correct. */
  var fontSet = document.fonts;
  var fontsReady = fontSet ? Promise.all([
    fontSet.load('400 16px "Michroma"'),
    fontSet.load('400 16px "Cinzel"'),
    fontSet.load('700 16px "Cinzel"'),
    fontSet.load('400 16px "EB Garamond"'),
    fontSet.load('700 16px "EB Garamond"'),
    fontSet.load('italic 400 16px "EB Garamond"')
  ]).then(function () { return fontSet.ready; }) : Promise.resolve();
  fontsReady.then(initializeFilm).catch(function (error) {
    window.__WORKSHOP_BRIDGE_BOOT.fail(error.message || 'The film typography could not load.');
  });
})();
