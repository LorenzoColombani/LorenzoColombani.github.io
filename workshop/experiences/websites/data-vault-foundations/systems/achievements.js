/**
 * SV.achievements — tiered discovery notifications
 *
 * Meaningful achievements that require OBJECTIVE proof of understanding.
 * Nothing passive (scrolling, clicking) earns anything. Framed as
 * "discoveries" not "awards" (Free Spirit player type).
 *
 * Tiers: bronze (section) → silver (tutorial) → gold (cross-tutorial) → legendary
 *
 * Depends on: SV.persistence, SV.inventory (hasItem), SV.ALL_ITEMS
 *
 * API:
 *   SV.achievements.init()                — run checkAll on load
 *   SV.achievements.checkAll()            — evaluate all achievement checks
 *   SV.achievements.checkItemTriggers(id) — called by inventory.addItem
 *   SV.achievements.getUnlocked()         — returns array of earned achievements
 */

var SV = window.SV || {};

SV.achievements = (function() {

  /* ── Tier colors ─────────────────────────────────────────────────── */

  var TIER_COLORS = {
    bronze:    { bg: 'rgba(205,127,50,0.15)',  border: '#CD7F32', glow: 'rgba(205,127,50,0.4)' },
    silver:    { bg: 'rgba(192,192,192,0.15)', border: '#C0C0C0', glow: 'rgba(192,192,192,0.4)' },
    gold:      { bg: 'rgba(255,215,0,0.15)',   border: '#FFD700', glow: 'rgba(255,215,0,0.4)' },
    legendary: { bg: 'rgba(175,82,222,0.15)',  border: '#AF52DE', glow: 'rgba(175,82,222,0.5)' }
  };

  /* ── Achievement definitions ─────────────────────────────────────── */

  var ACHIEVEMENTS = {

    /* Bronze — section completion */

    'hub-materialized': {
      name: 'Hub Materialized',
      tier: 'bronze',
      source: 'Sessions 9 to 10: Hub exercises',
      description: 'Completed all Hub exercises.',
      check: function() {
        return hasAllItems(['hub-blueprint', 'hub-create-table']);
      }
    },
    'sat-materialized': {
      name: 'Satellite Materialized',
      tier: 'bronze',
      source: 'Sessions 9 to 10: Satellite exercises',
      description: 'Completed all Satellite exercises.',
      check: function() {
        return hasAllItems(['satellite-blueprint', 'sat-create-table']);
      }
    },
    'link-materialized': {
      name: 'Link Materialized',
      tier: 'bronze',
      source: 'Sessions 9 to 10: Link exercises',
      description: 'Completed all Link exercises.',
      check: function() {
        return hasAllItems(['link-blueprint', 'link-create-table']);
      }
    },
    'sql-foundations': {
      name: 'SQL Foundations',
      tier: 'bronze',
      source: 'Chapter 3: SQL Part 1',
      description: 'Discovered SELECT, FROM, and WHERE.',
      check: function() {
        return hasAllItems(['select-clause', 'from-clause', 'where-clause']);
      }
    },
    'compliance-scholar': {
      name: 'Compliance Scholar',
      tier: 'bronze',
      source: 'Sessions 5 & 7: Compliance',
      description: 'Discovered GDPR, Data Act, DORA, ePrivacy.',
      check: function() {
        return hasAllItems(['gdpr-fundamentals', 'eu-data-act', 'dora', 'eprivacy']);
      }
    },

    /* Silver — tutorial completion */

    'symbol-master': {
      name: 'Symbol Master',
      tier: 'silver',
      source: 'Chapter 11: Symbol drills',
      description: 'Completed all symbol discrimination drills.',
      check: function() {
        return hasAllItems(['symbol-discrimination']);
      }
    },
    'schema-writer': {
      name: 'Schema Writer',
      tier: 'silver',
      source: 'Chapter 11: Schema writing',
      description: 'Wrote all three DV schemas from memory.',
      check: function() {
        return hasAllItems(['schema-from-memory']);
      }
    },

    /* Gold — cross-tutorial */

    'schema-triad': {
      name: 'Schema Triad',
      tier: 'gold',
      source: 'Sessions 2 to 9: DV Blueprints',
      description: 'Discovered all three DV schema blueprints.',
      check: function() {
        return hasAllItems(['hub-blueprint', 'satellite-blueprint', 'link-blueprint']);
      }
    },
    'full-sql-toolkit': {
      name: 'Full SQL Toolkit',
      tier: 'gold',
      source: 'Sessions 3 to 10: All SQL patterns',
      description: 'Discovered every SQL pattern.',
      check: function() {
        return getCategoryCount('sql') >= 15;
      }
    },
    'regulation-complete': {
      name: 'Regulation Complete',
      tier: 'gold',
      source: 'Sessions 5, 7 & 8: All regulations',
      description: 'All compliance items discovered.',
      check: function() {
        return getCategoryCount('compliance') >= 15;
      }
    },
    'general-mock-complete': {
      name: 'Full Simulation Complete',
      tier: 'silver',
      source: 'Chapter 14: General Assessment',
      description: 'Completed the full 60-minute knowledge assessment across all domains.',
      check: function() {
        return hasAllItems(['general-mock-survivor']);
      }
    },
    'mastery-complete': {
      name: 'Mastery Complete',
      tier: 'gold',
      source: 'Chapters 13-14: Assessments',
      description: 'Completed both assessments. All categories complete.',
      check: function() {
        return hasAllItems(['self-test-complete', 'general-mock-survivor']);
      }
    },
    'dbt-bridge': {
      name: 'The dbt Bridge',
      tier: 'gold',
      source: 'Sessions 6 & 10: dbt + Jinja + SQL',
      description: 'Connected hand-written SQL to dbt automation and read the Jinja behind it.',
      check: function() {
        return hasAllItems(['dbt-model-reading', 'compiled-sql-reading', 'create-table', 'jinja-templating', 'dbt-compilation', 'config-ref-source']);
      }
    },

    /* Legendary */

    'vault-architect': {
      name: 'Vault Architect',
      tier: 'legendary',
      source: 'Chapter 12: Integration Day',
      description: 'Built a complete Data Vault from scratch and read the dbt code that generates it.',
      check: function() {
        return hasAllItems(['mini-vault', 'jinja-templating', 'python-reading', 'dbt-compilation', 'config-ref-source']);
      }
    },
    'khajiit-has-knowledge': {
      name: 'Khajiit Has Knowledge',
      tier: 'legendary',
      source: 'All sessions',
      description: 'Discovered every item in the catalog.',
      check: function() {
        var totalItems = 0;
        for (var k in SV.ALL_ITEMS) {
          if (SV.ALL_ITEMS.hasOwnProperty(k)) totalItems++;
        }
        var inventory = SV.persistence.get('inventory', []);
        return inventory.length >= totalItems;
      }
    }
  };

  /* ── Helpers ─────────────────────────────────────────────────────── */

  function hasAllItems(ids) {
    for (var i = 0; i < ids.length; i++) {
      if (!SV.inventory || !SV.inventory.hasItem(ids[i])) return false;
    }
    return true;
  }

  function getCategoryCount(catId) {
    var inventory = SV.persistence.get('inventory', []);
    var count = 0;
    for (var i = 0; i < inventory.length; i++) {
      var def = SV.ALL_ITEMS[inventory[i].id];
      if (def && def.cat === catId) count++;
    }
    return count;
  }

  function isUnlocked(id) {
    var unlocked = SV.persistence.get('achievements', []);
    for (var i = 0; i < unlocked.length; i++) {
      if (unlocked[i].id === id) return true;
    }
    return false;
  }

  /* ── Core functions ──────────────────────────────────────────────── */

  function unlock(id, achievement) {
    var record = {
      id: id,
      name: achievement.name,
      tier: achievement.tier,
      description: achievement.description,
      earnedAt: new Date().toISOString()
    };

    SV.persistence.update('achievements', function(arr) {
      arr.push(record);
      return arr;
    }, []);

    if (!_suppressToasts) {
      showToast(achievement);
    }
    updateBadge();
  }

  function showToast(achievement) {
    var container = document.getElementById('achievement-toast-container');
    if (!container) return;

    var colors = TIER_COLORS[achievement.tier] || TIER_COLORS.bronze;
    var tierLabel = achievement.tier.charAt(0).toUpperCase() + achievement.tier.slice(1);

    // Build toast element using safe DOM methods
    var toast = document.createElement('div');
    toast.className = 'achievement-toast';
    toast.style.cssText =
      'background: ' + colors.bg + ';' +
      'border: 1px solid ' + colors.border + ';' +
      'box-shadow: 0 0 20px ' + colors.glow + ', inset 0 0 20px ' + colors.glow + ';' +
      'padding: 14px 20px;' +
      'border-radius: 12px;' +
      'margin-bottom: 10px;' +
      'backdrop-filter: blur(16px);' +
      'opacity: 0;' +
      'transform: translateX(40px);' +
      'transition: opacity 0.4s ease, transform 0.4s ease;';

    var tierDiv = document.createElement('div');
    tierDiv.className = 'achievement-toast-tier';
    tierDiv.style.cssText =
      'font-family: Orbitron, sans-serif;' +
      'font-size: 0.65rem;' +
      'text-transform: uppercase;' +
      'letter-spacing: 2px;' +
      'color: ' + colors.border + ';' +
      'margin-bottom: 4px;';
    tierDiv.textContent = tierLabel + ' Discovery';

    var nameDiv = document.createElement('div');
    nameDiv.className = 'achievement-toast-name';
    nameDiv.style.cssText =
      'font-family: Orbitron, sans-serif;' +
      'font-size: 1rem;' +
      'color: #f0f6fc;' +
      'margin-bottom: 2px;';
    nameDiv.textContent = achievement.name;

    var descDiv = document.createElement('div');
    descDiv.className = 'achievement-toast-desc';
    descDiv.style.cssText =
      'font-size: 0.8rem;' +
      'color: rgba(240,246,252,0.6);';
    descDiv.textContent = achievement.description;

    toast.appendChild(tierDiv);
    toast.appendChild(nameDiv);
    toast.appendChild(descDiv);

    container.appendChild(toast);
    container.classList.add('has-toast');

    // Trigger enter animation
    requestAnimationFrame(function() {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(0)';
    });

    // Auto-remove after 4 seconds
    setTimeout(function() {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(40px)';
      setTimeout(function() {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
        // Remove has-toast if no more toasts
        if (container.children.length === 0) {
          container.classList.remove('has-toast');
        }
      }, 400);
    }, 4000);
  }

  function checkAll() {
    for (var id in ACHIEVEMENTS) {
      if (!ACHIEVEMENTS.hasOwnProperty(id)) continue;
      if (isUnlocked(id)) continue;

      var achievement = ACHIEVEMENTS[id];
      if (achievement.check()) {
        unlock(id, achievement);
      }
    }
  }

  function checkItemTriggers(itemId) {
    checkAll();
  }

  function getUnlocked() {
    return SV.persistence.get('achievements', []);
  }

  var _suppressToasts = false;

  function init() {
    // On first load, silently unlock retroactive achievements (no toast spam)
    _suppressToasts = true;
    checkAll();
    _suppressToasts = false;

    // Update trophy button badge
    updateBadge();
  }

  function updateBadge() {
    var btn = document.getElementById('achievements-btn');
    if (!btn) return;
    var unlocked = getUnlocked();
    var total = 0;
    for (var k in ACHIEVEMENTS) { if (ACHIEVEMENTS.hasOwnProperty(k)) total++; }

    var existing = btn.querySelector('.bag-count');
    if (existing) existing.textContent = unlocked.length + '/' + total;
    else {
      var span = document.createElement('span');
      span.className = 'bag-count';
      span.textContent = unlocked.length + '/' + total;
      btn.appendChild(span);
    }
  }

  function togglePanel() {
    var panel = document.getElementById('achievements-panel');
    if (!panel) return;

    // Close inventory panel if open
    if (SV.inventory) SV.inventory.closePanel();

    if (panel.classList.contains('hidden')) {
      renderPanel();
      // Position near toolbar
      var toolbar = document.getElementById('inventory-toolbar');
      if (toolbar) {
        var tbRect = toolbar.getBoundingClientRect();
        panel.style.left = Math.max(8, Math.round(tbRect.left)) + 'px';
        panel.style.bottom = Math.round(window.innerHeight - tbRect.top + 8) + 'px';
      }
      panel.classList.remove('hidden');
    } else {
      clearAchTooltip();
      panel.classList.add('hidden');
    }
  }

  /* ── Achievement detail tooltip ───────────────────────────────────── */

  var activeAchTooltip = null;

  function clearAchTooltip() {
    if (activeAchTooltip && activeAchTooltip.parentNode) {
      activeAchTooltip.parentNode.removeChild(activeAchTooltip);
    }
    activeAchTooltip = null;
  }

  function showAchTooltip(slot, achId, record, colors) {
    if (activeAchTooltip && activeAchTooltip._achId === achId) {
      clearAchTooltip();
      return;
    }
    clearAchTooltip();

    var tip = document.createElement('div');
    tip.className = 'achievement-tooltip';
    tip._achId = achId;

    // Description
    var descEl = document.createElement('div');
    descEl.style.cssText = 'margin-bottom: 8px; color: #e0e6ed; font-size: 0.82rem; line-height: 1.4;';
    descEl.textContent = record.description;

    // Source
    var sourceEl = document.createElement('div');
    sourceEl.style.cssText = 'font-size: 0.7rem; color: rgba(240,246,252,0.5); margin-bottom: 4px;';
    var achDef = ACHIEVEMENTS[achId];
    sourceEl.textContent = (achDef && achDef.source) ? achDef.source : '';

    // Tier
    var tierEl = document.createElement('div');
    tierEl.style.cssText = 'font-size: 0.65rem; text-transform: uppercase; letter-spacing: 1.5px; color: ' + colors.border + ';';
    tierEl.textContent = record.tier + ' discovery';

    tip.appendChild(descEl);
    tip.appendChild(sourceEl);
    tip.appendChild(tierEl);

    // Style the tooltip
    tip.style.cssText =
      'position: fixed;' +
      'background: rgba(10,22,40,0.95);' +
      'backdrop-filter: blur(12px);' +
      'border: 1px solid ' + colors.border + ';' +
      'border-radius: 8px;' +
      'padding: 12px 16px;' +
      'color: #b0c4de;' +
      'font-family: "Exo 2", sans-serif;' +
      'max-width: 280px;' +
      'width: max-content;' +
      'box-shadow: 0 4px 20px rgba(0,0,0,0.5), 0 0 12px ' + colors.glow + ';' +
      'z-index: 10001;' +
      'pointer-events: none;';

    document.body.appendChild(tip);

    // Position: centered above the slot, clamped to viewport
    var slotRect = slot.getBoundingClientRect();
    var tipRect = tip.getBoundingClientRect();
    var desiredLeft = slotRect.left + slotRect.width / 2 - tipRect.width / 2;
    var clampedLeft = Math.max(8, Math.min(window.innerWidth - tipRect.width - 8, desiredLeft));
    var topPos = slotRect.top - tipRect.height - 8;
    if (topPos < 8) topPos = slotRect.bottom + 8;

    tip.style.left = clampedLeft + 'px';
    tip.style.top = topPos + 'px';
    activeAchTooltip = tip;
  }

  /* ── Panel rendering ────────────────────────────────────────────── */

  function renderPanel() {
    var grid = document.getElementById('achievements-panel-grid');
    if (!grid) return;

    while (grid.firstChild) grid.removeChild(grid.firstChild);
    clearAchTooltip();

    var unlocked = getUnlocked();
    var unlockedIds = {};
    for (var i = 0; i < unlocked.length; i++) unlockedIds[unlocked[i].id] = unlocked[i];

    // Tier legend
    var legend = document.createElement('div');
    legend.style.cssText = 'grid-column: 1 / -1; display: flex; gap: 16px; justify-content: center; padding: 4px 0 10px; border-bottom: 1px solid rgba(255,255,255,0.06); margin-bottom: 8px; flex-wrap: wrap;';
    var tierInfo = [
      { label: 'Bronze', color: '#CD7F32', meaning: 'Section complete' },
      { label: 'Silver', color: '#C0C0C0', meaning: 'Tutorial complete' },
      { label: 'Gold', color: '#FFD700', meaning: 'Cross-tutorial' },
      { label: 'Legendary', color: '#AF52DE', meaning: 'Epic milestone' }
    ];
    for (var li = 0; li < tierInfo.length; li++) {
      var item = document.createElement('span');
      item.style.cssText = 'font-size: 0.6rem; font-family: "Orbitron", sans-serif; text-transform: uppercase; letter-spacing: 1px; color: ' + tierInfo[li].color + ';';
      item.textContent = tierInfo[li].label + ' — ' + tierInfo[li].meaning;
      legend.appendChild(item);
    }
    grid.appendChild(legend);

    // Render in tier order: legendary, gold, silver, bronze
    var tierOrder = ['legendary', 'gold', 'silver', 'bronze'];
    for (var t = 0; t < tierOrder.length; t++) {
      for (var id in ACHIEVEMENTS) {
        if (!ACHIEVEMENTS.hasOwnProperty(id)) continue;
        var ach = ACHIEVEMENTS[id];
        if (ach.tier !== tierOrder[t]) continue;

        var colors = TIER_COLORS[ach.tier] || TIER_COLORS.bronze;
        var isOwned = !!unlockedIds[id];

        var slot = document.createElement('div');
        slot.className = 'achievement-slot ' + (isOwned ? 'unlocked' : 'locked');
        slot.style.setProperty('--ach-color', colors.border);
        slot.style.setProperty('--ach-glow', colors.glow);
        if (isOwned) {
          slot.style.cursor = 'pointer';
          slot.setAttribute('data-ach-id', id);
        }

        var tierLabel = document.createElement('div');
        tierLabel.className = 'slot-tier';
        tierLabel.style.color = colors.border;
        tierLabel.textContent = ach.tier;

        var nameDiv = document.createElement('div');
        nameDiv.className = 'slot-name';
        nameDiv.textContent = isOwned ? ach.name : '???';

        var descDiv = document.createElement('div');
        descDiv.className = 'slot-session';
        descDiv.textContent = isOwned ? ach.description : '';

        slot.appendChild(tierLabel);
        slot.appendChild(nameDiv);
        slot.appendChild(descDiv);
        grid.appendChild(slot);
      }
    }

    // Click handler for achievement details
    if (grid._achHandler) {
      grid.removeEventListener('click', grid._achHandler);
    }
    grid._achHandler = function(e) {
      var slot = e.target.closest('.achievement-slot.unlocked');
      if (!slot) return;
      var achId = slot.getAttribute('data-ach-id');
      var record = unlockedIds[achId];
      if (!record) return;
      var colors = TIER_COLORS[record.tier] || TIER_COLORS.bronze;
      slot.style.transition = 'transform 0.15s ease, box-shadow 0.15s ease';
      slot.style.transform = 'scale(0.95)';
      setTimeout(function() { slot.style.transform = ''; }, 150);
      showAchTooltip(slot, achId, record, colors);
    };
    grid.addEventListener('click', grid._achHandler);

    // Clear tooltip on panel or grid scroll
    var panel = document.getElementById('achievements-panel');
    if (panel) {
      if (panel._scrollHandler) panel.removeEventListener('scroll', panel._scrollHandler);
      panel._scrollHandler = function() { clearAchTooltip(); };
      panel.addEventListener('scroll', panel._scrollHandler);
    }
    if (grid._scrollHandler) grid.removeEventListener('scroll', grid._scrollHandler);
    grid._scrollHandler = function() { clearAchTooltip(); };
    grid.addEventListener('scroll', grid._scrollHandler);
  }

  /* ── Public API ──────────────────────────────────────────────────── */

  return {
    init: init,
    checkAll: checkAll,
    checkItemTriggers: checkItemTriggers,
    getUnlocked: getUnlocked,
    togglePanel: togglePanel,
    updateBadge: updateBadge
  };

})();

window.SV = SV;
