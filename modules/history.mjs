// BridgeSketch 3D · Undo / redo history, dirty tracking and local autosave (0.6.1).
// Snapshots are JSON strings of the validated configuration without the clock (time of day and time flow
// change while the scene runs and are not edits). Up to 100 steps; edits of the same field within 800 ms
// count as one step.

const AUTOSAVE_KEY = 'bridgesketch-autosave-v1';
const store = fn => {
  try {
    return fn(window.localStorage);
  } catch {
    return null;
  }
};

export const snapshotKey = c => {
  const { timeOfDay, timeFlow, ...rest } = c;
  return JSON.stringify(rest);
};

// read(): current configuration object · apply(config): Promise that rebuilds the model without recording
// history · onState({ dirty, canUndo, canRedo }) · extra(): additional data stored with the autosave.
export function createHistory({ read, apply, onState, extra, onDecline, version = '', limit = 100 }) {
  const h = { undo: [], redo: [], last: null, saved: null, at: 0, key: null, applying: false };
  let timer = 0,
    armed = false,
    pending = null,
    busy = Promise.resolve();
  const isDirty = () => h.last !== null && h.last !== h.saved;
  const emit = () => onState?.({ dirty: isDirty(), canUndo: h.undo.length > 0, canRedo: h.redo.length > 0 });

  function autosave() {
    if (!armed) return;
    clearTimeout(timer);
    timer = setTimeout(
      () =>
        store(ls => {
          if (!isDirty()) {
            ls.removeItem(AUTOSAVE_KEY);
            return;
          }
          ls.setItem(
            AUTOSAVE_KEY,
            JSON.stringify({ version, at: new Date().toISOString(), saved: h.saved, config: read(), ...extra?.() }),
          );
        }),
      400,
    );
  }
  // Editing on while the restore offer is pending declines it.
  function declineOffer() {
    if (!pending) return;
    pending = null;
    armed = true;
    onDecline?.();
  }

  // Record the current configuration after a successful update. key: coalescing key of a typed field;
  // baseline: the new state is a clean starting point (concept, file, link) that stays undoable.
  function track({ key = null, baseline = false } = {}) {
    if (h.applying) return;
    const now = snapshotKey(read());
    if (h.last === null) {
      h.last = h.saved = now;
      emit();
      return;
    }
    if (now === h.last) {
      if (baseline) h.saved = now;
      emit();
      autosave();
      return;
    }
    const t = Date.now();
    if (!(key && key === h.key && h.undo.length && t - h.at < 800)) {
      h.undo.push(h.last);
      if (h.undo.length > limit) h.undo.shift();
    }
    h.redo.length = 0;
    h.last = now;
    h.at = t;
    h.key = key;
    if (baseline) h.saved = now;
    declineOffer();
    emit();
    autosave();
  }

  function go(dir) {
    // Queue so that quick repeated shortcuts apply one after the other.
    const run = async () => {
      const from = dir < 0 ? h.undo : h.redo,
        to = dir < 0 ? h.redo : h.undo;
      if (!from.length) return false;
      const target = from.pop();
      to.push(h.last);
      h.applying = true;
      try {
        await apply(JSON.parse(target));
        h.last = snapshotKey(read());
        h.key = null;
      } catch (error) {
        from.push(target);
        to.pop();
        throw error;
      } finally {
        h.applying = false;
      }
      emit();
      autosave();
      return true;
    };
    const result = busy.then(run, run);
    busy = result.catch(() => {});
    return result;
  }

  return {
    track,
    undo: () => go(-1),
    redo: () => go(1),
    isDirty,
    markSaved() {
      h.saved = h.last;
      emit();
      autosave();
    },
    // Autosave: look for an unsaved session from last time (null when there is none worth restoring).
    peek() {
      const entry = store(ls => JSON.parse(ls.getItem(AUTOSAVE_KEY) ?? 'null'));
      if (!entry || typeof entry !== 'object' || !entry.config || typeof entry.config !== 'object') return null;
      if (typeof entry.saved !== 'string' || snapshotKey(entry.config) === h.last) {
        store(ls => ls.removeItem(AUTOSAVE_KEY));
        return null;
      }
      pending = entry;
      return entry;
    },
    // The restored model is now on screen: it stays modified relative to what was last saved.
    accept(entry) {
      pending = null;
      armed = true;
      h.undo.length = h.redo.length = 0;
      h.last = snapshotKey(read());
      h.saved = entry.saved;
      h.key = null;
      emit();
      autosave();
    },
    dismiss() {
      pending = null;
      armed = true;
      store(ls => ls.removeItem(AUTOSAVE_KEY));
      autosave();
    },
    arm() {
      armed = true;
      autosave();
    },
  };
}
