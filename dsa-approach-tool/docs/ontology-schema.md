# Ontology Schema

## Overview

The ontology is a typed property graph. All nodes have a stable `id`, a `type`, and a set of type-specific fields. All edges have a declared `type`, direction, and `weight`. No two node types share the same role.

---

## Node Types

### Signal
File: `ontology/signal-graph.json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Stable identifier, prefix `sig_` |
| `label` | string | yes | Human-readable name |
| `source` | enum | yes | `constraints`, `output_form`, `query_type`, `narrative`, `structure` |
| `base_strength` | float 0–1 | yes | Default inference weight before co-requisite adjustment |
| `trigger_phrases` | string[] | yes | Display-only phrases; not used for text parsing |
| `negation_id` | string\|null | yes | If this signal is active, suppress the negation signal during extraction |
| `requires_also` | string[] | yes | Co-requisite signal IDs; strength × 0.5 if any absent |

### StateArchetype
File: `ontology/state-graph.json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Stable identifier, prefix `sa_` |
| `label` | string | yes | |
| `state_form` | string | yes | Canonical form: `dp[i] = ...` or equivalent |
| `fill_order` | string | yes | How the state is traversed |
| `dimension_count` | int | yes | Number of independent dimensions |
| `feasibility` | string | yes | Max n before this archetype fails |
| `requires` | string[] | yes | Invariant IDs that must hold for correctness |
| `uses` | string[] | yes | Transition archetype IDs |
| `commonly_confused_with` | string[] | yes | Other archetype IDs |
| `verified_by` | string[] | yes | Verifier check IDs |
| `confidence_weight` | int | yes | Points contributed to confidence score |

### Invariant
File: `ontology/invariant-graph.json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Stable identifier, prefix `inv_` |
| `label` | string | yes | |
| `statement` | string | yes | Precise logical condition |
| `maintained_by` | string | yes | Operation that preserves this invariant |
| `violated_by` | string | yes | Condition or operation that destroys it |
| `proof_sketch` | string | yes | One-line informal justification |
| `breaks_if` | string[] | yes | Conditions under which invariant is impossible |
| `preserves` | string[] | yes | State archetype IDs whose correctness depends on this |
| `manifests_meta_pattern` | string | no | Meta-pattern ID |

### TransitionArchetype
File: `ontology/transition-graph.json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Stable identifier, prefix `tr_` |
| `label` | string | yes | |
| `operation_form` | string | yes | Step-by-step description |
| `driver` | string | yes | Which variable drives each iteration |
| `direction` | enum | yes | `push` or `pull` |
| `strictly_smaller` | bool | yes | Whether sub-problems are strictly smaller |
| `amortized_cost` | string | yes | Total cost across n steps |
| `requires_invariant` | string[] | yes | Invariant IDs that must hold |
| `used_by_states` | string[] | yes | State archetype IDs |

### Misconception
File: `ontology/misconception-graph.json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Stable identifier, prefix `mc_` |
| `label` | string | yes | |
| `symptom` | string | yes | Observable failure mode |
| `root_cause` | string | yes | The wrong reasoning step |
| `trigger_context` | string[] | yes | State archetype IDs where this fires |
| `trigger_signals` | string[] | yes | Signals that elevate risk to `likely` |
| `anti_trigger_signals` | string[] | yes | Signals that suppress the risk |
| `detection_question` | string | yes | Single diagnostic question |
| `correction` | string | yes | Minimal correct reasoning |
| `breaks_invariant` | string\|null | yes | Invariant this misconception causes to fail |
| `recovery_route_id` | string | yes | Recovery route that resolves this |

---

## Edge Types

All edges are declared in the `edges` array of the source node's graph file.

| Edge Type | Direction | Weight | Semantics |
|-----------|-----------|--------|-----------|
| `implies` | Signal → StateArchetype | 0.0–1.0 | Signal is evidence for this state |
| `strengthens` | Signal → Invariant | 0.0–1.0 | Signal increases invariant confidence |
| `contradicts` | Signal → Signal\|StateArchetype | 0.0–1.0 | Source reduces target's weight or suppresses it |
| `breaks` | Signal → Invariant | 1.0 | Source makes invariant impossible to maintain |

---

## Stable ID Conventions

| Prefix | Node Type |
|--------|-----------|
| `sig_` | Signal |
| `sa_` | StateArchetype |
| `inv_` | Invariant |
| `tr_` | TransitionArchetype |
| `mc_` | Misconception |
| `rr_` | RecoveryRoute |
| `hc_` | HybridComposition |
| `va_` | VisualizationArchetype |
| `af_` | AlgorithmFamily |

IDs are lowercase, words separated by underscores. IDs are never reused and never renamed once assigned.

---

## Extension Rules

1. New signal nodes require at least 5 corpus problems that no existing signal captures.
2. New edge types require a documented engine that consumes them.
3. Node fields marked `required: yes` must be present in all instances or the loader throws.
4. Weights are always floats in [0.0, 1.0]. A weight of 1.0 on `breaks` means total invalidation.
