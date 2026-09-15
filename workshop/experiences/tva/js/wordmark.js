/* ═══════════════════════════════════════════════════════════════════════
   wordmark.js — the shape-shifting name. One word, LORENZO, every letter
   its own typeface, cycling like the series logo: stable name, variant
   letters. Deterministic in t (seek-safe): letter i at cycle k always
   wears the same face. Settles for the first and only time at the turn.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var U = window.FX.util;

  // the letterform pool — show faces first (sliced off in homemade mode)
  var POOL = [
    { f: '"LokiUSAngel"',      s: 1.00 },
    { f: '"LokiOldEnglish"',   s: 1.04 },
    { f: '"LokiARB85"',        s: 1.10 },
    { f: '"LokiCloister"',     s: 1.04 },
    { f: '"UnifrakturMaguntia"', s: 1.00 },
    { f: '"Pirata One"',       s: 1.00 },
    { f: '"Rye"',              s: 0.90 },
    { f: '"Monoton"',          s: 0.92 },
    { f: '"Abril Fatface"',    s: 0.98 },
    { f: '"Alfa Slab One"',    s: 0.92 },
    { f: '"Yeseva One"',       s: 0.98 },
    { f: '"Bungee Inline"',    s: 0.90 },
    { f: '"Stardos Stencil"',  s: 0.98, w: '700' },
    { f: '"VT323"',            s: 1.14 },
    { f: '"Homemade Apple"',   s: 0.80 },
    { f: '"Bodoni Moda"',      s: 0.98, i: true },
    { f: '"Fraunces"',         s: 1.00, i: true },
    { f: '"Special Elite"',    s: 0.94 }
  ];
  // settled faces: the canonical mixed-form — even at rest, many faces, one name
  var SETTLE_SHOW = [0, 1, 2, 3, 0, 2, 3];       // L O R E N Z O
  var SETTLE_HOME = [4, 8, 6, 10, 12, 5, 9];

  function Wordmark(cues, showMode) {
    this.C = cues;
    this.word = 'LORENZO';
    this.pool = showMode ? POOL : POOL.slice(4);
    this.settleMap = showMode ? SETTLE_SHOW : SETTLE_HOME;
    this.n = this.word.length;
  }

  Wordmark.prototype.faceAt = function (i, k) { // letter i, cycle k → pool face
    var idx = Math.floor(U.hash01(i * 97.13 + k * 13.7) * this.pool.length);
    return this.pool[idx % this.pool.length];
  };

  /* draw one act of the wordmark.
     act1: [C.wmStart, C.cast[0])   — big, breathing, wild after intensify
     act2: [C.wm2, C.treeFade+2)    — over the tree, settles per letter    */
  Wordmark.prototype.draw = function (cx, W, H, t) {
    var C = this.C;
    var act1 = t >= C.wmStart && t < C.cast[0];
    var act2 = t >= C.wm2 && t < C.treeFade + 2.2;
    if (!act1 && !act2) return;

    var base = act1 ? C.wmStart : C.wm2;
    var yC = act1 ? H * 0.46 : H * 0.38;
    var alpha = 1;
    if (act2) {
      alpha = Math.min(1, (t - C.wm2) / 0.8);
      if (t > C.treeFade) alpha = Math.max(0, 1 - (t - C.treeFade) / 1.9);
      if (t > C.createdBy) yC = H * (0.38 - 0.045 * U.clamp((t - C.createdBy) / 0.9, 0, 1));
    }
    if (alpha <= 0) return;

    // act 1: the big shape-shifting statement. act 2: the reference finale —
    // small, white-hot, widely tracked, on near-black.
    var size, tracking;
    if (act2) { size = Math.min(W * 0.062, H * 0.135); tracking = size * 0.55; }
    else { size = Math.min(W * 0.115, H * 0.24); tracking = size * 0.16; }
    var inkR = act2 ? 208 : 242, inkG = act2 ? 204 : 231, inkB = act2 ? 178 : 207;

    // measure pass
    var i, faces = [], strs = [], widths = [], total = 0;
    for (i = 0; i < this.n; i++) {
      var st = this.state(i, t, base, act2);
      var face = st.face;
      var fstr = (face.i ? 'italic ' : '') + (face.w || '400') + ' ' + Math.round(size * face.s) + 'px ' + face.f + ', serif';
      cx.font = fstr;
      var ch = st.lower ? this.word[i].toLowerCase() : this.word[i];
      var w = cx.measureText(ch).width;
      faces.push(st); strs.push(fstr);
      widths.push(w); total += w;
    }
    total += tracking * (this.n - 1);
    var x = (W - total) / 2;

    cx.save();
    cx.textBaseline = 'alphabetic';
    cx.textAlign = 'left';

    // eyebrow (act 1): the file speaks quietly above the name
    if (act1 && t > base + 1.6) {
      var ea = U.clamp((t - base - 1.6) / 0.8, 0, 1) * 0.8;
      cx.font = '400 ' + Math.round(Math.max(10, H * 0.016)) + 'px "Courier Prime", monospace';
      cx.fillStyle = 'rgba(107,190,138,' + ea * 0.75 + ')';
      cx.textAlign = 'center';
      var eb = 'S U B J E C T :';
      cx.fillText(eb, W / 2, yC - size * 0.95);
      cx.textAlign = 'left';
    }

    for (i = 0; i < this.n; i++) {
      var st2 = faces[i];
      var ch2 = st2.lower ? this.word[i].toLowerCase() : this.word[i];
      var lx = x + widths[i] / 2, ly = yC + size * 0.34;
      cx.save();
      cx.translate(lx + st2.jx * size, ly + st2.jy * size);
      cx.rotate(st2.rot);
      if (st2.flip) cx.scale(-1, 1);
      cx.font = strs[i];
      cx.textAlign = 'center';

      if (st2.glitch > 0) { // the shapeshift: rgb-split afterimages
        cx.globalCompositeOperation = 'lighter';
        cx.fillStyle = 'rgba(255,74,40,' + 0.5 * st2.glitch * alpha + ')';
        cx.fillText(ch2, -size * 0.045 * st2.glitch * 40 / 10, 0);
        cx.fillStyle = 'rgba(95,255,170,' + 0.45 * st2.glitch * alpha + ')';
        cx.fillText(ch2, size * 0.045 * st2.glitch * 40 / 10, 0);
        cx.globalCompositeOperation = 'source-over';
      }
      var glow = st2.lockFlash > 0 ? 0.35 * st2.lockFlash : 0;
      var ph = act2 ? (0.60 + 0.40 * U.hash01(i * 41.7)) * (0.92 + 0.08 * Math.sin(t * 1.3 + i * 2.1)) : 1;
      cx.fillStyle = 'rgba(' + inkR + ',' + inkG + ',' + inkB + ',' + Math.min(1, (0.96 + glow)) * alpha * st2.a * ph + ')';
      cx.fillText(ch2, 0, 0);
      if (glow > 0) { // settling letters kiss the print with light
        cx.globalCompositeOperation = 'lighter';
        cx.fillStyle = 'rgba(180,255,205,' + glow * 0.5 * alpha + ')';
        cx.fillText(ch2, 0, 0);
        cx.globalCompositeOperation = 'source-over';
      }
      cx.restore();
      x += widths[i] + tracking;
    }
    cx.restore();
  };

  /* per-letter state at time t — pure function, no memory */
  Wordmark.prototype.state = function (i, t, base, act2) {
    var C = this.C;
    var enterT = base + 0.10 * i;
    var since = t - enterT;
    var st = { face: this.pool[this.settleMap[i] % this.pool.length], jx: 0, jy: 0, rot: 0, flip: false, lower: false, glitch: 0, a: 1, lockFlash: 0 };

    if (since < 0) { st.a = 0; return st; }

    // scatter-in: a few hard jumps before finding the slot (the Perception move)
    if (since < 0.42) {
      var step = Math.floor(since / 0.085);
      var k0 = i * 131 + step * 17;
      var f = 1 - step / 5;
      st.jx = (U.hash01(k0) - 0.5) * 0.9 * f;
      st.jy = (U.hash01(k0 + 3) - 0.5) * 0.7 * f;
      st.rot = (U.hash01(k0 + 7) - 0.5) * 0.3 * f;
    }

    var settled = act2 && t >= C.settles[i];
    if (settled) {
      var sinceLock = t - C.settles[i];
      if (sinceLock < 0.5) st.lockFlash = 1 - sinceLock / 0.5;
      return st; // canonical face, upright, still
    }

    // cycling
    var wild = (!act2 && t >= C.wmIntensify) || (act2 && t < C.settleStart);
    var dur = (0.62 + U.hash01(i * 7.7) * 0.38) * (wild ? 0.55 : 1) * (act2 ? 0.8 : 1);
    var phase = U.hash01(i * 3.3) * dur;
    var k = Math.floor((t - base + phase) / dur);
    st.face = this.faceAt(i, k);
    var inCycle = (t - base + phase) - k * dur;
    if (inCycle < 0.13) st.glitch = 1 - inCycle / 0.13;

    // mischief: mirrored and lowered forms mid-cycle
    st.flip = U.hash01(i * 51 + k * 9) < (wild ? 0.22 : 0.10);
    st.lower = U.hash01(i * 77 + k * 5) < (wild ? 0.20 : 0.08);
    st.rot += (U.hash01(i * 11 + k * 3) - 0.5) * (wild ? 0.10 : 0.05);
    st.jy += (U.hash01(i * 19 + k * 13) - 0.5) * 0.06;
    return st;
  };

  window.Wordmark = Wordmark;
})();
