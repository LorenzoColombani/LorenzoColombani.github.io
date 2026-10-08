import {createVaultLoader} from './vault-loader.js?v=reactor-entry-25';
const opening=createVaultLoader({element:document.querySelector('#loader'),onActivate:()=>dispatchEvent(new Event('workshop-entry-audio')),onBegin:()=>dispatchEvent(new Event('workshop-enter')),onDone:()=>dispatchEvent(new Event('workshop-vault-open'))});
const ready=()=>opening.ready();
addEventListener('workshop-ready',ready,{once:true});
addEventListener('pagehide',()=>{removeEventListener('workshop-ready',ready);opening.dispose();},{once:true});
addEventListener('error',e=>console.error('Workshop runtime error:',e.message));
import('./main.js?v=reactor-entry-25').catch(error => {
  console.error('The Workshop could not start:', error);
  const fallback = document.querySelector('#fallback');
  if (fallback) fallback.hidden = false;
  opening.fail();
  document.body.dataset.startupError = error.message;
});
