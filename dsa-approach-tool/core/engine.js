// core/engine.js
// Central decision engine — manages stage flow, orchestrates all modules,
// listens for events, drives the entire tool

const Engine = (() => {

  // ─── PRIVATE ───────────────────────────────────────────────────────────────

  let _initialized   = false;
  let _autoSaveTimer = null;
  const AUTO_SAVE_INTERVAL = 30000;

  let _touchStartX = 0;
  let _touchStartY = 0;

  // ─── INIT ──────────────────────────────────────────────────────────────────

  function init() {
    if (_initialized) return;
    _initialized = true;

    // 1. Try to restore saved session
    const saved = SessionUtils.load();

    // 2. Init State
    State.init(saved ?? null);

    // 3. Init Renderer (Renderer.init already called by shell — safe to call twice,
    //    _ensureContainers just warns if missing, _bindNavButtons is idempotent)
    Renderer.init();

    // 4. Bind all custom events
    _bindEvents();

    // 5. Subscribe to State changes
    _subscribeToState();

    // 6. Start auto-save
    _startAutoSave();

    // 7. Navigate to entry point
    const entryStage = saved
      ? Router.resumeEntry(State.get())
      : Router.normalEntry();

    _navigateTo(entryStage, 'forward');

    console.info(`[Engine] Initialized. Entry: ${entryStage}`);
  }

  // ─── NAVIGATION ────────────────────────────────────────────────────────────

  function _navigateTo(stageId, direction = 'forward') {
    if (!stageId) return;

    const state = State.get();

    if (!Router.isAccessible(stageId, state) && direction === 'forward') {
      console.warn(`[Engine] Stage "${stageId}" not accessible yet`);
      Renderer.showToast('Complete current stage first', 'warning');
      return;
    }

    State.setCurrentStage(stageId);
    Renderer.renderStage(stageId, State.get(), direction);
  }

  function _navigateNext() {
    const state   = State.get();
    const current = State.getCurrentStage();

    if (!State.isStageComplete(current)) {
      Renderer.showToast('Answer all required questions before continuing', 'warning');
      _shakeNextButton();
      return;
    }

    const next = Router.next(current, state);
    if (!next) {
      _onSessionComplete();
      return;
    }

    _navigateTo(next, 'forward');
  }

  function _navigateBack() {
    const result = Router.goBack(State.get());
    if (!result) return;

    State.clearAnswersFrom(result.clearFrom);
    State.clearDirections();
    State.navigateBack();

    _navigateTo(result.targetStage, 'back');
  }

  // force=true bypasses Router.jumpTo's skip-forward redirect and renders
  // stageId directly — needed for hard-stop recovery routes (e.g. Stage 5's
  // premise-contradiction banner) that must land on a specific stage even
  // when that stage's normal skipIf would otherwise bounce navigation past
  // it (e.g. Stage 3 on the Fast Path, whose skipIf is simply "fast path").
  function _jumpTo(stageId, force = false) {
    const target = force ? stageId : Router.jumpTo(stageId, State.get());
    if (!target) return;
    _navigateTo(target, 'back');
  }

  // ─── STAGE COMPLETION ──────────────────────────────────────────────────────

  function onStageComplete(stageId, answers) {
    State.setAnswer(stageId, answers);
    State.markStageComplete(stageId);
    Renderer.setNextEnabled(true);
    _postProcess(stageId);
    _autoSave();
  }

  // ─── POST-PROCESSING PER STAGE ─────────────────────────────────────────────

  function _postProcess(stageId) {
    const state = State.get();

    switch (stageId) {

      case 'stage0': {
        const a = state.answers?.stage0;
        if (a?.n) {
          const report = MathUtils.buildFeasibilityReport(
            a.n, a.q ?? 1, a.timeLimit ?? 1, a.memLimit ?? 256
          );
          const eliminated = report
            .filter(r => r.status === 'red')
            .map(r => r.complexityId);

          State.setAnswer('stage0', {
            feasibility: report,
            eliminated,
            memReport  : MathUtils.buildMemoryReport(a.n, a.memLimit ?? 256),
            memChecked : true,
          });
          State.setOutput('feasibilityReport', report);
          State.setOutput('eliminatedClasses', eliminated);
        }
        break;
      }

      case 'stage1': {
        const a = state.answers?.stage1;
        if (a) {
          State.setOutput('inputSummary', {
            inputTypes      : a.inputTypes       ?? [],
            secondarySignals: a.secondarySignals ?? [],
            queryType       : a.queryType,
          });
        }
        break;
      }

      case 'stage2': {
        const a = state.answers?.stage2;
        if (a) {
          State.setOutput('outputSummary', {
            outputForm      : a.outputForm,
            optimizationType: a.optimizationType,
            solutionDepth   : a.solutionDepth,
          });
        }
        break;
      }

      case 'fastpath': {
        // Fast path replaces Stage 3's structural derivation with the
        // direction the user already had in mind. Confidence is marked
        // 'low' since it bypassed structural verification — Stage 5 is
        // where it actually gets checked.
        const fp = state.answers?.fastpath ?? {};
        State.clearDirections();
        State.addDirection({
          id          : 'fastpath_direction',
          family      : fp.directionFamily || 'other',
          label       : fp.direction || 'Selected via fast path',
          why         : 'Selected directly via the fast path — structural analysis was skipped.',
          verifyBefore: 'Confirm this direction still fits once Stage 5 verification runs against it.',
          wouldFailIf : 'The structural properties this direction assumes turn out not to hold.',
          confidence  : 'low',
        });
        break;
      }

      case 'stage3': {
        const directions = _deriveDirections(state);
        State.clearDirections();
        directions.forEach(d => State.addDirection(d));
        State.setOutput('structuralFindings', state.answers?.stage3?.properties ?? {});

        // Stage 3's inline DP sub-classifier / graph deep-dive sections (when
        // triggered) arrive bundled in this same answers payload — refine the
        // matching direction card with the extra detail if present.
        if (state.answers?.stage3?.dpSubtype) {
          _refineDirection(state, 'dp', { subtype: state.answers.stage3.dpSubtype });
        }
        if (state.answers?.stage3?.graphGoal) {
          _refineDirection(state, 'graph', { goal: state.answers.stage3.graphGoal });
        }
        break;
      }

      case 'stage3_5': {
        const applied = state.answers?.stage3_5?.transformationApplied;
        if (applied) _applyTransformation(applied, state);
        break;
      }

      case 'stage4': {
        // Supplementary directions only detectable from Stage 4's hidden-
        // structure checkboxes — see _deriveStage4Directions for why this
        // can't happen at Stage 3 time. Adds to, never replaces, what
        // Stage 3 already found.
        const extra = _deriveStage4Directions(state);
        extra.forEach(d => State.addDirection(d));
        break;
      }

      case 'stage4_5': {
        const variant = state.answers?.stage4_5?.variantComplexity;
        if (variant) {
          const a      = state.answers?.stage0;
          const status = MathUtils.isFeasible(a.n, variant, a.timeLimit ?? 1);
          State.setAnswer('stage4_5', { variantFeasible: status !== 'red' });
          if (status === 'red') {
            Renderer.showWarning(
              `Selected variant (${variant}) is infeasible at n=${a.n}. Reconsider.`
            );
          }
        }
        break;
      }

      case 'stage6_5': {
        // stage6-5.js computes and persists its own authoritative score/band
        // into answers.stage6_5 on every render (it accounts for things the
        // legacy ConfidenceUtils never knew about, e.g. the fast path's
        // rescaled ceiling). Mirror that into state.confidence — the
        // canonical place other code (session export, Outcomes) reads from
        // — instead of recomputing via the legacy module, which was
        // silently overwriting the correct score and could re-disable Next
        // right after stage6-5.js's own gate had just enabled it.
        const s65 = state.answers?.stage6_5 ?? {};
        if (s65.score != null) {
          State.setConfidence({
            score     : s65.score,
            level     : s65.band,
            earned    : s65.report?.earned    ?? [],
            deducted  : s65.report?.deducted  ?? [],
            gateAction: null,
          });
        }
        break;
      }

      case 'stage7': {
        SessionUtils.pushToHistory(State.get());
        break;
      }

      // ── Default: no post-processing needed for other stages ─────────────
      default:
        break;
    }
  }

  // ─── DIRECTION DERIVATION ──────────────────────────────────────────────────

  // Shared by both derivation passes below (Stage 3's initial pass and Stage
  // 4's supplementary pass) — is a family still worth suggesting at this n?
  //
  // Previously this was a single per-family "minimum complexity" string
  // (DIRECTION_MIN_COMPLEXITY), checked against Stage 0's coarse eliminated-
  // classes list. That gates the whole family behind its SINGLE WORST member
  // — confirmed as a real bug for game_theory (gt_sprague_grundy is o(n),
  // but the family was gated at o(2^n), gt_backtracking/gt_minimax's cost —
  // eliminating o(2^n) silently hid Sprague-Grundy too, even though it's
  // polynomial and would have been perfectly fine). The same shape of bug
  // exists in dp (dp_cht/dp_divide_conquer are o(nlogn) but the family was
  // gated at dp_standard's o(n^2)), graph (BFS/DFS/Tarjan/Kahn are o(n) but
  // the family was gated at Dijkstra/Kruskal's o(nlogn)), and range_query
  // (rq_dsu is o(n) but the family was gated at o(nlogn)) — none of those
  // are hypothetical, they're all real spreads in ComplexityRecheck's own
  // VARIANT_COMPLEXITY_MAP, the same source of truth Stage 4.5's per-card
  // feasibility badges already use.
  //
  // Fix: gate on whether AT LEAST ONE real variant in the family is still
  // feasible at this n, using that same per-variant map — not a single
  // family-level string. Fails open (doesn't gate) if Stage 0 hasn't been
  // answered yet, or if ComplexityRecheck has no variant list for a family
  // (nothing to check against, so nothing to hide).
  function _familyHasFeasibleVariant(family, state) {
    if (typeof ComplexityRecheck === 'undefined') return true;
    const n = state.answers?.stage0?.n;
    if (!n) return true;
    const timeLimit = state.answers?.stage0?.timeLimit ?? 1;
    const variantIds = ComplexityRecheck.getVariantIdsForFamily(family);
    if (!variantIds.length) return true;
    return variantIds.some(id => ComplexityRecheck.isFeasible(id, n, timeLimit));
  }

  function _deriveDirections(state) {
    const props  = state.answers?.stage3?.properties ?? {};
    const output = state.answers?.stage2             ?? {};
    const input  = state.answers?.stage1             ?? {};
    const directions = [];

    const p = props;

    // GREEDY
    if (
      p.orderSensitivity  === 'no'  &&
      p.localOptimality   === 'yes' &&
      p.subproblemOverlap === 'no'
    ) {
      directions.push({
        id          : 'greedy',
        family      : 'greedy',
        label       : 'Greedy',
        why         : 'Can sort freely, local optimality holds, choices are independent',
        verifyBefore: 'Try to construct a counter-example where the greedy rule fails',
        wouldFailIf : 'A locally optimal choice leads to globally suboptimal result',
        confidence  : 'medium',
      });
    }

    // BINARY SEARCH ON ANSWER
    if (
      p.feasibilityBoundary === 'yes' &&
      (
        output.optimizationType === 'maximize' ||
        output.optimizationType === 'minimize' ||
        output.optimizationType === 'max_min'  ||
        output.optimizationType === 'min_max'
      )
    ) {
      directions.push({
        id          : 'binary_search_answer',
        family      : 'binary_search',
        label       : 'Binary Search on Answer',
        why         : 'Monotonic feasibility boundary — if X works, X±1 also works',
        verifyBefore: 'Write isFeasible(X). Verify monotonicity with 2 concrete examples.',
        wouldFailIf : 'Feasibility is not monotonic — valid/invalid/valid pattern exists',
        confidence  : 'medium',
      });
    }

    // DYNAMIC PROGRAMMING
    if (
      (p.subproblemOverlap === 'yes_direct' || p.subproblemOverlap === 'yes_split') &&
      (p.dependencyStructure === 'dag' || p.dependencyStructure === 'unsure')
    ) {
      directions.push({
        id          : 'dp',
        family      : 'dp',
        label       : 'Dynamic Programming',
        why         : 'Overlapping subproblems with one-directional dependencies',
        verifyBefore: 'Define your state. Check completeness and non-redundancy.',
        wouldFailIf : 'Circular dependencies exist — subproblems depend on each other',
        confidence  : 'medium',
      });
    }

    // BACKTRACKING
    if (
      p.stateSpace  === 'path_needed' &&
      p.searchSpace === 'decision_tree'
    ) {
      const n = state.answers?.stage0?.n ?? 0;
      if (n <= 20) {
        directions.push({
          id          : 'backtracking',
          family      : 'backtracking',
          label       : 'Backtracking',
          why         : 'Exhaustive search over decision tree, path tracking needed, n is small',
          verifyBefore: 'Confirm n is small enough. Estimate branching factor ^ depth.',
          wouldFailIf : 'n > 20 without effective pruning',
          confidence  : 'high',
        });
      }
    }

    // DIVIDE AND CONQUER
    if (
      p.subproblemOverlap   === 'yes_split' &&
      p.dependencyStructure === 'dag'
    ) {
      directions.push({
        id          : 'divide_conquer',
        family      : 'divide_conquer',
        label       : 'Divide and Conquer',
        why         : 'Problem splits into independent subproblems that combine cleanly',
        verifyBefore: 'Confirm subproblems are truly independent — no shared state',
        wouldFailIf : 'Subproblems overlap — use DP with memoization instead',
        confidence  : 'medium',
      });
    }

    // GRAPH
    const graphInputs = ['graph_edge_list', 'graph_adjacency', 'implicit_graph', 'grid'];
    const hasGraph    = (input.inputTypes ?? []).some(t => graphInputs.includes(t));
    if (hasGraph) {
      directions.push({
        id          : 'graph',
        family      : 'graph',
        label       : 'Graph Traversal / Algorithm',
        why         : 'Input is explicitly a graph or grid — graph algorithms apply',
        verifyBefore: 'Identify: weighted or not? Directed or not? Negative weights? Goal?',
        wouldFailIf : 'Wrong algorithm for graph type — e.g. BFS on weighted graph',
        confidence  : 'medium',
      });
    }

    // TWO POINTER / SLIDING WINDOW
    if (
      p.orderSensitivity === 'no' &&
      (input.inputTypes ?? []).some(t =>
        ['single_array', 'two_arrays', 'single_string'].includes(t)
      ) &&
      p.searchSpace === 'intervals'
    ) {
      directions.push({
        id          : 'two_pointer',
        family      : 'two_pointer',
        label       : 'Two Pointer / Sliding Window',
        why         : 'Sequence input with interval search space and monotonic window validity',
        verifyBefore: 'Confirm window validity is monotonic — shrinking from left always helps',
        wouldFailIf : 'Window validity is non-monotonic — valid/invalid/valid pattern',
        confidence  : 'medium',
      });
    }

    // STRING — input is explicitly string-shaped, same unconditional pattern
    // as GRAPH above (the input TYPE itself is the signal, not a derived
    // property — Stage 1 is always answered by the time Stage 3 completes).
    const stringInputs = ['single_string', 'two_strings', 'multiple_strings'];
    const hasString     = (input.inputTypes ?? []).some(t => stringInputs.includes(t));
    if (hasString) {
      directions.push({
        id          : 'string',
        family      : 'string',
        label       : 'String Algorithm',
        why         : 'Input is explicitly string-shaped — pattern-matching/string-processing algorithms apply',
        verifyBefore: 'Identify: single pattern or multiple? Matching, or structural (palindrome/periodicity)?',
        wouldFailIf : 'A general string technique is picked where a simpler structural one (e.g. two pointer) already fits',
        confidence  : 'medium',
      });
    }

    // GEOMETRY / SWEEP — Stage 1's existing "geometry" secondary signal
    // ('Input is 2D points / coordinates') is a strong, already-collected,
    // 1:1 match for this family — same justification strength as GRAPH/STRING.
    const secondary = input.secondarySignals ?? [];
    if (secondary.includes('geometry')) {
      directions.push({
        id          : 'geometry_sweep',
        family      : 'geometry_sweep',
        label       : 'Geometry / Sweep',
        why         : 'You flagged the input as 2D points/coordinates in Stage 1',
        verifyBefore: 'Identify the specific goal: hull, pairwise distance, interval overlap, or offline query batching?',
        wouldFailIf : 'The problem is actually 1D (intervals on a line) — a simpler sweep or sort+scan may already suffice',
        confidence  : 'medium',
      });
    }

    // MATH — Stage 1's "modulo" secondary signal ('Answer requires modulo
    // 10^9+7') is a real, deliberate signal, but a partial proxy: it
    // reliably implies modular-arithmetic/combinatorics-flavored math, not
    // math-variants.js's full breadth (e.g. it says nothing about needing a
    // sieve or CRT specifically) — same acknowledged imprecision as
    // DATA_STRUCTURE's monotonic-stack proxy below.
    if (secondary.includes('modulo')) {
      directions.push({
        id          : 'math',
        family      : 'math',
        label       : 'Number Theory / Combinatorics',
        why         : 'You flagged that the answer requires modulo 10^9+7 in Stage 1',
        verifyBefore: 'Identify what specifically needs mod: counting/combinatorics, exponentiation, or a precomputation like a sieve?',
        wouldFailIf : 'The modulo requirement is incidental (e.g. one final division) rather than driving the core algorithm',
        confidence  : 'low',
      });
    }

    // DATA STRUCTURE — Stage 1's existing "binary" secondary signal already
    // says "Bit manipulation" in its own description text; reusing it here
    // rather than inventing a new checkbox for something already collected.
    if (secondary.includes('binary')) {
      directions.push({
        id          : 'data_structure',
        family      : 'data_structure',
        label       : 'Specialized Data Structure',
        why         : 'You flagged binary (0/1) values in Stage 1 — XOR/bitmask tricks and bit manipulation often apply',
        verifyBefore: 'Confirm the operation actually needs bit-level tricks, not just a boolean array',
        wouldFailIf : 'The 0/1 values are incidental (e.g. a visited flag) rather than something to manipulate at the bit level',
        confidence  : 'low',
      });
    }

    if (secondary.includes('heap_priority')) {
      directions.push({
        id          : 'data_structure',
        family      : 'data_structure',
        label       : 'Specialized Data Structure',
        why         : 'You flagged needing the running min/max as elements change in Stage 1 — that\'s a Heap/Priority Queue',
        verifyBefore: 'Confirm you need the min/max repeatedly, not just once — a single min/max is a plain O(n) scan',
        wouldFailIf : 'The min/max is only needed once at the end, not repeatedly as elements are added/removed',
        confidence  : 'medium',
      });
    }

    if (secondary.includes('hashing')) {
      directions.push({
        id          : 'data_structure',
        family      : 'data_structure',
        label       : 'Specialized Data Structure',
        why         : 'You flagged needing fast existence/count/grouping lookups in Stage 1 — that\'s Hashing',
        verifyBefore: 'Confirm the lookups are the bottleneck, not incidental — if the input is small, a plain scan may already be fast enough',
        wouldFailIf : 'Order matters for the answer — hashing loses order, an array/sorted structure may be needed instead',
        confidence  : 'medium',
      });
    }

    // GAME THEORY — new signal, not yet cross-checked against real usage the
    // way geometry/modulo were, so kept at 'low' confidence deliberately.
    if (secondary.includes('game_theory')) {
      directions.push({
        id          : 'game_theory',
        family      : 'game_theory',
        label       : 'Game Theory',
        why         : 'You flagged alternating two-player turns under optimal play in Stage 1',
        verifyBefore: 'Confirm both players play optimally (not randomly) and the game has no hidden information',
        wouldFailIf : 'The "game" is actually a single-agent optimization — that\'s DP/Greedy, not game theory',
        confidence  : 'low',
      });
    }

    return directions.filter(d => _familyHasFeasibleVariant(d.family, state));
  }

  // Supplementary pass, run at Stage 4 completion — not Stage 3. These three
  // families' only reliable signal today is Stage 4's "hidden structure"
  // checkboxes, which don't exist yet when _deriveDirections() runs at
  // Stage 3. Adds to the existing direction set via State.addDirection
  // (which already dedups by id) — does not clear what Stage 3 already found.
  //
  // NOTE: the seven real hidden-structure ids (verified directly against the
  // live DOM, not assumed) are hs_monotonic_stack, hs_prefix_sum,
  // hs_two_pointer, hs_sliding_window, hs_union_find, hs_segment_tree,
  // hs_trie — sourced from constraint-interactions.js. hs_segment_tree
  // covers range_query (Segment Tree is literally one of that family's own
  // variants). hs_sliding_window is its own distinctly-labeled checkbox
  // (Phase 3 fix — it used to piggyback on hs_two_pointer, whose label and
  // signal are genuinely about two-pointer, not windows; a live Playwright
  // reachability audit caught the mismatch).
  function _deriveStage4Directions(state) {
    const hs   = state.answers?.stage4?.hiddenStructureAnswers ?? {};
    const directions = [];

    if (hs.hs_sliding_window === 'yes') {
      directions.push({
        id          : 'sliding_window',
        family      : 'sliding_window',
        label       : 'Sliding Window',
        why         : 'You confirmed a contiguous window whose left edge never needs to shrink back once advanced, in Stage 4',
        verifyBefore: 'Confirm the window condition is monotone — expanding/shrinking never needs to reverse',
        wouldFailIf : 'The window condition is not monotone — a valid window can become invalid non-monotonically',
        confidence  : 'medium',
      });
    }

    if (hs.hs_segment_tree === 'yes') {
      directions.push({
        id          : 'range_query',
        family      : 'range_query',
        label       : 'Range Query Structure',
        why         : 'You confirmed point updates + range queries needed simultaneously in Stage 4',
        verifyBefore: 'Confirm whether updates are point or range, and whether queries need range or point results',
        wouldFailIf : 'No updates are actually needed — a simpler prefix-sum/sparse-table approach would suffice',
        confidence  : 'medium',
      });
    }

    // Union Find is literally one of range_query-variants.js's own entries
    // (rq_dsu) — dynamic connectivity is a real, precise signal for it, not
    // a stretch like the monotonic-stack proxy below.
    if (hs.hs_union_find === 'yes') {
      directions.push({
        id          : 'range_query',
        family      : 'range_query',
        label       : 'Range Query Structure',
        why         : 'You confirmed dynamic connectivity (groups merging over time) in Stage 4 — that\'s Union Find/DSU',
        verifyBefore: 'Confirm you need MERGES over time, not just a one-time connectivity check (which would just be DFS/BFS)',
        wouldFailIf : 'Connectivity is fixed upfront with no merges — a plain traversal already answers it',
        confidence  : 'medium',
      });
    }

    // Trie is literally one of string-variants.js's own entries (str_trie) —
    // shared-prefix / XOR-maximization is a precise signal for it.
    if (hs.hs_trie === 'yes') {
      directions.push({
        id          : 'string',
        family      : 'string',
        label       : 'String Algorithm',
        why         : 'You confirmed multiple strings sharing prefixes, or XOR maximization, in Stage 4 — that\'s a Trie',
        verifyBefore: 'Confirm the operation: prefix search/autocomplete, or binary-trie XOR maximization on numbers?',
        wouldFailIf : 'There is only one string, or no shared-prefix structure to exploit',
        confidence  : 'medium',
      });
    }

    if (hs.hs_monotonic_stack === 'yes') {
      directions.push({
        id          : 'data_structure',
        family      : 'data_structure',
        label       : 'Specialized Data Structure',
        why         : 'You confirmed a "next greater/smaller element" style signal in Stage 4',
        verifyBefore: 'Confirm the structure needed — monotonic stack/deque, heap, or hashing depending on the exact query',
        wouldFailIf : 'The signal was actually a red herring and a plain scan/array approach already works',
        confidence  : 'low',
      });
    }

    return directions.filter(d => _familyHasFeasibleVariant(d.family, state));
  }

  function _refineDirection(state, family, detail) {
    const directions = State.getDirections();
    const idx = directions.findIndex(d => d.family === family);
    if (idx === -1) return;
    const updated = { ...directions[idx], ...detail };
    State.clearDirections();
    directions.forEach((d, i) => State.addDirection(i === idx ? updated : d));
  }

  function _applyTransformation(transformationId, state) {
    const MAP = {
      tr_optimization_to_bsearch: 'binary_search_answer',
      tr_sequence_to_dag        : 'dp',
      tr_element_to_node        : 'graph',
      tr_state_to_position      : 'graph',
    };

    const mappedFamily = MAP[transformationId];
    if (!mappedFamily) return;

    const existing = State.getDirections().find(d => d.family === mappedFamily);
    if (!existing) {
      State.addDirection({
        id          : `${mappedFamily}_transformed`,
        family      : mappedFamily,
        label       : `${mappedFamily} (via transformation)`,
        why         : `Transformation "${transformationId}" reveals this structure`,
        verifyBefore: 'Verify transformation is valid — constraints preserved, solution mappable',
        wouldFailIf : 'Transformation changes the problem — constraints not preserved',
        confidence  : 'low',
      });
    }
  }

  // ─── SESSION COMPLETE ──────────────────────────────────────────────────────

  function _onSessionComplete() {
    SessionUtils.pushToHistory(State.get());
    Renderer.showToast('Analysis complete. Good luck!', 'info', 4000);
  }

  // ─── RECOVERY ──────────────────────────────────────────────────────────────

  function enterRecovery(failureType, failureDetail = '') {
    State.enterRecovery(failureType, failureDetail);
    const recoveryStage = Router.recoveryEntry(failureType);
    _navigateTo(recoveryStage, 'forward');
  }

  function exitRecovery() {
    State.exitRecovery();
    _navigateTo('stage5', 'forward');
  }

  // ─── EVENTS ────────────────────────────────────────────────────────────────

  function _bindEvents() {
    document.addEventListener('dsa:navigate-next', () => _navigateNext());
    document.addEventListener('dsa:navigate-back', () => _navigateBack());

    document.addEventListener('dsa:jump-to', (e) => {
      const stageId = e.detail?.stageId;
      if (stageId) _jumpTo(stageId, !!e.detail?.force);
    });

    document.addEventListener('dsa:enter-recovery', () => _showRecoveryModal());
    document.addEventListener('dsa:reset',          () => _resetSession());

    document.addEventListener('dsa:stage-complete', (e) => {
      const { stageId, answers } = e.detail ?? {};
      if (stageId) onStageComplete(stageId, answers ?? {});
    });

    document.addEventListener('dsa:answer-update', (e) => {
      const { stageId, key, value } = e.detail ?? {};
      if (stageId && key !== undefined) {
        State.setAnswer(stageId, { [key]: value });
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowRight' && e.altKey) _navigateNext();
      if (e.key === 'ArrowLeft'  && e.altKey) _navigateBack();
    });

    window.addEventListener('beforeunload', (e) => {
      if (State.hasStarted()) {
        _autoSave();
        e.preventDefault();
        e.returnValue = '';
      }
    });

    document.addEventListener('touchstart', (e) => {
      _touchStartX = e.changedTouches[0].screenX;
      _touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].screenX - _touchStartX;
      const dy = e.changedTouches[0].screenY - _touchStartY;
      // Only fire if the horizontal component clearly dominates (not a scroll)
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0) _navigateNext();
        else        _navigateBack();
      }
    }, { passive: true });
  }

  // ─── STATE SUBSCRIPTIONS ───────────────────────────────────────────────────

  function _subscribeToState() {
    State.subscribe('confidence_updated', (level) => {
      if (level === 'low') Renderer.setNextEnabled(false);
    });

    State.subscribe('direction_added', () => {
      Renderer.flashUpdate('directions-region');
    });
  }

  // ─── RECOVERY MODAL ────────────────────────────────────────────────────────

  function _showRecoveryModal() {
    const options = [
      { id: 'wa',      label: 'Wrong Answer',  sublabel: 'Solution runs but gives incorrect output' },
      { id: 'tle',     label: 'Time Limit',    sublabel: 'Solution is too slow — TLE'               },
      { id: 'logic',   label: 'Logic Unclear', sublabel: 'Not sure how to write the core logic'     },
      { id: 'reframe', label: 'Full Reframe',  sublabel: 'This approach feels wrong — need to rethink' },
    ];

    const modal = DomUtils.div(
      { class: 'modal-overlay' },
      [
        DomUtils.div(
          { class: 'modal' },
          [
            DomUtils.div({ class: 'modal__title' }, 'What went wrong?'),
            DomUtils.div({ class: 'modal__sub'   }, 'Choose the type of failure to get targeted help'),
            ...options.map(opt =>
              DomUtils.div(
                {
                  class  : 'modal__option',
                  onClick: () => { modal.remove(); enterRecovery(opt.id); },
                },
                [
                  DomUtils.div({ class: 'modal__opt-label' }, opt.label),
                  DomUtils.div({ class: 'modal__opt-sub'   }, opt.sublabel),
                ]
              )
            ),
            DomUtils.btn(
              { class: 'btn btn--ghost modal__cancel', onClick: () => modal.remove() },
              'Cancel'
            ),
          ]
        ),
      ]
    );

    document.body.appendChild(modal);
    DomUtils.fadeIn(modal);
  }

  // ─── AUTO-SAVE ─────────────────────────────────────────────────────────────

  function _autoSave() {
    try { SessionUtils.save(State.serialize()); }
    catch (e) { console.warn('[Engine] Auto-save failed:', e); }
  }

  function _startAutoSave() {
    _autoSaveTimer = setInterval(_autoSave, AUTO_SAVE_INTERVAL);
  }

  function _stopAutoSave() {
    if (_autoSaveTimer) { clearInterval(_autoSaveTimer); _autoSaveTimer = null; }
  }

  // ─── RESET ─────────────────────────────────────────────────────────────────

  function _resetSession() {
    _stopAutoSave();
    SessionUtils.clear();
    State.reset();
    _initialized = false;
    init();
  }

  // ─── SHAKE NEXT ────────────────────────────────────────────────────────────

  function _shakeNextButton() {
    const btn = document.getElementById('btn-next');
    if (!btn) return;
    btn.classList.add('shake');
    setTimeout(() => btn.classList.remove('shake'), 500);
  }

  // ─── PUBLIC ────────────────────────────────────────────────────────────────

  return {
    init,
    onStageComplete,
    enterRecovery,
    exitRecovery,
  };

})();

// ── NO AUTO-BOOT ────────────────────────────────────────────────────────────
// Engine.init() is called explicitly by index.html after boot sequence
// Removing the auto-boot prevents double initialization

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Engine;
}