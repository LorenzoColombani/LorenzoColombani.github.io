addEventListener('error',e=>console.error('Workshop runtime error:',e.message));
import('./main.js?v=site-preview-restored-23').catch(error => {
  console.error('The Workshop could not start:', error);
  document.querySelector('#loader')?.classList.add('done');
  const fallback = document.querySelector('#fallback');
  if (fallback) fallback.hidden = false;
  document.body.dataset.startupError = error.message;
});
