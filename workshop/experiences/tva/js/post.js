/* ═══════════════════════════════════════════════════════════════════════
   post.js — the grade. The 2D film frame (comp canvas) is uploaded as a
   texture every frame and printed through a WebGL chain:
     bright-pass → 2× separable gaussian  ...... halation/bloom
     final pass  ...... gate weave, barrel, scan-warp wobble, chromatic
                        aberration, phosphor cast, wavy scanlines,
                        luminance-weighted grain, vignette, flash,
                        projector flicker, film-base lift.
   Everything organic listens to uStill so the film can hold its breath.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var VS = [
    'attribute vec2 aPos;',
    'varying vec2 vUv;',
    'void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }'
  ].join('\n');

  var FS_BRIGHT = [
    'precision mediump float;',
    'varying vec2 vUv;',
    'uniform sampler2D uTex;',
    'uniform float uThresh;',
    'void main(){',
    '  vec3 c = texture2D(uTex, vUv).rgb;',
    '  float l = dot(c, vec3(0.299, 0.587, 0.114));',
    '  gl_FragColor = vec4(c * smoothstep(uThresh, uThresh + 0.28, l), 1.0);',
    '}'
  ].join('\n');

  var FS_BLUR = [
    'precision mediump float;',
    'varying vec2 vUv;',
    'uniform sampler2D uTex;',
    'uniform vec2 uDir;',
    'void main(){',
    '  vec3 c = texture2D(uTex, vUv).rgb * 0.227027;',
    '  c += texture2D(uTex, vUv + uDir * 1.3846153846).rgb * 0.3162162162;',
    '  c += texture2D(uTex, vUv - uDir * 1.3846153846).rgb * 0.3162162162;',
    '  c += texture2D(uTex, vUv + uDir * 3.2307692308).rgb * 0.0702702703;',
    '  c += texture2D(uTex, vUv - uDir * 3.2307692308).rgb * 0.0702702703;',
    '  gl_FragColor = vec4(c, 1.0);',
    '}'
  ].join('\n');

  var FS_FINAL = [
    'precision mediump float;',
    'varying vec2 vUv;',
    'uniform sampler2D uTex;',
    'uniform sampler2D uBloomTex;',
    'uniform sampler2D uNoise;',
    'uniform vec2 uRes;',
    'uniform vec2 uWeave;',
    'uniform float uFrame, uWobble, uGrain, uVig, uFlicker, uCAmt, uBloomAmt, uBarrel, uGreen, uScan;',
    'uniform vec4 uFlash;',
    'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'void main(){',
    '  vec2 uv = vUv + uWeave / uRes;',
    '  vec2 c = uv - 0.5;',
    '  uv = 0.5 + c * (1.0 + uBarrel * dot(c, c));',
    '  vec2 n = texture2D(uNoise, uv * 3.1 + vec2(fract(uFrame * 0.37), fract(uFrame * 0.61))).rg - 0.5;',
    '  uv += n * uWobble / uRes;',
    '  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {',
    '    gl_FragColor = vec4(0.018, 0.013, 0.009, 1.0); return;',
    '  }',
    '  vec2 off = c * uCAmt;',
    '  vec3 col;',
    '  col.r = texture2D(uTex, uv + off).r;',
    '  col.g = texture2D(uTex, uv).g;',
    '  col.b = texture2D(uTex, uv - off).b;',
    '  col += texture2D(uBloomTex, uv).rgb * uBloomAmt;',
    '  float shadow = 1.0 - clamp(dot(col, vec3(0.333)) * 1.4, 0.0, 1.0);',
    '  col = mix(col, col * vec3(0.94, 1.06, 0.97) + vec3(0.0, 0.012, 0.004), uGreen * shadow);',
    '  float sl = sin((uv.y + n.x * 0.002) * uRes.y * 3.14159);',
    '  col *= 1.0 - uScan * (0.5 + 0.5 * sl) * 0.5;',
    '  float g = hash(floor(uv * uRes) + vec2(uFrame * 13.1, uFrame * 7.7)) - 0.5;',
    '  float lum = dot(col, vec3(0.299, 0.587, 0.114));',
    '  col += g * uGrain * (0.25 + 1.8 * lum * (1.0 - lum));',
    '  float vig = smoothstep(1.15, 0.32, length(c) * 1.6);',
    '  col *= mix(1.0, vig, uVig);',
    '  col = mix(col, uFlash.rgb, uFlash.a);',
    '  col *= 1.0 - uFlicker * hash(vec2(uFrame, 3.7));',
    '  col = pow(max(col, 0.0), vec3(0.96));',
    '  col += vec3(0.016, 0.011, 0.007);',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function compile(gl, type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src); gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      throw new Error('shader: ' + gl.getShaderInfoLog(sh));
    }
    return sh;
  }
  function program(gl, fs) {
    var p = gl.createProgram();
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VS));
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(p));
    return p;
  }

  function Post(canvas) {
    var gl = this.gl = canvas.getContext('webgl', { antialias: false, depth: false, stencil: false, alpha: false, preserveDrawingBuffer: false });
    if (!gl) throw new Error('no webgl');
    this.cv = canvas;

    this.pBright = program(gl, FS_BRIGHT);
    this.pBlur = program(gl, FS_BLUR);
    this.pFinal = program(gl, FS_FINAL);

    var quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    this.quad = quad;

    // comp texture (uploaded per frame)
    this.texComp = this.makeTex(gl.LINEAR, gl.CLAMP_TO_EDGE);
    // noise texture (128 POT, repeat, linear → smooth displacement field)
    this.texNoise = this.makeTex(gl.LINEAR, gl.REPEAT);
    var nd = new Uint8Array(128 * 128 * 4);
    var seed = 1234567;
    for (var i = 0; i < nd.length; i++) {
      seed = (seed * 16807) % 2147483647;
      nd[i] = seed % 255;
    }
    var glc = this.gl;
    glc.bindTexture(glc.TEXTURE_2D, this.texNoise);
    glc.texImage2D(glc.TEXTURE_2D, 0, glc.RGBA, 128, 128, 0, glc.RGBA, glc.UNSIGNED_BYTE, nd);

    this.fbos = [];   // [{fb, tex, w, h}] ×3 : bright, ping, pong
    this.w = 0; this.h = 0;
    this.uni = {};
    this.cacheLoc();
  }
  Post.prototype.makeTex = function (filter, wrap) {
    var gl = this.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    return t;
  };
  Post.prototype.makeFbo = function (w, h) {
    var gl = this.gl;
    var tex = this.makeTex(gl.LINEAR, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    var fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { fb: fb, tex: tex, w: w, h: h };
  };
  Post.prototype.cacheLoc = function () {
    var gl = this.gl, self = this;
    function locs(p, names) {
      var o = { p: p, a: gl.getAttribLocation(p, 'aPos') };
      names.forEach(function (n) { o[n] = gl.getUniformLocation(p, n); });
      return o;
    }
    this.LB = locs(this.pBright, ['uTex', 'uThresh']);
    this.LU = locs(this.pBlur, ['uTex', 'uDir']);
    this.LF = locs(this.pFinal, ['uTex', 'uBloomTex', 'uNoise', 'uRes', 'uWeave', 'uFrame', 'uWobble', 'uGrain', 'uVig', 'uFlicker', 'uCAmt', 'uBloomAmt', 'uBarrel', 'uGreen', 'uScan', 'uFlash']);
  };
  Post.prototype.resize = function (w, h) {
    var gl = this.gl;
    this.w = w; this.h = h;
    this.cv.width = w; this.cv.height = h;
    var bw = Math.max(2, Math.floor(w / 4)), bh = Math.max(2, Math.floor(h / 4));
    this.fbos = [this.makeFbo(bw, bh), this.makeFbo(bw, bh), this.makeFbo(bw, bh)];
  };
  Post.prototype.drawQuad = function (L) {
    var gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.enableVertexAttribArray(L.a);
    gl.vertexAttribPointer(L.a, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  Post.prototype.render = function (comp, u) {
    var gl = this.gl;
    // 1) upload the film frame
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texComp);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, comp);

    var B = this.fbos[0], P1 = this.fbos[1], P2 = this.fbos[2];
    // 2) bright pass → B
    gl.bindFramebuffer(gl.FRAMEBUFFER, B.fb);
    gl.viewport(0, 0, B.w, B.h);
    gl.useProgram(this.pBright);
    gl.uniform1i(this.LB.uTex, 0);
    gl.uniform1f(this.LB.uThresh, 0.42);
    this.drawQuad(this.LB);
    // 3) blur ping-pong ×2
    var src = B, dst = P1, pass;
    gl.useProgram(this.pBlur);
    gl.uniform1i(this.LU.uTex, 0);
    for (pass = 0; pass < 4; pass++) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb);
      gl.viewport(0, 0, dst.w, dst.h);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, src.tex);
      if (pass % 2 === 0) gl.uniform2f(this.LU.uDir, 1.35 / src.w, 0);
      else gl.uniform2f(this.LU.uDir, 0, 1.35 / src.h);
      this.drawQuad(this.LU);
      var tmp = (pass === 0) ? P2 : src;
      src = dst; dst = tmp;
    }
    // 4) final to screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.w, this.h);
    gl.useProgram(this.pFinal);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texComp);
    gl.uniform1i(this.LF.uTex, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, src.tex);
    gl.uniform1i(this.LF.uBloomTex, 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.texNoise);
    gl.uniform1i(this.LF.uNoise, 2);
    gl.uniform2f(this.LF.uRes, this.w, this.h);
    gl.uniform2f(this.LF.uWeave, u.weaveX, u.weaveY);
    gl.uniform1f(this.LF.uFrame, u.frame);
    gl.uniform1f(this.LF.uWobble, u.wobble);
    gl.uniform1f(this.LF.uGrain, u.grain);
    gl.uniform1f(this.LF.uVig, u.vig);
    gl.uniform1f(this.LF.uFlicker, u.flicker);
    gl.uniform1f(this.LF.uCAmt, u.ca);
    gl.uniform1f(this.LF.uBloomAmt, u.bloom);
    gl.uniform1f(this.LF.uBarrel, u.barrel);
    gl.uniform1f(this.LF.uGreen, u.green);
    gl.uniform1f(this.LF.uScan, u.scan);
    gl.uniform4f(this.LF.uFlash, u.flashR, u.flashG, u.flashB, u.flashA);
    this.drawQuad(this.LF);
  };

  window.Post = Post;
})();
