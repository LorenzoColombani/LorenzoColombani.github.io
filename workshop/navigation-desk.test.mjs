import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from './vendor/three.module.min.js';

const threeURL=new URL('./vendor/three.module.min.js',import.meta.url).href;
const encode=s=>`data:text/javascript;base64,${Buffer.from(s).toString('base64')}`;
const rounded=(await readFile(new URL('./vendor/RoundedBoxGeometry.js',import.meta.url),'utf8')).replace("from 'three'",`from '${threeURL}'`);
const source=(await readFile(new URL('./navigation-desk.js',import.meta.url),'utf8')).replace("from 'three'",`from '${threeURL}'`).replace(/from '\.\/viewport-layout\.js(?:\?[^']*)?'/,`from '${new URL('./viewport-layout.js',import.meta.url).href}'`).replace("from './vendor/RoundedBoxGeometry.js'",`from '${encode(rounded)}'`);
const {deskOutline,screenReveal,createNavigationDesk}=await import(encode(source));

test('desk stays ahead of the workbench and leaves an open arrival well',()=>{
  const points=deskOutline().getPoints();
  assert.ok(Math.max(...points.map(p=>p.y))<5.8);
  assert.ok(10.6-Math.max(...points.map(p=>p.y))>2.70,'desk must clear the entire workbench');
  assert.ok(points.every(p=>Math.hypot(p.x,p.y)>3.9),'arrival well must be open, not a filled semicircle');
  assert.ok(points.every(p=>p.y>-.8),'no slab closes the visitor side of the well');
});

test('screen reveals are bounded, staggered and continuous; reduced motion is immediate',()=>{
  for(let index=0;index<4;index++){
    let previous=0;
    for(let time=0;time<4;time+=.01){const value=screenReveal(time,index);assert.ok(value>=previous&&value<=1);assert.ok(value-previous<.02);previous=value;}
    assert.equal(screenReveal(0,index),0);assert.equal(screenReveal(4,index),1);assert.equal(screenReveal(0,index,true),1);
  }
  assert.ok(screenReveal(.7,1)>screenReveal(.7,0),'the lower central display leads the outside panes');
});

class Element {
  constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.style={};this.attributes={};this.events={};this.hidden=false;}
  append(...children){for(const c of children){c.parent=this;this.children.push(c);}}
  setAttribute(k,v){this.attributes[k]=v;}
  addEventListener(k,fn){(this.events[k]??=[]).push(fn);}
  emit(k,e={}){for(const f of this.events[k]||[])f(e);}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);}
  focus(){}
  getContext(){return new Proxy({}, {get:(_,k)=>k==='createLinearGradient'?()=>({addColorStop(){}}):()=>{},set:()=>true});}
}

test('display selection is reversible, ignores drags, and is absent before entry',()=>{
  const keys=['document','innerWidth','innerHeight','addEventListener','removeEventListener'],previous=keys.map(k=>globalThis[k]);
  const body=new Element('body'),listeners={};
  globalThis.document={body,createElement:tag=>new Element(tag)};globalThis.innerWidth=1280;globalThis.innerHeight=800;
  globalThis.addEventListener=(k,fn)=>listeners[k]=fn;globalThis.removeEventListener=k=>delete listeners[k];
  const parent=new THREE.Group(),camera=new THREE.PerspectiveCamera(43,1.6,.1,100);camera.position.set(0,5.2,19.7);camera.lookAt(0,3.3,5.9);camera.updateMatrixWorld();
  const material=new THREE.MeshStandardMaterial(),materials={steel:material,steelEdge:material,graphite:material,rubber:material,fineGrain:null};
  let selected=null,returned=0;
  const desk=createNavigationDesk({parent,materials,camera,onFocus:title=>selected=title,onReturn:()=>returned++});
  try{
    desk.update({dt:.016,time:0,entered:false,unlocking:false,reduced:false});
    const ui=body.children[0],products=ui.children.find(c=>c.dataset.deskScreen==='products');
    assert.equal(products.hidden,true);assert.equal(desk.focused,false);
    for(let i=0;i<190;i++)desk.update({dt:.016,time:i*.016,entered:true,unlocking:false,reduced:false});
    assert.equal(products.hidden,false);
    products.emit('pointerdown',{clientX:0,clientY:0});products.emit('pointermove',{clientX:50,clientY:20});products.emit('click',{detail:1});
    assert.equal(desk.focused,false,'a drag must not take the visitor into a display');
    products.emit('click',{detail:0});assert.equal(selected,'Products');assert.equal(desk.focused,true);
    assert.ok(desk.getFocusPose().position.distanceTo(desk.getFocusPose().target)>5);
    let prevented=false;listeners.keydown({key:'Escape',preventDefault(){prevented=true;}});
    assert.equal(prevented,true);assert.equal(desk.focused,false);assert.equal(returned,1);
    desk.dispose();desk.dispose();assert.equal(body.children.length,0);assert.equal(parent.children.length,0);assert.equal(listeners.keydown,undefined);
  }finally{desk.dispose();keys.forEach((k,i)=>{if(previous[i]===undefined)delete globalThis[k];else globalThis[k]=previous[i];});material.dispose();}
});
