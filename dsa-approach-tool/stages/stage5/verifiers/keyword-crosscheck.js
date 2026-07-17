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

  // ─── EARLY-INTAKE SIGNALS ───────────────────────────────────────────────────
  // Used only by the optional "paste problem statement" intake stage (before
  // Stage 1) to pre-fill Stage 1 / Stage 2's own selections. Separate tables
  // from KEYWORD_SIGNALS above (which map to algorithm families for the
  // Stage 5 verifier) since these map to input-type / output-form ids instead
  // — same scanning approach (lowercase substring match), different target.

  const INPUT_TYPE_SIGNALS = [
    { keywords: ['two arrays', 'nums1', 'nums2'],                    inputType: 'two_arrays' },
    { keywords: ['array', 'nums', 'elements', 'list of integers'],   inputType: 'single_array' },
    { keywords: ['two strings', 's1', 's2', 'source', 'target string'], inputType: 'two_strings' },
    { keywords: ['words', 'list of strings', 'dictionary'],          inputType: 'multiple_strings' },
    { keywords: ['string', 'word', 's ='],                           inputType: 'single_string' },
    { keywords: ['matrix', 'grid', 'rows and columns', 'board'],     inputType: 'matrix_grid' },
    { keywords: ['edge list', 'edges = ', 'connections'],            inputType: 'graph_edge_list' },
    { keywords: ['adjacency'],                                       inputType: 'graph_adjacency' },
    { keywords: ['binary tree', 'tree node', 'root ='],              inputType: 'tree_explicit' },
    { keywords: ['intervals', 'meetings', 'start and end time'],     inputType: 'intervals' },
    { keywords: ['given an integer n', 'given a number'],            inputType: 'single_number' },
  ];

  const OUTPUT_FORM_SIGNALS = [
    { keywords: ['return the number of', 'count the', 'how many'],       outputForm: 'count' },
    { keywords: ['return true', 'return false', 'is it possible', 'determine if'], outputForm: 'boolean' },
    { keywords: ['return the index', 'position of', 'return the indices'], outputForm: 'index_position' },
    { keywords: ['longest substring', 'longest subarray', 'maximum subarray', 'minimum subarray'], outputForm: 'subarray_substring' },
    { keywords: ['longest subsequence', 'longest common subsequence'],    outputForm: 'subsequence' },
    { keywords: ['rearrange', 'sort the array', 'next permutation'],      outputForm: 'full_array' },
    { keywords: ['minimum spanning tree', 'shortest path tree'],          outputForm: 'tree_graph' },
    { keywords: ['return the maximum', 'return the minimum', 'return the sum', 'return the total'], outputForm: 'single_value' },
  ];

  // Order matters — first match with any hit wins for query type (checked
  // most-specific first).
  const QUERY_TYPE_SIGNALS = [
    { keywords: ['update', 'modify the array', 'point update'],        queryType: 'updates' },
    { keywords: ['queries are given offline', 'process all queries'],  queryType: 'offline' },
    { keywords: ['for each query', 'q queries', 'answer each query'],  queryType: 'online' },
  ];

  function getVerifier()     { return { ...VERIFIER }; }
  function getKeywords()     { return [...KEYWORD_SIGNALS]; }
  function getMismatches()   { return [...MISMATCHES]; }

  // Suggest input type(s) from pasted problem text — returns up to 3 ids,
  // best (most keyword hits) first.
  function suggestInputTypes(text, limit = 3) {
    const lower = (text ?? '').toLowerCase();
    const scored = INPUT_TYPE_SIGNALS
      .map(sig => ({ inputType: sig.inputType, hits: sig.keywords.filter(kw => lower.includes(kw)) }))
      .filter(s => s.hits.length > 0)
      .sort((a, b) => b.hits.length - a.hits.length);

    const seen = new Set();
    const result = [];
    scored.forEach(s => {
      if (seen.has(s.inputType) || result.length >= limit) return;
      seen.add(s.inputType);
      result.push({ inputType: s.inputType, matchedKeywords: s.hits });
    });
    return result;
  }

  // Suggest a single output form — best match, or null if nothing hit.
  function suggestOutputForm(text) {
    const lower = (text ?? '').toLowerCase();
    let best = null;
    OUTPUT_FORM_SIGNALS.forEach(sig => {
      const hits = sig.keywords.filter(kw => lower.includes(kw));
      if (hits.length && (!best || hits.length > best.matchedKeywords.length)) {
        best = { outputForm: sig.outputForm, matchedKeywords: hits };
      }
    });
    return best;
  }

  // Suggest a query type — defaults to 'none' if nothing matches (safest
  // assumption: a single direct computation, not a query workload).
  function suggestQueryType(text) {
    const lower = (text ?? '').toLowerCase();
    for (const sig of QUERY_TYPE_SIGNALS) {
      const hits = sig.keywords.filter(kw => lower.includes(kw));
      if (hits.length) return { queryType: sig.queryType, matchedKeywords: hits };
    }
    return { queryType: 'none', matchedKeywords: [] };
  }

  // Combined suggestion used by the intake stage.
  function suggestAll(text) {
    return {
      inputTypes: suggestInputTypes(text),
      outputForm: suggestOutputForm(text),
      queryType : suggestQueryType(text),
    };
  }

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
    suggestInputTypes,
    suggestOutputForm,
    suggestQueryType,
    suggestAll,
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = KeywordCrosscheck;
}