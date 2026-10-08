/**
 * SV.inventory — RPG inventory system with toolbar bags and loot drops
 *
 * Renders a persistent bottom toolbar with 5 category bags. Clicking a bag
 * opens a panel showing discovered and locked items. Items are "discovered"
 * through exercises — Free Spirit framing (never "earned" or "awarded").
 *
 * Depends on:
 *   SV.persistence   — localStorage manager
 *   SV.CATEGORIES    — 5 category definitions (id, name, icon, color, glow)
 *   SV.ALL_ITEMS     — master item catalog keyed by slug
 *   SV.retroactiveLoot — first-load pre-population
 *
 * DOM targets (in template-shell.html):
 *   .inventory-bags         — container for bag icons
 *   #inventory-panel        — slide-up panel
 *   .inventory-panel-grid   — grid inside panel for item slots
 *   .inventory-panel-title  — title in panel header
 *
 * API:
 *   SV.inventory.init()
 *   SV.inventory.addItem(itemId)   — returns true/false
 *   SV.inventory.openBag(categoryId)
 *   SV.inventory.closePanel()
 *   SV.inventory.hasItem(itemId)
 *   SV.inventory.renderToolbar()
 */

var SV = window.SV || {};

SV.inventory = (function() {

  /* ------------------------------------------------------------------ */
  /*  Module-level tooltip state                                         */
  /* ------------------------------------------------------------------ */
  var activeTooltip = null;

  function clearTooltip() {
    if (activeTooltip && activeTooltip.parentNode) {
      activeTooltip.parentNode.removeChild(activeTooltip);
    }
    activeTooltip = null;
  }

  /* ------------------------------------------------------------------ */
  /*  Internal helpers                                                   */
  /* ------------------------------------------------------------------ */

  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getInventory() {
    return SV.persistence.get('inventory', []);
  }

  function getItemCount(categoryId) {
    var inv = getInventory();
    var count = 0;
    for (var i = 0; i < inv.length; i++) {
      if (inv[i].category === categoryId) {
        count++;
      }
    }
    return count;
  }

  function getTotalPossible(categoryId) {
    var count = 0;
    var items = SV.ALL_ITEMS;
    for (var k in items) {
      if (items.hasOwnProperty(k) && items[k].cat === categoryId) {
        count++;
      }
    }
    return count;
  }

  /** Create a DOM element with optional attributes and text */
  function el(tag, attrs, textContent) {
    var node = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (attrs.hasOwnProperty(k)) {
          if (k === 'className') {
            node.className = attrs[k];
          } else if (k === 'style' && typeof attrs[k] === 'object') {
            for (var s in attrs[k]) {
              if (attrs[k].hasOwnProperty(s)) {
                node.style[s] = attrs[k][s];
              }
            }
          } else {
            node.setAttribute(k, attrs[k]);
          }
        }
      }
    }
    if (textContent !== undefined) {
      node.textContent = textContent;
    }
    return node;
  }

  function playMaterializeAnimation(item) {
    var cat = SV.CATEGORIES[item.category] || {};
    var mobile = window.innerWidth <= 600;

    var toast = el('div', {
      className: 'loot-toast',
      style: {
        position: 'fixed',
        bottom: mobile ? '70px' : '80px',
        left: '50%',
        transform: 'translateX(-50%) scale(0.8)',
        background: 'rgba(20,20,30,0.95)',
        border: '1px solid ' + (cat.color || '#fff'),
        boxShadow: '0 0 ' + (mobile ? '12px' : '20px') + ' ' + (cat.glow || 'rgba(255,255,255,0.3)'),
        borderRadius: mobile ? '8px' : '12px',
        padding: mobile ? '8px 14px' : '12px 24px',
        color: '#fff',
        fontFamily: '"Exo 2",sans-serif',
        fontSize: mobile ? '12px' : '14px',
        maxWidth: mobile ? 'calc(100vw - 40px)' : 'none',
        zIndex: '10000',
        opacity: '0',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }
    });

    var iconSpan = el('span', { style: { fontSize: mobile ? '16px' : '20px' } }, cat.icon || '');
    var textSpan = el('span', null, 'Discovered: ' + (item.name || ''));

    toast.appendChild(iconSpan);
    toast.appendChild(textSpan);
    document.body.appendChild(toast);

    // Trigger animation on next frame
    requestAnimationFrame(function() {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) scale(1)';
    });

    // Fade out and remove
    setTimeout(function() {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) scale(0.8) translateY(10px)';
      setTimeout(function() {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 400);
    }, 3000);
  }

  function playFirstLoadAnimation(items) {
    if (!items || items.length === 0) return;

    var toast = el('div', {
      className: 'loot-toast loot-toast-first-load',
      style: {
        position: 'fixed',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%) scale(0.8)',
        background: 'rgba(20,20,30,0.95)',
        border: '1px solid #ffd700',
        boxShadow: '0 0 30px rgba(255,215,0,0.4)',
        borderRadius: '12px',
        padding: '16px 28px',
        color: '#fff',
        fontFamily: '"Exo 2",sans-serif',
        fontSize: '15px',
        zIndex: '10000',
        opacity: '0',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
        pointerEvents: 'none',
        textAlign: 'center'
      }
    });

    var line1 = el('div', { style: { fontSize: '20px', marginBottom: '4px' } }, '\u2728 Inventory Loaded \u2728');
    var line2 = el('div', { style: { fontSize: '13px', opacity: '0.8' } }, items.length + ' items from previous sessions');

    toast.appendChild(line1);
    toast.appendChild(line2);
    document.body.appendChild(toast);

    requestAnimationFrame(function() {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) scale(1)';
    });

    setTimeout(function() {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) scale(0.8)';
      setTimeout(function() {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 500);
    }, 3000);
  }

  /* ------------------------------------------------------------------ */
  /*  Drag-to-move panels (full-surface, touch, position persistence)    */
  /* ------------------------------------------------------------------ */

  function initDraggablePanels() {
    // Inject CSS once (idempotent)
    if (!document.getElementById('sv-draggable-css')) {
      var css = document.createElement('style');
      css.id = 'sv-draggable-css';
      css.textContent = [
        '.draggable-panel { cursor: grab; user-select: none; }',
        '.draggable-panel.dragging { cursor: grabbing; transition: none !important; z-index: 200 !important; }',
        '.drag-handle { cursor: grab; }',
        '.dragging .drag-handle { cursor: grabbing; }'
      ].join('\n');
      document.head.appendChild(css);
    }

    // Target all gamification panels
    var ids = ['inventory-toolbar', 'inventory-panel', 'achievements-panel', 'quest-log'];
    ids.forEach(function(id) {
      var panel = document.getElementById(id);
      if (!panel) return;
      // Skip if already handled (ch10-14 inline IIFE sets .draggable-panel in HTML,
      // or previous init already ran)
      if (panel.classList.contains('draggable-panel') || panel.getAttribute('data-sv-draggable') === 'true') return;
      panel.setAttribute('data-sv-draggable', 'true');
      panel.classList.add('draggable-panel');

      var state = { dragging: false, startX: 0, startY: 0, origLeft: 0, origTop: 0 };

      // Restore saved position
      try {
        var saved = JSON.parse(localStorage.getItem('sv-panel-pos-' + id));
        if (saved && saved.left != null && saved.top != null) {
          panel.style.left = saved.left + 'px';
          panel.style.top = saved.top + 'px';
          panel.style.right = 'auto';
          panel.style.bottom = 'auto';
          panel.style.transform = 'none';
        }
      } catch(e) {}

      function onDown(e) {
        var tag = e.target.tagName;
        if (tag === 'SELECT' || tag === 'BUTTON' || tag === 'INPUT' || tag === 'TEXTAREA') return;
        if (e.target.closest && e.target.closest('.quest-log-body')) return;
        if (e.target.closest && e.target.closest('.inventory-panel-close')) return;

        state.dragging = true;
        var rect = panel.getBoundingClientRect();
        state.startX = e.clientX || (e.touches && e.touches[0].clientX);
        state.startY = e.clientY || (e.touches && e.touches[0].clientY);
        state.origLeft = rect.left;
        state.origTop = rect.top;
        panel.classList.add('dragging');
        e.preventDefault();
      }

      function onMove(e) {
        if (!state.dragging) return;
        var cx = e.clientX || (e.touches && e.touches[0].clientX);
        var cy = e.clientY || (e.touches && e.touches[0].clientY);
        var dx = cx - state.startX;
        var dy = cy - state.startY;
        var newLeft = Math.max(0, Math.min(window.innerWidth - 50, state.origLeft + dx));
        var newTop = Math.max(0, Math.min(window.innerHeight - 30, state.origTop + dy));
        panel.style.left = newLeft + 'px';
        panel.style.top = newTop + 'px';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
        panel.style.transform = 'none';
      }

      function onUp() {
        if (!state.dragging) return;
        state.dragging = false;
        panel.classList.remove('dragging');
        try {
          localStorage.setItem('sv-panel-pos-' + id, JSON.stringify({
            left: parseInt(panel.style.left),
            top: parseInt(panel.style.top)
          }));
        } catch(e) {}
      }

      panel.addEventListener('mousedown', onDown);
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      panel.addEventListener('touchstart', onDown, {passive: false});
      document.addEventListener('touchmove', onMove, {passive: false});
      document.addEventListener('touchend', onUp);
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Public API                                                         */
  /* ------------------------------------------------------------------ */

  function init() {
    // Check for retroactive loot on first load
    var wasFirstLoad = SV.retroactiveLoot && SV.retroactiveLoot.isFirstLoad();
    if (wasFirstLoad && SV.retroactiveLoot) {
      var seeded = SV.retroactiveLoot.populate();
      if (seeded && seeded.length > 0) {
        // Delay animation so DOM is ready
        setTimeout(function() {
          playFirstLoadAnimation(seeded);
        }, 800);
      }
    }

    renderToolbar();

    // Make all gamification panels draggable (full-surface, touch, persistence)
    initDraggablePanels();

    // Close panel on Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        closePanel();
      }
    });
  }

  function addItem(itemId) {
    // Already discovered — no duplicates
    if (hasItem(itemId)) return false;

    // Look up definition
    var def = SV.ALL_ITEMS[itemId];
    if (!def) {
      console.warn('[inventory] Unknown item ID: ' + itemId);
      return false;
    }

    var item = {
      id: itemId,
      name: def.name,
      category: def.cat,
      session: def.session,
      description: def.desc,
      discoveredAt: new Date().toISOString()
    };

    SV.persistence.update('inventory', function(inv) {
      inv.push(item);
      return inv;
    }, []);

    renderToolbar();
    playMaterializeAnimation(item);

    // Notify achievements system if loaded
    if (SV.achievements && typeof SV.achievements.checkItemTriggers === 'function') {
      SV.achievements.checkItemTriggers(itemId);
    }

    return true;
  }

  function hasItem(itemId) {
    var inv = getInventory();
    for (var i = 0; i < inv.length; i++) {
      if (inv[i].id === itemId) return true;
    }
    return false;
  }

  function renderToolbar() {
    var container = document.querySelector('.inventory-bags');
    if (!container) return;

    // Clear existing content
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    var cats = SV.CATEGORIES;
    for (var catId in cats) {
      if (!cats.hasOwnProperty(catId)) continue;
      var cat = cats[catId];
      var discovered = getItemCount(catId);
      var total = getTotalPossible(catId);

      var btn = el('button', {
        className: 'inventory-bag',
        'data-category': catId,
        'aria-label': cat.name + ' (' + discovered + '/' + total + ')'
      });
      btn.style.setProperty('--bag-color', cat.color);
      btn.style.setProperty('--bag-glow', cat.glow);

      var iconSpan = el('span', { className: 'bag-icon' }, cat.icon);
      var countSpan = el('span', { className: 'bag-count' }, discovered + '/' + total);

      btn.appendChild(iconSpan);
      btn.appendChild(countSpan);

      // Attach click handler via closure
      (function(id) {
        btn.addEventListener('click', function() {
          openBag(id);
        });
      })(catId);

      container.appendChild(btn);
    }

    // Init Tippy tooltips on bag buttons
    if (typeof tippy !== 'undefined') {
      tippy('.inventory-bag', {
        content: function(ref) {
          var id = ref.getAttribute('data-category');
          var c = SV.CATEGORIES[id];
          return c ? c.name : '';
        },
        placement: 'top',
        theme: 'sv-dark'
      });
    }
  }

  function openBag(categoryId) {
    var panel = document.getElementById('inventory-panel');
    var grid = panel ? panel.querySelector('.inventory-panel-grid') : null;
    var titleEl = panel ? panel.querySelector('.inventory-panel-title') : null;
    if (!panel || !grid) return;

    var cat = SV.CATEGORIES[categoryId];
    if (!cat) return;

    // Set title
    if (titleEl) {
      titleEl.textContent = cat.icon + ' ' + cat.name;
    }

    // Clear existing grid content
    while (grid.firstChild) {
      grid.removeChild(grid.firstChild);
    }

    // Build item slots
    var allKeys = SV.itemsForCategory(categoryId);

    for (var i = 0; i < allKeys.length; i++) {
      var itemId = allKeys[i];
      var def = SV.ALL_ITEMS[itemId];
      var owned = hasItem(itemId);

      var slot;
      if (owned) {
        slot = el('div', {
          className: 'inventory-slot discovered',
          'data-item': itemId
        });
        slot.style.borderColor = cat.color;
        slot.style.boxShadow = '0 0 8px ' + cat.glow;

        var nameDiv = el('div', { className: 'slot-name' }, def.name);
        var sessionDiv = el('div', { className: 'slot-session' }, 'Session ' + def.session);

        slot.appendChild(nameDiv);
        slot.appendChild(sessionDiv);
      } else {
        slot = el('div', { className: 'inventory-slot locked' });

        var lockedName = el('div', { className: 'slot-name' }, '???');
        var lockedSession = el('div', { className: 'slot-session' }, '\u00A0'); // &nbsp;

        slot.appendChild(lockedName);
        slot.appendChild(lockedSession);
      }

      grid.appendChild(slot);
    }

    // Position panel near the toolbar
    var toolbar = document.getElementById('inventory-toolbar');
    if (toolbar) {
      var tbRect = toolbar.getBoundingClientRect();
      // Place panel above the toolbar, aligned to toolbar's left edge
      panel.style.left = Math.max(8, Math.round(tbRect.left)) + 'px';
      panel.style.bottom = Math.round(window.innerHeight - tbRect.top + 8) + 'px';
    }

    // Clear any tooltip from a previous bag
    clearTooltip();

    // Show panel
    panel.classList.remove('hidden');

    // Click-to-toggle descriptions on discovered slots (single active tooltip).
    // Remove previous handler to avoid stacking across bag switches.
    if (grid._tooltipHandler) {
      grid.removeEventListener('click', grid._tooltipHandler);
    }

    grid._tooltipHandler = function(e) {
      var slot = e.target.closest('.inventory-slot.discovered');
      if (!slot) return;

      var id = slot.getAttribute('data-item');
      var d = SV.ALL_ITEMS[id];
      if (!d) return;

      // If clicking the same slot that's already showing, close it
      if (activeTooltip && activeTooltip._slotId === id) {
        clearTooltip();
        return;
      }

      // Remove any existing tooltip
      clearTooltip();

      // Create fixed-position tooltip clamped to viewport
      var tip = el('div', {
        className: 'inventory-tooltip',
        style: {
          position: 'fixed',
          background: 'rgba(10,22,40,0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(0,180,255,0.2)',
          borderRadius: '8px',
          padding: '10px 14px',
          color: '#b0c4de',
          fontFamily: '"Exo 2", sans-serif',
          fontSize: '0.8rem',
          maxWidth: '260px',
          width: 'max-content',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          zIndex: '10001',
          pointerEvents: 'none'
        }
      }, d.desc);
      tip._slotId = id;

      document.body.appendChild(tip);

      // Position: centered above the slot, clamped to viewport
      var slotRect = slot.getBoundingClientRect();
      var tipRect = tip.getBoundingClientRect();

      var desiredLeft = slotRect.left + slotRect.width / 2 - tipRect.width / 2;
      var clampedLeft = Math.max(8, Math.min(window.innerWidth - tipRect.width - 8, desiredLeft));
      var topPos = slotRect.top - tipRect.height - 8;

      // If tooltip would go above viewport, place below the slot instead
      if (topPos < 8) {
        topPos = slotRect.bottom + 8;
      }

      tip.style.left = clampedLeft + 'px';
      tip.style.top = topPos + 'px';

      activeTooltip = tip;
    };

    grid.addEventListener('click', grid._tooltipHandler);
  }

  function closePanel() {
    clearTooltip();
    var panel = document.getElementById('inventory-panel');
    if (panel) {
      panel.classList.add('hidden');
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Return public API                                                  */
  /* ------------------------------------------------------------------ */

  return {
    init: init,
    addItem: addItem,
    openBag: openBag,
    closePanel: closePanel,
    hasItem: hasItem,
    renderToolbar: renderToolbar
  };

})();

window.SV = SV;
