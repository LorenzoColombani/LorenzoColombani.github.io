/**
 * SV.retroactiveLoot — pre-populates inventory with Sessions 1-12 items
 *
 * On first load (no existing inventory in persistence), this module
 * seeds the inventory with all knowledge items from completed sessions.
 * Creates the "Endowment Effect" — seeing what you already own.
 *
 * Depends on: SV.persistence, SV.ALL_ITEMS (loaded via earlier script tags)
 *
 * API:
 *   SV.retroactiveLoot.isFirstLoad()   — true if no inventory exists yet
 *   SV.retroactiveLoot.populate()       — seed inventory on first load
 *   SV.retroactiveLoot.RETROACTIVE_IDS  — array of all pre-populated item IDs
 */

var SV = window.SV || {};

SV.retroactiveLoot = (function() {

  // Public site: visitors start fresh and earn items by completing exercises.
  // Retroactive seeding disabled — empty array means no auto-granted items.
  var RETROACTIVE_IDS = [];

  function isFirstLoad() {
    return !SV.persistence.has('inventory');
  }

  function populate() {
    if (!isFirstLoad()) {
      return SV.persistence.get('inventory', []);
    }

    var items = [];
    var now = new Date().toISOString();

    for (var i = 0; i < RETROACTIVE_IDS.length; i++) {
      var id = RETROACTIVE_IDS[i];
      var def = SV.ALL_ITEMS[id];

      if (!def) {
        console.warn('[retroactive-loot] Item ID not found in SV.ALL_ITEMS: ' + id);
        continue;
      }

      items.push({
        id: id,
        name: def.name,
        category: def.cat,
        session: def.session,
        description: def.desc,
        discoveredAt: now
      });
    }

    SV.persistence.set('inventory', items);
    return items;
  }

  return {
    isFirstLoad: isFirstLoad,
    populate: populate,
    RETROACTIVE_IDS: RETROACTIVE_IDS
  };

})();

window.SV = SV;
