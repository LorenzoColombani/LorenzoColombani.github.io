/* Actual embed helpers with simulated transport: presentation must not restart it. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, 'assets/js/film.js'), 'utf8');
const classes = new Set(['portal-preview']);
let clock = 0, audioResumes = 0, timelinePlays = 0, chromeShows = 0;
const ctx = {
  document: { hidden: false, documentElement: { classList: {
    add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name)
  } } },
  embedDisposed: false, embedPrepared: true, embedHasPlayed: false,
  armPromise: Promise.resolve(), playGeneration: 0, state: 'paused',
  rotateGated: () => false, openingLayoutNeeded: () => false,
  A: { resumeAll() { audioResumes++; return Promise.resolve(true); }, muted: () => false },
  master: { play() { timelinePlays++; }, time: () => clock },
  embedSnapshot: () => ({ currentTime: clock, preview: classes.has('portal-preview'), state: ctx.state }),
  pokeChrome() { chromeShows++; }, setState(state) { ctx.state = state; }, onRotate() {},
  $: () => ({ hidden: false })
};
vm.createContext(ctx);
vm.runInContext(source.slice(source.indexOf('  function embedPresent() {'), source.indexOf('  function embedPause() {')), ctx);
(async () => {
  const preview = await ctx.embedRequestPlay({ preview: true });
  assert.equal(preview.preview, true);
  assert.equal(preview.state, 'playing');
  assert.equal(audioResumes, 1); assert.equal(timelinePlays, 1);
  clock = 3.2;
  const beforePresent = { audioResumes, timelinePlays, chromeShows };
  const presented = ctx.embedPresent();
  assert.equal(presented.preview, false); assert.equal(presented.currentTime, 3.2);
  assert.equal(audioResumes, beforePresent.audioResumes, 'present must not resume/restart score');
  assert.equal(timelinePlays, beforePresent.timelinePlays, 'present must not play or seek timeline');
  assert.equal(chromeShows, beforePresent.chromeShows + 1, 'present reveals native chrome');
  await ctx.embedRequestPlay({ preview: true });
  await ctx.embedPlay(); // Internal rotation/reflow resumption preserves host presentation.
  assert.equal(classes.has('portal-preview'), true);
  await ctx.embedRequestPlay();
  assert.equal(classes.has('portal-preview'), false, 'default public play retains normal reveal behavior');

  // The early API must retain options across readiness and forward present separately.
  let forwarded, presentCalls = 0, pauses = 0;
  const bootListeners = {}, notices = [];
  const boot = { Promise, Error, Object, document: ctx.document, location: { origin: 'http://localhost' },
    setTimeout() { return 1; }, clearTimeout() {}, addEventListener(name, fn) { bootListeners[name] = fn; } };
  boot.window = boot; boot.parent = { postMessage: message => notices.push(message) };
  vm.createContext(boot);
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'embed-boot.js'), 'utf8'), boot);
  const pending = boot.__WORKSHOP_BRIDGE.play({ preview: true });
  boot.__WORKSHOP_BRIDGE_BOOT.register({
    play(options) { forwarded = options; }, present() { presentCalls++; }, pause() { pauses++; }, snapshot() { return {}; }
  });
  await pending; assert.equal(forwarded.preview, true);
  boot.__WORKSHOP_BRIDGE.present(); assert.equal(presentCalls, 1);
  bootListeners['bridge-audio-error']();
  assert.equal(pauses, 1, 'a broken soundtrack stops the film');
  assert.match(notices.at(-1).message, /soundtrack could not load/);
  assert.equal(notices.at(-1).type, 'error', 'loading failure reaches host retry UI');
  await assert.rejects(boot.__WORKSHOP_BRIDGE.arm(false), /soundtrack could not load/);
  console.log('Bridge preview: running preview, transport-free presentation, internal resume and API forwarding passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
