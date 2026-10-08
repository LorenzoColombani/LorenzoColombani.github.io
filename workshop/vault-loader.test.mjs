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
 element.parts={'[data-vault-status]':status,'[data-vault-enter]':button,'[data-vault-skip]':skip};
 const entry=new Element('CANVAS'),doc=new Element('DOCUMENT');doc.body={children:[element,page,prior]};doc.activeElement=button;doc.querySelector=s=>s==='#world'?entry:null;
 const cues=[];let unlocked=0,stopped=0,disposed=0,finished=0,activated=0,begun=0;
 const audio={unlock:()=>{unlocked++;return unlock();},play:phase=>cues.push(phase),stop:()=>stopped++,dispose:()=>disposed++};
 const loader=createVaultLoader({element,document:doc,window:{matchMedia:()=>({matches:reduced})},audio,onActivate:()=>activated++,onBegin:()=>begun++,onDone:()=>finished++});
 return {loader,element,button,skip,status,label,page,prior,doc,entry,cues,get unlocked(){return unlocked;},get stopped(){return stopped;},get disposed(){return disposed;},get finished(){return finished;},get activated(){return activated;},get begun(){return begun;}};
}
test('scene readiness alone never opens the door or starts audio',async t=>{
 const h=setup(t);assert.equal(h.page.inert,true);assert.equal(h.button.disabled,true);assert.equal(h.skip.disabled,true);
 await h.button.emit('click');t.mock.timers.tick(10000);await h.skip.emit('click');assert.equal(h.loader.state,'loading');assert.equal(h.unlocked,0);
 h.loader.ready();h.loader.ready();assert.equal(h.loader.state,'ready');assert.equal(h.button.disabled,false);assert.equal(h.skip.disabled,true);
 t.mock.timers.tick(10000);assert.equal(h.loader.state,'ready');assert.deepEqual(h.cues,[]);h.loader.dispose();assert.equal(h.begun,0);assert.equal(h.finished,0);
});
test('one trusted reactor click unlocks sound and enters once; there is no second entry',async t=>{
 const h=setup(t);h.loader.ready();await h.button.emit('click',{isTrusted:false});assert.equal(h.unlocked,0);
 await h.button.emit('click');await h.button.emit('click');assert.equal(h.unlocked,1);assert.equal(h.activated,1);assert.equal(h.begun,1);assert.deepEqual(h.cues,['unlock']);
 t.mock.timers.tick(VAULT_TIMING.door);assert.deepEqual(h.cues,['unlock','open']);
 t.mock.timers.tick(VAULT_TIMING.open-VAULT_TIMING.door);t.mock.timers.tick(VAULT_TIMING.fade);
 assert.equal(h.loader.state,'finished');assert.equal(h.page.inert,false);assert.equal(h.prior.inert,true);assert.equal(h.finished,1);assert.equal(h.entry.focused,true);
});
test('audio settles before the door opens and duplicate taps cannot arm it twice',async t=>{
 let resolve;const h=setup(t,{unlock:()=>new Promise(r=>resolve=r)});h.loader.ready();
 const click=h.button.emit('click');await h.button.emit('click');assert.equal(h.loader.state,'arming');assert.equal(h.begun,0);assert.equal(h.unlocked,1);
 resolve(true);await click;assert.equal(h.begun,1);assert.deepEqual(h.cues,['unlock']);await h.skip.emit('click');assert.equal(h.finished,1);
});
test('late audio permission after teardown cannot enter or play',async t=>{
 let resolve;const h=setup(t,{unlock:()=>new Promise(r=>resolve=r)});h.loader.ready();
 const click=h.button.emit('click');h.loader.dispose();resolve(true);await click;
 assert.equal(h.begun,0);assert.equal(h.finished,0);assert.deepEqual(h.cues,[]);assert.equal(h.page.inert,false);
});
test('unsupported audio and a stalled resume still leave a working entrance',async t=>{
 const h=setup(t,{unlock:()=>Promise.resolve(false)});h.loader.ready();await h.button.emit('click');assert.equal(h.begun,1);assert.deepEqual(h.cues,[]);await h.skip.emit('click');assert.equal(h.finished,1);
});
test('an unresolved audio request is bounded without a delayed duplicate entrance',async t=>{
 let resolve;const h=setup(t,{unlock:()=>new Promise(r=>resolve=r)});h.loader.ready();
 const click=h.button.emit('click');t.mock.timers.tick(2000);assert.equal(h.begun,1);resolve(true);await click;assert.equal(h.begun,1);assert.deepEqual(h.cues,[]);h.loader.dispose();
});
test('reduced motion still requires the one gesture and completes entry',async t=>{
 const h=setup(t,{reduced:true});h.loader.ready();assert.equal(h.loader.state,'ready');await h.button.emit('click');t.mock.timers.tick(VAULT_TIMING.reduced);assert.equal(h.begun,1);assert.equal(h.finished,1);assert.equal(h.page.inert,false);
});
test('startup failure releases input and never enters the scene',t=>{
 const h=setup(t);h.loader.ready();h.loader.fail();t.mock.timers.tick(5000);assert.equal(h.loader.state,'failed');assert.equal(h.page.inert,false);assert.equal(h.prior.inert,true);assert.equal(h.begun,0);assert.equal(h.finished,0);assert.equal(h.disposed,1);
});
test('backgrounding stops the finite opening cues',async t=>{
 const h=setup(t);h.loader.ready();await h.button.emit('click');h.doc.hidden=true;await h.doc.emit('visibilitychange');assert.equal(h.stopped,1);h.loader.dispose();
});
test('production loader matches its source fragment and bootstrap waits for real scene readiness',async()=>{
 const read=name=>readFile(new URL(name,import.meta.url),'utf8');
 const [html,fragment,main,boot]=await Promise.all(['index.html','vault-loader-markup.html','main.js','bootstrap.js'].map(read));
 assert.ok(html.includes(fragment.replace(/^<!--.*?-->\n/,'').trim()));
 assert.ok(html.includes('vault-loader.css'));assert.ok(boot.includes("addEventListener('workshop-ready'"));assert.ok(main.includes("dispatchEvent(new Event('workshop-ready'))"));
 assert.ok(!main.includes("$('#loader').classList.add('done')"));
 assert.ok(!html.includes('id="enter-button"'));assert.ok(!html.includes('data-vault-sound'));
 assert.ok(boot.includes("new Event('workshop-enter')"));assert.ok(main.includes("addEventListener('workshop-enter',enterFromVault)"));
});
