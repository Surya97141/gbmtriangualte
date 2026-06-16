// demo/demo-bootstrap.js
// Full end-to-end orchestration for the sliding window cognitive validation harness.
//
// Problem: Given [1,2,3,4,5], find the longest contiguous subarray with sum ≤ 7.
// Answer: length 3 ([1,2,3] = 6, or [2,3] = 5 etc.)
// Algorithm: variable sliding window, O(n)
//
// Wrong Path 1 (Stage 3): answer local_optimality = 'no'
//   → sig_non_monotone_constraint fires
//   → breaks inv_window_validity
//   → contradiction written, confidence drops
//   → mc_monotonicity_failure escalates to 'likely'
//   → recovery route rr_constraint_monotonicity_check activates
//
// Wrong Path 2 (Stage 5): press wrong-path button
//   → mc_segment_tree_overkill manually confirmed (bypass signal-based detection)
//   → recovery route rr_complexity_downgrade activates

// ─── INLINE ONTOLOGY DATA ─────────────────────────────────────────────────────
// Embedded directly so the demo works from file:// without a server.

const ONTOLOGY_GRAPHS = {
  signals: {
    nodes: [
      { id:'sig_contiguous_subarray', label:'Contiguous subarray/substring output', source:'output_form', base_strength:0.90, trigger_phrases:['subarray','substring','contiguous'], negation_id:null, requires_also:[] },
      { id:'sig_range_constraint',    label:'Range or feasibility constraint present', source:'constraints', base_strength:0.85, trigger_phrases:['at most','at least','exactly','within'], negation_id:null, requires_also:[] },
      { id:'sig_fixed_window_size',   label:'Fixed window size (exactly k elements)', source:'constraints', base_strength:0.95, trigger_phrases:['exactly k','fixed size','window of size k'], negation_id:'sig_variable_window_size', requires_also:[] },
      { id:'sig_variable_window_size',label:'Variable window size (content constraint)', source:'constraints', base_strength:0.85, trigger_phrases:['at most k','longest','shortest'], negation_id:'sig_fixed_window_size', requires_also:[] },
      { id:'sig_monotone_removable',  label:'FIFO removal is monotone-preserving', source:'structure', base_strength:0.85, trigger_phrases:['monotone queue','deque','sliding max','sliding min'], negation_id:null, requires_also:['sig_contiguous_subarray'] },
      { id:'sig_optimization_query',  label:'Optimization query (maximize or minimize)', source:'query_type', base_strength:1.00, trigger_phrases:['maximize','minimize','longest','shortest','maximum','minimum'], negation_id:'sig_count_query', requires_also:[] },
      { id:'sig_count_query',         label:'Count or existence query', source:'query_type', base_strength:1.00, trigger_phrases:['count','number of','how many','exists'], negation_id:'sig_optimization_query', requires_also:[] },
      { id:'sig_monotone_constraint', label:'Constraint is monotone (shrinking always helps)', source:'constraints', base_strength:0.90, trigger_phrases:['sum positive','non-negative','monotone'], negation_id:'sig_non_monotone_constraint', requires_also:[] },
      { id:'sig_non_monotone_constraint', label:'Constraint is NOT monotone (shrinking may not help)', source:'constraints', base_strength:0.90, trigger_phrases:['negative elements','mixed sign','exactly k distinct'], negation_id:'sig_monotone_constraint', requires_also:[] },
    ],
    edges: [
      { from:'sig_contiguous_subarray',     to:'sa_sliding_window_variable', to_type:'StateArchetype', type:'implies',    weight:0.85 },
      { from:'sig_contiguous_subarray',     to:'sa_sliding_window_fixed',    to_type:'StateArchetype', type:'implies',    weight:0.80 },
      { from:'sig_contiguous_subarray',     to:'sa_monotone_deque',          to_type:'StateArchetype', type:'implies',    weight:0.60 },
      { from:'sig_range_constraint',        to:'sa_sliding_window_variable', to_type:'StateArchetype', type:'implies',    weight:0.85 },
      { from:'sig_fixed_window_size',       to:'sa_sliding_window_fixed',    to_type:'StateArchetype', type:'implies',    weight:0.95 },
      { from:'sig_variable_window_size',    to:'sa_sliding_window_variable', to_type:'StateArchetype', type:'implies',    weight:0.90 },
      { from:'sig_monotone_removable',      to:'sa_monotone_deque',          to_type:'StateArchetype', type:'implies',    weight:0.90 },
      { from:'sig_monotone_constraint',     to:'inv_window_validity',        to_type:'Invariant',      type:'strengthens',weight:0.85 },
      { from:'sig_range_constraint',        to:'inv_window_validity',        to_type:'Invariant',      type:'strengthens',weight:0.80 },
      { from:'sig_monotone_removable',      to:'inv_monotone_queue',         to_type:'Invariant',      type:'strengthens',weight:0.90 },
      { from:'sig_fixed_window_size',       to:'inv_window_validity',        to_type:'Invariant',      type:'strengthens',weight:0.70 },
      { from:'sig_non_monotone_constraint', to:'sa_sliding_window_variable', to_type:'StateArchetype', type:'contradicts', weight:0.95 },
      { from:'sig_non_monotone_constraint', to:'sa_sliding_window_fixed',    to_type:'StateArchetype', type:'contradicts', weight:0.40 },
      { from:'sig_fixed_window_size',       to:'sa_sliding_window_variable', to_type:'StateArchetype', type:'contradicts', weight:0.80 },
      { from:'sig_variable_window_size',    to:'sa_sliding_window_fixed',    to_type:'StateArchetype', type:'contradicts', weight:0.80 },
      { from:'sig_non_monotone_constraint', to:'inv_window_validity',        to_type:'Invariant',      type:'breaks',     weight:1.00 },
      { from:'sig_non_monotone_constraint', to:'inv_monotone_feasibility',   to_type:'Invariant',      type:'breaks',     weight:1.00 },
    ],
  },

  states: {
    nodes: [
      { id:'sa_sliding_window_fixed',    label:'Fixed Sliding Window',    state_form:'window[i..i+k-1]', fill_order:'left-to-right', dimension_count:1, feasibility:'O(n)', requires:['inv_window_validity'], uses:['tr_expand_shrink_window'], commonly_confused_with:['sa_sliding_window_variable'], verified_by:['check_window_bounds','check_aggregate_update'], confidence_weight:10 },
      { id:'sa_sliding_window_variable', label:'Variable Sliding Window', state_form:'window[l..r]',     fill_order:'left-to-right', dimension_count:1, feasibility:'O(n)', requires:['inv_window_validity','inv_monotone_feasibility'], uses:['tr_expand_shrink_window'], commonly_confused_with:['sa_sliding_window_fixed'], verified_by:['check_monotone_constraint','check_shrink_restores_validity'], confidence_weight:12 },
      { id:'sa_monotone_deque',          label:'Monotone Deque',          state_form:'deque D stores indices, D.front()=max/min', fill_order:'left-to-right', dimension_count:1, feasibility:'O(n)', requires:['inv_window_validity','inv_monotone_queue'], uses:['tr_deque_push_pop'], commonly_confused_with:['sa_sliding_window_variable'], verified_by:['check_deque_order','check_window_range'], confidence_weight:10 },
      { id:'sa_sliding_window_count',    label:'Sliding Window Count',    state_form:'window[l..r] with freq map', fill_order:'left-to-right', dimension_count:1, feasibility:'O(n)', requires:['inv_window_validity'], uses:['tr_expand_shrink_window'], commonly_confused_with:['sa_sliding_window_variable'], verified_by:['check_freq_map_update'], confidence_weight:8 },
    ],
    edges: [],
  },

  invariants: {
    nodes: [
      { id:'inv_window_validity',       label:'Window validity',         statement:'∀ windows [l,r]: constraint(window) = valid when reported', maintained_by:'Shrink l until constraint holds after each r expansion', violated_by:'Non-monotone constraint — shrinking l may not restore validity', proof_sketch:'If adding arr[r] breaks validity, advancing l strictly reduces the window so validity can only improve (for monotone constraints)', breaks_if:['non-monotone constraint','negative elements in sum window'], preserves:['sa_sliding_window_variable','sa_sliding_window_fixed','sa_sliding_window_count'], manifests_meta_pattern:'two_pointer_validity' },
      { id:'inv_monotone_feasibility',  label:'Monotone feasibility',    statement:'Adding an element to a valid window can only maintain or break validity, never improve it beyond its prior valid state', maintained_by:'Monotone constraint structure (positive sums, at-most-k distinct)', violated_by:'Negative elements, exactly-k distinct, mixed-sign arrays', proof_sketch:'Constraint must be monotone: shrinking [l,r] always moves toward validity', breaks_if:['negative numbers in sum','exactly-k distinct (not at-most-k)'], preserves:['sa_sliding_window_variable'], manifests_meta_pattern:'monotone_feasibility_region' },
      { id:'inv_monotone_queue',        label:'Monotone queue dual invariant', statement:'D is monotone (back-to-front) AND all indices in D are within [l,r]', maintained_by:'Back-pop on push (monotone order) + front-pop on window shrink (range)', violated_by:'Missing back-pop or missing front eviction', proof_sketch:'Each element enters and leaves D at most once, so amortized O(1) per step', breaks_if:['not popping from back before push','not evicting front when index < l'], preserves:['sa_monotone_deque'], manifests_meta_pattern:'deque_dual_invariant' },
    ],
    edges: [],
  },

  misconceptions: {
    nodes: [
      { id:'mc_monotonicity_failure',   label:'Monotonicity failure',        symptom:'Applies two-pointer shrink to a non-monotone constraint', root_cause:'Assumes shrinking l always restores validity', trigger_context:['sa_sliding_window_variable','sa_sliding_window_count'], trigger_signals:['sig_non_monotone_constraint'], anti_trigger_signals:['sig_monotone_constraint'], detection_question:'Can shrinking the window from the left ALWAYS restore constraint validity?', correction:'Two-pointer only works when the constraint is monotone. For non-monotone constraints, use prefix sums + hash map or the at-most-k subtraction trick.', breaks_invariant:'inv_monotone_feasibility', recovery_route_id:'rr_constraint_monotonicity_check' },
      { id:'mc_segment_tree_overkill',  label:'Segment tree overkill',        symptom:'Uses O(n log n) range structure when O(n) two-pointer suffices', root_cause:'Confuses range query with sliding window aggregate update', trigger_context:['sa_sliding_window_variable','sa_sliding_window_fixed'], trigger_signals:['sig_optimization_query'], anti_trigger_signals:['sig_monotone_removable'], detection_question:'Is O(1) incremental aggregate update possible when r advances or l advances?', correction:'If aggregate updates are O(1) incremental, use two-pointer O(n) instead of a range structure O(n log n).', breaks_invariant:null, recovery_route_id:'rr_complexity_downgrade' },
      { id:'mc_fixed_window_confusion', label:'Fixed/variable window confusion', symptom:'Treats a variable-window problem as fixed, or vice versa', root_cause:'Misreads the constraint type (size vs content)', trigger_context:['sa_sliding_window_fixed','sa_sliding_window_variable'], trigger_signals:['sig_fixed_window_size','sig_variable_window_size'], anti_trigger_signals:[], detection_question:'Does the constraint fix the window SIZE (exactly k elements) or the window CONTENT (sum/count at most k)?', correction:'Fixed window: k is the exact size. Variable window: k is a threshold on some aggregate of the window content.', breaks_invariant:null, recovery_route_id:'rr_constraint_reread' },
      { id:'mc_deque_invariant_break',  label:'Deque invariant break',         symptom:'Monotone deque is missing back-pop or front eviction', root_cause:'Implements only one of the two required deque invariants', trigger_context:['sa_monotone_deque'], trigger_signals:['sig_monotone_removable'], anti_trigger_signals:[], detection_question:'Are BOTH back-popping (for monotone order) AND front-popping (for window range) implemented?', correction:'The deque must maintain two invariants simultaneously: monotone order (back-pop on push) AND window range (front-pop when index < l).', breaks_invariant:'inv_monotone_queue', recovery_route_id:'rr_deque_dual_invariant' },
    ],
    edges: [],
  },

  transitions: {
    nodes: [
      { id:'tr_expand_shrink_window', label:'Expand right, shrink left', operation_form:'1. Expand: add arr[r] to aggregate, advance r\n2. Shrink: while constraint violated, remove arr[l] from aggregate, advance l\n3. Record answer from current window [l, r-1]', driver:'r (outer loop)', direction:'push', strictly_smaller:true, amortized_cost:'O(n) — each element enters and leaves at most once', requires_invariant:['inv_window_validity'], used_by_states:['sa_sliding_window_variable','sa_sliding_window_fixed','sa_sliding_window_count'] },
      { id:'tr_deque_push_pop',       label:'Deque push and pop',        operation_form:'1. Back-pop: while D non-empty and arr[D.back()] <= arr[r], pop back\n2. Push r to back of D\n3. Front-pop: while D.front() < l, pop front\n4. Answer at step r: arr[D.front()]', driver:'r (outer loop)', direction:'push', strictly_smaller:true, amortized_cost:'O(n) — each index enters and leaves D at most once', requires_invariant:['inv_window_validity','inv_monotone_queue'], used_by_states:['sa_monotone_deque'] },
    ],
    edges: [],
  },
};

// ─── INLINE E5 (COMPLEXITY ENGINE) ────────────────────────────────────────────

function runComplexityEngine(ir) {
  const stage0 = ir.stage_log.stage0;
  const answers = stage0?.answers ?? {};
  const n = answers.n ?? 1000;
  const timeLimitSec = answers.time_limit_sec ?? 1;

  const OPS_PER_SEC = 1e8;
  const opsBudget = Math.floor(OPS_PER_SEC * timeLimitSec);

  const feasibleClasses    = [];
  const eliminatedClasses  = [];
  const eliminatedArchetypes = [];

  const classes = [
    { label:'O(n)',       ops: n,                          archetypes: [] },
    { label:'O(n log n)', ops: n * Math.log2(n),           archetypes: [] },
    { label:'O(n^2)',     ops: n * n,                      archetypes: ['sa_sliding_window_count'] },
    { label:'O(2^n)',     ops: Math.pow(2, Math.min(n, 60)), archetypes: [] },
  ];

  for (const c of classes) {
    if (c.ops <= opsBudget) {
      feasibleClasses.push(c.label);
    } else {
      eliminatedClasses.push(c.label);
      eliminatedArchetypes.push(...c.archetypes);
    }
  }

  ir.complexity_gate = {
    max_n: n,
    time_limit_sec: timeLimitSec,
    ops_budget: opsBudget,
    feasible_classes: feasibleClasses,
    eliminated_classes: eliminatedClasses,
    eliminated_archetypes: [...new Set(eliminatedArchetypes)],
  };
}

// ─── INLINE E6 (HYPOTHESIS ENGINE) ────────────────────────────────────────────

const ARCHETYPE_TO_FAMILY = {
  sa_sliding_window_variable: 'Two-Pointer Variable Window (O(n))',
  sa_sliding_window_fixed:    'Fixed Window (O(n))',
  sa_monotone_deque:          'Monotone Deque (O(n))',
  sa_sliding_window_count:    'Sliding Window Count (O(n))',
};

function runHypothesisEngine(ir) {
  const candidates = (ir.candidate_states ?? []).filter(c => c.status === 'candidate');
  if (candidates.length === 0) { ir.hypotheses = []; return; }

  const top = candidates[0];
  const verifiedCount = (ir.active_invariants ?? []).filter(i => i.verified).length;
  const contradictionPenalty = (ir.contradictions ?? []).filter(c => !c.resolution).length * 0.20;
  const verificationBonus = Math.min(verifiedCount * 0.10, 0.30);

  const baseConf = Math.min(top.aggregate_weight, 1.0);
  const confidence = Math.max(0, Math.min(1, baseConf + verificationBonus - contradictionPenalty));

  const unverifiedInvariants = OntologyLoader.getStateRequires(top.archetype_id)
    .filter(invId => !(ir.active_invariants ?? []).some(i => i.invariant_id === invId && i.verified));

  ir.hypotheses = [{
    id:               `hyp_${top.archetype_id}`,
    type:             'single_family',
    target_id:        top.archetype_id,
    confidence:       Math.round(confidence * 100) / 100,
    supporting_nodes: top.contributing_signals,
    contradicting:    top.eliminating_signals,
    unverified:       unverifiedInvariants,
    family_label:     ARCHETYPE_TO_FAMILY[top.archetype_id] ?? top.archetype_id,
  }];
}

// ─── BOOTSTRAP ────────────────────────────────────────────────────────────────

const Demo = (() => {

  let _ir          = null;
  let _irInspector = null;
  let _eventTrace  = null;
  let _confPanel   = null;
  let _stageIndex  = 0;
  let _activeRecovery = null;

  // Stage answer sequences — the "correct path" answers
  const STAGE_ANSWERS = [
    {
      stageId: 'stage0',
      label:   'Stage 0 — Problem Setup',
      answers: { n: 10000, time_limit_sec: 1, memory_checked: true },
    },
    {
      stageId: 'stage1',
      label:   'Stage 1 — Problem Type',
      answers: {
        input_type_identified: 'array_of_integers',
        secondary_signals_noted: 'contiguous_subarray',
        decomposition_checked: false,
      },
    },
    {
      stageId: 'stage2',
      label:   'Stage 2 — Output & Query Form',
      answers: {
        solution_depth: 'subarray',
        optimization_type: 'maximize',
        output_form_identified: 'subarray_length',
        query_type_identified: 'optimize',
        window_size_type: 'variable',
      },
    },
    {
      stageId: 'stage3',
      label:   'Stage 3 — Constraint Analysis (correct path)',
      answers: {
        feasibility_boundary_answered: true,
        local_optimality_answered: 'yes',
        state_space_answered: 'single_pass',
      },
    },
    {
      stageId: 'stage4',
      label:   'Stage 4 — Reduction Check',
      answers: {
        monotone_removal_confirmed: false,
        transformation_check_done: true,
        order_sensitivity_answered: true,
      },
    },
    {
      stageId: 'stage5',
      label:   'Stage 5 — Invariant Verification',
      answers: {
        monotonicity_verified: true,
        keyword_crosscheck_done: true,
      },
    },
  ];

  // ─── INIT ──────────────────────────────────────────────────────────────────

  function init() {
    // Load ontology from inline data (no fetch needed)
    OntologyLoader.loadFromData(ONTOLOGY_GRAPHS);

    // Register engines
    EngineRegistry.register('E1', SignalEngine);
    EngineRegistry.register('E2', StateEngine);
    EngineRegistry.register('E3', InvariantEngine);
    EngineRegistry.register('E4', TransitionEngine);
    EngineRegistry.register('E7', MisconceptionEngine);
    EngineRegistry.register('E9', ConfidenceEngine);

    // Init engines that need the loader
    StateEngine.init(OntologyLoader);
    InvariantEngine.init(OntologyLoader);
    TransitionEngine.init(OntologyLoader);
    MisconceptionEngine.init(OntologyLoader);

    // Register recovery handlers
    for (const route of MisconceptionRecovery.all()) {
      RecoveryRouter.registerHandler(route.id, route);
    }

    // Bootstrap IR
    _ir = IRManager.init('demo-session', 'sliding-window-sum-le-k');
    _ir.stage_log = {};

    // Mount debug panels
    const inspectorEl = document.getElementById('ir-inspector');
    const traceEl     = document.getElementById('event-trace');
    const confEl      = document.getElementById('confidence-panel');

    if (inspectorEl) _irInspector = IRInspector.mount(inspectorEl);
    if (traceEl)     _eventTrace  = EventTracePanel.mount(traceEl, EventBus);
    if (confEl)      _confPanel   = ConfidencePanel.mount(confEl);

    _renderProblem();
    _updateUI();
  }

  // ─── ENGINE RUN ─────────────────────────────────────────────────────────────

  function _runEngines() {
    // E5 inline
    runComplexityEngine(_ir);
    _trace('engine:run', { id: 'E5' });

    // E1–E4, E7, E9 via registry
    SignalEngine.run(_ir);
    _trace('engine:run', { id: 'E1', signals: _ir.signals.length });

    StateEngine.run(_ir);
    _trace('engine:run', { id: 'E2', candidates: _ir.candidate_states.length });

    InvariantEngine.run(_ir);
    _trace('engine:run', { id: 'E3', invariants: _ir.active_invariants.length });

    TransitionEngine.run(_ir);
    _trace('engine:run', { id: 'E4' });

    // E6 inline
    runHypothesisEngine(_ir);
    _trace('engine:run', { id: 'E6', hypotheses: _ir.hypotheses.length });

    MisconceptionEngine.run(_ir);
    _trace('engine:run', { id: 'E7', misconceptions: _ir.misconception_risk.length });

    ConfidenceEngine.run(_ir);
    _trace('ir:confidence_updated', { score: _ir.confidence?.score });

    _irInspector?.refresh(_ir);
    _confPanel?.refresh(_ir);

    // Check for misconceptions that need recovery
    _checkMisconceptions();
  }

  function _checkMisconceptions() {
    for (const mc of (_ir.misconception_risk ?? [])) {
      if ((mc.risk_level === 'likely' || mc.risk_level === 'confirmed') && !mc.resolved) {
        const session = RecoveryRouter.route(mc.misconception_id, _ir, (result) => {
          _trace('recovery:exit', result);
          _activeRecovery = null;
          if (result.resolved) {
            MisconceptionEngine.markResolved(_ir, mc.misconception_id);
          }
          ConfidenceEngine.run(_ir);
          _irInspector?.refresh(_ir);
          _confPanel?.refresh(_ir);
          _hideRecoveryPanel();
          _updateUI();
        });
        if (session) {
          _trace('recovery:activate', { misconceptionId: mc.misconception_id });
          _activeRecovery = { misconceptionId: mc.misconception_id, session };
          _showRecoveryPanel(mc.misconception_id, session);
          break;
        }
      }
    }
  }

  // ─── STAGE ADVANCE ──────────────────────────────────────────────────────────

  function advanceStage() {
    if (_stageIndex >= STAGE_ANSWERS.length) return;
    const step = STAGE_ANSWERS[_stageIndex];

    _ir.stage_log[step.stageId] = {
      complete: true,
      completed_at: Date.now(),
      answers: step.answers,
      signals_emitted: [],
    };

    _trace('stage:complete', { stageId: step.stageId });
    _stageIndex++;

    _runEngines();
    _updateUI();
  }

  // ─── WRONG PATHS ────────────────────────────────────────────────────────────

  function triggerWrongPath1() {
    // Stage 3 — answer local_optimality = 'no'
    // This emits sig_non_monotone_constraint which breaks inv_window_validity
    _ir.stage_log['stage3'] = {
      complete: true,
      completed_at: Date.now(),
      answers: {
        feasibility_boundary_answered: true,
        local_optimality_answered: 'no',
        state_space_answered: 'single_pass',
      },
      signals_emitted: [],
    };
    // If we haven't passed stage3 yet in the correct path, advance index past it
    // to prevent double-applying stage3 answers
    if (_stageIndex <= 3) _stageIndex = 4;

    _trace('stage:complete', { stageId: 'stage3', wrongPath: 1, note: 'local_optimality=no' });
    _runEngines();
    _updateUI();
  }

  function triggerWrongPath2() {
    // Stage 5 — directly escalate mc_segment_tree_overkill to confirmed
    // (Bypass signal-based detection since sig_optimization_query + sig_contiguous_subarray
    //  both fire after Stage 2 which would be too early. Manual trigger here instead.)
    const existing = (_ir.misconception_risk ?? []).find(m => m.misconception_id === 'mc_segment_tree_overkill');
    if (existing) {
      existing.risk_level = 'confirmed';
    } else {
      if (!_ir.misconception_risk) _ir.misconception_risk = [];
      _ir.misconception_risk.push({
        misconception_id: 'mc_segment_tree_overkill',
        risk_level: 'confirmed',
        trigger_basis: 'User chose segment tree O(n log n) approach',
        recovery_route: 'rr_complexity_downgrade',
        resolved: false,
      });
    }
    _trace('misconception:escalate', { id: 'mc_segment_tree_overkill', level: 'confirmed', note: 'manual wrong path 2' });

    ConfidenceEngine.run(_ir);
    _irInspector?.refresh(_ir);
    _confPanel?.refresh(_ir);
    _checkMisconceptions();
    _updateUI();
  }

  // ─── INVARIANT VERIFICATION ─────────────────────────────────────────────────

  function verifyInvariant(invariantId) {
    InvariantEngine.markVerified(_ir, invariantId);
    _trace('ir:invariants_updated', { verified: invariantId });
    ConfidenceEngine.run(_ir);
    _irInspector?.refresh(_ir);
    _confPanel?.refresh(_ir);
    _updateUI();
  }

  // ─── RECOVERY PANEL UI ──────────────────────────────────────────────────────

  function _showRecoveryPanel(misconceptionId, session) {
    const panel = document.getElementById('recovery-panel');
    if (!panel) return;

    panel.style.display = 'block';
    panel.innerHTML = '';

    const header = _el('div', { style:'color:#f0883e;font-weight:bold;font-size:14px;margin-bottom:8px;' },
      `Recovery: ${misconceptionId.replace(/_/g,' ')}`);
    panel.appendChild(header);

    const note = _el('div', { style:'color:#8b949e;font-size:12px;margin-bottom:12px;' },
      'Answer the diagnostic questions below to resolve this misconception.');
    panel.appendChild(note);

    const answers = {};
    let answered = 0;

    for (const q of session.questions) {
      const qWrap = _el('div', { style:'margin-bottom:10px;padding:8px;background:#161b22;border-radius:4px;border:1px solid #30363d;' });

      const qText = _el('div', { style:'color:#c9d1d9;font-size:12px;margin-bottom:6px;' }, q.text);
      qWrap.appendChild(qText);

      for (const opt of q.options) {
        const btn = _el('button', {
          style:'display:block;width:100%;text-align:left;padding:4px 8px;margin:2px 0;background:#21262d;color:#c9d1d9;border:1px solid #30363d;border-radius:3px;cursor:pointer;font-family:monospace;font-size:11px;',
        }, opt.label);

        btn.onclick = () => {
          // Deselect siblings
          for (const sibling of qWrap.querySelectorAll('button')) {
            sibling.style.borderColor = '#30363d';
            sibling.style.color = '#c9d1d9';
          }
          btn.style.borderColor = '#58a6ff';
          btn.style.color = '#79c0ff';

          const wasAnswered = answers[q.id] !== undefined;
          answers[q.id] = opt.value;
          if (!wasAnswered) answered++;

          // Enable submit when all answered
          if (answered >= session.questions.length) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
          }
        };

        qWrap.appendChild(btn);
      }
      panel.appendChild(qWrap);
    }

    const submitBtn = _el('button', {
      disabled: true,
      style:'margin-top:8px;padding:6px 16px;background:#238636;color:#fff;border:none;border-radius:4px;cursor:pointer;font-family:monospace;font-size:12px;opacity:0.5;',
    }, 'Submit Answers');

    submitBtn.onclick = () => {
      const result = session.evaluate(answers);
      const resultEl = _el('div', {
        style: `margin-top:10px;padding:8px;border-radius:4px;background:${result.resolved ? '#0d4429' : '#3d1f00'};color:${result.resolved ? '#3fb950' : '#f0883e'};font-size:12px;`,
      }, result.message);
      panel.appendChild(resultEl);
      submitBtn.disabled = true;
      submitBtn.textContent = result.resolved ? 'Resolved ✓' : 'Not Resolved — Review';
    };

    panel.appendChild(submitBtn);
  }

  function _hideRecoveryPanel() {
    const panel = document.getElementById('recovery-panel');
    if (panel) panel.style.display = 'none';
  }

  // ─── UI RENDER ──────────────────────────────────────────────────────────────

  function _renderProblem() {
    const el = document.getElementById('problem-statement');
    if (!el) return;
    el.innerHTML = `
      <div style="color:#e3b341;font-size:13px;margin-bottom:6px;">Demo Problem</div>
      <div style="color:#c9d1d9;font-size:12px;line-height:1.6;">
        Given the array <code style="color:#79c0ff;">[1, 2, 3, 4, 5]</code> and a target sum
        <code style="color:#79c0ff;">k = 7</code>, find the <strong>length of the longest
        contiguous subarray</strong> with sum ≤ 7.<br><br>
        <span style="color:#8b949e;">Answer: 3 — subarray [1, 2, 3] has sum 6 ≤ 7</span><br>
        <span style="color:#8b949e;">Algorithm: Variable sliding window, O(n)</span>
      </div>
    `;
  }

  function _updateUI() {
    // Stage progress
    const progressEl = document.getElementById('stage-progress');
    if (progressEl) {
      progressEl.textContent = `Completed stages: ${_stageIndex} / ${STAGE_ANSWERS.length}`;
    }

    // Advance button
    const advBtn = document.getElementById('btn-advance');
    if (advBtn) {
      const done = _stageIndex >= STAGE_ANSWERS.length;
      advBtn.textContent = done ? 'All stages complete' : `Advance: ${STAGE_ANSWERS[_stageIndex]?.label}`;
      advBtn.disabled = done || RecoveryRouter.isRecoveryActive();
    }

    // Wrong path buttons
    const wp1 = document.getElementById('btn-wrong-path-1');
    const wp2 = document.getElementById('btn-wrong-path-2');
    if (wp1) wp1.disabled = _stageIndex < 3 || RecoveryRouter.isRecoveryActive();
    if (wp2) wp2.disabled = _stageIndex < 5 || RecoveryRouter.isRecoveryActive();

    // Verify invariant buttons
    const invBtns = document.querySelectorAll('[data-verify-invariant]');
    for (const btn of invBtns) {
      const invId = btn.getAttribute('data-verify-invariant');
      const inv   = (_ir.active_invariants ?? []).find(i => i.invariant_id === invId);
      if (!inv) {
        btn.disabled = true;
        btn.textContent = `Verify ${invId} (not active)`;
      } else if (inv.verified) {
        btn.disabled = true;
        btn.textContent = `${invId} — VERIFIED ✓`;
        btn.style.background = '#0d4429';
      } else {
        btn.disabled = false;
        btn.textContent = `Verify: ${invId}`;
      }
    }

    // Current hypothesis
    const hypEl = document.getElementById('hypothesis-display');
    if (hypEl) {
      const hyp = (_ir.hypotheses ?? [])[0];
      if (hyp) {
        const confPct = Math.round(hyp.confidence * 100);
        hypEl.innerHTML = `
          <div style="color:#79c0ff;font-weight:bold;">${hyp.family_label ?? hyp.target_id}</div>
          <div style="color:#8b949e;font-size:11px;">Confidence: ${confPct}% | Unverified invariants: ${hyp.unverified?.join(', ') || 'none'}</div>
        `;
      } else {
        hypEl.innerHTML = '<div style="color:#484f58;">No hypothesis formed yet</div>';
      }
    }

    // Contradiction status
    const contEl = document.getElementById('contradiction-status');
    if (contEl) {
      const unresolved = (_ir.contradictions ?? []).filter(c => !c.resolution);
      if (unresolved.length > 0) {
        contEl.style.display = 'block';
        contEl.innerHTML = unresolved.map(c =>
          `<div style="color:#f85149;">⚠ CONTRADICTION: ${c.node_a} --${c.edge_type}--> ${c.node_b} (UNRESOLVED)</div>`
        ).join('');
      } else {
        contEl.style.display = 'none';
      }
    }
  }

  // ─── HELPERS ───────────────────────────────────────────────────────────────

  function _trace(event, detail) {
    if (_eventTrace) _eventTrace.trace(event, detail);
  }

  function _el(tag, attrs, textContent) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'disabled') { el.disabled = v; continue; }
      el.setAttribute(k, v);
    }
    if (textContent !== undefined) el.textContent = textContent;
    return el;
  }

  return {
    init,
    advanceStage,
    triggerWrongPath1,
    triggerWrongPath2,
    verifyInvariant,
    getIR() { return _ir; },
  };

})();

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', Demo.init);
} else {
  Demo.init();
}
