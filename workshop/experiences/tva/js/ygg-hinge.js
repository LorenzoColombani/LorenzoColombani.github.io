/* ═══════════════════════════════════════════════════════════════════════
   ygg-hinge.js — the camera-orbit turn + prune grammar, pure f(t).
   Flag-gated: INERT unless ?hinge=1 (orbit + prune grammar) or ?hinge=2
   (adds the recipe's per-point wavefront morph timing). Flag-off is the
   fallback film, untouched.
   Reference implementation: loki/prototypes/yggdrasil.html (the REBUILT
   artifact, verified 2026-07-18). Derivations + anchors:
   .superpowers/sdd/ygg-hinge/wiring.md. The recipes are law
   (.superpowers/sdd/loki-r2/ygg-recipes-verbatim.md); deviations from a
   recipe number below each serve the recipe's own stated intent and are
   flagged as dials for the screening notes:
   — azEnd 0 instead of +0.79: the settle/credo camera must land frontal
     (the sacred hero frames own that pose), so the sweep is the pre-pulled
     −0.96 → 0, net ~55° CCW, instead of the artifact's −0.96 → +0.79. The
     artifact's own grammar is kept whole otherwise: eased pre-pull onto the
     spec pose, dead-still hold through the eruption (the film's freeze/
     ignition analog), then the orbit.
   — dist: inherited per frame from the film's own approved pull-back
     (measured 13.7 → 21.9 across the window ≈ the spec's 14 → 22) instead
     of fixed constants — continuity at both window edges is free.
   — fov: the film's 42 held (the spec's 70→55 was prototype framing).
   Everything derives from CUE offsets; CUE itself is immovable.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  /* Levels: 0 = the fallback film · 1 = camera orbit + prune grammar ·
     2 = adds the wavefront morph timing on the film's own fibers ·
     3 = ?ygg=1, THE SUBSTITUTION: the recipes' 32-thread system replaces the
     band ribbons and the tree outright (ygg-threads.js), with the camera,
     the prune grammar and the wavefront all riding it. `?ygg=1` is the film
     the recipes describe; levels 1–2 are the earlier partial passes, kept
     only so the steps stay A/B-able. */
  var LEVEL = (function () {
    var s = window.location.search;
    if (/[?&]ygg=1/.test(s)) return 3;
    if (/[?&]ygg=0/.test(s)) return 0;
    var m = /[?&]hinge=(\d)/.exec(s);
    if (m) return parseInt(m[1], 10);
    /* __YGG_DEFAULT: set ONLY by the shipped site (tools/deploy.sh injects it) —
       the published film IS the ygg cut. Locally nothing sets it, so the bare
       URL stays the fallback build (the FALLBACK CONTRACT); explicit ?ygg=/
       ?hinge= flags always win, and ?ygg=0 reaches the fallback anywhere. */
    return window.__YGG_DEFAULT === 1 ? 3 : 0;
  })();

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function smoothstep(a, b, t) {
    var x = clamp((t - a) / (b - a), 0, 1);
    return x * x * (3 - 2 * x);
  }
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /* Orbit grammar — the artifact's own three-act camera, transposed:
     PRE-PULL [preTurn → turn]: ease out to the highway pose (azPre, the
       spec's azStart verbatim) as the machine loses control;
     HOLD [turn → turn+2.9]: dead still through the eruption (the freeze/
       ignition analog; the film's own pivot used to begin at turn+2.9);
     ORBIT [turn+2.9 → wm2+0.3]: az → 0 (CCW), el 0.21 → 0.31, world roll
       sin(mu·π)·8°, the morph's own easeInOutCubic — R4's move;
     HAND-BACK [wm2+0.3 → settleStart]: the blend weight w returns the
       camera to the film's own drift pose (already frontal, already at the
       matched pull-back distance). */
  var ORBIT = {
    azPre: -0.96,          // recipe azStart verbatim — the highway pose
    elStart: 0.21,         // recipe verbatim (~12°)
    elEnd: 0.31,           // recipe verbatim (~18°)
    rollMax: 0.14,         // recipe verbatim (~8°), sin(mu·π) arc
    orbitStartOff: 2.9,    // seconds after CUE.turn (the film's pivot-start slot)
    lingerAfterWm2: 0.3    // recipe's own camera linger past the morph end
  };

  /* ── THE STAND-UP (his note, 2026-07-18) ──────────────────────────────────
     Under ?ygg=1 the tree is baked LYING DOWN along +X — its root at the band's
     left end, its canopy at the right, built by the morph left to right. The
     camera then stands it up: "a slow 90 degrees camera rotation that appears
     to straighten up the tree — but it's only a perspective change in reality,
     since it's the camera doing the work."

     His two refinements are encoded here:
     - the pull-back and the rotation are SIMULTANEOUS and NOT fast, so both
       ride ONE eased parameter k and cannot drift apart;
     - "it's ok if the tree finishes building itself a little bit before the
       camera catches up — it enhances the reveal", so the move starts `lag`
       seconds AFTER the morph completes, leaving a beat where the finished
       tree simply lies there.

     LEVEL-gated to 3: under ?hinge=1/2 world.js still shows its own UPRIGHT
     tree, and rolling that one would lay it on its side. */
  var STAND = {
    morphEndOff: 8.131,    // FALLBACK only — the live value is read from ygg-threads at call time
    lag: 1.2,              // beat after the morph before the camera answers
    endBefore: 0.4,        // land just before CUE.still, so the stillness is still
    rollEnd: -Math.PI / 2, // world +X reads as screen-up (world.js: up = (sin(-roll), cos(roll), 0))
    /* THE FIELD (his note, 2026-07-18): "the max distance of the camera from the
       tree should be farther ... far enough that once we populate the black
       background with cosmological elements, we see both the tree AND the
       background, and we can distinguish them."

       At 16.0 the tree covered 139% of the frame's height and 107% of its width
       (measured on the rig: NDC bbox y [-0.96, 1.82] against a [-1, 1] frame) —
       it ran off three edges, so there was no field for a background to occupy
       and anything painted behind it could only read as texture BETWEEN branches,
       never as its own depth plane. A tree cannot read as an object in front of a
       cosmos until its silhouette closes inside the frame.

       Swept on the rig at the credo; 32 is where the silhouette first closes with
       real margin on every side while the tree still commands the composition:
         pullZ 16  ->  139% h / 107% w   top edge at NDC 1.82   spills
         pullZ 26  ->   82% h /  67% w   top edge at 0.97       bare fit, no field
         pullZ 32  ->   67% h /  56% w   top edge at 0.76       <- this
         pullZ 38  ->   57% h /  48% w   the tree starts reading small next to the
                                         wordmark, which does NOT shrink with it
                                         (the type is a separate ortho pass)
       32 also leaves the bottom of the frame open for the roots, which grow
       DOWNWARD off the trunk and would otherwise force this dial to move again.

       His "NOT fast" note survives the change: the move covers twice the distance
       in the same window, but apparent size falls as 1/d, so the PEAK shrink rate
       measured only 18% higher (-0.918/s vs -0.778/s). */
    pullZ: 32.0            // added camera-Z once stood up — the film's own dive is what this cancels
  };

  var PRUNE = {
    pruneTime: 0.75, pruneSoftness: 0.08, pruneSpeedVar: 0.2,
    fragmentDrift: 0.10, fragmentFadeFrames: 8,
    splitFlareCount: 5, splitFlareLength: 0.08, splitFlareDuration: 0.05,
    warningFlashDuration: 0.15, redPulseTravelTime: 0.12,
    warnColor: 0xFFEECC, redColor: 0xFF3300,
    fadeColor: 0xCCCCBB, flareColor: 0xFFEEAA,
    /* THE CONSUME r3 (2026-07-21, his three notes: DISSOLVED IN PLACE, REDDER,
       VIOLENT — "pruning in itself is a violent act"). This round was built
       against the ACTUAL FRAMES (Mobius, S1E4 — reference pulled to scratch,
       fine frames at 2fps, .superpowers/sdd/director-pass/): the burn is a
       RAGGED RADIAL DEVOUR from the touch — the body is replaced where it
       stands, never a linear wipe; the rim is FIRE, golden-white core fringing
       into orange-RED like burning paper; sparks shower and FALL; the FACE
       GOES LAST (on a branch: the tip holds out, then pops). The show's
       iridescent interior is a volume effect a 1px thread can't carry — its
       honest translation is a brief deep-red residue shimmer plus a magenta
       accent in a few sparks. Flag-on only; all live via YggHinge.PRUNE. */
    burnColor: 0xFF4A16, burnBoost: 2.5,             // fire rim: RED-orange; boost tamed so the fringe stays red, core still whitens
    residueColor: 0x9E2A16, residueTime: 0.5,        // the deep-red after-shimmer, in place — where the red lives
    /* r4 CONTINUITY CONTRACT: the afterlife is ONE curve per point — burn ends
       at exactly the residue's entry level, the crackle fades out with the
       fire (never stops on a frame), the residue's dispersal returns under its
       own dying alpha, the husk eases IN under the fading residue and lands on
       exactly hk, and the droop clock starts at HUSK birth, not death. The
       same math runs in mode 3 and mode 5, so the dEnd mode switch cannot
       truncate a residue mid-flight. No boundary anywhere may pop. */
    huskEase: 0.35,                                  // the char fades in under the dying residue
    ragged: 0.30, disperseDrift: 0.16,               // ignition raggedness + burn dispersal
    tipHold: 0.12,                                   // the face goes last
    huskColor: 0x4E2C1E,                             // charred strand (redder than r1's umber)
    huskAlpha: 0.10, huskFade: 1.4, huskFloor: 0.05, // decay to a scar, not to zero
    huskSag: 0.45,                                   // the dead branch droops
    wispPerThread: 9, wispLife: 1.1,                 // the spark shower
    wispBurst: 0.95, wispSize: 0.15,                 // violent scatter; gravity in the drive
    regrowTime: 1.8, regrowSoft: 0.22,               // his note: SLOWER — patient life vs violent death
    regrowStagger: 0.7
  };

  /* Pure f(t). Returns the hinge camera terms for world.js's camera block:
     active — the hinge owns the camera this frame;
     w      — pose blend weight (0 at both window edges → the film's own
              drift pose; 1 through the hold + orbit);
     mu     — the orbit's eased progress (drives az/el/roll AND, at level 2,
              the morph wavefront — R4: camera and geometry share one clock);
     az/el  — spherical pose about world Y through the look anchor;
     roll   — apparent world roll, applied camera-side via the up vector.
     dist is intentionally absent — inherited from the flag-off pose (see
     header). */
  function orbitPose(t, CUE) {
    var tIn = CUE.preTurn, tHold = CUE.turn;
    var t0 = CUE.turn + ORBIT.orbitStartOff;
    var t1 = CUE.wm2 + ORBIT.lingerAfterWm2;
    var tOut = CUE.settleStart;
    if (LEVEL < 1 || t <= tIn || t >= tOut) {
      return { active: false, w: 0, mu: 0, az: 0, el: ORBIT.elStart, roll: 0 };
    }
    var pre = smoothstep(tIn, tHold, t);
    var mu = easeInOutCubic(clamp((t - t0) / (t1 - t0), 0, 1));
    var w = pre * (1 - smoothstep(t1, tOut, t));
    return {
      active: true, w: w, mu: mu,
      az: ORBIT.azPre * pre * (1 - mu),
      el: ORBIT.elStart + (ORBIT.elEnd - ORBIT.elStart) * mu,
      roll: Math.sin(mu * Math.PI) * ORBIT.rollMax * w
    };
  }

  /* Prune lifecycle per the visual spec: GROW(1) → WARNING(2: flash + red
     pulse traveling split→tip) → DISSOLVE(3: front erases tip→split with a
     fragmenting band) → flare at the split → RESTORE(4). Pure f(tRel).
     The film calls with evt.redLine = 0: its forks are fully grown and the
     music hit IS the red line, so tRel = t − prune enters WARNING directly.
     After dEnd the film keeps the fork gone (alpha 0) until its own relight
     at turn+0.35 — mode 4's restoreK is the artifact's heal ramp, unused by
     the film's caller. */
  function pruneState(tRel, evt) {
    var out = { mode: 0, amp: 0, flash: 0, pulse: -1, front: 1, restoreK: 1, flare: 0 };
    if (tRel <= 0) return out;
    var tRed = evt.vGrow > 0 ? evt.redLine / evt.vGrow : 0;
    var dStart = tRed + PRUNE.warningFlashDuration;
    var dEnd = dStart + evt.pruneTime;
    var rEnd = dEnd + 0.45;
    if (tRel < tRed) { out.mode = 1; out.amp = tRel * evt.vGrow; }
    else if (tRel < dStart) {
      out.mode = 2; out.amp = evt.redLine;
      var wk = (tRel - tRed) / PRUNE.warningFlashDuration;
      out.flash = Math.sin(Math.PI * Math.min(1, wk * 2)) * 0.8;
      out.pulse = Math.min(1, (tRel - tRed) / PRUNE.redPulseTravelTime);
    } else if (tRel < dEnd) {
      out.mode = 3; out.amp = evt.redLine;
      out.front = 1 - (tRel - dStart) / evt.pruneTime;
    } else if (tRel < rEnd) {
      out.mode = 4;
      out.restoreK = smoothstep(0, 0.45, tRel - dEnd);
    }
    if (tRel >= dEnd && tRel < dEnd + PRUNE.splitFlareDuration) {
      out.flare = 1 - (tRel - dEnd) / PRUNE.splitFlareDuration;
    }
    return out;
  }

  /* The stand-up, as a pure function of t. Returns k (0 → 1 → hold → 0), the
     roll it drives and the pull it drives — one parameter, so the rotation and
     the dolly are simultaneous by construction. Zero at every LEVEL below 3, so
     the fallback and both hinge levels are untouched. */
  function standPose(t, CUE) {
    if (LEVEL < 3) return { k: 0, roll: 0, pullZ: 0 };
    /* The stand-up starts `lag` after the BLOOM ends. Read the bloom's end from
       ygg-threads at CALL time rather than keeping a second copy of the number:
       the orbit/morph pair in this file already drifted once by holding two
       independent copies of one window, and that is a silent failure — the
       clocks look right in both files and only the film is wrong. */
    var meOff = (window.YggThreads && window.YggThreads.CFG &&
                 window.YggThreads.CFG.morphEndOff !== undefined)
                 ? window.YggThreads.CFG.morphEndOff : STAND.morphEndOff;
    var t0 = CUE.turn + meOff + STAND.lag;
    var t1 = CUE.still - STAND.endBefore;
    var k;
    if (t <= t0) k = 0;
    else if (t < t1) k = easeInOutCubic((t - t0) / (t1 - t0));
    else k = 1;

    /* THE ROLL LATCHES (his note): "once the tree is up, don't have the camera
       re-rotate — it's just weird cinematographically to see the tree lying down
       again after having a whole scene that put it up." So the roll rides k up
       and then STAYS at -90° for the rest of the film; only the pull unwinds
       ("keep the timing, the zoom-fade-in if you want").
       Safe to hold, verified rather than assumed: after treeFade the 3D layer
       holds nothing but a 1200-point isotropic dust field at opacity 0.25 — the
       stinger and the attribution cards are 2D over black — so a permanently
       rolled camera has nothing left to turn the wrong way up. */
    var pull = k;
    if (t >= CUE.treeFade) {
      pull = t < CUE.sting
        ? 1 - easeInOutCubic((t - CUE.treeFade) / (CUE.sting - CUE.treeFade))
        : 0;
    }
    return { k: k, roll: STAND.rollEnd * k, pullZ: STAND.pullZ * pull };
  }

  window.YggHinge = {
    enabled: function () { return LEVEL; },
    ORBIT: ORBIT,
    STAND: STAND,
    PRUNE: PRUNE,
    orbitPose: orbitPose,
    standPose: standPose,
    pruneState: pruneState,
    smoothstep: smoothstep,
    easeInOutCubic: easeInOutCubic
  };
})();
