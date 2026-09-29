/* ============================================================
   THE BRIDGE — production design.
   Seven procedural particle worlds + the gate embers. All motion
   runs in the vertex shader (uMode branches); JS only flips
   uniforms. Each realm ≈ one life-area, one palette, one motion.
   ============================================================ */
window.FILM = window.FILM || {};
FILM.realms = (function () {
  'use strict';

  var VERT = [
    'attribute vec4 aSeed;',
    'attribute vec3 aColor;',
    'attribute float aSize;',
    'attribute float aAlpha;',
    'uniform float uTime,uMode,uProg,uPR;',
    'varying vec3 vColor;varying float vAlpha;',
    'void main(){',
    '  vec3 p=position;',
    '  float s1=aSeed.x,s2=aSeed.y,s3=aSeed.z,s4=aSeed.w;',
    '  float va=aAlpha;',
    '  float goldMix=0.;',                                       /* origin contact-gold (mode 1) */
    '  float heatMix=0.;',                                       /* peacemaker disk heat (mode 3) */
    '  if(uMode<0.5){',                                          /* 0 · gate embers */
    '    p.y=mod(p.y+uTime*(0.5+s3*0.8),24.)-12.;',
    '    p.x+=sin(uTime*(.3+s2*.4)+s1*6.283)*1.2;',
    '    va*= .45+.55*sin(uTime*(1.+s4*2.)+s1*40.);',
    /* tag updraft — uProg is zero at the gate and cold open; only the stinger
       drives it: ~40% of the embers (s4-gated) gather toward the ignition
       point so the mini portal condenses OUT of the ember field
       (Lorenzo, 2026-07-08: floor and portal must feel related). */
    '    float pull=uProg*smoothstep(.35,1.,s4);',
    '    p=mix(p,vec3(p.x*.2,.5+p.y*.15,-11.+(p.z+11.)*.2),pull*pull);',
    '    va*=1.+pull*.8;',
    '  }else if(uMode<1.5){',                                    /* 1 · origin — two star clusters merge */
    '    float side=(s2<.5)?-1.:1.;',
    '    float ang=uTime*.05*side+s4*.35;',
    '    float ca=cos(ang),sa=sin(ang);',
    '    p=vec3(p.x*ca-p.z*sa,p.y,p.x*sa+p.z*ca);',      /* cluster-local spin */
    '    float sep=mix(13.,2.1,uProg);',
    '    p.x+=side*sep;',
    '    p.z-=24.;',
    '    va*= .4+.6*(.5+.5*sin(uTime*(1.2+s3*2.6)+s1*45.));',
    /* contact ignition — particles inside the OTHER cluster's reach (r≈7.5,
       feathered so a few adjacent catch too) turn portal-gold and brighten.
       Geometry gates it: possible only once the spheres actually meet
       (uProg≳.46), peaking exactly as the chapter hands off to the golden
       portal (Lorenzo, 2026-07-08: the first golden light of the film). */
    '    float dOth=distance(p,vec3(-side*sep,0.,-24.));',
    '    float gold=smoothstep(9.2,6.2,dOth);',
    '    va*=1.+gold*.7;',
    '    goldMix=gold*.9;',
    '  }else if(uMode<2.5){',                                    /* 2 · advocate — rising marble light */
    '    p.y=mod(p.y+uTime*(.5+s3*.55),22.)-9.;',
    '    p.x+=sin(uTime*.6+s1*6.283)*.14;',
    '    va*= .55+.45*sin(uTime*(.8+s4)+s1*30.);',
    '  }else if(uMode<3.5){',                                    /* 3 · peacemaker — two currents converge */
    '    float side=(s2<.5)?-1.:1.;',
    '    float ph=fract(s1+uTime*(.016+.02*s3));',
    '    if(ph<.55){float k=ph/.55;',
    '      p.x=side*mix(30.,3.2,k);',
    '      p.y=sin(k*9.+s4*6.283)*2.6*(1.-k*.7)+(s4-.5)*3.;',
    '      p.z=-18.+(s3-.5)*14.-k*4.;',
    '    }else{float k=(ph-.55)/.45;',
    /* accretion disk (Lorenzo, 2026-07-09): thin tilted annulus, empty center.
       sqrt = uniform areal density (the heat must come from LIGHT, not pile-up);
       pow(r,-1.5) = Keplerian shear (inner edge laps ~2.4x faster);
       cos(ang) doppler = one lateral side bright, the other dim. All jade. */
    '      float r=sqrt(mix(6.76,31.36,s3));',
    '      float ang=k*8.48*pow(3.9/r,1.5)+s4*6.283+side*1.57;',
    '      p.x=cos(ang)*r;p.y=sin(ang)*r*.34;p.z=-22.+(s4-.5)*2.4;',
    '      float heat=smoothstep(4.4,2.7,r);',
    '      va*=(1.+heat*1.6)*(.78+.45*cos(ang));',
    '      heatMix=heat*.85;}',
    '    va*=smoothstep(0.,.05,ph)*smoothstep(1.,.95,ph);',
    '  }else if(uMode<4.5){',                                    /* 4 · builder — data streams on the grid */
    '    p.y=mod(p.y+uTime*(1.2+s3*2.4),26.)-10.;',
    '    float fl=step(.3,fract(s4*91.+uTime*(2.+s3*3.)));',
    '    va*=mix(.3,1.,fl);',
    '  }else if(uMode<5.5){',                                    /* 5 · game master — power orbs bobbing */
    '    float ang=uTime*.035;float ca=cos(ang),sa=sin(ang);',
    '    p=vec3(p.x*ca-p.z*sa,p.y,p.x*sa+p.z*ca);',      /* swirl around own center */
    '    p.z-=27.;',
    '    p.y+=abs(sin(uTime*(.55+s3*.9)+s4*6.283))*2.3;',
    '    va*= .5+.5*sin(uTime*(1.5+s3)+s1*20.);',
    '  }else if(uMode<6.5){',                                    /* 6 · storyteller — lines of type drifting */
    '    float row=floor((position.y+12.)/1.1);',
    '    float dir=(mod(row,2.)<1.)?1.:-1.;',
    '    p.x=mod(p.x+dir*uTime*(1.1+s3),44.)-22.;',
    '    va*= .5+.5*sin(uTime*(.7+s4)+s1*25.);',
    '  }else{',                                                  /* 7 · assembly — six currents braid into one */
    '    p.x=mod(p.x+uTime*(3.+s3*2.),64.)-32.;',
    '    float strand=floor(s1*5.999);',
    '    float conv=smoothstep(-26.,14.,p.x);',
    '    float spread=mix(7.,.8,conv);',
    '    p.y=(strand/5.-.5)*2.*spread+sin(p.x*.32+uTime*1.6+strand*1.05)*spread*.5;',
    '    p.z=-20.+(s4-.5)*8.*(1.-conv*.6);',
    '    va*=(.55+.45*sin(uTime*2.+s1*30.))*(1.+conv*.7);',
    '  }',
    '  vec4 mv=modelViewMatrix*vec4(p,1.);',
    '  float depthDim=smoothstep(-80.,-6.,mv.z);',
    '  vAlpha=va*mix(.25,1.,depthDim);',
    '  vColor=mix(aColor,mix(vec3(1.,.42,.08),vec3(1.,.72,.28),s3)*1.15,goldMix);', /* ring-shader gold */
    '  vColor=mix(vColor,vec3(.72,1.,.86)*1.35,heatMix);',       /* disk inner edge: pale green-white, HDR */
    '  gl_PointSize=clamp(aSize*uPR*(70./-mv.z),1.,44.);',
    '  gl_Position=projectionMatrix*mv;',
    '}'
  ].join('\n');

  var FRAG = [
    'uniform float uAlpha,uHdr;',
    'varying vec3 vColor;varying float vAlpha;',
    'void main(){',
    '  float d=length(gl_PointCoord-.5);',
    '  float a=smoothstep(.5,.06,d)*vAlpha*uAlpha;',
    '  if(a<.003)discard;',
    '  gl_FragColor=vec4(vColor*uHdr*a,a);',
    '}'
  ].join('\n');

  /* ---------- palettes & definitions ---------- */
  var C = function (hex) { return new THREE.Color(hex); };
  var DEFS = {
    embers:      { mode: 0, n: 700,  bg: 0x04060c, hdr: 1.5, colors: [0xffa94d, 0xe8b34b, 0xfff3d8] },
    /* the tag portal's WINDOW world — identical embers, separate group, so
       opening the mini portal onto "embers" no longer reparents (= empties)
       the live stage field into the RT scene: that world-vanish at ignition
       was the "floor and portal feel unrelated" root cause (Lorenzo, 2026-07-08) */
    embers2:     { mode: 0, n: 700,  bg: 0x04060c, hdr: 1.5, colors: [0xffa94d, 0xe8b34b, 0xfff3d8] },
    origin:      { mode: 1, n: 5200, bg: 0x05060f, hdr: 1.25, colors: [0xcdd3ff, 0x8a7cff, 0xffffff, 0xaab4ff] },
    advocate:    { mode: 2, n: 4200, bg: 0x0b0805, hdr: 1.35, colors: [0xe8b34b, 0xf5ce7e, 0xfff3d8] },
    peacemaker:  { mode: 3, n: 5200, bg: 0x05100a, hdr: 1.3, colors: [0x7fe0b8, 0xd9e2e6, 0xbdf3dd] },
    builder:     { mode: 4, n: 5600, bg: 0x041018, hdr: 1.45, colors: [0x6fd6e8, 0xa3e8f4, 0xffffff] },
    gamemaster:  { mode: 5, n: 3400, bg: 0x0e0616, hdr: 1.4, colors: [0xc77dff, 0xff7dd1, 0xffd166, 0xe9c8ff] },
    storyteller: { mode: 6, n: 6200, bg: 0x120c04, hdr: 1.3, colors: [0xffd9a0, 0xf2e6ce, 0xffc46b] },
    assembly:    { mode: 7, n: 6800, bg: 0x04060c, hdr: 1.5,
                   colors: [0x8a7cff, 0xe8b34b, 0x7fe0b8, 0x6fd6e8, 0xc77dff, 0xffd9a0] }
  };

  var built = {}, activeKey = null, allMats = [], qualityMult = 1;
  var updaters = [];   /* self-animating set dressing (scan beam, pages…) */

  /* ---------- shared glow texture (sprites) ----------
     Written per-pixel, NOT via createRadialGradient: Safari's Canvas2D
     dithers gradients, and that baked ±1-bit noise — magnified onto big
     additive glows, then bloomed — reads as colored "confetti" speckle.
     Same falloff, same stops (1 → .45 @ .35 → 0), just computed. */
  var glowTexes = {};
  function getGlowTex(profile) {
    var key = profile || 'soft';
    if (glowTexes[key]) return glowTexes[key];
    var cv = document.createElement('canvas'); cv.width = cv.height = 128;
    var g = cv.getContext('2d');
    var img = g.createImageData(128, 128), d = img.data;
    for (var y = 0; y < 128; y++) for (var x = 0; x < 128; x++) {
      var dx = (x + 0.5 - 64) / 64, dy = (y + 0.5 - 64) / 64;
      var r = Math.sqrt(dx * dx + dy * dy), a;
      if (key === 'core') {
        /* nucleus-bright (comets): full to r=.12, fast fall, faint wide skirt
           — "same asset, different config" (Lorenzo, 2026-07-09) */
        a = r >= 1 ? 0 : r < 0.12 ? 1 : r < 0.35 ? 1 - 0.7 * ((r - 0.12) / 0.23) : 0.3 * (1 - (r - 0.35) / 0.65);
      } else if (key === 'corona') {
        /* diffuse corona (the stones' radiator): angular noise breaks the circle —
           splotchy, never a clean ring (Lorenzo, 2026-07-09). Per-pixel, Safari-safe. */
        var th = Math.atan2(dy, dx);
        var n = 0.62 + 0.38 * Math.sin(th * 3 + 1.7) * Math.sin(th * 5 - 0.9)
              + 0.14 * Math.sin(th * 7 + r * 9);
        var base = r >= 1 ? 0 : Math.pow(1 - r, 1.6) * 1.0;
        a = Math.max(0, Math.min(1, base * n));
      } else {
        a = r >= 1 ? 0 : r < 0.35 ? 1 - 0.55 * (r / 0.35) : 0.45 * (1 - (r - 0.35) / 0.65);
      }
      var i = (y * 128 + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = 255;
      d[i + 3] = Math.round(a * 255);
    }
    g.putImageData(img, 0, 0);
    glowTexes[key] = new THREE.CanvasTexture(cv);
    return glowTexes[key];
  }
  function atmosphere(hex, sx, sy, x, y, z, opacity) {
    var m = new THREE.SpriteMaterial({
      map: getGlowTex(), color: hex, transparent: true, opacity: opacity,
      blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false
    });
    var s = new THREE.Sprite(m);
    s.scale.set(sx, sy, 1); s.position.set(x, y, z);
    return s;
  }

  /* ---------- raw crystal nuggets (assembly stones) ----------
     Irregular multi-facet stones (reference: Lorenzo's image, 2026-07-09).
     Jitter is a HASH OF POSITION so duplicated verts displace together
     (watertight); non-indexed + computeVertexNormals = flat glinting facets. */
  function crystalGeo(seed) {
    var geo = new THREE.IcosahedronGeometry(0.45, 2);
    if (geo.index) geo = geo.toNonIndexed();
    var pos = geo.attributes.position, v = new THREE.Vector3();
    for (var i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      var h = Math.sin(v.x * 127.1 + v.y * 311.7 + v.z * 74.7 + seed * 43.7) * 43758.5453;
      h -= Math.floor(h);                                   /* fine facet chunk .78–1.18 */
      var lump = Math.sin(v.x * 5.1 + seed * 7.3) * Math.sin(v.y * 4.1 - seed * 5.1) * 0.16;
      var k = 0.78 + h * 0.4 + lump;                        /* large-scale asymmetry */
      pos.setXYZ(i, v.x * k, v.y * k, v.z * k);
    }
    geo.computeVertexNormals();
    return geo;
  }

  /* fresnel rim + luminous heart — ported from holographic-blueprint
     helmet-gltf (de-moduled); still a world of LIGHT: additive, no depth */
  var STONE_VERT = [
    'varying vec3 vN;varying vec3 vV;',
    'void main(){',
    '  vN=normalize(normalMatrix*normal);',
    '  vec4 mv=modelViewMatrix*vec4(position,1.);',
    '  vV=-mv.xyz;',
    '  gl_Position=projectionMatrix*mv;',
    '}'
  ].join('\n');
  var STONE_FRAG = [
    'uniform vec3 uColor;uniform float uAlpha,uHdr;',
    'varying vec3 vN;varying vec3 vV;',
    'void main(){',
    '  vec3 V=normalize(vV);vec3 N=normalize(vN);',
    '  float d=clamp(dot(V,N),0.,1.);',
    '  float fres=pow(1.-d,2.2);',
    '  vec3 col=mix(uColor*.55,uColor*1.25,smoothstep(0.,.7,fres));',  /* body -> rim */
    '  col=mix(col,vec3(1.05),smoothstep(.78,1.,fres));',              /* cool-white tipover */
    '  float heart=pow(d,2.5)*.5;',                                    /* luminous heart */
    '  col+=uColor*heart;',
    '  float a=(.16+heart*.4+pow(fres,1.5)*.5)*uAlpha;',
    '  if(a<.004)discard;',
    '  gl_FragColor=vec4(col*uHdr*a,a);',
    '}'
  ].join('\n');

  /* the snap (Lorenzo, 2026-07-09): burst on landing, remains entrained by the
     braid — disperse model ported from holo-modeler (vertex-seeded), reuses FRAG */
  var SNAP_VERT = [
    'attribute vec4 aSeed;attribute vec3 aColor;attribute float aSize;',
    'uniform float uProg,uTime,uPR;',
    'varying vec3 vColor;varying float vAlpha;',
    'void main(){',
    '  float s1=aSeed.x,s2=aSeed.y,s3=aSeed.z,s4=aSeed.w;',
    '  float lp=clamp((uProg-s2*.16)/.84,0.,1.);',              /* per-flake delay */
    '  float e=lp*lp;',
    '  float th=s1*6.283;float cp=s3*2.-1.;float sq=sqrt(1.-cp*cp);',
    '  vec3 dir=vec3(cos(th)*sq,cp*.8,sin(th)*sq*.5);',         /* spherical burst */
    '  vec3 p=position+dir*e*(1.1+s4*1.6);',
    '  float ent=smoothstep(.3,.85,lp);',                       /* caught by the stream */
    '  p.x+=ent*ent*(3.4+s3*1.6);',
    '  p.y=mix(p.y,p.y*.35+sin(p.x*.32+uTime*1.6)*.7,ent);',    /* toward the weave line */
    '  p.x+=sin(uTime*9.+s4*40.)*.05*lp;p.y+=cos(uTime*7.+s1*40.)*.05*lp;',
    '  float flash=smoothstep(0.,.14,lp);',                     /* lockstep crossfade window */
    '  vAlpha=flash*(1.-lp*lp)*step(.001,uProg)*(1.-step(.999,uProg));',
    '  vColor=aColor*(1.+(1.-lp)*.9);',                         /* brightness spike at birth */
    '  vec4 mv=modelViewMatrix*vec4(p,1.);',
    '  gl_PointSize=clamp(aSize*uPR*(1.-lp*.55)*(70./-mv.z),1.,22.);',
    '  gl_Position=projectionMatrix*mv;',
    '}'
  ].join('\n');

  /* ---------- per-mode base distributions ---------- */
  function basePositions(def) {
    var n = def.n, pos = new Float32Array(n * 3), R = Math.random;
    for (var i = 0; i < n; i++) {
      var x = 0, y = 0, z = 0, m = def.mode;
      if (m === 0) { x = (R() - .5) * 46; y = (R() - .5) * 24; z = -8 - R() * 30; }
      else if (m === 1) { /* sphere cluster, centered — depth offset applied in-shader */
        var r = Math.pow(R(), .5) * 7.5, th = R() * 6.283, ph2 = Math.acos(2 * R() - 1);
        x = r * Math.sin(ph2) * Math.cos(th); y = r * Math.sin(ph2) * Math.sin(th) * .72; z = r * Math.cos(ph2);
      }
      else if (m === 2) { /* colonnade cylinders */
        var col = (i % 8), sideA = col < 4 ? -1 : 1, rank = col % 4;
        var cx = sideA * (5.2 + rank * 1.1), cz = -10 - rank * 9 - R() * 4;
        var rr = 1.1 + R() * .9, aa = R() * 6.283;
        x = cx + Math.cos(aa) * rr; z = cz + Math.sin(aa) * rr; y = (R() - .5) * 22;
      }
      else if (m === 3) { x = 0; y = 0; z = -20; /* fully shader-driven */ }
      else if (m === 4) { /* grid columns */
        x = (Math.floor(R() * 17) - 8) * 3.2 + (R() - .5) * .4;
        z = -8 - Math.floor(R() * 16) * 3.2 + (R() - .5) * .4;
        y = (R() - .5) * 26;
      }
      else if (m === 5) { x = (R() - .5) * 40; y = -6 + R() * 10; z = (R() - .5) * 34; }
      else if (m === 6) { /* rows of type */
        var row = Math.floor(R() * 22); y = row * 1.1 - 12;
        x = (R() - .5) * 44; z = -12 - R() * 26 + (row % 4) * 1.2;
      }
      else { x = (R() - .5) * 64; y = 0; z = -20; /* braid: shader-driven */ }
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    }
    return pos;
  }

  function build(key) {
    if (built[key]) return built[key];
    var def = DEFS[key];
    var geo = new THREE.BufferGeometry();
    var n = def.n;
    geo.setAttribute('position', new THREE.BufferAttribute(basePositions(def), 3));
    var seeds = new Float32Array(n * 4), cols = new Float32Array(n * 3),
        sizes = new Float32Array(n), alphas = new Float32Array(n);
    var palette = def.colors.map(C);
    for (var i = 0; i < n; i++) {
      seeds[i * 4] = Math.random(); seeds[i * 4 + 1] = Math.random();
      seeds[i * 4 + 2] = Math.random(); seeds[i * 4 + 3] = Math.random();
      var c = palette[def.mode === 7 ? Math.floor(seeds[i * 4] * 5.999) : Math.floor(Math.random() * palette.length)];
      var jit = .82 + Math.random() * .36;
      cols[i * 3] = Math.min(1, c.r * jit); cols[i * 3 + 1] = Math.min(1, c.g * jit); cols[i * 3 + 2] = Math.min(1, c.b * jit);
      var glow = Math.random() < (def.mode === 5 ? .2 : .035);
      sizes[i] = glow ? (def.mode === 5 ? 10 + Math.random() * 14 : 6 + Math.random() * 9)
                      : (1.1 + Math.random() * 1.7);
      alphas[i] = glow ? (def.mode === 5 ? .12 : .09) : (.16 + Math.random() * .24);
    }
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
    geo.setAttribute('aColor', new THREE.BufferAttribute(cols, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
    var mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uMode: { value: def.mode }, uProg: { value: 0 },
        uAlpha: { value: 1 }, uHdr: { value: def.hdr },
        uPR: { value: Math.min(1.5, devicePixelRatio || 1) }
      },
      vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, depthTest: false,
      blending: THREE.AdditiveBlending
    });
    allMats.push(mat);
    var pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    var group = new THREE.Group();
    group.add(pts);
    built[key] = { group: group, mat: mat, geo: geo, def: def, fx: {} };
    dress(key, group, built[key].fx);
    requalityOne(built[key]);
    return built[key];
  }

  /* ---------- set dressing per realm ---------- */
  function dress(key, group, fx) {
    if (key === 'origin') {
      group.add(atmosphere(0x4a3f9f, 46, 30, -8, 2, -40, .14));
      group.add(atmosphere(0x203a7a, 40, 26, 9, -3, -44, .12));
    } else if (key === 'advocate') {
      group.add(atmosphere(0xe8b34b, 40, 26, 0, -4, -34, .11));
      for (var b = 0; b < 5; b++) {
        var beam = new THREE.Mesh(
          new THREE.PlaneGeometry(1.6 + b * .3, 30),
          new THREE.MeshBasicMaterial({
            map: getGlowTex(), color: 0xf5ce7e, transparent: true, opacity: .10,
            blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false
          }));
        beam.position.set(-8 + b * 4, 4, -26 - (b % 3) * 6);
        beam.rotation.z = (b % 2 ? 1 : -1) * .05;
        group.add(beam);
      }
      /* marble floor sheen */
      var floor = new THREE.Mesh(
        new THREE.PlaneGeometry(80, 44),
        new THREE.MeshBasicMaterial({
          map: getGlowTex(), color: 0xa8863e, transparent: true, opacity: .10,
          blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false
        }));
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(0, -8.5, -30);
      group.add(floor);
    } else if (key === 'peacemaker') {
      group.add(atmosphere(0x7fe0b8, 34, 22, 0, 0, -30, .11));
      /* two envoys — comets that meet at the middle of the table */
      function comet(hex) {
        var s = new THREE.Sprite(new THREE.SpriteMaterial({
          map: getGlowTex('core'), color: hex, transparent: true, opacity: 0,
          blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false
        }));
        s.scale.set(3.6, 3.6, 1); group.add(s); return s;
      }
      fx.cometA = comet(0x7fe0b8); fx.cometB = comet(0xd9e2e6);
      fx.burst = comet(0xeafff4); fx.burst.scale.set(0.1, 0.1, 1);
      /* the presence — a soft light at the table's center, lit from the chapter's
         open and CONSUMED by the impact (Lorenzo, 2026-07-09: the center blob must
         die ON the meet, not before) */
      fx.presence = new THREE.Sprite(new THREE.SpriteMaterial({
        map: getGlowTex(), color: 0xeafff4, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false
      }));
      fx.presence.scale.set(2.8, 2.8, 1);
      fx.presence.position.set(0, 0, -22);
      group.add(fx.presence);
    } else if (key === 'builder') {
      group.add(atmosphere(0x155a70, 44, 28, 0, 0, -42, .16));
      group.add(buildCity());
      /* radar scan sweeping the grid floor */
      var scan = new THREE.Mesh(
        new THREE.PlaneGeometry(90, 1.1),
        new THREE.MeshBasicMaterial({
          map: getGlowTex(), color: 0x2fd0f0, transparent: true, opacity: .3,
          blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false
        }));
      scan.rotation.x = -Math.PI / 2;
      scan.position.set(0, -6.9, -20);
      group.add(scan);
      updaters.push(function (t) { scan.position.z = -6 - (Math.sin(t * .35) * .5 + .5) * 48; });
    } else if (key === 'gamemaster') {
      group.add(atmosphere(0x7d3fbf, 44, 30, 0, 0, -38, .14));
    } else if (key === 'storyteller') {
      group.add(atmosphere(0xffc46b, 42, 26, 0, 2, -36, .10));
    } else if (key === 'assembly') {
      group.add(atmosphere(0xffa94d, 52, 10, 6, 0, -24, .16));
      /* the seven trades as raw stones — gem tints (Lorenzo, 2026-07-09):
         space blue · mind yellow · time green · reality crimson (the film's only red,
         this beat only) · CRAFT SILVER UNCHANGED (the excess keeps its color) ·
         power purple · soul orange */
      var ORB_HEX = [0x4d7dff, 0xffd84d, 0x46ff9e, 0xff4d4d, 0xd9e2e6, 0xb44dff, 0xff9a3d];
      fx.orbs = ORB_HEX.map(function (hex, i) {
        var s = new THREE.Sprite(new THREE.SpriteMaterial({
          map: getGlowTex('corona'), color: hex, transparent: true, opacity: 0,
          blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false
        }));
        s.scale.set(2.4, 2.4, 1); group.add(s);
        /* the corona breathes — asymmetric scale wobble + slow spin + brightness
           swell, pure functions of the clock (seek-safe); OPACITY STAYS
           TIMELINE-OWNED — the arrival/fade beats must keep winning
           (Lorenzo, 2026-07-09: radiate at the old footprint, never uniform) */
        var base = new THREE.Color(hex);
        updaters.push(function (t) {
          var wx = 1 + 0.16 * Math.sin(t * (1.05 + i * 0.13) + i * 2.1);
          var wy = 1 + 0.16 * Math.sin(t * (0.93 + i * 0.11) + i * 2.1 + 0.7);
          s.scale.set(2.4 * wx, 2.4 * wy, 1);
          s.material.rotation = t * (0.14 + i * 0.023) + i * 0.9;
          var b = 1 + 0.25 * Math.sin(t * (1.35 + i * 0.09) + i * 3.3);
          s.material.color.setRGB(base.r * b, base.g * b, base.b * b);
        });
        return s;
      });
      /* each trade's raw crystal — unique nugget per seed (the silver one too:
         "randomize its shape to look kinda like the others"); deterministic
         tumble as a pure function of the clock = seek-safe facet glints */
      fx.stones = ORB_HEX.map(function (hex, i) {
        var mat = new THREE.ShaderMaterial({
          uniforms: { uColor: { value: new THREE.Color(hex) },
                      uAlpha: { value: 0 }, uHdr: { value: 1.4 } },
          vertexShader: STONE_VERT, fragmentShader: STONE_FRAG,
          transparent: true, depthWrite: false, depthTest: false,
          blending: THREE.AdditiveBlending
        });
        var stone = new THREE.Mesh(crystalGeo(i + 1), mat);
        stone.position.set(0, 0, -20);
        group.add(stone);
        updaters.push((function (s2, j) {
          return function (t) {
            s2.rotation.x = t * (0.33 + j * 0.021) + j * 1.7;
            s2.rotation.y = t * (0.47 + j * 0.017) + j * 2.3;
          };
        })(stone, i));
        return stone;
      });
      /* 80 flakes per stone, born across the stone's volume at the meet point */
      fx.snaps = ORB_HEX.map(function (hex) {
        var n = 80;
        var geo = new THREE.BufferGeometry();
        var pos = new Float32Array(n * 3), seeds = new Float32Array(n * 4),
            cols = new Float32Array(n * 3), sizes = new Float32Array(n);
        var c = new THREE.Color(hex);
        for (var i = 0; i < n; i++) {
          pos[i * 3] = (Math.random() - .5) * 1.4;
          pos[i * 3 + 1] = (Math.random() - .5) * 1.4;
          pos[i * 3 + 2] = -20 + (Math.random() - .5) * 1.4;
          seeds[i * 4] = Math.random(); seeds[i * 4 + 1] = Math.random();
          seeds[i * 4 + 2] = Math.random(); seeds[i * 4 + 3] = Math.random();
          var jit = .8 + Math.random() * .4;
          cols[i * 3] = Math.min(1, c.r * jit); cols[i * 3 + 1] = Math.min(1, c.g * jit);
          cols[i * 3 + 2] = Math.min(1, c.b * jit);
          sizes[i] = 1.6 + Math.random() * 2.6;
        }
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
        geo.setAttribute('aColor', new THREE.BufferAttribute(cols, 3));
        geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
        var mat = new THREE.ShaderMaterial({
          uniforms: { uProg: { value: 0 }, uTime: { value: 0 },
                      uAlpha: { value: 1 }, uHdr: { value: 1.5 },
                      uPR: { value: Math.min(1.5, devicePixelRatio || 1) } },
          vertexShader: SNAP_VERT, fragmentShader: FRAG,
          transparent: true, depthWrite: false, depthTest: false,
          blending: THREE.AdditiveBlending
        });
        allMats.push(mat);                       /* rides the shared uTime tick */
        var pts = new THREE.Points(geo, mat);
        pts.frustumCulled = false;
        group.add(pts);
        return pts;
      });
      /* contact flash — a short burst of light as each stone lands (shock) */
      fx.flashes = ORB_HEX.map(function (hex) {
        var s = new THREE.Sprite(new THREE.SpriteMaterial({
          map: getGlowTex('core'), color: hex, transparent: true, opacity: 0,
          blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false
        }));
        s.position.set(0, 0, -20);
        s.scale.set(0.7, 0.7, 1);
        group.add(s); return s;
      });
    } else if (key === 'embers' || key === 'embers2') {
      group.add(atmosphere(0xff7a1a, 40, 22, 0, -8, -30, .08));
    }
  }

  function buildCity() {
    var pts = [], R = Math.random;
    for (var i = 0; i < 46; i++) {
      var w = 1.4 + R() * 2, d = 1.4 + R() * 2, h = 2 + R() * 8;
      var cx = (R() - .5) * 52, cz = -14 - R() * 42, y0 = -7;
      if (Math.abs(cx) < 4) cx += cx < 0 ? -5 : 5;
      var c = [[cx - w, y0, cz - d], [cx + w, y0, cz - d], [cx + w, y0, cz + d], [cx - w, y0, cz + d]];
      for (var e = 0; e < 4; e++) {
        var a = c[e], b2 = c[(e + 1) % 4];
        pts.push(a[0], a[1], a[2], b2[0], b2[1], b2[2]);                 /* base */
        pts.push(a[0], a[1] + h, a[2], b2[0], b2[1] + h, b2[2]);         /* top  */
        pts.push(a[0], a[1], a[2], a[0], a[1] + h, a[2]);                /* pillar */
      }
    }
    for (var gx = -40; gx <= 40; gx += 4) pts.push(gx, -7, -4, gx, -7, -60);
    for (var gz = -4; gz >= -60; gz -= 4) pts.push(-40, -7, gz, 40, -7, gz);
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
    var mat = new THREE.LineBasicMaterial({
      color: 0x1a94b4, transparent: true, opacity: .30,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    var lines = new THREE.LineSegments(geo, mat);
    lines.frustumCulled = false;
    return lines;
  }

  /* ---------- quality ---------- */
  function requalityOne(r) {
    r.geo.setDrawRange(0, Math.floor(r.def.n * qualityMult));
  }
  function requality(mult) {
    qualityMult = mult;
    Object.keys(built).forEach(function (k) { requalityOne(built[k]); });
  }

  /* ---------- point grain per render target ----------
     gl_PointSize is device px of the CURRENT target: the main canvas and
     the portal's disc RT need different ratios (round 4: the sharpened
     phone RT halved the preview's relative grain — the dust dropped to the
     1px clamp and the "window into the next realm" read empty). Desktop is
     byte-identical: getPixelRatio() ≡ the legacy min(1.5, dpr) constant. */
  function setGrainOne(r, pr) {
    r.mat.uniforms.uPR.value = pr;
    if (r.fx.snaps) r.fx.snaps.forEach(function (p) { p.material.uniforms.uPR.value = pr; });
  }
  function setGrain(key, pr) { if (built[key]) setGrainOne(built[key], pr); }

  /* ---------- staging ---------- */
  function attachMain(key) {
    var scene = FILM.stage.scene();
    if (activeKey && built[activeKey]) scene.remove(built[activeKey].group);
    var r = build(key);
    r.mat.uniforms.uProg.value = 0;
    setGrainOne(r, FILM.stage.renderer().getPixelRatio());
    scene.add(r.group);
    FILM.stage.setBackground(r.def.bg);
    activeKey = key;
    return r;
  }
  function prep(key) { return build(key); }
  function setProgress(p) {
    if (activeKey && built[activeKey]) built[activeKey].mat.uniforms.uProg.value = p;
  }

  /* one clock for every built material + the self-animating dressing */
  function tick(t) {
    for (var i = 0; i < allMats.length; i++) allMats[i].uniforms.uTime.value = t;
    for (var j = 0; j < updaters.length; j++) updaters[j](t);
  }

  return { attachMain: attachMain, prep: prep, setProgress: setProgress,
           setGrain: setGrain,
           requality: requality, tick: tick, defs: DEFS,
           fx: function (key) { return build(key).fx; },
           current: function () { return activeKey; } };
})();
