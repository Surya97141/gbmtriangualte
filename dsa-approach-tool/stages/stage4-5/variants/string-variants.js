// stages/stage4-5/variants/string-variants.js
// String algorithm approach variants
// Used by: stage4-5.js

const StringVariants = (() => {

  const VARIANTS = [
    {
      id          : 'str_kmp',
      label       : 'KMP (Knuth-Morris-Pratt)',
      tagline     : 'Find one exact pattern inside a text without re-checking matched characters',
      complexity  : 'O(n + m)',
      when        : [
        'Find all occurrences of one exact pattern in a text',
        'No wildcards, exact character match required',
      ],
      template    : `vector<int> buildFailure(string& p) {
  vector<int> f(p.size(), 0);
  int k = 0;
  for (int i = 1; i < p.size(); i++) {
    while (k > 0 && p[i] != p[k]) k = f[k-1];
    if (p[i] == p[k]) k++;
    f[i] = k;
  }
  return f;
}`,
      checkQuestion: 'Is this exactly one pattern searched once in one text, with no fuzzy matching?',
      watchOut    : [
        'The failure function index shift is the most common off-by-one bug here',
        'Reset the match counter using the failure function after a mismatch, not to 0',
      ],
      examples    : [
        'Find all occurrences of a pattern in a text',
        'Shortest palindrome via KMP failure function trick',
      ],
    },
    {
      id          : 'str_z_function',
      label       : 'Z Algorithm',
      tagline     : 'For every position, compute how much it matches the start of the string',
      complexity  : 'O(n)',
      when        : [
        'Need match-with-prefix length at every position in one linear pass',
        'Pattern search via concatenation trick (pattern + separator + text)',
      ],
      template    : `vector<int> zFunction(string& s) {
  int n = s.size();
  vector<int> z(n, 0);
  int l = 0, r = 0;
  for (int i = 1; i < n; i++) {
    if (i < r) z[i] = min(r - i, z[i - l]);
    while (i + z[i] < n && s[z[i]] == s[i + z[i]]) z[i]++;
    if (i + z[i] > r) { l = i; r = i + z[i]; }
  }
  return z;
}`,
      checkQuestion: 'Do you need "match with the START of the string" at every position, not just one fixed pattern search?',
      watchOut    : [
        'z[0] is conventionally left undefined (0), not the full string length -- check the convention your problem expects',
        'Always use a separator character not found in either string when concatenating for search tricks',
      ],
      examples    : [
        'Pattern search via pattern+separator+text concatenation',
        'Counting distinct substrings variants',
      ],
    },
    {
      id          : 'str_rabin_karp',
      label       : 'Rabin-Karp / Rolling Hash',
      tagline     : 'Turn substrings into numbers so comparisons are O(1) instead of character-by-character',
      complexity  : 'O(n) average',
      when        : [
        'Need to compare many different substrings for equality, repeatedly',
        'Precompute once, then answer substring-equality queries fast',
      ],
      template    : `// Precompute prefix hashes and powers of base
vector<long long> h(n+1), pw(n+1);
h[0] = 0; pw[0] = 1;
for (int i = 0; i < n; i++) {
  h[i+1] = (h[i]*BASE + s[i]) % MOD;
  pw[i+1] = (pw[i]*BASE) % MOD;
}
// hash of s[l..r) = (h[r] - h[l]*pw[r-l]) % MOD`,
      checkQuestion: 'Do you need MANY substring comparisons, not just one pattern searched once?',
      watchOut    : [
        'Always verify with an actual character comparison after a hash match -- collisions, while rare, do happen',
        'Use a large prime MOD and non-trivial BASE to reduce adversarial collision risk',
      ],
      examples    : [
        'Longest common substring via binary search + hashing',
        'Repeated substring detection',
      ],
    },
    {
      id          : 'str_aho_corasick',
      label       : 'Aho-Corasick',
      tagline     : 'Search for MANY patterns inside one text in a single scan',
      complexity  : 'O(total pattern length + text length + matches)',
      when        : [
        'Multiple patterns need to be found in one text simultaneously',
        'Single KMP per pattern would be too slow (many patterns)',
      ],
      template    : `// Build a trie of all patterns, then BFS to build failure links
// (see Trie variant for the base structure; failure links added on top)
// goto[state][ch], fail[state], output[state] built via BFS in link-building phase`,
      checkQuestion: 'Are there MULTIPLE distinct patterns to search for in one pass over the text?',
      watchOut    : [
        'Failure links must be built in BFS order (level by level), not DFS order',
        'A node inherits the output set of whatever its failure link points to -- easy to forget this propagation',
      ],
      examples    : [
        'Multiple pattern matching (word search across many words)',
        'Detecting any of several banned substrings in a text',
      ],
    },
    {
      id          : 'str_suffix_array',
      label       : 'Suffix Array (+ LCP)',
      tagline     : 'Sort every suffix of a string to answer whole-string substring questions',
      complexity  : 'O(n log n) or O(n log^2 n)',
      when        : [
        'Need info about ALL substrings at once (longest repeated substring, count distinct substrings)',
        'Simpler, lower-memory alternative to a suffix tree/automaton',
      ],
      template    : `// Doubling construction: sort suffixes by (rank[i], rank[i+k])
// pairs, doubling k each round until fully ordered.
// Companion LCP array (Kasai's algorithm) gives longest common
// prefix between adjacent suffixes in the sorted order.`,
      checkQuestion: 'Do you need a property that spans ALL substrings of the string, not just one search?',
      watchOut    : [
        'LCP array (Kasai) needs the RANK array (inverse of suffix array), not the suffix array directly',
        'Off-by-one in the doubling comparison key is the most common bug',
      ],
      examples    : [
        'Longest Repeated Substring',
        'Count of Distinct Substrings',
      ],
    },
    {
      id          : 'str_manacher',
      label       : 'Manacher Algorithm',
      tagline     : 'Find the longest palindromic substring in linear time',
      complexity  : 'O(n)',
      when        : [
        'Need the longest palindromic substring and n is large (brute force O(n^2) would time out)',
      ],
      template    : `// Transform s -> "^#a#b#c#$" to unify odd/even palindromes
// Expand around each center, reusing previously-computed palindrome
// radii via mirroring when inside a known palindrome bound.`,
      checkQuestion: 'Is n large enough (roughly 1e5+) that the O(n^2) expand-around-center approach would be too slow?',
      watchOut    : [
        'If n is small (a few thousand), plain expand-around-center is simpler and equally correct -- do not over-engineer',
        'Off-by-one converting the transformed-string result back to original-string indices',
      ],
      examples    : [
        'Longest Palindromic Substring (large n)',
        'Count of palindromic substrings',
      ],
    },
    {
      id          : 'str_trie',
      label       : 'Trie',
      tagline     : 'Store many words in a shared-prefix tree for fast prefix queries',
      complexity  : 'O(word length) per insert/search',
      when        : [
        'Many words share prefixes and need fast prefix-based lookups',
        'Autocomplete-style or "does any word start with X" queries',
      ],
      template    : `struct TrieNode {
  TrieNode* child[26] = {};
  bool isEnd = false;
};
void insert(TrieNode* root, string& word) {
  TrieNode* node = root;
  for (char c : word) {
    int idx = c - 'a';
    if (!node->child[idx]) node->child[idx] = new TrieNode();
    node = node->child[idx];
  }
  node->isEnd = true;
}`,
      checkQuestion: 'Do you need PREFIX-based queries, not just exact-word lookups (a hash set would suffice for those)?',
      watchOut    : [
        'Forgetting to mark isEnd means you cannot tell a real word from just a prefix of a longer word',
        'Fixed 26-child arrays waste memory / do not work for larger alphabets -- use a hashmap of children instead',
      ],
      examples    : [
        'Implement Trie (prefix tree)',
        'Word Search II (Trie + backtracking on a grid)',
      ],
    },
  ];

  function getAll()       { return [...VARIANTS]; }
  function getById(id)    { return VARIANTS.find(v => v.id === id) ?? null; }

  function getRelevant(directions = []) {
    const isStringDirection = directions.some(d =>
      (d.family ?? '').includes('string') ||
      (d.id     ?? '').includes('string')
    );
    if (!isStringDirection) return [];
    return getAll();
  }

  return {
    getAll,
    getById,
    getRelevant,
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = StringVariants;
}
