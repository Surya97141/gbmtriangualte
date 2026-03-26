// stages/stage3-5/stage3-5.js
// Reframing Check stage — applies transformations, runs disguise checks,
// verifies transformation validity before committing to direction
// Module contract: render(state), onMount(state), cleanup()

const Stage3_5 = (() => {

  // ─── PRIVATE STATE ─────────────────────────────────────────────────────────

  let _state               = null;
  let _selectedTransform   = null;
  let _reframeAnswers      = {};
  let _disguiseAnswers     = {};
  let _verifyChecklist     = {};
  let _transformationHints = [];

  // ─── RENDER ────────────────────────────────────────────────────────────────

  function render(state) {
    _state = state;
    const saved = state.answers?.stage3_5 ?? {};

    _selectedTransform   = saved.transformationApplied ?? null;
    _reframeAnswers      = saved.reframeAnswers        ?? {};
    _disguiseAnswers     = saved.disguiseAnswers        ?? {};
    _verifyChecklist     = saved.verifyChecklist        ?? {};
    _transformationHints = saved.transformationHints    ?? [];

    const wrapper = DomUtils.div({ class: 'stage stage3-5' }, [
      _buildIntro(),
      _buildDisguiseSection(saved),
      _buildReframeSection(saved),
      _buildTransformSection(saved),
      _buildVerifySection(saved),
      _buildSummarySection(saved),
    ]);

    return wrapper;
  }

  // ─── INTRO ─────────────────────────────────────────────────────────────────

  function _buildIntro() {
    return DomUtils.div({ class: 'stage-intro' }, [
      DomUtils.div({ class: 'stage-intro__rule' },
        'Check: is this problem disguised as something else?'
      ),
      DomUtils.div({ class: 'stage-intro__sub' },
        'A reframe or transformation may reveal a much simpler approach. Check before coding.'
      ),
    ]);
  }

  // ─── DISGUISE CHECKS SECTION ───────────────────────────────────────────────

  function _buildDisguiseSection(saved) {
    const section = DomUtils.div({
      class: 'stage3-5__section',
      id   : 'disguise-section',
    });

    section.appendChild(
      DomUtils.div({ class: 'stage3-5__section-title' }, [
        DomUtils.span({}, 'Disguise checks'),
        DomUtils.span({ class: 'stage3-5__section-sub' },
          'Does this look like X but actually is Y?'
        ),
      ])
    );

    section.appendChild(
      DomUtils.div({ class: 'stage3-5__section-note' },
        'These are the most common misidentifications. A "yes this is a disguise" answer ' +
        'means your Stage 3 direction may be wrong — worth reconsidering before Stage 4.'
      )
    );

    const directions = _state?.output?.directions ?? [];
    const checks     = DisguiseChecks.getRelevant(directions);

    const list = DomUtils.div({ class: 'disguise-list' });

    checks.forEach(check => {
      const answered = saved.disguiseAnswers?.[check.id];
      list.appendChild(_buildDisguiseRow(check, answered));
    });

    section.appendChild(list);
    return section;
  }

  function _buildDisguiseRow(check, savedAnswer) {
    const isTriggered = savedAnswer === 'yes';

    const row = DomUtils.div({
      class: `disguise-row ${isTriggered ? 'disguise-row--triggered' : ''} ${savedAnswer ? 'disguise-row--answered' : ''}`,
      id   : `disguise-row-${check.id}`,
    });

    const header = DomUtils.div({ class: 'disguise-row__header' }, [
      DomUtils.div({ class: 'disguise-row__labels' }, [
        DomUtils.span({ class: 'disguise-row__looks' }, check.looksLike),
        DomUtils.span({ class: 'disguise-row__arrow' }, '→'),
        DomUtils.span({ class: 'disguise-row__actually' }, check.actuallyIs),
      ]),
      DomUtils.div({ class: 'disguise-row__signal' }, check.signal),
    ]);

    const testEl = DomUtils.div({ class: 'disguise-row__test' }, [
      DomUtils.span({ class: 'test-label' }, 'Test: '),
      DomUtils.span({}, check.test),
    ]);

    const answerRow = DomUtils.div({ class: 'disguise-row__answers' }, [
      _buildAnswerBtn(`disguise_${check.id}`, 'yes', savedAnswer === 'yes', '✓ Yes — this is a disguise'),
      _buildAnswerBtn(`disguise_${check.id}`, 'no',  savedAnswer === 'no',  '✗ No — direction is correct'),
    ]);

    const exampleEl = DomUtils.div({
      class: `disguise-row__example ${isTriggered ? '' : 'hidden'}`,
      id   : `disguise-example-${check.id}`,
    }, [
      DomUtils.span({ class: 'example-label' }, 'Example: '),
      DomUtils.span({}, check.example),
    ]);

    const warningEl = DomUtils.div({
      class: `disguise-row__warning ${isTriggered ? '' : 'hidden'}`,
      id   : `disguise-warning-${check.id}`,
    }, [
      DomUtils.span({ class: 'watchout-icon' }, '⚠'),
      DomUtils.span({},
        `Reconsider your Stage 3 direction — this may be ${check.actuallyIs} not ${check.looksLike}`
      ),
    ]);

    DomUtils.append(row, [header, testEl, answerRow, exampleEl, warningEl]);

    // Bind answer buttons
    row.querySelectorAll('.answer-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        _onDisguiseAnswer(check.id, btn.dataset.value);
      });
    });

    return row;
  }

  // ─── REFRAME QUESTIONS SECTION ─────────────────────────────────────────────

  function _buildReframeSection(saved) {
    const section = DomUtils.div({
      class: 'stage3-5__section',
      id   : 'reframe-section',
    });

    section.appendChild(
      DomUtils.div({ class: 'stage3-5__section-title' }, [
        DomUtils.span({}, 'Forced perspective shifts'),
        DomUtils.span({ class: 'stage3-5__section-sub' },
          'Answer each — a "yes" may reveal a transformation'
        ),
      ])
    );

    const questions = ReframeQuestions.getAll();
    const list      = DomUtils.div({ class: 'reframe-list' });

    questions.forEach(q => {
      const answer = saved.reframeAnswers?.[q.id] ?? null;
      list.appendChild(_buildReframeRow(q, answer));
    });

    section.appendChild(list);

    // Transform hints region
    section.appendChild(
      DomUtils.div({
        class: 'stage3-5__transform-hints',
        id   : 'reframe-transform-hints',
      })
    );

    if (_transformationHints.length) {
      _refreshTransformHints();
    }

    return section;
  }

  function _buildReframeRow(q, savedAnswer) {
    const row = DomUtils.div({
      class: `reframe-row ${savedAnswer ? 'reframe-row--answered' : ''}`,
      id   : `reframe-row-${q.id}`,
    });

    const qEl = DomUtils.div({ class: 'reframe-row__q' }, [
      DomUtils.div({ class: 'reframe-row__question' }, q.question),
      DomUtils.div({ class: 'reframe-row__purpose'  }, q.purpose),
    ]);

    const answerRow = DomUtils.div({ class: 'reframe-row__answers' }, [
      _buildAnswerBtn(`reframe_${q.id}`, 'yes', savedAnswer === 'yes', '✓ Yes'),
      _buildAnswerBtn(`reframe_${q.id}`, 'no',  savedAnswer === 'no',  '✗ No'),
    ]);

    const exampleEl = DomUtils.div({
      class: `reframe-row__example ${savedAnswer === 'yes' ? '' : 'hidden'}`,
      id   : `reframe-example-${q.id}`,
    }, [
      DomUtils.span({ class: 'example-label' }, 'Example: '),
      DomUtils.span({}, q.example),
    ]);

    DomUtils.append(row, [qEl, answerRow, exampleEl]);

    row.querySelectorAll('.answer-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        _onReframeAnswer(q.id, btn.dataset.value);
      });
    });

    return row;
  }

  // ─── TRANSFORMATION SECTION ────────────────────────────────────────────────

  function _buildTransformSection(saved) {
    const section = DomUtils.div({
      class: 'stage3-5__section',
      id   : 'transform-section',
    });

    section.appendChild(
      DomUtils.div({ class: 'stage3-5__section-title' }, [
        DomUtils.span({}, 'Apply a transformation'),
        DomUtils.span({ class: 'stage3-5__section-sub' },
          'Optional — only if a reframe question triggered one'
        ),
      ])
    );

    // Auto-suggested based on input/output types
    const inputTypes  = _state?.answers?.stage1?.inputTypes       ?? [];
    const outputForm  = _state?.answers?.stage2?.outputForm       ?? null;
    const optType     = _state?.answers?.stage2?.optimizationType ?? null;
    const suggested   = TransformationList.getRelevant(inputTypes, outputForm, optType);

    if (suggested.length) {
      section.appendChild(
        DomUtils.div({ class: 'stage3-5__suggested-title' },
          'Suggested based on your input/output:'
        )
      );

      const suggestedGrid = DomUtils.div({ class: 'transform-grid' });
      suggested.forEach(t => {
        suggestedGrid.appendChild(_buildTransformCard(t, saved.transformationApplied === t.id, true));
      });
      section.appendChild(suggestedGrid);
    }

    // All transformations (collapsible)
    const allGrid = DomUtils.div({ class: 'transform-grid' });
    TransformationList.getAll()
      .filter(t => !suggested.find(s => s.id === t.id))
      .forEach(t => {
        allGrid.appendChild(_buildTransformCard(t, saved.transformationApplied === t.id, false));
      });

    section.appendChild(
      DomUtils.createCollapsible('All transformations', allGrid, false)
    );

    // Selected transform detail
    section.appendChild(
      DomUtils.div({
        class: 'stage3-5__transform-detail',
        id   : 'transform-detail',
      })
    );

    if (saved.transformationApplied) {
      const detailEl = document.getElementById('transform-detail');
      if (detailEl) _renderTransformDetail(detailEl, saved.transformationApplied);
    }

    // "No transformation needed" button
    const noTransformBtn = DomUtils.btn({
      class: `no-transform-btn ${saved.transformationApplied === 'none' ? 'no-transform-btn--selected' : ''}`,
      id   : 'no-transform-btn',
    }, 'No transformation needed — proceed with current approach');

    noTransformBtn.addEventListener('click', () => _onTransformSelect('none'));
    section.appendChild(noTransformBtn);

    return section;
  }

  function _buildTransformCard(t, isSelected, isSuggested) {
    const card = DomUtils.div({
      class: `transform-card ${isSelected ? 'transform-card--selected' : ''} ${isSuggested ? 'transform-card--suggested' : ''}`,
      data : { transformId: t.id },
    }, [
      DomUtils.div({ class: 'transform-card__label'   }, t.label),
      DomUtils.div({ class: 'transform-card__tagline' }, t.tagline),
    ]);

    card.addEventListener('click', () => _onTransformSelect(t.id));
    return card;
  }

  // ─── VERIFICATION SECTION ──────────────────────────────────────────────────

  function _buildVerifySection(saved) {
    return DomUtils.div({
      class: 'stage3-5__section stage3-5__verify-section',
      id   : 'verify-section',
    });
  }

  // ─── SUMMARY SECTION ───────────────────────────────────────────────────────

  function _buildSummarySection(saved) {
    const section = DomUtils.div({
      class: 'stage3-5__section stage3-5__summary',
      id   : 'stage3-5-summary',
    });

    _renderSummary(section, saved);
    return section;
  }

  // ─── CHANGE HANDLERS ───────────────────────────────────────────────────────

  function _onDisguiseAnswer(checkId, value) {
    _disguiseAnswers[checkId] = value;

    const row = document.getElementById(`disguise-row-${checkId}`);
    if (row) {
      row.classList.toggle('disguise-row--triggered', value === 'yes');
      row.classList.add('disguise-row--answered');

      row.querySelectorAll('.answer-btn').forEach(btn => {
        btn.classList.toggle('answer-btn--selected', btn.dataset.value === value);
      });

      const exampleEl = document.getElementById(`disguise-example-${checkId}`);
      const warningEl = document.getElementById(`disguise-warning-${checkId}`);
      if (exampleEl) exampleEl.classList.toggle('hidden', value !== 'yes');
      if (warningEl) warningEl.classList.toggle('hidden', value !== 'yes');
    }

    State.setAnswer('stage3_5', {
      disguiseAnswers: { ..._disguiseAnswers },
      checked        : true,
    });

    _refreshSummary();
    _checkComplete();
  }

  function _onReframeAnswer(questionId, value) {
    _reframeAnswers[questionId] = value;

    const row = document.getElementById(`reframe-row-${questionId}`);
    if (row) {
      row.classList.toggle('reframe-row--answered', true);
      row.querySelectorAll('.answer-btn').forEach(btn => {
        btn.classList.toggle('answer-btn--selected', btn.dataset.value === value);
      });

      const exampleEl = document.getElementById(`reframe-example-${questionId}`);
      if (exampleEl) exampleEl.classList.toggle('hidden', value !== 'yes');
    }

    // Check if this question hints at a transformation
    const hint = ReframeQuestions.getTransformHint(questionId, value === 'yes');
    if (hint && !_transformationHints.includes(hint)) {
      _transformationHints.push(hint);
    } else if (value === 'no') {
      const hintForThis = ReframeQuestions.getTransformHint(questionId, true);
      if (hintForThis) {
        _transformationHints = _transformationHints.filter(h => h !== hintForThis);
      }
    }

    const allAnswered = ReframeQuestions.getAll()
      .every(q => _reframeAnswers[q.id]);

    State.setAnswer('stage3_5', {
      reframeAnswers   : { ..._reframeAnswers },
      transformationHints: [..._transformationHints],
      reframeAnswered  : allAnswered,
      checked          : true,
    });

    _refreshTransformHints();
    _refreshSummary();
    _checkComplete();
  }

  function _onTransformSelect(transformId) {
    _selectedTransform = transformId;

    // Update card states
    document.querySelectorAll('.transform-card').forEach(card => {
      card.classList.toggle(
        'transform-card--selected',
        card.dataset.transformId === transformId
      );
    });

    // Update no-transform button
    const noBtn = document.getElementById('no-transform-btn');
    if (noBtn) {
      noBtn.classList.toggle('no-transform-btn--selected', transformId === 'none');
    }

    State.setAnswer('stage3_5', {
      transformationApplied: transformId,
      checked              : true,
    });

    // Show detail + verification checklist
    const detailEl = document.getElementById('transform-detail');
    if (detailEl && transformId !== 'none') {
      _renderTransformDetail(detailEl, transformId);
    } else if (detailEl) {
      DomUtils.clearContent(detailEl);
    }

    // Show verification checklist
    _renderVerifySection(transformId);

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

  function _refreshTransformHints() {
    const container = document.getElementById('reframe-transform-hints');
    if (!container) return;
    DomUtils.clearContent(container);

    if (!_transformationHints.length) return;

    container.appendChild(
      DomUtils.div({ class: 'transform-hints-title' },
        'Transformation signals detected — consider applying:'
      )
    );

    _transformationHints.forEach(hintId => {
      const t = TransformationList.getById(hintId);
      if (!t) return;

      container.appendChild(
        DomUtils.div({ class: 'transform-hint-card' }, [
          DomUtils.span({ class: 'transform-hint-card__icon' }, '🔄'),
          DomUtils.div({ class: 'transform-hint-card__content' }, [
            DomUtils.div({ class: 'transform-hint-card__label'   }, t.label),
            DomUtils.div({ class: 'transform-hint-card__tagline' }, t.tagline),
          ]),
          DomUtils.btn(
            {
              class  : 'btn btn--ghost transform-hint-card__apply',
              onClick: () => _onTransformSelect(hintId),
            },
            'Apply →'
          ),
        ])
      );
    });
  }

  function _renderTransformDetail(container, transformId) {
    DomUtils.clearContent(container);
    const t = TransformationList.getById(transformId);
    if (!t) return;

    const detail = DomUtils.div({ class: 'transform-detail-card' }, [

      DomUtils.div({ class: 'transform-detail-card__name' }, t.label),

      DomUtils.div({ class: 'transform-detail-card__before-after' }, [
        DomUtils.div({ class: 'ba-before' }, [
          DomUtils.span({ class: 'ba-label' }, 'Before:'),
          DomUtils.span({}, t.beforeAfter.before),
        ]),
        DomUtils.div({ class: 'ba-arrow' }, '↓'),
        DomUtils.div({ class: 'ba-after' }, [
          DomUtils.span({ class: 'ba-label' }, 'After:'),
          DomUtils.span({}, t.beforeAfter.after),
        ]),
      ]),

      DomUtils.div({ class: 'transform-detail-card__opens' }, [
        DomUtils.span({ class: 'opens-label' }, 'Opens:'),
        DomUtils.div(
          { class: 'opens-list' },
          t.opens.map(o => DomUtils.span({ class: 'opened-badge' }, o))
        ),
      ]),
    ]);

    // Examples
    if (t.examples?.length) {
      const exSection = DomUtils.div({ class: 'transform-detail-card__examples' });
      t.examples.forEach(ex => {
        exSection.appendChild(
          DomUtils.div({ class: 'transform-example' }, [
            DomUtils.div({ class: 'transform-example__problem'    }, ex.problem),
            DomUtils.div({ class: 'transform-example__algorithm'  }, [
              DomUtils.span({ class: 'example-label' }, 'Algorithm: '),
              DomUtils.span({ class: 'detail-mono'   }, ex.algorithm),
            ]),
            DomUtils.div({ class: 'transform-example__complexity' }, [
              DomUtils.span({ class: 'example-label' }, 'Complexity: '),
              DomUtils.span({ class: 'detail-mono'   }, ex.complexity),
            ]),
          ])
        );
      });
      detail.appendChild(exSection);
    }

    if (t.watchOut) {
      detail.appendChild(
        DomUtils.div({ class: 'transform-detail-card__warn' }, [
          DomUtils.span({ class: 'watchout-icon' }, '⚠'),
          DomUtils.span({}, t.watchOut),
        ])
      );
    }

    container.appendChild(detail);
  }

  function _renderVerifySection(transformId) {
    const section = document.getElementById('verify-section');
    if (!section) return;
    DomUtils.clearContent(section);

    if (!transformId || transformId === 'none') return;

    const checklist = TransformationList.buildVerificationChecklist(transformId);
    if (!checklist.length) return;

    section.appendChild(
      DomUtils.div({ class: 'stage3-5__section-title' }, [
        DomUtils.span({}, 'Verify the transformation'),
        DomUtils.span({ class: 'stage3-5__section-sub' },
          'Check each step before committing'
        ),
      ])
    );

    const savedChecks = _verifyChecklist[transformId] ?? {};
    const list        = DomUtils.div({ class: 'verify-list' });

    checklist.forEach(item => {
      const isChecked = savedChecks[item.id] ?? false;

      const row = DomUtils.div({
        class: `verify-row ${isChecked ? 'verify-row--checked' : ''}`,
        id   : `verify-row-${item.id}`,
      }, [
        DomUtils.div({ class: 'verify-row__checkbox' }, [
          DomUtils.input({
            type   : 'checkbox',
            id     : `verify-cb-${item.id}`,
            class  : 'verify-checkbox',
            checked: isChecked ? true : undefined,
          }),
        ]),
        DomUtils.div({ class: 'verify-row__content' }, [
          DomUtils.div({ class: 'verify-row__num'  }, `Step ${item.step}`),
          DomUtils.div({ class: 'verify-row__text' }, item.text),
        ]),
      ]);

      const cb = row.querySelector(`#verify-cb-${item.id}`);
      if (cb) {
        cb.addEventListener('change', () => {
          _onVerifyCheck(transformId, item.id, cb.checked);
          row.classList.toggle('verify-row--checked', cb.checked);
        });
      }

      list.appendChild(row);
    });

    section.appendChild(list);

    // Progress indicator
    const checkedCount = Object.values(savedChecks).filter(Boolean).length;
    section.appendChild(
      DomUtils.div({
        class: 'verify-progress',
        id   : 'verify-progress',
      },
        `${checkedCount} / ${checklist.length} steps verified`
      )
    );
  }

  function _onVerifyCheck(transformId, itemId, checked) {
    if (!_verifyChecklist[transformId]) {
      _verifyChecklist[transformId] = {};
    }
    _verifyChecklist[transformId][itemId] = checked;

    // Update progress
    const checklist    = TransformationList.buildVerificationChecklist(transformId);
    const checkedCount = Object.values(_verifyChecklist[transformId]).filter(Boolean).length;
    const progressEl   = document.getElementById('verify-progress');
    if (progressEl) {
      progressEl.textContent = `${checkedCount} / ${checklist.length} steps verified`;
    }

    State.setAnswer('stage3_5', {
      verifyChecklist: { ..._verifyChecklist },
    });

    _checkComplete();
  }

  function _renderSummary(container, saved) {
    DomUtils.clearContent(container);

    const reframeCount  = Object.keys(saved.reframeAnswers  ?? {}).length;
    const disguiseCount = Object.keys(saved.disguiseAnswers ?? {}).length;
    const totalReframe  = ReframeQuestions.getTotal();
    const totalDisguise = DisguiseChecks.getTotal();
    const transform     = saved.transformationApplied
      ? TransformationList.getById(saved.transformationApplied)
      : null;
    const triggeredDisguises = Object.entries(saved.disguiseAnswers ?? {})
      .filter(([, v]) => v === 'yes');
    const hints = saved.transformationHints ?? [];

    if (reframeCount === 0 && disguiseCount === 0) {
      container.appendChild(
        DomUtils.div({ class: 'summary-placeholder' },
          'Answer the checks above to see reframing summary'
        )
      );
      return;
    }

    container.appendChild(
      DomUtils.div({ class: 'stage3-5__section-title' }, 'Reframing summary')
    );

    container.appendChild(
      DomUtils.div({ class: 'summary-row' }, [
        DomUtils.span({ class: 'summary-row__label' }, 'Disguise:'),
        DomUtils.span({ class: 'summary-row__value' },
          `${disguiseCount} / ${totalDisguise} checked`
        ),
      ])
    );

    container.appendChild(
      DomUtils.div({ class: 'summary-row' }, [
        DomUtils.span({ class: 'summary-row__label' }, 'Reframe:'),
        DomUtils.span({ class: 'summary-row__value' },
          `${reframeCount} / ${totalReframe} questions answered`
        ),
      ])
    );

    if (transform && saved.transformationApplied !== 'none') {
      container.appendChild(
        DomUtils.div({ class: 'summary-row' }, [
          DomUtils.span({ class: 'summary-row__label' }, 'Transform:'),
          DomUtils.span({ class: 'summary-row__value' }, transform.label),
        ])
      );
    } else if (saved.transformationApplied === 'none') {
      container.appendChild(
        DomUtils.div({ class: 'summary-row' }, [
          DomUtils.span({ class: 'summary-row__label' }, 'Transform:'),
          DomUtils.span({ class: 'summary-row__value' }, 'None — proceeding with current approach'),
        ])
      );
    }

    if (triggeredDisguises.length) {
      const warnEl = DomUtils.div({ class: 'summary-warnings' });
      triggeredDisguises.forEach(([checkId]) => {
        const check = DisguiseChecks.getById(checkId);
        if (!check) return;
        warnEl.appendChild(
          DomUtils.div({ class: 'watchout-row' }, [
            DomUtils.span({ class: 'watchout-icon' }, '⚠'),
            DomUtils.span({ class: 'watchout-text' },
              `Possible disguise: this may be ${check.actuallyIs} not ${check.looksLike}`
            ),
          ])
        );
      });
      container.appendChild(warnEl);
    }
  }

  function _refreshSummary() {
    const section = document.getElementById('stage3-5-summary');
    if (section) {
      _renderSummary(section, State.getAnswer('stage3_5') ?? {});
    }
  }

  // ─── COMPLETION CHECK ──────────────────────────────────────────────────────

  function _checkComplete() {
    const saved = State.getAnswer('stage3_5') ?? {};

    // Need: at least half reframe answered AND transformation decision made
    const reframeCount  = Object.keys(saved.reframeAnswers ?? {}).length;
    const totalReframe  = ReframeQuestions.getTotal();
    const enoughReframe = reframeCount >= Math.ceil(totalReframe / 2);
    const transformDone = !!saved.transformationApplied;

    const valid = enoughReframe && transformDone;
    Renderer.setNextEnabled(valid);

    if (valid) {
      document.dispatchEvent(new CustomEvent('dsa:stage-complete', {
        detail: {
          stageId: 'stage3_5',
          answers: {
            ...saved,
            checked         : true,
            reframeAnswered : reframeCount >= totalReframe,
            disguiseChecked : true,
          },
        },
      }));
    }
  }

  // ─── LIFECYCLE ─────────────────────────────────────────────────────────────

  function onMount(state) {
    const saved = state.answers?.stage3_5;
    if (!saved) return;

    const reframeCount = Object.keys(saved.reframeAnswers ?? {}).length;
    const totalReframe = ReframeQuestions.getTotal();

    if (
      reframeCount >= Math.ceil(totalReframe / 2) &&
      saved.transformationApplied
    ) {
      Renderer.setNextEnabled(true);
    }

    // Restore verification section
    if (saved.transformationApplied && saved.transformationApplied !== 'none') {
      _renderVerifySection(saved.transformationApplied);
    }
  }

  function cleanup() {
    _state               = null;
    _selectedTransform   = null;
    _reframeAnswers      = {};
    _disguiseAnswers     = {};
    _verifyChecklist     = {};
    _transformationHints = [];
  }

  // ─── PUBLIC ────────────────────────────────────────────────────────────────

  return { render, onMount, cleanup };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Stage3_5;
}