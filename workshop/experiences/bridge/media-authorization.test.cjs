/* Actual audio module; simulated per-element browser authorization, not device proof. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, 'assets/js/audio.js'), 'utf8');
const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
function harness(t, delayed = false, headAvailable = false) {
  let trusted = false, bodyParsed = false;
  const domListeners = {}, credit = { textContent: '' };
  const media = [], events = [];
  class Media {
    paused = true; muted = false; volume = 1; currentTime = 0; duration = 270;
    authorized = false; playCount = 0; pending = []; events = {};
    constructor(src) { this.src = src; media.push(this); }
    play() {
      this.playCount++;
      if (trusted) this.authorized = true;
      if (!this.authorized) return Promise.reject(new Error('NotAllowedError: media needs activation'));
      this.paused = false;
      return delayed ? new Promise(resolve => this.pending.push(resolve)) : Promise.resolve();
    }
    pause() { this.paused = true; }
    load() {}
    addEventListener(name, fn) { this.events[name] = fn; }
    removeAttribute(name) { if (name === 'src') this.src = ''; }
  }
  class Node {
    gain = { value: 1 }; threshold = {}; knee = {}; ratio = {}; attack = {}; release = {};
    connect() {}
  }
  class Context {
    state = 'suspended'; destination = new Node(); currentTime = 0;
    createGain() { return new Node(); }
    createDynamicsCompressor() { return new Node(); }
    createMediaElementSource() { return new Node(); }
    resume() { this.state = 'running'; return Promise.resolve(); }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
    close() { this.state = 'closed'; return Promise.resolve(); }
  }
  const ctx = { Audio: Media, AudioContext: Context, Promise, navigator: {},
    location: { protocol: 'https:', search: '' },
    document: { readyState: 'loading', getElementById: id => bodyParsed && id === 'tr-score' ? credit : null,
      addEventListener(name, fn) { (domListeners[name] ||= []).push(fn); }, hidden: false },
    fetch: (url, options) => Promise.resolve({ ok: headAvailable && options?.method === 'HEAD' }), setTimeout, clearTimeout,
    gsap: { killTweensOf() {}, to(target, values) {
      if ('volume' in values) target.volume = values.volume;
      if ('value' in values) target.value = values.value;
      if (values.onComplete) values.onComplete();
    } },
    CustomEvent: function (type, options) { this.type = type; this.detail = options.detail; },
    dispatchEvent: event => events.push(event) };
  ctx.window = ctx; vm.createContext(ctx); vm.runInContext(source, ctx);
  const audio = ctx.FILM.audio;
  t.after(() => audio.dispose());
  return { audio, media, events, credit,
    parseBody() { bodyParsed = true; ctx.document.readyState = 'interactive'; (domListeners.DOMContentLoaded || []).forEach(fn => fn()); },
    gesture(fn) { trusted = true; try { return fn(); } finally { trusted = false; } },
    local: () => media.find(el => el.src.endsWith('score-local.opus')) };
}

test('project click authorizes exactly one stable score element with silent priming', async t => {
  const h = harness(t);
  const arming = h.gesture(() => h.audio.start(false));
  assert.equal(h.media.length, 1);
  assert.ok(h.media.every(el => el.authorized && el.playCount === 1), 'play occurs synchronously inside activation');
  assert.ok(h.media.every(el => el.__lvl.value === 0 && el.currentTime === 0));
  await arming;
  assert.ok(h.media.every(el => el.paused && el.currentTime === 0));
  await h.audio.start(false); // Controller registration after the early boot arm.
  assert.ok(h.media.every(el => el.playCount === 1), 'controller arrival does not re-prime');
  const local = h.local(); local.events.canplaythrough();
  assert.equal(h.media.length, 1);
  await h.audio.resumeAll(); h.audio.music('film', { restart: true }); await settle();
  assert.equal(local.paused, false); assert.equal(local.muted, false);
  assert.equal(h.events.length, 0, 'authorized soundtrack needs no second prompt');
});

test('late prime completion cannot pause or rewind the actual score opening', async t => {
  const h = harness(t, true), arming = h.gesture(() => h.audio.start(false));
  const local = h.local(); local.events.canplaythrough();
  await h.audio.resumeAll(); h.audio.setClock(() => 5);
  h.audio.music('film', { restart: true }); local.currentTime = .4;
  local.pending[0](); await arming;
  assert.equal(local.paused, false); assert.equal(local.currentTime, .4);
  assert.equal(h.audio.scoreOffset(), 5);
  local.pending[1](); await settle(); assert.equal(h.audio.scoreOffset(), 4.6);
  h.audio.pauseAll(); assert.equal(local.paused, true); assert.equal(h.events.length, 0);
});

test('genuine denial remains visible, and a trusted retry preserves paused position', async t => {
  const h = harness(t); await h.audio.start(false);
  const local = h.local(); local.events.canplaythrough();
  await h.audio.resumeAll(); h.audio.music('film'); await settle();
  assert.equal(h.events.at(-1).type, 'bridge-audio-blocked');
  h.audio.pauseAll(); local.currentTime = 17;
  await h.gesture(() => h.audio.start(false));
  assert.equal(local.paused, true); assert.equal(local.currentTime, 17);
  assert.equal(await h.audio.resumeAll(), true);
  assert.equal(local.currentTime, 17); assert.equal(local.paused, false);
});

test('explicit mute and disposal still silence every primed element', async t => {
  const h = harness(t); await h.gesture(() => h.audio.start(true));
  const local = h.local(); local.events.canplaythrough();
  await h.audio.resumeAll(); h.audio.music('film'); await settle();
  assert.equal(local.muted, true); assert.equal(local.__lvl.value, 0);
  const delayed = harness(t, true), arming = delayed.gesture(() => delayed.audio.start(false));
  delayed.audio.dispose(); delayed.media.forEach(el => el.pending[0]()); await arming;
  assert.ok(delayed.media.every(el => el.paused && el.src === ''));
  assert.equal(delayed.events.length, 0);
});


test('score availability found in head updates the credit after body parsing', async t => {
  const h = harness(t, false, true); await settle();
  assert.equal(h.credit.textContent, '');
  h.parseBody();
  assert.match(h.credit.textContent, /MICHAEL GIACCHINO/);
});


test('delayed score readiness stays silent through mute changes and releases from its opening', async t => {
  const h = harness(t); await h.gesture(() => h.audio.start(false));
  const local = h.local();
  let released = false;
  const playing = h.audio.resumeAll().then(value => { released = true; return value; });
  await settle();
  h.audio.setMuted(true); h.audio.setMuted(false);
  h.audio.music('film', { restart: true, delay: .85, xfade: 3 });
  await settle();
  assert.equal(released, false, 'film transport waits for its real soundtrack');
  assert.equal(h.media.length, 1, 'no substitute music element exists');
  assert.equal(local.paused, true); assert.equal(local.__lvl.value, 0); assert.equal(local.currentTime, 0);
  assert.equal(h.audio.playbackState().paused, true);
  local.events.canplaythrough(); assert.equal(await playing, true);
  h.audio.music('film', { restart: true, delay: .85, xfade: 3 }); await settle();
  assert.equal(local.paused, false); assert.equal(local.currentTime, 0);
});

test('a failed sole score reports a load error instead of playing another track', async t => {
  const h = harness(t); await h.gesture(() => h.audio.start(false));
  const playing = h.audio.resumeAll(); h.local().events.error();
  assert.equal(await playing, false);
  assert.equal(h.events.at(-1).type, 'bridge-audio-error');
  assert.equal(h.media.length, 1); assert.equal(h.local().paused, true);
  assert.match(h.audio.playbackState().error, /soundtrack could not load/);
  h.audio.setMuted(false); h.audio.music('film'); await settle();
  assert.equal(h.local().paused, true);
});

test('pause during delayed loading cancels transport release', async t => {
  const h = harness(t); await h.gesture(() => h.audio.start(false));
  const playing = h.audio.resumeAll(); h.audio.pauseAll(); h.local().events.canplaythrough();
  assert.equal(await playing, false); assert.equal(h.local().paused, true);
  assert.equal(h.audio.playbackState().paused, true);
});
