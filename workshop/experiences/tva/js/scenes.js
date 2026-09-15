/* ═══════════════════════════════════════════════════════════════════════
   scenes.js — the screenplay made of paint calls. Every painter is a pure
   function of the score clock t; enter/exit is just windowing. The machine
   speaks Righteous & Courier; the person answers in Fraunces & Special
   Elite. Letters jump before they settle — scattering through time.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var U = window.FX.util;
  var VPH = 0; // CSS-pixel viewport height, set by main.js resize(); 0 = never told (desktop-safe)

  /* THE PHONE TYPE GATE (r6): the film's type is drawn proportional to H,
     which reads at desktop heights and physically vanishes on phone glass.
     Every font size passes through here: s in the caller's units, k its
     on-screen scale (1 for print-space; the paper scale for page-space).
     Desktop (H >= 520) and display sizes (>= 16 on-screen px) pass through
     UNTOUCHED; below that, a compressive boost — up to ~1.65x at the smallest
     — lifts readability while keeping the hierarchy (a hard floor would
     flatten the file's voice). */
  function fpx(s, k, H) {
    /* r7 CORRECTION: H is the backing store (CSS px × DPR cap) — judging
       phone-ness or the 16px target in it made this gate dead code on real
       phones (measured: iPhone landscape H=780 ≥ 520, no lift ever fired).
       Phone-ness and the target are CSS-pixel questions. */
    var ch = VPH > 0 ? VPH : H;
    if (ch >= 520) return s;
    var v = s * k * (ch / H); // on-screen CSS px
    if (v >= 16) return s;
    return s * (1 + 0.65 * (1 - v / 16));
  }

  /* ---------- shared typography helpers ---------- */
  function tracked(cx, text, x, y, em, align) {
    // manual letterspacing; align: 'center' | 'left' | 'right'
    var m = /(\d+(?:\.\d+)?)px/.exec(cx.font);
    var fs = m ? parseFloat(m[1]) : 16;
    var sp = em * fs, total = 0, i;
    for (i = 0; i < text.length; i++) total += cx.measureText(text[i]).width + (i < text.length - 1 ? sp : 0);
    var cur = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
    var old = cx.textAlign; cx.textAlign = 'left';
    for (i = 0; i < text.length; i++) {
      cx.fillText(text[i], cur, y);
      cur += cx.measureText(text[i]).width + sp;
    }
    cx.textAlign = old;
    return total;
  }
  function twidth(cx, text, em) {
    // measure a tracked() run without drawing it
    var m = /(\d+(?:\.\d+)?)px/.exec(cx.font);
    var fs = m ? parseFloat(m[1]) : 16;
    var sp = em * fs, w = 0, i;
    for (i = 0; i < text.length; i++) w += cx.measureText(text[i]).width + (i < text.length - 1 ? sp : 0);
    return w;
  }
  /* hairline schematic rule with end ticks + a node — the drafting grammar */
  function rule(cx, x0, y0, x1, alpha) {
    cx.save();
    cx.strokeStyle = 'rgba(238,230,210,' + (alpha * 0.4) + ')';
    cx.lineWidth = 1;
    cx.beginPath(); cx.moveTo(x0, y0 + 0.5); cx.lineTo(x1, y0 + 0.5); cx.stroke();
    cx.beginPath(); cx.moveTo(x0, y0 - 3.5); cx.lineTo(x0, y0 + 4.5); cx.stroke();
    cx.fillStyle = 'rgba(238,230,210,' + (alpha * 0.7) + ')';
    cx.beginPath(); cx.arc(x1, y0 + 0.5, 1.8, 0, Math.PI * 2); cx.fill();
    cx.restore();
  }
  /* soft dark pool behind a text anchor so type reads over any prop */
  function scrim(cx, x, y, r, a) {
    var g = cx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(6,4,2,' + a + ')');
    g.addColorStop(1, 'rgba(6,4,2,0)');
    cx.fillStyle = g;
    cx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function typeN(text, t, t0, cps) {
    if (t < t0) return 0;
    return U.clamp(Math.floor((t - t0) * cps), 0, text.length);
  }
  /* the Perception move: text jumps around before settling in place */
  function jump(id, t, t0, amp) {
    if (t < t0) return null;
    var since = t - t0;
    if (window.__REDUCED) return { dx: 0, dy: 0, rot: 0, a: U.clamp(since / 0.4, 0, 1), flash: 0 };
    if (since >= 0.42) return { dx: 0, dy: 0, rot: 0, a: 1, flash: since < 0.6 ? (0.6 - since) / 0.18 * 0.3 : 0 };
    var step = Math.floor(since / 0.085), f = 1 - step / 5, k = id * 173 + step * 31;
    return {
      dx: (U.hash01(k) - 0.5) * 2 * amp * f,
      dy: (U.hash01(k + 5) - 0.5) * 1.4 * amp * f,
      rot: (U.hash01(k + 9) - 0.5) * 0.06 * f,
      a: 0.55 + 0.45 * (step / 5),
      flash: 0
    };
  }
  function fadeRise(t, t0, dur, rise) {
    if (t < t0) return null;
    var p = U.outCubic((t - t0) / dur);
    return { a: p, dy: (1 - p) * rise };
  }
  function stampSlam(cx, img, x, y, rot, t, t0, scale) {
    if (t < t0) return;
    var p = t - t0, sc = (scale || 1) * 0.5; // stamps rendered @2x
    var over = p < 0.14 ? 1 + 2.6 * Math.pow(1 - p / 0.14, 2) : 1;
    var jx = 0, jy = 0;
    if (p < 0.1 && !window.__REDUCED) {
      jx = (U.hash01(Math.floor(p * 36) * 7 + 1) - 0.5) * 6;
      jy = (U.hash01(Math.floor(p * 36) * 7 + 4) - 0.5) * 6;
    }
    cx.save();
    cx.translate(x + jx, y + jy);
    cx.rotate(rot);
    cx.scale(sc * over, sc * over);
    cx.globalAlpha *= Math.min(1, p / 0.05) * 0.92;
    cx.drawImage(img, -img.width / 2, -img.height / 2);
    cx.restore();
  }

  /* ---------- content ---------- */
  var DEVS = ['LAWYER.', 'MEDIATOR.', 'NEGOTIATOR.', 'CONSULTANT.', 'AI BUILDER.', 'WRITER.', 'TEACHER.'];
  var CAST = [
    { role: 'THE LAWYER',     font: '400 {s}px "Bodoni Moda", serif' },
    { role: 'THE MEDIATOR',   font: 'italic 300 {s}px "Fraunces", serif' },
    { role: 'THE NEGOTIATOR', font: '400 {s}px "Alfa Slab One", serif' },
    { role: 'THE CONSULTANT', font: '600 {s}px "Jost", sans-serif', track: 0.14 },
    { role: 'THE AI BUILDER', font: '400 {s}px "VT323", monospace' },
    { role: 'THE WRITER',     font: '400 {s}px "Special Elite", monospace' },
    { role: 'THE TEACHER',    font: '400 {s}px "Yeseva One", serif' }
  ];
  var CREW = [
    [ ['PRODUCTION DESIGN', 'Design Thinking', ''],
      ['EDITING', 'Minimalism', 'cuts everything that doesn’t serve the story'] ],
    [ ['CONTINUITY', 'Knowledge Management', ''],
      ['SCRIPT DOCTOR', 'Negotiation', 'rewrites until both leads can say yes'] ],
    [ ['STUNT DEPARTMENT', 'Workflow Automation', 'takes the repetitive hits'],
      ['SET DRESSING', 'Decluttering', 'only what the scene needs remains'] ],
    [ ['GAFFER', 'Learning Design', 'lights the scene so everyone can see'],
      ['VISUAL EFFECTS', 'AI', 'the new power tool'] ],
    [ ['QUALITY CONTROL', 'Philosophy', 'is what we think we shot on the film?'],
      ['ORIGINAL STORY', 'Storytelling', ''],
      ['ON-SET MORALE', 'Games', 'play, not payload'] ],
    [ ['LINE PRODUCER', 'Lean', 'no wasted takes'],
      ['CINEMATOGRAPHY', 'Multi-Angle Analysis', 'every scene from more than one camera'] ],
    [ ['LOCATION SCOUT', 'Systems-Reading', 'finds where the story actually lives'],
      ['SECOND UNIT', 'Gamification', 'the fun, shot in parallel'] ]
  ];
  /* the contradiction pile (his call, 2026-07-21): each exhibit escapes another
     drawer, then E deadpans against the whole desk of evidence */
  var EXHIBITS = [
    ['EXHIBIT A', 'trained as a lawyer — published a thesis on Aristotle.'],
    ['EXHIBIT B', 'works as a BI consultant.'],
    ['EXHIBIT C', 'creates video content.'],
    ['EXHIBIT D', 'created an NGO on AI.'],
    ['EXHIBIT E', 'enjoys minimalism.']
  ];
  var ATTR1_SHOW = [
    'Title design inspired by the main titles of LOKI (Marvel Studios, Disney+).',
    'Series created for television by Michael Waldron.',
    'Main-title sequence by Perception.',
    'Original series score by Natalie Holt — “TVA (From ‘Loki’/Score)”,',
    'from the album TVA, ℗ 2021 Marvel Music, Inc.',
    'LOKI and all related names, marks, and music are the property of Marvel & Disney.'
  ];
  var ATTR1_HOME = [
    'Title design inspired by the main titles of LOKI (Marvel Studios, Disney+).',
    'Series created for television by Michael Waldron.',
    'Main-title sequence by Perception.',
    'This cut uses no series material — the score is a homemade evocation.',
    'LOKI and all related names and marks are the property of Marvel & Disney.'
  ];
  var ATTR1_FONTS = 'Logo letterforms after the series wordmark — US Angel · Old English Five · ARB 85 Poster Script · Cloister Black.';
  var ATTR2 = [
    'This is a non-commercial personal tribute and demo.',
    'Not affiliated with, sponsored, or endorsed by Marvel Studios',
    'or The Walt Disney Company.',
    '',
    'A personal piece by Lorenzo Colombani, built with Claude Code.'
  ];
  var ATTR2_LAST = [
    'With gratitude, and full credit where it belongs.'
  ];

  /* ---------- THE ROSTRUM (r7) — phone-only dossier camera ----------
     The cinematographer's rule (his note): push in to read, pull back to
     leave — every scene exit happens wide. Pure f(t): a keyframe table
     [t0, t1, yC0→yC1, z0→z1] smoothstepped, z blending the visible page
     height between establishing fit (whole page, the r6 phone formula)
     and rostrum fit (page fills 94% of frame width). Desktop: null. */
  var D1_CAM = [
    [0.464, 1.60, 420, 420, 0, 0],   // establishing — the paper lands full-frame
    [1.60, 2.60, 420, 225, 0, 1],    // push in on the header as it types (2.136)
    [2.60, 4.60, 225, 225, 1, 1],    // subject block + photo
    [4.60, 5.40, 225, 470, 1, 1],    // drift to the deviations (4.911–7.43)
    [5.40, 8.00, 470, 470, 1, 1],
    [8.00, 8.45, 470, 650, 1, 1],    // down to the assessment (8.243) — r7b: faster arrival, checker-tuned
    [8.45, 9.90, 650, 650, 1, 1],
    [9.90, 10.35, 650, 560, 1, 1],   // re-frame — arrive before the VARIANT slam (10.449)
    [10.35, 10.85, 560, 560, 1, 1],  // the stamp breathes tight
    [10.85, 11.55, 560, 420, 1, 0],  // the pull-back — leave the scene wide
    [11.55, 99, 420, 420, 0, 0]      // hold wide to the wordmark cut (11.65)
  ];
  var D2_CAM = [
    [83.824, 85.20, 420, 420, 0, 0], // establishing — the REVIEW page lands
    [85.20, 86.20, 420, 225, 0, 1],  // push in: header + surveillance still (A types 86.576)
    [86.20, 90.00, 225, 225, 1, 1],  // exhibits A/B
    [90.00, 90.90, 225, 390, 1, 1],  // drift: C/D/E (90.488/93.263/94.912) + polaroid (91.5)
    [90.90, 96.30, 390, 390, 1, 1],
    [96.30, 97.20, 390, 640, 1, 1],  // finding (97.141), notes, RECLASS slam (102.133), PENDING (104.374)
    [97.20, 106.20, 640, 640, 1, 1],
    [106.20, 107.60, 640, 420, 1, 0],// the pull-back — verdict landed, the page whole
    [107.60, 999, 420, 420, 0, 0]    // hold wide; PENDING blinks full-frame; the turn (110.469) erupts from it
  ];
  function rostrumCam(table, t, W, H) {
    var ch = VPH > 0 ? VPH : H;
    if (ch >= 520 && !window.__FIELD_SKY) return null;   // the workshop uses the close reading camera at every size
    var seg = table[table.length - 1], i;
    if (t < table[0][0]) seg = table[0];
    else for (i = 0; i < table.length; i++) if (t >= table[i][0] && t < table[i][1]) { seg = table[i]; break; }
    var p = U.clamp((t - seg[0]) / (seg[1] - seg[0]), 0, 1);
    if (window.__REDUCED) p = 1;                         // moves become cuts at the move start
    p = p * p * (3 - 2 * p);
    var scEst = Math.min(H * 0.985 / 840, W * 0.94 / 660);
    var scRos = W * 0.94 / 660;
    var hE = H / scEst, hR = H / scRos;                  // visible page height, print units
    var z = seg[4] + (seg[5] - seg[4]) * p;
    var sc = H / (hE + (hR - hE) * z);                   // blend in view-height space (matches the approved exhibit)
    var yC = seg[2] + (seg[3] - seg[2]) * p;
    var visH = (H / 2) / sc;
    yC = visH >= 420 ? 420 : U.clamp(yC, visH, 840 - visH); // never leave the page
    /* kType (r7e, his dezoom catch): fpx sizes type from the READING scale,
       not the animated paper scale — at the wide the old psc drove the lift
       to ~1.65x while baselines stayed in print space, overprinting the
       margin notes' 22-unit leading. Constant per geometry: no per-frame
       breathing, ~1.0-1.1x top-up everywhere, the wide shows the page at
       its natural print proportion. */
    return { sc: sc, yC: yC, kType: scRos };
  }

  /* ---------- the dossier prop ---------- */
  function paperPlace(cx, W, H, rot, slide, cam) {
    /* phone (CSS height < 520): the paper claims the frame; with a rostrum
       cam it exceeds it and the camera frames yC. Desktop formula untouched. */
    var sc, yC = 420;
    if (cam) { sc = cam.sc; yC = cam.yC; }
    else sc = (VPH > 0 ? VPH : H) < 520 ? Math.min(H * 0.985 / 840, W * 0.94 / 660)
                     : Math.min(H * 0.92 / 840, W * 0.88 / 660);
    cx.translate(W / 2, H / 2 + (slide || 0));
    cx.rotate(rot);
    cx.scale(sc, sc);
    cx.translate(-330, -yC);
    return sc;
  }
  function deskShadow(cx, W, H, a) {
    if(window.__FIELD_SKY)return;
    var g = cx.createRadialGradient(W / 2, H * 0.56, 0, W / 2, H * 0.56, H * 0.62);
    g.addColorStop(0, 'rgba(0,0,0,' + 0.5 * a + ')');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    cx.fillStyle = g;
    cx.fillRect(0, 0, W, H);
  }

  /* ═══════════ COLD OPEN — the case file (0 → wmStart) ═══════════ */
  function paintDossier1(cx, W, H, t, A) {
    var C = A.C;
    if (t < C.paperIn || t >= C.wmStart) return;
    var inP = U.outCubic((t - C.paperIn) / 0.9);
    deskShadow(cx, W, H, inP);
    cx.save();
    cx.globalAlpha = inP;
    var cam = rostrumCam(D1_CAM, t, W, H);
    var psc = paperPlace(cx, W, H, -0.018, (1 - inP) * 60, cam);
    if (cam) psc = cam.kType; // type sized for the reading scale, not the animated one
    cx.drawImage(A.paper, 0, 0, 660, 840);

    var ink = '#3c2712', faint = '#8a6127', red = '#a03a10';

    // header strip
    if (t > 1.579) {
      cx.globalAlpha = inP * Math.min(1, (t - 1.579) / 0.3);
      cx.fillStyle = faint;
      cx.font = '400 ' + fpx(11, psc, H) + 'px "Courier Prime", monospace';
      tracked(cx, 'TVA · TEMPORAL RECORDS DIVISION', 56, 66, 0.22, 'left');
      tracked(cx, 'FOR OFFICIAL USE ONLY', 604 - 236, 66, 0.22, 'left');
      cx.fillRect(56, 78, 548, 2);
      cx.globalAlpha = inP;
    }
    if (t > 2.136) {
      cx.globalAlpha = inP * Math.min(1, (t - 2.136) / 0.3);
      cx.fillStyle = '#5a3a14';
      cx.font = '400 ' + fpx(34, psc, H) + 'px Righteous, sans-serif';
      cx.textAlign = 'left';
      cx.fillText('CASE FILE № L-1607', 56, 136);
      cx.fillStyle = faint;
      cx.font = '400 ' + fpx(11, psc, H) + 'px "Courier Prime", monospace';
      tracked(cx, 'FILE REVIEW IN PROGRESS — DO NOT PRUNE', 56, 162, 0.3, 'left');
      cx.globalAlpha = inP;
    }
    // subject block (typed)
    cx.font = '400 ' + fpx(17, psc, H) + 'px "Special Elite", monospace';
    cx.fillStyle = ink;
    var sub = [
      ['SUBJECT: COLOMBANI, LORENZO', 2.438],
      ['NATIONALITY: FRENCH — RESIDENCE: ABROAD', 2.717],
      ['TRADES ON RECORD: SEVEN', 2.972],
      ['LANGUAGES: 4 · PUBS: 14 · CERTS: 11', 3.82]
    ];
    for (var s = 0; s < sub.length; s++) {
      var n = typeN(sub[s][0], t, sub[s][1], 60);
      if (n > 0) cx.fillText(sub[s][0].slice(0, n), 56, 216 + s * 30);
    }
    // photo — develops
    if (t > 3.82 && A.photo) {
      var dv = U.clamp((t - 3.82) / 0.9, 0, 1);
      cx.save();
      cx.globalAlpha = inP * dv;
      cx.drawImage(A.photo, 450, 118, 154, 187);
      cx.strokeStyle = '#a67b36'; cx.lineWidth = 1.5;
      cx.strokeRect(450, 118, 154, 187);
      // tape corners
      cx.fillStyle = 'rgba(222,199,140,0.85)';
      cx.save(); cx.translate(456, 122); cx.rotate(-0.66); cx.fillRect(-34, -9, 68, 18); cx.restore();
      cx.save(); cx.translate(598, 122); cx.rotate(0.66); cx.fillRect(-34, -9, 68, 18); cx.restore();
      cx.restore();
      cx.fillStyle = faint;
      cx.font = '400 ' + fpx(9, psc, H) + 'px "Courier Prime", monospace';
      tracked(cx, 'SUBJECT — FILE PHOTO', 462, 322, 0.24, 'left');
    }
    // deviations
    if (t > 4.354) {
      cx.fillStyle = red;
      cx.font = '700 ' + fpx(13, psc, H) + 'px "Courier Prime", monospace';
      tracked(cx, 'DEVIATIONS DETECTED (7):', 56, 372, 0.24, 'left');
    }
    var devT = [4.911, 5.468, 5.747, 6.026, 6.594, 7.152, 7.43];
    cx.font = '400 ' + fpx(20, psc, H) + 'px "Special Elite", monospace';
    for (var d = 0; d < DEVS.length; d++) {
      var dn = typeN(DEVS[d], t, devT[d], 46);
      if (dn > 0) {
        cx.fillStyle = faint;
        cx.font = '400 ' + fpx(12, psc, H) + 'px "Courier Prime", monospace';
        cx.fillText('0' + (d + 1), 66, 404 + d * 31);
        cx.fillStyle = ink;
        cx.font = '400 ' + fpx(20, psc, H) + 'px "Special Elite", monospace';
        cx.fillText(DEVS[d].slice(0, dn), 100, 406 + d * 31);
      }
    }
    // assessment
    if (t > 7.988) {
      cx.fillStyle = faint;
      cx.font = '400 ' + fpx(12, psc, H) + 'px "Courier Prime", monospace';
      tracked(cx, 'ASSESSMENT:', 56, 668, 0.24, 'left');
    }
    cx.fillStyle = ink;
    cx.font = '400 ' + fpx(17, psc, H) + 'px "Special Elite", monospace';
    var a1 = 'one person filed under seven headings.', a2 = 'filing error suspected.';
    var n1 = typeN(a1, t, 8.243, 68), n2 = typeN(a2, t, 8.8, 58);
    if (n1 > 0) cx.fillText(a1.slice(0, n1), 56, 696);
    if (n2 > 0) cx.fillText(a2.slice(0, n2), 56, 724);
    // caret
    var caretOn = Math.floor(t * 3) % 2 === 0 && t < 10.3;
    if (caretOn && t > 2.4) {
      cx.fillStyle = 'rgba(60,39,18,0.7)';
      cx.fillRect(56 + cx.measureText(t < 8.243 ? '' : (n2 < a2.length ? a2.slice(0, n2) : a2)).width + 4, t > 8.7 ? 710 : 682, 9, 18);
    }
    // THE STAMP
    stampSlam(cx, A.stampVariant, 330, 520, -0.16, t, C.variantStamp, 1);
    cx.restore();
  }

  /* ═══════════ MOVEMENT 1 — cast of one ═══════════
     Each deviation gets its own macro set-piece and its own composition:
     off-center anchors, hairline rules, the name split bold/light —
     and twice, stacked in columns, scattering through time. */
  var CAST_LAYOUT = [
    { ax: 0.24, align: 'left'   },
    { ax: 0.27, align: 'left',  stack: true },
    { ax: 0.76, align: 'right'  },
    { ax: 0.50, align: 'center' },
    { ax: 0.30, align: 'left',  stack: true },
    { ax: 0.74, align: 'right'  },
    { ax: 0.50, align: 'center' }
  ];
  function drawName(cx, x, y, H, align, stack, alpha) {
    cx.fillStyle = 'rgba(217,165,76,' + alpha + ')';
    if (stack) {
      // the vertical-column move: LO / RE / NZ / O reading down
      var cols = ['LO', 'RE', 'NZ', 'O'];
      var fs = Math.round(fpx(H * 0.024, 1, H));
      cx.font = '600 ' + fs + 'px Jost, sans-serif';
      var colW = fs * 1.5;
      var x0 = align === 'right' ? x - cols.length * colW : align === 'center' ? x - cols.length * colW / 2 : x;
      for (var c = 0; c < cols.length; c++) {
        for (var r = 0; r < cols[c].length; r++) {
          cx.textAlign = 'left';
          cx.fillText(cols[c][r], x0 + c * colW, y + r * fs * 1.02);
        }
      }
      cx.font = '300 ' + Math.round(fpx(H * 0.019, 1, H)) + 'px Jost, sans-serif';
      cx.fillStyle = 'rgba(217,165,76,' + alpha * 0.9 + ')';
      tracked(cx, 'COLOMBANI', align === 'left' ? x0 : align === 'right' ? x : x, y + fs * 2.6, 0.34, align);
      return y + fs * 2.6;
    }
    // reference scale: names are small, precise, letterspaced
    var fsB = Math.round(fpx(H * 0.021, 1, H)), tr = 0.14;
    function width(text, weight) {
      cx.font = weight + ' ' + fsB + 'px Jost, sans-serif';
      var w = 0;
      for (var q = 0; q < text.length; q++) w += cx.measureText(text[q]).width + (q < text.length - 1 ? tr * fsB : 0);
      return w;
    }
    var w1 = width('LORENZO', '600'), w2 = width('COLOMBANI', '300');
    var gap = fsB * 0.8, total = w1 + gap + w2;
    var maxW = align === 'center' ? 0.62 : 0.44;
    if (total > maxW * (x * 2)) { /* keep within the anchored column */ }
    var sx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
    cx.font = '600 ' + fsB + 'px Jost, sans-serif';
    cx.fillStyle = 'rgba(230,207,159,' + alpha + ')';
    tracked(cx, 'LORENZO', sx, y, tr, 'left');
    cx.font = '300 ' + fsB + 'px Jost, sans-serif';
    cx.fillStyle = 'rgba(217,165,76,' + alpha + ')';
    tracked(cx, 'COLOMBANI', sx + w1 + gap, y, tr, 'left');
    return y;
  }
  function paintCast(cx, W, H, t, A) {
    var C = A.C;
    // R2 T4: the doctrine CARD is gone — card 7 now breathes through to
    // C.castEnd (~54.5) instead of cutting off at the old doctrine boundary.
    if (t < C.cast[0] || t >= C.castEnd) return;
    var i = 0, k;
    for (k = C.cast.length - 1; k >= 0; k--) if (t >= C.cast[k]) { i = k; break; }
    var t0 = C.cast[i];
    var tEnd = i < C.cast.length - 1 ? C.cast[i + 1] : C.castEnd;
    var out = U.clamp((tEnd - t) / 0.20, 0, 1);
    var L = CAST_LAYOUT[i];
    var ax = W * L.ax;

    cx.save();
    cx.globalAlpha = out;
    scrim(cx, ax, H * 0.5, H * 0.55, 0.42);

    // the count is the card's entrance event: the numeral slams in
    // stamp-sized ON the hit, then settles into the file line as its tail
    var ebFs = Math.round(fpx(H * 0.0155, 1, H));
    var ebTail = '0' + (i + 1) + ' / 07';
    var ebY = H * 0.335;
    cx.font = '400 ' + ebFs + 'px "Courier Prime", monospace';
    var ewHead = twidth(cx, 'DEVIATION ', 0.42) + 0.42 * ebFs;
    var ew = ewHead + twidth(cx, ebTail, 0.42);
    var tx0 = L.align === 'right' ? ax - ew : L.align === 'center' ? ax - ew / 2 : ax;

    // first card only: "DEVIATION" itself gets the slam treatment, teaching
    // the label ~2s before the numeral slams in beside it (screening note 4).
    // Later cards keep the numeral-only grammar untouched.
    var isFirst = (i === 0);
    var devT0 = t0 + 0.35;
    var devEnd = devT0 + 0.72;
    var numT0 = isFirst ? t0 + 2.0 : t0;
    var numEnd = numT0 + 0.72;

    var j1 = jump(i * 10 + 1, t, t0 + 0.05, 22);
    if (j1 && (!isFirst || t >= devEnd)) {
      cx.save(); cx.translate(j1.dx, j1.dy); cx.globalAlpha = out * j1.a * 0.9;
      cx.fillStyle = 'rgba(107,190,138,1)';
      cx.font = '400 ' + ebFs + 'px "Courier Prime", monospace';
      tracked(cx, 'DEVIATION ', tx0, ebY, 0.42, 'left');
      if (t >= numEnd) tracked(cx, ebTail, tx0 + ewHead, ebY, 0.42, 'left');
      var rx0 = L.align === 'right' ? ax - ew : ax;
      rule(cx, L.align === 'right' ? rx0 - W * 0.10 : rx0 + ew + W * 0.018, H * 0.331,
           L.align === 'right' ? rx0 - W * 0.018 : rx0 + ew + W * 0.10 + (i % 3) * W * 0.03, out * j1.a);
      cx.restore();
    }
    if (isFirst && t >= devT0 && t < devEnd) {
      // "DEVIATION" slams in first — identical choreography to the numeral
      // below (cream stamp → green glide), landing at the eyebrow's head
      // instead of its tail.
      var spD = t - devT0;
      var nFs0D = Math.round(fpx(H * 0.115, 1, H));
      var sx0D = ax + ew * 0.55; // card 1 is left-aligned; same offset formula as the numeral
      var sy0D = H * 0.50;
      var eD = spD < 0.34 ? 0 : U.clamp((spD - 0.34) / 0.38, 0, 1);
      eD = eD < 0.5 ? 4 * eD * eD * eD : 1 - Math.pow(-2 * eD + 2, 3) / 2;
      var nFsD = Math.round(nFs0D + (ebFs - nFs0D) * eD);
      var trKD = 0.42 * eD;
      var jxD = 0, jyD = 0, overD = 1;
      if (spD < 0.12 && !window.__REDUCED) {
        overD = 1 + 2.2 * Math.pow(1 - spD / 0.12, 2);
        jxD = (U.hash01(Math.floor(spD * 36) * 7 + 91) - 0.5) * 6;
        jyD = (U.hash01(Math.floor(spD * 36) * 7 + 94) - 0.5) * 6;
      }
      cx.save();
      cx.font = '700 ' + nFsD + 'px "Courier Prime", monospace';
      var wGD = 0, qd, DEVWORD = 'DEVIATION';
      for (qd = 0; qd < DEVWORD.length; qd++) wGD += cx.measureText(DEVWORD[qd]).width + (qd < DEVWORD.length - 1 ? trKD * nFsD : 0);
      var bxD = (sx0D - wGD / 2) + (tx0 - (sx0D - wGD / 2)) * eD + jxD;
      var byD = sy0D + (ebY - sy0D) * eD + jyD;
      var crD = Math.round(214 + (107 - 214) * eD), cgD = Math.round(208 + (190 - 208) * eD), cbD = Math.round(180 + (138 - 180) * eD);
      cx.translate(bxD + wGD / 2, byD);
      cx.rotate(-0.035 * (1 - eD));
      cx.scale(overD, overD);
      cx.globalAlpha = out * Math.min(1, spD / 0.05) * (0.92 - 0.02 * eD);
      cx.fillStyle = 'rgba(' + crD + ',' + cgD + ',' + cbD + ',1)';
      cx.textAlign = 'left';
      var cxxD = -wGD / 2;
      for (qd = 0; qd < DEVWORD.length; qd++) {
        cx.fillText(DEVWORD[qd], cxxD, 0);
        cxxD += cx.measureText(DEVWORD[qd]).width + trKD * nFsD;
      }
      cx.restore();
    }
    if (t >= numT0 && t < numEnd) {
      // slam (cream — red stays the plot stamps') → hold → glide into the
      // slot, the ink drying to the display's phosphor on the way down
      var sp = t - numT0;
      var nFs0 = Math.round(fpx(H * 0.115, 1, H));
      var sx0 = L.align === 'right' ? ax - ew * 0.55 : L.align === 'center' ? ax : ax + ew * 0.55;
      var sy0 = H * 0.50;
      var e = sp < 0.34 ? 0 : U.clamp((sp - 0.34) / 0.38, 0, 1);
      e = e < 0.5 ? 4 * e * e * e : 1 - Math.pow(-2 * e + 2, 3) / 2;
      var nFs = Math.round(nFs0 + (ebFs - nFs0) * e);
      var trK = 0.42 * e; // the eyebrow's letterspacing arrives with the slot
      var jx = 0, jy = 0, over = 1;
      if (sp < 0.12 && !window.__REDUCED) {
        over = 1 + 2.2 * Math.pow(1 - sp / 0.12, 2);
        jx = (U.hash01(Math.floor(sp * 36) * 7 + i * 13 + 1) - 0.5) * 6;
        jy = (U.hash01(Math.floor(sp * 36) * 7 + i * 13 + 4) - 0.5) * 6;
      }
      cx.save();
      cx.font = '700 ' + nFs + 'px "Courier Prime", monospace';
      var wG = 0, q3;
      for (q3 = 0; q3 < ebTail.length; q3++) wG += cx.measureText(ebTail[q3]).width + (q3 < ebTail.length - 1 ? trK * nFs : 0);
      var bx = (sx0 - wG / 2) + ((tx0 + ewHead) - (sx0 - wG / 2)) * e + jx;
      var by = sy0 + (ebY - sy0) * e + jy;
      var cr = Math.round(214 + (107 - 214) * e), cg = Math.round(208 + (190 - 208) * e), cb2 = Math.round(180 + (138 - 180) * e);
      cx.translate(bx + wG / 2, by);
      cx.rotate(-0.035 * (1 - e));
      cx.scale(over, over);
      cx.globalAlpha = out * Math.min(1, sp / 0.05) * (0.92 - 0.02 * e);
      cx.fillStyle = 'rgba(' + cr + ',' + cg + ',' + cb2 + ',1)';
      cx.textAlign = 'left';
      var cxx = -wG / 2;
      for (q3 = 0; q3 < ebTail.length; q3++) {
        cx.fillText(ebTail[q3], cxx, 0);
        cxx += cx.measureText(ebTail[q3]).width + trK * nFs;
      }
      cx.restore();
    }
    var j2 = jump(i * 10 + 2, t, t0 + 0.16, 26);
    if (j2) {
      cx.save(); cx.translate(j2.dx, j2.dy); cx.globalAlpha = out * j2.a;
      drawName(cx, ax, H * 0.415, H, L.align, L.stack, 1);
      cx.restore();
    }
    var j3 = fadeRise(t, t0 + 0.30, 0.5, H * 0.012);
    if (j3) {
      cx.globalAlpha = out * j3.a;
      cx.fillStyle = '#c9a86a';
      cx.font = 'italic 300 ' + Math.round(fpx(H * 0.024, 1, H)) + 'px Fraunces, serif';
      cx.textAlign = L.align === 'right' ? 'right' : L.align === 'center' ? 'center' : 'left';
      cx.fillText('as', ax, H * (L.stack ? 0.545 : 0.492) + j3.dy);
    }
    var j4 = jump(i * 10 + 4, t, t0 + 0.42, 34);
    if (j4) {
      var spec = CAST[i];
      var size = Math.round(fpx(H * 0.098, 1, H));
      cx.save(); cx.translate(j4.dx, j4.dy); cx.globalAlpha = out * j4.a;
      cx.font = spec.font.replace('{s}', size);
      var rw = cx.measureText(spec.role).width * (spec.track ? 1 + spec.track : 1);
      var maxW = L.align === 'center' ? W * 0.88 : W * 0.60;
      if (rw > maxW) { size = Math.floor(size * maxW / rw); cx.font = spec.font.replace('{s}', size); }
      cx.fillStyle = 'rgba(242,231,207,' + Math.min(1, 0.96 + (j4.flash || 0)) + ')';
      cx.textAlign = L.align === 'right' ? 'right' : L.align === 'center' ? 'center' : 'left';
      if (spec.track) tracked(cx, spec.role, ax, H * 0.62, spec.track, L.align);
      else cx.fillText(spec.role, ax, H * 0.62);
      cx.restore();
    }
    // filing chip, bottom of frame — the machine never stops labelling
    cx.globalAlpha = out * 0.55;
    cx.fillStyle = 'rgba(144,114,67,1)';
    cx.font = '400 ' + Math.round(fpx(H * 0.0125, 1, H)) + 'px "Courier Prime", monospace';
    tracked(cx, 'TVA · CASE L-1607', W * 0.5, H * 0.925, 0.4, 'center');
    cx.restore();
  }

  /* ═══════════ THE TALLY — seven figures, filed as they land ═══════════
     The pamphlet's own pictogram row: a deviation counted is a figure
     filled. R2 T4: with the doctrine card gone, the completed-row payoff
     (all seven filed, "7/07") moves into card 7's own window — done by
     50.5, held through 54.0, then a graceful fade to crew[0] (was a snap
     0.45s fade tied only to the old doctrine boundary). */
  function drawFig(cx, x, y, g, st) {
    var head = g * 0.30, bw = g * 0.86;
    cx.save();
    cx.translate(x, y);
    cx.beginPath();
    cx.arc(0, -g * 0.62, head, 0, 6.2832);
    cx.moveTo(-bw / 2, g * 0.5);
    cx.quadraticCurveTo(-bw / 2, -g * 0.18, 0, -g * 0.18);
    cx.quadraticCurveTo(bw / 2, -g * 0.18, bw / 2, g * 0.5);
    cx.closePath();
    if (st === 0) { cx.strokeStyle = 'rgba(144,114,67,0.38)'; cx.lineWidth = 1; cx.stroke(); }
    else if (st === 1) {
      cx.shadowColor = 'rgba(121,255,162,0.8)'; cx.shadowBlur = 6;
      cx.fillStyle = 'rgba(121,255,162,0.95)'; cx.fill();
    } else { cx.fillStyle = 'rgba(166,138,88,0.9)'; cx.fill(); }
    cx.restore();
  }
  function paintTally(cx, W, H, t, A) {
    var C = A.C;
    if (t < C.cast[0] || t >= C.crew[0]) return;
    var inA = U.clamp((t - C.cast[0]) / 0.5, 0, 1);
    // completed-row payoff fades gracefully across the back half of card 7's
    // extended window instead of a snap 0.45s cut at crew[0] — the doctrine
    // card no longer holds the frame, so the tally gets to be the thing that
    // lingers and lets go.
    var TALLY_FADE_START = 54.0;
    var outA = t < TALLY_FADE_START ? 1 : U.clamp((C.crew[0] - t) / (C.crew[0] - TALLY_FADE_START), 0, 1);
    var cur = -1, k;
    for (k = C.cast.length - 1; k >= 0; k--) if (t >= C.cast[k]) { cur = k; break; }
    // done (all 7 filed) by 50.5 — 1.7s after the last card's own entrance,
    // once its figure's pop-in has settled; was gated on the doctrine card's
    // own start (52.129), which no longer exists as a visible event.
    var done = t >= C.cast[C.cast.length - 1] + 1.7;
    var g = H * 0.017, gapX = g * 1.75;
    var x0 = W * 0.062, y0 = H * 0.912;
    cx.save();
    for (k = 0; k < 7; k++) {
      var st = done ? 2 : k < cur ? 2 : k === cur ? 1 : 0;
      var pop = 1;
      if (!done && k === cur) {
        var since = t - C.cast[k];
        if (since < 0.3) pop = 1 + 0.5 * (1 - since / 0.3);
      }
      cx.globalAlpha = inA * outA * (st === 1 ? 0.78 + 0.22 * Math.sin(t * 3.1)
        : done ? 0.82 + 0.12 * Math.sin(t * 2.2 + k * 0.35) : 1);
      drawFig(cx, x0 + k * gapX, y0, g * pop, st);
    }
    cx.globalAlpha = inA * outA * 0.8;
    cx.fillStyle = 'rgba(144,114,67,1)';
    cx.font = '400 ' + Math.round(fpx(H * 0.011, 1, H)) + 'px "Courier Prime", monospace';
    cx.textAlign = 'left';
    cx.fillText((done ? 7 : cur + 1) + ' / 07', x0 - g * 0.42, y0 + g * 1.65);
    cx.restore();
  }

  /* ═══════════ MOVEMENT 2 — crew of loves ═══════════
     Re-laid (screening note 8) off the branch lanes into the measured
     whitespace right of center — the one pocket of the frame the fan of
     static cast-branches consistently leaves clear. (Backdrop dressing is
     world.js's own CREWK list — this layout owns only the text anchor.) */
  var CREW_LAYOUT = [
    { ax: 0.86, align: 'right' },
    { ax: 0.86, align: 'right' },
    { ax: 0.86, align: 'right' },
    { ax: 0.86, align: 'right' },
    { ax: 0.86, align: 'right' },
    { ax: 0.86, align: 'right' },
    { ax: 0.86, align: 'right' }
  ];
  function paintCrew(cx, W, H, t, A) {
    var C = A.C;
    if (t < C.crew[0] || t >= C.evidence) return;
    cx.save();
    cx.textAlign = 'center';

    if (t < C.directedBy) {
      var i = 0, k;
      for (k = C.crew.length - 1; k >= 0; k--) if (t >= C.crew[k]) { i = k; break; }
      var t0 = C.crew[i];
      var tEnd = i < C.crew.length - 1 ? C.crew[i + 1] : C.directedBy;
      var out = U.clamp((tEnd - t) / 0.18, 0, 1);
      var blocks = CREW[i], nb = blocks.length;
      var L = CREW_LAYOUT[i], ax = W * L.ax;
      var ta = L.align === 'right' ? 'right' : L.align === 'center' ? 'center' : 'left';

      var centerY = nb === 3 ? H * 0.833 : H * 0.82;
      scrim(cx, ax, centerY, H * 0.19, 0.42);

      // below the horizontal spine is the one pocket the static
      // cast-branches consistently leave clear (screening note 8). Packed
      // to fit the lower band — nb===3 (one card, three loves) runs smaller
      // type so three blocks still clear each other; eyebrow-to-role
      // leading holds >=1.5em against each card's own role font size, and
      // the inter-block gap holds enough clearance for glyph ascent/descent
      // (a tight gap still visually crowds two baselines even when their
      // baseline-to-baseline spacing alone looks sufficient on paper)
      var gap = H * (nb === 3 ? 0.095 : 0.13);
      var ebFs = nb === 3 ? 0.015 : 0.022, roFs = nb === 3 ? 0.030 : 0.048, capFs = nb === 3 ? 0.0130 : 0.0152;
      var ebOff = nb === 3 ? H * 0.027 : H * 0.044;   // eyebrow, 1.5em above role
      var roOff = nb === 3 ? H * 0.018 : H * 0.028;   // role, 1.5em below eyebrow
      var capOff = nb === 3 ? H * 0.0375 : H * 0.052; // caption, >=1.5em below role
      var yTop = centerY - gap * (nb - 1) / 2;
      for (var b = 0; b < nb; b++) {
        var jb = jump(i * 20 + b, t, t0 + 0.12 * b, 22);
        if (!jb) continue;
        var y = yTop + b * gap;
        cx.save(); cx.translate(jb.dx, jb.dy); cx.rotate(jb.rot);
        cx.globalAlpha = out * jb.a;
        cx.fillStyle = 'rgba(107,190,138,0.95)';
        cx.font = '400 ' + Math.round(fpx(H * ebFs, 1, H)) + 'px Righteous, sans-serif';
        var dw = tracked(cx, blocks[b][0], ax, y - ebOff, 0.3, L.align);
        if (b === 0) {
          var rx = L.align === 'right' ? ax - dw : ax;
          rule(cx, L.align === 'right' ? rx - W * 0.09 : rx + dw + W * 0.016, y - ebOff - H * 0.004,
               L.align === 'right' ? rx - W * 0.016 : rx + dw + W * 0.09, out * jb.a);
        }
        cx.fillStyle = '#e6cf9f';
        cx.font = '400 ' + Math.round(fpx(H * roFs, 1, H)) + 'px "Special Elite", monospace';
        cx.textAlign = ta;
        cx.fillText(blocks[b][1], ax, y + roOff);
        if (blocks[b][2]) {
          cx.fillStyle = 'rgba(160,130,80,0.95)';
          cx.font = '400 ' + Math.round(fpx(H * capFs, 1, H)) + 'px "Courier Prime", monospace';
          cx.fillText('( ' + blocks[b][2] + ' )', ax, y + capOff);
        }
        cx.restore();
      }
      cx.globalAlpha = out * 0.5;
      cx.fillStyle = 'rgba(144,114,67,1)';
      cx.font = '400 ' + Math.round(fpx(H * 0.0125, 1, H)) + 'px "Courier Prime", monospace';
      tracked(cx, 'PRODUCTION UNIT — ONE', W * 0.5, H * 0.925, 0.4, 'center');
    } else {
      scrim(cx, W * 0.5, H * 0.5, H * 0.55, 0.4);
      // Directed by — pruned by the Career Variance Authority, on the swell
      var ja = fadeRise(t, C.directedBy, 0.6, H * 0.01);
      var fadeOut = t > C.evidence - 0.5 ? U.clamp((C.evidence - t) / 0.5, 0, 1) : 1;

      // measure the "DIRECTED BY" run once so "DIRECTED" and "BY" can be
      // struck/replaced independently while sitting exactly where the
      // single centered run used to place them
      var dbFs = Math.round(fpx(H * 0.026, 1, H));
      cx.font = '400 ' + dbFs + 'px Righteous, sans-serif';
      var dbSp = 0.4 * dbFs;
      var dbWord = twidth(cx, 'DIRECTED', 0.4);
      var dbFull = twidth(cx, 'DIRECTED BY', 0.4);
      var dbX0 = W / 2 - dbFull / 2;
      var dbByX = dbX0 + dbWord + dbSp + cx.measureText(' ').width + dbSp;

      if (t < C.directedPunch) {
        if (ja) {
          cx.globalAlpha = ja.a * fadeOut;
          cx.fillStyle = 'rgba(121,255,162,1)';
          tracked(cx, 'DIRECTED BY', W / 2, H * 0.40 + ja.dy, 0.4, 'center');
        }
      } else {
        // "DIRECTED" is pruned — ember strike, then replaced by "PRUNED";
        // "BY" holds its ground, untouched, in its original slot
        var dp = t - C.directedPunch;
        var struckDone = dp > 0.32;
        cx.globalAlpha = fadeOut;
        cx.fillStyle = 'rgba(121,255,162,1)';
        tracked(cx, 'BY', dbByX, H * 0.40, 0.4, 'left');
        if (!struckDone) {
          tracked(cx, 'DIRECTED', dbX0, H * 0.40, 0.4, 'left');
          var strikeW = U.outCubic(U.clamp(dp / 0.28, 0, 1)) * dbWord * 1.1;
          cx.strokeStyle = '#FF8A3C';
          cx.lineWidth = Math.max(2, H * 0.0035);
          cx.lineCap = 'round';
          cx.beginPath();
          cx.moveTo(dbX0 + dbWord / 2 - strikeW / 2, H * 0.40 - H * 0.008);
          cx.lineTo(dbX0 + dbWord / 2 + strikeW / 2, H * 0.40 - H * 0.010);
          cx.stroke();
        } else {
          cx.fillStyle = '#FF8A3C';
          tracked(cx, 'PRUNED', dbX0, H * 0.40, 0.4, 'left');
        }
      }
      var jc = jump(950, t, C.directedPunch, 40);
      if (jc) {
        cx.save(); cx.translate(W / 2 + jc.dx, H * 0.56 + jc.dy); cx.rotate(jc.rot);
        cx.globalAlpha = jc.a * fadeOut;
        cx.fillStyle = '#f2e7cf';
        if (t < C.directedPunch + 0.9) {
          cx.font = '400 ' + Math.round(fpx(H * 0.105, 1, H)) + 'px "Yeseva One", serif';
          cx.fillText('CREATING', 0, 0);
        } else {
          // "CAREER VARIANCE AUTHORITY" replaces "CREATING" — shrink-to-fit,
          // same grammar/weight, just measured against the frame width
          var cvaFs = fitSize(cx, ['CAREER VARIANCE AUTHORITY'], '400 {s}px "Yeseva One", serif', Math.round(fpx(H * 0.105, 1, H)), W * 0.90);
          cx.font = '400 ' + cvaFs + 'px "Yeseva One", serif';
          cx.fillText('CAREER VARIANCE AUTHORITY', 0, 0);
        }
        cx.restore();
      }
    }
    cx.restore();
  }

  /* ═══════════ CASE REVIEW — evidence & reclassification ═══════════ */
  function paintDossier2(cx, W, H, t, A) {
    var C = A.C;
    if (t < C.evidence || t >= C.turn + 2.4) return;
    var inP = U.outCubic((t - C.evidence) / 0.8);
    var outP = t > C.turn ? U.clamp(1 - (t - C.turn) / 2.2, 0, 1) : 1;
    var sc = 1 - (1 - outP) * 0.05;
    deskShadow(cx, W, H, inP * outP);
    cx.save();
    cx.globalAlpha = inP * outP;
    cx.translate(W / 2, H / 2);
    cx.scale(sc, sc);
    cx.translate(-W / 2, -H / 2);
    var cam = rostrumCam(D2_CAM, t, W, H);
    var psc = paperPlace(cx, W, H, 0.014, (1 - inP) * 50, cam);
    if (cam) psc = cam.kType; // type sized for the reading scale, not the animated one
    cx.drawImage(A.paper, 0, 0, 660, 840);

    var ink = '#3c2712', faint = '#8a6127';
    cx.textAlign = 'left';
    cx.fillStyle = '#5a3a14';
    cx.font = '400 ' + fpx(27, psc, H) + 'px Righteous, sans-serif';
    cx.fillText('CASE FILE № L-1607 — REVIEW', 56, 104);
    cx.fillStyle = faint;
    cx.font = '400 ' + fpx(11, psc, H) + 'px "Courier Prime", monospace';
    tracked(cx, 'ADDITIONAL EVIDENCE RECEIVED — SOURCE: THE WORK ITSELF', 56, 132, 0.18, 'left');
    cx.fillRect(56, 144, 548, 2);

    // exhibits, typed on the ticks
    for (var e = 0; e < EXHIBITS.length; e++) {
      var et = C.evLines[e], y = 190 + e * 74;
      if (t < et) break;
      cx.fillStyle = '#a03a10';
      cx.font = '700 ' + fpx(12, psc, H) + 'px "Courier Prime", monospace';
      tracked(cx, EXHIBITS[e][0], 56, y, 0.16, 'left');
      var body = EXHIBITS[e][1];
      var bn = typeN(body, t, et + 0.12, 64);
      cx.fillStyle = ink;
      cx.font = '400 ' + fpx(15.5, psc, H) + 'px "Special Elite", monospace';
      wrapType(cx, body.slice(0, bn), 56, y + 24, 380, 22);
    }
    // surveillance still — recent, develops early in the review
    if (A.surveil && t > 85.3) {
      var sv = U.clamp((t - 85.3) / 0.8, 0, 1);
      cx.save();
      cx.globalAlpha *= sv;
      cx.drawImage(A.surveil, 450, 150, 154, 116);
      cx.strokeStyle = '#a67b36'; cx.lineWidth = 1.5;
      cx.strokeRect(450, 150, 154, 116);
      cx.fillStyle = 'rgba(222,199,140,0.85)';
      cx.save(); cx.translate(456, 154); cx.rotate(-0.62); cx.fillRect(-30, -8, 60, 16); cx.restore();
      cx.save(); cx.translate(598, 154); cx.rotate(0.62); cx.fillRect(-30, -8, 60, 16); cx.restore();
      cx.fillStyle = '#8a6127';
      fitRight(cx, 'SURVEILLANCE — RECENT. SUBJECT: CONTENT.', 452, 284, 604, 0.1, '400 {s}px "Courier Prime", monospace', fpx(9, psc, H));
      cx.restore();
    }
    // the polaroid — taped on, captioned by hand on its border
    if (A.variantPhoto && t > 91.5) {
      var pv = U.clamp((t - 91.5) / 0.8, 0, 1);
      cx.save();
      cx.globalAlpha *= pv;
      cx.translate(524, 388); cx.rotate(0.055);
      cx.fillStyle = '#ece4d2';
      cx.fillRect(-72, -74, 144, 178);
      cx.drawImage(A.variantPhoto, -63, -65, 126, 126);
      cx.fillStyle = 'rgba(222,199,140,0.9)';
      cx.save(); cx.translate(0, -72); cx.rotate(0.02); cx.fillRect(-32, -9, 64, 18); cx.restore();
      if (t > 92.3) {
        cx.globalAlpha *= U.clamp((t - 92.3) / 0.7, 0, 1);
        cx.fillStyle = 'rgba(96,58,20,0.95)';
        cx.font = '400 ' + fpx(13, psc, H) + 'px "Homemade Apple", cursive';
        cx.textAlign = 'center';
        cx.fillText('the glasses. green. noted.', 0, 90);
        cx.textAlign = 'left';
      }
      cx.restore();
    }
    // the archivist's own hand, in the margin — the machine types, a person warms
    var NOTES = [
      ['plays piano. teaches it,', 'amateur, for joy.', 95.5],
      ['dungeon master. taught the', 'law with dragons. approved.', 99.37],
      ['fulbright file cross-checked.', 'it’s all true.', 105.2]
    ];
    for (var nn = 0; nn < NOTES.length; nn++) {
      if (t < NOTES[nn][2]) break;
      var na = U.clamp((t - NOTES[nn][2]) / 0.8, 0, 1);
      cx.save();
      cx.globalAlpha *= na * 0.9;
      cx.translate(452, 528 + nn * 62);
      cx.rotate(-0.045 + nn * 0.018);
      cx.fillStyle = 'rgba(96,58,20,0.92)';
      var nb = fitRight(cx, NOTES[nn][0], 0, 0, 152, 0, '400 {s}px "Homemade Apple", cursive', fpx(13, psc, H));
      fitRight(cx, NOTES[nn][1], 4, Math.max(22, nb + 22), 148, 0, '400 {s}px "Homemade Apple", cursive', fpx(13, psc, H));
      cx.restore();
    }
    // finding
    if (t > C.finding) {
      cx.fillStyle = faint;
      cx.font = '400 ' + fpx(12, psc, H) + 'px "Courier Prime", monospace';
      tracked(cx, 'FINDING:', 56, 580, 0.24, 'left');
      var f1 = 'deviations consistent.';
      var fn1 = typeN(f1, t, C.finding + 0.1, 50);
      cx.fillStyle = ink;
      cx.font = '400 ' + fpx(19, psc, H) + 'px "Special Elite", monospace';
      if (fn1 > 0) cx.fillText(f1.slice(0, fn1), 56, 610);
    }
    // the old judgment, faded, then struck — the new verdict overprints it
    cx.save();
    cx.globalAlpha *= 0.30;
    cx.translate(220, 706); cx.rotate(-0.13); cx.scale(0.30, 0.30);
    cx.drawImage(A.stampVariant, -A.stampVariant.width / 2, -A.stampVariant.height / 2);
    cx.restore();
    stampSlam(cx, A.stampReclass, 370, 702, 0.07, t, C.reclass, 1);
    if (t > C.pending && Math.floor((t - C.pending) * 2.2) % 2 === 0 && t < C.turn - 0.6) {
      cx.fillStyle = faint;
      cx.font = '400 ' + fpx(12, psc, H) + 'px "Courier Prime", monospace';
      tracked(cx, 'CLASSIFICATION PENDING — HOLD FOR REVIEW', 56, 762, 0.2, 'left');
    }
    cx.restore();
  }
  /* shrink-then-wrap fit for a left-anchored caption that must not cross
     the page's right margin (screening note 11 — the SURVEILLANCE overflow,
     swept to every caption of the same class: fillText whose x + measured
     width can exceed the page bounds). fontTpl carries a '{s}' size token
     so the caller's exact font family/weight/style is preserved. em=0 for
     a plain (untracked) fillText caption; >0 to go through tracked(). */
  function fitRight(cx, text, x, y, maxRight, em, fontTpl, size) {
    cx.font = fontTpl.replace('{s}', size);
    var w = em ? twidth(cx, text, em) : cx.measureText(text).width;
    if (x + w <= maxRight) { if (em) tracked(cx, text, x, y, em, 'left'); else cx.fillText(text, x, y); return y; }
    var fs = Math.max(size * 0.72, size * (maxRight - x) / w);
    cx.font = fontTpl.replace('{s}', Math.floor(fs));
    w = em ? twidth(cx, text, em) : cx.measureText(text).width;
    if (x + w <= maxRight) { if (em) tracked(cx, text, x, y, em, 'left'); else cx.fillText(text, x, y); return y; }
    // still too wide even at the shrink floor — wrap onto further lines, AT the
    // floor size (2026-07-22, the margin-note overprint at his 693×320 Page-Zoom
    // viewport): wrapping at the full size drew wrapped lines BIGGER than the
    // single line the floor was allowed, and the run has no bottom bound.
    var wfs = Math.floor(size * 0.72);
    cx.font = fontTpl.replace('{s}', wfs);
    var words = text.split(' '), line = '', yy = y, lh = wfs * 1.3, i, test, tw;
    for (i = 0; i < words.length; i++) {
      test = line ? line + ' ' + words[i] : words[i];
      tw = em ? twidth(cx, test, em) : cx.measureText(test).width;
      if (x + tw > maxRight && line) {
        if (em) tracked(cx, line, x, yy, em, 'left'); else cx.fillText(line, x, yy);
        line = words[i]; yy += lh;
      } else line = test;
    }
    if (line) { if (em) tracked(cx, line, x, yy, em, 'left'); else cx.fillText(line, x, yy); }
    return yy; // baseline of the last drawn line — stacked callers flow below it
  }
  function wrapType(cx, text, x, y, maxW, lh) {
    var words = text.split(' '), line = '', yy = y;
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + ' ' + words[i] : words[i];
      if (cx.measureText(test).width > maxW && line) {
        cx.fillText(line, x, yy); line = words[i]; yy += lh;
      } else line = test;
    }
    if (line) cx.fillText(line, x, yy);
  }

  /* ═══════════ THE TURN — no type ═══════════
     ALL FOUR credo lines removed 2026-07-18 on his word — first
     'created by' / 'One operation.' / 'Many materials.' ("remove it, period.
     delete the text"), then 'The seat at the center is built, not found.'
     The turn now carries the wordmark, the tree and its canopy only.

     NOTE for whoever reads this next: NOTES.md still records this frame as the
     SACRED credo, described by the type that used to be here. That description is
     now stale — the removal is his explicit instruction, not a tidy-up, and the
     frame's sanctity now rests on the wordmark and the tree.

     The cue timings (createdBy, credo2, credo3) are deliberately NOT touched:
     createdBy still drives the world and the camera; credo2/credo3 are read by
     nothing since the type left — they stay in CUE as the slot's tape marks.
     paintTurn stays as a no-op rather than being unhooked from the paint
     dispatcher — one less call site to get wrong, and the slot is where type
     would go back if he ever wants it.

     `inkStroked` (the glyph-hugging dark under-stroke) went with them; it had no
     other caller. */
  function paintTurn(cx, W, H, t, A) {
    return;
  }

  /* ═══════════ STINGER — and LOKI as Himself ═══════════ */
  var LOKI_FACES = ['"LokiUSAngel"', '"LokiOldEnglish"', '"LokiARB85"', '"LokiCloister"'];
  var LOKI_FACES_HOME = ['"UnifrakturMaguntia"', '"Abril Fatface"', '"Homemade Apple"', '"Pirata One"'];
  function paintSting(cx, W, H, t, A) {
    var C = A.C;
    if (t < C.sting || t >= C.attr1 + 0.8) return;
    var out = t > C.attr1 - 0.5 ? U.clamp((C.attr1 + 0.4 - t) / 0.9, 0, 1) : 1;
    var xc = A.chinPhoto ? W * 0.5 : W * 0.33; // centered if we show a real photo below
    cx.save();
    cx.textAlign = 'center';
    var f0 = fadeRise(t, C.sting + 0.1, 0.7, H * 0.01);
    if (f0) {
      cx.globalAlpha = out * f0.a;
      cx.fillStyle = '#c9a86a';
      cx.font = 'italic 300 ' + Math.round(fpx(H * 0.028, 1, H)) + 'px Fraunces, serif';
      cx.fillText('…and', xc, H * 0.40 + f0.dy);
    }
    var f1 = fadeRise(t, C.sting + 0.5, 0.8, H * 0.012);
    if (f1) {
      cx.globalAlpha = out * f1.a;
      var faces = A.showMode ? LOKI_FACES : LOKI_FACES_HOME;
      var word = 'LOKI', size = Math.round(fpx(H * 0.115, 1, H));
      var widths = [], total = 0, i;
      for (i = 0; i < 4; i++) {
        cx.font = '400 ' + size + 'px ' + faces[i] + ', serif';
        widths.push(cx.measureText(word[i]).width);
        total += widths[i];
      }
      total += size * 0.14 * 3;
      var x = xc - total / 2;
      for (i = 0; i < 4; i++) {
        cx.font = '400 ' + size + 'px ' + faces[i] + ', serif';
        cx.fillStyle = '#f2e7cf';
        cx.save();
        cx.translate(x + widths[i] / 2, H * 0.52);
        if (!window.__REDUCED) cx.rotate((U.hash01(i * 3 + Math.floor(t * 8)) - 0.5) * 0.02);
        cx.textAlign = 'center';
        cx.fillText(word[i], 0, 0);
        cx.restore();
        x += widths[i] + size * 0.14;
      }
    }
    var f2 = fadeRise(t, C.sting + 1.0, 0.7, H * 0.01);
    if (f2) {
      cx.globalAlpha = out * f2.a;
      cx.fillStyle = '#c9a86a';
      cx.font = 'italic 300 ' + Math.round(fpx(H * 0.028, 1, H)) + 'px Fraunces, serif';
      cx.fillText('as Himself', xc, H * 0.60 + f2.dy);
    }
    var f3 = fadeRise(t, C.sting + 1.7, 0.8, 0);
    if (f3) {
      cx.globalAlpha = out * f3.a * 0.8;
      cx.fillStyle = 'rgba(111,87,48,1)';
      cx.font = '400 ' + Math.round(fpx(H * 0.015, 1, H)) + 'px "Courier Prime", monospace';
      tracked(cx, '( A REAL CHINCHILLA )', xc, H * 0.665, 0.3, 'center');
    }
    // optional real photo (assets/homemade/loki-photo.jpg) replaces the drawn silhouette
    if (A.chinPhoto && f1) {
      var pw = Math.min(H * 0.30, W * 0.30), ph = pw * (A.chinPhoto.height / A.chinPhoto.width);
      cx.globalAlpha = out * f1.a;
      cx.drawImage(A.chinPhoto, W * 0.68 - pw / 2, H * 0.50 - ph / 2, pw, ph);
      cx.strokeStyle = 'rgba(121,255,162,0.5)'; cx.lineWidth = 1.5;
      cx.strokeRect(W * 0.68 - pw / 2, H * 0.50 - ph / 2, pw, ph);
    }
    cx.restore();
  }

  /* ═══════════ ATTRIBUTION — the last cards of the roll ═══════════ */
  function paintAttr(cx, W, H, t, A) {
    var C = A.C;
    if (t < C.attr1) return;
    cx.save();
    cx.textAlign = 'center';
    var card1 = t < C.attr2 - 0.7;
    var a;
    if (card1) a = U.clamp((t - C.attr1) / 1.1, 0, 1) * U.clamp((C.attr2 - 0.7 - t) / 0.7 + 1, 0, 1);
    else a = U.clamp((t - (C.attr2 - 0.2)) / 1.2, 0, 1);
    if (t > C.attr2 - 0.7 && t < C.attr2 - 0.2) a = 0;
    cx.globalAlpha = a;

    var lh = H * 0.052, size = Math.round(fpx(H * 0.0245, 1, H)), y0;
    if (card1) {
      cx.fillStyle = 'rgba(107,190,138,0.9)';
      cx.font = '400 ' + Math.round(fpx(H * 0.016, 1, H)) + 'px "Courier Prime", monospace';
      tracked(cx, 'WITH GRATITUDE — AND FULL CREDIT', W / 2, H * 0.22, 0.42, 'center');
      var L1 = A.showMode ? ATTR1_SHOW : ATTR1_HOME;
      y0 = H * 0.5 - lh * (L1.length - 1) / 2;
      cx.fillStyle = '#e6cf9f';
      var fs = fitSize(cx, L1, '300 {s}px Fraunces, serif', size, W * 0.92);
      cx.font = '300 ' + fs + 'px Fraunces, serif';
      for (var i = 0; i < L1.length; i++) cx.fillText(L1[i], W / 2, y0 + i * lh);
      if (A.showMode) {
        cx.fillStyle = 'rgba(144,114,67,0.9)';
        var fs2 = fitSize(cx, [ATTR1_FONTS], '400 {s}px "Courier Prime", monospace', Math.round(fpx(H * 0.015, 1, H)), W * 0.94);
        cx.font = '400 ' + fs2 + 'px "Courier Prime", monospace';
        cx.fillText(ATTR1_FONTS, W / 2, H * 0.80);
      }
    } else {
      cx.fillStyle = 'rgba(107,190,138,0.9)';
      cx.font = '400 ' + Math.round(fpx(H * 0.016, 1, H)) + 'px "Courier Prime", monospace';
      tracked(cx, 'CASE CLOSED', W / 2, H * 0.22, 0.5, 'center');
      y0 = H * 0.40;
      cx.fillStyle = '#e6cf9f';
      var fsB = fitSize(cx, ATTR2, '300 {s}px Fraunces, serif', size, W * 0.92);
      cx.font = '300 ' + fsB + 'px Fraunces, serif';
      for (var k = 0; k < ATTR2.length; k++) {
        if (ATTR2[k]) cx.fillText(ATTR2[k], W / 2, y0 + k * lh);
      }
      var yL = y0 + (ATTR2.length + 0.8) * lh;
      cx.fillStyle = '#d9a54c';
      var fsL = fitSize(cx, ATTR2_LAST, 'italic 300 {s}px Fraunces, serif', size, W * 0.92);
      cx.font = 'italic 300 ' + fsL + 'px Fraunces, serif';
      for (var m = 0; m < ATTR2_LAST.length; m++) cx.fillText(ATTR2_LAST[m], W / 2, yL + m * lh);
    }
    cx.restore();
  }
  function fitSize(cx, lines, fontTpl, size, maxW) {
    var s = size, i, w, worst = 0;
    cx.font = fontTpl.replace('{s}', s);
    for (i = 0; i < lines.length; i++) { w = cx.measureText(lines[i]).width; if (w > worst) worst = w; }
    if (worst > maxW) s = Math.floor(s * maxW / worst);
    return s;
  }

  window.SCENES = {
    setCssHeight: function (h) { VPH = h; },
    paintAll: function (cx, W, H, t, A) {
      paintDossier1(cx, W, H, t, A);
      paintCast(cx, W, H, t, A);
      paintTally(cx, W, H, t, A);
      paintCrew(cx, W, H, t, A);
      paintDossier2(cx, W, H, t, A);
      paintTurn(cx, W, H, t, A);
      paintSting(cx, W, H, t, A);
      paintAttr(cx, W, H, t, A);
    }
  };
})();
