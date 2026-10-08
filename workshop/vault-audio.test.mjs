import test from 'node:test';
import assert from 'node:assert/strict';
import { createVaultAudio } from './vault-audio.js';

function harness(t, { resumeWait, resumeFails = false, initializeFails = false } = {}) {
  const nodes = [], sources = [], contexts = [];
  const document = { hidden: false };
  class Parameter {
    value = 0; events = [];
    setValueAtTime(value, time) { this.value = value; this.events.push(['set', value, time]); }
    linearRampToValueAtTime(value, time) { this.value = value; this.events.push(['linear', value, time]); }
    exponentialRampToValueAtTime(value, time) { this.value = value; this.events.push(['exponential', value, time]); }
    cancelAndHoldAtTime(time) { this.events.push(['hold', this.value, time]); }
    cancelScheduledValues(time) { this.events.push(['cancel', this.value, time]); }
  }
  function node(kind) {
    const result = {
      kind, connections: [], disconnected: false,
      connect(next) { this.connections.push(next); return next; },
      disconnect() { this.disconnected = true; },
    };
    for (const name of ['gain', 'frequency', 'Q']) result[name] = new Parameter();
    nodes.push(result);
    return result;
  }
  function source(kind) {
    const result = Object.assign(node(kind), {
      stops: [], start(time) { this.startTime = time; }, stop(time) { this.stops.push(time); },
    });
    sources.push(result);
    return result;
  }
  class Context {
    state = 'suspended'; currentTime = 10; sampleRate = 1000; destination = node('destination'); resumes = 0;
    constructor() { contexts.push(this); }
    createGain() { if (initializeFails) throw new Error('Audio allocation failed'); return node('gain'); }
    createBiquadFilter() { return node('filter'); }
    createOscillator() { return source('oscillator'); }
    createBufferSource() { return source('buffer'); }
    createBuffer(_channels, size) {
      const samples = new Float32Array(size);
      return { duration: size / this.sampleRate, getChannelData: () => samples };
    }
    async resume() {
      this.resumes++;
      if (resumeWait) await resumeWait;
      if (resumeFails || this.state === 'closed') throw new Error('Gesture required');
      this.state = 'running';
    }
    async close() { this.state = 'closed'; }
  }
  const audio = createVaultAudio({ AudioContext: Context, document });
  t.after(() => audio.dispose());
  return { audio, nodes, sources, contexts, document, get context() { return contexts[0]; } };
}

test('loading is silent until an explicit unlock; no cue can create or resume an audio context', async t => {
  const h = harness(t);
  assert.equal(h.audio.enabled, false);
  for (const phase of ['charge', 'unlock', 'open']) assert.equal(h.audio.play(phase), false);
  h.audio.stop();
  assert.equal(h.contexts.length, 0);
  assert.equal(await h.audio.unlock(), true);
  assert.equal(h.audio.enabled, true);
  assert.equal(h.sources.length, 0, 'arming sound is itself silent');
  h.context.state = 'suspended';
  assert.equal(h.audio.play('open'), false);
  assert.equal(h.context.resumes, 1, 'a cue cannot bypass autoplay after suspension');
  h.context.state = 'running';
  h.document.hidden = true;
  assert.equal(h.audio.play('open'), false);
  assert.equal(h.sources.length, 0);
});

test('reactor, lock and servo have bounded envelopes and finish within the vault reveal', async t => {
  const h = harness(t);
  await h.audio.unlock();
  for (const phase of ['charge', 'unlock', 'open']) {
    const first = h.sources.length;
    assert.equal(h.audio.play(phase), true);
    const voices = h.sources.slice(first);
    assert.ok(voices.length >= 2 && voices.length <= 8, 'a small layered cue instead of an unbounded sound graph');
    let peaks = 0;
    for (const source of voices) {
      const gain = source.connections[0].connections[0];
      const events = gain.gain.events;
      assert.deepEqual(events[0].slice(0, 2), ['set', 0]);
      assert.deepEqual(events.at(-1).slice(0, 2), ['linear', 0]);
      assert.ok(events.every(event => Number.isFinite(event[1]) && Number.isFinite(event[2])));
      peaks += Math.max(...events.map(event => event[1]));
      assert.ok(source.stops[0] > source.startTime);
      const latestAllowed = phase === 'open' ? 1.30 : 0.75;
      assert.ok(source.stops[0] - h.context.currentTime < latestAllowed);
      if (source.kind === 'buffer') {
        assert.equal(source.loop, false);
        assert.ok(source.buffer.duration > source.stops[0] - source.startTime);
        assert.ok([...source.buffer.getChannelData(0)].every(value => Math.abs(value) <= 1));
      }
    }
    assert.ok(peaks * h.nodes.find(node => node.kind === 'gain').gain.value <= 0.22, 'conservative peak bound before any device volume');
    voices.forEach(source => source.onended());
    assert.ok(voices.every(source => source.disconnected));
    h.context.currentTime += 1;
  }
});

test('repeated taps and phase transitions cannot accumulate voices, and stop fades every active source', async t => {
  const h = harness(t);
  await h.audio.unlock();
  h.audio.play('charge');
  const originalCount = h.sources.length;
  assert.equal(h.audio.play('charge'), false);
  assert.equal(h.sources.length, originalCount);
  for (let i = 0; i < 60; i++) {
    h.context.currentTime += 0.002;
    h.audio.play(['charge', 'unlock', 'open'][i % 3]);
    assert.ok(h.sources.filter(source => !source.disconnected).length <= 15, 'only current cue plus a short fading predecessor can survive');
  }
  const sounding = h.sources.filter(source => !source.disconnected);
  h.audio.stop();
  assert.ok(sounding.every(source => source.disconnected || source.stops.at(-1) <= h.context.currentTime + 0.041));
  h.audio.dispose();
  assert.ok(h.nodes.filter(node => node.kind !== 'destination').every(node => node.disconnected));
  assert.equal(h.context.state, 'closed');
});

test('a suspended browser still releases all finite nodes through the cleanup deadline', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const h = harness(t);
  await h.audio.unlock();
  h.audio.play('open');
  h.context.state = 'suspended';
  t.mock.timers.tick(1700);
  assert.ok(h.sources.every(source => source.disconnected && source.onended === null));
  assert.ok(h.nodes.filter(node => ['filter', 'oscillator', 'buffer'].includes(node.kind)).every(node => node.disconnected));
});

test('simultaneous unlocks share one request, and disposal during resume cannot resurrect sound', async t => {
  let resume;
  const h = harness(t, { resumeWait: new Promise(resolve => { resume = resolve; }) });
  const first = h.audio.unlock(), second = h.audio.unlock();
  assert.equal(first, second);
  assert.equal(h.contexts.length, 1);
  assert.equal(h.context.resumes, 1);
  h.audio.dispose();
  resume();
  assert.deepEqual(await Promise.all([first, second]), [false, false]);
  assert.equal(await h.audio.unlock(), false);
  assert.equal(h.audio.play('open'), false);
  assert.equal(h.audio.enabled, false);
  assert.equal(h.sources.length, 0);
});

test('unavailable, rejected or partially initialized audio fails silently without affecting the loader', async t => {
  const unsupported = createVaultAudio({ AudioContext: null });
  assert.equal(await unsupported.unlock(), false);
  assert.equal(unsupported.play('charge'), false);
  unsupported.stop(); unsupported.dispose();
  const rejected = harness(t, { resumeFails: true });
  assert.equal(await rejected.audio.unlock(), false);
  assert.equal(rejected.audio.play('open'), false);
  assert.equal(rejected.sources.length, 0);
  const failed = harness(t, { initializeFails: true });
  assert.equal(await failed.audio.unlock(), false);
  assert.equal(failed.context.state, 'closed');
  assert.equal(failed.audio.enabled, false);
  assert.equal(await failed.audio.unlock(), false, 'a second explicit gesture fails safely too');
  assert.equal(failed.contexts.length, 2, 'failed initialization does not retain a half-built context');
});
