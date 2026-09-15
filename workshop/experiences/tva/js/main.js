/* ═══════════════════════════════════════════════════════════════════════
   main.js — the conductor. The score is the clock; every cue below is a
   measured onset from assets/beats.json (see NOTES.md). Scenes, timeline,
   wordmark and the grade are all pure functions of t — seeking is free.

   ASSETS_MODE (§6 of the brief): 'show' uses the series score + the four
   logo typefaces from assets/show/ (gitignored); 'homemade' uses a WebAudio
   evocation and the Google pool only. Override per view: ?assets=homemade
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var U = window.FX.util;

  var ASSETS_MODE = 'show'; // 'show' | 'homemade'  — the §6 toggle
  var qs = new URLSearchParams(location.search);
  if (qs.get('assets') === 'homemade' || qs.get('assets') === 'show') ASSETS_MODE = qs.get('assets');

  /* ---------- THE CUE SHEET — measured onsets ---------- */
  var CUE = {
    paperIn: 0.464,
    variantStamp: 10.449,      // strongest hit of the whole track
    wmStart: 11.65,
    wmIntensify: 16.602,
    cast: [23.812, 28.816, 32.717, 36.049, 40.472, 44.907, 48.8],
    doctrine: 52.129,          // the dip begins (music/ambience marker — no card owns this anymore, R2 T4)
    castEnd: 54.5,             // card 7 breathes out here; replaces the old doctrine-card boundary
    prunes: [53.45, 55.031, 56.6],
    crew: [57.678, 60.488, 63.53, 66.572, 69.346, 72.597, 75.465],
    directedBy: 77.311,
    directedPunch: 78.832,
    evidence: 83.824,
    evLines: [86.576, 88.236, 90.488, 93.263, 94.912],
    finding: 97.141,
    reclass: 102.133,
    pending: 104.374,
    preTurn: 107.16,
    evTicks: [84.5, 86.576, 88.236, 90.488, 93.263, 94.912, 97.141, 99.37, 102.133, 104.374, 107.16, 108.82],
    turn: 110.469,             // ROOT — the second eruption
    wm2: 117.133,
    settleStart: 123.774,
    settles: [123.774, 125.481, 125.481, 127.118, 127.118, 128.789, 128.789],
    still: 128.789,            // one beat of stillness
    createdBy: 130.473,        // the loudest passage
    credo2: 132.145,
    credo3: 134.072,
    treeFade: 136.6,
    sting: 138.542,
    blink: 141.595,
    stingClear: 142.6,
    attr1: 142.838,
    attr2: 150.6,
    musicEnd: 148.701,
    replayAt: 157.5,
    filmEnd: 158.5             // the scrubbable extent: replay tab + a settle
  };
  CUE.wordmark = CUE.wmStart; // fx alias

  /* ---------- the grade: hard-cut mood keys (per shot, like a print) ----------
     [t, grain, vig, weave, wobble, ca, bloom, barrel, flicker, green, scan] */
  var MOODK = [
    [0.0,     0.11,  0.58, 1.1, 1.4, 0.0016, 0.38, 0.07, 0.05,  0.02, 0.06],
    [11.65,   0.07,  0.50, 0.8, 1.7, 0.0024, 0.60, 0.05, 0.03,  0.05, 0.05],
    [23.812,  0.06,  0.52, 0.7, 1.2, 0.0020, 0.48, 0.05, 0.025, 0.04, 0.05],
    [52.129,  0.07,  0.55, 0.8, 1.2, 0.0020, 0.50, 0.05, 0.03,  0.10, 0.07],
    [57.678,  0.065, 0.50, 0.7, 1.1, 0.0018, 0.45, 0.05, 0.025, 0.05, 0.05],
    [83.824,  0.11,  0.62, 1.0, 1.0, 0.0016, 0.40, 0.07, 0.05,  0.07, 0.10],
    [108.8,   0.12,  0.60, 1.1, 1.1, 0.0018, 0.50, 0.07, 0.05,  0.12, 0.10],
    [110.469, 0.05,  0.48, 0.6, 1.0, 0.0022, 0.85, 0.04, 0.02,  0.16, 0.04],
    [128.789, 0.015, 0.44, 0.0, 0.0, 0.0012, 0.90, 0.03, 0.0,   0.12, 0.02],
    [130.473, 0.04,  0.46, 0.3, 0.5, 0.0018, 1.00, 0.04, 0.01,  0.14, 0.03],
    [138.542, 0.08,  0.58, 0.8, 1.0, 0.0016, 0.50, 0.06, 0.04,  0.08, 0.06],
    [142.838, 0.05,  0.52, 0.5, 0.6, 0.0012, 0.35, 0.05, 0.02,  0.03, 0.04],
    [150.6,   0.04,  0.50, 0.4, 0.5, 0.0010, 0.30, 0.05, 0.015, 0.02, 0.03]
  ];
  // R2 T6: still→createdBy is the one hard cut that reads as a jump (grain,
  // bloom, weave and wobble all step at once). Found by value (not array
  // index) so it stays correct if rows are reordered.
  // R2 T8b (18): T6's one-sided 0.6s pre-lerp still LANDED with a slope
  // kink exactly on the beat — the glide is now a symmetric smoothstep
  // ACROSS it (0.8s each side), value- and slope-continuous through
  // createdBy. Every other MOODK transition keeps its hard-cut behavior.
  function findMoodRow(tVal) {
    var i;
    for (i = 0; i < MOODK.length; i++) if (MOODK[i][0] === tVal) return MOODK[i];
    return null;
  }
  var MOOD_LERP_FROM_ROW = findMoodRow(128.789);
  var MOOD_LERP_TO_ROW = findMoodRow(130.473);
  var MOOD_LERP_SPREAD = 0.8; // seconds each side of the beat
  function moodAt(t) {
    var k = MOODK[0], i;
    for (i = MOODK.length - 1; i >= 0; i--) if (t >= MOODK[i][0]) { k = MOODK[i]; break; }
    if (k === MOOD_LERP_FROM_ROW || k === MOOD_LERP_TO_ROW) {
      var tb = MOOD_LERP_TO_ROW[0];
      if (t >= tb - MOOD_LERP_SPREAD && t < tb + MOOD_LERP_SPREAD) {
        var p = U.clamp((t - (tb - MOOD_LERP_SPREAD)) / (2 * MOOD_LERP_SPREAD), 0, 1);
        p = p * p * (3 - 2 * p);
        var out = new Array(MOOD_LERP_FROM_ROW.length), j;
        for (j = 0; j < MOOD_LERP_FROM_ROW.length; j++) out[j] = MOOD_LERP_FROM_ROW[j] + (MOOD_LERP_TO_ROW[j] - MOOD_LERP_FROM_ROW[j]) * p;
        return out;
      }
    }
    return k;
  }

  /* ---------- physical impulses: slams shake the camera, flashes hit the print ---------- */
  var IMPULSES = [
    { t: CUE.variantStamp, shake: 7,   fr: 1.0,  fg: 0.45, fb: 0.20, fa: 0.20 },
    { t: CUE.doctrine,     shake: 1.6, fa: 0 },
    { t: CUE.prunes[0],    shake: 2.5, fr: 1.0,  fg: 0.45, fb: 0.20, fa: 0.08 },
    { t: CUE.prunes[1],    shake: 2.5, fr: 1.0,  fg: 0.45, fb: 0.20, fa: 0.08 },
    { t: CUE.prunes[2],    shake: 2.5, fr: 1.0,  fg: 0.45, fb: 0.20, fa: 0.08 },
    { t: CUE.directedPunch, shake: 2,  fa: 0 },
    { t: CUE.reclass,      shake: 3,   fr: 0.95, fg: 0.75, fb: 0.40, fa: 0.08 },
    { t: CUE.turn,         shake: 8,   fr: 0.62, fg: 1.0,  fb: 0.72, fa: 0.24 }
    // R2 T8b (18): the createdBy impulse row (shake 1.5, fa 0.03) is GONE —
    // its same-frame weave jolt + splice-flash were cut components of the
    // reveal, which is a CONTINUOUS crescendo now. The musical onset moves
    // nothing; the world's credo swell carries the hit.
  ];
  CUE.cast.forEach(function (ct) { IMPULSES.push({ t: ct, shake: 1.2, fa: 0 }); });
  CUE.crew.forEach(function (ct) { IMPULSES.push({ t: ct, shake: 0.8, fa: 0 }); });
  function impulseAt(t) {
    var shake = 0, fr = 0, fg = 0, fb = 0, fa = 0, i, d;
    for (i = 0; i < IMPULSES.length; i++) {
      d = t - IMPULSES[i].t;
      if (d < 0 || d > 1.2) continue;
      var e = Math.exp(-6 * d);
      shake += (IMPULSES[i].shake || 0) * e;
      var a = (IMPULSES[i].fa || 0) * Math.exp(-5 * d);
      if (a > fa) { fa = a; fr = IMPULSES[i].fr || 1; fg = IMPULSES[i].fg || 1; fb = IMPULSES[i].fb || 1; }
    }
    return { shake: shake, fr: fr, fg: fg, fb: fb, fa: fa };
  }

  /* ---------- ambience zones ---------- */
  var ZONES = [
    [0, 'desk'], [11.65, 'dark'], [52.129, 'alarm'], [57.678, 'hush'], [83.824, 'desk'],
    [110.469, 'grove'], [138.542, 'void'], [142.838, 'tail']
  ];
  function zoneAt(t) {
    var i, cur = ZONES[0], prev = ZONES[0];
    for (i = ZONES.length - 1; i >= 0; i--) {
      if (t >= ZONES[i][0]) { cur = ZONES[i]; prev = ZONES[Math.max(0, i - 1)]; break; }
    }
    return { name: cur[1], prev: prev[1], mix: U.clamp((t - cur[0]) / 1.6, 0, 1) };
  }

  /* ---------- the camera: one slow move per shot, never static ---------- */
  /* THE TELEPORT AT 96.5 (his catch, 2026-07-18: "the timeline teleports at some
     point"). Each segment runs its own ramp z = z0 + (z1-z0)*p with p restarting
     at 0, and there is NO continuity constraint between one segment's end and the
     next one's start — so EVERY boundary jumps. Measured across the film, all of
     them do: 23.83 (1.69), 32.72 (1.84), 36.06 (2.40), 48.81 (2.35), 83.84 (3.33)…
     They are invisible because each lands on a card or scene CHANGE, where a cut
     hides the discontinuity.
     96.5 was the one exception: the only hardcoded non-CUE value in the table, and
     the only boundary sitting INSIDE a continuous shot (the evidence log runs
     83.82 -> 110.47 with no cut). Its 1.087-unit jump therefore had nothing to hide
     behind — the band appeared to teleport.
     Removed, which restores this function's own stated rule one line above: ONE
     SLOW MOVE PER SHOT. The evidence log is one shot; it now gets one move
     (1.02 -> 1.052 over 26.6s) instead of two with a seam. The camera is still
     never static. Nothing else in the table is touched — the other jumps are load
     -bearing cuts, not bugs. */
  var SEGS = [0, 11.65].concat(CUE.cast, [CUE.doctrine], CUE.crew,
    [CUE.directedBy, CUE.evidence, CUE.turn, CUE.createdBy, CUE.sting, CUE.attr1, CUE.attr2, 9999]);
  // R2 T8b (18): the turn segment's index, found by value — the createdBy
  // pose blend below needs the OUTGOING segment's hash, not a hardcoded 20.
  var SEG_TURN_I = (function () {
    for (var k = 0; k < SEGS.length; k++) if (SEGS[k] === CUE.turn) return k;
    return 0;
  })();
  function driftAt(t) {
    if (t >= CUE.attr1) return { z: 1.0, x: 0, y: 0 };
    var i = 0, k;
    for (k = SEGS.length - 2; k >= 0; k--) if (t >= SEGS[k]) { i = k; break; }
    var t0 = SEGS[i], t1 = SEGS[i + 1];
    var p = U.clamp((t - t0) / Math.max(0.001, t1 - t0), 0, 1);
    var dossier = t < 11.65 || (t >= CUE.evidence && t < CUE.turn);
    var h1 = U.hash01(i * 17.3), h2 = U.hash01(i * 31.7), h3 = U.hash01(i * 7.9);
    var z0 = dossier ? 1.02 : 1.045 + h1 * 0.03;
    var z1 = dossier ? 1.052 : (h2 < 0.5 ? z0 + 0.05 : z0 - 0.028);
    if (t >= CUE.turn) { // the splitting outgrows the frame: pull back for the reveal, then drift home
      if (t < CUE.turn + 6.0) { z0 = 1.06; z1 = 0.70; p = U.clamp((t - CUE.turn - 2.0) / 3.6, 0, 1); }
      else {
        z0 = 0.70; z1 = 1.12;
        var homeT0 = CUE.turn + 6.0, homeT1 = CUE.createdBy;
        p = U.clamp((t - homeT0) / (homeT1 - homeT0), 0, 1);
        // R2 T6: this ramp used to clamp flat the instant it hit p=1, snapping
        // velocity from constant to zero right on the createdBy cut. Ease ONLY
        // the final homeTailSec via a Hermite splice matched in value+slope to
        // the linear ramp at homeS0 — upstream framing (crown ~119.4, settle
        // ~127.5, both already shipped/approved) is untouched; only the last
        // stretch decays smoothly to a zero-velocity landing instead of braking.
        var homeTailSec = 1.2;
        var homeS0 = 1 - homeTailSec / (homeT1 - homeT0);
        if (p > homeS0) {
          var hs = (p - homeS0) / (1 - homeS0);
          var hs2 = hs * hs, hs3 = hs2 * hs;
          var h00 = 2 * hs3 - 3 * hs2 + 1, h10 = hs3 - 2 * hs2 + hs, h01 = -2 * hs3 + 3 * hs2;
          p = h00 * homeS0 + h10 * (1 - homeS0) + h01 * 1; // h11 term is 0 (zero landing slope)
        }
      }
    }
    var z = z0 + (z1 - z0) * p;
    var ang = h3 * 6.283;
    var pr = Math.min(dossier ? 0.006 : 0.011, (Math.min(z0, z1) - 1) * 0.35);
    var dx = Math.cos(ang) * pr * p, dy = Math.sin(ang) * pr * 0.7 * p;
    // R2 T8b (18): the createdBy jump cut's biggest measured component —
    // 5.73 world units of rig.x in ONE frame — was this function re-rolling
    // its per-segment lateral hash at the beat while p sat pinned at 1 on
    // both sides (T6's Hermite smoothed only the z approach). Blend the
    // turn segment's landed pose into this segment's own over 1.6s:
    // smoothstep joins the zero-velocity Hermite landing at zero slope and
    // reaches the EXACT approved pose before the 133.2 credo hero (z, p
    // and pr are identical on both sides throughout). Pure f(t), no state.
    if (t >= CUE.createdBy && t < CUE.sting) {
      var kJoin = U.clamp((t - CUE.createdBy) / 1.6, 0, 1);
      kJoin = kJoin * kJoin * (3 - 2 * kJoin);
      var angT = U.hash01(SEG_TURN_I * 7.9) * 6.283;
      dx = U.lerp(Math.cos(angT) * pr * p, dx, kJoin);
      dy = U.lerp(Math.sin(angT) * pr * 0.7 * p, dy, kJoin);
    }
    return { z: z, x: dx, y: dy };
  }

  /* ---------- text-lane matte: dim the band where a card is speaking ---------- */
  function matteAt(t) {
    // R2 T4: the doctrine CARD is gone, but card 7 now breathes through to
    // castEnd (54.5) instead of cutting off at the old doctrine boundary —
    // the cast-block matte window is extended to match, so the band stays
    // dimmed behind card 7's text for its whole (longer) visible run. There
    // was never a separate doctrine-only rect to delete: the doctrine window
    // (52.129-57.678) rendered unmatted before, and still does.
    if (t >= CUE.cast[0] && t < CUE.castEnd)    return [0.27, 0.28, 0.66, 0.64]; // cast block
    if (t >= CUE.crew[0] && t < CUE.directedBy) return [0.50, 0.68, 0.90, 0.98]; // crew column — moved below the spine to the round-2 off-branch text zone (screening note 8), tall enough for the nb===3 card; re-checked live for the round-1 fork-flash seam at x1=0.80, none observed at x1=0.90
    if (t >= CUE.directedBy && t < CUE.evidence) return [0.30, 0.28, 0.70, 0.58]; // directed by
    return null;
  }

  /* ---------- dom ---------- */
  var gate = document.getElementById('gate');
  var gateBtn = document.getElementById('gate-btn');
  var gateFace = document.getElementById('gate-btn-face');
  var stage = document.getElementById('stage');
  var printCv = document.getElementById('print');
  var replayTab = document.getElementById('replay-tab');
  var replayBtn = document.getElementById('replay-btn');
  var score = document.getElementById('score');
  var exTags = Array.prototype.slice.call(document.querySelectorAll('#exhibits .ex-tag'));
  var exSizes = []; // each tag's natural {w,h} — measured once #stage is shown (see gate click below)

  /* ---------- exhibit tags: geometry helpers (pure, reused every frame) ----------
     R2 T4: each tag now dies WITH its own branch's prune — world.castTips[ce].prune
     (set alongside the branch's fork() call, single source of truth for the
     schedule) replaces the old shared TAG_PRUNE_END stand-in. Still a pure
     function of t: visible iff spawnTime <= t < thatBranch'sPruneTime, re-derived
     fresh every frame from world.castTips, so any seek (forward into already-
     pruned territory, or backward before a spawn) lands on the correct on/off
     state with nothing to strand — the CSS opacity transition (.ex-tag / .on in
     loki.css) is what actually renders the ~300ms DOM fade; this driver only ever
     toggles the `on` class. EX_OFFSET_X must match the -8px used in the transform
     strings the tag loop writes below.

     TWO rects per tag, both derived from the same exSizes measurement:

     1. POSITION box (`exTagRect`) — the un-rotated layout box, measured via
        offsetWidth/offsetHeight (not getBoundingClientRect(), which would return
        the post-rotation AABB instead). CSS's translate(_, 36%|-130%) resolves
        its percentages against this same unrotated box, so this is the box that
        correctly anchors where the rect sits — but it is NOT what the rotated
        card actually occupies on screen.

     2. COLLISION/CLAMP footprint (`exTagFootprint`) — the rotated card's real
        visual extent. Rotation is about the box's own center (default
        transform-origin), so it inflates the AABB symmetrically: a w×h box
        rotated by θ grows by ~h·sinθ on the width axis and ~w·sinθ on the height
        axis, split as (h·sinθ)/2 on the left AND the right, and (w·sinθ)/2 on
        the top AND the bottom. At θ=1.4deg, the width-axis pad is ~1px (h, this
        tag's own height, is roughly fixed at ~36px regardless of text length),
        but the height-axis pad tracks each tag's own (variable, text-length-
        driven) width and can run several px for a longer label — e.g. ~8px at
        ~330px wide, a Task-2-review-confirmed number, not the "sub-2px" both
        axes were once assumed to share.

     The footprint, not the position box, is what stack-avoidance, EX_STACK_GAP,
     and the frame clamp all need to reason about — clamping/separating the
     position box alone (as an earlier pass of this fix did) leaves the real,
     rotated card free to overlap or clip by up to that pad amount. Clamping the
     footprint into bounds is strictly stronger than clamping the position box:
     it guarantees the rendered card itself never clips, which is what "never
     clip" in the brief actually wants. EX_ROT_SIN is precomputed once (not
     re-computed with Math.sin on every frame/push iteration). */
  var EX_OFFSET_X = 8;
  var EX_STACK_GAP = 4;
  var EX_MAX_PUSH_ITER = 8;
  var EX_ROT_SIN = Math.sin(1.4 * Math.PI / 180); // sin(1.4deg) — matches the CSS rotate()
  function exTagRect(ax, ay, dir, w, h) {
    var left = ax - EX_OFFSET_X;
    var top = dir > 0 ? ay + h * 0.36 : ay - h * 1.30;
    return { left: left, top: top, right: left + w, bottom: top + h };
  }
  function exTagFootprint(rect, padX, padY) {
    return { left: rect.left - padX, top: rect.top - padY, right: rect.right + padX, bottom: rect.bottom + padY };
  }
  function exRectsOverlap(a, b) {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  }
  /* the evidence string (director pass B, 2026-07-20): a faint cream thread from
     the tag's grommet to its branch tip, drawn INTO the comp canvas so it takes
     the print's full grade — grain, vignette, warmth — for free. This is what
     keeps a pushed or clamped tag visibly TETHERED to the branch it certifies:
     the chip may be moved for legibility; the string never lies about where it
     belongs. gx/gy/tx/ty arrive in CSS px (the tag layout's own space); k maps
     CSS px -> comp device px; sc scales thickness to the 810-tall reference.
     Two passes: a 3px breath at 10%, then the 1.1px thread at 30% — case-file
     string, not a laser. `a` is the fade multiplier (same windows as the DOM
     tag's CSS fades) so the thread arrives and leaves WITH its chip. */
  function drawExString(cx2, gx, gy, tx, ty, k, sc, a) {
    if (a <= 0) return;
    var mx = (gx + tx) / 2;
    var my = Math.max(gy, ty) + 8 + Math.abs(tx - gx) * 0.05; // a little sag — string, not wire
    cx2.beginPath();
    cx2.moveTo(gx * k, gy * k);
    cx2.quadraticCurveTo(mx * k, my * k, tx * k, ty * k);
    cx2.strokeStyle = 'rgba(242,231,207,' + (0.10 * a) + ')';
    cx2.lineWidth = 3 * sc; cx2.stroke();
    cx2.strokeStyle = 'rgba(242,231,207,' + (0.30 * a) + ')';
    cx2.lineWidth = 1.1 * sc; cx2.stroke();
  }

  window.__REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  console.info('[loki] assets mode:', ASSETS_MODE, '(override with ?assets=homemade|show)');

  /* ---------- engines: 3D world first, flat print as fallback ---------- */
  var comp = document.createElement('canvas');
  var ctx = comp.getContext('2d', { alpha: true });
  var world = null, post = null, fallback2d = null;
  if (window.WORLD) {
    try { world = new window.WORLD(printCv, CUE); }
    catch (e) { console.warn('[loki] 3D world failed, falling back flat:', e); world = null; }
  }
  if (!world) {
    try { post = new window.Post(printCv); }
    catch (e2) {
      console.warn('[loki] webgl unavailable — printing ungraded:', e2);
      fallback2d = printCv.getContext('2d');
    }
  }
  var fx = new window.FX.TimelineFX(CUE);
  if (world) { fx.worldMode = true; world.setCompCanvas(comp); }
  var wm = null; // after fonts
  var synth = null;
  var clockMode = 'el';

  var A = { C: CUE, showMode: ASSETS_MODE === 'show', paper: null, stampVariant: null, stampReclass: null, photo: null, chinPhoto: null };

  /* ---------- sizing ---------- */
  var cssW = 0, cssH = 0;
  function resize() {
    var r = stage.getBoundingClientRect();
    if (!r.width || (r.width === cssW && r.height === cssH)) return;
    cssW = r.width; cssH = r.height;
    if (window.SCENES && window.SCENES.setCssHeight) window.SCENES.setCssHeight(new URLSearchParams(location.search).has('phone')?Math.min(cssH,350):cssH);
    var k = Math.min(window.devicePixelRatio || 1, 2);
    var cap = (navigator.maxTouchPoints > 1) ? 1500000 : 2400000;
    if (cssW * k * cssH * k > cap) k = Math.sqrt(cap / (cssW * cssH));
    var W = Math.round(cssW * k), H = Math.round(cssH * k);
    comp.width = W; comp.height = H;
    fx.resize(W, H);
    if (world) world.resize(W, H);
    else if (post) post.resize(W, H);
    else { printCv.width = W; printCv.height = H; }
  }

  /* ---------- clock ---------- */
  // After the music ends the film runs on wall time (endedWall). tailFrozen
  // lets that stretch pause and be scrubbed like the rest: while set, the
  // clock holds; play() re-derives endedWall so time resumes from the hold.
  var started = false, endedWall = null, manualPause = false, tailFrozen = null;
  var playbackGeneration = 0, primingScore = false;
  score.addEventListener('ended', function () { if (endedWall === null) endedWall = performance.now(); });
  function clock() {
    if (primingScore) return 0;
    if (clockMode === 'synth') return synth ? synth.t() : 0;
    /* THE SEAM (his catch — the final card's lighting hitches at the end):
       waiting for the 'ended' EVENT freezes t at the track's last sample for
       the event's latency (measured 84ms on WebKit, device-dependent), and
       the m4a ends 21ms before musicEnd (148.680 vs 148.701 — musicEnd was
       measured off the webm), adding a jump when the event lands. Notice
       saturation ourselves and anchor the wall clock to the score's OWN
       position, so the handoff is continuous by construction. The 'ended'
       listener stays as backup. */
    if (endedWall === null && !score.paused && score.duration &&
        score.currentTime >= score.duration - 0.05) {
      endedWall = performance.now() - (score.currentTime - CUE.musicEnd) * 1000;
    }
    if (endedWall !== null) {
      if (tailFrozen !== null) return tailFrozen;
      return CUE.musicEnd + (performance.now() - endedWall) / 1000;
    }
    return score.currentTime || 0;
  }

  /* ---------- the loop ---------- */
  var lastT = 0, replayShown = false;
  function loop(externalFrame) {
    // The parent drives hidden-frame rendering so browser iframe throttling cannot stall the sky.
    if (window.__FIELD_SKY && externalFrame !== true) return;
    if (!window.__FIELD_SKY) requestAnimationFrame(loop);
    resize();
    var t = clock();
    var dt = U.clamp(t - lastT, 0, 0.05); lastT = t;
    var W = comp.width, H = comp.height;

    // ── the film frame ──
    var z = zoneAt(t);
    var D = driftAt(t);
    if (world) {
      // 3D world carries space & light; the comp is the crisp title layer over it
      ctx.clearRect(0, 0, W, H);
      fx.update(t, dt, ctx); // chinchilla only (worldMode)

      // exhibit tags — each variant's branch ends at a thing on record.
      // MOVED above SCENES/wm/world.update (director pass B): the strings the
      // loop draws must land in the comp BEFORE the type (type always wins —
      // the cream law) and BEFORE world.update consumes the comp (that is what
      // grades them). Cost: tag geometry projects through the PREVIOUS frame's
      // camera — one 30fps frame of the gentle cast-era drift, sub-pixel.
      // Pure f(t): a tag is visible from its card's +0.9s spawn until its OWN
      // branch's prune moment (R2 T4 — was a shared TAG_PRUNE_END stand-in),
      // staying pinned to its branch anchor the whole time. Prune-per-scene
      // means tags mostly no longer accumulate — cast0-4 each die before the
      // next one spawns; only cast5/cast6 (the doctrine-era hits) briefly
      // overlap. The stack-avoidance/clamp system below still runs
      // unconditionally per active tag, so it degrades safely either way. A
      // newer tag that lands on an older one is pushed clear along its own
      // branch lean (dir — the same sign that already decides whether its
      // box hangs below or above the anchor); the result is then clamped
      // fully inside the frame as a final safety net.
      var exPlaced = [];
      for (var ce = 0; ce < exTags.length; ce++) {
        var exTip = world.castTips && world.castTips[ce];
        var exOn = !!exTip && t >= CUE.cast[ce] + 0.9 && t < exTip.prune;
        var exEl = exTags[ce];
        if (exOn) {
          var exDir = exTip.dir;
          var exP = world.project(exTip.x, exTip.y, exTip.z, cssW, cssH);
          var exTipX = exP.x, exTipY = exP.y; // the TRUE tip — the string's far end, never clamped
          var exX = U.clamp(exP.x, cssW * 0.05, cssW * 0.86);
          var exY = U.clamp(exP.y, cssH * 0.10, cssH * 0.90);
          if (exX > cssW * 0.24 && exX < cssW * 0.68 && exY > cssH * 0.26 && exY < cssH * 0.66) exX = cssW * 0.70;

          var exW = exSizes[ce].w, exH = exSizes[ce].h;
          // rotation-inflation pad, this tag's own dimensions, computed once
          // (not re-derived per push/clamp iteration): see the comment above
          // exTagFootprint for the h·sinθ / w·sinθ derivation.
          var exPadX = exH * EX_ROT_SIN * 0.5, exPadY = exW * EX_ROT_SIN * 0.5;
          var exRect = exTagRect(exX, exY, exDir, exW, exH);
          var exFoot = exTagFootprint(exRect, exPadX, exPadY);

          // stack-avoidance: push this (newer) tag along its own lean until
          // its FOOTPRINT (the real rotated-card extent) clears every already-
          // placed (older) tag's footprint. Each push moves the same direction
          // every time, so it's monotonic and always converges within a
          // handful of passes (bounded defensively).
          var exGuard = 0, exClear = false, exPi;
          while (!exClear && exGuard < EX_MAX_PUSH_ITER) {
            exClear = true;
            for (exPi = 0; exPi < exPlaced.length; exPi++) {
              if (exRectsOverlap(exFoot, exPlaced[exPi])) {
                exY += exDir > 0
                  ? (exPlaced[exPi].bottom - exFoot.top) + EX_STACK_GAP
                  : -((exFoot.bottom - exPlaced[exPi].top) + EX_STACK_GAP);
                exRect = exTagRect(exX, exY, exDir, exW, exH);
                exFoot = exTagFootprint(exRect, exPadX, exPadY);
                exClear = false;
              }
            }
            exGuard++;
          }

          // final clamp: the whole FOOTPRINT stays fully inside
          // [0.02,0.98]x[0.04,0.96] — implemented as clamping the position
          // box into bounds shrunk by the pad on each side, which is exactly
          // equivalent and avoids re-deriving exX/exY from a footprint rect.
          // This runs after stack-avoidance, so a clamp that actually moves
          // the rect can push it back into an older tag the avoidance pass
          // already cleared (that pass runs first and never sees the clamped
          // position). Guard against that: if the clamp moved the rect and
          // the moved footprint overlaps a placed footprint, resume the same
          // bounded push once more and clamp again. Either way the clamp
          // gets the last word — in-bounds is the hard guarantee, clear-of-
          // overlap is best-effort on top of it.
          var exClampPass, exClampL, exClampT, exReOverlap;
          for (exClampPass = 0; exClampPass < 2; exClampPass++) {
            exClampL = Math.min(Math.max(exRect.left, cssW * 0.02 + exPadX), cssW * 0.98 - exW - exPadX);
            exClampT = Math.min(Math.max(exRect.top, cssH * 0.04 + exPadY), cssH * 0.96 - exH - exPadY);
            if (exClampL === exRect.left && exClampT === exRect.top) break; // no-op clamp — nothing to re-check

            exX = exClampL + EX_OFFSET_X;
            exY = exDir > 0 ? exClampT - exH * 0.36 : exClampT + exH * 1.30;
            exRect = exTagRect(exX, exY, exDir, exW, exH);
            exFoot = exTagFootprint(exRect, exPadX, exPadY);

            exReOverlap = false;
            for (exPi = 0; exPi < exPlaced.length; exPi++) {
              if (exRectsOverlap(exFoot, exPlaced[exPi])) { exReOverlap = true; break; }
            }
            if (!exReOverlap || exClampPass === 1) break; // clear, or out of re-tries — clamp wins either way

            // clamp reintroduced an overlap — resume the push loop once more,
            // same direction, same bound, then loop back to clamp again.
            exGuard = 0; exClear = false;
            while (!exClear && exGuard < EX_MAX_PUSH_ITER) {
              exClear = true;
              for (exPi = 0; exPi < exPlaced.length; exPi++) {
                if (exRectsOverlap(exFoot, exPlaced[exPi])) {
                  exY += exDir > 0
                    ? (exPlaced[exPi].bottom - exFoot.top) + EX_STACK_GAP
                    : -((exFoot.bottom - exPlaced[exPi].top) + EX_STACK_GAP);
                  exRect = exTagRect(exX, exY, exDir, exW, exH);
                  exFoot = exTagFootprint(exRect, exPadX, exPadY);
                  exClear = false;
                }
              }
              exGuard++;
            }
          }
          exPlaced.push(exFoot);

          exEl.style.left = exX + 'px'; exEl.style.top = exY + 'px';
          exEl.style.transform = exDir > 0
            ? 'translate(-8px, 36%) rotate(-1.4deg)'
            : 'translate(-8px, -130%) rotate(-1.4deg)';

          // the string ties the (possibly pushed/clamped) chip back to its
          // branch. Grommet centre = box left + 9px inset + half its 10.5px
          // width; box top mirrors the CSS translate(_, 36%|-130%) hang.
          var exGromX = (exX - EX_OFFSET_X) + 14.25;
          var exGromY = (exDir > 0 ? exY + exH * 0.36 : exY - exH * 1.30) + exH / 2;
          var exStrIn = Math.min(1, (t - (CUE.cast[ce] + 0.9)) / 0.45);
          var exStrOut = Math.min(1, (exTip.prune - t) / 0.32);
          drawExString(ctx, exGromX, exGromY, exTipX, exTipY,
                       W / Math.max(1, cssW), H / 810,
                       Math.max(0, Math.min(exStrIn, exStrOut)));
        }
        if (exEl.classList.contains('on') !== exOn) exEl.classList.toggle('on', exOn);
      }

      window.SCENES.paintAll(ctx, W, H, t, A);
      if (wm) wm.draw(ctx, W, H, t);
      world.update(t, dt, D, z, matteAt(t));
    } else {
      ctx.save();
      ctx.translate(W / 2 + D.x * W, H / 2 + D.y * H);
      ctx.scale(D.z, D.z);
      ctx.translate(-W / 2, -H / 2);
      ctx.fillStyle = '#0d0906';
      ctx.fillRect(-W * 0.1, -H * 0.1, W * 1.2, H * 1.2);
      window.FX.drawAmbience(ctx, W, H, z.prev, z.name, z.mix);
      fx.update(t, dt, ctx);
      window.SCENES.paintAll(ctx, W, H, t, A);
      if (wm) wm.draw(ctx, W, H, t);
      ctx.restore();
    }

    // ── the grade ──
    var m = moodAt(t), im = impulseAt(t);
    var f = Math.floor(t * 24);
    var weave = window.__REDUCED ? 0 : m[3] + im.shake;
    var u = {
      frame: f,
      weaveX: (U.hash01(f) - 0.5) * 2 * weave + ((U.hash01(f * 11 + 3) < 0.006 && weave > 0) ? 5 : 0),
      weaveY: (U.hash01(f * 3 + 1) - 0.5) * 1.5 * weave,
      wobble: window.__REDUCED ? 0 : m[4] * (comp.height / 720),
      grain: m[1] * (window.__REDUCED ? 0.5 : 1),
      vig: m[2],
      flicker: window.__REDUCED ? 0 : m[8],
      ca: m[5],
      bloom: m[6],
      barrel: m[7],
      green: m[9],
      scan: m[10],
      flashR: im.fr, flashG: im.fg, flashB: im.fb, flashA: im.fa
    };
    if (world) world.render(t, u);
    else if (post) post.render(comp, u);
    else if (fallback2d) fallback2d.drawImage(comp, 0, 0);

    if (!replayShown && t >= CUE.replayAt) { replayShown = true; replayTab.hidden = false; }
  }

  /* ---------- seeking (player + QA + replay) ---------- */
  function seek(x) {
    x = U.clamp(x, 0, CUE.filmEnd);
    fx.sparks.length = 0; fx.sparkDone = {};
    lastT = x;
    if (clockMode === 'el') {
      if (x >= CUE.musicEnd - 0.05) {
        // into the wall-clock tail: silence the score, back-date the wall origin
        if (!score.paused) score.pause();
        endedWall = performance.now() - (x - CUE.musicEnd) * 1000;
        tailFrozen = manualPause ? x : null;
      } else {
        endedWall = null; tailFrozen = null;
        score.currentTime = x;
        if (started && score.paused && !manualPause) score.play();
      }
    }
    if (x < CUE.replayAt && replayShown) { replayShown = false; replayTab.hidden = true; }
  }

  /* ---------- loading ---------- */
  function loadFonts() {
    var fam = ['Righteous', 'Special Elite', 'Courier Prime', 'Jost', 'Abril Fatface', 'Alfa Slab One',
               'Bungee Inline', 'Homemade Apple', 'Monoton', 'Pirata One', 'Rye', 'Stardos Stencil',
               'UnifrakturMaguntia', 'VT323', 'Yeseva One'];
    var custom = ['LokiUSAngel', 'LokiOldEnglish', 'LokiARB85', 'LokiCloister'];
    var loads = [];
    fam.forEach(function (fq) { loads.push(document.fonts.load('16px "' + fq + '"').catch(function () { })); });
    ['300 16px Fraunces', 'italic 300 16px Fraunces', '400 16px "Bodoni Moda"', '500 16px Jost', '600 16px Jost', '700 16px "Courier Prime"', '700 16px "Stardos Stencil"']
      .forEach(function (s) { loads.push(document.fonts.load(s).catch(function () { })); });
    if (A.showMode) custom.forEach(function (fq) {
      loads.push(document.fonts.load('16px "' + fq + '"').then(function (r) {
        if (!r.length) console.warn('[loki] show font missing:', fq, '— run loki/tools/fetch-show-assets.sh');
      }).catch(function () { }));
    });
    return Promise.all(loads);
  }
  function loadImage(src) {
    return new Promise(function (res) {
      var im = new Image();
      im.onload = function () { res(im); };
      im.onerror = function () { res(null); };
      im.src = src;
    });
  }
  function loadAudio() {
    return new Promise(function (res) {
      if (ASSETS_MODE === 'homemade') {
        // try a homemade recording first; fall back to the synth evocation
        var probe = new Audio();
        probe.addEventListener('canplaythrough', function () {
          score.src = 'assets/homemade/score.m4a'; score.load();
          score.addEventListener('canplaythrough', function () { res('el'); }, { once: true });
        }, { once: true });
        probe.addEventListener('error', function () { res('synth'); }, { once: true });
        probe.src = 'assets/homemade/score.m4a';
        probe.load();
        return;
      }
      var done = false;
      score.addEventListener('canplaythrough', function () { if (!done) { done = true; res('el'); } }, { once: true });
      /* NO capture here (the iOS regression, found live 2026-07-21): with capture,
         this listener intercepts the WEBM <source>'s error — which is Safari's
         NORMAL first step toward the m4a — and declared synth while a perfectly
         good m4a was loading. Only the LAST source's error (below) means the
         element is truly out of recordings. */
      score.addEventListener('error', function () { if (!done) { done = true; res('synth'); } });
      var lastSource = score.querySelector('source:last-of-type');
      if (lastSource) lastSource.addEventListener('error', function () { if (!done) { done = true; res('synth'); } });
      setTimeout(function () { if (!done && score.readyState >= 3) { done = true; res('el'); } }, 6000);
      score.load();
    });
  }

  Promise.all([
    loadFonts(),
    loadImage('assets/subject/lorenzo.jpg'),
    Promise.resolve(null),
    loadAudio(),
    loadImage('assets/subject/mug.jpg'),
    loadImage('assets/subject/surveil.jpg'),
    loadImage('assets/subject/variant.jpg')
  ]).then(function (r) {
    // props are font-dependent — build them now
    A.paper = window.FX.makePaper(660, 840);
    A.stampVariant = window.FX.makeStamp('VARIANT', '#c9391b', { fontSize: 84, doubleBorder: true });
    A.stampReclass = window.FX.makeStamp('UNCLASSIFIABLE', '#b97c1e', { fontSize: 44 });
    var mugSrc = r[4] || r[1];
    if (mugSrc) A.photo = window.FX.halftone(mugSrc, 308, 374, 3.6);
    if (r[5]) A.surveil = window.FX.halftone(r[5], 308, 232, 3.2);
    if (r[6]) A.variantPhoto = window.FX.halftone(r[6], 252, 252, 3.0);
    if (r[2]) A.chinPhoto = r[2];
    wm = new window.Wordmark(CUE, A.showMode);
    if (r[3] === 'synth') {
      clockMode = 'synth';
      synth = new window.FX.SynthScore();
      if (ASSETS_MODE === 'show') console.warn('[loki] show score missing — run loki/tools/fetch-show-assets.sh; falling back to synth evocation');
    }
    gateBtn.disabled = false;
    gateFace.textContent = 'OPEN FILE';
  });

  /* ---------- gate: opening the folder starts the record ---------- */
  /* iOS may withhold a first tap's CLICK (hover-emulation / bar-summon grey
     zone) — the raw touch pointerup IS the tap, so ENTER answers it directly
     (THE BRIDGE's r5 gate law, film.js:1022). enterFilm is state-guarded: the
     click that may follow is a no-op, and mouse/pen/keyboard keep the click
     path — desktop unchanged. WebKit grants user activation on touch
     pointerup, so score.play() still holds. */
  gateBtn.addEventListener('pointerup', function (e) {
    if (e.pointerType === 'touch' && !gateBtn.disabled) enterFilm();
  });
  /* belt-and-braces for the double-tap report (2026-07-21): if a Safari build
     ever skips touch pointerup here, touchend answers the same tap. The
     started-guard makes any double-fire a no-op; preventDefault stops the
     synthetic click from re-arriving late. */
  gateBtn.addEventListener('touchend', function (e) {
    if (!gateBtn.disabled) { e.preventDefault(); enterFilm(); }
  });
  gateBtn.addEventListener('click', enterFilm);
  function enterFilm(holdAtStart) {
    if (started) return;
    holdAtStart = holdAtStart === true;
    started = true;
    stage.hidden = false;
    // #stage is visible now (was display:none via [hidden]) — measure each
    // tag's natural box once. Text and font-size are both static so this
    // never goes stale; caching it avoids forcing layout every render frame.
    exSizes = exTags.map(function (el) {
      // offsetWidth/offsetHeight read the layout box, unaffected by the CSS
      // rotate() in the tag's transform — getBoundingClientRect() here would
      // return the rotated screen AABB instead (see the comment above exTagRect).
      return { w: el.offsetWidth, h: el.offsetHeight };
    });
    resize();
    var startResult;
    if (holdAtStart) {
      startResult = primeAtStart();
    } else if (clockMode === 'el') {
      var p = score.play();
      if (p && p.catch) p.catch(function (e) { console.warn('[loki] play failed', e); });
    } else synth.start();
    gate.classList.add('opening');
    setTimeout(function () { gate.classList.add('gate-out'); }, 500);
    setTimeout(function () { gate.style.display = 'none'; }, 1750);
    requestAnimationFrame(loop);
    return startResult;
  }

  // Call play synchronously in the opening gesture, then await admission before
  // pausing. An immediate pause can reject the pending play with AbortError.
  function primeAtStart() {
    var token = ++playbackGeneration;
    manualPause = true;
    primingScore = true;
    if (clockMode !== 'el') {
      synth.start(); synth.pause(); primingScore = false;
      return Promise.resolve(true);
    }
    var volume = score.volume;
    score.volume = 0;
    var admission;
    try { admission = score.play(); } catch (error) { admission = Promise.reject(error); }
    return Promise.resolve(admission).then(function () {
      if (token !== playbackGeneration) return false;
      score.pause();
      score.currentTime = 0;
      return true;
    }, function (error) {
      if (token === playbackGeneration) {
        score.pause();
        score.currentTime = 0;
        console.warn('[loki] score admission failed; touch to retry', error);
      }
      return false;
    }).finally(function () {
      score.volume = volume;
      primingScore = false;
    });
  }

  replayBtn.addEventListener('click', function () {
    manualPause = false;
    seek(0);
    replayShown = false; replayTab.hidden = true;
    if (clockMode === 'el') score.play();
    else { synth = new window.FX.SynthScore(); synth.start(); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'r' && started && clock() > CUE.replayAt) replayBtn.click();
  });

  document.addEventListener('visibilitychange', function () {
    if (!started || manualPause) return;
    if (document.hidden) { if (clockMode === 'el') score.pause(); else if (synth) synth.pause(); }
    else { if (clockMode === 'el') { if (endedWall === null) score.play(); } else if (synth) synth.resume(); }
  });

  /* ---------- player + QA hooks ---------- */
  window.__LOKI = {
    renderCanvas: function(){if(started)loop(true);return printCv;},
    projectedStars: function(){
      if(!world||!world.cosmos)return [];var stars=world.cosmos.stars,a=stars.geometry.attributes,out=[];
      stars.updateWorldMatrix(true,false);world.camera.updateWorldMatrix(true,false);
      for(var i=0;i<Math.min(900,a.position.count);i++){var p=new THREE.Vector3().fromBufferAttribute(a.position,i);p.applyMatrix4(stars.matrixWorld).project(world.camera);if(p.z<1&&p.z>-1&&Math.abs(p.x)<1.05&&Math.abs(p.y)<1.05)out.push({x:p.x,y:p.y,r:a.aCol.getX(i),g:a.aCol.getY(i),b:a.aCol.getZ(i)});}
      return out;
    },
    C: CUE,
    mode: ASSETS_MODE,
    dur: CUE.filmEnd,
    t: clock,
    seek: seek,
    pause: function () {
      playbackGeneration++;
      manualPause = true;
      if (endedWall !== null) tailFrozen = clock();
      if (clockMode === 'el') score.pause(); else if (synth) synth.pause();
    },
    play: function () {
      manualPause = false;
      if (endedWall !== null) {
        if (tailFrozen !== null) { endedWall = performance.now() - (tailFrozen - CUE.musicEnd) * 1000; tailFrozen = null; }
      } else if (clockMode === 'el') {
        var token = ++playbackGeneration;
        return Promise.resolve(score.play()).then(function () { return true; }, function (error) {
          if (token === playbackGeneration) manualPause = true;
          console.warn('[loki] play failed; touch to retry', error);
          return false;
        });
      }
      else if (synth) synth.resume();
    },
    paused: function () { return manualPause; },
    started: function () { return started; },
    synthMode: function () { return clockMode === 'synth'; },
    start: function () { if (!started) gateBtn.click(); },
    startHeld: function () { return !started ? enterFilm(true) : Promise.resolve(false); }
  };
})();
