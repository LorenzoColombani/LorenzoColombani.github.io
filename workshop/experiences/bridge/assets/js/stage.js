/* ============================================================
   THE BRIDGE — camera department.
   One renderer, one composer: Render → UnrealBloom → Output(ACES)
   → Film pass (grain · vignette · chromatic aberration).
   Slow gaze rig + dolly; adaptive quality governor.
   ============================================================ */
window.FILM = window.FILM || {};
FILM.stage = (function () {
  'use strict';
  var renderer, composer, bloom, filmPass, scene, camera, rig;
  var tickFns = [], preRenderFns = [];
  var clock = { t: 0 };
  var gaze = { x: 0, y: 0, tx: 0, ty: 0, on: true };
  var quality = { level: 0, mult: 1, dprCap: 1.5, acc: 0, frames: 0 };
  var dolly = { z: 8 };
  /* conductor-driven camera program: lateral/crane offsets, dutch roll,
     fov (dolly-zoom / punch-ins) and impact shake */
  var cam = { x: 0, y: 0, roll: 0, fov: 55, shake: 0 };

  var FilmShader = {
    uniforms: {
      tDiffuse: { value: null },
      uTime:  { value: 0 },
      uGrain: { value: 0.03 },
      uVig:   { value: 0.42 },
      uCA:    { value: 0.55 }
    },
    vertexShader:
      'varying vec2 vUv;' +
      'void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:
      'uniform sampler2D tDiffuse;uniform float uTime,uGrain,uVig,uCA;varying vec2 vUv;' +
      'float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}' +
      'void main(){' +
      '  vec2 c=vUv-.5;float r2=dot(c,c);' +
      /* ≤2px separation at the very corners, sub-pixel mid-frame — any more
         and 1px sparks split into red/green "confetti" (gold = R+G) */
      '  vec2 off=c*uCA*r2*0.004;' +
      '  vec3 col;' +
      '  col.r=texture2D(tDiffuse,vUv+off).r;' +
      '  col.g=texture2D(tDiffuse,vUv).g;' +
      '  col.b=texture2D(tDiffuse,vUv-off).b;' +
      '  float g=hash(vUv*vec2(1621.,907.)+fract(uTime)*61.7)-.5;' +
      '  col+=g*uGrain;' +
      '  col*=1.-uVig*smoothstep(.12,.72,r2);' +
      '  gl_FragColor=vec4(col,1.);}'
  };

  function init(canvas) {
    if (!window.THREE) return false;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvas, antialias: false, alpha: false,
        powerPreference: 'high-performance', stencil: false
      });
    } catch (e) { return false; }
    if (!renderer.getContext()) return false;

    var coarse = document.documentElement.classList.contains('coarse');
    /* phones start SHARP (client, 2026-07-10: 1.25 on a dpr-3 iPhone rendered
       the portals at 41% linear res — "degraded"). The govern ladder still
       steps down to 1.15/mult .55 if the device can't sustain it. */
    quality.dprCap = coarse ? Math.min(2, devicePixelRatio || 1.5) : 1.5;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x04060c);

    camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);
    rig = new THREE.Group();
    rig.add(camera);
    scene.add(rig);
    camera.position.set(0, 0, dolly.z);

    composer = new THREE.EffectComposer(renderer);
    composer.addPass(new THREE.RenderPass(scene, camera));
    bloom = new THREE.UnrealBloomPass(new THREE.Vector2(1, 1), 0.65, 0.8, 0.62);
    composer.addPass(bloom);
    composer.addPass(new THREE.OutputPass());
    filmPass = new THREE.ShaderPass(FilmShader);
    composer.addPass(filmPass);

    resize();
    addEventListener('resize', resize, { passive: true });
    addEventListener('pointermove', function (e) {
      if (!gaze.on) return;
      gaze.tx = (e.clientX / innerWidth - 0.5) * 2;
      gaze.ty = (e.clientY / innerHeight - 0.5) * 2;
    }, { passive: true });

    gsap.ticker.add(frame);
    return true;
  }

  function resize() {
    var w = innerWidth, h = innerHeight;
    var dpr = Math.min(quality.dprCap, devicePixelRatio || 1);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h);
    composer.setSize(w, h);
    /* bloom sizes in CSS px — a phone buffer holds ~1/4 the pixels the look
       was graded on, and the pass's fixed-pixel kernels smear the portal
       ring into a frame-wide veil (round 3 A/B: desktop crisp, phone
       washed). Coarse sizes from the drawing buffer; desktop untouched. */
    if (document.documentElement.classList.contains('coarse')) {
      bloom.setSize(w * dpr * 0.5, h * dpr * 0.5);
    } else {
      bloom.setSize(w * 0.5, h * 0.5);
    }
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  /* adaptive quality: sustained >22ms → step down DPR, then particle mult */
  function govern(dtMs) {
    quality.acc += dtMs; quality.frames++;
    if (quality.frames < 90) return;
    var avg = quality.acc / quality.frames;
    quality.acc = 0; quality.frames = 0;
    if (avg > 22 && quality.level < 2) {
      quality.level++;
      var coarse = document.documentElement.classList.contains('coarse');
      /* coarse floors (client, 2026-07-10): the old level-1 drop to 1.15 undercut
         even the pre-fix 1.25 phone cap — degraded portals. Phones degrade
         gently and keep more of the spectacle. */
      if (quality.level === 1) { quality.dprCap = coarse ? 1.5 : 1.15; }
      if (quality.level === 2) {
        quality.mult = coarse ? 0.75 : 0.55;
        if (FILM.realms) FILM.realms.requality(quality.mult);
      }
      resize();
    }
  }

  function frame(time, dtMs) {
    if (document.hidden) return;
    var dt = Math.min(0.05, dtMs / 1000);
    clock.t += dt;
    /* gaze easing — a camera operator, not a mouse cursor */
    gaze.x += (gaze.tx - gaze.x) * 0.03;
    gaze.y += (gaze.ty - gaze.y) * 0.03;
    rig.rotation.y = -gaze.x * 0.035;
    rig.rotation.x = -gaze.y * 0.025;
    var shX = 0, shY = 0;
    if (cam.shake > 0.001) {
      shX = (Math.random() - 0.5) * cam.shake;
      shY = (Math.random() - 0.5) * cam.shake;
    }
    rig.position.x = cam.x + shX;
    rig.position.y = cam.y + shY;
    camera.rotation.z = cam.roll;
    if (Math.abs(camera.fov - cam.fov) > 0.01) {
      camera.fov = cam.fov;
      camera.updateProjectionMatrix();
    }
    camera.position.z = dolly.z;

    for (var i = 0; i < tickFns.length; i++) tickFns[i](clock.t, dt);
    for (var j = 0; j < preRenderFns.length; j++) preRenderFns[j](clock.t);

    filmPass.uniforms.uTime.value = clock.t;
    composer.render();
    govern(dtMs);
  }

  return {
    init: init,
    scene: function () { return scene; },
    camera: function () { return camera; },
    rig: function () { return rig; },
    renderer: function () { return renderer; },
    time: function () { return clock.t; },
    dolly: dolly,
    cam: cam,
    quality: quality,
    onTick: function (fn) { tickFns.push(fn); },
    beforeRender: function (fn) { preRenderFns.push(fn); },
    setBloom: function (strength, threshold) {
      if (!bloom) return;
      if (strength != null) bloom.strength = strength;
      if (threshold != null) bloom.threshold = threshold;
    },
    setGrain: function (v) { if (filmPass) filmPass.uniforms.uGrain.value = v; },
    setGaze: function (on) { gaze.on = on; if (!on) { gaze.tx = gaze.ty = 0; } },
    setBackground: function (hex) { if (scene) scene.background.setHex(hex); }
  };
})();
