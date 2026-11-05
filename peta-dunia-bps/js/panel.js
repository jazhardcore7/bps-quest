// Interactive Info Board Panel with Role-Based Quest Button
(function (window) {
  'use strict';

  var isPanelOpen = false;
  var panelCallback = null;
  var previousActiveElement = null;
  var currentUnitName = 'Biro SDM';
  var keydownHandler = null;

  var MOCK_QUESTS = [
    {
      id: 1,
      title: '[Judul quest 1]',
      desc: '[Deskripsi tugas quest pertama mengenai layanan kepegawaian]',
      xp: '+50 XP'
    },
    {
      id: 2,
      title: '[Judul quest 2]',
      desc: '[Deskripsi tugas quest kedua mengenai tata kelola SDM]',
      xp: '+30 XP'
    },
    {
      id: 3,
      title: '[Judul quest 3]',
      desc: '[Deskripsi tugas quest ketiga mengenai eksplorasi fasilitas biro]',
      xp: '+20 XP'
    }
  ];

  var INFO_ROWS = [
    'Profil & Tugas Fungsi',
    'Struktur Organisasi',
    'Fasilitas & Layanan',
    'Papan Informasi Terkini'
  ];

  // ---------------------------------------------------------------------------
  // View Templates
  // ---------------------------------------------------------------------------
  function renderMainContentHtml(buildingUnit) {
    var unit = buildingUnit || 'Biro SDM';

    // Akses Informasi button rows
    var rowsHtml = '';
    for (var i = 0; i < INFO_ROWS.length; i++) {
      var rowTitle = INFO_ROWS[i];
      rowsHtml += '' +
        '<button type="button" class="info-row-btn" data-row-title="' + rowTitle + '">' +
          '<span class="info-row-label">' + rowTitle + '</span>' +
          '<span class="info-row-arrow" aria-hidden="true">&#8250;</span>' +
        '</button>';
    }

    // Role-based footer evaluated solely by AppState.canStartQuest(buildingUnit)
    var canStart = false;
    if (window.AppState && typeof window.AppState.canStartQuest === 'function') {
      canStart = window.AppState.canStartQuest(unit);
    }

    var footerHtml = '';
    if (canStart) {
      footerHtml = '' +
        '<div class="info-panel-footer">' +
          '<button type="button" class="btn-start-quest" id="btn-open-quests">' +
            'Mulai Quest' +
          '</button>' +
        '</div>';
    } else {
      // Must render NO button element at all in the DOM
      footerHtml = '' +
        '<div class="info-panel-footer">' +
          '<div class="info-gray-note">' +
            'Quest hanya tersedia untuk pegawai ' + unit +
          '</div>' +
        '</div>';
    }

    return '' +
      '<div class="info-main-view">' +
        // Header
        '<div class="info-card-header">' +
          '<div class="info-header-left">' +
            '<h2 class="info-unit-title" id="info-panel-title">' + unit + '</h2>' +
            '<span class="info-parent-chip">Sekretariat Utama</span>' +
          '</div>' +
          '<div class="info-header-right">' +
            '<span class="info-building-xp-chip">Level 2 · 350/600 XP</span>' +
            '<button type="button" class="info-card-close-btn" id="info-card-close" aria-label="Tutup panel">&times;</button>' +
          '</div>' +
        '</div>' +
        // Description
        '<p class="info-unit-desc">' +
          '[Deskripsi singkat tugas dan fungsi ' + unit + ', diisi pihak biro]' +
        '</p>' +
        // Akses Informasi Section
        '<div class="info-section-label">Akses Informasi</div>' +
        '<div class="info-rows-list">' +
          rowsHtml +
        '</div>' +
        // Footer (Role-based)
        footerHtml +
      '</div>';
  }

  function renderSubViewHtml(rowTitle, buildingUnit) {
    var unit = buildingUnit || 'Biro SDM';
    return '' +
      '<div class="info-sub-view">' +
        '<div class="info-sub-header">' +
          '<button type="button" class="info-sub-back-btn" id="info-sub-back" aria-label="Kembali ke menu utama">' +
            '&#8592; Kembali' +
          '</button>' +
          '<button type="button" class="info-card-close-btn" id="info-sub-close" aria-label="Tutup panel">&times;</button>' +
        '</div>' +
        '<h3 class="info-sub-title">' + rowTitle + '</h3>' +
        '<div class="info-sub-body">' +
          '<p class="info-sub-placeholder">[Konten diisi pihak ' + unit + ']</p>' +
        '</div>' +
      '</div>';
  }

  function renderQuestSheetHtml(buildingUnit) {
    var questsHtml = '';
    for (var i = 0; i < MOCK_QUESTS.length; i++) {
      var q = MOCK_QUESTS[i];
      questsHtml += '' +
        '<div class="quest-card-item">' +
          '<div class="quest-item-main">' +
            '<div class="quest-item-title">' + q.title + '</div>' +
            '<div class="quest-item-desc">' + q.desc + '</div>' +
          '</div>' +
          '<div class="quest-item-xp">' + q.xp + '</div>' +
        '</div>';
    }

    return '' +
      '<div class="quest-sheet-container">' +
        '<div class="quest-sheet-header">' +
          '<div class="quest-sheet-title-wrap">' +
            '<button type="button" class="quest-sheet-back-btn" id="quest-sheet-back" aria-label="Kembali ke panel">&#8592;</button>' +
            '<h3 class="quest-sheet-title">Quest tersedia</h3>' +
          '</div>' +
          '<button type="button" class="info-card-close-btn" id="quest-sheet-close" aria-label="Tutup panel">&times;</button>' +
        '</div>' +
        '<div class="quest-sheet-list">' +
          questsHtml +
        '</div>' +
      '</div>';
  }

  // ---------------------------------------------------------------------------
  // Focus Trap Management
  // ---------------------------------------------------------------------------
  function trapFocus(modalElement) {
    var focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    keydownHandler = function (e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        window.closeInfoPanel();
        return;
      }

      if (e.key === 'Tab') {
        var focusable = modalElement.querySelectorAll(focusableSelectors);
        if (focusable.length === 0) return;

        var first = focusable[0];
        var last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', keydownHandler);

    // Initial focus on close button or first interactive element
    setTimeout(function () {
      var initialFocus = modalElement.querySelector('#info-card-close') || modalElement.querySelector(focusableSelectors);
      if (initialFocus) {
        initialFocus.focus();
      }
    }, 50);
  }

  function untrapFocus() {
    if (keydownHandler) {
      window.removeEventListener('keydown', keydownHandler);
      keydownHandler = null;
    }
    if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
      try {
        previousActiveElement.focus();
      } catch (e) {}
      previousActiveElement = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  window.openInfoPanel = function (buildingUnit) {
    if (isPanelOpen) return;
    isPanelOpen = true;
    currentUnitName = buildingUnit || 'Biro SDM';
    previousActiveElement = document.activeElement;

    // Attach to #stage so it stays inside stage bounds and scales cleanly
    var stage = document.getElementById('stage') || document.body;
    var existing = document.getElementById('info-panel-modal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.className = 'info-panel-backdrop';
    modal.id = 'info-panel-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'info-panel-title');

    var card = document.createElement('div');
    card.className = 'info-panel-card-white';
    card.id = 'info-panel-card';
    card.innerHTML = renderMainContentHtml(currentUnitName);
    modal.appendChild(card);
    stage.appendChild(modal);

    // Wire up events
    wireMainViewEvents(card, currentUnitName);

    // Backdrop click dismisses
    modal.addEventListener('click', function (e) {
      if (e.target === modal) {
        window.closeInfoPanel();
      }
    });

    // Trap focus inside modal
    trapFocus(modal);

    // Notify office screen / game loop
    if (typeof panelCallback === 'function') {
      try {
        panelCallback(true);
      } catch (err) {
        console.error('Panel callback error:', err);
      }
    }

    window.dispatchEvent(new CustomEvent('bps-panel-change', { detail: { open: true, unit: currentUnitName } }));
  };

  window.closeInfoPanel = function () {
    if (!isPanelOpen) return;
    isPanelOpen = false;

    untrapFocus();

    var modal = document.getElementById('info-panel-modal');
    if (modal) {
      modal.remove();
    }

    // Notify office screen / game loop
    if (typeof panelCallback === 'function') {
      try {
        panelCallback(false);
      } catch (err) {
        console.error('Panel callback error:', err);
      }
    }

    window.dispatchEvent(new CustomEvent('bps-panel-change', { detail: { open: false } }));
  };

  window.setPanelCallback = function (fn) {
    panelCallback = fn;
  };

  window.isInfoPanelOpen = function () {
    return isPanelOpen;
  };

  // ---------------------------------------------------------------------------
  // View Transition Event Wiring
  // ---------------------------------------------------------------------------
  function wireMainViewEvents(card, buildingUnit) {
    // Close button
    var closeBtn = card.querySelector('#info-card-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function (e) {
        e.preventDefault();
        window.closeInfoPanel();
      });
    }

    // Row clicks -> Sub-views
    var rowBtns = card.querySelectorAll('.info-row-btn');
    for (var i = 0; i < rowBtns.length; i++) {
      rowBtns[i].addEventListener('click', function (e) {
        e.preventDefault();
        var rowTitle = this.getAttribute('data-row-title');
        showSubView(card, rowTitle, buildingUnit);
      });
    }

    // Mulai Quest button -> Quest Bottom Sheet
    var questBtn = card.querySelector('#btn-open-quests');
    if (questBtn) {
      questBtn.addEventListener('click', function (e) {
        e.preventDefault();
        showQuestSheet(card, buildingUnit);
      });
    }
  }

  function showSubView(card, rowTitle, buildingUnit) {
    card.innerHTML = renderSubViewHtml(rowTitle, buildingUnit);

    var backBtn = card.querySelector('#info-sub-back');
    if (backBtn) {
      backBtn.addEventListener('click', function (e) {
        e.preventDefault();
        card.innerHTML = renderMainContentHtml(buildingUnit);
        wireMainViewEvents(card, buildingUnit);
        // Focus first row or close
        var firstRow = card.querySelector('.info-row-btn');
        if (firstRow) firstRow.focus();
      });
    }

    var closeBtn = card.querySelector('#info-sub-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function (e) {
        e.preventDefault();
        window.closeInfoPanel();
      });
    }

    if (backBtn) backBtn.focus();
  }

  function showQuestSheet(card, buildingUnit) {
    card.innerHTML = renderQuestSheetHtml(buildingUnit);

    var backBtn = card.querySelector('#quest-sheet-back');
    if (backBtn) {
      backBtn.addEventListener('click', function (e) {
        e.preventDefault();
        card.innerHTML = renderMainContentHtml(buildingUnit);
        wireMainViewEvents(card, buildingUnit);
        var questBtn = card.querySelector('#btn-open-quests');
        if (questBtn) questBtn.focus();
      });
    }

    var closeBtn = card.querySelector('#quest-sheet-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function (e) {
        e.preventDefault();
        window.closeInfoPanel();
      });
    }

    if (backBtn) backBtn.focus();
  }

})(window);
