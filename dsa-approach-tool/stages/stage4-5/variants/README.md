# New Variant Files — Phase 3.0 + 3.1 Content

Generated from the CP-KOS vault content (already derived and tested earlier in this
project), reshaped into the exact object format used by the existing
`binary-search-variants.js` / `dp-variants.js` / `graph-variants.js`.

## Where each file goes

Drop these directly into `stages/stage4-5/variants/` as new files:
- `two-pointer-variants.js`
- `sliding-window-variants.js`
- `greedy-variants.js`
- `string-variants.js`
- `math-variants.js`
- `data-structure-variants.js`
- `geometry-sweep-variants.js`
- `game-theory-variants.js`
- `range-query-variants.js`

## Two insertion snippets (not standalone files)

These are object literals to be pasted directly into the existing
`stages/stage4-5/variants/graph-variants.js`'s `VARIANTS` array — do not drop them in
as separate files:
- `gv_dfs_snippet.js` — adds plain DFS as its own direction
- `gv_flow_matching_snippet.js` — adds Network Flow and Bipartite Matching

## Wiring required in stage4-5.js (not done here — this is Claude Code's job)

Following the exact pattern already used for BSV/DPV/GV (see lines ~27-29 and ~157-161
of the current `stage4-5.js`):
1. Declare each new module the same way: `const TPV = typeof TwoPointerVariants !== 'undefined' ? TwoPointerVariants : null;` (repeat for every new file)
2. Add a dispatch branch calling `.getRelevant(directions)` for each, matching the
   existing `variants = BSV.getRelevant?.(directions) ?? BSV.getAll?.() ?? []` pattern
3. Each file's `getRelevant()` checks `directions` for a family keyword substring
   (e.g. `'two_pointer'`, `'string'`, `'math'`, `'data_structure'`, `'geometry_sweep'`,
   `'game_theory'`, `'range_query'`) — Stage 3's structural-properties questions need
   to actually produce directions tagged with these family strings for the new modules
   to ever get reached (this is Phase 3.3 in the roadmap — extending Stage 3's
   questions — and needs to happen alongside this wiring, not after it silently)

## Coverage verification (re-check this claim once wired in, don't just trust it)

All 47 patterns from the source taxonomy are covered by existing + these new files.
Full tally is in the roadmap document's Phase 3 section. Verify post-wiring by grepping
every variant file's `id` keys and counting against the 47-pattern list, the same way
this was checked during generation — don't assume it stayed correct after integration.
