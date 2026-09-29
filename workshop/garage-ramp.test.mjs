import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const threeURL=new URL('./vendor/three.module.min.js',import.meta.url).href;
const source=(await readFile(new URL('./garage-ramp.js',import.meta.url),'utf8')).replace("from 'three'",`from '${threeURL}'`);
const {createGarageRampRoute,createRampRibbon}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('the driveway itself exits left, rather than a forward road moved to the left',()=>{
  const route=createGarageRampRoute(),end=route.getPoint(1),direction=route.getTangent(1);
  assert.ok(direction.x<-.97,'the exit must point toward the left side of the garage');
  assert.ok(Math.abs(direction.z)<.02,'the exit must not continue forward into the rear wall');
  assert.ok(end.x<-27&&end.y>4,'the rising route must cross the left building boundary');
  const before=route.getPoint(.8);assert.ok(end.y>before.y&&end.x<before.x);
});

test('the curved ramp surface is finite and faces upward through the turn',()=>{
  const geometry=createRampRibbon(createGarageRampRoute());
  for(const attribute of Object.values(geometry.attributes))for(const value of attribute.array)assert.ok(Number.isFinite(value));
  const normals=geometry.attributes.normal;for(let i=0;i<normals.count;i++)assert.ok(normals.getY(i)>.8);
  geometry.dispose();
});
