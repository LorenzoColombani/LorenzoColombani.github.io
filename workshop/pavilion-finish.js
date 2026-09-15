import * as THREE from 'three';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';

/**
 * Refine the existing pavilion without moving its objects or hit targets.
 *
 * Required refs: the existing scene, table Group, cabinet Group and palette
 * returned by createIllustratedMaterials(). Call after their construction.
 * Optional refs: canopy Mesh; columns = the four existing pylon Groups;
 * wings = the two existing white cantilever slab Meshes. Their current
 * dimensions are retained. No models, animations, listeners or light values
 * are changed. dispose() restores geometry/visibility and removes this finish.
 */
export function createPavilionFinish({ scene, table, cabinet, palette, canopy, columns = [], wings = [] }) {
  if (!scene || !table || !cabinet || !palette) {
    throw new TypeError('Pavilion finish requires scene, table, cabinet and palette.');
  }
  const geometries = new Set(), materials = new Set(), additions = [], replacements = [], hiddenOriginals = [];
  const ownGeometry = geometry => (geometries.add(geometry), geometry);
  const ownMaterial = material => (materials.add(material), material);
  const surface = (color, roughness, metalness = 0) => ownMaterial(new THREE.MeshStandardMaterial({ color, roughness, metalness }));
  const gasket = surface(0x1c3032, .82);
  const underside = surface(0xc3c9bb, .64, .025);
  const glass = ownMaterial(new THREE.MeshPhysicalMaterial({
    color: 0x9bc7cf, roughness: .13, metalness: .05, clearcoat: .75, clearcoatRoughness: .12,
    transparent: true, opacity: .4, transmission: .2, thickness: .035, depthWrite: false,
  }));

  function group(parent, name) {
    const result = new THREE.Group();
    result.name = name; parent.add(result); additions.push(result);
    return result;
  }
  function mesh(parent, geometry, material, position = [0, 0, 0], name = '') {
    const result = new THREE.Mesh(geometry, material);
    result.name = name; result.position.set(...position);
    result.castShadow = true; result.receiveShadow = true;
    // Finish pieces have no interaction semantics; retain the original target
    // meshes even if a caller later switches to recursive scene raycasting.
    result.raycast = () => {};
    parent.add(result); return result;
  }
  function rounded(w, h, d, radius = .04) {
    return ownGeometry(new RoundedBoxGeometry(w, h, d, 4, Math.min(radius, w / 2, h / 2, d / 2)));
  }
  function turned(profile, segments = 128) {
    return ownGeometry(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segments));
  }
  function ring(parent, radius, tube, material, y, name = '') {
    const result = mesh(parent, ownGeometry(new THREE.TorusGeometry(radius, tube, 12, 128)), material, [0, y, 0], name);
    result.rotation.x = Math.PI / 2; return result;
  }
  function replace(object, geometry, material = object.material, position = null) {
    replacements.push({ object, geometry: object.geometry, material: object.material, position: object.position.clone() });
    object.geometry = geometry; object.material = material;
    if (position) object.position.set(...position);
  }
  function hide(object) {
    hiddenOriginals.push({ object, visible: object.visible }); object.visible = false;
  }
  const near = (a, b) => Math.abs(a - b) < .001;

  // Retain the central pedestal, but replace the roulette-like worktop grammar
  // with a rectangular optical console. Original references remain alive for
  // animation, interaction and complete restoration on dispose.
  const tableFinish = group(table, 'pavilion-finish / instrument table');
  for (const object of [...table.children]) {
    if (object.isGroup) {
      if (object !== tableFinish && object.children.some(child => child.geometry?.type === 'OctahedronGeometry' && near(child.geometry.parameters.radius, .2))) hide(object);
      continue;
    }
    if (!object.isMesh) continue;
    const p = object.geometry.parameters;
    if (object.geometry.type === 'TorusGeometry' && p.radius > 2.2) {
      hide(object); continue;
    }
    if (['BoxGeometry', 'RoundedBoxGeometry'].includes(object.geometry.type) && near(p.width, .024) && near(p.height, .013)) {
      hide(object); continue;
    }
    if (object.geometry.type !== 'CylinderGeometry') continue;
    const { radiusTop: radius } = p;
    if (near(radius, 2.55)) {
      replace(object, turned([[0, -.17], [2.28, -.17], [2.43, -.145], [2.52, -.09], [2.55, -.025], [2.54, .065], [2.48, .125], [2.35, .17], [0, .17]]));
    } else if (near(radius, 1.9)) {
      replace(object, turned([[0, -.325], [1.99, -.325], [2.07, -.30], [2.1, -.25], [2.07, -.12], [1.98, .12], [1.91, .27], [1.85, .325], [0, .325]]));
    } else if (near(radius, 1.8)) {
      replace(object, turned([[0, -.325], [1.25, -.325], [1.31, -.28], [1.42, -.10], [1.63, .12], [1.77, .255], [1.8, .30], [1.76, .325], [0, .325]]));
    } else if (near(radius, 3.45) || near(radius, 3.16) || near(radius, 2.18)) {
      hide(object);
    }
  }
  ring(tableFinish, 2.34, .022, gasket, .036, 'table / floor contact reveal');
  ring(tableFinish, 1.86, .018, gasket, 1.005, 'table / ceramic shoulder joint');

  function rectangleShape(width, depth, radius) {
    const x = width / 2, z = depth / 2, r = Math.min(radius, x, z);
    const shape = new THREE.Shape();
    shape.moveTo(-x + r, -z); shape.lineTo(x - r, -z); shape.quadraticCurveTo(x, -z, x, -z + r);
    shape.lineTo(x, z - r); shape.quadraticCurveTo(x, z, x - r, z);
    shape.lineTo(-x + r, z); shape.quadraticCurveTo(-x, z, -x, z - r);
    shape.lineTo(-x, -z + r); shape.quadraticCurveTo(-x, -z, -x + r, -z);
    shape.closePath(); return shape;
  }
  function consoleGeometry(width, depth, radius, height, opening = null, bevel = .03) {
    const shape = rectangleShape(width, depth, radius);
    if (opening) shape.holes.push(opening);
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: height, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel,
      bevelSegments: 3, curveSegments: 12, steps: 1,
    });
    geometry.rotateX(-Math.PI / 2); geometry.translate(0, -height / 2, 0);
    return ownGeometry(geometry);
  }
  mesh(tableFinish, consoleGeometry(6.8, 4.42, .54, .115, null, .018), palette.graphite, [0, 1.60, 0], 'console / formed lower enclosure');
  mesh(tableFinish, consoleGeometry(6.94, 4.55, .62, .22, rectangleShape(5.84, 3.68, .41), .035), palette.ivory, [0, 1.698, 0], 'console / soft rectangular enamel frame');
  mesh(tableFinish, consoleGeometry(5.79, 3.63, .38, .055, null, .012), surface(0x17353f, .36, .24), [0, 1.71, 0], 'console / recessed optical chamber');
  const window = mesh(tableFinish, consoleGeometry(5.68, 3.51, .33, .027, null, .005), glass, [0, 1.794, 0], 'console / inset optical glass');
  window.castShadow = false;

  // A compact rectangular carrier seats the existing round projector, leaving
  // its actual plate, charged coils, central lens and scan animation uncovered.
  const aperture = new THREE.Path(); aperture.absarc(0, 0, 1.288, 0, Math.PI * 2, true);
  mesh(tableFinish, consoleGeometry(3.02, 2.92, .35, .033, null, .008), gasket, [0, 1.837, 0], 'emitter / isolation seat');
  mesh(tableFinish, consoleGeometry(2.98, 2.87, .34, .058, aperture, .017), palette.ceramic, [0, 1.9, 0], 'emitter / fitted rectangular optical carrier');

  // Two flush source seats and two traces beneath the window make the optical
  // relationship readable. The floating source objects and event targets at
  // x +/-2.5, z 1.35 are independent originals and are never touched here.
  const traceMaterial = ownMaterial(new THREE.MeshBasicMaterial({ color: 0x92dbe9, transparent: true, opacity: .34, depthWrite: false, toneMapped: false }));
  const sourceLight = ownMaterial(new THREE.MeshBasicMaterial({ color: 0xabe8e8, toneMapped: false }));
  const sourceGeometry = consoleGeometry(.68, .54, .12, .025, null, .008);
  const sourceSlot = rounded(.34, .009, .018, .004);
  for (const side of [-1, 1]) {
    mesh(tableFinish, sourceGeometry, palette.graphite, [side * 2.5, 1.835, 1.35], 'console / flush source seat');
    const light = mesh(tableFinish, sourceSlot, sourceLight, [side * 2.5, 1.857, 1.48], 'console / source contact light');
    light.castShadow = false;
    const path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 2.5, 1.772, 1.35), new THREE.Vector3(side * 2.5, 1.772, -.44),
      new THREE.Vector3(side * 2.25, 1.772, -.67), new THREE.Vector3(side * 1.16, 1.772, -.67),
    ], false, 'centripetal');
    const trace = mesh(tableFinish, ownGeometry(new THREE.TubeGeometry(path, 40, .008, 6, false)), traceMaterial, [0, 0, 0], 'console / optical source path');
    trace.castShadow = false;
  }

  // Properly inset drawer faces, finger pockets and supported cabinet ends.
  const cabinetFinish = group(cabinet, 'pavilion-finish / instrument cabinet');
  for (const object of [...cabinet.children]) {
    if (!object.isMesh) continue;
    const p = object.geometry.parameters;
    if (['BoxGeometry', 'RoundedBoxGeometry'].includes(object.geometry.type)) {
      if (near(p.width, 4.4)) replace(object, rounded(4.4, 1.1, 1.2, .085));
      else if (near(p.width, 4.6)) replace(object, rounded(4.6, .12, 1.4, .045));
      else if (near(p.width, .95)) replace(object, rounded(.945, .68, .072, .032), palette.ceramic, [object.position.x, .82, .632]);
      else if (near(p.width, .35)) replace(object, rounded(.38, .046, .082, .018), palette.bronze, [object.position.x, 1.04, .711]);
    } else if (object.geometry.type === 'IcosahedronGeometry') {
      const crystalMaterial = ownMaterial(new THREE.MeshPhysicalMaterial({
        color: object.material.color, roughness: .25, metalness: .3, clearcoat: .45, clearcoatRoughness: .22, flatShading: true,
      }));
      replace(object, ownGeometry(new THREE.IcosahedronGeometry(p.radius, 1)), crystalMaterial);
    }
  }
  mesh(cabinetFinish, rounded(4.49, .034, 1.32, .015), gasket, [0, 1.25, 0], 'cabinet / worktop shadow joint');
  const cheekGeometry = rounded(.072, .985, 1.22, .025);
  const footGeometry = rounded(.22, .155, .94, .045);
  for (const side of [-1, 1]) {
    mesh(cabinetFinish, cheekGeometry, palette.ivory, [side * 2.208, .743, 0], 'cabinet / fitted enamel end');
    mesh(cabinetFinish, footGeometry, gasket, [side * 1.82, .082, 0], 'cabinet / grounded foot');
  }
  const pocketGeometry = rounded(.47, .088, .024, .012);
  for (let i = 0; i < 4; i++) {
    mesh(cabinetFinish, pocketGeometry, gasket, [-1.6 + i * 1.05, 1.04, .677], 'cabinet / recessed finger pocket');
  }

  // Keep the original six-sided architectural language, but soften its
  // corners and land each column in a formed shoe and compression collar.
  function roundedHex(profile) {
    const contour = [];
    const corners = Array.from({ length: 6 }, (_, i) => new THREE.Vector2(Math.cos(i * Math.PI / 3), Math.sin(i * Math.PI / 3)));
    for (let i = 0; i < 6; i++) {
      const corner = corners[i], start = corner.clone().lerp(corners[(i + 5) % 6], .18), end = corner.clone().lerp(corners[(i + 1) % 6], .18);
      for (let j = 0; j <= 6; j++) {
        const t = j / 6;
        contour.push(start.clone().multiplyScalar((1 - t) ** 2).addScaledVector(corner, 2 * t * (1 - t)).addScaledVector(end, t * t));
      }
    }
    const positions = [], indices = [], n = contour.length;
    for (const [r, y] of profile) for (const v of contour) positions.push(v.x * r, y, v.y * r);
    for (let row = 0; row < profile.length - 1; row++) for (let i = 0; i < n; i++) {
      const a = row * n + i, b = row * n + (i + 1) % n, c = a + n, d = b + n;
      indices.push(a, c, b, b, c, d);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    return ownGeometry(geometry);
  }
  const shoeGeometry = roundedHex([[0, .17], [.71, .17], [.755, .205], [.76, .25], [.73, .52], [.695, .58], [0, .58]]);
  const collarGeometry = roundedHex([[0, 9.64], [.465, 9.64], [.515, 9.68], [.52, 9.79], [.485, 9.835], [0, 9.835]]);
  for (const column of columns) {
    for (const object of [...column.children]) {
      if (!object.isMesh || object.geometry.type !== 'CylinderGeometry') continue;
      const p = object.geometry.parameters;
      if (near(p.height, 9.9)) replace(object, roundedHex([[0, -4.95], [.67, -4.95], [.7, -4.91], [.697, -4.84], [.433, 4.87], [.425, 4.93], [.40, 4.95], [0, 4.95]]));
      else if (near(p.height, .28)) replace(object, roundedHex([[0, -.14], [.89, -.14], [.935, -.115], [.94, -.065], [.855, .10], [.82, .14], [0, .14]]));
    }
    const joint = group(column, 'pavilion-finish / column joints');
    mesh(joint, shoeGeometry, palette.ceramic, [0, 0, 0], 'column / formed ankle shoe').rotation.y = Math.PI / 6;
    mesh(joint, collarGeometry, palette.graphite, [0, 0, 0], 'column / compression collar').rotation.y = Math.PI / 6;
  }

  for (const wing of wings) {
    const p = wing.geometry?.parameters;
    if (p?.width && p?.height && p?.depth) replace(wing, rounded(p.width, p.height, p.depth, .13));
  }
  if (canopy) {
    const soffit = group(scene, 'pavilion-finish / fitted canopy soffit');
    // Match the canopy's x/z placement. The two bands sit to either side of
    // its existing curved central rib, with seven quiet expansion joints.
    soffit.position.set(canopy.position.x, canopy.position.y - .126, canopy.position.z);
    for (const [inner, outer] of [[12.57, 13.59], [14.81, 15.88]]) for (let bay = 0; bay < 7; bay++) {
      const start = .065 + bay * (Math.PI - .13) / 7 + .012;
      const end = .065 + (bay + 1) * (Math.PI - .13) / 7 - .012;
      const shape = new THREE.Shape();
      shape.absarc(0, 0, outer, start, end, false);
      shape.absarc(0, 0, inner, end, start, true); shape.closePath();
      const geometry = ownGeometry(new THREE.ExtrudeGeometry(shape, { depth: .028, bevelEnabled: true, bevelThickness: .012, bevelSize: .018, bevelSegments: 2, curveSegments: 20 }));
      const panel = mesh(soffit, geometry, underside, [0, 0, 0], 'canopy / inset curved panel');
      panel.rotation.x = -Math.PI / 2;
    }
  }

  let disposed = false;
  return {
    groups: additions,
    dispose() {
      if (disposed) return; disposed = true;
      for (const { object, geometry, material, position } of replacements.reverse()) {
        object.geometry = geometry; object.material = material; object.position.copy(position);
      }
      hiddenOriginals.forEach(({ object, visible }) => { object.visible = visible; });
      additions.forEach(object => object.removeFromParent());
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
    },
  };
}
