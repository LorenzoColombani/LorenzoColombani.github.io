/* Bounded tests of actual source helpers; browser typography is checked separately. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, 'assets/js/film.js'), 'utf8');
function helper(name, next) {
  return source.slice(source.indexOf('  function ' + name + '('), source.indexOf('  function ' + next + '('));
}
let coarse = false, reading = false, reverts = 0, splits = 0, builds = 0, kills = 0, audioPauses = 0;
let releaseFonts;
const fontReady = new Promise(resolve => { releaseFonts = resolve; });
const statement = { _split: { revert() { reverts++; } }, getBoundingClientRect() {}, textContent: 'Narrative text' };
const ctx = {
  rotMq: { matches: true }, innerWidth: 390, innerHeight: 844,
  matchMedia: q => ({ matches: q.includes('coarse') ? coarse : ctx.innerWidth <= 700 }),
  document: { body: { classList: { contains: () => reading } }, fonts: { load: () => fontReady, ready: fontReady } },
  requestAnimationFrame: callback => callback(),
  getComputedStyle: () => ({ fontStyle: 'normal', fontWeight: '400', fontSize: '27px', fontFamily: 'Garamond' }),
  A: { pauseAll() { audioPauses++; } }, openingLayoutPromise: null, embedDisposed: false,
  embedHasPlayed: false, splitViewport: { width: 390, height: 844 },
  master: { time: () => 0, kill() { kills++; }, pause(t) { assert.equal(t, 0); } },
  P: { reset() {} }, ncardEls: { chapter: [{ querySelector: () => statement }] },
  SplitText: { create() { splits++; return { revert() { reverts++; } }; } },
  chapterLabels: ['old'], seekPoints: ['old'], $$: () => [{ remove() {} }],
  build() { builds++; }
};
vm.createContext(ctx);
vm.runInContext(helper('rotateGated', 'onRotate') + helper('openingLayoutNeeded', 'embedSnapshot'), ctx);
(async () => {
assert.equal(ctx.rotateGated(), true, 'narrow desktop portrait is held');
await ctx.ensureOpeningLayout(); assert.equal(builds, 0, 'portrait never rebuilds for playback');
ctx.rotMq.matches = false; ctx.innerWidth = 844; ctx.innerHeight = 390;
assert.equal(ctx.rotateGated(), false);
const reflow = ctx.ensureOpeningLayout();
assert.equal(builds, 0, 'timeline waits for fonts before rebuilding');
assert.equal(splits, 0, 'SplitText waits for fonts');
assert.equal(audioPauses, 1, 'audio remains held through typography wait');
releaseFonts();
await reflow;
assert.equal(builds, 1); assert.equal(kills, 1); assert.equal(reverts, 1); assert.equal(splits, 1);
assert.equal(ctx.splitViewport.width, 844);
assert.equal(ctx.chapterLabels.length, 0); assert.equal(ctx.seekPoints.length, 0);
await ctx.ensureOpeningLayout(); assert.equal(builds, 1, 'same viewport does not rebuild twice');
ctx.embedHasPlayed = true; ctx.innerWidth = 900;
await ctx.ensureOpeningLayout(); assert.equal(builds, 1, 'no rebuild after first playback');
ctx.embedHasPlayed = false; ctx.master.time = () => 1;
await ctx.ensureOpeningLayout(); assert.equal(builds, 1, 'no rebuild away from zero');
ctx.innerWidth = 900; ctx.rotMq.matches = true;
assert.equal(ctx.rotateGated(), false, 'wide fine-pointer portrait preserves original behavior');
coarse = true; assert.equal(ctx.rotateGated(), true, 'coarse portrait remains held');
reading = true; assert.equal(ctx.rotateGated(), false, 'transcript remains readable');
console.log('Bridge layout: portrait gate, font-wait/audio hold, and zero-frame reflow passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
