import * as THREE from 'three';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/** A room-scale continuation of the film's own sampled geometry and clock. */
export function createStoryTimeline({ scene, camera, canvas, getFilm }) {
  const group = new THREE.Group();
  group.name = 'Film timeline in the workshop';
  group.visible = false;
  scene.add(group);
  let film = null, branches = [], spine = null, bead = null, halo = null;
  let slider = null, focused = false, drag = null, listening = false;
  let railPoints = [], lastTime = -1;
  const projected = new THREE.Vector3();
  const rail = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-5.4, 2.1, 3.3),
    new THREE.Vector3(-3, 1.98, 5.15),
    new THREE.Vector3(0, 1.9, 5.9),
    new THREE.Vector3(3, 1.98, 5.15),
    new THREE.Vector3(5.4, 2.1, 3.3),
  ]);

  function material(color, opacity) {
    return new THREE.MeshBasicMaterial({ color, transparent: true, opacity,
      depthWrite: false, blending: THREE.AdditiveBlending });
  }
  function tube(points, radius, color, opacity) {
    const curve = new THREE.CatmullRomCurve3(points);
    const segments = Math.max(48, points.length - 1);
    const geometry = new THREE.TubeGeometry(curve, segments, radius, 6, false);
    const mesh = new THREE.Mesh(geometry, material(color, opacity));
    group.add(mesh);
    return { mesh, segments, curve };
  }
  function length(tubeInfo, fraction) {
    tubeInfo.mesh.geometry.setDrawRange(0, Math.floor(clamp(fraction) * tubeInfo.segments) * 36);
    tubeInfo.mesh.visible = fraction > 0.001;
  }
  function label(text, position) {
    const surface = document.createElement('canvas');
    surface.width = 768; surface.height = 96;
    const ctx = surface.getContext('2d');
    ctx.font = '500 31px monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = '#d3f6f0'; ctx.fillText(text, 384, 56);
    const texture = new THREE.CanvasTexture(surface);
    texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 0.34),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false,
        opacity: 0.7, side: THREE.DoubleSide }));
    mesh.position.copy(position); mesh.position.y += 0.22;
    group.add(mesh);
    return mesh;
  }
  function release(event) {
    if (!drag || (event && event.pointerId !== drag.id)) return;
    const previous = drag; drag = null;
    try { previous.target.releasePointerCapture(previous.id); } catch (_) { /* Already released. */ }
    if (film === previous.film && previous.resume) film.play();
  }
  function clear() {
    // Closing/changing the film cancels a gesture without restarting its audio.
    if (drag) drag.resume = false;
    release();
    if (listening) {
      canvas.removeEventListener('pointerdown', down, true);
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', up, true);
      window.removeEventListener('pointercancel', up, true);
      listening = false;
    }
    slider?.remove(); slider = null;
    const geometries = new Set(), materials = new Set(), textures = new Set();
    group.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) {
        const values = Array.isArray(object.material) ? object.material : [object.material];
        for (const mat of values) { materials.add(mat); if (mat.map) textures.add(mat.map); }
      }
    });
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
    group.clear(); group.visible = false;
    branches = []; spine = bead = halo = null; railPoints = []; focused = false; lastTime = -1;
  }
  function build(next) {
    const snapshot = next.geometrySnapshot?.();
    if (!snapshot?.spine?.length) return false;
    const forks = (snapshot.forks || []).filter(f => Number.isInteger(f.tagIdx) && f.tagIdx >= 0 && f.tagIdx < 7 && f.points?.length > 1).slice(0, 7);
    const box = new THREE.Box3();
    for (const point of snapshot.spine) box.expandByPoint(new THREE.Vector3(...point));
    for (const fork of forks) for (const point of fork.points) box.expandByPoint(new THREE.Vector3(...point));
    const center = box.getCenter(new THREE.Vector3());
    const scale = 14 / Math.max(0.001, box.max.x - box.min.x);
    const offset = new THREE.Vector3(0, 4, -2.5);
    const transform = p => new THREE.Vector3(...p).sub(center).multiplyScalar(scale).add(offset);
    spine = tube(snapshot.spine.map(transform), 0.022, 0x9affeb, 0.68);
    for (const fork of forks) {
      const points = fork.points.map(transform);
      branches.push({ ...fork, ...tube(points, 0.014, 0x83efd8, 0.65),
        label: label(snapshot.roles?.[fork.tagIdx] || '', points[points.length - 1]) });
    }
    tube(rail.getPoints(120), 0.014, 0x8adfdf, 0.3);
    railPoints = rail.getPoints(240);
    bead = new THREE.Mesh(new THREE.SphereGeometry(0.095, 16, 12), material(0xc2fff4, 0.95));
    halo = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), material(0x73f4e0, 0.13));
    bead.add(halo); group.add(bead);
    slider = document.createElement('div');
    slider.setAttribute('role', 'slider'); slider.setAttribute('aria-label', 'Film timeline. Drag or use arrow keys to seek.');
    slider.setAttribute('aria-valuemin', '0'); slider.setAttribute('aria-valuemax', String(next.dur));
    slider.setAttribute('aria-orientation', 'horizontal'); slider.tabIndex = 0;
    Object.assign(slider.style, { position: 'fixed', width: '44px', height: '44px',
      transform: 'translate(-50%, -50%)', background: 'transparent', border: '0',
      outline: 'none', zIndex: '35', cursor: 'grab', touchAction: 'none' });
    slider.addEventListener('focus', () => { focused = true; });
    slider.addEventListener('blur', () => { focused = false; });
    slider.addEventListener('pointerdown', down);
    slider.addEventListener('keydown', event => {
      if (!film) return;
      const step = event.shiftKey ? 10 : 2;
      let time = film.t();
      if (event.key === 'Home') time = 0;
      else if (event.key === 'End') time = film.dur;
      else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') time += step;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') time -= step;
      else return;
      event.preventDefault(); event.stopImmediatePropagation(); film.seek(clamp(time, 0, film.dur));
    });
    document.body.append(slider);
    canvas.addEventListener('pointerdown', down, true);
    window.addEventListener('pointermove', move, true);
    window.addEventListener('pointerup', up, true);
    window.addEventListener('pointercancel', up, true);
    listening = true; group.visible = true;
    return true;
  }
  function screen(point, rect) {
    projected.copy(point).project(camera);
    return { x: rect.left + (projected.x + 1) * rect.width / 2,
      y: rect.top + (1 - projected.y) * rect.height / 2, z: projected.z };
  }
  function seekAt(event) {
    const rect = canvas.getBoundingClientRect();
    let best = Infinity, index = 0;
    railPoints.forEach((point, i) => {
      const p = screen(point, rect);
      const distance = (p.x - event.clientX) ** 2 + (p.y - event.clientY) ** 2;
      if (p.z >= -1 && p.z <= 1 && distance < best) { best = distance; index = i; }
    });
    if (Number.isFinite(best)) film.seek(index / (railPoints.length - 1) * film.dur);
  }
  function down(event) {
    if (!film || !bead || drag || event.button !== 0 || (film.started && !film.started())) return;
    const p = screen(bead.position, canvas.getBoundingClientRect());
    if (p.z < -1 || p.z > 1) return;
    if (event.currentTarget !== slider && Math.hypot(p.x - event.clientX, p.y - event.clientY) > 28) return;
    event.preventDefault(); event.stopImmediatePropagation();
    slider.focus({ preventScroll: true });
    drag = { id: event.pointerId, target: event.currentTarget, film,
      resume: !film.paused() && (typeof film.started !== 'function' || film.started()) };
    film.pause();
    try { drag.target.setPointerCapture(event.pointerId); } catch (_) { /* Global move handles fallback. */ }
    slider.style.cursor = 'grabbing'; seekAt(event);
  }
  function move(event) {
    if (!drag || event.pointerId !== drag.id) return;
    event.preventDefault(); event.stopImmediatePropagation(); seekAt(event);
  }
  function up(event) {
    if (!drag || event.pointerId !== drag.id) return;
    event.preventDefault(); event.stopImmediatePropagation(); release(event);
    if (slider) slider.style.cursor = 'grab';
  }
  function update() {
    const next = getFilm();
    if (next !== film) { clear(); film = next; }
    if (!film) return;
    if (!spine && !build(film)) return;
    const time = clamp(Number(film.t()) || 0, 0, film.dur);
    const C = film.C || {};
    const revival = Number.isFinite(C.preTurn) && Number.isFinite(C.turn)
      ? clamp((time - C.preTurn) / Math.max(0.01, C.turn - C.preTurn)) : 0;
    length(spine, clamp((time - (C.wordmark || 0)) / 2.6));
    for (const branch of branches) {
      const growth = clamp((time - branch.t0) / 1.5);
      const remaining = branch.prune > 0 && time >= branch.prune ? 1 - clamp((time - branch.prune) / 0.75) : 1;
      const amount = Math.max(growth * remaining, revival);
      length(branch, amount);
      const burning = branch.prune > 0 && time >= branch.prune && time < branch.prune + 0.75;
      branch.mesh.material.color.setHex(burning ? 0xffb56c : 0x83efd8);
      branch.label.visible = amount > 0.92;
      branch.label.material.opacity = 0.65 * amount;
      branch.label.quaternion.copy(camera.quaternion);
    }
    bead.position.copy(rail.getPoint(time / Math.max(0.01, film.dur)));
    halo.scale.setScalar(focused || drag ? 1.5 : 1);
    halo.material.opacity = focused || drag ? 0.4 : 0.13;
    const hasStarted=typeof film.started !== 'function'||film.started();bead.visible=hasStarted;
    const rect = canvas.getBoundingClientRect(), p = screen(bead.position, rect);
    slider.style.display = !hasStarted || p.z < -1 || p.z > 1 || p.x < rect.left || p.x > rect.right || p.y < rect.top || p.y > rect.bottom ? 'none' : 'block';
    slider.style.left = `${p.x}px`; slider.style.top = `${p.y}px`;
    const second = Math.floor(time);
    if (second !== lastTime) {
      slider.setAttribute('aria-valuenow', String(second));
      slider.setAttribute('aria-valuetext', `${Math.floor(second / 60)} minutes ${second % 60} seconds`);
      lastTime = second;
    }
  }
  return { update, dispose() { clear(); film = null; scene.remove(group); } };
}
