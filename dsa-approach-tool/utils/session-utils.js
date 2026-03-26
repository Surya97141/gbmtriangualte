// utils/session-utils.js
// Save/load session to localStorage, export session as JSON, session history
// Used by: core/state.js, core/engine.js, recovery/recovery.js

const SessionUtils = {

  // ─── CONSTANTS ─────────────────────────────────────────────────────────────

  STORAGE_KEY       : 'dsa_tool_session',
  HISTORY_KEY       : 'dsa_tool_history',
  MAX_HISTORY       : 20,
  VERSION           : '1.0.0',

  // ─── SAVE / LOAD ───────────────────────────────────────────────────────────

  // Save full session state to localStorage
  save(sessionState) {
    try {
      const payload = {
        version  : this.VERSION,
        savedAt  : Date.now(),
        session  : sessionState,
      };
      localStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify(payload)
      );
      return true;
    } catch (e) {
      console.warn('SessionUtils.save failed:', e.message);
      return false;
    }
  },

  // Load session state from localStorage
  // Returns null if nothing saved or version mismatch
  load() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return null;

      const payload = JSON.parse(raw);

      // Version check — if major version differs, discard
      if (!this._versionsCompatible(payload.version, this.VERSION)) {
        console.info('SessionUtils: version mismatch, discarding saved session');
        this.clear();
        return null;
      }

      return payload.session ?? null;
    } catch (e) {
      console.warn('SessionUtils.load failed:', e.message);
      return null;
    }
  },

  // Check if a saved session exists
  hasSaved() {
    try {
      return localStorage.getItem(this.STORAGE_KEY) !== null;
    } catch {
      return false;
    }
  },

  // Clear current session from storage
  clear() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (e) {
      console.warn('SessionUtils.clear failed:', e.message);
    }
  },

  // Get metadata about saved session without loading full state
  // Returns { savedAt, version, stageReached } or null
  getSavedMeta() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return null;
      const payload = JSON.parse(raw);
      return {
        savedAt     : payload.savedAt,
        version     : payload.version,
        stageReached: payload.session?.currentStage ?? 0,
        n           : payload.session?.answers?.stage0?.n ?? null,
      };
    } catch {
      return null;
    }
  },

  // ─── HISTORY ───────────────────────────────────────────────────────────────

  // Push completed session to history log
  // Called when user finishes Stage 7 or exports results
  pushToHistory(sessionState) {
    try {
      const history = this.loadHistory();

      const entry = {
        id          : this._generateId(),
        savedAt     : Date.now(),
        version     : this.VERSION,
        n           : sessionState.answers?.stage0?.n ?? null,
        q           : sessionState.answers?.stage0?.q ?? null,
        inputType   : sessionState.answers?.stage1?.inputTypes ?? [],
        outputType  : sessionState.answers?.stage2?.outputType ?? null,
        directions  : sessionState.output?.directions?.map(d => d.id) ?? [],
        confidence  : sessionState.confidence?.level ?? null,
        stagesVisited: sessionState.stagesVisited ?? [],
        recoveryUsed: sessionState.recoveryMode ?? false,
      };

      history.unshift(entry);

      // Keep only last MAX_HISTORY entries
      const trimmed = history.slice(0, this.MAX_HISTORY);

      localStorage.setItem(this.HISTORY_KEY, JSON.stringify(trimmed));
      return entry.id;
    } catch (e) {
      console.warn('SessionUtils.pushToHistory failed:', e.message);
      return null;
    }
  },

  // Load history array
  loadHistory() {
    try {
      const raw = localStorage.getItem(this.HISTORY_KEY);
      if (!raw) return [];
      return JSON.parse(raw) ?? [];
    } catch {
      return [];
    }
  },

  // Clear all history
  clearHistory() {
    try {
      localStorage.removeItem(this.HISTORY_KEY);
    } catch (e) {
      console.warn('SessionUtils.clearHistory failed:', e.message);
    }
  },

  // Get single history entry by id
  getHistoryEntry(id) {
    return this.loadHistory().find(e => e.id === id) ?? null;
  },

  // ─── EXPORT ────────────────────────────────────────────────────────────────

  // Export current session as formatted JSON string
  exportJSON(sessionState) {
    const payload = {
      exportedAt : new Date().toISOString(),
      version    : this.VERSION,
      session    : sessionState,
    };
    return JSON.stringify(payload, null, 2);
  },

  // Trigger browser download of session as .json file
  downloadSession(sessionState, filename = null) {
    try {
      const json = this.exportJSON(sessionState);
      const blob = new Blob([json], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const ts   = new Date().toISOString().slice(0, 10);
      const name = filename ?? `dsa-session-${ts}.json`;

      const anchor    = document.createElement('a');
      anchor.href     = url;
      anchor.download = name;
      anchor.click();

      URL.revokeObjectURL(url);
      return true;
    } catch (e) {
      console.warn('SessionUtils.downloadSession failed:', e.message);
      return false;
    }
  },

  // Import session from JSON string
  // Returns parsed session or null if invalid
  importJSON(jsonString) {
    try {
      const payload = JSON.parse(jsonString);
      if (!payload.session) return null;
      if (!this._versionsCompatible(payload.version, this.VERSION)) {
        console.warn('SessionUtils.importJSON: version mismatch');
        return null;
      }
      return payload.session;
    } catch (e) {
      console.warn('SessionUtils.importJSON failed:', e.message);
      return null;
    }
  },

  // ─── STAGE HISTORY (BACK-NAVIGATION) ───────────────────────────────────────

  // Stage visit stack — allows back-navigation without full restart
  // Stored inside session state not localStorage directly

  // Push a stage onto the visit stack
  pushStage(sessionState, stageId) {
    if (!sessionState.stageStack) sessionState.stageStack = [];
    // Avoid duplicate consecutive pushes
    const stack = sessionState.stageStack;
    if (stack.length > 0 && stack[stack.length - 1] === stageId) return;
    stack.push(stageId);
  },

  // Pop last stage — returns previous stage id or null
  popStage(sessionState) {
    if (!sessionState.stageStack || sessionState.stageStack.length <= 1) {
      return null;
    }
    sessionState.stageStack.pop();
    return sessionState.stageStack[sessionState.stageStack.length - 1];
  },

  // Peek at previous stage without popping
  peekPrevStage(sessionState) {
    const stack = sessionState.stageStack ?? [];
    if (stack.length < 2) return null;
    return stack[stack.length - 2];
  },

  // Get full stage visit path
  getStagePath(sessionState) {
    return [...(sessionState.stageStack ?? [])];
  },

  // Clear stage stack — used when starting fresh
  clearStageStack(sessionState) {
    sessionState.stageStack = [];
  },

  // ─── ANSWERS HELPERS ───────────────────────────────────────────────────────

  // Save answer for a specific stage
  saveAnswer(sessionState, stageId, answerObj) {
    if (!sessionState.answers) sessionState.answers = {};
    sessionState.answers[stageId] = {
      ...sessionState.answers[stageId],
      ...answerObj,
      answeredAt: Date.now(),
    };
  },

  // Get answer for a specific stage
  getAnswer(sessionState, stageId) {
    return sessionState.answers?.[stageId] ?? null;
  },

  // Check if stage has been answered
  hasAnswer(sessionState, stageId) {
    return !!sessionState.answers?.[stageId];
  },

  // Clear answer for a specific stage — used when going back
  clearAnswer(sessionState, stageId) {
    if (sessionState.answers) {
      delete sessionState.answers[stageId];
    }
  },

  // Clear all answers from a stage onward — used when backtracking
  clearAnswersFrom(sessionState, stageId) {
    const stageOrder = [
      'stage0', 'stage1', 'stage2', 'stage2_5',
      'stage3', 'stage3_5', 'stage4', 'stage4_5',
      'stage5', 'stage6', 'stage6_5', 'stage7',
    ];
    const fromIdx = stageOrder.indexOf(stageId);
    if (fromIdx === -1) return;
    stageOrder.slice(fromIdx).forEach(id => this.clearAnswer(sessionState, id));
  },

  // ─── SESSION SUMMARY ───────────────────────────────────────────────────────

  // Build a compact summary of what the session has captured so far
  // Used by Stage 7 summary-builder and confidence scorer
  buildSummary(sessionState) {
    const a = sessionState.answers ?? {};

    return {
      // Stage 0
      n              : a.stage0?.n           ?? null,
      q              : a.stage0?.q           ?? null,
      timeLimit      : a.stage0?.timeLimit   ?? 1,
      memLimit       : a.stage0?.memLimit    ?? 256,
      eliminatedComplexities: a.stage0?.eliminated ?? [],

      // Stage 1
      inputTypes     : a.stage1?.inputTypes  ?? [],
      secondarySignals: a.stage1?.secondarySignals ?? [],
      queryType      : a.stage1?.queryType   ?? null,

      // Stage 2
      outputForm     : a.stage2?.outputForm  ?? null,
      optimizationType: a.stage2?.optimizationType ?? null,
      solutionDepth  : a.stage2?.solutionDepth ?? null,

      // Stage 2.5
      isDecomposed   : a.stage2_5?.isDecomposed ?? false,
      subproblems    : a.stage2_5?.subproblems ?? [],

      // Stage 3 properties
      properties     : a.stage3?.properties  ?? {},

      // Stage 3.5
      transformationApplied: a.stage3_5?.applied ?? null,

      // Stage 4
      constraintInteractions: a.stage4?.interactions ?? [],
      hiddenStructure: a.stage4?.hiddenStructure ?? null,

      // Stage 5
      verificationsPassed: a.stage5?.passed ?? [],
      verificationsFailed: a.stage5?.failed ?? [],

      // Stage 6
      edgeCases      : a.stage6?.cases ?? [],

      // Stage 6.5
      confidence     : a.stage6_5?.score ?? null,
      confidenceLevel: a.stage6_5?.level ?? null,

      // Stage 7
      directions     : a.stage7?.directions ?? [],
    };
  },

  // ─── RECOVERY MODE ─────────────────────────────────────────────────────────

  // Mark session as entering recovery mode
  enterRecovery(sessionState, failureType, failureDetail) {
    sessionState.recoveryMode    = true;
    sessionState.recoveryEntry   = {
      failureType  : failureType,   // 'wa' | 'tle' | 'logic' | 'reframe'
      failureDetail: failureDetail,
      enteredAt    : Date.now(),
    };
  },

  // Exit recovery mode
  exitRecovery(sessionState) {
    sessionState.recoveryMode  = false;
    sessionState.recoveryEntry = null;
  },

  isInRecovery(sessionState) {
    return sessionState.recoveryMode === true;
  },

  // ─── PRIVATE HELPERS ───────────────────────────────────────────────────────

  _generateId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  },

  // Check if two version strings are compatible (same major version)
  _versionsCompatible(v1, v2) {
    if (!v1 || !v2) return false;
    const major1 = v1.split('.')[0];
    const major2 = v2.split('.')[0];
    return major1 === major2;
  },
};

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SessionUtils;
}