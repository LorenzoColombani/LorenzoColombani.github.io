/* sound.js — the ♪ chip.

   Rules this obeys, in order of who enforces them:
   - the browser: audio may only start from a real user gesture, so nothing is
     even FETCHED until the chip is clicked. Zero audio bytes on page load.
   - politeness: a stored "on" does NOT auto-start on the next visit. Storage
     only remembers that the invitation was already offered, so the chip stops
     pulsing. Arriving to unexpected sound is worse than arriving to silence.
   - the room: fade out when the tab goes away, fade back when it returns. */

const KEY = 'sr-sound';
const MUSIC_GAIN = 0.35;
const SFX_GAIN = 0.5;

/* storage can THROW, not just be empty (Chrome "block all cookies" makes the
   localStorage getter itself throw) — and this module boots in main.js's init
   chain, so an unguarded read would take filters, motion and the hero down
   with it. Sound degrades; the page never does. */
const store = {
  get() { try { return localStorage.getItem(KEY); } catch { return null; } },
  set(v) { try { localStorage.setItem(KEY, v); } catch { /* politeness only */ } }
};

export function initSound() {
  const chip = document.getElementById('sound-chip');
  if (!chip) return;
  const label = chip.querySelector('.chip-label') || chip;

  let ctx, musicGain, source, on = false, loading = null;
  const sfx = {};

  async function ensure() {
    if (loading) return loading;
    loading = (async () => {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      musicGain = ctx.createGain();
      musicGain.gain.value = 0;
      musicGain.connect(ctx.destination);

      const buf = await fetch('/assets/audio/score.m4a')
        .then(r => { if (!r.ok) throw new Error('score ' + r.status); return r.arrayBuffer(); })
        .then(b => ctx.decodeAudioData(b));

      source = ctx.createBufferSource();
      source.buffer = buf;
      source.loop = true;              // gapless: the file's seam is crossfaded
      source.connect(musicGain);
      source.start();
    })();
    // a failed load must not brick sound for the session: clear the cached
    // promise so the NEXT click retries instead of re-awaiting the rejection
    loading.catch(() => { loading = null; });
    return loading;
  }

  function ramp(to, seconds) {
    if (!ctx) return;
    const g = musicGain.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setValueAtTime(g.value, ctx.currentTime);
    g.linearRampToValueAtTime(to, ctx.currentTime + seconds);
  }

  /* Both audio paths are root-absolute. They were document-relative, which is
     the same thing on the home page and a 404 on every page in a subfolder —
     so on /work/openbots/ the chip flipped to SOUND ON, the fetch rejected,
     and it flipped silently back over silence. Found in the Stage 1 audit. */
  async function play(name) {                 // tv.js calls this
    if (!on || !ctx) return;
    const file = name === 'on' ? 'sfx-hud-on' : 'sfx-hud-blip';
    sfx[file] ??= fetch(`/assets/audio/${file}.mp3`)
      .then(r => r.arrayBuffer())
      .then(b => ctx.decodeAudioData(b))
      .catch(() => null);
    const buf = await sfx[file];
    if (!buf || !on) return;
    const s = ctx.createBufferSource();
    s.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = SFX_GAIN;
    s.connect(g).connect(ctx.destination);
    s.start();
  }

  async function set(v) {
    on = v;
    store.set(v ? 'on' : 'off');
    try { sessionStorage.setItem(KEY, v ? 'on' : 'off'); } catch { /* politeness only */ }
    chip.setAttribute('aria-pressed', String(v));
    label.textContent = v ? 'SOUND ON' : 'SOUND OFF';
    chip.classList.remove('pulse-once');
    if (v) {
      try {
        await ensure();
      } catch {
        // load failed: revert honestly instead of an ON chip over silence
        on = false;
        chip.setAttribute('aria-pressed', 'false');
        label.textContent = 'SOUND OFF';
        return;
      }
      if (!on) return;   // toggled OFF while the score was fetching — stay silent
      await ctx.resume();
      if (!on) return;
      ramp(MUSIC_GAIN, 1.2);
    } else {
      ramp(0, 0.6);
    }
  }

  chip.addEventListener('click', () => set(!on));   // the gesture; autoplay-legal

  document.addEventListener('visibilitychange', () => {
    if (ctx && on) ramp(document.hidden ? 0 : MUSIC_GAIN, 0.5);
  });

  // first visit only: one quiet invitation, then never again
  if (store.get() === null) chip.classList.add('pulse-once');

  /* Carry the choice across a click, but not across a visit.
     The politeness rule above — "a stored 'on' does NOT auto-start on the next
     visit" — was written when this was one document, so "next visit" and "next
     page" were the same thing. The site is fourteen documents now, so a reader
     who opts in and then presses Next was having their own choice thrown away
     on every navigation: up to eleven discards on a five-case-study path.
     sessionStorage draws the line where the original rule meant to draw it —
     nobody arrives to unexpected sound on a genuinely new visit, and nobody has
     to re-press the chip for moving through one.
     If the context cannot start without a fresh gesture, set() already reverts
     the chip honestly rather than showing ON over silence. */
  try {
    if (sessionStorage.getItem(KEY) === 'on') set(true);
  } catch { /* private mode: the choice simply does not carry, which is fine */ }

  window.SRSound = { play, get enabled() { return on; } };
}
