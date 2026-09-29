import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from './vendor/three.module.min.js';

let source=await readFile(new URL('./product-elements.js',import.meta.url),'utf8');
source=source.replace("from 'three'",`from '${new URL('./vendor/three.module.min.js',import.meta.url).href}'`)
 .replace(/from '\.\/(product-catalog|product-gestures|viewport-layout)\.js(?:\?[^']*)?'/g,(_,name)=>`from '${new URL(`./${name}.js`,import.meta.url).href}'`);
const {makeLaunchFlight,createProductElements}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('a flick carries the release direction immediately and lands exactly at staging',()=>{
 const from=new THREE.Vector3(-4,4,6),to=new THREE.Vector3(0,4.2,.5),velocity=new THREE.Vector3(6,2,-5);
 const flight=makeLaunchFlight(from,to,{kind:'flick',velocity,speed:.9});
 assert.equal(flight.momentum,true);assert.ok(flight.duration<.65);
 assert.ok(flight.arc.getPoint(0).distanceTo(from)<1e-9);
 assert.ok(flight.arc.getPoint(1).distanceTo(to)<1e-9);
 assert.ok(flight.arc.getTangent(0).dot(velocity.clone().normalize())>.999,'no stationary easing or forced initial direction');
 assert.ok(flight.arc.getPoint(.01).distanceTo(from)>.01,'movement begins on the first frame');
 for(let t=0;t<=1;t+=.01)assert.ok(flight.arc.getPoint(t).toArray().every(Number.isFinite));
});

test('harder flicks arrive faster, while explicit button launches keep their deliberate arc',()=>{
 const from=new THREE.Vector3(-4,4,6),to=new THREE.Vector3(0,4.2,.5),velocity=new THREE.Vector3(8,0,-9);
 const gentle=makeLaunchFlight(from,to,{kind:'flick',velocity,speed:.32});
 const fast=makeLaunchFlight(from,to,{kind:'flick',velocity,speed:3});
 const button=makeLaunchFlight(from,to);
 assert.ok(fast.duration<gentle.duration&&gentle.duration<button.duration);
 assert.equal(button.momentum,false);
 assert.ok(fast.arc.getPoint(.2).distanceTo(from)<from.distanceTo(to),'the initial tangent stays bounded');
});

class Element {
 constructor(tag){this.tag=tag;this.children=[];this.attributes={};this.events={};this.dataset={};this.style={setProperty(){}};this.hidden=false;this.offsetHeight=22;const values=new Set();this.classList={add:v=>values.add(v),remove:v=>values.delete(v),toggle:(v,on)=>on?values.add(v):values.delete(v)};}
 append(...children){for(const child of children){child.parent=this;this.children.push(child);}}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);}
 setAttribute(k,v){this.attributes[k]=v;}
 addEventListener(k,fn){(this.events[k]??=[]).push(fn);}
 emit(k,event={}){for(const fn of this.events[k]||[])fn({preventDefault(){},...event});}
 focus(){this.emit('focus');}
 setPointerCapture(){}
 releasePointerCapture(){this.emit('lostpointercapture');}
 getContext(){return new Proxy({}, {get:(_,key)=>key==='createLinearGradient'?()=>({addColorStop(){}}):key==='measureText'?text=>({width:text.length*22}):()=>{},set:()=>true});}
}

test('actual card pointer handlers launch a short flick once and preserve the return position',()=>{
 const keys=['document','innerWidth','innerHeight','addEventListener','removeEventListener'],before=keys.map(k=>globalThis[k]);
 const body=new Element('body');globalThis.document={body,createElement:tag=>new Element(tag),querySelector:()=>null};globalThis.innerWidth=1000;globalThis.innerHeight=750;globalThis.addEventListener=()=>{};globalThis.removeEventListener=()=>{};
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(43,1000/750,.1,100);camera.position.set(1.4,5.1,12.5);camera.lookAt(-2.2,3.8,4.2);camera.updateMatrixWorld();
 const starts=[],landings=[];const elements=createProductElements({scene,camera,onLaunchStart:p=>starts.push(p.id),onLaunch:p=>landings.push(p.id)});
 const update=()=>elements.update({dt:1/60,time:0,visible:true,reduced:true});
 try {
  for(let i=0;i<30;i++)update();
  const ui=body.children.find(e=>e.id==='product-element-controls'),hit=ui.children.find(e=>e.children[0]?.attributes['aria-label']==='Select or move Loki · TVA Case File'),grab=hit.children[0];
  const root=scene.getObjectByName('Products / holographic element library'),card=root.children.filter(c=>c.isGroup)[1];
  const home=card.position.clone(),screen=card.getWorldPosition(new THREE.Vector3()).project(camera),x=(screen.x*.5+.5)*1000,y=(.5-screen.y*.5)*750;
  const event=(dx,dy,timeStamp)=>({pointerId:1,pointerType:'touch',button:0,isPrimary:true,clientX:x+dx,clientY:y+dy,timeStamp});
  grab.emit('pointerdown',event(0,0,0));grab.emit('pointermove',event(14,-3,20));grab.emit('pointermove',event(36,-7,50));grab.emit('pointerup',event(48,-9,95));
  assert.deepEqual(starts,['tva'],'audio/launch preparation happens in the release gesture');assert.equal(elements.launching,true);assert.deepEqual(landings,[]);
  for(let i=0;i<15;i++)update();
  assert.deepEqual(landings,['tva']);assert.equal(elements.launching,false);
  for(let i=0;i<90;i++)update();
  assert.ok(Math.abs(card.position.x-home.x)<1e-4&&Math.abs(card.position.y-home.y)<1e-4,'launched card retains its place in Products');
  globalThis.innerWidth=390;globalThis.innerHeight=791;camera.aspect=390/791;camera.fov=55;camera.updateProjectionMatrix();
  for(let i=0;i<30;i++)update();
  const phoneHits=ui.children.filter(e=>e.className==='product-element-hit');
  assert.equal(phoneHits.length,4);
  assert.equal(phoneHits[1].children[0].attributes['aria-pressed'],'true','rotation preserves the selected product');
  for(const hit of phoneHits){assert.ok(parseFloat(hit.style.width)>120);assert.ok(parseFloat(hit.style.height)>120);assert.ok(parseFloat(hit.style.left)>=12);}
  const board=root.children.find(c=>c.isMesh),canvas=board.material.map.image;
  assert.ok(Math.abs(canvas.width/canvas.height-board.geometry.parameters.width/board.geometry.parameters.height)<.002,'portrait title texture is not stretched');
  globalThis.innerWidth=791;globalThis.innerHeight=390;camera.aspect=791/390;camera.updateProjectionMatrix();
  for(let i=0;i<30;i++)update();
  assert.equal(ui.children.filter(e=>e.className==='product-element-hit').length,2,'short landscape reflows to one row');
  assert.deepEqual(landings,['tva'],'rotation cannot relaunch the selected product');
 } finally {elements.dispose();keys.forEach((k,i)=>{if(before[i]===undefined)delete globalThis[k];else globalThis[k]=before[i];});}
});
