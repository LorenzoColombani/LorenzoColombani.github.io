/** Finite, original synthesis for a website rising from the physical holo table. */
export function scheduleWebsiteProjection({ context, destination, noise, track, time, strength, direction = 0, fold = false }) {
  const voices = [];

  function envelope(node, start, duration, level, attack) {
    node.gain.setValueAtTime(0, start);
    node.gain.linearRampToValueAtTime(level * strength, start + attack);
    node.gain.exponentialRampToValueAtTime(0.0001, start + duration - 0.012);
    node.gain.linearRampToValueAtTime(0, start + duration);
  }

  function finish(source, gain, nodes, start, duration) {
    const pan = context.createStereoPanner();
    pan.pan.setValueAtTime(direction * 0.16, start);
    pan.pan.linearRampToValueAtTime(0, start + duration);
    gain.connect(pan).connect(destination);
    track(source, [...nodes, gain, pan]);
    voices.push({ source, gain });
    source.start(start);
    source.stop(start + duration + 0.01);
  }

  function tone(offset, from, to, duration, level, attack) {
    const source = context.createOscillator();
    const gain = context.createGain();
    const start = time + offset;
    // Pure, gently gliding partials keep the field luminous without a sharp FM zap.
    source.type = 'sine';
    source.frequency.setValueAtTime(from, start);
    source.frequency.exponentialRampToValueAtTime(to, start + duration * 0.82);
    source.connect(gain);
    envelope(gain, start, duration, level, attack);
    finish(source, gain, [], start, duration);
  }

  function air(offset, from, to, duration, level, attack) {
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const start = time + offset;
    source.buffer = noise;
    source.loop = true;
    filter.type = 'bandpass';
    filter.Q.value = 0.55;
    filter.frequency.setValueAtTime(from, start);
    filter.frequency.exponentialRampToValueAtTime(to, start + duration * 0.82);
    source.connect(filter).connect(gain);
    envelope(gain, start, duration, level, attack);
    finish(source, gain, [filter], start, duration);
  }

  if (fold) {
    tone(0, 420, 150, 0.25, 0.104, 0.025);
    air(0.015, 1400, 450, 0.225, 0.06, 0.035);
  } else {
    tone(0, 180, 440, 0.56, 0.15, 0.095);
    tone(0.035, 420, 950, 0.49, 0.056, 0.12);
    air(0, 700, 2300, 0.56, 0.1, 0.18);
    // A soft lock blooms at .535s, alongside the .56s visual settling point.
    tone(0.46, 660, 620, 0.16, 0.07, 0.075);
  }

  // Reversing the projection releases its old voices, including a pending lock.
  // Normal endings and global mute still use the Workshop's central voice cleanup.
  return () => {
    const now = context.currentTime;
    for (const { source, gain } of voices) {
      if (gain.gain.cancelAndHoldAtTime) gain.gain.cancelAndHoldAtTime(now);
      else {
        const current = gain.gain.value;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(current, now);
      }
      gain.gain.setTargetAtTime(0, now, 0.005);
      try { source.stop(now + 0.025); } catch { /* Already ended. */ }
    }
  };
}
