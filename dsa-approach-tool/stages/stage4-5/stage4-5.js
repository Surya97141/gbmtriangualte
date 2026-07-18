// stages/stage4-5/stage4-5.js
// Approach Variant — cream/white theme, self-contained styles
// Same pattern as stage0/1/2/2-5/3/3-5/4

const Stage4_5 = (() => {

  let _state           = null;
  let _selectedVariant = null;
  let _recheckResult   = null;

  // ─── RENDER ────────────────────────────────────────────────────────────────

  function render(state) {
    _state           = state;
    const saved      = state.answers?.stage4_5 ?? {};
    _selectedVariant = saved.variantSelected ?? null;
    _recheckResult   = saved.recheckResult   ?? null;

    _injectStyles();

    const directions = state.output?.directions ?? [];
    const dpSubtype  = state.answers?.stage3?.dpSubtype       ?? null;
    const graphGoal  = state.answers?.stage3?.graphGoal       ?? null;
    const graphProps = state.answers?.stage3?.graphProperties ?? {};
    const n          = state.answers?.stage0?.n               ?? 0;

    const BSV   = typeof BinarySearchVariants   !== 'undefined' ? BinarySearchVariants   : null;
    const DPV   = typeof DPVariants             !== 'undefined' ? DPVariants             : null;
    const GV    = typeof GraphVariants          !== 'undefined' ? GraphVariants          : null;
    const CR    = typeof ComplexityRecheck      !== 'undefined' ? ComplexityRecheck      : null;
    const TPV   = typeof TwoPointerVariants     !== 'undefined' ? TwoPointerVariants     : null;
    const SWV   = typeof SlidingWindowVariants  !== 'undefined' ? SlidingWindowVariants  : null;
    const GRV   = typeof GreedyVariants         !== 'undefined' ? GreedyVariants         : null;
    const STRV  = typeof StringVariants         !== 'undefined' ? StringVariants         : null;
    const MATHV = typeof MathVariants           !== 'undefined' ? MathVariants           : null;
    const DSV   = typeof DataStructureVariants  !== 'undefined' ? DataStructureVariants  : null;
    const GSV   = typeof GeometrySweepVariants  !== 'undefined' ? GeometrySweepVariants  : null;
    const GTV   = typeof GameTheoryVariants     !== 'undefined' ? GameTheoryVariants     : null;
    const RQV   = typeof RangeQueryVariants     !== 'undefined' ? RangeQueryVariants     : null;

    const wrapper = document.createElement('div');
    wrapper.className = 's45-shell';

    wrapper.innerHTML = `
      <div class="s45-main">

        <div class="s45-rule">
          Pick the specific variant of your approach. Re-check complexity at actual N.
          Different variants of the same family have very different complexities.
        </div>

        <!-- Candidate directions from Stage 3 -->
        ${directions.length ? `
          <section class="s45-section">
            <div class="s45-section-header">
              <span class="s45-section-num">00</span>
              <div>
                <div class="s45-section-title">Candidate directions from Stage 3</div>
                <div class="s45-section-sub">Your structural analysis produced these families</div>
              </div>
            </div>
            <div class="s45-direction-grid" id="s45-direction-grid"></div>
          </section>
        ` : ''}

        <!-- Section 01: Select variant -->
        <section class="s45-section">
          <div class="s45-section-header">
            <span class="s45-section-num">01</span>
            <div>
              <div class="s45-section-title">Select the specific variant</div>
              <div class="s45-section-sub">Pick the exact algorithm within your chosen family</div>
            </div>
          </div>
          <div class="s45-variant-area" id="s45-variant-area"></div>
        </section>

        <!-- Section 02: Complexity re-check -->
        <section class="s45-section">
          <div class="s45-section-header">
            <span class="s45-section-num">02</span>
            <div>
              <div class="s45-section-title">Complexity re-check at your N${n ? ` = ${n.toLocaleString()}` : ''}</div>
              <div class="s45-section-sub">Final confirmation before proceeding to verification</div>
            </div>
          </div>
          <div id="s45-recheck-region">
            <div class="s45-recheck-placeholder">← Select a variant above to see complexity at your N</div>
          </div>
          <div id="s45-override-region"></div>
        </section>

      </div>

      <!-- Live side panel -->
      <aside class="s45-panel">
        <div class="s45-panel-header">
          <div class="s45-panel-title">Variant analysis</div>
          <div class="s45-panel-sub">Updates as you select</div>
        </div>
        <div class="s45-panel-body" id="s45-panel-body">
          <div class="s45-panel-empty">← Select a variant to see analysis</div>
        </div>
      </aside>
    `;

    // Build direction cards
    if (directions.length) {
      _buildDirectionCards(wrapper, directions, saved);
    }

    // Build variant area
    _buildVariantArea(wrapper, directions, dpSubtype, graphGoal, graphProps, saved, n, BSV, DPV, GV, CR, TPV, SWV, GRV, STRV, MATHV, DSV, GSV, GTV, RQV);

    // Restore recheck if variant was saved
    if (saved.variantSelected && saved.recheckResult) {
      const region = wrapper.querySelector('#s45-recheck-region');
      if (region) _renderRecheckResult(region, saved.recheckResult);
    }

    // Restore override
    if (saved.recheckResult?.grade === 'warn') {
      _renderOverride(wrapper, saved.overrideDecision);
    }

    setTimeout(() => _updatePanel(wrapper), 0);

    return wrapper;
  }

  // ─── DIRECTION CARDS ───────────────────────────────────────────────────────

  function _buildDirectionCards(wrapper, directions, saved) {
    const grid = wrapper.querySelector('#s45-direction-grid');
    if (!grid) return;

    directions.forEach(dir => {
      const card = document.createElement('div');
      card.className = 's45-dir-card';
      card.innerHTML = `
        <div class="s45-dir-label">${dir.label}</div>
        <div class="s45-dir-why">${dir.why}</div>
        ${dir.verifyBefore ? `<div class="s45-dir-verify"><span class="s45-verify-label">Verify:</span> ${dir.verifyBefore}</div>` : ''}
      `;
      grid.appendChild(card);
    });
  }

  // ─── VARIANT AREA ──────────────────────────────────────────────────────────

  function _buildVariantArea(wrapper, directions, dpSubtype, graphGoal, graphProps, saved, n, BSV, DPV, GV, CR, TPV, SWV, GRV, STRV, MATHV, DSV, GSV, GTV, RQV) {
    const area = wrapper.querySelector('#s45-variant-area');
    if (!area) return;

    const shown = new Set();
    let hasAny  = false;

    // Try to get variants for each direction family
    const familyVariants = [];

    directions.forEach(dir => {
      const family = dir.family ?? '';
      let variants = [];

      if (family.includes('binary_search') && BSV) {
        variants = BSV.getRelevant?.(directions) ?? BSV.getAll?.() ?? [];
      } else if (family.includes('dp') && DPV) {
        variants = DPV.getRelevant?.(directions, dpSubtype) ?? DPV.getAll?.() ?? [];
      } else if (family.includes('graph') && GV) {
        variants = GV.getRelevant?.(directions, graphGoal, graphProps) ?? GV.getAll?.() ?? [];
      } else if (family.includes('greedy') && GRV) {
        variants = GRV.getRelevant?.(directions) ?? GRV.getAll?.() ?? [];
      } else if (family.includes('two_pointer') && TPV) {
        variants = TPV.getRelevant?.(directions) ?? TPV.getAll?.() ?? [];
      } else if (family.includes('sliding_window') && SWV) {
        variants = SWV.getRelevant?.(directions) ?? SWV.getAll?.() ?? [];
      } else if (family.includes('string') && STRV) {
        variants = STRV.getRelevant?.(directions) ?? STRV.getAll?.() ?? [];
      } else if (family.includes('math') && MATHV) {
        variants = MATHV.getRelevant?.(directions) ?? MATHV.getAll?.() ?? [];
      } else if (family.includes('data_structure') && DSV) {
        variants = DSV.getRelevant?.(directions) ?? DSV.getAll?.() ?? [];
      } else if (family.includes('geometry_sweep') && GSV) {
        variants = GSV.getRelevant?.(directions) ?? GSV.getAll?.() ?? [];
      } else if (family.includes('game_theory') && GTV) {
        variants = GTV.getRelevant?.(directions) ?? GTV.getAll?.() ?? [];
      } else if (family.includes('range_query') && RQV) {
        variants = RQV.getRelevant?.(directions) ?? RQV.getAll?.() ?? [];
      } else if (family.includes('backtracking') && GTV) {
        variants = GTV.getRelevant?.(directions) ?? GTV.getAll?.() ?? [];
      } else if (family.includes('divide_conquer') && GSV) {
        variants = GSV.getRelevant?.(directions) ?? GSV.getAll?.() ?? [];
      }

      if (variants.length) {
        familyVariants.push({ dir, variants });
      }
    });

    // No matched variants — this used to fall back to six hardcoded,
    // confidently-styled guesses (BFS/DFS/1D DP/2D DP/Binary Search on
    // Answer/Sort+Greedy) regardless of whether any of them actually fit.
    // Phase 2.1: never dress up a guess as a real match. Say so plainly and
    // route back to Stage 3's Truths First box instead of showing named
    // techniques that were never actually verified against this problem.
    if (!familyVariants.length) {
      _logFallbackTelemetry(directions);
      State.setAnswer('stage4_5', { usedFallback: true });

      area.innerHTML = `
        <div class="s45-fallback-honest">
          <div class="s45-fallback-honest__title">This doesn't match a pattern I have deep coverage for yet.</div>
          <div class="s45-fallback-honest__body">
            Guessing at named techniques without evidence isn't more useful than no answer at all.
            Go back and write down what you actually know for certain about this problem —
            that's the more reliable next step from here.
          </div>
          <button class="s45-fallback-honest__btn" id="s45-fallback-back-btn">← Back to Truths First (Stage 3)</button>
        </div>
      `;
      const backBtn = area.querySelector('#s45-fallback-back-btn');
      if (backBtn) {
        backBtn.addEventListener('click', () => {
          document.dispatchEvent(new CustomEvent('dsa:jump-to', { detail: { stageId: 'stage3' } }));
        });
      }
      return;
    }

    if (saved.usedFallback) {
      State.setAnswer('stage4_5', { usedFallback: false });
    }

    familyVariants.forEach(({ dir, variants }) => {
      const groupTitle = document.createElement('div');
      groupTitle.className = 's45-group-title';
      groupTitle.textContent = `${dir.label} variants:`;
      area.appendChild(groupTitle);

      const grid = document.createElement('div');
      grid.className = 's45-variant-grid';

      variants.forEach(v => {
        if (shown.has(v.id)) return;
        shown.add(v.id);
        hasAny = true;

        const isSelected = saved.variantSelected === v.id;
        const card = _buildVariantCard(v, isSelected, n, saved.stage0?.timeLimit ?? 1, CR, wrapper);
        grid.appendChild(card);
      });

      area.appendChild(grid);
    });

    if (!hasAny) {
      area.innerHTML = `<div class="s45-no-variants">No specific variants available for current directions. Enter your constraints in Stage 0 and ensure Stage 3 directions are set.</div>`;
    }
  }

  function _buildVariantCard(variant, isSelected, n, tl, CR, wrapper) {
    const recheck = (n && CR) ? CR.recheck?.(variant.id, n, tl) : null;
    const grade   = recheck?.grade ?? 'safe';

    const card = document.createElement('div');
    card.className = `s45-variant-card s45-variant-card--${grade} ${isSelected ? 's45-variant-card--on' : ''}`;
    card.dataset.id = variant.id;

    const feasHTML = recheck && n ? `
      <span class="s45-feasibility s45-feasibility--${grade}">
        ${grade === 'safe' ? `✓ ${recheck.opsDisplay ?? ''}` : grade === 'warn' ? `~ ${recheck.opsDisplay ?? ''}` : `✗ TLE`}
      </span>
    ` : '';

    const whenHTML = (variant.when ?? []).map(w =>
      `<div class="s45-when-item">· ${w}</div>`
    ).join('');

    const woHTML = (variant.watchOut ?? []).map(w =>
      `<div class="s45-wo-item">⚠ ${w}</div>`
    ).join('');

    // Phase 4.5 — static "learn more" link, only when a URL was actually
    // verified against the source site (see pattern-resources.js). No link
    // shown at all is more honest than a guessed one that might 404.
    const learnUrl  = typeof PatternResources !== 'undefined' ? PatternResources.getUrl(variant.id) : null;
    const learnHTML = learnUrl
      ? `<a class="s45-learn-more" href="${learnUrl}" target="_blank" rel="noopener noreferrer">Learn more ↗</a>`
      : '';

    card.innerHTML = `
      <div class="s45-variant-check">✓</div>
      <div class="s45-variant-name">${variant.label}</div>
      <div class="s45-variant-tagline">${variant.tagline ?? ''}</div>
      <div class="s45-variant-complex">
        <code class="s45-code">${variant.complexity}</code>
        ${feasHTML}
      </div>
      ${whenHTML ? `<div class="s45-variant-when">${whenHTML}</div>` : ''}
      ${woHTML ? `<div class="s45-variant-wos">${woHTML}</div>` : ''}
      ${learnHTML}
    `;

    card.addEventListener('click', () => _onVariantSelect(variant.id, n, tl, CR, wrapper));
    card.querySelector('.s45-learn-more')?.addEventListener('click', (e) => e.stopPropagation());
    return card;
  }

  function _onVariantSelect(variantId, n, tl, CR, wrapper) {
    _selectedVariant = variantId;

    wrapper.querySelectorAll('.s45-variant-card').forEach(c =>
      c.classList.toggle('s45-variant-card--on', c.dataset.id === variantId)
    );

    const result = (n && CR) ? CR.recheck?.(variantId, n, tl) : null;
    _recheckResult = result;

    const allVariants = _getAllVariants();
    const variant     = allVariants.find(v => v.id === variantId);

    State.setAnswer('stage4_5', {
      variantSelected  : variantId,
      variantComplexity: variant?.complexity ?? null,
      variantFeasible  : result ? result.grade !== 'tle' : null,
      recheckResult    : result,
    });

    // Update recheck
    const recheckRegion = wrapper.querySelector('#s45-recheck-region');
    if (recheckRegion) {
      recheckRegion.innerHTML = '';
      if (result) {
        _renderRecheckResult(recheckRegion, result);
      } else if (n) {
        recheckRegion.innerHTML = `<div class="s45-recheck-placeholder">Could not compute complexity for this variant.</div>`;
      } else {
        recheckRegion.innerHTML = `<div class="s45-recheck-placeholder">N not set — go back to Stage 0 to set your constraint.</div>`;
      }
    }

    // Override region
    _renderOverride(wrapper, null);
    if (result?.grade === 'warn') _renderOverride(wrapper, null);

    _updatePanel(wrapper);
    _checkComplete(wrapper);
  }

  // ─── RECHECK RESULT ────────────────────────────────────────────────────────

  function _renderRecheckResult(container, result) {
    container.innerHTML = '';
    const grade = result.grade ?? 'safe';
    const icon  = grade === 'safe' ? '✓' : grade === 'warn' ? '~' : '✗';

    container.innerHTML = `
      <div class="s45-recheck-card s45-recheck-card--${grade}">
        <div class="s45-recheck-icon">${icon}</div>
        <div class="s45-recheck-content">
          <div class="s45-recheck-message">${result.message ?? ''}</div>
          <div class="s45-recheck-detail">
            <code class="s45-code">${result.complexityClass ?? ''}</code>
            at n = ${(result.n ?? 0).toLocaleString()} =
            <code class="s45-code">${result.opsDisplay ?? ''}</code> ops
            (~${result.estimatedRuntime ?? ''})
          </div>
          ${grade === 'tle' ? `<div class="s45-tle-warn">⚠ This variant will TLE at your N. Choose a faster variant or reconsider the approach.</div>` : ''}
        </div>
      </div>
    `;
  }

  // ─── OVERRIDE SECTION ──────────────────────────────────────────────────────

  function _renderOverride(wrapper, savedDecision) {
    const region = wrapper.querySelector('#s45-override-region');
    if (!region) return;
    region.innerHTML = '';

    const grade = _recheckResult?.grade;
    if (grade !== 'warn') return;

    region.innerHTML = `
      <div class="s45-override">
        <div class="s45-override-note">Borderline complexity — do you want to proceed with this variant anyway?</div>
        <div class="s45-override-btns">
          <button class="s45-override-btn ${savedDecision==='proceed'?'s45-override-btn--on':''}" data-val="proceed">→ Proceed anyway (tight constant may pass)</button>
          <button class="s45-override-btn ${savedDecision==='reconsider'?'s45-override-btn--on':''}" data-val="reconsider">← Reconsider — choose faster variant</button>
        </div>
      </div>
    `;

    region.querySelectorAll('.s45-override-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.val;
        region.querySelectorAll('.s45-override-btn').forEach(b =>
          b.classList.toggle('s45-override-btn--on', b.dataset.val === val)
        );
        State.setAnswer('stage4_5', { overrideDecision: val });
        _updatePanel(wrapper);
        _checkComplete(wrapper);
      });
    });
  }

  // ─── SIDE PANEL ────────────────────────────────────────────────────────────

  function _updatePanel(wrapper) {
    const body = (wrapper ?? document).querySelector('#s45-panel-body');
    if (!body) return;
    body.innerHTML = '';

    const saved = State.getAnswer('stage4_5') ?? {};

    if (!saved.variantSelected) {
      body.innerHTML = '<div class="s45-panel-empty">← Select a variant to see analysis</div>';
      return;
    }

    const allVariants = _getAllVariants();
    const variant     = allVariants.find(v => v.id === saved.variantSelected);
    const grade       = saved.recheckResult?.grade ?? 'safe';

    // Variant info
    const varSec = document.createElement('div');
    varSec.className = 's45-panel-section';
    varSec.innerHTML = `
      <div class="s45-panel-section-title">Selected variant</div>
      <div class="s45-panel-variant-name">${variant?.label ?? saved.variantSelected}</div>
      ${variant?.complexity ? `<code class="s45-panel-complexity">${variant.complexity}</code>` : ''}
    `;
    body.appendChild(varSec);

    // Recheck result
    if (saved.recheckResult) {
      const r = saved.recheckResult;
      const recheckSec = document.createElement('div');
      recheckSec.className = `s45-panel-section s45-panel-section--${grade}`;
      recheckSec.innerHTML = `
        <div class="s45-panel-section-title">At your N</div>
        <div class="s45-panel-recheck-result s45-panel-recheck-result--${grade}">
          ${grade === 'safe' ? '✓' : grade === 'warn' ? '~' : '✗'}
          ${r.message ?? ''}
        </div>
        <div class="s45-panel-recheck-ops">${r.opsDisplay ?? ''} ops (~${r.estimatedRuntime ?? ''})</div>
      `;
      body.appendChild(recheckSec);
    }

    // Override decision
    if (saved.overrideDecision) {
      const overSec = document.createElement('div');
      overSec.className = 's45-panel-section';
      overSec.innerHTML = `
        <div class="s45-panel-section-title">Decision</div>
        <div class="s45-panel-decision">${
          saved.overrideDecision === 'proceed'
            ? '→ Proceeding despite borderline complexity'
            : '← Reconsidering — choosing faster variant'
        }</div>
      `;
      body.appendChild(overSec);
    }

    // Completion gate
    let isReady = false;
    if (grade === 'safe') isReady = true;
    else if (grade === 'warn' && saved.overrideDecision) isReady = true;

    const gate = document.createElement('div');
    gate.className = `s45-panel-gate ${isReady ? 's45-panel-gate--ready' : grade === 'tle' ? 's45-panel-gate--tle' : ''}`;
    if (isReady) {
      gate.textContent = '✓ Ready to proceed to Stage 5';
    } else if (grade === 'tle') {
      gate.textContent = '✗ TLE — must choose a faster variant';
    } else if (grade === 'warn') {
      gate.textContent = 'Make override decision to proceed';
    } else {
      gate.textContent = 'Select a variant to proceed';
    }
    body.appendChild(gate);
  }

  // ─── COMPLETION ────────────────────────────────────────────────────────────

  function _checkComplete(wrapper) {
    const saved  = State.getAnswer('stage4_5') ?? {};
    const grade  = saved.recheckResult?.grade ?? 'safe';
    let valid    = false;

    if (!saved.variantSelected) {
      valid = false;
    } else if (grade === 'safe') {
      valid = true;
    } else if (grade === 'warn') {
      valid = !!saved.overrideDecision;
    } else if (grade === 'tle') {
      valid = false;
      if (typeof Renderer !== 'undefined') {
        Renderer.showToast?.('Selected variant will TLE. Choose a faster variant to proceed.', 'warning');
      }
    }

    // Not a field-count gate (it's a complexity-safety check) — reported
    // as 1/1 for the shared badge, same as any single-decision stage.
    if (typeof GateStandard !== 'undefined') {
      GateStandard.report('stage4_5', { answered: valid ? 1 : 0, total: 1, thresholdCount: 1, meetsThreshold: valid, alternateMet: false, valid });
    }

    if (typeof Renderer !== 'undefined') Renderer.setNextEnabled(valid);

    if (valid) {
      document.dispatchEvent(new CustomEvent('dsa:stage-complete', {
        detail: {
          stageId: 'stage4_5',
          answers: { ...saved, variantFeasible: grade !== 'tle' },
        },
      }));
    }
  }

  // ─── FALLBACKS & HELPERS ───────────────────────────────────────────────────

  function _getAllVariants() {
    const BSV   = typeof BinarySearchVariants   !== 'undefined' ? BinarySearchVariants   : null;
    const DPV   = typeof DPVariants             !== 'undefined' ? DPVariants             : null;
    const GV    = typeof GraphVariants          !== 'undefined' ? GraphVariants          : null;
    const TPV   = typeof TwoPointerVariants     !== 'undefined' ? TwoPointerVariants     : null;
    const SWV   = typeof SlidingWindowVariants  !== 'undefined' ? SlidingWindowVariants  : null;
    const GRV   = typeof GreedyVariants         !== 'undefined' ? GreedyVariants         : null;
    const STRV  = typeof StringVariants         !== 'undefined' ? StringVariants         : null;
    const MATHV = typeof MathVariants           !== 'undefined' ? MathVariants           : null;
    const DSV   = typeof DataStructureVariants  !== 'undefined' ? DataStructureVariants  : null;
    const GSV   = typeof GeometrySweepVariants  !== 'undefined' ? GeometrySweepVariants  : null;
    const GTV   = typeof GameTheoryVariants     !== 'undefined' ? GameTheoryVariants     : null;
    const RQV   = typeof RangeQueryVariants     !== 'undefined' ? RangeQueryVariants     : null;
    return [
      ...(BSV?.getAll?.()   ?? []),
      ...(DPV?.getAll?.()   ?? []),
      ...(GV?.getAll?.()    ?? []),
      ...(TPV?.getAll?.()   ?? []),
      ...(SWV?.getAll?.()   ?? []),
      ...(GRV?.getAll?.()   ?? []),
      ...(STRV?.getAll?.()  ?? []),
      ...(MATHV?.getAll?.() ?? []),
      ...(DSV?.getAll?.()   ?? []),
      ...(GSV?.getAll?.()   ?? []),
      ...(GTV?.getAll?.()   ?? []),
      ...(RQV?.getAll?.()   ?? []),
    ];
  }

  // Phase 2.3 — local telemetry on how often the fallback (no real family
  // match) fires. No external service; this is purely so a future pass can
  // see which families to build real coverage for next, same discipline as
  // core/outcomes.js's localStorage-backed log.
  function _logFallbackTelemetry(directions) {
    const KEY = 'dsa_fallback_telemetry_v1';
    const MAX_ENTRIES = 200;
    try {
      const raw   = localStorage.getItem(KEY);
      const list  = raw ? JSON.parse(raw) : [];
      list.push({
        at: Date.now(),
        attemptedFamilies: directions.map(d => d.family ?? d.id ?? 'unknown'),
      });
      localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX_ENTRIES)));
    } catch (e) {
      console.warn('[Stage4_5] fallback telemetry log failed:', e);
    }
  }

  // ─── STYLES ────────────────────────────────────────────────────────────────

  function _injectStyles() {
    if (document.getElementById('s45-styles')) return;
    const style = document.createElement('style');
    style.id = 's45-styles';
    style.textContent = `
    .s45-shell {
      --s45-bg: var(--void);
      --s45-surface: var(--surface-0);
      --s45-surface2: var(--surface-1);
      --s45-border: rgba(232,223,200,.10);
      --s45-border2: rgba(232,223,200,.16);
      --s45-ink: var(--text-primary);
      --s45-ink2: var(--text-secondary);
      --s45-muted: var(--text-muted);
      --s45-blue: #e8b93f;
      --s45-blue-bg: rgba(232,185,63,.14);
      --s45-blue-b: rgba(232,185,63,.35);
      --s45-green: #5cc98a;
      --s45-green-bg: rgba(92,201,138,.14);
      --s45-green-b: rgba(92,201,138,.35);
      --s45-warn: #e8944a;
      --s45-warn-bg: rgba(232,148,74,.14);
      --s45-warn-b: rgba(232,148,74,.35);
      --s45-red: #e05a5a;
      --s45-red-bg: rgba(224,90,90,.14);
      --s45-red-b: rgba(224,90,90,.35);
      --s45-mono    : 'Space Mono', monospace;
      --s45-sans    : 'DM Sans', system-ui, sans-serif;
      display       : flex;
      gap           : 24px;
      align-items   : flex-start;
      background    : var(--s45-bg);
      min-height    : 100%;
      font-family   : var(--s45-sans);
      color         : var(--s45-ink);
      padding       : 28px;
    }
    .s45-main { flex: 1; display: flex; flex-direction: column; gap: 32px; min-width: 0; }
    .s45-rule { font-family: var(--s45-mono); font-size: .71rem; color: var(--s45-muted); padding: 10px 16px; background: var(--s45-surface); border: 1px solid var(--s45-border); border-left: 3px solid var(--s45-blue); border-radius: 0 8px 8px 0; line-height: 1.6; }

    /* Sections */
    .s45-section { display: flex; flex-direction: column; gap: 14px; }
    .s45-section-header { display: flex; align-items: flex-start; gap: 14px; }
    .s45-section-num    { font-family: var(--s45-mono); font-size: .65rem; font-weight: 700; color: #fff; background: var(--s45-blue); width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
    .s45-section-title  { font-size: .92rem; font-weight: 600; color: var(--s45-ink); }
    .s45-section-sub    { font-size: .73rem; color: var(--s45-muted); margin-top: 2px; }

    /* Direction cards */
    .s45-direction-grid { display: flex; flex-direction: column; gap: 7px; }
    .s45-dir-card { background: var(--s45-surface); border: 1.5px solid var(--s45-border); border-left: 3px solid var(--s45-blue); border-radius: 0 10px 10px 0; padding: 12px 16px; display: flex; flex-direction: column; gap: 5px; }
    .s45-dir-label  { font-size: .84rem; font-weight: 600; color: var(--s45-blue); }
    .s45-dir-why    { font-size: .74rem; color: var(--s45-ink2); line-height: 1.5; }
    .s45-dir-verify { font-size: .72rem; color: var(--s45-muted); line-height: 1.4; padding: 5px 9px; background: var(--s45-surface2); border-radius: 6px; }
    .s45-verify-label { font-weight: 600; color: var(--s45-blue); margin-right: 4px; }

    /* Variant area */
    .s45-variant-area    { display: flex; flex-direction: column; gap: 16px; }
    .s45-group-title     { font-size: .78rem; font-weight: 600; color: var(--s45-ink2); border-bottom: 1px solid var(--s45-border); padding-bottom: 6px; }
    .s45-variant-grid    { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 9px; }
    .s45-variant-card    { position: relative; background: var(--s45-surface); border: 1.5px solid var(--s45-border); border-radius: 12px; padding: 14px; cursor: pointer; display: flex; flex-direction: column; gap: 7px; transition: all .14s; user-select: none; box-shadow: 0 1px 4px rgba(0,0,0,.04); }
    .s45-variant-card:hover { transform: translateY(-1px); box-shadow: 0 3px 10px rgba(0,0,0,.07); }
    .s45-variant-card--safe { border-left: 3px solid var(--s45-green); }
    .s45-variant-card--warn { border-left: 3px solid var(--s45-warn);  }
    .s45-variant-card--tle  { border-left: 3px solid var(--s45-red);   opacity: .7; }
    .s45-variant-card--on   { border-color: var(--s45-blue); background: var(--s45-blue-bg); box-shadow: 0 0 0 3px rgba(232,185,63,.08); }
    .s45-variant-check { position: absolute; top: 9px; right: 9px; width: 17px; height: 17px; background: var(--s45-blue); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: .58rem; color: #fff; font-weight: 700; opacity: 0; transform: scale(.6); transition: opacity .14s, transform .14s; }
    .s45-variant-card--on .s45-variant-check { opacity: 1; transform: scale(1); }
    .s45-variant-name    { font-size: .84rem; font-weight: 600; color: var(--s45-ink); line-height: 1.3; }
    .s45-variant-tagline { font-size: .7rem; color: var(--s45-muted); line-height: 1.4; }
    .s45-variant-complex { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .s45-code { font-family: var(--s45-mono); font-size: .7rem; background: var(--s45-surface2); color: var(--s45-blue); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--s45-border); }
    .s45-feasibility       { font-family: var(--s45-mono); font-size: .64rem; font-weight: 700; padding: 2px 8px; border-radius: 9999px; border: 1px solid; }
    .s45-feasibility--safe { background: var(--s45-green-bg); color: var(--s45-green); border-color: var(--s45-green-b); }
    .s45-feasibility--warn { background: var(--s45-warn-bg);  color: var(--s45-warn);  border-color: var(--s45-warn-b); }
    .s45-feasibility--tle  { background: var(--s45-red-bg);   color: var(--s45-red);   border-color: var(--s45-red-b);  }
    .s45-variant-when { display: flex; flex-direction: column; gap: 3px; }
    .s45-when-item    { font-size: .7rem; color: var(--s45-muted); line-height: 1.3; }
    .s45-variant-wos  { display: flex; flex-direction: column; gap: 4px; }
    .s45-wo-item      { font-size: .7rem; color: var(--s45-warn); padding: 4px 8px; background: var(--s45-warn-bg); border: 1px solid var(--s45-warn-b); border-radius: 5px; line-height: 1.4; }
    .s45-no-variants  { font-size: .76rem; color: var(--s45-muted); padding: 14px; background: var(--s45-surface2); border: 1px solid var(--s45-border); border-radius: 8px; line-height: 1.6; }
    .s45-learn-more   { align-self: flex-start; font-size: .68rem; color: var(--s45-blue); text-decoration: none; }
    .s45-learn-more:hover { text-decoration: underline; }
    .s45-fallback-honest       { display: flex; flex-direction: column; gap: 12px; padding: 20px; background: var(--s45-surface2); border: 1.5px dashed var(--s45-border2); border-radius: 10px; }
    .s45-fallback-honest__title { font-size: .92rem; font-weight: 700; color: var(--s45-ink); }
    .s45-fallback-honest__body  { font-size: .82rem; color: var(--s45-ink2); line-height: 1.6; }
    .s45-fallback-honest__btn   { align-self: flex-start; padding: 9px 16px; font-size: .8rem; font-weight: 600; color: var(--s45-ink); background: var(--s45-surface); border: 1.5px solid var(--s45-border2); border-radius: 8px; cursor: pointer; }
    .s45-fallback-honest__btn:hover { border-color: var(--s45-gold, #e8b93f); }

    /* Recheck */
    .s45-recheck-placeholder { font-family: var(--s45-mono); font-size: .72rem; color: var(--s45-muted); text-align: center; padding: 20px; background: var(--s45-surface2); border: 1.5px dashed var(--s45-border); border-radius: 9px; }
    .s45-recheck-card        { display: flex; align-items: flex-start; gap: 14px; padding: 16px; border-radius: 12px; border: 1.5px solid; }
    .s45-recheck-card--safe  { background: var(--s45-green-bg); border-color: var(--s45-green-b); }
    .s45-recheck-card--warn  { background: var(--s45-warn-bg);  border-color: var(--s45-warn-b);  }
    .s45-recheck-card--tle   { background: var(--s45-red-bg);   border-color: var(--s45-red-b);   }
    .s45-recheck-icon        { font-family: var(--s45-mono); font-size: 1.5rem; font-weight: 700; flex-shrink: 0; line-height: 1; }
    .s45-recheck-card--safe .s45-recheck-icon { color: var(--s45-green); }
    .s45-recheck-card--warn .s45-recheck-icon { color: var(--s45-warn);  }
    .s45-recheck-card--tle  .s45-recheck-icon { color: var(--s45-red);   }
    .s45-recheck-message     { font-size: .86rem; font-weight: 600; color: var(--s45-ink); margin-bottom: 4px; }
    .s45-recheck-detail      { font-size: .74rem; color: var(--s45-ink2); line-height: 1.5; }
    .s45-tle-warn            { font-size: .74rem; color: var(--s45-red); margin-top: 6px; padding: 7px 10px; background: rgba(224,90,90,.05); border: 1px solid var(--s45-red-b); border-radius: 6px; }

    /* Override */
    .s45-override      { padding: 14px; background: var(--s45-surface2); border: 1.5px solid var(--s45-warn-b); border-radius: 9px; display: flex; flex-direction: column; gap: 10px; margin-top: 10px; }
    .s45-override-note { font-size: .78rem; font-weight: 500; color: var(--s45-ink2); }
    .s45-override-btns { display: flex; gap: 9px; flex-wrap: wrap; }
    .s45-override-btn  { flex: 1; padding: 9px 14px; border: 1.5px solid var(--s45-border); border-radius: 8px; background: var(--s45-surface); font-size: .78rem; font-weight: 500; cursor: pointer; transition: all .12s; color: var(--s45-ink2); }
    .s45-override-btn:hover  { border-color: var(--s45-border2); }
    .s45-override-btn--on    { border-color: var(--s45-blue); background: var(--s45-blue-bg); color: var(--s45-blue); font-weight: 600; }

    /* Side panel */
    .s45-panel { width: 268px; flex-shrink: 0; background: var(--s45-surface); border: 1.5px solid var(--s45-border); border-radius: 12px; overflow: hidden; position: sticky; top: 80px; max-height: calc(100vh - 120px); display: flex; flex-direction: column; }
    .s45-panel-header { padding: 13px 16px 11px; border-bottom: 1px solid var(--s45-border); background: var(--surface-3); }
    .s45-panel-title  { font-size: .82rem; font-weight: 700; color: var(--s45-ink); }
    .s45-panel-sub    { font-size: .66rem; color: var(--s45-muted); margin-top: 2px; }
    .s45-panel-body   { flex: 1; overflow-y: auto; padding: 14px 16px; display: flex; flex-direction: column; gap: 16px; }
    .s45-panel-empty  { font-size: .74rem; color: var(--s45-muted); font-style: italic; text-align: center; padding: 24px 0; line-height: 1.6; }
    .s45-panel-section { display: flex; flex-direction: column; gap: 7px; }
    .s45-panel-section--safe { background: var(--s45-green-bg); border: 1px solid var(--s45-green-b); border-radius: 8px; padding: 10px 12px; }
    .s45-panel-section--warn { background: var(--s45-warn-bg);  border: 1px solid var(--s45-warn-b);  border-radius: 8px; padding: 10px 12px; }
    .s45-panel-section--tle  { background: var(--s45-red-bg);   border: 1px solid var(--s45-red-b);   border-radius: 8px; padding: 10px 12px; }
    .s45-panel-section-title { font-family: var(--s45-mono); font-size: .58rem; letter-spacing: 1.5px; text-transform: uppercase; color: var(--s45-muted); margin-bottom: 2px; }
    .s45-panel-section--safe .s45-panel-section-title { color: var(--s45-green); }
    .s45-panel-section--warn .s45-panel-section-title { color: var(--s45-warn); }
    .s45-panel-section--tle  .s45-panel-section-title { color: var(--s45-red); }
    .s45-panel-variant-name  { font-size: .82rem; font-weight: 600; color: var(--s45-ink); }
    .s45-panel-complexity    { font-family: var(--s45-mono); font-size: .7rem; color: var(--s45-blue); background: var(--s45-blue-bg); padding: 2px 7px; border-radius: 4px; border: 1px solid var(--s45-blue-b); }
    .s45-panel-recheck-result      { font-size: .8rem; font-weight: 600; display: flex; align-items: center; gap: 6px; }
    .s45-panel-recheck-result--safe{ color: var(--s45-green); }
    .s45-panel-recheck-result--warn{ color: var(--s45-warn);  }
    .s45-panel-recheck-result--tle { color: var(--s45-red);   }
    .s45-panel-recheck-ops  { font-family: var(--s45-mono); font-size: .64rem; color: var(--s45-muted); }
    .s45-panel-decision     { font-size: .76rem; color: var(--s45-ink2); line-height: 1.4; }
    .s45-panel-gate { padding: 10px 12px; border-radius: 8px; font-size: .74rem; font-weight: 500; text-align: center; background: var(--s45-surface2); border: 1.5px solid var(--s45-border); color: var(--s45-muted); }
    .s45-panel-gate--ready { background: var(--s45-green-bg); border-color: var(--s45-green-b); color: var(--s45-green); }
    .s45-panel-gate--tle   { background: var(--s45-red-bg);   border-color: var(--s45-red-b);   color: var(--s45-red); }
    .s45-panel-body::-webkit-scrollbar { width: 3px; }
    .s45-panel-body::-webkit-scrollbar-thumb { background: var(--s45-border2); border-radius: 4px; }

    @media (max-width: 900px) {
      .s45-shell { flex-direction: column; padding: 16px; }
      .s45-panel { width: 100%; position: static; max-height: none; }
      .s45-variant-grid { grid-template-columns: 1fr; }
    }
    `;
    document.head.appendChild(style);
  }

  // ─── LIFECYCLE ─────────────────────────────────────────────────────────────

  function onMount(state) {
    const saved = state.answers?.stage4_5;
    const grade = saved?.recheckResult?.grade ?? 'safe';
    const valid = !!saved?.variantSelected && (grade === 'safe' || (grade === 'warn' && saved.overrideDecision));
    if (typeof GateStandard !== 'undefined') {
      GateStandard.report('stage4_5', { answered: valid ? 1 : 0, total: 1, thresholdCount: 1, meetsThreshold: valid, alternateMet: false, valid });
    }
    if (valid && typeof Renderer !== 'undefined') Renderer.setNextEnabled(true);
  }

  function cleanup() {
    _state           = null;
    _selectedVariant = null;
    _recheckResult   = null;
  }

  return { render, onMount, cleanup };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = Stage4_5;