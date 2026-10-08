import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createVaultLoader,VAULT_TIMING} from './vault-loader.js';

class Element{
 constructor(tag='DIV'){this.tagName=tag;this.inert=false;this.hidden=false;this.listeners={};this.attrs={};const set=new Set();this.classList={add:(...values)=>values.forEach(x=>set.add(x)),contains:x=>set.has(x)};}
 addEventListener(type,fn){(this.listeners[type]??=new Set()).add(fn);}
 removeEventListener(type,fn){this.listeners[type]?.delete(fn);}
 async emit(type,event={}){for(const fn of this.listeners[type]||[])await fn({isTrusted:true,preventDefault(){},...event});}
 setAttribute(key,value){this.attrs[key]=value;}
 contains(node){return node===this||Object.values(this.parts||{}).includes(node);}
 querySelector(selector){return this.parts?.[selector]||null;}
 focus(){this.focused=true;}
}
function setup(t,{reduced=false,unlock=()=>Promise.resolve(true)}={}){
 t.mock.timers.enable({apis:['setTimeout']});
 const element=new Element(),button=new Element('BUTTON'),skip=new Element('BUTTON'),status=new Element('P'),label=new Element('SPAN'),page=new Element('MAIN'),prior=new Element();prior.inert=true;
 element.parts={'[data-vault-status]':status,'[data-vault-sound]':button,'[data-vault-sound-state]':label,'[data-vault-skip]':skip};
 const entry=new Element('BUTTON'),doc=new Element('DOCUMENT');doc.body={children:[element,page,prior]};doc.activeElement=button;doc.querySelector=s=>s==='#enter-button'?entry:null;
 const cues=[];let unlocked=0,stopped=0,disposed=0,finished=0;
 const audio={unlock:()=>{unlocked++;return unlock();},play:phase=>cues.push(phase),stop:()=>stopped++,dispose:()=>disposed++};
 const loader=createVaultLoader({element,document:doc,window:{matchMedia:()=>({matches:reduced})},audio,onDone:()=>finished++});
 return {loader,element,button,skip,status,label,page,prior,doc,entry,cues,get unlocked(){return unlocked;},get stopped(){return stopped;},get disposed(){return disposed;},get finished(){return finished;}};
}
test('loading follows readiness, stays silent, and never permits Skip before resources are ready',async t=>{
 const h=setup(t);assert.equal(h.page.inert,true);assert.equal(h.skip.disabled,true);
 t.mock.timers.tick(100000);await h.skip.emit('click');assert.equal(h.loader.state,'loading');assert.equal(h.unlocked,0);assert.deepEqual(h.cues,[]);
 h.loader.ready();h.loader.ready();assert.equal(h.loader.state,'unlocking');assert.equal(h.skip.disabled,false);
 t.mock.timers.tick(VAULT_TIMING.door);assert.equal(h.loader.state,'opening');
 t.mock.timers.tick(VAULT_TIMING.open-VAULT_TIMING.door);assert.equal(h.element.classList.contains('is-open'),true);
 t.mock.timers.tick(VAULT_TIMING.fade);assert.equal(h.loader.state,'finished');assert.equal(h.element.hidden,true);assert.equal(h.page.inert,false);assert.equal(h.prior.inert,true);assert.equal(h.finished,1);assert.equal(h.entry.focused,true);
 assert.equal(h.unlocked,0);assert.deepEqual(h.cues,[]);
});
test('a trusted sound toggle arms only the opening cues and supports turning them off',async t=>{
 const h=setup(t);await h.button.emit('click',{isTrusted:false});assert.equal(h.unlocked,0);
 await h.button.emit('click');assert.equal(h.unlocked,1);assert.deepEqual(h.cues,['charge']);assert.equal(h.button.attrs['aria-pressed'],'true');
 h.loader.ready();t.mock.timers.tick(VAULT_TIMING.door);assert.deepEqual(h.cues,['charge','unlock','open']);
 await h.button.emit('click');assert.equal(h.stopped,1);assert.equal(h.button.attrs['aria-pressed'],'false');
 h.loader.dispose();
});
test('late audio permission cannot play after Skip, failure, or disposal',async t=>{
 let resolve;const h=setup(t,{unlock:()=>new Promise(r=>resolve=r)});
 const click=h.button.emit('click');h.loader.ready();await h.skip.emit('click');resolve(true);await click;
 assert.equal(h.loader.state,'finished');assert.ok(!h.cues.includes('charge'));assert.equal(h.finished,1);
 h.loader.ready();h.loader.fail();h.loader.dispose();assert.equal(h.finished,1);
});
test('failed audio never prevents the visual door from completing',async t=>{
 const h=setup(t,{unlock:()=>Promise.resolve(false)});await h.button.emit('click');assert.equal(h.label.textContent,'Unavailable');assert.equal(h.button.attrs['aria-pressed'],'false');
 h.loader.ready();await h.skip.emit('click');assert.equal(h.loader.state,'finished');
});
test('reduced motion has a short reveal and fail releases input immediately',t=>{
 const h=setup(t,{reduced:true});h.loader.ready();t.mock.timers.tick(VAULT_TIMING.reduced);assert.equal(h.loader.state,'finished');assert.equal(h.page.inert,false);
});
test('startup failure does not leave the page locked or scheduled sounds running',t=>{
 const h=setup(t);h.loader.ready();h.loader.fail();t.mock.timers.tick(5000);assert.equal(h.loader.state,'failed');assert.equal(h.page.inert,false);assert.equal(h.prior.inert,true);assert.equal(h.finished,1);assert.equal(h.disposed,1);assert.deepEqual(h.cues,[]);
});
test('hidden pages stop opening audio without altering the music setting',async t=>{
 const h=setup(t);await h.button.emit('click');h.doc.hidden=true;await h.doc.emit('visibilitychange');assert.equal(h.stopped,1);h.loader.dispose();
});
test('production loader matches its source fragment and bootstrap waits for real scene readiness',async()=>{
 const read=name=>readFile(new URL(name,import.meta.url),'utf8');
 const [html,fragment,main,boot]=await Promise.all(['index.html','vault-loader-markup.html','main.js','bootstrap.js'].map(read));
 assert.ok(html.includes(fragment.replace(/^<!--.*?-->\n/,'').trim()));
 assert.ok(html.includes('vault-loader.css'));assert.ok(boot.includes("addEventListener('workshop-ready'"));assert.ok(main.includes("dispatchEvent(new Event('workshop-ready'))"));
 assert.ok(!main.includes("$('#loader').classList.add('done')"));
});
