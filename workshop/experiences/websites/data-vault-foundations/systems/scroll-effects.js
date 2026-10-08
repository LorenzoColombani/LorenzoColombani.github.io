/**
 * SV.scrollEffects — Apple-style scroll effects using GSAP ScrollTrigger
 *
 * Provides four scroll-driven effect types inspired by Apple's MacBook Pro
 * product page. Requires GSAP and ScrollTrigger to be loaded from CDN before
 * this file. All effects degrade gracefully if GSAP/ScrollTrigger are missing.
 *
 * API:
 *   SV.scrollEffects.init()            — register plugin, initialize all effects
 *   SV.scrollEffects.initHeroZoom()    — "M5" text zoom on scroll
 *   SV.scrollEffects.initStickyZones() — pinned visual with crossfading steps
 *   SV.scrollEffects.initWipeReveals() — clip-path reveal on scroll
 *   SV.scrollEffects.initAccordions()  — one-at-a-time accordion panels
 */

var SV = window.SV || {};

SV.scrollEffects = (function() {

  /* ── helpers ──────────────────────────────────────────────── */

  function gsapReady() {
    return typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
  }

  function $$(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  /* ── 1. Hero Zoom ────────────────────────────────────────── */

  function initHeroZoom() {
    if (!gsapReady()) return;
    var isMobile = window.innerWidth <= 600;

    $$('.hero-zoom').forEach(function(zone) {
      var text = $('.hero-zoom-text', zone);
      if (!text) return;

      gsap.to(text, {
        scale: isMobile ? 4 : 8,
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: zone,
          start: 'top top',
          end: isMobile ? '+=150%' : '+=300%',
          pin: true,
          scrub: 1
        }
      });
    });
  }

  /* ── 2. Sticky Zones ─────────────────────────────────────── */

  function initStickyZones() {
    if (!gsapReady()) return;

    $$('.scroll-zone').forEach(function(zone) {
      var visual = $('.scroll-zone-visual', zone);
      if (!visual) return;

      var steps  = $$('.scroll-zone-step', zone);
      var frames = $$('.scroll-zone-visual-frame', zone);

      // CSS position:sticky on .scroll-zone-visual handles pinning
      // natively — no GSAP pin needed. The visual stays sticky as long
      // as its parent scroll-zone container is on screen. To extend
      // visibility, move IS/IS NOT + exercises INTO scroll-zone-content.

      // Ensure first frame starts visible
      if (frames.length > 0) {
        gsap.set(frames[0], { opacity: 1 });
      }

      // Two modes based on visual panel height:
      // - Tall visual (>50% viewport): single highlight, visible-center pick
      // - Short visual: per-step visibility with overlapping handoff
      // The visual frame always tracks the most-centered step.
      var lastPrimary = -1;
      var minVisible = 100; // px — step dims when less than this remains

      function updateActiveStep() {
        var vh = window.innerHeight;
        var visualRect = visual.getBoundingClientRect();
        var zoneRect = zone.getBoundingClientRect();
        var targetY = vh * 0.45 + visualRect.height * 0.05;
        var tallVisual = visualRect.height > vh * 0.7;

        // Fade out visual before it overlaps content below the zone.
        // The sticky visual occupies the left 42% of the page; full-width
        // panels after the zone scroll underneath it, causing overlap.
        if (zoneRect.bottom < visualRect.bottom + 50) {
          visual.style.opacity = '0';
          visual.style.pointerEvents = 'none';
        } else {
          visual.style.opacity = '';
          visual.style.pointerEvents = '';
        }

        var primaryIndex = 0;
        var primaryDist = Infinity;

        for (var i = 0; i < steps.length; i++) {
          var rect = steps[i].getBoundingClientRect();
          var visTop = Math.max(rect.top, 0);
          var visBot = Math.min(rect.bottom, vh);
          var visible = visBot - visTop;

          if (!tallVisual) {
            // Overlapping handoff: highlight each step independently
            if (visible >= minVisible) {
              steps[i].classList.add('active');
            } else {
              steps[i].classList.remove('active');
            }
          }

          // Track most-centered step for frame switching (both modes)
          if (visible > 0) {
            var center = (visTop + visBot) / 2;
            var dist = Math.abs(center - targetY);
            if (dist < primaryDist) {
              primaryDist = dist;
              primaryIndex = i;
            }
          }
        }

        if (tallVisual) {
          // Single highlight: only the most-centered step is active
          for (var j = 0; j < steps.length; j++) {
            if (j === primaryIndex) {
              steps[j].classList.add('active');
            } else {
              steps[j].classList.remove('active');
            }
          }
        }

        if (primaryIndex !== lastPrimary) {
          lastPrimary = primaryIndex;
          switchFrame(primaryIndex, frames);
        }
      }

      ScrollTrigger.create({
        trigger: zone,
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: updateActiveStep
      });

      // Initial check
      updateActiveStep();
    });
  }

  function switchFrame(index, frames) {
    if (frames.length <= 1) {
      if (frames[0]) gsap.set(frames[0], { opacity: 1 });
      return;
    }
    frames.forEach(function(f, j) {
      gsap.set(f, { opacity: j === index ? 1 : 0 });
    });
  }

  /* ── 3. Wipe Reveals ─────────────────────────────────────── */

  function cssViewTimelineSupported() {
    try {
      return CSS.supports('animation-timeline', 'view()');
    } catch (e) {
      return false;
    }
  }

  function initWipeReveals() {
    if (cssViewTimelineSupported()) return;   // CSS handles it
    if (!gsapReady()) return;

    $$('.wipe-reveal').forEach(function(el) {
      gsap.fromTo(el,
        { clipPath: 'inset(0 0 100% 0)' },
        {
          clipPath: 'inset(0 0 0% 0)',
          ease: 'none',
          scrollTrigger: {
            trigger: el,
            start: 'top 90%',
            end: 'top 30%',
            scrub: 1
          }
        }
      );
    });
  }

  /* ── 4. Accordions ───────────────────────────────────────── */

  function initAccordions() {
    $$('.apple-accordion-trigger').forEach(function(trigger) {
      trigger.addEventListener('click', function() {
        var item = trigger.closest('.apple-accordion-item');
        if (!item) return;

        var accordion = item.closest('.apple-accordion');
        if (!accordion) return;

        var wasOpen = item.classList.contains('open');

        // Close every sibling item
        $$('.apple-accordion-item', accordion).forEach(function(sibling) {
          sibling.classList.remove('open');
          var body = $('.apple-accordion-body', sibling);
          if (body) body.style.maxHeight = '0';
        });

        // If the clicked item wasn't already open, open it
        if (!wasOpen) {
          item.classList.add('open');
          var body = $('.apple-accordion-body', item);
          if (body) body.style.maxHeight = body.scrollHeight + 'px';
        }
      });
    });
  }

  /* ── 5. Milestone Settle (reverse of hero zoom) ─────────── */

  function initMilestoneSettle() {
    if (!gsapReady()) return;
    var isMobile = window.innerWidth <= 600;

    $$('.milestone-zoom').forEach(function(zone) {
      var milestone = $('.chunk-milestone', zone);
      if (!milestone) return;

      // Timeline: animation fills first 2/3 of scroll, last 1/3 holds the result
      var tl = gsap.timeline({
        scrollTrigger: {
          trigger: zone,
          start: 'top top',
          end: isMobile ? '+=150%' : '+=300%',
          pin: true,
          scrub: 1
        }
      });

      tl.fromTo(milestone,
        { scale: isMobile ? 1.8 : 2.5, opacity: 0, filter: 'blur(12px)' },
        { scale: 1, opacity: 1, filter: 'blur(0px)', ease: 'none', duration: 1 }
      );
      // Hold period — milestone sits fully materialized while user keeps scrolling
      tl.to({}, { duration: 0.5 });
    });
  }

  /* ── public API ───────────────────────────────────────────── */

  function init() {
    if (!gsapReady()) {
      console.warn('[SV.scrollEffects] GSAP or ScrollTrigger not loaded — scroll effects disabled.');
      // Accordions work without GSAP, so still initialize them
      initAccordions();
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    initHeroZoom();
    initMilestoneSettle();
    initStickyZones();
    initWipeReveals();
    initAccordions();
  }

  return {
    init:               init,
    initHeroZoom:       initHeroZoom,
    initMilestoneSettle: initMilestoneSettle,
    initStickyZones:    initStickyZones,
    initWipeReveals:    initWipeReveals,
    initAccordions:     initAccordions
  };

})();
