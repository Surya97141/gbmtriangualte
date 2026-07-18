// INSERT these two objects into the existing VARIANTS array in
// stages/stage4-5/variants/graph-variants.js (currently missing both).

{
  id          : 'gv_network_flow',
  label       : 'Network Flow (Max Flow)',
  tagline     : 'Maximum throughput from a source to a sink through capacity-limited edges',
  complexity  : 'O(V * E^2) with Edmonds-Karp',
  when        : [
    'Problem talks about maximum flow/throughput through a capacitated network',
    'Source and sink are identifiable, edges have capacities',
  ],
  template    : `// Edmonds-Karp: repeatedly BFS for an augmenting path with
// spare capacity, push flow equal to the bottleneck edge on
// that path, add residual (reverse) edges, repeat until no
// augmenting path remains.`,
  checkQuestion: 'Is there a clear source, sink, and capacity-limited edges between them?',
  watchOut    : [
    'Forgetting residual (reverse) edges prevents the algorithm from undoing a suboptimal earlier choice',
    'Bipartite Matching is a special case of this with all capacities = 1 -- if the structure is purely two-sided pairing, that direct algorithm is simpler to code',
  ],
  examples    : [
    'Maximum Flow in a network',
    'Min-Cut Max-Flow theorem applications',
  ],
},
{
  id          : 'gv_bipartite_matching',
  label       : 'Bipartite Matching',
  tagline     : 'Pair up two distinct groups 1-to-1, maximizing the number of pairs',
  complexity  : 'O(V * E) with Kuhn algorithm',
  when        : [
    'Two distinct sides need to be matched (jobs<->people, students<->schools)',
  ],
  template    : `// Kuhn's algorithm: for each left node, try to match it via
// DFS. If its preferred right node is taken, try to re-route
// (augment) the node that took it to a different match, freeing
// the spot. This augmenting-path search is the core of the algorithm.`,
  checkQuestion: 'Is this literally "match side A to side B, one-to-one", not a more general flow structure?',
  watchOut    : [
    'This is a special case of Network Flow (gv_network_flow) with unit capacities -- use the direct algorithm when the structure is this simple, general flow only if capacities/structure are more complex',
    'Not attempting to re-route an already-matched node when a new node wants its spot undercounts the matching',
  ],
  examples    : [
    'Job assignment maximizing matches',
    'Bipartite Matching (classic assignment problem)',
  ],
},
