// stages/stage5/verifiers/keyword-crosscheck.js
// 5E — Cross-check: does problem language match structural direction?
// Used by: stage5.js

const KeywordCrosscheck = (() => {

  const VERIFIER = {
    id      : 'keyword_crosscheck',
    label   : 'Keyword Cross-Check',
    purpose : 'Warning only — catch cases where problem language suggests different approach than structure',
    when    : 'Always run — takes 30 seconds. Catches late misidentifications.',
    severity: 'warning',
  };

  // Keyword → likely family mapping
  const KEYWORD_SIGNALS = [
    { keywords: ['minimum', 'smallest', 'least'],     families: ['dp', 'greedy', 'binary_search'], note: 'Optimization — could be DP or Binary Search on Answer' },
    { keywords: ['maximum', 'largest', 'most'],       families: ['dp', 'greedy'],                  note: 'Optimization — DP if overlapping subproblems, Greedy if independent' },
    { keywords: ['count', 'how many', 'number of'],   families: ['dp'],                             note: 'Counting → DP with addition transitions' },
    { keywords: ['shortest path', 'minimum steps'],   families: ['graph', 'bfs'],                  note: 'Path problem → BFS (unweighted) or Dijkstra (weighted)' },
    { keywords: ['substring', 'subarray'],            families: ['sliding_window', 'prefix_sum', 'dp'], note: 'Contiguous range → sliding window or prefix sum' },
    { keywords: ['subsequence'],                      families: ['dp'],                             note: 'Non-contiguous → DP (LCS, LIS patterns)' },
    { keywords: ['permutation', 'arrangement'],       families: ['backtracking', 'dp_bitmask'],    note: 'All orderings → Backtracking (n≤10) or Bitmask DP (n≤20)' },
    { keywords: ['connected', 'component', 'island'], families: ['graph', 'union_find'],           note: 'Connectivity → BFS/DFS or Union Find' },
    { keywords: ['topological', 'prerequisite', 'dependency'], families: ['graph'],                note: 'Ordering constraints → Topological sort' },
    { keywords: ['palindrome'],                       families: ['dp', 'two_pointer'],             note: 'Palindrome → DP (subsequence) or Two Pointer (substring)' },
    { keywords: ['balance', 'partition', 'split'],   families: ['dp', 'binary_search'],           note: 'Split into groups → DP or Binary Search on max/min' },
    { keywords: ['k-th', 'kth', 'median'],           families: ['heap', 'binary_search'],         note: 'Order statistic → Heap O(n log k) or QuickSelect O(n)' },
    { keywords: ['merge', 'interval', 'overlap'],    families: ['greedy', 'sweep_line'],          note: 'Interval problems → Sort + Greedy by endpoint' },
    { keywords: ['cycle', 'circular', 'loop'],       families: ['graph'],                         note: 'Cycle → Graph cycle detection' },
  ];

  // Mismatch detection — keyword suggests family X but direction is family Y
  const MISMATCHES = [
    {
      id          : 'mm_path_not_graph',
      keywordFamily: 'graph',
      directionFamily: 'dp',
      warning     : 'Problem says "path" or "connected" but direction is DP — verify this is not a graph problem',
    },
    {
      id          : 'mm_count_not_dp',
      keywordFamily: 'dp',
      directionFamily: 'greedy',
      warning     : 'Problem says "count" or "how many" but direction is Greedy — counting usually needs DP',
    },
    {
      id          : 'mm_subarray_not_window',
      keywordFamily: 'sliding_window',
      directionFamily: 'dp',
      warning     : 'Problem mentions "subarray" — check if sliding window O(n) is faster than DP O(n²)',
    },
    {
      id          : 'mm_subsequence_not_window',
      keywordFamily: 'dp',
      directionFamily: 'sliding_window',
      warning     : 'Problem mentions "subsequence" (not subarray) — subsequence is non-contiguous, sliding window will not work',
    },
    {
      id          : 'mm_kth_not_sort',
      keywordFamily: 'heap',
      directionFamily: 'greedy',
      warning     : 'Problem asks for k-th element — use Heap O(n log k) or QuickSelect O(n), not full sort O(n log n)',
    },
  ];

  function getVerifier()     { return { ...VERIFIER }; }
  function getKeywords()     { return [...KEYWORD_SIGNALS]; }
  function getMismatches()   { return [...MISMATCHES]; }

  // Scan problem description for keyword signals
  function scanProblemText(text) {
    const lower   = text.toLowerCase();
    const matches = [];

    KEYWORD_SIGNALS.forEach(sig => {
      const found = sig.keywords.filter(kw => lower.includes(kw));
      if (found.length) {
        matches.push({
          keywords : found,
          families : sig.families,
          note     : sig.note,
        });
      }
    });

    return matches;
  }

  // Check for mismatches between keyword signals and current directions
  function detectMismatches(keywordMatches, currentDirections) {
    const keywordFamilies = new Set(
      keywordMatches.flatMap(m => m.families)
    );
    const dirFamilies = new Set(
      currentDirections.map(d => d.family ?? '')
    );

    return MISMATCHES.filter(mm => {
      const keywordSuggests = keywordFamilies.has(mm.keywordFamily);
      const directionIs     = dirFamilies.has(mm.directionFamily);
      return keywordSuggests && directionIs;
    });
  }

  // Build a cross-check report
  function buildReport(keywordMatches, currentDirections) {
    const mismatches   = detectMismatches(keywordMatches, currentDirections);
    const hasConflict  = mismatches.length > 0;

    return {
      keywordMatches,
      mismatches,
      hasConflict,
      severity: hasConflict ? 'warning' : 'ok',
      message : hasConflict
        ? `${mismatches.length} keyword-direction mismatch(es) detected — review before coding`
        : 'Keywords align with structural direction — no conflicts',
    };
  }

  return {
    getVerifier,
    getKeywords,
    getMismatches,
    scanProblemText,
    detectMismatches,
    buildReport,
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = KeywordCrosscheck;
}