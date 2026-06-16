# Engine Contracts

## Overview

All engines are registered with `EngineRegistry`. No engine calls another engine directly. All coordination goes through the IR and the event bus. Engines run in a fixed topological order whenever dirty flags are set.

---

## Execution Order

```
E5 → E1 → E2 → E3 → E4 → E6 → E7 → E8 → E9
```

This order is enforced by `EngineRegistry.runDirty()` and `EngineRegistry.runAll()`. The order reflects the dependency DAG — no engine reads a field written by an engine that runs after it.

---

## Engine Contracts

### E1 — Signal Engine
**Module:** `engines/signal-engine.js`

| | |
|--|--|
| Reads | `ir.stage_log` |
| Writes | `ir.signals[]` |
| Trigger | `stage:complete` event or dirty flag |
| Idempotent | Yes — running twice produces the same result |

Extracts signal nodes from completed stage answers using `SIGNAL_RULES`. Deduplicates by signal ID. Emitted signals are immutable after creation.

---

### E2 — State Engine
**Module:** `engines/state-engine.js`

| | |
|--|--|
| Reads | `ir.signals[]`, `ir.complexity_gate` |
| Writes | `ir.candidate_states[]` |
| Requires init | `StateEngine.init(ontologyLoader)` |

Scores all state archetypes using `signalToStates` adjacency cache. Applies contradiction penalties. Eliminates archetypes in `complexity_gate.eliminated_archetypes`. Sorts by descending weight.

---

### E3 — Invariant Engine
**Module:** `engines/invariant-engine.js`

| | |
|--|--|
| Reads | `ir.candidate_states[]`, `ir.signals[]` |
| Writes | `ir.active_invariants[]`, `ir.contradictions[]` |
| Requires init | `InvariantEngine.init(ontologyLoader)` |

Activates invariants required by candidate archetypes. Computes confidence from strengthening signals. Detects hard breaks (when a `breaks` edge signal is active for a required invariant) and writes contradictions. Preserves `verified: true` state across re-runs.

**Additional methods:**
- `markVerified(ir, invariantId)` — called on `invariant:verified` event
- `resolveContradiction(ir, nodeA, nodeB, resolution)` — called on `contradiction:resolved` event

---

### E4 — Transition Engine
**Module:** `engines/transition-engine.js`

| | |
|--|--|
| Reads | `ir.candidate_states[]`, `ir.active_invariants[]` |
| Writes | `ir.active_transitions[]` |
| Requires init | `TransitionEngine.init(ontologyLoader)` |

Activates transition archetypes whose required invariants are present in `active_invariants`. Confidence boosted by the count of verified invariants. Each transition is only included once even if multiple states reference it.

---

### E5 — Complexity Engine
**Module:** `core/confidence-engine.js` (complexity sub-function, or dedicated `engines/complexity-engine.js`)

| | |
|--|--|
| Reads | `ir.stage_log` (specifically `stage0` answers: n, time_limit) |
| Writes | `ir.complexity_gate` |

Computes feasible and eliminated complexity classes from n and time limit. Marks specific state archetypes as eliminated if their state space exceeds the ops budget. Runs first to enable E2 to filter archetypes.

---

### E6 — Hypothesis Engine
**Module:** `engines/hypothesis-engine.js` *(not yet implemented — planned)*

| | |
|--|--|
| Reads | `ir.candidate_states[]`, `ir.active_invariants[]`, `ir.contradictions[]` |
| Writes | `ir.hypotheses[]` |

Forms algorithm family or hybrid composition hypotheses from high-weight candidate states. Computes hypothesis confidence from aggregate weights × verification bonuses × contradiction penalties. Marks `unverified` invariants per hypothesis. Status: planned for Phase 2.

---

### E7 — Misconception Engine
**Module:** `engines/misconception-engine.js`

| | |
|--|--|
| Reads | `ir.hypotheses[]`, `ir.signals[]`, `ir.candidate_states[]` |
| Writes | `ir.misconception_risk[]` |
| Requires init | `MisconceptionEngine.init(ontologyLoader)` |

Scans active candidate states to find misconceptions registered in their `trigger_context`. Computes risk level (`watch`/`likely`/`confirmed`) from active trigger signals vs. anti-trigger signals. Risk levels only escalate. Resolved entries are preserved.

**Additional method:**
- `markResolved(ir, misconceptionId)` — called on `recovery:exit` event

---

### E8 — Composition Engine
**Module:** `engines/composition-engine.js` *(not yet implemented — not needed for sliding window slice)*

| | |
|--|--|
| Reads | `ir.hypotheses[]`, `ir.signals[]` |
| Writes | `ir.hypotheses[]` (upgrades single-family to hybrid) |

Checks active signals against `HybridComposition` trigger conditions. Upgrades a single-family hypothesis to a hybrid if the trigger and anti-trigger conditions are met. Status: planned for Phase 3 (BFS+Bitmask, SCC→DAG→DP).

---

### E9 — Confidence Engine
**Module:** `core/confidence-engine.js`

| | |
|--|--|
| Reads | Full IR |
| Writes | `ir.confidence` |

Computes the confidence score from stage completions (`SCORE_MAP`), invariant verification bonuses, and penalties (`PENALTY_MAP`). Unresolved contradictions force `gate_action = "backtrack"` regardless of score. This is the single authoritative confidence computation — it replaces the legacy `_computeReport` in `stage6-5.js`.

---

## Registration

Engines are registered with `EngineRegistry.register(engineId, instance)`. Each instance must expose `run(ir)`. The registry enforces the declared `reads` and `writes` contracts and prevents duplicate registration.

```javascript
EngineRegistry.register('E1', SignalEngine);
EngineRegistry.register('E2', StateEngine);
// etc.
```

---

## Scheduling

After each stage completion:

```
EventBus.emit('stage:complete', { stageId, answers })
  → SignalEngine.run(ir)       [E1 runs, updates signals]
  → IRManager.markDirty('signals')
  → EngineRegistry.runDirty(ir, IRManager)  [E2..E9 run in order if dirty]
  → IRManager.persist()
```

Engines skip execution if their dirty flag is `false`. Dirty flags are set by `IRManager.markDirty(fieldName)` which propagates to all downstream engines per the `DIRTY_PROPAGATION` table.

---

## Adding a New Engine

1. Create the module in `engines/` following the `run(ir)` contract.
2. Add its contract to `ENGINE_CONTRACTS` in `engine-registry.js`.
3. Insert its ID into `EXECUTION_ORDER` at the correct topological position.
4. Update `DIRTY_PROPAGATION` in `ir-manager.js` for any new fields it writes.
5. Wire `init()` and `register()` calls in the relevant vertical slice flow file.
6. Add a test file in `tests/`.
