// stages/stage4-5/variants/game-theory-variants.js
// Backtracking and Game Theory approach variants
// Used by: stage4-5.js

const GameTheoryVariants = (() => {

  const VARIANTS = [
    {
      id          : 'gt_backtracking',
      label       : 'Backtracking',
      tagline     : 'Try every option, undo the moment a choice cannot possibly lead anywhere valid',
      complexity  : 'Exponential, pruning reduces the practical search space',
      when        : [
        'Need to generate all permutations, subsets, or valid configurations',
        'n is small enough (roughly <= 20) that exhaustive search with pruning is feasible',
      ],
      template    : `void backtrack(vector<int>& path, vector<int>& remaining) {
  if (remaining.empty()) { /* record path as a valid result */ return; }
  for (int i = 0; i < remaining.size(); i++) {
    path.push_back(remaining[i]);
    vector<int> rest = remaining;
    rest.erase(rest.begin() + i);
    backtrack(path, rest);
    path.pop_back(); // undo -- this is the "back" in backtracking
  }
}`,
      checkQuestion: 'Is n small enough for exhaustive search, and can invalid partial choices be pruned early?',
      watchOut    : [
        'Forgetting to actually undo a choice before trying the next option lets state leak between branches',
        'If the same sub-situation gets revisited from different paths, add memoization on top -- that turns this into DP',
      ],
      examples    : [
        'N-Queens',
        'Permutations / Subsets',
        'Sudoku Solver',
      ],
    },
    {
      id          : 'gt_minimax',
      label       : 'Minimax',
      tagline     : 'Two players alternate maximizing and minimizing the same score',
      complexity  : 'Exponential without pruning; alpha-beta pruning cuts this significantly',
      when        : [
        'Two-player, zero-sum game where both play optimally',
        'Need to determine the best achievable outcome for the player to move',
      ],
      template    : `int minimax(State s, bool maximizing) {
  if (isTerminal(s)) return evaluate(s);
  if (maximizing) {
    int best = INT_MIN;
    for (auto& child : children(s)) best = max(best, minimax(child, false));
    return best;
  } else {
    int best = INT_MAX;
    for (auto& child : children(s)) best = min(best, minimax(child, true));
    return best;
  }
}`,
      checkQuestion: 'Are there exactly two players alternating turns, each playing optimally against the other?',
      watchOut    : [
        'Without alpha-beta pruning or memoization, this explores far more states than necessary for most real games',
        'Confusing which player is maximizing vs minimizing at each recursion level is a common bug',
      ],
      examples    : [
        'Predict the Winner',
        'Stone Game variants',
      ],
    },
    {
      id          : 'gt_sprague_grundy',
      label       : 'Sprague-Grundy / Nim Theory',
      tagline     : 'Reduce an impartial game to a single number (Grundy value) to determine the winner instantly',
      complexity  : 'O(states) to precompute Grundy numbers, O(1) to combine them',
      when        : [
        'Impartial game (both players have the same moves available) -- classic Nim or Nim-like games',
        'Need to know who wins with optimal play, without simulating every move sequence',
      ],
      template    : `// Classic Nim: XOR of all pile sizes. Nonzero => first player wins.
int nimResult = 0;
for (int pile : piles) nimResult ^= pile;
bool firstPlayerWins = (nimResult != 0);

// General Grundy number: smallest non-negative integer NOT
// reachable from this state's Grundy values (mex rule).`,
      checkQuestion: 'Do both players have the exact same set of moves available from any given state (impartial game)?',
      watchOut    : [
        'Sprague-Grundy only applies to IMPARTIAL games -- games where players have different move sets need Minimax instead',
        'The Grundy number of a position is the mex (minimum excludant) of the Grundy numbers of positions reachable from it',
      ],
      examples    : [
        'Nim Game',
        'Game of combined independent sub-games (Sprague-Grundy theorem)',
      ],
    },
  ];

  function getAll()       { return [...VARIANTS]; }
  function getById(id)    { return VARIANTS.find(v => v.id === id) ?? null; }

  function getRelevant(directions = []) {
    const isGameTheoryDirection = directions.some(d =>
      (d.family ?? '').includes('game_theory') ||
      (d.id     ?? '').includes('game_theory')
    );
    if (!isGameTheoryDirection) return [];
    return getAll();
  }

  return {
    getAll,
    getById,
    getRelevant,
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GameTheoryVariants;
}
