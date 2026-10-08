// The approved recording ends here; MP3 decoder padding may extend its buffer.
const RECORDING_SECONDS = 2.23;

/** One finite door recording, independent of the Workshop's music controls. */
export function createVaultAudio({
  AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext,
  fetch = globalThis.fetch,
  AbortController = globalThis.AbortController,
  document = globalThis.document,
} = {}) {
  let context, output, buffer, decoding, unlocking, request, active;
  let armed = false, disposed = false, played = false, generation = 0;
  // Fetching compressed bytes is silent and does not require a gesture.
  let bytes = (async () => {
    try {
      request = AbortController ? new AbortController() : null;
      const response = await fetch(new URL('./media/vault-door-open-v1.mp3', import.meta.url), { signal: request?.signal });
      if (!response.ok || disposed) return null;
      const data = await response.arrayBuffer();
      return disposed ? null : data;
    } catch { return null; }
  })();

  function disconnect(node) {
    try { node?.disconnect(); } catch { /* Already disconnected. */ }
  }

  function closeContext() {
    const closing = context;
    context = null;
    disconnect(output);
    output = null;
    try { Promise.resolve(closing?.close()).catch(() => {}); } catch { /* Unsupported/closed. */ }
  }

  function onStateChange() {
    if (context?.state !== 'running') stop();
  }

  function initialize() {
    try {
      context = new AudioContext();
      output = context.createGain();
      output.gain.value = 1;
      output.connect(context.destination);
      context.addEventListener?.('statechange', onStateChange);
    } catch (error) {
      closeContext();
      throw error;
    }
  }

  function loadBuffer() {
    if (!decoding) {
      const decoder = context;
      decoding = (async () => {
        const data = await bytes;
        bytes = null;
        if (!data || disposed) return false;
        const decoded = await decoder.decodeAudioData(data);
        if (disposed) return false;
        buffer = decoded;
        return true;
      })().catch(() => false);
    }
    return decoding;
  }

  function unlock() {
    if (disposed || !AudioContext || document?.hidden) return Promise.resolve(false);
    if (unlocking) return unlocking;
    const token = generation;
    try {
      // Keep creation AND resume in the trusted click, before awaiting the fetch.
      if (!context) initialize();
      const resumed = context.state === 'running' ? Promise.resolve() : context.resume();
      unlocking = Promise.all([resumed, loadBuffer()]).then(([, loaded]) => {
        if (!loaded || disposed || token !== generation || document?.hidden || context?.state !== 'running') return false;
        armed = true;
        return true;
      }).catch(() => false).finally(() => { unlocking = null; });
      return unlocking;
    } catch {
      armed = false;
      return Promise.resolve(false);
    }
  }

  function clean(voice, halt = false) {
    clearTimeout(voice.timer);
    voice.source.onended = null;
    if (halt) {
      try { voice.source.stop(); } catch { /* Already ended. */ }
    }
    disconnect(voice.source);
    if (active === voice) active = null;
    if (disposed) closeContext();
  }

  function release(voice) {
    if (context?.state !== 'running') { clean(voice, true); return; }
    if (voice.releasing) return;
    voice.releasing = true;
    try {
      const now = context.currentTime, gain = output.gain;
      if (gain.cancelAndHoldAtTime) gain.cancelAndHoldAtTime(now);
      else { gain.cancelScheduledValues(now); gain.setValueAtTime(gain.value, now); }
      gain.linearRampToValueAtTime(0, now + 0.035);
      voice.source.stop(Math.min(voice.end, now + 0.04));
      clearTimeout(voice.timer);
      voice.timer = setTimeout(() => clean(voice, true), 100);
    } catch { clean(voice, true); }
  }

  function stop() {
    generation++;
    armed = false;
    if (active) release(active);
  }

  function onVisibilityChange() {
    if (document?.hidden) stop();
  }
  document?.addEventListener?.('visibilitychange', onVisibilityChange);

  function play(phase) {
    if (!armed || disposed || document?.hidden || context?.state !== 'running') return false;
    // "open" continues the same recording; the former "charge" cue is unused.
    if (phase === 'open') return Boolean(active && !active.releasing);
    if (phase !== 'unlock' || played) return false;
    try {
      const source = context.createBufferSource(), start = context.currentTime;
      active = { source, end: start + RECORDING_SECONDS, releasing: false };
      const voice = active;
      source.buffer = buffer;
      source.loop = false;
      source.connect(output);
      source.onended = () => clean(voice);
      source.start(start);
      played = true;
      source.stop(voice.end);
      // A suspended browser must not replay a stale source when it returns.
      voice.timer = setTimeout(() => clean(voice, true), RECORDING_SECONDS * 1000 + 180);
      return true;
    } catch {
      if (active) clean(active, true);
      return false;
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    armed = false;
    generation++;
    try { request?.abort(); } catch { /* Optional cancellation support. */ }
    bytes = buffer = null;
    document?.removeEventListener?.('visibilitychange', onVisibilityChange);
    context?.removeEventListener?.('statechange', onStateChange);
    if (active) release(active);
    else closeContext();
  }

  return { unlock, play, stop, dispose, get enabled() { return armed && !disposed && !document?.hidden && context?.state === 'running'; } };
}
