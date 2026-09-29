import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from './vendor/three.module.min.js';

const threeURL = new URL('./vendor/three.module.min.js', import.meta.url).href;
const encode = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const roundedSource = (await readFile(new URL('./vendor/RoundedBoxGeometry.js', import.meta.url), 'utf8')).replace("from 'three'", `from '${threeURL}'`);
const source = (await readFile(new URL('./holographic-table.js', import.meta.url), 'utf8'))
  .replace("from 'three'", `from '${threeURL}'`)
  .replace("from './vendor/RoundedBoxGeometry.js'", `from '${encode(roundedSource)}'`);
const { createHolographicTable, createHolographicVolume } = await import(encode(source));
function withCanvas(run) {
  const previous = globalThis.document;
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ({
    fillRect() {}, clearRect() {}, beginPath() {}, moveTo() {}, bezierCurveTo() {}, stroke() {}, fillText() {},
  }) }) };
  try { run(); } finally { if (previous) globalThis.document = previous; else delete globalThis.document; }
}
function finiteGeometry(root) {
  root.traverse(object => {
    for (const attribute of Object.values(object.geometry?.attributes || {}))
      for (const number of attribute.array) assert.ok(Number.isFinite(number), `${object.name}: non-finite vertex attribute`);
  });
}

test('table replacement keeps a stable source height and restores the original on teardown', () => withCanvas(() => {
  const scene = new THREE.Scene(), original = new THREE.Group(); scene.add(original);
  const table = createHolographicTable({ scene, table: original });
  assert.equal(original.visible, false); finiteGeometry(table.group);
  const top = table.group.getObjectByName('table / fine-grain work surface');
  top.geometry.computeBoundingBox();
  assert.ok(top.position.y + top.geometry.boundingBox.max.y < 1.90, 'physical surface must stay below the optical emission plane');
  for (let i = 0; i < 100; i++) table.update({ night: 1, charge: i / 99 });
  table.dispose(); table.dispose();
  assert.equal(original.visible, true); assert.deepEqual(scene.children, [original]);
}));

test('the projected loop preserves its size and fully fades with the TVA handoff', () => withCanvas(() => {
  const volume = createHolographicVolume(), buffers = [];
  volume.group.traverse(object => { if (object.geometry) buffers.push([object.geometry, object.geometry.attributes.position.array]); });
  for (let i = 0; i < 120; i++) volume.update({ time: i * .7, night: 1, opacity: 1, coherence: (i % 100) / 100 });
  finiteGeometry(volume.group);
  assert.deepEqual(volume.group.scale.toArray(), [1, 1, 1]);
  for (const [geometry, array] of buffers) assert.equal(geometry.attributes.position.array, array, 'animation must reuse geometry buffers');
  volume.update({ time: 100, night: 1, opacity: 0, coherence: .28 });
  volume.group.traverse(object => {
    if (!object.material) return;
    assert.equal(object.material.uniforms?.opacity?.value ?? object.material.opacity, 0, 'no layer may survive the sky fade');
  });
  volume.dispose(); volume.dispose();
}));


test('source volume meets the moving surface while staying rooted in the tabletop', () => withCanvas(() => {
  const volume=createHolographicVolume();volume.group.position.set(0,4.05,0);volume.group.rotation.y=.45;
  const model=volume.group.getObjectByName('Endgame reference / layered simulation volume');
  const surface=model.children.find(object=>object.geometry?.attributes.barycentric);
  const sheets=volume.group.children.filter(object=>object.name==='hologram / continuous source volume');
  const expected=new THREE.Vector3(),actual=new THREE.Vector3();
  for(const time of [0,6,13,21,31]){
    volume.update({time,night:1,opacity:1,coherence:.5});
    for(const sheet of sheets)for(const row of [0,32,64,96]){
      const position=sheet.geometry.attributes.position,uv=surface.geometry.attributes.uv;
      actual.fromBufferAttribute(position,row*13).applyMatrix4(sheet.matrixWorld);
      assert.ok(Math.abs(actual.y-1.923)<.00001,'the light source must not move with the upper model');
      assert.ok(sheet.renderOrder<surface.renderOrder,'source volume must composite before the formed surface');
      assert.equal(sheet.material.blending,THREE.AdditiveBlending,'overlapping source sheets add light instead of darkening one another');
      let match=-1;
      for(let i=0;i<uv.count;i++)if(Math.abs(uv.getX(i)-row/96)<.00001&&Math.abs(uv.getY(i)-sheet.userData.surfaceEdge)<.00001){match=i;break;}
      assert.notEqual(match,-1);
      expected.fromBufferAttribute(surface.geometry.attributes.position,match).applyMatrix4(model.matrixWorld);
      actual.fromBufferAttribute(position,row*13+12).applyMatrix4(sheet.matrixWorld);
      assert.ok(actual.distanceTo(expected)<.00001,'the light sheet must meet the actual ribbon edge throughout the turn');
    }
  }
  volume.dispose();
}));

test('moving light points cross the twisted ribbon seam without jumping', () => {
  const volume=createHolographicVolume(),nodes=volume.group.getObjectByName('Endgame reference / layered simulation volume').children.find(object=>object.isInstancedMesh);
  const a=new THREE.Matrix4(),b=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Vector3();
  const seam=1/(.055+.28*.025);
  volume.update({time:seam-.0001,coherence:.28});nodes.getMatrixAt(0,a);p.setFromMatrixPosition(a);
  volume.update({time:seam+.0001,coherence:.28});nodes.getMatrixAt(0,b);q.setFromMatrixPosition(b);
  assert.ok(p.distanceTo(q)<.001,`light jumped ${p.distanceTo(q).toFixed(4)} world units at the seam`);
  volume.dispose();
});

test('changing field response changes light speed without teleporting the light', () => {
  const volume=createHolographicVolume(),nodes=volume.group.getObjectByName('Endgame reference / layered simulation volume').children.find(object=>object.isInstancedMesh);
  const a=new THREE.Matrix4(),b=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Vector3();
  volume.update({time:130,coherence:.28});nodes.getMatrixAt(0,a);p.setFromMatrixPosition(a);
  volume.update({time:130.016,coherence:.9});nodes.getMatrixAt(0,b);q.setFromMatrixPosition(b);
  assert.ok(p.distanceTo(q)<.04,`light jumped ${p.distanceTo(q).toFixed(4)} world units when response changed`);
  volume.dispose();
});

test('a hidden, collapsed projection stays finite and recovers when the room returns',()=>{
  const volume=createHolographicVolume();volume.group.position.set(0,4.05,0);
  const previousError=console.error;console.error=()=>{};
  try{
    for(const [index,scale]of [1,.02,.000001,1e-40,0,1].entries()){
      volume.group.visible=scale>.015;volume.group.scale.setScalar(scale);
      volume.update({time:index,opacity:scale?1:0});finiteGeometry(volume.group);
    }
    const source=volume.group.children.find(o=>o.name==='hologram / continuous source volume');
    const point=new THREE.Vector3().fromBufferAttribute(source.geometry.attributes.position,0).applyMatrix4(source.matrixWorld);
    assert.ok(Math.abs(point.y-1.923)<.00001,'the light must reconnect to the source after returning');
  }finally{console.error=previousError;volume.dispose();}
});
