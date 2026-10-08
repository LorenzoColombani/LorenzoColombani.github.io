import {createVaultAudio} from './vault-audio.js';

export const VAULT_TIMING=Object.freeze({door:680,open:2030,fade:200,reduced:180});

/** Small DOM-only loading threshold; never waits for a second WebGL scene. */
export function createVaultLoader({element,document=globalThis.document,window=globalThis.window,audio=createVaultAudio({document}),onActivate=()=>{},onBegin=()=>{},onDone=()=>{}}={}){
  if(!element)return {ready(){},fail(){},dispose(){audio.dispose();},get state(){return 'finished';}};
  const status=element.querySelector('[data-vault-status]'),entry=element.querySelector('[data-vault-enter]'),skip=element.querySelector('[data-vault-skip]');
  let state='loading',soundEnabled=false,generation=0,disposed=false,begun=false;
  const timers=new Set(),background=new Map(),listeners=[];
  const reduced=()=>Boolean(window?.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const later=(fn,delay)=>{const id=setTimeout(()=>{timers.delete(id);if(!disposed)fn();},delay);timers.add(id);};
  const clear=()=>{for(const id of timers)clearTimeout(id);timers.clear();};
  const listen=(target,event,fn,options)=>{target?.addEventListener(event,fn,options);listeners.push(()=>target?.removeEventListener(event,fn,options));};
  const lockBackground=()=>{
    for(const child of document.body.children){
      if(child===element||['SCRIPT','STYLE','NOSCRIPT'].includes(child.tagName)||background.has(child))continue;
      background.set(child,child.inert);child.inert=true;
    }
  };
  const observer=typeof window?.MutationObserver==='function'?new window.MutationObserver(lockBackground):null;
  lockBackground();observer?.observe(document.body,{childList:true});
  const unlockBackground=()=>{observer?.disconnect();for(const [child,inert]of background)child.inert=inert;background.clear();};
  const cue=next=>{if(soundEnabled&&audio.play(next)!==false)element.setAttribute('data-vault-audio',next);};
  function finish({failed=false,cancelled=false}={}){
    if(disposed||state==='finished'||state==='failed')return;
    const heldFocus=element.contains(document.activeElement);state=failed?'failed':'finished';generation++;clear();
    element.classList.add('done');element.hidden=true;element.setAttribute('aria-busy','false');
    unlockBackground();audio.dispose();listeners.splice(0).forEach(remove=>remove());
    if((heldFocus||begun)&&!cancelled){const target=failed?document.querySelector('#fallback a'):document.querySelector('#world');target?.focus({preventScroll:true});}
    if(begun&&!failed&&!cancelled)onDone();
  }
  function ready(){
    if(disposed||state!=='loading')return;
    state='ready';element.classList.add('is-ready');element.setAttribute('aria-busy','false');
    if(entry)entry.disabled=false;
    if(status)status.textContent='Tap the reactor to enter';
  }
  function begin(unlocked){
    if(disposed||state!=='arming')return;
    soundEnabled=unlocked;begun=true;state='unlocking';element.classList.add('is-unlocking');element.setAttribute('aria-busy','false');element.setAttribute('data-vault-audio',unlocked?'ready':'unavailable');
    if(status)status.textContent='Unlocking the Workshop';
    if(skip)skip.disabled=false;
    onBegin();
    cue('unlock');
    if(reduced()){later(()=>finish(),VAULT_TIMING.reduced);return;}
    later(()=>{if(state==='unlocking'){state='opening';cue('open');if(status)status.textContent='Opening the Workshop';}},VAULT_TIMING.door);
    later(()=>{if(state==='opening'){element.classList.add('is-open');later(()=>finish(),VAULT_TIMING.fade);}},VAULT_TIMING.open);
  }
  async function activate(event){
    if(!event.isTrusted||disposed||state!=='ready')return;
    state='arming';if(entry)entry.disabled=true;
    const token=++generation;
    // Both audio contexts are primed synchronously by this one trusted gesture.
    // The Garage music is ducked while the door's sound plays.
    const permission=audio.unlock();onActivate();
    if(status)status.textContent='Powering the reactor';
    later(()=>{if(token===generation)begin(false);},2000);
    let unlocked=false;try{unlocked=await permission;}catch{}
    if(disposed||token!==generation)return;
    begin(Boolean(unlocked));
  }
  if(entry)entry.disabled=true;
  if(skip)skip.disabled=true;
  listen(entry,'click',activate);
  listen(skip,'click',()=>{if(state==='unlocking'||state==='opening')finish();});
  listen(document,'visibilitychange',()=>{if(document.hidden)audio.stop();});
  listen(element,'keydown',event=>{if(event.key==='Escape'&&(state==='opening'||state==='unlocking')){event.preventDefault();finish();}});
  return {ready,fail:()=>finish({failed:true}),get state(){return state;},dispose(){if(disposed)return;finish({cancelled:true});disposed=true;clear();observer?.disconnect();audio.dispose();listeners.splice(0).forEach(remove=>remove());}};
}
