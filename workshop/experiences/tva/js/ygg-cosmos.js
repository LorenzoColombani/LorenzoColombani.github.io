/* ygg-cosmos.js — the cosmological background behind Yggdrasil.
   Three point/mesh layers plus the constellation hairline — four draw calls,
   pure f(t). INERT unless ?ygg=1: the constructor is only ever called from
   world.js's existing enabled()>=3 guard.
   Spec: docs/superpowers/specs/2026-07-19-cosmological-background-design.md */
(function () {
  'use strict';
  if (!window.THREE) { window.YggCosmos = null; return; }
  var T = window.THREE;

  var CFG = {
    starCount: 900,
    /* notional shell radius; they never parallax. DEVIATION FROM BRIEF (verbatim value was
       400): world.js:413 sets the shared camera's far plane to 120, so a shell at radius 400
       sits permanently beyond the far clip and is discarded pre-rasterization on every vertex
       (depthTest:false does not disable frustum clipping) — confirmed empirically: at 400 the
       credo frame's diff against the pre-cosmos baseline was mean 6.8e-5 / max 0.93 (of 255),
       i.e. a true null reading, not measurement noise. Because gl_PointSize has no distance
       attenuation and the shell is camera-centered, the rendered image is pixel-identical for
       ANY radius under the far plane — screen position depends only on direction, not depth —
       so shrinking the radius does not change the look, it only stops the clip. 110 leaves
       margin under the 120 far plane. Raising the camera's far plane instead was considered
       and rejected: it is a scene-wide change outside this file (fog is a live FogExp2; shifts
       depth-buffer precision for the whole film) with no visual benefit over the radius fix. */
    starRadius: 110,
    /* HIS EYES, 2026-07-20: "the stars are not there and embers neither." Confirmed by a
       layer-isolation arm (.superpowers/sdd/cosmos/isolate.js, each layer differenced against
       an all-hidden reference at the same t): at the credo the star layer painted 128 pixels
       of a 1,166,400-pixel frame — 0.011%, about 2 px per in-frame star — with a peak of only
       33/255 against a canopy at 255. It rasterised (this is NOT the starRadius:400 null-render
       class) but sat below the threshold to be seen at all.
       WHY SIZE IS THE PRIMARY LEVER, not alpha: gl_PointSize below ~3 means no fragment ever
       samples near the point's centre, so the fragment shader's radial falloff (f = e*e*(3-2e),
       squared) never reaches its peak — a 1.6 px point is dim BECAUSE it is small. Doubling the
       size therefore buys brightness for free and does it without touching uAlpha, which would
       have flattened the falloff into discs.
       Doubled linearly (4x area). These are §8 "for his eye, after it runs" dials — this is the
       candidate that makes them exist to be judged, not a final value. */
    starSizeDim: 3.2,
    starSizeBright: 6.8,
    brightFraction: 0.06,
    starAlpha: 0.85,

    /* DEVIATION FROM BRIEF (verbatim was spread:260, depthMin:40, depthMax:130):
       same far-plane fact as starRadius above, camera far=120 (world.js:413),
       camera ~37.3 from the tree at the credo, so only ~83 units of usable
       depth exist behind the tree and the usable world-space volume is a
       sphere of radius ~83 centred on the tree (worst case: camera orbits to
       the far side). depthMax:130 alone would put clouds 167 from camera —
       hard-clipped, never rasterized, same silent-null failure the star
       shell hit at radius 400 (a draw call fires; nothing paints). Corrected
       to spread:70, depth 30-75, per the far-plane budget derived for this
       plan (progress.md, "Far-plane budget" entry) — still verified here by
       differenced stills (gate 3/5), not trusted on the arithmetic alone.
       ⚠ STALE AS OF 2026-07-20 — this line used to read "nebulaCount and nebulaAlpha
       are the brief's own verbatim numbers, kept." BOTH have since moved: count
       90 -> 150 (his "petals on the right and bottom as well") and alpha 0.11 -> 0.18
       (his "a bit more visible"). Their own dated blocks below are authoritative.
       nebulaScaleMin/Max are NOT: the brief's 26-70 was sized against its own
       spread:260 (a cloud's full width, 2x scale, was ~10-27% of that field).
       Paired with the corrected spread:70 instead, the same 26-70 put a
       single cloud's full width (up to 140) at up to ~150% of the frustum
       width at its own depth — 90 of those crammed into a ~140x77 area
       rasterize (confirmed by capture, not assumed) as one solid additive
       wash with no void showing through anywhere, which fails §1b's "sparse,
       not abstract fog" outright. Rescaled by the brief's own ratio
       (scale:spread, both bounds ~1:10 to ~1:3.7) onto the corrected spread:
       70/260*26 ~= 7, 70/260*70 ~= 19 (shipped as 18). Verified distinct-with-gaps on the
       t120-128 strip (not the credo alone — bloom peaks near the credo and
       would make any density look worse than it will read once Task 4's
       brightness envelope rides the cosmos back down as bloom rides up). */
    /* HIS INSTRUCTION, 2026-07-20: "no petal physics, just petal on the right and bottom as
       well." Measured coverage of the isolated nebula at the credo, 3x3 cells, share of each
       cell painted: top row 27.1 / 75.8 / 34.9, middle 50.6 / 11.3 / 30.6, bottom 27.0 / 38.9
       / 30.3 — right column averaged 31.9% and the bottom row 32.1% against a top-centre of
       75.8%. Top-heavy, exactly as he read it.
       COUNT is the right lever, and the handoff names it first. It costs NO draw call (the
       billows are one merged mesh regardless of n) and it keeps every billow inside the
       already-verified far-plane volume, unlike widening spread — the usable region is a
       sphere of radius ~83 about the tree and the current x70/y38.5/z75 corner already sits
       at ~110, so there is no room to spread outward without risking the silent frustum-clip
       that starRadius:400 hit. Coverage saturates, so extra billows land preferentially in the
       sparse cells rather than the already-dense crown.
       NOT touched, per "it's awesome. Keep that": shape, scale, spread, and the lobed falloff
       that makes them read as petals. */
    /* HIS INSTRUCTION, 2026-07-20 (later): "reduce the number and visibility of petals."
       150 -> 110. NOT back to the original 90: his earlier "petal on the right and bottom
       as well" still stands, and count is the lever that satisfied it, so this keeps ~half
       the coverage that instruction bought while answering the new one. Count is BAKED at
       build time (buildNebula runs once), so unlike nebulaAlpha it cannot be dialled live —
       which is why it gets the more conservative move of the two. */
    nebulaCount: 110,
    nebulaSpread: 70,
    nebulaDepthMin: 30,
    nebulaDepthMax: 75,
    nebulaScaleMin: 7,
    nebulaScaleMax: 18,
    /* HIS EYES, 2026-07-20, on the billows he named "the petal like things coming off the tree":
       "it's awesome. Keep that" — then "they're very faint, so a bit more visible would be nice,
       but it's a cool effect." So: shape, count, scale and spread all STAY (this is the one layer
       he has praised); only presence rises. Isolation put the nebula at 30.1% of the credo frame
       at a peak of just 22/255 — it is the only layer he could see, and he was right that it is
       faint. 0.11 -> 0.18 is a deliberate "a bit", not a doubling. Contrast gate re-measured
       after this change, not assumed. */
    /* 0.18 -> 0.12 on the same instruction ("...and visibility"). This also RESOLVES the
       compound flagged in progress.md's LAST-SEEN table: 0.11 -> 0.18 moved a dimension his
       record had FROZEN ("density is right — do not touch cloud thickness or brightness"),
       and combined with count 90 -> 150 it took the credo background 60.2 -> 78.2, a +30%
       nobody asked for. 0.12 lands essentially back on the approved 0.11, so the frozen
       dimension is released and only the coverage he explicitly asked for is kept.
       LIVE-TUNABLE: update() re-reads CFG.nebulaAlpha every frame, so he can dial this from
       the console mid-playback without a reload — `YggCosmos.CFG.nebulaAlpha = 0.15`. */
    nebulaAlpha: 0.12,

    /* the THIRD lag: branches -> foliage -> sky. Same u-space-lag idiom as
       ygg-threads.js's own canopy bloom (bloomLag/bloomSoft, ygg-threads.js:314-315,
       applied at ygg-threads.js:1830 — smoothstep(u+lag, u+lag+soft, front)):
       each billow's own this.nebU offsets when IT crosses the growth wavefront. */
    skyLag: 0.42,
    skySoft: 0.55,

    /* brightness envelope (Task 4 §2): the cosmos rides down as the film's own
       bloom pass (world.js:2407-2411) rides up, so the sky doesn't wash out once
       bloom peaks near the credo. bloomCompensation DERIVED in Step 4 against the
       contrast gate — see task-4-report.md for the measurement; this is the value
       that measurement produced, not a value chosen ahead of it. credoEase mirrors
       the SHAPE of world.js's own credo ease (world.js:2408, same (t-C.createdBy)/1.5
       window) with its own independent coefficient — a different visual channel. */
    bloomCompensation: 0.45,
    credoEase: 0.25,

    /* embers: small motes rising from around the tree, recycled on a fixed period
       (age = modulo of t, never accumulated — see update() below) so a seek always
       lands identically to a play-through. renderOrder -10 seats them behind the
       canopy's lit tier (-2): they emerge FROM the foliage, not in front of it. */
    emberCount: 340,
    emberSpeed: 3.1,
    emberPeriod: 7.5,       // recycle period; modulo keeps it analytic
    emberRise: 0.55,
    emberAlpha: 0.9,

    /* ── the chinchilla constellation (Task 6) ──────────────────────────────────
       HIS WORD, 2026-07-20: "the chinchilla constellation and the background STARS are
       not the same thing" — they must READ AS DISTINCT — and, from the spec, "it must be
       small, like an Easter Egg." Those pull against each other at 900 field stars, so
       distinctness is bought in a register the field CANNOT ENTER, not in size:

         COLOUR — the field is rampAt(0.55..1.0), i.e. GREEN->TEAL->BLUE with provably zero
           warm content. rampAt(0) is GOLD, the crown colour. A hue the field cannot contain.
         BLOOM  — at the credo world.js sets bloom.threshold 0.46, while the field's
           brightest possible pixel is linear luma ~0.116 (a 4x margin), so NO field star
           can ever bloom. chinGain lifts these past that line: the halo is a different KIND
           of light, not merely more of it.
           Why bloom and not size: UnrealBloom's mip chain is resolution-relative, so the
           halo holds its apparent size on any screen — the distinguishing feature is the
           DPR-robust one.

       If it fails his eye the ladder is: raise gain -> drop a vertex -> NEVER raise
       chinScale. Small is the instruction. */
    /* HIS WORD, 2026-07-20 (reopening Task 6): "needs to look like the actual graphics
       of Loki — and with very faint lines to emphasize it — and be smaller." Three moves:
       1. LINES — a hairline layer traces the ACTUAL sanctioned drawing: all 42 outline
          segments of fx.js's 43-point chinPath() PLUS the three whiskers, exactly the
          geometry the sting itself strokes at fx.js:304-309. Star-to-star chords were
          considered and rejected: a 12-chord polygon is a constellation diagram of the
          shape, not the film's own graphic. The lines are LineSegments, gold, additive,
          at chinLineAlpha — faint EMPHASIS under the stars, never the subject. This is
          the one place the cosmos budget grows: +1 draw call (106 -> 107), bought by his
          instruction. WebGL ignores linewidth > 1, so the hairline is 1 device px at any
          DPR and opacity is the only heaviness dial.
       2. SMALLER — chinScale 0.40 -> 0.30 (-25% linear, -44% area).
       3. Star/eye sizes ride the shrink proportionally (9.5/13.0 -> 7.0/10.0) so the
          smaller figure doesn't read chunkier instead of smaller; both stay far above
          the 3 px shader floor, and legibility lost to size is repaid by the lines. */
    /* 11 outline vertices + the eye. Indices into fx.js's own 43-point chinPath():
       nose 0 · ear1 tip 5 · EAR VALLEY 9 · ear2 tip 13 · neck 17 · back 21 · rump 24 ·
       tail tip 26 · foot 34 · belly 36 · chin 39. The ear valley earns its slot — without
       it the two tips read as a zigzag rather than a notched pair. The forehead (4) is
       deliberately dropped: 4<->5 is only ~13 px at this scale and the two would merge
       into one fat blob, costing a point AND blurring the ear. Spans the full sanctioned
       bbox (0 = x-min, 26 = x-max, 13 = y-min, 34 = y-max). */
    chinIdx: [0, 5, 9, 13, 17, 21, 24, 26, 34, 36, 39],
    /* Screen placement in HALF-FRAME-HEIGHTS, so the layout is aspect-independent
       (NDC_x = h/aspect, NDC_y = v — the aspect cancels out of the pixel offset).
       Upper-right: the clear band beside the tree is h in [1.0, aspect], and the chinchilla
       faces LEFT (nose at x-min, tail at x-max) so it looks INWARD, toward the tree it is
       watching being made — rhyming with the 2D chinchilla's own entry side at the sting
       5.3 s later. Flipping to the left is one character (chinH -> -1.26) but points it out
       of frame. Named limit: full clearance holds for aspect >= ~1.39 (recomputed at
       chinScale 0.30 INCLUDING the whiskers, which reach past the outline's x-min). */
    chinH: window.__FIELD_SKY ? Math.min(1.26,Math.max(0,window.innerWidth/window.innerHeight-.18)) : 1.26,
    chinV: 0.72,
    chinScale: 0.30,
    /* aSize is in px at the 810-tall reference (see starMaterial's floor), so these are
       ~2x the field's dim tier and comfortably over the 3 px floor at any resolution. */
    chinStarSize: 7.0,
    chinEyeSize: 10.0,
    /* the hairline tracing. LIVE-TUNABLE like nebulaAlpha: update() re-reads it every
       frame — `YggCosmos.CFG.chinLineAlpha = 0.2` from the console, no reload. At 0.12
       the line's brightest possible pixel is linear luma ~0.1, a 4.6x margin under the
       credo bloom threshold (0.46): the lines can NEVER halo — that register stays the
       stars' alone. */
    chinLineAlpha: 0.12,
    /* Calibration anchor: the wordmark peaks at 224/255 (~0.85 linear). Body stars sit just
       UNDER it, the eye just OVER — the film's own definition of bright-but-not-garish.
       chinEyeGain is the first dial to pull back if it reads hot. The eye is "the one bright
       star" by BLOOM, not by bulk: the head is the crowded region, and a fat eye would
       swallow the nose. */
    chinGain: 2.4,
    chinEyeGain: 3.2
  };

  /* ── THE CREDO CAMERA BASIS — MEASURED, never derived ────────────────────────────
     At the credo the camera has rolled -90 deg and latched (ygg-hinge.js rollEnd = -PI/2,
     world.js camera.up = (sin(-roll), cos(roll), 0) = (1,0,0)), which SWAPS the screen axes.
     Two derivations of the result disagreed by a MIRROR, and a mirrored chinchilla — nose
     where the tail belongs — passes node --check, the draw-call gate, the contrast gate AND
     the per-layer isolation arm, because it occupies the identical bounding box. Only his
     eye would ever catch it.
     So this was settled by measurement, not argument: .superpowers/sdd/cosmos/basis-probe.js
     projects world offsets through the LIVE camera at t=133.2 and reports
       world +Y -> NDC dx -0.3666  => screen LEFT
       world +X -> NDC dy +0.6581  => screen UP
     Hence screen-right = world -Y. (The same probe confirms the projection model to three
     decimals: predicted -0.366 / +0.651.)
     Baked rather than read live because buildStars() runs at construction, when the camera
     is still at t=0 — nowhere near the credo pose. */
  var CAM_FWD   = new T.Vector3(0, 0, -1);
  var CAM_UP    = new T.Vector3(1, 0, 0);
  var CAM_RIGHT = new T.Vector3(0, -1, 0);
  var TAN_HALF_FOV = Math.tan(21 * Math.PI / 180);   // world.js: PerspectiveCamera(42, ...)
  var CHIN_ASPECT_REF = 16 / 9;                      // the reference frame the shape is sized at

  function smoothstep(a, b, x) {
    if (b <= a) return x < a ? 0 : 1;
    var k = (x - a) / (b - a);
    if (k < 0) k = 0; else if (k > 1) k = 1;
    return k * k * (3 - 2 * k);
  }

  /* the radial palette: gold at the crown, cooling outward. The film's own colours. */
  var GOLD  = new T.Color(0xFFF0C4);
  var GREEN = new T.Color(0x54BC96);
  var TEAL  = new T.Color(0x3E9E86);
  var BLUE  = new T.Color(0x4090BC);

  /* scratch — reused every frame, never allocated inside update() */
  var _worldPos = new T.Vector3();

  /* scratch — reused every frame, never allocated inside update(). Same idiom and
     same reason as _worldPos below.
     WHY: rampAt() is called once per ember per frame (CFG.emberCount = 340) from
     update()'s ember loop, so `new T.Color()` there was 340 allocations every
     visible frame — against the convention this file itself states. Flagged as an
     Important finding in Task 5's review and carried to here.
     WHY IT IS SAFE, by inspection of every call site: buildStars, buildNebula and
     the ember loop each read .r/.g/.b immediately and none holds the reference
     across a second rampAt() call. buildNebula reads it inside a 4-iteration vertex
     loop, but calls nothing in between.
     ⚠ CONTRACT FOR FUTURE CALLERS: the returned Color is SHARED and is clobbered by
     the next rampAt(). Read its components immediately; never store the object. */
  var _rampC = new T.Color();

  function rampAt(k) {           // k 0 = at the crown, 1 = frame edge
    var c = _rampC;
    if (k < 0.34) { c.copy(GOLD).lerp(GREEN, k / 0.34); }
    else if (k < 0.67) { c.copy(GREEN).lerp(TEAL, (k - 0.34) / 0.33); }
    else { c.copy(TEAL).lerp(BLUE, (k - 0.67) / 0.33); }
    return c;
  }

  function starMaterial() {
    return new T.ShaderMaterial({
      uniforms: { uAlpha: { value: 0 }, uRes2: { value: new T.Vector2(1440, 810) } },
      vertexShader: [
        'attribute float aSize;',
        'attribute vec3 aCol;',
        'uniform vec2 uRes2;',
        'varying vec3 vC;',
        'void main(){',
        '  vC = aCol;',
        '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
        /* aSize is in pixels AT THE 810-TALL REFERENCE FRAME, scaled to the real render
           target — NOT world units. Deliberately not ygg-threads.js:1346's
           `aSize * pxPerWorld`: that divides by -mv.z, i.e. distance attenuation, which
           would destroy the "notionally at infinity, zero parallax" property Tasks 2-3
           were spent establishing (the shell is camera-centred, so screen position must
           depend on direction alone).
           THE max(...,3.0) IS THE POINT, and it is why this is a floor and not a dial:
           below ~3 px no fragment ever samples near the point's centre, so the fragment
           shader's falloff f=(e*e*(3-2e))^2 never approaches 1 — a small point is dim
           BECAUSE it is small. On 2026-07-20 that cost Lorenzo two entire layers: stars
           at 1.6 px painted 128 pixels of a 1,166,400-pixel frame while every gate in
           the plan passed, draw calls reading 106 exactly throughout. The clamp makes
           "a layer too small to see" unexpressible at any resolution rather than
           something a future dial can quietly reintroduce. */
        '  gl_PointSize = max(aSize * (uRes2.y / 810.0), 3.0);',
        '  gl_Position = projectionMatrix * mv;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'varying vec3 vC;',
        'uniform float uAlpha;',
        'void main(){',
        /* procedural round falloff — NEVER a canvas radial gradient (Safari dithers those) */
        '  vec2 q = gl_PointCoord - vec2(0.5);',
        '  float r = length(q) * 2.0;',
        '  if (r > 1.0) discard;',
        '  float e = 1.0 - r; float f = e * e * (3.0 - 2.0 * e); f *= f;',
        '  gl_FragColor = vec4(vC * f * uAlpha, 1.0);',
        '}'
      ].join('\n'),
      transparent: true, blending: T.AdditiveBlending,
      depthWrite: false, depthTest: false, fog: false
    });
  }

  /* THE SHAPE IS READ FROM ITS ONE SOURCE, NEVER COPIED.
     fx.js:120 chinPath() reads NOTHING off `this` — it only writes this.chinEye /
     this.chinWhiskers and returns the box-mapped outline — so calling it on a bare shim is a
     pure read of the sanctioned silhouette: no fx.js edit (the isolation contract forbids
     one), and no second copy of the 43 points that could drift from his approved drawing.
     Same idiom as buildNebula()'s reuse of window.YggThreads.
     Returns null and NEVER throws: world.js:487-490 has no try/catch, so a missing or
     changed export must degrade to "no constellation", not to a dead film. */
  function chinSource() {
    var FX = window.FX;
    if (!FX || !FX.TimelineFX || !FX.TimelineFX.prototype ||
        typeof FX.TimelineFX.prototype.chinPath !== 'function') return null;
    var shim = {}, path;
    try { path = FX.TimelineFX.prototype.chinPath.call(shim); } catch (e) { return null; }
    if (!path || path.length < 42 || !shim.chinEye) return null;
    /* whiskers are OPTIONAL in the contract: the outline + eye degrade gracefully
       without them, so a future chinPath that stops writing them costs the lines
       three segments, never the film. */
    return { path: path, eye: shim.chinEye, whiskers: shim.chinWhiskers || null };
  }

  /* bbox centre of the sanctioned outline, computed at runtime rather than hard-coded,
     so this stays correct if fx.js's own box ever moves. The centre comes from the PATH
     alone — whiskers deliberately excluded, so adding them to the line layer cannot
     shift where the stars sit. */
  function chinCenter(path) {
    var i, q, x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (i = 0; i < path.length; i++) {
      q = path[i];
      if (q[0] < x0) x0 = q[0];
      if (q[0] > x1) x1 = q[0];
      if (q[1] < y0) y0 = q[1];
      if (q[1] > y1) y1 = q[1];
    }
    return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  }

  /* ONE projection for stars and lines — a second copy of this math is a second place
     for the mirror defect to come back.
     chinPath's coords are fractions of the CANVAS (x of width, y of height), so the x
     delta is multiplied by the reference aspect to bring both axes into the same units —
     that is what preserves the silhouette's true 1.43:1 proportions. Scaling x and y
     equally, as the plan's code did, renders it ~18% narrower than his approved drawing.
     The y term is SUBTRACTED: fx.js's y runs DOWNWARD (canvas convention, ears at
     y~0.06), screen v runs up.
     Built in the explicit screen basis rather than an az/el pair. That is what makes the
     plan's transposition defect UNEXPRESSIBLE here: under the -90 deg roll its `chinEl`
     moved the constellation horizontally and its `chinAz` vertically, so its own comment
     ("above the horizon, clear of the tree's crown") was false and its values put the
     shape inside the tree's silhouette. Here horizontal IS horizontal, by construction. */
  function chinProject(q, cx, cy) {
    var h = CFG.chinH + (q[0] - cx) * 2 * CHIN_ASPECT_REF * CFG.chinScale;
    var v = CFG.chinV - (q[1] - cy) * 2 * CFG.chinScale;
    var d = new T.Vector3();
    d.copy(CAM_FWD)
     .addScaledVector(CAM_RIGHT, h * TAN_HALF_FOV)
     .addScaledVector(CAM_UP, v * TAN_HALF_FOV)
     .normalize()
     .multiplyScalar(CFG.starRadius);
    return d;
  }

  /* Free function, NOT a prototype method — the plan's own code called
     this.constellationPoints() from inside buildStars(), which is itself a free function, so
     under 'use strict' `this` is undefined and the call throws a TypeError. world.js:487-490
     has no try/catch, so that would HARD-CRASH the film under ?ygg=1 rather than degrade.
     Nothing here touches `this`. */
  function constellationPoints() {
    var src = chinSource();
    if (!src) return [];
    var i, list = [], out = [];
    var c0 = chinCenter(src.path);

    for (i = 0; i < CFG.chinIdx.length; i++) list.push({ q: src.path[CFG.chinIdx[i]], eye: false });
    list.push({ q: src.eye, eye: true });

    for (i = 0; i < list.length; i++) {
      var e = list[i];
      var d = chinProject(e.q, c0.cx, c0.cy);
      var gain = e.eye ? CFG.chinEyeGain : CFG.chinGain;
      /* rampAt returns the SHARED scratch — read the components immediately, never store
         the object (the contract stated at _rampC). */
      var c = rampAt(0);                     // GOLD: the crown colour the field cannot contain
      out.push({
        x: d.x, y: d.y, z: d.z,
        r: c.r * gain, g: c.g * gain, b: c.b * gain,
        s: e.eye ? CFG.chinEyeSize : CFG.chinStarSize
      });
    }
    return out;
  }

  /* the hairline layer's geometry: the ACTUAL drawing, not a diagram of it.
     42 outline segments (the 43-point path is closed — last point duplicates the
     first) + the 3 whiskers, projected through the SAME chinProject the stars use,
     about the SAME path-only centre — so the lines pass exactly under the stars
     and the whiskers cannot shift the figure. Returns null and never throws, the
     chinSource contract. */
  function constellationLineVerts() {
    var src = chinSource();
    if (!src) return null;
    var c0 = chinCenter(src.path);
    var segs = [], i;
    for (i = 0; i < src.path.length - 1; i++) segs.push([src.path[i], src.path[i + 1]]);
    if (src.whiskers) for (i = 0; i < src.whiskers.length; i++) segs.push(src.whiskers[i]);
    var out = new Float32Array(segs.length * 6);
    for (i = 0; i < segs.length; i++) {
      var a = chinProject(segs[i][0], c0.cx, c0.cy);
      var b = chinProject(segs[i][1], c0.cx, c0.cy);
      out[i * 6] = a.x; out[i * 6 + 1] = a.y; out[i * 6 + 2] = a.z;
      out[i * 6 + 3] = b.x; out[i * 6 + 4] = b.y; out[i * 6 + 5] = b.z;
    }
    return out;
  }

  function buildStars() {
    /* The constellation STARS are appended to the END of the field's own buffer: one T.Points,
       so they add NO draw call (the cosmos budget is 3 point/mesh layers + 1 for the hairline
       — see buildChinLines), it inherits starMat so
       it can never drift from the field's alpha envelope, and — because it is contiguous at
       the end — it is separable for free at QA time via geometry.setDrawRange(starCount, m),
       with zero production code to support it.
       THE ALLOCATION IS DERIVED FROM THE SAME ARRAY THAT IS ITERATED. The plan's code sized
       these from CFG.starCount alone and then wrote at index starCount + i; typed arrays
       DISCARD out-of-range writes silently, so node --check passed, the draw-call gate passed,
       and zero constellation points would have rendered — the same silent-null class this file
       has already been bitten by twice (starRadius 400, nebulaDepthMax 130). Writing it this
       way makes an off-by-N impossible to express rather than merely absent. */
    var con = constellationPoints();
    var n = CFG.starCount, m = con.length, i;
    var pos = new Float32Array((n + m) * 3), col = new Float32Array((n + m) * 3), siz = new Float32Array(n + m);
    /* The field loop below is untouched — same seed, same PRNG call sequence — so every prior
       measurement of the star layer stays valid and its isolation arm remains diffable against
       its own history. constellationPoints() has its own scope and never touches `seed`. */
    var seed = 20260719;
    function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
    for (i = 0; i < n; i++) {
      /* even distribution on a sphere */
      var u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      pos[i * 3] = CFG.starRadius * s * Math.cos(th);
      pos[i * 3 + 1] = CFG.starRadius * u;
      pos[i * 3 + 2] = CFG.starRadius * s * Math.sin(th);
      var bright = rnd() < CFG.brightFraction;
      siz[i] = bright ? CFG.starSizeBright : CFG.starSizeDim;
      var c = rampAt(0.55 + rnd() * 0.45);       // stars live in the cool outer half
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    /* ── the constellation, indices n .. n+m-1 ── */
    for (i = 0; i < m; i++) {
      var j = n + i, e = con[i];
      pos[j * 3] = e.x; pos[j * 3 + 1] = e.y; pos[j * 3 + 2] = e.z;
      col[j * 3] = e.r; col[j * 3 + 1] = e.g; col[j * 3 + 2] = e.b;
      siz[j] = e.s;
    }
    var geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('aCol', new T.BufferAttribute(col, 3));
    geo.setAttribute('aSize', new T.BufferAttribute(siz, 1));
    return geo;
  }

  function CosmosSystem(scene, camera, C) {
    this.C = C;
    this.group = new T.Group();
    this.group.renderOrder = -30;
    scene.add(this.group);
    this.starMat = starMaterial();
    this.stars = new T.Points(buildStars(), this.starMat);
    this.stars.renderOrder = -30;
    this.stars.frustumCulled = false;
    this.group.add(this.stars);
    /* baked full-gain colours of the constellation tail — the reveal-in-stillness
       write (update()) scales the live buffer from THIS copy, so the write is
       idempotent at any t and a seek lands identically to a play-through. */
    var chinCA = this.stars.geometry.attributes.aCol.array, cb0 = CFG.starCount * 3, ci;
    this.chinColBase = new Float32Array(chinCA.length - cb0);
    for (ci = 0; ci < this.chinColBase.length; ci++) this.chinColBase[ci] = chinCA[cb0 + ci];
    this._chinRevealK = null;
    this.buildChinLines();
    this.buildNebula();
    this.buildEmbers();
  }

  /* the constellation hairline — HIS WORD 2026-07-20: "very faint lines to emphasize
     it". A CHILD of this.stars, deliberately: the lines are part of the star shell
     (zero parallax), and parenting means they inherit update()'s camera-position copy
     with no second write to drift from it. WebGL caps linewidth at 1 device px, which
     is the wanted etched look; opacity (chinLineAlpha, live) is the only heaviness
     dial. Degrades to no-lines if the source is gone — never throws (world.js:487-490
     has no try/catch). */
  CosmosSystem.prototype.buildChinLines = function () {
    var verts = constellationLineVerts();
    if (!verts) return;
    var geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(verts, 3));
    this.chinLineMat = new T.LineBasicMaterial({
      color: GOLD.getHex(),                  // the stars' own register, dimmer
      transparent: true, opacity: 0,         // update() owns it — pure f(t)
      blending: T.AdditiveBlending,
      depthWrite: false, depthTest: false, fog: false
    });
    this.chinLines = new T.LineSegments(geo, this.chinLineMat);
    this.chinLines.renderOrder = -30;
    this.chinLines.frustumCulled = false;
    this.stars.add(this.chinLines);
  };

  /* the nebula billows — the canopy's own shader (window.YggThreads.billowMaterial /
     .makeBillows, reused verbatim, not copied) at sky scale. World space, NOT
     camera space: this is the layer that parallaxes, unlike the star shell above.
     One merged geometry, one draw call for all CFG.nebulaCount clouds. */
  CosmosSystem.prototype.buildNebula = function () {
    var YT = window.YggThreads;
    var n = CFG.nebulaCount, i, k;
    var B = YT.makeBillows(n);          // merged geometry, 4 verts + 2 tris per billow
    var g = B.geo, seed = 77712026;
    function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
    var P = g.attributes.position.array, S = g.attributes.aScale.array;
    var R = g.attributes.aRot.array,     D = g.attributes.aSeed.array;
    var CO = g.attributes.aCol.array,    BL = g.attributes.aBloom.array;
    this.nebU = new Float32Array(n);
    for (i = 0; i < n; i++) {
      var depth = CFG.nebulaDepthMin + rnd() * (CFG.nebulaDepthMax - CFG.nebulaDepthMin);
      var x = (rnd() * 2 - 1) * CFG.nebulaSpread;
      var y = (rnd() * 2 - 1) * CFG.nebulaSpread * 0.55;
      var sc = CFG.nebulaScaleMin + rnd() * (CFG.nebulaScaleMax - CFG.nebulaScaleMin);
      var rot = rnd() * Math.PI * 2, sd = rnd() * 10;
      /* radial ramp: distance from the tree in the XY plane drives the colour */
      var kRad = Math.min(1, Math.sqrt(x * x + y * y) / CFG.nebulaSpread);
      var c = rampAt(0.25 + kRad * 0.75);
      this.nebU[i] = rnd();             // its own u, so it blooms on its own beat (Task 4)
      for (k = 0; k < 4; k++) {
        var v = i * 4 + k;
        P[v * 3] = x; P[v * 3 + 1] = y; P[v * 3 + 2] = -depth;
        S[v * 2] = sc; S[v * 2 + 1] = sc * (0.7 + rnd() * 0.5);
        R[v] = rot; D[v] = sd; BL[v] = 0;
        CO[v * 3] = c.r; CO[v * 3 + 1] = c.g; CO[v * 3 + 2] = c.b;
      }
    }
    this.nebMat = YT.billowMaterial(true);   // additive only; dark caps are pointless on black
    this.nebMat.fog = false;
    this.nebula = new T.Mesh(g, this.nebMat);
    this.nebula.renderOrder = -20;           // behind the canopy's lit tier (-2), ahead of stars (-30)
    this.nebula.frustumCulled = false;
    this.nebBloom = BL;
    this.nebGeo = g;
    this.group.add(this.nebula);
  };

  /* embers — third and final layer. Reuses the star material (same procedural point
     falloff, different geometry): a fresh T.ShaderMaterial per starMaterial() call, so
     this does not touch the star layer's own uAlpha uniform. Anchor/direction/birth are
     precomputed once here; update() reads them and t to place each ember, never storing
     motion state of its own. */
  CosmosSystem.prototype.buildEmbers = function () {
    var n = CFG.emberCount, i;
    var pos = new Float32Array(n * 3), col = new Float32Array(n * 3), siz = new Float32Array(n);
    var seed = 5150719;
    function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
    this.emAnchor = new Float32Array(n * 3);
    this.emDir = new Float32Array(n * 3);
    this.emBirth = new Float32Array(n);
    for (i = 0; i < n; i++) {
      var a = rnd() * Math.PI * 2, rr = 2 + rnd() * 9;
      this.emAnchor[i * 3] = Math.cos(a) * rr;
      this.emAnchor[i * 3 + 1] = 3 + rnd() * 7;
      this.emAnchor[i * 3 + 2] = Math.sin(a) * rr * 0.6;
      var da = rnd() * Math.PI * 2;
      this.emDir[i * 3] = Math.cos(da);
      this.emDir[i * 3 + 1] = CFG.emberRise + rnd() * 0.5;
      this.emDir[i * 3 + 2] = Math.sin(da) * 0.6;
      this.emBirth[i] = rnd() * CFG.emberPeriod;
      /* doubled with the star sizes above, and for the same measured reason: embers painted
         1,032 px of the credo frame (0.088%, ~3 px each) and read as absent. Same shared
         starMaterial() falloff, so the same "too small to reach its own peak brightness" applies. */
      siz[i] = 2.8 + rnd() * 4.0;
    }
    var geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('aCol', new T.BufferAttribute(col, 3));
    geo.setAttribute('aSize', new T.BufferAttribute(siz, 1));
    this.emMat = starMaterial();
    this.embers = new T.Points(geo, this.emMat);
    this.embers.renderOrder = -10;   // behind the canopy: they emerge from BEHIND the foliage
    this.embers.frustumCulled = false;
    this.emGeo = geo;
    this.group.add(this.embers);
  };

  /* pure f(t). front = {raw, front} from ThreadSystem.frontAt(t). */
  /* `res` is the render target size, passed from world.js:2364 — the SAME
     this.grade.uniforms.uRes.value the line above it already hands to
     ThreadSystem.update(). It adds an argument to a call that already exists, so
     world.js still "gains exactly two lines" per the spec's isolation contract:
     the count is unchanged. Optional on purpose — starMaterial() seeds uRes2 with
     the 1440x810 reference, so a caller that omits it degrades to reference scale
     rather than to zero-sized points. */
  CosmosSystem.prototype.update = function (t, front, camera, res) {
    var C = this.C;
    var visible = t >= (window.__FIELD_SKY ? 0 : C.turn - 1) && t < C.stingClear + 1;
    this.group.visible = visible;
    if (!visible) return;
    /* stars ride the camera POSITION but not its rotation: they sweep as the
       camera orbits and never parallax, which is what "infinitely distant" means.
       FIX (Task 3, Step 0 — defect carried over from Task 2): camera.position is
       LOCAL to its parent (this.rig — world.js:412-416), and in the settled camera
       branch (world.js:1963-1967, active from t≈123.774, which covers the credo
       gate frame 133.2) the drift sway lives on rig.position/rig.rotation, never on
       camera.position. Copying the local position alone parked the shell ~2-3 world
       units off the camera's true position — real, non-zero parallax on a layer
       whose entire reason for existing is to have none.
       camera.getWorldPosition() is the correct read. Matrix currency: verified
       directly against this project's vendored build (assets/vendor/three.bundle.min.js)
       that getWorldPosition() already calls this.updateWorldMatrix(true,false)
       internally before reading matrixWorld — i.e. it forces its own parent chain
       (rig -> scene) current from THIS frame's freshly-set position/rotation, which
       world.js's camera block (run earlier in the same World.update() call, well
       before this cosmos update) has already written. No matrixWorldAutoUpdate
       override exists anywhere in loki/js/*.js to short-circuit that. So the explicit
       call below is redundant in this exact build — kept anyway as belt-and-suspenders
       (this file's own idiom elsewhere), cheap, and a guard against a future
       autoUpdate=false or three.js internals changing. */
    camera.updateWorldMatrix(true, false);
    camera.getWorldPosition(_worldPos);
    this.stars.position.copy(_worldPos);

    /* nebula: world space, no position copy — parallax IS the point. Task 4
       replaces the Task 3 hold-open (every billow held at aBloom=1) with the
       growth wavefront: each billow crosses into bloom at its OWN this.nebU
       (seeded in buildNebula), offset by skyLag/skySoft — the same
       u+lag/u+lag+soft smoothstep idiom ygg-threads.js uses for the canopy
       (ygg-threads.js:1830), so the sky is CAUSED by the tree's growth
       rather than co-incident with it. Pure f(t): rewritten every visible
       frame from front.front alone, nothing accumulated. */
    var f = front.front, i, k, b;
    // The same sky quietly precedes the film. Hand its controls back before
    // the authored turn, so the growth, finale and constellation keep their cues.
    var earlySky = window.__FIELD_SKY ? 1 - smoothstep(C.turn - 4, C.turn - 1, t) : 0;
    for (i = 0; i < this.nebU.length; i++) {
      b = Math.max(.42*earlySky,smoothstep(this.nebU[i] + CFG.skyLag, this.nebU[i] + CFG.skyLag + CFG.skySoft, f));
      for (k = 0; k < 4; k++) this.nebBloom[i * 4 + k] = b;
    }
    this.nebGeo.attributes.aBloom.needsUpdate = true;

    /* brightness envelope: dims both live layers as the film's own bloom pass
       ramps up (world.js:2407-2411), easing back at the credo. Pure f(t) —
       see envelopeAt below. */
    var env = this.envelopeAt(t);
    this.starMat.uniforms.uAlpha.value = CFG.starAlpha * env.sky * (1 - earlySky * .55);
    this.nebMat.uniforms.uAlpha.value = CFG.nebulaAlpha * env.sky * (1 - earlySky * .82);

    /* THE STING HAND-BACK (director pass F, 2026-07-20): when the REAL chinchilla
       draws on at C.sting, its star-form yields the frame — two versions of the
       same animal were occupying the same pixels (the constellation sits inside
       the drawn silhouette's ear/shoulder from ~140s; found on the full-arc
       walk). The FIELD stays behind the sting; only the constellation tail of
       the star buffer bows out, cut on the beat. Still a pure function of t.
       ⚠ EDGE-TRIGGERED on purpose: matrix.js's QA arms drive setDrawRange
       between captures, and a per-frame unconditional write would clobber an
       arm mid-measurement. _chinDrawN is a render cache (idempotent, derived
       from t every frame), not film state — a seek across the sting boundary
       lands identically to a play-through. */
    var chinTotal = this.stars.geometry.attributes.position.count;
    var chinDrawN = (t >= C.sting) ? Math.min(CFG.starCount, chinTotal) : chinTotal;
    if (this._chinDrawN !== chinDrawN) {
      this._chinDrawN = chinDrawN;
      this.stars.geometry.setDrawRange(0, chinDrawN);
    }

    /* THE REVEAL IN STILLNESS (his note 2026-07-21: the constellation "appears
       moving — it should be in one place only"). It used to enter with the whole
       sky envelope, mid-morph — world-fixed, so the camera's arc dragged it
       across the frame. Now it holds until the film's one beat of stillness
       (C.still) and blooms in over 1.6s with the camera parked: every frame of
       its visible life shows it in the SAME place, and the sting hand-off
       happens exactly where it lived. Delta-triggered colour write (a render
       cache like _chinDrawN — pure f(t), idempotent, seek-safe); .visible and
       setDrawRange stay untouched — matrix.js's arms own those. */
    var chinRv = smoothstep(C.still, C.still + 1.6, t);
    if (this._chinRevealK === null || Math.abs(chinRv - this._chinRevealK) > 1e-4) {
      this._chinRevealK = chinRv;
      var chinCA2 = this.stars.geometry.attributes.aCol.array, cb2 = CFG.starCount * 3, cj;
      for (cj = 0; cj < this.chinColBase.length; cj++) chinCA2[cb2 + cj] = this.chinColBase[cj] * chinRv;
      this.stars.geometry.attributes.aCol.needsUpdate = true;
    }

    /* the hairline rides the same envelope as the stars it underlines, and re-reads
       chinLineAlpha every frame — live-dialable like nebulaAlpha. The sting gate
       goes through OPACITY, never .visible: matrix.js's arms own chinLines.visible. */
    if (this.chinLineMat) {
      this.chinLineMat.opacity = CFG.chinLineAlpha * env.sky * chinRv * (t >= C.sting ? 0 : 1);
    }
    /* same guarded idiom as ygg-threads.js:1787/:1876 (`if (res) ...copy(res)`).
       Both point materials are independent instances from the starMaterial()
       factory, so each needs its own write. */
    if (res) {
      this.starMat.uniforms.uRes2.value.copy(res);
      this.emMat.uniforms.uRes2.value.copy(res);
    }

    /* embers: pure f(t) via a modulo age against each ember's own birth offset —
       never an accumulated +=, so a seek lands identically to a play-through. */
    var eb = this.emGeo.attributes.position.array, ec = this.emGeo.attributes.aCol.array;
    for (i = 0; i < CFG.emberCount; i++) {
      /* age is a modulo of t — NEVER an accumulated +=. A seek must land identically. */
      var age = ((t - this.emBirth[i]) % CFG.emberPeriod + CFG.emberPeriod) % CFG.emberPeriod;
      var d = age * CFG.emberSpeed;
      eb[i * 3]     = this.emAnchor[i * 3]     + this.emDir[i * 3]     * d;
      eb[i * 3 + 1] = this.emAnchor[i * 3 + 1] + this.emDir[i * 3 + 1] * d;
      eb[i * 3 + 2] = this.emAnchor[i * 3 + 2] + this.emDir[i * 3 + 2] * d;
      var kk = age / CFG.emberPeriod;                  // gold at birth -> teal as it travels
      var c = rampAt(kk * 0.8);
      var fade = Math.sin(Math.PI * kk);               // in and out over the period
      ec[i * 3] = c.r * fade; ec[i * 3 + 1] = c.g * fade; ec[i * 3 + 2] = c.b * fade;
    }
    this.emGeo.attributes.position.needsUpdate = true;
    this.emGeo.attributes.aCol.needsUpdate = true;
    this.emMat.uniforms.uAlpha.value = CFG.emberAlpha * env.sky * Math.max(.08*earlySky,smoothstep(C.turn, C.turn + 5, t));
  };

  /* the brightness envelope. glowK mirrors world.js's OWN bloom ramp verbatim:
     world.js:2407 is `var glowK = smoothstep01((t - C.turn) / 6)`, with
     smoothstep01(x) at world.js:327 clamping x to [0,1] then applying
     x*x*(3-2x) — i.e. exactly this file's local 2-edge smoothstep(0, 1, x)
     called on the same (t - C.turn) / 6. world.js:2409-2410 confirms the
     ramp this complements: bloom.threshold falls 0.78 -> TH_LO(0.46) and
     bloom.strength climbs toward STR_HI(1.00) across that same glowK. sky is
     glowK's complement (1 - bloomCompensation*glowK), eased by credoEase in
     the same (t - C.createdBy)/1.5 window world.js:2408 uses for its own
     credo ease (independent coefficient — a different visual channel, not
     the same number). k is exposed for Tasks 5-6. */
  CosmosSystem.prototype.envelopeAt = function (t) {
    var C = this.C;
    var glowK = smoothstep(0, 1, (t - C.turn) / 6);
    var ease = 1 - CFG.credoEase * smoothstep(0, 1, (t - C.createdBy) / 1.5);
    return { k: glowK, sky: (1 - CFG.bloomCompensation * glowK) * ease };
  };

  window.YggCosmos = {
    inst: null,
    CFG: CFG,
    create: function (scene, camera, C) {
      this.inst = new CosmosSystem(scene, camera, C);
      return this.inst;
    }
  };
})();
