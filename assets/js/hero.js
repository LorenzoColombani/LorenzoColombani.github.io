/* hero.js — the cold open.
   Gold motes scatter, assemble into the name, then disperse into an ambient
   field as the REAL text cross-fades in (so the headline stays real text:
   selectable, accessible, indexable — the particles are the performance).

   All motion lives in the vertex shader: the CPU writes nothing per frame,
   so the mote count is effectively free.  Design-library: "GPU flow-mote field". */

import * as THREE from 'three';

/* ── the taste interface: every dial for the assembly lives here ───────────── */
const DURATION   = 3.2;    // s — the whole materialize, start to settled
const TRAVEL     = 0.62;   // share of the run ONE mote spends flying (the rest is its delay)
const STAGGER    = 0.36;   // max per-mote head start — 0 would snap them all in together
const CLOUD_X    = 0.60;   // half-width of the dust field the motes fly in from (canvas units)
const CLOUD_Y    = 0.34;   // half-height — wider than tall, like the headline itself
const SWIRL      = 0.055;  // sideways bow on the crossing segment (sin²-enveloped)
const DRIFT_FAR  = 0.032;  // idle wander while scattered
const DRIFT_HOME = 0.0;    // landed motes are PINNED — any wander here jiggles the
                           // mote-name against the static text during the crossfade
const TEXT_FROM  = 0.66;   // progress at which the crisp headline starts arriving
const FADE_FROM  = 0.74;   // progress at which the motes start handing over
/* Order matters: the motes must OWN the name for a beat before the type shows up.
   At TEXT_FROM 0.46 the cloud had already finished spelling it, so the crisp text
   just brightened an identical grey shape — the materialize was over before you
   could read it. The word now exists as light first, then as type. */
const RESIDUE    = 0.0;    // the cloud goes to NOTHING. Anything above ~0 leaves a grainy
                           // ghost hugging the letterforms — it reads as smudge, not
                           // atmosphere. The DV cube fades its motes to zero for exactly
                           // this reason; the film grain overlay carries the texture instead.

export default function initHero({ canvas, nameEl, reduced }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
  } catch (e) { return; }                     // no WebGL → the real text simply stays put
  if (!renderer.getContext()) return;

  const DPR = Math.min(devicePixelRatio || 1, 2);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, 1, 1, 0, -1, 1);  // work in 0..1 canvas space

  /* ---- sample the rendered headline into target points ------------------
     Traces ONLY the headline's own box at full resolution, so every mote
     lands on a real glyph pixel — sampling the whole hero at half res gave
     a few hundred points and the name read as a sparse stencil. */
  function sampleName() {
    const host = canvas.getBoundingClientRect();
    if (!host.width || !host.height) return null;

    const lines = [...nameEl.querySelectorAll('.hn-line')]
      .map(el => ({ el, r: el.getBoundingClientRect(), cs: getComputedStyle(el) }))
      .filter(l => l.r.width && l.r.height);
    if (!lines.length) return null;

    // union box of the rendered lines, in canvas-local px
    const box = lines.reduce((b, { r }) => ({
      x0: Math.min(b.x0, r.left - host.left), y0: Math.min(b.y0, r.top - host.top),
      x1: Math.max(b.x1, r.right - host.left), y1: Math.max(b.y1, r.bottom - host.top)
    }), { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 });

    const bw = Math.ceil(box.x1 - box.x0), bh = Math.ceil(box.y1 - box.y0);
    if (bw < 8 || bh < 8) return null;

    /* The reconstruction must reproduce the DOM's TEXT METRICS, not just its
       font — or the motes fly to a name that isn't where the headline renders.
       Measured before this block existed: the mote-name sat ~+10px right
       (letter-spacing:-.028em never applied to fillText — the error grows per
       character) and ~7px high (the baseline was the guess fs*0.72 instead of
       the CSS half-leading formula). On a retina screenshot that doubles: a
       visible double-exposure through the whole crossfade. */
    const PAD = Math.ceil(parseFloat(lines[0].cs.fontSize) * 0.35);   // ink overshoot room
    const off = document.createElement('canvas');
    off.width = bw + PAD * 2; off.height = bh + PAD * 2;
    const ctx = off.getContext('2d', { willReadFrequently: true });
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#fff';

    lines.forEach(({ el, r, cs }) => {
      const fs = parseFloat(cs.fontSize);
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${fs}px ${cs.fontFamily}`;

      // 1 · letter-spacing: same advance as the DOM, or the glyphs drift right
      const ls = cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing) || 0;
      const canSpace = 'letterSpacing' in ctx;
      if (canSpace) ctx.letterSpacing = ls + 'px';

      // 2 · baseline: CSS centres the font's content box (ascent+descent) in
      //     the line box — compute it from the font's real metrics
      const met = ctx.measureText('Hg');
      const A = met.fontBoundingBoxAscent, D = met.fontBoundingBoxDescent;
      const baseInBox = (A > 0 && D > 0)
        ? (r.height - (A + D)) / 2 + A
        : (r.height + fs * 0.72) / 2;              // old guess, only if metrics missing
      const bx = (r.left - host.left) - box.x0 + PAD;
      const by = (r.top - host.top - box.y0) + baseInBox + PAD;

      if (canSpace || ls === 0) {
        ctx.fillText(el.textContent, bx, by);
      } else {
        // no canvas letter-spacing support: advance by hand (loses kerning
        // pairs ~1px; far better than a 2.8px/char systematic drift)
        let x = bx;
        for (const ch of el.textContent) {
          ctx.fillText(ch, x, by);
          x += ctx.measureText(ch).width + ls;
        }
      }
    });

    const OW = off.width, OH = off.height;
    const { data } = ctx.getImageData(0, 0, OW, OH);
    const pts = [];
    for (let y = 0; y < OH; y++) {
      for (let x = 0; x < OW; x++) {
        if (data[(y * OW + x) * 4 + 3] > 110) {
          pts.push((box.x0 + x - PAD) / host.width, 1 - (box.y0 + y - PAD) / host.height);
        }
      }
    }
    return pts.length > 200 ? pts : null;
  }

  /* ---- geometry --------------------------------------------------------- */
  let points = null, geo = null;
  const uni = {
    uTime:     { value: 0 },
    uProgress: { value: 0 },        // THE single clock — motes AND the crisp text run off this
    uDPR:      { value: DPR },
    uMouse:    { value: new THREE.Vector2(0, 0) },
    uResidue:  { value: RESIDUE }
  };

  const material = new THREE.ShaderMaterial({
    uniforms: uni,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    vertexShader: /* glsl */`
      attribute vec2  aStart;     // where a mote waits before the assembly
      attribute float aDelay;     // per-mote head start — this is what makes it a wave
      attribute float aOff;       // per-mote phase for the idle drift
      attribute float aSize;
      attribute float aDepth;     // fake z: scales size and brightness
      uniform float uTime, uProgress, uDPR, uResidue;
      uniform vec2  uMouse;
      varying float vAlpha;

      void main() {
        vec2 home = position.xy;             // the glyph pixel this mote belongs to — NEVER moves
        vec2 off  = aStart - home;

        // Per-mote local progress. Each speck runs its own ${''}0..1 inside the global one,
        // so they arrive across a window instead of all snapping on the same frame.
        float lp = clamp((uProgress - aDelay) / ${TRAVEL.toFixed(2)}, 0.0, 1.0);
        float e  = lp * lp * (3.0 - 2.0 * lp);

        // Destination held FIXED; only the offset shrinks. (snap-free particle-morph)
        vec2 p = home + off * (1.0 - e);

        // Decorative swirl on the CROSSING SEGMENT ONLY, sin^2-enveloped so it has zero
        // value AND zero slope at both seams — no kink entering, no kink landing.
        float s = sin(3.14159265 * e);
        p += vec2(-off.y, off.x) * (s * s) * ${SWIRL.toFixed(3)};

        // idle drift: wide while scattered, ~nil once landed
        float drift = mix(${DRIFT_FAR.toFixed(4)}, ${DRIFT_HOME.toFixed(4)}, e);
        p += vec2(sin(uTime * 0.42 + aOff), cos(uTime * 0.33 + aOff * 1.7)) * drift;
        p += uMouse * 0.014 * (1.0 - e);   // parallax dies as a mote lands: the glyph is static

        // Brightness: dim in flight, and an ARRIVAL BLOOM as it lands — the name
        // should exist as light before it exists as type. Then hand the frame to
        // the real text; the motes are the performance, not the headline.
        float landed = smoothstep(${FADE_FROM.toFixed(2)}, 1.0, uProgress);
        float arrive = smoothstep(0.72, 1.0, e);                // last stretch of ITS OWN flight
        vAlpha = (0.16 + 0.84 * e) * (1.0 + 0.55 * arrive) * mix(1.0, uResidue, landed);

        gl_Position  = vec4(p * 2.0 - 1.0, 0.0, 1.0);
        // stays a touch fatter on landing so the assembled word reads as glowing
        // gold rather than a flat grey stipple
        gl_PointSize = clamp(aSize * uDPR * aDepth * mix(2.1, 1.45, e), 1.0, 22.0);
      }`,
    fragmentShader: /* glsl */`
      precision mediump float;
      varying float vAlpha;
      void main() {
        vec2 q = gl_PointCoord - 0.5;
        float d = length(q);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.02, d) * vAlpha;
        // over-driven gold: additive overlap accumulates into a glow instead of
        // averaging out to grey grit
        gl_FragColor = vec4(vec3(0.831, 0.647, 0.455) * 1.55, a * 0.92);
      }`
  });

  function build(pts) {
    const isSmall = matchMedia('(max-width: 900px)').matches;
    const cap = isSmall ? 8000 : 24000;
    const available = pts.length / 2;
    const N = Math.min(available, cap);
    // even thinning across the glyphs: walk the sample list with a stride that
    // is coprime-ish with its length, rather than taking a contiguous head
    const stride = Math.max(1, Math.floor(available / N));

    /* Where the dust starts.
       NOT "each mote near its own letter" — that was the bug in the first pass:
       every speck orbiting its own glyph pixel means the cloud is a *blurred
       copy of the name* from frame one, so the whole thing reads as text coming
       into focus rather than dust becoming a word. Instead every mote starts at
       a random point in ONE shared ellipse covering the headline, and flies to
       its own glyph. At p=0 that is a field with no structure in it; the name
       only exists once they arrive. */
    let cx = 0, cy = 0;
    for (let i = 0; i < available; i++) { cx += pts[i * 2]; cy += pts[i * 2 + 1]; }
    cx /= available; cy /= available;

    const pos   = new Float32Array(N * 3);
    const start = new Float32Array(N * 2);
    const delay = new Float32Array(N);
    const off   = new Float32Array(N);
    const size  = new Float32Array(N);
    const depth = new Float32Array(N);

    for (let i = 0; i < N; i++) {
      const s = ((i * stride) % available) * 2;
      const tx = pts[s], ty = pts[s + 1];
      pos[i * 3] = tx; pos[i * 3 + 1] = ty; pos[i * 3 + 2] = 0;

      // uniform inside the ellipse: sqrt(r) or the middle stays over-dense
      const ang = Math.random() * Math.PI * 2;
      const rad = Math.sqrt(Math.random());
      start[i * 2]     = cx + Math.cos(ang) * rad * CLOUD_X;
      start[i * 2 + 1] = cy + Math.sin(ang) * rad * CLOUD_Y;

      // the wave. Biased so more motes leave early than late — the name reads
      // sooner, and the stragglers are what makes it feel hand-made rather than
      // switched on. (Math.random()**1.6 skews toward 0.)
      delay[i] = Math.pow(Math.random(), 1.6) * STAGGER;

      off[i]   = Math.random() * 6.283;
      size[i]  = 1.7 + Math.random() * 2.6;
      depth[i] = 0.55 + Math.random() * 0.75;   // fake z — near motes bigger and brighter
    }

    geo?.dispose();
    geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aStart', new THREE.BufferAttribute(start, 2));
    geo.setAttribute('aDelay', new THREE.BufferAttribute(delay, 1));
    geo.setAttribute('aOff', new THREE.BufferAttribute(off, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('aDepth', new THREE.BufferAttribute(depth, 1));

    if (points) { scene.remove(points); }
    points = new THREE.Points(geo, material);
    points.frustumCulled = false;              // positions live in the shader; the bounds are a lie
    scene.add(points);
  }

  function resizeRenderer() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setPixelRatio(DPR);
    renderer.setSize(w, h, false);
  }

  /* ---- the crisp headline, driven by the SAME progress as the motes -------
     This is the whole point of the rebuild. Before, the text had its own CSS
     transition on its own clock, so on a slow first paint the letters could
     arrive before the cloud had formed them — the two layers drifted apart and
     the assembly read as a wipe. Now one `p` writes both, so the text can only
     ever resolve OUT of the motes that are drawing it.

     Written every frame, NOT quantised: beat4 quantised because each step cost
     a full canvas redraw, but `opacity` on a DOM element is compositor-only —
     free, and stepping it in chunks is what made the handover look notchy. */
  function setTextProgress(p) {
    const a = Math.max(0, Math.min(1, (p - TEXT_FROM) / (1 - TEXT_FROM)));
    nameEl.style.opacity = String(a * a * (3 - 2 * a));
  }

  let started = false, hidden = false, raf = 0, finished = false;

  function start() {
    const pts = sampleName();
    if (!pts) return;                          // couldn't read the headline → leave it alone
    build(pts);
    resizeRenderer();

    if (reduced) {                             // one settled frame: text present, motes quiet
      uni.uProgress.value = 1; uni.uTime.value = 3;
      nameEl.style.opacity = '1';
      renderer.render(scene, camera);
      return;
    }

    nameEl.style.transition = 'none';          // we own this opacity now, frame by frame
    nameEl.style.opacity = '0';
    started = true;
    const t0 = performance.now();

    const loop = (now) => {
      if (hidden) { raf = requestAnimationFrame(loop); return; }
      const t = (now - t0) / 1000;
      uni.uTime.value = t;

      const p = Math.min(1, t / DURATION);
      uni.uProgress.value = p;
      setTextProgress(p);
      renderer.render(scene, camera);

      // The cloud resolves to nothing, so once it's home there is literally
      // nothing left to draw — stop, and give the memory back: ~1MB of mote
      // attributes and a GL context have no business outliving a 3.2s intro.
      if (p >= 1) {
        raf = 0; finished = true;
        renderer.clear();
        geo?.dispose(); material.dispose(); renderer.dispose();
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }

  /* ---- wiring ----------------------------------------------------------- */
  let tabAway = false, screenLive = false;
  const settle = () => { hidden = tabAway || screenLive; };

  document.addEventListener('visibilitychange', () => { tabAway = document.hidden; settle(); });
  // a framed film runs its own WebGL context and rAF — stand down while it plays
  document.addEventListener('sr:live', e => { screenLive = !!e.detail?.live; settle(); });

  if (!reduced) {
    addEventListener('pointermove', (e) => {
      const nx = (e.clientX / innerWidth) * 2 - 1;
      const ny = (e.clientY / innerHeight) * 2 - 1;
      uni.uMouse.value.set(nx, -ny);
    }, { passive: true });
  }

  let rz;
  addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => {
      // after settle everything is disposed and nothing will ever draw again —
      // resampling the glyphs and rebuilding 24k motes here was pure dead work
      if (finished) return;
      resizeRenderer();
      if (!started) return;
      const pts = sampleName();                // re-target: the headline reflowed
      if (pts) build(pts);
    }, 220);
  });

  // fonts must be settled before we trace the glyphs, or we sample the fallback
  (document.fonts?.ready ?? Promise.resolve()).then(start).catch(start);
}
