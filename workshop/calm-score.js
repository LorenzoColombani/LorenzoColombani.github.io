/** The original quiet Workshop score, isolated from gesture effects. */
export function createCalmScore(context, master) {
  let running = false, destroyed = false, timer = null, step = 0, nextTime = 0;
  let intensity = .45, delay, feedback, wet;
  const voices = new Set();
  const noise = context.createBuffer(1, context.sampleRate * .25, context.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const beat = 60 / 104;
  const chords = [[38, 45, 50, 57, 64], [34, 41, 46, 53, 60], [41, 48, 53, 60, 67], [36, 43, 48, 55, 62]];
  const motif = [2, null, 4, 3, null, 2, 1, null, 3, null, 4, 2, 1, null, 3, null];
  const frequency = note => 440 * Math.pow(2, (note - 69) / 12);

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
    if (!running || destroyed || context.state !== 'running') return;
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


  function pause() {
    running = false;
    clearInterval(timer);
    timer = null;
    for (const voice of voices) {
      try { voice.source.stop(); } catch { /* Already finished. */ }
      voice.source.disconnect();
      voice.nodes.forEach(node => node.disconnect());
    }
    voices.clear();
    delay?.disconnect(); feedback?.disconnect(); wet?.disconnect();
  }
  return {
    start() {
      if (destroyed || context.state !== 'running') return false;
      if (running) return true;
      running = true;
      delay = context.createDelay(1); delay.delayTime.value = beat * .75;
      feedback = context.createGain(); feedback.gain.value = .24;
      wet = context.createGain(); wet.gain.value = .16;
      delay.connect(feedback).connect(delay); delay.connect(wet).connect(master);
      step = 0; nextTime = context.currentTime + .035;
      schedule(); timer = setInterval(schedule, 75);
      return true;
    },
    pause,
    setIntensity(value) { if (Number.isFinite(value)) intensity = Math.max(0, Math.min(1, value)); },
    destroy() { destroyed = true; pause(); },
  };
}
