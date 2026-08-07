/* tv.js — the screens.
   Photo-first: every panel shows a still until you ask for the real thing.
   ONE live page at a time, globally — opening a second closes the first and
   blanks its iframe, so the cost is flat no matter how many screens exist.

   Marquee panels play *in the bezel*; archive cards play in a projector modal.
   Targets that refuse framing never get a ▶ at all (see the embed matrix in
   index.html) — the affordance tells the truth about what will happen. */

const FRAME_W = 1280;
const FRAME_H = 800;                       // 16:10, same ratio as the bezel
const GROW    = 0.52;                      // s — panel → full screen, and back
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

let live = null;                           // { host, restoreFocus, isModal, isStage, from, pane }

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

  // the marquee's ⤢ — the work takes the whole screen, and gives it straight back
  document.querySelectorAll('.feat .tv-full').forEach(btn => {
    btn.addEventListener('click', () => openStage(btn.closest('.feat'), btn));
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

/* Cross-origin frames take focus when they load, and our ESC listener can't
   hear keys inside one. Tabbing back out of the frame is the escape hatch — but
   without a guard it lands on whatever sits behind the modal. So: any focus
   that re-enters our document while the projector is open goes to the ✕, which
   puts ESC back in reach. (Measured: Wix steals focus ~600ms after load, so a
   one-shot refocus on `load` is too early to help.) */
function guardModalFocus(e) {
  if (!live?.isModal) return;
  if (live.host.contains(e.target)) return;
  live.host.querySelector('.tv-x')?.focus({ preventScroll: true });
}

/* And the steal itself: framed pages focus themselves shortly after load
   (Wix does it ~600ms in), which hands the keyboard to a document we can't
   read keys from. Measured: Shift+Tab does NOT walk straight back out — it
   walks backwards through the framed page's own controls first, so a keyboard
   user really is stuck. Watch for the steal over a short window and take focus
   back once; after that the frame is the user's to enter deliberately. */
function refuseFocusSteal(frame, closeBtn) {
  const until = performance.now() + 3000;      // measured: Wix steals twice, ~1.2s and ~2.4s
  const id = setInterval(() => {
    if (!closeBtn.isConnected || performance.now() > until) { clearInterval(id); return; }
    if (document.activeElement === frame) closeBtn.focus({ preventScroll: true });
  }, 160);
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
  const x = closeButton();
  wrap.append(frame, ...(isWidget ? [] : [liveDot()]), x);
  pane.appendChild(wrap);

  live = { host: wrap, restoreFocus: btn };
  x.focus();
  refuseFocusSteal(frame, x);
  announce(true);
  window.SRSound?.play('on');
}

/* ---- the stage: a featured work takes the whole screen -------------------
   Grows out of its own panel and retracts back into it (FLIP: measure the
   panel, start the full-size stage transformed onto that rect, then animate to
   identity — one transform, no layout work per frame).

   Honesty rule, unchanged: a target that refuses framing does NOT get faked.
   Data Vault and Wharton send X-Frame-Options DENY / frame-ancestors 'none',
   so their stage shows the still at full size and hands you the real link. */
function openStage(feat, btn) {
  closeLive();

  const d = feat.dataset;
  const screen = feat.querySelector('.feat-screen');
  const from = screen.getBoundingClientRect();
  const title = feat.querySelector('.feat-title')?.textContent.trim() || 'project';

  const dlg = document.createElement('div');
  dlg.className = 'stage';
  dlg.setAttribute('role', 'dialog');
  dlg.setAttribute('aria-modal', 'true');
  dlg.setAttribute('aria-label', title + ' — full screen');

  const pane = document.createElement('div');
  pane.className = 'stage-pane';
  const x = closeButton();
  x.classList.add('is-stage');
  dlg.append(pane, x);

  const bar = document.createElement('div');
  bar.className = 'stage-bar';
  const name = document.createElement('span');
  name.className = 'stage-title';
  name.textContent = title;
  bar.append(name);

  document.body.appendChild(dlg);
  document.body.style.overflow = 'hidden';
  document.addEventListener('focusin', guardModalFocus);

  let frame = null;
  if (d.embed === 'shot') {
    // no iframe: this site says no, and a screenshot pretending otherwise is a lie
    const img = feat.querySelector('.still').cloneNode();
    img.className = 'stage-still';
    img.loading = 'eager';
    pane.appendChild(img);

    const note = document.createElement('p');
    note.className = 'stage-note';
    note.textContent = 'This one won’t run inside another page — it sets a frame policy that blocks it.';
    const go = document.createElement('a');
    go.className = 'stage-go';
    go.href = d.src; go.target = '_blank'; go.rel = 'noopener';
    go.textContent = 'Open the live site ↗';
    bar.append(note, go);
  } else {
    const skel = document.createElement('div');
    skel.className = 'tv-skel';
    pane.appendChild(skel);
    // full-bleed and unscaled: at this size the site gets to be its own responsive self
    frame = d.embed === 'widget' ? nativeFrame(soundcloudSrc(d.src)) : nativeFrame(d.src);
    frame.addEventListener('load', () => skel.remove());
    pane.appendChild(frame);
    pane.appendChild(liveDot());

    const go = document.createElement('a');
    go.className = 'stage-go';
    go.href = d.src; go.target = '_blank'; go.rel = 'noopener';
    go.textContent = 'Open in a new tab ↗';
    bar.append(go);
  }
  dlg.appendChild(bar);

  live = { host: dlg, restoreFocus: btn, isModal: true, from, pane, isStage: true };

  if (!REDUCED) {
    const to = pane.getBoundingClientRect();
    const sx = from.width / to.width, sy = from.height / to.height;
    pane.style.transformOrigin = '0 0';
    pane.style.transform =
      `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${sx}, ${sy})`;
    dlg.style.opacity = '0';
    requestAnimationFrame(() => {
      dlg.style.transition = 'opacity .3s ease';
      pane.style.transition = `transform ${GROW}s cubic-bezier(.22,.61,.36,1)`;
      dlg.style.opacity = '1';
      pane.style.transform = 'none';
    });
  }

  x.focus();
  if (frame) refuseFocusSteal(frame, x);
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
  const x = closeButton();
  dlg.appendChild(x);          // before the pane: Shift+Tab out of the frame lands here
  dlg.appendChild(pane);
  document.body.appendChild(dlg);
  document.body.style.overflow = 'hidden';
  document.addEventListener('focusin', guardModalFocus);

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
  x.focus();
  refuseFocusSteal(frame, x);
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
  const it = live;
  live = null;                                  // drop the handle first: the retract is async
  document.removeEventListener('focusin', guardModalFocus);
  // blank before removing: some pages keep audio alive through a detach
  it.host.querySelectorAll('iframe').forEach(f => { f.src = 'about:blank'; });
  document.body.style.overflow = '';
  announce(false);
  window.SRSound?.play('off');

  const done = () => { it.host.remove(); it.restoreFocus?.focus(); };

  // the stage retracts into the panel it grew out of — same curve, reversed
  if (it.isStage && !REDUCED && it.pane) {
    const to = it.pane.getBoundingClientRect();
    const from = it.restoreFocus?.closest('.feat')?.querySelector('.feat-screen')
                   ?.getBoundingClientRect() || it.from;
    const sx = from.width / to.width, sy = from.height / to.height;
    it.pane.style.transition = `transform ${GROW}s cubic-bezier(.22,.61,.36,1)`;
    it.host.style.transition = 'opacity .34s ease .1s';
    requestAnimationFrame(() => {
      it.pane.style.transform =
        `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${sx}, ${sy})`;
      it.host.style.opacity = '0';
    });
    setTimeout(done, GROW * 1000 + 40);
    return;
  }
  done();
}
