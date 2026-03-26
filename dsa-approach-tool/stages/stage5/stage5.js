// stages/stage5/stage5.js
// Verification Challenges stage — routes to relevant verifiers based on
// candidate directions identified in Stage 3
// Module contract: render(state), onMount(state), cleanup()

const Stage5 = (() => {

  // ─── PRIVATE STATE ─────────────────────────────────────────────────────────

  let _state          = null;
  let _verifierStates = {}; // verifierId → { answers, result }

  // ─── ACTIVE VERIFIERS ─────────────────────────────────────────────────────

  // Determine which verifiers to show based on directions
  function _getActiveVerifiers(state) {
    const directions = state?.output?.directions ?? [];
    const active     = [];

    const families = directions.map(d => d.family ?? d.id ?? '');

    const isGreedy  = families.some(f => f.includes('greedy'));
    const isBS      = families.some(f => f.includes('binary_search'));
    const isDP      = families.some(f => f.includes('dp'));
    const isGraph   = families.some(f => f.includes('graph'));

    if (isGreedy) active.push({
      id    : 'greedy',
      label : 'Greedy counter-example test',
      mod   : GreedyVerifier,
      icon  : '⚡',
      color : 'yellow',
    });

    if (isBS) active.push({
      id    : 'monotonicity',
      label : 'Monotonicity verification',
      mod   : MonotonicityVerifier,
      icon  : '↗',
      color : 'blue',
    });

    if (isDP) active.push({
      id    : 'dp_state',
      label : 'DP state verification',
      mod   : DPStateVerifier,
      icon  : '⬡',
      color : 'blue',
    });

    if (isGraph) active.push({
      id    : 'graph',
      label : 'Graph property verification',
      mod   : GraphVerifier,
      icon  : '◉',
      color : 'pur',
    });

    // Keyword crosscheck always included
    active.push({
      id    : 'keyword',
      label : 'Keyword cross-check',
      mod   : KeywordCrosscheck,
      icon  : '🔍',
      color : 'gray',
    });

    return active;
  }

  // ─── RENDER ────────────────────────────────────────────────────────────────

  function render(state) {
    _state = state;
    const saved = state.answers?.stage5 ?? {};

    _verifierStates = saved.verifierStates ?? {};

    const activeVerifiers = _getActiveVerifiers(state);

    const wrapper = DomUtils.div({ class: 'stage stage5' }, [
      _buildIntro(activeVerifiers),
      _buildVerifierTabs(activeVerifiers, saved),
      _buildVerifierPanels(activeVerifiers, saved),
      _buildSummarySection(saved),
    ]);

    return wrapper;
  }

  // ─── INTRO ─────────────────────────────────────────────────────────────────

  function _buildIntro(activeVerifiers) {
    return DomUtils.div({ class: 'stage-intro' }, [
      DomUtils.div({ class: 'stage-intro__rule' },
        'Verify before coding — structural analysis is not enough.'
      ),
      DomUtils.div({ class: 'stage-intro__sub' },
        `${activeVerifiers.length} verifier(s) active based on your candidate directions.`
      ),
    ]);
  }

  // ─── VERIFIER TABS ────────────────────────────────────────────────────────

  function _buildVerifierTabs(activeVerifiers, saved) {
    const tabBar = DomUtils.div({
      class: 'stage5__tab-bar',
      id   : 'stage5-tab-bar',
    });

    activeVerifiers.forEach((v, idx) => {
      const isDone    = _isVerifierDone(v.id, saved);
      const isActive  = idx === 0;

      const tab = DomUtils.div({
        class: `s5-tab ${isActive ? 's5-tab--active' : ''} ${isDone ? 's5-tab--done' : ''}`,
        data : { verifierId: v.id },
      }, [
        DomUtils.span({ class: 's5-tab__icon' }, v.icon),
        DomUtils.span({ class: 's5-tab__label' }, v.label),
        isDone
          ? DomUtils.span({ class: 's5-tab__check' }, '✓')
          : null,
      ].filter(Boolean));

      tab.addEventListener('click', () => _switchTab(v.id, activeVerifiers));
      tabBar.appendChild(tab);
    });

    return tabBar;
  }

  // ─── VERIFIER PANELS ──────────────────────────────────────────────────────

  function _buildVerifierPanels(activeVerifiers, saved) {
    const panelsWrap = DomUtils.div({
      class: 'stage5__panels',
      id   : 'stage5-panels',
    });

    activeVerifiers.forEach((v, idx) => {
      const panel = DomUtils.div({
        class: `s5-panel ${idx === 0 ? 's5-panel--active' : 'hidden'}`,
        id   : `panel-${v.id}`,
      });

      panel.appendChild(_buildVerifierPanel(v, saved));
      panelsWrap.appendChild(panel);
    });

    return panelsWrap;
  }

  function _buildVerifierPanel(verifier, saved) {
    const vState = saved.verifierStates?.[verifier.id] ?? {};

    switch (verifier.id) {
      case 'greedy'     : return _buildGreedyPanel(vState);
      case 'monotonicity': return _buildMonotonicityPanel(vState);
      case 'dp_state'   : return _buildDPStatePanel(vState);
      case 'graph'      : return _buildGraphPanel(vState);
      case 'keyword'    : return _buildKeywordPanel(vState);
      default           : return DomUtils.div({}, `Unknown verifier: ${verifier.id}`);
    }
  }

  // ─── GREEDY PANEL ─────────────────────────────────────────────────────────

  function _buildGreedyPanel(vState) {
    const panel = DomUtils.div({ class: 's5-verifier-panel' });

    const framework = GreedyVerifier.getFramework();

    panel.appendChild(
      DomUtils.div({ class: 's5-panel-title' }, [
        DomUtils.span({ class: 's5-panel-title__text' }, 'Greedy Counter-Example Test'),
        DomUtils.span({ class: 's5-panel-title__sub'  },
          'State the rule clearly. Try to break it with a small adversarial input.'
        ),
      ])
    );

    // Step 1 — greedy rule input
    panel.appendChild(_buildTextInput({
      id         : 'greedy-rule-input',
      label      : 'State your greedy rule in one sentence:',
      placeholder: 'At each step, I always pick ___',
      saved      : vState.greedyRule ?? '',
      onChange   : (val) => _onGreedyRuleChange(val),
    }));

    // Framework steps 2-5
    const stepsEl = DomUtils.div({ class: 's5-steps' });
    framework.steps.slice(1).forEach(step => {
      stepsEl.appendChild(
        DomUtils.div({ class: 's5-step' }, [
          DomUtils.div({ class: 's5-step__num'    }, `Step ${step.step}`),
          DomUtils.div({ class: 's5-step__label'  }, step.label),
          DomUtils.div({ class: 's5-step__desc'   }, step.desc),
          DomUtils.div({ class: 's5-step__example'}, [
            DomUtils.span({ class: 'example-label' }, 'e.g. '),
            DomUtils.span({}, step.example),
          ]),
        ])
      );
    });
    panel.appendChild(stepsEl);

    // Verdict buttons
    panel.appendChild(
      DomUtils.div({ class: 's5-verdict-section' }, [
        DomUtils.div({ class: 's5-verdict-label' },
          'After testing — what did you find?'
        ),
        DomUtils.div({ class: 's5-verdict-btns' }, [
          _buildVerdictBtn('greedy', 'found',
            '✗ Counter-example FOUND — greedy fails',
            vState.verdict === 'found', 'red'
          ),
          _buildVerdictBtn('greedy', 'not_found',
            '✓ No counter-example found — greedy holds',
            vState.verdict === 'not_found', 'green'
          ),
        ]),
      ])
    );

    // Result card
    if (vState.verdict) {
      panel.appendChild(_buildGreedyResultCard(vState.verdict));
    }

    // Common traps
    panel.appendChild(
      DomUtils.createCollapsible(
        'Common greedy traps',
        _buildTrapsList(),
        false
      )
    );

    return panel;
  }

  function _buildGreedyResultCard(verdict) {
    const isFound = verdict === 'found';
    return DomUtils.div({
      class: `s5-result-card s5-result-card--${isFound ? 'fail' : 'pass'}`,
    }, [
      DomUtils.div({ class: 's5-result-card__icon'    }, isFound ? '✗' : '✓'),
      DomUtils.div({ class: 's5-result-card__message' },
        isFound
          ? 'Greedy FAILS — use Dynamic Programming instead'
          : 'Greedy likely correct — proceed but verify formally if possible'
      ),
    ]);
  }

  function _buildTrapsList() {
    const list = DomUtils.div({ class: 's5-traps-list' });
    GreedyVerifier.getCommonTraps().forEach(trap => {
      list.appendChild(
        DomUtils.div({ class: 's5-trap-item' }, [
          DomUtils.div({ class: 's5-trap-item__label'   }, trap.label),
          DomUtils.div({ class: 's5-trap-item__trap'    }, trap.trap),
          DomUtils.div({ class: 's5-trap-item__test'    }, [
            DomUtils.span({ class: 'test-label' }, 'Test: '),
            DomUtils.span({}, trap.test),
          ]),
          DomUtils.div({ class: 's5-trap-item__verdict' }, trap.verdict),
        ])
      );
    });
    return list;
  }

  // ─── MONOTONICITY PANEL ───────────────────────────────────────────────────

  function _buildMonotonicityPanel(vState) {
    const panel = DomUtils.div({ class: 's5-verifier-panel' });

    panel.appendChild(
      DomUtils.div({ class: 's5-panel-title' }, [
        DomUtils.span({ class: 's5-panel-title__text' }, 'Monotonicity Verification'),
        DomUtils.span({ class: 's5-panel-title__sub'  },
          'Confirm isFeasible(X) is monotone before writing Binary Search.'
        ),
      ])
    );

    // Framework steps
    const framework = MonotonicityVerifier.getFramework();
    const stepsEl   = DomUtils.div({ class: 's5-steps' });

    framework.steps.forEach(step => {
      stepsEl.appendChild(
        DomUtils.div({ class: 's5-step' }, [
          DomUtils.div({ class: 's5-step__num'    }, `Step ${step.step}`),
          DomUtils.div({ class: 's5-step__label'  }, step.label),
          DomUtils.div({ class: 's5-step__desc'   }, step.desc),
          DomUtils.div({ class: 's5-step__example'}, [
            DomUtils.span({ class: 'example-label' }, 'e.g. '),
            DomUtils.span({}, step.example),
          ]),
        ])
      );
    });
    panel.appendChild(stepsEl);

    // Direction selection
    panel.appendChild(
      DomUtils.div({ class: 's5-direction-select' }, [
        DomUtils.div({ class: 's5-direction-select__label' },
          'Are you minimizing or maximizing?'
        ),
        DomUtils.div({ class: 's5-direction-select__btns' },
          MonotonicityVerifier.getDirectionTemplates().map(t =>
            _buildVerdictBtn('mono_direction', t.id,
              t.label,
              vState.direction === t.id, 'blue'
            )
          )
        ),
      ])
    );

    // Verdict buttons
    panel.appendChild(
      DomUtils.div({ class: 's5-verdict-section' }, [
        DomUtils.div({ class: 's5-verdict-label' }, 'Is isFeasible(X) monotone?'),
        DomUtils.div({ class: 's5-verdict-btns'  }, [
          _buildVerdictBtn('monotonicity', 'yes',
            '✓ Yes — monotone, Binary Search is valid',
            vState.verdict === 'yes', 'green'
          ),
          _buildVerdictBtn('monotonicity', 'no',
            '✗ No — NOT monotone, Binary Search will fail',
            vState.verdict === 'no', 'red'
          ),
        ]),
      ])
    );

    if (vState.verdict === 'yes' && vState.direction) {
      const tmpl = MonotonicityVerifier.getDirectionTemplates()
        .find(t => t.id === vState.direction);
      if (tmpl) {
        panel.appendChild(
          DomUtils.createCollapsible(
            'Binary Search template',
            DomUtils.el('pre', { class: 's5-code-template' }, tmpl.template),
            true
          )
        );
      }
    }

    return panel;
  }

  // ─── DP STATE PANEL ───────────────────────────────────────────────────────

  function _buildDPStatePanel(vState) {
    const panel  = DomUtils.div({ class: 's5-verifier-panel' });
    const checks = DPStateVerifier.getChecks();

    panel.appendChild(
      DomUtils.div({ class: 's5-panel-title' }, [
        DomUtils.span({ class: 's5-panel-title__text' }, 'DP State Verification'),
        DomUtils.span({ class: 's5-panel-title__sub'  },
          'Confirm state is complete (captures all info) and non-redundant.'
        ),
      ])
    );

    const checklist = DomUtils.div({ class: 's5-dp-checklist' });

    checks.forEach(check => {
      const savedAnswer = vState.checkAnswers?.[check.id];

      const item = DomUtils.div({
        class: `s5-dp-check-item ${savedAnswer ? 's5-dp-check-item--answered' : ''}`,
        id   : `dp-check-${check.id}`,
      }, [
        DomUtils.div({ class: 's5-dp-check-item__header' }, [
          DomUtils.div({ class: 's5-dp-check-item__label'   }, check.label),
          DomUtils.div({ class: 's5-dp-check-item__question'}, check.question),
        ]),
        DomUtils.div({ class: 's5-dp-check-item__example' }, [
          DomUtils.div({ class: 'example-label' }, 'Example:'),
          DomUtils.div({ class: 's5-check-example-content' },
            check.example.badState
              ? `Bad: ${check.example.badState} → Good: ${check.example.goodState}`
              : check.example.fix ?? ''
          ),
        ]),
        DomUtils.div({ class: 's5-dp-check-item__btns' }, [
          _buildVerdictBtn(`dp_check_${check.id}`, 'pass',
            '✓ Pass', savedAnswer === 'pass', 'green'
          ),
          _buildVerdictBtn(`dp_check_${check.id}`, 'fail',
            '✗ Issue found', savedAnswer === 'fail', 'red'
          ),
        ]),
      ]);

      item.querySelectorAll('.verdict-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          _onDPCheckAnswer(check.id, btn.dataset.value);
        });
      });

      checklist.appendChild(item);
    });

    panel.appendChild(checklist);

    if (vState.checkAnswers) {
      const allAnswered = checks.every(c => vState.checkAnswers[c.id]);
      if (allAnswered) {
        const result = DPStateVerifier.buildResult(
          checks.map(c => ({
            checkId: c.id,
            passed : vState.checkAnswers[c.id] === 'pass',
          }))
        );
        panel.appendChild(_buildDPResultCard(result));
      }
    }

    return panel;
  }

  function _buildDPResultCard(result) {
    const card = DomUtils.div({
      class: `s5-result-card s5-result-card--${result.allPassed ? 'pass' : 'warn'}`,
    }, [
      DomUtils.div({ class: 's5-result-card__icon'    }, result.allPassed ? '✓' : '~'),
      DomUtils.div({ class: 's5-result-card__message' }, result.verdict.message),
    ]);

    if (!result.allPassed && result.recommendations?.length) {
      const recEl = DomUtils.div({ class: 's5-result-card__recs' });
      result.recommendations.forEach(r => {
        recEl.appendChild(
          DomUtils.div({ class: 'watchout-row' }, [
            DomUtils.span({ class: 'watchout-icon' }, '→'),
            DomUtils.span({ class: 'watchout-text' }, r),
          ])
        );
      });
      card.appendChild(recEl);
    }

    return card;
  }

  // ─── GRAPH PANEL ──────────────────────────────────────────────────────────

  function _buildGraphPanel(vState) {
    const panel  = DomUtils.div({ class: 's5-verifier-panel' });
    const checks = GraphVerifier.getChecks();

    panel.appendChild(
      DomUtils.div({ class: 's5-panel-title' }, [
        DomUtils.span({ class: 's5-panel-title__text' }, 'Graph Property Verification'),
        DomUtils.span({ class: 's5-panel-title__sub'  },
          'Confirm graph type before choosing algorithm.'
        ),
      ])
    );

    checks.forEach(check => {
      const savedAnswer = vState.checkAnswers?.[check.id];
      const section = DomUtils.div({
        class: 's5-graph-check',
        id   : `graph-check-${check.id}`,
      });

      section.appendChild(
        DomUtils.div({ class: 's5-graph-check__question' }, check.question)
      );
      section.appendChild(
        DomUtils.div({ class: 's5-graph-check__why' }, check.why)
      );

      const optionsEl = DomUtils.div({ class: 's5-graph-check__options' });
      check.options.forEach(opt => {
        const optCard = DomUtils.div({
          class: `s5-graph-option ${savedAnswer === opt.id ? 's5-graph-option--selected' : ''}`,
          data : { checkId: check.id, optionId: opt.id },
        }, [
          DomUtils.div({ class: 's5-graph-option__label'      }, opt.label),
          DomUtils.div({ class: 's5-graph-option__implication'}, opt.implication),
        ]);

        optCard.addEventListener('click', () => {
          _onGraphCheckAnswer(check.id, opt.id);
        });

        optionsEl.appendChild(optCard);
      });

      section.appendChild(optionsEl);
      panel.appendChild(section);
    });

    if (vState.algorithmRecommendation) {
      panel.appendChild(
        DomUtils.div({ class: 's5-graph-recommendation' }, [
          DomUtils.span({ class: 'rec-label' }, 'Recommended algorithm: '),
          DomUtils.span({ class: 's5-graph-rec-value detail-mono' },
            vState.algorithmRecommendation
          ),
        ])
      );
    }

    return panel;
  }

  // ─── KEYWORD PANEL ────────────────────────────────────────────────────────

  function _buildKeywordPanel(vState) {
    const panel = DomUtils.div({ class: 's5-verifier-panel' });

    panel.appendChild(
      DomUtils.div({ class: 's5-panel-title' }, [
        DomUtils.span({ class: 's5-panel-title__text' }, 'Keyword Cross-Check'),
        DomUtils.span({ class: 's5-panel-title__sub'  },
          'Warning only — takes 30 seconds. Catches late misidentifications.'
        ),
      ])
    );

    // Text input for problem statement
    panel.appendChild(_buildTextInput({
      id         : 'keyword-text-input',
      label      : 'Paste key phrases from the problem statement:',
      placeholder: 'e.g. minimum path, connected components, subarray sum...',
      saved      : vState.problemText ?? '',
      onChange   : (val) => _onKeywordTextChange(val),
    }));

    // Keyword matches region
    panel.appendChild(
      DomUtils.div({
        class: 's5-keyword-matches',
        id   : 'keyword-matches-region',
      })
    );

    if (vState.problemText) {
      _refreshKeywordMatches(vState.problemText);
    }

    // Manual override — user confirms no mismatch
    panel.appendChild(
      DomUtils.div({ class: 's5-verdict-section' }, [
        DomUtils.div({ class: 's5-verdict-label' },
          'Are you satisfied language matches your approach?'
        ),
        DomUtils.div({ class: 's5-verdict-btns' }, [
          _buildVerdictBtn('keyword', 'confirmed',
            '✓ Yes — language and approach align',
            vState.verdict === 'confirmed', 'green'
          ),
          _buildVerdictBtn('keyword', 'mismatch',
            '⚠ Possible mismatch — need to reconsider',
            vState.verdict === 'mismatch', 'yellow'
          ),
        ]),
      ])
    );

    return panel;
  }

  function _refreshKeywordMatches(text) {
    const container = document.getElementById('keyword-matches-region');
    if (!container) return;
    DomUtils.clearContent(container);

    if (!text.trim()) return;

    const matches    = KeywordCrosscheck.scanProblemText(text);
    const directions = _state?.output?.directions ?? [];
    const report     = KeywordCrosscheck.buildReport(matches, directions);

    if (!matches.length) {
      container.appendChild(
        DomUtils.div({ class: 's5-keyword-empty' },
          'No recognized keyword signals found'
        )
      );
      return;
    }

    matches.forEach(m => {
      container.appendChild(
        DomUtils.div({ class: 's5-keyword-match' }, [
          DomUtils.div({ class: 's5-keyword-match__kws' },
            m.keywords.join(', ')
          ),
          DomUtils.div({ class: 's5-keyword-match__note' }, m.note),
        ])
      );
    });

    if (report.mismatches.length) {
      report.mismatches.forEach(mm => {
        container.appendChild(
          DomUtils.div({ class: 's5-keyword-mismatch' }, [
            DomUtils.span({ class: 'watchout-icon' }, '⚠'),
            DomUtils.span({}, mm.warning),
          ])
        );
      });
    }
  }

  // ─── SUMMARY SECTION ──────────────────────────────────────────────────────

  function _buildSummarySection(saved) {
    const section = DomUtils.div({
      class: 'stage5__summary',
      id   : 'stage5-summary',
    });

    _renderSummary(section, saved);
    return section;
  }

  function _renderSummary(container, saved) {
    DomUtils.clearContent(container);

    const activeVerifiers = _getActiveVerifiers(_state);
    const doneCount = activeVerifiers.filter(v => _isVerifierDone(v.id, saved)).length;

    if (doneCount === 0) {
      container.appendChild(
        DomUtils.div({ class: 'summary-placeholder' },
          'Complete verifiers above to see verification summary'
        )
      );
      return;
    }

    container.appendChild(
      DomUtils.div({ class: 'stage5__section-title' }, 'Verification summary')
    );

    container.appendChild(
      DomUtils.div({ class: 'summary-row' }, [
        DomUtils.span({ class: 'summary-row__label' }, 'Verified:'),
        DomUtils.span({ class: 'summary-row__value' },
          `${doneCount} / ${activeVerifiers.length} verifiers completed`
        ),
      ])
    );

    const vStates = saved.verifierStates ?? {};

    // Greedy result
    if (vStates.greedy?.verdict) {
      container.appendChild(
        DomUtils.div({ class: 'summary-row' }, [
          DomUtils.span({ class: 'summary-row__label' }, 'Greedy:'),
          DomUtils.span({
            class: `summary-row__value ${vStates.greedy.verdict === 'found' ? 'verdict-fail' : 'verdict-pass'}`,
          }, vStates.greedy.verdict === 'found'
            ? '✗ Counter-example found — use DP'
            : '✓ No counter-example — greedy holds'
          ),
        ])
      );
    }

    // Monotonicity result
    if (vStates.monotonicity?.verdict) {
      container.appendChild(
        DomUtils.div({ class: 'summary-row' }, [
          DomUtils.span({ class: 'summary-row__label' }, 'Monotone:'),
          DomUtils.span({
            class: `summary-row__value ${vStates.monotonicity.verdict === 'yes' ? 'verdict-pass' : 'verdict-fail'}`,
          }, vStates.monotonicity.verdict === 'yes'
            ? '✓ Monotone — Binary Search valid'
            : '✗ NOT monotone — Binary Search fails'
          ),
        ])
      );
    }

    // DP state result
    if (vStates.dp_state?.checkAnswers) {
      const checks = DPStateVerifier.getChecks();
      const allPass = checks.every(c => vStates.dp_state.checkAnswers[c.id] === 'pass');
      container.appendChild(
        DomUtils.div({ class: 'summary-row' }, [
          DomUtils.span({ class: 'summary-row__label' }, 'DP state:'),
          DomUtils.span({
            class: `summary-row__value ${allPass ? 'verdict-pass' : 'verdict-warn'}`,
          }, allPass ? '✓ State verified' : '~ Issues found'),
        ])
      );
    }

    // Keyword result
    if (vStates.keyword?.verdict) {
      container.appendChild(
        DomUtils.div({ class: 'summary-row' }, [
          DomUtils.span({ class: 'summary-row__label' }, 'Keywords:'),
          DomUtils.span({
            class: `summary-row__value ${vStates.keyword.verdict === 'confirmed' ? 'verdict-pass' : 'verdict-warn'}`,
          }, vStates.keyword.verdict === 'confirmed'
            ? '✓ Language aligns with approach'
            : '⚠ Possible mismatch detected'
          ),
        ])
      );
    }
  }

  // ─── CHANGE HANDLERS ──────────────────────────────────────────────────────

  function _switchTab(verifierId, activeVerifiers) {
    // Update tab states
    document.querySelectorAll('.s5-tab').forEach(tab => {
      tab.classList.toggle('s5-tab--active', tab.dataset.verifierId === verifierId);
    });

    // Show/hide panels
    activeVerifiers.forEach(v => {
      const panel = document.getElementById(`panel-${v.id}`);
      if (panel) {
        panel.classList.toggle('s5-panel--active', v.id === verifierId);
        panel.classList.toggle('hidden', v.id !== verifierId);
      }
    });
  }

  function _buildVerdictBtn(groupId, value, label, isSelected, color) {
    const btn = DomUtils.btn({
      class: `verdict-btn verdict-btn--${color} ${isSelected ? 'verdict-btn--selected' : ''}`,
      data : { groupId, value },
    }, label);

    btn.addEventListener('click', () => _onVerdictClick(groupId, value));
    return btn;
  }

  function _onVerdictClick(groupId, value) {
    // Determine which verifier this belongs to
    if (groupId === 'greedy') {
      _onGreedyVerdict(value);
    } else if (groupId === 'monotonicity') {
      _onMonotonicityVerdict(value);
    } else if (groupId === 'keyword') {
      _onKeywordVerdict(value);
    } else if (groupId.startsWith('dp_check_')) {
      const checkId = groupId.replace('dp_check_', '');
      _onDPCheckAnswer(checkId, value);
    } else if (groupId === 'mono_direction') {
      _onMonotonicityDirection(value);
    }

    // Update button selected states within group
    document.querySelectorAll(`[data-group-id="${groupId}"]`).forEach(btn => {
      btn.classList.toggle('verdict-btn--selected', btn.dataset.value === value);
    });
  }

  function _onGreedyRuleChange(val) {
    _updateVerifierState('greedy', { greedyRule: val });
  }

  function _onGreedyVerdict(verdict) {
    _updateVerifierState('greedy', { verdict });

    const panel = document.getElementById('panel-greedy');
    if (panel) {
      const existing = panel.querySelector('.s5-result-card');
      if (existing) existing.remove();
      const card = _buildGreedyResultCard(verdict);
      panel.querySelector('.s5-verifier-panel')?.appendChild(card);
    }

    if (verdict === 'found') {
      State.setAnswer('stage5', { greedyCounterexample: 'found' });
    } else {
      State.setAnswer('stage5', { greedyTested: true, greedyCounterexample: 'not_found' });
    }

    _refreshSummary();
    _checkComplete();
  }

  function _onMonotonicityDirection(direction) {
    _updateVerifierState('monotonicity', { direction });
  }

  function _onMonotonicityVerdict(verdict) {
    _updateVerifierState('monotonicity', { verdict });
    State.setAnswer('stage5', {
      monotonicityVerified: true,
      monotonicityResult  : verdict === 'yes' ? 'monotonic' : 'not_monotonic',
    });
    _refreshSummary();
    _checkComplete();
  }

  function _onDPCheckAnswer(checkId, value) {
    const current = _verifierStates.dp_state?.checkAnswers ?? {};
    current[checkId] = value;
    _updateVerifierState('dp_state', { checkAnswers: current });

    const checks     = DPStateVerifier.getChecks();
    const allAnswered = checks.every(c => current[c.id]);

    if (allAnswered) {
      State.setAnswer('stage5', { dpStateVerified: true });
      _refreshSummary();
    }
    _checkComplete();
  }

  function _onGraphCheckAnswer(checkId, optionId) {
    const current = _verifierStates.graph?.checkAnswers ?? {};
    current[checkId] = optionId;
    _updateVerifierState('graph', { checkAnswers: current });

    // Update option card states
    document.querySelectorAll(`[data-check-id="${checkId}"]`).forEach(card => {
      card.classList.toggle(
        's5-graph-option--selected',
        card.dataset.optionId === optionId
      );
    });

    // Derive algorithm recommendation
    const rec = GraphVerifier.getAlgorithmForConditions({
      weighted: current.weighted_check === 'weighted',
      negative: current.negative_check === 'negative',
      directed: current.directed_check === 'directed',
      goal    : _state?.answers?.stage3?.graphGoal ?? 'shortest_path',
      allPairs: false,
    });

    _updateVerifierState('graph', { algorithmRecommendation: rec });

    // Update recommendation display
    const existing = document.querySelector('.s5-graph-recommendation');
    if (existing) existing.remove();

    const panel = document.querySelector('#panel-graph .s5-verifier-panel');
    if (panel && rec) {
      panel.appendChild(
        DomUtils.div({ class: 's5-graph-recommendation' }, [
          DomUtils.span({ class: 'rec-label' }, 'Recommended algorithm: '),
          DomUtils.span({ class: 's5-graph-rec-value detail-mono' }, rec),
        ])
      );
    }

    State.setAnswer('stage5', { graphPropertiesVerified: true });
    _refreshSummary();
    _checkComplete();
  }

  function _onKeywordTextChange(text) {
    _updateVerifierState('keyword', { problemText: text });
    _refreshKeywordMatches(text);
  }

  function _onKeywordVerdict(verdict) {
    _updateVerifierState('keyword', { verdict });
    State.setAnswer('stage5', {
      keywordCrosscheckDone: true,
      keywordMismatch      : verdict === 'mismatch',
    });
    _refreshSummary();
    _checkComplete();
  }

  function _updateVerifierState(verifierId, updates) {
    if (!_verifierStates[verifierId]) _verifierStates[verifierId] = {};
    Object.assign(_verifierStates[verifierId], updates);
    State.setAnswer('stage5', { verifierStates: { ..._verifierStates } });

    // Update tab done indicator
    _refreshTabDone(verifierId);
  }

  function _refreshTabDone(verifierId) {
    const saved = State.getAnswer('stage5') ?? {};
    const isDone = _isVerifierDone(verifierId, saved);
    const tab    = document.querySelector(`[data-verifier-id="${verifierId}"]`);
    if (tab) {
      tab.classList.toggle('s5-tab--done', isDone);
      const check = tab.querySelector('.s5-tab__check');
      if (!check && isDone) {
        tab.appendChild(DomUtils.span({ class: 's5-tab__check' }, '✓'));
      } else if (check && !isDone) {
        check.remove();
      }
    }
  }

  function _refreshSummary() {
    const section = document.getElementById('stage5-summary');
    if (section) {
      _renderSummary(section, State.getAnswer('stage5') ?? {});
    }
  }

  // ─── HELPERS ───────────────────────────────────────────────────────────────

  function _isVerifierDone(verifierId, saved) {
    const vState = saved.verifierStates?.[verifierId] ?? {};
    switch (verifierId) {
      case 'greedy'      : return !!vState.verdict;
      case 'monotonicity': return !!vState.verdict;
      case 'dp_state'    : {
        const checks = DPStateVerifier.getChecks();
        return checks.every(c => vState.checkAnswers?.[c.id]);
      }
      case 'graph'       : {
        const checks = GraphVerifier.getChecks();
        return checks.every(c => vState.checkAnswers?.[c.id]);
      }
      case 'keyword'     : return !!vState.verdict;
      default            : return false;
    }
  }

  function _buildTextInput({ id, label, placeholder, saved, onChange }) {
    const field = DomUtils.div({ class: 's5-text-input-field' }, [
      DomUtils.label({ class: 's5-text-input-field__label', for: id }, label),
      DomUtils.el('textarea', {
        id,
        class      : 's5-text-input-field__input',
        placeholder,
        rows       : '2',
      }, saved ?? ''),
    ]);

    const textarea = field.querySelector(`#${id}`);
    if (textarea) {
      textarea.addEventListener('input', () => onChange(textarea.value));
    }

    return field;
  }

  // ─── COMPLETION CHECK ──────────────────────────────────────────────────────

  function _checkComplete() {
    const saved          = State.getAnswer('stage5') ?? {};
    const activeVerifiers = _getActiveVerifiers(_state);
    const doneCount      = activeVerifiers.filter(v =>
      _isVerifierDone(v.id, saved)
    ).length;

    // Need at least half of active verifiers completed
    const valid = doneCount >= Math.ceil(activeVerifiers.length / 2);
    Renderer.setNextEnabled(valid);

    if (valid) {
      document.dispatchEvent(new CustomEvent('dsa:stage-complete', {
        detail: {
          stageId: 'stage5',
          answers: {
            ...saved,
            passed: activeVerifiers
              .filter(v => _isVerifierDone(v.id, saved))
              .map(v => v.id),
            failed: [],
          },
        },
      }));
    }
  }

  // ─── LIFECYCLE ─────────────────────────────────────────────────────────────

  function onMount(state) {
    const saved          = state.answers?.stage5;
    const activeVerifiers = _getActiveVerifiers(state);
    const doneCount      = activeVerifiers.filter(v =>
      _isVerifierDone(v.id, saved ?? {})
    ).length;

    if (doneCount >= Math.ceil(activeVerifiers.length / 2)) {
      Renderer.setNextEnabled(true);
    }
  }

  function cleanup() {
    _state          = null;
    _verifierStates = {};
  }

  // ─── PUBLIC ────────────────────────────────────────────────────────────────

  return { render, onMount, cleanup };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Stage5;
}