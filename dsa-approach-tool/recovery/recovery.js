// recovery/recovery.js
// Recovery mode orchestrator — entry point, path routing, step rendering
// Module contract: render(state), onMount(state), cleanup()

const Recovery = (() => {

  // ─── PRIVATE STATE ─────────────────────────────────────────────────────────

  let _state       = null;
  let _activePath  = null;
  let _currentStep = null;
  let _history     = []; // [{stepId, actionId}]

  // ─── PATH REGISTRY ────────────────────────────────────────────────────────

  const PATHS = {
    wa_path           : WAPath,
    tle_path          : TLEPath,
    logic_unclear_path: LogicUnclearPath,
    reframe_path      : ReframePath,
  };

  // ─── RENDER ────────────────────────────────────────────────────────────────

  function render(state) {
    _state = state;
    const saved = state.answers?.recovery ?? {};

    _activePath  = saved.activePath  ?? null;
    _currentStep = saved.currentStep ?? null;
    _history     = saved.history     ?? [];

    document.dispatchEvent(new CustomEvent('dsa:recovery-mode'));

    const wrapper = DomUtils.div({ class: 'recovery' }, [
      _buildIntro(),
      _activePath
        ? _buildStepView()
        : _buildPathSelector(),
    ]);

    return wrapper;
  }

  // ─── INTRO ─────────────────────────────────────────────────────────────────

  function _buildIntro() {
    return DomUtils.div({ class: 'recovery-intro' }, [
      DomUtils.div({ class: 'stage-intro' }, [
        DomUtils.div({ class: 'stage-intro__rule' },
          'Recovery Mode — systematic diagnosis for stuck problems'
        ),
        DomUtils.div({ class: 'stage-intro__sub' },
          'Select what went wrong. Answer each question to narrow the issue.'
        ),
      ]),
    ]);
  }

  // ─── PATH SELECTOR ────────────────────────────────────────────────────────

  function _buildPathSelector() {
    const section = DomUtils.div({ class: 'recovery__selector' });

    section.appendChild(
      DomUtils.div({ class: 'recovery__selector-title' },
        'What is the problem?'
      )
    );

    const grid = DomUtils.div({ class: 'recovery__path-grid' });

    Object.values(PATHS).forEach(path => {
      const meta = path.getMeta();
      const card = DomUtils.div({
        class: `recovery__path-card recovery__path-card--${meta.color}`,
        data : { pathId: meta.id },
      }, [
        DomUtils.div({ class: 'recovery__path-card__icon'    }, meta.icon),
        DomUtils.div({ class: 'recovery__path-card__label'   }, meta.label),
        DomUtils.div({ class: 'recovery__path-card__trigger' }, meta.trigger),
      ]);

      card.addEventListener('click', () => _onPathSelect(meta.id));
      grid.appendChild(card);
    });

    section.appendChild(grid);
    return section;
  }

  // ─── STEP VIEW ────────────────────────────────────────────────────────────

  function _buildStepView() {
    const section = DomUtils.div({
      class: 'recovery__step-view',
      id   : 'recovery-step-view',
    });

    const path = PATHS[_activePath];
    if (!path) return section;

    const stepId = _currentStep ?? path.getFirstStep().id;
    const step   = path.getStepById(stepId);
    if (!step) return section;

    // Breadcrumb
    section.appendChild(_buildBreadcrumb(path));

    // Step card
    section.appendChild(_buildStepCard(step, path));

    // Back button
    if (_history.length > 0) {
      const backBtn = DomUtils.btn({
        class: 'btn btn--ghost btn--sm recovery__back-btn',
      }, '← Back');

      backBtn.addEventListener('click', () => _onBack());
      section.appendChild(backBtn);
    }

    // Change path button
    const changeBtn = DomUtils.btn({
      class: 'btn btn--ghost btn--sm recovery__change-btn',
    }, '↺ Different problem');

    changeBtn.addEventListener('click', () => _onChangePath());
    section.appendChild(changeBtn);

    return section;
  }

  function _buildBreadcrumb(path) {
    const meta = path.getMeta();
    return DomUtils.div({ class: 'recovery__breadcrumb' }, [
      DomUtils.span({ class: `recovery__breadcrumb__path recovery__breadcrumb__path--${meta.color}` },
        meta.label
      ),
      DomUtils.span({ class: 'recovery__breadcrumb__sep' }, '›'),
      DomUtils.span({ class: 'recovery__breadcrumb__step' },
        `Step ${_history.length + 1}`
      ),
    ]);
  }

  function _buildStepCard(step, path) {
    const card = DomUtils.div({ class: 'recovery__step-card' });

    // Title + desc
    card.appendChild(
      DomUtils.div({ class: 'recovery__step-card__title' }, step.title)
    );
    card.appendChild(
      DomUtils.div({ class: 'recovery__step-card__desc'  }, step.desc)
    );

    // Step-type specific content
    if (step.technique)     card.appendChild(_buildTechnique(step.technique));
    if (step.protocol)      card.appendChild(_buildProtocol(step.protocol));
    if (step.questions)     card.appendChild(_buildQuestions(step.questions));
    if (step.checklist)     card.appendChild(_buildChecklist(step.checklist, step.id));
    if (step.commonBugs)    card.appendChild(_buildCommonBugs(step.commonBugs));
    if (step.optimizations) card.appendChild(_buildOptimizations(step.optimizations));
    if (step.culprits)      card.appendChild(_buildCulprits(step.culprits));
    if (step.insight)       card.appendChild(_buildInsight(step.insight));
    if (step.diagnosis)     card.appendChild(_buildDiagnosis(step.diagnosis));
    if (step.reframes)      card.appendChild(_buildReframes(step.reframes));
    if (step.examples)      card.appendChild(_buildExamples(step.examples));
    if (step.template)      card.appendChild(_buildTemplate(step.template));
    if (step.technique?.steps) {} // handled above
    if (step.steps)         card.appendChild(_buildStepsList(step.steps));
    if (step.techniques)    card.appendChild(_buildTechniquesList(step.techniques));
    if (step.note)          card.appendChild(_buildNote(step.note));
    if (step.action)        card.appendChild(_buildNote(step.action));

    // Actions
    if (step.actions?.length) {
      card.appendChild(_buildActions(step.actions));
    }

    return card;
  }

  // ─── CONTENT BUILDERS ─────────────────────────────────────────────────────

  function _buildTechnique(technique) {
    const el = DomUtils.div({ class: 'recovery__technique' }, [
      DomUtils.div({ class: 'recovery__technique__title' }, technique.title),
    ]);

    (technique.steps ?? []).forEach((s, idx) => {
      el.appendChild(
        DomUtils.div({ class: 'recovery__technique__step' }, [
          DomUtils.span({ class: 'recovery__step-num' }, String(idx + 1)),
          DomUtils.span({}, s),
        ])
      );
    });

    return el;
  }

  function _buildProtocol(protocol) {
    const el = DomUtils.div({ class: 'recovery__protocol' });
    protocol.forEach(item => {
      el.appendChild(
        DomUtils.div({ class: 'recovery__protocol__item' }, [
          DomUtils.div({ class: 'recovery__protocol__step' },
            `Step ${item.step}: ${item.title}`
          ),
          DomUtils.div({ class: 'recovery__protocol__note' }, item.note),
        ])
      );
    });
    return el;
  }

  function _buildQuestions(questions) {
    const el = DomUtils.div({ class: 'recovery__questions' });
    questions.forEach(q => {
      const item = DomUtils.div({ class: 'recovery__question-item' }, [
        DomUtils.div({ class: 'recovery__question-item__q' }, q.q),
      ]);

      if (q.yes) {
        item.appendChild(
          DomUtils.div({ class: 'recovery__question-item__yes' }, [
            DomUtils.span({ class: 'recovery__yn--yes' }, 'Yes → '),
            DomUtils.span({}, q.yes),
          ])
        );
      }
      if (q.no) {
        item.appendChild(
          DomUtils.div({ class: 'recovery__question-item__no' }, [
            DomUtils.span({ class: 'recovery__yn--no' }, 'No → '),
            DomUtils.span({}, q.no),
          ])
        );
      }
      if (q.opts) {
        q.opts.forEach(opt => {
          item.appendChild(
            DomUtils.div({ class: 'recovery__question-item__opt' }, [
              DomUtils.span({ class: 'recovery__opt-bullet' }, '·'),
              DomUtils.span({}, opt),
            ])
          );
        });
      }

      el.appendChild(item);
    });
    return el;
  }

  function _buildChecklist(items, stepId) {
    const saved   = State.getAnswer('recovery') ?? {};
    const checked = saved.checklists?.[stepId] ?? {};

    const el   = DomUtils.div({ class: 'recovery__checklist' });

    items.forEach(item => {
      const isChecked = checked[item.id] ?? false;
      const row = DomUtils.div({
        class: `recovery__checklist__row ${isChecked ? 'recovery__checklist__row--checked' : ''}`,
        id   : `cl-row-${item.id}`,
      }, [
        DomUtils.input({
          type   : 'checkbox',
          id     : `cl-${item.id}`,
          class  : 'recovery__checklist__cb',
          checked: isChecked ? true : undefined,
        }),
        DomUtils.label({ for: `cl-${item.id}`, class: 'recovery__checklist__label' },
          item.text
        ),
      ]);

      const cb = row.querySelector(`#cl-${item.id}`);
      if (cb) {
        cb.addEventListener('change', () => {
          _onChecklistToggle(stepId, item.id, cb.checked);
          row.classList.toggle('recovery__checklist__row--checked', cb.checked);
        });
      }

      el.appendChild(row);
    });

    return el;
  }

  function _buildCommonBugs(bugs) {
    const el = DomUtils.div({ class: 'recovery__bugs' });
    bugs.forEach(b => {
      el.appendChild(
        DomUtils.div({ class: 'recovery__bug-row' }, [
          DomUtils.div({ class: 'recovery__bug-row__bug' }, [
            DomUtils.span({ class: 'recovery__bug-icon' }, '✗'),
            DomUtils.span({}, b.bug),
          ]),
          DomUtils.div({ class: 'recovery__bug-row__fix' }, [
            DomUtils.span({ class: 'recovery__fix-icon' }, '→'),
            DomUtils.span({}, b.fix),
          ]),
        ])
      );
    });
    return el;
  }

  function _buildOptimizations(opts) {
    const el = DomUtils.div({ class: 'recovery__optimizations' });
    opts.forEach(o => {
      const card = DomUtils.div({ class: 'recovery__opt-card' }, [
        DomUtils.div({ class: 'recovery__opt-card__pattern'  }, o.pattern),
        DomUtils.div({ class: 'recovery__opt-card__solution' }, [
          DomUtils.span({ class: 'recovery__opt-label' }, 'Solution: '),
          DomUtils.span({}, o.solution),
        ]),
        DomUtils.div({ class: 'recovery__opt-card__condition'}, [
          DomUtils.span({ class: 'recovery__opt-label' }, 'When: '),
          DomUtils.span({}, o.condition),
        ]),
      ]);
      el.appendChild(card);
    });
    return el;
  }

  function _buildCulprits(culprits) {
    const el = DomUtils.div({ class: 'recovery__culprits' });
    culprits.forEach(c => {
      const severityColor = c.severity === 'critical' ? 'fail'
                          : c.severity === 'high'     ? 'warn'
                          : 'muted';
      el.appendChild(
        DomUtils.div({ class: 'recovery__culprit-row' }, [
          DomUtils.span({ class: `recovery__severity recovery__severity--${severityColor}` },
            c.severity.toUpperCase()
          ),
          DomUtils.span({ class: 'recovery__culprit-text' }, c.issue),
        ])
      );
    });
    return el;
  }

  function _buildInsight(insight) {
    return DomUtils.div({ class: 'recovery__insight' }, [
      DomUtils.span({ class: 'recovery__insight__icon' }, '💡'),
      DomUtils.span({ class: 'recovery__insight__text' }, insight),
    ]);
  }

  function _buildDiagnosis(items) {
    const el = DomUtils.div({ class: 'recovery__diagnosis' });
    items.forEach(item => {
      el.appendChild(
        DomUtils.div({ class: 'recovery__diagnosis__item' }, [
          DomUtils.div({ class: 'recovery__diagnosis__q'      }, item.question),
          DomUtils.div({ class: 'recovery__diagnosis__action' }, item.action),
        ])
      );
    });
    return el;
  }

  function _buildReframes(reframes) {
    const el = DomUtils.div({ class: 'recovery__reframes' });
    reframes.forEach(r => {
      el.appendChild(
        DomUtils.div({ class: 'recovery__reframe-item' }, [
          DomUtils.span({ class: 'recovery__reframe-bullet' }, '→'),
          DomUtils.span({}, r),
        ])
      );
    });
    return el;
  }

  function _buildExamples(examples) {
    const el = DomUtils.div({ class: 'recovery__examples' });
    examples.forEach(ex => {
      if (ex.wrong !== undefined) {
        el.appendChild(
          DomUtils.div({ class: 'recovery__example-row' }, [
            DomUtils.div({ class: 'recovery__example-wrong' }, [
              DomUtils.span({ class: 'recovery__wrong-label' }, '✗ '),
              DomUtils.span({}, ex.wrong),
            ]),
            DomUtils.div({ class: 'recovery__example-correct' }, [
              DomUtils.span({ class: 'recovery__correct-label' }, '✓ '),
              DomUtils.span({}, ex.correct),
            ]),
          ])
        );
      } else if (ex.test) {
        el.appendChild(
          DomUtils.div({ class: 'recovery__example-test' }, [
            DomUtils.div({ class: 'recovery__example-test__test'   }, ex.test),
            DomUtils.div({ class: 'recovery__example-test__result' }, ex.result ?? ''),
            ex.verdict
              ? DomUtils.div({ class: 'recovery__example-test__verdict' }, ex.verdict)
              : null,
          ].filter(Boolean))
        );
      }
    });
    return el;
  }

  function _buildTemplate(template) {
    return DomUtils.createCollapsible(
      'Code template',
      DomUtils.el('pre', { class: 'code-block' }, template),
      true
    );
  }

  function _buildStepsList(steps) {
    const el = DomUtils.div({ class: 'recovery__steps-list' });
    steps.forEach((s, idx) => {
      el.appendChild(
        DomUtils.div({ class: 'recovery__steps-list__item' }, [
          DomUtils.span({ class: 'recovery__step-num' }, String(idx + 1)),
          DomUtils.span({}, s),
        ])
      );
    });
    return el;
  }

  function _buildTechniquesList(techniques) {
    const el = DomUtils.div({ class: 'recovery__techniques-list' });
    techniques.forEach(t => {
      el.appendChild(
        DomUtils.div({ class: 'recovery__technique-item' }, [
          DomUtils.span({ class: 'recovery__tech-bullet' }, '·'),
          DomUtils.span({}, t),
        ])
      );
    });
    return el;
  }

  function _buildNote(note) {
    return DomUtils.div({ class: 'recovery__note' }, [
      DomUtils.span({ class: 'recovery__note__icon' }, '→'),
      DomUtils.span({}, note),
    ]);
  }

  function _buildActions(actions) {
    const el = DomUtils.div({ class: 'recovery__actions' });

    actions.forEach(action => {
      const isTerminal = action.isTerminal ?? false;
      const hasGoTo    = !!action.goTo;

      const btn = DomUtils.btn({
        class: `btn ${isTerminal ? 'btn--primary' : hasGoTo ? 'btn--secondary' : 'btn--ghost'} recovery__action-btn`,
        data : { actionId: action.id },
      }, action.label);

      btn.addEventListener('click', () => {
        if (isTerminal) {
          _onTerminalAction(action);
        } else if (action.goTo) {
          _onNavigateAction(action.goTo);
        } else if (action.next) {
          _onNextStep(action.id, action.next);
        }
      });

      if (action.hint) {
        const hint = DomUtils.div({ class: 'recovery__action-hint' }, action.hint);
        el.appendChild(btn);
        el.appendChild(hint);
      } else {
        el.appendChild(btn);
      }
    });

    return el;
  }

  // ─── CHANGE HANDLERS ──────────────────────────────────────────────────────

  function _onPathSelect(pathId) {
    _activePath  = pathId;
    _currentStep = PATHS[pathId].getFirstStep().id;
    _history     = [];

    State.setAnswer('recovery', {
      activePath : pathId,
      currentStep: _currentStep,
      history    : [],
    });

    _refreshStepView();
  }

  function _onNextStep(actionId, nextStepId) {
    _history.push({ stepId: _currentStep, actionId });
    _currentStep = nextStepId;

    State.setAnswer('recovery', {
      activePath : _activePath,
      currentStep: _currentStep,
      history    : [..._history],
    });

    _refreshStepView();
  }

  function _onBack() {
    if (!_history.length) return;
    const prev     = _history.pop();
    _currentStep   = prev.stepId;

    State.setAnswer('recovery', {
      activePath : _activePath,
      currentStep: _currentStep,
      history    : [..._history],
    });

    _refreshStepView();
  }

  function _onChangePath() {
    _activePath  = null;
    _currentStep = null;
    _history     = [];

    State.setAnswer('recovery', {
      activePath : null,
      currentStep: null,
      history    : [],
    });

    _refreshStepView();
  }

  function _onChecklistToggle(stepId, itemId, checked) {
    const saved      = State.getAnswer('recovery') ?? {};
    const checklists = saved.checklists ?? {};
    if (!checklists[stepId]) checklists[stepId] = {};
    checklists[stepId][itemId] = checked;
    State.setAnswer('recovery', { checklists });
  }

  function _onTerminalAction(action) {
    // Dismiss recovery mode — go back to last active stage
    State.setAnswer('recovery', { completed: true, activePath: null });
    const lastStage = _state?.answers?.stage7
      ? 'stage7'
      : _state?.currentStage ?? 'stage0';
    if (typeof Router !== 'undefined') {
      Router.navigate(lastStage);
    }
  }

  function _onNavigateAction(stageId) {
    if (typeof Router !== 'undefined') {
      Router.navigate(stageId);
    }
  }

  // ─── RENDER HELPERS ───────────────────────────────────────────────────────

  function _refreshStepView() {
    const wrapper = document.querySelector('.recovery');
    if (!wrapper) return;

    // Replace second child (path selector or step view)
    const existing = wrapper.children[1];
    const replacement = _activePath
      ? _buildStepView()
      : _buildPathSelector();

    if (existing) {
      wrapper.replaceChild(replacement, existing);
    } else {
      wrapper.appendChild(replacement);
    }
  }

  // ─── LIFECYCLE ─────────────────────────────────────────────────────────────

  function onMount(state) {
    // Recovery is always available — no completion gating
    Renderer.setNextEnabled(false); // no "next" from recovery
  }

  function cleanup() {
    _state       = null;
    _activePath  = null;
    _currentStep = null;
    _history     = [];
  }

  // ─── PUBLIC ────────────────────────────────────────────────────────────────

  return { render, onMount, cleanup };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Recovery;
}