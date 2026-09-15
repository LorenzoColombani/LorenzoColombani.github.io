/** Original, opt-in procedural score. No samples, network requests, or autoplay. */
export function createWorkshopAudio() {
  let context, master, effects, compressor, delay, feedback, wet, noise;
  let requested = false;
  let destroyed = false;
  let intensity = 0.45;
  let ducked = false;
  let timer = null;
  let generation = 0;
  let step = 0;
  let nextTime = 0;
  const voices = new Set();
  const lastCue = new Map();
  const beat = 60 / 104;
  const chords = [[38, 45, 50, 57, 64], [34, 41, 46, 53, 60], [41, 48, 53, 60, 67], [36, 43, 48, 55, 62]];
  const motif = [2, null, 4, 3, null, 2, 1, null, 3, null, 4, 2, 1, null, 3, null];
  const frequency = note => 440 * Math.pow(2, (note - 69) / 12);

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
    delay = context.createDelay(1);
    delay.delayTime.value = beat * 0.75;
    feedback = context.createGain();
    feedback.gain.value = 0.24;
    wet = context.createGain();
    wet.gain.value = 0.16;
    delay.connect(feedback).connect(delay);
    delay.connect(wet).connect(master);
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

  function tone(note, time, duration, level, type = 'triangle', pan = 0, attack = 0.01, cutoff = 2300, echo = false, output = master) {
    const oscillator = context.createOscillator();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    const stereo = context.createStereoPanner();
    oscillator.type = type;
    oscillator.frequency.value = frequency(note);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, time);
    filter.frequency.exponentialRampToValueAtTime(Math.max(160, cutoff * 0.35), time + duration);
    stereo.pan.value = pan;
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(level, time + attack);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    oscillator.connect(filter).connect(envelope).connect(stereo).connect(output);
    if (echo) stereo.connect(delay);
    track(oscillator, [filter, envelope, stereo]);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.02);
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

  function percussion(time, kick) {
    const envelope = context.createGain();
    const source = kick ? context.createOscillator() : context.createBufferSource();
    const filter = context.createBiquadFilter();
    if (kick) {
      source.frequency.setValueAtTime(110, time);
      source.frequency.exponentialRampToValueAtTime(43, time + 0.13);
      filter.type = 'lowpass';
      filter.frequency.value = 220;
    } else {
      source.buffer = noise;
      filter.type = 'highpass';
      filter.frequency.value = 6200;
    }
    const duration = kick ? 0.22 : 0.045;
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(kick ? 0.24 : 0.025 + intensity * 0.018, time + 0.003);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter).connect(envelope).connect(master);
    track(source, [filter, envelope]);
    source.start(time);
    source.stop(time + duration + 0.01);
  }

  function schedule() {
    if (!requested || destroyed || document.hidden || context.state !== 'running') return;
    while (nextTime < context.currentTime + 0.16) {
      const position = step % 16;
      const chord = chords[Math.floor(step / 16) % chords.length];
      if (position === 0) {
        chord.slice(1, 4).forEach((note, index) => {
          tone(note + 12, nextTime, beat * 7.5, 0.04, 'sine', (index - 1) * 0.55, 0.4, 1400);
        });
      }
      if ([0, 6, 8, 14].includes(position)) {
        tone(chord[0] + (position === 14 ? 12 : 0), nextTime, beat * 0.8, 0.23, 'triangle', 0, 0.008, 650);
      }
      if (motif[position] !== null) {
        tone(chord[motif[position]] + 12, nextTime, beat * 0.85, 0.09 + intensity * 0.025,
          'triangle', position % 3 === 0 ? -0.3 : 0.3, 0.008, 2400 + intensity * 1700, true);
      }
      if (position % 4 === 0 || (intensity > 0.7 && position === 11)) percussion(nextTime, true);
      if (position % 2 === 0 || intensity > 0.65) percussion(nextTime, false);
      nextTime += beat / 2;
      step++;
    }
  }

  function stopSound() {
    clearInterval(timer);
    timer = null;
    if (!context) return;
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setValueAtTime(0, context.currentTime);
    effects.gain.cancelScheduledValues(context.currentTime);
    effects.gain.setValueAtTime(0, context.currentTime);
    lastCue.clear();
    for (const voice of voices) {
      try { voice.source.stop(); } catch { /* Already ended. */ }
      voice.source.disconnect();
      voice.nodes.forEach(node => node.disconnect());
    }
    voices.clear();
    // Clear the echo loop so old notes cannot return after resuming.
    delay.disconnect();
    feedback.disconnect();
    delay = context.createDelay(1);
    delay.delayTime.value = beat * 0.75;
  }

  async function startSound(token) {
    if (!context || document.hidden || !requested || destroyed) return;
    try {
      await context.resume();
      if (token !== generation || !requested || destroyed || document.hidden) return;
      delay.disconnect();
      feedback.disconnect();
      delay.connect(feedback).connect(delay);
      delay.connect(wet);
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setValueAtTime(0, context.currentTime);
      master.gain.linearRampToValueAtTime(ducked ? 0 : 0.34, context.currentTime + 0.25);
      effects.gain.cancelScheduledValues(context.currentTime);
      effects.gain.setValueAtTime(0.3, context.currentTime);
      step = 0;
      nextTime = context.currentTime + 0.035;
      clearInterval(timer);
      schedule();
      timer = setInterval(schedule, 75);
    } catch (error) {
      if (token === generation) {
        requested = false;
        stopSound();
      }
      throw error;
    }
  }

  async function visibilityChanged() {
    const token = ++generation;
    if (document.hidden) {
      stopSound();
      if (context && context.state !== 'closed') await context.suspend().catch(() => {});
    } else if (requested && !destroyed) {
      await startSound(token).catch(() => {});
    }
  }
  document.addEventListener('visibilitychange', visibilityChanged);

  return {
    async setEnabled(value) {
      if (destroyed) return false;
      if (Boolean(value) && requested && timer !== null && context?.state === 'running') return true;
      const token = ++generation;
      requested = Boolean(value);
      if (!requested) {
        stopSound();
        if (context && context.state !== 'closed') await context.suspend().catch(() => {});
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
    cue(kind, options = {}) {
      if (!requested || destroyed || document.hidden || context?.state !== 'running') return;
      const time = context.currentTime + 0.005;
      if (time - (lastCue.get(kind) ?? -Infinity) < (kind === 'move' ? 0.18 : 0.06)) return;
      const strength = Number.isFinite(options?.strength) ? Math.max(0, Math.min(1, options.strength)) : 0.7;
      const direction = Number.isFinite(options?.direction) ? Math.max(-1, Math.min(1, options.direction)) : 0;
      if (strength === 0) return;
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
      if (context && master && requested && context.state === 'running') { master.gain.cancelScheduledValues(context.currentTime); master.gain.setTargetAtTime(ducked ? 0 : 0.34, context.currentTime, 0.12); }
    },
    setIntensity(value) {
      if (Number.isFinite(value)) intensity = Math.max(0, Math.min(1, value));
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      requested = false;
      generation++;
      document.removeEventListener('visibilitychange', visibilityChanged);
      stopSound();
      if (context && context.state !== 'closed') context.close().catch(() => {});
    },
    get enabled() { return requested && !destroyed; },
  };
}
