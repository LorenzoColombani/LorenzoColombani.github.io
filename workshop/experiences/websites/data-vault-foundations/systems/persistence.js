/**
 * SV.persistence — localStorage manager with JSON serialization
 *
 * All keys are prefixed with "sv-" to avoid collisions.
 * All operations degrade gracefully if localStorage is unavailable.
 *
 * API:
 *   SV.persistence.get(name, defaultVal)
 *   SV.persistence.set(name, value)
 *   SV.persistence.update(name, fn, defaultVal)
 *   SV.persistence.remove(name)
 *   SV.persistence.has(name)
 *   SV.persistence.clear()
 */

var SV = window.SV || {};

SV.persistence = (function() {
  var PREFIX = 'sv-';

  function prefixed(name) {
    return PREFIX + name;
  }

  function get(name, defaultVal) {
    try {
      var raw = localStorage.getItem(prefixed(name));
      if (raw === null) return defaultVal;
      return JSON.parse(raw);
    } catch (e) {
      return defaultVal;
    }
  }

  function set(name, value) {
    try {
      localStorage.setItem(prefixed(name), JSON.stringify(value));
    } catch (e) {
      // Storage full or unavailable — fail silently
    }
  }

  function update(name, fn, defaultVal) {
    try {
      var current = get(name, defaultVal);
      var next = fn(current);
      set(name, next);
      return next;
    } catch (e) {
      return defaultVal;
    }
  }

  function remove(name) {
    try {
      localStorage.removeItem(prefixed(name));
    } catch (e) {
      // Fail silently
    }
  }

  function has(name) {
    try {
      return localStorage.getItem(prefixed(name)) !== null;
    } catch (e) {
      return false;
    }
  }

  function clear() {
    try {
      var toRemove = [];
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key && key.indexOf(PREFIX) === 0) {
          toRemove.push(key);
        }
      }
      for (var j = 0; j < toRemove.length; j++) {
        localStorage.removeItem(toRemove[j]);
      }
    } catch (e) {
      // Fail silently
    }
  }

  return {
    get: get,
    set: set,
    update: update,
    remove: remove,
    has: has,
    clear: clear
  };
})();

window.SV = SV;
