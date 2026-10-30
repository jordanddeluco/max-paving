/* Estimates: list + the estimate builder (assemblies, options, margin, measuring, proposal, accept → job). */
import { $, $$, esc, num, round, money, fix, pct, today, addDays, fmtDate, icon, badge, uid, UNITS, CATS, COST_TYPES } from '../core.js';
import { db, S, put, del, find, can, nextNumber, api, pull } from '../store.js';
import { act, onSubmit, onInput, onChange, hero, card, btn, linkBtn, table, f, fieldHtml, formDrawer, openDrawer, closeDrawer, collect, validate, toast, confirmTwice, custName, ui, qbBadge, chips, filter, empty, printHtml, bar } from '../ui.js';
import { priceEstimate, costLine, budgetFrom, pricedLines, COST_KEYS, truckHours } from '../calc.js';
import { geocode } from './sales.js';

const STATUSES = ['Draft', 'Sent', 'Accepted', 'Declined'];
export default {
  title: 'Estimates',
  roles: ['owner', 'office', 'estimator'],
  badge: () => db.estimates.filter(e => e.status === 'Accepted' && !db.jobs.some(j => j.estimateId === e.id)).length,
  render(r) { return r.parts[0] ? builder(r.parts[0]) : list(); },
};

/* ---------------------------------------------------------------- list */
function list() {
  const st = filter('estimates');
  const all = db.estimates.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.number || '').localeCompare(a.number || ''));
  const rows = st.s === 'All' ? all : all.filter(e => e.status === st.s);
  const counts = Object.fromEntries(['All', ...STATUSES].map(s => [s, s === 'All' ? all.length : all.filter(e => e.status === s).length]));
  const sent = all.filter(e => e.status === 'Sent').reduce((t, e) => t + priceEstimate(e, db.settings).headline.price, 0);
  return hero({
    eyebrow: 'Sell', title: 'Estimates',
    sub: `Build proposals from assemblies — tons, yards, crew days and trucking are calculated for you. ${money(sent)} out with customers right now.`,
    actions: btn('New estimate', 'est-new', { ic: 'plus' }),
  }) + `<div class="page">
    <div class="toolbar"><input class="search" type="search" placeholder="Search estimates…" value="${esc(st.q)}" data-on-input="search" data-key="estimates" aria-label="Search estimates">${chips('estimates', ['All', ...STATUSES], st.s, counts)}</div>
    ${table([
      { l: '#', v: e => `<strong>${esc(e.number)}</strong> ${qbBadge(e)}` },
      { l: 'Date', v: e => fmtDate(e.date) },
      { l: 'Project', v: e => `<strong>${esc(e.title || 'Untitled')}</strong><small class="muted block">${esc(custName(e.customerId))}</small>`, text: e => `${e.title} ${custName(e.customerId)}` },
      { l: 'Estimator', v: e => esc(e.estimator || '') },
      { l: 'Total', r: true, v: e => { const p = priceEstimate(e, db.settings); return `${p.hasOptions && !p.chosenOption ? '<small class="muted">from </small>' : ''}<strong>${money(p.headline.price)}</strong>`; } },
      { l: 'Margin', r: true, v: e => { const p = priceEstimate(e, db.settings), m = p.headline.price ? (p.headline.price - p.headline.cost * (1 + p.oh)) / p.headline.price : 0; return `<span class="${m < 0.15 ? 'txt-bad' : ''}">${pct(m)}</span>`; } },
      { l: 'Status', v: e => badge(e.status) + (e.status === 'Accepted' && !db.jobs.some(j => j.estimateId === e.id) ? ' <span class="badge badge--blue">Needs job</span>' : '') },
    ], rows, { onRow: e => `data-act="est-open" data-id="${e.id}"`, emptyText: 'No estimates here yet.' })}
  </div>`;
}
act({ 'est-open': el => { location.hash = `estimates/${el.dataset.id}`; } });

/* ---------------------------------------------------------------- new */
export function openEstimateNew(preset = {}) {
  formDrawer({
    eyebrow: 'New estimate', title: 'Start an estimate', submit: 'est-create', rec: { date: today(), estimator: (S.user && db.settings.estimators.includes(S.user.name)) ? S.user.name : '', ...preset },
    fields: [
      f('customerId', 'Customer', 'select', { o: () => db.customers.slice().sort((a, b) => a.name.localeCompare(b.name)).map(c => [c.id, c.name]), blank: '+ New customer…' }),
      f('newCustomer', 'New customer name', 'text', { help: 'Only if the customer isn’t in the list.' }),
      f('title', 'Project title', 'text', { req: true, wide: true, ph: 'e.g. Parking lot mill & overlay' }),
      f('address', 'Project address', 'text', { wide: true }),
      f('estimator', 'Estimator', 'select', { o: () => db.settings.estimators }), f('date', 'Date', 'date'),
      f('leadId', '', 'html', { html: v => `<input type="hidden" name="leadId" value="${esc(v || '')}">` }), f('notes', '', 'html', { html: v => `<input type="hidden" name="notes" value="${esc(v || '')}">` }),
    ],
    saveLabel: 'Create estimate',
  });
}
act({ 'est-new': () => openEstimateNew() });
onSubmit({
  async 'est-create'(form) {
    const e = form.elements;
    if (!e.title.value.trim()) return toast('Give the project a title.', 'bad');
    let customerId = e.customerId.value;
    if (!customerId) {
      const name = e.newCustomer.value.trim(); if (!name) return toast('Pick a customer or type a new customer name.', 'bad');
      customerId = (db.customers.find(c => c.name.toLowerCase() === name.toLowerCase()) || await put('customers', { id: uid(), name, type: 'Commercial', contact: '', phone: '', email: '', address: e.address.value.trim(), notes: '' })).id;
    }
    const est = await put('estimates', {
      id: uid(), number: nextNumber('estimates', 'E-', 1001), date: e.date.value || today(), title: e.title.value.trim(), customerId, address: e.address.value.trim(),
      estimator: e.estimator.value, status: 'Draft', leadId: e.leadId.value, notes: e.notes.value,
      sections: [{ id: 'base', name: 'Base scope', type: 'base' }], lines: [], overheadPct: db.settings.overheadPct, marginPct: db.settings.marginPct, haulMin: db.settings.haulMin,
    });
    closeDrawer(); location.hash = `estimates/${est.id}`;
  },
});

/* ---------------------------------------------------------------- builder */
// `cur` is the working copy being edited; it autosaves half a second after the last change.
let cur = null, saveT = null, dirty = false;
const locked = () => cur && ['Accepted', 'Declined'].includes(cur.status);
function save(now) {
  clearTimeout(saveT); dirty = true;
  const go = () => { dirty = false; cur.priced = pricedLines(cur, db.settings); const status = $('[data-save-state]'); if (status) status.textContent = 'Saving…'; return put('estimates', JSON.parse(JSON.stringify(cur))).then(() => { const s = $('[data-save-state]'); if (s) s.textContent = 'All changes saved'; }); };
  if (now) return go();
  saveT = setTimeout(go, 500);
  const status = $('[data-save-state]'); if (status) status.textContent = 'Editing…';
  return null;
}
const SEC_TYPES = { base: 'Base scope', option: 'Option', addon: 'Add-on' };

function builder(id) {
  const e = find('estimates', id);
  if (!e) return hero({ title: 'Estimate not found', back: '#estimates' });
  if (!cur || cur.id !== id || !dirty) cur = JSON.parse(JSON.stringify(e));
  if (!cur.sections || !cur.sections.length) cur.sections = [{ id: 'base', name: 'Base scope', type: 'base' }];
  const p = priceEstimate(cur, db.settings);
  const job = db.jobs.find(j => j.estimateId === cur.id);
  const lead = cur.leadId && find('leads', cur.leadId);
  const actions = [
    btn('Proposal', 'est-print', { kind: 'outline', ic: 'print' }),
    cur.status === 'Draft' ? btn('Mark sent', 'est-sent', { kind: 'outline' }) : '',
    ['Draft', 'Sent'].includes(cur.status) ? btn('Customer accepted', 'est-accept', { ic: 'check' }) : '',
    cur.status === 'Accepted' && !job ? btn('Create job', 'est-job', { ic: 'hammer' }) : '',
    job ? linkBtn('Open job', `#jobs/${job.id}`, { kind: 'outline', ic: 'hammer' }) : '',
  ].join('');
  return hero({
    back: '#estimates', eyebrow: `${esc(cur.number)} · ${badge(cur.status)} ${qbBadge(cur)}`,
    title: esc(cur.title || 'Untitled estimate'),
    meta: `<span>${icon('users')}${esc(custName(cur.customerId))}</span>${cur.address ? `<span>${icon('map')}${esc(cur.address)}</span>` : ''}${cur.estimator ? `<span>${icon('briefcase')}${esc(cur.estimator)}</span>` : ''}<span>${icon('calendar')}${fmtDate(cur.date)}</span>${lead ? `<a href="#sales/leads?open=${lead.id}">${icon('inbox')}Lead</a>` : ''}`,
    actions,
  }) + `<div class="page est">
    ${locked() ? `<p class="alert">${icon('check')} This estimate is ${cur.status.toLowerCase()} and locked. ${btn('Unlock to edit', 'est-unlock', { kind: 'ghost', size: 'sm' })}</p>` : ''}
    <div class="est__grid">
      <div class="est__main">
        ${p.sections.map(sec => sectionHtml(sec, p)).join('')}
        ${locked() ? '' : `<div class="est__add">${btn('Add option (good / better / best)', 'sec-add', { kind: 'ghost', size: 'sm', ic: 'plus', attrs: 'data-type="option"' })}${btn('Add an add-on', 'sec-add', { kind: 'ghost', size: 'sm', ic: 'plus', attrs: 'data-type="addon"' })}</div>`}
        ${card('Proposal notes', `<textarea class="est-notes" data-on-input="est-notes" rows="4" placeholder="Phasing, exclusions, access, anything the customer should know."${locked() ? ' disabled' : ''}>${esc(cur.notes || '')}</textarea>`, { eyebrow: 'Printed on the proposal' })}
      </div>
      <aside class="est__aside">${summaryHtml(p)}</aside>
    </div>
  </div>`;
}

function sectionHtml(sec, p) {
  const ro = locked();
  const addSel = `<select class="add-line" data-on-change="line-add" data-sec="${sec.id}" aria-label="Add a line">
    <option value="">+ Add a line…</option>
    ${CATS.map(c => { const as = db.settings.assemblies.filter(a => a.cat === c); return as.length ? `<optgroup label="${c} assemblies">${as.map(a => `<option value="a:${a.id}">${esc(a.name)} (${a.unit})</option>`).join('')}</optgroup>` : ''; }).join('')}
    <optgroup label="Cost book items">${db.settings.costBook.map(i => `<option value="i:${i.id}">${esc(i.name)} (${i.unit})</option>`).join('')}</optgroup>
    <optgroup label="Other"><option value="custom">Custom line (type your own cost)</option></optgroup>
  </select>`;
  return `<section class="card est-sec est-sec--${sec.type}" data-sec="${sec.id}">
    <header class="est-sec__head">
      <span class="est-sec__type">${SEC_TYPES[sec.type]}</span>
      <input class="est-sec__name" value="${esc(sec.name)}" data-on-input="sec-name" data-sec="${sec.id}" aria-label="Section name"${ro ? ' disabled' : ''}>
      <span class="est-sec__total"><strong data-sec-price="${sec.id}">${money(sec.price)}</strong><small data-sec-margin="${sec.id}">${pct(sec.margin)} margin</small></span>
      ${!ro && sec.type !== 'base' ? `<button type="button" class="x" data-act="sec-del" data-sec="${sec.id}" aria-label="Remove section">×</button>` : ''}
    </header>
    <div class="est-lines-wrap"><table class="est-lines">
      <thead><tr><th>Item</th><th class="r">Qty</th><th>Unit</th><th class="r">Depth"</th><th class="r">Cost</th><th class="r">Unit price</th><th class="r">Total</th><th></th></tr></thead>
      <tbody>${sec.lines.map(l => lineHtml(l, ro)).join('') || `<tr><td colspan="8" class="muted est-lines__empty">No lines yet — add an assembly below.</td></tr>`}</tbody>
    </table></div>
    ${ro ? '' : `<footer class="est-sec__foot">${addSel}</footer>`}
  </section>`;
}
function lineHtml(r, ro) {
  const l = r.line, a = l.kind === 'assembly' && db.settings.assemblies.find(x => x.id === l.assemblyId);
  const measurable = ['SF', 'SY', 'LF'].includes(r.unit);
  const dis = ro ? ' disabled' : '';
  return `<tr class="est-line" data-line="${l.id}">
    <td class="est-line__desc">
      <input value="${esc(l.desc || '')}" placeholder="${esc(r.desc)}" data-on-input="line-field" data-k="desc" aria-label="Description"${dis}>
      <small>${a ? `${esc(a.cat)} assembly · ${fix(a.prod, 0)} ${a.unit}/day` : l.kind === 'item' ? 'Cost book item' : `<select data-on-change="line-field" data-k="costType" aria-label="Cost type"${dis}>${COST_TYPES.map(t => `<option${t === (l.costType || 'Other') ? ' selected' : ''}>${t}</option>`).join('')}</select>`}
        ${r.parts.length ? ` · <button type="button" class="linkish" data-act="line-break">Breakdown</button>` : ''}</small>
    </td>
    <td class="r"><div class="qty">${measurable && !ro ? `<button type="button" class="qty__measure" data-act="measure" title="Measure on the map" aria-label="Measure on the map">${icon('ruler')}</button>` : ''}<input type="number" step="any" value="${esc(l.qty)}" data-on-input="line-field" data-k="qty" aria-label="Quantity"${dis}></div></td>
    <td>${l.kind === 'custom' ? `<select data-on-change="line-field" data-k="unit" aria-label="Unit"${dis}>${UNITS.map(u => `<option${u === (l.unit || 'EA') ? ' selected' : ''}>${u}</option>`).join('')}</select>` : esc(r.unit)}</td>
    <td class="r">${a && num(a.thick) ? `<input type="number" step="0.5" value="${esc(l.thick ?? '')}" placeholder="${a.thick}" data-on-input="line-field" data-k="thick" aria-label="Depth in inches"${dis}>` : l.kind === 'custom' ? `<input type="number" step="0.01" value="${esc(l.unitCost ?? '')}" placeholder="cost/unit" data-on-input="line-field" data-k="unitCost" aria-label="Unit cost"${dis}>` : '<span class="muted">—</span>'}</td>
    <td class="r muted" data-cell="cost">${money(r.total)}</td>
    <td class="r"><input type="number" step="0.01" value="${esc(l.priceEach ?? '')}" placeholder="${round(r.unitPrice, 2)}" data-on-input="line-field" data-k="priceEach" aria-label="Unit price (leave empty to use the margin)" class="${r.overridden ? 'is-override' : ''}"${dis}></td>
    <td class="r" data-cell="price"><strong>${money(r.price)}</strong></td>
    <td>${ro ? '' : '<button type="button" class="x" data-act="line-del" aria-label="Remove line">×</button>'}</td>
  </tr>
  <tr class="est-break" data-break="${l.id}" hidden><td colspan="8">${breakdownHtml(r)}</td></tr>`;
}
const breakdownHtml = r => `<table class="parts"><thead><tr><th>Part</th><th class="r">Qty</th><th>Unit</th><th class="r">Unit cost</th><th class="r">Cost</th><th>Type</th></tr></thead><tbody>${r.parts.map(x => `<tr><td>${esc(x.name)}</td><td class="r">${fix(x.qty, 2)}</td><td>${esc(x.unit)}</td><td class="r">${money(x.unitCost, true)}</td><td class="r">${money(x.cost)}</td><td>${esc(x.type)}</td></tr>`).join('')}</tbody></table>`;

function summaryHtml(p) {
  const target = p.hasOptions && !p.chosenOption ? p.headline : p.contract;
  const lines = p.contract.sections.flatMap(s => s.lines).concat(p.hasOptions && !p.chosenOption && p.options[0] ? p.options[0].lines : []);
  const cost = Object.fromEntries(COST_KEYS.map(k => [k, lines.reduce((t, l) => t + l.cost[k], 0)]));
  const sum = k => lines.reduce((t, l) => t + num(l[k]), 0);
  const ohCost = target.cost * p.oh, profit = target.price - target.cost - ohCost, margin = target.price ? profit / target.price : 0;
  const markup = target.cost ? (target.price - target.cost) / target.cost : 0;
  const maxC = Math.max(1, ...Object.values(cost));
  const tonsPerDay = sum('days') ? (sum('hmaTons') + sum('baseTons')) / Math.max(1, Math.ceil(sum('days'))) : 0;
  const cycleMin = 2 * num(cur.haulMin ?? db.settings.haulMin) + num(db.settings.loadMin);
  const trucksPerDay = tonsPerDay ? Math.ceil(tonsPerDay / num(db.settings.truckTons || 20) * cycleMin / (num(db.settings.crews[0]?.hoursPerDay || 10) * 60)) : 0;
  const ro = locked() ? ' disabled' : '';
  return `<div class="card sum">
    <span class="eyebrow eyebrow--sm">${p.hasOptions && !p.chosenOption ? 'Base + first option' : 'Contract'}</span>
    <div class="sum__price" data-sum="price">${money(target.price)}</div>
    <div class="sum__row"><span>Direct cost</span><b data-sum="cost">${money(target.cost)}</b></div>
    <div class="sum__row"><span>Overhead</span><b data-sum="oh">${money(ohCost)}</b></div>
    <div class="sum__row sum__row--hl"><span>Gross profit</span><b data-sum="profit" class="${profit < 0 ? 'txt-bad' : ''}">${money(profit)}</b></div>
    <div class="sum__pills"><span>Margin <b data-sum="margin">${pct(margin, 1)}</b></span><span>Markup <b data-sum="markup">${pct(markup, 0)}</b></span></div>
    <div class="sum__inputs">
      <label>Overhead %<input type="number" step="0.5" value="${esc(cur.overheadPct ?? db.settings.overheadPct)}" data-on-input="est-pct" data-k="overheadPct"${ro}></label>
      <label>Target margin %<input type="number" step="0.5" value="${esc(cur.marginPct ?? db.settings.marginPct)}" data-on-input="est-pct" data-k="marginPct"${ro}></label>
    </div>
    <small class="muted">Unit prices fill in from cost + overhead + margin. Type a unit price on a line to override it.</small>
  </div>
  <div class="card sum">
    <span class="eyebrow eyebrow--sm">Cost breakdown</span>
    <div class="costbars">${COST_KEYS.filter(k => cost[k] > 0.5).map(k => `<div class="costbar"><span>${k}</span>${bar(cost[k], maxC)}<b>${money(cost[k])}</b></div>`).join('') || '<p class="muted small">Add lines to see costs.</p>'}</div>
  </div>
  <div class="card sum">
    <span class="eyebrow eyebrow--sm">Production & trucking</span>
    <div class="prod">
      <div><small>Crew days</small><b>${fix(sum('days'), 1)}</b></div><div><small>Man-hours</small><b>${fix(sum('manHours'), 0)}</b></div>
      <div><small>Hot-mix</small><b>${fix(sum('hmaTons'), 0)} t</b></div><div><small>Base rock</small><b>${fix(sum('baseTons'), 0)} t</b></div>
      <div><small>Concrete</small><b>${fix(sum('cy'), 1)} CY</b></div><div><small>Truck hours</small><b>${fix(sum('truckHrs'), 0)}</b></div>
    </div>
    <label class="sum__haul">Haul to plant / dump (minutes one way)<input type="number" step="1" value="${esc(cur.haulMin ?? db.settings.haulMin)}" data-on-input="est-pct" data-k="haulMin"${ro}></label>
    ${trucksPerDay ? `<small class="muted">≈ ${trucksPerDay} truck${trucksPerDay === 1 ? '' : 's'} to keep the crew supplied (${fix(tonsPerDay, 0)} t/day, ${cycleMin}-min cycle).</small>` : ''}
  </div>
  ${p.hasOptions ? `<div class="card sum"><span class="eyebrow eyebrow--sm">Options for the customer</span>${p.options.map(o => `<div class="sum__row"><span>${esc(o.name)}</span><b>${money(o.price)}</b></div>`).join('')}${p.sections.filter(s => s.type === 'addon').map(o => `<div class="sum__row"><span>+ ${esc(o.name)}</span><b>${money(o.price)}</b></div>`).join('')}</div>` : ''}
  <p class="save-state" data-save-state>All changes saved</p>
  <div class="sum__more">${btn('Details', 'est-details', { kind: 'ghost', size: 'sm' })}${btn('Duplicate', 'est-dup', { kind: 'ghost', size: 'sm', ic: 'copy' })}${S.mode === 'server' && can.qbo() ? btn(cur.qbo ? 'Update QuickBooks' : 'Send to QuickBooks', 'est-qbo', { kind: 'ghost', size: 'sm', ic: 'qb' }) : ''}${cur.status !== 'Declined' && cur.status !== 'Accepted' ? btn('Declined', 'est-decline', { kind: 'ghost', size: 'sm' }) : ''}${btn('Delete', 'est-del', { kind: 'danger', size: 'sm' })}</div>`;
}

/* live updates without re-rendering (keeps the cursor in place) */
function refresh() {
  const p = priceEstimate(cur, db.settings);
  p.lines.forEach(r => {
    const tr = $(`tr[data-line="${r.line.id}"]`); if (!tr) return;
    $('[data-cell="cost"]', tr).textContent = money(r.total);
    $('[data-cell="price"]', tr).innerHTML = `<strong>${money(r.price)}</strong>`;
    const pe = $('[data-k="priceEach"]', tr); pe.placeholder = round(r.unitPrice, 2); pe.classList.toggle('is-override', r.overridden);
    const d = $('[data-k="desc"]', tr); d.placeholder = r.desc;
    const br = $(`[data-break="${r.line.id}"] td`); if (br) br.innerHTML = breakdownHtml(r);
  });
  p.sections.forEach(s => { const a = $(`[data-sec-price="${s.id}"]`), m = $(`[data-sec-margin="${s.id}"]`); if (a) a.textContent = money(s.price); if (m) m.textContent = `${pct(s.margin)} margin`; });
  const aside = $('.est__aside'); if (aside) { const focused = document.activeElement && aside.contains(document.activeElement) ? document.activeElement.dataset.k : null; aside.innerHTML = summaryHtml(p); if (focused) { const el = $(`[data-k="${focused}"]`, aside); if (el) { el.focus(); const v = el.value; el.value = ''; el.value = v; } } }
}
const lineOf = el => cur.lines.find(l => l.id === el.closest('tr').dataset.line);
onInput({
  'line-field'(el) { const l = lineOf(el); if (!l) return; const k = el.dataset.k; l[k] = ['qty', 'thick', 'priceEach', 'unitCost'].includes(k) ? (el.value === '' ? '' : num(el.value)) : el.value; refresh(); save(); },
  'sec-name'(el) { const s = cur.sections.find(x => x.id === el.dataset.sec); s.name = el.value; save(); },
  'est-notes'(el) { cur.notes = el.value; save(); },
  'est-pct'(el) { cur[el.dataset.k] = el.value === '' ? '' : num(el.value); refresh(); save(); },
});
onChange({
  'line-field'(el) { const l = lineOf(el); l[el.dataset.k] = el.value; refresh(); save(); },
  async 'line-add'(el) {
    const v = el.value; if (!v) return;
    const line = { id: uid(), section: el.dataset.sec, qty: '' };
    if (v.startsWith('a:')) Object.assign(line, { kind: 'assembly', assemblyId: v.slice(2) });
    else if (v.startsWith('i:')) Object.assign(line, { kind: 'item', itemId: v.slice(2), qty: 1 });
    else Object.assign(line, { kind: 'custom', desc: '', unit: 'EA', unitCost: '', costType: 'Subcontract', qty: 1 });
    cur.lines.push(line); await save(true); ui.rerender();
    const tr = $(`tr[data-line="${line.id}"]`); if (tr) $(line.kind === 'custom' ? '[data-k="desc"]' : '[data-k="qty"]', tr).focus();
  },
});
act({
  async 'line-del'(el) { const id = el.closest('tr').dataset.line; cur.lines = cur.lines.filter(l => l.id !== id); await save(true); ui.rerender(); },
  'line-break'(el) { const id = el.closest('tr').dataset.line, row = $(`[data-break="${id}"]`); row.hidden = !row.hidden; el.textContent = row.hidden ? 'Breakdown' : 'Hide breakdown'; },
  async 'sec-add'(el) {
    const type = el.dataset.type, n = cur.sections.filter(s => s.type === type).length;
    const names = ['Good', 'Better', 'Best'];
    cur.sections.push({ id: uid(), type, name: type === 'option' ? `${names[n] || 'Option ' + (n + 1)} — describe this option` : 'Add-on — describe it' });
    await save(true); ui.rerender();
  },
  async 'sec-del'(el) { if (!confirmTwice(el, 'Remove?')) return; const id = el.dataset.sec; cur.sections = cur.sections.filter(s => s.id !== id); cur.lines = cur.lines.filter(l => l.section !== id); await save(true); ui.rerender(); },
  async 'est-unlock'() { cur.status = 'Draft'; await save(true); ui.rerender(); toast('Unlocked. Re-send the proposal if the price changes.'); },
  async 'est-sent'() {
    cur.status = 'Sent'; cur.sentOn = today(); await save(true);
    const lead = cur.leadId && find('leads', cur.leadId); if (lead && ['New', 'Contacted', 'Site visit'].includes(lead.status)) await put('leads', { ...lead, status: 'Proposal sent' });
    ui.rerender(); toast(`Marked sent. You’ll get a follow-up reminder in ${db.settings.followUpDays || 7} days.`);
  },
  async 'est-decline'() {
    cur.status = 'Declined'; await save(true);
    const lead = cur.leadId && find('leads', cur.leadId); if (lead) await put('leads', { ...lead, status: 'Lost' });
    ui.rerender(); toast('Marked declined.');
  },
  'est-accept'() {
    const p = priceEstimate(cur, db.settings), addons = p.sections.filter(s => s.type === 'addon');
    openDrawer(`<form class="form" data-submit="est-accept" novalidate>
      <header class="form__head"><div><span class="eyebrow eyebrow--sm">${esc(cur.number)}</span><h2>Customer accepted</h2></div><button type="button" class="x x--lg" data-act="close" aria-label="Close">×</button></header>
      <div class="form__body">
        ${p.options.length ? `<fieldset class="checks"><legend>Which option did they choose?</legend>${p.options.map((o, i) => `<label><input type="radio" name="option" value="${o.id}"${i === 0 ? ' checked' : ''}> ${esc(o.name)} <b>${money(o.price)}</b></label>`).join('')}</fieldset>` : ''}
        ${addons.length ? `<fieldset class="checks"><legend>Add-ons they want</legend>${addons.map(o => `<label><input type="checkbox" name="addon" value="${o.id}"> ${esc(o.name)} <b>+${money(o.price)}</b></label>`).join('')}</fieldset>` : ''}
        <div class="fields">${fieldHtml(f('by', 'Accepted by', 'text'), (find('customers', cur.customerId) || {}).contact || '')}${fieldHtml(f('on', 'Date', 'date'), today())}${fieldHtml(f('makeJob', 'Create the job now (goes to the schedule’s sold-work tray)', 'check', { wide: true }), true)}</div>
      </div>
      <footer class="form__foot"><div class="form__actions"></div><button type="button" class="btn btn--ghost" data-act="close">Cancel</button><button type="submit" class="btn btn--yellow">Accept</button></footer></form>`);
  },
  'est-job'() { createJob(); },
  'est-print'() { printProposal(); },
  'est-details'() {
    formDrawer({ eyebrow: cur.number, title: 'Estimate details', submit: 'est-details', rec: cur, fields: [
      f('title', 'Project title', 'text', { req: true, wide: true }), f('customerId', 'Customer', 'ref', { ref: 'customers', req: true }), f('address', 'Project address', 'text', { wide: true }),
      f('estimator', 'Estimator', 'select', { o: () => db.settings.estimators }), f('date', 'Date', 'date'), f('number', 'Estimate #'),
    ] });
  },
  async 'est-dup'() {
    const copy = { ...JSON.parse(JSON.stringify(cur)), id: uid(), number: nextNumber('estimates', 'E-', 1001), status: 'Draft', date: today(), accepted: null, sentOn: '', qbo: null, title: cur.title + ' (copy)' };
    await put('estimates', copy); location.hash = `estimates/${copy.id}`; toast('Duplicated.');
  },
  async 'est-del'(el) {
    if (db.jobs.some(j => j.estimateId === cur.id)) return toast('This estimate has a job — keep it for the record.', 'bad');
    if (!confirmTwice(el, 'Click again to delete')) return;
    await del('estimates', cur.id); cur = null; location.hash = 'estimates'; toast('Estimate deleted.');
  },
  async 'est-qbo'(el) {
    el.disabled = true;
    try { await save(true); await api('qbo/push', { method: 'POST', body: { kind: 'estimate', id: cur.id, label: cur.number } }); await pull(); cur = null; ui.rerender(); toast('Estimate is in QuickBooks.'); }
    catch (e) { toast(e.message, 'bad'); }
    el.disabled = false;
  },
  measure(el) { openMeasure(el.closest('tr').dataset.line); },
});
onSubmit({
  async 'est-accept'(form) {
    const opt = form.querySelector('input[name=option]:checked'), addons = [...form.querySelectorAll('input[name=addon]:checked')].map(x => x.value);
    cur.status = 'Accepted'; cur.accepted = { by: form.elements.by.value, on: form.elements.on.value || today(), option: opt ? opt.value : '', addons };
    await save(true);
    const lead = cur.leadId && find('leads', cur.leadId); if (lead) await put('leads', { ...lead, status: 'Won' });
    closeDrawer();
    if (form.elements.makeJob.checked) return createJob();
    ui.rerender(); toast('Accepted.');
  },
  async 'est-details'(form) {
    const fields = [f('title', '', 'text', { req: true }), f('customerId', ''), f('address', ''), f('estimator', ''), f('date', ''), f('number', '')];
    Object.assign(cur, collect(form, fields)); await save(true); closeDrawer(); ui.rerender();
  },
});
async function createJob() {
  const p = priceEstimate(cur, db.settings);
  const byCat = {}; p.contract.sections.flatMap(s => s.lines).forEach(l => { byCat[l.cat] = (byCat[l.cat] || 0) + l.price; });
  const type = Object.entries(byCat).filter(([c]) => c !== 'General').sort((a, b) => b[1] - a[1])[0]?.[0] || 'Mixed';
  const crew = db.settings.crews.find(c => c.cat === type);
  const job = await put('jobs', {
    id: uid(), number: nextNumber('jobs', 'J-', 1001), name: cur.title, customerId: cur.customerId, estimateId: cur.id, address: cur.address,
    type, crewId: crew ? crew.id : '', start: '', end: '', status: 'Scheduled', value: Math.round(p.contract.price), budget: budgetFrom(cur, db.settings), pct: 0, completed: '', notes: cur.notes || '',
  });
  cur = null;
  location.hash = `jobs/${job.id}`;
  toast(`${job.number} created — it’s waiting in the schedule’s sold-work tray.`);
}

/* ---------------------------------------------------------------- proposal */
function printProposal() {
  const p = priceEstimate(cur, db.settings), c = find('customers', cur.customerId) || {}, co = db.settings.company, s = db.settings;
  const rows = sec => sec.lines.map(l => `<tr><td>${esc(l.desc)}</td><td class="r">${fix(l.qty, 2)}</td><td>${esc(l.unit)}</td><td class="r">${money(l.unitPrice, true)}</td><td class="r">${money(l.price, true)}</td></tr>`).join('');
  const base = p.sections.filter(x => x.type === 'base'), opts = p.options, adds = p.sections.filter(x => x.type === 'addon');
  const baseTotal = base.reduce((t, x) => t + x.price, 0);
  printHtml(`<article class="pr">
    <header class="pr__head"><img src="img/logo-horizontal.jpg" alt="Max Paving"><div class="pr__co">${esc(co.address)}<br>${esc(co.phone)} · ${esc(co.email)}<br>${esc(co.website || '')}</div></header>
    <h1>Proposal ${esc(cur.number)}</h1>
    <div class="pr__meta">
      <div><small>Prepared for</small><strong>${esc(c.name || '')}</strong>${c.contact ? `<br>${esc(c.contact)}` : ''}${c.phone ? `<br>${esc(c.phone)}` : ''}${c.email ? `<br>${esc(c.email)}` : ''}</div>
      <div><small>Project</small><strong>${esc(cur.title)}</strong>${cur.address ? `<br>${esc(cur.address)}` : ''}</div>
      <div><small>Date</small><strong>${fmtDate(cur.date)}</strong><br>Valid until ${fmtDate(addDays(cur.date || today(), num(s.proposalValidDays) || 30))}${cur.estimator ? `<br>Estimator: ${esc(cur.estimator)}` : ''}</div>
    </div>
    ${base.filter(x => x.lines.length).map(sec => `<h2>${esc(sec.name)}</h2><table class="pr__table"><thead><tr><th>Scope</th><th class="r">Qty</th><th>Unit</th><th class="r">Unit price</th><th class="r">Amount</th></tr></thead><tbody>${rows(sec)}</tbody>${opts.length ? '' : `<tfoot><tr><td colspan="4">Total</td><td class="r">${money(baseTotal + 0, true)}</td></tr></tfoot>`}</table>`).join('')}
    ${opts.length ? `<h2>Options — choose one</h2>${opts.map(o => `<div class="pr__opt"><div class="pr__opt-head"><span class="pr__box"></span><strong>${esc(o.name)}</strong><b>${money(o.price + baseTotal, true)}</b></div><table class="pr__table pr__table--sm"><tbody>${rows(o)}</tbody></table></div>`).join('')}` : ''}
    ${adds.length ? `<h2>Optional add-ons</h2>${adds.map(o => `<div class="pr__opt"><div class="pr__opt-head"><span class="pr__box"></span><strong>${esc(o.name)}</strong><b>+ ${money(o.price, true)}</b></div></div>`).join('')}` : ''}
    ${cur.notes ? `<h2>Notes</h2><p>${esc(cur.notes).replace(/\n/g, '<br>')}</p>` : ''}
    <h2>Terms</h2>
    <ul>
      <li>The scope above is the scope we build. Materials as specified, never substituted.</li>
      <li>If site conditions turn up that nobody could have known, we stop and talk it through with you before any change order.</li>
      <li>All work by Max Paving’s own crews. Cleanup included.</li>
      <li>One-year written warranty on labor and workmanship from the date of completion.</li>
      <li>Payment due net ${esc(s.termsDays)} days from invoice.</li>
    </ul>
    <div class="pr__sign"><div>Accepted by (customer)<span></span></div><div>Date<span></span></div><div>Max Paving<span></span></div></div>
  </article>`);
}

/* ---------------------------------------------------------------- measure on aerial imagery */
let mmap = null, shapes = [], current = null, mode = 'area';
const R = 6378137;
function areaM2(pts) { // planar approximation around the polygon's centre — accurate for job-site sized areas
  if (pts.length < 3) return 0;
  const lat0 = pts.reduce((t, p) => t + p.lat, 0) / pts.length * Math.PI / 180;
  const xy = pts.map(p => [R * p.lng * Math.PI / 180 * Math.cos(lat0), R * p.lat * Math.PI / 180]);
  let a = 0; for (let i = 0; i < xy.length; i++) { const [x1, y1] = xy[i], [x2, y2] = xy[(i + 1) % xy.length]; a += x1 * y2 - x2 * y1; }
  return Math.abs(a) / 2;
}
const lenM = pts => pts.slice(1).reduce((t, p, i) => t + mmap.distance(pts[i], p), 0);
const M2_SF = 10.7639, M_FT = 3.28084;
function totals() {
  const all = [...shapes, ...(current && current.pts.length ? [current] : [])];
  const sf = all.filter(s => s.mode === 'area').reduce((t, s) => t + areaM2(s.pts) * M2_SF, 0);
  const lf = all.filter(s => s.mode === 'length').reduce((t, s) => t + lenM(s.pts) * M_FT, 0);
  return { sf, sy: sf / 9, lf };
}
function openMeasure(lineId) {
  const r = priceEstimate(cur, db.settings).lines.find(x => x.line.id === lineId);
  mode = r.unit === 'LF' ? 'length' : 'area'; shapes = []; current = null;
  openDrawer(`<div class="form measure" data-line="${lineId}" data-unit="${r.unit}" data-no-autofocus>
    <header class="form__head"><div><span class="eyebrow eyebrow--sm">Measure · ${esc(r.desc)}</span><h2>Measure on the aerial</h2></div><button type="button" class="x x--lg" data-act="close" aria-label="Close">×</button></header>
    <div class="measure__bar">
      <div class="seg"><button type="button" data-act="m-mode" data-v="area" class="${mode === 'area' ? 'is-on' : ''}">Area</button><button type="button" data-act="m-mode" data-v="length" class="${mode === 'length' ? 'is-on' : ''}">Length</button></div>
      <input class="search" placeholder="Find an address…" value="${esc(cur.address || '')}" data-on-change="m-find" aria-label="Find an address">
      ${btn('Undo point', 'm-undo', { kind: 'ghost', size: 'sm' })}${btn('New shape', 'm-next', { kind: 'ghost', size: 'sm' })}${btn('Clear', 'm-clear', { kind: 'ghost', size: 'sm' })}
    </div>
    <div class="measure__map" id="measure-map"></div>
    <footer class="form__foot measure__foot"><div class="measure__total" data-m-total>Click around the area to outline it. Double-click to finish a shape.</div><button type="button" class="btn btn--ghost" data-act="close">Cancel</button><button type="button" class="btn btn--yellow" data-act="m-use" disabled>Use measurement</button></footer>
  </div>`, { wide: true, onClose: () => { if (mmap) { mmap.remove(); mmap = null; } } });
  if (!window.L) { $('#measure-map').innerHTML = '<p class="map__off">The map couldn’t load. Check the internet connection.</p>'; return; }
  mmap = L.map('measure-map', { doubleClickZoom: false }).setView([db.settings.lat, db.settings.lon], 12);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 20, maxNativeZoom: 19, attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics' }).addTo(mmap);
  mmap.on('click', ev => { if (!current) current = newShape(); current.pts.push(ev.latlng); draw(); });
  mmap.on('dblclick', () => finishShape());
  setTimeout(() => mmap && mmap.invalidateSize(), 250);
  if (cur.address) findAddress(cur.address);
}
const newShape = () => ({ mode, pts: [], layer: null, dots: L.layerGroup().addTo(mmap) });
function draw() {
  if (!current) return;
  if (current.layer) current.layer.remove();
  const style = { color: '#fecf0e', weight: 3, fillColor: '#fecf0e', fillOpacity: 0.25 };
  current.layer = (current.mode === 'area' && current.pts.length > 2 ? L.polygon(current.pts, style) : L.polyline(current.pts, style)).addTo(mmap);
  current.dots.clearLayers(); current.pts.forEach(p => L.circleMarker(p, { radius: 4, color: '#111', weight: 2, fillColor: '#fecf0e', fillOpacity: 1 }).addTo(current.dots));
  showTotal();
}
function finishShape() { if (current && current.pts.length >= (current.mode === 'area' ? 3 : 2)) { shapes.push(current); current = null; showTotal(); } }
function showTotal() {
  const t = totals(), el = $('[data-m-total]'), unit = $('.measure').dataset.unit; if (!el) return;
  const val = unit === 'SY' ? t.sy : unit === 'SF' ? t.sf : t.lf;
  el.innerHTML = t.sf || t.lf ? `<strong>${t.sf ? `${fix(t.sf, 0)} SF · ${fix(t.sy, 0)} SY` : ''}${t.sf && t.lf ? ' · ' : ''}${t.lf ? `${fix(t.lf, 0)} LF` : ''}</strong> <span class="muted">${shapes.length + (current && current.pts.length ? 1 : 0)} shape(s)</span>` : 'Click around the area to outline it. Double-click to finish a shape.';
  const use = $('[data-act="m-use"]'); use.disabled = !val; use.textContent = val ? `Use ${fix(val, 0)} ${unit}` : 'Use measurement';
}
async function findAddress(q) { try { const hit = await geocode(q); if (hit && mmap) mmap.setView([hit.lat, hit.lng], 19); } catch (e) { /* stay on the default view */ } }
act({
  'm-mode'(el) { finishShape(); mode = el.dataset.v; $$('[data-act="m-mode"]').forEach(b => b.classList.toggle('is-on', b === el)); },
  'm-undo'() { if (current && current.pts.length) { current.pts.pop(); draw(); } else if (shapes.length) { current = shapes.pop(); current.pts.pop(); draw(); } },
  'm-next'() { finishShape(); },
  'm-clear'() { [...shapes, current].filter(Boolean).forEach(s => { if (s.layer) s.layer.remove(); s.dots.remove(); }); shapes = []; current = null; showTotal(); },
  async 'm-use'(el) {
    finishShape();
    const wrap = $('.measure'), t = totals(), unit = wrap.dataset.unit, val = unit === 'SY' ? t.sy : unit === 'SF' ? t.sf : t.lf;
    const l = cur.lines.find(x => x.id === wrap.dataset.line); l.qty = Math.round(val);
    closeDrawer(); await save(true); ui.rerender(); toast(`Quantity set to ${fix(l.qty, 0)} ${unit}.`);
  },
});
onChange({ 'm-find'(el) { if (el.value.trim()) findAddress(el.value.trim()); } });
