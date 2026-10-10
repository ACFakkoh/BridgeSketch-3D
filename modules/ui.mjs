// BridgeSketch 3D · UI helpers (0.6.1): formula-capable numeric fields, File menu, shortcuts, restore strip.
// Ported from the QuickerBridge overhaul. Plain DOM, no dependencies, no eval.

const $ = id => document.getElementById(id);

/* ------------------------------------------------------------------ */
/* Safe arithmetic parser                                              */
/* ------------------------------------------------------------------ */

// Accepts: + - * / ^ ( ), × ÷ x · as operators, ** as power, pi / π, exponent notation (1.2e3), an optional
// leading "=", spaces and apostrophes as thousands separators, and a comma as the decimal separator.
// Returns null (empty), NaN (invalid) or the number. Never uses eval or Function.
export function qbParse(raw) {
  let s = String(raw ?? '').trim();
  if (s.startsWith('=')) s = s.slice(1);
  s = s.replace(/[\s  ']/g, '');
  if (!s) return null;
  s = s
    .replace(/[−–]/g, '-')
    .replace(/[×x·]/gi, '*')
    .replace(/÷/g, '/')
    .replace(/\*\*/g, '^');
  // A comma is a decimal separator; when a dot is also present, commas are thousands separators.
  s = s.includes('.') ? s.replace(/,/g, '') : s.replace(/,/g, '.');
  let i = 0;
  const peek = () => s[i];
  const num = () => {
    const m = /^(\d+\.?\d*|\.\d+)(e[-+]?\d+)?/i.exec(s.slice(i));
    if (!m) throw 0;
    i += m[0].length;
    return parseFloat(m[0]);
  };
  const primary = () => {
    if (peek() === '(') {
      i++;
      const v = expr();
      if (peek() !== ')') throw 0;
      i++;
      return v;
    }
    if (/^pi/i.test(s.slice(i))) {
      i += 2;
      return Math.PI;
    }
    if (peek() === 'π') {
      i++;
      return Math.PI;
    }
    return num();
  };
  const unary = () => (peek() === '-' ? (i++, -unary()) : peek() === '+' ? (i++, unary()) : power());
  const power = () => {
    const b = primary();
    if (peek() === '^') {
      i++;
      return Math.pow(b, unary());
    }
    return b;
  };
  const term = () => {
    let v = unary();
    while (peek() === '*' || peek() === '/') {
      const op = s[i++],
        r = unary();
      v = op === '*' ? v * r : v / r;
    }
    return v;
  };
  const expr = () => {
    let v = term();
    while (peek() === '+' || peek() === '-') {
      const op = s[i++],
        r = term();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  };
  try {
    const v = expr();
    return i === s.length && Number.isFinite(v) ? v : NaN;
  } catch {
    return NaN;
  }
}

// True when the text is a calculation rather than a plain number (used for the "accepted" flash).
export const isExpression = raw =>
  /[0-9.,)]\s*[+\-*/×÷^(]|^\s*[=(]|π|pi/i.test(String(raw).replace(/[eE][-+]/g, ''));

// Plain, locale-free text so that Number(el.value) keeps working everywhere.
export const fmtNum = v => {
  const n = Number(v);
  return Number.isFinite(n) ? String(+n.toPrecision(12)) : '';
};

/* ------------------------------------------------------------------ */
/* Numeric fields                                                      */
/* ------------------------------------------------------------------ */

export const isNum = el => !!el && el.dataset?.num !== undefined;

const bound = (el, name) => {
  const v = el.getAttribute(name);
  return v === null || v === '' || Number.isNaN(Number(v)) ? null : Number(v);
};
const decimals = x => {
  const s = String(+x),
    e = /e-(\d+)$/.exec(s);
  if (e) return Number(e[1]);
  return (s.split('.')[1] ?? '').length;
};

// Current numeric value of a field: NaN when the text is empty or invalid.
export function numValue(el) {
  const v = qbParse(el.value);
  return v === null ? NaN : v;
}

// HTML for a generated numeric field (span lengths, crossing rows).
export function numInput({ span, key, min, max, step, value }) {
  const v = fmtNum(value);
  return `<input type="text" inputmode="decimal" autocomplete="off" spellcheck="false" data-num data-span="${span}" data-key="${key}" data-committed="${v}" min="${min}" max="${max}" step="${step}" value="${v}">`;
}

let tip = null;
function showTip(el) {
  const show = el && el === document.activeElement && el.classList.contains('num-err') && el.dataset.err;
  if (!show) {
    if (el) el.removeAttribute('aria-describedby');
    if (tip && (!el || el === document.activeElement)) tip.hidden = true;
    return;
  }
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'qb-num-tip';
    tip.setAttribute('role', 'alert');
    document.body.append(tip);
  }
  tip.textContent = el.dataset.err;
  tip.hidden = false;
  el.setAttribute('aria-describedby', 'qb-num-tip');
  const r = el.getBoundingClientRect(),
    w = Math.min(300, innerWidth - 16);
  tip.style.maxWidth = `${w}px`;
  tip.style.left = `${Math.max(8, Math.min(r.left, innerWidth - w - 8))}px`;
  tip.style.top = `${r.bottom + 5}px`;
}

// Validates a field and paints its state. Returns the number, or NaN when invalid.
export function checkNum(el) {
  const v = qbParse(el.value),
    min = bound(el, 'min'),
    max = bound(el, 'max');
  let message = '';
  // A disabled field is never painted as an error.
  if (!el.disabled) {
    if (v === null || Number.isNaN(v)) message = 'Invalid number or formula';
    else if ((min !== null && v < min) || (max !== null && v > max))
      message = `Allowed range: ${min ?? '−∞'} to ${max ?? '∞'}`;
  }
  el.dataset.err = message;
  el.classList.toggle('num-err', !!message);
  el.setAttribute('aria-invalid', String(!!message));
  el.title = message;
  showTip(el);
  return message ? NaN : v;
}

// Programmatic write (config → form): resets the error state and remembers the committed text.
export function setNum(el, value) {
  const s = fmtNum(value);
  el.value = s;
  el.dataset.committed = s;
  el.dataset.err = '';
  el.classList.remove('num-err');
  el.removeAttribute('aria-invalid');
  el.title = '';
}

// Wires every numeric field of a form (also the ones generated later): live validation, formula evaluation on
// Enter / blur, error tooltip, Up / Down arrows stepping by the field's step (Shift = ×10).
export function setupNumericInputs(form, { onInvalid } = {}) {
  form.addEventListener('input', e => {
    if (isNum(e.target)) checkNum(e.target);
  });
  form.addEventListener('focusin', e => {
    if (!isNum(e.target)) return;
    const el = e.target;
    setTimeout(() => el === document.activeElement && el.select?.(), 0);
    showTip(el);
  });
  form.addEventListener('focusout', e => {
    if (isNum(e.target) && tip) tip.hidden = true;
  });
  // Capture phase, before the application's own listener: evaluate the text, show the result, and only let
  // the change through when it is a valid number inside the allowed range.
  form.addEventListener(
    'change',
    e => {
      const el = e.target;
      if (!isNum(el)) return;
      const raw = el.value.trim(),
        v = checkNum(el);
      if (v === null || Number.isNaN(v)) {
        e.stopImmediatePropagation();
        onInvalid?.(el, el.dataset.err);
        return;
      }
      const shown = fmtNum(v);
      if (el.value !== shown) {
        el.value = shown;
        if (isExpression(raw)) {
          el.classList.remove('num-flash');
          void el.offsetWidth;
          el.classList.add('num-flash');
          el.title = `${raw.replace(/^=/, '')} = ${shown}`;
        }
      }
      el.dataset.committed = shown;
    },
    true,
  );
  form.addEventListener('keydown', e => {
    const el = e.target;
    if (!isNum(el)) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      el.blur();
      return;
    }
    if ((e.key !== 'ArrowUp' && e.key !== 'ArrowDown') || el.disabled || el.readOnly || e.ctrlKey || e.metaKey || e.altKey)
      return;
    const cur = qbParse(el.value);
    if (cur === null || Number.isNaN(cur)) return;
    e.preventDefault();
    const stepAttr = Number(el.getAttribute('step')),
      step = stepAttr > 0 ? stepAttr : 1,
      sign = e.key === 'ArrowUp' ? 1 : -1;
    let next = Number((cur + sign * step * (e.shiftKey ? 10 : 1)).toFixed(Math.min(10, Math.max(decimals(step), decimals(cur)))));
    const min = bound(el, 'min'),
      max = bound(el, 'max');
    if (max !== null) next = Math.min(next, max);
    if (min !== null) next = Math.max(next, min);
    if (next === cur && fmtNum(cur) === el.value) return;
    el.value = fmtNum(next);
    el.select?.();
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  addEventListener(
    'scroll',
    () => {
      const a = document.activeElement;
      if (isNum(a)) showTip(a);
    },
    true,
  );
}

/* ------------------------------------------------------------------ */
/* File menu                                                           */
/* ------------------------------------------------------------------ */

const setMenu = (menu, open) => {
  menu.classList.toggle('open', open);
  menu.querySelector('.menu-button')?.setAttribute('aria-expanded', String(open));
};
// Closes every open menu; returns whether one was open.
export function closeMenus(refocus = false) {
  let any = false;
  for (const m of document.querySelectorAll('.qb-menu.open')) {
    setMenu(m, false);
    any = true;
    if (refocus) m.querySelector('.menu-button')?.focus();
  }
  return any;
}
const items = menu => [...menu.querySelectorAll('[role="menuitem"]:not(:disabled)')];

export function setupMenus() {
  document.addEventListener('click', e => {
    const menu = e.target.closest?.('.qb-menu');
    for (const m of document.querySelectorAll('.qb-menu.open')) if (m !== menu) setMenu(m, false);
    if (!menu) return;
    if (e.target.closest('.menu-button')) setMenu(menu, !menu.classList.contains('open'));
    else if (e.target.closest('.menu-pop button')) setMenu(menu, false);
  });
  document.addEventListener('keydown', e => {
    const menu = e.target.closest?.('.qb-menu');
    if (!menu) return;
    const list = items(menu),
      onButton = e.target.classList.contains('menu-button'),
      at = list.indexOf(document.activeElement);
    if (e.key === 'Tab') {
      setMenu(menu, false);
      return;
    }
    if (onButton && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      setMenu(menu, true);
      (e.key === 'ArrowDown' ? list[0] : list.at(-1))?.focus();
    } else if (!onButton && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key) && list.length) {
      e.preventDefault();
      const next =
        e.key === 'Home' ? 0 : e.key === 'End' ? list.length - 1 : (at + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length;
      list[next].focus();
    }
  });
}

/* ------------------------------------------------------------------ */
/* Shortcuts                                                           */
/* ------------------------------------------------------------------ */

// True when the browser's own text undo should win: a text-like field with text still being edited.
function editingText(a) {
  if (!a) return false;
  if (a.tagName === 'TEXTAREA') return true;
  if (a.tagName !== 'INPUT' || ['checkbox', 'radio', 'range', 'button', 'file', 'color'].includes(a.type)) return false;
  // A numeric field whose text is already committed does not own the undo any more.
  if (isNum(a)) return a.value !== (a.dataset.committed ?? a.value) || a.classList.contains('num-err');
  return true;
}

// Ctrl/Cmd+S save, Ctrl/Cmd+O open, Ctrl/Cmd+Z undo, Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z redo, Esc closes menus.
export function setupShortcuts({ save, open, undo, redo, ready }) {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && closeMenus(true)) return;
    if (!(e.ctrlKey || e.metaKey) || e.altKey || !ready()) return;
    if (document.querySelector('dialog[open]')) return;
    const k = e.key.toLowerCase();
    if ((k === 's' || k === 'o') && !e.shiftKey) {
      e.preventDefault();
      closeMenus();
      (k === 's' ? save : open)();
      return;
    }
    if (k !== 'z' && k !== 'y') return;
    if (editingText(document.activeElement)) return;
    e.preventDefault();
    closeMenus();
    (k === 'y' || e.shiftKey ? redo : undo)();
  });
}

/* ------------------------------------------------------------------ */
/* Dirty indicator and restore strip                                   */
/* ------------------------------------------------------------------ */

export function showDirty(dirty, name) {
  const badge = $('dirty-state');
  if (badge) badge.textContent = dirty ? '• Modified' : '';
  document.title = `${dirty ? '• ' : ''}${name ? name + ' · ' : ''}BridgeSketch 3D · Bridge concepts`;
}

export function showRestoreBar(entry, { onRestore, onDismiss }) {
  const bar = $('restore-bar');
  if (!bar) return;
  let when = '';
  try {
    when = new Date(entry.at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  } catch {}
  $('restore-info').textContent = `${entry.config?.name || 'Unnamed variant'}${when ? ' · last change ' + when : ''}`;
  bar.hidden = false;
  $('restore-apply').onclick = () => {
    bar.hidden = true;
    onRestore();
  };
  $('restore-dismiss').onclick = () => {
    bar.hidden = true;
    onDismiss();
  };
}
export const hideRestoreBar = () => {
  const bar = $('restore-bar');
  if (bar) bar.hidden = true;
};
