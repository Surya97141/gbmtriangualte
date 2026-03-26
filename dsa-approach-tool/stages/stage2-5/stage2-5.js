// stages/stage2-5/stage2-5.js
// Problem Decomposition stage — checks if problem is multi-part,
// runs reframe questions, detects implicit structures
// Module contract: render(state), onMount(state), cleanup()

const Stage2_5 = (() => {

  // ─── PRIVATE STATE ─────────────────────────────────────────────────────────

  let _state              = null;
  let _selectedPattern    = null;
  let _reframeAnswers     = {};   // reframeId → 'yes' | 'no' | null
  let _implicitAnswers    = {};   // checkId   → 'yes' | 'no' | null
  let _transformationHints = [];  // transformation ids detected

  // ─── RENDER ────────────────────────────────────────────────────────────────

  function render(state) {
    _state = state;
    const saved = state.answers?.stage2_5 ?? {};

    _selectedPattern     = saved.selectedPattern     ?? null;
    _reframeAnswers      = saved.reframeAnswers      ?? {};
    _implicitAnswers     = saved.implicitAnswers      ?? {};
    _transformationHints = saved.transformationHints ?? [];

    const likelihood = DecompositionChecks.estimateDecompositionLikelihood(
      state.answers?.stage0,
      state.answers?.stage1
    );

    const wrapper = DomUtils.div({ class: 'stage stage2-5' }, [
      _buildIntro(likelihood),
      _buildLikelihoodBanner(likelihood),
      _buildPatternSection(saved),
      _buildReframeSection(saved),
      _buildImplicitSection(saved),
      _buildTransformationSection(saved),
      _buildSummarySection(saved),
    ]);

    return wrapper;
  }

  // ─── INTRO ─────────────────────────────────────────────────────────────────

  function _buildIntro(likelihood) {
    return DomUtils.div({ class: 'stage-intro' }, [
      DomUtils.div({ class: 'stage-intro__rule' },
        'Is this one problem or multiple problems chained together?'
      ),
      DomUtils.div({ class: 'stage-intro__sub' },
        'Forcing a single approach onto a multi-part problem is the most common source of wrong architecture.'
      ),
    ]);
  }

  // ─── LIKELIHOOD BANNER ─────────────────────────────────────────────────────

  function _buildLikelihoodBanner(likelihood) {
    const level = likelihood.veryLikely ? 'high'
      : likelihood.likely ? 'medium'
      : 'low';

    return DomUtils.div({
      class: `likelihood-banner likelihood-banner--${level}`,
    }, [
      DomUtils.span({ class: 'likelihood-banner__icon' },
        level === 'high' ? '⚡' : level === 'medium' ? '~' : '○'
      ),
      DomUtils.div({ class: 'likelihood-banner__content' }, [
        DomUtils.div({ class: 'likelihood-banner__label' },
          level === 'high'   ? 'Decomposition very likely'
          : level === 'medium' ? 'Decomposition possible — check below'
          : 'Likely a single unified problem — still verify'
        ),
        DomUtils.div({ class: 'likelihood-banner__reason' }, likelihood.reason),
      ]),
    ]);
  }

  // ─── PATTERN SECTION ───────────────────────────────────────────────────────

  function _buildPatternSection(saved) {
    const section = DomUtils.div({ class: 'stage2-5__section' });

    section.appendChild(
      DomUtils.div({ class: 'stage2-5__section-title' }, [
        DomUtils.span({}, 'Which pattern best describes this problem?'),
        DomUtils.span({ class: 'stage2-5__section-sub' }, 'Pick one'),
      ])
    );

    const grid = DomUtils.div({ class: 'stage2-5__pattern-grid' });

    DecompositionChecks.getAllPatterns().forEach(pattern => {
      const isSelected = saved.selectedPattern === pattern.id;

      const card = DomUtils.div({
        class: `pattern-card ${isSelected ? 'pattern-card--selected' : ''} ${pattern.isNegative ? 'pattern-card--negative' : ''}`,
        data : { id: pattern.id },
      }, [
        DomUtils.div({ class: 'pattern-card__label' }, pattern.label),
        DomUtils.div({ class: 'pattern-card__question' }, pattern.question),
      ]);

      card.addEventListener('click', () => _onPatternSelect(pattern.id));
      grid.appendChild(card);
    });

    section.appendChild(grid);

    // Pattern detail region
    const detailRegion = DomUtils.div({
      class: 'stage2-5__pattern-detail',
      id   : 'pattern-detail-region',
    });

    if (saved.selectedPattern) {
      _renderPatternDetail(detailRegion, saved.selectedPattern);
    }

    section.appendChild(detailRegion);
    return section;
  }

  // ─── REFRAME QUESTIONS SECTION ─────────────────────────────────────────────

  function _buildReframeSection(saved) {
    const section = DomUtils.div({
      class: 'stage2-5__section',
      id   : 'reframe-section',
    });

    section.appendChild(
      DomUtils.div({ class: 'stage2-5__section-title' }, [
        DomUtils.span({}, 'Forced perspective shifts'),
        DomUtils.span({ class: 'stage2-5__section-sub' },
          'Answer each before committing to any direction'
        ),
      ])
    );

    section.appendChild(
      DomUtils.div({ class: 'stage2-5__reframe-note' },
        'These questions force you to look at the problem from 8 different angles. ' +
        'A "yes" may reveal a hidden structure or transformation.'
      )
    );

    const list = DomUtils.div({ class: 'reframe-list' });

    DecompositionChecks.getReframeQuestions().forEach(rq => {
      const answer = saved.reframeAnswers?.[rq.id] ?? null;
      list.appendChild(_buildReframeRow(rq, answer));
    });

    section.appendChild(list);

    // Transformation hints region
    section.appendChild(
      DomUtils.div({
        class: 'stage2-5__transform-hints',
        id   : 'reframe-transform-hints',
      })
    );

    if (saved.transformationHints?.length) {
      _refreshTransformationHints();
    }

    return section;
  }

  function _buildReframeRow(rq, savedAnswer) {
    const row = DomUtils.div({
      class: `reframe-row ${savedAnswer ? 'reframe-row--answered' : ''}`,
      id   : `reframe-row-${rq.id}`,
    });

    const qEl = DomUtils.div({ class: 'reframe-row__q' }, [
      DomUtils.div({ class: 'reframe-row__question' }, rq.question),
      DomUtils.div({ class: 'reframe-row__purpose'  }, rq.purpose),
    ]);

    const answerRow = DomUtils.div({ class: 'reframe-row__answers' }, [
      _buildAnswerBtn(rq.id, 'yes', savedAnswer === 'yes', '✓ Yes'),
      _buildAnswerBtn(rq.id, 'no',  savedAnswer === 'no',  '✗ No'),
    ]);

    // Example region
    const exampleEl = DomUtils.div({
      class: `reframe-row__example ${savedAnswer === 'yes' ? '' : 'hidden'}`,
      id   : `reframe-example-${rq.id}`,
    }, [
      DomUtils.span({ class: 'example-label' }, 'Example: '),
      DomUtils.span({}, rq.example),
    ]);

    DomUtils.append(row, [qEl, answerRow, exampleEl]);
    return row;
  }

  function _buildAnswerBtn(reframeId, value, isSelected, label) {
    const btn = DomUtils.btn({
      class: `answer-btn answer-btn--${value} ${isSelected ? 'answer-btn--selected' : ''}`,
      data : { reframeId, value },
    }, label);

    btn.addEventListener('click', () => _onReframeAnswer(reframeId, value));
    return btn;
  }

  // ─── IMPLICIT STRUCTURE SECTION ────────────────────────────────────────────

  function _buildImplicitSection(saved) {
    const section = DomUtils.div({
      class: 'stage2-5__section',
      id   : 'implicit-section',
    });

    section.appendChild(
      DomUtils.div({ class: 'stage2-5__section-title' }, [
        DomUtils.span({}, 'Hidden structure checks'),
        DomUtils.span({ class: 'stage2-5__section-sub' },
          'Yes on any of these changes the approach entirely'
        ),
      ])
    );

    const list = DomUtils.div({ class: 'implicit-list' });

    DecompositionChecks.getImplicitChecks().forEach(ic => {
      const answer = saved.implicitAnswers?.[ic.id] ?? null;
      list.appendChild(_buildImplicitRow(ic, answer));
    });

    section.appendChild(list);
    return section;
  }

  function _buildImplicitRow(ic, savedAnswer) {
    const row = DomUtils.div({
      class: `implicit-row ${savedAnswer === 'yes' ? 'implicit-row--triggered' : ''}`,
      id   : `implicit-row-${ic.id}`,
    });

    const qEl = DomUtils.div({ class: 'implicit-row__check' }, ic.check);

    const answerRow = DomUtils.div({ class: 'implicit-row__answers' }, [
      _buildImplicitBtn(ic.id, 'yes', savedAnswer === 'yes', '✓ Yes'),
      _buildImplicitBtn(ic.id, 'no',  savedAnswer === 'no',  '✗ No'),
    ]);

    const ifYesEl = DomUtils.div({
      class: `implicit-row__ifyes ${savedAnswer === 'yes' ? '' : 'hidden'}`,
      id   : `implicit-ifyes-${ic.id}`,
    }, [
      DomUtils.div({ class: 'ifyes-arrow' }, '→'),
      DomUtils.div({ class: 'ifyes-text'  }, ic.ifYes),
      DomUtils.div({ class: 'ifyes-example' }, `e.g. ${ic.example}`),
    ]);

    DomUtils.append(row, [qEl, answerRow, ifYesEl]);
    return row;
  }

  function _buildImplicitBtn(checkId, value, isSelected, label) {
    const btn = DomUtils.btn({
      class: `answer-btn answer-btn--${value} ${isSelected ? 'answer-btn--selected' : ''}`,
      data : { checkId, value },
    }, label);

    btn.addEventListener('click', () => _onImplicitAnswer(checkId, value));
    return btn;
  }

  // ─── TRANSFORMATION SECTION ────────────────────────────────────────────────

  function _buildTransformationSection(saved) {
    return DomUtils.div({
      class: 'stage2-5__section',
      id   : 'transformation-verify-section',
    });
  }

  // ─── SUMMARY SECTION ───────────────────────────────────────────────────────

  function _buildSummarySection(saved) {
    const section = DomUtils.div({
      class: 'stage2-5__section stage2-5__summary',
      id   : 'stage2-5-summary',
    });

    _renderSummary(section, saved);
    return section;
  }

  // ─── CHANGE HANDLERS ───────────────────────────────────────────────────────

  function _onPatternSelect(patternId) {
    _selectedPattern = patternId;

    document.querySelectorAll('.pattern-card').forEach(card => {
      card.classList.toggle('pattern-card--selected', card.dataset.id === patternId);
    });

    const detailRegion = document.getElementById('pattern-detail-region');
    if (detailRegion) _renderPatternDetail(detailRegion, patternId);

    const pattern     = DecompositionChecks.getPatternById(patternId);
    const isDecomposed = pattern && !pattern.isNegative;

    State.setAnswer('stage2_5', {
      selectedPattern: patternId,
      isDecomposed,
      checked        : true,
      subproblems    : isDecomposed
        ? DecompositionChecks.buildSubproblems(patternId)
        : [],
    });

    _refreshSummary();
    _checkComplete();
  }

  function _onReframeAnswer(reframeId, value) {
    _reframeAnswers[reframeId] = value;

    // Update row UI
    const row = document.getElementById(`reframe-row-${reframeId}`);
    if (row) {
      row.classList.toggle('reframe-row--answered', true);
      row.querySelectorAll('.answer-btn').forEach(btn => {
        btn.classList.toggle(
          'answer-btn--selected',
          btn.dataset.value === value
        );
      });

      // Show example on yes
      const exampleEl = document.getElementById(`reframe-example-${reframeId}`);
      if (exampleEl) {
        exampleEl.classList.toggle('hidden', value !== 'yes');
      }
    }

    // Check for transformation hint
    const hint = DecompositionChecks.getTransformationHint(reframeId, value === 'yes');
    if (hint && !_transformationHints.includes(hint)) {
      _transformationHints.push(hint);
    } else if (!hint || value !== 'yes') {
      _transformationHints = _transformationHints.filter(h => {
        const hintForThis = DecompositionChecks.getTransformationHint(reframeId, true);
        return h !== hintForThis;
      });
    }

    const allAnswered = DecompositionChecks.getReframeQuestions()
      .every(rq => _reframeAnswers[rq.id]);

    State.setAnswer('stage2_5', {
      reframeAnswers   : { ..._reframeAnswers },
      transformationHints: [..._transformationHints],
      reframeAnswered  : allAnswered,
    });

    _refreshTransformationHints();
    _refreshSummary();
    _checkComplete();
  }

  function _onImplicitAnswer(checkId, value) {
    _implicitAnswers[checkId] = value;

    const row = document.getElementById(`implicit-row-${checkId}`);
    if (row) {
      row.classList.toggle('implicit-row--triggered', value === 'yes');
      row.querySelectorAll('.answer-btn').forEach(btn => {
        btn.classList.toggle(
          'answer-btn--selected',
          btn.dataset.value === value
        );
      });

      const ifYesEl = document.getElementById(`implicit-ifyes-${checkId}`);
      if (ifYesEl) {
        ifYesEl.classList.toggle('hidden', value !== 'yes');
      }
    }

    State.setAnswer('stage2_5', {
      implicitAnswers: { ..._implicitAnswers },
      hiddenStructureChecked: true,
    });

    _refreshSummary();
    _checkComplete();
  }

  // ─── RENDER HELPERS ────────────────────────────────────────────────────────

  function _renderPatternDetail(container, patternId) {
    DomUtils.clearContent(container);
    const pattern = DecompositionChecks.getPatternById(patternId);
    if (!pattern) return;

    if (pattern.isNegative) {
      container.appendChild(
        DomUtils.div({ class: 'pattern-detail pattern-detail--single' }, [
          DomUtils.div({ class: 'pattern-detail__impl' }, pattern.implication),
          DomUtils.div({ class: 'pattern-detail__note' },
            'Proceed to Stage 3 structural analysis as a single unified problem.'
          ),
        ])
      );
      return;
    }

    const detail = DomUtils.div({ class: 'pattern-detail' });

    // Yes signal
    detail.appendChild(
      DomUtils.div({ class: 'pattern-detail__signal' }, [
        DomUtils.span({ class: 'signal-label' }, 'Signal: '),
        DomUtils.span({}, pattern.yesSignal),
      ])
    );

    // Implication
    detail.appendChild(
      DomUtils.div({ class: 'pattern-detail__impl' }, pattern.implication)
    );

    // Examples
    if (pattern.examples?.length) {
      const exList = DomUtils.div({ class: 'pattern-detail__examples' }, [
        DomUtils.div({ class: 'pattern-detail__ex-title' }, 'Examples:'),
      ]);
      pattern.examples.forEach(ex => {
        exList.appendChild(
          DomUtils.div({ class: 'pattern-detail__ex' }, [
            DomUtils.span({ class: 'ex-bullet' }, '·'),
            DomUtils.span({}, ex),
          ])
        );
      });
      detail.appendChild(exList);
    }

    // Subproblems
    if (pattern.subproblems?.length) {
      const subList = DomUtils.div({ class: 'pattern-detail__subproblems' }, [
        DomUtils.div({ class: 'pattern-detail__sub-title' },
          'Sub-problems to analyze separately:'
        ),
      ]);
      pattern.subproblems.forEach((sub, idx) => {
        subList.appendChild(
          DomUtils.div({ class: 'subproblem-chip' }, [
            DomUtils.span({ class: 'subproblem-chip__num' }, `${idx + 1}`),
            DomUtils.span({ class: 'subproblem-chip__label' }, sub),
          ])
        );
      });
      detail.appendChild(subList);
    }

    container.appendChild(detail);
  }

  function _refreshTransformationHints() {
    const container = document.getElementById('reframe-transform-hints');
    if (!container) return;
    DomUtils.clearContent(container);

    if (!_transformationHints.length) return;

    container.appendChild(
      DomUtils.div({ class: 'transform-hints-title' },
        'Transformation signals detected'
      )
    );

    _transformationHints.forEach(hintId => {
      container.appendChild(
        DomUtils.div({ class: 'transform-hint-card' }, [
          DomUtils.span({ class: 'transform-hint-card__icon' }, '🔄'),
          DomUtils.span({ class: 'transform-hint-card__text' },
            `Consider transformation: ${hintId.replace(/_/g, ' ')}`
          ),
          DomUtils.span({ class: 'transform-hint-card__note' },
            'Will be explored in detail in Stage 3.5'
          ),
        ])
      );
    });
  }

  function _renderSummary(container, saved) {
    DomUtils.clearContent(container);

    const pattern      = saved.selectedPattern
      ? DecompositionChecks.getPatternById(saved.selectedPattern)
      : null;
    const reframeCount = Object.keys(saved.reframeAnswers ?? {}).length;
    const totalReframe = DecompositionChecks.getReframeQuestions().length;
    const yesImplicit  = Object.entries(saved.implicitAnswers ?? {})
      .filter(([, v]) => v === 'yes');
    const hints        = saved.transformationHints ?? [];

    if (!pattern && reframeCount === 0) {
      container.appendChild(
        DomUtils.div({ class: 'summary-placeholder' },
          'Select a decomposition pattern and answer the reframe questions to see summary'
        )
      );
      return;
    }

    container.appendChild(
      DomUtils.div({ class: 'stage2-5__section-title' }, 'Decomposition summary')
    );

    // Pattern
    if (pattern) {
      container.appendChild(
        DomUtils.div({ class: 'summary-row' }, [
          DomUtils.span({ class: 'summary-row__label' }, 'Pattern:'),
          DomUtils.span({ class: 'summary-row__value' }, pattern.label),
        ])
      );

      if (!pattern.isNegative && pattern.subproblems?.length) {
        container.appendChild(
          DomUtils.div({ class: 'summary-row' }, [
            DomUtils.span({ class: 'summary-row__label' }, 'Sub-problems:'),
            DomUtils.span({ class: 'summary-row__value' },
              pattern.subproblems.join(' → ')
            ),
          ])
        );
      }
    }

    // Reframe progress
    container.appendChild(
      DomUtils.div({ class: 'summary-row' }, [
        DomUtils.span({ class: 'summary-row__label' }, 'Reframe:'),
        DomUtils.span({ class: 'summary-row__value' },
          `${reframeCount} / ${totalReframe} questions answered`
        ),
      ])
    );

    // Triggered implicit structures
    if (yesImplicit.length) {
      container.appendChild(
        DomUtils.div({ class: 'summary-triggered' }, [
          DomUtils.div({ class: 'summary-triggered__title' },
            'Hidden structures detected:'
          ),
          ...yesImplicit.map(([checkId]) => {
            const ic = DecompositionChecks.getImplicitChecks()
              .find(c => c.id === checkId);
            return DomUtils.div({ class: 'triggered-item' }, [
              DomUtils.span({ class: 'triggered-item__icon' }, '!'),
              DomUtils.span({ class: 'triggered-item__text' },
                ic?.ifYes ?? checkId
              ),
            ]);
          }),
        ])
      );
    }

    // Transformation hints
    if (hints.length) {
      container.appendChild(
        DomUtils.div({ class: 'summary-row' }, [
          DomUtils.span({ class: 'summary-row__label' }, 'Transforms:'),
          DomUtils.span({ class: 'summary-row__value' },
            hints.map(h => h.replace(/_/g, ' ')).join(', ')
          ),
        ])
      );
    }
  }

  function _refreshSummary() {
    const section = document.getElementById('stage2-5-summary');
    if (section) {
      _renderSummary(section, State.getAnswer('stage2_5') ?? {});
    }
  }

  // ─── COMPLETION CHECK ──────────────────────────────────────────────────────

  function _checkComplete() {
    // Complete when:
    // 1. Pattern selected AND
    // 2. At least half of reframe questions answered
    const saved        = State.getAnswer('stage2_5') ?? {};
    const hasPattern   = !!saved.selectedPattern;
    const reframeCount = Object.keys(saved.reframeAnswers ?? {}).length;
    const totalReframe = DecompositionChecks.getReframeQuestions().length;
    const enoughReframe = reframeCount >= Math.ceil(totalReframe / 2);

    const valid = hasPattern && enoughReframe;
    Renderer.setNextEnabled(valid);

    if (valid) {
      document.dispatchEvent(new CustomEvent('dsa:stage-complete', {
        detail: {
          stageId: 'stage2_5',
          answers: {
            ...saved,
            checked: true,
          },
        },
      }));
    }
  }

  // ─── LIFECYCLE ─────────────────────────────────────────────────────────────

  function onMount(state) {
    const saved = state.answers?.stage2_5;
    if (saved?.selectedPattern) {
      const reframeCount = Object.keys(saved.reframeAnswers ?? {}).length;
      const total        = DecompositionChecks.getReframeQuestions().length;
      if (reframeCount >= Math.ceil(total / 2)) {
        Renderer.setNextEnabled(true);
      }
    }
  }

  function cleanup() {
    _state               = null;
    _selectedPattern     = null;
    _reframeAnswers      = {};
    _implicitAnswers     = {};
    _transformationHints = [];
  }

  // ─── PUBLIC ────────────────────────────────────────────────────────────────

  return { render, onMount, cleanup };

})();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Stage2_5;
}
