import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from './vendor/three.module.min.js';

// Keep browser import maps out of the test runner; execute the actual host,
// portal and vendored Three implementation with only browser services mocked.
const moduleURL = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const threeURL = new URL('./vendor/three.module.min.js', import.meta.url).href;
const portalSource = (await readFile(new URL('./bridge-portal.js', import.meta.url), 'utf8'))
  .replace("from 'three'", `from '${threeURL}'`);
const audioSource = await readFile(new URL('./portal-audio.js', import.meta.url), 'utf8');
const hostSource = (await readFile(new URL('./bridge-experience.js', import.meta.url), 'utf8'))
  .replace("from 'three'", `from '${threeURL}'`)
  .replace(/from '\.\/bridge-portal\.js(?:\?[^']*)?'/, `from '${moduleURL(portalSource)}'`)
  .replace(/from '\.\/portal-audio\.js(?:\?[^']*)?'/, `from '${moduleURL(audioSource)}'`);
const { createBridgeExperience } = await import(moduleURL(hostSource));

class Target {
  listeners = new Map();
  addEventListener(type, fn, options = {}) {
    const listeners = this.listeners.get(type) || [];
    listeners.push({ fn, once: options.once });
    this.listeners.set(type, listeners);
  }
  removeEventListener(type, fn) {
    this.listeners.set(type, (this.listeners.get(type) || []).filter(item => item.fn !== fn));
  }
  emit(type, props = {}) {
    const event = { type, preventDefault() {}, ...props };
    for (const item of [...(this.listeners.get(type) || [])]) {
      if (item.once) this.removeEventListener(type, item.fn);
      item.fn(event);
    }
  }
  get listenerCount() { return [...this.listeners.values()].reduce((sum, items) => sum + items.length, 0); }
}

class Element extends Target {
  constructor(tag, document) {
    super();
    Object.assign(this, { tag, document, children: [], parent: null, style: {}, dataset: {}, attributes: new Map(), hidden: false });
    const classes = new Set();
    this.classList = { add: (...values) => values.forEach(value => classes.add(value)),
      remove: (...values) => values.forEach(value => classes.delete(value)), contains: value => classes.has(value) };
    if (tag === 'iframe') this.contentWindow = {};
  }
  append(...items) { for (const item of items) { item.parent = this; this.children.push(item); } }
  prepend(item) { item.parent = this; this.children.unshift(item); }
  remove() {
    if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1);
    this.parent = null;
  }
  setAttribute(name, value) { this.attributes.set(name, value); }
  removeAttribute(name) { this.attributes.delete(name); }
  focus() { this.document.activeElement = this; }
  get isConnected() { return this === this.document.body || Boolean(this.parent?.isConnected); }
}

const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};
const settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };

function harness(t) {
  const events = new Target(), audio = [], timers = new Map(), saved = new Map();
  const document = { hidden: false, addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events) };
  document.createElement = tag => new Element(tag, document);
  document.body = document.createElement('body');
  const home = document.createElement('a');
  document.body.append(home); document.activeElement = home;
  document.getElementById = id => id === 'workshop-home' ? home : null;
  const location = {};
  const assignURL = value => {
    const url = new URL(value, location.href || 'https://workshop.test/workshop/');
    Object.assign(location, { href: url.href, origin: url.origin, pathname: url.pathname, search: url.search, hash: url.hash });
    return url.href;
  };
  const entries = [assignURL('https://workshop.test/workshop/')], traversals = [];
  let index = 0, timerID = 0;
  const history = {
    backCalls: 0, pushCalls: 0,
    pushState(_state, _title, url) { this.pushCalls++; entries.splice(index + 1); entries.push(assignURL(url)); index++; },
    replaceState(_state, _title, url) { entries[index] = assignURL(url); },
    back() { this.backCalls++; if (index > 0) traversals.push(index - 1); },
    forward() { if (index < entries.length - 1) traversals.push(index + 1); },
    flush() {
      assert.ok(traversals.length, 'a browser history traversal must be pending');
      index = traversals.shift(); assignURL(entries[index]); events.emit('popstate');
    },
  };
  class Audio {
    constructor(src) { Object.assign(this, { src, paused: true, currentTime: 0 }); audio.push(this); }
    play() { this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
    removeAttribute(name) { if(name === 'src')this.src=''; }
    load() {}
  }
  const globals = { document, location, history, Audio, devicePixelRatio: 1,
    window: { innerWidth: 1280, innerHeight: 800 }, addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    requestAnimationFrame: fn => { fn(); return 1; },
    setTimeout: fn => { timers.set(++timerID, fn); return timerID; }, clearTimeout: id => timers.delete(id) };
  for (const [name, value] of Object.entries(globals)) {
    saved.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  }
  const originalError = console.error;
  const errors = [];
  console.error = (...args) => errors.push(args);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(50,1280/800,.1,200);
  camera.position.set(13.8, 7.6, 23.5);
  const experience = createBridgeExperience({ scene, camera, canvas: document.createElement('canvas'), getMuted: () => false });
  const shell = document.body.children.find(item => item.className === 'bridge-experience');
  const frame = () => shell.children.find(item => item.tag === 'iframe');
  function connect(armPromise = Promise.resolve()) {
    const calls = { arm: 0, play: 0, present: 0, dispose: 0, muted: null, playOptions: null };
    frame().contentWindow.__WORKSHOP_BRIDGE = {
      ready: Promise.resolve(), arm: () => { calls.arm++; return armPromise; },
      play: options => { calls.play++; calls.playOptions=options; }, present:()=>{calls.present++;}, pause() {}, dispose: () => { calls.dispose++; },
      setMuted: value => { calls.muted = value; },
    };
    frame().emit('load');
    return calls;
  }
  const tick = dt => experience.update({ dt, time: dt, pixelRatio: 1, reduced: false });
  t.after(() => {
    experience.dispose(); console.error = originalError;
    for (const [name, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  });
  return { experience, document, history, location, events, home, audio, scene, camera, shell, frame, connect, tick, errors };
}

test('Bridge host lifecycle regressions', async t => {
  await t.test('portrait gets a stable landscape film viewport with native touch controls',async t=>{
    const h=harness(t);window.innerWidth=390;window.innerHeight=844;
    h.experience.open();const calls=h.connect();await settle();
    const film=h.frame(),api=film.contentWindow.__WORKSHOP_BRIDGE;
    api.state='playing';api.pause=()=>{api.state='paused';};api.snapshot=()=>({muted:Boolean(calls.muted)});
    assert.equal(film.style.width,'960px');assert.equal(film.style.height,'600px','the film never sees a portrait orientation gate');
    h.tick(6.1);
    assert.equal(h.experience.ownsScreen,true);assert.equal(h.shell.style.background,'#000');
    assert.equal(film.style.transform,'scale(0.40625)');assert.ok(h.shell.classList.contains('bridge-compact'));
    const controls=h.shell.children.find(e=>e.className==='bridge-playback');
    controls.children[0].emit('click');assert.equal(api.state,'paused');assert.equal(controls.children[0].textContent,'Play');
    controls.children[1].emit('click');assert.equal(calls.muted,true);assert.equal(controls.children[1].textContent,'Sound on');
    window.innerWidth=844;window.innerHeight=390;h.events.emit('resize');
    assert.equal(film.style.width,'960px');assert.equal(film.style.height,'600px','rotation preserves authored line breaks');
    assert.equal(film.style.transform,'scale(0.65)');assert.equal(calls.play,1,'rotation does not restart the film');
    h.experience.close();assert.equal(h.shell.style.background,'');assert.equal(film.isConnected,false);
  });

  await t.test('the project click arms the early boot API before fonts or frame load finish', async t => {
    const h=harness(t),ready=deferred(),arm=deferred();let armedCalls=0,plays=0;
    h.experience.prepare();
    h.frame().contentWindow.__WORKSHOP_BRIDGE={
      ready:ready.promise,arm(){armedCalls++;return arm.promise;},
      play(){plays++;},present(){},dispose(){},pause(){},
    };
    h.experience.open();
    assert.equal(armedCalls,1,'authorization must happen synchronously inside the project click');
    h.tick(3);assert.equal(plays,0);
    ready.resolve();arm.resolve();await settle();h.tick(.1);
    assert.equal(plays,1,'readiness must not require a second interaction');
    assert.equal(h.experience.active,true);
  });

  await t.test('the moving film is visible inside the doorway before crossing without restarting', async t => {
    const h=harness(t);h.experience.open();const calls=h.connect();await settle();
    h.tick(1.8);
    assert.equal(calls.play,1);assert.deepEqual(calls.playOptions,{preview:true});
    assert.equal(calls.present,0);assert.equal(h.experience.ownsScreen,false);
    assert.match(h.frame().style.transform,/scale\(/);assert.match(h.frame().style.clipPath,/circle\(/);
    h.tick(4.2);
    assert.equal(calls.play,1);assert.equal(calls.present,1);assert.equal(h.experience.ownsScreen,true);
    assert.equal(h.frame().style.transform,'none');assert.equal(h.frame().style.clipPath,'none');
  });

  await t.test('the film fully covers the view before the camera crosses the portal', async t => {
    const h=harness(t),center=new THREE.Vector3(0,4.8,1.1);
    const normal=h.camera.position.clone().sub(center).normalize();
    h.experience.open();const calls=h.connect();await settle();
    let crossed=false,coveredBeforeCrossing=false;
    for(let i=0;i<120;i++){
      h.tick(.05);
      const distance=h.camera.position.clone().sub(center).dot(normal);
      const covered=h.frame().style.opacity==='1'&&h.frame().style.clipPath==='none';
      if(distance>0&&covered)coveredBeforeCrossing=true;
      if(distance<=0){crossed=true;assert.ok(covered,'no workshop frame may show after crossing');}
    }
    assert.ok(coveredBeforeCrossing);assert.ok(crossed);h.tick(.05);
    assert.equal(calls.play,1);assert.equal(h.experience.ownsScreen,true);
  });

  await t.test('a cancelled pending arm cannot resurrect the film', async t => {
    const h = harness(t), arm = deferred();
    h.experience.open(); const frame = h.frame(); const calls = h.connect(arm.promise);
    await settle(); assert.equal(calls.arm, 1);
    h.experience.close(); h.tick(10);
    assert.equal(h.experience.active, false);
    assert.equal(h.experience.ownsScreen, false);
    assert.equal(h.document.body.dataset.bridgeState, 'closed');
    assert.equal(frame.isConnected, false);
    assert.equal(calls.dispose, 1); assert.equal(calls.play, 0);
    const nextArm = deferred();
    h.experience.open(); const nextCalls = h.connect(nextArm.promise); await settle();
    arm.resolve(); await settle(); h.tick(10);
    assert.equal(h.experience.active, true);
    assert.equal(h.experience.ownsScreen, false);
    assert.equal(h.document.body.dataset.bridgeProgress, '0.280');
    assert.equal(nextCalls.play, 0);
  });

  await t.test('retry replaces the failed frame without navigating Back', async t => {
    const h = harness(t);
    h.experience.open(); const failedFrame = h.frame(); failedFrame.emit('error'); await settle();
    assert.equal(h.document.body.dataset.bridgeState, 'error');
    const retry = h.shell.children.find(item => item.className === 'bridge-retry');
    assert.equal(retry.hidden, false); retry.emit('click');
    assert.notEqual(h.frame(), failedFrame); assert.equal(failedFrame.isConnected, false);
    assert.equal(h.history.backCalls, 0); assert.equal(h.history.pushCalls, 1);
    const calls = h.connect(); await settle(); h.tick(6); await settle();
    assert.equal(h.experience.ownsScreen, true); assert.equal(calls.play, 1);
  });

  await t.test('quick close and reopen survives the previous delayed popstate', async t => {
    const h = harness(t);
    h.experience.open(); h.experience.close(); h.experience.open(); const reopenedFrame = h.frame();
    h.history.flush();
    assert.equal(h.experience.active, true); assert.equal(h.frame(), reopenedFrame);
    assert.equal(new URLSearchParams(h.location.search).get('view'), 'bridge');
    const calls = h.connect(); await settle(); h.tick(6);
    assert.equal(h.experience.ownsScreen, true); assert.equal(calls.play, 1);
  });

  await t.test('browser Back closes the film and Forward restores it', async t => {
    const h = harness(t);
    h.experience.open(); const first = h.connect(); await settle(); h.tick(6);
    h.history.back(); h.history.flush();
    assert.equal(h.experience.active, false); assert.equal(first.dispose, 1);
    assert.equal(h.location.search, '');
    h.history.forward(); h.history.flush();
    assert.equal(h.experience.active, true); assert.equal(h.history.pushCalls, 1);
    const second = h.connect(); await settle(); h.tick(6);
    assert.equal(h.experience.ownsScreen, true); assert.equal(second.play, 1);
  });

  await t.test('dispose detaches the frame, stops media and removes listeners', async t => {
    const h = harness(t);
    h.experience.open(); const frame = h.frame(); const calls = h.connect(); await settle(); h.tick(1);
    h.experience.setMuted(true); assert.equal(calls.muted, true);
    h.experience.dispose();
    assert.equal(h.experience.active, false); assert.equal(h.experience.ownsScreen, false);
    assert.equal(frame.isConnected, false); assert.equal(h.shell.isConnected, false);
    assert.equal(calls.dispose, 1); assert.equal(h.scene.children.length, 0);
    assert.ok(h.audio.every(sound => sound.paused && sound.currentTime === 0));
    assert.equal(h.events.listenerCount, 0); assert.equal(h.home.listenerCount, 0);
  });
});

test('a preloaded but closed Bridge cannot take the page\'s scrolling', async t => {
  // Safari routes wheel and trackpad scrolling to the full-viewport film frame
  // even with pointer-events:none, so the closed shell must be clipped away.
  const css = await readFile(new URL('./style.css', import.meta.url), 'utf8');
  const rule = css.match(/\.bridge-experience:not\(\.is-active\)\{([^}]*)\}/);
  assert.ok(rule, 'style.css needs a rule for the closed Bridge shell');
  assert.match(rule[1], /clip-path:inset\(0 0 100% 0\)/);
  const h = harness(t); h.experience.prepare();
  assert.equal(h.shell.hidden, false, 'the preload keeps a real viewport for the film');
  assert.equal(h.shell.classList.contains('is-active'), false, 'so only the clip keeps it out of the page');
  h.experience.open();
  assert.equal(h.shell.classList.contains('is-active'), true, 'opening lifts the clip');
});
