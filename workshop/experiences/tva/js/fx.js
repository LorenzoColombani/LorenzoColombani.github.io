/* ═══════════════════════════════════════════════════════════════════════
   fx.js — practical departments for the film frame (the 2D compositor):
   · TimelineFX — the phosphor line: branches, prunes, Yggdrasil, chinchilla
   · drawAmbience — the walnut room the film is lit in
   · halftone — the file-photo lab
   · makePaper / makeStamp — physical props, pre-rendered once
   · SynthScore — the homemade-mode evocation (original material only)
   All drawing is a deterministic function of the score clock t (seek-safe);
   only cosmetic spark particles carry state.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var TAU = Math.PI * 2;

  /* ---------- utilities ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash01(n) {
    var x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }
  function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }
  function lerp(a, b, p) { return a + (b - a) * p; }
  function outCubic(p) { p = clamp(p, 0, 1); return 1 - Math.pow(1 - p, 3); }
  function outQuint(p) { p = clamp(p, 0, 1); return 1 - Math.pow(1 - p, 5); }
  function inOutQuad(p) { p = clamp(p, 0, 1); return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }

  /* ═══════════════════ TIMELINE — the sacred line ═══════════════════ */
  function TimelineFX(cues) {
    this.cues = cues;
    this.paths = [];
    this.pulses = [];
    this.sparks = [];
    this.sparkDone = {};
    this.w = 1280; this.h = 720;
    this.build();
  }
  TimelineFX.prototype.resize = function (w, h) { this.w = w; this.h = h; };
  TimelineFX.prototype.build = function () {
    var C = this.cues, rnd = mulberry32(1607), i;
    this.paths.length = 0;

    var spine = [], n = 64, x, y;
    for (i = 0; i <= n; i++) {
      x = -0.06 + (1.12 * i) / n;
      y = 0.645 + (rnd() - 0.5) * 0.006 + Math.sin(i * 0.55) * 0.0035;
      spine.push([x, y]);
    }
    this.spine = { pts: spine, t0: C.wordmark + 0.15, dur: 2.6, w: 1.0, prune: 0, kind: 'spine' };
    this.paths.push(this.spine);

    var self = this;
    function fork(t0, ux, dir, lane, len, pruneT) {
      var pts = [], m = 26, j, px, py, cy = 0.645, ty = cy + dir * (0.055 + lane * 0.052);
      for (j = 0; j <= m; j++) {
        var p = j / m;
        px = ux + p * len;
        var s = inOutQuad(clamp(p * 2.2, 0, 1));
        py = lerp(cy, ty, s) + (rnd() - 0.5) * 0.004;
        pts.push([px, py]);
      }
      self.paths.push({ pts: pts, t0: t0, dur: 1.35, w: 0.62, prune: pruneT || 0, kind: 'branch' });
    }

    fork(C.wordmark + 6.2, 0.30, -1, 0, 0.34, 0);
    fork(C.wordmark + 9.5, 0.52, 1, 0, 0.30, 0);

    var castDir = [-1, 1, -1, 1, -1, 1, -1];
    for (i = 0; i < C.cast.length; i++) {
      fork(C.cast[i] + 0.1, 0.16 + i * 0.075, castDir[i], 1 + (i % 3), 0.30 + 0.05 * (i % 2),
           i === 2 ? C.prunes[0] : i === 4 ? C.prunes[1] : i === 6 ? C.prunes[2] : 0);
    }
    fork(C.doctrine + 0.45, 0.58, 1, 2, 0.24, C.prunes[1]);
    fork(C.doctrine + 2.6, 0.40, -1, 2, 0.22, C.prunes[2]);

    for (i = 0; i < C.crew.length; i++) {
      fork(C.crew[i] + 0.2, 0.20 + (i * 0.09) % 0.62, i % 2 ? 1 : -1, 0.4, 0.10, 0);
    }

    for (i = 0; i < C.evTicks.length; i++) this.pulses.push(C.evTicks[i]);

    this.buildTree();
    this.chin = this.chinPath();
  };
  TimelineFX.prototype.buildTree = function () {
    var segs = [], rnd = mulberry32(9101);
    var ROOT = [0.5, 0.80];
    function grow(x, y, ang, len, level, maxLevel) {
      var n = 10, pts = [[x, y]], j, cx = x, cy = y, a = ang;
      for (j = 1; j <= n; j++) {
        a += (rnd() - 0.5) * 0.22 + (level === 0 ? Math.sin(j * 0.9) * 0.05 : 0);
        a = lerp(a, -Math.PI / 2, 0.045);
        cx += Math.cos(a) * (len / n); cy += Math.sin(a) * (len / n);
        pts.push([cx, cy]);
      }
      segs.push({ pts: pts, level: level });
      if (level < maxLevel) {
        var kids = level === 0 ? 3 : (rnd() < 0.72 ? 2 : 3), k;
        for (k = 0; k < kids; k++) {
          var spread = (k - (kids - 1) / 2) * (0.62 - level * 0.05) + (rnd() - 0.5) * 0.3;
          grow(cx, cy, a + spread, len * (0.66 + rnd() * 0.1), level + 1, maxLevel);
        }
      }
    }
    grow(ROOT[0], ROOT[1], -Math.PI / 2, 0.30, 0, 4);
    var r;
    for (r = 0; r < 3; r++) grow(ROOT[0], ROOT[1], Math.PI / 2 + (r - 1) * 0.7, 0.085, 4, 4);
    this.tree = segs; this.treeRoot = ROOT;
    this.tips = [];
    for (r = 0; r < segs.length; r++) {
      if (segs[r].level >= 3 && r % 2 === 0) this.tips.push(segs[r].pts[segs[r].pts.length - 1]);
    }
  };
  TimelineFX.prototype.chinPath = function () {
    var P = [
      [0.10,0.52],[0.13,0.46],[0.20,0.38],[0.24,0.30],[0.25,0.20],[0.27,0.10],[0.32,0.11],
      [0.36,0.16],[0.37,0.24],[0.36,0.30],[0.40,0.26],[0.43,0.24],[0.46,0.14],[0.50,0.06],
      [0.55,0.09],[0.58,0.16],[0.57,0.24],[0.55,0.28],[0.60,0.30],[0.66,0.34],[0.73,0.38],
      [0.78,0.44],[0.83,0.51],[0.86,0.58],[0.88,0.62],[0.93,0.56],[0.97,0.44],[0.96,0.34],
      [0.93,0.30],[0.89,0.34],[0.88,0.40],[0.86,0.50],[0.83,0.62],[0.80,0.74],[0.70,0.80],
      [0.55,0.78],[0.42,0.78],[0.36,0.74],[0.28,0.66],[0.20,0.60],[0.16,0.58],[0.12,0.55],[0.10,0.52]
    ];
    var box = { x: 0.58, y: 0.32, w: 0.26, h: 0.38 };
    var out = [], i;
    for (i = 0; i < P.length; i++) out.push([box.x + P[i][0] * box.w, box.y + P[i][1] * box.h]);
    this.chinEye = [box.x + 0.235 * box.w, box.y + 0.44 * box.h];
    this.chinWhiskers = [
      [[box.x + 0.14 * box.w, box.y + 0.52 * box.h], [box.x + 0.015 * box.w, box.y + 0.46 * box.h]],
      [[box.x + 0.14 * box.w, box.y + 0.54 * box.h], [box.x + 0.01 * box.w, box.y + 0.56 * box.h]],
      [[box.x + 0.15 * box.w, box.y + 0.57 * box.h], [box.x + 0.03 * box.w, box.y + 0.64 * box.h]]
    ];
    return out;
  };

  /* ribbon renderer — the sacred timeline as woven light:
     several undulating strands, wide soft glow, a white-hot core,
     traveling energy pulses, a node where a branch is born. */
  TimelineFX.prototype.strokePath = function (cx, pts, frac, width, r, g, b, alpha, t, seed) {
    if (frac <= 0 || alpha <= 0) return;
    t = t || 0; seed = seed || 0;
    var w = this.w, h = this.h, i;
    var total = pts.length * clamp(frac, 0, 1);
    var n = Math.max(2, Math.floor(total));
    var sc = h / 720;

    // resolve drawn points (+ partial tip) in px, then normals
    var P = [];
    for (i = 0; i < n; i++) P.push([pts[i][0] * w, pts[i][1] * h]);
    if (n < pts.length) {
      var pp = total - (n - 1);
      var a0 = pts[n - 1], b0 = pts[Math.min(n, pts.length - 1)];
      P.push([lerp(a0[0], b0[0], clamp(pp, 0, 1)) * w, lerp(a0[1], b0[1], clamp(pp, 0, 1)) * h]);
    }
    var N = [];
    for (i = 0; i < P.length; i++) {
      var pA = P[Math.max(0, i - 1)], pB = P[Math.min(P.length - 1, i + 1)];
      var dx = pB[0] - pA[0], dy = pB[1] - pA[1];
      var L = Math.sqrt(dx * dx + dy * dy) || 1;
      N.push([-dy / L, dx / L]);
    }
    // undulation: free lengths wave, roots stay pinned
    function wavePt(i2, phase, amp) {
      var g2 = i2 / (P.length - 1);
      var offs = Math.sin(i2 * 0.42 + t * 1.6 + seed * 3.1 + phase) * amp * (0.25 + 0.75 * g2) * sc;
      return [P[i2][0] + N[i2][0] * offs, P[i2][1] + N[i2][1] * offs];
    }
    function trace(phase, amp) {
      cx.beginPath();
      var q0 = wavePt(0, phase, amp);
      cx.moveTo(q0[0], q0[1]);
      for (var k = 1; k < P.length; k++) { var q = wavePt(k, phase, amp); cx.lineTo(q[0], q[1]); }
    }
    cx.lineCap = 'round'; cx.lineJoin = 'round';
    // wide halo
    trace(0, 2.2 * width);
    cx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + (alpha * 0.07) + ')'; cx.lineWidth = width * 11 * sc; cx.stroke();
    cx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + (alpha * 0.16) + ')'; cx.lineWidth = width * 5 * sc; cx.stroke();
    // strands
    for (var s = -1; s <= 1; s++) {
      trace(s * 2.1, (1.6 + s * 0.5) * width);
      cx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + (alpha * (s === 0 ? 0.5 : 0.30)) + ')';
      cx.lineWidth = (s === 0 ? 1.5 : 0.9) * width * sc; cx.stroke();
    }
    // white-hot core
    trace(0, 1.2 * width);
    cx.strokeStyle = 'rgba(240,255,245,' + (alpha * 0.8) + ')'; cx.lineWidth = 0.75 * width * sc; cx.stroke();
    // birth node
    cx.fillStyle = 'rgba(230,255,238,' + alpha * 0.7 + ')';
    cx.beginPath(); cx.arc(P[0][0], P[0][1], 1.7 * width * sc, 0, TAU); cx.fill();
    // travelling pulses on longer paths
    if (P.length > 18 && alpha > 0.1) {
      for (var pu = 0; pu < 2; pu++) {
        var pos = (t * 0.16 + pu * 0.5 + seed * 0.23) % 1;
        var idx = Math.min(P.length - 1, Math.floor(pos * P.length));
        if (idx < 1) continue;
        var q1 = wavePt(idx, 0, 1.2 * width);
        var grd = cx.createRadialGradient(q1[0], q1[1], 0, q1[0], q1[1], 9 * sc);
        grd.addColorStop(0, 'rgba(235,255,242,' + alpha * 0.9 + ')');
        grd.addColorStop(0.35, 'rgba(' + r + ',' + g + ',' + b + ',' + alpha * 0.4 + ')');
        grd.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');
        cx.fillStyle = grd;
        cx.beginPath(); cx.arc(q1[0], q1[1], 9 * sc, 0, TAU); cx.fill();
      }
    }
  };

  TimelineFX.prototype.update = function (t, dt, cx) {
    var C = this.cues, w = this.w, h = this.h, i, p;
    cx.save();
    cx.globalCompositeOperation = 'lighter';
    var flat = !this.worldMode; // when the 3D world owns lines & tree, 2D keeps only the chinchilla

    var lineA = 0;
    if (t >= C.wordmark && t < C.evidence) lineA = 1;
    if (t >= C.cast[0] && t < C.doctrine) lineA = 0.75;
    if (t >= C.crew[0] && t < C.evidence) lineA = 0.4;
    if (t >= C.doctrine && t < C.crew[0]) lineA = 1;

    for (i = 0; flat && i < this.paths.length; i++) {
      p = this.paths[i];
      if (t < p.t0) continue;
      var frac = outCubic((t - p.t0) / p.dur);
      var alpha = lineA, R = 121, G = 255, B = 162;
      if (p.kind === 'spine') {
        alpha = (t < C.evidence) ? Math.max(lineA, 0.35) : 0;
        if (t >= C.evidence && t < C.turn) {
          alpha = 0.30 + 0.10 * Math.sin(t * 2.1);
          if (t > C.preTurn) alpha += (t - C.preTurn) / (C.turn - C.preTurn) * 0.5;
        }
        if (t >= C.turn) alpha = Math.max(0, 1 - (t - C.turn) / 1.2) * 0.5;
      } else {
        if (t >= C.evidence) alpha = Math.max(0, 1 - (t - C.evidence) / 2.0) * 0.4;
      }
      if (p.prune && t >= p.prune) {
        var pp = (t - p.prune);
        if (pp < 0.22) { R = 255; G = 122; B = 54; alpha = Math.max(alpha, 0.9); }
        else {
          alpha *= Math.max(0, 1 - (pp - 0.22) / 0.7); R = 224; G = 86; B = 31;
          if (!this.sparkDone[i]) { this.spawnSparks(p); this.sparkDone[i] = 1; }
        }
        if (t >= C.turn + 1.5 && t < C.stingClear) {
          alpha = 0.35 * outCubic((t - C.turn - 1.5) / 2.5) * (t > C.treeFade ? Math.max(0, 1 - (t - C.treeFade) / 1.9) : 1);
          R = 121; G = 255; B = 162;
        }
      }
      if (alpha > 0.003) this.strokePath(cx, p.pts, frac, p.w, R, G, B, alpha, t, i);
    }

    if (flat && t >= C.evidence && t < C.turn) {
      for (i = 0; i < this.pulses.length; i++) {
        var pt0 = this.pulses[i], age = t - pt0;
        if (age < 0 || age > 3.4) continue;
        var px = (age / 3.4) * 1.05 - 0.02, py = 0.645;
        var pa = Math.sin(Math.PI * clamp(age / 3.4, 0, 1)) * 0.8;
        cx.fillStyle = 'rgba(160,255,190,' + pa * 0.5 + ')';
        cx.beginPath(); cx.arc(px * w, py * h, 2.2, 0, TAU); cx.fill();
      }
    }

    if (flat && t >= C.turn && t < C.stingClear) {
      var fadeAll = t > C.treeFade ? Math.max(0, 1 - (t - C.treeFade) / 1.9) : 1;
      var fl = (t - C.turn);
      if (fl < 0.5) {
        cx.fillStyle = 'rgba(160,255,190,' + (0.20 * (1 - fl / 0.5)) + ')';
        cx.fillRect(0, 0, w, h);
      }
      for (i = 0; i < this.tree.length; i++) {
        var s = this.tree[i];
        var g0 = C.turn + s.level * 2.35 + (i % 5) * 0.24;
        var gfrac = outCubic((t - g0) / 2.7);
        if (gfrac <= 0) continue;
        var ta = (0.9 - s.level * 0.13) * fadeAll;
        var breathe = (t > C.still && t < C.createdBy) ? 0 : Math.sin(t * 1.3 + i) * 0.08;
        var still = (t > C.still && t < C.createdBy);
        this.strokePath(cx, s.pts, gfrac, 1.15 - s.level * 0.18, 121, 255, 162, clamp(ta + breathe, 0, 1), still ? 0 : t, i);
      }
      if (t > C.settleStart) {
        for (i = 0; i < this.tips.length; i++) {
          var tp = this.tips[i];
          var tw = (t > C.still && t < C.createdBy) ? 0.5 : 0.25 + 0.25 * hash01(i * 13 + Math.floor(t * 3));
          cx.fillStyle = 'rgba(200,255,215,' + tw * fadeAll * 0.5 + ')';
          cx.beginPath(); cx.arc(tp[0] * w, tp[1] * h, 1.6, 0, TAU); cx.fill();
        }
      }
      if (t > C.createdBy && t < C.treeFade + 2) {
        var rf = clamp((t - C.createdBy) / 0.6, 0, 1) * fadeAll;
        var rr = this.treeRoot;
        var grd = cx.createRadialGradient(rr[0] * w, rr[1] * h, 0, rr[0] * w, rr[1] * h, h * 0.16);
        grd.addColorStop(0, 'rgba(180,255,205,' + 0.30 * rf + ')');
        grd.addColorStop(1, 'rgba(180,255,205,0)');
        cx.fillStyle = grd; cx.fillRect(0, 0, w, h);
      }
    }

    if (t >= C.sting && t < C.attr1 + 1.2) {
      var cf = outQuint((t - C.sting - 0.1) / 2.6);
      var ca = t > C.attr1 - 0.6 ? Math.max(0, 1 - (t - (C.attr1 - 0.6)) / 1.6) : 1;
      this.strokePath(cx, this.chin, cf, 0.8, 121, 255, 162, 0.85 * ca, t * 0.4, 5);
      if (cf >= 1) {
        for (i = 0; i < this.chinWhiskers.length; i++) {
          var wk = this.chinWhiskers[i];
          var wf = outCubic((t - C.sting - 2.7 - i * 0.15) / 0.5);
          this.strokePath(cx, wk, wf, 0.4, 121, 255, 162, 0.6 * ca, 0, i);
        }
        var blink = (t > C.blink && t < C.blink + 0.13);
        if (!blink) {
          cx.fillStyle = 'rgba(220,255,230,' + 0.9 * ca + ')';
          cx.beginPath(); cx.arc(this.chinEye[0] * w, this.chinEye[1] * h, Math.max(2.4, h * 0.004), 0, TAU); cx.fill();
        }
      }
    }

    for (i = this.sparks.length - 1; flat && i >= 0; i--) {
      var sp = this.sparks[i];
      sp.x += sp.vx * dt; sp.y += sp.vy * dt; sp.vy += 0.35 * dt; sp.life -= dt;
      if (sp.life <= 0) { this.sparks.splice(i, 1); continue; }
      cx.fillStyle = 'rgba(255,140,60,' + Math.min(1, sp.life * 1.4) + ')';
      cx.fillRect(sp.x * w, sp.y * h, 1.6, 1.6);
    }
    cx.restore();
  };
  TimelineFX.prototype.spawnSparks = function (path) {
    var rnd = mulberry32(Math.floor(path.t0 * 97));
    for (var i = 0; i < 22; i++) {
      var pt = path.pts[Math.floor(rnd() * path.pts.length)];
      this.sparks.push({ x: pt[0], y: pt[1], vx: (rnd() - 0.5) * 0.06, vy: rnd() * 0.02, life: 0.5 + rnd() * 0.5 });
    }
  };

  /* ═══════════════════ AMBIENCE — the walnut room ═══════════════════ */
  var MOODS = {
    void:  { top: '#191009', mid: '#120d08', glow: 'rgba(224,150,60,0.05)', gy: 0.42, green: 0 },
    desk:  { top: '#2a1c0d', mid: '#171008', glow: 'rgba(232,168,80,0.16)', gy: 0.40, green: 0 },
    dark:  { top: '#150e08', mid: '#0e0a06', glow: 'rgba(224,150,60,0.07)', gy: 0.45, green: 0.02 },
    hush:  { top: '#131009', mid: '#0d0b07', glow: 'rgba(190,150,90,0.05)', gy: 0.5,  green: 0.05 },
    grove: { top: '#0f1409', mid: '#0b0f08', glow: 'rgba(150,255,180,0.06)', gy: 0.55, green: 0.12 },
    alarm: { top: '#26100a', mid: '#140b07', glow: 'rgba(224,86,31,0.11)', gy: 0.45, green: 0.03 },
    tail:  { top: '#100c07', mid: '#0a0806', glow: 'rgba(200,160,90,0.04)', gy: 0.5,  green: 0 }
  };
  function drawAmbience1(cx, w, h, m, alpha) {
    cx.globalAlpha = alpha;
    var grd = cx.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, m.top); grd.addColorStop(0.55, m.mid); grd.addColorStop(1, '#080604');
    cx.fillStyle = grd; cx.fillRect(0, 0, w, h);
    var g2 = cx.createRadialGradient(w / 2, h * m.gy, 0, w / 2, h * m.gy, Math.max(w, h) * 0.62);
    g2.addColorStop(0, m.glow); g2.addColorStop(1, 'rgba(0,0,0,0)');
    cx.fillStyle = g2; cx.fillRect(0, 0, w, h);
    if (m.green > 0) {
      var g3 = cx.createLinearGradient(0, h, 0, h * 0.3);
      g3.addColorStop(0, 'rgba(110,240,160,' + m.green + ')'); g3.addColorStop(1, 'rgba(110,240,160,0)');
      cx.fillStyle = g3; cx.fillRect(0, 0, w, h);
    }
    cx.globalAlpha = 1;
  }
  function drawAmbience(cx, w, h, prevName, name, mix) {
    drawAmbience1(cx, w, h, MOODS[prevName] || MOODS.void, 1);
    if (mix > 0) drawAmbience1(cx, w, h, MOODS[name] || MOODS.void, clamp(mix, 0, 1));
  }

  /* ═══════════════════ HALFTONE — the file-photo lab ═══════════════════ */
  function halftone(img, outW, outH, cell) {
    var src = document.createElement('canvas'); src.width = outW; src.height = outH;
    var sx = src.getContext('2d');
    var ir = img.width / img.height, or_ = outW / outH, dw, dh;
    if (ir > or_) { dh = outH; dw = outH * ir; } else { dw = outW; dh = outW / ir; }
    sx.drawImage(img, (outW - dw) / 2, (outH - dh) * 0.28, dw, dh);
    var data = sx.getImageData(0, 0, outW, outH).data;

    var out = document.createElement('canvas'); out.width = outW; out.height = outH;
    var ox = out.getContext('2d');
    ox.fillStyle = '#d9c084'; ox.fillRect(0, 0, outW, outH);
    ox.fillStyle = '#43290f';
    var ang = -12 * Math.PI / 180, ca = Math.cos(ang), sa = Math.sin(ang);
    var diag = Math.sqrt(outW * outW + outH * outH);
    for (var v = -diag; v < diag; v += cell) {
      for (var u = -diag; u < diag; u += cell) {
        var x = Math.round(outW / 2 + u * ca - v * sa);
        var y = Math.round(outH / 2 + u * sa + v * ca);
        if (x < 0 || y < 0 || x >= outW || y >= outH) continue;
        var idx = (y * outW + x) * 4;
        var lum = (0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]) / 255;
        var rr = Math.pow(1 - lum, 0.85) * cell * 0.62;
        if (rr < 0.4) continue;
        ox.beginPath(); ox.arc(x, y, rr, 0, TAU); ox.fill();
      }
    }
    ox.fillStyle = 'rgba(214,178,108,0.13)'; ox.fillRect(0, 0, outW, outH);
    ox.fillStyle = 'rgba(236,215,168,0.16)'; ox.fillRect(0, outH * 0.62, outW, outH * 0.07);
    return out;
  }

  /* ═══════════════════ PROPS — paper & stamps, made once ═══════════════════ */
  function makePaper(W, H) {
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var cx = cv.getContext('2d');
    var grd = cx.createLinearGradient(0, 0, W * 0.2, H);
    grd.addColorStop(0, '#e2cb99'); grd.addColorStop(0.46, '#d6bc7d'); grd.addColorStop(1, '#cbae6e');
    cx.fillStyle = grd; cx.fillRect(0, 0, W, H);
    // fibre noise
    var nd = cx.getImageData(0, 0, W, H), d = nd.data, rnd = mulberry32(77);
    for (var i = 0; i < d.length; i += 4) {
      var v = (rnd() - 0.5) * 17;
      d[i] += v; d[i + 1] += v; d[i + 2] += v * 0.8;
    }
    cx.putImageData(nd, 0, 0);
    // aged edges
    var eg = cx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.32, W / 2, H / 2, Math.max(W, H) * 0.72);
    eg.addColorStop(0, 'rgba(96,62,18,0)'); eg.addColorStop(1, 'rgba(96,62,18,0.38)');
    cx.fillStyle = eg; cx.fillRect(0, 0, W, H);
    // punch strip
    cx.strokeStyle = 'rgba(90,58,20,0.5)'; cx.lineWidth = 2;
    cx.beginPath(); cx.moveTo(W * 0.045, 0); cx.lineTo(W * 0.045, H); cx.stroke();
    cx.fillStyle = 'rgba(70,44,14,0.34)';
    for (var hy = H * 0.06; hy < H; hy += H * 0.115) {
      cx.beginPath(); cx.arc(W * 0.028, hy, W * 0.008, 0, TAU); cx.fill();
    }
    // corner fold shadow
    cx.fillStyle = 'rgba(60,36,10,0.16)';
    cx.beginPath(); cx.moveTo(W, H - 46); cx.lineTo(W, H); cx.lineTo(W - 46, H); cx.closePath(); cx.fill();
    return cv;
  }

  function makeStamp(text, color, opts) {
    opts = opts || {};
    var fs = opts.fontSize || 84, pad = opts.pad || 26, S = 2; // render 2x
    var probe = document.createElement('canvas').getContext('2d');
    probe.font = '400 ' + fs * S + 'px Righteous, sans-serif';
    var tw = probe.measureText(text).width;
    var W = Math.ceil(tw + pad * 2 * S + 20 * S), H = Math.ceil(fs * S * 1.22 + pad * S * 1.4);
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var cx = cv.getContext('2d');
    cx.strokeStyle = color; cx.lineWidth = 5 * S;
    roundRect(cx, 4 * S, 4 * S, W - 8 * S, H - 8 * S, 14 * S); cx.stroke();
    if (opts.doubleBorder) { roundRect(cx, 11 * S, 11 * S, W - 22 * S, H - 22 * S, 9 * S); cx.lineWidth = 2 * S; cx.stroke(); }
    cx.font = '400 ' + fs * S + 'px Righteous, sans-serif';
    cx.fillStyle = color; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.fillText(text, W / 2, H / 2 + fs * S * 0.06);
    // worn ink: punch speckle holes out
    cx.globalCompositeOperation = 'destination-out';
    var rnd = mulberry32(text.length * 131 + 7);
    var holes = (W * H) / (46 * S);
    for (var i = 0; i < holes; i++) {
      var hx = rnd() * W, hy2 = rnd() * H, hr = rnd() * 2.4 * S;
      cx.globalAlpha = 0.25 + rnd() * 0.6;
      cx.beginPath(); cx.arc(hx, hy2, hr, 0, TAU); cx.fill();
    }
    cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
    return cv;
  }
  function roundRect(cx, x, y, w, h, r) {
    cx.beginPath();
    cx.moveTo(x + r, y);
    cx.arcTo(x + w, y, x + w, y + h, r);
    cx.arcTo(x + w, y + h, x, y + h, r);
    cx.arcTo(x, y + h, x, y, r);
    cx.arcTo(x, y, x + w, y, r);
    cx.closePath();
  }

  /* ═══════════════ SYNTH — homemade evocation (original material) ═══════════════ */
  function SynthScore() {
    this.ctx = null; this.startedAt = 0; this.pausedAt = 0; this.playing = false;
    this.duration = 148.7;
  }
  SynthScore.prototype.start = function () {
    var AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.playing = true;
    this.startedAt = this.ctx.currentTime;
    this.schedule();
  };
  SynthScore.prototype.t = function () {
    if (!this.ctx) return 0;
    return this.playing ? this.ctx.currentTime - this.startedAt : this.pausedAt;
  };
  SynthScore.prototype.pause = function () { if (this.ctx && this.playing) { this.pausedAt = this.t(); this.ctx.suspend(); this.playing = false; } };
  SynthScore.prototype.resume = function () { if (this.ctx && !this.playing) { this.ctx.resume(); this.playing = true; } };
  SynthScore.prototype.schedule = function () {
    var ctx = this.ctx, t0 = this.startedAt, i;
    var master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
    var tickBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.03), ctx.sampleRate);
    var td = tickBuf.getChannelData(0);
    for (i = 0; i < td.length; i++) td[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / td.length, 2);
    var beat = 60 / 107.7;
    for (var bt = 0; bt < this.duration - 4; bt += beat) {
      var src = ctx.createBufferSource(); src.buffer = tickBuf;
      var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2800; bp.Q.value = 6;
      var g = ctx.createGain();
      g.gain.value = (bt > 10.4 && bt < 52) || bt > 110.4 ? 0.10 : 0.16;
      src.connect(bp); bp.connect(g); g.connect(master);
      src.start(t0 + bt);
    }
    var shape = [[0, 0.05], [3, 0.12], [10.4, 0.3], [52, 0.16], [57.7, 0.24], [83.8, 0.10], [108, 0.22], [110.5, 0.34], [134, 0.12], [144, 0.0]];
    var freqs = [55, 55.7, 110.4, 164.8];
    for (i = 0; i < freqs.length; i++) {
      var o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = freqs[i];
      var og = ctx.createGain(); og.gain.setValueAtTime(0, t0);
      for (var s = 0; s < shape.length; s++) og.gain.linearRampToValueAtTime(shape[s][1] * (i < 2 ? 1 : 0.4), t0 + shape[s][0]);
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
      o.connect(og); og.connect(lp); lp.connect(master);
      o.start(t0); o.stop(t0 + this.duration);
    }
    var motif = [220, 261.6, 246.9, 196, 220], motifAt = [10.6, 57.9, 110.7];
    for (var m = 0; m < motifAt.length; m++) {
      for (i = 0; i < motif.length; i++) {
        var mo = ctx.createOscillator(); mo.type = 'sine'; mo.frequency.value = motif[i] * (m === 2 ? 2 : 1);
        var mg = ctx.createGain();
        var at = t0 + motifAt[m] + i * 0.9;
        mg.gain.setValueAtTime(0, at); mg.gain.linearRampToValueAtTime(0.16, at + 0.12);
        mg.gain.exponentialRampToValueAtTime(0.001, at + 1.6);
        mo.connect(mg); mg.connect(master);
        mo.start(at); mo.stop(at + 1.8);
      }
    }
    var big = [10.449, 110.469];
    for (i = 0; i < big.length; i++) {
      var nb = ctx.createBufferSource(); nb.buffer = tickBuf; nb.playbackRate.value = 0.14;
      var ng = ctx.createGain(); ng.gain.value = 0.6;
      var nlp = ctx.createBiquadFilter(); nlp.type = 'lowpass'; nlp.frequency.value = 130;
      nb.connect(nlp); nlp.connect(ng); ng.connect(master);
      nb.start(t0 + big[i]);
    }
  };

  /* ═══════════════ BACKDROPS — the prop shop ═══════════════
     Macro set-pieces behind the credits, in the spirit of the reference:
     one lit object, heavy defocus, deep negative space. Geometry is drawn
     small and upscaled twice (poor-man's lens blur); the grade does the rest. */
  var Backdrops = (function () {
    var cache = {};
    function soften(draw, w2, h2, passes) {
      var small = document.createElement('canvas');
      small.width = 240; small.height = 135;
      draw(small.getContext('2d'), 240, 135);
      var out = small, i;
      for (i = 0; i < (passes || 2); i++) {
        var big = document.createElement('canvas');
        big.width = out.width * 2; big.height = out.height * 2;
        var bx = big.getContext('2d');
        bx.imageSmoothingEnabled = true; bx.imageSmoothingQuality = 'high';
        bx.drawImage(out, 0, 0, big.width, big.height);
        out = big;
      }
      return out;
    }
    var MAKERS = {
      ledger: function (cx, w, h) {
        cx.fillStyle = '#171008'; cx.fillRect(0, 0, w, h);
        cx.save(); cx.translate(w * 0.62, h * 0.55); cx.rotate(-0.22);
        cx.fillStyle = '#9b8354'; cx.fillRect(-w * 0.55, -h * 0.4, w * 1.0, h * 0.85);
        cx.strokeStyle = 'rgba(90,58,20,0.55)'; cx.lineWidth = 1.2;
        for (var y = -h * 0.32; y < h * 0.42; y += 7) { cx.beginPath(); cx.moveTo(-w * 0.5, y); cx.lineTo(w * 0.4, y); cx.stroke(); }
        cx.fillStyle = 'rgba(60,39,18,0.7)';
        var rnd = mulberry32(4);
        for (var r2 = 0; r2 < 26; r2++) cx.fillRect(-w * 0.46 + rnd() * w * 0.7, -h * 0.32 + Math.floor(rnd() * 10) * 7 - 3, 6 + rnd() * 26, 2.4);
        cx.strokeStyle = 'rgba(160,40,20,0.8)'; cx.lineWidth = 3;
        cx.beginPath(); cx.arc(w * 0.12, -h * 0.05, 18, 0, TAU); cx.stroke();
        cx.restore();
      },
      clock: function (cx, w, h) {
        cx.fillStyle = '#0d0a07'; cx.fillRect(0, 0, w, h);
        var cxx = w * 0.86, cy = h * 0.62, R = h * 0.85;
        cx.fillStyle = '#8f8672';
        cx.beginPath(); cx.arc(cxx, cy, R, 0, TAU); cx.fill();
        cx.fillStyle = '#7a7160';
        cx.beginPath(); cx.arc(cxx, cy, R * 0.97, 0, TAU); cx.fill();
        for (var a = 0; a < TAU; a += TAU / 60) {
          var big = (Math.round(a / (TAU / 60)) % 5 === 0);
          cx.strokeStyle = big ? '#2b2318' : 'rgba(43,35,24,0.6)';
          cx.lineWidth = big ? 3.4 : 1.4;
          cx.beginPath();
          cx.moveTo(cxx + Math.cos(a) * R * 0.84, cy + Math.sin(a) * R * 0.84);
          cx.lineTo(cxx + Math.cos(a) * R * (big ? 0.72 : 0.78), cy + Math.sin(a) * R * (big ? 0.72 : 0.78));
          cx.stroke();
        }
        var tapes = ['#2f8f82', '#27796d', '#379d8e', '#a8834f'];
        for (var t2 = 0; t2 < 4; t2++) {
          var aa = Math.PI * 0.86 + t2 * 0.16;
          cx.save();
          cx.translate(cxx + Math.cos(aa) * R * 0.62, cy + Math.sin(aa) * R * 0.62);
          cx.rotate(aa + Math.PI / 2);
          cx.fillStyle = tapes[t2];
          cx.fillRect(-3.5, -R * 0.16, 7, R * 0.30);
          cx.restore();
        }
      },
      dial: function (cx, w, h) {
        cx.fillStyle = '#120d08'; cx.fillRect(0, 0, w, h);
        var cxx = w * 0.2, cy = h * 0.42, R = h * 0.5;
        cx.fillStyle = '#241a10';
        cx.beginPath(); cx.arc(cxx, cy, R, 0, TAU); cx.fill();
        cx.strokeStyle = '#4a3a22';
        for (var a = 0; a < TAU; a += TAU / 24) {
          cx.lineWidth = 2;
          cx.beginPath();
          cx.moveTo(cxx + Math.cos(a) * R * 0.92, cy + Math.sin(a) * R * 0.92);
          cx.lineTo(cxx + Math.cos(a) * R * 0.78, cy + Math.sin(a) * R * 0.78);
          cx.stroke();
        }
        cx.fillStyle = '#33261682';
        for (var k = 0; k < 6; k++) {
          var kx = w * 0.42 + k * w * 0.095, ky = h * 0.78;
          cx.fillStyle = '#e8dcc0';
          cx.beginPath(); cx.arc(kx, ky, w * 0.034, 0, TAU); cx.fill();
          cx.fillStyle = '#241a10';
          cx.beginPath(); cx.arc(kx, ky - 2, w * 0.028, 0, TAU); cx.fill();
          cx.fillStyle = '#e8dcc0';
          cx.beginPath(); cx.arc(kx, ky - 3, w * 0.024, 0, TAU); cx.fill();
        }
      },
      matrix: function (cx, w, h) {
        cx.fillStyle = '#0b0805'; cx.fillRect(0, 0, w, h);
        var rnd = mulberry32(9);
        for (var gy = 0; gy < 9; gy++) for (var gx = 0; gx < 20; gx++) {
          var x = w * 0.08 + gx * w * 0.046, y = h * 0.2 + gy * h * 0.075;
          var lit = rnd() < 0.16;
          cx.fillStyle = lit ? '#e88c2a' : '#241a12';
          cx.beginPath(); cx.arc(x, y, w * 0.011, 0, TAU); cx.fill();
        }
      },
      toggles: function (cx, w, h) {
        cx.fillStyle = '#100b07'; cx.fillRect(0, 0, w, h);
        cx.fillStyle = '#1e150c'; cx.fillRect(0, h * 0.55, w, h * 0.45);
        for (var k = 0; k < 5; k++) {
          var x = w * 0.3 + k * w * 0.13, y = h * 0.66;
          cx.strokeStyle = '#5a4a32'; cx.lineWidth = 5;
          cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x + 6, y - h * 0.13); cx.stroke();
          cx.fillStyle = '#8a7a5a';
          cx.beginPath(); cx.arc(x + 7, y - h * 0.14, 4.5, 0, TAU); cx.fill();
        }
      },
      typewriter: function (cx, w, h) {
        cx.fillStyle = '#0e0906'; cx.fillRect(0, 0, w, h);
        cx.fillStyle = '#8c1f14';
        cx.beginPath();
        cx.moveTo(0, h); cx.lineTo(0, h * 0.66);
        cx.quadraticCurveTo(w * 0.5, h * 0.42, w, h * 0.7);
        cx.lineTo(w, h); cx.closePath(); cx.fill();
        cx.fillStyle = '#a3271a';
        cx.fillRect(0, h * 0.88, w, h * 0.12);
        var rnd = mulberry32(11);
        for (var row = 0; row < 2; row++) {
          for (var k2 = 0; k2 < 9; k2++) {
            var kx2 = w * (0.16 + row * 0.05) + k2 * w * 0.077, ky2 = h * (0.68 + row * 0.115);
            cx.fillStyle = '#0d0a07';
            cx.beginPath(); cx.arc(kx2 + 2, ky2 + 2, w * 0.026, 0, TAU); cx.fill();
            cx.fillStyle = '#ded2b4';
            cx.beginPath(); cx.arc(kx2, ky2, w * 0.024, 0, TAU); cx.fill();
          }
        }
      },
      drawers: function (cx, w, h) {
        cx.fillStyle = '#0d0906'; cx.fillRect(0, 0, w, h);
        for (var gy = 0; gy < 3; gy++) for (var gx = 0; gx < 4; gx++) {
          var x = w * 0.06 + gx * w * 0.24, y = h * 0.05 + gy * h * 0.33;
          cx.fillStyle = '#382614';
          roundRect(cx, x, y, w * 0.215, h * 0.29, 4); cx.fill();
          cx.fillStyle = '#241708';
          roundRect(cx, x + 4, y + 4, w * 0.215 - 8, h * 0.29 - 8, 3); cx.fill();
          cx.fillStyle = '#c8a85a';
          cx.fillRect(x + w * 0.075, y + h * 0.10, w * 0.065, h * 0.055);
          cx.fillStyle = '#40301a';
          cx.fillRect(x + w * 0.078, y + h * 0.108, w * 0.059, h * 0.039);
        }
      },
      pamphlet: function (cx, w, h) {
        cx.fillStyle = '#210c07'; cx.fillRect(0, 0, w, h);
        cx.save(); cx.translate(w * 0.52, h * 0.56); cx.rotate(-0.1);
        cx.fillStyle = '#b8a67c'; cx.fillRect(-w * 0.42, -h * 0.42, w * 0.84, h * 0.86);
        cx.fillStyle = '#8c1f14'; cx.fillRect(-w * 0.42, -h * 0.42, w * 0.84, h * 0.18);
        cx.fillStyle = '#2b2318';
        for (var p2 = 0; p2 < 6; p2++) {
          var px = -w * 0.3 + p2 * w * 0.115, py = h * 0.08;
          cx.beginPath(); cx.arc(px, py - 14, 5, 0, TAU); cx.fill();
          cx.fillRect(px - 4.5, py - 8, 9, 14);
        }
        cx.fillStyle = 'rgba(43,35,24,0.5)';
        for (var l2 = 0; l2 < 5; l2++) cx.fillRect(-w * 0.32, -h * 0.12 + l2 * 12, w * 0.5, 3);
        cx.restore();
      },
      mosaic: function (cx, w, h) {
        cx.fillStyle = '#140b06'; cx.fillRect(0, 0, w, h);
        var cxx = w * 0.5, cy = h * 1.15;
        for (var a = -Math.PI; a < 0; a += Math.PI / 14) {
          var warm = (Math.round(a / (Math.PI / 14)) % 2 === 0);
          for (var rr2 = h * 0.35; rr2 < h * 1.15; rr2 += 13) {
            var tx = cxx + Math.cos(a) * rr2, ty = cy + Math.sin(a) * rr2;
            if (tx < -12 || tx > w + 12 || ty < -12 || ty > h + 12) continue;
            cx.fillStyle = warm ? '#a3372066' : '#d8c69466';
            cx.save(); cx.translate(tx, ty); cx.rotate(a);
            cx.fillRect(-4.5, -4.5, 9, 9);
            cx.restore();
          }
        }
      },
      reels: function (cx, w, h) {
        cx.fillStyle = '#0c0906'; cx.fillRect(0, 0, w, h);
        // static plate; spokes are drawn live
        cx.fillStyle = '#1c1610';
        cx.beginPath(); cx.arc(w * 0.30, h * 0.42, h * 0.34, 0, TAU); cx.fill();
        cx.beginPath(); cx.arc(w * 0.72, h * 0.46, h * 0.28, 0, TAU); cx.fill();
        cx.strokeStyle = '#0a0705'; cx.lineWidth = 5;
        cx.beginPath(); cx.moveTo(w * 0.05, h * 0.83); cx.lineTo(w * 0.95, h * 0.86); cx.stroke();
      }
    };
    function get(kind) {
      if (!cache[kind]) cache[kind] = soften(MAKERS[kind], 960, 540, 2);
      return cache[kind];
    }
    return { get: get };
  })();

  window.FX = {
    TimelineFX: TimelineFX,
    drawAmbience: drawAmbience,
    halftone: halftone,
    makePaper: makePaper,
    makeStamp: makeStamp,
    Backdrops: Backdrops,
    SynthScore: SynthScore,
    util: { mulberry32: mulberry32, hash01: hash01, clamp: clamp, lerp: lerp, outCubic: outCubic }
  };
})();
