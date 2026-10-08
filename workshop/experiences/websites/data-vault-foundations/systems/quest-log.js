/**
 * SV.questLog — floating objective tracker with scroll sync
 *
 * A checklist panel (top-right) showing tutorial objectives.
 * Objectives check off when exercises are completed.
 * Active section highlighted via IntersectionObserver scroll sync.
 *
 * Dependencies: SV.persistence (loaded before this file)
 *
 * DOM targets (in template-shell.html):
 *   #quest-log           — panel container
 *   .quest-log-list       — ul for objective items
 *   .quest-log-progress   — span showing "N/M"
 *
 * Persistence keys:
 *   quest-progress — { tutorialId: { objectiveId: true } }
 *   settings       — { questLogCollapsed: boolean }
 *
 * API:
 *   SV.questLog.init(config)
 *   SV.questLog.complete(objectiveId)
 *   SV.questLog.isComplete(objectiveId)
 *   SV.questLog.toggle()
 *   SV.questLog.scrollTo(sectionId)
 */

var SV = window.SV || {};

SV.questLog = (function() {
  var _config = null;
  var _observer = null;

  /**
   * init(config) — render objectives, restore saved progress, set up scroll sync.
   * @param {Object} config - { tutorialId: string, objectives: [{ id, label, sectionId }] }
   */
  function init(config) {
    if (!config || !config.tutorialId || !config.objectives) return;
    _config = config;

    var savedProgress = SV.persistence.get('quest-progress', {});
    var tutorialProgress = savedProgress[_config.tutorialId] || {};

    renderList(tutorialProgress);
    updateProgressDisplay();
    setupScrollSync();

    // Restore collapse state
    var settings = SV.persistence.get('settings', {});
    var panel = document.getElementById('quest-log');
    if (panel && settings.questLogCollapsed) {
      panel.classList.add('collapsed');
    }
  }

  /**
   * renderList(savedProgress) — build list items with check icons and labels.
   * @param {Object} savedProgress - { objectiveId: true } for completed objectives
   */
  function renderList(savedProgress) {
    var list = document.querySelector('.quest-log-list');
    if (!list) return;

    // Clear existing items safely
    while (list.firstChild) {
      list.removeChild(list.firstChild);
    }

    for (var i = 0; i < _config.objectives.length; i++) {
      var obj = _config.objectives[i];
      var li = document.createElement('li');
      li.className = 'quest-log-item';
      if (savedProgress[obj.id]) {
        li.classList.add('completed');
      }
      li.setAttribute('data-objective', obj.id);
      li.setAttribute('data-section', obj.sectionId);

      var icon = document.createElement('span');
      icon.className = 'quest-log-icon';
      icon.textContent = savedProgress[obj.id] ? '\u2713' : '\u25CB';

      var label = document.createElement('span');
      label.className = 'quest-log-label';
      label.textContent = obj.label;

      li.appendChild(icon);
      li.appendChild(label);

      // Closure to capture sectionId
      (function(sectionId) {
        li.addEventListener('click', function() {
          SV.questLog.scrollTo(sectionId);
        });
      })(obj.sectionId);

      list.appendChild(li);
    }
  }

  /**
   * updateProgressDisplay() — update ".quest-log-progress" to "N/M" format.
   */
  function updateProgressDisplay() {
    var progressEl = document.querySelector('.quest-log-progress');
    if (!progressEl || !_config) return;

    var savedProgress = SV.persistence.get('quest-progress', {});
    var tutorialProgress = savedProgress[_config.tutorialId] || {};
    var completed = 0;

    for (var i = 0; i < _config.objectives.length; i++) {
      if (tutorialProgress[_config.objectives[i].id]) {
        completed++;
      }
    }

    progressEl.textContent = completed + '/' + _config.objectives.length;
  }

  /**
   * setupScrollSync() — IntersectionObserver with threshold 0.3 on each
   * objective's section. Adds 'active' class to the matching quest item.
   */
  function setupScrollSync() {
    if (!_config || !('IntersectionObserver' in window)) return;

    // Clean up any previous observer
    if (_observer) {
      _observer.disconnect();
    }

    _observer = new IntersectionObserver(function(entries) {
      for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        if (!entry.isIntersecting) continue;

        var sectionId = entry.target.id;

        // Remove active from all items, add to the matching one
        var items = document.querySelectorAll('.quest-log-item');
        for (var j = 0; j < items.length; j++) {
          if (items[j].getAttribute('data-section') === sectionId) {
            items[j].classList.add('active');
          } else {
            items[j].classList.remove('active');
          }
        }
      }
    }, { threshold: 0.3 });

    // Observe each objective's target section
    for (var i = 0; i < _config.objectives.length; i++) {
      var section = document.getElementById(_config.objectives[i].sectionId);
      if (section) {
        _observer.observe(section);
      }
    }
  }

  /**
   * complete(objectiveId) — mark objective done in UI and persistence.
   * @param {string} objectiveId
   */
  function complete(objectiveId) {
    if (!_config) return;

    // Update persistence
    SV.persistence.update('quest-progress', function(progress) {
      if (!progress[_config.tutorialId]) {
        progress[_config.tutorialId] = {};
      }
      progress[_config.tutorialId][objectiveId] = true;
      return progress;
    }, {});

    // Update UI
    var item = document.querySelector('.quest-log-item[data-objective="' + objectiveId + '"]');
    if (item) {
      item.classList.add('completed');
      item.classList.add('just-completed');
      var icon = item.querySelector('.quest-log-icon');
      if (icon) {
        icon.textContent = '\u2713';
      }
      // Auto-expand quest log to show the newly completed objective
      var panel = document.getElementById('quest-log');
      if (panel && panel.classList.contains('collapsed')) {
        panel.classList.remove('collapsed');
        SV.persistence.update('settings', function(s) {
          s.questLogCollapsed = false;
          return s;
        }, {});
      }
    }

    updateProgressDisplay();
  }

  /**
   * isComplete(objectiveId) — returns boolean.
   * @param {string} objectiveId
   * @returns {boolean}
   */
  function isComplete(objectiveId) {
    if (!_config) return false;
    var savedProgress = SV.persistence.get('quest-progress', {});
    var tutorialProgress = savedProgress[_config.tutorialId] || {};
    return !!tutorialProgress[objectiveId];
  }

  /**
   * toggle() — expand/collapse the quest log panel. Saves state to persistence.
   */
  function toggle() {
    var panel = document.getElementById('quest-log');
    if (!panel) return;

    panel.classList.toggle('collapsed');
    var isCollapsed = panel.classList.contains('collapsed');

    SV.persistence.update('settings', function(settings) {
      settings.questLogCollapsed = isCollapsed;
      return settings;
    }, {});
  }

  /**
   * scrollTo(sectionId) — smooth scroll to the target section.
   * @param {string} sectionId
   */
  function scrollTo(sectionId) {
    var section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  return {
    init: init,
    complete: complete,
    isComplete: isComplete,
    toggle: toggle,
    scrollTo: scrollTo
  };
})();

window.SV = SV;
