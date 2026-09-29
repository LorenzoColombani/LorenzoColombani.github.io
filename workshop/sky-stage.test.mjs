import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from './vendor/three.module.min.js';
const source=(await readFile(new URL('./sky-stage.js',import.meta.url),'utf8'))
 .replace("from 'three'",`from '${new URL('./vendor/three.module.min.js',import.meta.url).href}'`)
 .replace(/from '\.\/viewport-layout\.js(?:\?[^']*)?'/,`from '${new URL('./viewport-layout.js',import.meta.url).href}'`);
const {createSkyStage}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('the real sky surface contains a landscape film inside portrait and wide viewports',()=>{
 const previous=globalThis.document;
 const doc={getElementById:()=>null,createElement:()=>({ownerDocument:doc,getContext:()=>({clearRect(){},drawImage(){}})})};globalThis.document=doc;
 let started=true;const frame={contentDocument:doc,contentWindow:{__LOKI:{started:()=>started,renderCanvas:()=>({width:960,height:600})}}};
 const camera=new THREE.PerspectiveCamera(55,.5,.1,100),stage=createSkyStage({scene:new THREE.Scene(),camera,getFrame:()=>frame});
 let rendered=null;const renderer={autoClear:true,render:s=>rendered=s};
 try {
  for(const aspect of [.5,2.5]){
   camera.aspect=aspect;stage.update(1);stage.render(renderer);
   const film=rendered.children.find(c=>c.material.isShaderMaterial),bars=rendered.children.find(c=>c.material.isMeshBasicMaterial);
   assert.ok(Math.abs(film.scale.x/film.scale.y-1.6)<1e-9);
   assert.ok(film.scale.x<=bars.scale.x+1e-9&&film.scale.y<=bars.scale.y+1e-9);
   assert.equal(bars.material.opacity,1);assert.equal(renderer.autoClear,true);
  }
  started=false;stage.update(1);assert.ok(rendered.children.every(c=>!c.visible),'no black takeover before a film frame is available');
  stage.update(0);assert.ok(rendered.children.every(c=>!c.visible));
 }finally{stage.dispose();globalThis.document=previous;}
});
