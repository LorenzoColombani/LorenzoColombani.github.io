/* ═══════════════════════════════════════════════════════════════════════
   world.js — the third dimension. Mixed-media law: everything MATERIAL is
   2D/photographic (typography, paper, soft prop planes, bokeh); everything
   made of LIGHT is real 3D (timeline ribbons, the braided Yggdrasil, dust,
   embers, the eruption). Light cannot look like bad CGI.
   Pipeline (one renderer, THE BRIDGE's vendored three bundle):
     Render(world) → Render(title layer, ortho, no clear) → UnrealBloom
     → Output(ACES) → Film grade (weave·barrel·wobble·CA·grain·scan·vig).
   Everything is a function of the score clock t; particles are cosmetic.
   The turn: as the machine loses control (preTurn), the returning branches
   fray into ~120 fibers and are ALREADY bending into Yggdrasil — partly
   off-frame, classic side view; the camera pulls back and the whole
   structure pivots CCW about G, REVEALING the formation in progress. The
   same strands keep forming through the reveal (green fibers, gold
   threads, white-hot core, seven limbs — one per deviation) and complete
   in the finale — blossoms ignite at the stillness.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (!window.THREE) { window.WORLD = null; return; }
  var T = window.THREE, U = window.FX.util;

  /* ---------- the grade ---------- */
  var GradeShader = {
    uniforms: {
      tDiffuse: { value: null },
      uNoise: { value: null },
      uRes: { value: new T.Vector2(1, 1) },
      uWeave: { value: new T.Vector2(0, 0) },
      uFrame: { value: 0 },
      uWobble: { value: 1 },
      uGrain: { value: 0.06 },
      uVig: { value: 0.5 },
      uFlicker: { value: 0.03 },
      uCA: { value: 0.0018 },
      uBarrel: { value: 0.05 },
      uGreen: { value: 0.05 },
      uScan: { value: 0.05 },
      uFlash: { value: new T.Vector4(1, 1, 1, 0) }
    },
    vertexShader:
      'varying vec2 vUv;' +
      'void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: [
      'varying vec2 vUv;',
      'uniform sampler2D tDiffuse, uNoise;',
      'uniform vec2 uRes, uWeave;',
      'uniform float uFrame, uWobble, uGrain, uVig, uFlicker, uCA, uBarrel, uGreen, uScan;',
      'uniform vec4 uFlash;',
      'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
      'void main(){',
      '  vec2 uv = vUv + uWeave / uRes;',
      '  vec2 c = uv - 0.5;',
      '  uv = 0.5 + c * (1.0 + uBarrel * dot(c, c));',
      '  vec2 n = texture2D(uNoise, uv * 3.1 + vec2(fract(uFrame * 0.37), fract(uFrame * 0.61))).rg - 0.5;',
      '  uv += n * uWobble / uRes;',
      '  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { gl_FragColor = vec4(0.012, 0.009, 0.006, 1.0); return; }',
      '  vec2 off = c * uCA;',
      '  vec3 col;',
      '  col.r = texture2D(tDiffuse, uv + off).r;',
      '  col.g = texture2D(tDiffuse, uv).g;',
      '  col.b = texture2D(tDiffuse, uv - off).b;',
      '  float shadow = 1.0 - clamp(dot(col, vec3(0.333)) * 1.4, 0.0, 1.0);',
      '  col = mix(col, col * vec3(0.94, 1.06, 0.97) + vec3(0.0, 0.010, 0.004), uGreen * shadow);',
      '  float sl = sin((uv.y + n.x * 0.002) * uRes.y * 3.14159);',
      '  col *= 1.0 - uScan * (0.5 + 0.5 * sl) * 0.5;',
      '  float g = hash(floor(uv * uRes) + vec2(uFrame * 13.1, uFrame * 7.7)) - 0.5;',
      '  float lum = dot(col, vec3(0.299, 0.587, 0.114));',
      '  col += g * uGrain * (0.25 + 1.8 * lum * (1.0 - lum));',
      '  float vig = smoothstep(1.15, 0.32, length(c) * 1.6);',
      '  col *= mix(1.0, vig, uVig);',
      '  col = mix(col, uFlash.rgb, uFlash.a);',
      '  col *= 1.0 - uFlicker * hash(vec2(uFrame, 3.7));',
      '  col += vec3(0.013, 0.009, 0.006);',
      '  gl_FragColor = vec4(col, 1.0);',
      '}'
    ].join('\n')
  };

  /* ---------- luminous ribbon material ---------- */
  // R2 T8 (a): `tinted` compiles in a per-vertex color path (FIBER_TINT —
  // attribute aTint replaces uColor as the base) used ONLY by the children
  // fiber batches, whose merged geometry bakes a deep-green → phosphor →
  // gold-white ramp per fiber. Band ribbons never pass it: without the
  // define the preprocessor strips every added line, so their compiled
  // shader is functionally identical to pre-T8 — band-era pixels unchanged.
  // ygg-hinge (R3 prune spec): `pruneG` compiles a second optional path
  // (PRUNE_GRAMMAR) used ONLY by flag-on prune forks + the spine's split
  // flare. Same preprocessor discipline as FIBER_TINT: without the define
  // every added line is stripped, so flag-off shaders compile byte-identical.
  function ribbonMaterial(color, tinted, pruneG) {
    // the defines key is only PRESENT for tinted materials — an explicit
    // `defines: undefined` makes THREE.Material warn (new console noise)
    var params = {
      uniforms: {
        uGrow: { value: 0 },
        uBurn: { value: 0 },
        uTime: { value: 0 },
        uAlpha: { value: 1 },
        uTipGain: { value: 0 },
        uJunc: { value: 0 },
        uColor: { value: new T.Color(color || 0x79ffa2) },
        uMatte: { value: new T.Vector4(0, 0, 0, 0) },
        uRes2: { value: new T.Vector2(1, 1) }
      },
      vertexShader: [
        'varying vec2 vUv; varying vec3 vN;',
        '#ifdef FIBER_TINT',
        'attribute vec3 aTint; varying vec3 vTint;',
        '#endif',
        '#ifdef PRUNE_GRAMMAR',
        'uniform vec4 uPr;', // x mode (2 warn, 3 dissolve, 5 gone/restore) · y front|visibleK · z flash · w pulse
        '#endif',
        'void main(){ vUv = uv; vN = normalize(normalMatrix * normal);',
        '#ifdef FIBER_TINT',
        '  vTint = aTint;',
        '#endif',
        '#ifdef PRUNE_GRAMMAR',
        // R3 phase 2: points inside the dissolve band fragment — they drift
        // off the branch axis (along the normal, hashed per point) as the
        // front passes. Pure f(uniforms) — no state, seeks land clean.
        '  vec3 pP = position;',
        '  if (uPr.x > 2.5 && uPr.x < 3.5 && uv.x > uPr.y - 0.08 && uv.x < uPr.y + 0.08) {',
        '    float prB = clamp((uv.x - (uPr.y - 0.08)) / 0.16, 0.0, 1.0);',
        '    float prH = fract(sin(uv.x * 127.1 + uv.y * 311.7) * 43758.5453);',
        '    pP += normal * (prB * 0.10 * (0.3 + 0.7 * prH));',
        '  }',
        '  gl_Position = projectionMatrix * modelViewMatrix * vec4(pP, 1.0); }',
        '#else',
        '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        '#endif'
      ].join('\n'),
      fragmentShader: [
        'varying vec2 vUv; varying vec3 vN;',
        '#ifdef FIBER_TINT',
        'varying vec3 vTint;',
        '#endif',
        'uniform float uGrow, uBurn, uTime, uAlpha, uTipGain, uJunc;',
        'uniform vec3 uColor; uniform vec4 uMatte; uniform vec2 uRes2;',
        '#ifdef PRUNE_GRAMMAR',
        'uniform vec4 uPr;',   // x mode · y front|visibleK · z flash · w pulse
        'uniform vec2 uFlare;', // x split s on this ribbon · y flare amp
        '#endif',
        '#ifdef FRONT_HEAT',
        'uniform float uFront, uHeatK;', // wavefront position on this fiber's own s · heat amplitude
        '#endif',
        'void main(){',
        '  if (vUv.x > uGrow) discard;',
        '  float n = fract(sin(vUv.x * 91.7 + vUv.y * 7.3) * 43758.5453);',
        '  if (uBurn > 0.05 && n < uBurn * 1.25 - 0.25) discard;',
        '#ifdef PRUNE_GRAMMAR',
        // gone/restore (mode 5): the dissolved fork is annihilated the same
        // way uBurn annihilates (noise discard), then re-materializes
        // granularly as visibleK rises through the ROOT relight — the R3
        // restore, in the file's own discard idiom.
        '  if (uPr.x > 4.5 && n >= uPr.y) discard;',
        // dissolve (mode 3): ahead of the front the branch is already erased
        '  if (uPr.x > 2.5 && uPr.x < 3.5 && vUv.x > uPr.y + 0.08) discard;',
        '#endif',
        '  float fr = pow(1.0 - abs(dot(vN, vec3(0.0, 0.0, 1.0))), 1.5);',
        '  vec3 base = mix(uColor, vec3(1.0, 0.42, 0.12), uBurn);',
        '#ifdef FIBER_TINT',
        '  base = mix(vTint, vec3(1.0, 0.42, 0.12), uBurn);',
        '#endif',
        '  float flow = 0.72 + 0.28 * sin(vUv.x * 34.0 - uTime * 2.8);',
        '  float head = smoothstep(uGrow - 0.05, uGrow, vUv.x);',
        '  float core = pow(1.0 - fr, 3.0);',
        '  vec3 c = base * (0.24 + 0.40 * fr) * flow + vec3(0.92, 1.0, 0.95) * core * 0.5 + (base + vec3(0.6)) * head * mix(0.9, 0.22, uJunc);',
        '  c *= 1.0 + uJunc * 2.2 * (1.0 - smoothstep(0.02, 0.55, vUv.x));', // growth is lit from its root
        '  c *= 1.0 + uTipGain * smoothstep(0.50, 0.63, vUv.x) * (1.0 - smoothstep(0.63, 0.95, vUv.x));',
        '#ifdef FRONT_HEAT',
        // R2's wavefront heat: a hot band (toward 0xFFF0C4) rides the morph
        // front along each fiber — the prototype's tamed ×1.30 peak.
        '  float fh = exp(-pow((vUv.x - uFront) / 0.168, 2.0)) * uHeatK;',
        '  c = mix(c, vec3(1.0, 0.941, 0.769), fh * 0.25);',
        '  c *= 1.0 + fh * 0.30;',
        '#endif',
        '  vec2 sc = gl_FragCoord.xy / uRes2;',
        '  if (sc.x > uMatte.x && sc.x < uMatte.z && (1.0 - sc.y) > uMatte.y && (1.0 - sc.y) < uMatte.w) { c *= 0.35; }',
        '#ifdef PRUNE_GRAMMAR',
        // R3 phases 1–2 color grammar. Warning: whole branch flashes toward
        // hot white 0xFFEECC while a brief 0xFF3300 pulse travels split→tip.
        // Dissolve: the fragment band desaturates to 0xCCCCBB (the light
        // going out), breaks into dashes, and fades; the intact root side
        // dims to 0.7. The split flare briefly brightens the parent locally.
        '  float prA = 1.0;',
        '  if (uPr.x > 1.5 && uPr.x < 2.5) {',
        '    c = mix(c, vec3(1.0, 0.933, 0.8), uPr.z * 0.85);',
        '    float prPd = exp(-pow((vUv.x - uPr.w) / 0.07, 2.0)) * (uPr.w < 1.0 ? 1.0 : 0.35);',
        '    c = mix(c, vec3(1.0, 0.2, 0.0), prPd);',
        '    c *= 1.0 + 0.8 * uPr.z;',
        '  } else if (uPr.x > 2.5 && uPr.x < 3.5) {',
        '    if (vUv.x > uPr.y - 0.08) {',
        '      float prBK = clamp((vUv.x - (uPr.y - 0.08)) / 0.16, 0.0, 1.0);',
        '      prA = 1.0 - prBK;',
        '      if (fract(vUv.x * 32.0) > 0.5) prA *= 0.25;',
        '      c = mix(c, vec3(0.8, 0.8, 0.733), prBK);',
        '    } else {',
        '      prA = 0.7;',
        '    }',
        '  }',
        '  c *= 1.0 + 2.0 * uFlare.y * exp(-pow((vUv.x - uFlare.x) / 0.03, 2.0));',
        '  gl_FragColor = vec4(c * uAlpha * prA, (0.85 - 0.3 * fr) * uAlpha * prA);',
        '#else',
        '  gl_FragColor = vec4(c * uAlpha, (0.85 - 0.3 * fr) * uAlpha);',
        '#endif',
        '}'
      ].join('\n'),
      transparent: true,
      blending: T.AdditiveBlending,
      depthWrite: false
    };
    if (tinted) params.defines = { FIBER_TINT: 1 };
    if (tinted && window.YggHinge && window.YggHinge.enabled() >= 2) {
      // ygg-hinge level 2: the recipe's wavefront HEAT on the strand batches
      // — a moving hot band where the morph front passes (R2's
      // wavefrontGlowBoost, the prototype's tamed values). Level ≤1 and
      // flag-off compile without it, byte-identical.
      params.defines.FRONT_HEAT = 1;
      params.uniforms.uFront = { value: -1 };
      params.uniforms.uHeatK = { value: 0 };
    }
    if (pruneG) {
      // flag-on prune forks + the spine's flare host only; never at flag-off
      params.defines = { PRUNE_GRAMMAR: 1 };
      params.uniforms.uPr = { value: new T.Vector4(0, 1, 0, -1) };
      params.uniforms.uFlare = { value: new T.Vector2(0, 0) };
    }
    return new T.ShaderMaterial(params);
  }

  function softSpriteTex(inner, outer) {
    var cv = document.createElement('canvas'); cv.width = cv.height = 64;
    var cx = cv.getContext('2d');
    var g = cx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, inner); g.addColorStop(0.4, outer); g.addColorStop(1, 'rgba(0,0,0,0)');
    cx.fillStyle = g; cx.fillRect(0, 0, 64, 64);
    return new T.CanvasTexture(cv);
  }
  function smokeTex(seed) {
    var cv = document.createElement('canvas'); cv.width = cv.height = 128;
    var cx = cv.getContext('2d'), rnd = U.mulberry32(seed);
    var g = cx.createRadialGradient(64, 64, 6, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,0.85)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.32)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    cx.fillStyle = g; cx.fillRect(0, 0, 128, 128);
    // billow holes for a torn, cloudy edge
    cx.globalCompositeOperation = 'destination-out';
    for (var i = 0; i < 26; i++) {
      var hx = 12 + rnd() * 104, hy = 12 + rnd() * 104, hr = 4 + rnd() * 18;
      var hg = cx.createRadialGradient(hx, hy, 0, hx, hy, hr);
      hg.addColorStop(0, 'rgba(0,0,0,' + (0.25 + rnd() * 0.45) + ')');
      hg.addColorStop(1, 'rgba(0,0,0,0)');
      cx.fillStyle = hg;
      cx.beginPath(); cx.arc(hx, hy, hr, 0, 6.29); cx.fill();
    }
    return new T.CanvasTexture(cv);
  }
  // dark limb silhouettes — the fine-twig grammar of the crown (2D per the
  // mixed-media law: branches are material, not light)
  function branchTex(seed) {
    var cv = document.createElement('canvas'); cv.width = 256; cv.height = 256;
    var cx = cv.getContext('2d'), rnd = U.mulberry32(seed);
    cx.strokeStyle = 'rgba(7,15,11,0.92)';
    cx.lineCap = 'round';
    cx.shadowColor = 'rgba(7,15,11,0.85)'; cx.shadowBlur = 3;
    function limb(x, y, ang, len, w, depth) {
      if (depth <= 0 || len < 6) return;
      var x2 = x + Math.cos(ang) * len, y2 = y - Math.sin(ang) * len;
      cx.lineWidth = Math.max(0.7, w);
      cx.beginPath(); cx.moveTo(x, y);
      cx.quadraticCurveTo(
        x + Math.cos(ang + (rnd() - 0.5) * 0.8) * len * 0.55,
        y - Math.sin(ang + (rnd() - 0.5) * 0.8) * len * 0.55, x2, y2);
      cx.stroke();
      var n = 2 + Math.floor(rnd() * 2);
      for (var k = 0; k < n; k++) {
        limb(x2, y2, ang + (rnd() - 0.5) * 1.5, len * (0.52 + rnd() * 0.26), w * 0.55, depth - 1);
      }
    }
    limb(128, 250, Math.PI / 2 + (rnd() - 0.5) * 0.5, 62 + rnd() * 24, 8.5, 5);
    return new T.CanvasTexture(cv);
  }
  // R2 T8: per-pixel glow texture for every NEW additive layer of this pass
  // (core scales, trunk rims, molten pool). Repo law (CLAUDE.md / THE
  // BRIDGE realms.js getGlowTex): GL textures are never built from Canvas2D
  // gradients — Safari dithers them — so this writes ImageData per pixel:
  // two-stop color lerp (inner at the center → outer at the edge),
  // falloff-shaped alpha, and a ±0.5 LSB hash dither so 8-bit quantization
  // cannot band on large soft sprites. inner/outer are [r,g,b,a] in 0-255.
  function pixelGlowTex(size, inner, outer, falloff) {
    var cv = document.createElement('canvas'); cv.width = cv.height = size;
    var cx = cv.getContext('2d');
    var img = cx.createImageData(size, size), d = img.data;
    var half = (size - 1) / 2, p = 0, x, y;
    for (y = 0; y < size; y++) {
      for (x = 0; x < size; x++) {
        var nx = (x - half) / half, ny = (y - half) / half;
        var dist = Math.sqrt(nx * nx + ny * ny);
        var k = dist >= 1 ? 0 : Math.pow(1 - dist, falloff);
        var mixK = 1 - k;
        var dth = U.hash01(x * 131 + y * 197) - 0.5;
        d[p] = inner[0] + (outer[0] - inner[0]) * mixK + dth;
        d[p + 1] = inner[1] + (outer[1] - inner[1]) * mixK + dth;
        d[p + 2] = inner[2] + (outer[2] - inner[2]) * mixK + dth;
        d[p + 3] = inner[3] * k + outer[3] * (1 - k) + dth;
        p += 4;
      }
    }
    cx.putImageData(img, 0, 0);
    return new T.CanvasTexture(cv);
  }

  /* ---------- R2 T7: band<->tree unified fiber morph — shared helpers ----------
     A fiber mesh stays parented exactly where the band already lives (`lineGroup`
     or a sibling group, both children of `turnPivot` at local position -G — see
     `buildTimeline`/`buildTree`). Render chain: world = G + Rz(turnPivot.rot)·(P-G).
     At rotation 0 (band pose) P must equal the band-era WORLD point directly — no
     transform needed, curves are already authored in world coordinates. At
     rotation +90° (tree pose) P must equal G + Rz(-90°)·(worldTreePoint - G) so
     that turnPivot's own existing +90° sweep lands it at the correct upright
     point — i.e. a Q-space point (G-relative, "upright", exactly the convention
     `riser` already uses for its live-rotated children) baked ONCE through the
     inverse rotation instead of living under a second, independently-rotating
     group. Rz(-90°)·(x,y,z) = (y,-x,z) (THREE's right-handed CCW-about-+z Euler). */
  function smoothstep01(x) { x = x < 0 ? 0 : (x > 1 ? 1 : x); return x * x * (3 - 2 * x); }
  // R2 T7 rephase (director's amendment): m(t) is no longer the pivot's own
  // progress clamp — it's a phased formation ENVELOPE: a weighted chain of
  // smoothstep segments staged against measured music onsets (the per-role
  // anchor tables live in buildTree, `this.morphEnv`). Still a pure function
  // of t — no state, monotone, C1-smooth (every segment starts and ends at
  // zero slope, so chained segments join without velocity pops). Exact 0
  // before the first segment opens; the saturation snap returns exact 1 once
  // every segment is saturated — float-sum drift across the weights must not
  // leave m at 0.999…, or the endpoint position writes would never be
  // bit-idempotent against the baked treePos.
  function morphEnvelope(t, segs) {
    var m = 0, sat = true, s, sg, x;
    for (s = 0; s < segs.length; s++) {
      sg = segs[s];
      x = (t - sg.t0) / (sg.t1 - sg.t0);
      if (x < 1) sat = false;
      m += sg.w * smoothstep01(x);
    }
    return sat ? 1 : m;
  }
  function bakeUpright(rawPosArray, G) {
    var out = new Float32Array(rawPosArray.length);
    /* ygg-hinge (wiring.md, upright-bake law): under ?hinge≥1 the geometry
       NEVER rotates — turnPivot holds 0 — so the tree-era pose must stand
       upright in WORLD space already, and this bake drops its compensating
       Rz(-90°): out = G + raw. Flag-off keeps the pivot-space bake verbatim
       (and flag-off's pivot-end pose equals the hinge pose exactly:
       G + Rz(+90°)·Rz(-90°)·raw = G + raw — the settle/credo frames are
       identical between flags by construction). */
    var hingeUp = window.YggHinge && window.YggHinge.enabled() >= 1;
    for (var k = 0; k < rawPosArray.length; k += 3) {
      if (hingeUp) {
        out[k] = G.x + rawPosArray[k];
        out[k + 1] = G.y + rawPosArray[k + 1];
        out[k + 2] = G.z + rawPosArray[k + 2];
      } else {
        out[k] = G.x + rawPosArray[k + 1];
        out[k + 1] = G.y - rawPosArray[k];
        out[k + 2] = G.z + rawPosArray[k + 2];
      }
    }
    return out;
  }
  // the spine's tree-era destiny: both roots, meeting at G — reuses the exact
  // point formula the old (now-retired) separate `rootRibbons` used, just
  // concatenated tip-to-tip through G instead of built as two meshes.
  function rootsAndTrunkQ() {
    var pts = [], q2;
    for (q2 = 6; q2 >= 1; q2--) {
      pts.push(new T.Vector3(-q2 * 0.42, -0.05 * q2 - Math.sin(q2 * 1.2) * 0.06, Math.sin(q2 * 0.8 + 0) * 0.35));
    }
    pts.push(new T.Vector3(0, 0, 0));
    for (q2 = 1; q2 <= 6; q2++) {
      pts.push(new T.Vector3(q2 * 0.42, -0.05 * q2 - Math.sin(q2 * 1.2) * 0.06, Math.sin(q2 * 0.8 + 1) * 0.35));
    }
    return pts;
  }
  // a cast branch's tree-era destiny: that limb's own straight main stem (core
  // climb to its exit height, then out along the limb direction) — the same
  // cq/arc exit-phase math the per-fiber helix below uses, without the spiral,
  // so it reads as the thickest/central thread of its limb's bundle.
  function limbMainQ(limbIdx, trunkH, EXQ, LIMBS) {
    var limb = LIMBS[limbIdx], exitH = trunkH * EXQ[limbIdx];
    var lateral = (limbIdx - 3) * 0.02; // spreads the 7 parents' core-climb apart a little — deterministic, not rnd, avoids 7 coincident base lines
    var pts = [], j3, hh, cq3, arc3;
    for (j3 = 0; j3 <= 5; j3++) { hh = j3 / 5; pts.push(new T.Vector3(lateral * hh, hh * exitH, 0)); }
    for (j3 = 1; j3 <= 6; j3++) {
      cq3 = j3 / 6; arc3 = Math.sin(cq3 * Math.PI * 0.5);
      pts.push(new T.Vector3(lateral + limb.dir.x * limb.len * cq3, exitH + limb.dir.y * limb.len * cq3 + arc3 * 0.22 - cq3 * cq3 * 0.30, limb.dir.z * limb.len * cq3));
    }
    return pts;
  }

  /* ═══════════════════ WORLD ═══════════════════ */
  function World(canvas, cues) {
    this.C = cues;
    var renderer = this.renderer = new T.WebGLRenderer({ canvas: canvas, preserveDrawingBuffer: true, antialias: false, powerPreference: 'high-performance' });
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.98;

    var scene = this.scene = new T.Scene();
    scene.background = new T.Color(0x0d0906);
    scene.fog = new T.FogExp2(0x0d0906, 0.05);

    this.rig = new T.Group();
    this.camera = new T.PerspectiveCamera(42, 1, 0.1, 120);
    this.camera.position.set(0, 0, 9.4);
    this.rig.add(this.camera);
    scene.add(this.rig);

    this.amb = new T.AmbientLight(0x342216, 0.85); scene.add(this.amb);
    this.key = new T.PointLight(0xE8A850, 1.6, 60, 1.6); this.key.position.set(-4, 5, 4); scene.add(this.key);
    this.greenL = new T.PointLight(0x79ffa2, 0.0, 50, 1.7); this.greenL.position.set(0, -0.6, -3.2); scene.add(this.greenL);

    // ---- dust motes ----
    var dustN = 1200, dp = new Float32Array(dustN * 3), dphase = new Float32Array(dustN);
    var rnd = U.mulberry32(505);
    for (var i = 0; i < dustN; i++) {
      dp[i * 3] = (rnd() - 0.5) * 22;
      dp[i * 3 + 1] = (rnd() - 0.5) * 13;
      dp[i * 3 + 2] = -1 - rnd() * 9;
      dphase[i] = rnd() * 6.28;
    }
    var dg = new T.BufferGeometry();
    dg.setAttribute('position', new T.BufferAttribute(dp, 3));
    this.dustPhase = dphase;
    this.dust = new T.Points(dg, new T.PointsMaterial({
      map: softSpriteTex('rgba(255,240,210,0.9)', 'rgba(230,190,120,0.25)'),
      color: 0xE8CFA0, size: 0.055, sizeAttenuation: true,
      transparent: true, opacity: 0.5, depthWrite: false, blending: T.AdditiveBlending
    }));
    scene.add(this.dust);

    // ---- light shafts (archive room) ----
    this.shafts = new T.Group();
    var shaftTex = (function () {
      var cv = document.createElement('canvas'); cv.width = 128; cv.height = 256;
      var cx = cv.getContext('2d');
      var g = cx.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, 'rgba(255,214,150,0.28)'); g.addColorStop(1, 'rgba(255,214,150,0)');
      cx.fillStyle = g;
      cx.beginPath(); cx.moveTo(50, 0); cx.lineTo(78, 0); cx.lineTo(118, 256); cx.lineTo(10, 256); cx.closePath(); cx.fill();
      return new T.CanvasTexture(cv);
    })();
    for (i = 0; i < 3; i++) {
      var sm = new T.Mesh(new T.PlaneGeometry(2.1, 9),
        new T.MeshBasicMaterial({ map: shaftTex, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide }));
      sm.position.set(-3.5 + i * 3.4, 2.4, -4.5 - i * 0.8);
      sm.rotation.z = -0.14 + i * 0.06;
      this.shafts.add(sm);
    }
    scene.add(this.shafts);

    // ---- far archive silhouettes (dark shapes only — never shiny) ----
    var farG = this.farGroup = new T.Group();
    rnd = U.mulberry32(88);
    var boxMat = new T.MeshStandardMaterial({ color: 0x1c1108, roughness: 0.96, metalness: 0.02 });
    for (i = 0; i < 14; i++) {
      var bw = 0.8 + rnd() * 1.8, bh = 0.5 + rnd() * 2.6;
      var bx = new T.Mesh(new T.BoxGeometry(bw, bh, 0.8), boxMat);
      bx.position.set((rnd() - 0.5) * 24, -3.2 + bh / 2, -8.5 - rnd() * 5);
      farG.add(bx);
    }
    scene.add(farG);

    this.buildTimeline();
    this.buildTree();
    this.buildScenery();
    this.buildBursts();

    /* ── THE ASSET SUBSTITUTION (?ygg=1) ──────────────────────────────────
       The recipes' own 32-thread system BECOMES the timeline and the tree.
       The band ribbons, the 318 fibers and the whole tree dressing above are
       switched off in update() — they are built (cheap, once) but never
       rendered, so the fallback path stays byte-for-byte the code it was.
       The threads braid around the SAME spine curve and leave on the SAME
       fork curves, so the cards, the matte and the exhibit tags all still
       land on the frame they were composed for. */
    this.ygg = null;
    if (window.YggThreads && window.YggHinge && window.YggHinge.enabled() >= 3) {
      this.ygg = window.YggThreads.create(scene, this.G, this.ribbons[0].curve, this.forkDefs, cues);
      this.cosmos = (window.YggCosmos) ? window.YggCosmos.create(scene, this.camera, cues) : null;
    }

    // ---- title layer ----
    this.compTex = null;
    this.uiScene = new T.Scene();
    this.uiCam = new T.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0, 2);
    this.uiMat = new T.MeshBasicMaterial({ transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
    var uiQuad = new T.Mesh(new T.PlaneGeometry(1, 1), this.uiMat);
    uiQuad.position.z = -1;
    this.uiScene.add(uiQuad);

    // ---- composer ----
    var composer = this.composer = new T.EffectComposer(renderer);
    composer.addPass(new T.RenderPass(scene, this.camera));
    var uiPass = new T.RenderPass(this.uiScene, this.uiCam);
    uiPass.clear = false; uiPass.clearDepth = true;
    composer.addPass(uiPass);
    this.bloom = new T.UnrealBloomPass(new T.Vector2(1, 1), 0.5, 0.55, 0.78);
    composer.addPass(this.bloom);
    composer.addPass(new T.OutputPass());
    this.grade = new T.ShaderPass(GradeShader);
    composer.addPass(this.grade);

    var nd = new Uint8Array(128 * 128 * 4), seed = 1234567;
    for (i = 0; i < nd.length; i++) { seed = (seed * 16807) % 2147483647; nd[i] = seed % 255; }
    var ntex = new T.DataTexture(nd, 128, 128, T.RGBAFormat);
    ntex.wrapS = ntex.wrapT = T.RepeatWrapping;
    ntex.magFilter = ntex.minFilter = T.LinearFilter;
    ntex.needsUpdate = true;
    this.grade.uniforms.uNoise.value = ntex;
  }

  /* ---------- the timeline band ---------- */
  World.prototype.buildTimeline = function () {
    var C = this.C, rnd = U.mulberry32(1607);
    // ygg-hinge: flag-on gives prune forks the PRUNE_GRAMMAR material and
    // the spine the flare-host variant; flag-off builds byte-identical.
    var hingeB = window.YggHinge && window.YggHinge.enabled() >= 1;
    this.ribbons = [];
    this.forkFlashes = [];
    this.castTips = [];
    this.forkDefs = [];
    var group = this.lineGroup = new T.Group();
    this.scene.add(group);

    function curveFrom(pts) { return new T.CatmullRomCurve3(pts.map(function (p) { return new T.Vector3(p[0], p[1], p[2]); })); }

    var sp = [], n = 9;
    for (var i = 0; i <= n; i++) {
      sp.push([-10 + (20 * i) / n, -1.35 + Math.sin(i * 1.1) * 0.22 + (rnd() - 0.5) * 0.15, -3.2 - Math.sin(i * 0.7) * 1.1]);
    }
    // kept: forks anchor to this SAME curve object (getPointAt/getTangentAt)
    // so a departure starts exactly on the drawn, jittered+smoothed band —
    // not on the analytic sine formula the control points were built from.
    var spineCurve = curveFrom(sp);
    this.addRibbon(spineCurve, 0.085, C.wmStart + 0.15, 2.6, 0, 'spine', hingeB);

    var self = this;
    function fork(t0, ux, dir, lane, len, pruneT, tagIdx, materialize) {
      var anchor = spineCurve.getPointAt(ux), tan = spineCurve.getTangentAt(ux);
      var x0 = anchor.x, y0 = anchor.y, z0 = anchor.z;
      // a real departure: hug the drawn band along its own tangent for
      // ~0.35 world units, THEN leave at a visible angle and KEEP diverging
      var ty = y0 + dir * (1.35 + lane * 1.0);
      var divPts = [], m = 7;
      for (var j = 0; j <= m; j++) {
        var p = j / m;
        var s = Math.pow(p, 0.72);
        divPts.push([
          x0 + p * len * 13,
          U.lerp(y0, ty, s) + (rnd() - 0.5) * 0.07,
          z0 + dir * p * 1.9 + (rnd() - 0.5) * 0.4
        ]);
      }
      // materialize=false (R2 T4, doc1/doc2's retirement): this call still
      // has to happen, and in this exact position in the call order, purely
      // to consume its 16 rnd() draws (2 per divPts iteration above) — every
      // fork() called AFTER this one (the 7 crew forks) reads from the same
      // shared stream, and skipping the call outright would shift their
      // jitter, silently re-folding geometry Task 3 already verified
      // fold-free and bit-stable. Nothing below this line touches rnd(), so
      // returning here is enough: no mesh, no scene-add, no ribbons-list
      // entry, no per-frame cost, and no forkFlashes/castTips entry either.
      if (materialize === false) return;
      // the hug distance is 0.35 world units UNLESS this fork is short
      // enough (small len) that 0.35 would overshoot its own first
      // divergence step (divPts[1]) in x — the axis the fork always
      // advances along. An overshoot forces the CatmullRom spline to
      // reverse x direction between the hug point and divPts[1], folding
      // the curve back on itself right at the base (review finding: all
      // 7 crew forks, len=0.11, fold this way). When the hug would land
      // at 90%+ of that first step, shorten it to land at half the step
      // instead of past it.
      var hugDist = 0.35;
      var firstStepX = (1 / m) * len * 13;
      if (tan.x * hugDist >= 0.9 * firstStepX) hugDist = 0.5 * firstStepX / tan.x;
      var pts = [
        [x0, y0, z0],
        [x0 + tan.x * hugDist, y0 + tan.y * hugDist, z0 + tan.z * hugDist]
      ].concat(divPts.slice(1));
      var brMesh = self.addRibbon(curveFrom(pts), 0.028, t0, 1.5, pruneT || 0, 'branch', hingeB && pruneT > 0);
      brMesh.material.uniforms.uJunc.value = 1;
      // where this fork leaves the spine, in the spine's own u — the split
      // flare (R3 phase 3) brightens the parent there. Inert bookkeeping,
      // castIdx precedent: zero rnd() calls, zero draw-order change.
      self.ribbons[self.ribbons.length - 1].splitU = ux;
      self.forkFlashes.push({ x: x0, y: y0, z: z0, t0: t0 });
      // ygg-threads: the deviation's own record — the thread system needs the
      // fork's drawn curve (so a thread can LEAVE the braid exactly where the
      // film's fork always left it, keeping every card lane and tag anchor).
      // Pure bookkeeping, zero rnd() calls, zero draw-order change.
      self.forkDefs.push({
        idx: self.forkDefs.length, ux: ux, t0: t0, dir: dir,
        curve: curveFrom(pts), prune: pruneT || 0, tagIdx: tagIdx
      });
      // R2 T7: tag the 7 CAST branches (tagIdx set only for those, never for
      // cold-open/crew) on their own ribbon record — the unified fiber system
      // needs to find exactly these 7 later (they ARE the 7 braid parents,
      // numeral identity continuity) without guessing at array indices. Pure
      // bookkeeping, zero rnd() calls, zero draw-order change.
      if (tagIdx !== undefined) self.ribbons[self.ribbons.length - 1].castIdx = tagIdx;
      if (tagIdx !== undefined) {
        // where this variant's evidence tag pins: the tip for up-branches,
        // ~70% along for down-branches (their tips can leave the frame).
        // `prune` rides along so main.js's tag driver (Task 4) can key each
        // tag's death to its OWN branch's prune moment instead of a shared
        // stand-in constant — single source of truth, no duplicated schedule.
        var ap = dir > 0 ? divPts[m] : divPts[5];
        self.castTips.push({ x: ap[0], y: ap[1], z: ap[2], dir: dir, prune: pruneT || 0 });
      }
    }
    fork(C.wmStart + 6.2, 0.30, -1, 0, 0.34, 0);
    fork(C.wmStart + 9.5, 0.52, 1, 0, 0.30, 0);
    var castDir = [-1, 1, -1, 1, -1, 1, -1];
    // prune-per-scene (R2 T4): each cast branch prunes as its own scene
    // exits, not clustered at the doctrine window. Branches 0-4 prune
    // shortly after the NEXT card takes over (+0.3 stagger); the last two
    // (WRITER, TEACHER) have no "next card" to hand off to, so they carry
    // the last wave on the doctrine-era hits instead. The three prune-hit
    // times themselves (C.prunes) are measured music onsets — immovable.
    var castPruneT = [
      C.cast[1] + 0.3, C.cast[2] + 0.3, C.cast[3] + 0.3, C.cast[4] + 0.3, C.cast[5] + 0.3,
      C.prunes[0], C.prunes[1]
    ];
    for (i = 0; i < C.cast.length; i++) {
      fork(C.cast[i] + 0.1, 0.16 + i * 0.075, castDir[i], 1 + (i % 3) * 0.7, 0.26 + 0.05 * (i % 2),
           castPruneT[i], i);
    }
    // doc1/doc2 (R2 T4 controller ruling, World A): these two were only ever
    // the doctrine CARD's visual accompaniment — an anonymous "extra branch,
    // pruned" illustration for the "one branch per person" rule. With that
    // card gone and prune-per-scene making every death a NAMED deviation's
    // scene-exit, keeping them would mean 9 visible prunes against a
    // transcript that says "Seven" — the exact count mismatch this round
    // exists to kill. materialize=false: the calls stay (same position, same
    // args) purely to consume their share of the shared rnd() stream in the
    // same order as before, so the 7 crew forks after them are bit-identical
    // to pre-this-change — see the comment on `fork` itself.
    fork(C.doctrine + 0.45, 0.58, 1, 1.6, 0.22, C.prunes[1], undefined, false);
    fork(C.doctrine + 2.6, 0.40, -1, 1.6, 0.20, C.prunes[2], undefined, false);
    for (i = 0; i < C.crew.length; i++) fork(C.crew[i] + 0.2, 0.20 + (i * 0.09) % 0.62, i % 2 ? 1 : -1, 0.35, 0.11, 0);

    this.pulses = [];
    var pulseTex = softSpriteTex('rgba(235,255,242,1)', 'rgba(121,255,162,0.4)');
    for (i = 0; i < 3; i++) {
      var s2 = new T.Sprite(new T.SpriteMaterial({ map: pulseTex, transparent: true, opacity: 0.9, depthWrite: false, blending: T.AdditiveBlending }));
      s2.scale.set(0.34, 0.34, 1);
      this.lineGroup.add(s2);
      this.pulses.push(s2);
    }
    // fork-node flashes: a spark where a life splits off
    this.flashPool = [];
    for (i = 0; i < this.forkFlashes.length; i++) {
      var f = new T.Sprite(new T.SpriteMaterial({ map: pulseTex, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending }));
      f.position.set(this.forkFlashes[i].x, this.forkFlashes[i].y, this.forkFlashes[i].z);
      f.scale.set(0.5, 0.5, 1);
      this.lineGroup.add(f);
      this.flashPool.push({ sprite: f, t0: this.forkFlashes[i].t0 });
    }
    if (hingeB) {
      /* ygg-hinge, R3 phase 3: the split-point spark flare — one shared rig
         of splitFlareCount radial spark lines, repositioned to whichever
         prune is snapping right now (gaps between prune times ≫ the 0.05 s
         flare; the later flare wins — artifact precedent). HDR color so the
         sparks bloom. Built flag-on only: zero flag-off scene delta. */
      var PRb = window.YggHinge.PRUNE;
      var fPos = new Float32Array(PRb.splitFlareCount * 6);
      var fGeo = new T.BufferGeometry();
      fGeo.setAttribute('position', new T.BufferAttribute(fPos, 3));
      var fMat = new T.LineBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending });
      fMat.color.setRGB(2.2, 2.05, 1.47); // 0xFFEEAA × 2.2
      var fSeg = new T.LineSegments(fGeo, fMat);
      fSeg.frustumCulled = false;
      fSeg.visible = false;
      this.lineGroup.add(fSeg);
      this.pruneFlare = { seg: fSeg, geo: fGeo, mat: fMat, pos: fPos, n: PRb.splitFlareCount };
    }
  };
  World.prototype.addRibbon = function (curve, radius, t0, dur, pruneT, kind, pruneG) {
    var geo = new T.TubeGeometry(curve, 64, radius, 7, false);
    var mat = ribbonMaterial(0x79ffa2, false, pruneG);
    var mesh = new T.Mesh(geo, mat);
    this.lineGroup.add(mesh);
    this.ribbons.push({ mesh: mesh, mat: mat, curve: curve, t0: t0, dur: dur, prune: pruneT, kind: kind, emberDone: false });
    return mesh;
  };

  /* ---------- Yggdrasil: seized, braided, held ----------
     The S2-finale plate grammar: a BACKLIT world. Big luminous fields sit
     BEHIND the tree; smoke and twigs read as dark silhouettes in front of
     them. The trunk is ~120 hair-fine fibers held as ONE braided column
     (white-gold where densest); limbs leave that one column as bundles. */
  World.prototype.buildTree = function () {
    var C = this.C, rnd = U.mulberry32(9101);
    var G = this.G = new T.Vector3(0, -1.35, -3.2);   // the gather point — on the old band
    this.treeGroup = new T.Group();
    this.scene.add(this.treeGroup);
    // the riser — everything that stands up with the trunk. Born LYING
    // along the band (+x, the old time axis), it pivots upright at the
    // rise: the timeline was the tree seen sideways. Children are in
    // G-local coordinates; G itself is the pivot, invariant either way.
    this.riser = new T.Group();
    this.riser.position.copy(G);
    this.riser.rotation.z = -Math.PI / 2;
    this.treeGroup.add(this.riser);
    var i, j;

    // R2 T7 — band<->tree unified fiber morph. ONE population (the spine, the
    // 7 cast branches, and ~120 fray children) instead of the old two-population
    // cascade/braid dissolve: every fiber owns a same-topology bandGeo/treeGeo
    // pair and its mesh's position attribute is a per-fiber CPU lerp between
    // them (World.prototype.update), driven by a phased formation envelope
    // that LEADS the pivot and completes in the finale (per-fiber staggered;
    // see morphEnv below — the director's amendment: the zoom-out + spin is
    // the REVEAL of formation already in progress, never its trigger). The
    // 90° pivot itself is still ONE rigid rotation (turnPivot, unchanged) —
    // see the shared-helpers comment above for the coordinate-frame derivation.
    this.turnPivot = new T.Group();
    this.turnPivot.position.copy(G);
    this.scene.add(this.turnPivot);
    this.scene.remove(this.lineGroup);
    this.lineGroup.position.set(-G.x, -G.y, -G.z);
    this.turnPivot.add(this.lineGroup);
    this.fiberGroup = new T.Group();
    this.fiberGroup.position.set(-G.x, -G.y, -G.z);
    this.turnPivot.add(this.fiberGroup);

    // Phase B's LIMBS/EXQ/trunkH are needed by BOTH the parent-fiber tree
    // shapes (below) and the children batches — established here, ahead of
    // where they used to live, so both can use them. Deterministic (hash01,
    // not rnd()) — relocating this costs nothing against the shared rnd stream.
    var LIMBDEF = [[-2.00, 0.36, -0.3], [-1.32, 0.72, 0.25], [-0.62, 1.00, -0.2],
                   [0.04, 1.10, 0.15], [0.70, 0.98, 0.3], [1.36, 0.70, -0.25], [2.00, 0.36, 0.2]];
    var LIMBS = [];
    for (i = 0; i < LIMBDEF.length; i++) {
      LIMBS.push({
        dir: new T.Vector3(LIMBDEF[i][0], LIMBDEF[i][1], LIMBDEF[i][2]).normalize(),
        len: 2.2 + U.hash01(i * 3.1) * 1.2
      });
    }
    var H = 3.1, TRUNK = 0.72;
    this.trunkH = H * TRUNK;
    var EXQ = [0.55, 0.74, 0.92, 1.0, 0.90, 0.72, 0.53];

    // the unified fiber system draws its OWN randomness (build+stagger), kept
    // fully separate from `rnd` (the shared mulberry32(9101) stream the
    // dressing below still reads verbatim) — the old cascade+braid code used
    // to consume ~3300 rnd() draws from that SAME stream before the dressing
    // ever ran; deleting it without an exact (fragile, easy to miscount)
    // replay would have silently re-rolled every flecks/nebula/trunkMass/
    // branches/blossoms draw anyway, so a clean separate stream was judged
    // safer than a brittle manual count — see task-7-report.md Phase 0.8.
    var frnd = U.mulberry32(9450);
    // R2 T7 rephase (director's amendment): formation LEADS the pivot and
    // completes in the finale — these per-role envelopes replace the old
    // "morph == pivot clamp" coupling. Staged against measured onsets from
    // assets/beats.json (onsets immovable). Endpoints that ARE measured
    // beats: 107.160 (C.preTurn), 118.793 (onset + low-hit), 123.774
    // (C.settleStart), 124.912, 125.481; the others (110.919 = turn+0.45,
    // 117.000, 117.300, 118.600, 118.900) are chosen hold/breath points
    // 0.10–0.45s off their nearest beat — staging judgment, not measurements:
    //   C.preTurn 107.160 — the refill ("every deviation back on screen in
    //     time for the ROOT event") and the formation are the SAME event: the
    //     branches come back already bending. The surge phase carries the
    //     children/cast to ~.40/.35 by the ROOT hit — already forming, partly
    //     off-frame (the lying tree's down-fanning limbs crop below the
    //     dossier framing; the crop is intent).
    //   C.turn+0.45 = 110.919 — the surge lands just past the eruption; the
    //     reveal phase carries formation through the zoom-out + 90° pivot
    //     (NOT to completion — pivot-end ≈ .87/.90/.72).
    //   117.0/117.3 — into wm2 (117.133) and the −11.2dB peak (117.77) the
    //     envelope HOLDS at .90/.93 (spine still closing): limbs formed for
    //     the 118.5 bar (numerals lit 116.4–118.3, unchanged), completion
    //     deliberately unfinished — the finale owns the last tenth.
    //   118.793 (onset + low-hit) — the finale tail begins; completion sweeps
    //     root→limb→fiber across the 123.774 (C.settleStart) / 124.912 /
    //     125.481 hits, the last riding the region's loudest peak (−10.1dB at
    //     125.52) — fully settled before the stillness (128.789).
    var ENV = this.morphEnv = {
      spine: [{ t0: C.turn + 0.45, t1: C.turn + 8.131, w: 0.95 },    // 110.919 → 118.600
              { t0: C.turn + 8.431, t1: C.turn + 13.305, w: 0.05 }], // 118.900 → 123.774
      cast:  [{ t0: C.preTurn, t1: C.turn + 0.45, w: 0.36 },         // 107.160 → 110.919
              { t0: C.turn + 0.45, t1: C.turn + 6.531, w: 0.57 },    // 110.919 → 117.000
              { t0: C.turn + 8.324, t1: C.turn + 14.443, w: 0.07 }], // 118.793 → 124.912
      child: [{ t0: C.preTurn, t1: C.turn + 0.45, w: 0.42 },         // 107.160 → 110.919
              { t0: C.turn + 0.45, t1: C.turn + 6.831, w: 0.48 },    // 110.919 → 117.300
              { t0: C.turn + 8.324, t1: C.turn + 15.012, w: 0.10 }]  // 118.793 → 125.481
    };
    // the children's group-level visibility gate opens with the envelope (each
    // batch's own uGrow t0 keeps individual meshes hidden until they sprout)
    this.fiberVis0 = C.preTurn - 0.5;

    // ---- the 8 fiber PARENTS: spine (-> both roots through G) + the 7 cast
    // branches (-> that limb's own main stem, numeral identity continuity).
    // Their band-era mesh/geometry/material are the EXISTING ones buildTimeline
    // already created (zero duplication — a second mesh coexisting with the
    // original during band-era would be the doubling the brief forbids); we
    // only snapshot their current positions and bake a tree-era destiny. ----
    var PARENT_TUB = 64, PARENT_RAD_SEG = 7; // == addRibbon's own fixed topology, so bandPos/treePos align 1:1
    function bakeParentTree(qPts, radius) {
      var curve = new T.CatmullRomCurve3(qPts);
      var geo = new T.TubeGeometry(curve, PARENT_TUB, radius, PARENT_RAD_SEG, false);
      var out = bakeUpright(geo.attributes.position.array, G);
      geo.dispose();
      return out;
    }
    var spineRb = this.ribbons[0];
    spineRb.isFiberParent = true;
    spineRb.bandPos = spineRb.mesh.geometry.attributes.position.array.slice();
    spineRb.treePos = bakeParentTree(rootsAndTrunkQ(), 0.045); // R2 T8b AMENDED substance law: 0.06 -> 0.045 — the root rope's WIDTH now comes from the wrap cohort's strands, never from one capsule (the gamma-lift QA showed the 0.075 thickening reading as a smooth rod)
    spineRb.stagger = (frnd() - 0.5) * 0.8;
    spineRb.lastM = -1;
    spineRb.env = ENV.spine; // the LAST to let go: holds the band's identity until just past the ROOT hit, completes on C.settleStart
    // R2 T8 (a): each parent's hue turns tree-ward exactly as it morphs —
    // update() lerps uColor bandColor->treeColor by that fiber's own mVal,
    // written unconditionally (exact band green at mVal=0, same stranding-
    // family law as uTipGain). The spine becomes the ROOTS over the molten
    // pool, so its tree hue warms toward yellow-green; the seven limb main
    // stems go a lighter, faintly gilded phosphor.
    spineRb.bandColor = new T.Color(0x79ffa2);
    spineRb.treeColor = new T.Color(0xB8E27E);
    for (i = 0; i < LIMBS.length; i++) {
      var castRb = this.ribbons[3 + i];
      castRb.isFiberParent = true;
      castRb.bandPos = castRb.mesh.geometry.attributes.position.array.slice();
      castRb.treePos = bakeParentTree(limbMainQ(i, this.trunkH, EXQ, LIMBS), 0.024); // R2 T8b AMENDED substance law: 0.035 -> 0.024 — the parent is ONE STRAND of its limb's knit bundle; thickness = bundle width, capsule geometry never visible as such
      castRb.stagger = (frnd() - 0.5) * 0.8;
      castRb.lastM = -1;
      castRb.env = ENV.cast;
      castRb.bandColor = new T.Color(0x79ffa2);
      castRb.treeColor = new T.Color(0x8FF2A6);
    }

    // The light-fields — the luminous sky BEHIND everything (backlit grammar).
    // Farther from camera than smoke/fibers, so all of it silhouettes.
    var lfTex = softSpriteTex('rgba(255,255,255,0.95)', 'rgba(255,255,255,0.30)');
    this.lightFields = [];
    var LFD = [
      [G.x - 0.3, G.y + 1.5, G.z - 5.5,  6.5, 9.0, 0.85, 'braid'], // behind the trunk core (R2 T8b 16b: 0.75 -> 0.85)
      [G.x - 2.6, G.y + 4.1, G.z - 6.5,  8.5, 5.5, 0.95, 'crown'], // upper-left pale patch (R2 T8b 16b: 0.85 -> 0.95 — the dome's pale glow)
      [G.x + 2.9, G.y + 2.6, G.z - 6.8,  7.0, 4.6, 0.72, 'crown'], // right-mid patch (R2 T8b 16b: 0.55 -> 0.72)
      [G.x - 1.3, G.y - 0.3, G.z - 5.0,  8.5, 4.2, 0.60, 'braid'], // the under-pool (R2 T8 e: 0.50 -> 0.60, brightening toward the plate's molten pool)
      [G.x,       G.y + 1.4, G.z - 8.0, 24.0, 14.0, 0.35, 'crown'] // whole-sky wash (R2 T8b 16b: 0.30 -> 0.35)
    ];
    for (i = 0; i < LFD.length; i++) {
      var lfm = new T.SpriteMaterial({ map: lfTex, color: 0xC8F49A, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, fog: false });
      var lfs = new T.Sprite(lfm);
      lfs.position.set(LFD[i][0], LFD[i][1], LFD[i][2]);
      lfs.scale.set(LFD[i][3], LFD[i][4], 1);
      this.treeGroup.add(lfs);
      this.lightFields.push({ sprite: lfs, max: LFD[i][5], key: LFD[i][6] });
    }

    // Phase B — the braid: ~120 hair-fine CHILDREN in merged batches (10x12,
    // unchanged shape from before), each one fiber of the unified population —
    // its band-era shape hugs the SAME cast branch its tree-era shape belongs
    // to (fi%7, identity continuity all the way down, not just at the 7-parent
    // level), and it "appears" via uGrow along the band era — already the fray
    // grammar. The tree-era helix/limb-exit formula is kept VERBATIM from the
    // old braidRibbons (the approved tree look); only the mechanism around it
    // changed. (Fibers/tips/limbs live in G-local "Q" coords, matching riser's
    // own convention, then baked upright via bakeUpright for storage.)
    this.fiberBatches = [];
    this.fiberTips = [];
    var CHILD_TUB = 20, CHILD_RAD_SEG = 4;
    var NBATCH = 10, PERB = 12;
    // R2 T8 (a): per-vertex fiber tint stops (deep green -> phosphor ->
    // gold-white; the gold batches amber -> gilded white). Built through
    // T.Color so the aTint attribute carries the same color-managed values
    // a uColor of the same hex would.
    var TINT_G = [new T.Color(0x1E5A34), new T.Color(0x79ffa2), new T.Color(0xF6EEC6)];
    var TINT_AU = [new T.Color(0xA07830), new T.Color(0xE8C46A), new T.Color(0xFFF0C8)];
    for (var b = 0; b < NBATCH; b++) {
      var gold = b >= 8; // two batches of thinner gold threads woven through — unchanged split
      var mPos = [], mNorm = [], mUv = [], mIdx = [], mTint = [], mBase = 0;
      var bandPosArr = [], treePosArr = [], fiberMeta = [];
      for (i = 0; i < PERB; i++) {
        var fi = b * PERB + i;
        var limbIdx = fi % LIMBS.length;
        var parentRb = this.ribbons[3 + limbIdx];
        var limb = LIMBS[limbIdx];

        // -- tree-era Q points: the old per-fiber helix + limb-exit, with
        // R2 T8 (a)'s weave coherence on top: phase FAMILIES by limb (7
        // families at 2pi/7 spacing, jitter confined to the family's own
        // sector) and turns tightened 1.4-3.1 -> 2.1±0.25, so the trunk
        // reads as a braid of seven named strand-cohorts winding together
        // instead of uncorrelated noise. RNG DISCIPLINE: the two frnd()
        // draws KEEP their exact slots in the stream (values transformed
        // AFTER drawing) — every subsequent draw (exitH, jitters, the
        // band-era child shapes, staggers) is bit-identical to pre-T8.
        var phaseDraw = frnd();
        var rad = 0.08 + frnd() * 0.34;
        var turnsDraw = frnd();
        var phase = (limbIdx / 7) * Math.PI * 2 + (phaseDraw - 0.5) * (Math.PI * 2 / 7) * 0.9;
        var turns = 2.1 + (turnsDraw - 0.5) * 0.5;
        var exitH = this.trunkH * EXQ[limbIdx] * (0.94 + frnd() * 0.14);
        var jx = (frnd() - 0.5) * 0.34, jy = (frnd() - 0.5) * 0.22, jz = (frnd() - 0.5) * 0.3;
        var pts2 = [], top = null;
        for (j = 0; j <= 12; j++) {
          var q = j / 12;
          if (q < 0.62) {
            var qq = q / 0.62;
            var ang = phase + qq * turns * Math.PI * 2;
            var r2 = rad * (0.13 + 0.87 * Math.sin(Math.min(1, qq * 1.06) * Math.PI));
            pts2.push(new T.Vector3(Math.cos(ang) * r2, qq * exitH, Math.sin(ang) * r2 * 0.8));
          } else {
            var cq = (q - 0.62) / 0.38;
            if (!top) top = pts2[pts2.length - 1];
            var arc = Math.sin(cq * Math.PI * 0.5);
            pts2.push(new T.Vector3(
              top.x + limb.dir.x * limb.len * cq + jx * arc,
              top.y + limb.dir.y * limb.len * cq + arc * 0.22 - cq * cq * 0.30 + jy * arc,
              top.z + limb.dir.z * limb.len * cq + jz * arc
            ));
          }
        }
        this.fiberTips.push(pts2[12]); // riser-local Q — exactly what blossoms expects
        var treeRadius = gold ? 0.005 : 0.006 + frnd() * 0.006;
        var treeGeo = new T.TubeGeometry(new T.CatmullRomCurve3(pts2), CHILD_TUB, treeRadius, CHILD_RAD_SEG, false);
        var treeRaw = bakeUpright(treeGeo.attributes.position.array, G);

        // -- band-era shape: a jittered resample of a random sub-range of
        // THIS fiber's own parent curve, offset a little to its side — "a
        // fray-child path hugging its parent," not coincident with it --
        var pu0 = frnd() * 0.55, pu1 = pu0 + 0.20 + frnd() * 0.20;
        var pSide = frnd() < 0.5 ? -1 : 1;
        var pOff = 0.05 + frnd() * 0.10;
        var bandRadius = 0.010 + frnd() * 0.008;
        var bPts = [], pu, pp, ptan, perp;
        for (j = 0; j <= 8; j++) {
          pu = U.clamp(U.lerp(pu0, pu1, j / 8), 0, 1);
          pp = parentRb.curve.getPointAt(pu);
          ptan = parentRb.curve.getTangentAt(pu);
          perp = new T.Vector3(-ptan.y, ptan.x, 0).normalize().multiplyScalar(pSide * pOff);
          bPts.push(new T.Vector3(
            pp.x + perp.x + (frnd() - 0.5) * 0.05,
            pp.y + perp.y + (frnd() - 0.5) * 0.05,
            pp.z + (frnd() - 0.5) * 0.06
          ));
        }
        var bandGeo = new T.TubeGeometry(new T.CatmullRomCurve3(bPts), CHILD_TUB, bandRadius, CHILD_RAD_SEG, false);
        var bArr = bandGeo.attributes.position.array;

        var vStart = mBase * 3;
        for (j = 0; j < bArr.length; j++) { bandPosArr.push(bArr[j]); treePosArr.push(treeRaw[j]); mPos.push(bArr[j]); }
        var na = bandGeo.attributes.normal.array, ua = bandGeo.attributes.uv.array, ia = bandGeo.index.array;
        for (j = 0; j < na.length; j++) mNorm.push(na[j]);
        for (j = 0; j < ua.length; j++) mUv.push(ua[j]);
        for (j = 0; j < ia.length; j++) mIdx.push(ia[j] + mBase);
        // R2 T8 (a): per-vertex color ramp — deep green at the strand's
        // low/outer reaches, phosphor through the middle, lifting toward
        // gold-white where it runs high and near the braid's heart (small
        // helix radius, coreK -> 1). Deterministic from rad/gold already
        // drawn — zero stream draws; and because the ramp is baked INTO
        // the morphing strand, the richness is the formation's own.
        var stops = gold ? TINT_AU : TINT_G;
        var coreK = 1 - U.clamp((rad - 0.08) / 0.34, 0, 1);
        var tc = new T.Color();
        for (j = 0; j <= CHILD_TUB; j++) {
          var tu = j / CHILD_TUB;
          tc.copy(stops[0]).lerp(stops[1], smoothstep01(tu * 1.5 + coreK * 0.25));
          tc.lerp(stops[2], Math.pow(tu, 1.8) * (0.25 + 0.6 * coreK));
          for (var tv = 0; tv <= CHILD_RAD_SEG; tv++) mTint.push(tc.r, tc.g, tc.b);
        }
        // stagger ±0.9s (rephase; parents keep ±0.4): 120 hair-fine strands
        // across a ~19s envelope need organic spread — ±0.4 reads mechanical
        // at this length. Same single frnd() draw, so the stream is unmoved.
        fiberMeta.push({ vStart: vStart, vEnd: vStart + bArr.length, stagger: (frnd() - 0.5) * 1.8, lastM: -1 });
        mBase += bandGeo.attributes.position.count;
        bandGeo.dispose(); treeGeo.dispose();
      }
      var bg = new T.BufferGeometry();
      bg.setAttribute('position', new T.Float32BufferAttribute(mPos, 3));
      bg.setAttribute('normal', new T.Float32BufferAttribute(mNorm, 3));
      bg.setAttribute('uv', new T.Float32BufferAttribute(mUv, 2));
      bg.setAttribute('aTint', new T.Float32BufferAttribute(mTint, 3));
      bg.setIndex(mIdx);
      var mat2 = ribbonMaterial(gold ? 0xE8C46A : 0x79ffa2, true);
      mat2.uniforms.uJunc.value = 1; // starts root-lit like a fray child; crossfades to uTipGain as it becomes a limb fiber (update())
      var mesh2 = new T.Mesh(bg, mat2);
      this.fiberGroup.add(mesh2);
      // batch-level growth timing (rephase): the fray sprouts across the
      // preTurn tick train (107.16/.71/108.26/.82/109.37 — the "machine
      // loses control" run-up), all 120 strands present before the ROOT hit
      // — they fray off the RELIGHTING branches and are already lifting as
      // they appear. This is the one mechanical adjustment the envelope
      // demands outside m(t) itself: the fray must exist in the late band
      // era to BE the visible formation onset.
      this.fiberBatches.push({
        mesh: mesh2, mat: mat2, gold: gold,
        // R2 T8b (16): per-batch tree-era alpha — the strands must CARRY the
        // silhouette now, so the green children lift 0.26 -> 0.30 (gold 0.34
        // kept); the new limb/trunk/root cohorts below set their own.
        aTree: gold ? 0.34 : 0.30,
        t0: C.preTurn + (b / NBATCH) * 1.8, dur: 0.7,
        bandPos: new Float32Array(bandPosArr), treePos: new Float32Array(treePosArr),
        fibers: fiberMeta
      });
    }

    // gold flecks — living threads drifting up inside the braid
    var FN = 150;
    this.fleckPhase = new Float32Array(FN); this.fleckRad = new Float32Array(FN);
    this.fleckSpeed = new Float32Array(FN); this.fleckAz = new Float32Array(FN);
    for (i = 0; i < FN; i++) {
      this.fleckPhase[i] = rnd(); this.fleckRad[i] = 0.05 + rnd() * 0.30;
      this.fleckSpeed[i] = 0.22 + rnd() * 0.4; this.fleckAz[i] = rnd() * 6.283;
    }
    var fgeo = new T.BufferGeometry();
    fgeo.setAttribute('position', new T.BufferAttribute(new Float32Array(FN * 3), 3));
    this.flecks = new T.Points(fgeo, new T.PointsMaterial({
      map: softSpriteTex('rgba(255,238,190,1)', 'rgba(232,196,106,0.35)'),
      color: 0xF2D488, size: 0.045, sizeAttenuation: true,
      transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, fog: false
    }));
    this.riser.add(this.flecks);

    // roots: R2 T7 retires this separate population — the spine fiber (above,
    // among the 8 parents) now morphs into both roots through G directly.

    // the white-hot heart of the braid — layered: a wide halo + a tight
    // white-gold core that peaks at the credo (brightest where densest)
    this.coreGlow = new T.Sprite(new T.SpriteMaterial({
      map: softSpriteTex('rgba(240,255,246,1)', 'rgba(150,255,190,0.35)'),
      transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending
    }));
    this.coreGlow.position.set(0, 1.35, 0);
    this.coreGlow.scale.set(1.0, 2.8, 1);
    this.riser.add(this.coreGlow);
    this.coreHot = new T.Sprite(new T.SpriteMaterial({
      map: softSpriteTex('rgba(255,252,232,1)', 'rgba(255,214,130,0.4)'),
      transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending
    }));
    this.coreHot.position.set(0, 1.15, 0.1);
    this.coreHot.scale.set(0.34, 1.9, 1);
    this.riser.add(this.coreHot);

    this.rootFlare = new T.Sprite(new T.SpriteMaterial({
      map: softSpriteTex('rgba(210,255,225,1)', 'rgba(121,255,162,0.30)'),
      transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending
    }));
    this.rootFlare.position.copy(G).add(new T.Vector3(0, 0.05, 0.05));
    this.rootFlare.scale.set(4.2, 2.4, 1);
    this.treeGroup.add(this.rootFlare);

    // crown nebula — R2 T8b (16b): the SAME billow system, ramped into ONE
    // luminous blue-teal canopy DOME (his ruling: the dark limbs sit INSIDE
    // a light mass, never the other way round — and then "NO DARK LIMB" at
    // all). The 60 mains + the 24 far billows below go additive at luminous
    // teal hues and low per-sprite targets that ACCUMULATE into the dome;
    // the burn-through gap law inverts (a luminous sprite thinning out
    // would carve a DARK channel, the opposite of what the gaps meant) —
    // gap sectors brighten a touch instead. The 14 third-layer masses stay
    // dark: they are the depth accents INSIDE the light (t36's near-black
    // clumps). Every rnd()/drnd() draw keeps its exact slot — values are
    // transformed after drawing, the sanctioned idiom.
    this.nebula = [];
    var smokes = [smokeTex(31), smokeTex(77), smokeTex(123)];
    var crownC = new T.Vector3(0, H + 0.5, 0); // riser-local
    var NCOL = [0x0E241A, 0x10301F, 0x0A1626, 0x143826, 0x071009];
    var DOMEC = [0x3E9E86, 0x4090BC, 0x2A6490, 0x54BC96, 0x38708C]; // luminous dome hues (blue-teal family, feel-7/8; v2 dial — v1 read near-black)
    for (i = 0; i < 60; i++) {
      var azn = rnd() * Math.PI * 2;
      var rn = 1.0 + rnd() * 2.8;
      var yn = 0.35 + rnd() * 1.9 - rn * 0.28; // higher near center → dome
      var farL = i % 5 < 2;
      var gapK = Math.sin(azn * 2 + 0.8) > 0.55 ? 0.18 : 1.0;
      // v3 dial: uniform additive CLIPPED to a white cloud (v2) — the
      // plates' dome is glow WITH internal dark billow structure, so the
      // population interleaves: 2/3 luminous additive, 1/3 mid-teal normal
      // billows that cap the additive sum and give the dome its texture.
      // Same construction order, only material params differ by index.
      var domeLit = i % 3 !== 2;
      var mnt = new T.SpriteMaterial({
        map: smokes[i % 3],
        color: domeLit ? DOMEC[i % 5] : 0x14303A,
        transparent: true, opacity: 0, depthWrite: false,
        blending: domeLit ? T.AdditiveBlending : T.NormalBlending, fog: false,
        rotation: rnd() * 6.28
      });
      var sn = new T.Sprite(mnt);
      // v2 dial: the dome sits 0.5 lower (ENVELOPING the crown, not hovering
      // above it) and 1.22x bigger — position/scale are arithmetic transforms
      // of the same drawn values, zero stream impact.
      sn.position.set(
        crownC.x + Math.cos(azn) * rn * (farL ? 1.5 : 1),
        crownC.y + yn * (farL ? 1.3 : 1) - 0.5,
        farL ? -7.2 : crownC.z + Math.sin(azn) * rn * 0.7
      );
      var sc = ((farL ? 3.2 : 2.4) + rnd() * 2.8) * 1.22;
      sn.scale.set(sc, sc * (0.7 + rnd() * 0.5), 1);
      this.riser.add(sn);
      this.nebula.push({ sprite: sn, spin: (rnd() - 0.5) * 0.05, target: domeLit ? (0.26 + rnd() * 0.14) * (gapK < 1 ? 1.25 : 1) : (0.30 + rnd() * 0.16) * gapK, additive: domeLit });
    }
    // a few luminous wisps hugging the trunk
    for (i = 0; i < 7; i++) {
      var mw = new T.SpriteMaterial({
        map: smokes[i % 3], color: 0x2E7A54, // R2 T8b (16b): lifted with the dome (was 0x1E5038)
        transparent: true, opacity: 0, depthWrite: false,
        blending: T.AdditiveBlending, rotation: rnd() * 6.28
      });
      var sw = new T.Sprite(mw);
      sw.position.set((rnd() - 0.5) * 0.9, 0.6 + rnd() * 2.2, (rnd() - 0.5) * 0.6);
      var scw = 0.9 + rnd() * 1.1;
      sw.scale.set(scw, scw * 1.3, 1);
      this.riser.add(sw);
      this.nebula.push({ sprite: sw, spin: (rnd() - 0.5) * 0.08, target: 0.22 + rnd() * 0.15, additive: true });
    }
    // the trunk's BODY — dark billowing mass the braid glows through
    // (the plate's tree is a dark object; the light lives inside and behind it)
    this.trunkMass = [];
    for (i = 0; i < 13; i++) {
      var tq = i / 12;
      var tm = new T.SpriteMaterial({
        map: smokes[i % 3], color: i % 4 === 0 ? 0x0C1E15 : 0x081209,
        transparent: true, opacity: 0, depthWrite: false, rotation: rnd() * 6.28
      });
      var ts = new T.Sprite(tm);
      ts.position.set(
        (rnd() - 0.5) * (0.22 + tq * 0.5),
        0.15 + tq * (this.trunkH + 0.4),
        (i % 2 ? 0.42 : -0.5)
      );
      var tsc = 0.55 + tq * 0.85 + rnd() * 0.3;
      ts.scale.set(tsc, tsc * (1.15 + rnd() * 0.4), 1);
      this.riser.add(ts);
      // every third billow thins out — the gaps where the braid burns through
      this.trunkMass.push({ sprite: ts, spin: (rnd() - 0.5) * 0.04, target: (0.50 + rnd() * 0.25) * (i % 3 === 1 ? 0.45 : 1) });
    }

    // limb ARMS — dark branching silhouettes laid along each fiber bundle,
    // so the limbs carry mass and the fibers read as their luminous veins
    this.branches = [];
    var bTex = [branchTex(11), branchTex(47), branchTex(83)];
    for (i = 0; i < LIMBS.length; i++) {
      var arm = LIMBS[i];
      var armY = this.trunkH * EXQ[i] * 0.97; // riser-local
      var armRot = -Math.atan2(arm.dir.x, arm.dir.y); // texture grows +y; tilt to the limb
      for (j = 0; j < 2; j++) {
        var af = j === 0 ? 0.45 : 0.85;
        var am = new T.SpriteMaterial({
          map: bTex[(i + j) % 3], transparent: true, opacity: 0,
          depthWrite: false, rotation: armRot + (rnd() - 0.5) * 0.35
        });
        var asp = new T.Sprite(am);
        asp.position.set(
          arm.dir.x * arm.len * af,
          armY + arm.dir.y * arm.len * af - 0.1,
          arm.dir.z * arm.len * af * 0.6
        );
        var asc = (j === 0 ? 2.0 : 2.8) + rnd() * 0.6;
        asp.scale.set(asc, asc, 1);
        this.riser.add(asp);
        this.branches.push({ sprite: asp, target: 0.62 + rnd() * 0.18, spin: (rnd() - 0.5) * 0.012 });
      }
    }
    // a few free twigs filling the canopy between the arms
    for (i = 0; i < 5; i++) {
      var bm2 = new T.SpriteMaterial({
        map: bTex[i % 3], transparent: true, opacity: 0,
        depthWrite: false, rotation: (rnd() - 0.5) * 1.1
      });
      var bsp = new T.Sprite(bm2);
      var baz = (i / 5) * Math.PI * 2 + rnd() * 0.5;
      bsp.position.set(
        crownC.x + Math.cos(baz) * (0.8 + rnd() * 2.2),
        crownC.y + 0.3 + rnd() * 1.4,
        crownC.z + Math.sin(baz) * 0.9
      );
      var bsc2 = 2.2 + rnd() * 1.6;
      bsp.scale.set(bsc2, bsc2, 1);
      this.riser.add(bsp);
      this.branches.push({ sprite: bsp, target: 0.50 + rnd() * 0.25, spin: (rnd() - 0.5) * 0.02 });
    }
    // root tangle — the same silhouettes flipped under the bright pool
    for (i = 0; i < 2; i++) {
      var rm2 = new T.SpriteMaterial({
        map: bTex[i], transparent: true, opacity: 0,
        depthWrite: false, rotation: Math.PI + (rnd() - 0.5) * 0.7
      });
      var rsp = new T.Sprite(rm2);
      rsp.position.set(G.x + (i === 0 ? -0.5 : 0.55), G.y - 0.38, G.z + 0.25);
      rsp.scale.set(1.6 + rnd() * 0.4, 1.05, 1);
      this.treeGroup.add(rsp);
      this.branches.push({ sprite: rsp, target: 0.55, spin: 0 });
    }
    // big foreground occluders drifting at the frame edges — never the center
    this.occluders = [];
    var OCP = [[-5.6, 1.7, -0.9], [5.8, 1.4, -0.9], [-6.3, -2.6, -1.1]];
    for (i = 0; i < OCP.length; i++) {
      var om = new T.SpriteMaterial({
        map: smokes[i % 3], color: 0x040906,
        transparent: true, opacity: 0, depthWrite: false, rotation: rnd() * 6.28
      });
      var osp = new T.Sprite(om);
      osp.position.set(OCP[i][0], OCP[i][1], OCP[i][2]);
      var osc = 5.5 + rnd() * 2.5;
      osp.scale.set(osc, osc * 0.8, 1);
      this.treeGroup.add(osp);
      this.occluders.push({ sprite: osp, drift: 0.05 + rnd() * 0.05, x0: OCP[i][0], y0: OCP[i][1] });
    }

    // blossoms — ignite at the stillness, clustered on the limb ends
    this.blossoms = [];
    var blTexP = softSpriteTex('rgba(255,220,240,1)', 'rgba(232,160,200,0.4)');
    var blTexV = softSpriteTex('rgba(228,214,255,1)', 'rgba(179,155,232,0.4)');
    for (i = 0; i < 46; i++) {
      var tip = this.fiberTips[(i * 7) % this.fiberTips.length];
      var bm = new T.SpriteMaterial({
        map: i % 2 ? blTexP : blTexV,
        transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending
      });
      var bs = new T.Sprite(bm);
      bs.position.copy(tip).add(new T.Vector3((rnd() - 0.5) * 0.5, (rnd() - 0.5) * 0.4, (rnd() - 0.5) * 0.4));
      var bsc = 0.05 + rnd() * 0.06;
      bs.scale.set(bsc, bsc, 1);
      this.riser.add(bs);
      this.blossoms.push({ sprite: bs, phase: rnd() * 6.28, order: rnd() });
    }

    // the deviation numerals — seven in, seven out: each limb wears the
    // number of the branch it carries on, lit where it leaves the trunk.
    // Cream, the file's own ink — red stays reserved for the stamps.
    // R2 T8 (d): baked at 2x (192x128 canvas, 68px), with a slight ember
    // glow — an amber shadow pass UNDER the crisp fill (amber is the lamp/
    // spark family; the ink itself stays cream, red stays the stamps').
    // shadowBlur is a Canvas2D blur, not a gradient — same precedent as
    // branchTex above; no GL-gradient-texture law involved.
    function bakeNum(cv, n) {
      var nx = cv.getContext('2d');
      nx.clearRect(0, 0, cv.width, cv.height);
      nx.font = '700 68px "Courier Prime", monospace';
      nx.textAlign = 'center'; nx.textBaseline = 'middle';
      // R2 T8b: the limbs behind these are luminous strand bundles now — a
      // soft ink-void under-plate keeps the cream ink legible against light
      // (the sprite's blending flips additive→normal for the same reason:
      // additive can only brighten, ink on light must be able to darken).
      // v5: the glyph-shaped shadow alone smudged away over the bright
      // bundles — a soft elliptical ink-void KNOT goes under it (arc +
      // shadowBlur, a blur not a gradient — branchTex precedent), reading
      // as a dark depth accent in the light with the file's cream ink on it.
      nx.save();
      nx.translate(96, 68); nx.scale(1.5, 0.95);
      nx.fillStyle = 'rgba(5,9,7,0.85)';
      nx.shadowColor = 'rgba(5,9,7,0.9)'; nx.shadowBlur = 24;
      nx.beginPath(); nx.arc(0, 0, 38, 0, 6.29); nx.fill(); nx.fill();
      nx.restore();
      nx.shadowColor = 'rgba(5,8,6,0.95)'; nx.shadowBlur = 16;
      nx.fillStyle = 'rgba(6,10,8,0.85)';
      nx.fillText('0' + n, 96, 68);
      nx.fillText('0' + n, 96, 68);
      nx.shadowColor = 'rgba(232,150,70,0.85)'; nx.shadowBlur = 14;
      nx.fillStyle = 'rgba(216,212,188,0.35)';
      nx.fillText('0' + n, 96, 68);
      nx.shadowBlur = 0; nx.shadowColor = 'rgba(0,0,0,0)';
      nx.fillStyle = 'rgba(216,212,188,0.95)';
      nx.fillText('0' + n, 96, 68);
    }
    this.bakeNum = bakeNum;
    this.limbTags = [];
    this.tagsRebaked = false; // fonts land after the world is built — rebake once at first frame
    for (i = 0; i < LIMBS.length; i++) {
      var tagCv = document.createElement('canvas'); tagCv.width = 192; tagCv.height = 128; // R2 T8 (d): 2x bake
      bakeNum(tagCv, i + 1);
      var tagM = new T.SpriteMaterial({ map: new T.CanvasTexture(tagCv), transparent: true, opacity: 0, depthWrite: false, fog: false }); // R2 T8b: normal blending (see bakeNum — ink must darken over luminous limbs)
      var tag = new T.Sprite(tagM);
      tag.position.set(LIMBS[i].dir.x * 1.05, this.trunkH * EXQ[i] * 0.97 + LIMBS[i].dir.y * 1.05 + 0.10, LIMBS[i].dir.z * 1.05); // R2 T8b: outboard 0.42 -> 1.05 — clear of the blown bundle bases, over the dome (legibility law)
      tag.scale.set(0.30, 0.20, 1); // R2 T8 (d) +30%; R2 T8b: +15% more for the normal-blend ink
      // R2 T8b Phase 6c — director's note 19, verbatim: "the numerals on
      // the tree are useless" — the tree numerals are REMOVED. The kill
      // uses the branchTex idiom: construction (and its zero stream draws)
      // stays byte-identical, the sprite is simply never shown. The
      // band-era DEVIATION card numbers (scenes.js) are a different
      // element and STAY.
      tag.visible = false;
      this.riser.add(tag);
      this.limbTags.push({ sprite: tag, cv: tagCv, n: i + 1, t0: C.turn + 5.9 + i * 0.18 });
    }

    /* ═══ R2 T8 — the DRASTIC pass. Everything below is NEW dressing on the
       FORMING tree (director's clarification: these layers dress a tree
       completing its formation — each one rides a formation ramp in
       update(): braidP2 for the trunk's core/rim/pool, nebP for the canopy
       depth, the stillness ignition for the blossom clusters — nothing pops
       in pre-formed, nothing is a separate superimposed asset). RNG
       DISCIPLINE: a DEDICATED stream (mulberry32(9820)), and every call
       sits strictly AFTER the last existing draw of the 9101 dressing
       stream (the blossom loop above) — no existing draw moves. ═══ */
    var drnd = U.mulberry32(9820);

    // (a) the painterly core, scales 3 and 4 (with coreGlow/coreHot above):
    // a wide soft halo and a tall thin white-hot seam — the plate's trunk
    // heart (t30/t36: light escaping through the braid's central channel).
    this.coreWide = new T.Sprite(new T.SpriteMaterial({
      map: pixelGlowTex(128, [214, 255, 224, 200], [110, 220, 150, 0], 2.2),
      transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending
    }));
    this.coreWide.position.set(0, 1.5, -0.25);
    this.coreWide.scale.set(2.3, 3.8, 1);
    this.riser.add(this.coreWide);
    this.coreSpire = new T.Sprite(new T.SpriteMaterial({
      map: pixelGlowTex(64, [255, 252, 230, 235], [160, 255, 190, 0], 3.2),
      transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending
    }));
    this.coreSpire.position.set(0, 1.05, 0.12);
    this.coreSpire.scale.set(0.22, 2.6, 1);
    this.riser.add(this.coreSpire);

    // (c) edge-lit rim: thin additive streaks hugging the trunk body's
    // silhouette edges (5 heights x 2 sides), leaning slightly with the
    // column. Hue follows the sky's phase palette per frame (update()).
    this.trunkRims = [];
    var rimTex = pixelGlowTex(64, [255, 255, 255, 215], [255, 255, 255, 0], 2.6);
    for (i = 0; i < 10; i++) {
      var rSide = i % 2 ? 1 : -1;
      var rq = (i >> 1) / 4;
      var rs = new T.Sprite(new T.SpriteMaterial({
        map: rimTex, color: 0x79ffa2, transparent: true, opacity: 0,
        depthWrite: false, blending: T.AdditiveBlending,
        rotation: rSide * (0.10 + drnd() * 0.10)
      }));
      rs.position.set(rSide * (0.55 + rq * 0.35 + (drnd() - 0.5) * 0.08), 0.35 + rq * (this.trunkH - 0.35), 0.06);
      rs.scale.set(0.15 + drnd() * 0.06, 0.75 + drnd() * 0.55, 1);
      this.riser.add(rs);
      this.trunkRims.push({ sprite: rs, target: 0.50 + drnd() * 0.25, phase: drnd() * 6.28 });
    }

    // (b) canopy depth 1/3 — DOUBLE the far layer: +24 billows on the same
    // generative recipe as the farL population above (z -7.2, the two
    // luminous gap sectors preserved), slight z jitter for parallax.
    // Appended to this.nebula, so the existing update loop drives them.
    for (i = 0; i < 24; i++) {
      var azn2 = drnd() * Math.PI * 2;
      var rn2 = 1.0 + drnd() * 2.8;
      var yn2 = 0.35 + drnd() * 1.9 - rn2 * 0.28;
      var gapK2 = Math.sin(azn2 * 2 + 0.8) > 0.55 ? 0.18 : 1.0;
      var domeLit2 = i % 3 !== 2; // v3: same 2/3-lit / 1/3-dark interleave as the mains
      var mnt2 = new T.SpriteMaterial({
        map: smokes[i % 3], color: domeLit2 ? DOMEC[i % 5] : 0x14303A, // R2 T8b (16b): far layer joins the luminous dome
        transparent: true, opacity: 0, depthWrite: false,
        blending: domeLit2 ? T.AdditiveBlending : T.NormalBlending, fog: false, rotation: drnd() * 6.28
      });
      var sn2 = new T.Sprite(mnt2);
      sn2.position.set(crownC.x + Math.cos(azn2) * rn2 * 1.5, crownC.y + yn2 * 1.3 - 0.5, -7.2 + (drnd() - 0.5) * 0.5); // v2: dome envelopes (y-0.5)
      var sc2b = (3.2 + drnd() * 2.8) * 1.22; // v2: 1.22x
      sn2.scale.set(sc2b, sc2b * (0.7 + drnd() * 0.5), 1);
      this.riser.add(sn2);
      this.nebula.push({ sprite: sn2, spin: (drnd() - 0.5) * 0.05, target: domeLit2 ? (0.24 + drnd() * 0.13) * (gapK2 < 1 ? 1.25 : 1) : (0.26 + drnd() * 0.14) * gapK2, additive: domeLit2 });
    }
    // (b) canopy depth 2/3 — a THIRD depth layer behind the sky patches:
    // huge dim blue-teal masses at riser z -7.5..-7.9 (world ≈ -10.7..-11.1
    // — behind every named light-field patch, in front of the whole-sky
    // wash at -11.2, so they silhouette against it). The t36 read: far pale
    // glow, mid teal billows, near-black foreground clumps.
    var DEEPCOL = [0x0C2030, 0x0A1626, 0x102A20];
    for (i = 0; i < 14; i++) {
      var az3 = drnd() * Math.PI * 2;
      var rn3 = 1.2 + drnd() * 3.4;
      // the two burn-through gap sectors stay luminous at EVERY depth —
      // same gap law as the other canopy layers, or this layer would fill
      // the very channels the backlight escapes through (first-still bug)
      var gapK3 = Math.sin(az3 * 2 + 0.8) > 0.55 ? 0.18 : 1.0;
      var m3 = new T.SpriteMaterial({
        map: smokes[i % 3], color: DEEPCOL[i % 3],
        transparent: true, opacity: 0, depthWrite: false, rotation: drnd() * 6.28
      });
      var s3 = new T.Sprite(m3);
      s3.position.set(crownC.x + Math.cos(az3) * rn3 * 1.9, crownC.y + 0.4 + drnd() * 2.6 - rn3 * 0.2, -7.5 - drnd() * 0.4);
      var sc3 = 4.5 + drnd() * 3.0;
      s3.scale.set(sc3, sc3 * (0.65 + drnd() * 0.45), 1);
      this.riser.add(s3);
      this.nebula.push({ sprite: s3, spin: (drnd() - 0.5) * 0.03, target: (0.24 + drnd() * 0.16) * gapK3, additive: false });
    }

    // (e) the molten under-pool — the plate's second light source: a wide
    // warm yellow-green wash + a gold-white heart under the roots, in
    // treeGroup coords beside rootFlare. Formation-driven in update().
    this.poolWide = new T.Sprite(new T.SpriteMaterial({
      map: pixelGlowTex(128, [255, 244, 196, 225], [105, 150, 60, 0], 2.0),
      transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending
    }));
    this.poolWide.position.copy(G).add(new T.Vector3(0, -0.28, 0.1));
    this.poolWide.scale.set(5.6, 1.7, 1);
    this.treeGroup.add(this.poolWide);
    this.poolHot = new T.Sprite(new T.SpriteMaterial({
      map: pixelGlowTex(64, [255, 250, 225, 240], [230, 210, 120, 0], 2.8),
      transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending
    }));
    this.poolHot.position.copy(G).add(new T.Vector3(0, -0.18, 0.15));
    this.poolHot.scale.set(2.5, 0.85, 1);
    this.treeGroup.add(this.poolHot);
    // (e) root tangle: +2 silhouettes (one reused sheet, one fresh seed —
    // branchTex runs its own seeded stream, zero shared-stream impact),
    // spread wider so the tangle crosses the pool like the plate's.
    // Appended to this.branches — the existing update loop drives them.
    var bTex4 = branchTex(203);
    for (i = 0; i < 2; i++) {
      var rm3 = new T.SpriteMaterial({
        map: i === 0 ? bTex[2] : bTex4, transparent: true, opacity: 0,
        depthWrite: false, rotation: Math.PI + (drnd() - 0.5) * 0.9
      });
      var rsp3 = new T.Sprite(rm3);
      rsp3.position.set(G.x + (i === 0 ? -1.05 : 1.1) + (drnd() - 0.5) * 0.3, G.y - 0.34, G.z + 0.3);
      rsp3.scale.set(1.35 + drnd() * 0.5, 0.95 + drnd() * 0.25, 1);
      this.treeGroup.add(rsp3);
      this.branches.push({ sprite: rsp3, target: 0.5 + drnd() * 0.15, spin: 0 });
    }

    // (b) blossom CLUSTERS + drift fields. The 46 existing anchors keep
    // their exact build (their rnd() draws are already spent above); each
    // gains a drift base/phase, then two satellites cluster around it with
    // wider size variance and near-anchor ignition order, so the clusters
    // light together at the stillness. Drift itself is pure f(tEff) in
    // update() — frozen during the stillness beat like the twinkle.
    var nAnchor = this.blossoms.length;
    for (i = 0; i < nAnchor; i++) {
      var b0 = this.blossoms[i];
      b0.bx = b0.sprite.position.x; b0.by = b0.sprite.position.y; b0.bz = b0.sprite.position.z;
      b0.dphA = drnd() * 6.28; b0.dphB = drnd() * 6.28; b0.amp = 0.030 + drnd() * 0.035;
    }
    for (i = 0; i < nAnchor * 2; i++) {
      var anch = this.blossoms[i % nAnchor];
      var bm3 = new T.SpriteMaterial({
        map: i % 2 ? blTexP : blTexV,
        transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending
      });
      var bs3 = new T.Sprite(bm3);
      var sat = {
        sprite: bs3, phase: drnd() * 6.28,
        order: U.clamp(anch.order * 0.75 + drnd() * 0.25, 0, 1),
        bx: anch.bx + (drnd() - 0.5) * 0.5, by: anch.by + (drnd() - 0.5) * 0.4, bz: anch.bz + (drnd() - 0.5) * 0.35,
        dphA: drnd() * 6.28, dphB: drnd() * 6.28, amp: 0.030 + drnd() * 0.045
      };
      bs3.position.set(sat.bx, sat.by, sat.bz);
      var bsc3 = 0.03 + drnd() * 0.10;
      bs3.scale.set(bsc3, bsc3, 1);
      this.riser.add(bs3);
      this.blossoms.push(sat);
    }

    /* ═══ R2 T8b (16/17) — THE TREE'S BODY BECOMES THE STRANDS.
       Director's post-T8 verdict (screening-notes Addendum 3 + the /btw
       chain, binding): the luminous strand-work must CARRY the silhouette,
       and — all-caps his — "NO DARK LIMB". Three new strand cohorts join
       the unified child population: [A] a woven fiber BUNDLE along each of
       the seven deviation limbs, [B] wide-radius trunk strands giving the
       braid real column width, [C] a root TANGLE of light fanning across
       the molten pool (replacing the dark tangle sprites). Provenance and
       formation law unchanged: each new fiber is one more child of the
       SAME parents — its band-era shape hugs its parent's drawn curve
       (the 120's own fray recipe), it sprouts on the same preTurn uGrow
       tick-train, morphs on the same child envelope with the same ±0.9s
       stagger law, and is driven by the EXISTING children loop (appended
       to this.fiberBatches). RNG: a DEDICATED stream (mulberry32(8181)),
       placed after every existing draw of every existing stream — nothing
       pre-existing moves; band-era t<preTurn pixels provably unchanged
       (uGrow ≤ 0 → invisible; fiberGroup itself hidden until preTurn−0.5). */
    var srnd = U.mulberry32(8181);
    var self8b = this;
    function strandBatch(specs, gold, t0, aTree, tipK) {
      var mPos = [], mNorm = [], mUv = [], mIdx = [], mTint = [], mBase = 0;
      var bandPosArr = [], treePosArr = [], fiberMeta = [];
      var sTc = new T.Color();
      for (var si = 0; si < specs.length; si++) {
        var spc = specs[si];
        var treeGeo = new T.TubeGeometry(new T.CatmullRomCurve3(spc.pts), CHILD_TUB, spc.radius, CHILD_RAD_SEG, false);
        var treeRaw = bakeUpright(treeGeo.attributes.position.array, G);
        // band-era: a fray child hugging its parent's drawn curve — the
        // exact recipe of the 120 (sub-range resample, sideways offset)
        var pu0 = srnd() * 0.55, pu1 = pu0 + 0.20 + srnd() * 0.20;
        var pSide = srnd() < 0.5 ? -1 : 1;
        var pOff = 0.05 + srnd() * 0.10;
        var bandRadius = 0.010 + srnd() * 0.008;
        var bPts = [], puV, ppV, ptanV, perpV, jB;
        for (jB = 0; jB <= 8; jB++) {
          puV = U.clamp(U.lerp(pu0, pu1, jB / 8), 0, 1);
          ppV = spc.parent.curve.getPointAt(puV);
          ptanV = spc.parent.curve.getTangentAt(puV);
          perpV = new T.Vector3(-ptanV.y, ptanV.x, 0).normalize().multiplyScalar(pSide * pOff);
          bPts.push(new T.Vector3(
            ppV.x + perpV.x + (srnd() - 0.5) * 0.05,
            ppV.y + perpV.y + (srnd() - 0.5) * 0.05,
            ppV.z + (srnd() - 0.5) * 0.06
          ));
        }
        var bandGeo = new T.TubeGeometry(new T.CatmullRomCurve3(bPts), CHILD_TUB, bandRadius, CHILD_RAD_SEG, false);
        var bArr = bandGeo.attributes.position.array;
        var vStart = mBase * 3;
        for (jB = 0; jB < bArr.length; jB++) { bandPosArr.push(bArr[jB]); treePosArr.push(treeRaw[jB]); mPos.push(bArr[jB]); }
        var naS = bandGeo.attributes.normal.array, uaS = bandGeo.attributes.uv.array, iaS = bandGeo.index.array;
        for (jB = 0; jB < naS.length; jB++) mNorm.push(naS[jB]);
        for (jB = 0; jB < uaS.length; jB++) mUv.push(uaS[jB]);
        for (jB = 0; jB < iaS.length; jB++) mIdx.push(iaS[jB] + mBase);
        for (jB = 0; jB <= CHILD_TUB; jB++) {
          var tuS = jB / CHILD_TUB;
          sTc.copy(spc.stops[0]).lerp(spc.stops[1], smoothstep01(tuS * 1.5 + spc.coreK * 0.25));
          sTc.lerp(spc.stops[2], Math.pow(tuS, 1.8) * (0.25 + 0.6 * spc.coreK));
          for (var tvS = 0; tvS <= CHILD_RAD_SEG; tvS++) mTint.push(sTc.r, sTc.g, sTc.b);
        }
        fiberMeta.push({ vStart: vStart, vEnd: vStart + bArr.length, stagger: (srnd() - 0.5) * 1.8, lastM: -1 });
        mBase += bandGeo.attributes.position.count;
        bandGeo.dispose(); treeGeo.dispose();
      }
      var bgS = new T.BufferGeometry();
      bgS.setAttribute('position', new T.Float32BufferAttribute(mPos, 3));
      bgS.setAttribute('normal', new T.Float32BufferAttribute(mNorm, 3));
      bgS.setAttribute('uv', new T.Float32BufferAttribute(mUv, 2));
      bgS.setAttribute('aTint', new T.Float32BufferAttribute(mTint, 3));
      bgS.setIndex(mIdx);
      var matS = ribbonMaterial(gold ? 0xE8C46A : 0x79ffa2, true);
      matS.uniforms.uJunc.value = 1; // fray-child lighting until the crossfade, like every child
      var meshS = new T.Mesh(bgS, matS);
      self8b.fiberGroup.add(meshS);
      self8b.fiberBatches.push({
        mesh: meshS, mat: matS, gold: gold, aTree: aTree, tipK: tipK,
        t0: t0, dur: 0.7,
        bandPos: new Float32Array(bandPosArr), treePos: new Float32Array(treePosArr),
        fibers: fiberMeta
      });
    }

    // [A] LIMB BUNDLES — one cohort of 14 per deviation limb: the climb
    // stays inside the limb's own phase family; the limb run WINDS around
    // the limb axis (perpendicular-basis spiral fraying wider toward the
    // tip), so every limb reads as a woven luminous bundle, not a streak.
    var TINT_LIMB = [new T.Color(0x24603A), new T.Color(0x6FE896), new T.Color(0xE8F2C2)]; // v5: deeper/greener — the bundles were saturating white
    for (i = 0; i < LIMBS.length; i++) {
      var limbA = LIMBS[i];
      var u1A = new T.Vector3().crossVectors(limbA.dir, new T.Vector3(0, 0, 1)).normalize();
      var u2A = new T.Vector3().crossVectors(limbA.dir, u1A).normalize();
      var specsA = [];
      for (j = 0; j < 14; j++) {
        var phA = (i / 7) * Math.PI * 2 + (srnd() - 0.5) * (Math.PI * 2 / 7) * 0.9;
        var radA = 0.10 + srnd() * 0.26;
        var turnsA = 2.1 + (srnd() - 0.5) * 0.5;
        var exitA = this.trunkH * EXQ[i] * (0.94 + srnd() * 0.14);
        var wPh = srnd() * 6.283, wTurns = 1.6 + srnd() * 1.6;
        var wR0 = 0.015 + srnd() * 0.02, wR1 = 0.06 + srnd() * 0.07;
        var ptsA = [], topA = null, jj, qA;
        for (jj = 0; jj <= 12; jj++) {
          qA = jj / 12;
          if (qA < 0.5) {
            var qqA = qA / 0.5;
            var angA2 = phA + qqA * turnsA * Math.PI * 2;
            var r2A = radA * (0.13 + 0.87 * Math.sin(Math.min(1, qqA * 1.06) * Math.PI));
            ptsA.push(new T.Vector3(Math.cos(angA2) * r2A, qqA * exitA, Math.sin(angA2) * r2A * 0.8));
          } else {
            var cqA = (qA - 0.5) / 0.5;
            if (!topA) topA = ptsA[ptsA.length - 1];
            var arcA = Math.sin(cqA * Math.PI * 0.5);
            var wAng = wPh + cqA * wTurns * Math.PI * 2;
            var wRad = wR0 + (wR1 - wR0) * cqA;
            ptsA.push(new T.Vector3(
              topA.x + limbA.dir.x * limbA.len * cqA + u1A.x * Math.cos(wAng) * wRad + u2A.x * Math.sin(wAng) * wRad,
              topA.y + limbA.dir.y * limbA.len * cqA + arcA * 0.22 - cqA * cqA * 0.30 + u1A.y * Math.cos(wAng) * wRad + u2A.y * Math.sin(wAng) * wRad,
              topA.z + limbA.dir.z * limbA.len * cqA + u1A.z * Math.cos(wAng) * wRad + u2A.z * Math.sin(wAng) * wRad
            ));
          }
        }
        specsA.push({ pts: ptsA, radius: 0.008 + srnd() * 0.008, parent: this.ribbons[3 + i],
          stops: TINT_LIMB, coreK: 1 - U.clamp((radA - 0.10) / 0.26, 0, 1) });
      }
      strandBatch(specsA, false, C.preTurn + ((i * 3) % 10) / 10 * 1.8, 0.33, 1.5); // v5: aTree 0.40 -> 0.33 (saturation control; hue survives)
    }

    // [B] TRUNK BRAID WIDTH — 2 batches × 12 wide-radius helices climbing
    // the full column and curling out at the top: the braid gains real
    // visual width (the plates' trunk is a WIDE woven column, not a pole).
    var TINT_TRUNK = [new T.Color(0x1E5A34), new T.Color(0x79ffa2), new T.Color(0xFFF4D6)];
    for (var b8 = 0; b8 < 2; b8++) {
      var specsB = [];
      for (j = 0; j < 12; j++) {
        var limbBi = (b8 * 12 + j) % 7;
        var phB = (limbBi / 7) * Math.PI * 2 + (srnd() - 0.5) * (Math.PI * 2 / 7) * 0.9;
        var radB = 0.30 + srnd() * 0.25;
        var turnsB = 1.9 + (srnd() - 0.5) * 0.6;
        var topH = this.trunkH * (0.88 + srnd() * 0.22);
        var curlLen = 0.5 + srnd() * 0.7;
        var ptsB = [], topB = null, qB, jjB;
        for (jjB = 0; jjB <= 12; jjB++) {
          qB = jjB / 12;
          if (qB < 0.8) {
            var qqB = qB / 0.8;
            var angB2 = phB + qqB * turnsB * Math.PI * 2;
            var rB = radB * (0.16 + 0.84 * Math.sin(Math.min(1, qqB * 1.04) * Math.PI));
            ptsB.push(new T.Vector3(Math.cos(angB2) * rB, qqB * topH, Math.sin(angB2) * rB * 0.8));
          } else {
            var cqB2 = (qB - 0.8) / 0.2;
            if (!topB) topB = ptsB[ptsB.length - 1];
            var arcB = Math.sin(cqB2 * Math.PI * 0.5);
            ptsB.push(new T.Vector3(
              topB.x + LIMBS[limbBi].dir.x * curlLen * cqB2,
              topB.y + LIMBS[limbBi].dir.y * curlLen * cqB2 + arcB * 0.10 - cqB2 * cqB2 * 0.12,
              topB.z + LIMBS[limbBi].dir.z * curlLen * cqB2
            ));
          }
        }
        specsB.push({ pts: ptsB, radius: 0.010 + srnd() * 0.008, parent: this.ribbons[0],
          stops: TINT_TRUNK, coreK: 1 - U.clamp((radB - 0.30) / 0.25, 0, 1) });
      }
      strandBatch(specsB, false, C.preTurn + (2 + b8 * 5) / 10 * 1.8, 0.28, 1.2); // FIX PASS (review defect 2, two increments): aTree 0.42 -> 0.34 -> 0.28 (named dial) — the column must not drown the credo glyphs
    }

    // [C] ROOT TANGLE OF LIGHT — 2 batches × 12: the spine's own children
    // fan from G across the molten pool as tangled lit strands (the dark
    // tangle sprites are gone — NO DARK LIMB; the light does the drawing).
    var TINT_ROOT = [new T.Color(0x2A5A30), new T.Color(0xB8E27E), new T.Color(0xF2E8B8)];
    for (b8 = 0; b8 < 2; b8++) {
      var specsC = [];
      for (j = 0; j < 12; j++) {
        var sideC = (j % 2) ? 1 : -1;
        var reachC = (0.9 + srnd() * 1.5) * sideC;
        var dipC = 0.30 + srnd() * 0.45;
        var zAmpC = 0.15 + srnd() * 0.35;
        var ph1C = srnd() * 6.283, ph2C = srnd() * 6.283;
        var wobC = 2 + srnd() * 3;
        var ptsC = [], qC, jjC;
        for (jjC = 0; jjC <= 12; jjC++) {
          qC = jjC / 12;
          ptsC.push(new T.Vector3(
            reachC * qC + Math.sin(qC * wobC + ph1C) * 0.10 * qC,
            -dipC * Math.sin(qC * Math.PI * 0.62) - 0.04 * qC,
            Math.sin(qC * (wobC * 0.8) + ph2C) * zAmpC * qC
          ));
        }
        specsC.push({ pts: ptsC, radius: 0.007 + srnd() * 0.007, parent: this.ribbons[0],
          stops: TINT_ROOT, coreK: 0.4 + srnd() * 0.4 });
      }
      strandBatch(specsC, false, C.preTurn + (1 + b8 * 6) / 10 * 1.8, 0.34, 1.4); // v5: 0.38 -> 0.34
    }

    // [D] ROPE-WRAP SKIN — R2 T8b AMENDED substance law (the fifth-/btw
    // pixel analysis, target #1): the limb PARENTS must never read as
    // capsules; every stem is a KNIT of strands. These fibers lay a tight
    // rope-twist along each parent's own tree-era stem path (limbMainQ /
    // rootsAndTrunkQ), so at any grade or zoom the stem line resolves into
    // 4–7 twisted strands — the knit read of the refs, where no solid rod
    // exists anywhere. Dedicated stream mulberry32(8282), appended after
    // every other stream's draws; same batch mechanics as everything else.
    var srnd2 = U.mulberry32(8282);
    var AXIS_Z8 = new T.Vector3(0, 0, 1);
    function wrapFiber(path, phase, wTurns, wr0, wr1) {
      var ptsW = [], nW = path.length, kW;
      for (kW = 0; kW < nW; kW++) {
        var pW = path[kW];
        var paW = path[Math.max(0, kW - 1)], pbW = path[Math.min(nW - 1, kW + 1)];
        var tanW = new T.Vector3().subVectors(pbW, paW);
        if (tanW.lengthSq() < 1e-8) tanW.set(1, 0, 0);
        tanW.normalize();
        var uW = new T.Vector3().crossVectors(tanW, AXIS_Z8);
        if (uW.lengthSq() < 1e-6) uW.set(0, 1, 0); else uW.normalize();
        var vW = new T.Vector3().crossVectors(tanW, uW).normalize();
        var sW = kW / (nW - 1);
        var aW = phase + sW * wTurns * Math.PI * 2;
        var rW = wr0 + (wr1 - wr0) * sW;
        ptsW.push(new T.Vector3(
          pW.x + (uW.x * Math.cos(aW) + vW.x * Math.sin(aW)) * rW,
          pW.y + (uW.y * Math.cos(aW) + vW.y * Math.sin(aW)) * rW,
          pW.z + (uW.z * Math.cos(aW) + vW.z * Math.sin(aW)) * rW
        ));
      }
      return ptsW;
    }
    // limb-stem wraps: 6 per limb, batched 3 limbs / 2 limbs / 2 limbs
    var wrapGroups = [[0, 1, 2], [3, 4], [5, 6]];
    for (var wg = 0; wg < wrapGroups.length; wg++) {
      var specsW = [];
      for (var wgi = 0; wgi < wrapGroups[wg].length; wgi++) {
        var limbW = wrapGroups[wg][wgi];
        var stemPath = limbMainQ(limbW, this.trunkH, EXQ, LIMBS);
        for (j = 0; j < 6; j++) {
          specsW.push({
            pts: wrapFiber(stemPath, srnd2() * 6.283, 2.5 + srnd2() * 1.8,
              0.016 + srnd2() * 0.014, 0.03 + srnd2() * 0.03),
            radius: 0.006 + srnd2() * 0.006,
            parent: this.ribbons[3 + limbW],
            stops: TINT_LIMB, coreK: 0.5 + srnd2() * 0.5
          });
        }
      }
      strandBatch(specsW, false, C.preTurn + (0.15 + wg * 0.3) * 1.8, 0.36, 1.5);
    }
    // root-rope wraps: 10 strands twisting along the spine's roots path —
    // the pool-crossing rope becomes a visible multi-strand tangle
    var rootPath = rootsAndTrunkQ();
    var specsR = [];
    for (j = 0; j < 10; j++) {
      specsR.push({
        pts: wrapFiber(rootPath, srnd2() * 6.283, 3 + srnd2() * 2.2,
          0.02 + srnd2() * 0.02, 0.035 + srnd2() * 0.035),
        radius: 0.006 + srnd2() * 0.006,
        parent: this.ribbons[0],
        stops: TINT_ROOT, coreK: 0.4 + srnd2() * 0.5
      });
    }
    strandBatch(specsR, false, C.preTurn + 0.25 * 1.8, 0.36, 1.3);

    // R2 T8b (17): NO DARK LIMB — the director's all-caps ruling. Every
    // branchTex silhouette (14 limb arms, 5 free twigs, 4 root tangles
    // incl. T8's two) leaves the tree read; the luminous strand-work now
    // draws the body. Their construction above is untouched — the shared
    // 9101/9820 stream draws keep their exact slots — only the post-draw
    // targets/visibility change (the sanctioned transform-after-draw idiom).
    for (i = 0; i < this.branches.length; i++) {
      this.branches[i].target = 0;
      this.branches[i].sprite.visible = false;
    }
    // the trunk's dark body billows demote to faint deep-teal interior
    // murk — dark ATMOSPHERE inside the light (the plates' depth reads),
    // never a dark limb form.
    for (i = 0; i < this.trunkMass.length; i++) {
      this.trunkMass[i].target *= 0.12;
      this.trunkMass[i].sprite.material.color.set(0x12302A);
    }
    this.treeGroup.visible = false;
  };

  /* ---------- scenery: soft photographic planes + bokeh, never plastic ---------- */
  World.prototype.buildScenery = function () {
    var C = this.C, rnd = U.mulberry32(414);
    this.scenery = [];
    var group = this.sceneryGroup = new T.Group();
    this.scene.add(group);

    var BOKEH_COLOR = {
      toggles: 0xFF9A40, matrix: 0xFF9A40, clock: 0x49D6C2, typewriter: 0xE05038,
      reels: 0xD8B878, drawers: 0xE0B060, dial: 0xE0B060, ledger: 0xE8C88A,
      pamphlet: 0xE06038, mosaic: 0xE0B060
    };
    var bokehTexCache = {};
    function bokehTex(color) {
      if (!bokehTexCache[color]) {
        var c = new T.Color(color);
        bokehTexCache[color] = softSpriteTex(
          'rgba(' + Math.round(c.r * 255) + ',' + Math.round(c.g * 255) + ',' + Math.round(c.b * 255) + ',0.9)',
          'rgba(' + Math.round(c.r * 255) + ',' + Math.round(c.g * 255) + ',' + Math.round(c.b * 255) + ',0.28)');
      }
      return bokehTexCache[color];
    }

    var wins = [];
    var CASTK = ['ledger', 'clock', 'dial', 'matrix', 'toggles', 'typewriter', 'drawers'];
    var CASTS = [1, 1, -1, 0, 1, -1, 0];
    for (var i = 0; i < C.cast.length; i++) {
      // R2 T4: card 7 breathes through to C.castEnd, not the old doctrine
      // boundary — its backdrop window has to match, or the 'pamphlet'
      // window below (which also starts at castEnd now) would overlap it.
      wins.push([C.cast[i], i < C.cast.length - 1 ? C.cast[i + 1] : C.castEnd, CASTK[i], CASTS[i]]);
    }
    wins.push([C.castEnd, C.crew[0], 'pamphlet', 0]);
    var CREWK = ['drawers', 'ledger', 'toggles', 'clock', 'matrix', 'reels', 'dial'];
    var CREWS = [1, -1, 1, 1, 0, -1, -1];
    for (i = 0; i < C.crew.length; i++) {
      wins.push([C.crew[i], i < C.crew.length - 1 ? C.crew[i + 1] : C.directedBy, CREWK[i], CREWS[i]]);
    }
    wins.push([C.directedBy, C.evidence, 'mosaic', 0]);

    for (i = 0; i < wins.length; i++) {
      var wd = wins[i], kind = wd[2], side = wd[3];
      var tex = new T.CanvasTexture(window.FX.Backdrops.get(kind));
      tex.colorSpace = T.SRGBColorSpace;
      var plane = new T.Mesh(
        new T.PlaneGeometry(13.5, 7.6),
        new T.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, color: 0xFFFFFF })
      );
      plane.position.set(side * 1.9, 0, -7.0);
      plane.rotation.y = -side * 0.18;
      plane.visible = false;
      group.add(plane);

      var dots = [];
      var col = BOKEH_COLOR[kind] || 0xE0B060;
      var nDots = 13;
      for (var d = 0; d < nDots; d++) {
        var sp = new T.Sprite(new T.SpriteMaterial({
          map: bokehTex(col), transparent: true, opacity: 0,
          depthWrite: false, blending: T.AdditiveBlending
        }));
        var bx = side === 0 ? (rnd() - 0.5) * 8 : side * (1.6 + rnd() * 3.4);
        sp.position.set(bx, (rnd() - 0.5) * 3.4, -3.6 - rnd() * 3.2);
        var ssc = 0.14 + rnd() * 0.42;
        sp.scale.set(ssc, ssc, 1);
        sp.visible = false;
        group.add(sp);
        dots.push({ sprite: sp, phase: rnd() * 6.28, max: 0.16 + rnd() * 0.30 });
      }
      this.scenery.push({ plane: plane, dots: dots, t0: wd[0], t1: wd[1], seed: i * 7.3, baseX: side * 1.9 });
    }
  };

  /* ---------- bursts ---------- */
  World.prototype.buildBursts = function () {
    var mkTex = softSpriteTex('rgba(255,200,140,1)', 'rgba(255,110,40,0.4)');
    this.emberPool = [];
    for (var b = 0; b < 4; b++) {
      var n = 90, pos = new Float32Array(n * 3);
      var g = new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(pos, 3));
      var m = new T.Points(g, new T.PointsMaterial({
        map: mkTex, color: 0xFF8A3C, size: 0.09, sizeAttenuation: true,
        transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending
      }));
      m.visible = false;
      this.scene.add(m);
      this.emberPool.push({ points: m, pos: pos, vel: [], born: -9, n: n, origin: new T.Vector3() });
    }
    var n2 = 420, pos2 = new Float32Array(n2 * 3);
    var g2 = new T.BufferGeometry();
    g2.setAttribute('position', new T.BufferAttribute(pos2, 3));
    this.blast = {
      points: new T.Points(g2, new T.PointsMaterial({
        map: softSpriteTex('rgba(225,255,236,1)', 'rgba(121,255,162,0.4)'),
        color: 0xA8FFC8, size: 0.11, sizeAttenuation: true,
        transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending
      })),
      pos: pos2, vel: [], n: n2
    };
    var rnd = U.mulberry32(77);
    for (var i = 0; i < n2; i++) {
      var th = rnd() * 6.283, ph = Math.acos(2 * rnd() - 1), sp = 1.6 + rnd() * 3.4;
      this.blast.vel.push([Math.sin(ph) * Math.cos(th) * sp, Math.abs(Math.cos(ph)) * sp * 1.2, Math.sin(ph) * Math.sin(th) * sp * 0.5]);
    }
    this.blast.points.visible = false;
    this.scene.add(this.blast.points);
  };

  /* ---------- per-frame ---------- */
  World.prototype.resize = function (w, h) {
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.grade.uniforms.uRes.value.set(w, h);
    this.bloom.resolution.set(w, h);
  };
  World.prototype.project = function (x, y, z, W, H) {
    var v = new T.Vector3(x, y, z).project(this.camera);
    return { x: (v.x * 0.5 + 0.5) * W, y: (0.5 - v.y * 0.5) * H, front: v.z < 1 };
  };
  World.prototype.setCompCanvas = function (canvas) {
    if (this.compTex) this.compTex.dispose();
    this.compTex = new T.CanvasTexture(canvas);
    this.compTex.colorSpace = T.SRGBColorSpace;
    this.compTex.minFilter = T.LinearFilter;
    this.compTex.magFilter = T.LinearFilter;
    this.uiMat.map = this.compTex;
    this.uiMat.needsUpdate = true;
  };

  var ZONE_LIGHT = {
    desk:  { amb: 0.9, key: 1.7, keyC: 0xE8A850, green: 0.0, fog: 0x0d0906, bloom: 0.38, shaft: 0.3, dust: 0.55 },
    dark:  { amb: 0.55, key: 1.0, keyC: 0xD09040, green: 0.25, fog: 0x0b0805, bloom: 0.45, shaft: 0, dust: 0.3 },
    alarm: { amb: 0.6, key: 1.3, keyC: 0xE06030, green: 0.1, fog: 0x160a06, bloom: 0.45, shaft: 0, dust: 0.3 },
    hush:  { amb: 0.5, key: 0.9, keyC: 0xC08A50, green: 0.2, fog: 0x0b0906, bloom: 0.42, shaft: 0, dust: 0.3 },
    grove: { amb: 0.52, key: 0.55, keyC: 0xB08850, green: 1.5, fog: 0x0B1812, bloom: 0.68, shaft: 0, dust: 0.4 }, // R2 T8 (f): bloom 0.62 -> 0.68 during the grove (the bible's sanctioned flood); the stillness override (0.72) stays above it
    void:  { amb: 0.35, key: 0.4, keyC: 0xA07840, green: 0.35, fog: 0x080605, bloom: 0.45, shaft: 0, dust: 0.25 },
    tail:  { amb: 0.5, key: 0.7, keyC: 0xC09050, green: 0.08, fog: 0x0a0806, bloom: 0.34, shaft: 0, dust: 0.25 }
  };
  World.prototype.update = function (t, dt, D, zone, matte) {
    var C = this.C, i;
    // ygg-hinge: flag level read once per frame (0 = the fallback film).
    var hingeOn = window.YggHinge && window.YggHinge.enabled() >= 1;
    var hinge2 = hingeOn && window.YggHinge.enabled() >= 2;
    // ?ygg=1 — the substitution: the recipes' threads ARE the band and the
    // tree, so the film's own band/fiber/dressing populations stay dark.
    var threadsOn = !!this.ygg;
    var mu2 = 0, mu2raw = 0, h2Front = -0.12;
    if (hinge2) {
      /* level 2 — the recipe's own morph clock: ONE eased wavefront locked
         to the orbit window (R4: camera and geometry share one mu; this
         supersedes the T7 per-role envelope AT LEVEL 2 ONLY — level 1 keeps
         the amendment's formation lead-in; that difference IS the A/B).
         Monotone, saturates at 1 — never read from the orbit pose, which
         goes inactive after the hand-back. */
      mu2raw = U.clamp((t - (C.turn + 2.9)) / ((C.wm2 + 0.3) - (C.turn + 2.9)), 0, 1);
      mu2 = window.YggHinge.easeInOutCubic(mu2raw);
      h2Front = -0.12 + mu2 * 1.36; // -w + mu·(1 + 3w), w = 0.12 (R2 verbatim)
    }

    // R2 T7 seek safety: `m(t)` for every fiber is a pure function of `t`
    // recomputed fresh every frame (a plain "did the value change" check
    // against `lastM` is therefore already seek-safe on its own — no hidden
    // state to strand). This flag is belt-and-suspenders on top of that,
    // matching the file's own seek-safety idiom elsewhere: any |Δt| bigger
    // than a real frame could ever produce (the render loop's own dt ceiling
    // is 0.05s; every torture-list seek is tens of seconds) forces one
    // unconditional rewrite pass so the intent is explicit, not just implied.
    this._fiberSeekReset = (this._lastFrameT === undefined) || Math.abs(t - this._lastFrameT) > 0.2;
    this._lastFrameT = t;
    var fadeAllNow = t > C.treeFade ? Math.max(0, 1 - (t - C.treeFade) / 1.9) : 1; // == the treeVis block's own `fadeAll` (same formula, duplicated so the ribbon loop below doesn't need treeVis's locals reordered)
    var stillNow = t > C.still && t < C.createdBy; // == the treeVis block's own `still` (same duplication rationale — the children loop now runs outside that block)

    // ── camera: deterministic — each shot owns its framing ──
    var hingePose = hingeOn ? window.YggHinge.orbitPose(t, C) : null;
    /* ygg-threads' stand-up: the tree is baked LYING DOWN under ?ygg=1, and the
       camera rolls 90° (and holds its pull-back instead of diving back in) to
       stand it up. Pure f(t), zero below LEVEL 3, so the fallback and both
       hinge levels never see it. It has to reach BOTH camera branches: the
       orbit window closes at settleStart but the move runs on to the credo. */
    var standPose = hingeOn ? window.YggHinge.standPose(t, C) : null;
    var standRoll = standPose ? standPose.roll : 0;
    var standPull = standPose ? standPose.pullZ : 0;
    if (hingePose && hingePose.active) {
      /* ygg-hinge — R4's move: geometry static, the camera does ALL the
         work. Pose blend w is 0 at both window edges (the film's own drift
         pose, computed with the verbatim flag-off math below) and 1 through
         the hold + orbit; az/el are spherical about world Y through the
         look anchor; dist is INHERITED from the film's own approved
         pull-back (≈ the spec's 14→22 — wiring.md DIST derivation); the
         look target is pinned to G whenever w = 1 (R4's anchor law) and
         glides to the film's own target at the edges; roll rides the up
         vector, sin(mu·π)·8°, zero at both edges. Every term is a pure
         function of t — the branch itself is the identity path. */
      var pfx = D.x * 30, pfy = -D.y * 22, pfz = 9.4 - (D.z - 1) * 34 + standPull;
      var lookYF = 0;
      if (t >= C.turn && t < C.sting) lookYF = 0.30 + 0.35 * U.clamp((t - C.turn) / 10, 0, 1);
      var lfx = pfx * 0.4, lfy = lookYF, lfz = -3;
      var hw = hingePose.w;
      var lx = lfx + (this.G.x - lfx) * hw;
      var ly = lfy + (this.G.y - lfy) * hw;
      var lz = lfz + (this.G.z - lfz) * hw;
      var hdx = pfx - lx, hdy = pfy - ly, hdz = pfz - lz;
      var hDist = Math.sqrt(hdx * hdx + hdy * hdy + hdz * hdz);
      var hce = Math.cos(hingePose.el);
      var hox = lx + hDist * hce * Math.sin(hingePose.az);
      var hoy = ly + hDist * Math.sin(hingePose.el);
      var hoz = lz + hDist * hce * Math.cos(hingePose.az);
      this.rig.position.set(0, 0, 0);
      this.rig.rotation.set(0, 0, 0);
      this.camera.position.set(
        pfx + (hox - pfx) * hw,
        pfy + (hoy - pfy) * hw,
        pfz + (hoz - pfz) * hw
      );
      // the orbit's own roll has already saturated to 0 by wm2+0.3, so the
      // stand-up's roll sums in cleanly across the overlap
      var rollA = hingePose.roll + standRoll;
      this.camera.up.set(Math.sin(-rollA), Math.cos(rollA), 0);
      this.camera.lookAt(lx, ly, lz);
    } else {
      if (hingeOn) {
        // identity path home when the hinge window is closed: the orbit
        // branch writes camera x/y and tilts up — restore the film's rest
        // state every frame so no seek can strand an orbit pose.
        this.camera.position.x = 0;
        this.camera.position.y = 0;
        // identity home for the roll too — but the stand-up owns `up` from the
        // morph's end onward, and this branch is what carries it through the
        // credo to the stinger. standRoll is 0 outside its own window, so this
        // stays the identity path it has always been.
        this.camera.up.set(Math.sin(-standRoll), Math.cos(standRoll), 0);
      }
      this.camera.position.z = 9.4 - (D.z - 1) * 34 + standPull;
      this.rig.position.x = D.x * 30;
      this.rig.position.y = -D.y * 22;
      this.rig.rotation.z = D.x * 0.06;
      this.rig.rotation.y = D.x * 0.05;
      var lookY = 0;
      if (t >= C.turn && t < C.sting) lookY = 0.30 + 0.35 * U.clamp((t - C.turn) / 10, 0, 1); // tilt up as the crown forms
      this.camera.lookAt(this.rig.position.x * 0.4, lookY, -3);
    }

    // ── zone lighting: deterministic prev→cur mix (seek-safe) ──
    var A0 = ZONE_LIGHT[zone.prev] || ZONE_LIGHT.desk;
    var A1 = ZONE_LIGHT[zone.name] || ZONE_LIGHT.desk;
    var mx = zone.mix;
    function LV(k) { return A0[k] + (A1[k] - A0[k]) * mx; }
    this.amb.intensity = LV('amb');
    this.key.intensity = LV('key');
    this.key.color.set(A0.keyC).lerp(new T.Color(A1.keyC), mx);
    this.greenL.intensity = LV('green');
    this.scene.fog.color.set(A0.fog).lerp(new T.Color(A1.fog), mx);
    this.scene.background = this.scene.fog.color;
    this.bloom.strength = LV('bloom');
    // R2 T8b (18): the stillness bloom override used to END as a step
    // (0.72 -> grove's 0.68) right on the createdBy beat — one more cut
    // component. It now eases across the beat and lands exactly on the
    // zone value; window closes at C.sting where the zone blend takes
    // over at the same 0.68. Pure f(t).
    if (t > C.still && t < C.sting) {
      this.bloom.strength = Math.max(this.bloom.strength, 0.72 - 0.04 * smoothstep01((t - C.createdBy) / 0.8));
    }

    // ── dust ──
    var dpos = this.dust.geometry.attributes.position.array;
    for (i = 0; i < this.dustPhase.length; i++) {
      dpos[i * 3] += Math.sin(t * 0.22 + this.dustPhase[i]) * 0.0015 + 0.0006;
      dpos[i * 3 + 1] += Math.cos(t * 0.16 + this.dustPhase[i] * 1.7) * 0.0011;
      if (dpos[i * 3] > 11) dpos[i * 3] = -11;
    }
    this.dust.geometry.attributes.position.needsUpdate = true;
    this.dust.material.opacity = LV('dust');

    // ── shafts ──
    var shaftOn = LV('shaft');
    for (i = 0; i < this.shafts.children.length; i++) {
      var sh = this.shafts.children[i];
      sh.material.opacity = shaftOn * (0.75 + 0.25 * Math.sin(t * 0.3 + i * 2.1));
      sh.rotation.z = -0.14 + i * 0.06 + Math.sin(t * 0.12 + i) * 0.02;
    }

    // ── timeline band ──
    // R2 T7: the spine + 7 cast branches ("fiber parents") persist as tree
    // limbs/roots long after the band itself is gone, so they need their OWN,
    // wider visibility window — `lineVis` alone (the old, still-correct window
    // for the 9 pure-band ribbons: 2 cold-open + 7 crew) would silently hide
    // them mid-tree-era (settle/credo/stinger) even though every one of the
    // brief's mandated stills (108.5-118.5) falls before that cutoff and would
    // never catch it — see task-7-report.md Phase 0.8 for how this was found.
    var lineVis = t >= C.wmStart - 0.5 && t < C.turn + 8.1;
    var fiberParentsVis = threadsOn ? false : (t >= C.wmStart - 0.5 && t < C.stingClear + 1);
    this.lineGroup.visible = fiberParentsVis; // superset of lineVis; each ribbon's own .visible still gates individually below
    if (hingeOn) {
      // ygg-hinge identity path: the flare rig + the spine's split-flare
      // uniform rest at zero every frame; a live flare re-arms them below.
      if (this.pruneFlare) { this.pruneFlare.mat.opacity = 0; this.pruneFlare.seg.visible = false; }
      if (this.ribbons[0].mat.uniforms.uFlare) this.ribbons[0].mat.uniforms.uFlare.value.set(0, 0);
    }
    if (fiberParentsVis) {
      for (i = 0; i < this.ribbons.length; i++) {
        var rb = this.ribbons[i];
        var rbVis = rb.isFiberParent ? fiberParentsVis : lineVis;
        if (!rbVis) { rb.mesh.visible = false; continue; }
        var grow = U.outCubic((t - rb.t0) / rb.dur);
        rb.mat.uniforms.uGrow.value = grow;
        rb.mat.uniforms.uTime.value = t;
        var alpha = 1;
        if (t >= C.evidence && rb.kind !== 'spine') {
          alpha = Math.max(0, 1 - (t - C.evidence) / 2);
          // the display refills as the machine loses control — every
          // deviation back on screen in time for the ROOT event
          if (t > C.preTurn) alpha = Math.max(alpha, 0.85 * U.clamp((t - C.preTurn) / (C.turn - C.preTurn), 0, 1));
        }
        if (t >= C.evidence && rb.kind === 'spine') {
          alpha = 0.4 + 0.1 * Math.sin(t * 2.1);
          if (t > C.preTurn) alpha += (t - C.preTurn) / (C.turn - C.preTurn) * 0.6;
        }
        // the band rides the turn to the end of the reveal, handing
        // itself to the braid mid-rotation
        if (t >= C.turn + 5.9) alpha *= Math.max(0, 1 - (t - C.turn - 5.9) / 2.0);
        // Prune-per-scene (R2 T4) spreads 7 prune points from ~29s to ~55s
        // instead of 3 clustered at the very end, which makes a seek-safety
        // gap in the old code much more visible: uBurn was only ever WRITTEN
        // inside the t>=rb.prune branch, with no t<rb.prune counterpart, so a
        // backward seek past a prune point left the branch's shader uniform
        // stuck at its last value (stranded, looking burned when t no longer
        // warrants it). Made explicitly three-way and pure-f(t) so every
        // branch (any of the 7, or none) reads correctly from a cold seek in
        // either direction — no per-ribbon state survives a direction change
        // except emberDone, which exists only to de-dupe the one-shot spark
        // and is re-armed the moment t drops back below this branch's prune.
        // emberDone alone isn't enough, though: a forward seek that jumps
        // straight into long-pruned territory (pp large) would still pass
        // the "!emberDone" check once, and fire a spark years after the
        // branch actually died. The pp<0.8 guard below (matching the burn
        // ramp's own duration) restricts the spark to an actually-fresh
        // death; emberDone is still set either way so it never retries.
        if (rb.prune) {
          if (!hingeOn) {
            if (t < rb.prune) {
              rb.mat.uniforms.uBurn.value = 0;
              rb.emberDone = false;
            } else if (t < C.turn + 0.35) {
              var pp = t - rb.prune;
              rb.mat.uniforms.uBurn.value = Math.min(1, pp / 0.8);
              // The one-shot spark only belongs to a FRESH death (pp within the
              // burn ramp) — a forward seek that lands well past a branch's
              // prune (pp large) must still show the pruned (burnt) state, but
              // must NOT replay its spark; emberDone is still marked so this
              // branch doesn't retry the check again within the same crossing.
              if (!rb.emberDone) {
                if (pp < 0.8) this.spawnEmbers(rb.curve.getPointAt(0.55), t);
                rb.emberDone = true;
              }
            } else {
              // ROOT: the pruned dead re-ignite before the weave — all of
              // them, held; their fray goes last, the re-lit joining in
              rb.mat.uniforms.uBurn.value = Math.max(0, 1 - (t - C.turn - 0.35) / 0.6);
              alpha = Math.max(alpha, 0.45 * Math.max(0, 1 - (t - C.turn) / 3.0));
            }
          } else {
            /* ygg-hinge — the R3 prune grammar replaces the burn: warning
               flash + traveling red pulse ON the music hit, tip→split
               dissolve front with a fragmenting band, split-point flare,
               then gone (mode-5 noise annihilation — the file's own discard
               idiom) until the film's ROOT relight restyles as the spec's
               restore (granular re-materialization, whole and unburnt).
               Every uniform written every frame, pure f(t). IMPULSES
               (main.js shake/flash at the hits) are untouched. */
            var PRh = window.YggHinge.PRUNE;
            var prT = PRh.pruneTime * (1 + (U.hash01(i * 7.7) - 0.5) * 2 * PRh.pruneSpeedVar);
            var pDur = PRh.warningFlashDuration + prT;
            rb.mat.uniforms.uBurn.value = 0;
            if (t < rb.prune) {
              rb.mat.uniforms.uPr.value.set(0, 1, 0, -1);
              rb.emberDone = false;
            } else if (t < C.turn + 0.35) {
              var psH = window.YggHinge.pruneState(t - rb.prune, { redLine: 0, vGrow: 1, pruneTime: prT });
              if (t - rb.prune >= pDur) rb.mat.uniforms.uPr.value.set(5, 0, 0, -1);
              else rb.mat.uniforms.uPr.value.set(psH.mode, psH.front, psH.flash, psH.pulse);
              if (psH.flare > 0) {
                // the split point snaps: parent band brightens locally +
                // the shared spark rig fires (deterministic dirs, no draws)
                if (this.ribbons[0].mat.uniforms.uFlare) {
                  this.ribbons[0].mat.uniforms.uFlare.value.set(rb.splitU || 0, psH.flare);
                }
                var pfR = this.pruneFlare;
                if (pfR) {
                  var spl = rb.curve.getPointAt(0);
                  for (var fk = 0; fk < pfR.n; fk++) {
                    var fAz = U.hash01(i * 31.7 + fk * 7.3) * 6.283;
                    var fEl = (U.hash01(i * 13.9 + fk * 3.1) - 0.5) * 3.1416;
                    var fdx = Math.cos(fAz) * Math.cos(fEl), fdy = Math.sin(fEl), fdz = Math.sin(fAz) * Math.cos(fEl);
                    var fL = PRh.splitFlareLength * (0.6 + 0.8 * U.hash01(i * 5.3 + fk * 11.1)) * (0.4 + 0.6 * psH.flare);
                    var f6 = fk * 6;
                    pfR.pos[f6] = spl.x + fdx * 0.01; pfR.pos[f6 + 1] = spl.y + fdy * 0.01; pfR.pos[f6 + 2] = spl.z + fdz * 0.01;
                    pfR.pos[f6 + 3] = spl.x + fdx * fL; pfR.pos[f6 + 4] = spl.y + fdy * fL; pfR.pos[f6 + 5] = spl.z + fdz * fL;
                  }
                  pfR.geo.attributes.position.needsUpdate = true;
                  pfR.mat.opacity = psH.flare;
                  pfR.seg.visible = true;
                }
              }
              // ember one-shot moves to the flare moment, at the split point
              // (same freshness + dedupe idiom as the flag-off spark)
              if (!rb.emberDone && t - rb.prune >= pDur) {
                if (t - rb.prune - pDur < 0.8) this.spawnEmbers(rb.curve.getPointAt(0), t);
                rb.emberDone = true;
              }
            } else {
              // ROOT relight = the spec's RESTORE: the healed fork returns
              // granularly over 0.6 s, whole and unburnt; same alpha floor
              // as the flag-off relight so the regrow-all beat is unchanged.
              var riseH = smoothstep01((t - C.turn - 0.35) / 0.6);
              if (riseH < 1) rb.mat.uniforms.uPr.value.set(5, riseH, 0, -1);
              else rb.mat.uniforms.uPr.value.set(0, 1, 0, -1);
              alpha = Math.max(alpha, 0.45 * Math.max(0, 1 - (t - C.turn) / 3.0));
            }
          }
        }
        rb.mat.uniforms.uAlpha.value = alpha;
        rb.mesh.visible = alpha > 0.01 && grow > 0;
        if (Array.isArray(matte)) {
          rb.mat.uniforms.uMatte.value.set(matte[0], matte[1], matte[2], matte[3]);
        } else {
          rb.mat.uniforms.uMatte.value.set(0, 0, 0, 0);
        }
        rb.mat.uniforms.uRes2.value.copy(this.grade.uniforms.uRes.value);

        // R2 T7: the fiber-parent morph. `alpha`/`uAlpha`/`.visible` above are
        // the EXISTING band-era result — for a parent whose own (staggered)
        // morph has begun, blend that toward the tree-fiber alpha convention
        // (so it inherits the tree's own fade near the stinger instead of
        // freezing at a stale band-era brightness once `rbVis`'s narrower
        // band-only sibling condition would otherwise have taken over) and
        // CPU-lerp its position buffer from bandPos to treePos.
        if (rb.isFiberParent) {
          var mVal = hinge2 ? mu2 : morphEnvelope(t - rb.stagger, rb.env); // level 2: the wavefront clock replaces the per-role envelope (rb.env: spine vs cast)
          // uTipGain is written UNCONDITIONALLY (stranding family #8, review
          // catch): the band-era code above never touches this uniform, so a
          // write gated on mVal>0 would strand the tree era's 2.6 across a
          // backseek into the band — a blown-out stripe on the spine's
          // uv 0.50–0.95 window. Pure f(t): mVal=0 restores the band's exact
          // built 0 every frame.
          rb.mat.uniforms.uTipGain.value = 2.6 * mVal;
          // R2 T8 (a): the strand's hue turns tree-ward exactly as it
          // morphs — written UNCONDITIONALLY (same stranding-family law as
          // uTipGain above): mVal=0 restores the band's exact built green
          // every frame, so no backseek can strand a tree-tinted band.
          rb.mat.uniforms.uColor.value.copy(rb.bandColor).lerp(rb.treeColor, mVal);
          if (mVal > 0) {
            var treeAlpha = 0.30 * (1 + 0.8 * U.clamp(1 - (t - C.turn - 5.2) / 5, 0, 1)) * fadeAllNow;
            alpha = U.lerp(alpha, treeAlpha, mVal);
            rb.mat.uniforms.uAlpha.value = alpha;
            rb.mesh.visible = alpha > 0.01;
          }
          var mKey = hinge2 ? h2Front : mVal;
          if (mKey !== rb.lastM || this._fiberSeekReset) {
            var pAttr = rb.mesh.geometry.attributes.position, pArr = pAttr.array, bP = rb.bandPos, tP = rb.treePos;
            if (!hinge2) {
              for (var pv = 0; pv < pArr.length; pv++) pArr[pv] = bP[pv] + (tP[pv] - bP[pv]) * mVal;
            } else {
              /* level 2 — per-POINT wavefront (R2's mechanism verbatim):
                 each tube ring morphs as the front passes its own s.
                 Parents are TubeGeometry 64×7 → 8 verts/ring, s = ring/64;
                 the spine's root is its CENTER (G — bakeParentTree's
                 convention), so its s folds |s−0.5|·2. */
              var isSpine = rb.kind === 'spine';
              for (var pv2 = 0; pv2 < pArr.length; pv2++) {
                var vI = (pv2 / 3) | 0;
                var sRing = ((vI / 8) | 0) / 64;
                if (isSpine) sRing = Math.abs(sRing - 0.5) * 2;
                var mPt = 1 - smoothstep01((sRing - (h2Front - 0.12)) / 0.24);
                pArr[pv2] = bP[pv2] + (tP[pv2] - bP[pv2]) * mPt;
              }
            }
            pAttr.needsUpdate = true;
            rb.lastM = mKey;
          }
        }
      }
      if (lineVis) {
        var spine = this.ribbons[0];
        for (i = 0; i < this.pulses.length; i++) {
          var pu = this.pulses[i];
          var frac = (t * 0.05 + i * 0.33) % 1;
          // R2 T7: `spine.curve` is the ORIGINAL, un-morphed band curve (pulses
          // still ride it directly) — once the spine mesh itself starts lerping
          // toward its tree-era shape (spine.lastM > 0, exact float 0 at rest,
          // no epsilon risk: clamp floors mRaw to exactly 0 before smoothstep),
          // a point on that stale curve no longer sits on the rendered mesh —
          // spine.lastM is this frame's freshly-computed value (written earlier
          // in this same loop pass), so this tracks the spine's actual state
          // exactly, independent of its own random stagger.
          var visible = spine.mesh.visible && frac < spine.mat.uniforms.uGrow.value && spine.lastM <= 0;
          pu.visible = visible;
          if (visible) {
            pu.position.copy(spine.curve.getPointAt(frac));
            pu.material.opacity = 0.85 * spine.mat.uniforms.uAlpha.value;
          }
        }
        for (i = 0; i < this.flashPool.length; i++) {
          var ff = this.flashPool[i], fa = t - ff.t0;
          if (fa < 0) { ff.sprite.material.opacity = 0; continue; }
          if (fa <= 0.7) {
            var k2 = Math.sin(Math.PI * U.clamp(fa / 0.7, 0, 1));
            ff.sprite.material.opacity = 0.9 * k2;
            var fsc = 0.35 + fa * 1.6;
            ff.sprite.scale.set(fsc, fsc, 1);
          } else {
            // the joint stays lit as long as its branch lives — a node on the band
            var na = t >= C.evidence ? Math.max(0, 1 - (t - C.evidence) / 2) : 1;
            if (t >= C.turn) na *= Math.max(0, 1 - (t - C.turn) / 2.0);
            ff.sprite.material.opacity = 0.42 * na;
            ff.sprite.scale.set(0.42, 0.42, 1);
          }
        }
      } else {
        // R2 T7: `spine.mesh.visible` used to double as the pulses' own
        // off-switch (band alpha hit exactly 0 by t≈turn+7.9, same as
        // `lineVis` closing) — the parent alpha-crossover above makes spine's
        // alpha non-zero past that point, so pulses need an explicit force-hide
        // here or they'd freeze stuck-visible for the rest of the film.
        for (i = 0; i < this.pulses.length; i++) this.pulses[i].visible = false;
      }
    }

    // ── Yggdrasil ──
    var treeVis = threadsOn ? false : (t >= C.turn && t < C.stingClear + 1);
    this.treeGroup.visible = treeVis;
    // the archive shelves belong to the desk world — never on the tree's sky
    this.farGroup.visible = t < C.turn;
    // the turn — ONE angle drives both: the whole band pivots CCW about G
    // (right spine rising into the trunk, left swinging down into the roots)
    // while the riser, born lying, co-rotates upright. Written UNCONDITIONALLY
    // (riseP clamps to identity for t ≤ turn+2.9) so a backward seek can never
    // strand the band standing on end — scrub-safety, not style.
    var riseP = U.clamp((t - C.turn - 2.9) / 2.8, 0, 1);
    var riseE = riseP < 0.5 ? 4 * riseP * riseP * riseP : 1 - Math.pow(-2 * riseP + 2, 3) / 2;
    if (!hingeOn) {
      this.turnPivot.rotation.z = Math.PI / 2 * riseE;
      this.riser.rotation.z = -Math.PI / 2 * (1 - riseE);
    } else {
      /* ygg-hinge law (recipes R2/R4): the geometry NEVER rotates — the
         camera does the work. The tree is baked upright (bakeUpright's
         hinge branch), so identity here IS the tree pose; written every
         frame, both branches — backseeks land clean by construction. */
      this.turnPivot.rotation.z = 0;
      this.riser.rotation.z = 0;
    }
    // fiberGroup (the 120 unified children batches) rides turnPivot exactly
    // as cascadeGroup used to. Its window is the ENVELOPE's, not the turn's
    // (rephase: the formation leads the pivot — the fray sprouts from
    // C.preTurn; see buildTree's morphEnv), so the children run in the late
    // band era too. blast stays scene-level — gate it unconditionally, or a
    // seek OUT of the turn window strands stale blast dots on screen.
    var fiberVis = threadsOn ? false : (t >= this.fiberVis0 && t < C.stingClear + 1);
    this.fiberGroup.visible = fiberVis;
    if (!treeVis && !threadsOn) { this.blast.points.visible = false; }
    if (fiberVis) {
      // R2 T7: the ~120 children — ONE population morphing in place (no
      // separate cascade-vs-braid dissolve), updated for the whole envelope
      // window (late band era through the finale), not just the tree era.
      // Per BATCH: growth (uGrow) timing and a lighting-mode crossfade
      // (uJunc, root-lit like a fray child -> uTipGain, lit at the limb
      // junction) driven by the batch's own UNSTAGGERED base envelope (one
      // material per batch, so it can't track 12 different per-fiber `m`
      // values at once — only the geometry does). Per FIBER within the
      // batch: its own staggered `m` lerps that fiber's vertex range from
      // bandPos to treePos, written once per frame while mid-envelope,
      // once-and-cached outside it (lastM, reset on seek).
      for (i = 0; i < this.fiberBatches.length; i++) {
        var fb = this.fiberBatches[i];
        var fbGrow = U.outCubic((t - fb.t0) / fb.dur);
        fb.mat.uniforms.uGrow.value = fbGrow;
        // R2 T8b (18): after the stillness the flow clock resumes FROM the
        // frozen phase (t - createdBy starts at 0, continuous with the held
        // 0) instead of snapping to live t — the un-freeze was one of the
        // beat's cut components. Absolute flow phase is unobservable; only
        // the discontinuity was. Pure f(t).
        fb.mat.uniforms.uTime.value = stillNow ? 0 : (t >= C.createdBy ? t - C.createdBy : t);
        var mBaseNow = hinge2 ? mu2 : morphEnvelope(t, this.morphEnv.child);
        fb.mat.uniforms.uJunc.value = 1 - mBaseNow;
        // R2 T8b: per-batch tip factor — the 2.6 constant was the sparse-limb
        // payback; the NEW dense cohorts blow the limbs white at 2.6, so they
        // carry their own smaller tipK. Every pre-existing batch keeps the
        // recorded 2.6 law bit-identical (fb.tipK undefined -> 2.6).
        fb.mat.uniforms.uTipGain.value = (fb.tipK || 2.6) * mBaseNow;
        if (hinge2 && fb.mat.uniforms.uFront) {
          // the wavefront heat rides the front; sin ramps it in and out of
          // the bridge so it never pops. Pure f(t).
          fb.mat.uniforms.uFront.value = h2Front;
          fb.mat.uniforms.uHeatK.value = Math.sin(Math.PI * mu2raw);
        }
        var fbAlpha = U.lerp(0.8, fb.aTree * (1 + 0.8 * U.clamp(1 - (t - C.turn - 5.2) / 5, 0, 1)), mBaseNow) * fadeAllNow; // R2 T8b (16): per-batch aTree (was gold?0.34:0.26)
        fb.mat.uniforms.uAlpha.value = fbAlpha;
        fb.mesh.visible = fbAlpha > 0.01 && fbGrow > 0;
        if (fb.mesh.visible) {
          var fArr = fb.mesh.geometry.attributes.position.array, fDirty = this._fiberSeekReset;
          for (var f2 = 0; f2 < fb.fibers.length; f2++) {
            var fib = fb.fibers[f2];
            if (!hinge2) {
              var fm = morphEnvelope(t - fib.stagger, this.morphEnv.child);
              if (fm !== fib.lastM || this._fiberSeekReset) {
                for (var fv = fib.vStart; fv < fib.vEnd; fv++) fArr[fv] = fb.bandPos[fv] + (fb.treePos[fv] - fb.bandPos[fv]) * fm;
                fib.lastM = fm;
                fDirty = true;
              }
            } else if (h2Front !== fib.lastM || this._fiberSeekReset) {
              /* level 2 — per-point wavefront on each strand: child tubes
                 are 20×4 → 5 verts/ring, 21 rings; s = ring/20 along the
                 fiber. The per-fiber stagger rests; the front IS the
                 stagger (R2: wavefront drives mu per-point, not globally). */
              for (var fv2 = fib.vStart; fv2 < fib.vEnd; fv2++) {
                var relV = ((fv2 - fib.vStart) / 3) | 0;
                var sF = ((relV / 5) | 0) / 20;
                var mF = 1 - smoothstep01((sF - (h2Front - 0.12)) / 0.24);
                fArr[fv2] = fb.bandPos[fv2] + (fb.treePos[fv2] - fb.bandPos[fv2]) * mF;
              }
              fib.lastM = h2Front;
              fDirty = true;
            }
          }
          if (fDirty) fb.mesh.geometry.attributes.position.needsUpdate = true;
        }
      }
    }
    if (threadsOn) {
      /* ── the substitution's own per-frame work ──
         The threads carry the band, the deviations, the prunes, the morph
         and the tree. Only the film's EVENTS stay: the eruption blast and
         its green wash at the ROOT hit (IMPULSES-timed, not dressing). */
      this.ygg.update(t, matte, this.grade.uniforms.uRes.value);
      if (this.cosmos) this.cosmos.update(t, this.ygg.frontAt(t), this.camera, this.grade.uniforms.uRes.value);
      /* THE ERUPTION BLAST IS OFF UNDER ?ygg=1 (his call, 2026-07-18: "notice the
         green thingies? Artifact from a previous build").
         It was right when it was written and was orphaned by a later change, which
         is exactly what he called it. Two things moved out from under it:
           · it erupts from this.G — the band's MIDDLE — because that is where the
             tree used to rise. The horizontal-tree rework moved the tree's origin
             to the band's LEFT end and did not move the blast, so the eruption
             stopped marking the tree's actual birth and became loose dust over the
             evidence card;
           · it is phosphor green (0xA8FFC8), which was the timeline's colour when
             the tree was the timeline's green escaping the screen. The ygg tree is
             gold -> teal -> blue, so the burst no longer shares a palette with
             anything on screen.
         Identified by traversing the live scene for green-dominant materials at
         t=112: exactly one hit, Points x420, #a8ffc8, opacity 0.304 — the blast,
         mid-flight at btE 1.53.
         The ROOT hit is NOT unmarked: the threads' own morph front ignites on it,
         and greenL (below) still throws its wash. If the impulse is ever wanted
         back, the fix is to fire it from the tree's real root
         (spineCurve.getPointAt(0), not G) and re-tint it to the tree's palette —
         not to un-gate it as-is. */
      var btE = t - C.turn;
      if (false && btE >= 0 && btE < 2.4) {
        this.blast.points.visible = true;
        var bposE = this.blast.pos;
        for (i = 0; i < this.blast.n; i++) {
          var vE = this.blast.vel[i], dragE = 1 - Math.min(0.9, btE * 0.5);
          bposE[i * 3] = this.G.x + vE[0] * btE * dragE;
          bposE[i * 3 + 1] = this.G.y + vE[1] * btE * dragE - 0.5 * btE * btE * 0.4;
          bposE[i * 3 + 2] = this.G.z + vE[2] * btE * dragE;
        }
        this.blast.points.geometry.attributes.position.needsUpdate = true;
        this.blast.points.material.opacity = Math.max(0, 1 - btE / 2.2);
      } else {
        this.blast.points.visible = false;
      }
      this.greenL.intensity = Math.max(this.greenL.intensity, btE >= 0 && btE < 1.5 ? 4 * (1 - btE / 1.5) : 0);
      /* the recipes' look is additive hair + BLOOM: the film's high threshold
         (0.78) exists to protect card type, so it holds through the cards and
         opens toward the artifact's grade (1.6 / 0.15) across the reveal —
         eased back a little at the credo so the cream lines stay readable.
         Named dials: TH_LO / STR_HI below. Pure f(t). */
      var glowK = smoothstep01((t - C.turn) / 6);
      var credoEase = 1 - 0.35 * smoothstep01((t - C.createdBy) / 1.5);
      /* r7f — THE RELEASE (his catch: the credits' light stuck halfway).
         The reveal BORROWS the type-protection threshold and rides the
         swell floor — and never gave either back, so the end cards lit a
         half-strength halo that froze (strength pinned 0.65, threshold
         0.46, forever, since before this repo's history). After the sting
         hand-off both return over 2s: threshold home to 0.78 (the card
         law), strength to the zone system's own void→tail. Bit-identical
         before C.sting (release = 0). Pure f(t). */
      var release = smoothstep01((t - C.sting) / 2);
      var TH_LO = 0.46, STR_HI = 1.00;
      this.bloom.threshold = 0.78 + (TH_LO - 0.78) * glowK * (1 - release);
      var swell = Math.max(this.bloom.strength, (this.bloom.strength + (STR_HI - this.bloom.strength) * glowK) * credoEase);
      this.bloom.strength = this.bloom.strength + (swell - this.bloom.strength) * (1 - release);
    }
    if (treeVis) {
      var fadeAll = t > C.treeFade ? Math.max(0, 1 - (t - C.treeFade) / 1.9) : 1;
      var still = (t > C.still && t < C.createdBy);
      var braidP = U.clamp((t - C.turn - 2.2) / 4, 0, 1);
      var braidP2 = U.clamp((t - C.turn - 5.4) / 3.5, 0, 1); // trunk furniture waits for the stand-up
      var nebP = U.clamp((t - C.turn - 3.8) / 6, 0, 1);
      var credoK = U.clamp((t - C.createdBy) / 0.5, 0, 1) * U.clamp((C.treeFade + 1.2 - t) / 1.6, 0, 1);
      // (the pivot/riser angles are written above, before this block — they
      // must run on every frame, or backward seeks strand the rotation)
      if (!this.tagsRebaked) { // fonts arrive after build — restamp the numerals once
        for (i = 0; i < this.limbTags.length; i++) {
          this.bakeNum(this.limbTags[i].cv, this.limbTags[i].n);
          this.limbTags[i].sprite.material.map.needsUpdate = true;
        }
        this.tagsRebaked = true;
      }
      // the light-fields — the backlit sky; green → teal → night blue
      var ph1 = U.clamp((t - C.wm2) / 6.6, 0, 1);
      var ph2 = U.clamp((t - C.still) / 3.3, 0, 1);
      var lfCol = new T.Color(0xC8F49A).lerp(new T.Color(0x7CD8C4), ph1).lerp(new T.Color(0x6FA0D8), ph2);
      for (i = 0; i < this.lightFields.length; i++) {
        var lf = this.lightFields[i];
        var lp = lf.key === 'crown' ? nebP : braidP;
        lf.sprite.material.color.copy(lfCol);
        lf.sprite.material.opacity = lf.max * lp * fadeAll * (1 + 0.35 * credoK);
      }
      // B: the braid — now the fiberBatches loop above (children) plus the
      // fiber-parent block inside the timeline-band ribbon loop (spine ->
      // roots+trunk-core, 7 cast branches -> limb main stems); both retired
      // populations (braidRibbons, rootRibbons) are gone.
      // gold flecks riding the braid column
      // R2 T8b (18): the stillness THAW is a glide, not a snap — at the
      // createdBy beat the frozen cosmetic clock rejoins live time over
      // 1.2s (the beat may swell, it may never cut). Pure f(t).
      var thawK = smoothstep01((t - C.createdBy) / 1.2);
      var tEff = still ? C.still : (t >= C.createdBy ? U.lerp(C.still, t, thawK) : t);
      var fp = this.flecks.geometry.attributes.position.array;
      for (i = 0; i < this.fleckPhase.length; i++) {
        var fy = (this.fleckPhase[i] + (tEff - C.turn) * this.fleckSpeed[i] * 0.30) % 1;
        if (fy < 0) fy += 1;
        var fr2 = this.fleckRad[i] * (0.13 + 0.87 * Math.sin(Math.min(1, fy * 1.06) * Math.PI));
        var fang = this.fleckAz[i] + (tEff - C.turn) * (0.4 + this.fleckSpeed[i]) + fy * 5.5;
        fp[i * 3] = Math.cos(fang) * fr2;
        fp[i * 3 + 1] = fy * this.trunkH;
        fp[i * 3 + 2] = Math.sin(fang) * fr2 * 0.8;
      }
      this.flecks.geometry.attributes.position.needsUpdate = true;
      this.flecks.material.opacity = 0.75 * braidP2 * fadeAll;
      // heart & flare — the core peaks at the credo
      // R2 T8b v2 dial: the four core scales summed into one blown egg that
      // swallowed the trunk's woven strand-work (and bled over the credo
      // text) — the wide/soft members come down so the STRANDS carry the
      // body; the narrow hot seam keeps the plate's escaping-heart read.
      this.coreGlow.material.opacity = (0.18 + 0.08 * Math.sin(t * 1.7)) * braidP2 * fadeAll * (1 + 0.5 * credoK);
      this.coreHot.material.opacity = (0.16 + 0.04 * Math.sin(t * 2.3)) * braidP2 * fadeAll * (1 + 0.55 * credoK); // v4: 0.30 -> 0.25; FIX PASS (review defect 2, two increments): base 0.25 -> 0.20 -> 0.16 AND credo kick 1.1 -> 0.55 — the credo lines' final glyphs must clear the column in BOTH gradings; the kick cut confines the change to the credo era itself
      this.rootFlare.material.opacity = (0.24 + 0.26 * U.clamp((t - C.createdBy) / 0.6, 0, 1)) * fadeAll; // R2 T8 (e) base 0.24; R2 T8b (18): SWELLS 0.24->0.50 across the beat (the old form stepped 0.24->0 at createdBy then ramped — a cut component)
      // R2 T8 (a): painterly core, scales 3+4 — breathing with the two
      // existing core sprites, all riding the trunk's own formation ramp
      this.coreWide.material.opacity = (0.10 + 0.04 * Math.sin(t * 1.3)) * braidP2 * fadeAll * (1 + 0.45 * credoK); // v2: 0.16 -> 0.10 (see halo note above)
      this.coreSpire.material.opacity = (0.10 + 0.03 * Math.sin(t * 2.0 + 1.2)) * braidP2 * fadeAll * (1 + 0.45 * credoK); // v4: 0.24 -> 0.19; FIX PASS (review defect 2, two increments): base 0.19 -> 0.13 -> 0.10 AND credo kick 0.9 -> 0.45 — same legibility law
      // R2 T8 (e): the molten under-pool — rises with the stand-up, then
      // brightens toward the settle/credo (the plate's second light source)
      var poolK = U.clamp((t - C.turn - 8) / 8, 0, 1);
      this.poolWide.material.opacity = (0.14 + 0.20 * poolK) * braidP2 * fadeAll * (1 + 0.5 * credoK);
      this.poolHot.material.opacity = (0.10 + 0.16 * poolK) * braidP2 * fadeAll * (1 + 0.8 * credoK);
      // R2 T8 (c): the trunk body's edge-lit rim — thin additive streaks,
      // hue following the sky's phase palette (green -> teal -> night)
      for (i = 0; i < this.trunkRims.length; i++) {
        var trm = this.trunkRims[i];
        trm.sprite.material.color.copy(lfCol);
        trm.sprite.material.opacity = trm.target * (0.8 + 0.2 * Math.sin(t * 1.1 + trm.phase)) * braidP2 * fadeAll * (1 + 0.35 * credoK);
      }
      // nebula crown — silhouettes over the light
      for (i = 0; i < this.nebula.length; i++) {
        var nb = this.nebula[i];
        nb.sprite.material.opacity = nb.target * nebP * fadeAll;
        nb.sprite.material.rotation += nb.spin * dt;
      }
      // the trunk's dark body rises with the braid
      for (i = 0; i < this.trunkMass.length; i++) {
        var tms = this.trunkMass[i];
        tms.sprite.material.opacity = tms.target * braidP2 * fadeAll;
        tms.sprite.material.rotation += tms.spin * dt;
      }
      // twig + root silhouettes
      for (i = 0; i < this.branches.length; i++) {
        var brs = this.branches[i];
        brs.sprite.material.opacity = brs.target * nebP * fadeAll;
        brs.sprite.material.rotation += brs.spin * dt;
      }
      // frame-edge occluders, slow drift
      for (i = 0; i < this.occluders.length; i++) {
        var oc = this.occluders[i];
        oc.sprite.material.opacity = 0.78 * nebP * fadeAll;
        oc.sprite.position.x = oc.x0 + Math.sin(t * oc.drift * 4.2) * 0.35;
        oc.sprite.position.y = oc.y0 + Math.cos(t * oc.drift * 3.1) * 0.22;
      }
      // blossoms at the stillness — R2 T8 (b): clustered (anchors +
      // satellites, one array), with subtle drift: pure f(tEff), so it
      // freezes during the stillness beat exactly like the twinkle
      for (i = 0; i < this.blossoms.length; i++) {
        var bl = this.blossoms[i];
        var bOn = t > C.still + bl.order * 1.2 ? 1 : 0;
        // R2 T8b (18): the twinkle rejoins the live sine through the thaw
        // instead of popping from steady 0.85 to a scattered sine field at
        // the beat (a crown-wide brightness snap, one more cut component).
        var btwLive = 0.55 + 0.45 * Math.sin(tEff * 2.4 + bl.phase);
        var btw = still ? 0.85 : (t >= C.createdBy ? U.lerp(0.85, btwLive, thawK) : btwLive);
        bl.sprite.material.opacity = 0.72 * bOn * btw * fadeAll; // R2 T8b: 0.6 -> 0.72 — the clusters must read ON the dome (t36's strewn pink)
        bl.sprite.position.set(
          bl.bx + Math.sin(tEff * 0.42 + bl.dphA) * bl.amp,
          bl.by + Math.cos(tEff * 0.35 + bl.dphB) * bl.amp * 0.7,
          bl.bz);
      }
      // R2 T8b Phase 6c (note 19): the tree numerals are GONE — sprites are
      // built-but-hidden (see the tag loop); opacity pinned 0 for belt and
      // suspenders, matching the branchTex kill idiom exactly.
      for (i = 0; i < this.limbTags.length; i++) {
        this.limbTags[i].sprite.material.opacity = 0;
      }
      this.treeGroup.rotation.y = Math.sin(t * 0.05) * 0.03;
      // eruption
      var bt = t - C.turn;
      if (bt >= 0 && bt < 2.4) {
        this.blast.points.visible = true;
        var bpos = this.blast.pos;
        for (i = 0; i < this.blast.n; i++) {
          var v = this.blast.vel[i], drag = 1 - Math.min(0.9, bt * 0.5);
          bpos[i * 3] = v[0] * bt * drag;
          bpos[i * 3 + 1] = -1.35 + v[1] * bt * drag - 0.5 * bt * bt * 0.4;
          bpos[i * 3 + 2] = -3.2 + v[2] * bt * drag;
        }
        this.blast.points.geometry.attributes.position.needsUpdate = true;
        this.blast.points.material.opacity = Math.max(0, 1 - bt / 2.2);
      } else {
        this.blast.points.visible = false;
      }
      this.greenL.intensity = Math.max(this.greenL.intensity, bt >= 0 && bt < 1.5 ? 4 * (1 - bt / 1.5) : 0);
    }

    // ── embers ──
    for (i = 0; i < this.emberPool.length; i++) {
      var em = this.emberPool[i], age = t - em.born;
      if (age < 0 || age > 1.3) { em.points.visible = false; continue; }
      em.points.visible = true;
      for (var k = 0; k < em.n; k++) {
        var ev = em.vel[k];
        em.pos[k * 3] = em.origin.x + ev[0] * age;
        em.pos[k * 3 + 1] = em.origin.y + ev[1] * age - 1.4 * age * age;
        em.pos[k * 3 + 2] = em.origin.z + ev[2] * age;
      }
      em.points.geometry.attributes.position.needsUpdate = true;
      em.points.material.opacity = Math.max(0, 1 - age / 1.2);
    }

    // ── scenery: soft planes + breathing bokeh ──
    var anyScenery = t >= C.cast[0] - 1 && t < C.evidence;
    this.sceneryGroup.visible = anyScenery;
    if (anyScenery) {
      for (i = 0; i < this.scenery.length; i++) {
        var sc2 = this.scenery[i];
        var on = t >= sc2.t0 && t < sc2.t1 + 0.25;
        if (!on) {
          if (sc2.plane.visible) {
            sc2.plane.material.opacity = 0; sc2.plane.visible = false; sc2.plane.position.x = sc2.baseX;
            for (var dd = 0; dd < sc2.dots.length; dd++) { sc2.dots[dd].sprite.visible = false; sc2.dots[dd].sprite.material.opacity = 0; }
          }
          continue;
        }
        var ein = U.clamp((t - sc2.t0) / 0.55, 0, 1);
        var eout = U.clamp((sc2.t1 + 0.25 - t) / 0.3, 0, 1);
        sc2.plane.visible = true;
        sc2.plane.material.opacity = 0.80 * ein * eout;
        sc2.plane.position.x += Math.sin(t * 0.07 + sc2.seed) * 0.0012;
        for (var d2 = 0; d2 < sc2.dots.length; d2++) {
          var dot = sc2.dots[d2];
          dot.sprite.visible = true;
          var tw2 = 0.55 + 0.45 * Math.sin(t * 1.4 + dot.phase);
          dot.sprite.material.opacity = dot.max * tw2 * ein * eout;
        }
      }
    }
  };
  World.prototype.spawnEmbers = function (origin, t) {
    for (var i = 0; i < this.emberPool.length; i++) {
      var em = this.emberPool[i];
      if (em.born > 0 && t - em.born < 1.3) continue;
      em.born = t;
      em.origin.copy(origin);
      if (!em.vel.length) {
        var rnd = U.mulberry32(Math.floor(origin.x * 91 + 7));
        for (var k = 0; k < em.n; k++) {
          em.vel.push([(rnd() - 0.5) * 2.4, rnd() * 1.6, (rnd() - 0.5) * 1.4]);
        }
      }
      return;
    }
  };
  World.prototype.render = function (t, u) {
    if (this.compTex) this.compTex.needsUpdate = true;
    var g = this.grade.uniforms;
    g.uWeave.value.set(u.weaveX, u.weaveY);
    g.uFrame.value = u.frame;
    g.uWobble.value = u.wobble;
    g.uGrain.value = u.grain;
    // R2 T8 (f): during the grove the frame opens as the tree floods it —
    // vignette eases 0.48 -> 0.44 across the reveal (sanctioned grade
    // dial), handing off exactly to the stillness MOODK row's own 0.44 at
    // C.still. Pure f(t), stateless — seek-safe by construction.
    var vigT = u.vig;
    if (t >= this.C.turn && t < this.C.still) vigT -= 0.04 * smoothstep01((t - this.C.turn) / 8);
    g.uVig.value = vigT;
    g.uFlicker.value = u.flicker;
    g.uCA.value = u.ca;
    g.uBarrel.value = u.barrel;
    g.uGreen.value = u.green;
    g.uScan.value = u.scan;
    g.uFlash.value.set(u.flashR, u.flashG, u.flashB, u.flashA);
    if(window.__FIELD_SKY && (t<this.C.wmStart || (t>=this.C.evidence&&t<this.C.turn)))this.farGroup.visible=false;
    this.composer.render();
  };

  window.WORLD = World;
})();
