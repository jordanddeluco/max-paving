/* Equipment & docs: equipment, compliance documents, warranties. */
import { esc, num, money, fix, today, fmtDate, daysUntil, inWords, badge, uid } from '../core.js';
import { db, put, del, find, can } from '../store.js';
import { act, onSubmit, hero, tabs, btn, table, f, formDrawer, closeDrawer, collect, validate, toast, confirmTwice, custName, crewName, crewDot, ui, chips, filter } from '../ui.js';
import { eqStatus, expStatus, warrantyOf, warrantyStatus } from '../derive.js';

const TABS = () => [['equipment', 'Equipment', db.equipment.filter(q => eqStatus(q) !== q.status || q.status === 'Down for repair').length || ''], ['compliance', 'Compliance', db.docs.filter(d => expStatus(d.expires) !== 'Current').length || ''], ['warranties', 'Warranties']];
export default {
  title: 'Equipment & docs',
  roles: ['owner', 'office', 'estimator', 'foreman'],
  badge: () => db.docs.filter(d => expStatus(d.expires) === 'Expired').length + db.equipment.filter(q => q.status === 'Down for repair').length,
  render(r) {
    const tab = r.parts[0] || 'equipment';
    return ({ equipment, compliance, warranties }[tab] || equipment)();
  },
};
const page = (tab, h, body) => h + tabs(TABS(), tab, 'office') + `<div class="page">${body}</div>`;

/* ---------------------------------------------------------------- equipment */
const EQ_FIELDS = () => [
  f('unit', 'Unit #'), f('name', 'Name', 'text', { req: true }),
  f('type', 'Type', 'select', { o: ['Paver', 'Roller', 'Skid steer', 'Excavator', 'Loader', 'Milling machine', 'Dump truck', 'Pickup', 'Trailer', 'Concrete equipment', 'Other'] }),
  f('crewId', 'Usually with', 'select', { o: () => db.settings.crews.map(c => [c.id, c.name]), blank: 'Yard / any crew' }),
  f('status', 'Status', 'select', { o: ['Available', 'In use', 'Down for repair'], noBlank: true, def: 'Available' }),
  f('hours', 'Hour meter', 'number', { help: 'Daily reports add hours automatically.' }), f('serviceHours', 'Next service at (hours)', 'number'), f('serviceDue', 'Next service date', 'date'),
  f('vin', 'VIN / serial'), f('plate', 'Plate / DOT #'),
  f('notes', 'Notes & repair history', 'textarea', { wide: true }),
];
function equipment() {
  const st = filter('equipment');
  const all = db.equipment.slice().sort((a, b) => String(a.unit).localeCompare(String(b.unit), undefined, { numeric: true }));
  const states = ['All', 'Available', 'In use', 'Service due', 'Down for repair'];
  const rows = st.s === 'All' ? all : all.filter(q => eqStatus(q) === st.s);
  return page('equipment', hero({ eyebrow: 'Office', title: 'Equipment', sub: 'Pavers, rollers, trucks and machines — hour meters, service dates and what’s down.', actions: can.write('equipment') ? btn('Add equipment', 'eq-new', { ic: 'plus' }) : '' }),
    `<div class="toolbar">${chips('equipment', states, st.s, Object.fromEntries(states.map(s => [s, s === 'All' ? all.length : all.filter(q => eqStatus(q) === s).length])))}</div>` + table([
      { l: 'Unit', v: q => `<strong>${esc(q.unit || '')}</strong>` }, { l: 'Name', v: q => esc(q.name) }, { l: 'Type', v: q => esc(q.type || '') },
      { l: 'With', v: q => q.crewId ? `${crewDot(q.crewId)} ${esc(crewName(q.crewId))}` : '<span class="muted">Yard</span>' },
      { l: 'Hours', r: true, v: q => num(q.hours) ? fix(q.hours, 0) : '' },
      { l: 'Next service', v: q => [num(q.serviceHours) ? `${fix(q.serviceHours, 0)} h` : '', q.serviceDue ? fmtDate(q.serviceDue) : ''].filter(Boolean).join(' · ') },
      { l: 'Status', v: q => badge(eqStatus(q)) },
    ], rows, { onRow: q => `data-act="eq-edit" data-id="${q.id}"` }));
}
act({
  'eq-new': () => formDrawer({ eyebrow: 'Equipment', title: 'Add equipment', fields: EQ_FIELDS(), rec: { status: 'Available' }, submit: 'eq-save' }),
  'eq-edit'(el) { const q = find('equipment', el.dataset.id); formDrawer({ eyebrow: 'Equipment', title: esc(`${q.unit ? q.unit + ' · ' : ''}${q.name}`), fields: EQ_FIELDS(), rec: q, submit: 'eq-save', del: can.write('equipment') ? 'eq-del' : '' }); },
  async 'eq-del'(el) { if (!confirmTwice(el, 'Click again to delete')) return; await del('equipment', el.closest('form').dataset.id); closeDrawer(); ui.rerender(); toast('Equipment removed.'); },
});
onSubmit({ async 'eq-save'(form) { const fl = EQ_FIELDS(); if (!validate(form, fl)) return; const prev = form.dataset.id ? find('equipment', form.dataset.id) : null; await put('equipment', { ...(prev || { id: uid() }), ...collect(form, fl) }); closeDrawer(); ui.rerender(); toast('Saved.'); } });

/* ---------------------------------------------------------------- compliance */
const DOC_FIELDS = () => [
  f('name', 'Document', 'text', { req: true, wide: true }),
  f('kind', 'Kind', 'select', { o: ['Insurance', 'License', 'Bond', 'Vendor registration', 'Certification', 'Other'] }),
  f('issuer', 'Issued by'), f('number', 'Policy / license #'), f('expires', 'Expires', 'date'),
  f('notes', 'Notes', 'textarea', { wide: true }),
];
function compliance() {
  const rows = db.docs.slice().sort((a, b) => (a.expires || '9999').localeCompare(b.expires || '9999'));
  return page('compliance', hero({ eyebrow: 'Office', title: 'Compliance', sub: 'Insurance certificates, licenses, bonds and vendor registrations that municipal and GC work requires. You’re warned 60 days before anything expires.', actions: can.write('docs') ? btn('Add document', 'doc-new', { ic: 'plus' }) : '' }),
    table([
      { l: 'Document', v: d => `<strong>${esc(d.name)}</strong><small class="muted block">${esc(d.issuer || '')}${d.number ? ' · #' + esc(d.number) : ''}</small>` },
      { l: 'Kind', v: d => esc(d.kind || '') },
      { l: 'Expires', v: d => d.expires ? `${fmtDate(d.expires)} <small class="muted">(${inWords(daysUntil(d.expires))})</small>` : '<span class="muted">—</span>' },
      { l: 'Status', v: d => badge(expStatus(d.expires)) },
    ], rows, { onRow: d => `data-act="doc-edit" data-id="${d.id}"` }));
}
act({
  'doc-new': () => formDrawer({ eyebrow: 'Compliance', title: 'Add document', fields: DOC_FIELDS(), rec: {}, submit: 'doc-save' }),
  'doc-edit'(el) { const d = find('docs', el.dataset.id); formDrawer({ eyebrow: 'Compliance', title: esc(d.name), fields: DOC_FIELDS(), rec: d, submit: 'doc-save', del: can.write('docs') ? 'doc-del' : '' }); },
  async 'doc-del'(el) { if (!confirmTwice(el, 'Click again to delete')) return; await del('docs', el.closest('form').dataset.id); closeDrawer(); ui.rerender(); toast('Document removed.'); },
});
onSubmit({ async 'doc-save'(form) { const fl = DOC_FIELDS(); if (!validate(form, fl)) return; const prev = form.dataset.id ? find('docs', form.dataset.id) : null; await put('docs', { ...(prev || { id: uid() }), ...collect(form, fl) }); closeDrawer(); ui.rerender(); toast('Saved.'); } });

/* ---------------------------------------------------------------- warranties */
function warranties() {
  const st = filter('warranties');
  const all = db.jobs.filter(j => warrantyOf(j)).sort((a, b) => warrantyOf(a).localeCompare(warrantyOf(b)));
  const states = ['All', 'Active', 'Expiring', 'Expired'];
  const rows = st.s === 'All' ? all : all.filter(j => warrantyStatus(j) === st.s);
  return page('warranties', hero({ eyebrow: 'Office', title: 'Warranties', sub: `Every completed job carries a ${db.settings.warrantyMonths}-month written warranty on labor and workmanship. Walk the work with the customer before it ends.` }),
    `<div class="toolbar">${chips('warranties', states, st.s, Object.fromEntries(states.map(s => [s, s === 'All' ? all.length : all.filter(j => warrantyStatus(j) === s).length])))}</div>` + table([
      { l: 'Job', v: j => `<strong>${esc(j.number)} · ${esc(j.name)}</strong>` }, { l: 'Customer', v: j => esc(custName(j.customerId)) },
      { l: 'Completed', v: j => fmtDate(j.completed) }, { l: 'Warranty ends', v: j => `${fmtDate(warrantyOf(j))} <small class="muted">(${inWords(daysUntil(warrantyOf(j)))})</small>` },
      { l: 'Status', v: j => badge(warrantyStatus(j)) },
    ], rows, { onRow: j => `data-act="job-open" data-id="${j.id}"`, emptyText: 'Completed jobs show up here with their warranty dates.' }));
}
