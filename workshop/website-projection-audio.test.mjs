import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkshopAudio } from './audio.js';

function harness(t, { resumeWait } = {}) {
  const nodes = [], sources = [], contexts = [];
  class Parameter {
    value = 0; events = [];
    setValueAtTime(value, time) { this.value = value; this.events.push(['set', value, time]); }
    linearRampToValueAtTime(value, time) { this.value = value; this.events.push(['linear', value, time]); }
    exponentialRampToValueAtTime(value, time) { this.value = value; this.events.push(['exponential', value, time]); }
    setTargetAtTime(value, time, constant) { this.value = value; this.events.push(['target', value, time, constant]); }
    cancelScheduledValues(time) { this.events.push(['cancel', time]); }
  }
  function node(kind) {
    const result = { kind, connections: [], disconnected: false,
      connect(next) { this.connections.push(next); return next; },
      disconnect() { this.disconnected = true; },
    };
    for (const name of ['gain', 'frequency', 'Q', 'pan', 'delayTime', 'threshold', 'knee', 'ratio', 'attack', 'release']) result[name] = new Parameter();
    nodes.push(result); return result;
  }
  function source(kind) {
    const result = Object.assign(node(kind), {
      stops: [], start(time) { this.startTime = time; }, stop(time) { this.stops.push(time); },
    });
    sources.push(result); return result;
  }
  class Context {
    state = 'suspended'; currentTime = 1; sampleRate = 1000; destination = node('destination');
    constructor() { contexts.push(this); }
    createGain() { return node('gain'); }
    createDynamicsCompressor() { return node('compressor'); }
    createBiquadFilter() { return node('filter'); }
    createStereoPanner() { return node('pan'); }
    createDelay() { return node('delay'); }
    createBuffer(_channels, size) { return { getChannelData: () => new Float32Array(size) }; }
    createBufferSource() { return source('buffer'); }
    createOscillator() { return source('oscillator'); }
    async decodeAudioData() { return { duration: 60 }; }
    async resume() { if (resumeWait) await resumeWait; this.state = 'running'; }
    async suspend() { this.suspends = (this.suspends || 0) + 1; this.state = 'suspended'; }
    async close() { this.state = 'closed'; }
  }
  const previousDocument = globalThis.document, previousContext = globalThis.AudioContext;
  globalThis.document = { hidden: false, addEventListener() {}, removeEventListener() {} };
  globalThis.AudioContext = Context;
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }));
  const audio = createWorkshopAudio();
  t.after(() => { audio.destroy(); globalThis.document = previousDocument; globalThis.AudioContext = previousContext; });
  return { audio, nodes, sources, contexts, get context() { return contexts[0]; } };
}

test('projection rises and locks with bounded gain, a finite tail, shared effects routing and complete cleanup', async t => {
  const h = harness(t);
  await h.audio.setEnabled(true);
  const firstNode = h.nodes.length, firstSource = h.sources.length;
  h.audio.cue('website-project', { strength: 1 });
  const cueNodes = h.nodes.slice(firstNode), cueSources = h.sources.slice(firstSource);
  const envelopes = cueNodes.filter(node => node.kind === 'gain');
  const began = h.context.currentTime + 0.005;
  assert.equal(cueSources.length, 4, 'field, upper partial, air and settling lock are finite voices');
  assert.ok(cueSources.every(source => Number.isFinite(source.stops[0]) && source.stops[0] > source.startTime));
  const duration = Math.max(...cueSources.map(source => source.stops[0])) - began;
  assert.ok(duration >= 0.56 && duration <= 0.65, 'the tail ends just after the visual expansion');
  const lock = envelopes.find(node => node.gain.events[0][2] > began + 0.4);
  const lockPeak = lock.gain.events.find(event => event[0] === 'linear' && event[1] > 0);
  assert.ok(lockPeak[2] - began > 0.50 && lockPeak[2] - began < 0.56, 'lock blooms as the display settles');
  for (const envelope of envelopes) {
    assert.equal(envelope.gain.events[0][1], 0);
    assert.deepEqual(envelope.gain.events.at(-1).slice(0, 2), ['linear', 0], 'each voice ends at exact silence');
  }
  const peakSum = envelopes.reduce((sum, node) => sum + Math.max(...node.gain.events.filter(event => event[0] === 'linear').map(event => event[1])), 0);
  assert.ok(peakSum <= 0.4, 'even all voice peaks together stay below .4 before the effects volume');
  const effectBuses = new Set(envelopes.map(node => node.connections[0].connections[0]));
  assert.equal(effectBuses.size, 1);
  const effects = [...effectBuses][0];
  assert.equal(effects.gain.value, 0.3);
  assert.equal(effects.connections[0].kind, 'compressor');
  assert.ok(peakSum * effects.gain.value <= 0.12);
  cueSources.forEach(source => source.onended());
  assert.ok(cueNodes.every(node => node.disconnected), 'every source, envelope, filter and panner disconnects');
  await h.audio.setEnabled(false);
  assert.ok(cueSources.every(source => source.stops.length === 1), 'ended voices were removed from the central registry');
});

test('folding releases the previous field and pending lock, then finishes within the closing animation', async t => {
  const h = harness(t); await h.audio.setEnabled(true);
  const start = h.sources.length;
  h.audio.cue('website-project');
  const projecting = h.sources.slice(start);
  h.context.currentTime += 0.12;
  const firstFoldSource = h.sources.length;
  h.audio.cue('website-fold');
  assert.ok(projecting.every(source => Math.abs(source.stops.at(-1) - (h.context.currentTime + 0.025)) < 1e-9));
  const fold = h.sources.slice(firstFoldSource);
  assert.equal(fold.length, 2);
  assert.ok(fold.every(source => source.stops[0] - h.context.currentTime <= 0.266));
  h.audio.destroy();
  assert.ok([...projecting, ...fold].every(source => source.stops.at(-1) === undefined && source.disconnected));
});

test('projection cues cannot unlock audio, run while hidden or restart after disposal', async t => {
  const h = harness(t);
  h.audio.cue('website-project'); h.audio.cue('website-fold');
  assert.equal(h.contexts.length, 0, 'a cue alone cannot create or resume an AudioContext');
  await h.audio.setEnabled(true);
  const initial = h.sources.length;
  h.audio.cue('website-project', { strength: 0 });
  document.hidden = true; h.audio.cue('website-project');
  document.hidden = false; h.context.state = 'suspended'; h.audio.cue('website-fold');
  assert.equal(h.sources.length, initial);
  h.context.state = 'running'; h.audio.cue('website-project', { strength: 999 });
  const playing = h.sources.length;
  h.audio.cue('website-project');
  assert.equal(h.sources.length, playing, 'the existing rapid-repeat gate also covers projection cues');
  await h.audio.setEnabled(false);
  h.context.currentTime += 1; h.audio.cue('website-fold');
  assert.equal(h.sources.length, playing + 2, 'music off keeps the gesture sound active');
  h.audio.destroy(); h.audio.cue('website-project');
  assert.equal(h.sources.length, playing + 2); assert.equal(h.context.state, 'closed');
});

test('a trusted effects unlock allows projection with music off without starting or loading a score', async t => {
  const h = harness(t);
  let fetches = 0;
  t.mock.method(globalThis, 'fetch', async () => { fetches++; throw new Error('No score should load.'); });
  assert.equal(await h.audio.unlockEffects(), true);
  assert.equal(h.audio.enabled, false);
  assert.equal(fetches, 0);
  assert.equal(h.sources.length, 0, 'unlock alone creates no sounding voices');
  const master = h.nodes.find(node => node.kind === 'gain');
  assert.equal(master.gain.value, 0);
  h.audio.cue('website-project');
  assert.equal(h.sources.length, 4);
  await h.audio.setEnabled(false);
  assert.equal(master.gain.value, 0);
  assert.equal(h.context.state, 'running');
  assert.ok(h.sources.every(source => source.stops.at(-1) !== undefined), 'music off leaves finite effects alone');
  h.audio.destroy();
  assert.ok(h.sources.every(source => source.disconnected));
});

test('turning music off during an in-flight gesture unlock cannot suspend or cancel effects', async t => {
  let resume;
  const h = harness(t, { resumeWait: new Promise(resolve => { resume = resolve; }) });
  const firstUnlock = h.audio.unlockEffects(), secondUnlock = h.audio.unlockEffects();
  await h.audio.setEnabled(false);
  assert.equal(h.context.suspends, undefined);
  resume(); await Promise.all([firstUnlock, secondUnlock]);
  assert.equal(h.audio.enabled, false);
  assert.equal(h.context.state, 'running');
  assert.equal(h.sources.length, 0);
  h.audio.cue('website-project');
  assert.equal(h.sources.length, 4);
});

test('a score download failure does not disable already-unlocked projection effects', async t => {
  const h = harness(t);
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Offline'); });
  await assert.rejects(h.audio.setEnabled(true), /Offline/);
  assert.equal(h.audio.enabled, false);
  assert.equal(h.context.state, 'running');
  h.audio.cue('website-project');
  assert.equal(h.sources.length, 4);
});
