/* ============================================================
   THE BRIDGE — sound department.
   Real assets (see assets/audio/CREDITS.md), each cue matched to
   the visual it scores. WebAudio buffers over http(s); graceful
   HTMLAudio-pool fallback over file:// (fetch is CORS-blocked there).
   ============================================================ */
window.FILM = window.FILM || {};
FILM.audio = (function () {
  'use strict';
  var BASE = 'assets/audio/';

  /* cue map — `peak` = seconds from file start until the impact lands
     (measured from RMS envelopes), so hits can be scheduled to strike
     exactly on their visual beat. `loop` cues repeat seamlessly. */
  var CUES = {
    /* ls/le = seamless splice points (seconds): the file has ~0.25s of near-
       silence at the head and a fading tail — a full-file loop wraps with an
       audible dip (the tag's "loops but with a pause", Lorenzo 2026-07-08).
       Measured on the 25ms RMS envelope; seam delta 4.5dB. */
    'portal-crackle': { f: 'sfx-portal-crackle.mp3', g: 0.55, loop: true, ls: 0.25, le: 7.675 },
    'portal-burst':   { f: 'sfx-portal-burst.mp3',   g: 0.70 },
    'portal-open':    { f: 'sfx-portal-open.mp3',    g: 0.90 },
    'riser':          { f: 'sfx-riser.mp3',          g: 0.70 },
    'portal-through': { f: 'sfx-portal-through.mp3', g: 1.00 },
    'boom-big':       { f: 'sfx-boom-big.mp3',       g: 0.95, peak: 2.1 },
    'card-hit':       { f: 'sfx-card-hit.mp3',       g: 0.80, peak: 1.0 },
    'logo-hit':       { f: 'sfx-logo-hit.mp3',       g: 0.90, peak: 2.0 },
    'title-hit':      { f: 'sfx-title-hit.mp3',      g: 1.00, peak: 2.6 },
    'return-hit':     { f: 'sfx-return-hit.mp3',     g: 0.90, peak: 2.0 },
    'type-click':     { f: 'sfx-type-click.mp3',     g: 0.40, pool: 4 },
    'type-bell':      { f: 'sfx-type-bell.mp3',      g: 0.30 },
    'loc-swish':      { f: 'sfx-loc-swish.mp3',      g: 0.45 },
    'hud-on':         { f: 'sfx-hud-on.mp3',         g: 0.55 },
    'hud-blip':       { f: 'sfx-hud-blip.mp3',       g: 0.40, pool: 3 },
    'builder-hum':    { f: 'sfx-builder-hum.mp3',    g: 0.30, loop: true },
    'pages-loop':     { f: 'sfx-pages-loop.mp3',     g: 0.40, loop: true },
    'astral-sweep':   { f: 'sfx-astral-sweep.mp3',   g: 0.45 },
    'harp-sweep':     { f: 'sfx-harp-sweep.mp3',     g: 0.45 },
    'energy-flow':    { f: 'sfx-energy-flow.mp3',    g: 0.55 },
    'dust-whoosh':    { f: 'sfx-dust-whoosh.mp3',    g: 0.70 },
    'embers-loop':    { f: 'sfx-embers-loop.mp3',    g: 0.30, loop: true },
    'mini-crackle':   { f: 'sfx-mini-crackle.mp3',   g: 0.55, pool: 2 },
    /* dramatic layer (2026-07-08 pass; gimmick cues retired in v3) */
    'thunder-rumble': { f: 'sfx-thunder-rumble.mp3', g: 0.60 },
    'fireworks':      { f: 'sfx-fireworks.mp3',      g: 0.45, pool: 2 },
    'page-shuffle':   { f: 'sfx-page-shuffle.mp3',   g: 0.45, pool: 2 },
    'star-ping':      { f: 'sfx-star-ping.mp3',      g: 0.38, pool: 3 },
    'glitter-burst':  { f: 'sfx-glitter-burst.mp3',  g: 0.45 },
    'reverse-suck':   { f: 'sfx-reverse-suck.mp3',   g: 0.70 }
  };
  /* The authored film has one soundtrack. Loading or failure never selects
     another recording; portals only duck this same continuous score. */
  var MUSIC = {
    film: { f: 'score-local.opus', g: 0.60 }
  };

  var ctx = null, master = null, sfxBus = null, buffers = {}, webAudio = false;
  var muted = false, started = false, localScore = false;
  var transportPaused = true, disposed = false, playbackError = null, allMusicEls = [];
  var scoreReady = false, scoreFailure = null, scoreReadyPromise = null, resolveScoreReady = null;
  var scoreTimer = null, transportGeneration = 0;
  /* ?audioqa=1 — logging stubs; the real recorders are installed by the
     diagnostic block at the end of this module. Inert in normal runs. */
  var QA = { fail: function () {}, pool: function () {} };
  var htmlPool = {};           // fallback: cue -> [Audio,…]
  var liveLoops = {};          // cue name -> handle
  var musicEls = {}, musicCur = null;
  var filmClock = null;        // film.js hands us the master timeline's time()
  var scoreOffset = 0;         // film time at which the score's position 0 began
                               // (the score is tape-synced RELATIVE to this, so the
                               // local suite may enter from its own opening bar)

  function makeCtx() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    /* gentle soft-knee so stacked hits don't clip */
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12; comp.knee.value = 24; comp.ratio.value = 6;
    comp.attack.value = 0.004; comp.release.value = 0.24;
    sfxBus = ctx.createGain();
    sfxBus.connect(master); master.connect(comp); comp.connect(ctx.destination);
    return true;
  }

  function loadBuffers() {
    var names = Object.keys(CUES);
    return Promise.all(names.map(function (n) {
      return fetch(BASE + CUES[n].f)
        .then(function (r) { if (!r.ok) throw 0; return r.arrayBuffer(); })
        .then(function (ab) { return ctx.decodeAudioData(ab); })
        .then(function (buf) { buffers[n] = buf; })
        .catch(function () { QA.fail(n); });  /* per-cue: one bad decode no longer
          collapses EVERY cue to the HTMLAudio pool (which iOS blocks outside
          gestures) — the failed cue alone falls back, the rest stay WebAudio */
    }));
  }

  function poolFor(name) {
    if (!htmlPool[name]) {
      var size = CUES[name].pool || (CUES[name].loop ? 1 : 2);
      htmlPool[name] = [];
      for (var i = 0; i < size; i++) {
        var a = new Audio(BASE + CUES[name].f);
        a.preload = 'auto'; htmlPool[name].push(a);
      }
    }
    return htmlPool[name];
  }

  /* -------- public: one-shots -------- */
  function play(name, opts) {
    if (!started || muted || disposed || transportPaused) return null;
    opts = opts || {};
    var cue = CUES[name]; if (!cue) return null;
    var vol = cue.g * (opts.gain != null ? opts.gain : 1);
    if (webAudio && buffers[name]) {
      var src = ctx.createBufferSource();
      src.buffer = buffers[name];
      if (cue.loop) {
        src.loop = true;
        if (cue.ls != null) src.loopStart = cue.ls;   /* splice inside the energy — */
        if (cue.le != null) src.loopEnd = cue.le;     /* never the silent head/tail */
      }
      if (opts.rate) src.playbackRate.value = opts.rate;
      var g = ctx.createGain(); g.gain.value = vol;
      var head = src;
      if (opts.lp) {           /* optional lowpass — rumbles, muffled beats */
        var f = ctx.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.value = opts.lp;
        src.connect(f); head = f;
      }
      head.connect(g); g.connect(sfxBus);
      var t0 = ctx.currentTime + (opts.delay || 0);
      if (opts.fadeIn) { g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + opts.fadeIn); }
      src.start(t0, opts.offset || 0);
      if (opts.dur) {
        g.gain.setValueAtTime(vol, t0 + opts.dur - 0.08);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
        src.stop(t0 + opts.dur + 0.05);
      }
      return {
        stop: function (fade) {
          var t = ctx.currentTime;
          if (fade) { g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), t); g.gain.exponentialRampToValueAtTime(0.0001, t + fade); src.stop(t + fade + 0.05); }
          else src.stop();
        }
      };
    }
    /* HTMLAudio fallback (file://) */
    QA.pool(name);
    var pool = poolFor(name);
    var el = pool.find(function (a) { return a.paused; }) || pool[0];
    el.volume = Math.min(1, vol); el.loop = !!cue.loop;
    if (opts.rate) el.playbackRate = opts.rate;
    try { el.currentTime = opts.offset || 0; el.play().catch(function(){}); } catch (e) {}
    if (opts.dur) setTimeout(function () { try { el.pause(); } catch (e) {} }, opts.dur * 1000);
    return { stop: function () { try { el.pause(); } catch (e) {} } };
  }

  /* loops registered by name so chapters can silence their beds */
  function loop(name, opts) {
    stopLoop(name, 0.1);
    var h = play(name, Object.assign({ fadeIn: 0.8 }, opts || {}));
    if (h) liveLoops[name] = h;
    return h;
  }
  function stopLoop(name, fade) {
    if (liveLoops[name]) { liveLoops[name].stop(fade == null ? 0.8 : fade); delete liveLoops[name]; }
  }
  function stopAllLoops(fade) { Object.keys(liveLoops).forEach(function (n) { stopLoop(n, fade); }); }

  /* -------- public: music (HTMLAudio streams; volume-tweened) -------- */
  function musicEl(key) {
    if (!musicEls[key]) {
      var a = new Audio(BASE + MUSIC[key].f);
      a.preload = 'auto'; a.loop = true; a.volume = 0;
      musicEls[key] = a; allMusicEls.push(a);
    }
    return musicEls[key];
  }
  /* -------- the level path (iOS parity, 2026-07-10 device pass) --------
     iOS Safari IGNORES HTMLAudio volume writes — every fade below was a silent
     no-op on iPhone (dead credits swell, dead portal ducks, dead crossfades,
     mute button not muting the score). Where WebAudio exists, each music/score
     element is routed once through its own GainNode and every fade drives the
     gain instead. Same math, no compressor in the path (music never rode the
     comp — desktop signal identical). No ctx / file:// keeps the old volume
     tweens. NOTE: routing puts the score on the WebAudio channel, so start()
     sets navigator.audioSession='playback' (iOS 16.4+) to keep the ringer
     switch from muting the film. */
  function wireLevel(el) {
    if (!ctx || location.protocol === 'file:' || el.__lvl) return;
    try {
      var src = ctx.createMediaElementSource(el);
      var g = ctx.createGain();
      g.gain.value = el.volume;                 /* inherit the current level */
      src.connect(g); g.connect(ctx.destination);
      el.__lvl = g.gain;                        /* AudioParam owns the level now */
      el.volume = 1;
    } catch (e) {}                              /* an enhancement, never fatal */
  }
  function levelTarget(el) { return el.__lvl || el; }
  function getLevel(el) { return el.__lvl ? el.__lvl.value : el.volume; }
  function setLevel(el, v) { if (el.__lvl) el.__lvl.value = v; else el.volume = v; }
  function fadeEl(el, to, sec, thenPause, delay) {
    var tgt = levelTarget(el);
    gsap.killTweensOf(tgt);
    var vars = { duration: sec || 1.5, delay: delay || 0, ease: 'sine.inOut',
      onComplete: function () { if (thenPause && to === 0) { try { el.pause(); } catch (e) {} } } };
    vars[el.__lvl ? 'value' : 'volume'] = to;
    gsap.to(tgt, vars);
  }
  function music(key, opts) {
    if (!started || disposed || !scoreReady || scoreFailure) return;
    opts = opts || {};
    if (musicCur && musicCur !== key) fadeEl(musicEl(musicCur), 0, opts.xfade || 2.4, true);
    musicCur = key;
    var el = musicEl(key);
    wireLevel(el);
    cancelPrime(el);
    el.loop = true;                      /* undo any credits end-align mode */
    if (opts.restart) {
      try { el.currentTime = 0; } catch (e) {}
      scoreOffset = filmClock ? filmClock() : 0;
      el.__alignOpening = true;
    }
    if (!transportPaused) observePlay(el);
    /* Honor the conductor's fade timing for this one score. */
    fadeEl(el, muted ? 0 : MUSIC[key].g * (opts.gain != null ? opts.gain : 1), opts.xfade || 2.4, false, opts.delay);
  }
  function musicStop(fade) {
    if (musicCur) fadeEl(musicEl(musicCur), 0, fade == null ? 2 : fade, true);
    musicCur = null;
  }
  /* The score is TIED to the film's timeline like a real audio track:
     seeks jump it to the film position; chapter starts correct drift. */
  function setClock(fn) { filmClock = fn; }
  function syncTo(seconds, ifDriftOver) {
    if (!musicCur || !musicEls[musicCur]) return;
    var el = musicEls[musicCur];
    var dur = el.duration;
    if (!isFinite(dur) || dur <= 0) {          /* metadata not ready yet — sync when it is */
      el.addEventListener('loadedmetadata', function () { syncTo(seconds, ifDriftOver); }, { once: true });
      return;
    }
    var target = Math.max(0, seconds - scoreOffset) % dur;
    if (ifDriftOver && Math.abs(el.currentTime - target) < ifDriftOver) return;
    /* a mid-play seek flushes Safari's Opus decoder audibly — dip for the
       seek, restore on 'seeked' (unless a newer fade already owns volume) */
    if (!el.paused && getLevel(el) > 0) {
      var prev = getLevel(el);
      gsap.killTweensOf(levelTarget(el));
      setLevel(el, 0);
      var back = function () { if (!gsap.isTweening(levelTarget(el))) fadeEl(el, prev, 0.25); };
      var tid = setTimeout(back, 500);
      el.addEventListener('seeked', function () { clearTimeout(tid); back(); }, { once: true });
    }
    try { el.currentTime = target; } catch (e) {}
  }
  /* Credits mode: align the track so its FINALE lands when the film ends —
     the suite plays out, no loop restart under the credits. */
  function syncToEnd(remainingSeconds) {
    if (!musicCur || !musicEls[musicCur]) return;
    var el = musicEls[musicCur];
    var dur = el.duration;
    if (!isFinite(dur) || dur <= 0) {
      el.addEventListener('loadedmetadata', function () { syncToEnd(remainingSeconds); }, { once: true });
      return;
    }
    el.loop = false;                     /* the finale ENDS; the tag rides the embers */
    /* the finale ENTERS rather than cuts — dip for the seek, swell back in
       over ~2s so the theme doesn't fire mid-note (client, patch 1) */
    var back = muted ? 0 : MUSIC[musicCur].g;
    gsap.killTweensOf(levelTarget(el));
    setLevel(el, 0);
    try { el.currentTime = Math.max(0, dur - remainingSeconds); } catch (e) {}
    fadeEl(el, back, 2.2);
  }

  /* momentarily dip music under a big cue (portals, title hits) */
  function duck(sec, depth) {
    if (!musicCur) return;
    var el = musicEl(musicCur), back = muted ? 0 : MUSIC[musicCur].g;
    var tgt = levelTarget(el), prop = el.__lvl ? 'value' : 'volume';
    var down = { duration: 0.3, ease: 'sine.out' };
    var up = { duration: 1.4, ease: 'sine.inOut' };
    down[prop] = back * (depth != null ? depth : 0.35);
    up[prop] = back;
    gsap.killTweensOf(tgt);
    gsap.timeline().to(tgt, down).to(tgt, up, '+=' + Math.max(0, (sec || 2) - 0.3));
  }

  function peak(name) { return (CUES[name] && CUES[name].peak) || 0; }

  /* -------- transport: the WHOLE soundtrack freezes with the film -------- */
  function pauseAll() {
    transportPaused = true; transportGeneration++;
    allMusicEls.forEach(function (el) {
      cancelPrime(el); el.__playRequest = (el.__playRequest || 0) + 1;
      try { el.pause(); } catch (e) {}
    });
    if (ctx && ctx.state === 'running') ctx.suspend();
    if (musicCur && musicEls[musicCur]) { try { musicEls[musicCur].pause(); } catch (e) {} }
    Object.keys(htmlPool).forEach(function (n) {
      htmlPool[n].forEach(function (a) {
        if (!a.paused) { a.__frozen = true; try { a.pause(); } catch (e) {} }
      });
    });
  }
  /* Embedding transport: report autoplay failure without changing score timing. */
  function reportBlocked(error) {
    playbackError = String(error && error.message || error || 'Sound needs a tap.');
    if (!muted && !disposed && !transportPaused) {
      window.dispatchEvent(new CustomEvent('bridge-audio-blocked', { detail: playbackError }));
    }
  }
  /* Media authorization belongs to each element, not just its AudioContext.
     Prime the one stable score element in the project click, at zero output. */
  function cancelPrime(el) {
    if (!el.__priming) return;
    el.__priming = false; el.__playRequest = (el.__playRequest || 0) + 1;
    try { el.pause(); el.currentTime = el.__primePosition; } catch (e) {}
  }
  function primeMusic(el) {
    if (disposed || el.__primed) return Promise.resolve(true);
    if (el.__priming) return el.__primePromise;
    wireLevel(el);
    var currentScore = musicCur && musicEls[musicCur] === el;
    if (!currentScore) setLevel(el, 0);
    el.__primePosition = el.currentTime || 0;
    // Initial WebAudio primes are unmuted behind zero gain. A paused-score retry
    // retains its authored gain/fade and silences the element while authorizing it.
    el.__primeSilenced = !!currentScore || !el.__lvl;
    el.muted = muted || el.__primeSilenced;
    el.__priming = true;
    var request = el.__playRequest = (el.__playRequest || 0) + 1;
    function finish(allowed) {
      if (request !== el.__playRequest) return allowed;
      el.__priming = false; el.__primed = allowed;
      try { el.pause(); el.currentTime = el.__primePosition; } catch (e) {}
      return allowed;
    }
    try {
      el.__primePromise = Promise.resolve(el.play()).then(function () { return finish(true); }, function () { return finish(false); });
    } catch (error) { el.__primePromise = Promise.resolve(finish(false)); }
    return el.__primePromise;
  }
  function observePlay(el) {
    cancelPrime(el);
    var request = el.__playRequest = (el.__playRequest || 0) + 1;
    el.muted = muted;
    try {
      return Promise.resolve(el.play()).then(function () {
        if (request !== el.__playRequest || disposed || transportPaused) return false;
        if (el.__alignOpening) {
          if (filmClock) scoreOffset = filmClock() - el.currentTime;
          el.__alignOpening = false;
        }
        el.__primed = true; playbackError = null; return true;
      }, function (error) {
        if (request !== el.__playRequest || disposed || transportPaused) return false;
        el.__primed = false; reportBlocked(error); return false;
      });
    } catch (error) { el.__primed = false; reportBlocked(error); return Promise.resolve(false); }
  }
  function unlockContext() {
    if (!ctx || ctx.state === 'running') return Promise.resolve(true);
    try { return Promise.resolve(ctx.resume()).then(function () { return ctx.state === 'running'; }, function () { return false; }); }
    catch (error) { return Promise.resolve(false); }
  }
  function resumeAll() {
    if (!started || disposed || scoreFailure) return Promise.resolve(false);
    var generation = ++transportGeneration, work = [];
    // Context activation remains synchronous; the film waits for its only score.
    if (ctx && ctx.state !== 'running') {
      try { work.push(Promise.resolve(ctx.resume()).then(function () { return ctx.state === 'running'; }, function (error) { reportBlocked(error); return false; })); }
      catch (error) { reportBlocked(error); work.push(Promise.resolve(false)); }
    }
    return scoreReadyPromise.then(function (ready) {
      if (!ready || disposed || scoreFailure || generation !== transportGeneration) return false;
      transportPaused = false;
      if (musicCur && musicEls[musicCur]) work.push(observePlay(musicEls[musicCur]));
      Object.keys(htmlPool).forEach(function (n) {
        htmlPool[n].forEach(function (a) {
          if (a.__frozen) { a.__frozen = false; if (a.loop) work.push(observePlay(a)); }
        });
      });
      return Promise.race([
        Promise.all(work).then(function (results) { return results.every(function (ok) { return ok; }); }),
        new Promise(function (resolve) { setTimeout(function () { resolve(!ctx || ctx.state === 'running'); }, 800); })
      ]);
    });
  }
  function playbackState() {
    var el = musicCur && musicEls[musicCur];
    return { started: started, muted: muted, context: ctx ? ctx.state : 'unavailable', paused: transportPaused,
      scorePlaying: !!el && !el.paused, scoreTime: el ? el.currentTime : 0, localScore: localScore, scoreReady: scoreReady, error: scoreFailure || playbackError };
  }
  function dispose() {
    if (disposed) return;
    pauseAll(); stopAllLoops(0); disposed = true;
    clearTimeout(scoreTimer); if (resolveScoreReady) resolveScoreReady(false);
    allMusicEls.forEach(function (el) {
      gsap.killTweensOf(levelTarget(el));
      try { el.pause(); el.removeAttribute('src'); el.load(); } catch (e) {}
    });
    Object.keys(htmlPool).forEach(function (key) { htmlPool[key].forEach(function (el) {
      try { el.pause(); el.removeAttribute('src'); el.load(); } catch (e) {}
    }); });
    if (ctx && ctx.state !== 'closed') ctx.close().catch(function () {});
  }

  function setMuted(m) {
    muted = m;
    if (master) master.gain.value = m ? 0 : 1;
    allMusicEls.forEach(function (el) { el.muted = !!m || (!!el.__priming && el.__primeSilenced); });
    Object.keys(musicEls).forEach(function (k) {
      if (k === musicCur) fadeEl(musicEls[k], m ? 0 : MUSIC[k].g, 0.4);
    });
    /* fallback pools can't be gain-bussed; new plays are gated by `muted` */
    if (m) Object.keys(htmlPool).forEach(function (n) {
      htmlPool[n].forEach(function (a) { if (!a.loop) { try { a.pause(); } catch (e) {} } else a.volume = 0; });
    });
  }

  function creditLocalScore() {
    var tr = document.getElementById('tr-score');
    if (tr) tr.textContent = 'SCORE: MICHAEL GIACCHINO ("THE MASTER OF THE MYSTIC END CREDITS")';
    else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', creditLocalScore, { once: true });
  }

  /* the transcript's credit must tell the truth even for pure readers who
     never press ENTER: cheap availability check at load. Playback still waits
     for the project click and the authored opening cue */
  try {
    fetch(BASE + 'score-local.opus', { method: 'HEAD' }).then(function (r) {
      if (!r.ok) return;
      creditLocalScore();
    }).catch(function () {});
  } catch (e) {}

  function prepareScore(el) {
    scoreReadyPromise = new Promise(function (resolve) { resolveScoreReady = resolve; });
    function ready() {
      if (disposed || scoreFailure || scoreReady) return;
      scoreReady = true; localScore = true; clearTimeout(scoreTimer);
      creditLocalScore(); resolveScoreReady(true);
    }
    function fail() {
      if (disposed || scoreFailure) return;
      scoreFailure = 'The Bridge soundtrack could not load. Return to the workshop and retry.';
      scoreReady = false; clearTimeout(scoreTimer); pauseAll(); resolveScoreReady(false);
      window.dispatchEvent(new CustomEvent('bridge-audio-error', { detail: scoreFailure }));
    }
    el.addEventListener('canplaythrough', ready, { once: true });
    el.addEventListener('error', fail, { once: true });
    scoreTimer = setTimeout(fail, 15000);
    if (el.readyState >= 4) ready();
  }

  function start(startMuted) {
    if (disposed) return Promise.resolve();
    if (started) {
      setMuted(!!startMuted);
      var unlocked = unlockContext(); // Keep this call in the trusted gesture.
      var retryPrimes = transportPaused ? allMusicEls.map(primeMusic) : [];
      return Promise.all([unlocked].concat(retryPrimes));
    }
    started = true;
    muted = !!startMuted;
    var haveCtx = makeCtx();
    if (haveCtx) {
      /* iOS: keep the film on the playback channel even with the ringer off. */
      if (navigator.audioSession) { try { navigator.audioSession.type = 'playback'; } catch (e) {} }
      if (ctx.state !== 'running') ctx.resume().catch(reportBlocked);
      master.gain.value = muted ? 0 : 1;
    }
    var score = musicEl('film');
    prepareScore(score);
    var primes = [primeMusic(score)];
    if (haveCtx && location.protocol !== 'file:') {
      primes.push(loadBuffers().then(function () { webAudio = true; }).catch(function () { webAudio = false; }));
    }
    return Promise.all(primes);
  }

  /* keep loops honest when the tab hides (film.js pauses the timeline;
     beds are re-entered on chapter labels, so just cut them) */
  document.addEventListener('visibilitychange', function () {
    if (disposed) return;
    if (document.hidden) { stopAllLoops(0.2); if (musicCur) { try { musicEl(musicCur).pause(); } catch (e) {} } }
    /* The film transport alone resumes after a hidden tab. */
  });

  /* -------- ?audioqa=1 — on-device diagnostic overlay --------
     Read-only sampler for the mobile audio-parity pass (QA precedent:
     tools/qa/diag-safari.html). Discriminates: ringer-switch WebAudio mute vs
     all-or-nothing decode collapse vs slow-fetch race vs score play() block.
     Absolutely inert without the querystring. */
  if (/[?&]audioqa=1/.test(location.search)) (function () {
    var failed = [], poolUses = {}, states = [], fps = 0, frames = 0;
    QA.fail = function (n) { failed.push(n); };
    QA.pool = function (n) { poolUses[n] = (poolUses[n] || 0) + 1; };
    var box = document.createElement('div');
    box.id = 'audioqa';
    box.setAttribute('style', 'position:fixed;left:max(8px,env(safe-area-inset-left,0px));' +
      'top:max(8px,env(safe-area-inset-top,0px));z-index:100;' +
      'background:rgba(1,2,4,.85);color:#9fd8e8;font:10px/1.55 monospace;' +
      'padding:8px 10px;pointer-events:none;white-space:pre;max-width:88vw;' +
      'overflow:hidden;border:1px solid rgba(111,214,232,.35)');
    (document.body || document.documentElement).appendChild(box);
    (function tick(last) {
      requestAnimationFrame(function (t) {
        frames++;
        if (t - (tick.t0 || (tick.t0 = t)) >= 1000) { fps = frames; frames = 0; tick.t0 = t; }
        tick(t);
      });
    })();
    var wireState = function () {
      if (ctx && !ctx.__qaWired) {
        ctx.__qaWired = true;
        states.push(ctx.state + '@0');
        ctx.onstatechange = function () {
          states.push(ctx.state + '@' + Math.round(performance.now() / 100) / 10);
          if (states.length > 6) states.shift();
        };
      }
    };
    setInterval(function () {
      try {
      wireState();
      var el = musicCur && musicEls[musicCur];
      var lines = [
        'AUDIO QA  started:' + started + '  muted:' + muted,
        'webAudio:' + webAudio + '  buffers:' + Object.keys(buffers).length + '/' + Object.keys(CUES).length,
        'decode-failed: ' + (failed.length ? failed.join(',') : '—'),
        'pool plays: ' + (Object.keys(poolUses).length
          ? Object.keys(poolUses).map(function (n) { return n + '×' + poolUses[n]; }).join(' ')
          : '—'),
        'ctx: ' + (ctx ? ctx.state + '  [' + states.join(' → ') + ']' : 'none'),
        'score: ' + (musicCur || '—') + (localScore ? ' GIACCHINO' : ' LOADING') +
          (el ? (el.paused ? ' paused' : ' playing') + ' ct=' + el.currentTime.toFixed(1) +
                ' lvl=' + getLevel(el).toFixed(2) + (el.__lvl ? ' (gain)' : ' (vol)') : ''),
        'session: ' + (navigator.audioSession ? navigator.audioSession.type : 'n/a') +
          '   fps: ' + fps,
        'build: ' + ((((document.querySelector('script[src*="film.js"]') || {}).src) || '').split('v=')[1] || 'local') +
          '  dpr: ' + (window.devicePixelRatio || 1) +
          '  runway: ' + (document.scrollingElement.scrollHeight - innerHeight) +
          '  scrollY: ' + (window.scrollY | 0),
        'vp: ' + innerWidth + 'x' + innerHeight +
          '  land: ' + (matchMedia('(orientation: landscape)').matches ? 1 : 0) +
          '  mh520: ' + (matchMedia('(max-height: 520px)').matches ? 1 : 0) +
          '  coarse: ' + (matchMedia('(pointer: coarse)').matches ? 1 : 0),
        'chrome: ' + (document.body.classList.contains('chrome') ? 1 : 0) +
          '  idle: ' + (document.body.classList.contains('idle') ? 1 : 0) +
          '  gate: ' + (window.__gateLog ? 'pd' + window.__gateLog.pd + ' ck' + window.__gateLog.ck +
            ' pu' + (window.__gateLog.pu || 0) +
            ' e' + window.__gateLog.enter + ' go' + window.__gateLog.go : '-') +
          '  pokes: ' + (window.__pokes | 0) + '/' + (window.__pokeSrc || '-') +
          (window.FILM && FILM.stage && FILM.stage.quality ? (function (q) {
            return '  q: L' + q.level + ' m' + q.mult + ' cap' + q.dprCap +
                   ' px' + (FILM.stage.renderer() ? FILM.stage.renderer().getPixelRatio().toFixed(2) : '-');
          })(FILM.stage.quality) : ''),   /* quality is the module's RAW object export */
        'tfs: ' + getComputedStyle(document.querySelector('#gate .g-title')).fontSize +
          '  cw: ' + document.documentElement.clientWidth +
          '  vvw: ' + (window.visualViewport ? (visualViewport.width | 0) : '-') +
          '  vvs: ' + (window.visualViewport ? visualViewport.scale.toFixed(2) : '-') +
          (window.__fsErr ? '\nfsErr: ' + String(window.__fsErr).slice(0, 60) : '')
      ];
      box.textContent = lines.join('\n');
      } catch (e) { box.textContent = 'QA PANEL ERR: ' + e + '\n' + (e && e.stack ? String(e.stack).slice(0, 200) : ''); }
    }, 500);
  })();

  return { start: start, play: play, loop: loop, stopLoop: stopLoop, stopAllLoops: stopAllLoops,
           music: music, musicStop: musicStop, duck: duck, peak: peak,
           setClock: setClock, syncTo: syncTo, syncToEnd: syncToEnd,
           pauseAll: pauseAll, resumeAll: resumeAll, playbackState: playbackState, unlockContext: unlockContext, dispose: dispose,
           usingLocalScore: function () { return localScore; },
           scoreOffset: function () { return scoreOffset; },   /* QA: the drift rule
                                        must judge offset-RELATIVE, like the locks */
           setMuted: setMuted, muted: function () { return muted; } };
})();
