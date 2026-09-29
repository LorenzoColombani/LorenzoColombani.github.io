import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from './vendor/three.module.min.js';
import { usePhysicalOcclusion } from './physical-occlusion.js';

test('ambient occlusion sees physical geometry, not projected light or glass', () => {
  const scene = new THREE.Scene();
  const solid = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
  const optical = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.ShaderMaterial({ transparent: true }));
  const hitTarget = new THREE.Mesh(new THREE.SphereGeometry(), new THREE.MeshBasicMaterial({ visible: false }));
  const alreadyHidden = optical.clone(); alreadyHidden.visible = false;
  scene.add(solid, optical, hitTarget, alreadyHidden);
  const pass = { render(value) {
    assert.equal(solid.visible, true);
    assert.equal(optical.visible, false);
    assert.equal(hitTarget.visible, false);
    assert.equal(alreadyHidden.visible, false);
    return value;
  } };
  const original = pass.render, restore = usePhysicalOcclusion(pass, scene);
  assert.equal(pass.render('rendered'), 'rendered');
  assert.equal(optical.visible, true);
  assert.equal(hitTarget.visible, true);
  assert.equal(alreadyHidden.visible, false);
  restore(); assert.equal(pass.render, original);
});

test('a failed depth pass cannot leave the projection hidden on following frames', () => {
  const scene = new THREE.Scene();
  const optical = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ transparent: true }));
  scene.add(optical);
  const pass = { render() { throw new Error('depth pass interrupted'); } };
  usePhysicalOcclusion(pass, scene);
  assert.throws(() => pass.render(), /interrupted/);
  assert.equal(optical.visible, true);
});
