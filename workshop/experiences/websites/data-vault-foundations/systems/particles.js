/**
 * particles.js — DV-themed star constellation background
 * Shared particle system for chapters without their own inline version.
 * Auto-detects canvas by ID: 'particle-field' or 'bg-canvas'.
 */
(function() {
  var canvas = document.getElementById('particle-field') || document.getElementById('bg-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var stars = [];
  var mouse = { x: -1000, y: -1000, active: false };
  var w, h;
  var CONNECT_DIST = 160;
  var MOUSE_RADIUS = 220;
  var STAR_COUNT = 110;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  document.addEventListener('mousemove', function(e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    var t = e.target;
    var isBackground = (
      t === document.body ||
      t === document.documentElement ||
      t.classList.contains('section') ||
      t.classList.contains('page-content') ||
      t.classList.contains('parallax-layer') ||
      t.id === 'particle-field' ||
      t.id === 'bg-canvas'
    );
    mouse.active = isBackground;
  });
  document.addEventListener('mouseleave', function() {
    mouse.active = false;
  });

  function createStar() {
    var isHub = Math.random() < 0.15;
    var colors = [
      { r: 0, g: 180, b: 255 },
      { r: 6, g: 212, b: 232 },
      { r: 140, g: 100, b: 255 },
      { r: 245, g: 158, b: 11 },
      { r: 200, g: 130, b: 255 }
    ];
    var color;
    if (isHub) {
      color = Math.random() < 0.6 ? colors[1] : colors[3];
    } else {
      color = colors[Math.floor(Math.random() * colors.length)];
      if (Math.random() < 0.5) color = colors[Math.floor(Math.random() * 2)];
    }

    var driftAngle = Math.random() * Math.PI * 2;
    var driftSpeed = isHub ? (Math.random() * 0.15 + 0.1) : (Math.random() * 0.25 + 0.12);
    var driftTurn = (Math.random() - 0.5) * 0.008;

    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      baseSize: isHub ? (Math.random() * 2 + 2.5) : (Math.random() * 1.5 + 0.8),
      r: color.r, g: color.g, b: color.b,
      opacity: isHub ? (Math.random() * 0.3 + 0.6) : (Math.random() * 0.35 + 0.2),
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: Math.random() * 0.012 + 0.004,
      isHub: isHub,
      driftAngle: driftAngle,
      driftSpeed: driftSpeed,
      driftTurn: driftTurn
    };
  }

  for (var i = 0; i < STAR_COUNT; i++) {
    stars.push(createStar());
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);

    for (var i = 0; i < stars.length; i++) {
      var p = stars[i];
      p.pulse += p.pulseSpeed;

      p.driftAngle += p.driftTurn;
      if (Math.random() < 0.005) p.driftTurn = (Math.random() - 0.5) * 0.008;
      p.vx += Math.cos(p.driftAngle) * p.driftSpeed * 0.03;
      p.vy += Math.sin(p.driftAngle) * p.driftSpeed * 0.03;

      if (mouse.active) {
        var mdx = mouse.x - p.x;
        var mdy = mouse.y - p.y;
        var mDist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mDist < MOUSE_RADIUS && mDist > 1) {
          var strength = (MOUSE_RADIUS - mDist) / MOUSE_RADIUS;
          var attract = strength * strength * 0.08;
          p.vx += (mdx / mDist) * attract;
          p.vy += (mdy / mDist) * attract;
        }
      }

      p.vx *= 0.985;
      p.vy *= 0.985;
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < -20) p.x = w + 20;
      if (p.x > w + 20) p.x = -20;
      if (p.y < -20) p.y = h + 20;
      if (p.y > h + 20) p.y = -20;
    }

    ctx.lineWidth = 0.8;
    for (var i = 0; i < stars.length; i++) {
      for (var j = i + 1; j < stars.length; j++) {
        var dx = stars[i].x - stars[j].x;
        var dy = stars[i].y - stars[j].y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONNECT_DIST) {
          var fade = 1 - dist / CONNECT_DIST;
          var hubBoost = (stars[i].isHub || stars[j].isHub) ? 1.8 : 1;
          var lineAlpha = fade * fade * 0.15 * hubBoost;

          var lr = Math.round((stars[i].r + stars[j].r) / 2);
          var lg = Math.round((stars[i].g + stars[j].g) / 2);
          var lb = Math.round((stars[i].b + stars[j].b) / 2);

          ctx.beginPath();
          ctx.moveTo(stars[i].x, stars[i].y);
          ctx.lineTo(stars[j].x, stars[j].y);
          ctx.strokeStyle = 'rgba(' + lr + ',' + lg + ',' + lb + ',' + lineAlpha + ')';
          ctx.stroke();
        }
      }
    }

    if (mouse.active) {
      for (var i = 0; i < stars.length; i++) {
        var mdx = stars[i].x - mouse.x;
        var mdy = stars[i].y - mouse.y;
        var mDist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mDist < MOUSE_RADIUS) {
          var mFade = 1 - mDist / MOUSE_RADIUS;
          ctx.beginPath();
          ctx.moveTo(mouse.x, mouse.y);
          ctx.lineTo(stars[i].x, stars[i].y);
          ctx.strokeStyle = 'rgba(0, 200, 255, ' + (mFade * mFade * 0.2) + ')';
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }

    for (var i = 0; i < stars.length; i++) {
      var p = stars[i];
      var pulseVal = 0.6 + 0.4 * Math.sin(p.pulse);
      var currentOpacity = p.opacity * pulseVal;
      var currentSize = p.baseSize * (0.85 + 0.15 * Math.sin(p.pulse));

      var proximityBoost = 1;
      if (mouse.active) {
        var mdx = p.x - mouse.x;
        var mdy = p.y - mouse.y;
        var mDist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mDist < MOUSE_RADIUS) {
          proximityBoost = 1 + (1 - mDist / MOUSE_RADIUS) * 1.5;
        }
      }

      var boostedOpacity = Math.min(currentOpacity * proximityBoost, 1);

      var glowRadius = currentSize * (p.isHub ? 8 : 5);
      var grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowRadius);
      grd.addColorStop(0, 'rgba(' + p.r + ',' + p.g + ',' + p.b + ',' + (boostedOpacity * 0.3) + ')');
      grd.addColorStop(0.4, 'rgba(' + p.r + ',' + p.g + ',' + p.b + ',' + (boostedOpacity * 0.08) + ')');
      grd.addColorStop(1, 'rgba(' + p.r + ',' + p.g + ',' + p.b + ',0)');
      ctx.beginPath();
      ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + Math.min(p.r + 60, 255) + ',' + Math.min(p.g + 60, 255) + ',' + Math.min(p.b + 60, 255) + ',' + boostedOpacity + ')';
      ctx.fill();

      if (p.isHub) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentSize * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, ' + (boostedOpacity * 0.7) + ')';
        ctx.fill();
      }
    }

    requestAnimationFrame(draw);
  }
  draw();
})();
