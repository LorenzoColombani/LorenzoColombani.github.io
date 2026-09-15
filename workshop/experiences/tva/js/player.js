/* ═══════════════════════════════════════════════════════════════════════
   player.js — the timeline controller. The rail is the film's own phosphor
   band; the playhead is a junction node; the notches are the file's beats.
   YouTube grammar: wakes on any activity, sleeps after ~2.8s of stillness
   while playing, never sleeps while paused, dragging, hovered or focused.
   Consumes only the window.__LOKI surface (clock/seek/pause/play/state).
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var L = window.__LOKI;
  var player = document.getElementById('player');
  var stage = document.getElementById('stage');
  var rail = document.getElementById('pl-rail');
  var fill = document.getElementById('pl-fill');
  var head = document.getElementById('pl-head');
  var ticksEl = document.getElementById('pl-ticks');
  var tip = document.getElementById('pl-tip');
  var toggle = document.getElementById('pl-toggle');
  var timeEl = document.getElementById('pl-time');
  if (!L || !player || !rail) return;

  var DUR = L.dur;
  var IDLE_MS = 2800;
  var SEEK_GAP_MS = 190;      // scrub throttle: ≤ ~5 real seeks a second

  function fmt(t) {
    t = Math.max(0, Math.floor(t));
    var m = Math.floor(t / 60), s = t % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }
  var DUR_LABEL = fmt(DUR);

  /* ---------- beat notches — the file's own cue sheet ---------- */
  /* third field: 1 = act mark — the four hinges of the record (the stamp, the
     turn, the credo, the stinger) read taller/brighter so the cue sheet has
     structure at a glance instead of nineteen equal notches. */
  var C = L.C, BEATS = [
    [C.variantStamp, 'VARIANT', 1],
    [C.wmStart, 'THE NAME', 0],
    [C.cast[0], 'DEVIATION 01 / 07', 0], [C.cast[1], 'DEVIATION 02 / 07', 0],
    [C.cast[2], 'DEVIATION 03 / 07', 0], [C.cast[3], 'DEVIATION 04 / 07', 0],
    [C.cast[4], 'DEVIATION 05 / 07', 0], [C.cast[5], 'DEVIATION 06 / 07', 0],
    [C.cast[6], 'DEVIATION 07 / 07', 0],
    [C.doctrine, 'DOCTRINE', 0],
    [C.crew[0], 'CREW OF LOVES', 0],
    [C.directedBy, 'DIRECTED BY', 0],
    [C.evidence, 'CASE REVIEW', 0],
    [C.reclass, 'UNCLASSIFIABLE', 0],
    [C.turn, 'THE TURN', 1],
    [C.still, 'STILLNESS', 0],
    [C.createdBy, 'CREDO', 1],
    [C.sting, 'STINGER', 1],
    [C.attr1, 'ATTRIBUTION', 0]
  ];
  var i;
  for (i = 0; i < BEATS.length; i++) {
    var tk = document.createElement('div');
    tk.className = 'pl-tick' + (BEATS[i][2] ? ' pl-tick-major' : '');
    tk.style.left = (BEATS[i][0] / DUR * 100) + '%';
    tk.setAttribute('data-label', BEATS[i][1] + ' · ' + fmt(BEATS[i][0]));
    ticksEl.appendChild(tk);
  }
  ticksEl.addEventListener('mouseover', function (e) {
    var lb = e.target.getAttribute && e.target.getAttribute('data-label');
    if (!lb) return;
    tip.textContent = lb;
    tip.style.left = e.target.style.left;
    tip.hidden = false;
    /* the label types on, like everything in this film types on. Class swap +
       forced reflow restarts the clip-path animation per hover. */
    tip.classList.remove('typing');
    void tip.offsetWidth;
    tip.classList.add('typing');
  });
  ticksEl.addEventListener('mouseout', function () { tip.hidden = true; });

  var noSeek = L.synthMode();
  if (noSeek) {
    rail.setAttribute('aria-disabled', 'true');
    rail.title = 'Seeking is unavailable in evocation (homemade score) mode';
  }

  /* ---------- wake / sleep ---------- */
  var visible = false, idleTimer = null, dragging = false, hoverPlayer = false;
  player.addEventListener('mouseenter', function () { hoverPlayer = true; });
  player.addEventListener('mouseleave', function () { hoverPlayer = false; });
  function mayHide() {
    return L.started() && !L.paused() && !dragging && !hoverPlayer &&
           !player.contains(document.activeElement) && L.t() < DUR - 6;
  }
  function hide() {
    if (!mayHide()) {
      /* paused + idle: the chrome RECEDES instead of vanishing (pl-dim, ~20%
         opacity) — pausing is when a viewer looks at the frame, and the frame
         should belong to them. State stays legible; any activity restores. */
      if (L.started() && L.paused() && !dragging && !hoverPlayer &&
          !player.contains(document.activeElement)) player.classList.add('pl-dim');
      return;
    }
    visible = false; player.classList.add('pl-hidden'); stage.classList.add('pl-idle');
  }
  function show() {
    if (!L.started()) return;
    visible = true;
    player.classList.remove('pl-hidden');
    player.classList.remove('pl-dim');
    stage.classList.remove('pl-idle');
    if (idleTimer) clearTimeout(idleTimer);
    /* paused rest is slower to arrive than the playing sleep — contemplation
       shouldn't feel policed */
    idleTimer = setTimeout(hide, L.paused() ? 5200 : IDLE_MS);
  }
  document.addEventListener('pointermove', show, { passive: true });
  /* tap = TOGGLE, the YouTube grammar (his note): a tap on the film surface
     dismisses the chrome at once — explicit intent outranks the idle rules,
     paused included. The next tap (or any mouse move) brings it back. Taps on
     the chrome, the tags, the replay tab and the gate keep their own meaning. */
  document.addEventListener('pointerdown', function (e) {
    if (!L.started()) return;
    var t = e.target;
    if (player.contains(t)) { show(); return; }
    if (t && t.closest && t.closest('#replay-tab, .ex-tag, #rotate, #gate')) return;
    if (visible) {
      if (idleTimer) clearTimeout(idleTimer);
      visible = false;
      player.classList.remove('pl-dim');
      player.classList.add('pl-hidden'); stage.classList.add('pl-idle');
    } else show();
  }, { passive: true });
  document.addEventListener('keydown', function () { show(); });
  document.documentElement.addEventListener('mouseleave', function () {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(hide, 400);
  });

  /* ---------- transport ---------- */
  var lastGlyph = null;
  function setGlyph() {
    var p = L.paused();
    if (p === lastGlyph) return;
    lastGlyph = p;
    toggle.textContent = p ? '►' : '❚❚';
    toggle.setAttribute('aria-label', p ? 'Play' : 'Pause');
  }
  function togglePlay() { if (L.paused()) L.play(); else L.pause(); setGlyph(); show(); }
  toggle.addEventListener('click', togglePlay);
  document.addEventListener('keydown', function (e) {
    if (!L.started()) return;
    var tag = (e.target && e.target.tagName) || '';
    if (tag === 'BUTTON' || tag === 'A' || tag === 'INPUT' || e.target === rail) return;
    if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); togglePlay(); }
  });

  /* ---------- scrubbing ---------- */
  var wasPlaying = false, lastSeekAt = 0, pendingT = null;
  function railT(e) {
    var r = rail.getBoundingClientRect();
    var f = (e.clientX - r.left) / Math.max(1, r.width);
    return Math.max(0, Math.min(1, f)) * DUR;
  }
  function scrubTo(x, force) {
    pendingT = x; // visuals track the finger immediately
    var now = performance.now();
    if (force || now - lastSeekAt >= SEEK_GAP_MS) { lastSeekAt = now; L.seek(x); }
  }
  rail.addEventListener('pointerdown', function (e) {
    if (noSeek || !L.started()) return;
    dragging = true;
    if (rail.setPointerCapture) rail.setPointerCapture(e.pointerId);
    wasPlaying = !L.paused();
    if (wasPlaying) L.pause();
    scrubTo(railT(e), true);
    show();
    e.preventDefault();
  });
  rail.addEventListener('pointermove', function (e) { if (dragging) scrubTo(railT(e)); });
  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    scrubTo(railT(e), true);
    pendingT = null;
    if (wasPlaying) L.play();
    setGlyph(); show();
  }
  rail.addEventListener('pointerup', endDrag);
  rail.addEventListener('pointercancel', endDrag);
  rail.addEventListener('keydown', function (e) {
    if (noSeek) return;
    var t = L.t();
    if (e.key === 'ArrowLeft') { L.seek(t - 5); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { L.seek(t + 5); e.preventDefault(); }
    else if (e.key === 'Home') { L.seek(0); e.preventDefault(); }
    else if (e.key === 'End') { L.seek(DUR - 1); e.preventDefault(); }
    else if (e.key === ' ' || e.key === 'Enter') { togglePlay(); e.preventDefault(); }
    show();
  });

  /* ---------- the needle follows the clock ---------- */
  var lastTimeStr = '', lastAria = 0, wasStarted = false;
  function frame() {
    requestAnimationFrame(frame);
    if (!L.started()) return;
    if (!wasStarted) { wasStarted = true; show(); }
    var t = dragging && pendingT !== null ? pendingT : L.t();
    var td = Math.min(t, DUR); // display clamp — the wall clock runs past the record's end by design (the scrubbable tail); the readout must not
    var pct = Math.max(0, Math.min(1, t / DUR)) * 100;
    fill.style.width = pct + '%';
    head.style.left = pct + '%';
    var str = 'T+ ' + fmt(td) + ' / ' + DUR_LABEL + ' · CASE L-1607';
    if (str !== lastTimeStr) { lastTimeStr = str; timeEl.textContent = str; }
    var now = performance.now();
    if (now - lastAria > 500) {
      lastAria = now;
      rail.setAttribute('aria-valuenow', String(Math.floor(td))); // floor, like fmt — round(158.5) would breach aria-valuemax=158
      rail.setAttribute('aria-valuetext', fmt(td) + ' of ' + DUR_LABEL);
    }
    // the end of the record keeps its furniture on the desk
    if ((L.paused() || t >= DUR - 6) && !visible) show();
    setGlyph();
  }
  requestAnimationFrame(frame);
})();
