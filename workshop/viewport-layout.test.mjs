import test from 'node:test';
import assert from 'node:assert/strict';
import {productLayout,productPanelRect,containedFrame} from './viewport-layout.js';

test('phone and tablet cards reflow into readable rows, leaving room for staging and controls',()=>{
 for(const [w,h,expected] of [[291,516,2],[320,568,2],[390,791,4],[430,878,4],[834,1100,6],[844,337,2],[640,360,2]]){
  const l=productLayout(w,h),top=l.portrait?(w<700?140:80):52,r=productPanelRect(l,w,h,top);
  assert.equal(l.size,expected,`${w} x ${h}`);
  assert.ok(r.x>=12&&r.x+r.w<=w-12,'nothing is cropped horizontally');
  assert.ok(r.y>=top+30&&r.bottom+64<=h,'hint, Return and paging have separate space');
  if(l.portrait)assert.ok(r.y-top>=130,'staging stays above the cards');
  const cardHeight=l.ch*r.w/l.w;
  assert.ok(cardHeight>=120,'card body and 44px action can both be reached');
  assert.ok(60*cardHeight/600>=12,'primary titles retain a readable minimum');
 }
});

test('desktop composition stays unchanged; rotation gets a distinct layout key',()=>{
 const wide=productLayout(1352,706);assert.equal(wide.compact,false);assert.equal(wide.size,6);assert.equal(wide.w,5.7);assert.equal(wide.h,4);
 assert.notEqual(productLayout(390,791).key,productLayout(791,390).key);
});

test('phone controls and cards clear the home indicator inset',()=>{
 const l=productLayout(390,791),r=productPanelRect(l,390,791,140,34);
 assert.ok(r.bottom+64<=791-34);
 assert.ok(l.ch*r.w/l.w>=120);
});

test('landscape films fit portrait viewports without cropping or stretching',()=>{
 for(const [w,h] of [[390,791],[844,337],[1352,706]]){
  const r=containedFrame(w,h,1.6);assert.ok(r.width<=w&&r.height<=h);
  assert.ok(Math.abs(r.width/r.height-1.6)<1e-9);
 }
});
