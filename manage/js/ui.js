/* Shared UI: action registry, page header, tabs, drawer forms, tables, toasts. */
import { $, $$, esc, num, money, fix, fmtDate, icon, badge, today } from './core.js';
import { db, find } from './store.js';

/* ---------------------------------------------------------------- action registry
   Markup says data-act="name"; views register handlers with act({ name(el, ev) {} }). */
export const actions = {}, submits = {}, inputs = {}, changes = {};
export const act = map => Object.assign(actions, map);
export const onSubmit = map => Object.assign(submits, map);
export const onInput = map => Object.assign(inputs, map);
export const onChange = map => Object.assign(changes, map);
export const ui = { filters: {}, rerender: () => {} };

/* ---------------------------------------------------------------- feedback */
export function toast(msg, tone = '') {
  const t = $('#toast'); t.textContent = msg; t.className = `toast is-on ${tone ? 'toast--' + tone : ''}`;
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('is-on'), 3200);
}
let armed = null; // two-click confirm for destructive buttons (no browser dialogs)
export function confirmTwice(btn, label = 'Click again to confirm') {
  if (armed === btn) { armed = null; return true; }
  if (armed) { armed.innerHTML = armed.dataset.orig; armed.classList.remove('is-armed'); }
  armed = btn; btn.dataset.orig = btn.innerHTML; btn.textContent = label; btn.classList.add('is-armed');
  setTimeout(() => { if (armed === btn) { btn.innerHTML = btn.dataset.orig; btn.classList.remove('is-armed'); armed = null; } }, 4000);
  return false;
}

/* ---------------------------------------------------------------- page chrome (matches the website's dark page hero) */
export const btn = (label, a, { kind = 'yellow', size = '', ic = '', attrs = '' } = {}) =>
  `<button type="button" class="btn btn--${kind}${size ? ' btn--' + size : ''}" data-act="${a}" ${attrs}>${ic ? icon(ic) : ''}<span>${label}</span></button>`;
export const linkBtn = (label, href, { kind = 'yellow', size = '', ic = '' } = {}) =>
  `<a class="btn btn--${kind}${size ? ' btn--' + size : ''}" href="${href}">${ic ? icon(ic) : ''}<span>${label}</span></a>`;

export function hero({ eyebrow = '', title, sub = '', actions = '', back = '', meta = '' }) {
  return `<header class="phero">
    <div class="phero__inner">
      <div class="phero__text">
        ${back ? `<a class="phero__back" href="${back}">${icon('back')}<span>Back</span></a>` : ''}
        ${eyebrow ? `<span class="eyebrow">${eyebrow}</span>` : ''}
        <h1>${title}</h1>
        ${sub ? `<p>${sub}</p>` : ''}
        ${meta ? `<div class="phero__meta">${meta}</div>` : ''}
      </div>
      ${actions ? `<div class="phero__actions">${actions}</div>` : ''}
    </div>
  </header>`;
}
export function tabs(items, active, base) {
  return `<nav class="tabs" aria-label="Sections">${items.filter(Boolean).map(([k, l, n]) => `<a class="tabs__link${k === active ? ' is-active' : ''}" href="#${base}/${k}"${k === active ? ' aria-current="page"' : ''}>${l}${n ? `<em>${n}</em>` : ''}</a>`).join('')}</nav>`;
}
export const card = (title, body, { eyebrow = '', right = '', cls = '' } = {}) =>
  `<section class="card ${cls}">${title || right ? `<div class="card__head"><div>${eyebrow ? `<span class="eyebrow eyebrow--sm">${eyebrow}</span>` : ''}${title ? `<h2>${title}</h2>` : ''}</div>${right}</div>` : ''}${body}</section>`;
export const kpi = (label, value, sub = '', { href = '', tone = '' } = {}) =>
  `<${href ? `a href="${href}"` : 'div'} class="kpi${tone ? ' kpi--' + tone : ''}"><small>${label}</small><strong>${value}</strong>${sub ? `<span>${sub}</span>` : ''}</${href ? 'a' : 'div'}>`;
export const empty = (title, text = '', action = '') => `<div class="empty-state"><strong>${title}</strong>${text ? `<p>${text}</p>` : ''}${action}</div>`;
export const stats = pairs => `<div class="mini-stats">${pairs.map(([l, v, tone]) => `<div${tone ? ` class="is-${tone}"` : ''}><small>${esc(l)}</small><strong>${v}</strong></div>`).join('')}</div>`;
export const bar = (value, max, tone = '') => `<span class="bar${tone ? ' bar--' + tone : ''}"><i style="width:${Math.max(0, Math.min(100, max ? value / max * 100 : 0))}%"></i></span>`;
export const chips = (key, list, active, counts = {}) => `<div class="chips" role="group">${list.map(s => `<button type="button" class="chip${s === active ? ' is-on' : ''}" data-act="filter" data-key="${key}" data-v="${esc(s)}">${esc(s)}${counts[s] !== undefined ? ` <span>${counts[s]}</span>` : ''}</button>`).join('')}</div>`;
export const filter = (key, def = 'All') => (ui.filters[key] = ui.filters[key] || { s: def, q: '' });
act({ filter(el) { filter(el.dataset.key).s = el.dataset.v; ui.rerender(); } });
onInput({ search(el) { filter(el.dataset.key).q = el.value; searchRows(el.closest('.view') || document, el.value); } });
export const search = (key, placeholder) => `<input class="search" type="search" placeholder="${esc(placeholder)}" value="${esc(filter(key).q)}" data-on-input="search" data-key="${key}" aria-label="${esc(placeholder)}">`;
export function searchRows(root, q) {
  q = String(q || '').toLowerCase();
  $$('[data-text]', root).forEach(r => { r.hidden = q && !r.dataset.text.includes(q); });
}

/* ---------------------------------------------------------------- tables */
/** cols: [{ l: label, v: row => html, r: right-align, text: row => searchable text }] */
export function table(cols, rows, { onRow = '', emptyText = 'Nothing here yet.', cls = '' } = {}) {
  if (!rows.length) return `<div class="card table-card">${empty(emptyText)}</div>`;
  return `<div class="card table-card ${cls}"><table class="table">
    <thead><tr>${cols.map(c => `<th${c.r ? ' class="r"' : ''}>${c.l}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => {
      const text = cols.map(c => c.text ? c.text(r) : stripTags(c.v(r))).join(' ').toLowerCase();
      return `<tr ${onRow ? `${onRow(r)} tabindex="0"` : ''} data-text="${esc(text)}">${cols.map(c => `<td${c.r ? ' class="r"' : ''} data-label="${esc(stripTags(c.l))}">${c.v(r) ?? ''}</td>`).join('')}</tr>`;
    }).join('')}</tbody>
  </table></div>`;
}
const stripTags = s => String(s ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

/* ---------------------------------------------------------------- fields */
export const f = (k, l, t = 'text', extra = {}) => ({ k, l, t, ...extra });
const opts = o => typeof o === 'function' ? o() : o;
export function refOptions(c, label) {
  return db[c].slice().map(r => [r.id, label ? label(r) : (r.name || r.title || r.number || r.company)]).sort((a, b) => String(a[1]).localeCompare(String(b[1])));
}
export function fieldHtml(fd, v) {
  const id = 'f_' + fd.k, req = fd.req ? ' required' : '', cls = 'field' + (fd.wide || fd.t === 'textarea' ? ' field--wide' : '') + (fd.cls ? ' ' + fd.cls : '');
  const label = `<label for="${id}">${esc(fd.l)}${fd.req ? ' <abbr title="required">*</abbr>' : ''}</label>`;
  const help = fd.help ? `<small class="field__help">${fd.help}</small>` : '';
  if (fd.t === 'html') return `<div class="${cls}">${fd.l ? `<span class="label">${esc(fd.l)}</span>` : ''}${fd.html(v)}</div>`;
  if (fd.t === 'textarea') return `<div class="${cls}">${label}<textarea id="${id}" name="${fd.k}" rows="${fd.rows || 3}"${req}>${esc(v)}</textarea>${help}</div>`;
  if (fd.t === 'check') return `<div class="${cls} field--check"><label><input type="checkbox" name="${fd.k}"${v ? ' checked' : ''}> ${esc(fd.l)}</label>${help}</div>`;
  if (fd.t === 'select' || fd.t === 'ref') {
    let o = fd.t === 'ref' ? refOptions(fd.ref, fd.label) : opts(fd.o).map(x => Array.isArray(x) ? x : [x, x]);
    if (v && !o.some(([val]) => String(val) === String(v))) o = [[v, fd.t === 'ref' ? '(deleted)' : v], ...o];
    return `<div class="${cls}">${label}<select id="${id}" name="${fd.k}"${req}>${fd.noBlank ? '' : `<option value="">${fd.blank || '—'}</option>`}${o.map(([val, l]) => `<option value="${esc(val)}"${String(val) === String(v) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>${help}</div>`;
  }
  const type = fd.t === 'money' || fd.t === 'number' ? 'number' : fd.t;
  const step = fd.t === 'money' ? ' step="0.01" min="0"' : fd.t === 'number' ? ` step="${fd.step || 'any'}"` : '';
  return `<div class="${cls}">${label}${fd.t === 'money' ? '<span class="input-money">' : ''}<input id="${id}" name="${fd.k}" type="${type}"${step} value="${esc(v)}"${req}${fd.ph ? ` placeholder="${esc(fd.ph)}"` : ''}${fd.t === 'money' || fd.t === 'number' ? ' inputmode="decimal"' : ''}>${fd.t === 'money' ? '</span>' : ''}${help}</div>`;
}
export function collect(form, fields) {
  const out = {};
  fields.forEach(fd => {
    if (fd.t === 'html') return;
    const el = form.elements[fd.k]; if (!el) return;
    if (fd.t === 'check') { out[fd.k] = el.checked; return; }
    let v = el.value.trim();
    if ((fd.t === 'money' || fd.t === 'number') && v !== '') v = num(v);
    out[fd.k] = v;
  });
  return out;
}
export function validate(form, fields) {
  $$('.field.is-bad', form).forEach(x => x.classList.remove('is-bad'));
  const missing = fields.filter(fd => fd.req && form.elements[fd.k] && !String(form.elements[fd.k].value).trim());
  if (!missing.length) return true;
  missing.forEach(fd => form.elements[fd.k].closest('.field').classList.add('is-bad'));
  form.elements[missing[0].k].focus();
  toast(`Fill in: ${missing.map(fd => fd.l).join(', ')}`, 'bad');
  return false;
}

/* ---------------------------------------------------------------- drawer */
let drawerClose = null;
export function openDrawer(html, { wide = false, onClose = null } = {}) {
  const p = $('#drawer-panel');
  p.className = 'drawer__panel' + (wide ? ' drawer__panel--wide' : '');
  p.innerHTML = html;
  $('#drawer').hidden = false;
  document.body.classList.add('is-locked');
  drawerClose = onClose;
  const first = $('input:not([type=hidden]):not([type=checkbox]), select, textarea', p);
  if (first && !p.querySelector('[data-no-autofocus]')) first.focus({ preventScroll: true });
}
export function closeDrawer() {
  if (drawerClose) { const fn = drawerClose; drawerClose = null; fn(); }
  $('#drawer').hidden = true; document.body.classList.remove('is-locked'); $('#drawer-panel').innerHTML = '';
  if (ui.stale) { ui.stale = false; ui.rerender(); } // teammates changed something while the drawer was open
}
export const drawerOpen = () => !$('#drawer').hidden;
act({ close: () => closeDrawer() });

/**
 * Standard record form in the drawer.
 * opts: { eyebrow, title, fields, rec, submit: name, id, extra (html above fields), footer (extra buttons), del: action name, note }
 */
export function formDrawer({ eyebrow = '', title, fields, rec = {}, submit, id = '', extra = '', footer = '', del = '', note = '', wide = false, saveLabel = 'Save' }) {
  openDrawer(`
    <form class="form" data-submit="${submit}" data-id="${esc(id || rec.id || '')}" novalidate>
      <header class="form__head">
        <div>${eyebrow ? `<span class="eyebrow eyebrow--sm">${eyebrow}</span>` : ''}<h2>${title}</h2></div>
        <button type="button" class="x x--lg" data-act="close" aria-label="Close">×</button>
      </header>
      <div class="form__body">
        ${rec.sample ? '<p class="note">Sample record — edit it, or clear all sample data in Settings → Data.</p>' : ''}
        ${note ? `<p class="note">${note}</p>` : ''}
        ${extra}
        <div class="fields">${fields.map(fd => fieldHtml(fd, rec[fd.k] ?? (typeof fd.def === 'function' ? fd.def() : fd.def ?? ''))).join('')}</div>
      </div>
      <footer class="form__foot">
        ${del ? `<button type="button" class="btn btn--danger btn--sm" data-act="${del}">Delete</button>` : ''}
        <div class="form__actions">${footer}</div>
        <button type="button" class="btn btn--ghost" data-act="close">Cancel</button>
        <button type="submit" class="btn btn--yellow">${saveLabel}</button>
      </footer>
    </form>`, { wide });
}

/* ---------------------------------------------------------------- small helpers used by many views */
export const custName = id => (find('customers', id) || {}).name || '';
export const jobLabel = j => j ? `${j.number} · ${j.name}` : '';
export const staffName = id => (find('staff', id) || {}).name || '';
export const crewOf = id => (db.settings.crews.find(c => c.id === id) || null);
export const crewName = id => (crewOf(id) || {}).name || 'Unassigned';
export const crewDot = id => `<span class="dot" style="--c:${(crewOf(id) || {}).color || '#9a9a96'}"></span>`;
export const expStatus = s => !s ? 'Current' : (Math.round((new Date(s + 'T00:00:00') - new Date(today() + 'T00:00:00')) / 864e5) < 0 ? 'Expired' : Math.round((new Date(s + 'T00:00:00') - new Date(today() + 'T00:00:00')) / 864e5) <= 60 ? 'Expiring' : 'Current');
export const qbBadge = r => r && r.qbo && r.qbo.id ? `<span class="qb-badge" title="In QuickBooks">${icon('qb')}QB</span>` : '';
export { esc, money, fix, fmtDate, badge, icon };

/* ---------------------------------------------------------------- printing */
export function printHtml(html) {
  $('#print').innerHTML = html;
  document.body.classList.add('is-printing');
  const done = () => { document.body.classList.remove('is-printing'); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  setTimeout(() => window.print(), 60);
}
export function download(name, text, type = 'text/csv') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
export const csv = rows => rows.map(r => r.map(v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(',')).join('\r\n');
