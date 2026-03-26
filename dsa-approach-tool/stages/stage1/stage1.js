// stages/stage1/stage1.js
// Input Anatomy stage — user identifies input shape, secondary signals, query type
// Module contract: render(state), onMount(state), cleanup()

const Stage1 = (() => {

  // ─── PRIVATE STATE ─────────────────────────────────────────────────────────

  let _state            = null;
  let _multiSelect      = null;
  let _signalSelect     = null;
  let _querySelect      = null;
  let _selectedInputs   = [];
  let _selectedSignals  = [];
  let _selectedQuery    = null;

  // ─── RENDER ────────────────────────────────────────────────────────────────

  function render(state) {
    _state = state;
    const saved = state.answers?.stage1 ?? {};

    // Restore saved selections
    _selectedInputs  = saved.inputTypes       ?? [];
    _selectedSignals = saved.secondarySignals ?? [];
    _selectedQuery   = saved.queryType        ?? null;

    const wrapper = DomUtils.div({ class: 'stage stage1' }, [
      _buildIntro(),
      _buildPrimarySection(saved),
      _buildSecondarySection(saved),
      _buildQuerySection(saved),
      _buildHybridSection(saved),
      _buildSummarySection(saved),
    ]);

    return wrapper;
  }

  // ─── INTRO ─────────────────────────────────────────────────────────────────

  function _buildIntro() {
    return DomUtils.div({ class: 'stage-intro' }, [
      DomUtils.div({ class: 'stage-intro__rule' },
        'Understand what you are given before thinking about what to do with it.'
      ),
      DomUtils.div({ class: 'stage-intro__sub' },
        'Select every input type that applies. Secondary signals narrow further.'
      ),
    ]);
  }

  // ─── PRIMARY INPUT TYPE SECTION ────────────────────────────────────────────

  function _buildPrimarySection(saved) {
    const section = DomUtils.div({ class: 'stage1__section' });

    const title = DomUtils.div({ class: 'stage1__section-title' }, [
      DomUtils.span({}, 'What is the primary input shape?'),
      DomUtils.span({ class: 'stage1__section-sub' },
        'Select all that apply'
      ),
    ]);

    _multiSelect = DomUtils.createMultiSelect({
      id       : 'input-type-select',
      options  : InputTypes.getAll().map(t => ({
        id      : t.id,
        label   : t.label,
        sublabel: t.sublabel,
        icon    : t.icon,
      })),
      maxSelect: null,
      minSelect: 1,
      onChange : (ids) => _onInputTypesChange(ids),
    });

    if (saved.inputTypes?.length) {
      _multiSelect.setSelected(saved.inputTypes);
    }

    const examplesRegion = DomUtils.div({
      class: 'stage1__examples',
      id   : 'input-examples-region',
    });

    if (saved.inputTypes?.length) {
      _renderExamples(examplesRegion, saved.inputTypes);
    }

    DomUtils.append(section, [
      title,
      _multiSelect.el,
      examplesRegion,
    ]);

    return section;
  }

  // ─── SECONDARY SIGNALS SECTION ─────────────────────────────────────────────

  function _buildSecondarySection(saved) {
    const section = DomUtils.div({
      class: 'stage1__section',
      id   : 'secondary-section',
    });

    const title = DomUtils.div({ class: 'stage1__section-title' }, [
      DomUtils.span({}, 'Secondary signals'),
      DomUtils.span({ class: 'stage1__section-sub' },
        'Additional properties of the input — check all that apply'
      ),
    ]);

    _signalSelect = DomUtils.createMultiSelect({
      id       : 'signal-select',
      options  : InputTypes.getSecondarySignals().map(s => ({
        id      : s.id,
        label   : s.label,
        sublabel: s.category,
      })),
      maxSelect: null,
      minSelect: 0,
      onChange : (ids) => _onSignalsChange(ids),
    });

    if (saved.secondarySignals?.length) {
      _signalSelect.setSelected(saved.secondarySignals);
    }

    const implRegion = DomUtils.div({
      class: 'stage1__implications',
      id   : 'signal-implications-region',
    });

    if (saved.secondarySignals?.length) {
      _renderSignalImplications(implRegion, saved.secondarySignals);
    }

    DomUtils.append(section, [title, _signalSelect.el, implRegion]);
    return section;
  }

  // ─── QUERY TYPE SECTION ────────────────────────────────────────────────────

  function _buildQuerySection(saved) {
    const section = DomUtils.div({ class: 'stage1__section' });

    const title = DomUtils.div({ class: 'stage1__section-title' }, [
      DomUtils.span({}, 'Are there queries on top of the input?'),
      DomUtils.span({ class: 'stage1__section-sub' },
        'This determines which data structures are available'
      ),
    ]);

    _querySelect = DomUtils.createSingleSelect({
      id      : 'query-type-select',
      options : InputTypes.getQueryTypes().map(q => ({
        id      : q.id,
        label   : q.label,
        sublabel: q.sublabel,
      })),
      onChange: (id) => _onQueryTypeChange(id),
    });

    if (saved.queryType) {
      _querySelect.setSelected
        ? _querySelect.setSelected(saved.queryType)
        : null;
    }

    const queryImpRegion = DomUtils.div({
      class: 'stage1__query-implication',
      id   : 'query-implication-region',
    });

    if (saved.queryType) {
      _renderQueryImplication(queryImpRegion, saved.queryType);
    }

    DomUtils.append(section, [title, _querySelect.el, queryImpRegion]);
    return section;
  }

  // ─── HYBRID SECTION ────────────────────────────────────────────────────────

  function _buildHybridSection(saved) {
    return DomUtils.div({
      class: 'stage1__section stage1__hybrid-section',
      id   : 'hybrid-section',
    });
  }

  // ─── SUMMARY SECTION ───────────────────────────────────────────────────────

  function _buildSummarySection(saved) {
    const section = DomUtils.div({
      class: 'stage1__section stage1__summary',
      id   : 'stage1-summary',
    });

    if (
      saved.inputTypes?.length &&
      saved.queryType
    ) {
      _renderSummary(
        section,
        saved.inputTypes,
        saved.secondarySignals ?? [],
        saved.queryType
      );
    } else {
      section.appendChild(
        DomUtils.div({ class: 'summary-placeholder' },
          'Complete selections above to see input summary'
        )
      );
    }

    return section;
  }

  // ─── CHANGE HANDLERS ───────────────────────────────────────────────────────

  function _onInputTypesChange(ids) {
    _selectedInputs = ids;

    // Update examples region
    const examplesRegion = document.getElementById('input-examples-region');
    if (examplesRegion) _renderExamples(examplesRegion, ids);

    // Update hybrid section
    _refreshHybridSection();

    // Save partial answer
    State.setAnswer('stage1', { inputTypes: ids });

    // Check completion
    _checkComplete();
  }

  function _onSignalsChange(ids) {
    _selectedSignals = ids;

    // Update implications
    const implRegion = document.getElementById('signal-implications-region');
    if (implRegion) _renderSignalImplications(implRegion, ids);

    // Refresh implicit hints
    _refreshHybridSection();

    State.setAnswer('stage1', { secondarySignals: ids });
    _checkComplete();
  }

  function _onQueryTypeChange(id) {
    _selectedQuery = id;

    // Update implication
    const queryImpRegion = document.getElementById('query-implication-region');
    if (queryImpRegion) _renderQueryImplication(queryImpRegion, id);

    // Refresh summary
    _refreshSummary();

    State.setAnswer('stage1', { queryType: id });
    _checkComplete();
  }

  // ─── RENDER HELPERS ────────────────────────────────────────────────────────

  function _renderExamples(container, inputIds) {
    DomUtils.clearContent(container);
    if (!inputIds.length) return;

    const examples = inputIds
      .map(id => InputTypes.getById(id))
      .filter(Boolean);

    if (!examples.length) return;

    const grid = DomUtils.div({ class: 'examples-grid' });

    examples.forEach(t => {
      const card = DomUtils.div({ class: 'example-card' }, [
        DomUtils.div({ class: 'example-card__header' }, [
          DomUtils.span({ class: 'example-card__icon' }, t.icon),
          DomUtils.span({ class: 'example-card__label' }, t.label),
        ]),
        DomUtils.div(
          { class: 'example-card__examples' },
          t.examples.map(ex =>
            DomUtils.div({ class: 'example-card__ex' }, ex)
          )
        ),
        t.watchOut
          ? DomUtils.div({ class: 'example-card__watchout' }, [
              DomUtils.span({ class: 'watchout-icon' }, '⚠'),
              DomUtils.span({}, t.watchOut),
            ])
          : null,
      ].filter(Boolean));

      grid.appendChild(card);
    });

    container.appendChild(
      DomUtils.div({ class: 'stage1__subsection-title' }, 'Examples')
    );
    container.appendChild(grid);
  }

  function _renderSignalImplications(container, signalIds) {
    DomUtils.clearContent(container);
    if (!signalIds.length) return;

    const signals = signalIds
      .map(id => InputTypes.getSignalById(id))
      .filter(Boolean);

    if (!signals.length) return;

    const list = DomUtils.div({ class: 'signal-impl-list' });

    signals.forEach(s => {
      const item = DomUtils.div({ class: 'signal-impl-item' }, [
        DomUtils.div({ class: 'signal-impl-item__label' }, s.label),
        DomUtils.div({ class: 'signal-impl-item__arrow' }, '→'),
        DomUtils.div({ class: 'signal-impl-item__impl' }, s.implication),
      ]);

      if (s.watchOut) {
        item.appendChild(
          DomUtils.div({ class: 'signal-impl-item__warn' }, [
            DomUtils.span({ class: 'watchout-icon' }, '⚠'),
            DomUtils.span({}, s.watchOut),
          ])
        );
      }

      list.appendChild(item);
    });

    container.appendChild(list);
  }

  function _renderQueryImplication(container, queryId) {
    DomUtils.clearContent(container);
    const qt = InputTypes.getQueryTypeById(queryId);
    if (!qt) return;

    const card = DomUtils.div({
      class: `query-impl-card query-impl-card--${queryId}`,
    }, [
      DomUtils.div({ class: 'query-impl-card__impl' }, qt.implication),
    ]);

    // Show eliminations
    if (qt.eliminates?.length) {
      const elimRow = DomUtils.div({ class: 'query-impl-card__elim' }, [
        DomUtils.span({ class: 'elim-label' }, 'Eliminates:'),
        ...qt.eliminates.map(e =>
          DomUtils.span({ class: 'elim-badge' }, e)
        ),
      ]);
      card.appendChild(elimRow);
    }

    // Show opens
    if (qt.opens?.length) {
      const opensRow = DomUtils.div({ class: 'query-impl-card__opens' }, [
        DomUtils.span({ class: 'opens-label' }, 'Opens:'),
        ...qt.opens.map(o =>
          DomUtils.span({ class: 'opens-badge' }, o)
        ),
      ]);
      card.appendChild(opensRow);
    }

    container.appendChild(card);
  }

  function _refreshHybridSection() {
    const section = document.getElementById('hybrid-section');
    if (!section) return;
    DomUtils.clearContent(section);

    const n = _state?.answers?.stage0?.n ?? 0;

    // Hybrid combinations
    const hybrids = InputTypes.getActiveHybrids(
      _selectedInputs, _selectedQuery
    );

    // Implicit structure hints
    const hints = InputTypes.getImplicitHints(
      _selectedInputs, _selectedSignals, n
    );

    if (!hybrids.length && !hints.length) return;

    section.appendChild(
      DomUtils.div({ class: 'stage1__section-title' }, 'Combination signals')
    );

    hybrids.forEach(h => {
      section.appendChild(
        DomUtils.div({ class: 'hybrid-card' }, [
          DomUtils.div({ class: 'hybrid-card__label' }, h.label),
          DomUtils.div({ class: 'hybrid-card__impl'  }, h.implication),
          DomUtils.div({ class: 'hybrid-card__tmpl'  }, [
            DomUtils.span({ class: 'tmpl-label' }, 'Template hint:'),
            DomUtils.span({ class: 'tmpl-text'  }, h.template),
          ]),
        ])
      );
    });

    hints.forEach(h => {
      section.appendChild(
        DomUtils.div({ class: 'implicit-hint-card' }, [
          DomUtils.span({ class: 'implicit-hint-card__icon' }, '🔍'),
          DomUtils.span({ class: 'implicit-hint-card__text' }, h.hint),
        ])
      );
    });
  }

  function _refreshSummary() {
    const section = document.getElementById('stage1-summary');
    if (!section) return;
    DomUtils.clearContent(section);

    if (_selectedInputs.length && _selectedQuery) {
      _renderSummary(
        section,
        _selectedInputs,
        _selectedSignals,
        _selectedQuery
      );
    } else {
      section.appendChild(
        DomUtils.div({ class: 'summary-placeholder' },
          'Complete selections above to see input summary'
        )
      );
    }
  }

  function _renderSummary(container, inputIds, signalIds, queryId) {
    DomUtils.clearContent(container);

    const inputs  = inputIds.map(id => InputTypes.getById(id)).filter(Boolean);
    const qt      = InputTypes.getQueryTypeById(queryId);
    const opened  = InputTypes.getOpenedTemplates(inputIds);
    const watchOuts = InputTypes.getWatchOuts(inputIds);

    // Title
    container.appendChild(
      DomUtils.div({ class: 'stage1__section-title' }, 'Input summary')
    );

    // Input row
    container.appendChild(
      DomUtils.div({ class: 'summary-row' }, [
        DomUtils.span({ class: 'summary-row__label' }, 'Input:'),
        DomUtils.span({ class: 'summary-row__value' },
          inputs.map(t => t.label).join(' + ')
        ),
      ])
    );

    // Query row
    if (qt) {
      container.appendChild(
        DomUtils.div({ class: 'summary-row' }, [
          DomUtils.span({ class: 'summary-row__label' }, 'Queries:'),
          DomUtils.span({ class: 'summary-row__value' }, qt.label),
        ])
      );
    }

    // Signals row
    if (signalIds.length) {
      const signals = signalIds
        .map(id => InputTypes.getSignalById(id))
        .filter(Boolean);
      container.appendChild(
        DomUtils.div({ class: 'summary-row' }, [
          DomUtils.span({ class: 'summary-row__label' }, 'Signals:'),
          DomUtils.span({ class: 'summary-row__value' },
            signals.map(s => s.label).join(', ')
          ),
        ])
      );
    }

    // Opened templates
    if (opened.length) {
      const openedEl = DomUtils.div({ class: 'summary-opened' }, [
        DomUtils.div({ class: 'summary-opened__title' }, 'Candidate families:'),
        DomUtils.div(
          { class: 'summary-opened__list' },
          opened.map(o =>
            DomUtils.span({ class: 'opened-badge' }, o)
          )
        ),
      ]);
      container.appendChild(openedEl);
    }

    // Watch-outs
    if (watchOuts.length) {
      const woEl = DomUtils.div({ class: 'summary-watchouts' });
      watchOuts.forEach(w => {
        woEl.appendChild(
          DomUtils.div({ class: 'watchout-row' }, [
            DomUtils.span({ class: 'watchout-icon' }, '⚠'),
            DomUtils.span({ class: 'watchout-text' }, w.watchOut),
          ])
        );
      });
      container.appendChild(woEl);
    }
  }

  // ─── COMPLETION CHECK ──────────────────────────────────────────────────────

  function _checkComplete() {
    const valid =
      _selectedInputs.length >= 1 &&
      _selectedQuery !== null;

    Renderer.setNextEnabled(valid);

    if (valid) {
      _refreshSummary();

      const saved = State.getAnswer('stage1');
      document.dispatchEvent(new CustomEvent('dsa:stage-complete', {
        detail: {
          stageId: 'stage1',
          answers: {
            inputTypes      : _selectedInputs,
            secondarySignals: _selectedSignals,
            queryType       : _selectedQuery,
            ...saved,
          },
        },
      }));
    }
  }

  // ─── LIFECYCLE ─────────────────────────────────────────────────────────────

  function onMount(state) {
    // If returning with saved answers — enable next immediately
    const saved = state.answers?.stage1;
    if (saved?.inputTypes?.length && saved?.queryType) {
      Renderer.setNextEnabled(true);
    }
  }

  function cleanup() {
    _state           = null;
    _multiSelect     = null;
    _signalSelect    = null;
    _querySelect     = null;
    _selectedInputs  = [];
    _selectedSignals = [];
    _selectedQuery   = null;
  }

  // ─── PUBLIC ────────────────────────────────────────────────────────────────

  return { render, onMount, cleanup };

})();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Stage1;
}
