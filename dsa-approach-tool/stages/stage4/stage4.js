// stages/stage4/stage4.js
// Constraint Interaction stage — identifies how constraints combine,
// flags hidden structures, warns about complexity traps
// Module contract: render(state), onMount(state), cleanup()

const Stage4 = (() => {

  // ─── PRIVATE STATE ─────────────────────────────────────────────────────────

  let _state                   = null;
  let _selectedInteractions    = new Set();
  let _hiddenStructureAnswers  = {};
  let _interactionFlags        = {};

  // ─── RENDER ────────────────────────────────────────────────────────────────

  function render(state) {
    _state = state;
    const saved = state.answers?.stage4 ?? {};

    _selectedInteractions   = new Set(saved.interactions         ?? []);
    _hiddenStructureAnswers = saved.hiddenStructureAnswers        ?? {};
    _interactionFlags       = saved.interactionFlags             ?? {};

    const wrapper = DomUtils.div({ class: 'stage stage4' }, [
      _buildIntro(),
      _buildWarningsSection(),
      _buildInteractionsSection(saved),
      _buildHiddenStructureSection(saved),
      _buildSummarySection(saved),
    ]);

    return wrapper;
  }

  // ─── INTRO ─────────────────────────────────────────────────────────────────

  function _buildIntro() {
    return DomUtils.div({ class: 'stage-intro' }, [
      DomUtils.div({ class: 'stage-intro__rule' },
        'Constraints interact — N×Q, N×K, N×W each suggest different structures.'
      ),
      DomUtils.div({ class: 'stage-intro__sub' },
        'Check how your constraints combine and whether a hidden structure was missed.'
      ),
    ]);
  }

  // ─── AUTO WARNINGS ────────────────────────────────────────────────────────

  function _buildWarningsSection() {
    const section = DomUtils.div({
      class: 'stage4__section',
      id   : 'warnings-section',
    });

    const n = _state?.answers?.stage0?.n ?? 0;
    const q = _state?.answers?.stage0?.q ?? 0;
    const warnings = ConstraintInteractions.getActiveWarnings(n, q, n);

    if (!warnings.length) return section;

    section.appendChild(
      DomUtils.div({ class: 'stage4__section-title' }, [
        DomUtils.span({ class: 'warn-icon' }, '⚡'),
        DomUtils.span({}, 'Auto-detected constraint warnings'),
      ])
    );

    warnings.forEach(w => {
      section.appendChild(
        DomUtils.div({ class: 'constraint-warning' }, [
          DomUtils.span({ class: 'watchout-icon' }, '⚠'),
          DomUtils.span({ class: 'constraint-warning__text' }, w.warning),
        ])
      );
    });

    return section;
  }

  // ─── INTERACTIONS SECTION ─────────────────────────────────────────────────

  function _buildInteractionsSection(saved) {
    const section = DomUtils.div({
      class: 'stage4__section',
      id   : 'interactions-section',
    });

    section.appendChild(
      DomUtils.div({ class: 'stage4__section-title' }, [
        DomUtils.span({}, 'Which constraint combinations apply?'),
        DomUtils.span({ class: 'stage4__section-sub' },
          'Select all that apply — each may suggest a different structure'
        ),
      ])
    );

    // Auto-suggested based on stage0/stage1
    const suggested = ConstraintInteractions.getRelevant(
      _state?.answers?.stage0,
      _state?.answers?.stage1
    );

    if (suggested.length) {
      section.appendChild(
        DomUtils.div({ class: 'stage4__suggested-label' },
          'Suggested based on your constraints:'
        )
      );
    }

    const all = ConstraintInteractions.getAll();

    all.forEach(interaction => {
      const isSuggested = suggested.some(s => s.id === interaction.id);
      const isSelected  = _selectedInteractions.has(interaction.id);
      section.appendChild(
        _buildInteractionBlock(interaction, isSelected, isSuggested, saved)
      );
    });

    return section;
  }

  function _buildInteractionBlock(interaction, isSelected, isSuggested, saved) {
    const block = DomUtils.div({
      class: `s4-interaction-block ${isSelected ? 's4-interaction-block--selected' : ''} ${isSuggested ? 's4-interaction-block--suggested' : ''}`,
      id   : `interaction-block-${interaction.id}`,
    });

    // Header — clickable to select/deselect
    const header = DomUtils.div({ class: 's4-interaction-block__header' }, [
      DomUtils.div({ class: 's4-interaction-block__meta' }, [
        DomUtils.div({ class: 's4-interaction-block__label'   }, interaction.label),
        DomUtils.div({ class: 's4-interaction-block__pattern' }, interaction.pattern),
      ]),
      isSuggested
        ? DomUtils.span({ class: 's4-suggested-badge' }, 'Suggested')
        : null,
    ].filter(Boolean));

    header.addEventListener('click', () => _onInteractionToggle(interaction.id));
    block.appendChild(header);

    // Recognize signals
    const recognizeEl = DomUtils.div({ class: 's4-interaction-block__recognize' });
    interaction.recognize.forEach(r => {
      recognizeEl.appendChild(
        DomUtils.div({ class: 's4-recognize-item' }, [
          DomUtils.span({ class: 'recognize-bullet' }, '·'),
          DomUtils.span({}, r),
        ])
      );
    });
    block.appendChild(recognizeEl);

    // Analysis table — shown when selected
    const analysisEl = DomUtils.div({
      class: `s4-analysis-table ${isSelected ? '' : 'hidden'}`,
      id   : `analysis-${interaction.id}`,
    });

    _renderAnalysisTable(analysisEl, interaction, saved);
    block.appendChild(analysisEl);

    // Watch outs
    if (interaction.watchOut?.length) {
      const woEl = DomUtils.div({
        class: `s4-watchouts ${isSelected ? '' : 'hidden'}`,
        id   : `watchout-${interaction.id}`,
      });
      interaction.watchOut.forEach(w => {
        woEl.appendChild(
          DomUtils.div({ class: 'watchout-row' }, [
            DomUtils.span({ class: 'watchout-icon' }, '⚠'),
            DomUtils.span({ class: 'watchout-text' }, w),
          ])
        );
      });
      block.appendChild(woEl);
    }

    return block;
  }

  function _renderAnalysisTable(container, interaction, saved) {
    DomUtils.clearContent(container);

    const table = DomUtils.div({ class: 's4-analysis-table__rows' });

    interaction.analysis.forEach(row => {
      const rowEl = DomUtils.div({ class: 's4-analysis-row' }, [
        DomUtils.div({ class: 's4-analysis-row__condition' }, row.condition),
        DomUtils.div({ class: 's4-analysis-row__arrow'     }, '→'),
        DomUtils.div({ class: 's4-analysis-row__verdict'   }, row.verdict),
        row.structure
          ? DomUtils.span({ class: 's4-structure-badge' }, row.structure)
          : null,
      ].filter(Boolean));
      table.appendChild(rowEl);
    });

    // Complexity summary
    const complexEl = DomUtils.div({ class: 's4-complexity-row' }, [
      DomUtils.div({ class: 's4-complexity-row__label' }, 'Best:'),
      DomUtils.div({ class: 's4-complexity-row__value detail-mono' }, interaction.complexity.best),
    ]);

    container.appendChild(table);
    container.appendChild(complexEl);

    // Condition flags
    const flagsEl = _buildConditionFlags(interaction, saved);
    if (flagsEl) container.appendChild(flagsEl);
  }

  function _buildConditionFlags(interaction, saved) {
    // Only for N+Q interaction — let user specify their condition
    if (interaction.id !== 'ci_n_and_q') return null;

    const savedFlags = saved.interactionFlags?.[interaction.id] ?? {};

    const flagsWrap = DomUtils.div({ class: 's4-condition-flags' }, [
      DomUtils.div({ class: 's4-condition-flags__title' },
        'Your specific condition:'
      ),
    ]);

    const flags = [
      { id: 'hasUpdates', label: 'Has updates (not just queries)' },
      { id: 'offline',    label: 'Queries can be sorted offline'  },
      { id: 'online',     label: 'Must answer queries online'      },
      { id: 'singleQuery',label: 'Only one query (Q = 1)'         },
    ];

    flags.forEach(flag => {
      const isChecked = savedFlags[flag.id] ?? false;
      const item = DomUtils.div({ class: 'flag-item' }, [
        DomUtils.input({
          type   : 'checkbox',
          id     : `flag-${interaction.id}-${flag.id}`,
          class  : 'flag-checkbox',
          checked: isChecked ? true : undefined,
        }),
        DomUtils.label({
          class: 'flag-item__label',
          for  : `flag-${interaction.id}-${flag.id}`,
        }, flag.label),
      ]);

      const cb = item.querySelector(`#flag-${interaction.id}-${flag.id}`);
      if (cb) {
        cb.addEventListener('change', () => {
          _onFlagChange(interaction.id, flag.id, cb.checked);
        });
      }

      flagsWrap.appendChild(item);
    });

    return flagsWrap;
  }

  // ─── HIDDEN STRUCTURE SECTION ─────────────────────────────────────────────

  function _buildHiddenStructureSection(saved) {
    const section = DomUtils.div({
      class: 'stage4__section',
      id   : 'hidden-structure-section',
    });

    section.appendChild(
      DomUtils.div({ class: 'stage4__section-title' }, [
        DomUtils.span({}, 'Hidden structure check'),
        DomUtils.span({ class: 'stage4__section-sub' },
          'Did you miss a simpler O(n) or O(n log n) structure?'
        ),
      ])
    );

    section.appendChild(
      DomUtils.div({ class: 'stage4__section-note' },
        'Each of these structures replaces an O(n²) approach with O(n) or O(n log n). ' +
        'Check if any applies before proceeding.'
      )
    );

    const list = DomUtils.div({ class: 'hidden-structure-list' });

    ConstraintInteractions.getHiddenStructures().forEach(hs => {
      const answer = saved.hiddenStructureAnswers?.[hs.id];
      list.appendChild(_buildHiddenStructureRow(hs, answer));
    });

    section.appendChild(list);
    return section;
  }

  function _buildHiddenStructureRow(hs, savedAnswer) {
    const isApplicable = savedAnswer === 'yes';

    const row = DomUtils.div({
      class: `hs-row ${isApplicable ? 'hs-row--applicable' : ''} ${savedAnswer ? 'hs-row--answered' : ''}`,
      id   : `hs-row-${hs.id}`,
    });

    const header = DomUtils.div({ class: 'hs-row__header' }, [
      DomUtils.div({ class: 'hs-row__label'     }, hs.label),
      DomUtils.div({ class: 'hs-row__signal'    }, hs.signal),
      DomUtils.div({ class: 'hs-row__complexity'}, [
        DomUtils.span({ class: 'complexity-badge' }, hs.complexity),
      ]),
    ]);

    const answerRow = DomUtils.div({ class: 'hs-row__answers' }, [
      _buildAnswerBtn(hs.id, 'yes', savedAnswer === 'yes', '✓ Applies'),
      _buildAnswerBtn(hs.id, 'no',  savedAnswer === 'no',  '✗ Does not apply'),
    ]);

    // Examples — shown when applicable
    const examplesEl = DomUtils.div({
      class: `hs-row__examples ${isApplicable ? '' : 'hidden'}`,
      id   : `hs-examples-${hs.id}`,
    });

    hs.examples.forEach(ex => {
      examplesEl.appendChild(
        DomUtils.div({ class: 'hs-example' }, [
          DomUtils.span({ class: 'hs-example__bullet' }, '·'),
          DomUtils.span({}, ex),
        ])
      );
    });

    DomUtils.append(row, [header, answerRow, examplesEl]);

    row.querySelectorAll('.answer-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        _onHiddenStructureAnswer(hs.id, btn.dataset.value);
      });
    });

    return row;
  }

  // ─── SUMMARY SECTION ──────────────────────────────────────────────────────

  function _buildSummarySection(saved) {
    const section = DomUtils.div({
      class: 'stage4__section stage4__summary',
      id   : 'stage4-summary',
    });

    _renderSummary(section, saved);
    return section;
  }

  // ─── CHANGE HANDLERS ──────────────────────────────────────────────────────

  function _onInteractionToggle(interactionId) {
    const wasSelected = _selectedInteractions.has(interactionId);

    if (wasSelected) {
      _selectedInteractions.delete(interactionId);
    } else {
      _selectedInteractions.add(interactionId);
    }

    const block      = document.getElementById(`interaction-block-${interactionId}`);
    const analysisEl = document.getElementById(`analysis-${interactionId}`);
    const watchoutEl = document.getElementById(`watchout-${interactionId}`);

    if (block) {
      block.classList.toggle('s4-interaction-block--selected', !wasSelected);
    }

    if (analysisEl) {
      analysisEl.classList.toggle('hidden', wasSelected);
    }

    if (watchoutEl) {
      watchoutEl.classList.toggle('hidden', wasSelected);
    }

    State.setAnswer('stage4', {
      interactions         : [..._selectedInteractions],
      interactionChecked   : true,
    });

    _refreshSummary();
    _checkComplete();
  }

  function _onFlagChange(interactionId, flagId, value) {
    if (!_interactionFlags[interactionId]) {
      _interactionFlags[interactionId] = {};
    }
    _interactionFlags[interactionId][flagId] = value;

    State.setAnswer('stage4', {
      interactionFlags: { ..._interactionFlags },
    });

    // Re-render analysis for this interaction
    const interaction = ConstraintInteractions.getById(interactionId);
    const analysisEl  = document.getElementById(`analysis-${interactionId}`);
    if (interaction && analysisEl) {
      _renderAnalysisTable(
        analysisEl,
        interaction,
        State.getAnswer('stage4') ?? {}
      );
    }

    // Show verdict based on flags
    _showFlagVerdict(interactionId);
    _checkComplete();
  }

  function _showFlagVerdict(interactionId) {
    const interaction = ConstraintInteractions.getById(interactionId);
    if (!interaction) return;

    const saved   = State.getAnswer('stage4') ?? {};
    const flags   = saved.interactionFlags?.[interactionId] ?? {};
    const verdict = ConstraintInteractions.getVerdict(interactionId, flags);
    if (!verdict) return;

    const existingVerdict = document.getElementById(`verdict-${interactionId}`);
    if (existingVerdict) existingVerdict.remove();

    const verdictEl = DomUtils.div({
      class: 's4-flag-verdict',
      id   : `verdict-${interactionId}`,
    }, [
      DomUtils.div({ class: 's4-flag-verdict__condition' }, verdict.condition),
      DomUtils.div({ class: 's4-flag-verdict__verdict'   }, verdict.verdict),
      verdict.structure
        ? DomUtils.span({ class: 's4-structure-badge s4-structure-badge--highlight' },
            verdict.structure
          )
        : null,
    ].filter(Boolean));

    const analysisEl = document.getElementById(`analysis-${interactionId}`);
    if (analysisEl) {
      analysisEl.appendChild(verdictEl);
    }
  }

  function _onHiddenStructureAnswer(hsId, value) {
    _hiddenStructureAnswers[hsId] = value;

    const row        = document.getElementById(`hs-row-${hsId}`);
    const examplesEl = document.getElementById(`hs-examples-${hsId}`);

    if (row) {
      row.classList.toggle('hs-row--applicable', value === 'yes');
      row.classList.add('hs-row--answered');
      row.querySelectorAll('.answer-btn').forEach(btn => {
        btn.classList.toggle(
          'answer-btn--selected',
          btn.dataset.value === value
        );
      });
    }

    if (examplesEl) {
      examplesEl.classList.toggle('hidden', value !== 'yes');
    }

    State.setAnswer('stage4', {
      hiddenStructureAnswers: { ..._hiddenStructureAnswers },
      hiddenStructureChecked: true,
    });

    _refreshSummary();
    _checkComplete();
  }

  // ─── RENDER HELPERS ────────────────────────────────────────────────────────

  function _buildAnswerBtn(groupId, value, isSelected, label) {
    const btn = DomUtils.btn({
      class: `answer-btn answer-btn--${value} ${isSelected ? 'answer-btn--selected' : ''}`,
      data : { value },
    }, label);
    return btn;
  }

  function _renderSummary(container, saved) {
    DomUtils.clearContent(container);

    const interactions = saved.interactions ?? [];
    const hsAnswered   = Object.keys(saved.hiddenStructureAnswers ?? {}).length;
    const hsApplicable = Object.entries(saved.hiddenStructureAnswers ?? {})
      .filter(([, v]) => v === 'yes')
      .map(([id]) => ConstraintInteractions.getHiddenStructures().find(h => h.id === id))
      .filter(Boolean);
    const totalHS      = ConstraintInteractions.getHiddenStructures().length;

    if (interactions.length === 0 && hsAnswered === 0) {
      container.appendChild(
        DomUtils.div({ class: 'summary-placeholder' },
          'Select constraint interactions above to see summary'
        )
      );
      return;
    }

    container.appendChild(
      DomUtils.div({ class: 'stage4__section-title' }, 'Constraint analysis summary')
    );

    // Selected interactions
    if (interactions.length) {
      const interactionList = interactions
        .map(id => ConstraintInteractions.getById(id))
        .filter(Boolean)
        .map(i => i.label)
        .join(', ');

      container.appendChild(
        DomUtils.div({ class: 'summary-row' }, [
          DomUtils.span({ class: 'summary-row__label' }, 'Patterns:'),
          DomUtils.span({ class: 'summary-row__value' }, interactionList),
        ])
      );
    }

    // Hidden structure check
    container.appendChild(
      DomUtils.div({ class: 'summary-row' }, [
        DomUtils.span({ class: 'summary-row__label' }, 'Hidden:'),
        DomUtils.span({ class: 'summary-row__value' },
          `${hsAnswered} / ${totalHS} checked`
        ),
      ])
    );

    // Applicable hidden structures
    if (hsApplicable.length) {
      const hsEl = DomUtils.div({ class: 'summary-found' }, [
        DomUtils.div({ class: 'summary-found__title' }, 'Applicable hidden structures:'),
        DomUtils.div(
          { class: 'summary-found__list' },
          hsApplicable.map(hs =>
            DomUtils.span({ class: 'found-badge' }, hs.label)
          )
        ),
      ]);
      container.appendChild(hsEl);
    }

    // Auto warnings
    const n        = _state?.answers?.stage0?.n ?? 0;
    const q        = _state?.answers?.stage0?.q ?? 0;
    const warnings = ConstraintInteractions.getActiveWarnings(n, q, n);
    if (warnings.length) {
      const warnEl = DomUtils.div({ class: 'summary-warnings' });
      warnings.forEach(w => {
        warnEl.appendChild(
          DomUtils.div({ class: 'watchout-row' }, [
            DomUtils.span({ class: 'watchout-icon' }, '⚠'),
            DomUtils.span({ class: 'watchout-text' }, w.warning),
          ])
        );
      });
      container.appendChild(warnEl);
    }
  }

  function _refreshSummary() {
    const section = document.getElementById('stage4-summary');
    if (section) {
      _renderSummary(section, State.getAnswer('stage4') ?? {});
    }
  }

  // ─── COMPLETION CHECK ──────────────────────────────────────────────────────

  function _checkComplete() {
    const saved    = State.getAnswer('stage4') ?? {};
    const hsAnswered = Object.keys(saved.hiddenStructureAnswers ?? {}).length;
    const totalHS    = ConstraintInteractions.getHiddenStructures().length;

    // Valid when: at least one interaction selected OR hidden structure check
    // attempted (at least half answered)
    const interactionDone  = (saved.interactions ?? []).length > 0;
    const hiddenCheckDone  = hsAnswered >= Math.ceil(totalHS / 2);

    const valid = interactionDone || hiddenCheckDone;
    Renderer.setNextEnabled(valid);

    if (valid) {
      document.dispatchEvent(new CustomEvent('dsa:stage-complete', {
        detail: {
          stageId: 'stage4',
          answers: {
            ...saved,
            interactionChecked    : true,
            hiddenStructureChecked: hiddenCheckDone,
          },
        },
      }));
    }
  }

  // ─── LIFECYCLE ─────────────────────────────────────────────────────────────

  function onMount(state) {
    const saved      = state.answers?.stage4;
    const hsAnswered = Object.keys(saved?.hiddenStructureAnswers ?? {}).length;
    const totalHS    = ConstraintInteractions.getHiddenStructures().length;

    if (
      (saved?.interactions ?? []).length > 0 ||
      hsAnswered >= Math.ceil(totalHS / 2)
    ) {
      Renderer.setNextEnabled(true);
    }
  }

  function cleanup() {
    _state                  = null;
    _selectedInteractions   = new Set();
    _hiddenStructureAnswers = {};
    _interactionFlags       = {};
  }

  // ─── PUBLIC ────────────────────────────────────────────────────────────────

  return { render, onMount, cleanup };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Stage4;
}
