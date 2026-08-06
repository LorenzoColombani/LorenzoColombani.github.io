/* hero.js — the cold open.
   Gold motes scatter, assemble into the name, then disperse into an ambient
   field as the REAL text cross-fades in (so the headline stays real text:
   selectable, accessible, indexable — the particles are the performance).

   All motion lives in the vertex shader: the CPU writes nothing per frame,
   so the mote count is effectively free.  Design-library: "GPU flow-mote field". */

import * as THREE from 'three';

const ASSEMBLE = 2.3;   // s — scatter → name
const HOLD     = 0.7;   // s — the name stands assembled
const DISPERSE = 2.0;   // s — motes drift out, real text arrives

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

    const off = document.createElement('canvas');
    off.width = bw; off.height = bh;
    const ctx = off.getContext('2d', { willReadFrequently: true });
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#fff';

    lines.forEach(({ el, r, cs }) => {
      const fs = parseFloat(cs.fontSize);
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
      // baseline sits inside the line box: half the leading, then the ascent
      const baseline = (r.top - host.top - box.y0) + (r.height + fs * 0.72) / 2;
      ctx.fillText(el.textContent, (r.left - host.left) - box.x0, baseline);
    });

    const { data } = ctx.getImageData(0, 0, bw, bh);
    const pts = [];
    for (let y = 0; y < bh; y++) {
      for (let x = 0; x < bw; x++) {
        if (data[(y * bw + x) * 4 + 3] > 110) {
          pts.push((box.x0 + x) / host.width, 1 - (box.y0 + y) / host.height);
        }
      }
    }
    return pts.length > 200 ? pts : null;
  }

  /* ---- geometry --------------------------------------------------------- */
  let points = null, geo = null;
  const uni = {
    uTime:     { value: 0 },
    uConverge: { value: 0 },
    uDisperse: { value: 0 },
    uDPR:      { value: DPR },
    uMouse:    { value: new THREE.Vector2(0, 0) },
    uAspect:   { value: 1 }
  };

  const material = new THREE.ShaderMaterial({
    uniforms: uni,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    vertexShader: /* glsl */`
      attribute vec2 aStart;      // where a mote waits before the assembly
      attribute vec2 aAmbient;    // where it drifts once the name is released
      attribute float aOff;       // per-mote phase
      attribute float aSize;
      uniform float uTime, uConverge, uDisperse, uDPR, uAspect;
      uniform vec2  uMouse;
      varying float vAlpha;
      void main() {
        vec2 named = mix(aStart, position.xy, uConverge);
        vec2 p     = mix(named, aAmbient, uDisperse);

        // drift: wide while scattered, ~nil while the name is held, gentle after
        float drift = mix(0.045, 0.0015, uConverge) + uDisperse * 0.012;
        p += vec2(sin(uTime * 0.42 + aOff), cos(uTime * 0.33 + aOff * 1.7)) * drift;
        p += uMouse * mix(0.010, 0.028, uDisperse);              // parallax

        // dim while scattered, full as it lands, quiet once released
        float lit = 0.20 + 0.80 * uConverge * uConverge;
        vAlpha = lit * mix(1.0, 0.24, uDisperse);

        gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
        float size = aSize * uDPR * mix(1.9, 1.25, uConverge) * mix(1.0, 1.4, uDisperse);
        gl_PointSize = clamp(size, 1.0, 22.0);                   // never a screen-filling blur
      }`,
    fragmentShader: /* glsl */`
      precision mediump float;
      varying float vAlpha;
      void main() {
        vec2 q = gl_PointCoord - 0.5;
        float d = length(q);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.02, d) * vAlpha;
        // over-driven gold: additive overlap then accumulates into a glow
        // instead of averaging out to grey grit
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

    const pos = new Float32Array(N * 3);
    const start = new Float32Array(N * 2);
    const amb = new Float32Array(N * 2);
    const off = new Float32Array(N);
    const size = new Float32Array(N);

    for (let i = 0; i < N; i++) {
      const s = ((i * stride) % available) * 2;
      const tx = pts[s], ty = pts[s + 1];
      pos[i * 3] = tx; pos[i * 3 + 1] = ty; pos[i * 3 + 2] = 0;

      const ang = Math.random() * Math.PI * 2;
      const rad = 0.35 + Math.random() * 0.75;
      start[i * 2]     = tx + Math.cos(ang) * rad;
      start[i * 2 + 1] = ty + Math.sin(ang) * rad * 0.62;

      const a2 = Math.random() * Math.PI * 2;
      const r2 = 0.10 + Math.random() * 0.45;
      amb[i * 2]     = tx + Math.cos(a2) * r2;
      amb[i * 2 + 1] = ty + Math.sin(a2) * r2 * 0.7;

      off[i] = Math.random() * 6.283;
      size[i] = 1.7 + Math.random() * 2.6;
    }

    geo?.dispose();
    geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aStart', new THREE.BufferAttribute(start, 2));
    geo.setAttribute('aAmbient', new THREE.BufferAttribute(amb, 2));
    geo.setAttribute('aOff', new THREE.BufferAttribute(off, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));

    if (points) { scene.remove(points); }
    points = new THREE.Points(geo, material);
    points.frustumCulled = false;              // positions live in the shader; the bounds are a lie
    scene.add(points);
  }

  function resizeRenderer() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setPixelRatio(DPR);
    renderer.setSize(w, h, false);
    uni.uAspect.value = h ? w / h : 1;
  }

  /* ---- the real text: hidden only once the motes can actually draw ------ */
  const showText = (dur) => {
    nameEl.style.transition = `opacity ${dur}s cubic-bezier(.22,.61,.36,1)`;
    nameEl.style.opacity = '1';
  };
  const hideText = () => {
    nameEl.style.transition = 'none';
    nameEl.style.opacity = '0';
  };

  let started = false, hidden = false, raf = 0;

  function start() {
    const pts = sampleName();
    if (!pts) return;                          // couldn't read the headline → leave it alone
    build(pts);
    resizeRenderer();

    if (reduced) {                             // one settled frame: text present, motes quiet
      uni.uConverge.value = 1; uni.uDisperse.value = 1; uni.uTime.value = 3;
      renderer.render(scene, camera);
      return;
    }

    hideText();
    started = true;
    const t0 = performance.now();
    let textBack = false;

    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      if (hidden) return;
      const t = (now - t0) / 1000;
      uni.uTime.value = t;

      const c = Math.min(1, t / ASSEMBLE);
      uni.uConverge.value = c * c * (3 - 2 * c);                       // smoothstep in

      const d = Math.min(1, Math.max(0, (t - ASSEMBLE - HOLD) / DISPERSE));
      uni.uDisperse.value = d * d * (3 - 2 * d);

      // the crisp name resolves OUT of the cloud — the motes are still landing
      // when the real letters arrive, so it never reads as sandpaper text
      if (!textBack && t > ASSEMBLE * 0.78) { textBack = true; showText(1.1); }

      renderer.render(scene, camera);
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
      resizeRenderer();
      if (!started) return;
      const pts = sampleName();                // re-target: the headline reflowed
      if (pts) build(pts);
    }, 220);
  });

  // fonts must be settled before we trace the glyphs, or we sample the fallback
  (document.fonts?.ready ?? Promise.resolve()).then(start).catch(start);
}
