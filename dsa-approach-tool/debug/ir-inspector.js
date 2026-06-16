// debug/ir-inspector.js
// Live panel that renders the current IR state as a structured tree.
// Mounts into any container element. Call refresh(ir) to update.

const IRInspector = (() => {

  function mount(containerEl) {
    if (!containerEl) return null;

    containerEl.innerHTML = '';
    containerEl.style.cssText = 'font-family:monospace;font-size:12px;background:#0d1117;color:#c9d1d9;padding:12px;border-radius:6px;overflow:auto;max-height:600px;';

    const header = document.createElement('div');
    header.style.cssText = 'color:#58a6ff;font-weight:bold;margin-bottom:8px;border-bottom:1px solid #30363d;padding-bottom:4px;';
    header.textContent = 'IR Inspector';
    containerEl.appendChild(header);

    const content = document.createElement('div');
    content.id = 'ir-inspector-content';
    containerEl.appendChild(content);

    return {
      refresh(ir) { _render(content, ir); },
    };
  }

  function _render(el, ir) {
    if (!ir) { el.textContent = '(no IR)'; return; }
    el.innerHTML = '';

    _section(el, 'Signals', ir.signals ?? [], _renderSignal);
    _section(el, 'Candidate States', ir.candidate_states ?? [], _renderCandidateState);
    _section(el, 'Active Invariants', ir.active_invariants ?? [], _renderInvariant);
    _section(el, 'Active Transitions', ir.active_transitions ?? [], _renderTransition);
    _section(el, 'Hypotheses', ir.hypotheses ?? [], _renderHypothesis);
    _section(el, 'Misconception Risk', ir.misconception_risk ?? [], _renderMisconception);
    _section(el, 'Contradictions', ir.contradictions ?? [], _renderContradiction);
    _complexityGate(el, ir.complexity_gate);
    _confidenceReport(el, ir.confidence);
  }

  function _section(parent, label, items, renderFn) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'margin-bottom:10px;';

    const title = document.createElement('div');
    title.style.cssText = 'color:#e3b341;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;';
    title.textContent = `${label} (${items.length})`;
    wrap.appendChild(title);

    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'color:#484f58;padding-left:8px;';
      empty.textContent = '(empty)';
      wrap.appendChild(empty);
    } else {
      for (const item of items) {
        wrap.appendChild(renderFn(item));
      }
    }

    parent.appendChild(wrap);
  }

  function _row(label, value, valueColor) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;padding-left:8px;margin:1px 0;';
    const lbl = document.createElement('span');
    lbl.style.cssText = 'color:#8b949e;min-width:130px;flex-shrink:0;';
    lbl.textContent = label + ':';
    const val = document.createElement('span');
    val.style.color = valueColor ?? '#c9d1d9';
    val.textContent = String(value ?? '—');
    row.appendChild(lbl);
    row.appendChild(val);
    return row;
  }

  function _card(items) {
    const card = document.createElement('div');
    card.style.cssText = 'background:#161b22;border:1px solid #30363d;border-radius:4px;padding:6px 8px;margin:3px 0;';
    for (const [label, value, color] of items) {
      card.appendChild(_row(label, value, color));
    }
    return card;
  }

  function _renderSignal(s) {
    return _card([
      ['id',           s.id,           '#79c0ff'],
      ['strength',     s.strength?.toFixed(2), '#3fb950'],
      ['source_stage', s.source_stage, '#e3b341'],
      ['basis',        s.basis,        '#c9d1d9'],
    ]);
  }

  function _renderCandidateState(cs) {
    const statusColor = cs.status === 'candidate' ? '#3fb950' : cs.status === 'eliminated' ? '#f85149' : '#8b949e';
    return _card([
      ['archetype_id',  cs.archetype_id,                     '#79c0ff'],
      ['weight',        cs.aggregate_weight?.toFixed(3),     '#3fb950'],
      ['status',        cs.status,                           statusColor],
      ['contributing',  (cs.contributing_signals ?? []).join(', ') || '—', '#c9d1d9'],
      ['eliminating',   (cs.eliminating_signals ?? []).join(', ') || '—', '#f85149'],
    ]);
  }

  function _renderInvariant(inv) {
    const verifiedColor = inv.verified ? '#3fb950' : '#8b949e';
    return _card([
      ['invariant_id', inv.invariant_id,              '#79c0ff'],
      ['confidence',   inv.confidence?.toFixed(2),    '#3fb950'],
      ['verified',     String(inv.verified),          verifiedColor],
      ['basis',        inv.basis,                     '#c9d1d9'],
    ]);
  }

  function _renderTransition(tr) {
    return _card([
      ['transition_id', tr.transition_id,          '#79c0ff'],
      ['confidence',    tr.confidence?.toFixed(2), '#3fb950'],
      ['state_source',  tr.state_source,           '#e3b341'],
    ]);
  }

  function _renderHypothesis(h) {
    return _card([
      ['id',          h.id,                                '#79c0ff'],
      ['type',        h.type,                              '#e3b341'],
      ['target',      h.target_id,                        '#c9d1d9'],
      ['confidence',  h.confidence?.toFixed(2),           '#3fb950'],
      ['unverified',  (h.unverified ?? []).join(', ') || 'none', '#f85149'],
    ]);
  }

  function _renderMisconception(mc) {
    const levelColor = {watch:'#e3b341', likely:'#f0883e', confirmed:'#f85149', resolved:'#3fb950'}[mc.risk_level] ?? '#c9d1d9';
    return _card([
      ['misconception_id', mc.misconception_id,             '#79c0ff'],
      ['risk_level',       mc.risk_level,                  levelColor],
      ['resolved',         String(mc.resolved ?? false),   mc.resolved ? '#3fb950' : '#8b949e'],
      ['basis',            mc.trigger_basis,               '#c9d1d9'],
    ]);
  }

  function _renderContradiction(c) {
    const resolvedColor = c.resolution ? '#3fb950' : '#f85149';
    return _card([
      ['node_a',     c.node_a,                          '#f85149'],
      ['edge_type',  c.edge_type,                       '#e3b341'],
      ['node_b',     c.node_b,                          '#f85149'],
      ['resolution', c.resolution ?? 'UNRESOLVED',     resolvedColor],
    ]);
  }

  function _complexityGate(parent, gate) {
    if (!gate) return;
    const wrap = document.createElement('div');
    wrap.style.marginBottom = '10px';
    const title = document.createElement('div');
    title.style.cssText = 'color:#e3b341;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;';
    title.textContent = 'Complexity Gate';
    wrap.appendChild(title);
    wrap.appendChild(_card([
      ['max_n',               String(gate.max_n ?? '—'),                        '#c9d1d9'],
      ['ops_budget',          String(gate.ops_budget ?? '—'),                   '#c9d1d9'],
      ['feasible_classes',    (gate.feasible_classes ?? []).join(', ') || '—',  '#3fb950'],
      ['eliminated_classes',  (gate.eliminated_classes ?? []).join(', ') || '—','#f85149'],
      ['eliminated_archs',    (gate.eliminated_archetypes ?? []).join(', ') || '—','#f85149'],
    ]));
    parent.appendChild(wrap);
  }

  function _confidenceReport(parent, conf) {
    if (!conf) return;
    const wrap = document.createElement('div');
    wrap.style.marginBottom = '10px';
    const title = document.createElement('div');
    title.style.cssText = 'color:#e3b341;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;';
    title.textContent = 'Confidence Report';
    wrap.appendChild(title);
    const bandColor = {high:'#3fb950', medium:'#e3b341', low:'#f85149'}[conf.band] ?? '#c9d1d9';
    const gateColor = {proceed:'#3fb950', verify:'#e3b341', backtrack:'#f85149'}[conf.gate_action] ?? '#c9d1d9';
    wrap.appendChild(_card([
      ['score',       String(conf.score ?? 0) + '/100',  bandColor],
      ['band',        conf.band,                         bandColor],
      ['gate_action', conf.gate_action,                  gateColor],
      ['label',       conf.label,                        '#c9d1d9'],
      ['earned',      (conf.earned ?? []).map(e => `${e.key}:+${e.points}`).join(' | ') || '—', '#3fb950'],
      ['deducted',    (conf.deducted ?? []).map(d => `${d.key}:${d.points}`).join(' | ') || '—','#f85149'],
    ]));
    parent.appendChild(wrap);
  }

  return { mount };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = IRInspector;
