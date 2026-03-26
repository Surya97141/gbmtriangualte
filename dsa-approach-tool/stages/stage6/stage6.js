// stages/stage6/stage6.js
// Edge Case Generator stage — builds personalized edge case checklist
// based on input type, problem type, and current approach
// Module contract: render(state), onMount(state), cleanup()

const Stage6 = (() => {

  // ─── PRIVATE STATE ─────────────────────────────────────────────────────────

  let _state           = null;
  let _acknowledged    = new Set(); // case ids acknowledged
  let _customCases     = [];        // user-added custom edge cases
  let _activeTab       = 'critical';

  // ─── CASE MODULES MAP ─────────────────────────────────────────────────────

  const CASE_MODULES = {
    universal : UniversalCases,
    array     : ArrayCases,
    string    : StringCases,
    tree      : TreeCases,
    graph     : GraphCases,
    interval  : IntervalCases,
    numeric   : NumericCases,
  };

  // ─── INPUT TYPE → CASE MODULE MAPPING ─────────────────────────────────────

  const INPUT_TYPE_TO_MODULES = {
    single_array    : ['universal', 'array'],
    two_arrays      : ['universal', 'array'],
    single_string   : ['universal', 'string'],
    two_strings     : ['universal', 'string'],
    multiple_strings: ['universal', 'string'],
    matrix_grid     : ['universal', 'array', 'graph'],
    graph_edge_list : ['universal', 'graph'],
    graph_adjacency : ['universal', 'graph'],
    implicit_graph  : ['universal', 'graph'],
    tree_explicit   : ['universal', 'tree'],
    intervals       : ['universal', 'interval'],
    single_number   : ['universal', 'numeric'],
    multiple_numbers: ['universal', 'numeric'],
  };

  // ─── RENDER ────────────────────────────────────────────────────────────────

  function render(state) {
    _state        = state;
    const saved   = state.answers?.stage6 ?? {};

    _acknowledged = new Set(saved.cases       ?? []);
    _customCases  = saved.customCases          ?? [];
    _activeTab    = 'critical';

    const activeCases = _getActiveCases(state);

    const wrapper = DomUtils.div({ class: 'stage stage6' }, [
      _buildIntro(activeCases),
      _buildProgressBar(activeCases, saved),
      _buildTabBar(activeCases),
      _buildCasePanel(activeCases, saved),
      _buildCustomSection(saved),
      _buildSummarySection(saved),
    ]);

    return wrapper;
  }

  // ─── INTRO ─────────────────────────────────────────────────────────────────

  function _buildIntro(activeCases) {
    const critical = activeCases.filter(c => c.priority === 'critical').length;
    return DomUtils.div({ class: 'stage-intro' }, [
      DomUtils.div({ class: 'stage-intro__rule' },
        'Test edge cases before coding — not after getting WA.'
      ),
      DomUtils.div({ class: 'stage-intro__sub' },
        `${activeCases.length} edge cases generated for your input type. ${critical} critical.`
      ),
    ]);
  }

  // ─── PROGRESS BAR ─────────────────────────────────────────────────────────

  function _buildProgressBar(activeCases, saved) {
    const total       = activeCases.length;
    const acknowledged = (saved.cases ?? []).length;
    const pct          = total > 0 ? Math.round((acknowledged / total) * 100) : 0;

    const bar = DomUtils.div({ class: 'stage6__progress-bar' }, [
      DomUtils.div({ class: 'stage6__progress-bar__header' }, [
        DomUtils.span({ class: 'stage6__progress-label' },
          `${acknowledged} / ${total} cases reviewed`
        ),
        DomUtils.span({ class: 'stage6__progress-pct' }, `${pct}%`),
      ]),
      DomUtils.div({ class: 'stage6__progress-track' }, [
        DomUtils.div({
          class: 'stage6__progress-fill',
          id   : 'progress-fill',
          style: { width: `${pct}%` },
        }),
      ]),
    ]);

    return bar;
  }

  // ─── TAB BAR ──────────────────────────────────────────────────────────────

  function _buildTabBar(activeCases) {
    const tabs = [
      { id: 'critical', label: 'Critical',     color: 'red'   },
      { id: 'high',     label: 'High',         color: 'yellow'},
      { id: 'medium',   label: 'Medium',       color: 'blue'  },
      { id: 'all',      label: 'All cases',    color: 'gray'  },
    ];

    const tabCounts = {
      critical: activeCases.filter(c => c.priority === 'critical').length,
      high    : activeCases.filter(c => c.priority === 'high').length,
      medium  : activeCases.filter(c => c.priority === 'medium').length,
      all     : activeCases.length,
    };

    const tabBar = DomUtils.div({
      class: 'stage6__tab-bar',
      id   : 'stage6-tab-bar',
    });

    tabs.forEach(tab => {
      if (tabCounts[tab.id] === 0) return;

      const tabEl = DomUtils.div({
        class: `s6-tab s6-tab--${tab.color} ${tab.id === _activeTab ? 's6-tab--active' : ''}`,
        data : { tabId: tab.id },
      }, [
        DomUtils.span({ class: 's6-tab__label' }, tab.label),
        DomUtils.span({ class: 's6-tab__count' }, String(tabCounts[tab.id])),
      ]);

      tabEl.addEventListener('click', () => _switchTab(tab.id, activeCases));
      tabBar.appendChild(tabEl);
    });

    return tabBar;
  }

  // ─── CASE PANEL ───────────────────────────────────────────────────────────

  function _buildCasePanel(activeCases, saved) {
    const panel = DomUtils.div({
      class: 'stage6__case-panel',
      id   : 'stage6-case-panel',
    });

    _renderCases(panel, activeCases, saved, _activeTab);
    return panel;
  }

  function _renderCases(container, activeCases, saved, tabId) {
    DomUtils.clearContent(container);

    const filtered = tabId === 'all'
      ? activeCases
      : activeCases.filter(c => c.priority === tabId);

    if (!filtered.length) {
      container.appendChild(
        DomUtils.div({ class: 's6-empty' },
          `No ${tabId} priority cases for your input type`
        )
      );
      return;
    }

    filtered.forEach(c => {
      container.appendChild(_buildCaseCard(c, saved));
    });
  }

  function _buildCaseCard(edgeCase, saved) {
    const isAcknowledged = _acknowledged.has(edgeCase.id);

    const card = DomUtils.div({
      class: `s6-case-card s6-case-card--${edgeCase.priority} ${isAcknowledged ? 's6-case-card--done' : ''}`,
      id   : `case-card-${edgeCase.id}`,
    });

    // Header
    const header = DomUtils.div({ class: 's6-case-card__header' }, [
      DomUtils.div({ class: 's6-case-card__header-left' }, [
        DomUtils.span({
          class: `s6-priority-dot s6-priority-dot--${edgeCase.priority}`,
        }),
        DomUtils.div({ class: 's6-case-card__label' }, edgeCase.label),
      ]),
      isAcknowledged
        ? DomUtils.span({ class: 's6-case-card__done-badge' }, '✓ Reviewed')
        : null,
    ].filter(Boolean));

    card.appendChild(header);

    // Why it matters
    card.appendChild(
      DomUtils.div({ class: 's6-case-card__why' }, edgeCase.whyItMatters)
    );

    // Check question
    card.appendChild(
      DomUtils.div({ class: 's6-case-card__check' }, [
        DomUtils.span({ class: 's6-check-label' }, 'Check: '),
        DomUtils.span({}, edgeCase.checkQuestion),
      ])
    );

    // Common failure
    card.appendChild(
      DomUtils.div({ class: 's6-case-card__failure' }, [
        DomUtils.span({ class: 's6-failure-label' }, 'Common failure: '),
        DomUtils.span({}, edgeCase.commonFailure),
      ])
    );

    // Fix — collapsible
    if (edgeCase.fix) {
      card.appendChild(
        DomUtils.createCollapsible(
          'Fix',
          DomUtils.div({ class: 's6-fix-content' }, edgeCase.fix),
          false
        )
      );
    }

    // Test input + expected
    const testEl = DomUtils.div({ class: 's6-case-card__test' }, [
      DomUtils.div({ class: 's6-test-row' }, [
        DomUtils.span({ class: 's6-test-label' }, 'Test: '),
        DomUtils.span({ class: 'detail-mono'   }, edgeCase.testInput),
      ]),
      DomUtils.div({ class: 's6-test-row' }, [
        DomUtils.span({ class: 's6-test-label' }, 'Expected: '),
        DomUtils.span({}, edgeCase.expected),
      ]),
    ]);
    card.appendChild(testEl);

    // Examples (if any)
    if (edgeCase.examples?.length) {
      const exList = DomUtils.div({ class: 's6-case-examples' });
      edgeCase.examples.forEach(ex => {
        exList.appendChild(
          DomUtils.div({ class: 's6-case-example' }, [
            DomUtils.span({ class: 'detail-mono' }, ex.input),
            DomUtils.span({ class: 's6-ex-problem' }, ` — ${ex.problem}`),
            DomUtils.span({ class: 's6-ex-expected'}, ` → ${ex.expected}`),
          ])
        );
      });
      card.appendChild(exList);
    }

    // Acknowledge button
    const ackBtn = DomUtils.btn({
      class: `s6-ack-btn ${isAcknowledged ? 's6-ack-btn--done' : ''}`,
      data : { caseId: edgeCase.id },
    }, isAcknowledged ? '✓ Reviewed' : 'Mark as reviewed');

    ackBtn.addEventListener('click', () => _onAcknowledge(edgeCase.id));
    card.appendChild(ackBtn);

    return card;
  }

  // ─── CUSTOM CASES SECTION ─────────────────────────────────────────────────

  function _buildCustomSection(saved) {
    const section = DomUtils.div({
      class: 'stage6__custom-section',
      id   : 'custom-section',
    });

    section.appendChild(
      DomUtils.div({ class: 'stage6__section-title' }, [
        DomUtils.span({}, 'Custom edge cases'),
        DomUtils.span({ class: 'stage6__section-sub' },
          'Add problem-specific cases that generic categories miss'
        ),
      ])
    );

    // Existing custom cases
    const customList = DomUtils.div({
      class: 'stage6__custom-list',
      id   : 'custom-list',
    });

    _customCases.forEach((cc, idx) => {
      customList.appendChild(_buildCustomCaseRow(cc, idx));
    });

    section.appendChild(customList);

    // Add custom case form
    section.appendChild(_buildAddCustomForm());

    return section;
  }

  function _buildCustomCaseRow(cc, idx) {
    const row = DomUtils.div({
      class: 's6-custom-case-row',
      id   : `custom-case-${idx}`,
    }, [
      DomUtils.div({ class: 's6-custom-case-row__text' }, cc.description),
      DomUtils.btn({
        class  : 's6-custom-remove-btn',
        onClick: () => _onRemoveCustomCase(idx),
      }, '×'),
    ]);
    return row;
  }

  function _buildAddCustomForm() {
    const form = DomUtils.div({ class: 's6-add-custom-form' });

    const input = DomUtils.el('textarea', {
      id         : 'custom-case-input',
      class      : 's6-custom-input',
      placeholder: 'Describe a specific edge case for this problem...',
      rows       : '2',
    });

    const addBtn = DomUtils.btn({
      class: 's6-add-custom-btn',
    }, '+ Add edge case');

    addBtn.addEventListener('click', () => {
      const val = input.value.trim();
      if (val) {
        _onAddCustomCase(val);
        input.value = '';
      }
    });

    DomUtils.append(form, [input, addBtn]);
    return form;
  }

  // ─── SUMMARY SECTION ──────────────────────────────────────────────────────

  function _buildSummarySection(saved) {
    const section = DomUtils.div({
      class: 'stage6__summary',
      id   : 'stage6-summary',
    });

    _renderSummary(section, saved);
    return section;
  }

  function _renderSummary(container, saved) {
    DomUtils.clearContent(container);

    const activeCases     = _getActiveCases(_state);
    const total           = activeCases.length;
    const acknowledged    = (saved.cases ?? []).length;
    const criticalTotal   = activeCases.filter(c => c.priority === 'critical').length;
    const criticalDone    = activeCases
      .filter(c => c.priority === 'critical')
      .filter(c => (saved.cases ?? []).includes(c.id))
      .length;
    const customCount     = (saved.customCases ?? []).length;

    if (acknowledged === 0 && customCount === 0) {
      container.appendChild(
        DomUtils.div({ class: 'summary-placeholder' },
          'Review edge cases above to see summary'
        )
      );
      return;
    }

    container.appendChild(
      DomUtils.div({ class: 'stage6__section-title' }, 'Edge case summary')
    );

    container.appendChild(
      DomUtils.div({ class: 'summary-row' }, [
        DomUtils.span({ class: 'summary-row__label' }, 'Reviewed:'),
        DomUtils.span({ class: 'summary-row__value' },
          `${acknowledged} / ${total} cases`
        ),
      ])
    );

    container.appendChild(
      DomUtils.div({ class: 'summary-row' }, [
        DomUtils.span({ class: 'summary-row__label' }, 'Critical:'),
        DomUtils.span({
          class: `summary-row__value ${criticalDone === criticalTotal ? 'verdict-pass' : 'verdict-warn'}`,
        }, `${criticalDone} / ${criticalTotal} critical cases reviewed`),
      ])
    );

    if (customCount > 0) {
      container.appendChild(
        DomUtils.div({ class: 'summary-row' }, [
          DomUtils.span({ class: 'summary-row__label' }, 'Custom:'),
          DomUtils.span({ class: 'summary-row__value' },
            `${customCount} custom case(s) added`
          ),
        ])
      );
    }

    // Warning if critical cases not all reviewed
    if (criticalDone < criticalTotal) {
      container.appendChild(
        DomUtils.div({ class: 'summary-warning' }, [
          DomUtils.span({ class: 'watchout-icon' }, '⚠'),
          DomUtils.span({},
            `${criticalTotal - criticalDone} critical case(s) not yet reviewed — these are the most likely to cause WA`
          ),
        ])
      );
    }
  }

  // ─── ACTIVE CASE GENERATION ───────────────────────────────────────────────

  function _getActiveCases(state) {
    const inputTypes = state?.answers?.stage1?.inputTypes ?? [];
    const activeModuleIds = new Set(['universal']);

    inputTypes.forEach(type => {
      const modules = INPUT_TYPE_TO_MODULES[type] ?? [];
      modules.forEach(m => activeModuleIds.add(m));
    });

    // Also include numeric if output involves numbers
    const outputForm = state?.answers?.stage2?.outputForm;
    if (outputForm === 'single_number' || outputForm === 'count') {
      activeModuleIds.add('numeric');
    }

    const cases = [];
    const seen  = new Set();

    activeModuleIds.forEach(moduleId => {
      const mod = CASE_MODULES[moduleId];
      if (!mod) return;
      mod.getAll().forEach(c => {
        if (!seen.has(c.id)) {
          seen.add(c.id);
          cases.push({ ...c, sourceModule: moduleId });
        }
      });
    });

    // Sort: critical first, then high, then medium
    const priorityOrder = { critical: 0, high: 1, medium: 2 };
    cases.sort((a, b) =>
      (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3)
    );

    return cases;
  }

  // ─── CHANGE HANDLERS ──────────────────────────────────────────────────────

  function _switchTab(tabId, activeCases) {
    _activeTab = tabId;

    document.querySelectorAll('.s6-tab').forEach(tab => {
      tab.classList.toggle('s6-tab--active', tab.dataset.tabId === tabId);
    });

    const panel = document.getElementById('stage6-case-panel');
    if (panel) {
      _renderCases(panel, activeCases, State.getAnswer('stage6') ?? {}, tabId);
    }
  }

  function _onAcknowledge(caseId) {
    const wasAcknowledged = _acknowledged.has(caseId);

    if (wasAcknowledged) {
      _acknowledged.delete(caseId);
    } else {
      _acknowledged.add(caseId);
    }

    // Update card UI
    const card   = document.getElementById(`case-card-${caseId}`);
    const ackBtn = card?.querySelector('.s6-ack-btn');

    if (card) {
      card.classList.toggle('s6-case-card--done', !wasAcknowledged);
    }

    if (ackBtn) {
      ackBtn.classList.toggle('s6-ack-btn--done', !wasAcknowledged);
      ackBtn.textContent = wasAcknowledged ? 'Mark as reviewed' : '✓ Reviewed';
    }

    // Update progress bar
    _refreshProgressBar();

    State.setAnswer('stage6', {
      cases              : [..._acknowledged],
      universalReviewed  : _hasReviewedCategory('universal'),
      typeSpecificReviewed: _hasReviewedCategory('array') ||
                            _hasReviewedCategory('string') ||
                            _hasReviewedCategory('tree') ||
                            _hasReviewedCategory('graph') ||
                            _hasReviewedCategory('interval') ||
                            _hasReviewedCategory('numeric'),
    });

    _refreshSummary();
    _checkComplete();
  }

  function _hasReviewedCategory(moduleId) {
    const mod = CASE_MODULES[moduleId];
    if (!mod) return false;
    return mod.getAll().some(c => _acknowledged.has(c.id));
  }

  function _onAddCustomCase(description) {
    _customCases.push({ description, addedAt: Date.now() });

    const list = document.getElementById('custom-list');
    if (list) {
      list.appendChild(
        _buildCustomCaseRow(
          { description },
          _customCases.length - 1
        )
      );
    }

    State.setAnswer('stage6', { customCases: [..._customCases] });
    _refreshSummary();
    _checkComplete();
  }

  function _onRemoveCustomCase(idx) {
    _customCases.splice(idx, 1);

    const list = document.getElementById('custom-list');
    if (list) {
      DomUtils.clearContent(list);
      _customCases.forEach((cc, i) => {
        list.appendChild(_buildCustomCaseRow(cc, i));
      });
    }

    State.setAnswer('stage6', { customCases: [..._customCases] });
    _refreshSummary();
    _checkComplete();
  }

  // ─── RENDER HELPERS ───────────────────────────────────────────────────────

  function _refreshProgressBar() {
    const activeCases  = _getActiveCases(_state);
    const total        = activeCases.length;
    const acknowledged = _acknowledged.size;
    const pct          = total > 0 ? Math.round((acknowledged / total) * 100) : 0;

    const fill  = document.getElementById('progress-fill');
    const label = document.querySelector('.stage6__progress-label');
    const pctEl = document.querySelector('.stage6__progress-pct');

    if (fill)  fill.style.width   = `${pct}%`;
    if (label) label.textContent  = `${acknowledged} / ${total} cases reviewed`;
    if (pctEl) pctEl.textContent  = `${pct}%`;
  }

  function _refreshSummary() {
    const section = document.getElementById('stage6-summary');
    if (section) {
      _renderSummary(section, State.getAnswer('stage6') ?? {});
    }
  }

  // ─── COMPLETION CHECK ──────────────────────────────────────────────────────

  function _checkComplete() {
    const activeCases   = _getActiveCases(_state);
    const criticalCases = activeCases.filter(c => c.priority === 'critical');

    // Valid when ALL critical cases reviewed OR at least half of all cases
    const allCriticalDone = criticalCases.every(c => _acknowledged.has(c.id));
    const halfAllDone     = _acknowledged.size >= Math.ceil(activeCases.length / 2);

    const valid = allCriticalDone || halfAllDone;
    Renderer.setNextEnabled(valid);

    if (valid) {
      const saved = State.getAnswer('stage6') ?? {};
      document.dispatchEvent(new CustomEvent('dsa:stage-complete', {
        detail: {
          stageId: 'stage6',
          answers: {
            ...saved,
            cases              : [..._acknowledged],
            customCases        : _customCases,
            universalReviewed  : _hasReviewedCategory('universal'),
            typeSpecificReviewed: true,
          },
        },
      }));
    }
  }

  // ─── LIFECYCLE ─────────────────────────────────────────────────────────────

  function onMount(state) {
    const saved         = state.answers?.stage6;
    const activeCases   = _getActiveCases(state);
    const criticalCases = activeCases.filter(c => c.priority === 'critical');
    const savedCases    = saved?.cases ?? [];

    const allCriticalDone = criticalCases.every(c => savedCases.includes(c.id));
    const halfDone        = savedCases.length >= Math.ceil(activeCases.length / 2);

    if (allCriticalDone || halfDone) {
      Renderer.setNextEnabled(true);
    }
  }

  function cleanup() {
    _state        = null;
    _acknowledged = new Set();
    _customCases  = [];
    _activeTab    = 'critical';
  }

  // ─── PUBLIC ────────────────────────────────────────────────────────────────

  return { render, onMount, cleanup };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Stage6;
}
