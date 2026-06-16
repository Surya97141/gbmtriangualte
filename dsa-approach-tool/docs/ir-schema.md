# Intermediate Representation (IR) Schema

## Overview

The IR is the single shared working memory of the inference pipeline. All engines read from it and write to it through `IRManager`. It is derived state — it can always be recomputed from the stage answers stored in `stage_log`. Persistence in `sessionStorage` is a cache, not the source of truth.

---

## Top-Level Shape

```
ReasoningState {
  session_id        : string
  problem_digest    : string
  created_at        : number   (Unix ms)
  updated_at        : number   (Unix ms)

  signals           : Signal[]
  candidate_states  : CandidateState[]
  active_invariants : ActiveInvariant[]
  active_transitions: ActiveTransition[]
  hypotheses        : Hypothesis[]
  misconception_risk: MisconceptionRisk[]
  contradictions    : Contradiction[]
  complexity_gate   : ComplexityGate
  confidence        : ConfidenceReport
  stage_log         : { [stageId]: StageLogEntry }
}
```

---

## Field Schemas

### Signal
```
{
  id           : string    — signal node ID from signal-graph.json
  strength     : float     — 0.0–1.0; immutable after emission
  source_stage : string    — stage that caused this emission
  basis        : string    — user-readable justification (always present)
}
```

### CandidateState
```
{
  archetype_id        : string   — state archetype ID from state-graph.json
  aggregate_weight    : float    — sum of (signal.strength × edge.weight) for all implies edges
  contributing_signals: string[] — signal IDs that support this archetype
  eliminating_signals : string[] — signal IDs that contradict this archetype
  status              : enum     — "candidate" | "eliminated"
}
```

### ActiveInvariant
```
{
  invariant_id : string   — invariant node ID
  confidence   : float    — 0.0–1.0; starts at BASE_CONFIDENCE, boosted by strengthening signals
  verified     : bool     — true only after explicit Stage 5 verification; never reverts to false
  basis        : string   — user-readable explanation of why this invariant is active
}
```

### ActiveTransition
```
{
  transition_id : string
  confidence    : float
  state_source  : string   — which archetype triggered this transition
  basis         : string
}
```

### Hypothesis
```
{
  id               : string
  type             : enum     — "single_family" | "hybrid_composition"
  target_id        : string   — algorithm family or hybrid composition ID
  confidence       : float    — 0.0–1.0
  supporting_nodes : string[] — signal + invariant IDs that support this hypothesis
  contradicting    : string[] — signal IDs that weaken this hypothesis
  unverified       : string[] — invariant IDs required but not yet verified
}
```

### MisconceptionRisk
```
{
  misconception_id : string
  risk_level       : enum     — "watch" | "likely" | "confirmed" | "resolved"
  trigger_basis    : string
  recovery_route   : string | null
  resolved         : bool
}
```
Risk levels only escalate, never de-escalate within a session.

### Contradiction
```
{
  node_a     : string   — source node ID (signal, invariant, etc.)
  node_b     : string   — target node ID
  edge_type  : string   — always "breaks" for hard contradictions
  resolution : string | null   — null = unresolved; blocks gate_action
}
```
Unresolved contradictions force `gate_action = "backtrack"` regardless of score.

### ComplexityGate
```
{
  max_n                : number | null
  time_limit_sec       : number | null
  ops_budget           : number | null
  feasible_classes     : string[]
  eliminated_classes   : string[]
  eliminated_archetypes: string[]
}
```

### ConfidenceReport
```
{
  score         : int      — 0–100
  band          : enum     — "high" | "medium" | "low"
  label         : string
  gate_action   : enum     — "proceed" | "verify" | "backtrack"
  earned        : { key: string, points: int }[]
  deducted      : { key: string, points: int }[]
  weakest_stage : string | null
}
```

### StageLogEntry
```
{
  complete        : bool
  completed_at    : number
  answers         : { [answerKey]: answerValue }
  signals_emitted : string[]
}
```

---

## IRManager API

| Method | Description |
|--------|-------------|
| `init(sessionId, problemDigest)` | Create new IR, mark all engines dirty, return IR |
| `restore(sessionId)` | Load from sessionStorage, mark all engines dirty |
| `persist()` | Serialize IR to sessionStorage |
| `destroy(sessionId)` | Remove from sessionStorage, clear IR |
| `get()` | Return current IR object (mutable reference) |
| `getField(name)` | Return a single top-level field |
| `writeField(name, value)` | Update field and mark downstream engines dirty |
| `appendToField(name, item)` | Push to array field and mark dirty |
| `markDirty(fieldName)` | Propagate dirty flags from DIRTY_PROPAGATION table |
| `isDirty(engineId)` | Check if engine needs to run |
| `clearDirty(engineId)` | Clear after engine runs |
| `logStageComplete(stageId, answers, signalsEmitted)` | Write to stage_log |

---

## Dirty Flag Propagation

When a field changes, the following engines are marked dirty and will re-run on next schedule:

| Field changed | Dirty engines |
|---------------|---------------|
| `signals` | E2, E3, E6, E7, E8, E9 |
| `candidate_states` | E3, E6, E7, E8, E9 |
| `active_invariants` | E6, E7, E9 |
| `hypotheses` | E7, E8, E9 |
| `misconception_risk` | E9 |
| `contradictions` | E6, E9 |
| `complexity_gate` | E2 |

---

## Invariants of the IR

1. `signal.strength` is immutable after emission — never updated by engines.
2. `verified: true` on an invariant never reverts to `false` within a session.
3. `risk_level` on misconception risks only escalates — never decreases.
4. Any unresolved `Contradiction` forces `gate_action = "backtrack"`.
5. The IR is fully re-derivable from `stage_log` — no information exists in the IR that cannot be recomputed.
