/** Original, finite reactor and mechanical-door sounds. No media or music dependencies. */
export function createVaultAudio({
  AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext,
  document = globalThis.document,
} = {}) {
  let context, output, noise, unlocking;
  let armed = false, disposed = false;
  let lastPhase = '', lastTime = -Infinity;
  const voices = new Set();

  function disconnect(node) {
    try { node.disconnect(); } catch { /* May already be disconnected. */ }
  }

  function initialize() {
    try {
      context = new AudioContext();
      output = context.createGain();
      output.gain.value = 0.5;
      output.connect(context.destination);
      // The longest source fits in this buffer; even the air layers never loop.
      noise = context.createBuffer(1, Math.ceil(context.sampleRate * 1.5), context.sampleRate);
      const samples = noise.getChannelData(0);
      let seed = 0x39e83c, softened = 0;
      for (let i = 0; i < samples.length; i++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        softened = softened * 0.65 + ((seed / 4294967296) * 2 - 1) * 0.35;
        samples[i] = softened;
      }
    } catch (error) {
      if (output) disconnect(output);
      try { Promise.resolve(context?.close()).catch(() => {}); } catch { /* Failed construction. */ }
      context = output = noise = null;
      throw error;
    }
  }

  function unlock() {
    if (disposed || !AudioContext || document?.hidden) return Promise.resolve(false);
    if (unlocking) return unlocking;
    // Called only by the loader's user-gesture handler, never by a phase or timer.
    unlocking = (async () => {
      try {
        if (!context) initialize();
        if (context.state !== 'running') await context.resume();
        if (disposed || document?.hidden || context.state !== 'running') return false;
        armed = true;
        return true;
      } catch {
        armed = false;
        return false;
      }
    })().finally(() => { unlocking = null; });
    return unlocking;
  }

  function clean(voice) {
    clearTimeout(voice.timer);
    voice.source.onended = null;
    voice.nodes.forEach(disconnect);
    voices.delete(voice);
  }

  function silence(voice, immediate = false) {
    if (immediate) {
      try { voice.source.stop(); } catch { /* A finite voice may already have ended. */ }
      clean(voice);
      return;
    }
    const now = context.currentTime;
    const gain = voice.gain.gain;
    if (gain.cancelAndHoldAtTime) gain.cancelAndHoldAtTime(now);
    else {
      gain.cancelScheduledValues(now);
      // Short fades are preferable to discontinuous cancellation on older WebKit.
      gain.setValueAtTime(Math.min(voice.peak, Math.max(0, gain.value)), now);
    }
    gain.linearRampToValueAtTime(0, now + 0.035);
    try { voice.source.stop(now + 0.04); } catch { /* Already ended. */ }
    voice.releasing = true;
    clearTimeout(voice.timer);
    voice.timer = setTimeout(() => clean(voice), 100);
  }

  function stop() {
    // At most one fading group survives a phase change, even under repeated taps.
    for (const voice of [...voices]) silence(voice, voice.releasing);
    lastPhase = '';
    lastTime = -Infinity;
  }

  function voice({ offset = 0, from, to, duration, peak, attack = 0.025, type = 'sine', air = false }) {
    const start = context.currentTime + 0.008 + offset;
    const source = air ? context.createBufferSource() : context.createOscillator();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    if (air) {
      source.buffer = noise;
      source.loop = false;
      filter.type = 'bandpass';
      filter.Q.value = 0.6;
      filter.frequency.setValueAtTime(from, start);
      filter.frequency.exponentialRampToValueAtTime(to, start + duration * 0.84);
    } else {
      source.type = type;
      source.frequency.setValueAtTime(from, start);
      source.frequency.exponentialRampToValueAtTime(to, start + duration * 0.84);
      filter.type = 'lowpass';
      filter.Q.value = 0.5;
      filter.frequency.setValueAtTime(type === 'triangle' ? 1600 : 2400, start);
    }
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(peak, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration - 0.012);
    gain.gain.linearRampToValueAtTime(0, start + duration);
    source.connect(filter).connect(gain).connect(output);
    const entry = { source, gain, peak, nodes: [source, filter, gain], releasing: false };
    voices.add(entry);
    source.onended = () => clean(entry);
    source.start(start);
    source.stop(start + duration + 0.008);
    // Browser suspension must not leave nodes or cleanup callbacks held forever.
    entry.timer = setTimeout(() => clean(entry), (offset + duration) * 1000 + 180);
  }

  function play(phase) {
    if (!armed || disposed || document?.hidden || context?.state !== 'running') return false;
    if (!['charge', 'unlock', 'open'].includes(phase)) return false;
    const now = context.currentTime;
    if (phase === lastPhase && now - lastTime < 0.12) return false;
    stop();
    lastPhase = phase;
    lastTime = now;
    try {
      if (phase === 'charge') {
        // A stable low rotor plus rising partials: energy gathers, without a zap.
        voice({ from: 76, to: 116, duration: 0.64, peak: 0.14, attack: 0.07 });
        voice({ from: 214, to: 468, duration: 0.61, peak: 0.075, attack: 0.16, type: 'triangle' });
        voice({ offset: 0.03, from: 432, to: 704, duration: 0.58, peak: 0.035, attack: 0.18 });
        voice({ from: 380, to: 1560, duration: 0.64, peak: 0.09, attack: 0.18, air: true });
      } else if (phase === 'unlock') {
        // Three pawls release in sequence; paired body and air keep the impacts tactile.
        [0, 0.19, 0.38].forEach((offset, index) => {
          voice({ offset, from: 158 - index * 12, to: 58, duration: 0.16, peak: 0.074, attack: 0.006 });
          voice({ offset, from: 2600 - index * 260, to: 620, duration: 0.085, peak: 0.035, attack: 0.003, air: true });
        });
        voice({ offset: 0.40, from: 540, to: 348, duration: 0.30, peak: 0.045, attack: 0.04 });
      } else {
        // A heavier servo eases down while the pressure seal releases and settles.
        voice({ from: 166, to: 62, duration: 1.22, peak: 0.13, attack: 0.12, type: 'triangle' });
        voice({ from: 342, to: 126, duration: 1.12, peak: 0.045, attack: 0.16 });
        voice({ from: 1280, to: 260, duration: 1.26, peak: 0.12, attack: 0.13, air: true });
        voice({ offset: 0.88, from: 88, to: 42, duration: 0.34, peak: 0.08, attack: 0.022 });
      }
      return true;
    } catch {
      for (const entry of [...voices]) silence(entry, true);
      return false;
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    armed = false;
    for (const entry of [...voices]) silence(entry, true);
    if (output) disconnect(output);
    if (context) {
      try { Promise.resolve(context.close()).catch(() => {}); } catch { /* Unsupported/closed. */ }
    }
    noise = null;
  }

  return { unlock, play, stop, dispose, get enabled() { return armed && !disposed && context?.state === 'running'; } };
}
