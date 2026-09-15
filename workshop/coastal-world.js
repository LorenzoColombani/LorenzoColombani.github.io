import * as THREE from 'three';

// Shared analytic swells drive both the displaced surface and its normals.
// Different headings and scales form moving wave groups, not screen-space
// stripes. Fine ripples are filtered out before they can shimmer at distance.
const SWELLS = `
  uniform float uTime;
  float swell(vec2 p) {
    return .19 * sin(dot(p, vec2(.94, .342)) * .145 + uTime * .46)
      + .105 * sin(dot(p, vec2(-.53, .848)) * .257 - uTime * .63 + .9)
      + .055 * sin(dot(p, vec2(.28, .96)) * .49 + uTime * .79 + 2.4);
  }
  vec2 swellSlope(vec2 p) {
    return .19 * .145 * vec2(.94, .342) * cos(dot(p, vec2(.94, .342)) * .145 + uTime * .46)
      + .105 * .257 * vec2(-.53, .848) * cos(dot(p, vec2(-.53, .848)) * .257 - uTime * .63 + .9)
      + .055 * .49 * vec2(.28, .96) * cos(dot(p, vec2(.28, .96)) * .49 + uTime * .79 + 2.4);
  }
`;

function oceanMaterial() {
  return new THREE.ShaderMaterial({
    name: 'coast / shaped water and sky reflection',
    uniforms: {
      uTime: { value: 0 }, uNight: { value: 0 },
      uSunDirection: { value: new THREE.Vector3(-.45, .18, -.85).normalize() },
    },
    vertexShader: `${SWELLS}
      varying vec3 vWorld;
      void main() {
        vec3 p = position;
        p.y += swell(p.xz);
        vec4 world = modelMatrix * vec4(p, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `${SWELLS}
      uniform float uNight;
      uniform vec3 uSunDirection;
      varying vec3 vWorld;
      vec3 linearColor(vec3 color) { return pow(color, vec3(2.2)); }
      vec3 reflectedSky(vec3 direction) {
        // The same sky gradient and solar position as the existing pavilion.
        float h = clamp(direction.y * .9 + .13, 0.0, 1.0);
        vec3 low = mix(vec3(.83, .89, .82), vec3(.12, .29, .4), uNight);
        vec3 high = mix(vec3(.23, .56, .67), vec3(.014, .065, .18), uNight);
        return linearColor(mix(low, high, pow(h, .6)));
      }
      void main() {
        vec2 p = vWorld.xz;
        float distanceToEye = distance(cameraPosition.xz, p);
        float rippleVisibility = 1.0 - smoothstep(28.0, 165.0, distanceToEye);
        float crossSwell = sin(dot(p, vec2(.16, .99)) * .13 - uTime * .25);
        float rippleA = dot(p, vec2(.89, .456)) * 1.74 + crossSwell * .85 + uTime * 1.14;
        float rippleB = dot(p, vec2(-.4, .916)) * 2.61 - crossSwell * .45 - uTime * 1.47;
        vec2 slope = swellSlope(p);
        slope += rippleVisibility * (.038 * vec2(.89, .456) * cos(rippleA)
          + .026 * vec2(-.4, .916) * cos(rippleB));
        vec3 normal = normalize(vec3(-slope.x, 1.0, -slope.y));
        vec3 viewDirection = normalize(cameraPosition - vWorld);
        float facing = clamp(dot(normal, viewDirection), 0.0, 1.0);
        float fresnel = .025 + .975 * pow(1.0 - facing, 5.0);
        vec3 reflection = reflectedSky(reflect(-viewDirection, normal));

        vec3 deep = linearColor(mix(vec3(.09, .32, .39), vec3(.025, .115, .18), uNight));
        vec3 body = linearColor(mix(vec3(.27, .51, .53), vec3(.065, .235, .30), uNight));
        float waveLift = clamp(.48 + swell(p) * .7 + slope.x * 1.5, 0.0, 1.0);
        vec3 water = mix(deep, body, .28 + waveLift * .24);
        float skyFill = .84 + .16 * max(dot(normal, normalize(vec3(-.3, .8, -.5))), 0.0);
        water *= skyFill;
        vec3 color = mix(water, reflection, fresnel * .88 + .07);

        // A broad reflection sits beneath the restrained moving glints, so
        // sunlight reads as a water response rather than a painted stripe.
        vec3 halfVector = normalize(viewDirection + uSunDirection);
        float sunFacing = max(dot(normal, halfVector), 0.0);
        float glint = pow(sunFacing, 220.0) * .65 + pow(sunFacing, 32.0) * .022;
        color += linearColor(vec3(1.0, .83, .58)) * glint * (1.0 - uNight * .94);
        float horizonMist = smoothstep(70.0, 420.0, distanceToEye);
        vec3 horizon = reflectedSky(vec3(0.0, .015, -1.0));
        color = mix(color, horizon, horizonMist * .83);
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

function oceanGeometry() {
  const segments = 160, side = segments + 1;
  const positions = new Float32Array(side * side * 3), indices = [];
  // Spend vertices near the pavilion; the horizon needs only the broad swells.
  const coordinate = t => Math.sign(t) * (60 * Math.abs(t) + 440 * Math.abs(t) ** 3);
  for (let z = 0; z <= segments; z++) for (let x = 0; x <= segments; x++) {
    const index = (z * side + x) * 3;
    positions[index] = coordinate(x / segments * 2 - 1);
    positions[index + 1] = 0;
    positions[index + 2] = coordinate(z / segments * 2 - 1);
  }
  for (let z = 0; z < segments; z++) for (let x = 0; x < segments; x++) {
    const a = z * side + x, b = a + 1, c = a + side, d = c + 1;
    indices.push(a, c, b, b, c, d);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  geometry.computeBoundingBox(); geometry.boundingBox.min.y = -.36; geometry.boundingBox.max.y = .36;
  geometry.computeBoundingSphere(); geometry.boundingSphere.radius += .36;
  return geometry;
}

const RIDGES = [
  { depth: 56, heights: [0, 4, 11, 24, 33, 23, 27, 38, 18, 10, 8, 17, 29, 35, 18, 16, 5, 0] },
  { depth: 48, heights: [0, 3, 9, 16, 24, 19, 11, 16, 20, 12, 4, 9, 15, 25, 20, 10, 5, 0] },
  { depth: 42, heights: [0, 2, 6, 13, 20, 12, 8, 5, 10, 17, 23, 14, 9, 13, 10, 7, 3, 0] },
];

// A deliberate profile of peaks, shoulders and saddles, with continuous
// slopes between them. The terrain is a volume-shaped heightfield, not a card.
function ridgeHeight(heights, x) {
  const at = THREE.MathUtils.clamp((x + 270) / 540, 0, 1) * (heights.length - 1);
  const index = Math.min(heights.length - 2, Math.floor(at)), t = at - index;
  const a = heights[index], b = heights[index + 1];
  const tangentA = (b - heights[Math.max(0, index - 1)]) * .42;
  const tangentB = (heights[Math.min(heights.length - 1, index + 2)] - a) * .42;
  return Math.max(0, (2 * t ** 3 - 3 * t ** 2 + 1) * a + (t ** 3 - 2 * t ** 2 + t) * tangentA
    + (-2 * t ** 3 + 3 * t ** 2) * b + (t ** 3 - t ** 2) * tangentB);
}

function ridgeGeometry(layer, seaLevel) {
  const { depth, heights } = RIDGES[layer];
  const columns = 176, rows = 24, stride = columns + 1;
  const positions = new Float32Array((columns + 1) * (rows + 1) * 3), indices = [];
  for (let row = 0; row <= rows; row++) for (let column = 0; column <= columns; column++) {
    const x = column / columns * 540 - 270, t = row / rows;
    const height = ridgeHeight(heights, x);
    const crest = .48 + Math.sin(x * .016 + layer * 1.3) * .075;
    const across = t < crest ? t / crest : (1 - t) / (1 - crest);
    const shoulder = Math.pow(Math.sin(THREE.MathUtils.clamp(across, 0, 1) * Math.PI / 2), 1.7);
    const front = THREE.MathUtils.clamp((t - crest) / (1 - crest), 0, 1);
    // Broad drainage folds articulate the visible slopes; none displace the
    // authored skyline or create detached islands in front of the coast.
    const drainage = (.55 + .45 * Math.sin(x * .14 + front * 3.8 + layer))
      * height * .12 * Math.sin(front * Math.PI);
    const offset = (row * stride + column) * 3;
    positions[offset] = x;
    positions[offset + 1] = seaLevel - 4 + height * shoulder - drainage;
    positions[offset + 2] = (t - .5) * depth + Math.sin(x * .023 + layer) * 3.5 * Math.sin(t * Math.PI);
  }
  for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
    const a = row * stride + column, b = a + 1, c = a + stride, d = c + 1;
    indices.push(a, c, b, b, c, d);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  const normals = geometry.attributes.normal, colors = new Float32Array(positions.length);
  const valley = new THREE.Color([0x67868c, 0x557b7d, 0x416e70][layer]);
  const stone = new THREE.Color([0x94aaa5, 0x91a28f, 0x91a18b][layer]);
  const color = new THREE.Color();
  for (let i = 0; i < normals.count; i++) {
    const elevation = THREE.MathUtils.clamp((positions[i * 3 + 1] - seaLevel) / 30, 0, 1);
    const rock = THREE.MathUtils.clamp((1 - normals.getY(i)) * 1.1 + elevation * .42, 0, .78);
    color.copy(valley).lerp(stone, rock);
    color.toArray(colors, i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}

/**
 * Replace only the supplied original sea and terrain, retaining their refs.
 *
 * Integration: createCoastalWorld({ scene, sea, terrainMaterials }) after the
 * existing terrain loop. terrainMaterials is main.js's [{ material, day }]
 * array; an explicit `terrain: [mesh, ...]` may be supplied instead. Existing
 * sky, lights, fog and planet remain in charge of the pavilion environment.
 * Call update(time, night) each frame; dispose() restores original visibility.
 */
export function createCoastalWorld({ scene, sea, terrain = [], terrainMaterials = [] }) {
  if (!scene || !sea?.isMesh) throw new TypeError('Coastal world requires the existing scene and sea mesh.');
  const originals = new Set(terrain);
  if (terrainMaterials.length) {
    const oldMaterials = new Set(terrainMaterials.map(entry => entry.material));
    scene.traverse(object => { if (object.isMesh && oldMaterials.has(object.material)) originals.add(object); });
  }
  const oldTerrain = [...originals];
  originals.add(sea);
  const visibility = [...originals].map(object => ({ object, visible: object.visible }));
  visibility.forEach(({ object }) => { object.visible = false; });

  const group = new THREE.Group(); group.name = 'coastal world / shaped water and ridges'; scene.add(group);
  const waterMaterial = oceanMaterial();
  const ocean = new THREE.Mesh(oceanGeometry(), waterMaterial);
  ocean.name = 'coast / open water'; ocean.position.y = sea.position.y;
  ocean.raycast = () => {}; group.add(ocean);
  const mountains = RIDGES.map((_, layer) => {
    const material = new THREE.MeshStandardMaterial({
      name: `coast / atmospheric ridge ${layer + 1}`, color: 0xffffff,
      roughness: .96, metalness: 0, vertexColors: true, envMapIntensity: .12,
    });
    const mountain = new THREE.Mesh(ridgeGeometry(layer, sea.position.y), material);
    mountain.name = `coast / shaped ridge ${layer + 1}`;
    mountain.position.set(oldTerrain[layer]?.position.x ?? layer * 60 - 40, 0, oldTerrain[layer]?.position.z ?? -220 + layer * 35);
    mountain.raycast = () => {}; group.add(mountain); return mountain;
  });
  let disposed = false;
  function update(time, night) {
    if (disposed) return;
    const n = THREE.MathUtils.clamp(Number.isFinite(night) ? night : 0, 0, 1);
    waterMaterial.uniforms.uTime.value = Number.isFinite(time) ? time : 0;
    waterMaterial.uniforms.uNight.value = n;
    for (const mountain of mountains) mountain.material.color.setRGB(1 - n * .27, 1 - n * .18, 1 - n * .06);
  }
  return {
    group, ocean, mountains, update,
    dispose() {
      if (disposed) return; disposed = true;
      group.removeFromParent();
      for (const mesh of [ocean, ...mountains]) { mesh.geometry.dispose(); mesh.material.dispose(); }
      visibility.forEach(({ object, visible }) => { object.visible = visible; });
    },
  };
}
