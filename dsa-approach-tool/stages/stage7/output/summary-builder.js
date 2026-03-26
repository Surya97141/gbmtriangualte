// stages/stage7/output/summary-builder.js
// Builds the condensed problem summary shown at top of Stage 7
// "What you know about this problem" in 5 lines
// Used by: stage7.js

const SummaryBuilder = (() => {

  function build(state) {
    const answers    = state.answers    ?? {};
    const directions = state.output?.directions ?? [];
    const s0         = answers.stage0   ?? {};
    const s1         = answers.stage1   ?? {};
    const s2         = answers.stage2   ?? {};
    const s3         = answers.stage3   ?? {};
    const s4_5       = answers.stage4_5 ?? {};

    return {
      complexity : _buildComplexityLine(s0, s4_5),
      input      : _buildInputLine(s1),
      output     : _buildOutputLine(s2),
      structure  : _buildStructureLine(s3),
      direction  : _buildDirectionLine(directions),
    };
  }

  function _buildComplexityLine(s0, s4_5) {
    const n         = s0.n        ?? '?';
    const budget    = s0.budget   ?? null;
    const variantCx = s4_5.variantComplexity ?? null;
    const grade     = s4_5.recheckResult?.grade ?? null;

    let line = `N = ${n}`;
    if (budget)    line += ` · budget: ${budget}`;
    if (variantCx) line += ` · approach: ${variantCx}`;
    if (grade)     line += ` · ${grade === 'safe' ? '✓ fits' : grade === 'warn' ? '~ borderline' : '✗ TLE'}`;

    return line;
  }

  function _buildInputLine(s1) {
    const types   = s1.inputTypes       ?? [];
    const signals = s1.secondarySignals ?? [];

    let line = types.join(', ') || 'Input type not identified';
    if (signals.length) line += ` · signals: ${signals.slice(0,3).join(', ')}`;
    return line;
  }

  function _buildOutputLine(s2) {
    const form    = s2.outputForm         ?? null;
    const optType = s2.optimizationType   ?? null;
    const depth   = s2.solutionDepth      ?? null;

    let parts = [];
    if (form)    parts.push(form);
    if (optType) parts.push(optType);
    if (depth)   parts.push(depth);

    return parts.join(' · ') || 'Output form not identified';
  }

  function _buildStructureLine(s3) {
    const props = s3.properties ?? {};
    const parts = [];

    if (props.order_sensitivity === 'yes') parts.push('order matters');
    if (props.order_sensitivity === 'no')  parts.push('can sort');
    if (props.subproblem_overlap === 'yes') parts.push('overlapping subproblems');
    if (props.local_optimality   === 'yes') parts.push('local optimum = global');
    if (props.feasibility_boundary === 'yes') parts.push('monotone feasibility');
    if (props.dependency_structure === 'graph') parts.push('graph structure');

    const dpSubtype = s3.dpSubtype ?? null;
    if (dpSubtype) parts.push(`DP: ${dpSubtype}`);

    const graphGoal = s3.graphGoal ?? null;
    if (graphGoal) parts.push(`Graph goal: ${graphGoal}`);

    return parts.length
      ? parts.join(' · ')
      : 'Structural properties not fully answered';
  }

  function _buildDirectionLine(directions) {
    if (!directions.length) return 'No directions identified';

    const labels = directions.map(d => d.label);
    if (labels.length === 1) return `Direction: ${labels[0]}`;
    if (labels.length === 2) return `Directions: ${labels[0]} or ${labels[1]}`;
    return `Directions: ${labels[0]}, ${labels[1]}, or ${labels[2]}`;
  }

  return { build };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SummaryBuilder;
}