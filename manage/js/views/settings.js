/* Settings: company & rules, crews & rates, cost book, assemblies, users, QuickBooks, data. */
import { $, $$, esc, num, money, fix, today, fmtDate, icon, badge, uid, UNITS, CATS, COST_TYPES } from '../core.js';
import { db, S, put, find, can, saveSettings, api, clearSample, resetLocal, exportData, importData, pull } from '../store.js';
import { act, onSubmit, onChange, hero, tabs, card, btn, linkBtn, table, f, fieldHtml, formDrawer, openDrawer, closeDrawer, collect, validate, toast, confirmTwice, ui, download, csv, custName, staffName, crewName, stats } from '../ui.js';
import { crewDayLabor, crewDayCost, costLine } from '../calc.js';
import { resetWeather } from '../weather.js';

const TABS = () => [['company', 'Company & rules'], ['crews', 'Crews & rates'], ['costbook', 'Cost book'], ['assemblies', 'Assemblies'], S.mode === 'server' && can.users() && ['users', 'Users'], ['quickbooks', 'QuickBooks'], ['data', 'Data']];
export default {
  title: 'Settings',
  roles: ['owner', 'office'],
  render(r) {
    const tab = r.parts[0] || 'company';
    const out = ({ company, crews, costbook, assemblies, users, quickbooks, data }[tab] || company)(r);
    return typeof out === 'string' ? { html: out } : out;
  },
};
const page = (tab, sub, body, actions = '') => hero({ eyebrow: 'Settings', title: TABS().find(t => t && t[0] === tab)[1], sub, actions }) + tabs(TABS(), tab, 'settings') + `<div class="page">${body}</div>`;
const saveBtn = a => btn('Save changes', a, { ic: 'check' });
const sField = (k, l, t = 'number', extra = {}) => fieldHtml({ ...f(k, l, t, extra) }, db.settings[k] ?? '');
function readInto(form, keys) { keys.forEach(k => { const el = form.elements[k]; if (!el) return; db.settings[k] = el.type === 'number' ? num(el.value) : el.type === 'checkbox' ? el.checked : el.value.trim(); }); }

/* ---------------------------------------------------------------- company & rules */
function company() {
  const c = db.settings.company;
  return page('company', 'Who you are, and the rules the panel uses for weather, warranties, payment terms and overtime.', `
    <form data-submit="set-company" class="settings-grid">
      ${card('Company', `<div class="fields">${['name', 'phone', 'email', 'website'].map(k => fieldHtml(f('c_' + k, k[0].toUpperCase() + k.slice(1)), c[k] || '')).join('')}${fieldHtml(f('c_address', 'Address', 'text', { wide: true }), c.address || '')}</div>`)}
      ${card('Terms & follow-ups', `<div class="fields">${sField('warrantyMonths', 'Warranty (months)')}${sField('termsDays', 'Invoice terms (days)')}${sField('proposalValidDays', 'Proposals valid for (days)')}${sField('followUpDays', 'Remind me to follow up on proposals after (days)')}</div>`)}
      ${card('Weather go / no-go', `<p class="muted small">Rules of thumb for the badges on Home and the Schedule. The project or city spec always governs.</p><div class="fields">${sField('asphaltMinF', 'Asphalt minimum air temp (°F)')}${sField('concreteMinF', 'Concrete minimum overnight low (°F)')}${sField('rainMaxPct', 'Rain chance that stops work (%)')}${sField('lat', 'Forecast latitude')}${sField('lon', 'Forecast longitude')}</div>`)}
      ${card('Time & payroll', `<div class="fields">${sField('otHours', 'Overtime after (hours per week)')}${fieldHtml(f('workSaturday', 'Crews work Saturdays (schedule + rain days)', 'check', { wide: true }), db.settings.workSaturday)}${fieldHtml(f('estimators', 'Estimators (comma-separated)', 'text', { wide: true }), db.settings.estimators.join(', '))}</div>`)}
      <div class="settings-grid__save">${saveBtn('set-save-company')}</div>
    </form>`);
}
act({ 'set-save-company'(el) { el.closest('form').requestSubmit(); } });
onSubmit({
  async 'set-company'(form) {
    ['name', 'phone', 'email', 'website', 'address'].forEach(k => { db.settings.company[k] = form.elements['c_' + k].value.trim(); });
    readInto(form, ['warrantyMonths', 'termsDays', 'proposalValidDays', 'followUpDays', 'asphaltMinF', 'concreteMinF', 'rainMaxPct', 'lat', 'lon', 'otHours', 'workSaturday']);
    db.settings.estimators = form.elements.estimators.value.split(',').map(s => s.trim()).filter(Boolean);
    resetWeather(); await saveSettings(); ui.rerender(); toast('Settings saved.');
  },
});

/* ---------------------------------------------------------------- crews & rates */
function crews() {
  const s = db.settings;
  return page('crews', 'Each crew’s size, average pay and equipment cost become the loaded day rates every estimate uses.', `
    <form data-submit="set-crews">
      ${card('Labor burden', `<div class="fields">${sField('burdenPct', 'Burden on wages — payroll taxes, workers’ comp, insurance (%)', 'number', { help: 'Added to every pay rate for estimating and job costing.' })}</div>`)}
      <div class="crew-rates">${s.crews.map((c, i) => card('', `
        <div class="crew-rates__head"><input type="color" name="color_${i}" value="${esc(c.color)}" aria-label="Crew color"><input name="name_${i}" value="${esc(c.name)}" class="crew-rates__name" aria-label="Crew name"><select name="cat_${i}" aria-label="Main work">${CATS.map(x => `<option${x === c.cat ? ' selected' : ''}>${x}</option>`).join('')}</select>${s.crews.length > 1 ? `<button type="button" class="x" data-act="crew-del" data-i="${i}" aria-label="Remove crew">×</button>` : ''}</div>
        <div class="fields fields--4">
          ${fieldHtml(f(`size_${i}`, 'People', 'number'), c.size)}${fieldHtml(f(`hours_${i}`, 'Hours / day', 'number'), c.hoursPerDay)}
          ${fieldHtml(f(`rate_${i}`, 'Avg pay ($/h)', 'money'), c.avgRate)}${fieldHtml(f(`equip_${i}`, 'Equipment $/day', 'money'), c.equipDayCost)}
        </div>
        ${stats([['Labor / day', money(crewDayLabor(c, s))], ['Equipment / day', money(c.equipDayCost)], ['Crew-day cost', money(crewDayCost(c, s))]])}`, { cls: 'crew-rate', eyebrow: '' }).replace('class="card crew-rate"', `class="card crew-rate" style="--c:${esc(c.color)}"`)).join('')}</div>
      <div class="btn-row">${btn('Add crew', 'crew-add', { kind: 'ghost', ic: 'plus' })}${saveBtn('set-save-crews')}</div>
    </form>`);
}
act({
  'set-save-crews'(el) { el.closest('form').requestSubmit(); },
  async 'crew-add'() { db.settings.crews.push({ id: uid(), name: 'New crew', cat: 'Asphalt', size: 4, hoursPerDay: 10, avgRate: 28, equipDayCost: 800, color: '#2563c9' }); await saveSettings(); ui.rerender(); },
  async 'crew-del'(el) {
    const c = db.settings.crews[+el.dataset.i];
    if (db.jobs.some(j => j.crewId === c.id && j.status !== 'Complete') || db.staff.some(p => p.crewId === c.id)) return toast('Move this crew’s people and open jobs first.', 'bad');
    if (!confirmTwice(el, 'Remove?')) return;
    db.settings.crews.splice(+el.dataset.i, 1); await saveSettings(); ui.rerender();
  },
});
onSubmit({
  async 'set-crews'(form) {
    const e = form.elements;
    db.settings.burdenPct = num(e.burdenPct.value);
    db.settings.crews.forEach((c, i) => Object.assign(c, { name: e[`name_${i}`].value.trim() || c.name, cat: e[`cat_${i}`].value, color: e[`color_${i}`].value, size: num(e[`size_${i}`].value), hoursPerDay: num(e[`hours_${i}`].value) || 10, avgRate: num(e[`rate_${i}`].value), equipDayCost: num(e[`equip_${i}`].value) }));
    await saveSettings(); ui.rerender(); toast('Crew rates saved. New estimate lines use them right away.');
  },
});

/* ---------------------------------------------------------------- cost book */
function costbook() {
  const s = db.settings;
  const row = c => `<tr data-id="${c.id}"><td><input name="name" value="${esc(c.name)}" aria-label="Item"></td><td><select name="unit" aria-label="Unit">${UNITS.map(u => `<option${u === c.unit ? ' selected' : ''}>${u}</option>`).join('')}</select></td>
    <td class="r"><input name="cost" type="number" step="0.01" value="${esc(c.cost)}" aria-label="Cost"></td><td><select name="type" aria-label="Cost type">${COST_TYPES.map(t => `<option${t === c.type ? ' selected' : ''}>${t}</option>`).join('')}</select></td>
    <td><select name="cat" aria-label="Category">${CATS.map(t => `<option${t === c.cat ? ' selected' : ''}>${t}</option>`).join('')}</select></td><td><button type="button" class="x" data-act="cb-del" aria-label="Remove">×</button></td></tr>`;
  return page('costbook', 'Your unit costs for materials, trucking, subcontractors and fees. Update them when plant or ready-mix prices change — every assembly uses them.', `
    ${s.sampleRates ? '<p class="note">These are placeholder costs so the sample estimates add up. Replace them with what you actually pay.</p>' : ''}
    <form data-submit="set-costbook"><div class="card table-card"><div class="lines__scroll"><table class="lines__table cb"><thead><tr><th>Item</th><th>Unit</th><th class="r">Your cost</th><th>Cost type</th><th>Category</th><th></th></tr></thead><tbody>${s.costBook.map(row).join('')}</tbody></table></div></div>
    <div class="btn-row">${btn('Add item', 'cb-add', { kind: 'ghost', ic: 'plus' })}${saveBtn('set-save-cb')}</div></form>`);
}
act({
  'set-save-cb'(el) { el.closest('form').requestSubmit(); },
  'cb-add'() { $('.cb tbody').insertAdjacentHTML('beforeend', `<tr data-id="${uid()}"><td><input name="name" placeholder="New item" aria-label="Item"></td><td><select name="unit">${UNITS.map(u => `<option>${u}</option>`).join('')}</select></td><td class="r"><input name="cost" type="number" step="0.01" aria-label="Cost"></td><td><select name="type">${COST_TYPES.map(t => `<option>${t}</option>`).join('')}</select></td><td><select name="cat">${CATS.map(t => `<option>${t}</option>`).join('')}</select></td><td><button type="button" class="x" data-act="cb-del" aria-label="Remove">×</button></td></tr>`); $('.cb tbody tr:last-child input').focus(); },
  'cb-del'(el) {
    const id = el.closest('tr').dataset.id;
    if (db.settings.assemblies.some(a => a.parts.some(p => p.item === id))) return toast('An assembly uses this item — remove it there first.', 'bad');
    el.closest('tr').remove();
  },
});
onSubmit({
  async 'set-costbook'(form) {
    db.settings.costBook = $$('.cb tbody tr', form).map(tr => ({ id: tr.dataset.id, name: $('[name=name]', tr).value.trim(), unit: $('[name=unit]', tr).value, cost: num($('[name=cost]', tr).value), type: $('[name=type]', tr).value, cat: $('[name=cat]', tr).value })).filter(c => c.name);
    db.settings.sampleRates = false;
    await saveSettings(); ui.rerender(); toast('Cost book saved.');
  },
});

/* ---------------------------------------------------------------- assemblies */
const RULES = [['per', 'Qty × factor (per unit)'], ['hma', 'Hot-mix tons for the depth'], ['base', 'Base rock tons at factor inches'], ['conc', 'Concrete CY for the depth'], ['haul', 'Truck hours for the tons above'], ['fixed', 'Fixed quantity = factor']];
function assemblies() {
  const s = db.settings;
  const sample = a => { const r = costLine({ kind: 'assembly', assemblyId: a.id, qty: a.unit === 'SY' ? 1000 : a.unit === 'SF' ? 1000 : a.unit === 'LF' ? 100 : a.unit === 'CY' ? 50 : 1 }, s); return r.qty ? r.total / r.qty : 0; };
  return page('assemblies', 'Bundles of materials, crew time, equipment and trucking priced per unit. Pick one on an estimate, type the quantity — the rest is calculated.', `
    <form data-submit="set-estdefaults">${card('Estimating defaults', `<div class="fields fields--4">
      ${sField('overheadPct', 'Overhead (%)')}${sField('marginPct', 'Target margin (%)')}${sField('hmaLbPerSyIn', 'Hot-mix lb per SY-inch', 'number', { help: '110 is the common rule; use your mix design.' })}${sField('baseDensity', 'Base rock lb/ft³ (compacted)')}
      ${sField('wastePct', 'Asphalt & base waste (%)')}${sField('concreteWastePct', 'Concrete waste (%)')}${sField('truckTons', 'Tons per truck')}${sField('loadMin', 'Load + dump time (min)')}${sField('haulMin', 'Default haul (min one way)')}
    </div><div class="btn-row">${saveBtn('set-save-defaults')}</div>`, { eyebrow: 'Used by every estimate' })}</form>
    <div class="toolbar"><span></span>${btn('New assembly', 'as-new', { ic: 'plus' })}</div>
    ${table([
      { l: 'Assembly', v: a => `<strong>${esc(a.name)}</strong><small class="muted block">${esc(a.parts.map(p => (s.costBook.find(c => c.id === p.item) || {}).name).filter(Boolean).join(' · '))}</small>` },
      { l: 'Category', v: a => esc(a.cat) }, { l: 'Unit', v: a => esc(a.unit) }, { l: 'Depth', r: true, v: a => num(a.thick) ? a.thick + '"' : '' },
      { l: 'Production', r: true, v: a => `${fix(a.prod, 0)} ${esc(a.unit)}/day` }, { l: 'Crew', v: a => esc(crewName(a.crew)) },
      { l: 'Cost / unit', r: true, v: a => money(sample(a), true) },
    ], s.assemblies, { onRow: a => `data-act="as-edit" data-id="${a.id}"` })}`);
}
act({ 'set-save-defaults'(el) { el.closest('form').requestSubmit(); } });
onSubmit({ async 'set-estdefaults'(form) { readInto(form, ['overheadPct', 'marginPct', 'hmaLbPerSyIn', 'baseDensity', 'wastePct', 'concreteWastePct', 'truckTons', 'loadMin', 'haulMin']); await saveSettings(); ui.rerender(); toast('Estimating defaults saved.'); } });
function partsEditor(parts) {
  const row = p => `<div class="part-row"><select name="p_item" aria-label="Cost item">${db.settings.costBook.map(c => `<option value="${c.id}"${c.id === p.item ? ' selected' : ''}>${esc(c.name)} (${c.unit})</option>`).join('')}</select>
    <select name="p_rule" aria-label="How the quantity is figured">${RULES.map(([v, l]) => `<option value="${v}"${v === p.rule ? ' selected' : ''}>${l}</option>`).join('')}</select>
    <input name="p_factor" type="number" step="any" value="${esc(p.factor ?? 1)}" aria-label="Factor"><button type="button" class="x" data-act="part-del" aria-label="Remove">×</button></div>`;
  return `<div class="parts-ed">${parts.map(row).join('')}</div>${btn('Add part', 'part-add', { kind: 'ghost', size: 'sm', ic: 'plus' })}<small class="field__help">Crew labor and equipment are added automatically from the production rate and the crew’s day rates.</small><template id="part-tpl">${row({ item: db.settings.costBook[0]?.id, rule: 'per', factor: 1 })}</template>`;
}
const AS_FIELDS = () => [
  f('name', 'Name', 'text', { req: true, wide: true }), f('cat', 'Category', 'select', { o: CATS, noBlank: true }), f('unit', 'Priced per', 'select', { o: ['SY', 'SF', 'LF', 'CY', 'EA', 'LS'], noBlank: true }),
  f('thick', 'Default depth (inches)', 'number', { help: 'Used by hot-mix and concrete parts. 0 if not depth-based.' }), f('prod', 'Production (units per crew-day)', 'number', { req: true }),
  f('crew', 'Crew', 'select', { o: () => db.settings.crews.map(c => [c.id, c.name]), noBlank: true }),
  f('parts', 'Materials, trucking & subs', 'html', { wide: true, html: v => partsEditor(v || []) }),
];
act({
  'as-new': () => formDrawer({ eyebrow: 'Assembly', title: 'New assembly', fields: AS_FIELDS(), rec: { cat: 'Asphalt', unit: 'SY', thick: 2, prod: 1000, crew: db.settings.crews[0]?.id, parts: [] }, submit: 'as-save', wide: true }),
  'as-edit'(el) { const a = db.settings.assemblies.find(x => x.id === el.dataset.id); formDrawer({ eyebrow: 'Assembly', title: esc(a.name), fields: AS_FIELDS(), rec: a, submit: 'as-save', id: a.id, wide: true, del: 'as-del', footer: btn('Duplicate', 'as-dup', { kind: 'ghost', size: 'sm', ic: 'copy' }) }); },
  'part-add'(el) { $('.parts-ed', el.closest('.field')).insertAdjacentHTML('beforeend', $('#part-tpl').innerHTML); },
  'part-del'(el) { el.closest('.part-row').remove(); },
  async 'as-del'(el) {
    const id = el.closest('form').dataset.id;
    if (db.estimates.some(e => (e.lines || []).some(l => l.assemblyId === id))) return toast('Estimates use this assembly — keep it so they still add up.', 'bad');
    if (!confirmTwice(el, 'Click again to delete')) return;
    db.settings.assemblies = db.settings.assemblies.filter(a => a.id !== id); await saveSettings(); closeDrawer(); ui.rerender(); toast('Assembly deleted.');
  },
  async 'as-dup'(el) { const a = db.settings.assemblies.find(x => x.id === el.closest('form').dataset.id); db.settings.assemblies.push({ ...JSON.parse(JSON.stringify(a)), id: uid(), name: a.name + ' (copy)' }); await saveSettings(); closeDrawer(); ui.rerender(); toast('Duplicated.'); },
});
onSubmit({
  async 'as-save'(form) {
    const fl = AS_FIELDS(); if (!validate(form, fl)) return;
    const v = collect(form, fl);
    const items = $$('[name=p_item]', form), rules = $$('[name=p_rule]', form), facs = $$('[name=p_factor]', form);
    v.parts = items.map((x, i) => ({ item: x.value, rule: rules[i].value, factor: num(facs[i].value) }));
    const prev = form.dataset.id && db.settings.assemblies.find(a => a.id === form.dataset.id);
    if (prev) Object.assign(prev, v); else db.settings.assemblies.push({ id: uid(), ...v });
    await saveSettings(); closeDrawer(); ui.rerender(); toast('Assembly saved.');
  },
});

/* ---------------------------------------------------------------- users (server) */
function users() {
  if (S.mode !== 'server') return page('users', '', card('Logins need the server', '<p>Run the Max Paving server to give each person their own login. See Settings → Data.</p>'));
  return {
    html: page('users', 'Everyone who can sign in, and what they can see. Field roles never see prices or pay rates.', `<div id="users-box"><p class="muted">Loading…</p></div>
      ${card('What each role can do', `<ul class="roles"><li><b>Owner</b> — everything, including logins and QuickBooks.</li><li><b>Office / admin</b> — everything except logins: billing, approvals, QuickBooks, settings.</li><li><b>Estimator</b> — sales, estimates, jobs and schedule. No pay rates or billing.</li><li><b>Foreman</b> — My day, crew clock, daily reports, schedule, equipment. No prices.</li><li><b>Crew</b> — clock in and out, see their own hours and schedule.</li></ul>`)}`, btn('Add login', 'user-new', { ic: 'plus' })),
    after() { loadUsers(); },
  };
}
async function loadUsers() {
  try {
    const r = await api('users'); ui.users = r;
    $('#users-box').innerHTML = table([
      { l: 'Name', v: u => `<strong>${esc(u.name)}</strong><small class="muted block">${esc(u.email)}</small>` },
      { l: 'Role', v: u => esc(u.roleLabel) }, { l: 'Linked to', v: u => esc(staffName(u.staffId)) || '<span class="muted">—</span>' },
      { l: 'Status', v: u => badge(u.active ? 'Active' : 'Inactive') },
    ], r.users, { onRow: u => `data-act="user-edit" data-id="${u.id}"` });
  } catch (e) { $('#users-box').innerHTML = `<p class="alert alert--bad">${esc(e.message)}</p>`; }
}
const USER_FIELDS = isNew => [
  f('name', 'Name', 'text', { req: true }), f('email', 'Email (their sign-in)', 'email', { req: isNew }),
  f('role', 'Role', 'select', { o: () => Object.entries((ui.users || {}).roles || {}), noBlank: true }),
  f('staffId', 'Linked person (for the time clock)', 'select', { o: () => db.staff.map(s => [s.id, s.name]), blank: 'Not linked' }),
  f('password', isNew ? 'Temporary password (10+ characters)' : 'Reset password (leave empty to keep)', 'text', { req: isNew, help: 'Tell them in person; they can change it under their name, top right.' }),
  !isNew && f('active', 'Can sign in', 'check'),
].filter(Boolean);
act({
  'user-new': () => formDrawer({ eyebrow: 'Logins', title: 'Add login', fields: USER_FIELDS(true), rec: { role: 'crew' }, submit: 'user-save' }),
  'user-edit'(el) { const u = ui.users.users.find(x => x.id === el.dataset.id); formDrawer({ eyebrow: 'Logins', title: esc(u.name), fields: USER_FIELDS(false), rec: u, submit: 'user-save', id: u.id }); },
});
onSubmit({
  async 'user-save'(form) {
    const isNew = !form.dataset.id, fl = USER_FIELDS(isNew); if (!validate(form, fl)) return;
    const v = collect(form, fl); if (!v.password) delete v.password;
    try { await api(isNew ? 'users' : `users/${form.dataset.id}`, { method: isNew ? 'POST' : 'PATCH', body: v }); closeDrawer(); ui.rerender(); toast(isNew ? 'Login created.' : 'Login updated.'); }
    catch (e) { toast(e.message, 'bad'); }
  },
});

/* ---------------------------------------------------------------- QuickBooks */
function quickbooks(r) {
  const msg = r.q.get('qbo');
  if (msg) setTimeout(() => { toast(msg === 'connected' ? 'QuickBooks connected.' : (r.q.get('msg') || 'QuickBooks connection failed.'), msg === 'connected' ? '' : 'bad'); history.replaceState(null, '', '#settings/quickbooks'); }, 50);
  if (S.mode !== 'server') {
    return page('quickbooks', 'QuickBooks Online does the accounting. Max Paving Manage feeds it customers, invoices and approved time.', `
      <div class="grid-2">
        ${card('Connect QuickBooks', `<p>A live connection needs the <b>Max Paving server</b> (it keeps QuickBooks’ secret keys safe and gives everyone one shared set of data). Until then, use the CSV files on the right with QuickBooks’ <i>Settings → Import data</i>.</p>
          <ol class="steps-list">
            <li>Create a free app at <a href="https://developer.intuit.com" target="_blank" rel="noopener">developer.intuit.com</a> and copy its Client ID and Client Secret.</li>
            <li>Put them in <code>manage/server/.env</code> (copy <code>.env.example</code>) and run <code>node manage/server/server.mjs</code>.</li>
            <li>Open the panel from the server, sign in, and press <b>Connect to QuickBooks</b> here.</li>
          </ol>
          <p class="muted small">It’s free at your size: Intuit’s Builder tier allows 500,000 read calls a month.</p>`, { eyebrow: 'Live sync' })}
        ${card('Export for QuickBooks', `<div class="export-list">
          <div><strong>Customers</strong><small>QuickBooks → Settings → Import data → Customers</small>${btn('Download', 'qb-csv-cust', { kind: 'ghost', size: 'sm' })}</div>
          <div><strong>Invoices</strong><small>Import data → Invoices (not if sales tax is turned on)</small>${btn('Download', 'inv-csv', { kind: 'ghost', size: 'sm' })}</div>
          <div><strong>Approved time</strong><small>For payroll — open Timesheets and use Download CSV</small>${linkBtn('Timesheets', '#crew/timesheets', { kind: 'ghost', size: 'sm' })}</div>
        </div>`, { eyebrow: 'No server needed' })}
      </div>`);
  }
  return {
    html: page('quickbooks', 'Send customers, estimates, invoices and approved time to QuickBooks. Payments recorded in QuickBooks come back every 15 minutes.', '<div id="qb-box"><p class="muted">Checking the connection…</p></div>'),
    after() { loadQb(); },
  };
}
async function loadQb() {
  const box = $('#qb-box'); if (!box) return;
  let st;
  try { st = await api('qbo/status'); } catch (e) { box.innerHTML = `<p class="alert alert--bad">${esc(e.message)}</p>`; return; }
  if (!st.configured) {
    box.innerHTML = card('Almost there', `<p>The server is running but has no QuickBooks app keys yet.</p><ol class="steps-list"><li>Create an app at <a href="https://developer.intuit.com" target="_blank" rel="noopener">developer.intuit.com</a> (QuickBooks Online and Payments, accounting scope).</li><li>Add this Redirect URI to the app exactly: <code>${esc(st.redirect)}</code></li><li>Put the Client ID and Secret in <code>manage/server/.env</code> and restart the server.</li></ol>`);
    return;
  }
  let lists = null;
  if (st.connected) { try { lists = await api('qbo/lists'); } catch (e) { lists = { error: e.message }; } }
  const days = st.refreshExpires ? Math.round((st.refreshExpires - Date.now()) / 864e5) : 0;
  const itemSel = cat => `<select name="item_${cat}" aria-label="QuickBooks item for ${cat}"><option value="">— pick a product/service —</option>${(lists && lists.items || []).map(i => `<option value="${esc(i.id)}"${(db.settings.qboItems || {})[cat] === i.id ? ' selected' : ''}>${esc(i.name)}</option>`).join('')}</select>`;
  const staff = db.staff.filter(p => p.active !== 'Inactive');
  box.innerHTML = `<div class="grid-2">
    ${card(st.connected ? esc(st.company && st.company.name || 'Connected') : 'Not connected', st.connected
      ? `<p>${badge('Active', 'Connected')} ${esc(st.env)} · since ${st.company ? fmtDate(st.company.connectedAt.slice(0, 10)) : ''}${st.company && st.company.connectedBy ? ' by ' + esc(st.company.connectedBy) : ''}</p><p class="muted small">The connection renews itself whenever it’s used. If nothing syncs for ${days} days you’ll need to connect again.</p><div class="btn-row">${btn('Check payments now', 'qbo-pull', { kind: 'ghost', size: 'sm', ic: 'sync' })}${btn('Disconnect', 'qb-disconnect', { kind: 'danger', size: 'sm' })}</div>`
      : `<p>Connect once and the office can send work to QuickBooks with one click.</p><a class="btn btn--yellow" href="api/qbo/connect">${icon('qb')}<span>Connect to QuickBooks</span></a><p class="muted small">You’ll sign in to Intuit and pick the company. Environment: ${esc(st.env)}.</p>`, { eyebrow: 'QuickBooks Online' })}
    ${card('Sync log', (st.log || []).length ? `<ul class="log">${st.log.slice(0, 12).map(l => `<li class="${l.ok ? '' : 'is-bad'}"><small>${new Date(l.at).toLocaleString()}</small>${esc(l.msg)}</li>`).join('')}</ul>` : '<p class="muted">Nothing synced yet.</p>', { eyebrow: 'Recent activity' })}
  </div>
  ${st.connected ? `<form data-submit="qb-map">
    ${lists && lists.error ? `<p class="alert alert--bad">${esc(lists.error)}</p>` : ''}
    ${card('Products & services', `<p class="muted small">Every invoice and estimate line is filed under one of these QuickBooks products/services by category.</p><div class="fields fields--4">${CATS.map(c => `<div class="field"><label>${c} work</label>${itemSel(c)}</div>`).join('')}</div>
      ${fieldHtml(f('qboJobs', 'Track each job as a QuickBooks sub-customer (recommended — job profit shows up in QuickBooks reports)', 'check', { wide: true }), db.settings.qboJobs !== false)}`, { eyebrow: 'Mapping' })}
    ${card('Employees', `<p class="muted small">Approved time is sent as QuickBooks time activities for payroll. Link each person to their QuickBooks employee.</p><div class="fields">${staff.map(p => `<div class="field"><label>${esc(p.name)}</label><select name="emp_${p.id}"><option value="">— not linked —</option>${(lists && lists.employees || []).map(e => `<option value="${esc(e.id)}"${p.qboEmployeeId === e.id ? ' selected' : ''}>${esc(e.name)}</option>`).join('')}</select></div>`).join('')}</div>`, { eyebrow: 'Payroll' })}
    <p class="muted small">Heads-up: if online payments are on in QuickBooks and you opted into “automatically send imported invoices”, QuickBooks may email invoices to customers as soon as they arrive.</p>
    <div class="btn-row">${btn('Save mapping', 'qb-map-save', { ic: 'check' })}</div>
  </form>` : ''}`;
}
act({
  'qb-map-save'(el) { el.closest('form').requestSubmit(); },
  async 'qb-disconnect'(el) { if (!confirmTwice(el, 'Click again to disconnect')) return; try { await api('qbo/disconnect', { method: 'POST' }); toast('QuickBooks disconnected.'); loadQb(); } catch (e) { toast(e.message, 'bad'); } },
  'qb-csv-cust'() {
    download(`quickbooks-customers-${today()}.csv`, csv([['Name', 'Company', 'Email', 'Phone', 'Street', 'Notes'], ...db.customers.map(c => [c.name, c.type === 'Residential' ? '' : c.name, c.email, c.phone, c.address, c.contact ? 'Contact: ' + c.contact : ''])]));
    toast('Customers CSV downloaded.');
  },
});
onSubmit({
  async 'qb-map'(form) {
    db.settings.qboItems = Object.fromEntries(CATS.map(c => [c, form.elements['item_' + c].value]).filter(([, v]) => v));
    db.settings.qboJobs = form.elements.qboJobs.checked;
    await saveSettings();
    for (const p of db.staff) { const sel = form.elements['emp_' + p.id]; if (sel && (p.qboEmployeeId || '') !== sel.value) await put('staff', { ...p, qboEmployeeId: sel.value }); }
    toast('QuickBooks mapping saved.');
  },
});

/* ---------------------------------------------------------------- data */
function data() {
  const local = S.mode === 'local';
  return page('data', local ? 'Right now everything is saved in this browser on this computer.' : 'Everything is saved on the Max Paving server and shared with the team.', `
    <div class="grid-2">
      ${card(local ? 'Local mode' : 'Server mode', local ? `<p>This copy keeps data in this browser only — great for trying things out. To give the whole team one shared copy, logins and QuickBooks:</p>
        <ol class="steps-list"><li>Install Node.js 18 or newer on the office computer or a small cloud server.</li><li>Run <code>node manage/server/server.mjs</code> (settings in <code>manage/server/.env</code>).</li><li>Open the address it prints, create the owner login, and choose “The data saved in this browser” to bring this data along.</li></ol>`
        : `<p>Signed in as <b>${esc(S.user.name)}</b> (${esc(S.user.roleLabel)}). Changes save to the server instantly and reach everyone within 20 seconds.</p><p class="muted small">Back up the server’s <code>data</code> folder regularly — it is the company’s database.</p>`, { eyebrow: 'Where your data lives' })}
      ${card('Backup & restore', `<div class="export-list">
        <div><strong>Export everything</strong><small>A .json backup of all records and settings.</small>${btn('Export', 'data-export', { kind: 'ghost', size: 'sm' })}</div>
        ${local || S.user.role === 'owner' ? `<div><strong>Import a backup</strong><small>Replaces ${local ? 'this browser’s' : 'matching'} data with the file’s.</small><label class="btn btn--ghost btn--sm">Choose file<input type="file" accept="application/json,.json" data-on-change="data-import" hidden></label></div>` : ''}
        ${db.meta.sample ? `<div><strong>Clear sample data</strong><small>Removes the made-up customers, jobs and invoices. Your team, crews and cost book stay.</small>${btn('Clear', 'data-clear', { kind: 'danger', size: 'sm' })}</div>` : ''}
        ${local ? `<div><strong>Start over</strong><small>Erase everything in this browser and load the sample company again.</small>${btn('Reset', 'data-reset', { kind: 'danger', size: 'sm' })}</div>` : ''}
      </div>`, { eyebrow: 'Your data' })}
    </div>`);
}
act({
  async 'data-export'() {
    const text = S.mode === 'server' && S.user.role === 'owner' ? JSON.stringify(await api('export'), null, 2) : exportData();
    download(`max-paving-manage-backup-${today()}.json`, text, 'application/json'); toast('Backup downloaded.');
  },
  async 'data-clear'(el) { if (!confirmTwice(el, 'Click again to clear')) return; await clearSample(); ui.rerender(); toast('Sample data cleared.'); },
  'data-reset'(el) { if (!confirmTwice(el, 'Click again — erases everything')) return; resetLocal(); ui.rerender(); toast('Reset to the sample company.'); },
});
onChange({
  'data-import'(el) {
    const file = el.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = async () => { try { await importData(JSON.parse(r.result)); ui.rerender(); toast('Backup imported.'); } catch (e) { toast(e.message || 'That file isn’t a backup.', 'bad'); } };
    r.readAsText(file);
  },
});
