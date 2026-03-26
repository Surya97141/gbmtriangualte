// stages/stage3/stage3.js
// Structural Properties stage — orchestrates all 7 property questions,
// DP sub-classifier, and Graph deep-dive
// Module contract: render(state), onMount(state), cleanup()

const Stage3 = (() => {

  // ─── PRIVATE STATE ─────────────────────────────────────────────────────────

  let _state       = null;
  let _answers     = {};   // propertyId → answerId
  let _dpSubtype   = null; // dp type id from sub-classifier
  let _graphGoal   = null; // graph goal id from deep-dive
  let _activePanel = null; // 'properties' | 'dp' | 'graph'

  // ─── PROPERTY MODULES ─────────────────────────────────────────────────────

  const PROPERTY_MODULES = {
    orderSensitivity    : OrderSensitivity,
    subproblemOverlap   : SubproblemOverlap,
    feasibilityBoundary : FeasibilityBoundary,
    localOptimality     : LocalOptimality,
    stateSpace          : StateSpace,
    dependencyStructure : DependencyStructure,
    searchSpace         : SearchSpace,
  };

  const PROPERTY_ORDER = [
    'orderSensitivity',
    'subproblemOverlap',
    'feasibilityBoundary',
    'localOptimality',
    'stateSpace',
    'dependencyStructure',
    'searchSpace',
  ];

  // ─── RENDER ────────────────────────────────────────────────────────────────

  function render(state) {
    _state   = state;
    const saved = state.answers?.stage3 ?? {};

    _answers   = { ...(saved.properties ?? {}) };
    _dpSubtype = saved.dpSubtype  ?? null;
    _graphGoal = saved.graphGoal  ?? null;

    const wrapper = DomUtils.div({ class: 'stage stage3' }, [
      _buildIntro(),
      _buildProgressStrip(saved),
      _buildPropertiesPanel(saved),
      _buildDPPanel(saved),
      _buildGraphPanel(saved),
      _buildSummarySection(saved),
    ]);

    return wrapper;
  }

  // ─── INTRO ─────────────────────────────────────────────────────────────────

  function _buildIntro() {
    return DomUtils.div({ class: 'stage-intro' }, [
      DomUtils.div({ class: 'stage-intro__rule' },
        'Answer structural questions — not "what algorithm". The algorithm follows from structure.'
      ),
      DomUtils.div({ class: 'stage-intro__sub' },
        'Seven structural properties narrow the approach. Sub-classifiers activate when relevant.'
      ),
    ]);
  }

  // ─── PROGRESS STRIP ───────────────────────────────────────────────────────

  function _buildProgressStrip(saved) {
    const strip = DomUtils.div({
      class: 'stage3__progress-strip',
      id   : 'stage3-progress-strip',
    });

    PROPERTY_ORDER.forEach((propId, idx) => {
      const mod    = PROPERTY_MODULES[propId];
      const prop   = mod.getProperty();
      const answer = saved.properties?.[propId];

      const dot = DomUtils.div({
        class: `s3-dot ${answer ? 's3-dot--answered' : ''} ${answer === 'unsure' ? 's3-dot--unsure' : ''}`,
        data : { propId },
      }, [
        DomUtils.span({ class: 's3-dot__num'   }, String(idx + 1)),
        DomUtils.span({ class: 's3-dot__label' }, prop.label.replace(/3[A-Z] — /, '')),
      ]);

      dot.addEventListener('click', () => _scrollToProperty(propId));
      strip.appendChild(dot);
    });

    return strip;
  }

  // ─── PROPERTIES PANEL ─────────────────────────────────────────────────────

  function _buildPropertiesPanel(saved) {
    const panel = DomUtils.div({
      class: 'stage3__properties-panel',
      id   : 'properties-panel',
    });

    PROPERTY_ORDER.forEach(propId => {
      const mod  = PROPERTY_MODULES[propId];
      const prop = mod.getProperty();
      const savedAnswer = saved.properties?.[propId] ?? null;

      panel.appendChild(_buildPropertyBlock(propId, prop, mod, savedAnswer));
    });

    return panel;
  }

  function _buildPropertyBlock(propId, prop, mod, savedAnswer) {
    const block = DomUtils.div({
      class: `s3-prop-block ${savedAnswer ? 's3-prop-block--answered' : ''}`,
      id   : `prop-block-${propId}`,
    });

    // Header
    const header = DomUtils.div({ class: 's3-prop-block__header' }, [
      DomUtils.div({ class: 's3-prop-block__label' }, prop.label),
      DomUtils.div({ class: 's3-prop-block__question' }, prop.question),
    ]);

    // Why this matters
    const whyEl = DomUtils.div({ class: 's3-prop-block__why' }, [
      DomUtils.span({ class: 'why-label' }, 'Why: '),
      DomUtils.span({}, prop.why),
    ]);

    // Answer options
    const optionsEl = DomUtils.div({ class: 's3-prop-block__options' });
    prop.answers.forEach(answer => {
      const card = DomUtils.div({
        class: `s3-answer-card s3-answer-card--${answer.color} ${savedAnswer === answer.id ? 's3-answer-card--selected' : ''}`,
        data : { propId, answerId: answer.id },
      }, [
        DomUtils.div({ class: 's3-answer-card__label'   }, answer.label),
        DomUtils.div({ class: 's3-answer-card__sublabel'}, answer.sublabel),
      ]);

      card.addEventListener('click', () => _onPropertyAnswer(propId, answer.id, mod));
      optionsEl.appendChild(card);
    });

    // Impact region
    const impactRegion = DomUtils.div({
      class: 's3-prop-block__impact',
      id   : `impact-${propId}`,
    });

    if (savedAnswer) {
      _renderPropertyImpact(impactRegion, propId, savedAnswer, mod);
    }

    // Test cases
    const testCases = mod.getTestCases?.() ?? [];
    let testCasesEl = null;
    if (testCases.length) {
      testCasesEl = DomUtils.createCollapsible(
        'Example problems',
        _buildTestCases(testCases),
        false
      );
    }

    DomUtils.append(block, [
      header,
      whyEl,
      optionsEl,
      impactRegion,
      testCasesEl,
    ].filter(Boolean));

    return block;
  }

  function _buildTestCases(testCases) {
    const list = DomUtils.div({ class: 's3-test-cases' });
    testCases.forEach(tc => {
      list.appendChild(
        DomUtils.div({ class: 's3-test-case' }, [
          DomUtils.div({ class: 's3-test-case__scenario' }, tc.scenario),
          DomUtils.div({ class: 's3-test-case__answer'   }, [
            DomUtils.span({ class: 'tc-answer-badge' }, tc.answer),
            DomUtils.span({ class: 'tc-reasoning'    }, tc.reasoning),
          ]),
        ])
      );
    });
    return list;
  }

  // ─── DP SUB-CLASSIFIER PANEL ──────────────────────────────────────────────

  function _buildDPPanel(saved) {
    const panel = DomUtils.div({
      class: 'stage3__dp-panel',
      id   : 'dp-panel',
    });

    // Only show if subproblemOverlap suggests DP
    const overlap = saved.properties?.subproblemOverlap;
    const isDPLikely = overlap === 'yes_direct';

    if (!isDPLikely) {
      DomUtils.hide(panel);
      return panel;
    }

    panel.appendChild(
      DomUtils.div({ class: 'stage3__sub-header' }, [
        DomUtils.span({ class: 'sub-header__icon' }, '⬡'),
        DomUtils.div({ class: 'sub-header__content' }, [
          DomUtils.div({ class: 'sub-header__title' }, 'DP Sub-Classifier'),
          DomUtils.div({ class: 'sub-header__sub'   },
            'Overlapping subproblems detected — identify which DP variant applies'
          ),
        ]),
      ])
    );

    // State index question
    const q = DPClassifier.getQuestions()[0];
    panel.appendChild(
      DomUtils.div({ class: 's3-dp-question' }, q.text)
    );
    panel.appendChild(
      DomUtils.div({ class: 's3-dp-sublabel' }, q.sublabel)
    );

    const optGrid = DomUtils.div({ class: 's3-dp-options' });

    q.options.forEach(opt => {
      const card = DomUtils.div({
        class: `s3-dp-card ${saved.dpSubtype === opt.leadsTo ? 's3-dp-card--selected' : ''}`,
        data : { optionId: opt.id, typeId: opt.leadsTo },
      }, [
        DomUtils.div({ class: 's3-dp-card__label'   }, opt.label),
        DomUtils.div({ class: 's3-dp-card__sublabel'}, opt.sublabel),
      ]);

      card.addEventListener('click', () => _onDPOptionSelect(opt));
      optGrid.appendChild(card);
    });

    panel.appendChild(optGrid);

    // DP type detail region
    panel.appendChild(
      DomUtils.div({
        class: 's3-dp-detail',
        id   : 'dp-type-detail',
      })
    );

    if (saved.dpSubtype) {
      const detailEl = document.getElementById('dp-type-detail');
      if (detailEl) _renderDPTypeDetail(detailEl, saved.dpSubtype);
    }

    return panel;
  }

  // ─── GRAPH DEEP-DIVE PANEL ────────────────────────────────────────────────

  function _buildGraphPanel(saved) {
    const panel = DomUtils.div({
      class: 'stage3__graph-panel',
      id   : 'graph-panel',
    });

    const inputTypes = _state?.answers?.stage1?.inputTypes ?? [];
    const graphInputs = ['graph_edge_list', 'graph_adjacency', 'implicit_graph', 'grid'];
    const hasGraph    = inputTypes.some(t => graphInputs.includes(t));

    if (!hasGraph) {
      DomUtils.hide(panel);
      return panel;
    }

    panel.appendChild(
      DomUtils.div({ class: 'stage3__sub-header' }, [
        DomUtils.span({ class: 'sub-header__icon' }, '◉'),
        DomUtils.div({ class: 'sub-header__content' }, [
          DomUtils.div({ class: 'sub-header__title' }, 'Graph Deep-Dive'),
          DomUtils.div({ class: 'sub-header__sub'   },
            'Graph input detected — identify graph properties and goal'
          ),
        ]),
      ])
    );

    // Graph property questions
    panel.appendChild(_buildGraphPropertyQuestions(saved));

    // Goal selection
    panel.appendChild(_buildGraphGoalSection(saved));

    // Algorithm recommendation region
    panel.appendChild(
      DomUtils.div({
        class: 's3-graph-recommendation',
        id   : 'graph-recommendation',
      })
    );

    if (saved.graphGoal) {
      const recEl = document.getElementById('graph-recommendation');
      if (recEl) _renderGraphRecommendation(recEl, saved);
    }

    return panel;
  }

  function _buildGraphPropertyQuestions(saved) {
    const section = DomUtils.div({ class: 's3-graph-props' });

    section.appendChild(
      DomUtils.div({ class: 's3-graph-props__title' },
        'First — characterize the graph'
      )
    );

    const savedProps = saved.graphProperties ?? {};

    [
      { id: 'directed', q: 'Are edges directed?' },
      { id: 'weighted', q: 'Do edges have weights?' },
      { id: 'negative', q: 'Can edge weights be negative?', showIf: () => savedProps.weighted === 'yes' },
    ].forEach(({ id, q, showIf }) => {
      const row = DomUtils.div({
        class: `s3-graph-prop-row ${showIf && !showIf() ? 'hidden' : ''}`,
        id   : `graph-prop-row-${id}`,
      }, [
        DomUtils.div({ class: 's3-graph-prop-row__q' }, q),
        DomUtils.div({ class: 's3-graph-prop-row__btns' }, [
          _buildGraphPropBtn(id, 'yes', savedProps[id] === 'yes', 'Yes'),
          _buildGraphPropBtn(id, 'no',  savedProps[id] === 'no',  'No'),
        ]),
      ]);
      section.appendChild(row);
    });

    return section;
  }

  function _buildGraphPropBtn(propId, value, isSelected, label) {
    const btn = DomUtils.btn({
      class: `graph-prop-btn ${isSelected ? 'graph-prop-btn--selected' : ''}`,
      data : { propId, value },
    }, label);

    btn.addEventListener('click', () => _onGraphPropAnswer(propId, value));
    return btn;
  }

  function _buildGraphGoalSection(saved) {
    const section = DomUtils.div({ class: 's3-graph-goals' });

    section.appendChild(
      DomUtils.div({ class: 's3-graph-goals__title' },
        'What is the primary goal on the graph?'
      )
    );

    const goalGrid = DomUtils.div({ class: 's3-graph-goal-grid' });

    GraphGoals.getAll().forEach(goal => {
      const card = DomUtils.div({
        class: `s3-graph-goal-card ${saved.graphGoal === goal.id ? 's3-graph-goal-card--selected' : ''}`,
        data : { goalId: goal.id },
      }, [
        DomUtils.div({ class: 's3-graph-goal-card__label'   }, goal.label),
        DomUtils.div({ class: 's3-graph-goal-card__question'}, goal.question),
      ]);

      card.addEventListener('click', () => _onGraphGoalSelect(goal.id));
      goalGrid.appendChild(card);
    });

    section.appendChild(goalGrid);
    return section;
  }

  // ─── SUMMARY SECTION ──────────────────────────────────────────────────────

  function _buildSummarySection(saved) {
    const section = DomUtils.div({
      class: 'stage3__summary',
      id   : 'stage3-summary',
    });

    _renderSummary(section, saved);
    return section;
  }

  // ─── CHANGE HANDLERS ──────────────────────────────────────────────────────

  function _onPropertyAnswer(propId, answerId, mod) {
    _answers[propId] = answerId;

    // Update card states
    document.querySelectorAll(`[data-prop-id="${propId}"]`).forEach(card => {
      card.classList.toggle(
        's3-answer-card--selected',
        card.dataset.answerId === answerId
      );
    });

    // Update block answered state
    const block = document.getElementById(`prop-block-${propId}`);
    if (block) block.classList.add('s3-prop-block--answered');

    // Render impact
    const impactRegion = document.getElementById(`impact-${propId}`);
    if (impactRegion) _renderPropertyImpact(impactRegion, propId, answerId, mod);

    // Update progress strip
    _refreshProgressStrip();

    // Show/hide sub-classifier panels based on answers
    _refreshSubPanels();

    // Save
    State.setAnswer('stage3', {
      properties: { ..._answers },
    });

    // Refresh summary
    _refreshSummary();

    // Check completion
    _checkComplete();
  }

  function _onDPOptionSelect(option) {
    _dpSubtype = option.leadsTo;

    // Update card states
    document.querySelectorAll('.s3-dp-card').forEach(card => {
      card.classList.toggle(
        's3-dp-card--selected',
        card.dataset.typeId === option.leadsTo
      );
    });

    // Render DP type detail
    const detailEl = document.getElementById('dp-type-detail');
    if (detailEl) _renderDPTypeDetail(detailEl, option.leadsTo);

    State.setAnswer('stage3', { dpSubtype: _dpSubtype });
    _refreshSummary();
    _checkComplete();
  }

  function _onGraphPropAnswer(propId, value) {
    const savedProps = State.getAnswer('stage3')?.graphProperties ?? {};
    savedProps[propId] = value;

    // Update button states
    document.querySelectorAll(`[data-prop-id="${propId}"]`).forEach(btn => {
      btn.classList.toggle(
        'graph-prop-btn--selected',
        btn.dataset.value === value
      );
    });

    // Show/hide negative weight row
    if (propId === 'weighted') {
      const negRow = document.getElementById('graph-prop-row-negative');
      if (negRow) negRow.classList.toggle('hidden', value !== 'yes');
    }

    State.setAnswer('stage3', { graphProperties: savedProps });
    _refreshGraphRecommendation();
    _checkComplete();
  }

  function _onGraphGoalSelect(goalId) {
    _graphGoal = goalId;

    document.querySelectorAll('.s3-graph-goal-card').forEach(card => {
      card.classList.toggle(
        's3-graph-goal-card--selected',
        card.dataset.goalId === goalId
      );
    });

    State.setAnswer('stage3', { graphGoal: goalId });
    _refreshGraphRecommendation();
    _refreshSummary();
    _checkComplete();
  }

  // ─── RENDER HELPERS ────────────────────────────────────────────────────────

  function _renderPropertyImpact(container, propId, answerId, mod) {
    DomUtils.clearContent(container);

    const answer = mod.getProperty().answers.find(a => a.id === answerId);
    if (!answer) return;

    // Follow-up question
    if (answer.followUp) {
      container.appendChild(
        DomUtils.div({ class: 's3-followup' }, [
          DomUtils.span({ class: 's3-followup__icon' }, '→'),
          DomUtils.span({ class: 's3-followup__text' }, answer.followUp),
        ])
      );
    }

    // Warning for unsure
    if (answerId === 'unsure') {
      container.appendChild(
        DomUtils.div({ class: 's3-unsure-warning' }, [
          DomUtils.span({ class: 'watchout-icon' }, '⚠'),
          DomUtils.span({}, 'Unsure answers reduce confidence score. Try to determine before proceeding.'),
        ])
      );
      return;
    }

    // Opens
    if (answer.opens?.length) {
      const opensEl = DomUtils.div({ class: 's3-prop-impact' }, [
        DomUtils.div({ class: 's3-prop-impact__label opens-label' }, 'Opens:'),
        DomUtils.div(
          { class: 'opens-list' },
          answer.opens.map(o => DomUtils.span({ class: 'opened-badge' }, o))
        ),
      ]);
      container.appendChild(opensEl);
    }

    // Eliminates
    if (answer.eliminates?.length) {
      const elimEl = DomUtils.div({ class: 's3-prop-impact' }, [
        DomUtils.div({ class: 's3-prop-impact__label elim-label' }, 'Eliminates:'),
        DomUtils.div(
          { class: 'elim-list' },
          answer.eliminates.map(e => DomUtils.span({ class: 'elim-badge' }, e))
        ),
      ]);
      container.appendChild(elimEl);
    }
  }

  function _renderDPTypeDetail(container, typeId) {
    DomUtils.clearContent(container);
    const summary = DPClassifier.buildTypeSummary(typeId);
    if (!summary) return;

    const { type, optimizations } = summary;

    const detail = DomUtils.div({ class: 's3-dp-type-detail' }, [
      DomUtils.div({ class: 's3-dp-type-detail__name' }, type.label),

      DomUtils.div({ class: 's3-dp-type-detail__state' }, [
        DomUtils.span({ class: 'detail-label' }, 'State: '),
        DomUtils.span({ class: 'detail-mono'  }, type.stateShape),
        DomUtils.span({ class: 'detail-example'}, ` — ${type.stateExample}`),
      ]),

      DomUtils.div({ class: 's3-dp-type-detail__base' }, [
        DomUtils.span({ class: 'detail-label' }, 'Base: '),
        DomUtils.span({}, type.baseCase),
      ]),

      DomUtils.div({ class: 's3-dp-type-detail__fill' }, [
        DomUtils.span({ class: 'detail-label' }, 'Fill order: '),
        DomUtils.span({}, type.fillOrder),
      ]),

      DomUtils.div({ class: 's3-dp-type-detail__complexity' }, [
        DomUtils.span({ class: 'detail-label' }, 'Complexity: '),
        DomUtils.span({ class: 'detail-mono'  }, type.complexity),
      ]),
    ]);

    // Watch outs
    if (type.watchOut?.length) {
      const woEl = DomUtils.div({ class: 's3-dp-type-detail__watchouts' });
      type.watchOut.forEach(w => {
        woEl.appendChild(
          DomUtils.div({ class: 'watchout-row' }, [
            DomUtils.span({ class: 'watchout-icon' }, '⚠'),
            DomUtils.span({ class: 'watchout-text' }, w),
          ])
        );
      });
      detail.appendChild(woEl);
    }

    // Applicable optimizations
    if (optimizations?.length) {
      const optEl = DomUtils.div({ class: 's3-dp-type-detail__opts' }, [
        DomUtils.div({ class: 'detail-label' }, 'Possible optimizations:'),
        DomUtils.div(
          { class: 'opts-list' },
          optimizations.map(o =>
            DomUtils.span({ class: 'opt-badge' }, `${o.label}: ${o.tagline}`)
          )
        ),
      ]);
      detail.appendChild(optEl);
    }

    container.appendChild(detail);
  }

  function _renderGraphRecommendation(container, saved) {
    DomUtils.clearContent(container);
    if (!saved?.graphGoal) return;

    const conditions = {
      goal     : saved.graphGoal,
      directed : saved.graphProperties?.directed === 'yes',
      weighted : saved.graphProperties?.weighted === 'yes',
      negative : saved.graphProperties?.negative === 'yes',
    };

    const summary = GraphClassifier.buildSummary(conditions);
    if (!summary?.algorithm) return;

    const alg = summary.algorithm;

    const recCard = DomUtils.div({ class: 's3-graph-rec-card' }, [
      DomUtils.div({ class: 's3-graph-rec-card__algo' }, alg.algorithm),
      DomUtils.div({ class: 's3-graph-rec-card__complexity' }, alg.complexity),
      DomUtils.div({ class: 's3-graph-rec-card__why' }, alg.why),
    ]);

    if (alg.watchOut) {
      recCard.appendChild(
        DomUtils.div({ class: 's3-graph-rec-card__warn' }, [
          DomUtils.span({ class: 'watchout-icon' }, '⚠'),
          DomUtils.span({}, alg.watchOut),
        ])
      );
    }

    // Relevant mistakes
    if (summary.relevantMistakes?.length) {
      summary.relevantMistakes.forEach(m => {
        container.appendChild(
          DomUtils.div({ class: 'mistake-card' }, [
            DomUtils.div({ class: 'mistake-card__mistake' }, [
              DomUtils.span({ class: 'watchout-icon' }, '✗'),
              DomUtils.span({}, m.mistake),
            ]),
            DomUtils.div({ class: 'mistake-card__fix' }, [
              DomUtils.span({ class: 'fix-icon' }, '✓'),
              DomUtils.span({}, m.fix),
            ]),
          ])
        );
      });
    }

    container.appendChild(recCard);
  }

  function _refreshGraphRecommendation() {
    const saved = State.getAnswer('stage3') ?? {};
    const recEl = document.getElementById('graph-recommendation');
    if (recEl) _renderGraphRecommendation(recEl, saved);
  }

  function _refreshSubPanels() {
    const overlap = _answers.subproblemOverlap;
    const isDPLikely = overlap === 'yes_direct';

    const dpPanel = document.getElementById('dp-panel');
    if (dpPanel) DomUtils.toggle(dpPanel, isDPLikely);

    // Graph panel stays visible based on input type — no toggle needed
  }

  function _refreshProgressStrip() {
    PROPERTY_ORDER.forEach((propId, idx) => {
      const dot = document.querySelector(`[data-prop-id="${propId}"].s3-dot`);
      if (!dot) return;
      const answered = !!_answers[propId];
      const isUnsure = _answers[propId] === 'unsure';
      dot.classList.toggle('s3-dot--answered', answered);
      dot.classList.toggle('s3-dot--unsure', isUnsure);
    });
  }

  function _renderSummary(container, saved) {
    DomUtils.clearContent(container);

    const answeredCount = Object.keys(saved.properties ?? {}).length;
    const totalCount    = PROPERTY_ORDER.length;

    if (answeredCount === 0) {
      container.appendChild(
        DomUtils.div({ class: 'summary-placeholder' },
          'Answer structural property questions above to see summary'
        )
      );
      return;
    }

    container.appendChild(
      DomUtils.div({ class: 'stage3__section-title' }, 'Structural findings')
    );

    // Property answers grid
    const grid = DomUtils.div({ class: 's3-summary-grid' });

    PROPERTY_ORDER.forEach(propId => {
      const mod    = PROPERTY_MODULES[propId];
      const prop   = mod.getProperty();
      const answId = saved.properties?.[propId];
      if (!answId) return;

      const answer = prop.answers.find(a => a.id === answId);
      if (!answer) return;

      grid.appendChild(
        DomUtils.div({
          class: `s3-summary-item s3-summary-item--${answer.color}`,
        }, [
          DomUtils.div({ class: 's3-summary-item__label'  }, prop.label.replace(/3[A-Z] — /, '')),
          DomUtils.div({ class: 's3-summary-item__answer' }, answer.label),
        ])
      );
    });

    container.appendChild(grid);

    // DP subtype
    if (saved.dpSubtype) {
      const dpType = DPClassifier.getTypeById(saved.dpSubtype);
      if (dpType) {
        container.appendChild(
          DomUtils.div({ class: 'summary-row' }, [
            DomUtils.span({ class: 'summary-row__label' }, 'DP type:'),
            DomUtils.span({ class: 'summary-row__value' }, dpType.label),
          ])
        );
      }
    }

    // Graph goal
    if (saved.graphGoal) {
      const goal = GraphGoals.getById(saved.graphGoal);
      if (goal) {
        container.appendChild(
          DomUtils.div({ class: 'summary-row' }, [
            DomUtils.span({ class: 'summary-row__label' }, 'Graph goal:'),
            DomUtils.span({ class: 'summary-row__value' }, goal.label),
          ])
        );
      }
    }

    // Progress indicator
    container.appendChild(
      DomUtils.div({ class: 's3-summary-progress' },
        `${answeredCount} / ${totalCount} properties answered`
      )
    );
  }

  function _refreshSummary() {
    const section = document.getElementById('stage3-summary');
    if (section) {
      _renderSummary(section, State.getAnswer('stage3') ?? {});
    }
  }

  // ─── SCROLL HELPER ────────────────────────────────────────────────────────

  function _scrollToProperty(propId) {
    const block = document.getElementById(`prop-block-${propId}`);
    if (block) DomUtils.scrollIntoView(block);
  }

  // ─── COMPLETION CHECK ──────────────────────────────────────────────────────

  function _checkComplete() {
    const saved       = State.getAnswer('stage3') ?? {};
    const answered    = Object.keys(saved.properties ?? {}).length;
    const inputTypes  = _state?.answers?.stage1?.inputTypes ?? [];
    const graphInputs = ['graph_edge_list','graph_adjacency','implicit_graph','grid'];
    const hasGraph    = inputTypes.some(t => graphInputs.includes(t));
    const overlap     = saved.properties?.subproblemOverlap;
    const isDPLikely  = overlap === 'yes_direct';

    // Minimum: at least 5 of 7 properties answered
    const enoughProperties = answered >= 5;

    // If DP likely — need dp subtype
    const dpOk = !isDPLikely || !!saved.dpSubtype;

    // If graph — need at least goal selected
    const graphOk = !hasGraph || !!saved.graphGoal;

    const valid = enoughProperties && dpOk && graphOk;
    Renderer.setNextEnabled(valid);

    if (valid) {
      document.dispatchEvent(new CustomEvent('dsa:stage-complete', {
        detail: {
          stageId: 'stage3',
          answers: {
            properties     : saved.properties ?? {},
            dpSubtype      : saved.dpSubtype  ?? null,
            graphGoal      : saved.graphGoal  ?? null,
            graphProperties: saved.graphProperties ?? {},
          },
        },
      }));
    }
  }

  // ─── LIFECYCLE ─────────────────────────────────────────────────────────────

  function onMount(state) {
    const saved   = state.answers?.stage3;
    const answered = Object.keys(saved?.properties ?? {}).length;
    if (answered >= 5) Renderer.setNextEnabled(true);
  }

  function cleanup() {
    _state       = null;
    _answers     = {};
    _dpSubtype   = null;
    _graphGoal   = null;
    _activePanel = null;
  }

  // ─── PUBLIC ────────────────────────────────────────────────────────────────

  return { render, onMount, cleanup };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Stage3;
}
