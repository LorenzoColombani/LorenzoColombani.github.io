/** Recorded in GarageBand. One decoded loop, no overlapping music players. */
export function createRecordedScore(context, destination) {
  let buffer = null;
  let loading = null;
  let source = null;
  let offset = 0;
  let startedAt = 0;
  let generation = 0;
  let destroyed = false;
  const abort = new AbortController();

  function prepare() {
    if (buffer) return Promise.resolve(buffer);
    if (!loading) {
      loading = fetch(new URL('./media/workshop-garage-rock-v1.mp3', import.meta.url), { signal: abort.signal })
        .then(response => {
          if (!response.ok) throw new Error(`Workshop score could not load (${response.status}).`);
          return response.arrayBuffer();
        })
        .then(bytes => context.decodeAudioData(bytes))
        .then(decoded => {
          if (!Number.isFinite(decoded.duration) || decoded.duration <= 0) throw new Error('Workshop score is empty.');
          if (!destroyed) buffer = decoded;
          return decoded;
        })
        .catch(error => { loading = null; throw error; });
    }
    return loading;
  }

  return {
    async start() {
      if (destroyed) return false;
      if (source) return true;
      const token = ++generation;
      const decoded = await prepare();
      // Loading must never undo a mute, page hide, or teardown that happened
      // while the file was in flight. AudioContext is unlocked by the caller's
      // original click, before this asynchronous work.
      if (destroyed || token !== generation || context.state !== 'running') return false;
      const voice = context.createBufferSource();
      voice.buffer = decoded;
      voice.loop = true;
      voice.connect(destination);
      source = voice;
      startedAt = context.currentTime;
      voice.onended = () => { voice.disconnect(); if (source === voice) source = null; };
      try { voice.start(startedAt, offset % decoded.duration); }
      catch (error) { source = null; voice.disconnect(); throw error; }
      return true;
    },
    pause() {
      generation++;
      if (!source) return;
      const voice = source;
      source = null;
      offset = (offset + Math.max(0, context.currentTime - startedAt)) % buffer.duration;
      try { voice.stop(); } catch { /* Already ended. */ }
      voice.disconnect();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      this.pause();
      abort.abort();
      buffer = null;
      loading = null;
    },
  };
}
