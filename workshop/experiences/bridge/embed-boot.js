/* The workshop owns navigation; the film owns its authored screenplay. */
(function () {
  'use strict';
  document.documentElement.classList.add('portal-preview');
  var resolveReady, rejectReady, controller, failure;
  var readinessTimer = setTimeout(function () {
    if (!controller) window.__WORKSHOP_BRIDGE_BOOT.fail('The film could not finish loading.');
  }, 20000);
  var ready = new Promise(function (resolve, reject) {
    resolveReady = resolve; rejectReady = reject;
  });
  ready.catch(function () {}); // The host may attach after an early script failure.
  function notify(type, data) {
    if (parent === window) return;
    parent.postMessage(Object.assign({ source: 'workshop-bridge', type: type }, data || {}), location.origin);
  }
  var api = window.__WORKSHOP_BRIDGE = {
    ready: ready,
    setHostControls: function (value) { document.documentElement.classList.toggle('workshop-host-controls', !!value); },
    arm: function (muted) {
      if (failure) return Promise.reject(failure);
      if (!controller) {
        // Fonts may still be loading; preserve any trusted gesture now.
        if (window.FILM && FILM.audio) FILM.audio.start(!!muted);
        return ready.then(function () { return controller.arm(muted); });
      }
      return controller.arm(muted);
    },
    play: function (options) { return controller ? controller.play(options) : ready.then(function () { return controller.play(options); }); },
    present: function () { return controller ? controller.present() : ready.then(function () { return controller.present(); }); },
    pause: function () { if (controller) return controller.pause(); },
    setMuted: function (muted) { if (controller) return controller.setMuted(muted); },
    dispose: function () { if (controller) controller.dispose(); },
    snapshot: function () { return controller ? controller.snapshot() : { ready: false, state: failure ? 'error' : 'loading', error: failure ? failure.message : null, currentTime: 0, duration: 0 }; }
  };
  ['state', 'currentTime', 'duration'].forEach(function (name) {
    Object.defineProperty(api, name, { get: function () { return api.snapshot()[name]; } });
  });
  window.__WORKSHOP_BRIDGE_BOOT = {
    notify: notify,
    register: function (value) { clearTimeout(readinessTimer); controller = value; resolveReady(api); notify('ready', { snapshot: api.snapshot() }); },
    fail: function (message) {
      if (failure) return;
      clearTimeout(readinessTimer);
      failure = new Error(message); rejectReady(failure); notify('error', { message: message });
    }
  };
  addEventListener('error', function (event) {
    if (!controller) window.__WORKSHOP_BRIDGE_BOOT.fail(event.message || 'A film asset could not load.');
  }, true);
  addEventListener('bridge-audio-error', function () {
    api.pause();
    if (window.FILM && FILM.audio) FILM.audio.pauseAll();
    window.__WORKSHOP_BRIDGE_BOOT.fail('The Bridge soundtrack could not load. Return to the workshop or try again.');
  });
  addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    event.preventDefault(); api.pause(); notify('return');
  });
  addEventListener('DOMContentLoaded', function () {
    document.getElementById('bridge-return').addEventListener('click', function () { api.pause(); notify('return'); });
    [['bridge-start', false], ['bridge-start-muted', true]].forEach(function (pair) {
      document.getElementById(pair[0]).addEventListener('click', function () {
        api.arm(pair[1]).then(function () { return api.play(); }).catch(function (error) {
          document.getElementById('bridge-prompt-text').textContent = error.message;
        });
      });
    });
  });
})();
