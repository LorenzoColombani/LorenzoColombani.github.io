import * as THREE from 'three';

const FULL_RADIUS = 2.55;
const TRACE_START = .005;
const TRACE_END = TRACE_START + .8 / 6;
const APERTURE_FULL = .16;
const WHEEL_SPEED = 1.25;
// 3,500 particles / 10,988 transformed vertices on desktop;
// 1,800 particles / 5,785 vertices below 700 CSS pixels.
const DESKTOP = { grain: 2524, ember: 720, filament: 144, dust: 112 };
const MOBILE = { grain: 1293, ember: 375, filament: 80, dust: 52 };

const common = `
  uniform float uTime, uRadius, uAlpha, uPixelRatio, uHeight, uTrace, uMotion, uAperture, uOrbit, uPhase, uRibbonCap;
  const float TAU = 6.28318530718;
  float turnAt(float angle) { return fract((angle + 1.570796327) / TAU); }
  float traced(float angle) {
    return mix(1. - smoothstep(uTrace - .012, uTrace + .008, turnAt(angle)),
               1., step(.999, uTrace));
  }
  float wheelRotation() { return uOrbit * ${WHEEL_SPEED} * TAU; }
  float orbitPhase(float layer) {
    float speed = mix(${WHEEL_SPEED}, 1.325, step(.5, layer));
    speed = mix(speed, 1.175, step(1.5, layer));
    float offset = mix(0., .29, step(.5, layer));
    offset = mix(offset, .63, step(1.5, layer));
    // The first leader uses the same unwrapped phase before and after closure.
    return uPhase + uOrbit * (speed - ${WHEEL_SPEED}) + offset * uAperture;
  }
  float ignition(float angle) {
    float delta = abs(turnAt(angle) - fract(orbitPhase(0.)));
    delta = min(delta, 1. - delta);
    return exp(-delta * delta * 3200.);
  }
  float sweptArc(float angle, float layer) {
    float behind = fract(orbitPhase(layer) - turnAt(angle));
    return (1. - smoothstep(.02, .17, behind)) * uAperture;
  }
  float circulation(float angle) {
    return sweptArc(angle, 0.) + sweptArc(angle, 1.) * .62 + sweptArc(angle, 2.) * .42;
  }
  float braid(float angle, float seed) {
    float localAngle = angle - wheelRotation();
    return sin(localAngle * 9. + uTime * .27 + seed * 23.) * .012
         + sin(localAngle * 23. - uTime * .31 + seed * 41.) * .005
         + sin(localAngle * 41. + uTime * .19 + seed * 17.) * .002;
  }
`;
const noise = `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float mist(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
    return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x),
               mix(hash(i + vec2(0., 1.)), hash(i + vec2(1.)), f.x), f.y);
  }
`;

// A physical doorway, drawn once by a travelling ignition. The caller moves
// the camera through the fixed aperture; the ring never scales toward it.
export function createBridgePortal({ scene }) {
  const group = new THREE.Group();
  group.name = 'The Bridge · living fire aperture';
  group.visible = false;
  scene.add(group);
  const uniforms = {
    uTime: { value: 0 }, uRadius: { value: 0 }, uAlpha: { value: 0 },
    uPixelRatio: { value: 1 }, uHeight: { value: 900 },
    uTrace: { value: 0 }, uMotion: { value: 1 }, uAperture: { value: 0 }, uOrbit: { value: 0 },
    uPhase: { value: 0 },
    uRibbonCap: { value: 4.2 },
  };
  const viewport = new THREE.Vector4(), materials = [], geometries = [];
  let radius = 0, disposed = false, smallViewport = null, randomState = 0x43b7ef21;
  let orbitStartedAt = null;
  let previousProgress = 0, previousLocalTime = 0;
  function random() {
    randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
    return randomState / 4294967296;
  }
  function seeds(count, instanced) {
    const values = new Float32Array(count * 4);
    for (let i = 0; i < values.length; i++) values[i] = random();
    return instanced ? new THREE.InstancedBufferAttribute(values, 4) : new THREE.BufferAttribute(values, 4);
  }
  function remember(geometry, bound) {
    // Shader-generated positions require authored bounds, not the source quad.
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), bound);
    geometries.push(geometry);
    return geometry;
  }
  function points(count, bound) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geometry.setAttribute('aSeed', seeds(count, false));
    geometry.setDrawRange(0, count);
    return remember(geometry, bound);
  }
  function ribbon(count, segments, bound) {
    const geometry = new THREE.InstancedBufferGeometry();
    const positions = new Float32Array((segments + 1) * 6);
    const indices = new Uint16Array(segments * 6);
    for (let i = 0; i <= segments; i++) {
      positions.set([i / segments, -1, 0, i / segments, 1, 0], i * 6);
      if (i < segments) indices.set([i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 2, i * 2 + 1, i * 2 + 3], i * 6);
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSeed', seeds(count, true));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.instanceCount = count;
    return remember(geometry, bound);
  }
  function material(vertexShader, fragmentShader, additive = true) {
    const result = new THREE.ShaderMaterial({
      uniforms, vertexShader, fragmentShader, transparent: true,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: false, depthTest: true, fog: false, toneMapped: false,
    });
    materials.push(result);
    return result;
  }
  function attach(object, name, order) {
    object.name = name; object.renderOrder = order;
    object.onBeforeRender = renderer => {
      renderer.getCurrentViewport(viewport);
      uniforms.uHeight.value = viewport.w;
    };
    group.add(object);
    return object;
  }

  const pointFragment = `
    varying vec3 vColor; varying float vAlpha;
    void main() {
      vec2 q = gl_PointCoord * 2. - 1.;
      float d = dot(q, q);
      float alpha = exp(-d * 5.5) * (1. - smoothstep(.65, 1., d)) * vAlpha;
      if (alpha < .004) discard;
      gl_FragColor = vec4(vColor, alpha);
    }
  `;
  const grainGeometry = points(DESKTOP.grain, FULL_RADIUS * 1.13);
  attach(new THREE.Points(grainGeometry, material(`
    ${common}
    attribute vec4 aSeed;
    varying vec3 vColor; varying float vAlpha;
    void main() {
      float angle = aSeed.x * TAU + wheelRotation() + sin(uTime * 1.2 + aSeed.y * 12.) * .018;
      float strand = floor(aSeed.w * 3.);
      float r = .985 + (strand - 1.) * .014 + braid(angle, strand * .3);
      r += (aSeed.z - .5) * .068;
      vec3 p = vec3(cos(angle) * r, sin(angle) * r,
                    (aSeed.y - .5) * .062 + .024) * uRadius;
      vec4 mv = modelViewMatrix * vec4(p, 1.);
      float pixelScale = uHeight * projectionMatrix[1][1] * .5 / max(.1, -mv.z);
      gl_PointSize = clamp(mix(.014, .038, aSeed.z) * pixelScale, .65, 6.5 * uPixelRatio);
      float hot = smoothstep(.89, .995, aSeed.z);
      float head = ignition(angle);
      vColor = mix(vec3(1.6, .27, .006), vec3(2.8, 1.15, .065), hot);
      float whiteCore = pow(head, 4.) * smoothstep(.965, 1., aSeed.z);
      vColor = mix(vColor, vec3(4.8, 3.8, 2.4), whiteCore);
      float knots = .5 + .5 * sin((angle - wheelRotation()) * 19. - uTime * .4 + strand * 2.);
      vAlpha = uAlpha * traced(angle) * mix(.15, .43, aSeed.z) * (.65 + knots * .35);
      vAlpha *= 1. + head * .65 + circulation(angle) * .36;
      gl_Position = projectionMatrix * mv;
    }
  `, pointFragment)), 'Hot grains flowing through braided fire', 44);

  const ribbonFragment = `
    varying vec2 vRibbon; varying vec3 vColor; varying float vAlpha;
    void main() {
      float edge = 1. - smoothstep(.14, 1., abs(vRibbon.y));
      float core = exp(-vRibbon.y * vRibbon.y * 10.);
      float taper = smoothstep(0., .1, vRibbon.x) * (1. - smoothstep(.92, 1., vRibbon.x));
      float alpha = (core * .7 + edge * .3) * taper * vAlpha;
      if (alpha < .003) discard;
      gl_FragColor = vec4(vColor, alpha);
    }
  `;
  const filamentGeometry = ribbon(DESKTOP.filament, 8, FULL_RADIUS * 1.19);
  // Three paired sweeping arcs share the existing filament budget. The rest
  // remain irregular fragments rather than becoming continuous neon bands.
  const leaderLayers = new Float32Array(DESKTOP.filament).fill(-1);
  for (let i = 0; i < 6; i++) leaderLayers[i] = i % 3;
  filamentGeometry.setAttribute('aLayer', new THREE.InstancedBufferAttribute(leaderLayers, 1));
  const filaments = attach(new THREE.Mesh(filamentGeometry, material(`
    ${common}
    attribute vec4 aSeed;
    attribute float aLayer;
    varying vec2 vRibbon; varying vec3 vColor; varying float vAlpha;
    vec3 filament(float along) {
      float angle = aSeed.x * TAU + wheelRotation() + sin(uTime * .6 + aSeed.y * 14.) * .012
                  + along * mix(.09, .34, aSeed.z);
      float strand = floor(aSeed.w * 3.);
      if (aLayer >= 0.) {
        angle = orbitPhase(aLayer) * TAU - 1.570796327
              - (1. - along) * mix(.74, 1.46, aSeed.z);
        strand = aLayer;
      }
      float r = .984 + (strand - 1.) * .014 + braid(angle, strand * .3);
      // Short curved bristles peel outward into an orange brush/fan. The
      // longer leaders stay within that brush rather than outlining a tube.
      r += (aSeed.y - .5) * .032;
      if (aLayer < 0.) r += along * along * mix(.008, .10, aSeed.w);
      return vec3(cos(angle) * r, sin(angle) * r, .024 + sin(angle * 7. + aSeed.w * 12.) * .02) * uRadius;
    }
    void main() {
      float along = position.x;
      vec3 p = filament(along);
      vec4 mv = modelViewMatrix * vec4(p, 1.);
      vec3 tangent = (modelViewMatrix * vec4(filament(along + .002) - p, 0.)).xyz;
      vec2 side = normalize(vec2(-tangent.y, tangent.x) + vec2(.000001));
      float pixelScale = uHeight * projectionMatrix[1][1] * .5 / max(.1, -mv.z);
      float isLeader = step(0., aLayer);
      float worldWidth = mix(mix(.015, .030, aSeed.y), mix(.038, .054, aSeed.y), isLeader);
      float width = clamp(worldWidth * pixelScale, .7, uRibbonCap * uPixelRatio);
      mv.xy += side * position.y * width / pixelScale;
      float angle = atan(p.y, p.x);
      float broken = .2 + .8 * smoothstep(-.5, .75, sin(along * 23. + aSeed.z * 60. - uTime * .6));
      vRibbon = position.xy;
      float hotTip = smoothstep(.68, .94, along) * smoothstep(.74, 1., aSeed.w);
      vColor = mix(vec3(1.9, .34, .008), vec3(3.3, 1.35, .08), hotTip);
      float whiteTip = smoothstep(.9, .98, along) * smoothstep(.97, 1., aSeed.z) * ignition(angle);
      vColor = mix(vColor, vec3(4.5, 3.5, 2.), whiteTip);
      vAlpha = uAlpha * traced(angle) * broken * mix(.18, .36, aSeed.z);
      vAlpha *= 1. + ignition(angle) * .65 + circulation(angle) * .38 + isLeader * .55;
      if (aLayer > .5) vAlpha *= uAperture;
      gl_Position = projectionMatrix * mv;
    }
  `, ribbonFragment)), 'Broken white-gold filaments', 43);
  filaments.material.side = THREE.DoubleSide;

  const emberGeometry = ribbon(DESKTOP.ember, 3, FULL_RADIUS * 3.2);
  const embers = attach(new THREE.Mesh(emberGeometry, material(`
    ${common}
    attribute vec4 aSeed;
    varying vec2 vRibbon; varying vec3 vColor; varying float vAlpha;
    vec3 flight(float age, float angle) {
      vec2 radial = vec2(cos(angle), sin(angle));
      vec2 tangent = vec2(-radial.y, radial.x);
      float extra = 1. + step(.91, aSeed.z) * .5;
      vec2 p = radial * (.988 + age * mix(.06, .30, aSeed.y));
      p += tangent * age * mix(.42, 1.05, aSeed.z) * extra;
      p.y -= age * age * mix(.20, .76, aSeed.w);
      float z = .032 + (aSeed.y - .45) * age * .52;
      return vec3(p, z) * uRadius;
    }
    void main() {
      float speed = mix(.57, 1.14, aSeed.y);
      float age = fract(uTime * speed + aSeed.z * 7.);
      // The launch direction belongs to the wheel at birth; released sparks
      // then retain that tangential velocity instead of being dragged around.
      float birthOrbit = max(0., uOrbit - age / speed);
      float angle = aSeed.x * TAU + birthOrbit * ${WHEEL_SPEED} * TAU;
      float heat = min(1., circulation(angle) + ignition(angle));
      float tail = (mix(.05, .16, aSeed.w) + step(.91, aSeed.z) * .08) * (1. + heat * .42);
      float localAge = max(0., age - (1. - position.x) * tail);
      vec3 p = flight(localAge, angle);
      vec4 mv = modelViewMatrix * vec4(p, 1.);
      vec3 tangent = (modelViewMatrix * vec4(flight(localAge + .002, angle) - p, 0.)).xyz;
      vec2 side = normalize(vec2(-tangent.y, tangent.x) + vec2(.000001));
      float pixelScale = uHeight * projectionMatrix[1][1] * .5 / max(.1, -mv.z);
      float taper = mix(.2, 1., position.x);
      float width = clamp(mix(.019, .046, aSeed.w) * (1. + heat * .28) * pixelScale, .7, uRibbonCap * uPixelRatio);
      mv.xy += side * position.y * width * taper / pixelScale;
      float life = smoothstep(0., .035, age) * (1. - smoothstep(.32, 1., age));
      vRibbon = position.xy;
      vColor = mix(vec3(1.6, .19, .004), vec3(3.5, 1.1, .07), pow(position.x, 3.));
      float whiteTip = smoothstep(.9, .98, position.x) * smoothstep(.97, 1., aSeed.z) * heat;
      vColor = mix(vColor, vec3(4.3, 3.6, 2.3), whiteTip);
      vAlpha = uAlpha * traced(angle) * life * mix(.28, .83, aSeed.w) * mix(.18, 1., uMotion);
      vAlpha *= .78 + circulation(angle) * .55 + ignition(angle) * .45;
      gl_Position = projectionMatrix * mv;
    }
  `, ribbonFragment)), 'Curved ballistic spark ribbons', 45);
  embers.material.side = THREE.DoubleSide;

  const planeVertex = `
    uniform float uRadius; varying vec2 vLocal;
    void main() {
      vLocal = position.xy;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position * uRadius, 1.);
    }
  `;
  const glowGeometry = remember(new THREE.PlaneGeometry(3.05, 3.05), FULL_RADIUS * 2.2);
  const glow = attach(new THREE.Mesh(glowGeometry, material(planeVertex, `
    ${common} ${noise}
    varying vec2 vLocal;
    void main() {
      float r = length(vLocal), angle = atan(vLocal.y, vLocal.x);
      float smoke = mist(vLocal * 12. + vec2(uTime * .3, -uTime * .17));
      float distanceToFire = abs(r - .989 - (smoke - .5) * .038);
      float halo = exp(-distanceToFire * distanceToFire * 170.) * (.035 + smoke * .05);
      float glow = exp(-distanceToFire * distanceToFire * 32.) * .008;
      float headAngle = orbitPhase(0.) * TAU - 1.570796327;
      vec2 headDelta = vLocal - vec2(cos(headAngle), sin(headAngle)) * .99;
      float head = exp(-dot(headDelta, headDelta) * 90.) * .27;
      float arcDistance = (r - .989) * 49.;
      float arcGlow = exp(-arcDistance * arcDistance) * circulation(angle) * .027;
      float alpha = ((halo + glow + arcGlow) * traced(angle) + head) * uAlpha;
      if (r > 1.48 || alpha < .002) discard;
      gl_FragColor = vec4(mix(vec3(1.5, .28, .006), vec3(3.5, 1.5, .14), min(1., head * 3.)), alpha);
    }
  `)), 'Uneven fire bloom and travelling ignition', 42);
  glow.position.z = .012; glow.material.side = THREE.DoubleSide;

  const interiorGeometry = remember(new THREE.CircleGeometry(1, 96), FULL_RADIUS);
  const interior = attach(new THREE.Mesh(interiorGeometry, material(planeVertex, `
    uniform float uTime, uAlpha, uAperture;
    ${noise}
    varying vec2 vLocal;
    void main() {
      float r = length(vLocal);
      float broad = mist(vLocal * 2.6 + vec2(uTime * .025, -.3));
      float smoke = mist(vLocal * 7. + vec2(-uTime * .018, uTime * .021));
      float edge = .987 + (smoke - .5) * .012;
      if (r > edge) discard;
      float warmRim = smoothstep(.74, 1., r) * (.2 + broad * .8);
      // An unlit aperture with asymmetric airborne haze, never target circles.
      vec3 color = vec3(.0014, .0011, .0008);
      color += vec3(.011, .006, .0025) * broad * smoke;
      color += vec3(.037, .016, .003) * warmRim;
      float alpha = (1. - smoothstep(edge - .025, edge, r)) * uAlpha * uAperture;
      if (alpha < .003) discard;
      gl_FragColor = vec4(color, alpha);
    }
  `, false)), 'Dark aperture with asymmetric ember haze', 40);
  interior.position.z = -.021;

  const dustGeometry = points(DESKTOP.dust, FULL_RADIUS * 1.03);
  attach(new THREE.Points(dustGeometry, material(`
    ${common}
    attribute vec4 aSeed;
    varying vec3 vColor; varying float vAlpha;
    void main() {
      float angle = aSeed.x * TAU + uTime * .018;
      float r = mix(.2, .95, sqrt(aSeed.y));
      vec3 p = vec3(cos(angle) * r, sin(angle) * r, -.002) * uRadius;
      vec4 mv = modelViewMatrix * vec4(p, 1.);
      float pixelScale = uHeight * projectionMatrix[1][1] * .5 / max(.1, -mv.z);
      gl_PointSize = clamp(mix(.008, .016, aSeed.z) * pixelScale, .5, 2.2 * uPixelRatio);
      vColor = vec3(.85, .31, .06);
      vAlpha = uAlpha * uAperture * traced(angle) * (.04 + aSeed.z * .09);
      gl_Position = projectionMatrix * mv;
    }
  `, pointFragment)), 'Dim embers suspended beyond the opening', 41);

  const light = new THREE.PointLight(0xff9b32, 0, 9, 2);
  light.position.z = .38; group.add(light);
  function place(position, quaternion) {
    if (disposed) return;
    group.position.copy(position); group.quaternion.copy(quaternion);
  }
  function update({ time = 0, progress = 0, pixelRatio = 1, reduced = false } = {}) {
    if (disposed) return;
    const p = Number.isFinite(progress) ? THREE.MathUtils.clamp(progress, 0, 1) : 0;
    radius = p > 0 ? FULL_RADIUS : 0;
    const alpha = THREE.MathUtils.smoothstep(p, 0, .024) * (1 - THREE.MathUtils.smoothstep(p, .9, 1));
    const localTime = Number.isFinite(time) ? time : 0;
    const animationTime = reduced ? 0 : localTime;
    // A constant-speed first stroke reaches closure without decelerating.
    const trace = THREE.MathUtils.clamp((p - TRACE_START) / (TRACE_END - TRACE_START), 0, 1);
    if (trace < 1 || p === 1) orbitStartedAt = null;
    else if (orbitStartedAt === null || localTime < orbitStartedAt) {
      orbitStartedAt = localTime;
      // Recover the crossing within this frame, so the first post-closure
      // frame already moves instead of spending a frame stationary at zero.
      if (previousProgress > 0 && previousProgress < TRACE_END && p > previousProgress && localTime >= previousLocalTime) {
        const fraction = (TRACE_END - previousProgress) / (p - previousProgress);
        orbitStartedAt = previousLocalTime + (localTime - previousLocalTime) * fraction;
      }
    }
    group.visible = p > 0 && p < 1;
    uniforms.uRadius.value = radius; uniforms.uAlpha.value = alpha;
    uniforms.uTrace.value = trace;
    uniforms.uOrbit.value = reduced || orbitStartedAt === null ? 0 : localTime - orbitStartedAt;
    uniforms.uPhase.value = trace + uniforms.uOrbit.value * WHEEL_SPEED;
    uniforms.uAperture.value = THREE.MathUtils.smoothstep(p, TRACE_END, APERTURE_FULL);
    uniforms.uTime.value = animationTime; uniforms.uMotion.value = reduced ? 0 : 1;
    uniforms.uPixelRatio.value = Number.isFinite(pixelRatio) ? THREE.MathUtils.clamp(pixelRatio, .5, 2) : 1;
    previousProgress = p; previousLocalTime = localTime;
    light.intensity = alpha * trace * (reduced ? 6.2 : 6.2 + Math.sin(animationTime * 11.) * .36 + Math.sin(animationTime * 17.3) * .19);
    const narrow = typeof window !== 'undefined' && window.innerWidth < 700;
    if (narrow !== smallViewport) {
      smallViewport = narrow;
      const budget = narrow ? MOBILE : DESKTOP;
      uniforms.uRibbonCap.value = narrow ? 2.8 : 4.2;
      grainGeometry.setDrawRange(0, budget.grain); dustGeometry.setDrawRange(0, budget.dust);
      filamentGeometry.instanceCount = budget.filament; emberGeometry.instanceCount = budget.ember;
    }
  }
  function dispose() {
    if (disposed) return;
    disposed = true; group.removeFromParent();
    for (const item of geometries) item.dispose();
    for (const item of materials) item.dispose();
    light.dispose();
  }
  return { place, update, dispose, get radius() { return radius; }, get phase() { return uniforms.uPhase.value; } };
}
