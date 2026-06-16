// debug/event-trace-panel.js
// Subscribes to the EventBus and renders a live chronological event log.
// Timestamps are relative to panel mount time. Each event is color-coded by type.

const EventTracePanel = (() => {

  const EVENT_COLORS = {
    'stage:complete':         '#79c0ff',
    'ir:signals_updated':     '#3fb950',
    'ir:states_updated':      '#3fb950',
    'ir:invariants_updated':  '#3fb950',
    'ir:hypotheses_updated':  '#3fb950',
    'ir:confidence_updated':  '#e3b341',
    'ir:contradiction':       '#f85149',
    'recovery:activate':      '#f0883e',
    'recovery:exit':          '#d2a8ff',
    'misconception:escalate': '#f85149',
    'engine:run':             '#484f58',
    'engine:skip':            '#484f58',
  };

  const MAX_EVENTS = 120;

  function mount(containerEl, eventBus) {
    if (!containerEl) return null;

    containerEl.innerHTML = '';
    containerEl.style.cssText = 'font-family:monospace;font-size:11px;background:#0d1117;color:#c9d1d9;padding:12px;border-radius:6px;overflow:auto;max-height:400px;';

    const header = document.createElement('div');
    header.style.cssText = 'color:#58a6ff;font-weight:bold;margin-bottom:8px;border-bottom:1px solid #30363d;padding-bottom:4px;display:flex;justify-content:space-between;align-items:center;';
    const title = document.createElement('span');
    title.textContent = 'Event Trace';
    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Clear';
    clearBtn.style.cssText = 'font-size:10px;background:#21262d;color:#c9d1d9;border:1px solid #30363d;border-radius:3px;padding:2px 6px;cursor:pointer;';
    clearBtn.onclick = () => { logEl.innerHTML = ''; _events.length = 0; };
    header.appendChild(title);
    header.appendChild(clearBtn);
    containerEl.appendChild(header);

    const logEl = document.createElement('div');
    logEl.id = 'event-trace-log';
    containerEl.appendChild(logEl);

    const _events  = [];
    const _startTs = performance.now();

    function _log(eventName, detail) {
      const elapsed = ((performance.now() - _startTs) / 1000).toFixed(3);
      const color   = EVENT_COLORS[eventName] ?? '#8b949e';

      const entry = document.createElement('div');
      entry.style.cssText = 'padding:2px 0;border-bottom:1px solid #161b22;display:flex;gap:8px;align-items:flex-start;';

      const ts = document.createElement('span');
      ts.style.cssText = 'color:#484f58;min-width:52px;flex-shrink:0;';
      ts.textContent = `+${elapsed}s`;

      const name = document.createElement('span');
      name.style.cssText = `color:${color};min-width:210px;flex-shrink:0;font-weight:bold;`;
      name.textContent = eventName;

      const detailEl = document.createElement('span');
      detailEl.style.cssText = 'color:#8b949e;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      detailEl.textContent = detail ? _summarise(detail) : '';

      entry.appendChild(ts);
      entry.appendChild(name);
      entry.appendChild(detailEl);
      logEl.appendChild(entry);

      _events.push({ elapsed, eventName, detail });
      if (_events.length > MAX_EVENTS) {
        _events.shift();
        logEl.removeChild(logEl.firstChild);
      }

      // Auto-scroll to bottom
      containerEl.scrollTop = containerEl.scrollHeight;
    }

    function _summarise(detail) {
      if (!detail) return '';
      if (typeof detail === 'string') return detail;
      const keys = Object.keys(detail);
      return keys.slice(0, 4).map(k => {
        const v = detail[k];
        if (Array.isArray(v)) return `${k}:[${v.length}]`;
        if (typeof v === 'object' && v !== null) return `${k}:{...}`;
        return `${k}:${v}`;
      }).join(' ');
    }

    // Subscribe to all known events
    if (eventBus && typeof eventBus.on === 'function') {
      for (const eventName of Object.keys(EVENT_COLORS)) {
        eventBus.on(eventName, (detail) => _log(eventName, detail), 0);
      }
    }

    // Allow manual injection of a trace entry (for demo inline events)
    function trace(eventName, detail) {
      _log(eventName, detail);
    }

    return { trace, events: _events };
  }

  return { mount };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = EventTracePanel;
