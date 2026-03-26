// stages/stage7/stage7.js
// Final Output stage — assembles everything into actionable directions
// Shows: problem summary, candidate directions with code shapes,
// failure conditions, next actions, and tradeoff comparison
// Module contract: render(state), onMount(state), cleanup()

const Stage7 = (() => {

  // ─── PRIVATE STATE ─────────────────────────────────────────────────────────

  let _state             = null;
  let _directions        = [];
  let _selectedDirection = null;
  let _activeTab         = 'directions';

  // ─── RENDER ────────────────────────────────────────────────────────────────

  function render(state) {
    _state      = state;
    _directions = _resolveDirections(state);

    const saved = state.answers?.stage7 ?? {};
    _selectedDirection = saved.selectedDirection ?? _directions[0]?.id ?? null;
    _activeTab         = 'directions';

    // Persist directions to state so engine can use them
    State.setAnswer('stage7', {
      directions       : _directions,
      selectedDirection: _selectedDirection,
    });

    const wrapper = DomUtils.div({ class: 'stage stage7' }, [
      _buildIntro(),
      _buildSummaryStrip(),
      _buildTabBar(),
      _buildTabPanels(saved),
    ]);

    return wrapper;
  }

  // ─── INTRO ─────────────────────────────────────────────────────────────────

  function _buildIntro() {
    const score = _state?.answers?.stage6_5?.score ?? null;
    const band  = score !== null
      ? ConfidenceScorer.getBand(score)
      : null;

    return DomUtils.div({ class: 'stage-intro' }, [
      DomUtils.div({ class: 'stage-intro__rule' },
        'Your approach — built from structural analysis, not pattern matching.'
      ),
      DomUtils.div({ class: 'stage-intro__sub' },
        band
          ? `Confidence: ${band.label} (${score}/100) — ${_directions.length} direction(s) identified`
          : `${_directions.length} direction(s) identified from structural analysis`
      ),
    ]);
  }

  // ─── SUMMARY STRIP ────────────────────────────────────────────────────────

  function _buildSummaryStrip() {
    const summary = SummaryBuilder.build(_state);

    const strip = DomUtils.div({ class: 's7-summary-strip' });

    const rows = [
      { label: 'N / Budget',  value: summary.complexity },
      { label: 'Input',       value: summary.input      },
      { label: 'Output',      value: summary.output     },
      { label: 'Structure',   value: summary.structure  },
      { label: 'Direction',   value: summary.direction  },
    ];

    rows.forEach(row => {
      strip.appendChild(
        DomUtils.div({ class: 's7-summary-row' }, [
          DomUtils.span({ class: 's7-summary-row__label' }, row.label),
          DomUtils.span({ class: 's7-summary-row__value' }, row.value),
        ])
      );
    });

    return strip;
  }

  // ─── TAB BAR ──────────────────────────────────────────────────────────────

  function _buildTabBar() {
    const tabs = [
      { id: 'directions', label: 'Directions'      },
      { id: 'failure',    label: 'Failure conditions' },
      { id: 'actions',    label: 'First actions'    },
    ];

    if (_directions.length > 1) {
      tabs.push({ id: 'tradeoffs', label: 'Tradeoffs' });
    }

    const tabBar = DomUtils.div({
      class: 's7-tab-bar',
      id   : 's7-tab-bar',
    });

    tabs.forEach(tab => {
      const tabEl = DomUtils.div({
        class: `s7-tab ${tab.id === _activeTab ? 's7-tab--active' : ''}`,
        data : { tabId: tab.id },
      }, tab.label);

      tabEl.addEventListener('click', () => _switchTab(tab.id));
      tabBar.appendChild(tabEl);
    });

    return tabBar;
  }

  // ─── TAB PANELS ───────────────────────────────────────────────────────────

  function _buildTabPanels(saved) {
    const panels = DomUtils.div({
      class: 's7-panels',
      id   : 's7-panels',
    });

    panels.appendChild(_buildDirectionsPanel(saved));
    panels.appendChild(_buildFailurePanel(saved));
    panels.appendChild(_buildActionsPanel(saved));

    if (_directions.length > 1) {
      panels.appendChild(_buildTradeoffsPanel());
    }

    return panels;
  }

  // ─── DIRECTIONS PANEL ─────────────────────────────────────────────────────

  function _buildDirectionsPanel(saved) {
    const panel = DomUtils.div({
      class: 's7-panel s7-panel--active',
      id   : 'panel-directions',
    });

    if (!_directions.length) {
      panel.appendChild(
        DomUtils.div({ class: 's7-empty' },
          'No directions could be determined from the structural analysis. ' +
          'Return to Stage 3 and answer more structural property questions.'
        )
      );
      return panel;
    }

    _directions.forEach((dir, idx) => {
      panel.appendChild(
        _buildDirectionCard(dir, idx === 0, saved)
      );
    });

    return panel;
  }

  function _buildDirectionCard(dir, isPrimary, saved) {
    const isSelected = _selectedDirection === dir.id;
    const meta       = TradeoffResolver.getMetaForDirection(dir.id);

    const card = DomUtils.div({
      class: `s7-direction-card ${isPrimary ? 's7-direction-card--primary' : ''} ${isSelected ? 's7-direction-card--selected' : ''}`,
      id   : `dir-card-${dir.id}`,
    });

    // Header
    const header = DomUtils.div({ class: 's7-direction-card__header' }, [
      DomUtils.div({ class: 's7-direction-card__header-left' }, [
        isPrimary
          ? DomUtils.span({ class: 's7-primary-badge' }, 'Primary')
          : DomUtils.span({ class: 's7-secondary-badge' }, `Option ${_directions.indexOf(dir) + 1}`),
        DomUtils.div({ class: 's7-direction-card__label' }, dir.label),
      ]),
      DomUtils.span({ class: 's7-direction-card__complexity detail-mono' },
        dir.complexity
      ),
    ]);

    card.appendChild(header);

    // Why
    card.appendChild(
      DomUtils.div({ class: 's7-direction-card__why' }, [
        DomUtils.span({ class: 's7-why-label' }, 'Why: '),
        DomUtils.span({}, dir.why),
      ])
    );

    // Verify before coding
    card.appendChild(
      DomUtils.div({ class: 's7-direction-card__verify' }, [
        DomUtils.span({ class: 's7-verify-label' }, 'Verify first: '),
        DomUtils.span({}, dir.verifyBefore),
      ])
    );

    // Transform applied notice
    if (dir.transformApplied) {
      const t = TransformationList.getById(dir.transformApplied);
      if (t) {
        card.appendChild(
          DomUtils.div({ class: 's7-transform-notice' }, [
            DomUtils.span({ class: 's7-transform-notice__icon' }, '🔄'),
            DomUtils.span({}, `After transformation: ${t.label}`),
          ])
        );
      }
    }

    // Code shape — collapsible
    if (dir.codeShape) {
      card.appendChild(
        DomUtils.createCollapsible(
          'Code shape',
          DomUtils.el('pre', { class: 's7-code-shape' }, dir.codeShape),
          isPrimary // open by default for primary direction
        )
      );
    }

    // Watch outs
    if (dir.watchOut?.length) {
      const woEl = DomUtils.div({ class: 's7-direction-card__watchouts' });
      dir.watchOut.forEach(w => {
        woEl.appendChild(
          DomUtils.div({ class: 'watchout-row' }, [
            DomUtils.span({ class: 'watchout-icon' }, '⚠'),
            DomUtils.span({ class: 'watchout-text' }, w),
          ])
        );
      });
      card.appendChild(woEl);
    }

    // Meta badges
    if (meta) {
      card.appendChild(
        DomUtils.div({ class: 's7-direction-card__meta' }, [
          _buildMetaBadge('Impl', meta.implementationDifficulty),
          _buildMetaBadge('WA risk', meta.riskOfWA),
          _buildMetaBadge('TLE risk', meta.riskOfTLE),
          _buildMetaBadge('Code', meta.codeLength),
        ])
      );
    }

    // Select button
    const selectBtn = DomUtils.btn({
      class: `s7-select-btn ${isSelected ? 's7-select-btn--selected' : ''}`,
      data : { dirId: dir.id },
    }, isSelected ? '✓ This is my direction' : 'Select this direction');

    selectBtn.addEventListener('click', () => _onDirectionSelect(dir.id));
    card.appendChild(selectBtn);

    return card;
  }

  function _buildMetaBadge(label, value) {
    const colorMap = {
      easy: 'green', low: 'green', short: 'green',
      medium: 'yellow',
      hard: 'red', high: 'red',
    };
    const color = colorMap[value] ?? 'gray';

    return DomUtils.div({ class: `s7-meta-badge s7-meta-badge--${color}` }, [
      DomUtils.span({ class: 's7-meta-badge__label' }, label),
      DomUtils.span({ class: 's7-meta-badge__value' }, value ?? '?'),
    ]);
  }

  // ─── FAILURE CONDITIONS PANEL ─────────────────────────────────────────────

  function _buildFailurePanel(saved) {
    const panel = DomUtils.div({
      class: 's7-panel hidden',
      id   : 'panel-failure',
    });

    panel.appendChild(
      DomUtils.div({ class: 's7-panel-intro' },
        'These are the specific ways this approach fails — silent wrong answers and TLE conditions.'
      )
    );

    const dir = _getSelectedDirection();
    if (!dir) return panel;

    const failures = FailureConditions.getForDirection(dir.id);

    if (!failures.length) {
      panel.appendChild(
        DomUtils.div({ class: 's7-empty' },
          'No specific failure conditions catalogued for this direction.'
        )
      );
      return panel;
    }

    failures.forEach(f => {
      const card = DomUtils.div({ class: 's7-failure-card' }, [
        DomUtils.div({ class: 's7-failure-card__condition' }, [
          DomUtils.span({ class: 's7-failure-icon' }, '✗'),
          DomUtils.span({}, f.condition),
        ]),
        DomUtils.div({ class: 's7-failure-card__consequence' }, [
          DomUtils.span({ class: 's7-consequence-label' }, 'Consequence: '),
          DomUtils.span({}, f.consequence),
        ]),
        DomUtils.div({ class: 's7-failure-card__detection' }, [
          DomUtils.span({ class: 's7-detection-label' }, 'Detect: '),
          DomUtils.span({}, f.detection),
        ]),
        DomUtils.createCollapsible(
          'Fix',
          DomUtils.div({ class: 's7-fix-content' }, f.fix),
          false
        ),
      ]);

      panel.appendChild(card);
    });

    return panel;
  }

  // ─── FIRST ACTIONS PANEL ──────────────────────────────────────────────────

  function _buildActionsPanel(saved) {
    const panel = DomUtils.div({
      class: 's7-panel hidden',
      id   : 'panel-actions',
    });

    panel.appendChild(
      DomUtils.div({ class: 's7-panel-intro' },
        'The exact three steps to take when you open your editor — in order.'
      )
    );

    const dir     = _getSelectedDirection();
    const actions = dir
      ? NextAction.buildActionList([dir])
      : [];

    if (!actions.length) {
      panel.appendChild(
        DomUtils.div({ class: 's7-empty' },
          'Select a direction to see first actions.'
        )
      );
      return panel;
    }

    actions.forEach(action => {
      const card = DomUtils.div({ class: 's7-action-card' }, [
        DomUtils.div({ class: 's7-action-card__header' }, [
          DomUtils.span({ class: 's7-action-num' }, String(action.order)),
          DomUtils.span({ class: 's7-action-card__action' }, action.action),
        ]),
        DomUtils.div({ class: 's7-action-card__detail' }, action.detail),
        DomUtils.createCollapsible(
          'Code',
          DomUtils.el('pre', { class: 's7-code-shape' }, action.code),
          action.order === 1
        ),
      ]);

      panel.appendChild(card);
    });

    return panel;
  }

  // ─── TRADEOFFS PANEL ──────────────────────────────────────────────────────

  function _buildTradeoffsPanel() {
    const panel = DomUtils.div({
      class: 's7-panel hidden',
      id   : 'panel-tradeoffs',
    });

    panel.appendChild(
      DomUtils.div({ class: 's7-panel-intro' },
        'Side-by-side comparison of candidate directions.'
      )
    );

    const comparison = TradeoffResolver.buildComparison(_directions);
    const recommended = TradeoffResolver.recommend(_directions, {
      prioritizeLowWA   : true,
      prioritizeLowTLE  : false,
      prioritizeEasyImpl: false,
    });

    if (recommended) {
      panel.appendChild(
        DomUtils.div({ class: 's7-recommendation' }, [
          DomUtils.span({ class: 's7-rec-label' }, 'Recommended: '),
          DomUtils.span({ class: 's7-rec-value'  }, recommended.label),
          DomUtils.span({ class: 's7-rec-reason' },
            ' — lowest WA risk among options'
          ),
        ])
      );
    }

    // Comparison table
    const table = DomUtils.div({ class: 's7-tradeoff-table' });

    // Header row
    const headerRow = DomUtils.div({ class: 's7-tradeoff-header-row' }, [
      DomUtils.span({ class: 's7-tradeoff-cell s7-tradeoff-cell--header' }, 'Direction'),
      DomUtils.span({ class: 's7-tradeoff-cell s7-tradeoff-cell--header' }, 'Complexity'),
      DomUtils.span({ class: 's7-tradeoff-cell s7-tradeoff-cell--header' }, 'Impl'),
      DomUtils.span({ class: 's7-tradeoff-cell s7-tradeoff-cell--header' }, 'WA risk'),
      DomUtils.span({ class: 's7-tradeoff-cell s7-tradeoff-cell--header' }, 'TLE risk'),
    ]);
    table.appendChild(headerRow);

    comparison.forEach(row => {
      const isRec = recommended?.id === row.id;

      const dataRow = DomUtils.div({
        class: `s7-tradeoff-data-row ${isRec ? 's7-tradeoff-data-row--rec' : ''}`,
      }, [
        DomUtils.span({ class: 's7-tradeoff-cell' }, [
          isRec
            ? DomUtils.span({ class: 's7-tradeoff-rec-dot' }, '★ ')
            : null,
          DomUtils.span({}, row.label),
        ].filter(Boolean)),
        DomUtils.span({ class: 's7-tradeoff-cell detail-mono' }, row.complexity),
        DomUtils.span({ class: `s7-tradeoff-cell s7-risk-${row.difficulty}` }, row.difficulty),
        DomUtils.span({ class: `s7-tradeoff-cell s7-risk-${row.riskWA}`    }, row.riskWA),
        DomUtils.span({ class: `s7-tradeoff-cell s7-risk-${row.riskTLE}`   }, row.riskTLE),
      ]);

      table.appendChild(dataRow);

      // Notes row
      if (row.notes) {
        table.appendChild(
          DomUtils.div({ class: 's7-tradeoff-notes-row' }, [
            DomUtils.span({ class: 's7-tradeoff-notes-icon' }, '→'),
            DomUtils.span({ class: 's7-tradeoff-notes-text' }, row.notes),
          ])
        );
      }
    });

    panel.appendChild(table);
    return panel;
  }

  // ─── CHANGE HANDLERS ──────────────────────────────────────────────────────

  function _switchTab(tabId) {
    _activeTab = tabId;

    document.querySelectorAll('.s7-tab').forEach(tab => {
      tab.classList.toggle('s7-tab--active', tab.dataset.tabId === tabId);
    });

    document.querySelectorAll('.s7-panel').forEach(panel => {
      const isActive = panel.id === `panel-${tabId}`;
      panel.classList.toggle('s7-panel--active', isActive);
      panel.classList.toggle('hidden', !isActive);
    });
  }

  function _onDirectionSelect(dirId) {
    _selectedDirection = dirId;

    // Update card states
    document.querySelectorAll('.s7-direction-card').forEach(card => {
      card.classList.toggle(
        's7-direction-card--selected',
        card.id === `dir-card-${dirId}`
      );
    });

    // Update select buttons
    document.querySelectorAll('.s7-select-btn').forEach(btn => {
      const isSelected = btn.dataset.dirId === dirId;
      btn.classList.toggle('s7-select-btn--selected', isSelected);
      btn.textContent = isSelected
        ? '✓ This is my direction'
        : 'Select this direction';
    });

    State.setAnswer('stage7', { selectedDirection: dirId });

    // Re-render failure and actions panels
    const failurePanel = document.getElementById('panel-failure');
    if (failurePanel) {
      const newPanel = _buildFailurePanel({});
      failurePanel.replaceWith(newPanel);
      newPanel.id = 'panel-failure';
      newPanel.classList.toggle('hidden', _activeTab !== 'failure');
      newPanel.classList.toggle('s7-panel--active', _activeTab === 'failure');
    }

    const actionsPanel = document.getElementById('panel-actions');
    if (actionsPanel) {
      const newPanel = _buildActionsPanel({});
      actionsPanel.replaceWith(newPanel);
      newPanel.id = 'panel-actions';
      newPanel.classList.toggle('hidden', _activeTab !== 'actions');
      newPanel.classList.toggle('s7-panel--active', _activeTab === 'actions');
    }

    _checkComplete();
  }

  // ─── HELPERS ───────────────────────────────────────────────────────────────

  function _resolveDirections(state) {
    // First check if directions already in state output (set by engine)
    const existing = state.output?.directions ?? [];
    if (existing.length) return existing;

    // Otherwise build from stage answers
    return DirectionBuilder.buildDirections(state.answers ?? {});
  }

  function _getSelectedDirection() {
    return _directions.find(d => d.id === _selectedDirection) ?? _directions[0] ?? null;
  }

  // ─── COMPLETION CHECK ──────────────────────────────────────────────────────

  function _checkComplete() {
    // Stage 7 is the final stage — always completable once directions exist
    const valid = _directions.length > 0 && !!_selectedDirection;
    Renderer.setNextEnabled(valid);

    if (valid) {
      const dir = _getSelectedDirection();
      document.dispatchEvent(new CustomEvent('dsa:stage-complete', {
        detail: {
          stageId: 'stage7',
          answers: {
            directions       : _directions,
            selectedDirection: _selectedDirection,
            primaryDirection : dir?.label    ?? null,
            primaryFamily    : dir?.family   ?? null,
            primaryComplexity: dir?.complexity ?? null,
          },
        },
      }));
    }
  }

  // ─── LIFECYCLE ─────────────────────────────────────────────────────────────

  function onMount(state) {
    const saved = state.answers?.stage7;
    if (saved?.selectedDirection || _directions.length > 0) {
      Renderer.setNextEnabled(true);
    }
  }

  function cleanup() {
    _state             = null;
    _directions        = [];
    _selectedDirection = null;
    _activeTab         = 'directions';
  }

  // ─── PUBLIC ────────────────────────────────────────────────────────────────

  return { render, onMount, cleanup };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Stage7;
}