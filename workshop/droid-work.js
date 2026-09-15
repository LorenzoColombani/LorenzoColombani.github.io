import * as THREE from 'three';

// A small optical workbench. All 24 components survive each change of design;
// only their poses change. Geometry, scratch vectors and GPU buffers are reused.
const PART_COUNT = 24;
const TAU = Math.PI * 2;
const UP = new THREE.Vector3(0, 1, 0);
const X_AXIS = new THREE.Vector3(1, 0, 0);
const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const ease = v => { const x = clamp(v); return x * x * (3 - 2 * x); };

function makePose(x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
  return {
    position: new THREE.Vector3(x, y, z),
    scale: new THREE.Vector3(sx, sy, sz),
    quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
  };
}

function strut(a, b, width) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
  const direction = end.clone().sub(start);
  const result = makePose(0, 0, 0, direction.length(), width, width);
  result.position.addVectors(start, end).multiplyScalar(.5);
  result.quaternion.setFromUnitVectors(X_AXIS, direction.normalize());
  return result;
}

function configurations() {
  const gyro = [], solar = [], lattice = [], resonator = [];
  // Three nested, visibly segmented gimbals, with a separate central spindle.
  for (let ring = 0; ring < 3; ring++) {
    const radius = .59 - ring * .075;
    const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(
      ring === 1 ? Math.PI / 2 : .12, ring === 2 ? Math.PI / 2 : .16, ring * .13,
    ));
    for (let i = 0; i < 8; i++) {
      const angle = (i + .5) * TAU / 8;
      const pose = makePose(Math.cos(angle) * radius, Math.sin(angle) * radius, 0,
        radius * .73, .043, .046, 0, 0, angle + Math.PI / 2);
      pose.position.applyQuaternion(rotation);
      pose.quaternion.premultiply(rotation);
      gyro.push(pose);
    }
  }
  // Two four-by-three foldout arrays, with a clear gap for the spacecraft body.
  for (let side = -1; side <= 1; side += 2) {
    for (let row = 0; row < 4; row++) {
      for (let column = 0; column < 3; column++) {
        solar.push(makePose(side * (.275 + column * .183), (row - 1.5) * .16, 0,
          .168, .145, .028, 0, side * -.16, 0));
      }
    }
  }
  // The twelve edges and twelve face diagonals of an open instrument frame.
  const h = .43;
  for (let axis = 0; axis < 3; axis++) {
    const other = [0, 1, 2].filter(a => a !== axis);
    for (const a of [-h, h]) for (const b of [-h, h]) {
      const start = [0, 0, 0], end = [0, 0, 0];
      start[axis] = -h; end[axis] = h;
      start[other[0]] = end[other[0]] = a;
      start[other[1]] = end[other[1]] = b;
      lattice.push(strut(start, end, .032));
    }
  }
  for (let axis = 0; axis < 3; axis++) {
    const other = [0, 1, 2].filter(a => a !== axis);
    for (const side of [-h, h]) for (const diagonal of [-1, 1]) {
      const start = [0, 0, 0], end = [0, 0, 0];
      start[axis] = end[axis] = side;
      start[other[0]] = -h; end[other[0]] = h;
      start[other[1]] = -h * diagonal; end[other[1]] = h * diagonal;
      lattice.push(strut(start, end, .016));
    }
  }
  // Eight laminated heat-exchanger layers, each made of three slotted plates.
  for (let layer = 0; layer < 8; layer++) {
    const width = .92 - Math.abs(layer - 3.5) * .065;
    for (let panel = 0; panel < 3; panel++) {
      const pose = makePose((panel - 1) * width / 3, (layer - 3.5) * .116, 0,
        width / 3 - .022, .024, .49, 0, (layer % 2 ? 1 : -1) * .17, 0);
      pose.position.applyAxisAngle(UP, (layer % 2 ? 1 : -1) * .17);
      resonator.push(pose);
    }
  }
  return [gyro, solar, lattice, resonator];
}

function componentLines() {
  const vertices = [
    [-.5,-.5,-.5], [.5,-.5,-.5], [.5,.5,-.5], [-.5,.5,-.5],
    [-.5,-.5,.5], [.5,-.5,.5], [.5,.5,.5], [-.5,.5,.5],
  ];
  const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
  const lines = [];
  for (const [a,b] of edges) lines.push(...vertices[a], ...vertices[b]);
  // Inset etched window and split conductors make the parts read as hardware.
  lines.push(-.35,-.29,.505, .35,-.29,.505, .35,-.29,.505, .35,.29,.505,
    .35,.29,.505, -.35,.29,.505, -.35,.29,.505, -.35,-.29,.505,
    -.12,-.29,.505, -.12,.29,.505, .12,-.29,.505, .12,.29,.505);
  return new Float32Array(lines);
}

function lineGeometry(positions, dynamic = false) {
  const geometry = new THREE.BufferGeometry();
  const attribute = new THREE.BufferAttribute(positions, 3);
  if (dynamic) attribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', attribute);
  return geometry;
}

export function createDroidWork({scene, getHead}) {
  const group = new THREE.Group();
  group.name = 'droid-optical-workbench';
  group.visible = false;
  scene.add(group);
  const assembly = new THREE.Group();
  group.add(assembly);

  const day = new THREE.Color(0x197384), nightColor = new THREE.Color(0x68eee8);
  const copper = new THREE.Color(0xb78246), gold = new THREE.Color(0xffc775);
  const tint = day.clone(), accent = copper.clone();
  const materialOptions = {transparent:true, depthWrite:false, toneMapped:false};
  const bodyMaterial = new THREE.MeshBasicMaterial({...materialOptions, color:day, opacity:.13});
  const bodyGeometry = new THREE.BoxGeometry(1, 1, 1);
  const bodies = new THREE.InstancedMesh(bodyGeometry, bodyMaterial, PART_COUNT);
  bodies.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  bodies.frustumCulled = false;
  assembly.add(bodies);

  const unitLines = componentLines();
  const positions = new Float32Array(PART_COUNT * unitLines.length);
  const colors = new Float32Array(positions.length);
  const edgesGeometry = lineGeometry(positions, true);
  edgesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage));
  const edgeMaterial = new THREE.LineBasicMaterial({...materialOptions, vertexColors:true, opacity:.83});
  const edges = new THREE.LineSegments(edgesGeometry, edgeMaterial);
  edges.frustumCulled = false;
  assembly.add(edges);

  const coreGeometry = new THREE.OctahedronGeometry(.16, 0);
  const coreMaterial = new THREE.MeshBasicMaterial({...materialOptions, color:copper, opacity:.21});
  const core = new THREE.Mesh(coreGeometry, coreMaterial);
  const coreEdgeMaterial = new THREE.LineBasicMaterial({...materialOptions, color:copper, opacity:.9});
  const coreEdges = new THREE.LineSegments(new THREE.EdgesGeometry(coreGeometry), coreEdgeMaterial);
  core.add(coreEdges);
  assembly.add(core);

  const registration = [];
  for (let i = 0; i < 64; i++) {
    if (i % 16 > 9) continue;
    const a = i * TAU / 64, b = (i + 1) * TAU / 64;
    registration.push(Math.cos(a)*.78, Math.sin(a)*.78, -.38,
      Math.cos(b)*.78, Math.sin(b)*.78, -.38);
    if (i % 2 === 0) registration.push(Math.cos(a)*.80, Math.sin(a)*.80, -.38,
      Math.cos(a)*.827, Math.sin(a)*.827, -.38);
  }
  const registerMaterial = new THREE.LineBasicMaterial({...materialOptions, color:day, opacity:.19});
  const register = new THREE.LineSegments(lineGeometry(new Float32Array(registration)), registerMaterial);
  assembly.add(register);

  // A narrow moving highlight follows the actual component edges, without bloom.
  const tracePositions = new Float32Array(14 * 6);
  const traceGeometry = lineGeometry(tracePositions, true);
  const traceMaterial = new THREE.LineBasicMaterial({...materialOptions, color:copper, opacity:.95});
  const traces = new THREE.LineSegments(traceGeometry, traceMaterial);
  traces.frustumCulled = false;
  assembly.add(traces);

  // Beams live in scene coordinates, independent of the stabilized assembly.
  const rayPositions = new Float32Array(12 * 6);
  const rayGeometry = lineGeometry(rayPositions, true);
  const rayStrength = new Float32Array(24);
  for (let i = 0; i < 12; i++) {
    rayStrength[i*2] = i < 2 ? .8 : .065;
    rayStrength[i*2+1] = i < 2 ? .4 : .025;
  }
  rayGeometry.setAttribute('strength', new THREE.BufferAttribute(rayStrength, 1));
  const rayMaterial = new THREE.ShaderMaterial({
    ...materialOptions,
    uniforms:{tint:{value:day.clone()}, opacity:{value:0}},
    vertexShader:`attribute float strength; varying float vStrength;
      void main(){vStrength=strength;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform vec3 tint;uniform float opacity;varying float vStrength;
      void main(){gl_FragColor=vec4(tint,opacity*vStrength);
        #include <colorspace_fragment>
      }`,
  });
  const rays = new THREE.LineSegments(rayGeometry, rayMaterial);
  rays.name = 'droid-eye-projection';
  rays.frustumCulled = false;
  rays.visible = false;
  scene.add(rays);

  // Open, view-softened volumes make the optical origin legible without a
  // solid triangular silhouette. Both ends fade before their geometric rims.
  const optics = new THREE.Group();
  optics.name = 'droid-projector-optics';
  optics.visible = false;
  scene.add(optics);
  const volumeGeometry = new THREE.CylinderGeometry(.20, .014, 1, 48, 8, true);
  const volumeMaterial = new THREE.ShaderMaterial({
    ...materialOptions, side:THREE.DoubleSide,
    uniforms:{tint:{value:day.clone()}, opacity:{value:0}, time:{value:0}},
    vertexShader:`varying vec2 vUv;varying vec3 vNormal;varying vec3 vView;
      void main(){vUv=uv;vNormal=normalize(normalMatrix*normal);
        vec4 p=modelViewMatrix*vec4(position,1.);vView=-p.xyz;
        gl_Position=projectionMatrix*p;}`,
    fragmentShader:`uniform vec3 tint;uniform float opacity,time;
      varying vec2 vUv;varying vec3 vNormal;varying vec3 vView;
      void main(){
        float facing=abs(dot(normalize(vNormal),normalize(vView)));
        float softEdge=pow(facing,1.1);
        float ends=smoothstep(0.,.09,vUv.y)*(1.-smoothstep(.64,1.,vUv.y));
        float filaments=pow(.5+.5*sin(vUv.x*150.8+vUv.y*5.-time*.18),18.);
        float scan=exp(-pow((vUv.y-fract(time*.24))/.06,2.));
        float density=softEdge*ends*(.53+filaments*.16+scan*.31);
        gl_FragColor=vec4(tint,opacity*density);
        #include <colorspace_fragment>
      }`,
  });
  const collarGeometry = new THREE.PlaneGeometry(.19, .19);
  const collarMaterial = new THREE.ShaderMaterial({
    ...materialOptions, side:THREE.DoubleSide, blending:THREE.AdditiveBlending,
    uniforms:{tint:{value:nightColor.clone()}, opacity:{value:0}, time:{value:0}},
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;
      gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform vec3 tint;uniform float opacity,time;varying vec2 vUv;
      void main(){
        float radius=length(vUv-.5);
        float ring=exp(-pow((radius-.277)/.026,2.));
        float halo=exp(-pow((radius-.28)/.10,2.));
        float pupil=exp(-pow(radius/.10,2.));
        float pulse=.93+.07*sin(time*2.1);
        float alpha=(ring*.59+halo*.10+pupil*.07)*opacity*pulse;
        gl_FragColor=vec4(tint,alpha);
        #include <colorspace_fragment>
      }`,
  });
  const volumes = [], collars = [];
  for (let i = 0; i < 2; i++) {
    const volume = new THREE.Mesh(volumeGeometry, volumeMaterial);
    volume.name = `droid-eye-light-volume-${i}`;
    const collar = new THREE.Mesh(collarGeometry, collarMaterial);
    collar.name = `droid-eye-light-collar-${i}`;
    optics.add(volume, collar);
    volumes.push(volume); collars.push(collar);
  }

  const motePositions = new Float32Array(36 * 3);
  const moteGeometry = lineGeometry(motePositions, true);
  const moteMaterial = new THREE.PointsMaterial({...materialOptions, color:copper,
    size:.016, sizeAttenuation:true, opacity:.8});
  const motes = new THREE.Points(moteGeometry, moteMaterial);
  motes.frustumCulled = false;
  motes.visible = false;
  scene.add(motes);

  const designs = configurations();
  const packed = Array.from({length:PART_COUNT}, (_, i) => makePose(
    Math.sin(i * 2.399) * .045, (i - 12) * .005, -.72 + Math.cos(i) * .025,
    .028, .012, .018, i * .17, i * .31, i * .11,
  ));
  const partPositions = Array.from({length:PART_COUNT}, () => new THREE.Vector3());
  const matrix = new THREE.Matrix4(), partPosition = new THREE.Vector3();
  const partScale = new THREE.Vector3(), partRotation = new THREE.Quaternion();
  const headPosition = new THREE.Vector3(), headRotation = new THREE.Quaternion();
  const facingMatrix = new THREE.Matrix4(), workRotation = new THREE.Quaternion();
  const eyeWorld = [new THREE.Vector3(), new THREE.Vector3()];
  const destination = new THREE.Vector3(), workPoint = new THREE.Vector3();
  const target = new THREE.Vector3(), delta = new THREE.Vector3();
  const paletteColor = new THREE.Color();
  let cachedHead = null, pupilNodes = [], initialized = false, disposed = false;
  let opacity = 0, clock = 0, previousTime = null, age = 0, first = true;
  let current = 0, next = 0, bag = [], hold = 5.5, previousNight = -1;

  function takeDesign() {
    if (!bag.length) {
      bag = [0, 1, 2, 3];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      // A shuffle boundary must never repeat the design just completed.
      if (bag[0] === current) [bag[0], bag[1]] = [bag[1], bag[0]];
    }
    return bag.shift();
  }

  function setColors(value) {
    tint.copy(day).lerp(nightColor, value);
    accent.copy(copper).lerp(gold, value);
    bodyMaterial.color.copy(tint);
    coreMaterial.color.copy(accent); coreEdgeMaterial.color.copy(accent);
    registerMaterial.color.copy(tint); traceMaterial.color.copy(accent);
    rayMaterial.uniforms.tint.value.copy(tint); moteMaterial.color.copy(accent);
    volumeMaterial.uniforms.tint.value.copy(tint);
    collarMaterial.uniforms.tint.value.copy(tint).lerp(nightColor, .46);
    for (let i = 0; i < PART_COUNT; i++) {
      paletteColor.copy(i % 6 === 0 || i % 8 === 7 ? accent : tint);
      for (let j = i * unitLines.length; j < (i + 1) * unitLines.length; j += 3) {
        colors[j] = paletteColor.r; colors[j+1] = paletteColor.g; colors[j+2] = paletteColor.b;
      }
    }
    edgesGeometry.attributes.color.needsUpdate = true;
  }

  function update({time = 0, dt = 0, night = 0, reduced = false, visible = true}) {
    if (disposed) return;
    const elapsed = previousTime === null ? 0 : clamp(time - previousTime, 0, .1);
    previousTime = time;
    const frameDelta = clamp(dt, 0, .1);
    const visibility = typeof visible === 'number' ? clamp(visible) : Number(visible);
    const head = getHead();
    const goalOpacity = head ? visibility : 0;
    opacity = reduced ? goalOpacity : opacity + (goalOpacity - opacity) * (1 - Math.exp(-frameDelta * 5));
    group.visible = rays.visible = motes.visible = optics.visible = opacity > .002 && Boolean(head);
    if (!group.visible) return;

    if (head !== cachedHead) {
      cachedHead = head;
      pupilNodes = [];
      head.traverse(node => { if (/convex[ _]pupil[ _]lens/i.test(node.name)) pupilNodes.push(node); });
      pupilNodes.sort((a,b) => a.position.x - b.position.x);
      initialized = false;
    }
    head.updateWorldMatrix(true, true);
    for (let i = 0; i < 2; i++) {
      // GLB lens z scale is .018, so its local +1 is the front optical surface.
      // The procedural loading fallback has eyes at (±.23,.035,.501).
      if (pupilNodes[i]) eyeWorld[i].set(0, 0, 1.025).applyMatrix4(pupilNodes[i].matrixWorld);
      else eyeWorld[i].set(i ? .23 : -.23, .035, .519).applyMatrix4(head.matrixWorld);
    }
    head.getWorldQuaternion(headRotation);
    headPosition.addVectors(eyeWorld[0], eyeWorld[1]).multiplyScalar(.5);
    destination.set(0, 0, 2.4).applyQuaternion(headRotation).add(headPosition);
    // Matrix4.lookAt builds +Z from target to eye: the display's front faces
    // the droid, square to the optical axis through the midpoint of both eyes.
    facingMatrix.lookAt(headPosition, destination, UP);
    workRotation.setFromRotationMatrix(facingMatrix);
    // The head is already animated smoothly. Follow its exact optical axis,
    // without a second easing layer that would let the assembly drift off gaze.
    group.position.copy(destination);
    group.quaternion.copy(workRotation);
    initialized = true;
    if (!reduced) { clock += elapsed; age += elapsed; }

    const transitionDuration = first ? 2.8 : 3.1;
    if (!reduced && age >= transitionDuration + hold) {
      age -= transitionDuration + hold;
      current = next;
      next = takeDesign();
      first = false;
      hold = 4.7 + Math.random() * 2.1;
    }
    const isAssembling = !reduced && age < (first ? 2.8 : 3.1);
    const source = first ? packed : designs[current];
    const finish = designs[next];
    for (let i = 0; i < PART_COUNT; i++) {
      const stagger = ((i * 7) % PART_COUNT) * .024;
      const progress = reduced ? 1 : ease((age - stagger) / (first ? 2.08 : 2.45));
      partPosition.lerpVectors(source[i].position, finish[i].position, progress);
      // A brief exploded view lets the same parts visibly separate and re-seat.
      const separation = !first && isAssembling ? Math.sin(progress * Math.PI) * .16 : 0;
      partPosition.x += Math.sin(i * 2.399) * separation;
      partPosition.y += Math.cos(i * 2.399) * separation;
      partPosition.z += Math.sin(i * .81) * separation * .65;
      partScale.lerpVectors(source[i].scale, finish[i].scale, progress);
      partRotation.slerpQuaternions(source[i].quaternion, finish[i].quaternion, progress);
      matrix.compose(partPosition, partRotation, partScale);
      bodies.setMatrixAt(i, matrix);
      partPositions[i].copy(partPosition);
      const m = matrix.elements, offset = i * unitLines.length;
      for (let j = 0; j < unitLines.length; j += 3) {
        const x = unitLines[j], y = unitLines[j+1], z = unitLines[j+2];
        positions[offset+j] = m[0]*x + m[4]*y + m[8]*z + m[12];
        positions[offset+j+1] = m[1]*x + m[5]*y + m[9]*z + m[13];
        positions[offset+j+2] = m[2]*x + m[6]*y + m[10]*z + m[14];
      }
    }
    bodies.instanceMatrix.needsUpdate = true;
    edgesGeometry.attributes.position.needsUpdate = true;
    const value = clamp(night);
    if (Math.abs(value - previousNight) > .001) { setColors(value); previousNight = value; }
    bodyMaterial.opacity = opacity * (.14 - value * .06);
    edgeMaterial.opacity = opacity * (.81 + value * .08);
    coreMaterial.opacity = opacity * .19;
    coreEdgeMaterial.opacity = opacity * .9;
    registerMaterial.opacity = opacity * (.19 + value * .04);
    traceMaterial.opacity = opacity * .94;
    rayMaterial.uniforms.opacity.value = opacity * (.75 + value * .22);
    moteMaterial.opacity = opacity * .88;
    volumeMaterial.uniforms.opacity.value = opacity * (.037 + value * .072);
    collarMaterial.uniforms.opacity.value = opacity * (.62 + value * .30);
    volumeMaterial.uniforms.time.value = collarMaterial.uniforms.time.value = reduced ? 0 : clock;

    const coreFrom = current === 1 ? .95 : current === 3 ? 1.25 : .72;
    const coreTo = next === 1 ? .95 : next === 3 ? 1.25 : .72;
    const coreScale = reduced ? coreTo : THREE.MathUtils.lerp(coreFrom, coreTo, ease(age / 2.5));
    core.scale.set(.9, coreScale, .9);
    core.rotation.set(0, reduced ? .3 : clock * .22, Math.PI / 4);
    assembly.rotation.y = 0;
    register.rotation.z = reduced ? 0 : Math.sin(clock * .08) * .06;
    group.updateWorldMatrix(true, true);

    // Fourteen short strokes move over existing edges, like a tool checking seams.
    const segmentCount = positions.length / 6;
    for (let i = 0; i < 14; i++) {
      const cursor = reduced ? i * 29 : clock * 18 + i * 29;
      const segment = Math.floor(cursor) % segmentCount, start = segment * 6;
      const phase = cursor - Math.floor(cursor), length = .26;
      const a = clamp(phase - length), b = clamp(phase + length);
      for (let axis = 0; axis < 3; axis++) {
        const origin = positions[start+axis], extent = positions[start+axis+3] - origin;
        tracePositions[i*6+axis] = origin + extent * a;
        tracePositions[i*6+axis+3] = origin + extent * b;
      }
    }
    traceGeometry.attributes.position.needsUpdate = true;

    const toolCursor = reduced ? 8 : clock * 1.7;
    const activePart = Math.floor(toolCursor) % PART_COUNT;
    workPoint.copy(partPositions[activePart]).lerp(partPositions[(activePart + 1) % PART_COUNT],
      reduced ? 0 : ease(toolCursor - Math.floor(toolCursor)));
    workPoint.z += .018;
    workPoint.applyMatrix4(assembly.matrixWorld);
    for (let i = 0; i < 2; i++) {
      const eye = eyeWorld[i], volume = volumes[i], collar = collars[i];
      delta.subVectors(workPoint, eye);
      const distance = delta.length();
      volume.position.copy(eye).addScaledVector(delta, .5);
      volume.scale.set(1, distance, 1);
      volume.quaternion.setFromUnitVectors(UP, delta.normalize());
      collar.position.copy(eye);
      collar.quaternion.copy(headRotation);
    }
    for (let i = 0; i < 12; i++) {
      const eye = eyeWorld[i % 2];
      if (i < 2) target.copy(workPoint);
      else {
        const component = (activePart + i * 5) % PART_COUNT;
        target.copy(partPositions[component]).applyMatrix4(assembly.matrixWorld);
      }
      const offset = i * 6;
      rayPositions[offset] = eye.x; rayPositions[offset+1] = eye.y; rayPositions[offset+2] = eye.z;
      rayPositions[offset+3] = target.x; rayPositions[offset+4] = target.y; rayPositions[offset+5] = target.z;
    }
    rayGeometry.attributes.position.needsUpdate = true;
    for (let i = 0; i < 36; i++) {
      const eye = eyeWorld[i % 2];
      const travel = reduced ? (i + .5) / 36 : ((i / 36 + clock * .43) % 1);
      delta.subVectors(workPoint, eye);
      target.copy(eye).addScaledVector(delta, travel);
      const offset = i * 3;
      motePositions[offset] = target.x; motePositions[offset+1] = target.y; motePositions[offset+2] = target.z;
    }
    moteGeometry.attributes.position.needsUpdate = true;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    const geometries = new Set(), materials = new Set();
    for (const root of [group, rays, motes, optics]) {
      root.traverse(object => {
        if (object.geometry) geometries.add(object.geometry);
        if (object.material) materials.add(object.material);
      });
      scene.remove(root);
    }
    bodies.dispose();
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
  }
  return {update, dispose};
}
