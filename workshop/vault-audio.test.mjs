import test from 'node:test';
import assert from 'node:assert/strict';
import { createVaultAudio } from './vault-audio.js';

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function events(target = {}) {
  const listeners = new Map();
  return Object.assign(target, {
    addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
    emit(type) { for (const fn of listeners.get(type) || []) fn(); },
    listenerCount(type) { return listeners.get(type)?.size || 0; },
  });
}

function harness(t, options = {}) {
  const nodes = [], sources = [], contexts = [], fetches = [], controllers = [], order = [];
  const document = events({ hidden: false });
  const recording = { duration: 2.27265 }, compressed = new ArrayBuffer(12);
  class Parameter {
    value = 0; events = [];
    setValueAtTime(value, time) { this.value = value; this.events.push(['set', value, time]); }
    linearRampToValueAtTime(value, time) { this.events.push(['linear', value, time]); }
    cancelAndHoldAtTime(time) { this.events.push(['hold', this.value, time]); }
    cancelScheduledValues(time) { this.events.push(['cancel', this.value, time]); }
  }
  function node(kind) {
    const result = {
      kind, connections: [], disconnected: false,
      connect(next) { this.connections.push(next); return next; },
      disconnect() { this.disconnected = true; },
      gain: new Parameter(),
    };
    nodes.push(result);
    return result;
  }
  class Context {
    state = 'suspended'; currentTime = 10; destination = node('destination'); resumes = 0; decodes = 0; closes = 0;
    constructor() { contexts.push(this); events(this); order.push('context'); }
    createGain() { if (options.initializeFails) throw new Error('Audio allocation failed'); return node('gain'); }
    createBufferSource() {
      const result = Object.assign(node('buffer'), {
        stops: [], start(time) { this.startTime = time; }, stop(time) { this.stops.push(time); },
      });
      sources.push(result);
      return result;
    }
    async decodeAudioData(data) {
      this.decodes++; order.push('decode');
      assert.equal(data, compressed);
      if (options.decodeWait) await options.decodeWait;
      if (options.decodeFails) throw new Error('Invalid recording');
      return recording;
    }
    async resume() {
      this.resumes++; order.push('resume');
      if (options.resumeWait) await options.resumeWait;
      if (options.resumeFails || this.state === 'closed') throw new Error('Gesture required');
      this.state = 'running';
    }
    async close() { this.closes++; this.state = 'closed'; }
  }
  class Controller {
    signal = { aborted: false };
    constructor() { controllers.push(this); }
    abort() { this.signal.aborted = true; }
  }
  const fetch = async (url, init) => {
    order.push('fetch'); fetches.push({ url, ...init });
    if (options.fetchWait) await options.fetchWait;
    if (options.fetchFails) throw new Error('Offline');
    return { ok: !options.httpFails, async arrayBuffer() {
      order.push('body');
      if (options.bodyWait) await options.bodyWait;
      if (options.bodyFails) throw new Error('Truncated download');
      return compressed;
    } };
  };
  const audio = createVaultAudio({ AudioContext: options.unsupported ? null : Context, fetch, AbortController: Controller, document });
  t.after(() => { audio.dispose(); for (const source of sources) source.onended?.(); });
  return { audio, nodes, sources, contexts, document, fetches, controllers, recording, order, get context() { return contexts[0]; } };
}

test('construction prefetches compressed media without creating a context or sound', async t => {
  const h = harness(t);
  assert.equal(h.fetches.length, 1);
  assert.ok(h.fetches[0].url.pathname.endsWith('/workshop/media/vault-door-open-v1.mp3'));
  assert.equal(h.fetches[0].signal, h.controllers[0].signal);
  assert.equal(h.audio.enabled, false);
  for (const phase of ['charge', 'unlock', 'open']) assert.equal(h.audio.play(phase), false);
  h.audio.stop();
  await Promise.resolve();
  assert.equal(h.contexts.length, 0);
  assert.equal(h.sources.length, 0);
});

test('unlock creates and resumes in the gesture before a slow fetch, then decodes only once', async t => {
  const download = deferred(), h = harness(t, { fetchWait: download.promise });
  const first = h.audio.unlock(), second = h.audio.unlock();
  assert.equal(first, second);
  assert.deepEqual(h.order, ['fetch', 'context', 'resume']);
  assert.equal(h.context.resumes, 1);
  assert.equal(h.audio.enabled, false);
  download.resolve();
  assert.equal(await first, true);
  assert.equal(h.audio.enabled, true);
  assert.equal(h.sources.length, 0, 'arming is silent');
  assert.equal(await h.audio.unlock(), true);
  assert.equal(h.context.decodes, 1);
  assert.equal(h.fetches.length, 1);
});

test('unlock plays the full approved recording once and open continues without restarting', async t => {
  const h = harness(t);
  await h.audio.unlock();
  assert.equal(h.audio.play('charge'), false, 'the loader has no charge phase or synthesized fallback');
  assert.equal(h.audio.play('open'), false, 'open cannot start the recording');
  assert.equal(h.audio.play('unlock'), true);
  const source = h.sources[0], master = source.connections[0];
  assert.equal(source.buffer, h.recording);
  assert.equal(source.loop, false);
  assert.equal(source.startTime, 10, 'no artificial delay chops the end at loader disposal');
  assert.deepEqual(source.stops, [12.23], 'ignore MP3 encoder padding beyond the approved 2.23 seconds');
  assert.equal(master.gain.value, 1, 'preserve the approved recording volume');
  assert.deepEqual(master.gain.events, [], 'no new envelope reshapes the recording');
  for (let i = 0; i < 30; i++) {
    h.context.currentTime += 0.02;
    assert.equal(h.audio.play('unlock'), false);
    assert.equal(h.audio.play('open'), true);
  }
  assert.equal(h.sources.length, 1);
  assert.deepEqual(source.stops, [12.23]);
  source.onended();
  assert.equal(source.disconnected, true);
  assert.equal(source.onended, null);
  assert.equal(h.audio.play('unlock'), false, 'a completed reveal cannot replay');
  assert.equal(h.audio.play('open'), false);
});

test('stop and skip fade briefly, then dispose releases nodes and listeners exactly once', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const h = harness(t);
  await h.audio.unlock(); h.audio.play('unlock');
  const source = h.sources[0], master = source.connections[0], context = h.context;
  context.currentTime = 10.68;
  h.audio.stop(); h.audio.stop();
  assert.equal(h.audio.enabled, false);
  assert.deepEqual(master.gain.events.at(-1).slice(0, 2), ['linear', 0]);
  assert.ok(Math.abs(master.gain.events.at(-1)[2] - 10.715) < 1e-9);
  assert.ok(Math.abs(source.stops.at(-1) - 10.72) < 1e-9);
  assert.equal(h.audio.play('open'), false);
  h.audio.dispose(); h.audio.dispose();
  assert.equal(h.controllers[0].signal.aborted, true);
  assert.equal(h.document.listenerCount('visibilitychange'), 0);
  assert.equal(context.listenerCount('statechange'), 0);
  t.mock.timers.tick(100);
  assert.equal(source.disconnected, true);
  assert.equal(master.disconnected, true);
  assert.equal(context.state, 'closed');
  assert.equal(context.closes, 1);
  assert.equal(await h.audio.unlock(), false);
});

test('a suspended context drops its source, and a missing statechange still has a finite cleanup deadline', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const h = harness(t);
  await h.audio.unlock(); h.audio.play('unlock');
  h.context.state = 'suspended'; h.context.emit('statechange');
  assert.equal(h.audio.enabled, false);
  assert.equal(h.sources[0].disconnected, true);
  assert.equal(h.audio.play('open'), false);
  assert.equal(h.context.resumes, 1, 'play never resumes a browser context');
  const fallback = harness(t);
  await fallback.audio.unlock(); fallback.audio.play('unlock');
  fallback.context.state = 'suspended';
  t.mock.timers.tick(2410);
  assert.equal(fallback.sources[0].disconnected, true);
  assert.equal(fallback.sources[0].onended, null);
  assert.equal(fallback.sources[0].stops.at(-1), undefined, 'cleanup stops stale playback before disconnecting');
});

test('hiding stops playback and invalidates unlock even if the page returns before loading finishes', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const h = harness(t);
  await h.audio.unlock(); h.audio.play('unlock');
  h.document.hidden = true; h.document.emit('visibilitychange');
  assert.equal(h.audio.enabled, false);
  assert.equal(await h.audio.unlock(), false);
  t.mock.timers.tick(100);
  assert.equal(h.sources[0].disconnected, true);
  const download = deferred(), pending = harness(t, { fetchWait: download.promise });
  const unlocked = pending.audio.unlock();
  pending.document.hidden = true; pending.document.emit('visibilitychange');
  pending.document.hidden = false; download.resolve();
  assert.equal(await unlocked, false);
  assert.equal(pending.audio.enabled, false);
  assert.equal(pending.audio.play('unlock'), false);
});

test('disposal during fetch, response body, decode or resume discards every late result', async t => {
  for (const stage of ['fetchWait', 'bodyWait', 'decodeWait', 'resumeWait']) {
    const wait = deferred(), h = harness(t, { [stage]: wait.promise });
    const unlocked = h.audio.unlock();
    // Allow the response body or decode to begin before disposal.
    for (let i = 0; i < 6; i++) await Promise.resolve();
    h.audio.dispose(); h.audio.dispose();
    assert.equal(h.controllers[0].signal.aborted, true);
    wait.resolve();
    assert.equal(await unlocked, false, stage);
    assert.equal(h.context.state, 'closed', stage);
    assert.equal(h.context.closes, 1, stage);
    assert.equal(h.audio.enabled, false, stage);
    assert.equal(h.audio.play('unlock'), false, stage);
    assert.equal(h.sources.length, 0, stage);
  }
});

test('unavailable audio and fetch, body, HTTP, decode or resume failures settle silently', async t => {
  for (const failure of ['unsupported', 'fetchFails', 'httpFails', 'bodyFails', 'decodeFails', 'resumeFails', 'initializeFails']) {
    const h = harness(t, { [failure]: true });
    assert.equal(await h.audio.unlock(), false, failure);
    assert.equal(h.audio.enabled, false, failure);
    assert.equal(h.audio.play('unlock'), false, failure);
    assert.equal(h.sources.length, 0, failure);
    h.audio.stop(); h.audio.dispose();
    if (h.context) assert.equal(h.context.state, 'closed', failure);
  }
});
