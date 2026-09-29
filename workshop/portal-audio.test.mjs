import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('./portal-audio.js', import.meta.url), 'utf8');
const { createPortalAudio } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

function harness(t, webAudio = true) {
  const media = [], contexts = [], timers = new Map(), listeners = new Map();
  let time = 0, timerId = 0, muted = false;
  class Param {
    value = 0;
    cancelScheduledValues() {}
    setValueAtTime(value) { this.value = value; }
    setTargetAtTime(value) { this.value = value; }
  }
  class Node {
    gain = new Param(); frequency = new Param(); pan = new Param(); connections = [];
    connect(next) { this.connections.push(next); return next; }
    disconnect() { this.connections = []; }
  }
  class Context {
    state = 'suspended'; currentTime = 0; destination = new Node(); gains = [];
    constructor() { contexts.push(this); }
    createGain() { const node = new Node(); this.gains.push(node); return node; }
    createMediaElementSource() { return new Node(); }
    createBiquadFilter() { return this.filter = new Node(); }
    createStereoPanner() { return this.pan = new Node(); }
    resume() { this.state = 'running'; return Promise.resolve(); }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
    close() { this.state = 'closed'; return Promise.resolve(); }
  }
  class Media {
    paused = true; muted = false; volume = 1; currentTime = 0; plays = 0; pending = [];
    constructor(src) { this.src = src; media.push(this); }
    play() { this.plays++; this.paused = false; return new Promise(resolve => this.pending.push(resolve)); }
    pause() { this.paused = true; }
    load() {}
    removeAttribute(name) { if (name === 'src') this.src = ''; }
  }
  const document = { hidden: false,
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: name => listeners.delete(name) };
  const replacements = { Audio: Media, AudioContext: webAudio ? Context : undefined,
    webkitAudioContext: undefined, document, performance: { now: () => time },
    setTimeout: fn => { const id = ++timerId; timers.set(id, fn); return id; },
    clearTimeout: id => timers.delete(id) };
  const restore = [];
  for (const [name, value] of Object.entries(replacements)) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
    restore.push(() => { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; });
  }
  const api = createPortalAudio({ getMuted: () => muted });
  t.after(() => { api.dispose(); restore.forEach(reset => reset()); });
  return { api, media, contexts, timers, listeners,
    mute(value) { muted = value; },
    resolve() { media.forEach(item => item.pending.splice(0).forEach(resolve => resolve())); },
    hide(value) { document.hidden = value; listeners.get('visibilitychange')?.(); },
    advance(ms) { time += ms; },
    runTimers() { const work = [...timers.values()]; timers.clear(); work.forEach(fn => fn()); } };
}

test('portal recordings follow ignition, spin, rush and a film-aware gain fade', async t => {
  const h = harness(t); h.api.start();
  assert.equal(h.media.length, 3); assert.deepEqual(h.media.map(m => m.plays), [1, 1, 1]);
  assert.deepEqual(h.media.map(m => m.muted), [false, true, true], 'silent primes cannot leak on iOS');
  h.resolve(); await settle();
  assert.deepEqual(h.media.map(m => m.paused), [false, true, true]);
  h.api.update({ elapsed: .3, progress: .2, phase: Math.PI / 2 });
  assert.equal(h.media[1].plays, 2); assert.equal(h.media[1].loop, true);
  const ctx = h.contexts[0], opening = ctx.gains[0].gain.value;
  assert.equal(ctx.pan.pan.value, .22); assert.equal(ctx.filter.frequency.value, 5000);
  h.api.update({ elapsed: 1, progress: .4, phase: Math.PI / 2, filmPlaying: true });
  assert.ok(ctx.gains[0].gain.value < opening);
  h.api.update({ elapsed: 2, progress: .64, filmPlaying: true });
  assert.equal(h.media[2].plays, 2);
  const rush = ctx.gains[2].gain.value;
  h.api.update({ elapsed: 3, progress: .9, filmPlaying: true, reduced: true });
  assert.ok(ctx.gains[2].gain.value < rush); assert.equal(ctx.pan.pan.value, 0);
  h.api.update({ elapsed: 4, progress: 1 });
  assert.ok(h.media.every(m => m.paused && m.muted)); assert.equal(ctx.state, 'suspended');
});

test('late warm promises cannot revive cancellation or pause a newer crossing cue', async t => {
  const h = harness(t); h.api.start(); h.api.stop();
  assert.ok(h.media.every(m => m.paused));
  h.api.start(); h.api.update({ elapsed: .3, progress: .2 });
  h.resolve(); await settle();
  assert.equal(h.media[0].paused, false); assert.equal(h.media[1].paused, false);
  assert.equal(h.media[2].paused, true);
  h.api.update({ elapsed: 2, progress: .7 }); h.api.stop(); h.resolve(); await settle();
  assert.ok(h.media.every(m => m.paused && m.muted));
  h.api.dispose(); h.api.start();
  assert.equal(h.media.length, 3); assert.ok(h.media.every(m => m.src === ''));
  assert.equal(h.listeners.size, 0); assert.equal(h.contexts[0].state, 'closed');
});

test('HTMLAudio fallback respects entry mute and explicit mute changes', async t => {
  const h = harness(t, false); h.mute(true); h.api.start(); h.resolve(); await settle();
  h.api.update({ elapsed: .3, progress: .2 });
  assert.ok(h.media.every(m => m.muted));
  h.mute(false); h.api.setMuted(false);
  assert.equal(h.media[1].muted, false); assert.ok(h.media[1].volume > 0);
  h.api.setMuted(true); h.api.update({ elapsed: 1, progress: .3 });
  assert.ok(h.media.every(m => m.muted), 'explicit mute survives subsequent animation updates');
  h.api.stop(); assert.ok(h.media.every(m => m.paused));
});

test('hidden tabs and abandoned update loops stop without automatic resurrection', async t => {
  const h = harness(t); h.api.start(); h.resolve(); await settle();
  h.api.update({ elapsed: .3, progress: .2 }); h.hide(true);
  assert.ok(h.media.every(m => m.paused));
  const plays = h.media.map(m => m.plays); h.hide(false); h.api.update({ elapsed: 1, progress: .7 });
  assert.deepEqual(h.media.map(m => m.plays), plays);
  h.api.start(); h.advance(1600); h.runTimers();
  assert.ok(h.media.every(m => m.paused)); assert.equal(h.timers.size, 0);
  h.api.start(); h.advance(30001); h.api.update({ elapsed: .4, progress: .28 }); h.runTimers();
  assert.ok(h.media.every(m => m.paused)); assert.equal(h.timers.size, 0);
});
