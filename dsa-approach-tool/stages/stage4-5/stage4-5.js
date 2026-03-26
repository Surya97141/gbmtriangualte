// stages/stage4-5/stage4-5.js
// Approach Variant stage — select specific algorithm variant,
// re-check complexity at actual N, confirm or revise direction
// Module contract: render(state), onMount(state), cleanup()

const Stage4_5 = (() => {

  // ─── PRIVATE STATE ─────────────────────────────────────────────────────────

  let _state           = null;
  let _selectedVariant = null;
  let _recheckResult   = null;

  // ─── RENDER ────────────────────────────────────────────────────────────────

  function render(state) {
    _state = state;
    const saved = state.answers?.stage4_5 ?? {};

    _selectedVariant = saved.variantSelected ?? null;
    _recheckResult   = saved.recheckResult   ?? null;

    const wrapper = DomUtils.div({ class: 'stage stage4-5' }, [
      _buildIntro(),
      _buildDirectionSummary(),
      _buildVariantSection(saved),
      _buildRecheckSection(saved),
      _buildSummarySection(saved),
    ]);

    return wrapper;
  }

  // ─── INTRO ─────────────────────────────────────────────────────────────────

  function _buildIntro() {
    return DomUtils.div({ class: 'stage-intro' }, [
      DomUtils.div({ class: 'stage-intro__rule' },
        'Pick the specific variant of your approach. Re-check complexity at actual N.'
      ),
      DomUtils.div({ class: 'stage-intro__sub' },
        'Different variants of the same family have very different complexities. Verify before coding.'
      ),
    ]);
  }

  // ─── DIRECTION SUMMARY ────────────────────────────────────────────────────

  function _buildDirectionSummary() {
    const directions = _state?.output?.directions ?? [];
    if (!directions.length) return DomUtils.div({});

    const section = DomUtils.div({ class: 'stage4-5__section' });

    section.appendChild(
      DomUtils.div({ class: 'stage4-5__section-title' }, [
        DomUtils.span({}, 'Candidate directions from Stage 3'),
        DomUtils.span({ class: 'stage4-5__section-sub' },
          'Select which direction you are pursuing'
        ),
      ])
    );

    const grid = DomUtils.div({ class: 's45-direction-grid' });

    directions.forEach(dir => {
      const isSelected = _selectedVariant &&
        _selectedVariant.startsWith(dir.family?.split('_')[0] ?? '');

      const card = DomUtils.div({
        class: `s45-direction-card ${isSelected ? 's45-direction-card--active' : ''}`,
      }, [
        DomUtils.div({ class: 's45-direction-card__label'  }, dir.label),
        DomUtils.div({ class: 's45-direction-card__why'    }, dir.why),
        DomUtils.div({ class: 's45-direction-card__verify' }, [
          DomUtils.span({ class: 'verify-label' }, 'Verify: '),
          DomUtils.span({}, dir.verifyBefore),
        ]),
      ]);

      grid.appendChild(card);
    });

    section.appendChild(grid);
    return section;
  }

  // ─── VARIANT SECTION ──────────────────────────────────────────────────────

  function _buildVariantSection(saved) {
    const section = DomUtils.div({
      class: 'stage4-5__section',
      id   : 'variant-section',
    });

    section.appendChild(
      DomUtils.div({ class: 'stage4-5__section-title' }, [
        DomUtils.span({}, 'Select the specific variant'),
        DomUtils.span({ class: 'stage4-5__section-sub' },
          'Pick the exact algorithm within your chosen family'
        ),
      ])
    );

    const directions   = _state?.output?.directions ?? [];
    const dpSubtype    = _state?.answers?.stage3?.dpSubtype    ?? null;
    const graphGoal    = _state?.answers?.stage3?.graphGoal    ?? null;
    const graphProps   = _state?.answers?.stage3?.graphProperties ?? {};

    // Build variant groups per direction family
    const shown = new Set();

    directions.forEach(dir => {
      const family = dir.family ?? '';

      let variants = [];

      if (family.includes('binary_search')) {
        variants = BinarySearchVariants.getRelevant(directions);
      } else if (family.includes('dp')) {
        variants = DPVariants.getRelevant(directions, dpSubtype);
      } else if (family.includes('graph')) {
        variants = GraphVariants.getRelevant(directions, graphGoal, graphProps);
      }

      if (!variants.length) return;

      const groupTitle = DomUtils.div({
        class: 's45-group-title',
      }, `${dir.label} variants:`);

      section.appendChild(groupTitle);

      const grid = DomUtils.div({ class: 's45-variant-grid' });

      variants.forEach(v => {
        if (shown.has(v.id)) return;
        shown.add(v.id);

        const isSelected = saved.variantSelected === v.id;
        const card = _buildVariantCard(v, isSelected);
        grid.appendChild(card);
      });

      section.appendChild(grid);
    });

    // Fallback if no variants matched
    if (!shown.size) {
      section.appendChild(
        DomUtils.div({ class: 'stage4-5__no-variants' },
          'No specific variants available for current directions. ' +
          'Proceed to complexity re-check below.'
        )
      );
    }

    return section;
  }

  function _buildVariantCard(variant, isSelected) {
    const n      = _state?.answers?.stage0?.n ?? 0;
    const tl     = _state?.answers?.stage0?.timeLimit ?? 1;
    const recheck = n ? ComplexityRecheck.recheck(variant.id, n, tl) : null;

    const gradeClass = recheck
      ? `s45-variant-card--${recheck.grade}`
      : '';

    const card = DomUtils.div({
      class: `s45-variant-card ${isSelected ? 's45-variant-card--selected' : ''} ${gradeClass}`,
      data : { variantId: variant.id },
    });

    // Header
    const header = DomUtils.div({ class: 's45-variant-card__header' }, [
      DomUtils.div({ class: 's45-variant-card__name'    }, variant.label),
      DomUtils.div({ class: 's45-variant-card__tagline' }, variant.tagline),
    ]);

    // Complexity + feasibility at N
    const complexEl = DomUtils.div({ class: 's45-variant-card__complex' }, [
      DomUtils.span({ class: 'detail-mono' }, variant.complexity),
    ]);

    if (recheck && n) {
      const badge = DomUtils.span({
        class: `feasibility-badge feasibility-badge--${recheck.grade}`,
      }, recheck.grade === 'safe' ? `✓ ${recheck.opsDisplay} ops` :
         recheck.grade === 'warn' ? `~ ${recheck.opsDisplay} ops` :
         `✗ TLE ${recheck.opsDisplay}`);
      complexEl.appendChild(badge);
    }

    card.appendChild(header);
    card.appendChild(complexEl);

    // When to use (collapsed by default)
    if (variant.when?.length) {
      const whenEl = DomUtils.div({ class: 's45-variant-card__when' });
      variant.when.forEach(w => {
        whenEl.appendChild(
          DomUtils.div({ class: 's45-variant-when-item' }, [
            DomUtils.span({ class: 'when-bullet' }, '·'),
            DomUtils.span({}, w),
          ])
        );
      });
      card.appendChild(whenEl);
    }

    // Template (collapsible)
    if (variant.template) {
      const templateCollapsible = DomUtils.createCollapsible(
        'Code template',
        DomUtils.el('pre', { class: 's45-code-template' }, variant.template),
        false
      );
      card.appendChild(templateCollapsible);
    }

    // Watch outs
    if (variant.watchOut?.length) {
      const woEl = DomUtils.div({ class: 's45-variant-card__watchouts' });
      variant.watchOut.forEach(w => {
        woEl.appendChild(
          DomUtils.div({ class: 'watchout-row' }, [
            DomUtils.span({ class: 'watchout-icon' }, '⚠'),
            DomUtils.span({ class: 'watchout-text' }, w),
          ])
        );
      });
      card.appendChild(woEl);
    }

    card.addEventListener('click', () => _onVariantSelect(variant.id));
    return card;
  }

  // ─── RECHECK SECTION ──────────────────────────────────────────────────────

  function _buildRecheckSection(saved) {
    const section = DomUtils.div({
      class: 'stage4-5__section',
      id   : 'recheck-section',
    });

    section.appendChild(
      DomUtils.div({ class: 'stage4-5__section-title' }, [
        DomUtils.span({}, 'Complexity re-check at your N'),
        DomUtils.span({ class: 'stage4-5__section-sub' },
          'Final confirmation before proceeding to verification'
        ),
      ])
    );

    const recheckEl = DomUtils.div({
      class: 'stage4-5__recheck-region',
      id   : 'recheck-region',
    });

    if (saved.variantSelected && saved.recheckResult) {
      _renderRecheckResult(recheckEl, saved.recheckResult);
    } else if (saved.variantSelected) {
      _computeAndRenderRecheck(recheckEl, saved.variantSelected);
    } else {
      recheckEl.appendChild(
        DomUtils.div({ class: 'recheck-placeholder' },
          'Select a variant above to see complexity at your N'
        )
      );
    }

    section.appendChild(recheckEl);

    // Manual override — if user wants to proceed despite warning
    if (saved.recheckResult?.grade === 'warn') {
      const overrideEl = DomUtils.div({ class: 'stage4-5__override' }, [
        DomUtils.div({ class: 'stage4-5__override-note' },
          'Borderline complexity — do you want to proceed with this variant anyway?'
        ),
        DomUtils.div({ class: 'stage4-5__override-btns' }, [
          _buildOverrideBtn('proceed', saved.overrideDecision === 'proceed',
            '→ Proceed anyway (tight constant may pass)'
          ),
          _buildOverrideBtn('reconsider', saved.overrideDecision === 'reconsider',
            '← Reconsider — choose faster variant'
          ),
        ]),
      ]);
      section.appendChild(overrideEl);
    }

    return section;
  }

  function _buildOverrideBtn(value, isSelected, label) {
    const btn = DomUtils.btn({
      class: `override-btn ${isSelected ? 'override-btn--selected' : ''}`,
      data : { value },
    }, label);

    btn.addEventListener('click', () => _onOverrideDecision(value));
    return btn;
  }

  function _renderRecheckResult(container, result) {
    DomUtils.clearContent(container);

    const resultCard = DomUtils.div({
      class: `recheck-result-card recheck-result-card--${result.grade}`,
    }, [
      DomUtils.div({ class: 'recheck-result-card__icon' },
        result.grade === 'safe' ? '✓'
        : result.grade === 'warn' ? '~'
        : '✗'
      ),
      DomUtils.div({ class: 'recheck-result-card__message' }, result.message),
      DomUtils.div({ class: 'recheck-result-card__detail' }, [
        DomUtils.span({ class: 'detail-mono' }, result.complexityClass),
        DomUtils.span({}, ` at n=${result.n} = `),
        DomUtils.span({ class: 'detail-mono' }, result.opsDisplay),
        DomUtils.span({}, ` ops (~${result.estimatedRuntime})`),
      ]),
    ]);

    if (result.grade === 'tle') {
      resultCard.appendChild(
        DomUtils.div({ class: 'recheck-tle-warn' }, [
          DomUtils.span({ class: 'watchout-icon' }, '⚠'),
          DomUtils.span({},
            'This variant will TLE at your N. Choose a faster variant or reconsider the approach.'
          ),
        ])
      );
    }

    container.appendChild(resultCard);
  }

  function _computeAndRenderRecheck(container, variantId) {
    const n  = _state?.answers?.stage0?.n ?? 0;
    const tl = _state?.answers?.stage0?.timeLimit ?? 1;

    if (!n) {
      container.appendChild(
        DomUtils.div({ class: 'recheck-placeholder' },
          'N not set — go back to Stage 0 and set your constraint'
        )
      );
      return;
    }

    const result = ComplexityRecheck.recheck(variantId, n, tl);
    if (!result) {
      container.appendChild(
        DomUtils.div({ class: 'recheck-placeholder' },
          'Could not compute complexity for this variant'
        )
      );
      return;
    }

    _recheckResult = result;
    State.setAnswer('stage4_5', { recheckResult: result });
    _renderRecheckResult(container, result);
  }

  // ─── SUMMARY SECTION ──────────────────────────────────────────────────────

  function _buildSummarySection(saved) {
    const section = DomUtils.div({
      class: 'stage4-5__section stage4-5__summary',
      id   : 'stage4-5-summary',
    });

    _renderSummary(section, saved);
    return section;
  }

  // ─── CHANGE HANDLERS ──────────────────────────────────────────────────────

  function _onVariantSelect(variantId) {
    _selectedVariant = variantId;

    // Update card states
    document.querySelectorAll('.s45-variant-card').forEach(card => {
      card.classList.toggle(
        's45-variant-card--selected',
        card.dataset.variantId === variantId
      );
    });

    // Compute recheck
    const n  = _state?.answers?.stage0?.n ?? 0;
    const tl = _state?.answers?.stage0?.timeLimit ?? 1;
    const result = n ? ComplexityRecheck.recheck(variantId, n, tl) : null;

    _recheckResult = result;

    State.setAnswer('stage4_5', {
      variantSelected  : variantId,
      variantComplexity: ComplexityRecheck.VARIANT_COMPLEXITY_MAP[variantId] ?? null,
      variantFeasible  : result ? result.grade !== 'tle' : null,
      recheckResult    : result,
    });

    // Update recheck region
    const recheckEl = document.getElementById('recheck-region');
    if (recheckEl && result) {
      _renderRecheckResult(recheckEl, result);
    }

    // Show/hide override if borderline
    _refreshOverrideSection(result);

    _refreshSummary();
    _checkComplete();
  }

  function _onOverrideDecision(decision) {
    document.querySelectorAll('.override-btn').forEach(btn => {
      btn.classList.toggle(
        'override-btn--selected',
        btn.dataset.value === decision
      );
    });

    State.setAnswer('stage4_5', { overrideDecision: decision });

    if (decision === 'reconsider') {
      Renderer.showToast(
        'Choose a faster variant from the list above', 'info', 3000
      );
    }

    _refreshSummary();
    _checkComplete();
  }

  // ─── RENDER HELPERS ────────────────────────────────────────────────────────

  function _refreshOverrideSection(result) {
    const section = document.getElementById('recheck-section');
    if (!section) return;

    const existingOverride = section.querySelector('.stage4-5__override');
    if (existingOverride) existingOverride.remove();

    if (result?.grade === 'warn') {
      const overrideEl = DomUtils.div({ class: 'stage4-5__override' }, [
        DomUtils.div({ class: 'stage4-5__override-note' },
          'Borderline complexity — do you want to proceed with this variant anyway?'
        ),
        DomUtils.div({ class: 'stage4-5__override-btns' }, [
          _buildOverrideBtn('proceed',     false, '→ Proceed anyway'),
          _buildOverrideBtn('reconsider',  false, '← Choose faster variant'),
        ]),
      ]);
      section.appendChild(overrideEl);
    }
  }

  function _renderSummary(container, saved) {
    DomUtils.clearContent(container);

    if (!saved.variantSelected) {
      container.appendChild(
        DomUtils.div({ class: 'summary-placeholder' },
          'Select a variant above to see summary'
        )
      );
      return;
    }

    // Find variant label
    const allVariants = [
      ...BinarySearchVariants.getAll(),
      ...DPVariants.getAll(),
      ...GraphVariants.getAll(),
    ];
    const variant = allVariants.find(v => v.id === saved.variantSelected);

    container.appendChild(
      DomUtils.div({ class: 'stage4-5__section-title' }, 'Variant summary')
    );

    container.appendChild(
      DomUtils.div({ class: 'summary-row' }, [
        DomUtils.span({ class: 'summary-row__label' }, 'Variant:'),
        DomUtils.span({ class: 'summary-row__value' }, variant?.label ?? saved.variantSelected),
      ])
    );

    if (saved.variantComplexity) {
      container.appendChild(
        DomUtils.div({ class: 'summary-row' }, [
          DomUtils.span({ class: 'summary-row__label' }, 'Complexity:'),
          DomUtils.span({ class: 'summary-row__value detail-mono' }, saved.variantComplexity),
        ])
      );
    }

    if (saved.recheckResult) {
      const r = saved.recheckResult;
      container.appendChild(
        DomUtils.div({ class: 'summary-row' }, [
          DomUtils.span({ class: 'summary-row__label' }, 'At N:'),
          DomUtils.span({
            class: `summary-row__value feasibility-inline feasibility-inline--${r.grade}`,
          }, r.message),
        ])
      );
    }

    if (saved.overrideDecision) {
      container.appendChild(
        DomUtils.div({ class: 'summary-row' }, [
          DomUtils.span({ class: 'summary-row__label' }, 'Decision:'),
          DomUtils.span({ class: 'summary-row__value' },
            saved.overrideDecision === 'proceed'
              ? 'Proceeding despite borderline complexity'
              : 'Reconsidering — need faster variant'
          ),
        ])
      );
    }
  }

  function _refreshSummary() {
    const section = document.getElementById('stage4-5-summary');
    if (section) {
      _renderSummary(section, State.getAnswer('stage4_5') ?? {});
    }
  }

  // ─── COMPLETION CHECK ──────────────────────────────────────────────────────

  function _checkComplete() {
    const saved = State.getAnswer('stage4_5') ?? {};

    // Need: variant selected AND
    // if borderline → override decision made
    // if TLE → cannot proceed (must pick different variant)
    const hasVariant = !!saved.variantSelected;
    const grade      = saved.recheckResult?.grade ?? 'safe';

    let valid = false;

    if (!hasVariant) {
      valid = false;
    } else if (grade === 'safe') {
      valid = true;
    } else if (grade === 'warn') {
      valid = !!saved.overrideDecision;
    } else if (grade === 'tle') {
      valid = false; // must choose different variant
      Renderer.showToast(
        'Selected variant will TLE. Choose a faster variant to proceed.', 'warning'
      );
    }

    Renderer.setNextEnabled(valid);

    if (valid) {
      document.dispatchEvent(new CustomEvent('dsa:stage-complete', {
        detail: {
          stageId: 'stage4_5',
          answers: {
            ...saved,
            variantFeasible: grade !== 'tle',
          },
        },
      }));
    }
  }

  // ─── LIFECYCLE ─────────────────────────────────────────────────────────────

  function onMount(state) {
    const saved = state.answers?.stage4_5;
    if (!saved?.variantSelected) return;

    const grade = saved.recheckResult?.grade ?? 'safe';
    if (grade === 'safe') {
      Renderer.setNextEnabled(true);
    } else if (grade === 'warn' && saved.overrideDecision) {
      Renderer.setNextEnabled(true);
    }
  }

  function cleanup() {
    _state           = null;
    _selectedVariant = null;
    _recheckResult   = null;
  }

  // ─── PUBLIC ────────────────────────────────────────────────────────────────

  return { render, onMount, cleanup };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Stage4_5;
}