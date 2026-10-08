import {createVaultAudio} from './vault-audio.js';

export const VAULT_TIMING=Object.freeze({door:680,open:2030,fade:200,reduced:180});

/** Small DOM-only loading threshold; never waits for a second WebGL scene. */
export function createVaultLoader({element,document=globalThis.document,window=globalThis.window,audio=createVaultAudio({document}),onDone=()=>{}}={}){
  if(!element)return {ready(){},fail(){},dispose(){audio.dispose();},get state(){return 'finished';}};
  const status=element.querySelector('[data-vault-status]'),sound=element.querySelector('[data-vault-sound]'),soundState=element.querySelector('[data-vault-sound-state]'),skip=element.querySelector('[data-vault-skip]');
  let state='loading',phase='charge',soundRequested=false,generation=0,disposed=false;
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
  const updateSound=()=>{sound?.setAttribute('aria-pressed',String(soundRequested));if(soundState)soundState.textContent=soundRequested?'On':'Off';};
  const cue=next=>{phase=next;if(soundRequested)audio.play(next);};
  function finish({failed=false}={}){
    if(disposed||state==='finished'||state==='failed')return;
    const heldFocus=element.contains(document.activeElement);state=failed?'failed':'finished';generation++;clear();
    element.classList.add('done');element.hidden=true;element.setAttribute('aria-busy','false');
    unlockBackground();audio.dispose();listeners.splice(0).forEach(remove=>remove());
    if(heldFocus){const target=failed?document.querySelector('#fallback a'):document.querySelector('body.entered #world')||document.querySelector('#enter-button');target?.focus({preventScroll:true});}
    onDone({failed});
  }
  function ready(){
    if(disposed||state!=='loading')return;
    state='unlocking';element.classList.add('is-ready','is-unlocking');element.setAttribute('aria-busy','false');
    if(status)status.textContent='Unlocking the Workshop';
    if(skip)skip.disabled=false;
    cue('unlock');
    if(reduced()){later(()=>finish(),VAULT_TIMING.reduced);return;}
    later(()=>{if(state==='unlocking'){state='opening';cue('open');if(status)status.textContent='Opening the Workshop';}},VAULT_TIMING.door);
    later(()=>{if(state==='opening'){element.classList.add('is-open');later(()=>finish(),VAULT_TIMING.fade);}},VAULT_TIMING.open);
  }
  async function toggleSound(event){
    if(!event.isTrusted||disposed||state==='finished'||state==='failed')return;
    const token=++generation;
    if(soundRequested){soundRequested=false;audio.stop();updateSound();return;}
    soundRequested=true;updateSound();
    const unlocked=await audio.unlock();
    if(disposed||token!==generation||!soundRequested||state==='finished'||state==='failed')return;
    if(!unlocked){soundRequested=false;updateSound();if(soundState)soundState.textContent='Unavailable';return;}
    audio.play(phase);
  }
  if(skip)skip.disabled=true;
  listen(sound,'click',toggleSound);
  listen(skip,'click',()=>{if(state==='unlocking'||state==='opening')finish();});
  listen(document,'visibilitychange',()=>{if(document.hidden)audio.stop();});
  listen(element,'keydown',event=>{if(event.key==='Escape'&&(state==='opening'||state==='unlocking')){event.preventDefault();finish();}});
  return {ready,fail:()=>finish({failed:true}),get state(){return state;},dispose(){if(disposed)return;finish();disposed=true;clear();observer?.disconnect();audio.dispose();listeners.splice(0).forEach(remove=>remove());}};
}
