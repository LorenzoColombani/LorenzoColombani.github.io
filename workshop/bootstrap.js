import {createVaultLoader} from './vault-loader.js?v=reactor-vault-24';
const opening=createVaultLoader({element:document.querySelector('#loader')});
const ready=()=>opening.ready();
addEventListener('workshop-ready',ready,{once:true});
addEventListener('pagehide',()=>{removeEventListener('workshop-ready',ready);opening.dispose();},{once:true});
addEventListener('error',e=>console.error('Workshop runtime error:',e.message));
import('./main.js?v=reactor-vault-24').catch(error => {
  console.error('The Workshop could not start:', error);
  const fallback = document.querySelector('#fallback');
  if (fallback) fallback.hidden = false;
  opening.fail();
  document.body.dataset.startupError = error.message;
});
