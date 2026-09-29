import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from './vendor/three.module.min.js';

const threeURL = new URL('./vendor/three.module.min.js', import.meta.url).href;
const source = (await readFile(new URL('./bridge-portal.js', import.meta.url), 'utf8'))
  .replace("from 'three'", `from '${threeURL}'`);
const { createBridgePortal } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const TRACE_END = .005 + .8 / 6;

test('Bridge traces a fixed doorway before making its interior opaque', () => {
  const scene = new THREE.Scene(), portal = createBridgePortal({ scene });
  const group = scene.children[0], uniforms = group.children[0].material.uniforms;
  assert.equal(group.visible, false);
  let priorTrace = 0;
  for (let step = 1; step <= 100; step++) {
    const progress = step / 100;
    portal.update({ time: 5, progress, pixelRatio: 1.5 });
    assert.equal(portal.radius, 2.55, 'the doorway must never grow radially');
    assert.ok(uniforms.uTrace.value >= priorTrace);
    if (progress <= TRACE_END) assert.equal(uniforms.uAperture.value, 0);
    if (uniforms.uAperture.value > 0) assert.equal(uniforms.uTrace.value, 1);
    if (progress >= .16) assert.equal(uniforms.uAperture.value, 1);
    if (progress >= .03 && progress <= .9) assert.equal(uniforms.uAlpha.value, 1);
    priorTrace = uniforms.uTrace.value;
  }
  assert.equal(group.visible, false);
  assert.equal(uniforms.uAlpha.value, 0);
  portal.update({ time: 50, progress: .5, reduced: true });
  assert.equal(uniforms.uTime.value, 0);
  assert.equal(uniforms.uMotion.value, 0);
  const intensity = group.children.find(item => item.isLight).intensity;
  portal.update({ time: 100, progress: .5, reduced: true });
  assert.equal(group.children.find(item => item.isLight).intensity, intensity);
  portal.dispose();
});

test('Bridge ribbon budgets, bounds and disposal stay bounded across resize', () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const scene = new THREE.Scene(), portal = createBridgePortal({ scene });
  const group = scene.children[0];
  const objects = group.children.filter(item => item.geometry);
  const buffers = objects.map(item => item.geometry.attributes.position.array);
  let released = 0;
  for (const item of objects) {
    item.geometry.addEventListener('dispose', () => released++);
    item.material.addEventListener('dispose', () => released++);
  }
  try {
    Object.defineProperty(globalThis, 'window', { value: { innerWidth: 1280 }, configurable: true });
    function budget() {
      let particles = 0, vertices = 0;
      for (const item of objects) {
        const geometry = item.geometry;
        if (geometry.isInstancedBufferGeometry) {
          assert.ok(geometry.instanceCount <= geometry.attributes.aSeed.count);
          particles += geometry.instanceCount;
          vertices += geometry.attributes.position.count * geometry.instanceCount;
          assert.ok(Math.max(...geometry.index.array) < geometry.attributes.position.count);
        } else if (item.isPoints) {
          assert.ok(geometry.drawRange.count <= geometry.attributes.position.count);
          particles += geometry.drawRange.count; vertices += geometry.drawRange.count;
        }
      }
      return { particles, vertices };
    }
    portal.update({ progress: .5 });
    assert.deepEqual(budget(), { particles: 3500, vertices: 10988 });
    window.innerWidth = 390; portal.update({ progress: .5 });
    assert.deepEqual(budget(), { particles: 1800, vertices: 5785 });
    window.innerWidth = 1280; portal.update({ progress: .5 });
    assert.deepEqual(budget(), { particles: 3500, vertices: 10988 });
    for (let i = 0; i < objects.length; i++) assert.equal(objects[i].geometry.attributes.position.array, buffers[i]);
    assert.equal(objects.some(item => item.isLineSegments), false, 'trails must not depend on one-pixel GL lines');
    // A conservative analytic bound covers radial speed, maximum tangential
    // launch, gravity, depth and ribbon width over the entire ember lifetime.
    const maxXY = Math.hypot(.988 + .30, 1.05 * 1.5) + .76;
    const maxZ = .032 + .55 * .52;
    const maxFlightRadius = Math.hypot(maxXY, maxZ) * 2.55 + .08;
    const embers = objects.find(item => item.name === 'Curved ballistic spark ribbons');
    assert.ok(embers.geometry.boundingSphere.radius > maxFlightRadius);
    const bristles = objects.find(item => item.name === 'Broken white-gold filaments');
    const maxBrushRadius = Math.hypot(.984 + .014 + .019 + .016 + .10, .044) * 2.55 + .08;
    assert.ok(bristles.geometry.boundingSphere.radius > maxBrushRadius);
    assert.equal(bristles.geometry.instanceCount, 144);
    const position = new THREE.Vector3(0, 4.8, 1.1), quaternion = new THREE.Quaternion();
    portal.place(position, quaternion);
    assert.ok(group.position.equals(position)); assert.ok(group.quaternion.equals(quaternion));
    portal.update({ progress: .5, time: NaN, pixelRatio: NaN });
    assert.ok(Number.isFinite(group.children.find(item => item.isLight).intensity));
    portal.dispose(); portal.dispose();
    assert.equal(released, objects.length * 2); assert.equal(scene.children.length, 0);
  } finally {
    portal.dispose();
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
    else delete globalThis.window;
  }
});

test('completed ignition keeps orbiting while the doorway stays fully open', () => {
  const scene = new THREE.Scene(), portal = createBridgePortal({ scene });
  const group = scene.children[0], uniforms = group.children[0].material.uniforms;
  portal.update({ time: 10, progress: .1 });
  assert.equal(uniforms.uOrbit.value, 0);
  portal.update({ time: 11, progress: TRACE_END });
  assert.equal(uniforms.uOrbit.value, 0, 'the orbital head starts at the completed trace, without a jump');
  for (const time of [11.1, 12, 15]) {
    portal.update({ time, progress: .5 });
    assert.equal(uniforms.uOrbit.value, time - 11);
    assert.equal(uniforms.uTrace.value, 1);
    assert.equal(uniforms.uAperture.value, 1);
    assert.equal(portal.radius, 2.55);
  }
  const filaments = group.children.find(item => item.name === 'Broken white-gold filaments');
  const leaders = Array.from(filaments.geometry.attributes.aLayer.array).filter(layer => layer >= 0);
  assert.deepEqual(leaders, [0, 1, 2, 0, 1, 2]);
  assert.equal(uniforms.uRibbonCap.value, 4.2);
  portal.update({ time: 18, progress: .5, reduced: true });
  assert.equal(uniforms.uOrbit.value, 0);
  assert.equal(uniforms.uTime.value, 0);
  portal.update({ time: 19, progress: 0 });
  portal.update({ time: 25, progress: TRACE_END });
  assert.equal(uniforms.uOrbit.value, 0, 'a reopened portal must start a fresh orbit');
  portal.dispose();
});

test('the 0.8-second drawing phase crosses closure at a continuous 1.25 turns per second', () => {
  const scene = new THREE.Scene(), portal = createBridgePortal({ scene });
  const uniforms = scene.children[0].children[0].material.uniforms;
  // The six-second host timeline starts drawing at .03s and closes at .83s.
  // Deliberately skip the exact crossing to cover ordinary animation frames.
  const times = [.824, .8294, .8306, .836];
  let previousTime, previousPhase;
  for (const time of times) {
    portal.update({ time, progress: time / 6 });
    const phase = portal.phase;
    assert.equal(phase, uniforms.uPhase.value, 'SFX reads the same unwrapped phase as the visual leader');
    if (previousTime !== undefined) {
      const velocity = (phase - previousPhase) / (time - previousTime);
      assert.ok(Math.abs(velocity - 1.25) < 1e-9, `phase velocity must remain continuous across closure: ${velocity}`);
    }
    if (time > .83) {
      assert.ok(Math.abs(phase - (1 + (time - .83) * 1.25)) < 1e-10);
      assert.ok(uniforms.uOrbit.value > 0, 'carry the crossing-frame remainder into the running wheel');
    }
    previousTime = time; previousPhase = phase;
  }
  assert.throws(() => { portal.phase = 0; }, TypeError, 'external audio cannot mutate the visual phase');
  portal.dispose();
});
