// core/renderer.js
// DOM rendering engine — renders any stage's UI, handles transitions,
// updates progress indicator, mounts/unmounts stage components
// Used by: engine.js
// Reads from: State, Router

const Renderer = (() => {

  // ─── CONSTANTS ─────────────────────────────────────────────────────────────

  const CONTAINER_ID    = 'stage-container';
  const PROGRESS_ID     = 'progress-bar';
  const HEADER_ID       = 'stage-header';
  const NAV_BACK_ID     = 'btn-back';
  const NAV_NEXT_ID     = 'btn-next';
  const RECOVERY_BTN_ID = 'btn-recovery';
  const STAGE_NUM_ID    = 'stage-number';
  const STAGE_TITLE_ID  = 'stage-title';

  // Transition durations in ms
  const TRANSITION = {
    out : 160,
    in  : 220,
  };

  // ─── PRIVATE STATE ─────────────────────────────────────────────────────────

  let _currentStageId   = null;
  let _stageModules     = {};     // loaded stage modules cache
  let _progressInstance = null;   // DomUtils progress bar instance
  let _transitioning    = false;

  // ─── INIT ──────────────────────────────────────────────────────────────────

  function init() {
    _ensureContainers();
    _bindNavButtons();
    _bindRecoveryButton();
  }

  // ─── RENDER STAGE ──────────────────────────────────────────────────────────

  // Main entry — called by engine whenever stage changes
  async function renderStage(stageId, state, direction = 'forward') {
    if (_transitioning) return;
    _transitioning = true;

    try {
      // 1. Unmount current stage
      await _unmountCurrent(direction);

      // 2. Load stage module
      const module = await _loadStageModule(stageId);

      // 3. Update header
      _updateHeader(stageId, state);

      // 4. Update progress bar
      _updateProgress(state);

      // 5. Mount new stage
      await _mountStage(stageId, module, state, direction);

      // 6. Update nav buttons
      _updateNavButtons(stageId, state);

      // 7. Track current
      _currentStageId = stageId;

    } catch (e) {
      console.error(`Renderer.renderStage error [${stageId}]:`, e);
      _renderError(stageId, e);
    } finally {
      _transitioning = false;
    }
  }

  // ─── MOUNT / UNMOUNT ───────────────────────────────────────────────────────

  async function _unmountCurrent(direction) {
    const container = _getContainer();
    if (!container || !container.firstChild) return;

    // Call cleanup on current stage if it has one
    if (_currentStageId && _stageModules[_currentStageId]?.cleanup) {
      try { _stageModules[_currentStageId].cleanup(); }
      catch (e) { console.warn('Stage cleanup error:', e); }
    }

    // Animate out
    await _animateOut(container, direction);
    DomUtils.clearContent(container);
  }

  async function _mountStage(stageId, module, state, direction) {
    const container = _getContainer();
    if (!container) return;

    // Build stage DOM
    let stageEl;
    try {
      stageEl = module.render(state);
    } catch (e) {
      console.error(`Stage ${stageId} render() threw:`, e);
      stageEl = _buildErrorEl(`Stage ${stageId} failed to render: ${e.message}`);
    }

    if (!stageEl) {
      stageEl = _buildErrorEl(`Stage ${stageId} render() returned null`);
    }

    // Set initial opacity for animation
    stageEl.style.opacity   = '0';
    stageEl.style.transform = direction === 'back'
      ? 'translateX(-16px)'
      : 'translateX(16px)';

    container.appendChild(stageEl);

    // Animate in
    await _animateIn(stageEl);

    // Call mount hook if exists
    if (module.onMount) {
      try { module.onMount(state); }
      catch (e) { console.warn(`Stage ${stageId} onMount error:`, e); }
    }

    // Scroll to top
    container.scrollTop = 0;
  }

  // ─── STAGE MODULE LOADING ──────────────────────────────────────────────────

  // Stage module contract:
  // {
  //   render(state) → HTMLElement   — required
  //   onMount(state) → void         — optional, called after DOM insertion
  //   cleanup() → void              — optional, called before unmount
  //   onAnswer(answerId, val) → void — optional, called when user selects answer
  // }

  async function _loadStageModule(stageId) {
    if (_stageModules[stageId]) return _stageModules[stageId];

    const mod = _resolveModule(stageId);
    if (!mod) {
      throw new Error(`No module found for stage "${stageId}"`);
    }

    if (typeof mod.render !== 'function') {
      throw new Error(`Stage module "${stageId}" missing render() function`);
    }

    _stageModules[stageId] = mod;
    return mod;
  }

  // Maps stage id → module reference
  // In production these would be dynamic imports
  // For now resolved from global scope
  function _resolveModule(stageId) {
    const MODULE_MAP = {
      stage0         : (typeof Stage0         !== 'undefined') ? Stage0         : null,
      stage1         : (typeof Stage1         !== 'undefined') ? Stage1         : null,
      stage2         : (typeof Stage2         !== 'undefined') ? Stage2         : null,
      stage2_5       : (typeof Stage2_5       !== 'undefined') ? Stage2_5       : null,
      stage3         : (typeof Stage3         !== 'undefined') ? Stage3         : null,
      stage3_dp      : (typeof Stage3_DP      !== 'undefined') ? Stage3_DP      : null,
      stage3_graph   : (typeof Stage3_Graph   !== 'undefined') ? Stage3_Graph   : null,
      stage3_5       : (typeof Stage3_5       !== 'undefined') ? Stage3_5       : null,
      stage4         : (typeof Stage4         !== 'undefined') ? Stage4         : null,
      stage4_5       : (typeof Stage4_5       !== 'undefined') ? Stage4_5       : null,
      stage5         : (typeof Stage5         !== 'undefined') ? Stage5         : null,
      stage5_greedy  : (typeof Stage5_Greedy  !== 'undefined') ? Stage5_Greedy  : null,
      stage5_bsearch : (typeof Stage5_BSearch !== 'undefined') ? Stage5_BSearch : null,
      stage5_dp      : (typeof Stage5_DP      !== 'undefined') ? Stage5_DP      : null,
      stage5_graph   : (typeof Stage5_Graph   !== 'undefined') ? Stage5_Graph   : null,
      stage5_keyword : (typeof Stage5_Keyword !== 'undefined') ? Stage5_Keyword : null,
      stage6         : (typeof Stage6         !== 'undefined') ? Stage6         : null,
      stage6_5       : (typeof Stage6_5       !== 'undefined') ? Stage6_5       : null,
      stage7         : (typeof Stage7         !== 'undefined') ? Stage7         : null,
      recovery_wa    : (typeof RecoveryWA     !== 'undefined') ? RecoveryWA     : null,
      recovery_tle   : (typeof RecoveryTLE    !== 'undefined') ? RecoveryTLE    : null,
      recovery_logic : (typeof RecoveryLogic  !== 'undefined') ? RecoveryLogic  : null,
      recovery_reframe:(typeof RecoveryReframe!== 'undefined') ? RecoveryReframe: null,
    };
    return MODULE_MAP[stageId] ?? null;
  }

  // ─── HEADER ────────────────────────────────────────────────────────────────

  function _updateHeader(stageId, state) {
    const stageInfo = Router.getStageInfo(stageId);
    const stageNum  = Router.getStageNumber(stageId, state);
    const total     = Router.getActiveSequence(state).length;

    const numEl   = document.getElementById(STAGE_NUM_ID);
    const titleEl = document.getElementById(STAGE_TITLE_ID);

    if (numEl)   numEl.textContent   = stageNum ? `${stageNum} / ${total}` : '';
    if (titleEl) titleEl.textContent = stageInfo?.label ?? stageId;

    // Recovery mode indicator
    const headerEl = document.getElementById(HEADER_ID);
    if (headerEl) {
      if (state.recoveryMode) {
        DomUtils.addClass(headerEl, 'header--recovery');
      } else {
        DomUtils.removeClass(headerEl, 'header--recovery');
      }
    }
  }

  // ─── PROGRESS BAR ──────────────────────────────────────────────────────────

  function _updateProgress(state) {
    const progressEl = document.getElementById(PROGRESS_ID);
    if (!progressEl) return;

    const sequence = Router.getActiveSequence(state);

    if (!_progressInstance) {
      _progressInstance = DomUtils.createProgressBar(sequence);
      DomUtils.clearContent(progressEl);
      progressEl.appendChild(_progressInstance.el);
    } else {
      // Update statuses
      sequence.forEach(s => {
        _progressInstance.setStatus(s.id, s.status);
      });
    }
  }

  // ─── NAV BUTTONS ───────────────────────────────────────────────────────────

  function _updateNavButtons(stageId, state) {
    const backBtn = document.getElementById(NAV_BACK_ID);
    const nextBtn = document.getElementById(NAV_NEXT_ID);

    const hasPrev   = Router.prev(state) !== null;
    const isLast    = Router.next(stageId, state) === null;
    const canProceed = State.isStageComplete(stageId);

    if (backBtn) {
      backBtn.disabled = !hasPrev;
      DomUtils.toggle(backBtn, hasPrev);
    }

    if (nextBtn) {
      nextBtn.disabled = !canProceed;
      nextBtn.textContent = isLast ? 'Finish' : 'Next →';

      if (canProceed) {
        DomUtils.swapClass(nextBtn, 'btn--disabled', 'btn--primary');
      } else {
        DomUtils.swapClass(nextBtn, 'btn--primary', 'btn--disabled');
      }
    }
  }

  // ─── BUTTON BINDING ────────────────────────────────────────────────────────

  function _bindNavButtons() {
    const backBtn = document.getElementById(NAV_BACK_ID);
    const nextBtn = document.getElementById(NAV_NEXT_ID);

    if (backBtn) {
      backBtn.addEventListener('click', () => {
        // Engine handles the actual navigation
        document.dispatchEvent(new CustomEvent('dsa:navigate-back'));
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('dsa:navigate-next'));
      });
    }
  }

  function _bindRecoveryButton() {
    const btn = document.getElementById(RECOVERY_BTN_ID);
    if (btn) {
      btn.addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('dsa:enter-recovery'));
      });
    }
  }

  // ─── ANIMATIONS ────────────────────────────────────────────────────────────

  function _animateOut(container, direction) {
    return new Promise(resolve => {
      const el = container.firstChild;
      if (!el) { resolve(); return; }

      const tx = direction === 'back' ? '16px' : '-16px';
      el.style.transition = `opacity ${TRANSITION.out}ms ease, transform ${TRANSITION.out}ms ease`;
      el.style.opacity    = '0';
      el.style.transform  = `translateX(${tx})`;

      setTimeout(resolve, TRANSITION.out);
    });
  }

  function _animateIn(el) {
    return new Promise(resolve => {
      // Force reflow
      void el.offsetHeight;

      el.style.transition = `opacity ${TRANSITION.in}ms ease, transform ${TRANSITION.in}ms ease`;
      el.style.opacity    = '1';
      el.style.transform  = 'translateX(0)';

      setTimeout(resolve, TRANSITION.in);
    });
  }

  // ─── PARTIAL UPDATES ───────────────────────────────────────────────────────
  // Used by stages to update specific parts without full re-render

  // Update a named region within the current stage
  // Stages call this when a sub-component changes
  function updateRegion(regionId, newContent) {
    const region = document.getElementById(regionId);
    if (!region) return;

    DomUtils.flash(region, 'region--updated');

    if (typeof newContent === 'string') {
      region.innerHTML = newContent;
    } else if (newContent instanceof HTMLElement) {
      DomUtils.clearContent(region);
      region.appendChild(newContent);
    }
  }

  // Flash a value update on an element
  function flashUpdate(elementId) {
    const el = document.getElementById(elementId);
    DomUtils.flash(el, 'flash-highlight');
  }

  // Update the next button state from within a stage
  // Called when user makes a selection that enables/disables proceeding
  function setNextEnabled(enabled) {
    const nextBtn = document.getElementById(NAV_NEXT_ID);
    if (!nextBtn) return;
    nextBtn.disabled = !enabled;
    if (enabled) {
      DomUtils.swapClass(nextBtn, 'btn--disabled', 'btn--primary');
    } else {
      DomUtils.swapClass(nextBtn, 'btn--primary', 'btn--disabled');
    }
  }

  // ─── STATUS MESSAGES ───────────────────────────────────────────────────────

  // Show a toast notification
  function showToast(message, type = 'info', durationMs = 3000) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = DomUtils.div(
      { class: `toast toast--${type}` },
      message
    );

    document.body.appendChild(toast);
    DomUtils.fadeIn(toast, 200);

    setTimeout(() => {
      toast.style.transition = 'opacity 200ms ease';
      toast.style.opacity    = '0';
      setTimeout(() => toast.remove(), 200);
    }, durationMs);
  }

  // Show inline warning inside current stage
  function showWarning(message) {
    const container = _getContainer();
    if (!container) return;

    const existing = container.querySelector('.inline-warning');
    if (existing) existing.remove();

    const warning = DomUtils.div(
      { class: 'inline-warning' },
      [
        DomUtils.span({ class: 'inline-warning__icon' }, '⚠'),
        DomUtils.span({ class: 'inline-warning__text' }, message),
      ]
    );

    container.insertBefore(warning, container.firstChild);
    DomUtils.slideIn(warning);
  }

  function clearWarnings() {
    const container = _getContainer();
    if (!container) return;
    container.querySelectorAll('.inline-warning').forEach(el => el.remove());
  }

  // ─── ERROR HANDLING ────────────────────────────────────────────────────────

  function _renderError(stageId, error) {
    const container = _getContainer();
    if (!container) return;

    DomUtils.clearContent(container);
    container.appendChild(
      _buildErrorEl(`Error loading stage "${stageId}": ${error?.message ?? 'Unknown error'}`)
    );
  }

  function _buildErrorEl(message) {
    return DomUtils.div(
      { class: 'stage-error' },
      [
        DomUtils.div({ class: 'stage-error__title' }, 'Something went wrong'),
        DomUtils.div({ class: 'stage-error__msg'   }, message),
        DomUtils.btn(
          {
            class : 'btn btn--secondary',
            onClick: () => document.dispatchEvent(new CustomEvent('dsa:reset')),
          },
          'Reset session'
        ),
      ]
    );
  }

  // ─── LAYOUT HELPERS ────────────────────────────────────────────────────────

  // Ensure all required DOM containers exist
  function _ensureContainers() {
    const required = [
      CONTAINER_ID,
      PROGRESS_ID,
      HEADER_ID,
    ];

    required.forEach(id => {
      if (!document.getElementById(id)) {
        console.warn(`Renderer: required container #${id} not found in DOM`);
      }
    });
  }

  function _getContainer() {
    return document.getElementById(CONTAINER_ID);
  }

  // ─── LOADING STATE ─────────────────────────────────────────────────────────

  function showLoading() {
    const container = _getContainer();
    if (!container) return;

    DomUtils.clearContent(container);
    container.appendChild(
      DomUtils.div(
        { class: 'stage-loading' },
        [
          DomUtils.div({ class: 'stage-loading__spinner' }),
          DomUtils.div({ class: 'stage-loading__text' }, 'Loading…'),
        ]
      )
    );
  }

  function hideLoading() {
    const loading = document.querySelector('.stage-loading');
    if (loading) loading.remove();
  }

  // ─── CONFIDENCE GATE DISPLAY ───────────────────────────────────────────────

  // Called by Stage 6.5 when confidence score is computed
  function renderConfidenceGate(report) {
    const container = _getContainer();
    if (!container) return;

    const level = report.level;
    const fmt   = ConfidenceUtils.formatLevel(level);

    const gateEl = DomUtils.div(
      { class: `confidence-gate confidence-gate--${level}` },
      [
        DomUtils.div(
          { class: 'confidence-gate__score' },
          [
            DomUtils.span({ class: 'cg-icon'  }, fmt.icon),
            DomUtils.span({ class: 'cg-label' }, `${fmt.label} Confidence`),
            DomUtils.span({ class: 'cg-score' }, `${report.score} / ${report.maxScore}`),
          ]
        ),
        DomUtils.div({ class: 'confidence-gate__message' }, report.gateAction.message),
        DomUtils.div({ class: 'confidence-gate__detail'  }, report.gateAction.detail),

        report.gateAction.action !== 'proceed'
          ? DomUtils.btn(
              {
                class  : `btn btn--${level === 'medium' ? 'secondary' : 'warning'}`,
                onClick: () => {
                  document.dispatchEvent(new CustomEvent('dsa:jump-to', {
                    detail: { stageId: report.gateAction.backTo },
                  }));
                },
              },
              level === 'medium'
                ? `Verify first → ${report.gateAction.backTo}`
                : `Go back to ${report.gateAction.backTo}`
            )
          : DomUtils.btn(
              {
                class  : 'btn btn--primary',
                onClick: () => {
                  document.dispatchEvent(new CustomEvent('dsa:navigate-next'));
                },
              },
              'Proceed to Output →'
            ),
      ]
    );

    updateRegion('confidence-gate-region', gateEl);
  }

  // ─── PUBLIC API ────────────────────────────────────────────────────────────

  return {
    init,
    renderStage,
    updateRegion,
    flashUpdate,
    setNextEnabled,
    showToast,
    showWarning,
    clearWarnings,
    showLoading,
    hideLoading,
    renderConfidenceGate,
  };

})();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Renderer;
}