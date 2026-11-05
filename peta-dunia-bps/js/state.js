// Application state management with pub/sub observer pattern
(function (window) {
  'use strict';

  var STORAGE_KEY = 'bps_current_unit';
  var DEFAULT_UNIT = 'Biro SDM';

  // Safe localStorage getter
  function loadPersistedUnit() {
    try {
      if (typeof window.localStorage !== 'undefined') {
        var stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored === 'Biro SDM' || stored === 'Biro Umum') {
          return stored;
        }
      }
    } catch (e) {
      console.warn('localStorage read error:', e);
    }
    return DEFAULT_UNIT;
  }

  // Safe localStorage setter
  function savePersistedUnit(unit) {
    try {
      if (typeof window.localStorage !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, unit);
      }
    } catch (e) {
      console.warn('localStorage write error:', e);
    }
  }

  var subscribers = [];

  var AppState = {
    player: {
      name: 'Pegawai Demo',
      level: 1,
      title: 'Explorer',
      xp: 120,
      xpToNext: 500
    },
    currentUnit: loadPersistedUnit(),

    // Subscribe to state changes. Returns an unsubscribe function.
    subscribe: function (fn) {
      if (typeof fn === 'function') {
        subscribers.push(fn);
      }
      return function () {
        var idx = subscribers.indexOf(fn);
        if (idx !== -1) {
          subscribers.splice(idx, 1);
        }
      };
    },

    // Set active unit, persist, and notify all subscribers
    setCurrentUnit: function (unit) {
      if (this.currentUnit !== unit) {
        this.currentUnit = unit;
        savePersistedUnit(unit);
        this.notify();
      }
    },

    // Check if current simulated player is eligible to start quests for a given building unit
    canStartQuest: function (buildingUnit) {
      return this.currentUnit === buildingUnit;
    },

    // Notify all active listeners
    notify: function () {
      for (var i = 0; i < subscribers.length; i++) {
        try {
          subscribers[i](this);
        } catch (e) {
          console.error('State subscriber error:', e);
        }
      }
    }
  };

  window.AppState = AppState;
})(window);

