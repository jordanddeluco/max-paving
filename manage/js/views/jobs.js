/* Jobs: list + job page. A job moves through 7 stages; its phases are what gets scheduled.
   Overview (health strip, next action, site packet, 811/permit) · Phases (readiness + material orders) ·
   Change orders · Closeout (punch, walkthrough, checklist) · Costs · Field · Billing */
import { $, $$, esc, num, round, money, fix, pct, today, addDays, fmtDate, shortDate, weekday, fmtTime, fmtHours, daysUntil, icon, badge, uid, CATS } from '../core.js';
import { db, S, put, del, find, can, nextNumber, role } from '../store.js';
import { act, onSubmit, onChange, onInput, hero, tabs, card, kpi, btn, linkBtn, table, f, fieldHtml, formDrawer, openDrawer, closeDrawer, collect, validate, toast, confirmTwice, custName, crewName, crewDot, staffName, jobLabel, ui, chips, filter, bar, stats, qbBadge, printHtml } from '../ui.js';
import { jobActuals, costStatus, COST_KEYS } from '../calc.js';
import { jobInvoiced, jobCollected, invStatus, invBalance, warrantyOf, warrantyStatus, estTotals } from '../derive.js';
import { STAGES, PHASE_TYPES, stage, stageIndex, nextAction, gate, locateStatus, locateDates, earliest, phaseDigs, phaseOrderKind, contract, budgetTotal, approvedCOs, pendingCOs, closeoutItems, walkedThrough, phasesDone, syncSummary, messages, soldMissing, isOpenJob, addWorkdays, isWorkday } from '../jobflow.js';
import { openInvoice } from './billing.js';

export default {
  title: 'Jobs',
  roles: ['owner', 'office', 'estimator', 'foreman', 'crew'],
  badge: () => db.jobs.filter(j => isOpenJob(j) && nextAction(j).tone === 'red').length,
  render(r) { return r.parts[0] ? jobPage(r.parts[0], r.parts[1] || 'overview') : list(); },
};
const money_ = () => can.money();
const tone = t => ({ red: 'red', yellow: 'yellow', green: 'green', blue: 'blue' }[t] || 'gray');
const stageBadge = j => { const s = stage(j); return `<span class="stage-chip stage-chip--${STAGES.indexOf(s) >= 0 ? STAGES.indexOf(s) : 'x'}">${esc(s)}</span>`; };

/* ---------------------------------------------------------------- list */
function list() {
  const st = filter('jobs', 'Open');
  const all = db.jobs.slice().sort((a, b) => (a.start || '9999').localeCompare(b.start || '9999') || (b.number || '').localeCompare(a.number || ''));
  const groups = ['Open', ...STAGES, 'On hold', 'All'];
  const rows = st.s === 'All' ? all : st.s === 'Open' ? all.filter(isOpenJob) : all.filter(j => stage(j) === st.s);
  const counts = Object.fromEntries(groups.map(g => [g, g === 'All' ? all.length : g === 'Open' ? all.filter(isOpenJob).length : all.filter(j => stage(j) === g).length]));
  const nextDate = j => (j.phases || []).filter(p => p.status !== 'Done' && p.start).map(p => p.start).sort()[0];
  return hero({
    eyebrow: 'Build', title: 'Jobs', sub: 'Every sold job from “getting ready” to closed out — one next action each, so nothing falls through the cracks.',
    actions: can.write('jobs') ? btn('New job', 'job-new', { ic: 'plus' }) : '',
  }) + `<div class="page">
    <div class="toolbar"><input class="search" type="search" placeholder="Search jobs…" value="${esc(st.q)}" data-on-input="search" data-key="jobs" aria-label="Search jobs">${chips('jobs', groups.filter(g => counts[g] || ['Open', 'All'].includes(g)), st.s, counts)}</div>
    ${table([
      { l: 'Job', v: j => `<strong>${esc(j.number)} · ${esc(j.name)}</strong> ${qbBadge(j)}<small class="muted block">${esc(custName(j.customerId))}</small>`, text: j => `${j.number} ${j.name} ${custName(j.customerId)} ${j.address || ''}` },
      { l: 'Stage', v: stageBadge },
      { l: 'Next action', v: j => { const n = nextAction(j); return `<span class="next next--${tone(n.tone)}">${esc(n.text)}</span>`; } },
      { l: 'Next date', v: j => { const d = nextDate(j); return d ? `${weekday(d)} ${shortDate(d)}` : '<span class="muted">—</span>'; } },
      money_() && { l: 'Contract', r: true, v: j => money(contract(j)) + (pendingCOs(j).length ? `<small class="block txt-blue">+${money(pendingCOs(j).reduce((t, c) => t + num(c.amount), 0))} pending</small>` : '') },
      money_() && { l: 'Budget', v: j => { const s = j.budget && costStatus(jobActuals(j, db, db.settings), { ...j.budget, total: budgetTotal(j) }, j.pct); return s && s.label !== 'No budget' ? `<span class="badge badge--${s.tone}">${s.label}</span>` : ''; } },
    ].filter(Boolean), rows, { onRow: j => `data-act="job-open" data-id="${j.id}"`, emptyText: 'No jobs here.' })}
  </div>`;
}
act({ 'job-open': el => { location.hash = `jobs/${el.dataset.id}`; } });

/* ---------------------------------------------------------------- job details form */
const JOB_FIELDS = () => [
  f('name', 'Job name', 'text', { req: true, wide: true }),
  f('customerId', 'Customer', 'ref', { ref: 'customers', req: true }), f('number', 'Job #'),
  f('address', 'Job address', 'text', { wide: true }),
  f('type', 'Work type', 'select', { o: [...CATS.filter(c => c !== 'General'), 'Mixed'], noBlank: true }),
  f('status', 'Status', 'select', { o: [['Active', 'Active'], ['On hold', 'On hold'], ['Cancelled', 'Cancelled'], ['Complete', 'Complete']], noBlank: true }),
  can.money() && f('value', 'Original contract value', 'money', { help: 'Approved change orders add to this.' }), f('pct', '% complete', 'number'),
  f('notes', 'Notes for the crew', 'textarea', { wide: true }),
].filter(Boolean);
export function openJob(id, preset = {}) {
  const j = id ? find('jobs', id) : { number: nextNumber('jobs', 'J-', 1001), status: 'Active', type: 'Asphalt', pct: 0, ...preset };
  formDrawer({ eyebrow: 'Job', title: id ? esc(jobLabel(j)) : 'New job', fields: JOB_FIELDS(), rec: j, submit: 'job-save', id, del: id && can.write('jobs') ? 'job-del' : '', note: id ? '' : 'Add the phases (and their crews and dates) on the job’s Phases tab after saving.' });
}
act({
  'job-new': () => openJob(), 'job-edit': el => openJob(el.dataset.id || location.hash.split('/')[1]),
  async 'job-del'(el) {
    const id = el.closest('form').dataset.id;
    if (db.invoices.some(i => i.jobId === id) || db.time.some(t => t.jobId === id)) return toast('This job has time or invoices — put it on hold or cancel it instead.', 'bad');
    if (!confirmTwice(el, 'Click again to delete')) return;
    await del('jobs', id); closeDrawer(); location.hash = 'jobs'; toast('Job deleted.');
  },
});
onSubmit({
  async 'job-save'(form) {
    const fields = JOB_FIELDS(); if (!validate(form, fields)) return;
    const v = collect(form, fields), prev = form.dataset.id ? find('jobs', form.dataset.id) : null;
    const type = { Asphalt: 'Asphalt paving', Concrete: 'Concrete flatwork', Excavation: 'Excavation & grading' }[v.type] || 'Other';
    const rec = syncSummary({ ...(prev || { id: uid(), phases: [{ id: uid(), type, name: type, crewId: (db.settings.crews.find(c => c.cat === v.type) || {}).id || '', start: '', end: '', days: 1, status: 'Planned', order: null, notes: '' }], site: {}, locate: { state: 'MO' }, permit: {}, changes: [], punch: [], closeout: {} }), ...v });
    await put('jobs', rec); closeDrawer();
    if (!prev) location.hash = `jobs/${rec.id}/phases`; else ui.rerender();
    toast('Job saved.');
  },
});

/* ---------------------------------------------------------------- job page */
const route_job = () => find('jobs', location.hash.split('/')[1]);
function jobPage(id, tab) {
  const j = find('jobs', id);
  if (!j) return hero({ title: 'Job not found', back: '#jobs' });
  const T = [['overview', 'Overview'], ['phases', `Phases & orders`], can.money() && ['changes', `Change orders${pendingCOs(j).length ? ` · ${pendingCOs(j).length}` : ''}`], ['closeout', 'Closeout'], can.money() && ['costs', 'Costs'], role() !== 'crew' && ['field', 'Field'], can.money() && ['billing', 'Billing']];
  const mapUrl = j.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(j.address)}` : '';
  const body = { overview, phases, changes, closeout, costs, field, billing }[tab] || overview;
  return hero({
    back: '#jobs', eyebrow: `${esc(j.number)} · ${stageBadge(j)}`, title: esc(j.name),
    meta: `<span>${icon('users')}${esc(custName(j.customerId))}</span>${j.address ? `<a href="${mapUrl}" target="_blank" rel="noopener">${icon('map')}${esc(j.address)}</a>` : ''}${j.site && j.site.contact ? `<span>${icon('inbox')}${esc(j.site.contact)}${j.site.phone ? ' · ' + esc(j.site.phone) : ''}</span>` : ''}`,
    actions: [
      can.write('logs') ? btn('Daily report', 'log-new', { kind: 'outline', ic: 'clipboard', attrs: `data-job="${j.id}"` }) : '',
      can.money() ? btn('Invoice', 'job-invoice', { kind: 'outline', ic: 'dollar', attrs: `data-id="${j.id}"` }) : '',
      can.write('jobs') ? btn('Edit', 'job-edit', { kind: 'outline', attrs: `data-id="${j.id}"` }) : '',
    ].join(''),
  }) + tabs(T, tab, `jobs/${id}`) + `<div class="page">${body(j)}</div>`;
}

function healthStrip(j) {
  const st = stage(j), si = stageIndex(st), n = nextAction(j);
  const upcoming = (j.phases || []).filter(p => p.status !== 'Done');
  const gates = upcoming.map(p => gate(j, p)), items = gates.flatMap(g => g.items), okCount = items.filter(i => i.ok || i.na).length;
  const late = upcoming.some(p => p.start && (p.end || p.start) < today());
  const a = jobActuals(j, db, db.settings), b = j.budget ? { ...j.budget, total: budgetTotal(j) } : null, cs = b ? costStatus(a, b, j.pct) : null;
  const billedPct = contract(j) ? jobInvoiced(j) / contract(j) : 0;
  return `<section class="health">
    <ol class="tracker">${STAGES.map((s, i) => `<li class="${i < si ? 'is-done' : i === si ? 'is-on' : ''}"><span></span><small>${esc(s)}</small></li>`).join('')}</ol>
    <div class="health__row">
      <div class="next-box next-box--${tone(n.tone)}"><small>Next action</small><strong>${esc(n.text)}</strong></div>
      <div class="hchip${items.length && okCount < items.length ? ' is-warn' : ''}"><small>Ready</small><b>${items.length ? `${okCount}/${items.length}` : '—'}</b><span>checklist items</span></div>
      <div class="hchip${late ? ' is-bad' : ''}"><small>Schedule</small><b>${late ? 'Late' : upcoming.some(p => p.start) ? 'On track' : upcoming.length ? 'Not set' : 'Done'}</b><span>${upcoming.length} phase${upcoming.length === 1 ? '' : 's'} left</span></div>
      ${can.money() ? `<div class="hchip${cs && cs.label === 'At risk' ? ' is-bad' : ''}"><small>Money</small><b>${cs && cs.label !== 'No budget' ? cs.label : '—'}</b><span>${pendingCOs(j).length ? `${money(pendingCOs(j).reduce((t, c) => t + num(c.amount), 0))} in pending COs` : `${money(contract(j))} contract`}</span></div>
      <div class="hchip"><small>Billing</small><b>${pct(billedPct)} billed</b><span>${fix(j.pct, 0)}% complete</span></div>` : ''}
    </div>
  </section>`;
}

/* ---------------------------------------------------------------- overview */
function overview(j) {
  const est = j.estimateId && find('estimates', j.estimateId);
  const scope = est ? estTotals(est).contract.sections.flatMap(s => s.lines) : [];
  const loc = locateStatus(j), ld = locateDates(j.locate), pm = j.permit || {}, si = j.site || {};
  const w = warrantyOf(j);
  const edit = can.write('jobs');
  return healthStrip(j) + `<div class="grid-2">
    <div class="stack">
      ${card('Phases', `<ul class="phase-mini">${(j.phases || []).map(p => { const g = gate(j, p); return `<li><span class="dot" style="--c:${(db.settings.crews.find(c => c.id === p.crewId) || {}).color || '#9a9a96'}"></span><span><strong>${esc(p.name)}</strong><small>${esc(crewName(p.crewId))} · ${p.start ? `${weekday(p.start)} ${shortDate(p.start)}${p.end && p.end !== p.start ? '–' + shortDate(p.end) : ''}` : 'not scheduled'}</small></span>${p.status === 'Done' ? badge('Complete', 'Done') : g.ready ? badge('Go', 'Ready') : `<span class="badge badge--yellow" title="${esc(g.open.map(i => i.label).join(', '))}">${g.open.length} open</span>`}</li>`; }).join('')}</ul>${linkBtn('Phases & orders', `#jobs/${j.id}/phases`, { kind: 'ghost', size: 'sm' })}`, { eyebrow: 'What gets scheduled' })}
      ${scope.length ? card('Scope', `<ul class="scope">${scope.map(l => `<li><span>${esc(l.desc)}</span><b>${fix(l.qty, 0)} ${esc(l.unit)}</b></li>`).join('')}</ul>${est ? `<a class="small" href="#estimates/${est.id}">Open ${esc(est.number)} →</a>` : ''}`, { eyebrow: 'From the estimate' }) : ''}
      ${card('Customer messages', `<p class="muted small">Copy and text or email them — dates and the address fill in from the next phase.</p><div class="msgs">${messages(j, (j.phases || []).find(p => p.status !== 'Done')).map(([l, t], i) => `<button type="button" class="btn btn--ghost btn--sm" data-act="msg-copy" data-i="${i}">${icon('copy')}<span>${esc(l)}</span></button>`).join('')}</div>`, { eyebrow: 'Keep them in the loop' })}
    </div>
    <div class="stack">
      ${card('Site packet', `<dl class="packet"><dt>Address</dt><dd>${esc(j.address || '—')}</dd><dt>On-site contact</dt><dd>${esc(si.contact || '—')}${si.phone ? ` · <a href="tel:${esc(si.phone.replace(/[^\d+]/g, ''))}">${esc(si.phone)}</a>` : ''}</dd><dt>Gate / access</dt><dd>${esc(si.gate || '—')}</dd><dt>Notes</dt><dd>${esc(si.notes || j.notes || '—')}</dd></dl>${edit ? btn('Edit site packet', 'site-edit', { kind: 'ghost', size: 'sm' }) : ''}`, { eyebrow: 'Everything the crew needs' })}
      ${card('811 & permits', `<div class="locate">
        <div class="locate__row"><span>811 locate</span>${loc.need ? `<span class="badge badge--${loc.tone}">${esc(loc.label)}</span>` : '<span class="badge badge--gray">No digging phases</span>'}</div>
        ${j.locate && j.locate.called ? `<small class="muted">${esc(j.locate.state || 'MO')} ticket ${esc(j.locate.ticket || '(number?)')} · called ${fmtDate(j.locate.called)} · legal dig ${ld ? fmtDate(ld.digReady) : ''} · start by ${ld ? fmtDate(ld.startBy) : ''}</small>` : ''}
        <div class="locate__row"><span>Permit / right-of-way</span>${pm.needed === 'yes' ? (pm.number ? `<span class="badge badge--green">#${esc(pm.number)}${pm.expires ? ' · exp ' + shortDate(pm.expires) : ''}</span>` : '<span class="badge badge--red">Number missing</span>') : pm.needed === 'no' ? '<span class="badge badge--gray">Not needed</span>' : '<span class="badge badge--yellow">Needed?</span>'}</div>
      </div>${edit ? btn('Update 811 & permit', 'locate-edit', { kind: 'ghost', size: 'sm' }) : ''}<p class="muted small">Missouri: call at least ${num(db.settings.mo811Days) || 2} and no more than 10 working days ahead (RSMo 319.026). Kansas: 2 full working days, no more than 20 days ahead. Always check the dates on your ticket.</p>`, { eyebrow: 'Before anyone digs' })}
      ${can.money() ? card('Contract', stats([['Original', money(j.value)], ['Change orders', money(approvedCOs(j).reduce((t, c) => t + num(c.amount), 0))], ['Contract now', money(contract(j))], ['Collected', money(jobCollected(j))]]), { eyebrow: 'Money' }) : ''}
      ${w ? card('Warranty', `<p>${badge(warrantyStatus(j))} One-year workmanship warranty until <strong>${fmtDate(w)}</strong>.</p>`, { eyebrow: 'After completion' }) : ''}
    </div>
  </div>`;
}
act({
  'msg-copy'(el) {
    const j = route_job(), m = messages(j, (j.phases || []).find(p => p.status !== 'Done'))[+el.dataset.i];
    navigator.clipboard.writeText(m[1]).then(() => toast(`“${m[0]}” message copied.`), () => toast(m[1]));
  },
  'site-edit'() {
    const j = route_job();
    formDrawer({ eyebrow: j.number, title: 'Site packet', submit: 'site-save', id: j.id, rec: { ...j.site, address: j.address }, fields: [
      f('address', 'Job address', 'text', { wide: true }), f('contact', 'On-site contact'), f('phone', 'Contact phone', 'tel'),
      f('gate', 'Gate code / access'), f('notes', 'Site notes (parking, staging, hazards)', 'textarea', { wide: true }),
    ] });
  },
  'locate-edit'() {
    const j = route_job(), l = j.locate || {}, pm = j.permit || {};
    formDrawer({ eyebrow: j.number, title: '811 & permit', submit: 'locate-save', id: j.id, rec: { state: l.state || 'MO', ticket: l.ticket, called: l.called, verified: l.verified, needed: pm.needed, number: pm.number, expires: pm.expires, juris: pm.juris }, fields: [
      f('state', '811 state', 'select', { o: ['MO', 'KS'], noBlank: true }), f('ticket', 'Ticket number'), f('called', 'Date called', 'date', { help: 'Legal dig date and start-by date are worked out from this.' }), f('verified', 'Marks checked on site', 'check'),
      f('needed', 'Permit needed?', 'select', { o: [['yes', 'Yes'], ['no', 'No']] }), f('number', 'Permit number'), f('juris', 'Issued by (city / county)'), f('expires', 'Permit expires', 'date'),
    ] });
  },
});
onSubmit({
  async 'site-save'(form) { const j = find('jobs', form.dataset.id), v = collect(form, [f('address', ''), f('contact', ''), f('phone', ''), f('gate', ''), f('notes', '')]); await put('jobs', { ...j, address: v.address, site: { ...j.site, contact: v.contact, phone: v.phone, gate: v.gate, notes: v.notes } }); closeDrawer(); ui.rerender(); toast('Site packet saved.'); },
  async 'locate-save'(form) {
    const j = find('jobs', form.dataset.id), v = collect(form, [f('state', ''), f('ticket', ''), f('called', ''), f('verified', '', 'check'), f('needed', ''), f('number', ''), f('juris', ''), f('expires', '')]);
    await put('jobs', { ...j, locate: { state: v.state, ticket: v.ticket, called: v.called, verified: v.verified }, permit: { needed: v.needed, number: v.number, juris: v.juris, expires: v.expires } });
    closeDrawer(); ui.rerender(); toast('Saved.');
  },
});

/* ---------------------------------------------------------------- phases & material orders */
const ORDER_STATUSES = ['Not ordered', 'Placed', 'Confirmed', 'Delivered', 'Cancelled'];
function phases(j) {
  const edit = can.write('jobs');
  const dis = edit ? '' : ' disabled';
  const card_ = p => {
    const g = gate(j, p), e = earliest(j, p), o = p.order;
    const crewSel = `<select data-on-change="ph-field" data-k="crewId" aria-label="Crew"${dis}><option value="">Sub / no crew</option>${db.settings.crews.map(c => `<option value="${c.id}"${c.id === p.crewId ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select>`;
    return `<section class="card phase${p.status === 'Done' ? ' is-done' : ''}" data-ph="${p.id}">
      <div class="phase__head">
        <input class="phase__name" value="${esc(p.name)}" data-on-input="ph-field" data-k="name" aria-label="Phase name"${dis}>
        <select data-on-change="ph-field" data-k="type" aria-label="Phase type"${dis}>${PHASE_TYPES.map(t => `<option${t === p.type ? ' selected' : ''}>${t}</option>`).join('')}</select>
        ${p.status === 'Done' ? `<span class="badge badge--green">Done</span>${edit ? btn('Reopen', 'ph-undone', { kind: 'ghost', size: 'sm' }) : ''}` : edit ? btn('Mark done', 'ph-done', { kind: 'ghost', size: 'sm', ic: 'check' }) : ''}
        ${edit ? `<button type="button" class="x" data-act="ph-del" aria-label="Remove phase">×</button>` : ''}
      </div>
      <div class="phase__grid">
        <label><small>Crew</small>${crewSel}</label>
        <label><small>Start</small><input type="date" value="${esc(p.start || '')}" data-on-change="ph-field" data-k="start"${dis}></label>
        <label><small>Working days</small><input type="number" min="1" step="1" value="${esc(phaseLen(p))}" data-on-change="ph-field" data-k="days"${dis}></label>
        <label><small>Crew starts</small><input type="time" value="${esc(p.startTime || '07:00')}" data-on-change="ph-field" data-k="startTime"${dis}></label>
        <label><small>Quantity</small><span class="phase__qty"><input type="number" step="any" value="${esc(p.qty ?? '')}" data-on-change="ph-field" data-k="qty"${dis}><input value="${esc(p.unit || '')}" placeholder="unit" data-on-change="ph-field" data-k="unit" aria-label="Unit"${dis}></span></label>
      </div>
      ${e ? `<p class="phase__hint">${icon('clock')} Not before ${weekday(e)} ${fmtDate(e)} — paving needs ${db.settings.stripeWaitDays || 14} days to cure before striping.</p>` : ''}
      ${p.status !== 'Done' ? `<div class="gate"><span class="label">Ready for the day?</span><ul>${g.items.map(i => `<li class="${i.ok ? 'is-ok' : 'is-open'}">${icon(i.ok ? 'check' : 'clock')}<span><b>${esc(i.label)}</b><small>${esc(i.why || '')}</small></span>${!i.ok && edit ? gateFix(i.key) : ''}</li>`).join('')}</ul>${p.override ? `<small class="muted">Scheduled anyway by ${esc(p.override.by)}: “${esc(p.override.reason)}”</small>` : ''}</div>` : ''}
      ${o ? `<div class="order">
        <span class="label">${o.kind === 'concrete' ? 'Concrete order' : o.kind === 'rock' ? 'Base rock order' : 'Hot-mix order'}</span>
        <div class="order__grid">
          <label><small>Supplier</small><input value="${esc(o.supplier || '')}" placeholder="${o.kind === 'concrete' ? 'Ready-mix plant' : 'Asphalt plant'}" data-on-change="ord-field" data-k="supplier"${dis}></label>
          <label><small>${o.kind === 'concrete' ? 'Mix (psi, slump, air)' : 'Mix'}</small><input value="${esc(o.product || '')}" data-on-change="ord-field" data-k="product"${dis}></label>
          <label><small>Quantity</small><span class="phase__qty"><input type="number" step="any" value="${esc(o.qty ?? '')}" data-on-change="ord-field" data-k="qty"${dis}><b>${esc(o.unit || '')}</b></span></label>
          <label><small>First load</small><input type="time" value="${esc(o.time || '07:00')}" data-on-change="ord-field" data-k="time"${dis}></label>
          ${o.kind === 'concrete' ? `<label><small>Pump</small><input value="${esc(o.pump || '')}" placeholder="No / company & size" data-on-change="ord-field" data-k="pump"${dis}></label>` : `<label><small>Trucks</small><input type="number" value="${esc(o.trucks ?? '')}" placeholder="${trucksFor(j, p)}" data-on-change="ord-field" data-k="trucks"${dis}></label>`}
          <label><small>Status</small><select data-on-change="ord-field" data-k="status"${dis}>${ORDER_STATUSES.map(s => `<option${s === o.status ? ' selected' : ''}>${s}</option>`).join('')}</select></label>
          <label><small>Confirmation #</small><input value="${esc(o.confirmation || '')}" data-on-change="ord-field" data-k="confirmation"${dis}></label>
          ${o.status === 'Delivered' ? `<label><small>Delivered (tickets)</small><input type="number" step="any" value="${esc(o.delivered ?? '')}" data-on-change="ord-field" data-k="delivered"${dis}></label>` : ''}
        </div>
        ${o.moved ? `<p class="phase__hint is-bad">${icon('clock')} The date moved to ${fmtDate(o.moved)} — call ${esc(o.supplier || 'the supplier')} and re-confirm.</p>` : ''}
        ${o.status === 'Delivered' && num(o.delivered) && num(o.qty) && num(o.delivered) > num(o.qty) * 1.05 ? `<p class="phase__hint">${icon('dollar')} Delivered ${fix(num(o.delivered) / num(o.qty) * 100 - 100, 0)}% over the order — consider a change order.</p>` : ''}
      </div>` : edit && phaseOrderKind(p) ? `<div class="btn-row">${btn('Add material order', 'ord-add', { kind: 'ghost', size: 'sm', ic: 'plus' })}</div>` : ''}
      <label class="phase__notes"><small>Notes for the crew</small><textarea rows="2" data-on-change="ph-field" data-k="notes"${dis}>${esc(p.notes || '')}</textarea></label>
    </section>`;
  };
  return healthStrip(j) + `<div class="phases">${(j.phases || []).map(card_).join('')}</div>
    ${edit ? `<div class="btn-row">${btn('Add phase', 'ph-add', { kind: 'ghost', ic: 'plus' })}${linkBtn('Open the schedule', '#schedule', { kind: 'ghost' })}</div>` : ''}
    <p class="muted small">Set dates here or drag phases on the Schedule. Missing checklist items don’t block scheduling — you’ll be asked for a reason.</p>`;
}
const trucksFor = (j, p) => { const tph = 100, cycle = (2 * num(db.settings.haulMin) + num(db.settings.loadMin)) / 60; return Math.max(1, Math.ceil(tph * cycle / (num(db.settings.truckTons) || 20))); };
function gateFix(key) {
  return { locate: btn('811…', 'locate-edit', { kind: 'ghost', size: 'sm' }), permit: btn('Permit…', 'locate-edit', { kind: 'ghost', size: 'sm' }), order: btn('Order placed', 'ord-placed', { kind: 'ghost', size: 'sm' }), sub: btn('Confirmed', 'ph-sub', { kind: 'ghost', size: 'sm' }), notified: btn('Told them today', 'ph-notified', { kind: 'ghost', size: 'sm' }) }[key] || '';
}
const phOf = (j, el) => j.phases.find(p => p.id === el.closest('[data-ph]').dataset.ph);
// Length in working days: counted from the dates when scheduled, otherwise the planned days.
const phaseLen = p => { if (!p.start) return Math.max(1, num(p.days) || 1); let n = 0; for (let d = p.start; d <= (p.end || p.start); d = addDays(d, 1)) if (isWorkday(d) || d === p.start) n++; return Math.max(1, n); };
async function updatePhase(el, fn, msg, recalc = false) {
  const j = JSON.parse(JSON.stringify(route_job())), p = phOf(j, el);
  fn(p, j);
  if (recalc && p.start) p.end = addWorkdays(p.start, Math.max(1, num(p.days)) - 1); // multi-day phases skip weekends and holidays
  if (phasesDone(j) && j.status !== 'Complete') { j.status = 'Complete'; j.completed = j.completed || (j.phases.map(x => x.end || x.start).filter(Boolean).sort().pop() || today()); j.pct = 100; }
  if (!phasesDone(j) && j.status === 'Complete') { j.status = 'Active'; j.completed = ''; }
  await put('jobs', syncSummary(j)); ui.rerender(); if (msg) toast(msg);
}
onInput({ 'ph-field'(el) { clearTimeout(ui.phT); ui.phT = setTimeout(() => updatePhase(el, p => { p[el.dataset.k] = el.value; }), 600); } });
onChange({
  'ph-field'(el) {
    const k = el.dataset.k;
    updatePhase(el, (p, j) => {
      if (k === 'days') { p.days = Math.max(1, num(el.value)); return; }
      if (k === 'start') { p.days = phaseLen(p); p.start = el.value; if (!el.value) p.end = ''; if (p.order && ['Placed', 'Confirmed'].includes(p.order.status) && el.value) { p.order.moved = el.value; p.order.status = 'Placed'; } return; }
      p[k] = k === 'qty' ? num(el.value) : el.value;
    }, '', k === 'start' || k === 'days');
  },
  'ord-field'(el) { updatePhase(el, p => { const k = el.dataset.k; p.order[k] = ['qty', 'trucks', 'delivered'].includes(k) ? num(el.value) : el.value; if (k === 'status' && el.value === 'Confirmed') delete p.order.moved; }); },
});
act({
  'ph-add'() {
    const j = route_job();
    formDrawer({ eyebrow: j.number, title: 'Add phase', submit: 'ph-add', id: j.id, rec: { type: 'Asphalt paving', days: 1 }, fields: [
      f('type', 'Type', 'select', { o: PHASE_TYPES, noBlank: true }), f('name', 'Name (optional)', 'text', { ph: 'e.g. Phase 2 — south lot' }),
      f('crewId', 'Crew', 'select', { o: () => db.settings.crews.map(c => [c.id, c.name]), blank: 'Sub / no crew' }), f('days', 'Days', 'number'),
    ] });
  },
  async 'ph-del'(el) { if (!confirmTwice(el, 'Remove phase?')) return; const j = JSON.parse(JSON.stringify(route_job())); j.phases = j.phases.filter(p => p.id !== el.closest('[data-ph]').dataset.ph); await put('jobs', syncSummary(j)); ui.rerender(); },
  'ph-done'(el) { updatePhase(el, p => { p.status = 'Done'; if (!p.start) { p.start = today(); p.end = today(); } }, 'Phase done.'); },
  'ph-undone'(el) { updatePhase(el, p => { p.status = 'Planned'; }); },
  'ph-notified'(el) { updatePhase(el, p => { p.notifiedOn = today(); }, 'Marked as told.'); },
  'ph-sub'(el) { updatePhase(el, p => { p.subConfirmed = true; }); },
  'ord-add'(el) { updatePhase(el, p => { const k = phaseOrderKind(p); p.order = { kind: k, supplier: '', product: '', qty: k === 'concrete' ? '' : '', unit: k === 'concrete' ? 'CY' : 'TON', time: '07:00', status: 'Not ordered' }; }); },
  'ord-placed'(el) { updatePhase(el, p => { if (p.order) { p.order.status = 'Placed'; p.order.placedBy = S.user ? S.user.name : 'Office'; p.order.placedOn = today(); } }, 'Order marked placed — confirm it the day before.'); },
});
onSubmit({
  async 'ph-add'(form) {
    const j = JSON.parse(JSON.stringify(find('jobs', form.dataset.id))), v = collect(form, [f('type', ''), f('name', ''), f('crewId', ''), f('days', '', 'number')]);
    const p = { id: uid(), type: v.type, name: v.name || v.type, crewId: v.crewId, start: '', end: '', days: Math.max(1, num(v.days) || 1), qty: '', unit: '', status: 'Planned', notes: '', order: null };
    const k = phaseOrderKind(p); if (k) p.order = { kind: k, supplier: '', product: '', qty: '', unit: k === 'concrete' ? 'CY' : 'TON', time: '07:00', status: 'Not ordered' };
    j.phases.push(p); await put('jobs', syncSummary(j)); closeDrawer(); ui.rerender(); toast('Phase added — it’s in the schedule tray.');
  },
});

/* ---------------------------------------------------------------- change orders */
function changes(j) {
  const cos = j.changes || [];
  const sum = arr => arr.reduce((t, c) => t + num(c.amount), 0);
  return `<section class="kpis">
    ${kpi('Original contract', money(j.value))}${kpi('Approved changes', money(sum(approvedCOs(j))), `${approvedCOs(j).length} change order${approvedCOs(j).length === 1 ? '' : 's'}`)}
    ${kpi('Pending', money(sum(pendingCOs(j))), pendingCOs(j).length ? 'Get written approval before doing the work' : 'Nothing waiting', { tone: pendingCOs(j).length ? 'alert' : '' })}${kpi('Contract now', money(contract(j)))}
  </section>
  <div class="toolbar"><span class="muted small">Extra work from the field shows up here from the daily report. Never do it without written approval.</span>${can.write('jobs') ? btn('New change order', 'co-new', { ic: 'plus' }) : ''}</div>` + table([
    { l: '#', v: c => `<strong>${esc(c.number)}</strong>` }, { l: 'What', v: c => `${esc(c.desc)}${c.source === 'field' ? ' <span class="badge badge--blue">From the field</span>' : ''}` },
    { l: 'Price', r: true, v: c => num(c.amount) ? money(c.amount) : '<span class="badge badge--yellow">Price it</span>' }, { l: 'Our cost', r: true, v: c => num(c.cost) ? money(c.cost) : '' },
    { l: 'Status', v: c => badge(c.status === 'Approved' ? 'Accepted' : c.status === 'Declined' ? 'Declined' : 'Sent', c.status) + (c.approvedBy ? `<small class="muted block">${esc(c.approvedBy)} · ${fmtDate(c.approvedOn)}</small>` : '') },
  ], cos, { onRow: c => `data-act="co-edit" data-id="${c.id}"`, emptyText: 'No change orders on this job.' });
}
const CO_FIELDS = () => [
  f('desc', 'What changed', 'textarea', { req: true, wide: true, rows: 2 }), f('amount', 'Price to the customer', 'money'), f('cost', 'Our cost (adds to the budget)', 'money'),
  f('status', 'Status', 'select', { o: ['Pending', 'Approved', 'Declined'], noBlank: true }), f('approvedBy', 'Approved by (customer)'), f('approvedOn', 'Approved on', 'date'),
];
act({
  'co-new'() { const j = route_job(); formDrawer({ eyebrow: j.number, title: 'New change order', fields: CO_FIELDS(), rec: { status: 'Pending' }, submit: 'co-save', saveLabel: 'Save change order' }); },
  'co-edit'(el) { const j = route_job(), c = j.changes.find(x => x.id === el.dataset.id); formDrawer({ eyebrow: `${j.number} · ${c.number}`, title: 'Change order', fields: CO_FIELDS(), rec: c, submit: 'co-save', id: c.id, del: can.write('jobs') ? 'co-del' : '', footer: btn('Print for signature', 'co-print', { kind: 'ghost', size: 'sm', ic: 'print' }) }); },
  async 'co-del'(el) { if (!confirmTwice(el, 'Delete?')) return; const j = JSON.parse(JSON.stringify(route_job())); j.changes = j.changes.filter(c => c.id !== el.closest('form').dataset.id); await put('jobs', j); closeDrawer(); ui.rerender(); },
  'co-print'(el) {
    const j = route_job(), c = j.changes.find(x => x.id === el.closest('form').dataset.id), co = db.settings.company;
    printHtml(`<article class="pr"><header class="pr__head"><img src="img/logo-horizontal.jpg" alt="Max Paving"><div class="pr__co">${esc(co.address)}<br>${esc(co.phone)}</div></header>
      <h1>Change order ${esc(c.number)}</h1><div class="pr__meta"><div><small>Job</small><strong>${esc(jobLabel(j))}</strong><br>${esc(j.address || '')}</div><div><small>Customer</small><strong>${esc(custName(j.customerId))}</strong></div><div><small>Date</small><strong>${fmtDate(c.requested || today())}</strong></div></div>
      <h2>Change</h2><p>${esc(c.desc)}</p><table class="pr__table"><tbody><tr><td>Original contract</td><td class="r">${money(j.value, true)}</td></tr><tr><td>Previous approved changes</td><td class="r">${money(approvedCOs(j).filter(x => x.id !== c.id).reduce((t, x) => t + num(x.amount), 0), true)}</td></tr><tr><td><b>This change</b></td><td class="r"><b>${money(c.amount, true)}</b></td></tr></tbody><tfoot><tr><td>New contract total</td><td class="r">${money(contract(j) + (c.status === 'Approved' ? 0 : num(c.amount)), true)}</td></tr></tfoot></table>
      <p>We won’t start this work until this change order is signed.</p><div class="pr__sign"><div>Approved by (customer)<span></span></div><div>Date<span></span></div><div>Max Paving<span></span></div></div></article>`);
  },
});
onSubmit({
  async 'co-save'(form) {
    const fl = CO_FIELDS(); if (!validate(form, fl)) return;
    const j = JSON.parse(JSON.stringify(route_job())), v = collect(form, fl);
    if (v.status === 'Approved' && !v.approvedBy) return toast('Who approved it? Get it in writing.', 'bad');
    if (v.status === 'Approved' && !v.approvedOn) v.approvedOn = today();
    const prev = j.changes.find(c => c.id === form.dataset.id);
    if (prev) Object.assign(prev, v); else j.changes.push({ id: uid(), number: `CO-${j.changes.length + 1}`, requested: today(), source: 'office', ...v });
    await put('jobs', j); closeDrawer(); ui.rerender(); toast(v.status === 'Approved' ? 'Approved — contract and budget updated.' : 'Change order saved.');
  },
});

/* ---------------------------------------------------------------- closeout */
function closeout(j) {
  const punch = j.punch || [], items = closeoutItems(j), c = j.closeout || {};
  const edit = can.write('jobs');
  const NEXT = { Open: 'Fixed', Fixed: 'Verified', Verified: 'Open' };
  return healthStrip(j) + `<div class="grid-2">
    <div class="stack">
      ${card(`Punch list <small class="muted">${punch.filter(x => x.status !== 'Verified').length} open</small>`, `<ul class="punch">${punch.map(x => `<li class="is-${x.status.toLowerCase()}"><button type="button" class="punch__state" data-act="punch-next" data-id="${x.id}" title="Open → Fixed → Verified"${edit ? '' : ' disabled'}>${x.status === 'Open' ? '' : icon('check')}</button><span><strong>${esc(x.text)}</strong><small>${esc(x.status)}${x.who ? ' · ' + esc(staffName(x.who)) : ''}</small></span>${edit ? `<button type="button" class="x" data-act="punch-del" data-id="${x.id}" aria-label="Remove">×</button>` : ''}</li>`).join('') || '<li class="muted">No punch items.</li>'}</ul>
        ${edit ? `<form class="punch-add" data-submit="punch-add"><input name="text" placeholder="Add an item — e.g. low spot by the north drain" aria-label="Punch item"><select name="who" aria-label="Who fixes it"><option value="">Anyone</option>${db.staff.filter(s => s.crewId).map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select><button class="btn btn--black btn--sm" type="submit">Add</button></form>` : ''}
        <p class="muted small">Click the circle to move an item Open → Fixed → Verified. The final walkthrough waits until everything is verified.</p>`, { eyebrow: 'Before the walkthrough' })}
      ${card('Final walkthrough', c.walkthroughOn ? `<p>${badge('Complete', 'Signed')} Walked with <b>${esc(c.walkthroughBy || 'the customer')}</b> on ${fmtDate(c.walkthroughOn)}.</p>${edit ? btn('Undo', 'walk-undo', { kind: 'ghost', size: 'sm' }) : ''}`
        : `<p class="muted">Walk the finished work with the customer before the crew leaves; fix anything on the spot or add it to the punch list.</p>${edit ? `<form class="punch-add" data-submit="walk-sign"><input name="by" placeholder="Customer’s name (they sign)" aria-label="Customer name"><button class="btn btn--yellow btn--sm" type="submit"${punch.some(x => x.status !== 'Verified') ? ' disabled title="Verify the punch list first"' : ''}>Signed off</button></form>${btn('Print sign-off sheet', 'walk-print', { kind: 'ghost', size: 'sm', ic: 'print' })}` : ''}`, { eyebrow: 'Customer sign-off' })}
    </div>
    <div class="stack">
      ${card('Closeout checklist', `<ul class="closeout">${items.map(i => `<li class="${i.ok ? 'is-ok' : ''}">${i.manual && edit && !c.closedOn ? `<label><input type="checkbox" data-on-change="close-tick" data-k="${i.key}"${i.ok ? ' checked' : ''}> ${esc(i.label)}</label>` : `${icon(i.ok ? 'check' : 'clock')}<span>${esc(i.label)}</span>`}</li>`).join('')}</ul>
        ${c.closedOn ? `<p>${badge('Complete', 'Closed')} on ${fmtDate(c.closedOn)}${c.closedBy ? ' by ' + esc(c.closedBy) : ''}.</p>${edit ? btn('Reopen', 'job-reopen', { kind: 'ghost', size: 'sm' }) : ''}` : edit ? `<div class="btn-row">${btn('Mark job closed', 'job-close', { ic: 'check', attrs: items.every(i => i.ok) ? '' : 'data-force="1"' })}</div>${items.every(i => i.ok) ? '' : '<p class="muted small">Some items are still open — closing anyway asks for a reason.</p>'}` : ''}`, { eyebrow: 'Done means done' })}
      ${card('Keep-off & review messages', `<div class="msgs">${messages(j, (j.phases || []).slice(-1)[0]).slice(3).map(([l], i) => `<button type="button" class="btn btn--ghost btn--sm" data-act="msg-copy" data-i="${i + 3}">${icon('copy')}<span>${esc(l)}</span></button>`).join('')}</div>`, { eyebrow: 'After the work' })}
    </div>
  </div>`;
}
async function mutate(fn, msg) { const j = JSON.parse(JSON.stringify(route_job())); j.punch = j.punch || []; j.closeout = j.closeout || {}; fn(j); await put('jobs', j); ui.rerender(); if (msg) toast(msg); }
act({
  'punch-next'(el) { mutate(j => { const x = j.punch.find(p => p.id === el.dataset.id); x.status = { Open: 'Fixed', Fixed: 'Verified', Verified: 'Open' }[x.status]; }); },
  'punch-del'(el) { mutate(j => { j.punch = j.punch.filter(p => p.id !== el.dataset.id); }); },
  'walk-undo'() { mutate(j => { delete j.closeout.walkthroughOn; }); },
  'walk-print'() {
    const j = route_job(), co = db.settings.company;
    printHtml(`<article class="pr"><header class="pr__head"><img src="img/logo-horizontal.jpg" alt="Max Paving"><div class="pr__co">${esc(co.phone)}</div></header><h1>Final walkthrough</h1>
      <div class="pr__meta"><div><small>Job</small><strong>${esc(jobLabel(j))}</strong><br>${esc(j.address || '')}</div><div><small>Customer</small><strong>${esc(custName(j.customerId))}</strong></div><div><small>Date</small><strong>${fmtDate(today())}</strong></div></div>
      <h2>Completed work</h2><ul>${(j.phases || []).map(p => `<li>${esc(p.name)}${p.qty ? ` — ${fix(p.qty, 0)} ${esc(p.unit || '')}` : ''}</li>`).join('')}</ul>
      <h2>Punch items</h2><ul>${(j.punch || []).map(x => `<li>${esc(x.text)} — ${esc(x.status)}</li>`).join('') || '<li>None</li>'}</ul>
      <p>I have walked the completed work with Max Paving and accept it as complete, subject to the one-year workmanship warranty.</p>
      <div class="pr__sign"><div>Customer<span></span></div><div>Date<span></span></div><div>Max Paving<span></span></div></div></article>`);
  },
  'job-close'(el) {
    if (!el.dataset.force) return mutate(j => { j.closeout.closedOn = today(); j.closeout.closedBy = S.user ? S.user.name : 'Office'; }, 'Job closed — warranty tracking continues.');
    formDrawer({ eyebrow: route_job().number, title: 'Close with items open?', submit: 'close-force', rec: {}, saveLabel: 'Close the job', fields: [f('reason', 'Why close now?', 'textarea', { req: true, wide: true })] });
  },
  'job-reopen'() { mutate(j => { delete j.closeout.closedOn; }); },
});
onSubmit({
  'punch-add'(form) { const text = form.elements.text.value.trim(); if (!text) return; mutate(j => { j.punch.push({ id: uid(), text, who: form.elements.who.value, status: 'Open', added: today() }); }); },
  'walk-sign'(form) { const by = form.elements.by.value.trim(); if (!by) return toast('Who walked it?', 'bad'); mutate(j => { j.closeout.walkthroughOn = today(); j.closeout.walkthroughBy = by; }, 'Walkthrough signed off.'); },
  async 'close-force'(form) { const reason = form.elements.reason.value.trim(); if (!reason) return; closeDrawer(); mutate(j => { j.closeout.closedOn = today(); j.closeout.closedBy = S.user ? S.user.name : 'Office'; j.closeout.closeReason = reason; }, 'Job closed.'); },
});
onChange({ 'close-tick'(el) { mutate(j => { j.closeout[el.dataset.k] = el.checked; }); } });

/* ---------------------------------------------------------------- costs */
function costs(j) {
  if (!j.budget) return card('No budget yet', '<p>Jobs created from an accepted estimate carry its budget automatically. This one was added by hand — actual costs still add up below.</p>') + actualsOnly(j);
  const a = jobActuals(j, db, db.settings), b = { ...j.budget, total: budgetTotal(j) }, st = costStatus(a, b, j.pct);
  const c = contract(j), projMargin = c ? (c - st.projected) / c : 0, estMargin = c ? (c - b.total) / c : 0;
  const row = (label, bud, act_, unit = '$') => { const fmt = v => unit === '$' ? money(v) : `${fix(v, unit === 'CY' ? 1 : 0)} ${unit}`; const ratio = bud ? act_ / bud : 0; return `<tr><td>${label}</td><td class="r">${fmt(bud)}</td><td class="r">${fmt(act_)}</td><td>${bar(act_, Math.max(bud, act_) || 1, ratio > num(j.pct) / 100 + 0.1 ? 'bad' : '')}</td><td class="r">${bud ? Math.round(ratio * 100) + '%' : ''}</td></tr>`; };
  const coCost = approvedCOs(j).reduce((t, x) => t + num(x.cost), 0);
  return `<section class="kpis">
      ${kpi('Status', `<span class="txt-${st.tone}">${st.label}</span>`, `Projected ${money(st.projected)} at ${fix(j.pct, 0)}% complete`)}
      ${kpi('Budget', money(b.total), `${pct(estMargin)} margin as bid${coCost ? ` · incl. ${money(coCost)} from COs` : ''}`)}
      ${kpi('Spent so far', money(a.total), `${b.total ? Math.round(a.total / b.total * 100) : 0}% of budget`)}
      ${kpi('Projected margin', pct(projMargin), projMargin < estMargin - 0.05 ? 'Below the bid margin' : 'In line with the bid', { tone: projMargin < estMargin - 0.05 ? 'alert' : '' })}
    </section>
    ${card('Cost by category', `<div class="table-scroll"><table class="table table--plain"><thead><tr><th>Category</th><th class="r">Budget</th><th class="r">Actual</th><th></th><th class="r">Used</th></tr></thead><tbody>
      ${COST_KEYS.filter(k => j.budget.cost[k] > 0.5 || a.cost[k] > 0.5).map(k => row(k, j.budget.cost[k], a.cost[k])).join('')}
      ${coCost ? row('Change orders', coCost, 0) : ''}
      <tr class="tr-total"><td>Total</td><td class="r">${money(b.total)}</td><td class="r">${money(a.total)}</td><td></td><td class="r">${b.total ? Math.round(a.total / b.total * 100) + '%' : ''}</td></tr>
    </tbody></table></div>`, { eyebrow: 'Budget vs actual' })}
    ${card('Production', `<div class="table-scroll"><table class="table table--plain"><thead><tr><th>Quantity</th><th class="r">Estimated</th><th class="r">Actual</th><th></th><th class="r">Used</th></tr></thead><tbody>
      ${row('Man-hours', b.manHours, a.manHours, 'h')}${b.hmaTons || a.hmaTons ? row('Hot-mix', b.hmaTons, a.hmaTons, 't') : ''}${b.baseTons || a.baseTons ? row('Base rock', b.baseTons, a.baseTons, 't') : ''}${b.cy || a.cy ? row('Concrete', b.cy, a.cy, 'CY') : ''}${row('Truck hours', b.truckHrs, a.truckHrs, 'h')}
    </tbody></table></div>
    <p class="muted small">Actuals: labor = clocked hours × pay rate + ${db.settings.burdenPct}% burden · materials = daily-report quantities × cost book · equipment = days on site × the crew’s equipment day rate. Bars turn red when use runs more than 10 points ahead of % complete.</p>`, { eyebrow: 'Estimated vs actual' })}`;
}
function actualsOnly(j) {
  const a = jobActuals(j, db, db.settings);
  return card('Actual cost so far', stats([['Total', money(a.total)], ...COST_KEYS.filter(k => a.cost[k] > 0.5).map(k => [k, money(a.cost[k])]), ['Man-hours', fix(a.manHours, 0)]]), { eyebrow: 'From time & daily reports' });
}

/* ---------------------------------------------------------------- field: reports + time */
function field(j) {
  const logs = db.logs.filter(g => g.jobId === j.id).sort((a, b) => b.date.localeCompare(a.date));
  const time = db.time.filter(t => t.jobId === j.id).sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start));
  const byCode = {}; time.forEach(t => { byCode[t.costCode || 'No cost code'] = (byCode[t.costCode || 'No cost code'] || 0) + num(t.hours); });
  return `<h2 class="sec-title">Daily reports</h2>` + table([
    { l: 'Date', v: g => fmtDate(g.date) }, { l: 'Crew', v: g => esc(crewName(g.crewId)) }, { l: 'Hours', r: true, v: g => fix(g.manHours, 1) },
    { l: 'Material', v: g => [num(g.hmaTons) && `${fix(g.hmaTons)} t HMA`, num(g.concreteCY) && `${fix(g.concreteCY)} CY`, num(g.baseTons) && `${fix(g.baseTons)} t base`].filter(Boolean).join(' · ') },
    { l: 'Completed', v: g => esc(g.qtyDesc || '') }, { l: 'Signed', v: g => g.signedBy ? esc(g.signedBy) : '<span class="badge badge--yellow">Not signed</span>' },
  ], logs, { onRow: g => `data-act="log-edit" data-id="${g.id}"`, emptyText: 'No daily reports for this job yet.' })
  + `<h2 class="sec-title">Time</h2>` + (time.length ? stats(Object.entries(byCode).map(([k, h]) => [k, fmtHours(h)])) : '') + table([
    { l: 'Date', v: t => fmtDate(t.date) }, { l: 'Person', v: t => esc(staffName(t.staffId)) }, { l: 'Cost code', v: t => esc(t.costCode || '') },
    { l: 'In – out', v: t => `${fmtTime(t.start)} – ${t.end ? fmtTime(t.end) : 'now'}` }, { l: 'Hours', r: true, v: t => t.end ? fmtHours(t.hours) : '<span class="badge badge--yellow">On clock</span>' }, { l: 'Status', v: t => badge(t.status) },
  ], time, { onRow: t => `data-act="time-edit" data-id="${t.id}"`, emptyText: 'No time clocked to this job yet.' });
}

/* ---------------------------------------------------------------- billing */
function billing(j) {
  const rows = db.invoices.filter(i => i.jobId === j.id).sort((a, b) => (b.issued || '').localeCompare(a.issued || ''));
  const inv = jobInvoiced(j), c = contract(j);
  return `${pendingCOs(j).length ? `<p class="alert">${icon('dollar')} ${pendingCOs(j).length} change order${pendingCOs(j).length === 1 ? ' is' : 's are'} still pending — settle ${pendingCOs(j).length === 1 ? 'it' : 'them'} before the final invoice.</p>` : ''}
    <div class="toolbar">${stats([['Contract', money(c)], ['Invoiced', money(inv)], ['Collected', money(jobCollected(j))], ['Left to bill', money(Math.max(0, c - inv))]])}${btn('New invoice', 'job-invoice', { ic: 'plus', attrs: `data-id="${j.id}"` })}</div>` + table([
    { l: 'Invoice', v: i => `<strong>${esc(i.number)}</strong> ${qbBadge(i)}` }, { l: 'Issued', v: i => fmtDate(i.issued) }, { l: 'Due', v: i => fmtDate(i.due) },
    { l: 'Amount', r: true, v: i => money(i.amount) }, { l: 'Balance', r: true, v: i => money(invBalance(i)) }, { l: 'Status', v: i => badge(invStatus(i)) },
  ], rows, { onRow: i => `data-act="inv-edit" data-id="${i.id}"`, emptyText: 'Not invoiced yet.' });
}
act({ 'job-invoice'(el) { openInvoice(null, { jobId: el.dataset.id }); } });
