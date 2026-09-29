// The film keeps its own score; this short layer follows the workshop doorway.
export function createPortalAudio({ getMuted = () => false } = {}) {
  const files = ['open', 'crackle', 'through'];
  let slots = [], context = null, filter = null, pan = null;
  let active = false, disposed = false, muted = true, generation = 0, watchdog = null;
  let began = 0, lastUpdate = 0;
  const now = () => performance.now();
  const isMuted = () => muted || Boolean(getMuted());
  const clamp = value => Math.max(0, Math.min(1, value));
  const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
  function parameter(param, value, immediate = false) {
    if (!param || !context) return;
    param.cancelScheduledValues(context.currentTime);
    if (immediate) param.setValueAtTime(value, context.currentTime);
    else param.setTargetAtTime(value, context.currentTime, .035);
  }
  function level(slot, value, immediate = false) {
    slot.level = value;
    slot.media.muted = isMuted() || !slot.played;
    if (slot.gain) parameter(slot.gain.gain, isMuted() ? 0 : value, immediate);
    else slot.media.volume = isMuted() ? 0 : value;
  }
  function initialize() {
    if (slots.length) return;
    slots = files.map(name => {
      const media = new Audio(`./experiences/bridge/assets/audio/sfx-portal-${name}.mp3`);
      media.preload = 'auto'; media.muted = true; media.volume = 0;
      media.loop = name === 'crackle';
      return { media, gain: null, source: null, played: false, request: 0, level: 0 };
    });
    const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContext) return;
    try {
      context = new AudioContext();
      if (globalThis.navigator?.audioSession) {
        try { navigator.audioSession.type = 'playback'; } catch {}
      }
      // GainNodes make these fades work on iOS, where element.volume is ignored.
      slots.forEach(slot => {
        slot.gain = context.createGain(); slot.gain.gain.value = 0;
        slot.source = context.createMediaElementSource(slot.media);
        slot.source.connect(slot.gain); slot.gain.connect(context.destination);
        slot.media.volume = 1;
      });
    } catch {
      // A partially routed element must keep its gain path; untouched ones use HTMLAudio.
      slots.filter(slot => !slot.source).forEach(slot => { slot.gain?.disconnect(); slot.gain = null; });
      if (context && !slots.some(slot => slot.source)) {
        context.close().catch(() => {}); context = null;
        slots.forEach(slot => { slot.gain = null; });
      }
    }
    if (!context || !slots[1].source) return;
    try {
      filter = context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 3800;
      pan = context.createStereoPanner ? context.createStereoPanner() : null;
      filter.connect(pan || context.destination);
      if (pan) pan.connect(context.destination);
      slots[1].gain.disconnect(); slots[1].gain.connect(filter);
    } catch { filter = null; pan = null; }
  }
  function play(slot, warm = false) {
    const request = ++slot.request, epoch = generation;
    if (!warm) { slot.played = true; slot.media.muted = isMuted(); }
    try {
      slot.media.currentTime = 0;
      Promise.resolve(slot.media.play()).then(() => {
        // A late prime must neither resurrect a stopped cue nor stop a newer cue.
        if (slot.request !== request) return;
        if (epoch !== generation || !active || warm) {
          slot.media.pause(); slot.media.currentTime = 0;
        }
      }).catch(() => {});
    } catch {}
  }
  function stop(suspend = true) {
    active = false; generation++;
    clearTimeout(watchdog); watchdog = null;
    for (const slot of slots) {
      slot.media.muted = true;
      if (slot.gain) parameter(slot.gain.gain, 0, true);
      else slot.media.volume = 0;
      slot.media.pause();
      try { slot.media.currentTime = 0; } catch {}
      slot.played = false;
    }
    if (suspend && context && context.state === 'running') context.suspend().catch(() => {});
  }
  function guard() {
    if (!active) return;
    if (document.hidden || now() - lastUpdate > 1500 || now() - began > 30000) { stop(); return; }
    watchdog = setTimeout(guard, 1500);
  }
  function start() {
    if (disposed || document.hidden) return;
    initialize(); stop(false); active = true; muted = Boolean(getMuted());
    began = lastUpdate = now();
    if (context) {
      try {
        Promise.resolve(context.resume()).then(() => {
          if (!active && context.state === 'running') context.suspend().catch(() => {});
        }).catch(() => {});
      } catch {}
    }
    // Touch all media in this trusted gesture; deferred cues start from their own opening.
    slots.forEach((slot, i) => { level(slot, i === 0 ? .48 : 0, true); play(slot, i !== 0); });
    watchdog = setTimeout(guard, 1500);
  }
  function update({ elapsed = 0, progress = 0, phase = 0, filmPlaying = false, reduced = false } = {}) {
    if (!active || disposed) return;
    if (document.hidden || progress >= 1 || elapsed >= 30) { stop(); return; }
    lastUpdate = now();
    const fade = 1 - smooth((progress - .80) / .20);
    const duck = filmPlaying ? .42 : 1;
    const motion = reduced ? 0 : Math.sin(Number.isFinite(phase) ? phase : 0);
    level(slots[0], .48 * fade * duck);
    level(slots[1], (.18 + .025 * motion) * smooth((elapsed - .12) / .16) * fade * duck);
    level(slots[2], .44 * fade * (filmPlaying ? .56 : 1));
    parameter(pan?.pan, motion * .22);
    parameter(filter?.frequency, reduced ? 3500 : 3500 + 1500 * motion);
    if (elapsed >= .12 && !slots[1].played) play(slots[1]);
    if (progress >= .64 && !slots[2].played) play(slots[2]);
  }
  function setMuted(value) {
    muted = Boolean(value);
    if (!active) return;
    slots.forEach(slot => level(slot, slot.level, true));
  }
  const onVisibility = () => { if (document.hidden) stop(); };
  document.addEventListener('visibilitychange', onVisibility);
  function dispose() {
    if (disposed) return;
    stop(); disposed = true;
    document.removeEventListener('visibilitychange', onVisibility);
    for (const slot of slots) {
      slot.source?.disconnect(); slot.gain?.disconnect();
      slot.media.removeAttribute('src'); slot.media.load();
    }
    filter?.disconnect(); pan?.disconnect();
    if (context && context.state !== 'closed') context.close().catch(() => {});
  }
  return { start, update, setMuted, stop, dispose };
}
