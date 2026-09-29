import test from 'node:test';
import assert from 'node:assert/strict';
import { createRecordedScore } from './recorded-score.js';
import { createWorkshopAudio } from './audio.js';

const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const response = (ok = true) => ({ ok, status: ok ? 200 : 503, arrayBuffer: async () => new ArrayBuffer(8) });
const parameter = (value = 0) => ({ value, cancelScheduledValues() {}, setValueAtTime(v) { this.value = v; },
  linearRampToValueAtTime(v) { this.value = v; }, exponentialRampToValueAtTime(v) { this.value = v; }, setTargetAtTime(v) { this.value = v; } });
const node = () => ({ gain: parameter(), frequency: parameter(), Q: parameter(), pan: parameter(), delayTime: parameter(),
  threshold: parameter(), knee: parameter(), ratio: parameter(), attack: parameter(), release: parameter(),
  connect(target) { return target; }, disconnect() { this.disconnected = true; } });
function context() {
  const ctx = { state: 'running', currentTime: 0, sampleRate: 44100, destination: node(), sources: [], gains: [],
    async decodeAudioData() { return { duration: 67.3684 }; },
    async resume() { this.state = 'running'; }, async suspend() { this.state = 'suspended'; }, async close() { this.state = 'closed'; },
    createGain() { const n = node(); this.gains.push(n); return n; },
    createDynamicsCompressor: node, createBiquadFilter: node, createStereoPanner: node, createDelay: node,
    createBuffer(channels, size) { return { getChannelData: () => new Float32Array(size) }; },
    createBufferSource() { const voice = { ...node(), start(time, offset) { this.startTime = time; this.offset = offset; },
      stop(time) { if (time === undefined) this.stopped = true; } }; this.sources.push(voice); return voice; },
    createOscillator() { return this.createBufferSource(); },
  }; return ctx;
}

test('loads only on start; one looping voice; mute resumes at the saved position', async t => {
  let fetches = 0;
  t.mock.method(globalThis, 'fetch', async url => { fetches++; assert.match(String(url), /workshop-garage-rock-v1\.mp3$/); return response(); });
  const ctx = context(); const score = createRecordedScore(ctx, node());
  assert.equal(fetches, 0);
  assert.equal(await score.start(), true); await score.start();
  assert.equal(fetches, 1); assert.equal(ctx.sources.length, 1); assert.equal(ctx.sources[0].loop, true);
  ctx.currentTime = 12.5; score.pause(); assert.equal(ctx.sources[0].stopped, true);
  await score.start(); assert.equal(fetches, 1); assert.equal(ctx.sources[1].offset, 12.5);
  // The old voice's asynchronous ended callback cannot orphan the new player.
  ctx.sources[0].onended(); await score.start(); assert.equal(ctx.sources.length, 2);
  score.destroy(); assert.equal(ctx.sources[1].stopped, true);
});

test('muting while the recording loads never starts late audio', async t => {
  const network = deferred(); t.mock.method(globalThis, 'fetch', () => network.promise);
  const ctx = context(); const score = createRecordedScore(ctx, node());
  const start = score.start(); score.pause(); network.resolve(response());
  assert.equal(await start, false); assert.equal(ctx.sources.length, 0);
  assert.equal(await score.start(), true); assert.equal(ctx.sources.length, 1); score.destroy();
});

test('rapid hide/show during loading starts only the latest requested player', async t => {
  const network = deferred(); let fetches = 0;
  t.mock.method(globalThis, 'fetch', () => { fetches++; return network.promise; });
  const ctx = context(); const score = createRecordedScore(ctx, node());
  const old = score.start(); score.pause(); const latest = score.start(); network.resolve(response());
  assert.equal(await old, false); assert.equal(await latest, true);
  assert.equal(ctx.sources.length, 1); assert.equal(fetches, 1); score.destroy();
});

test('failed load can retry and never substitutes another soundtrack', async t => {
  let fetches = 0; t.mock.method(globalThis, 'fetch', async () => response(++fetches > 1));
  const ctx = context(); const score = createRecordedScore(ctx, node());
  await assert.rejects(score.start(), /503/); assert.equal(ctx.sources.length, 0);
  assert.equal(await score.start(), true); assert.equal(fetches, 2); score.destroy();
});

test('destroy aborts loading and prevents late decode or restart', async t => {
  const network = deferred(); let signal;
  t.mock.method(globalThis, 'fetch', (_url, options) => { signal = options.signal; return network.promise; });
  const ctx = context(); const score = createRecordedScore(ctx, node());
  const start = score.start(); score.destroy(); assert.equal(signal.aborted, true);
  network.resolve(response()); assert.equal(await start, false); assert.equal(await score.start(), false);
  assert.equal(ctx.sources.length, 0);
});

test('browser click unlock, film ducking, effects, visibility and teardown remain coordinated', async t => {
  const previousDocument = globalThis.document, previousAudio = globalThis.AudioContext;
  const events = new Map(), order = [], ctx = context();
  globalThis.document = { hidden: false, addEventListener: (k,v) => events.set(k,v), removeEventListener: k => events.delete(k) };
  globalThis.AudioContext = function() { return ctx; };
  ctx.resume = async function() { order.push('resume'); this.state = 'running'; };
  t.mock.method(globalThis, 'fetch', async () => { order.push('fetch'); return response(); });
  try {
    const audio = createWorkshopAudio(); assert.equal(audio.enabled, false); assert.equal(order.length, 0);
    assert.equal(await audio.setEnabled(true), true); assert.deepEqual(order, ['resume', 'fetch']);
    const music = ctx.sources[0]; assert.equal(music.loop, true);
    audio.setDucked(true); assert.equal(ctx.gains[0].gain.value, 0); assert.ok(ctx.gains[1].gain.value > 0);
    audio.cue('select'); assert.ok(ctx.sources.length > 1, 'hologram effects remain available while film owns the music');
    audio.setIntensity(1); assert.equal(ctx.gains[0].gain.value, 0, 'intensity cannot undo film ducking');
    audio.setDucked(false); assert.ok(ctx.gains[0].gain.value > 0);
    ctx.currentTime = 4; document.hidden = true; await events.get('visibilitychange')();
    assert.equal(ctx.state, 'running', 'leaving the page keeps the music playing'); assert.equal(music.stopped, undefined); assert.equal(audio.enabled, true);
    const playing = ctx.sources.length; document.hidden = false; await events.get('visibilitychange')();
    assert.equal(ctx.sources.length, playing, 'returning does not start a second copy');
    document.hidden = true; ctx.state = 'suspended'; await events.get('visibilitychange')();
    document.hidden = false; await events.get('visibilitychange')();
    assert.equal(ctx.state, 'running', 'a browser-suspended context resumes on return'); assert.equal(ctx.sources.at(-1).offset, 4);
    await audio.setEnabled(false); assert.equal(audio.enabled, false); assert.equal(ctx.gains[0].gain.value, 0);
    assert.equal(ctx.gains[1].gain.value, 0.3, 'music off preserves interaction effects'); assert.equal(ctx.sources.at(-1).stopped, true);
    assert.equal(ctx.state, 'running', 'music off does not suspend armed interaction effects');
    audio.destroy(); assert.equal(events.size, 0); assert.equal(ctx.state, 'closed'); assert.equal(await audio.setEnabled(true), false);
  } finally { globalThis.document = previousDocument; globalThis.AudioContext = previousAudio; }
});

test('rock/calm switching stops the previous score and preserves music off and ducking', async t => {
  const previousDocument=globalThis.document, previousAudio=globalThis.AudioContext;
  const ctx=context(), timers=new Set(); let timerId=0;
  globalThis.document={hidden:false,addEventListener(){},removeEventListener(){}};
  globalThis.AudioContext=function(){return ctx;};
  t.mock.method(globalThis,'setInterval',()=>{const id=++timerId;timers.add(id);return id;});
  t.mock.method(globalThis,'clearInterval',id=>timers.delete(id));
  t.mock.method(globalThis,'fetch',async()=>response());
  try {
    const audio=createWorkshopAudio(); await audio.setEnabled(true);
    const rock=ctx.sources[0];
    await audio.setScoreMode('calm');
    assert.equal(audio.scoreMode,'calm'); assert.equal(rock.stopped,true); assert.equal(timers.size,1);
    const calmVoices=ctx.sources.slice(1); assert.ok(calmVoices.length>3);
    audio.setDucked(true); assert.equal(ctx.gains[0].gain.value,0);
    await audio.setScoreMode('rock');
    assert.equal(timers.size,0); assert.ok(calmVoices.every(voice=>voice.stopped));
    assert.equal(ctx.gains[0].gain.value,0,'switching cannot defeat film ducking');
    audio.setDucked(false); await audio.setEnabled(false);
    await audio.setScoreMode('calm'); assert.equal(timers.size,0,'choosing while muted does not autoplay');
    assert.equal(audio.enabled,false); await audio.setEnabled(true); assert.equal(timers.size,1);
    audio.destroy(); assert.equal(timers.size,0); assert.equal(ctx.state,'closed');
  } finally {globalThis.document=previousDocument;globalThis.AudioContext=previousAudio;}
});

test('switching to calm during a slow rock download cannot start late rock audio', async t => {
  const previousDocument=globalThis.document, previousAudio=globalThis.AudioContext;
  const ctx=context(), network=deferred(), timers=new Set();
  globalThis.document={hidden:false,addEventListener(){},removeEventListener(){}};
  globalThis.AudioContext=function(){return ctx;};
  t.mock.method(globalThis,'setInterval',()=>{timers.add(1);return 1;});
  t.mock.method(globalThis,'clearInterval',id=>timers.delete(id));
  t.mock.method(globalThis,'fetch',()=>network.promise);
  try {
    const audio=createWorkshopAudio(); const entering=audio.setEnabled(true);
    await Promise.resolve(); await audio.setScoreMode('calm');
    network.resolve(response()); await entering;
    assert.equal(audio.scoreMode,'calm'); assert.equal(timers.size,1);
    assert.equal(ctx.sources.filter(voice=>voice.loop===true).length,0,'late recording was cancelled');
    await audio.setEnabled(false); assert.equal(timers.size,0); audio.destroy();
  } finally {globalThis.document=previousDocument;globalThis.AudioContext=previousAudio;}
});
test('a slow soundtrack may finish loading in the background without duplicating on return', async t => {
  const previousDocument=globalThis.document, previousAudio=globalThis.AudioContext;
  const ctx=context(), network=deferred(), events=new Map();
  globalThis.document={hidden:false,addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:name=>events.delete(name)};
  globalThis.AudioContext=function(){return ctx;};
  t.mock.method(globalThis,'fetch',()=>network.promise);
  const audio=createWorkshopAudio();
  try {
    const entering=audio.setEnabled(true);
    await Promise.resolve(); document.hidden=true; await events.get('visibilitychange')();
    network.resolve(response()); await entering;
    assert.equal(ctx.sources.length,1); assert.equal(ctx.sources[0].loop,true);
    document.hidden=false; await events.get('visibilitychange')();
    assert.equal(ctx.sources.length,1,'tab return must keep the original player');
    document.hidden=true; await audio.setEnabled(false);
    document.hidden=false; await events.get('visibilitychange')();
    assert.equal(ctx.sources.length,1); assert.equal(ctx.sources[0].stopped,true,'muting still wins over visibility changes');
  } finally {audio.destroy();globalThis.document=previousDocument;globalThis.AudioContext=previousAudio;}
});
