import { createRecordedScore } from './recorded-score.js?v=garage-rock-1';
import { createCalmScore } from './calm-score.js?v=music-choice-1';
import { scheduleWebsiteProjection } from './website-projection-audio.js?v=table-projection-1';

/** Opt-in GarageBand score and independent procedural hologram effects. */
export function createWorkshopAudio() {
  let context, master, effects, compressor, noise, score;
  let scores = null, scoreMode = 'rock';
  let requested = false;
  let effectsArmed = false;
  let effectsUnlock = null;
  let destroyed = false;
  let intensity = 0.45;
  let ducked = false;
  let generation = 0;
  let stopWebsiteProjection = null;
  const voices = new Set();
  const lastCue = new Map();
  const musicLevel = () => scoreMode === 'calm' ? 0.34 : 0.42 + intensity * 0.12;

  function initialize() {
    const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContext) throw new Error('Web Audio is not supported in this browser.');
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = 0;
    compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 20;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.015;
    compressor.release.value = 0.25;
    master.connect(compressor).connect(context.destination);
    // Gestures stay audible when the score is ducked for external music.
    effects = context.createGain();
    effects.gain.value = 0;
    effects.connect(compressor);
    scores = { rock: createRecordedScore(context, master), calm: createCalmScore(context, master) };
    score = scores[scoreMode];
    scores.calm.setIntensity(intensity);
    noise = context.createBuffer(1, context.sampleRate * 0.25, context.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }

  function track(source, nodes) {
    const voice = { source, nodes };
    voices.add(voice);
    source.onended = () => {
      source.disconnect();
      nodes.forEach(node => node.disconnect());
      voices.delete(voice);
    };
  }

  function air(time, strength, direction, grip = false) {
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    const stereo = context.createStereoPanner();
    const duration = grip ? 0.075 : 0.26 + strength * 0.09;
    source.buffer = noise;
    source.loop = true;
    filter.type = 'bandpass';
    filter.Q.value = grip ? 1.2 : 1.6;
    filter.frequency.setValueAtTime(grip ? 1400 : 650, time);
    filter.frequency.exponentialRampToValueAtTime(grip ? 520 : 2100, time + duration * 0.4);
    filter.frequency.exponentialRampToValueAtTime(450, time + duration);
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime((grip ? 0.09 : 0.12) * strength, time + (grip ? 0.006 : 0.065));
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    stereo.pan.setValueAtTime(-direction * 0.35, time);
    stereo.pan.linearRampToValueAtTime(direction * 0.45, time + duration);
    source.connect(filter).connect(envelope).connect(stereo).connect(effects);
    track(source, [filter, envelope, stereo]);
    source.start(time);
    source.stop(time + duration + 0.01);
  }

  // Inharmonic FM and a closing spectral envelope evoke powered machinery.
  // Finite stereo reflections avoid an accumulating reverb/feedback bed.
  function spectralGlide(time, start, end, duration, strength, direction, depth = 0.6) {
    const carrier = context.createOscillator();
    const modulator = context.createOscillator();
    const modulation = context.createGain();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    const stereo = context.createStereoPanner();
    const reflection = context.createDelay(0.2);
    const reflectionGain = context.createGain();
    const reflectionPan = context.createStereoPanner();
    carrier.type = 'sine';
    modulator.type = 'sine';
    carrier.frequency.setValueAtTime(start, time);
    carrier.frequency.exponentialRampToValueAtTime(end, time + duration * 0.7);
    modulator.frequency.setValueAtTime(start * 1.414, time);
    modulator.frequency.exponentialRampToValueAtTime(end * 1.407, time + duration);
    modulation.gain.setValueAtTime(start * depth, time);
    modulation.gain.exponentialRampToValueAtTime(1, time + duration);
    modulator.connect(modulation).connect(carrier.frequency);
    filter.type = 'lowpass';
    filter.Q.value = 0.6;
    filter.frequency.setValueAtTime(Math.min(3800, start * 5 + 1000), time);
    filter.frequency.exponentialRampToValueAtTime(Math.max(400, end * 2), time + duration);
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(strength * 0.15, time + Math.min(0.035, duration * 0.15));
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    stereo.pan.setValueAtTime(-direction * 0.25, time);
    stereo.pan.linearRampToValueAtTime(direction * 0.4, time + duration);
    reflection.delayTime.value = 0.083;
    reflectionGain.gain.value = 0.19;
    reflectionPan.pan.value = direction ? -direction * 0.55 : -0.35;
    carrier.connect(filter).connect(envelope).connect(stereo).connect(effects);
    envelope.connect(reflection).connect(reflectionGain).connect(reflectionPan).connect(effects);
    track(modulator, [modulation]);
    track(carrier, [filter, envelope, stereo, reflection, reflectionGain, reflectionPan]);
    carrier.start(time);
    modulator.start(time);
    modulator.stop(time + duration);
    carrier.stop(time + duration + 0.12);
  }

  function stopMusic() {
    if (scores) Object.values(scores).forEach(player => player.pause());
    if (!context) return;
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setValueAtTime(0, context.currentTime);
  }

  function stopSound() {
    stopMusic();
    if (!context) return;
    effects.gain.cancelScheduledValues(context.currentTime);
    effects.gain.setValueAtTime(0, context.currentTime);
    lastCue.clear();
    for (const voice of voices) {
      try { voice.source.stop(); } catch { /* Already ended. */ }
      voice.source.disconnect();
      voice.nodes.forEach(node => node.disconnect());
    }
    voices.clear();
    stopWebsiteProjection = null;

  }

  // Called from entry or another trusted gesture. Turning background music off
  // never disables these physical interaction signifiers.
  async function unlockEffects() {
    if (destroyed) return false;
    if (effectsUnlock) return effectsUnlock;
    if (effectsArmed && context?.state === 'running') return true;
    effectsArmed = true;
    try {
      if (!context) initialize();
      effectsUnlock = Promise.resolve(context.resume()).then(() => {
        if (destroyed) return false;
        effects.gain.cancelScheduledValues(context.currentTime);
        effects.gain.setValueAtTime(0.3, context.currentTime);
        return true;
      }).catch(error => {
        effectsArmed = false;
        throw error;
      }).finally(() => { effectsUnlock = null; });
      return effectsUnlock;
    } catch (error) {
      effectsArmed = false;
      throw error;
    }
  }

  async function startSound(token) {
    if (!requested || destroyed) return;
    try {
      await unlockEffects();
      if (token !== generation || !requested || destroyed) return;
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setValueAtTime(0, context.currentTime);
      master.gain.linearRampToValueAtTime(ducked ? 0 : musicLevel(), context.currentTime + 0.25);
      await score.start();
      if (token !== generation || !requested || destroyed) return;
    } catch (error) {
      if (token === generation) {
        requested = false;
        stopMusic();
      }
      throw error;
    }
  }

  // Music keeps playing while the page is in the background. On return, only
  // restart it if the browser itself suspended the context meanwhile.
  async function visibilityChanged() {
    if (document.hidden || (!requested && !effectsArmed) || destroyed || context?.state === 'running') return;
    const token = ++generation;
    stopMusic();
    if (requested) await startSound(token).catch(() => {});
    else await unlockEffects().catch(() => {});
  }
  document.addEventListener('visibilitychange', visibilityChanged);

  return {
    unlockEffects,
    async setEnabled(value) {
      if (destroyed) return false;
      if (Boolean(value) && requested && context?.state === 'running') return true;
      const token = ++generation;
      requested = Boolean(value);
      if (!requested) {
        stopMusic();
        if (!effectsArmed && context && context.state !== 'closed') await context.suspend().catch(() => {});
        return false;
      }
      try {
        if (!context) initialize();
        await startSound(token);
        return requested;
      } catch (error) {
        if (token === generation) requested = false;
        throw error;
      }
    },
    async setScoreMode(value) {
      if (!['rock', 'calm'].includes(value)) throw new RangeError('Unknown Workshop soundtrack.');
      if (destroyed || value === scoreMode) return scoreMode;
      const token = ++generation;
      scoreMode = value;
      // Pause both players immediately, including a recording still loading.
      // Only the current generation may start again after asynchronous work.
      if (scores) {
        Object.values(scores).forEach(player => player.pause());
        score = scores[scoreMode];
        if (requested) await startSound(token);
      }
      return scoreMode;
    },
    get scoreMode() { return scoreMode; },
    cue(kind, options = {}) {
      if (!effectsArmed || destroyed || document.hidden || context?.state !== 'running') return;
      const time = context.currentTime + 0.005;
      if (time - (lastCue.get(kind) ?? -Infinity) < (kind === 'move' ? 0.18 : 0.06)) return;
      const strength = Number.isFinite(options?.strength) ? Math.max(0, Math.min(1, options.strength)) : 0.7;
      const direction = Number.isFinite(options?.direction) ? Math.max(-1, Math.min(1, options.direction)) : 0;
      if (strength === 0) return;
      if (kind === 'website-project' || kind === 'website-fold') {
        lastCue.set(kind, time);
        stopWebsiteProjection?.();
        stopWebsiteProjection = scheduleWebsiteProjection({ context, destination: effects, noise, track, time, strength, direction, fold: kind === 'website-fold' });
        return;
      }
      if (kind === 'move') {
        lastCue.set(kind, time);
        air(time, strength, direction);
        spectralGlide(time, 170, 310, 0.3, strength * 0.36, direction, 0.85);
        return;
      }
      // Each event has a physical contour rather than a pitched notification.
      const profiles = {
        select: [480, 330, 0.16, 0.46, 0.65], // Focus aperture settles.
        grab: [190, 430, 0.22, 0.8, 1.1],   // Field engages and catches.
        dock: [370, 105, 0.32, 0.85, 0.9],  // Magnetic pull into a solid seat.
        deploy: [115, 620, 0.48, 0.8, 1.25], // Powered expansion unfolds.
        release: [420, 140, 0.28, 0.55, 0.7],
        close: [320, 95, 0.26, 0.55, 0.7],
      };
      const profile = profiles[kind];
      if (!profile) return;
      lastCue.set(kind, time);
      const [start, end, duration, level, depth] = profile;
      spectralGlide(time, start, end, duration, strength * level, direction, depth);
      air(time, strength * (kind === 'deploy' ? 0.6 : 0.3), direction, kind !== 'deploy');
      if (kind === 'dock' || kind === 'grab') {
        spectralGlide(time + (kind === 'dock' ? 0.075 : 0.012), 96, 58, 0.13, strength * 0.45, 0, 0.15);
      } else if (kind === 'deploy') {
        spectralGlide(time + 0.065, 235, 840, 0.43, strength * 0.28, -direction, 0.45);
      }
    },
    setDucked(value) {
      ducked = Boolean(value);
      if (context && master && requested && context.state === 'running') { master.gain.cancelScheduledValues(context.currentTime); master.gain.setTargetAtTime(ducked ? 0 : musicLevel(), context.currentTime, 0.12); }
    },
    setIntensity(value) {
      if (!Number.isFinite(value)) return;
      intensity = Math.max(0, Math.min(1, value));
      scores?.calm.setIntensity(intensity);
      if (requested && !ducked && context?.state === 'running') {
        master.gain.setTargetAtTime(musicLevel(), context.currentTime, 0.6);
      }
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      requested = false;
      effectsArmed = false;
      generation++;
      document.removeEventListener('visibilitychange', visibilityChanged);
      stopSound();
      if (scores) Object.values(scores).forEach(player => player.destroy());
      if (context && context.state !== 'closed') context.close().catch(() => {});
    },
    get enabled() { return requested && !destroyed; },
  };
}
