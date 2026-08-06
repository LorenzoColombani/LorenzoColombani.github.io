/* tv.js — the screens.
   Photo-first: every panel shows a still until you ask for the real thing.
   ONE live page at a time, globally — opening a second closes the first and
   blanks its iframe, so the cost is flat no matter how many screens exist.

   Marquee panels play *in the bezel*; archive cards play in a projector modal.
   Targets that refuse framing never get a ▶ at all (see the embed matrix in
   index.html) — the affordance tells the truth about what will happen. */

const FRAME_W = 1280;
const FRAME_H = 800;                       // 16:10, same ratio as the bezel

let live = null;                           // { host, restoreFocus, isModal }

/* the hero keeps its own rAF loop; a framed three.js film would run a second
   WebGL context on top of it. Same signal both ways. */
function announce(on) {
  document.dispatchEvent(new CustomEvent('sr:live', { detail: { live: on } }));
}

export function initTV() {
  document.querySelectorAll('.feat .tv-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const feat = btn.closest('.feat');
      openInPane(feat.querySelector('.feat-screen'), feat.dataset, btn);
    });
  });

  document.querySelectorAll('.card[data-embed="live"] .card-play').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      openProjector(btn.closest('.card').dataset, btn);
    });
  });

  addEventListener('keydown', e => {
    if (e.key === 'Escape' && live) { e.preventDefault(); closeLive(); }
    if (e.key === 'Tab' && live?.isModal) trapTab(e);
  });
}

/* ---- pieces ------------------------------------------------------------ */

function soundcloudSrc(url) {
  return 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(url)
       + '&color=%23d4a574&auto_play=false&hide_related=true&show_comments=false'
       + '&show_user=true&show_teaser=false&visual=true';
}

/* A scaled frame: the page renders at a real desktop width, then the whole
   thing is scaled down into the bezel. Never letterboxed, never reflowed. */
function scaledFrame(url, paneW) {
  const f = document.createElement('iframe');
  f.src = url;
  f.title = 'Live preview';
  f.width = FRAME_W;
  f.height = FRAME_H;
  f.setAttribute('loading', 'eager');
  f.style.cssText = `position:absolute;top:0;left:0;width:${FRAME_W}px;height:${FRAME_H}px;`
                  + `border:0;transform:scale(${paneW / FRAME_W});transform-origin:0 0`;
  return f;
}

function nativeFrame(url) {
  const f = document.createElement('iframe');
  f.src = url;
  f.title = 'Live preview';
  f.style.cssText = 'width:100%;height:100%;border:0;display:block';
  return f;
}

function closeButton() {
  const x = document.createElement('button');
  x.type = 'button';
  x.className = 'tv-x';
  x.setAttribute('aria-label', 'Close preview');
  const glyph = document.createElement('span');
  glyph.setAttribute('aria-hidden', 'true');
  glyph.textContent = '✕';
  x.appendChild(glyph);
  x.addEventListener('click', closeLive);
  return x;
}

function liveDot() {
  const d = document.createElement('span');
  d.className = 'tv-dot';
  d.textContent = '● LIVE';
  return d;
}

/* ---- in-bezel (marquee) ------------------------------------------------- */

function openInPane(pane, data, btn) {
  closeLive();

  const wrap = document.createElement('div');
  wrap.className = 'tv-live';

  const skel = document.createElement('div');
  skel.className = 'tv-skel';
  wrap.appendChild(skel);

  const isWidget = data.embed === 'widget';
  const frame = isWidget
    ? nativeFrame(soundcloudSrc(data.src))
    : scaledFrame(data.src, pane.clientWidth);
  frame.addEventListener('load', () => skel.remove());

  // the player wears its own chrome — a second LIVE badge just stacks on it
  wrap.append(frame, ...(isWidget ? [] : [liveDot()]), closeButton());
  pane.appendChild(wrap);

  live = { host: wrap, restoreFocus: btn };
  wrap.querySelector('.tv-x').focus();
  announce(true);
  window.SRSound?.play('on');
}

/* ---- projector (archive cards) ------------------------------------------ */

function openProjector(data, btn) {
  closeLive();

  const dlg = document.createElement('div');
  dlg.className = 'projector';
  dlg.setAttribute('role', 'dialog');
  dlg.setAttribute('aria-modal', 'true');
  dlg.setAttribute('aria-label', 'Preview: ' + (data.title || 'project'));

  const pane = document.createElement('div');
  pane.className = 'projector-pane';
  dlg.appendChild(pane);
  dlg.appendChild(closeButton());
  document.body.appendChild(dlg);
  document.body.style.overflow = 'hidden';

  const skel = document.createElement('div');
  skel.className = 'tv-skel';
  pane.appendChild(skel);

  // narrow screens get the site's own responsive layout, not a shrunken desktop
  const small = matchMedia('(max-width: 900px)').matches;
  const frame = small ? nativeFrame(data.src) : scaledFrame(data.src, pane.clientWidth);
  frame.addEventListener('load', () => skel.remove());
  pane.appendChild(frame);
  pane.appendChild(liveDot());

  dlg.addEventListener('click', e => { if (e.target === dlg) closeLive(); });

  live = { host: dlg, restoreFocus: btn, isModal: true };
  dlg.querySelector('.tv-x').focus();
  announce(true);
  window.SRSound?.play('on');
}

/* keep tabbing inside the modal — an iframe is one stop, so this is short */
function trapTab(e) {
  const stops = live.host.querySelectorAll('button, iframe, a[href]');
  if (!stops.length) return;
  const first = stops[0], last = stops[stops.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

/* ---- close -------------------------------------------------------------- */

export function closeLive() {
  if (!live) return;
  // blank before removing: some pages keep audio alive through a detach
  live.host.querySelectorAll('iframe').forEach(f => { f.src = 'about:blank'; });
  live.host.remove();
  document.body.style.overflow = '';
  live.restoreFocus?.focus();
  live = null;
  announce(false);
  window.SRSound?.play('off');
}
