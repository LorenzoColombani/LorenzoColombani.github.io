/* Actual copied audio module, simulated media: no claim of browser/device audio proof. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const media = [];
const listeners = {};
class Media {
  constructor(src) { this.src = src; this.paused = true; this.currentTime = 0; this.volume = 1; this.duration = 270; this.events = {}; this.playCount = 0; media.push(this); }
  load() {}
  play() { this.paused = false; this.playCount++; return Promise.resolve(); }
  pause() { this.paused = true; }
  addEventListener(name, fn) { this.events[name] = fn; }
  removeAttribute(name) { if (name === 'src') this.src = ''; }
}
const ctx = {
  Audio: Media, Promise, navigator: {}, location: { protocol: 'https:', search: '' },
  document: { getElementById: () => null, addEventListener: (name, fn) => { listeners[name] = fn; }, hidden: false },
  fetch: () => Promise.resolve({ ok: false }),
  gsap: { killTweensOf() {}, to(target, values) { if ('volume' in values) target.volume = values.volume; if (values.onComplete) values.onComplete(); } },
  setTimeout, clearTimeout, CustomEvent: function (name, options) { this.type = name; this.detail = options.detail; }
};
ctx.window = ctx;
ctx.dispatchEvent = () => {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'assets/js/audio.js'), 'utf8'), ctx);
(async () => {
  const audio = ctx.FILM.audio;
  await audio.start(false);
  assert.equal(media.every(a => a.paused), true, 'arming must not start the score');
  audio.music('film', { restart: true });
  assert.equal(media.every(a => a.paused), true, 'even an early score cue must remain held after arming');
  audio.pauseAll();
  const localScore = media.find(a => a.src.endsWith('score-local.opus'));
  const primedPlays = localScore.playCount;
  localScore.events.canplaythrough();
  assert.equal(localScore.playCount, primedPlays, 'late score readiness must honor a paused transport');
  audio.music('film', { restart: true });
  assert.equal(media.every(a => a.paused), true);
  ctx.document.hidden = false; listeners.visibilitychange();
  assert.equal(media.every(a => a.paused), true, 'visibility alone must not resume sound');
  assert.equal(await audio.resumeAll(), true);
  assert.equal(localScore.paused, false);
  audio.pauseAll();
  await audio.start(false);
  assert.equal(localScore.paused, true, 'rearming unlocks context without starting music');
  audio.dispose();
  assert.equal(media.every(a => a.paused && a.src === ''), true, 'dispose closes the sole score element');
  audio.music('film');
  assert.equal(media.every(a => a.paused), true);
  console.log('Bridge transport: 9 assertions passed (simulated media).');
})().catch(error => { console.error(error); process.exitCode = 1; });
