import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from './vendor/three.module.min.js';
const encode=text=>`data:text/javascript;base64,${Buffer.from(text).toString('base64')}`;
const threeURL=new URL('./vendor/three.module.min.js',import.meta.url).href;
const cssSource=(await readFile(new URL('./vendor/CSS3DRenderer.js',import.meta.url),'utf8')).replace("from 'three'",`from '${threeURL}'`);
const source=(await readFile(new URL('./services-experience.js',import.meta.url),'utf8')).replace("from 'three'",`from '${threeURL}'`).replace("from './vendor/CSS3DRenderer.js'",`from '${encode(cssSource)}'`);
const {SERVICE_EMAIL,SERVICE_OFFERS,createServiceDraft,createServicesExperience}=await import(encode(source));

test('three existing offers and the public email remain the only contact destination',()=>{
  assert.deepEqual(SERVICE_OFFERS.map(item=>item.label),['Build','Train','Retain']);
  assert.equal(SERVICE_EMAIL,'lorenzo.colombani@live.fr');
  const empty=createServiceDraft();assert.equal(new URL(empty.href).pathname,SERVICE_EMAIL);assert.equal(empty.subject,'Project enquiry');
  assert.doesNotMatch(empty.body,/undefined|null|\[object Object\]/);
  for(const offer of SERVICE_OFFERS){const draft=createServiceDraft({service:offer.id});assert.equal(draft.subject,`${offer.label} — project enquiry`);assert.ok(draft.body.includes(offer.title));}
});

test('visitor input is bounded and encoded only into the body, never recipient or headers',()=>{
  const brief='AI & design? #1\n&bcc=other@example.org\n<script>alert("x")</script> — café',name='Sam\r\nExample';
  const draft=createServiceDraft({service:'build',name,brief}),url=new URL(draft.href);
  assert.equal(url.pathname,SERVICE_EMAIL);assert.deepEqual([...url.searchParams.keys()],['subject','body']);
  assert.equal(url.searchParams.get('body'),draft.body);assert.ok(draft.body.includes(brief));assert.ok(draft.body.includes('From: Sam Example'));
  assert.equal(createServiceDraft({service:'not-a-service'}).subject,'Project enquiry');
  const long=createServiceDraft({name:'n'.repeat(1000),brief:'b'.repeat(4000)}).body;
  assert.equal(long.match(/n+/g).sort((a,b)=>b.length-a.length)[0].length,80);assert.equal(long.match(/b+/g).sort((a,b)=>b.length-a.length)[0].length,700);
});

class Element{
  constructor(tag,doc){Object.assign(this,{tag,ownerDocument:doc,children:[],attributes:{},events:{},style:{},hidden:false,value:'',checked:false});const classes=new Set();this.classList={add:name=>classes.add(name),remove:name=>classes.delete(name),contains:name=>classes.has(name)};}
  append(...children){children.forEach(child=>this.appendChild(child));}
  appendChild(child){child.remove();child.parent=this;this.children.push(child);return child;}
  get parentNode(){return this.parent||null;}
  get isConnected(){return this===this.ownerDocument.body||Boolean(this.parent?.isConnected);}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);this.parent=null;}
  setAttribute(key,value){this.attributes[key]=value;}
  addEventListener(key,handler){(this.events[key]??=[]).push(handler);}
  emit(key,event={}){for(const handler of this.events[key]||[])handler({target:this,preventDefault(){},stopPropagation(){},...event});}
  focus(){this.ownerDocument.activeElement=this;}
}
function setup(t,width=1200,height=800){
  const keys=['document','window','innerWidth','innerHeight','addEventListener','removeEventListener'],previous=keys.map(key=>Object.getOwnPropertyDescriptor(globalThis,key));
  const all=[],doc={defaultView:{Element}};doc.body=new Element('body',doc);doc.createElement=tag=>{const element=new Element(tag,doc);all.push(element);return element;};
  const events=new Map();Object.assign(globalThis,{document:doc,window:{},innerWidth:width,innerHeight:height,addEventListener:(key,handler)=>events.set(key,handler),removeEventListener:key=>events.delete(key)});
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(43,width/height,.1,100),canvas=doc.createElement('canvas');doc.body.append(canvas);canvas.focus();let opened=0,closed=0;
  const viewer=createServicesExperience({scene,camera,canvas,onOpen:()=>opened++,onClose:()=>closed++});
  t.after(()=>{viewer.dispose();keys.forEach((key,index)=>previous[index]?Object.defineProperty(globalThis,key,previous[index]):delete globalThis[key]);});
  return {viewer,scene,camera,canvas,events,doc,all,find:className=>all.find(element=>element.className===className),get opened(){return opened;},get closed(){return closed;}};
}

test('service selection and optional brief produce a working draft and survive leaving the desk',t=>{
  const h=setup(t),draft=h.find('services-draft'),name=h.all.find(element=>element.id==='services-name'),brief=h.all.find(element=>element.id==='services-brief');
  assert.equal(h.viewer.active,false);assert.equal(h.viewer.open(),true);assert.equal(h.viewer.open(),true);assert.equal(h.opened,1);
  const radio=h.all.find(element=>element.value==='train');radio.checked=true;radio.emit('input');name.value='Alex';name.emit('input');brief.value='A course for our team & partners';brief.emit('input');
  const url=new URL(draft.href);assert.equal(url.searchParams.get('subject'),'Train — project enquiry');assert.match(url.searchParams.get('body'),/A course for our team & partners/);
  draft.emit('click');assert.match(h.find('services-status').textContent,/Send from your email app/);assert.doesNotMatch(h.find('services-status').textContent,/sent|delivered/i);
  h.find('services-back').emit('click');assert.equal(h.viewer.active,false);assert.equal(h.closed,1);assert.equal(h.doc.activeElement,h.canvas);
  h.viewer.open();assert.equal(brief.value,'A course for our team & partners');assert.equal(new URL(draft.href).searchParams.get('subject'),'Train — project enquiry');
  let prevented=0,stopped=0;h.events.get('keydown')({key:'Escape',preventDefault(){prevented++;},stopPropagation(){stopped++;}});
  assert.equal(h.viewer.active,false);assert.equal(prevented,1);assert.equal(stopped,1);assert.equal(h.closed,2);
});

test('a programmatic station change can close without clearing or refocusing the new station',t=>{
  const h=setup(t);h.viewer.open();const nextStation=h.doc.createElement('button');h.doc.body.append(nextStation);nextStation.focus();
  h.viewer.close({notify:false,restoreFocus:false});assert.equal(h.viewer.active,false);assert.equal(h.closed,0);assert.equal(h.doc.activeElement,nextStation);
});

for(const [width,height] of [[1440,900],[1200,800],[820,1180],[390,844],[320,568],[844,390],[375,270]])test(`room screen preserves native readable size and safe margins at ${width} × ${height}`,t=>{
  const h=setup(t,width,height);h.viewer.open();const pose=h.viewer.getFocusPose();h.camera.position.copy(pose.position);h.camera.lookAt(pose.target);h.viewer.update();
  const frame=h.scene.getObjectByName('Services / optical frame');frame.updateWorldMatrix(true,true);
  const corners=[[-.5,.5,0],[.5,-.5,0]].map(point=>new THREE.Vector3(...point).applyMatrix4(frame.matrixWorld).project(h.camera));
  const left=(corners[0].x+1)*width/2,top=(1-corners[0].y)*height/2,right=(corners[1].x+1)*width/2,bottom=(1-corners[1].y)*height/2;
  const reservedTop=height<540?82:width<700?156:104;
  assert.ok(left>=17.9&&right<=width-17.9);assert.ok(top>=reservedTop-.1&&bottom<=height-23.9);
  assert.ok(Math.abs((right-left)-parseFloat(h.find('services-pane').style.width))<.01,'rendered CSS pixels must not shrink text and hit targets');
  assert.match(h.find('services-pane').style.transform,/matrix3d/,'screen follows the 3D room camera');
});

test('disposal releases the screen and listeners once and disallows reopening',t=>{
  const h=setup(t);h.viewer.open();const frame=h.scene.getObjectByName('Services / optical frame'),releases=new Map();
  frame.traverse(object=>{for(const resource of [object.geometry,object.material])if(resource)resource.addEventListener('dispose',()=>releases.set(resource,(releases.get(resource)||0)+1));});
  h.viewer.dispose();h.viewer.dispose();assert.equal(h.closed,1);assert.equal(h.events.size,0);assert.equal(frame.parent,null);assert.equal(h.find('services-experience').isConnected,false);assert.equal(h.viewer.open(),false);
  for(const count of releases.values())assert.equal(count,1);
});
