// stages/stage2/stage2.js
// Output Anatomy stage — user identifies output form, optimization type,
// solution depth. Derives candidate families from output side.
// Module contract: render(state), onMount(state), cleanup()

const Stage2 = (() => {

  // ─── PRIVATE STATE ─────────────────────────────────────────────────────────

  let _state          = null;
  let _selectedForm   = null;
  let _selectedOpt    = null;
  let _selectedDepth  = null;

  // ─── RENDER ────────────────────────────────────────────────────────────────

  function render(state) {
    _state = state;
    const saved = state.answers?.stage2 ?? {};

    _selectedForm  = saved.outputForm         ?? null;
    _selectedOpt   = saved.optimizationType   ?? null;
    _selectedDepth = saved.solutionDepth      ?? null;

    const wrapper = DomUtils.div({ class: 'stage stage2' }, [
      _buildIntro(),
      _buildFormSection(saved),
      _buildOptSection(saved),
      _buildDepthSection(saved),
      _buildRulesSection(saved),
      _buildSummarySection(saved),
    ]);

    return wrapper;
  }

  // ─── INTRO ─────────────────────────────────────────────────────────────────

  function _buildIntro() {
    return DomUtils.div({ class: 'stage-intro' }, [
      DomUtils.div({ class: 'stage-intro__rule' },
        'What you must produce constrains the approach as much as what you are given.'
      ),
      DomUtils.div({ class: 'stage-intro__sub' },
        'Output form, optimization type, and solution depth each eliminate different families.'
      ),
    ]);
  }

  // ─── OUTPUT FORM SECTION ───────────────────────────────────────────────────

  function _buildFormSection(saved) {
    const section = DomUtils.div({ class: 'stage2__section' });

    const title = DomUtils.div({ class: 'stage2__section-title' }, [
      DomUtils.span({}, 'What form is the answer?'),
      DomUtils.span({ class: 'stage2__section-sub' }, 'Pick one'),
    ]);

    const grid = DomUtils.div({ class: 'stage2__form-grid', id: 'form-grid' });

    OutputTypes.getAllForms().forEach(form => {
      const card = DomUtils.div({
        class: `output-form-card ${saved.outputForm === form.id ? 'output-form-card--selected' : ''}`,
        data : { id: form.id },
      }, [
        DomUtils.div({ class: 'output-form-card__header' }, [
          DomUtils.span({ class: 'output-form-card__icon'  }, form.icon),
          DomUtils.span({ class: 'output-form-card__label' }, form.label),
        ]),
        DomUtils.div({ class: 'output-form-card__sub' }, form.sublabel),
        form.watchOut
          ? DomUtils.div({ class: 'output-form-card__warn' }, [
              DomUtils.span({ class: 'watchout-icon' }, '⚠'),
              DomUtils.span({}, form.watchOut),
            ])
          : null,
      ].filter(Boolean));

      card.addEventListener('click', () => _onFormSelect(form.id));
      grid.appendChild(card);
    });

    // Implications region
    const implRegion = DomUtils.div({
      class: 'stage2__impl-region',
      id   : 'form-impl-region',
    });

    if (saved.outputForm) {
      _renderFormImplications(implRegion, saved.outputForm);
    }

    DomUtils.append(section, [title, grid, implRegion]);
    return section;
  }

  // ─── OPTIMIZATION TYPE SECTION ─────────────────────────────────────────────

  function _buildOptSection(saved) {
    const section = DomUtils.div({
      class: 'stage2__section',
      id   : 'opt-section',
    });

    const title = DomUtils.div({ class: 'stage2__section-title' }, [
      DomUtils.span({}, 'What kind of optimization?'),
      DomUtils.span({ class: 'stage2__section-sub' }, 'Pick one'),
    ]);

    const optGrid = DomUtils.div({ class: 'stage2__opt-grid', id: 'opt-grid' });

    OutputTypes.getAllOptTypes().forEach(opt => {
      const card = DomUtils.div({
        class: `opt-card ${saved.optimizationType === opt.id ? 'opt-card--selected' : ''}`,
        data : { id: opt.id },
      }, [
        DomUtils.div({ class: 'opt-card__label'   }, opt.label),
        DomUtils.div({ class: 'opt-card__sublabel'}, opt.sublabel),
      ]);

      card.addEventListener('click', () => _onOptSelect(opt.id));
      optGrid.appendChild(card);
    });

    // Opt implication region
    const optImplRegion = DomUtils.div({
      class: 'stage2__opt-impl',
      id   : 'opt-impl-region',
    });

    if (saved.optimizationType) {
      _renderOptImplication(optImplRegion, saved.optimizationType);
    }

    DomUtils.append(section, [title, optGrid, optImplRegion]);
    return section;
  }

  // ─── SOLUTION DEPTH SECTION ────────────────────────────────────────────────

  function _buildDepthSection(saved) {
    const section = DomUtils.div({
      class: 'stage2__section',
      id   : 'depth-section',
    });

    const title = DomUtils.div({ class: 'stage2__section-title' }, [
      DomUtils.span({}, 'How much of the solution must you output?'),
      DomUtils.span({ class: 'stage2__section-sub' }, 'Pick one'),
    ]);

    const depthGrid = DomUtils.div({ class: 'stage2__depth-grid', id: 'depth-grid' });

    OutputTypes.getAllDepths().forEach(depth => {
      const card = DomUtils.div({
        class: `depth-card ${saved.solutionDepth === depth.id ? 'depth-card--selected' : ''}`,
        data : { id: depth.id },
      }, [
        DomUtils.div({ class: 'depth-card__label'   }, depth.label),
        DomUtils.div({ class: 'depth-card__sublabel'}, depth.sublabel),
        DomUtils.div({ class: 'depth-card__example' }, depth.example),
        depth.watchOut
          ? DomUtils.div({ class: 'depth-card__warn' }, [
              DomUtils.span({ class: 'watchout-icon' }, '⚠'),
              DomUtils.span({}, depth.watchOut),
            ])
          : null,
      ].filter(Boolean));

      card.addEventListener('click', () => _onDepthSelect(depth.id));
      depthGrid.appendChild(card);
    });

    DomUtils.append(section, [title, depthGrid]);
    return section;
  }

  // ─── INTERACTION RULES SECTION ─────────────────────────────────────────────

  function _buildRulesSection(saved) {
    return DomUtils.div({
      class: 'stage2__section stage2__rules-section',
      id   : 'rules-section',
    });
  }

  // ─── SUMMARY SECTION ───────────────────────────────────────────────────────

  function _buildSummarySection(saved) {
    const section = DomUtils.div({
      class: 'stage2__section stage2__summary',
      id   : 'stage2-summary',
    });

    if (saved.outputForm && saved.optimizationType && saved.solutionDepth) {
      _renderSummary(
        section,
        saved.outputForm,
        saved.optimizationType,
        saved.solutionDepth
      );
    } else {
      section.appendChild(
        DomUtils.div({ class: 'summary-placeholder' },
          'Complete all three selections above to see output summary'
        )
      );
    }

    return section;
  }

  // ─── SELECTION HANDLERS ────────────────────────────────────────────────────

  function _onFormSelect(formId) {
    _selectedForm = formId;

    // Update card states
    document.querySelectorAll('.output-form-card').forEach(card => {
      const isSelected = card.dataset.id === formId;
      card.classList.toggle('output-form-card--selected', isSelected);
    });

    // Update implications
    const implRegion = document.getElementById('form-impl-region');
    if (implRegion) _renderFormImplications(implRegion, formId);

    State.setAnswer('stage2', { outputForm: formId });
    _refreshRules();
    _checkComplete();
  }

  function _onOptSelect(optId) {
    _selectedOpt = optId;

    document.querySelectorAll('.opt-card').forEach(card => {
      card.classList.toggle('opt-card--selected', card.dataset.id === optId);
    });

    const optImplRegion = document.getElementById('opt-impl-region');
    if (optImplRegion) _renderOptImplication(optImplRegion, optId);

    State.setAnswer('stage2', { optimizationType: optId });
    _refreshRules();
    _checkComplete();
  }

  function _onDepthSelect(depthId) {
    _selectedDepth = depthId;

    document.querySelectorAll('.depth-card').forEach(card => {
      card.classList.toggle('depth-card--selected', card.dataset.id === depthId);
    });

    State.setAnswer('stage2', { solutionDepth: depthId });
    _refreshRules();
    _checkComplete();
  }

  // ─── RENDER HELPERS ────────────────────────────────────────────────────────

  function _renderFormImplications(container, formId) {
    DomUtils.clearContent(container);
    const form = OutputTypes.getFormById(formId);
    if (!form) return;

    const list = DomUtils.div({ class: 'impl-list' });

    form.implications.forEach(impl => {
      list.appendChild(
        DomUtils.div({ class: 'impl-item' }, [
          DomUtils.span({ class: 'impl-item__arrow' }, '→'),
          DomUtils.span({ class: 'impl-item__text'  }, impl),
        ])
      );
    });

    container.appendChild(list);
  }

  function _renderOptImplication(container, optId) {
    DomUtils.clearContent(container);
    const opt = OutputTypes.getOptTypeById(optId);
    if (!opt) return;

    const card = DomUtils.div({
      class: `opt-impl-card opt-impl-card--${optId}`,
    }, [
      DomUtils.div({ class: 'opt-impl-card__impl' }, opt.implication),
    ]);

    // Key insight
    if (opt.keyInsight) {
      card.appendChild(
        DomUtils.div({ class: 'opt-impl-card__insight' }, [
          DomUtils.span({ class: 'insight-icon' }, '💡'),
          DomUtils.span({}, opt.keyInsight),
        ])
      );
    }

    // Check question
    if (opt.checkQuestion) {
      card.appendChild(
        DomUtils.div({ class: 'opt-impl-card__check' }, [
          DomUtils.span({ class: 'check-label' }, 'Check:'),
          DomUtils.span({}, opt.checkQuestion),
        ])
      );
    }

    // Eliminates
    if (opt.eliminates?.length) {
      const elimRow = DomUtils.div({ class: 'opt-impl-card__elim' }, [
        DomUtils.span({ class: 'elim-label' }, 'Eliminates:'),
        ...opt.eliminates.map(e =>
          DomUtils.span({ class: 'elim-badge' }, e)
        ),
      ]);
      card.appendChild(elimRow);
    }

    // Opens
    if (opt.opens?.length) {
      const opensRow = DomUtils.div({ class: 'opt-impl-card__opens' }, [
        DomUtils.span({ class: 'opens-label' }, 'Opens:'),
        ...opt.opens.map(o =>
          DomUtils.span({ class: 'opens-badge' }, o)
        ),
      ]);
      card.appendChild(opensRow);
    }

    container.appendChild(card);
  }

  function _refreshRules() {
    const section = document.getElementById('rules-section');
    if (!section) return;
    DomUtils.clearContent(section);

    if (!_selectedForm && !_selectedOpt && !_selectedDepth) return;

    const rules = OutputTypes.getActiveRules(
      _selectedForm, _selectedOpt, _selectedDepth
    );
    if (!rules.length) return;

    section.appendChild(
      DomUtils.div({ class: 'stage2__section-title' },
        'Output constraints triggered'
      )
    );

    rules.forEach(rule => {
      const card = DomUtils.div({
        class: `rule-card rule-card--${rule.severity}`,
      }, [
        DomUtils.span({
          class: `rule-card__icon`,
        }, rule.severity === 'warning' ? '⚠'
          : rule.severity === 'insight' ? '💡'
          : 'ℹ'),
        DomUtils.span({ class: 'rule-card__text' }, rule.rule),
      ]);
      section.appendChild(card);
    });
  }

  function _renderSummary(container, formId, optId, depthId) {
    DomUtils.clearContent(container);

    const summary  = OutputTypes.buildSummary(formId, optId, depthId);
    if (!summary.form) return;

    container.appendChild(
      DomUtils.div({ class: 'stage2__section-title' }, 'Output summary')
    );

    // Form row
    container.appendChild(
      DomUtils.div({ class: 'summary-row' }, [
        DomUtils.span({ class: 'summary-row__label' }, 'Output:'),
        DomUtils.span({ class: 'summary-row__value' }, summary.form.label),
      ])
    );

    // Opt row
    container.appendChild(
      DomUtils.div({ class: 'summary-row' }, [
        DomUtils.span({ class: 'summary-row__label' }, 'Goal:'),
        DomUtils.span({ class: 'summary-row__value' }, summary.optType?.label ?? '—'),
      ])
    );

    // Depth row
    container.appendChild(
      DomUtils.div({ class: 'summary-row' }, [
        DomUtils.span({ class: 'summary-row__label' }, 'Depth:'),
        DomUtils.span({ class: 'summary-row__value' }, summary.depth?.label ?? '—'),
      ])
    );

    // Candidate families
    if (summary.candidateFamilies?.length) {
      container.appendChild(
        DomUtils.div({ class: 'summary-opened' }, [
          DomUtils.div({ class: 'summary-opened__title' },
            'Candidate families from output side:'
          ),
          DomUtils.div(
            { class: 'summary-opened__list' },
            summary.candidateFamilies.map(f =>
              DomUtils.span({ class: 'opened-badge' }, f)
            )
          ),
        ])
      );
    }

    // Warnings
    if (summary.warnings?.length) {
      const warnEl = DomUtils.div({ class: 'summary-warnings' });
      summary.warnings.forEach(w => {
        warnEl.appendChild(
          DomUtils.div({ class: 'watchout-row' }, [
            DomUtils.span({ class: 'watchout-icon' }, '⚠'),
            DomUtils.span({ class: 'watchout-text' }, w.rule),
          ])
        );
      });
      container.appendChild(warnEl);
    }

    // Insights
    if (summary.insights?.length) {
      summary.insights.forEach(ins => {
        container.appendChild(
          DomUtils.div({ class: 'insight-card insight-card--key' }, [
            DomUtils.div({ class: 'insight-card__icon' }, '💡'),
            DomUtils.div({ class: 'insight-card__text' }, ins.rule),
          ])
        );
      });
    }
  }

  // ─── COMPLETION CHECK ──────────────────────────────────────────────────────

  function _checkComplete() {
    const valid =
      _selectedForm  !== null &&
      _selectedOpt   !== null &&
      _selectedDepth !== null;

    Renderer.setNextEnabled(valid);

    if (valid) {
      const section = document.getElementById('stage2-summary');
      if (section) {
        _renderSummary(section, _selectedForm, _selectedOpt, _selectedDepth);
      }

      document.dispatchEvent(new CustomEvent('dsa:stage-complete', {
        detail: {
          stageId: 'stage2',
          answers: {
            outputForm       : _selectedForm,
            optimizationType : _selectedOpt,
            solutionDepth    : _selectedDepth,
          },
        },
      }));
    }
  }

  // ─── LIFECYCLE ─────────────────────────────────────────────────────────────

  function onMount(state) {
    const saved = state.answers?.stage2;
    if (saved?.outputForm && saved?.optimizationType && saved?.solutionDepth) {
      Renderer.setNextEnabled(true);
    }
  }

  function cleanup() {
    _state         = null;
    _selectedForm  = null;
    _selectedOpt   = null;
    _selectedDepth = null;
  }

  // ─── PUBLIC ────────────────────────────────────────────────────────────────

  return { render, onMount, cleanup };

})();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Stage2;
}
