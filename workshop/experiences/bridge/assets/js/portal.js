/* ============================================================
   THE BRIDGE — the portals.
   Counter-rotating golden spark annulus (GPU points) + a disc
   that is a live window into the NEXT realm (render-to-texture,
   sampled in screen space). Ring opens, breathes, then swallows
   the frame as the camera punches through. Sound cues fire on
   the exact animation beats (see assets/audio/CREDITS.md).
   ============================================================ */
window.FILM = window.FILM || {};
FILM.portal = (function () {
  'use strict';
  var N = 12000;   /* patch 1: +2k points — a fuller MCU spark spray (client) */
  var group, ring, disc, glow, rt, rtCamera, scenePrep;
  var state = { R: 0, A: 0, active: false, rtLive: false };
  var uRes = new THREE.Vector2(1, 1);
  var inited = false, sideToggle = 1;

  var RING_VERT = [
    'attribute vec4 aSeed;',
    'uniform float uTime,uR,uA,uPR;',
    'varying vec3 vColor;varying float vAlpha;',
    'void main(){',
    '  float s1=aSeed.x,s2=aSeed.y,s3=aSeed.z,s4=aSeed.w;',
    '  float band=step(.5,s2);',
    '  float dir=mix(1.,-1.,band);',
    '  float ang=s1*6.283+dir*uTime*mix(1.6,2.8,s3);',
    '  float rBase=uR*mix(1.,.93,band);',
    '  float jit=sin(ang*17.+uTime*9.+s4*40.)*(uR*.022+.05)',
    '           +sin(ang*39.-uTime*13.+s4*17.)*(uR*.012);',
    '  float r=rBase+jit;',
    '  float alpha=mix(.55,1.,s3);',
    '  if(s4<.30){',                       /* ember shower flying off the ring —
                                              share .22→.30 and reach 1.15→1.3
                                              ("more sparkles, like in the MCU") */
    '    float ph=fract(uTime*(.45+s3*.7)+s1*7.);',
    '    r=rBase+ph*ph*uR*1.3;',
    '    alpha*=(1.-ph)*(1.-ph);',
    '  }',
    '  vec3 pos=vec3(cos(ang)*r,sin(ang)*r*.985,(s3-.5)*uR*.05);',
    '  vec4 mv=modelViewMatrix*vec4(pos,1.);',
    '  float core=step(.86,s3);',
    '  vColor=mix(mix(vec3(1.,.42,.08),vec3(1.,.72,.28),s3)*1.15,vec3(1.25,1.05,.8)*1.6,core);',
    '  vAlpha=alpha*uA*.55;',
    '  gl_PointSize=clamp(mix(2.5,6.,s3)*uPR*clamp(uR*.28,.45,1.3)*(15./-mv.z),1.,22.);',
    '  gl_Position=projectionMatrix*mv;',
    '}'
  ].join('\n');
  var RING_FRAG = [
    'varying vec3 vColor;varying float vAlpha;',
    'void main(){',
    '  float d=length(gl_PointCoord-.5);',
    '  float a=smoothstep(.5,.05,d)*vAlpha;',
    '  if(a<.004)discard;',
    '  gl_FragColor=vec4(vColor*a,a);',
    '}'
  ].join('\n');

  var DISC_VERT = [
    'varying vec2 vLocal;',
    'void main(){vLocal=position.xy;',
    '  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}'
  ].join('\n');
  var DISC_FRAG = [
    'uniform sampler2D tMap;uniform vec2 uRes;uniform float uTime,uDim;uniform vec3 uTintCol;',
    'varying vec2 vLocal;',
    'void main(){',
    '  vec2 suv=gl_FragCoord.xy/uRes;',
    '  float r=length(vLocal);',
    '  float rim=smoothstep(.72,1.,r);',
    '  suv+=vec2(sin(suv.y*70.+uTime*7.),cos(suv.x*70.-uTime*6.))*rim*.007;',
    '  vec3 col=texture2D(tMap,suv).rgb*uDim;',
    '  col=mix(col,col*1.2+uTintCol*.05,rim*.85);',
    '  col+=vec3(1.,.5,.12)*smoothstep(.88,1.,r)*.35;',
    '  gl_FragColor=vec4(col,1.);',
    '}'
  ].join('\n');

  /* spark point-ratio: desktop keeps its original expression exactly.
     Phones size sparks for the ring's on-screen scale — the grain was
     graded on ~950 CSS-px-tall frames; a 400px-tall frame shows the same
     ring 2.4× smaller, and full-size sparks fuse into a solid band
     (round 3 A/B: the halo). Refreshed on resize + every prepDest. */
  function ringPR() {
    if (!document.documentElement.classList.contains('coarse')) {
      return Math.min(1.5, devicePixelRatio || 1);
    }
    return FILM.stage.renderer().getPixelRatio() *
           Math.max(0.5, Math.min(1, innerHeight / 950));
  }

  function init() {
    if (inited) return;
    inited = true;
    var cam = FILM.stage.camera();
    group = new THREE.Group();
    group.position.set(0, 0, -13);
    cam.add(group);

    /* ring */
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    var seeds = new Float32Array(N * 4);
    for (var i = 0; i < N * 4; i++) seeds[i] = Math.random();
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
    /* phones: the same 12k additive sparks pack a ring 2.4× smaller —
       the stack clips white and feeds the bloom veil (round 3 A/B).
       60% count still reads ~1.5× the desktop spray density. */
    if (document.documentElement.classList.contains('coarse')) geo.setDrawRange(0, 7200);
    var rmat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uR: { value: 0 }, uA: { value: 0 },
                  uPR: { value: ringPR() } },
      vertexShader: RING_VERT, fragmentShader: RING_FRAG,
      transparent: true, depthWrite: false, depthTest: false,
      blending: THREE.AdditiveBlending
    });
    ring = new THREE.Points(geo, rmat);
    ring.frustumCulled = false;
    ring.renderOrder = 100;

    /* destination window */
    rt = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType });
    rtCamera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);
    rtCamera.position.set(0, 0, 8);
    scenePrep = new THREE.Scene();
    var dmat = new THREE.ShaderMaterial({
      uniforms: { tMap: { value: rt.texture }, uRes: { value: uRes }, uDim: { value: 0.6 },
                  uTime: { value: 0 }, uTintCol: { value: new THREE.Color(0xffa94d) } },
      vertexShader: DISC_VERT, fragmentShader: DISC_FRAG,
      transparent: true,           /* joins the transparent pass so renderOrder rules:
                                      realm points (0) → glow (90) → disc (95) → ring (100) */
      depthWrite: false, depthTest: false
    });
    disc = new THREE.Mesh(new THREE.CircleGeometry(1, 72), dmat);
    disc.renderOrder = 95;
    disc.visible = false;

    glow = new THREE.Sprite(new THREE.SpriteMaterial({
      /* per-pixel, not createRadialGradient — Safari dithers canvas
         gradients into "confetti" speckle on big additive glows
         (same fix as realms.js getGlowTex; stops preserved exactly) */
      map: (function () { var cv = document.createElement('canvas'); cv.width = cv.height = 128;
        var g = cv.getContext('2d'); var img = g.createImageData(128, 128), d = img.data;
        for (var y = 0; y < 128; y++) for (var x = 0; x < 128; x++) {
          var dx = (x + 0.5 - 64) / 64, dy = (y + 0.5 - 64) / 64;
          var r = Math.sqrt(dx * dx + dy * dy), k, cR, cG, cB, a;
          if (r >= 1) { cR = 255; cG = 120; cB = 26; a = 0; }
          else if (r < 0.55) { k = r / 0.55;
            cR = 255; cG = 170 + (120 - 170) * k; cB = 80 + (26 - 80) * k; a = 0.9 + (0.28 - 0.9) * k; }
          else { k = (r - 0.55) / 0.45; cR = 255; cG = 120; cB = 26; a = 0.28 * (1 - k); }
          var i = (y * 128 + x) * 4;
          d[i] = cR; d[i + 1] = Math.round(cG); d[i + 2] = Math.round(cB); d[i + 3] = Math.round(a * 255);
        }
        g.putImageData(img, 0, 0);
        return new THREE.CanvasTexture(cv); })(),
      transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
      depthWrite: false, depthTest: false
    }));
    glow.renderOrder = 90;

    group.add(glow); group.add(disc); group.add(ring);

    resize();
    addEventListener('resize', resize, { passive: true });

    FILM.stage.onTick(function (t) {
      rmat.uniforms.uTime.value = t;
      rmat.uniforms.uR.value = state.R;
      rmat.uniforms.uA.value = state.A;
      dmat.uniforms.uTime.value = t;
      disc.scale.set(state.R * 0.985, state.R * 0.985, 1);
      var gs = Math.min(state.R * 1.55, 10.5);
      glow.scale.set(gs, gs, 1);
      glow.material.opacity = Math.min(0.16, state.A * 0.16) * Math.min(1, state.R / 4);
    });
    FILM.stage.beforeRender(function () {
      if (!state.rtLive) return;
      var r = FILM.stage.renderer();
      rtCamera.aspect = FILM.stage.camera().aspect;
      rtCamera.updateProjectionMatrix();
      r.setRenderTarget(rt);
      r.render(scenePrep, rtCamera);
      r.setRenderTarget(null);
    });
  }

  function resize() {
    /* keep it simple & correct: query the real drawing buffer */
    var db = FILM.stage.renderer().getDrawingBufferSize(new THREE.Vector2());
    /* the disc window sizes in CSS px — on a dpr-3 phone that leaves the
       punch-through at ~25% linear res (round 3: "portal degraded").
       Coarse sizes from the drawing buffer; desktop formula untouched. */
    var w, h;
    if (document.documentElement.classList.contains('coarse')) {
      w = Math.max(2, Math.floor(db.x * 0.5)); h = Math.max(2, Math.floor(db.y * 0.5));
    } else {
      w = Math.max(2, Math.floor(innerWidth * 0.5)); h = Math.max(2, Math.floor(innerHeight * 0.5));
    }
    rt.setSize(w, h);
    if (ring) ring.material.uniforms.uPR.value = ringPR();
    uRes.copy(db);
  }

  function prepDest(destKey, xOff) {
    var dest = FILM.realms.prep(destKey);
    /* evict stale realm groups — odd seek patterns must never leave a
       previous destination haunting the disc */
    for (var i = scenePrep.children.length - 1; i >= 0; i--) scenePrep.remove(scenePrep.children[i]);
    scenePrep.add(dest.group);
    scenePrep.background = new THREE.Color(dest.def.bg);
    disc.material.uniforms.uTintCol.value.setHex(dest.def.colors[0]);
    /* sparse-dim worlds (gamemaster's orbs, storyteller's rows) die under
       0.6 in a ~300px phone disc — the desktop-sized window forgives what
       the small one can't (round 4b, the client's placement observation).
       Desktop keeps its approved 0.6; the swallow tween ramps from here. */
    disc.material.uniforms.uDim.value =
      document.documentElement.classList.contains('coarse') ? 0.78 : 0.6;
    resize();
    /* the disc grammar: legacy desktop = uPR 1.5 into a CSS·0.5 target
       (points 3× relative-fat — the approved preview look). Scale that
       constant to the actual RT so phones read the same preview at the
       sharp resolution; the swap's attachMain restores main grain. */
    FILM.realms.setGrain(destKey, 1.5 * (rt.width / (innerWidth * 0.5)));
    group.position.x = xOff;
    state.active = true; state.rtLive = true; disc.visible = true;
  }
  function makeSwap(destKey) {
    return function () {
      FILM.realms.attachMain(destKey);
      state.rtLive = false; disc.visible = false;
      /* the crackle no longer dies here (the swap) — it rides the swallow and
         fades across the landing settle; see transitionTo (Lorenzo, 2026-07-08:
         "the sfx stops before the transition is over") */
      FILM.audio.play('boom-big', { offset: 1.4 });
    };
  }
  function addCameraPunch(tl, at, dir) {
    var C = FILM.stage.cam;
    tl.to(C, { keyframes: [{ fov: 51.5, duration: 0.22, ease: 'power3.in' },
                           { fov: 55, duration: 1.1, ease: 'power2.out' }] }, at);
    tl.to(C, { keyframes: [{ roll: dir * 0.022, duration: 0.3 },
                           { roll: 0, duration: 1.2, ease: 'sine.out' }] }, at);
    tl.to(C, { keyframes: [{ shake: 0.3, duration: 0.1 },
                           { shake: 0, duration: 0.7, ease: 'power2.out' }] }, at);
  }
  function addFireworks(tl, at) {
    [0, 0.55, 1.25].forEach(function (o, i) {
      tl.call(function () {
        FILM.audio.play('fireworks', { gain: 0.3 + i * 0.08, rate: 0.9 + i * 0.12 });
      }, null, at + o);
    });
  }
  function addSwallow(tl, at, destKey, dir) {
    var A = FILM.audio, C = FILM.stage.cam;
    tl.call(function () { A.play('portal-through'); }, null, at);
    tl.to(disc.material.uniforms.uDim, { value: 1, duration: 0.7, ease: 'power2.in' }, at);
    tl.to(state, { R: 46, duration: 0.85, ease: 'power4.in' }, at);
    tl.to(['#matte-top', '#matte-bot'], { height: '13vh', duration: 0.5, ease: 'power3.in' }, at);
    tl.to(C, { keyframes: [{ roll: -dir * 0.045, duration: 0.5, ease: 'power2.in' },
                           { roll: 0, duration: 0.8, ease: 'back.out(1.6)' }] }, at + 0.1);
    tl.call(makeSwap(destKey), null, at + 0.62);
    tl.to(C, { keyframes: [{ shake: 0.6, duration: 0.07 },
                           { shake: 0, duration: 0.85, ease: 'power3.out' }] }, at + 0.62);
    tl.to(state, { A: 0, duration: 0.35, ease: 'power1.out' }, at + 0.62);
    tl.set(state, { R: 0 }, at + 1.05);
    tl.to(['#matte-top', '#matte-bot'], { height: '11vh', duration: 0.6, ease: 'power2.out' }, at + 0.85);
    return at + 1.5;
  }

  /* ONE portal grammar for the whole film (art direction: consistency
     over variety — only the destination palette changes). The score
     never stops: it dips politely and comes right back. */
  function transitionTo(destKey) {
    init();
    var A = FILM.audio;
    var tl = gsap.timeline();
    sideToggle *= -1;
    var xOff = sideToggle * 1.9, dir = sideToggle;

    tl.call(function () {
      prepDest(destKey, xOff);
      A.duck(2.6, 0.42);                                   /* dip, never drop */
      A.play('reverse-suck', { offset: 7.4, gain: 0.35, dur: 2.4 });
    }, null, 0);
    tl.to(['#matte-top', '#matte-bot'], { height: '11vh', duration: 0.6, ease: 'power2.inOut' }, 0);
    /* ignition */
    tl.call(function () {
      A.play('portal-burst', { gain: 0.8 });
      A.play('thunder-rumble', { gain: 0.55 });
    }, null, 0.45);
    tl.to(state, { A: 1, duration: 0.2 }, 0.45);
    tl.to(state, { keyframes: [
      { R: 0.55, duration: 0.14, ease: 'power2.out' },
      { R: 0.25, duration: 0.1 },
      { R: 0.9, duration: 0.14, ease: 'power2.out' }
    ] }, 0.45);
    /* bloom */
    tl.call(function () { A.play('portal-open'); A.loop('portal-crackle', { gain: 0.8 }); }, null, 0.83);
    tl.to(state, { R: 5.7, duration: 0.85, ease: 'power4.out' }, 0.83);
    addCameraPunch(tl, 0.83, dir);
    addFireworks(tl, 1.0);
    /* breathe & behold the destination */
    tl.to(state, { R: 6.0, duration: 1.0, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 1.7);
    /* punch through & land */
    var end = addSwallow(tl, 3.35, destKey, dir);
    /* the suite covers the FULL travel: the crackle sustains through the
       swallow and fades out across the landing settle, silent just past the
       boom — never cut at the swap beat */
    tl.call(function () { A.stopLoop('portal-crackle', 0.5); }, null, end - 0.4);
    tl.set({}, {}, end); /* pin the timeline's duration to the landing */
    return tl;
  }

  /* small stinger portal — opens onto a quiet ember world, never swallows */
  function open(destKey, radius) {
    init();
    var tl = gsap.timeline();
    tl.call(function () {
      var dest = FILM.realms.prep(destKey || 'embers');
      scenePrep.add(dest.group);
      scenePrep.background = new THREE.Color(dest.def.bg);
      disc.material.uniforms.uTintCol.value.setHex(0xffa94d);
      disc.material.uniforms.uDim.value =
        document.documentElement.classList.contains('coarse') ? 0.78 : 0.6;
      resize();
      /* same disc-grammar scaling as prepDest — the tag's window world */
      FILM.realms.setGrain(destKey || 'embers', 1.5 * (rt.width / (innerWidth * 0.5)));
      group.position.x = 0;
      state.active = true; state.rtLive = true; disc.visible = true;
      FILM.audio.play('mini-crackle');
      FILM.audio.loop('portal-crackle', { gain: 0.5 });
    }, null, 0);
    tl.to(state, { A: 1, duration: 0.25, ease: 'power2.in' }, 0);
    /* the family's stutter-ignition, scaled to the tag — same grammar as the
       six travel portals (transitionTo's 0.45–0.83 beat): the gathered embers
       visibly CATCH before the bloom. No thunder, no fireworks — the epilogue
       whispers (Lorenzo, 2026-07-08). */
    tl.call(function () { FILM.audio.play('portal-burst', { gain: 0.35 }); }, null, 0.05);
    tl.to(state, { keyframes: [
      { R: 0.35, duration: 0.14, ease: 'power2.out' },
      { R: 0.18, duration: 0.1 },
      { R: 0.5, duration: 0.14, ease: 'power2.out' }
    ] }, 0.05);
    tl.to(state, { R: 2.6, duration: 0.9, ease: 'power4.out' }, 0.45);
    return tl;
  }
  function close() {
    var tl = gsap.timeline();
    tl.to(state, { R: 0.01, A: 0, duration: 0.6, ease: 'power3.in' }, 0);
    tl.call(function () {
      state.rtLive = false; disc.visible = false; state.active = false;
      FILM.audio.stopLoop('portal-crackle', 0.4);
    }, null, 0.6);
    return tl;
  }

  /* hard reset for chapter seeks — zero the values but NEVER kill the
     tweens: they live nested inside the master timeline and must survive
     to play again (killTweensOf would remove them permanently) */
  function reset() {
    if (!inited) return;
    state.R = 0; state.A = 0; state.rtLive = false; state.active = false;
    if (disc) disc.visible = false;
    if (scenePrep) for (var i = scenePrep.children.length - 1; i >= 0; i--) scenePrep.remove(scenePrep.children[i]);
    FILM.audio.stopLoop('portal-crackle', 0.1);
  }

  return { transitionTo: transitionTo, open: open, close: close, reset: reset, init: init };
})();
