import test from 'node:test';
import assert from 'node:assert/strict';
import {releaseVelocity,shouldCapture,boundedCardPosition} from './product-gestures.js';
import {PRODUCTS} from './product-catalog.js';
const target={x:700,y:280,rx:125,ry:100};
const gesture=(point,velocity={x:0,y:0},start={x:200,y:430})=>({point,velocity,start,target});

test('a deliberate drop has a generous capture area; small slips never launch',()=>{
 assert.equal(shouldCapture(gesture({x:770,y:330})),true);
 assert.equal(shouldCapture(gesture({x:701,y:280},{x:0,y:0},{x:690,y:275})),false);
 assert.equal(shouldCapture({...gesture({x:700,y:280}),cancelled:true}),false);
 assert.equal(shouldCapture(gesture({x:290,y:390})),false);
});
test('a broad directional throw is captured without exact aiming, but not an away throw',()=>{
 assert.equal(shouldCapture(gesture({x:330,y:400},{x:.85,y:-.23})),true);
 assert.equal(shouldCapture(gesture({x:330,y:400},{x:-1,y:.2})),false);
 assert.equal(shouldCapture(gesture({x:330,y:400},{x:.05,y:0})),false);
 assert.equal(shouldCapture(gesture({x:280,y:480},{x:.3,y:1})),false);
 assert.equal(shouldCapture(gesture({x:900,y:210},{x:2,y:-.3})),true,'fast overshoot through the table is captured');
});
test('release velocity uses the last gesture segment and expires when held still',()=>{
 const samples=[{x:0,y:0,t:0},{x:20,y:0,t:100},{x:50,y:10,t:150}];
 assert.deepEqual(releaseVelocity(samples,160),{x:.6,y:.2});
 assert.deepEqual(releaseVelocity(samples,270),{x:0,y:0});
 assert.deepEqual(releaseVelocity([{x:4,y:4,t:3}],4),{x:0,y:0});
});
test('missed throws and invalid pointer coordinates stay inside the product display',()=>{
 const bounds={minX:-2,maxX:2,minY:-1,maxY:1};
 assert.deepEqual(boundedCardPosition({x:12,y:-9},bounds),{x:2,y:-1});
 assert.deepEqual(boundedCardPosition({x:NaN,y:Infinity},bounds),{x:0,y:0});
});
test('the catalogue keeps the authored experiences and omits the retired seaside Workshop card',()=>{
 assert.equal(PRODUCTS.length,25);assert.equal(new Set(PRODUCTS.map(p=>p.id)).size,PRODUCTS.length);
 assert.equal(PRODUCTS.some(p=>p.id==='the-workshop'),false);
 assert.deepEqual(PRODUCTS.filter(p=>p.featured).map(p=>p.id),['bridge','tva']);
 assert.ok(PRODUCTS.every(p=>p.title&&p.description&&new URL(p.url).protocol==='https:'));
 assert.ok(PRODUCTS.some(p=>p.id==='exam-pacer'));assert.ok(PRODUCTS.some(p=>p.title==='One Thing Today'));
});
test('outside staging taps dismiss only a single, uninterrupted primary gesture', async () => {
  const { createOutsideTap } = await import('./product-gestures.js');
  const tap = createOutsideTap();
  const event = (pointerId, x, y, extra = {}) => ({pointerId, clientX:x, clientY:y, button:0, isPrimary:true, ...extra});
  tap.down(event(1,30,30),true);
  assert.equal(tap.up(event(1,33,32),true),true,'small mouse/touch jitter is a click');
  tap.down(event(1,30,30),true);
  tap.move(event(1,90,30));
  assert.equal(tap.up(event(1,30,30),true),false,'dragging out and back cannot dismiss');
  tap.down(event(1,30,30),true);
  tap.down(event(2,130,30,{isPrimary:false}),true);
  assert.equal(tap.up(event(2,130,30),true),false);
  assert.equal(tap.up(event(1,30,30),true),false,'a pinch cannot become a click');
  tap.down(event(1,30,30),true);tap.cancel();
  assert.equal(tap.up(event(1,30,30),true),false,'cancelled pointer cannot dismiss');
  tap.down(event(1,30,30,{button:2}),true);
  assert.equal(tap.up(event(1,30,30),true),false,'secondary button is not a click-to-return');
  tap.down(event(1,30,30),true);
  assert.equal(tap.up(event(1,30,30),false),false,'playing or queued film cannot dismiss');
  tap.down(event(1,30,30),false);
  assert.equal(tap.up(event(1,30,30),true),false,'pressing on the card cannot become an outside click');
});

test('short flicks need direction rather than an exact ballistic hit',()=>{
 assert.equal(shouldCapture(gesture({x:224,y:419},{x:.4,y:-.18})),true,'24px flick reaches a distant staging area');
 assert.equal(shouldCapture(gesture({x:220,y:405},{x:.5,y:-.65})),true,'a broad diagonal flick is caught');
 assert.equal(shouldCapture(gesture({x:211,y:426},{x:1,y:-.4})),false,'tiny selection slip stays a selection');
 assert.equal(shouldCapture(gesture({x:224,y:419},{x:.09,y:-.04})),false,'slow placement remains in the panel');
 const phone={start:{x:105,y:545},point:{x:112,y:518},velocity:{x:.12,y:-.48},target:{x:195,y:280,rx:82,ry:85}};
 assert.equal(shouldCapture(phone),true,'short upward mobile flick is sufficient');
 assert.equal(shouldCapture({...phone,velocity:{x:.12,y:.48}}),false,'downward movement is not a launch');
});

test('lift-off delay keeps momentum but a pause or reversal does not',()=>{
 const moving=[{x:100,y:200,t:0},{x:112,y:194,t:20},{x:132,y:182,t:50}];
 assert.ok(releaseVelocity([...moving,{x:132,y:182,t:135}],135).x>.5,'normal lift-off does not erase the flick');
 assert.deepEqual(releaseVelocity([...moving,{x:132,y:182,t:220}],220),{x:0,y:0},'deliberately holding expires momentum');
 const reverse=[{x:100,y:200,t:0},{x:180,y:200,t:50},{x:165,y:200,t:80}];
 assert.ok(releaseVelocity(reverse,80).x<0,'a decisive reversal overrides earlier forward movement');
 assert.equal(shouldCapture({...gesture({x:900,y:210}),velocity:{x:0,y:0}}),false,'a paused overshoot does not launch');
 const coalesced=Array.from({length:60},(_,i)=>({x:i*.8,y:0,t:i*2}));
 assert.ok(releaseVelocity([...coalesced,{x:47.7,y:.3,t:185}],185).x>.35,'high-rate subpixel events accumulate into a real flick');
});
