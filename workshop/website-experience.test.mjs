import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from './vendor/three.module.min.js';
import {PRODUCTS} from './product-catalog.js';
const encode=s=>`data:text/javascript;base64,${Buffer.from(s).toString('base64')}`;
const threeURL=new URL('./vendor/three.module.min.js',import.meta.url).href;
const source=(await readFile(new URL('./website-experience.js',import.meta.url),'utf8')).replace("from 'three'",`from '${threeURL}'`).replace(/from '\.\/product-gestures\.js(?:\?[^']*)?'/,`from '${new URL('./product-gestures.js',import.meta.url).href}'`);
const {createWebsiteExperience,websiteSource}=await import(encode(source));

const item={id:'ai-applied',title:'AI, Applied.',website:{url:'https://wharton-ai-use-cases.netlify.app/',prototype:true,enabled:false}};
test('a prototype-only website requires localhost until explicitly enabled',()=>{
 assert.equal(websiteSource(item,{hostname:'127.0.0.1'}).url,item.website.url);
 assert.equal(websiteSource(item,{hostname:'the-workshop-garage-lorenzo.netlify.app'}),null);
 assert.equal(websiteSource({...item,website:{...item.website,enabled:true}},{hostname:'the-workshop-garage-lorenzo.netlify.app'}).url,item.website.url);
 for(const url of ['javascript:alert(1)','http://example.org/','not a url','https://user:password@example.org/'])assert.equal(websiteSource({...item,website:{url,enabled:true}},{hostname:'localhost'}),null);
 assert.equal(websiteSource({id:'bridge'},{hostname:'localhost'}),null);
});

const imported={...item,website:{...item.website,enabled:true,localPath:'/workshop/experiences/websites/ai-applied/'}};
test('imported entries resolve on the Garage origin and retain their canonical source URL and permission state',()=>{
 for(const origin of ['http://127.0.0.1:8766','http://localhost:8766','https://the-workshop-garage-lorenzo.netlify.app']){
  for(const suffix of ['', 'index.html']){
   const localPath=imported.website.localPath+suffix;
   const result=websiteSource({...imported,website:{...imported.website,localPath}},new URL(origin));
   assert.equal(result.url,origin+localPath);assert.equal(result.publicURL,item.website.url);assert.equal(result.pending,false);
  }
 }
 assert.equal(websiteSource({...imported,website:{...imported.website,pendingPermission:true}},new URL('http://localhost:8766')).pending,true);
});

test('a supplied invalid imported entry rejects the card instead of falling back to its remote URL',()=>{
 const base=imported.website.localPath;
 const invalid=[undefined,null,false,42,{},'',base.slice(0,-1),'workshop/experiences/websites/ai-applied/',
  '/workshop/experiences/bridge/', '/workshop/experiences/websites/', '/workshop/experiences/websites/AI/',
  '/workshop/experiences/websites/-ai/', '/workshop/experiences/websites/ai--applied/',
  base+'app.html',base+'nested/index.html',base+'../other/',base+'./index.html',
  base+'%2e%2e/other/',base+'%252e%252e/other/',base+'%2findex.html',base+'%5cindex.html',
  base+'?url=https://example.org/',base+'#index.html',base+'index.html?x=1',base+'index.html#x',
  base+'\n',base+'\t',' '+base,base.replaceAll('/','\\'),
  '//example.org'+base,'https://example.org'+base,'https://user:password@example.org'+base];
 for(const localPath of invalid)assert.equal(websiteSource({...imported,website:{...imported.website,localPath}},new URL('http://localhost:8766')),null,String(localPath));
});

test('imported entries require a secure Garage origin or an exact local development host',()=>{
 for(const origin of ['http://example.org','http://192.168.1.5:8766','http://localhost.example.org:8766','ftp://localhost','file://','null','https://user:password@example.org','https://example.org/path','https://example.org?x=1']){
  assert.equal(websiteSource(imported,{hostname:'localhost',origin}),null,origin);
 }
 assert.equal(websiteSource(imported,{hostname:'localhost'}),null);
 for(const url of ['http://example.org/','javascript:alert(1)','https://user:password@example.org/'])assert.equal(websiteSource({...imported,website:{...imported.website,url}},new URL('http://localhost:8766')),null);
});

test('imported entries keep the existing enabled and localhost prototype gates',()=>{
 const prototype={...imported,website:{...imported.website,enabled:false}};
 assert.equal(websiteSource(prototype,new URL('http://localhost:8766')).url,'http://localhost:8766'+imported.website.localPath);
 assert.equal(websiteSource(prototype,new URL('https://the-workshop-garage-lorenzo.netlify.app')),null);
 assert.equal(websiteSource({...prototype,website:{...prototype.website,prototype:false}},new URL('http://localhost:8766')),null);
});

class Element {
 constructor(tag,doc){Object.assign(this,{tag,doc,ownerDocument:doc,children:[],attributes:{},events:{},style:{},hidden:false});const classes=new Set();this.classList={add:v=>classes.add(v),remove:v=>classes.delete(v),contains:v=>classes.has(v)};}
 append(...children){for(const child of children)this.appendChild(child);}
 appendChild(child){child.remove();child.parent=this;this.children.push(child);child.attachments=(child.attachments||0)+1;child.connectedOnAppend=child.isConnected;return child;}
 get parentNode(){return this.parent||null;}
 get isConnected(){return this===this.doc.body||Boolean(this.parent?.isConnected);}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);this.parent=null;}
 setAttribute(k,v){this.attributes[k]=v;}
 addEventListener(k,fn){(this.events[k]??=[]).push(fn);}
 removeEventListener(k,fn){this.events[k]=(this.events[k]||[]).filter(f=>f!==fn);}
 emit(k,e={}){for(const fn of this.events[k]||[])fn({preventDefault(){},target:this,...e});}
 focus(){this.doc.activeElement=this;}
 getBoundingClientRect(){return {x:100,y:100,left:100,top:100,right:1000,bottom:700,width:900,height:600};}
}
function setup(t,width=1200,height=800){
 const keys=['document','window','innerWidth','innerHeight','addEventListener','removeEventListener'],previous=keys.map(k=>Object.getOwnPropertyDescriptor(globalThis,k));
 const all=[],doc={defaultView:{Element},querySelector:()=>null};doc.body=new Element('body',doc);doc.createElement=tag=>{const e=new Element(tag,doc);all.push(e);return e;};const events=new Map(),timers=new Map();let nextTimer=0;
 Object.assign(globalThis,{document:doc,window:{location:new URL('http://localhost:8766'),matchMedia:()=>({matches:true})},innerWidth:width,innerHeight:height,addEventListener:(k,fn)=>events.set(k,fn),removeEventListener:k=>events.delete(k)});
 t.mock.method(globalThis,'setTimeout',fn=>{timers.set(++nextTimer,fn);return nextTimer;});t.mock.method(globalThis,'clearTimeout',id=>timers.delete(id));
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(43,width/height,.1,100),canvas=doc.createElement('canvas');camera.position.set(0,5,12);camera.lookAt(0,4.75,1.5);camera.updateMatrixWorld();let opened=0,closed=0;const viewer=createWebsiteExperience({scene,camera,canvas,onOpen:()=>opened++,onClose:()=>closed++});
 const shell=doc.body.children[0],panel=all.find(e=>e.className==='holo-website'),bar=panel.children[0],content=panel.children[1];
 const frame=()=>content.children.find(e=>e.tag==='iframe');
 t.after(()=>{viewer.dispose();keys.forEach((k,i)=>previous[i]?Object.defineProperty(globalThis,k,previous[i]):delete globalThis[k]);});
 return {viewer,doc,shell,panel,bar,content,frame,timers,events,scene,camera,canvas,get opened(){return opened;},get closed(){return closed;}};
}

test('imported pages load only on launch, keep the original source link, and unload on return',t=>{
 const h=setup(t);assert.equal(h.viewer.canOpen(imported),true);assert.equal(h.frame(),undefined);
 assert.equal(h.viewer.open(imported),true);const frame=h.frame();
 assert.equal(frame.src,'http://localhost:8766'+imported.website.localPath);
 assert.equal(h.bar.children[1].children[1].href,item.website.url);
 assert.equal(frame.attributes.sandbox,'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads allow-modals');
 frame.emit('load');h.bar.children[1].children[0].emit('click');assert.equal(h.frame(),frame);assert.equal(frame.attachments,1);
 h.viewer.close();assert.equal(frame.src,'about:blank');assert.equal(h.frame(),undefined);assert.equal(h.closed,1);assert.equal(h.timers.size,0);
});

test('the shipped website catalogue opens real entry points one at a time and preserves dedicated experiences',async t=>{
 const h=setup(t),location=new URL('https://the-workshop-garage-lorenzo.netlify.app');
 for(const product of PRODUCTS){
  if(!product.website){assert.equal(h.viewer.canOpen(product),false);continue;}
  const resolved=websiteSource(product,location);
  assert.ok(resolved,product.id);assert.equal(resolved.pending,false,product.id);
  if(product.website.localPath){
   const entry=new URL('..'+product.website.localPath+'index.html',import.meta.url);
   assert.match(await readFile(entry,'utf8'),/<html[\s>]/i,product.id+' must have a real imported document');
  }
  assert.equal(h.frame(),undefined,'catalogue does not preload websites');
  assert.equal(h.viewer.open(product),true,product.id);
  assert.equal(product.website.native,undefined,'site previews are the active presentation');
  assert.equal(h.frame().src,websiteSource(product,new URL('http://localhost:8766')).url);
  assert.equal(h.frame().attributes.sandbox.includes('allow-modals'),Boolean(product.website.localPath),'dialogs are limited to owned imports');
  h.frame().emit('load');h.viewer.close();assert.equal(h.frame(),undefined,'return unloads '+product.id);
 }
 for(const id of ['bridge','tva','openbots','privacy-protection-meta-data-eraser','what-is-it-like-to-be-french','a-demonstration-of-the-3d-data-vault-mechanism']){
  assert.equal(PRODUCTS.find(product=>product.id===id).website,undefined,id+' keeps its existing route');
 }
});



test('an invalid imported entry cannot launch or replace the current website',t=>{
 const h=setup(t),invalid={...imported,website:{...imported.website,localPath:'/workshop/'}};
 assert.equal(h.viewer.canOpen(invalid),false);assert.equal(h.viewer.open(invalid),false);assert.equal(h.frame(),undefined);assert.equal(h.opened,0);
 h.viewer.open(item);const frame=h.frame();assert.equal(h.viewer.open(invalid),false);assert.equal(h.frame(),frame);assert.equal(h.opened,1);assert.equal(h.closed,0);
});

function projectedBounds(h,width,height){
 const pose=h.viewer.getFocusPose();h.camera.position.copy(pose.position);h.camera.lookAt(pose.target);h.camera.updateMatrixWorld();h.viewer.update(1/60);
 const backing=h.scene.getObjectByName('Website / optical screen frame');backing.updateMatrixWorld(true);
 const points=[];
 // Project the actual plane and edge vertices, including their real rotations,
 // scales and glass depth, rather than assuming an axis-aligned screen.
 backing.traverse(object=>{const positions=object.geometry?.getAttribute('position');if(!positions)return;for(let i=0;i<positions.count;i++)points.push(new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(object.matrixWorld).project(h.camera));});
 return {left:Math.min(...points.map(p=>(p.x+1)*width/2)),right:Math.max(...points.map(p=>(p.x+1)*width/2)),top:Math.min(...points.map(p=>(1-p.y)*height/2)),bottom:Math.max(...points.map(p=>(1-p.y)*height/2))};
}

function pageCorners(h,width=innerWidth,height=innerHeight){
 const backing=h.scene.getObjectByName('Website / optical screen frame');backing.updateMatrixWorld(true);
 return [[-.5,.5],[.5,.5],[.5,-.5],[-.5,-.5]].map(([x,y])=>{
  const p=new THREE.Vector3(x,y,0).applyMatrix4(backing.matrixWorld).project(h.camera);
  return [(p.x+1)*width/2,(1-p.y)*height/2];
 });
}
function assertPageAligned(h,width=innerWidth,height=innerHeight){
 const left=parseFloat(h.panel.style.left),top=parseFloat(h.panel.style.top),w=parseFloat(h.panel.style.width),heightPx=parseFloat(h.panel.style.height);
 const expected=[[left,top],[left+w,top],[left+w,top+heightPx],[left,top+heightPx]];
 pageCorners(h,width,height).forEach((point,i)=>point.forEach((value,axis)=>assert.ok(Math.abs(value-expected[i][axis])<1e-6,'glass plane follows the untransformed browser bounds')));
}

test('one entrance transform projects all four corners exactly while input waits for the flat page',t=>{
 const h=setup(t);window.matchMedia=()=>({matches:false});h.camera.position.set(2,6,11);h.camera.lookAt(0,4.75,1.5);h.camera.updateMatrixWorld();h.viewer.open(item);
 const original=h.frame();assert.equal(h.panel.parentNode,h.shell);assert.equal(h.shell.parentNode,h.doc.body);assert.equal(h.panel.inert,true);
 h.viewer.update(.12);assert.equal(h.panel.style.pointerEvents,'none');assert.match(h.panel.style.transform,/^matrix3d\(/);
 const m=new THREE.Matrix4().fromArray(h.panel.style.transform.slice(9,-1).split(',').map(Number)),w=parseFloat(h.panel.style.width),height=parseFloat(h.panel.style.height);
 const expected=pageCorners(h);
 [[0,0],[w,0],[w,height],[0,height]].forEach(([x,y],i)=>{
  const actual=new THREE.Vector3(x,y,0).applyMatrix4(m);
  assert.ok(Math.abs(actual.x-expected[i][0])<1e-6);assert.ok(Math.abs(actual.y-expected[i][1])<1e-6);
 });
 h.viewer.update(1);assert.equal(h.panel.inert,true,'a completed reveal still waits for the moving room camera');
 const pose=h.viewer.getFocusPose();h.camera.position.copy(pose.position);h.camera.lookAt(pose.target);h.viewer.update(1/60);
 assert.equal(h.panel.style.transform,'none');assert.equal(h.panel.inert,false);assert.equal(h.panel.style.pointerEvents,'auto');assert.equal(h.frame(),original);assert.equal(original.attachments,1);assert.equal(h.panel.attachments,1);assertPageAligned(h);
});

test('settled browsing stays still and keeps its document through resize and expansion while light remains aligned',t=>{
 const h=setup(t);h.viewer.open(item);projectedBounds(h,1200,800);const original=h.frame(),parent=original.parentNode;
 const documentState={URL:item.website.url+'?search=work',scrollTop:480,search:'work'};original.contentDocument=documentState;original.emit('load');original.focus();
 const stable={...h.panel.style};
 for(let i=0;i<60;i++){h.camera.position.x+=.000001;h.camera.lookAt(h.viewer.getFocusPose().target);h.viewer.update(1/60,i);}
 assert.deepEqual(h.panel.style,stable,'camera easing cannot cause per-frame DOM drift after settling');assertPageAligned(h);
 for(const [width,height] of [[390,844],[844,390],[1920,1080]]){
  globalThis.innerWidth=width;globalThis.innerHeight=height;h.camera.aspect=width/height;h.camera.updateProjectionMatrix();h.viewer.update(1/60);
  assert.equal(h.panel.style.transform,'none');assertPageAligned(h,width,height);
  h.bar.children[1].children[0].emit('click');h.viewer.update(1/60);assertPageAligned(h,width,height);
  const link=h.scene.getObjectByName('Website / emitter connection'),backing=h.scene.getObjectByName('Website / optical screen frame'),points=link.geometry.attributes.position;
  for(const [index,x] of [[2,-.5],[3,.5]])assert.ok(new THREE.Vector3().fromBufferAttribute(points,index).distanceTo(new THREE.Vector3(x,-.5,-.025).applyMatrix4(backing.matrixWorld))<1e-5);
  assert.equal(h.frame(),original);assert.equal(original.parentNode,parent);assert.equal(original.contentDocument,documentState);assert.equal(original.src,item.website.url);assert.equal(h.doc.activeElement,original);assert.equal(h.panel.inert,false);
 }
 assert.equal(original.attachments,1);assert.equal(h.panel.attachments,1);
});

test('opening is lazy; expansion preserves the page, and closing unloads it exactly once',t=>{
 const h=setup(t);assert.equal(h.frame(),undefined);assert.equal(h.viewer.active,false);
 assert.equal(h.viewer.open(item),true);const original=h.frame();assert.equal(original.src,item.website.url);assert.equal(h.opened,1);
 assert.match(original.attributes.sandbox,/allow-scripts/);assert.doesNotMatch(original.attributes.sandbox,/allow-top-navigation/);
 original.emit('load');assert.equal(h.content.children[0].hidden,true);
 const expand=h.bar.children[1].children[0];expand.emit('click');assert.equal(h.shell.classList.contains('is-expanded'),true);assert.equal(h.frame(),original);
 expand.emit('click');assert.equal(h.shell.classList.contains('is-expanded'),false);assert.equal(h.frame(),original);
 h.viewer.close();h.viewer.close();assert.equal(h.closed,1);assert.equal(original.src,'about:blank');assert.equal(h.frame(),undefined);assert.equal(h.shell.hidden,true);assert.equal(h.timers.size,0);
});

test('a new website replaces the old frame and late load events cannot affect it',t=>{
 const h=setup(t);h.viewer.open(item);const old=h.frame();h.viewer.open({...item,id:'second',title:'Second page'});const current=h.frame();
 assert.notEqual(current,old);assert.equal(old.src,'about:blank');old.emit('load');assert.equal(h.content.children[0].hidden,false);
 current.emit('load');assert.equal(h.content.children[0].hidden,true);assert.equal(h.opened,2);assert.equal(h.closed,1);
 h.events.get('keydown')({key:'Escape',preventDefault(){}});assert.equal(h.viewer.active,false);
});

test('first navigation has a connected screen before any animation frame and later renders preserve its attachment',t=>{
 const h=setup(t);h.viewer.open(item);const frame=h.frame();
 assert.equal(h.panel.isConnected,true);assert.equal(frame.connectedOnAppend,true,'inserting the iframe starts navigation in its final connected parent');
 assert.equal(h.panel.attachments,1);assert.equal(frame.attachments,1);
 for(let i=0;i<3;i++){h.viewer.update(1/60);h.bar.children[1].children[0].emit('click');}
 assert.equal(h.panel.attachments,1);assert.equal(frame.attachments,1);
 h.viewer.close();h.viewer.open(item);
 assert.equal(h.panel.attachments,1);assert.equal(h.frame().connectedOnAppend,true);
});

function fireLoadTimer(h){
 const [id,callback]=h.timers.entries().next().value;h.timers.delete(id);callback();
}

test('a visible initial blank frame gets one bounded recovery; stale events cannot affect the retry',t=>{
 const h=setup(t);h.viewer.open(item);const first=h.frame(),staleTimeout=[...h.timers.values()][0];first.contentDocument={URL:'about:blank'};
 fireLoadTimer(h);const recovered=h.frame();
 assert.notEqual(recovered,first);assert.equal(first.src,'about:blank');assert.equal(recovered.src,item.website.url);
 assert.equal(h.opened,1);assert.equal(h.closed,0);assert.match(h.content.children[0].children[0].textContent,/Trying once more/);
 first.emit('load');first.emit('error');staleTimeout();
 assert.equal(h.frame(),recovered);assert.equal(h.content.children[0].hidden,false);assert.equal(h.timers.size,1);
 recovered.contentDocument={URL:'about:blank'};fireLoadTimer(h);
 assert.equal(h.frame(),recovered,'a second timeout must stop instead of looping');assert.equal(h.timers.size,0);
 assert.equal(h.content.children[0].children[1].hidden,false);
 recovered.emit('load');assert.equal(h.content.children[0].hidden,true,'a late successful load still recovers without replacing the page');
});

for(const state of ['committed','cross-origin','inaccessible','hidden'])test(`timeout preserves the frame when its state is ${state}`,t=>{
 const h=setup(t);h.viewer.open(item);const original=h.frame();
 if(state==='committed')original.contentDocument={URL:item.website.url};
 if(state==='cross-origin')original.contentDocument=null;
 if(state==='inaccessible')Object.defineProperty(original,'contentDocument',{get(){throw new Error('Access denied');}});
 if(state==='hidden'){original.contentDocument={URL:'about:blank'};h.doc.hidden=true;}
 fireLoadTimer(h);
 assert.equal(h.frame(),original);assert.equal(h.timers.size,0);assert.equal(h.content.children[0].children[1].hidden,false);
});

test('closing a blank recovery cancels its timeout and a manual retry starts a fresh bounded attempt',t=>{
 const h=setup(t);h.viewer.open(item);h.frame().contentDocument={URL:'about:blank'};fireLoadTimer(h);
 const recovered=h.frame(),staleTimeout=[...h.timers.values()][0];h.viewer.close();staleTimeout();recovered.emit('load');
 assert.equal(h.frame(),undefined);assert.equal(h.timers.size,0);assert.equal(h.viewer.active,false);
 h.viewer.open(item);const failed=h.frame();fireLoadTimer(h);
 h.content.children[0].children[1].emit('click');const manual=h.frame();assert.notEqual(manual,failed);
 manual.contentDocument={URL:'about:blank'};fireLoadTimer(h);assert.notEqual(h.frame(),manual);
});

test('browsing keeps keyboard focus inside the page; website home resets only the page',t=>{
 const h=setup(t);h.viewer.open(item);const original=h.frame();original.focus();
 h.bar.emit('pointermove');assert.equal(h.doc.activeElement,original,'toolbar hover must not steal typing or arm Return to Products');
 const home=h.bar.children[1].children.find(e=>e.attributes['aria-label']==='Website home');home.emit('click');
 assert.equal(h.viewer.active,true);assert.equal(h.opened,1);assert.equal(h.closed,0);
 assert.equal(original.src,'about:blank');assert.notEqual(h.frame(),original);assert.equal(h.frame().src,item.website.url);
});

test('pending permission is shown honestly as a still preview without attempting a blocked embed',t=>{
 const h=setup(t);h.viewer.open({...item,website:{...item.website,pendingPermission:true,poster:'../assets/previews/wharton.webp'}});
 assert.equal(h.frame(),undefined);assert.ok(h.content.children.some(e=>e.tag==='img'));
 assert.match(h.content.children[0].children[0].textContent,/Still preview/);
 h.viewer.dispose();assert.equal(h.doc.body.children.length,0);assert.equal(h.events.size,0);assert.equal(h.timers.size,0);assert.equal(h.viewer.active,false);
});

test('the website screen uses the room camera and a real world-space frame',t=>{
 const h=setup(t);h.viewer.open(item);
 const pose=h.viewer.getFocusPose();h.camera.position.copy(pose.position);h.camera.lookAt(pose.target);h.camera.updateMatrixWorld();h.viewer.update(1/60);
 assert.equal(h.panel.style.transform,'none','the settled page is an ordinary DOM rectangle');
 assert.equal(h.panel.parentNode,h.shell);assert.equal(h.panel.style.position,'absolute');assert.equal(h.panel.inert,false);assert.equal(h.panel.style.pointerEvents,'auto');
 const backing=h.scene.getObjectByName('Website / optical screen frame');assert.equal(backing.visible,true);
 assert.ok(backing.quaternion.angleTo(h.camera.quaternion)<1e-7,'the screen faces the viewer without tilt');assert.ok(Math.abs(backing.position.y-4.75)<1e-8);assert.ok(Math.abs(backing.position.z-1.5)<1e-8);assert.ok(backing.scale.x>4&&backing.scale.y>3);
 const original=h.frame();h.bar.children[1].children[0].emit('click');h.viewer.update(1/60);assert.equal(h.frame(),original,'focusing the holo screen preserves its page');
 h.viewer.close();assert.equal(backing.visible,false);
});

test('projection light stays connected to the emitter and both lower screen corners through resize',t=>{
 const h=setup(t);h.viewer.open(item);const link=h.scene.getObjectByName('Website / emitter connection');
 for(const size of [[1200,800],[390,844],[844,390]]){
  [globalThis.innerWidth,globalThis.innerHeight]=size;h.camera.aspect=size[0]/size[1];h.camera.updateProjectionMatrix();projectedBounds(h,...size);
  const frame=h.scene.getObjectByName('Website / optical screen frame'),p=link.geometry.attributes.position;
  for(const value of p.array)assert.ok(Number.isFinite(value));
  assert.ok(Math.abs(p.getY(0)-1.912)<1e-5);assert.equal(p.getX(0),p.getX(1)*-1);
  for(const [i,side] of [[2,-1],[3,1]]){
   assert.ok(Math.abs(p.getX(i)-(frame.position.x+side*frame.scale.x/2))<1e-5);
   assert.ok(Math.abs(p.getY(i)-(frame.position.y-frame.scale.y/2))<1e-5);
  }
  assert.equal(link.visible,true);
 }
 let geometryReleased=0,materialReleased=0;link.geometry.addEventListener('dispose',()=>geometryReleased++);link.material.addEventListener('dispose',()=>materialReleased++);
 h.viewer.close();assert.equal(link.visible,false);h.viewer.dispose();h.viewer.dispose();
 assert.equal(link.parent,null);assert.equal(geometryReleased,1);assert.equal(materialReleased,1);
});

test('every light layer shares exact endpoints during growth and expansion, and reduced motion freezes its drift',t=>{
 const h=setup(t);window.matchMedia=()=>({matches:false});h.viewer.open(item);
 const link=h.scene.getObjectByName('Website / emitter connection'),geometry=link.geometry,material=link.material;
 const checkAttachment=()=>{
  const frame=h.scene.getObjectByName('Website / optical screen frame');frame.updateMatrixWorld(true);
  const p=geometry.attributes.position,uv=geometry.attributes.uv,weights=geometry.attributes.aWeight,depths=new Set();let baseWeight=0;
  for(let i=0;i<p.count;i++){
   const v=uv.getY(i),side=uv.getX(i),point=new THREE.Vector3().fromBufferAttribute(p,i);
   assert.ok(point.toArray().every(Number.isFinite));
   if(v===0||v===1){
    const expected=v===0?new THREE.Vector3(side?1.34:-1.34,1.912,.95):new THREE.Vector3(side?.5:-.5,-.5,-.025).applyMatrix4(frame.matrixWorld);
    assert.ok(point.distanceTo(expected)<1e-5,`layer boundary ${i} must stay attached`);
    if(v===0&&side===0)baseWeight+=weights.getX(i);
   }else depths.add(Math.sign(point.z-THREE.MathUtils.lerp(.95,frame.position.z-.025,v)));
  }
  assert.ok(depths.has(-1)&&depths.has(1),'light occupies shallow depth on both sides of the central sheet');
  assert.ok(Math.abs(baseWeight-1)<1e-6,'layers share one brightness budget instead of multiplying it');
  assert.equal(link.geometry,geometry);assert.equal(link.material,material);
 };
 for(const dt of [.04,.08]){h.viewer.update(dt,dt);checkAttachment();}
 h.bar.children[1].children[0].emit('click');h.viewer.update(.08,1);checkAttachment();
 globalThis.innerWidth=390;globalThis.innerHeight=844;h.camera.aspect=390/844;h.camera.updateProjectionMatrix();h.viewer.update(.08,2);checkAttachment();
 assert.equal(material.uniforms.uTime.value,2);assert.ok(material.uniforms.uOpacity.value<=.13);assert.equal(material.forceSinglePass,true);assert.equal(material.depthWrite,false);
 window.matchMedia=()=>({matches:true});h.viewer.update(1/60,3);checkAttachment();const settled=Array.from(geometry.attributes.position.array);
 h.viewer.update(1/60,90);assert.equal(material.uniforms.uTime.value,0);assert.deepEqual(Array.from(geometry.attributes.position.array),settled);
 h.viewer.close();assert.equal(link.visible,false);
});

for(const [width,height] of [[1200,800],[1440,900],[1920,1080],[1024,768],[820,1180],[390,844],[320,568],[844,390]])test(`the front-facing website frame clears the chrome at ${width}×${height} in both sizes`,t=>{
 const h=setup(t,width,height);h.viewer.open(item);const original=h.frame();let initialWidth,initialArea;
 for(const expanded of [false,true,false]){
  const bounds=projectedBounds(h,width,height),top=expanded?76:(height<540?84:width<700?166:112),bottom=expanded?18:28;
  assert.ok(bounds.left>=18-.1&&bounds.right<=width-18+.1,JSON.stringify({expanded,...bounds}));
  assert.ok(bounds.top>=top-.1&&bounds.bottom<=height-bottom+.1,JSON.stringify({expanded,...bounds}));
  assert.equal(h.frame(),original,'resizing keeps the live iframe instance');
  if(!expanded){initialWidth=bounds.right-bounds.left;initialArea=initialWidth*(bounds.bottom-bounds.top);if(width>=700&&height>=540)assert.ok(initialWidth<=width*.9,'the browser window still leaves the room visible');}
  else assert.ok((bounds.right-bounds.left)*(bounds.bottom-bounds.top)>initialArea*1.05,'expansion adds usable page area, including height on narrow phones');
  assert.ok(parseFloat(h.panel.style.width)>=Math.min(300,width-50),'the iframe retains a readable native viewport without CSS scaling');
  assert.equal(h.panel.style.transform,'none');assert.equal(h.panel.parentNode,h.shell);assert.equal(h.panel.attachments,1);assert.equal(original.attachments,1);
  assertPageAligned(h,width,height);
  h.bar.children[1].children[0].emit('click');
 }
});

test('disposal detaches both screen objects, releases GPU resources and removes canvas listeners once',t=>{
 const h=setup(t);h.viewer.open(item);projectedBounds(h,1200,800);const frame=h.frame(),backing=h.scene.getObjectByName('Website / optical screen frame');
 const resources=new Set();backing.traverse(object=>{if(object.geometry)resources.add(object.geometry);if(object.material)resources.add(object.material);});
 const releases=new Map();for(const resource of resources)resource.addEventListener('dispose',()=>releases.set(resource,(releases.get(resource)||0)+1));
 for(const event of ['pointerdown','pointermove','pointerup','pointercancel'])assert.equal(h.canvas.events[event].length,1);
 h.viewer.dispose();h.viewer.dispose();
 assert.equal(backing.parent,null);assert.equal(h.scene.getObjectByName(backing.name),undefined);assert.equal(h.panel.parentNode,null,'disposal removes the stable browsing panel');
 assert.equal(frame.src,'about:blank');assert.equal(h.closed,1);assert.equal(h.events.size,0);assert.equal(h.timers.size,0);
 for(const event of ['pointerdown','pointermove','pointerup','pointercancel'])assert.equal(h.canvas.events[event].length,0);
 for(const resource of resources)assert.equal(releases.get(resource),1);
 assert.equal(h.viewer.open(item),false);
});
