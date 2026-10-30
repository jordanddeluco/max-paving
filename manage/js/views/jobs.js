/* Jobs: list + job page (overview, budget vs actual, reports, time, billing). */
import { $, esc, num, round, money, fix, pct, today, fmtDate, shortDate, fmtTime, fmtHours, icon, badge, uid, CATS, JOB_STATUSES } from '../core.js';
import { db, S, put, del, find, can, nextNumber, role } from '../store.js';
import { act, onSubmit, hero, tabs, card, kpi, btn, linkBtn, table, f, formDrawer, closeDrawer, collect, validate, toast, confirmTwice, custName, crewName, crewDot, staffName, jobLabel, ui, chips, filter, bar, stats, qbBadge } from '../ui.js';
import { jobActuals, costStatus, COST_KEYS } from '../calc.js';
import { jobInvoiced, jobCollected, invStatus, invBalance, warrantyOf, warrantyStatus, estTotals, jobDays } from '../derive.js';
import { openLog } from './crew.js';
import { openInvoice } from './billing.js';

export default {
  title: 'Jobs',
  roles: ['owner', 'office', 'estimator', 'foreman', 'crew'],
  badge: () => db.jobs.filter(j => j.status === 'In progress' && j.budget && costStatus(jobActuals(j, db, db.settings), j.budget, j.pct).label === 'At risk').length,
  render(r) { return r.parts[0] ? jobPage(r.parts[0], r.parts[1] || 'overview') : list(); },
};

/* ---------------------------------------------------------------- list */
function list() {
  const st = filter('jobs', 'Open');
  const all = db.jobs.slice().sort((a, b) => (b.start || '9999').localeCompare(a.start || '9999') || (b.number || '').localeCompare(a.number || ''));
  const isOpen = j => !['Complete', 'On hold'].includes(j.status);
  const rows = st.s === 'All' ? all : st.s === 'Open' ? all.filter(isOpen) : all.filter(j => j.status === st.s);
  const counts = { All: all.length, Open: all.filter(isOpen).length, ...Object.fromEntries(JOB_STATUSES.map(s => [s, all.filter(j => j.status === s).length])) };
  return hero({
    eyebrow: 'Build', title: 'Jobs', sub: 'Sold work from scheduled to complete — progress, budget vs actual, and billing in one place.',
    actions: can.write('jobs') ? btn('New job', 'job-new', { ic: 'plus' }) : '',
  }) + `<div class="page">
    <div class="toolbar"><input class="search" type="search" placeholder="Search jobs…" value="${esc(st.q)}" data-on-input="search" data-key="jobs" aria-label="Search jobs">${chips('jobs', ['Open', ...JOB_STATUSES, 'All'], st.s, counts)}</div>
    ${table([
      { l: 'Job', v: j => `<strong>${esc(j.number)} · ${esc(j.name)}</strong> ${qbBadge(j)}<small class="muted block">${esc(custName(j.customerId))}</small>`, text: j => `${j.number} ${j.name} ${custName(j.customerId)} ${j.address || ''}` },
      { l: 'Crew', v: j => j.crewId ? `${crewDot(j.crewId)} ${esc(crewName(j.crewId))}` : '<span class="muted">Unassigned</span>' },
      { l: 'Dates', v: j => j.start ? `${shortDate(j.start)}${j.end && j.end !== j.start ? ' – ' + shortDate(j.end) : ''}` : '<span class="badge badge--yellow">Not scheduled</span>' },
      can.money() && { l: 'Value', r: true, v: j => money(j.value) },
      { l: 'Progress', v: j => `<span class="progress">${bar(num(j.pct), 100)}<small>${fix(j.pct, 0)}%</small></span>` },
      can.money() && { l: 'Budget', v: j => { const s = j.budget && costStatus(jobActuals(j, db, db.settings), j.budget, j.pct); return s ? `<span class="badge badge--${s.tone}">${s.label}</span>` : ''; } },
      { l: 'Status', v: j => badge(j.status) },
    ].filter(Boolean), rows, { onRow: j => `data-act="job-open" data-id="${j.id}"`, emptyText: 'No jobs here.' })}
  </div>`;
}
act({ 'job-open': el => { location.hash = `jobs/${el.dataset.id}`; } });

/* ---------------------------------------------------------------- job form */
const JOB_FIELDS = () => [
  f('name', 'Job name', 'text', { req: true, wide: true }),
  f('customerId', 'Customer', 'ref', { ref: 'customers', req: true }), f('number', 'Job #'),
  f('address', 'Job address', 'text', { wide: true }),
  f('type', 'Work type', 'select', { o: [...CATS.filter(c => c !== 'General'), 'Mixed'], noBlank: true }), f('crewId', 'Crew', 'select', { o: () => db.settings.crews.map(c => [c.id, c.name]), blank: 'Unassigned' }),
  f('start', 'Start', 'date'), f('end', 'Finish', 'date'),
  f('status', 'Status', 'select', { o: JOB_STATUSES, noBlank: true }), f('pct', '% complete', 'number'),
  can.money() && f('value', 'Contract value', 'money'), f('completed', 'Completed on (starts the warranty)', 'date'),
  f('notes', 'Notes for the crew', 'textarea', { wide: true }),
].filter(Boolean);
export function openJob(id, preset = {}) {
  const j = id ? find('jobs', id) : { number: nextNumber('jobs', 'J-', 1001), status: 'Scheduled', type: 'Asphalt', pct: 0, ...preset };
  formDrawer({ eyebrow: 'Job', title: id ? esc(jobLabel(j)) : 'New job', fields: JOB_FIELDS(), rec: j, submit: 'job-save', id, del: id && can.write('jobs') ? 'job-del' : '' });
}
act({
  'job-new': () => openJob(), 'job-edit': el => openJob(el.dataset.id || route_id()),
  async 'job-del'(el) {
    const id = el.closest('form').dataset.id;
    if (db.invoices.some(i => i.jobId === id) || db.time.some(t => t.jobId === id)) return toast('This job has time or invoices — mark it complete or on hold instead.', 'bad');
    if (!confirmTwice(el, 'Click again to delete')) return;
    await del('jobs', id); closeDrawer(); location.hash = 'jobs'; toast('Job deleted.');
  },
  async 'job-complete'(el) {
    const j = find('jobs', el.dataset.id);
    await put('jobs', { ...j, status: 'Complete', pct: 100, completed: j.completed || today() });
    ui.rerender(); toast(`${j.number} complete — the ${db.settings.warrantyMonths}-month warranty starts today.`);
  },
});
const route_id = () => location.hash.split('/')[1];
onSubmit({
  async 'job-save'(form) {
    const fields = JOB_FIELDS(); if (!validate(form, fields)) return;
    const v = collect(form, fields), prev = form.dataset.id ? find('jobs', form.dataset.id) : null;
    if (v.start && v.end && v.end < v.start) return toast('Finish is before start.', 'bad');
    if (v.start && !v.end) v.end = v.start;
    if (v.status === 'Complete' && !v.completed) v.completed = v.end || today();
    if (v.status === 'Complete') v.pct = 100;
    const rec = await put('jobs', { ...(prev || { id: uid() }), ...v });
    closeDrawer();
    if (!prev) location.hash = `jobs/${rec.id}`; else ui.rerender();
    toast('Job saved.');
  },
});

/* ---------------------------------------------------------------- job page */
function jobPage(id, tab) {
  const j = find('jobs', id);
  if (!j) return hero({ title: 'Job not found', back: '#jobs' });
  const money_ = can.money();
  const T = [['overview', 'Overview'], money_ && ['costs', 'Budget vs actual'], ['reports', 'Daily reports', db.logs.filter(g => g.jobId === id).length || ''], role() !== 'crew' && ['time', 'Time'], money_ && ['billing', 'Billing']];
  const mapUrl = j.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(j.address)}` : '';
  const body = { overview, costs, reports, time, billing }[tab] || overview;
  return hero({
    back: '#jobs', eyebrow: `${esc(j.number)} · ${badge(j.status)}`, title: esc(j.name),
    meta: `<span>${icon('users')}${esc(custName(j.customerId))}</span>${j.address ? `<a href="${mapUrl}" target="_blank" rel="noopener">${icon('map')}${esc(j.address)}</a>` : ''}<span>${crewDot(j.crewId)}${esc(crewName(j.crewId))}</span><span>${icon('calendar')}${j.start ? `${fmtDate(j.start)}${j.end && j.end !== j.start ? ' – ' + fmtDate(j.end) : ''}` : 'Not scheduled'}</span>`,
    actions: [
      can.write('logs') ? btn('Daily report', 'log-new', { kind: 'outline', ic: 'clipboard', attrs: `data-job="${j.id}"` }) : '',
      money_ ? btn('Invoice', 'job-invoice', { kind: 'outline', ic: 'dollar', attrs: `data-id="${j.id}"` }) : '',
      can.write('jobs') ? btn('Edit', 'job-edit', { kind: 'outline', attrs: `data-id="${j.id}"` }) : '',
      can.write('jobs') && j.status !== 'Complete' ? btn('Mark complete', 'job-complete', { ic: 'check', attrs: `data-id="${j.id}"` }) : '',
    ].join(''),
  }) + tabs(T, tab, `jobs/${id}`) + `<div class="page">${body(j)}</div>`;
}

function overview(j) {
  const est = j.estimateId && find('estimates', j.estimateId);
  const scope = est ? estTotals(est).contract.sections.flatMap(s => s.lines) : [];
  const inv = jobInvoiced(j), col = jobCollected(j);
  const w = warrantyOf(j);
  const logs = db.logs.filter(g => g.jobId === j.id).sort((a, b) => b.date.localeCompare(a.date));
  return `<div class="grid-2">
    <div class="stack">
      ${card('Progress', `<div class="big-progress"><strong>${fix(j.pct, 0)}%</strong>${bar(num(j.pct), 100, 'lg')}</div>
        ${j.budget ? stats([['Days on site', new Set(logs.map(g => g.date)).size + ' of ' + fix(j.budget.days, 1)], ['Planned', jobDays(j) ? jobDays(j) + ' days' : '—']]) : ''}
        <small class="muted">% complete is updated from each daily report.</small>`, { eyebrow: 'Where it stands' })}
      ${scope.length ? card('Scope', `<ul class="scope">${scope.map(l => `<li><span>${esc(l.desc)}</span><b>${fix(l.qty, 0)} ${esc(l.unit)}</b></li>`).join('')}</ul>${est ? `<a class="small" href="#estimates/${est.id}">Open ${esc(est.number)} →</a>` : ''}`, { eyebrow: 'From the estimate' }) : ''}
      ${j.notes ? card('Notes for the crew', `<p>${esc(j.notes)}</p>`) : ''}
    </div>
    <div class="stack">
      ${can.money() ? card('Contract', stats([['Contract', money(j.value)], ['Invoiced', money(inv)], ['Collected', money(col)], ['Left to bill', money(Math.max(0, num(j.value) - inv)), num(j.value) - inv > 1 && j.status === 'Complete' ? 'warn' : '']]), { eyebrow: 'Money' }) : ''}
      ${card('Latest daily reports', logs.length ? `<ul class="mini-list">${logs.slice(0, 4).map(g => `<li data-act="log-edit" data-id="${g.id}" tabindex="0"><strong>${fmtDate(g.date)}</strong><span>${esc(g.qtyDesc || g.notes || 'Report')}</span>${g.signedBy ? '' : '<span class="badge badge--yellow">Not signed</span>'}</li>`).join('')}</ul>` : '<p class="muted">No reports yet.</p>', { eyebrow: 'From the field' })}
      ${w ? card('Warranty', `<p>${badge(warrantyStatus(j))} One-year workmanship warranty until <strong>${fmtDate(w)}</strong>.</p>`, { eyebrow: 'After completion' }) : ''}
    </div>
  </div>`;
}

function costs(j) {
  if (!j.budget) return card('No budget yet', '<p>Jobs created from an accepted estimate carry its budget automatically. This job was added by hand, so there’s nothing to compare against — actual costs still add up below.</p>') + actualsOnly(j);
  const a = jobActuals(j, db, db.settings), b = j.budget, st = costStatus(a, b, j.pct);
  const projMargin = num(j.value) ? (num(j.value) - st.projected) / num(j.value) : 0, estMargin = num(j.value) ? (num(j.value) - b.total) / num(j.value) : 0;
  const row = (label, bud, act_, unit = '$') => { const fmt = v => unit === '$' ? money(v) : `${fix(v, unit === 'CY' ? 1 : 0)} ${unit}`; const ratio = bud ? act_ / bud : 0; return `<tr><td>${label}</td><td class="r">${fmt(bud)}</td><td class="r">${fmt(act_)}</td><td>${bar(act_, Math.max(bud, act_) || 1, ratio > num(j.pct) / 100 + 0.1 ? 'bad' : '')}</td><td class="r">${bud ? Math.round(ratio * 100) + '%' : ''}</td></tr>`; };
  return `<section class="kpis">
      ${kpi('Status', `<span class="txt-${st.tone}">${st.label}</span>`, `Projected ${money(st.projected)} at ${fix(j.pct, 0)}% complete`)}
      ${kpi('Estimated cost', money(b.total), `${pct(estMargin)} margin as bid`)}
      ${kpi('Spent so far', money(a.total), `${b.total ? Math.round(a.total / b.total * 100) : 0}% of budget`)}
      ${kpi('Projected margin', pct(projMargin), projMargin < estMargin - 0.05 ? 'Below the bid margin' : 'In line with the bid', { tone: projMargin < estMargin - 0.05 ? 'alert' : '' })}
    </section>
    ${card('Cost by category', `<div class="table-scroll"><table class="table table--plain"><thead><tr><th>Category</th><th class="r">Budget</th><th class="r">Actual</th><th></th><th class="r">Used</th></tr></thead><tbody>
      ${COST_KEYS.filter(k => b.cost[k] > 0.5 || a.cost[k] > 0.5).map(k => row(k, b.cost[k], a.cost[k])).join('')}
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

function reports(j) {
  const rows = db.logs.filter(g => g.jobId === j.id).sort((a, b) => b.date.localeCompare(a.date));
  return table([
    { l: 'Date', v: g => fmtDate(g.date) }, { l: 'Crew', v: g => esc(crewName(g.crewId)) }, { l: 'Hours', r: true, v: g => fix(g.manHours, 1) },
    { l: 'Material', v: g => [num(g.hmaTons) && `${fix(g.hmaTons)} t HMA`, num(g.concreteCY) && `${fix(g.concreteCY)} CY`, num(g.baseTons) && `${fix(g.baseTons)} t base`].filter(Boolean).join(' · ') },
    { l: 'Completed', v: g => esc(g.qtyDesc || '') }, { l: 'Signed', v: g => g.signedBy ? esc(g.signedBy) : '<span class="badge badge--yellow">Not signed</span>' },
  ], rows, { onRow: g => `data-act="log-edit" data-id="${g.id}"`, emptyText: 'No daily reports for this job yet.' });
}
function time(j) {
  const rows = db.time.filter(t => t.jobId === j.id).sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start));
  const byCode = {}; rows.forEach(t => { byCode[t.costCode || 'No cost code'] = (byCode[t.costCode || 'No cost code'] || 0) + num(t.hours); });
  return (rows.length ? stats(Object.entries(byCode).map(([k, h]) => [k, fmtHours(h)])) : '') + table([
    { l: 'Date', v: t => fmtDate(t.date) }, { l: 'Person', v: t => esc(staffName(t.staffId)) }, { l: 'Cost code', v: t => esc(t.costCode || '') },
    { l: 'In – out', v: t => `${fmtTime(t.start)} – ${t.end ? fmtTime(t.end) : 'now'}` }, { l: 'Hours', r: true, v: t => t.end ? fmtHours(t.hours) : '<span class="badge badge--yellow">On clock</span>' }, { l: 'Status', v: t => badge(t.status) },
  ], rows, { onRow: t => `data-act="time-edit" data-id="${t.id}"`, emptyText: 'No time clocked to this job yet.' });
}
function billing(j) {
  const rows = db.invoices.filter(i => i.jobId === j.id).sort((a, b) => (b.issued || '').localeCompare(a.issued || ''));
  const inv = jobInvoiced(j);
  return `<div class="toolbar">${stats([['Contract', money(j.value)], ['Invoiced', money(inv)], ['Collected', money(jobCollected(j))], ['Left to bill', money(Math.max(0, num(j.value) - inv))]])}${btn('New invoice', 'job-invoice', { ic: 'plus', attrs: `data-id="${j.id}"` })}</div>` + table([
    { l: 'Invoice', v: i => `<strong>${esc(i.number)}</strong> ${qbBadge(i)}` }, { l: 'Issued', v: i => fmtDate(i.issued) }, { l: 'Due', v: i => fmtDate(i.due) },
    { l: 'Amount', r: true, v: i => money(i.amount) }, { l: 'Balance', r: true, v: i => money(invBalance(i)) }, { l: 'Status', v: i => badge(invStatus(i)) },
  ], rows, { onRow: i => `data-act="inv-edit" data-id="${i.id}"`, emptyText: 'Not invoiced yet.' });
}
act({ 'job-invoice'(el) { openInvoice(null, { jobId: el.dataset.id }); } });
