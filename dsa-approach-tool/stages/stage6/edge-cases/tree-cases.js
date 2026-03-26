// stages/stage6/edge-cases/tree-cases.js
// Edge cases specific to tree inputs
// Used by: stage6.js

const TreeCases = (() => {

  const CASES = [
    {
      id           : 'tc_single_node',
      label        : 'Tree with single node (root only)',
      priority     : 'critical',
      whyItMatters : 'No children to recurse on. Any code accessing root->left or root->right without null check crashes.',
      checkQuestion: 'Does your solution return correct answer for root-only tree without null pointer access?',
      commonFailure: 'root->left->val access when left is nullptr. Diameter = 0 (not 1) edge case.',
      fix          : 'Add explicit null checks before accessing children. Base case: if (!root) return 0.',
      testInput    : 'root = [1]',
      expected     : 'No crash. Diameter=0, height=0, sum=1',
    },
    {
      id           : 'tc_two_nodes',
      label        : 'Root with single child (left or right only)',
      priority     : 'critical',
      whyItMatters : 'Asymmetric tree. Code assuming both children exist accesses null pointer. Path diameter through missing child is 0.',
      checkQuestion: 'Does your solution handle tree where one child is always null?',
      commonFailure: 'max(leftHeight, rightHeight) when one height function returns garbage from null access.',
      fix          : 'Always return 0 (or appropriate base) from null node, not -1 or garbage.',
      testInput    : 'root = [1, 2, null] (left child only)',
      expected     : 'Height=1, diameter=1, max path sum = 3',
    },
    {
      id           : 'tc_left_skewed',
      label        : 'Completely left-skewed tree (linked list shape)',
      priority     : 'critical',
      whyItMatters : 'Recursive DFS reaches depth n. Default stack allows ~10^4-10^5 frames. At n=10^5 → stack overflow → runtime crash.',
      checkQuestion: 'Does your recursive DFS stack overflow on a skewed tree with n=10^5?',
      commonFailure: 'Stack overflow at ~70,000 depth in most systems. Silently crashes with segfault.',
      fix          : 'Convert recursive DFS to iterative using explicit stack for large n. BFS is inherently safe.',
      testInput    : 'n=100000 left-skewed: 1→2→3→...→100000',
      expected     : 'Completes without segfault',
    },
    {
      id           : 'tc_right_skewed',
      label        : 'Completely right-skewed tree',
      priority     : 'critical',
      whyItMatters : 'Same stack overflow risk as left-skewed. Tests both directions of skew.',
      checkQuestion: 'Same as left-skewed — does recursion depth exceed stack limit?',
      commonFailure: 'Same stack overflow as left-skewed.',
      fix          : 'Same iterative DFS fix. Also check: Morris traversal for O(1) space tree traversal.',
      testInput    : 'n=100000 right-skewed: 1→null, 2→null, ...',
      expected     : 'Completes without segfault',
    },
    {
      id           : 'tc_all_same_value',
      label        : 'All nodes have identical values',
      priority     : 'high',
      whyItMatters : 'BST search breaks when all values equal — duplicate handling determines whether left or right subtree is searched.',
      checkQuestion: 'Does your BST solution handle duplicates correctly when all values are equal?',
      commonFailure: 'BST insert/search: strict < vs <= matters. Count of occurrences incorrect.',
      fix          : 'Decide: duplicates go left or right. Be consistent throughout insert/search/delete.',
      testInput    : 'BST of [5, 5, 5, 5]',
      expected     : 'Search finds all occurrences, count is correct',
    },
    {
      id           : 'tc_all_negative_values',
      label        : 'Tree nodes with all negative values',
      priority     : 'high',
      whyItMatters : 'Maximum path sum initialized to 0 misses all-negative trees. The answer is the least-negative single node.',
      checkQuestion: 'Does your max path sum solution initialize correctly for all-negative trees?',
      commonFailure: 'int maxSum = 0 → returns 0 when correct answer is -1 (the max node in negative tree).',
      fix          : 'Initialize maxSum = INT_MIN, not 0. Or initialize to root->val before traversal.',
      testInput    : 'Tree: [-5, -3, -8]',
      expected     : 'Max path sum = -3 (not 0)',
    },
    {
      id           : 'tc_path_not_through_root',
      label        : 'Optimal path entirely within one subtree',
      priority     : 'high',
      whyItMatters : 'Path sum and diameter problems require checking all paths, not just those passing through root. Subtree-only optimum is missed if only root is the junction.',
      checkQuestion: 'Does your solution consider paths that do not pass through the root?',
      commonFailure: 'Computing only root-to-leaf or root-through-subtree paths. Missing the path [5→4→3] in tree rooted at 1.',
      fix          : 'Update global max at EVERY node during DFS post-order, not just at root.',
      testInput    : 'Tree where best path is in a subtree, not through root',
      expected     : 'Finds subtree-best path correctly',
    },
    {
      id           : 'tc_balanced_complete',
      label        : 'Perfect binary tree (all levels full)',
      priority     : 'medium',
      whyItMatters : 'Balanced tree is usually the easy case — but verify base cases still hold and no off-by-one in height/level counting.',
      checkQuestion: 'Does your solution correctly handle a perfect binary tree?',
      commonFailure: 'Height counting: height(leaf) should be 0 or 1 depending on definition. Be consistent.',
      fix          : 'Pick: height = number of edges (leaf=0) or number of nodes (leaf=1). Use consistently throughout.',
      testInput    : 'Perfect tree of height 3: 15 nodes',
      expected     : 'Correct height, diameter, node count',
    },
  ];

  function getAll()         { return [...CASES]; }
  function getById(id)      { return CASES.find(c => c.id === id) ?? null; }
  function getCritical()    { return CASES.filter(c => c.priority === 'critical'); }
  function getByPriority(p) { return CASES.filter(c => c.priority === p); }

  return { getAll, getById, getCritical, getByPriority };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TreeCases;
}