/* Sales: leads pipeline (board), prospects map (marketing), customers. */
import { $, $$, esc, num, money, today, addDays, fmtDate, shortDate, daysUntil, inWords, icon, badge, pstat, uid,
  SERVICES, PROPERTY_TYPES, CUSTOMER_TYPES, TIMELINES, LEAD_SOURCES, LEAD_STAGES, BUSINESS_TYPES, P_STATUSES, P_COLOR, P_SOURCES, P_METHODS } from '../core.js';
import { db, S, put, del, find, can, nextNumber } from '../store.js';
import { act, onSubmit, onInput, onChange, hero, tabs, card, kpi, btn, table, f, fieldHtml, formDrawer, openDrawer, closeDrawer, collect, validate, toast, confirmTwice, custName, jobLabel, ui, qbBadge, empty, stats } from '../ui.js';
import { followDue, hasPin, invBalance, estTotals } from '../derive.js';
import { openEstimateNew } from './estimates.js';

const TABS = () => [['leads', 'Leads', db.leads.filter(l => l.status === 'New').length || ''], ['prospects', 'Prospects map', db.prospects.filter(followDue).length || ''], ['customers', 'Customers']];
export default {
  title: 'Sales',
  roles: ['owner', 'office', 'estimator'],
  badge: () => db.leads.filter(l => l.status === 'New').length + db.prospects.filter(followDue).length,
  render(r) {
    const tab = r.parts[0] || 'leads';
    const out = ({ leads, prospects, customers }[tab] || leads)(r);
    const open = r.q.get('open');
    const after = () => {
      if (open) setTimeout(() => (tab === 'prospects' ? openProspect : tab === 'customers' ? openCustomer : openLead)(open), 0);
      return out.after ? out.after() : null;
    };
    return { html: (out.html || out), after };
  },
};
const page = (tab, h, body) => h + tabs(TABS(), tab, 'sales') + `<div class="page">${body}</div>`;

/* ---------------------------------------------------------------- leads: pipeline board */
function leads() {
  const q = (ui.filters.leads || {}).q || '';
  const showClosed = (ui.filters.leads || {}).closed;
  const stages = showClosed ? LEAD_STAGES : LEAD_STAGES.filter(s => s !== 'Lost');
  const col = s => {
    const ls = db.leads.filter(l => l.status === s).sort((a, b) => (b.created || '').localeCompare(a.created || ''));
    return `<section class="kcol" data-stage="${esc(s)}" data-drop="lead">
      <header><span>${esc(s)}</span><em>${ls.length}</em></header>
      <div class="kcol__cards">${ls.map(leadCard).join('') || '<p class="kcol__empty">Drop a lead here</p>'}</div>
    </section>`;
  };
  return page('leads', hero({
    eyebrow: 'Sales', title: 'Leads',
    sub: 'Every quote request, from first call to signed proposal. Drag a card to move it along.',
    actions: btn('New lead', 'lead-new', { ic: 'plus' }),
  }), `<div class="toolbar"><input class="search" type="search" placeholder="Search leads…" value="${esc(q)}" data-on-input="lead-search" aria-label="Search leads">
      <label class="toggle"><input type="checkbox" data-on-change="lead-closed"${showClosed ? ' checked' : ''}> Show lost</label></div>
    <div class="kanban" style="--n:${stages.length}">${stages.map(col).join('')}</div>`);
}
function leadCard(l) {
  const est = db.estimates.find(e => e.leadId === l.id);
  const visit = l.siteVisit && ['New', 'Contacted', 'Site visit'].includes(l.status) ? `<span class="kcard__when${daysUntil(l.siteVisit) <= 1 ? ' is-soon' : ''}">${icon('calendar')}Visit ${daysUntil(l.siteVisit) === 0 ? 'today' : shortDate(l.siteVisit)}</span>` : '';
  const age = l.status === 'New' ? `<span class="kcard__when is-soon">${inWords(daysUntil(l.created || today()))}</span>` : '';
  return `<article class="kcard" draggable="true" data-drag="lead" data-id="${l.id}" data-act="lead-edit" tabindex="0" data-text="${esc((l.name + ' ' + (l.company || '') + ' ' + (l.service || '') + ' ' + (l.address || '')).toLowerCase())}">
    <strong>${esc(l.company || l.name)}</strong>
    ${l.company ? `<small>${esc(l.name)}</small>` : ''}
    <span class="kcard__svc">${esc(l.service || 'Service not set')}</span>
    <div class="kcard__foot">${visit || age}${est ? `<span class="kcard__est">${esc(est.number)} · ${money(estTotals(est).headline.price)}</span>` : ''}${l.assignedTo ? `<span class="avatar avatar--xs" title="${esc(l.assignedTo)}">${esc(l.assignedTo.split(' ').map(w => w[0]).join(''))}</span>` : ''}</div>
  </article>`;
}
onInput({ 'lead-search'(el) { (ui.filters.leads = ui.filters.leads || {}).q = el.value; const q = el.value.toLowerCase(); $$('.kcard').forEach(c => { c.hidden = q && !c.dataset.text.includes(q); }); } });
onChange({ 'lead-closed'(el) { (ui.filters.leads = ui.filters.leads || {}).closed = el.checked; ui.rerender(); } });

// Drag cards between stages (mouse) — clicking a card still opens it.
let dragId = null;
document.addEventListener('dragstart', e => { const c = e.target.closest('[data-drag="lead"]'); if (c) { dragId = c.dataset.id; c.classList.add('is-dragging'); e.dataTransfer.effectAllowed = 'move'; } });
document.addEventListener('dragend', e => { const c = e.target.closest('[data-drag="lead"]'); if (c) c.classList.remove('is-dragging'); $$('.kcol.is-over').forEach(x => x.classList.remove('is-over')); });
document.addEventListener('dragover', e => { const col = e.target.closest('[data-drop="lead"]'); if (col && dragId) { e.preventDefault(); $$('.kcol.is-over').forEach(x => x !== col && x.classList.remove('is-over')); col.classList.add('is-over'); } });
document.addEventListener('drop', async e => {
  const col = e.target.closest('[data-drop="lead"]'); if (!col || !dragId) return;
  e.preventDefault();
  const l = find('leads', dragId); dragId = null;
  if (l && l.status !== col.dataset.stage) { await put('leads', { ...l, status: col.dataset.stage }); toast(`${l.company || l.name} → ${col.dataset.stage}`); ui.rerender(); }
});

const LEAD_FIELDS = () => [
  f('name', 'Contact name', 'text', { req: true }), f('company', 'Company'),
  f('phone', 'Phone', 'tel'), f('email', 'Email', 'email'),
  f('service', 'Service needed', 'select', { o: SERVICES }), f('propertyType', 'Property type', 'select', { o: PROPERTY_TYPES }),
  f('address', 'Project address', 'text', { wide: true }),
  f('timeline', 'Timeline', 'select', { o: TIMELINES }), f('source', 'Source', 'select', { o: LEAD_SOURCES }),
  f('assignedTo', 'Estimator', 'select', { o: () => db.settings.estimators }), f('siteVisit', 'Site visit', 'date'),
  f('status', 'Stage', 'select', { o: LEAD_STAGES, noBlank: true, def: 'New' }), f('created', 'Received', 'date', { def: today }),
  f('notes', 'Notes', 'textarea', { wide: true }),
];
function openLead(id) {
  const l = id ? find('leads', id) : null;
  if (id && !l) return;
  const est = l && db.estimates.filter(e => e.leadId === l.id);
  formDrawer({
    eyebrow: 'Lead', title: l ? esc(l.company ? `${l.name} · ${l.company}` : l.name) : 'New lead', fields: LEAD_FIELDS(), rec: l || {}, submit: 'lead-save',
    extra: est && est.length ? `<div class="linked">${est.map(e => `<a href="#estimates/${e.id}">${icon('file')} ${esc(e.number)} · ${esc(e.title)} ${badge(e.status)}</a>`).join('')}</div>` : '',
    footer: l && !['Lost', 'Won'].includes(l.status) ? btn('Build estimate', 'lead-est', { kind: 'ghost', size: 'sm', ic: 'file' }) : '',
    del: l ? 'lead-del' : '',
  });
}
act({
  'lead-new': () => openLead(),
  'lead-edit': el => openLead(el.dataset.id),
  async 'lead-del'(el) { if (!confirmTwice(el, 'Click again to delete')) return; await del('leads', el.closest('form').dataset.id); closeDrawer(); ui.rerender(); toast('Lead deleted.'); },
  async 'lead-est'(el) {
    const form = el.closest('form'); const l = await saveLead(form, true); if (!l) return;
    let c = db.customers.find(x => x.name.toLowerCase() === (l.company || l.name).toLowerCase());
    if (!c) {
      const map = { Residential: 'Residential', 'Industrial / Warehouse': 'Industrial / Warehouse', 'HOA / Multifamily': 'HOA / Multifamily', 'Municipal / Government': 'Municipal / Government', 'Church / Nonprofit': 'Church / Nonprofit' };
      c = await put('customers', { id: uid(), name: l.company || l.name, type: map[l.propertyType] || 'Commercial', contact: l.company ? l.name : '', phone: l.phone, email: l.email, address: l.address, notes: '' });
    }
    if (['New', 'Contacted'].includes(l.status)) await put('leads', { ...l, status: 'Site visit' });
    closeDrawer();
    openEstimateNew({ customerId: c.id, leadId: l.id, title: l.service && l.service !== 'Not sure yet' ? l.service : '', address: l.address, estimator: l.assignedTo, notes: l.notes ? `Customer notes: ${l.notes}` : '' });
  },
});
async function saveLead(form, quiet) {
  const fields = LEAD_FIELDS(); if (!validate(form, fields)) return null;
  const v = collect(form, fields), prev = form.dataset.id ? find('leads', form.dataset.id) : null;
  const rec = await put('leads', { ...(prev || { id: uid() }), ...v });
  form.dataset.id = rec.id;
  if (!quiet) { closeDrawer(); ui.rerender(); toast(prev ? 'Lead saved.' : 'Lead added.'); }
  return rec;
}
onSubmit({ 'lead-save': form => saveLead(form) });

/* ---------------------------------------------------------------- customers */
function customers() {
  const rows = db.customers.slice().sort((a, b) => a.name.localeCompare(b.name));
  const billed = c => db.invoices.filter(i => i.customerId === c.id).reduce((s, i) => s + num(i.amount), 0);
  const owed = c => db.invoices.filter(i => i.customerId === c.id).reduce((s, i) => s + Math.max(0, invBalance(i)), 0);
  return page('customers', hero({
    eyebrow: 'Sales', title: 'Customers', sub: 'Property owners, managers, GCs, cities and homeowners — with their jobs, proposals and balances.',
    actions: btn('New customer', 'cust-new', { ic: 'plus' }),
  }), `<div class="toolbar"><input class="search" type="search" placeholder="Search customers…" data-on-input="search" data-key="customers" aria-label="Search customers"></div>` + table([
    { l: 'Customer', v: c => `<strong>${esc(c.name)}</strong> ${qbBadge(c)}<small class="muted block">${esc(c.contact || '')}</small>`, text: c => c.name + ' ' + (c.contact || '') },
    { l: 'Type', v: c => esc(c.type || '') },
    { l: 'Phone', v: c => esc(c.phone || '') },
    { l: 'Jobs', r: true, v: c => db.jobs.filter(j => j.customerId === c.id).length || '' },
    can.money() && { l: 'Billed', r: true, v: c => billed(c) ? money(billed(c)) : '' },
    can.money() && { l: 'Owes', r: true, v: c => owed(c) ? `<strong>${money(owed(c))}</strong>` : '' },
  ].filter(Boolean), rows, { onRow: c => `data-act="cust-edit" data-id="${c.id}"` }));
}
const CUST_FIELDS = () => [
  f('name', 'Name', 'text', { req: true }), f('type', 'Type', 'select', { o: CUSTOMER_TYPES, noBlank: true, def: 'Commercial' }),
  f('contact', 'Main contact'), f('phone', 'Phone', 'tel'), f('email', 'Email', 'email'),
  f('address', 'Billing address', 'text', { wide: true }), f('notes', 'Notes', 'textarea', { wide: true }),
];
function openCustomer(id) {
  const c = id ? find('customers', id) : null;
  const jobs = c ? db.jobs.filter(j => j.customerId === c.id) : [], ests = c ? db.estimates.filter(e => e.customerId === c.id) : [];
  const owed = c ? db.invoices.filter(i => i.customerId === c.id).reduce((s, i) => s + Math.max(0, invBalance(i)), 0) : 0;
  formDrawer({
    eyebrow: 'Customer', title: c ? esc(c.name) : 'New customer', fields: CUST_FIELDS(), rec: c || {}, submit: 'cust-save', del: c ? 'cust-del' : '',
    extra: c ? stats([['Jobs', jobs.length], ['Estimates', ests.length], can.money() && ['Owes', money(owed)]].filter(Boolean)) + ((jobs.length || ests.length) ? `<div class="linked">${jobs.map(j => `<a href="#jobs/${j.id}">${icon('hammer')} ${esc(jobLabel(j))} ${badge(j.status)}</a>`).join('')}${ests.map(e => `<a href="#estimates/${e.id}">${icon('file')} ${esc(e.number)} · ${esc(e.title)} ${badge(e.status)}</a>`).join('')}</div>` : '') : '',
    footer: c && S.mode === 'server' && can.qbo() ? btn(c.qbo ? 'Update in QuickBooks' : 'Send to QuickBooks', 'cust-qbo', { kind: 'ghost', size: 'sm', ic: 'qb' }) : '',
  });
}
act({
  'cust-new': () => openCustomer(), 'cust-edit': el => openCustomer(el.dataset.id),
  async 'cust-del'(el) {
    const id = el.closest('form').dataset.id;
    if (db.jobs.some(j => j.customerId === id) || db.invoices.some(i => i.customerId === id)) return toast('This customer has jobs or invoices — keep them for your records.', 'bad');
    if (!confirmTwice(el, 'Click again to delete')) return; await del('customers', id); closeDrawer(); ui.rerender(); toast('Customer deleted.');
  },
  async 'cust-qbo'(el) {
    const { api } = await import('../store.js');
    el.disabled = true;
    try { await api('qbo/push', { method: 'POST', body: { kind: 'customer', id: el.closest('form').dataset.id } }); const { pull } = await import('../store.js'); await pull(); toast('Customer is in QuickBooks.'); }
    catch (e) { toast(e.message, 'bad'); }
    el.disabled = false;
  },
});
onSubmit({
  async 'cust-save'(form) {
    const fields = CUST_FIELDS(); if (!validate(form, fields)) return;
    const v = collect(form, fields), prev = form.dataset.id ? find('customers', form.dataset.id) : null;
    if (!prev && db.customers.some(c => c.name.toLowerCase() === v.name.toLowerCase())) return toast(`“${v.name}” is already a customer.`, 'bad');
    await put('customers', { ...(prev || { id: uid() }), ...v }); closeDrawer(); ui.rerender(); toast('Customer saved.');
  },
});

/* ---------------------------------------------------------------- prospects map (marketing) */
const OSM = ['https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' }];
const mk = { show: new Set(P_STATUSES), type: '', q: '', view: null, focusId: null };
let map = null, markers = {}, pickMap = null, pickPin = null;
const placeOf = p => [p.city, p.state].filter(Boolean).join(', ');
const fullAddress = p => [p.address, p.city, [p.state, p.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
const telHref = s => 'tel:' + String(s).replace(/[^\d+]/g, '');

function prospects() {
  const all = db.prospects, n = s => all.filter(p => p.status === s).length, due = all.filter(followDue).length;
  const types = [...new Set([...BUSINESS_TYPES, ...all.map(p => p.businessType).filter(Boolean)])];
  return {
    html: page('prospects', hero({
      eyebrow: 'Sales · Marketing', title: 'Prospects map', sub: 'Businesses you want to win. Add them as you find them, work them from the map, and turn the interested ones into leads.',
      actions: btn('Add prospect', 'p-new', { ic: 'plus' }),
    }), `
      <section class="kpis kpis--4">
        ${kpi('Prospects', all.length, `${all.filter(hasPin).length} pinned on the map`)}
        ${kpi('Not contacted yet', n('Not contacted'), 'Ready for a first call')}
        ${kpi('Interested', n('Interested'), `${money(all.filter(p => p.status === 'Interested').reduce((s, p) => s + num(p.estValue), 0))} in possible work`)}
        ${kpi('Follow-ups due', due, `${n('Converted')} turned into leads`, { tone: due ? 'alert' : '' })}
      </section>
      <div class="toolbar">
        <input class="search" type="search" placeholder="Search company, contact, city…" value="${esc(mk.q)}" data-on-input="mk-q" aria-label="Search prospects">
        <select class="select" data-on-change="mk-type" aria-label="Business type"><option value="">All business types</option>${types.map(t => `<option${t === mk.type ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>
      </div>
      <div class="chips chips--map" role="group" aria-label="Statuses shown on the map">
        ${P_STATUSES.map(s => `<button type="button" class="chip chip--dot${mk.show.has(s) ? ' is-on' : ''}" style="--c:${P_COLOR[s]}" data-act="p-toggle" data-v="${esc(s)}" aria-pressed="${mk.show.has(s)}"><i></i>${esc(s)} <span>${n(s)}</span></button>`).join('')}
        <button type="button" class="chip chip--link" data-act="p-only" data-v="Not contacted">Only not contacted</button>
        <button type="button" class="chip chip--link" data-act="p-all">Show all</button>
      </div>
      <div class="mk">
        <div class="card mk__map"><div class="map" id="mk-map" role="region" aria-label="Map of prospects"></div></div>
        <div class="card mk__list"><div class="mk__head"><strong data-mk-count></strong><span class="muted small">Click one to find it on the map</span></div><ul class="plist" id="mk-list"></ul></div>
      </div>`),
    after() { initMap(); updateMarketing(); return () => { if (map) { map.remove(); map = null; markers = {}; } }; },
  };
}
function filteredProspects() {
  const q = mk.q.trim().toLowerCase();
  return db.prospects.filter(p => mk.show.has(p.status) && (!mk.type || p.businessType === mk.type) &&
    (!q || [p.company, p.contactName, p.city, p.address, p.zip, p.phone, p.email, p.businessType, p.notes].join(' ').toLowerCase().includes(q)))
    .sort((a, b) => (followDue(b) - followDue(a)) || a.company.localeCompare(b.company));
}
function initMap() {
  const el = $('#mk-map'); if (!el) return;
  if (!window.L) { el.innerHTML = '<p class="map__off">The map couldn’t load. Check the internet connection — the list still works.</p>'; return; }
  map = L.map(el, { scrollWheelZoom: false }); // wheel zoom only after a click, so page scrolling isn't hijacked
  map.on('click focus', () => map.scrollWheelZoom.enable());
  map.on('mouseout blur', () => map.scrollWheelZoom.disable());
  L.tileLayer(...OSM).addTo(map);
  const pins = db.prospects.filter(hasPin);
  if (mk.view) map.setView(mk.view.c, mk.view.z);
  else if (pins.length) map.fitBounds(L.latLngBounds(pins.map(p => [p.lat, p.lng])), { padding: [36, 36], maxZoom: 13 });
  else map.setView([db.settings.lat, db.settings.lon], 10);
  map.on('moveend', () => { if (map) mk.view = { c: map.getCenter(), z: map.getZoom() }; });
}
function popupHtml(p) {
  return `<div class="pop"><strong class="pop__name">${esc(p.company)}</strong><small class="muted">${esc([p.businessType, placeOf(p)].filter(Boolean).join(' · '))}</small><div>${pstat(p.status)}</div>
    ${p.contactName ? `<div>${esc(p.contactName)}${p.contactTitle ? `, ${esc(p.contactTitle)}` : ''}</div>` : ''}
    ${p.phone ? `<a href="${telHref(p.phone)}">${esc(p.phone)}</a>` : ''}${p.email ? `<a href="mailto:${esc(p.email)}">${esc(p.email)}</a>` : ''}
    <small class="muted">${p.lastContact ? `Last contact ${esc(fmtDate(p.lastContact))}` : 'Never contacted'}${p.nextFollowUp && !['Converted', 'Not interested'].includes(p.status) ? ` · follow up ${esc(shortDate(p.nextFollowUp))}` : ''}</small>
    <div class="pop__btns">${p.status !== 'Converted' ? `<button type="button" class="btn btn--yellow btn--sm" data-act="p-log" data-id="${p.id}">Log contact</button>` : ''}<button type="button" class="btn btn--ghost btn--sm" data-act="p-open" data-id="${p.id}">Open</button></div></div>`;
}
function updateMarketing() {
  const list = $('#mk-list'); if (!list) return;
  const rows = filteredProspects();
  $('[data-mk-count]').textContent = `${rows.length} of ${db.prospects.length} prospects`;
  list.innerHTML = rows.map(p => `<li class="plist__item" data-act="p-focus" data-id="${p.id}" tabindex="0">
      <span class="plist__dot" style="--c:${P_COLOR[p.status]}"></span>
      <div class="plist__main"><strong>${esc(p.company)}</strong><small>${esc([p.businessType, placeOf(p)].filter(Boolean).join(' · '))}</small>${p.contactName || p.phone ? `<small>${esc([p.contactName, p.phone].filter(Boolean).join(' · '))}</small>` : ''}</div>
      <div class="plist__side">${pstat(p.status)}${followDue(p) ? `<em class="due">Follow up ${daysUntil(p.nextFollowUp) < 0 ? 'overdue' : 'today'}</em>` : ''}${hasPin(p) ? '' : '<em class="nopin">No map pin</em>'}</div>
    </li>`).join('') || '<li class="empty">No prospects match. Turn on more statuses, or add one.</li>';
  if (!map) return;
  Object.values(markers).forEach(m => m.remove()); markers = {};
  rows.filter(hasPin).forEach(p => {
    markers[p.id] = L.circleMarker([p.lat, p.lng], { radius: 9, weight: 2, color: '#ffffff', fillColor: P_COLOR[p.status], fillOpacity: 1 })
      .bindTooltip(esc(p.company), { direction: 'top', offset: [0, -8] }).bindPopup(() => popupHtml(p), { minWidth: 230, maxWidth: 280 })
      .on('click', () => markActive(p.id)).addTo(map);
  });
  if (mk.focusId && markers[mk.focusId]) focusProspect(mk.focusId);
  mk.focusId = null;
}
function markActive(id) {
  $$('.plist__item.is-active').forEach(li => li.classList.remove('is-active'));
  const li = $(`.plist__item[data-id="${id}"]`); if (li) { li.classList.add('is-active'); li.scrollIntoView({ block: 'nearest' }); }
}
function focusProspect(id) {
  const m = markers[id];
  if (!map || !m) { openProspect(id); return; }
  map.setView(m.getLatLng(), Math.max(map.getZoom(), 14)); m.openPopup(); markActive(id);
  if (window.innerWidth < 900) $('#mk-map').scrollIntoView({ behavior: 'smooth', block: 'center' });
}
onInput({ 'mk-q'(el) { mk.q = el.value; updateMarketing(); } });
onChange({ 'mk-type'(el) { mk.type = el.value; updateMarketing(); } });

// Add / edit flow: four short steps.
const P_STEPS = ['Company', 'Location', 'Contact', 'Status & next step'];
const P_FIELDS = [
  [f('company', 'Company name', 'text', { req: true, wide: true }), f('businessType', 'Business type', 'select', { o: BUSINESS_TYPES }), f('website', 'Website', 'url'), f('interest', 'Work they probably need', 'select', { o: SERVICES }), f('source', 'How you found them', 'select', { o: P_SOURCES })],
  [f('address', 'Street address', 'text', { wide: true }), f('city', 'City'), f('state', 'State', 'select', { o: ['MO', 'KS'] }), f('zip', 'ZIP')],
  [f('contactName', 'Contact person'), f('contactTitle', 'Title / role'), f('phone', 'Phone', 'tel'), f('email', 'Email', 'email')],
  [f('status', 'Status', 'select', { o: P_STATUSES, noBlank: true }), f('nextFollowUp', 'Next follow-up', 'date'), f('estValue', 'Estimated job size', 'money'), f('notes', 'Notes', 'textarea', { wide: true })],
];
const activityHtml = p => (p.activity || []).length ? `<div class="activity"><h3>Contact history</h3><ul>${p.activity.map(a => `<li><div><strong>${esc(fmtDate(a.date))}</strong> · ${esc(a.method)} ${pstat(a.outcome)}</div>${a.notes ? `<p>${esc(a.notes)}</p>` : ''}</li>`).join('')}</ul></div>` : '';
function openProspect(id, step = 0) {
  const p = (id && find('prospects', id)) || { status: 'Not contacted', state: 'MO' };
  const isNew = !p.id, last = P_STEPS.length - 1;
  openDrawer(`
    <form class="form" data-submit="p-save" data-id="${p.id || ''}" data-step="0" data-max="${isNew ? 0 : last}" novalidate>
      <header class="form__head"><div><span class="eyebrow eyebrow--sm">${isNew ? 'New prospect' : 'Prospect'}</span><h2>${isNew ? 'Add a potential customer' : esc(p.company)}</h2></div><button type="button" class="x x--lg" data-act="close" aria-label="Close">×</button></header>
      <ol class="wiz">${P_STEPS.map((s, i) => `<li><button type="button" data-act="p-step" data-v="${i}"><span>${i + 1}</span>${esc(s)}</button></li>`).join('')}</ol>
      <div class="form__body">
        ${p.sample ? '<p class="note">Sample prospect — edit it, or clear all sample data in Settings → Data.</p>' : ''}
        ${P_FIELDS.map((fs, i) => `<section class="wiz__step" data-step="${i}"${i ? ' hidden' : ''}>
          ${i === 1 ? '<p class="muted small">Type the address and press <strong>Find on map</strong>, or click the map to drop the pin. Drag the pin to fine-tune it.</p>' : ''}
          <div class="fields">${fs.map(fd => fieldHtml(fd, p[fd.k] ?? '')).join('')}</div>
          ${i === 0 ? '<p class="dup" data-dup hidden></p>' : ''}
          ${i === 1 ? `<div class="pick"><div class="btn-row"><button type="button" class="btn btn--black btn--sm" data-act="p-geocode">Find on map</button><span class="small muted" data-geo-msg>${hasPin(p) ? 'Pinned on the map.' : 'No pin yet.'}</span></div><div class="pick__map" id="pick-map"></div><input type="hidden" name="lat" value="${esc(p.lat ?? '')}"><input type="hidden" name="lng" value="${esc(p.lng ?? '')}"></div>` : ''}
          ${i === last ? activityHtml(p) : ''}
        </section>`).join('')}
      </div>
      <footer class="form__foot">
        ${isNew ? '' : '<button type="button" class="btn btn--danger btn--sm" data-act="p-delete">Delete</button>'}
        <div class="form__actions">${!isNew && p.status !== 'Converted' ? '<button type="button" class="btn btn--ghost btn--sm" data-act="p-log">Log contact</button><button type="button" class="btn btn--ghost btn--sm" data-act="p-convert">Convert to lead</button>' : ''}</div>
        <button type="button" class="btn btn--ghost" data-act="p-back">Back</button>
        <button type="button" class="btn btn--black" data-act="p-next">Next</button>
        <button type="submit" class="btn btn--yellow" data-save>Save prospect</button>
      </footer>
    </form>`, { onClose: () => { if (pickMap) { pickMap.remove(); pickMap = null; } pickPin = null; } });
  goStep($('form[data-submit="p-save"]'), step);
}
function goStep(form, n) {
  const isNew = !form.dataset.id, last = P_STEPS.length - 1, max = Math.max(num(form.dataset.max), n);
  form.dataset.step = n; form.dataset.max = max;
  $$('.wiz__step', form).forEach(s => { s.hidden = +s.dataset.step !== n; });
  $$('.wiz li', form).forEach((li, i) => { li.classList.toggle('is-on', i === n); li.classList.toggle('is-done', i < n); const b = $('button', li); b.disabled = isNew && i > max; if (i === n) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
  $('[data-act=p-back]', form).hidden = n === 0;
  $('[data-act=p-next]', form).hidden = n === last;
  $('[data-save]', form).hidden = isNew && n < last;
  if (n === 1) initPickMap(form);
  const first = $(`.wiz__step[data-step="${n}"] input:not([type=hidden]), .wiz__step[data-step="${n}"] select`, form);
  if (first && isNew) first.focus({ preventScroll: true });
}
function nextStep(form) {
  const n = +form.dataset.step, e = form.elements;
  if (n === 0 && !e.company.value.trim()) { e.company.closest('.field').classList.add('is-bad'); e.company.focus(); toast('Add the company name first.', 'bad'); return; }
  e.company.closest('.field').classList.remove('is-bad');
  if (n === 1 && e.lat.value === '' && (e.address.value.trim() || e.city.value.trim())) geocodeForm(form);
  goStep(form, Math.min(n + 1, P_STEPS.length - 1));
}
function initPickMap(form) {
  const el = $('#pick-map', form); if (!el) return;
  if (!window.L) { el.innerHTML = '<p class="map__off">Map unavailable — you can still save the address.</p>'; return; }
  if (pickMap) { setTimeout(() => pickMap && pickMap.invalidateSize(), 50); return; }
  const has = form.elements.lat.value !== '', lat = num(form.elements.lat.value), lng = num(form.elements.lng.value);
  pickMap = L.map(el).setView(has ? [lat, lng] : [db.settings.lat, db.settings.lon], has ? 16 : 10);
  L.tileLayer(...OSM).addTo(pickMap);
  if (has) setPin(form, lat, lng);
  pickMap.on('click', ev => setPin(form, ev.latlng.lat, ev.latlng.lng, false, 'Pin placed. Drag it to adjust.'));
  setTimeout(() => pickMap && pickMap.invalidateSize(), 260);
}
function setPin(form, lat, lng, recenter, msg) {
  form.elements.lat.value = (+lat).toFixed(6); form.elements.lng.value = (+lng).toFixed(6);
  if (pickMap) {
    if (!pickPin) {
      pickPin = L.marker([lat, lng], { draggable: true, icon: L.divIcon({ className: 'pin', html: '<span></span>', iconSize: [28, 28], iconAnchor: [14, 28] }) }).addTo(pickMap);
      pickPin.on('dragend', () => { const ll = pickPin.getLatLng(); form.elements.lat.value = ll.lat.toFixed(6); form.elements.lng.value = ll.lng.toFixed(6); geoMsg(form, 'Pin moved.'); });
    } else pickPin.setLatLng([lat, lng]);
    if (recenter) pickMap.setView([lat, lng], 16);
  }
  if (msg) geoMsg(form, msg);
}
const geoMsg = (form, m) => { const el = $('[data-geo-msg]', form); if (el) el.textContent = m; };
// Free OpenStreetMap geocoder (Nominatim), biased toward the KC metro. One-at-a-time use only.
export function geocode(q) {
  const url = 'https://nominatim.openstreetmap.org/search?' + new URLSearchParams({ q, format: 'jsonv2', limit: '1', countrycodes: 'us', viewbox: '-95.4,39.6,-93.4,38.4' });
  return fetch(url, { headers: { Accept: 'application/json' } }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(j => j[0] ? { lat: +j[0].lat, lng: +j[0].lon } : null);
}
async function geocodeForm(form) {
  const e = form.elements, q = [e.address.value, e.city.value, e.state.value, e.zip.value].map(s => s.trim()).filter(Boolean).join(', ');
  if (!q) { geoMsg(form, 'Type an address or city first.'); return false; }
  geoMsg(form, 'Looking up the address…');
  try {
    const hit = await geocode(q);
    if (!form.isConnected) return false;
    if (!hit) { geoMsg(form, 'Couldn’t find that address. Click the map to drop the pin yourself.'); return false; }
    setPin(form, hit.lat, hit.lng, true, 'Found it. Drag the pin if it’s not exactly right.'); return true;
  } catch (err) { geoMsg(form, 'Address lookup isn’t available right now. Click the map to drop the pin.'); return false; }
}
async function saveProspect(form, quiet) {
  const e = form.elements;
  if (!e.company.value.trim()) { goStep(form, 0); e.company.closest('.field').classList.add('is-bad'); e.company.focus(); toast('Add the company name first.', 'bad'); return null; }
  if (e.lat.value === '' && (e.address.value.trim() || e.city.value.trim())) await geocodeForm(form);
  const data = {};
  P_FIELDS.flat().forEach(fd => { let v = e[fd.k].value.trim(); if (fd.t === 'money' && v !== '') v = num(v); data[fd.k] = v; });
  data.lat = e.lat.value === '' ? '' : num(e.lat.value); data.lng = e.lng.value === '' ? '' : num(e.lng.value);
  const prev = form.dataset.id ? find('prospects', form.dataset.id) : null;
  const p = await put('prospects', prev ? { ...prev, ...data } : { id: uid(), created: today(), activity: [], lastContact: '', leadId: '', ...data });
  form.dataset.id = p.id;
  if (quiet) return p;
  mk.show.add(p.status); mk.focusId = hasPin(p) ? p.id : null;
  closeDrawer(); ui.rerender();
  toast(`${p.company} ${prev ? 'saved' : 'added'}${hasPin(p) ? '' : ' — no map pin yet'}.`);
  return p;
}
function openLog(id) {
  const p = find('prospects', id); if (!p) return;
  closeDrawer();
  openDrawer(`<form class="form" data-submit="p-log-save" data-id="${p.id}" novalidate>
    <header class="form__head"><div><span class="eyebrow eyebrow--sm">Log contact</span><h2>${esc(p.company)}</h2></div><button type="button" class="x x--lg" data-act="close" aria-label="Close">×</button></header>
    <div class="form__body">
      ${p.contactName || p.phone || p.email ? `<p class="log-who">${esc([p.contactName, p.contactTitle].filter(Boolean).join(', '))}${p.phone ? ` <a href="${telHref(p.phone)}">${esc(p.phone)}</a>` : ''}${p.email ? ` <a href="mailto:${esc(p.email)}">${esc(p.email)}</a>` : ''}</p>` : ''}
      <div class="fields">
        ${fieldHtml(f('date', 'Date', 'date'), today())}${fieldHtml(f('method', 'How you reached out', 'select', { o: P_METHODS, noBlank: true }), 'Phone call')}
        ${fieldHtml(f('outcome', 'Where it stands now', 'select', { o: ['Contacted', 'Interested', 'Not interested'], noBlank: true }), p.status === 'Interested' ? 'Interested' : 'Contacted')}
        ${fieldHtml(f('nextFollowUp', 'Next follow-up', 'date'), addDays(today(), 7))}${fieldHtml(f('notes', 'What happened', 'textarea', { wide: true }), '')}
      </div>${activityHtml(p)}
    </div>
    <footer class="form__foot"><div class="form__actions"></div><button type="button" class="btn btn--ghost" data-act="close">Cancel</button><button type="submit" class="btn btn--yellow">Save contact</button></footer>
  </form>`);
}
async function convertProspect(p) {
  const typeMap = { 'Industrial / warehouse': 'Industrial / Warehouse', 'Distribution / logistics': 'Industrial / Warehouse', 'HOA / apartments': 'HOA / Multifamily', 'Municipal / government': 'Municipal / Government', 'School / education': 'Municipal / Government', 'Church / place of worship': 'Church / Nonprofit' };
  const lead = await put('leads', { id: uid(), created: today(), name: p.contactName || p.company, company: p.contactName ? p.company : '', phone: p.phone, email: p.email, service: p.interest || 'Not sure yet', propertyType: typeMap[p.businessType] || 'Commercial', address: fullAddress(p), timeline: '', source: 'Marketing outreach', assignedTo: '', siteVisit: '', status: 'Contacted', notes: p.notes || '' });
  await put('prospects', { ...p, status: 'Converted', leadId: lead.id, nextFollowUp: '', activity: [{ id: uid(), date: today(), method: 'Converted', outcome: 'Converted', notes: 'Turned into a lead.' }, ...(p.activity || [])] });
  closeDrawer(); location.hash = `sales/leads?open=${lead.id}`;
  toast(`${p.company} is now a lead — assign an estimator and set the site visit.`);
}
act({
  'p-new': () => { if (!location.hash.startsWith('#sales/prospects')) location.hash = 'sales/prospects'; setTimeout(() => openProspect(), 0); },
  'p-open': el => openProspect(el.dataset.id),
  'p-focus': el => focusProspect(el.dataset.id),
  'p-step': el => goStep(el.closest('form'), +el.dataset.v),
  'p-next': el => nextStep(el.closest('form')),
  'p-back': el => { const form = el.closest('form'); goStep(form, Math.max(0, +form.dataset.step - 1)); },
  'p-geocode': el => geocodeForm(el.closest('form')),
  'p-log'(el) { const form = el.closest('form[data-submit="p-save"]'); if (form) saveProspect(form, true).then(p => p && openLog(p.id)); else openLog(el.dataset.id); },
  'p-convert'(el) { saveProspect(el.closest('form'), true).then(p => p && convertProspect(p)); },
  async 'p-delete'(el) { if (!confirmTwice(el, 'Click again to delete')) return; await del('prospects', el.closest('form').dataset.id); closeDrawer(); ui.rerender(); toast('Prospect deleted.'); },
  'p-toggle'(el) { const s = el.dataset.v; if (mk.show.has(s)) mk.show.delete(s); else mk.show.add(s); el.classList.toggle('is-on', mk.show.has(s)); el.setAttribute('aria-pressed', String(mk.show.has(s))); updateMarketing(); },
  'p-all'() { mk.show = new Set(P_STATUSES); syncChips(); },
  'p-only'(el) { mk.show = new Set([el.dataset.v]); syncChips(); },
});
const syncChips = () => { $$('[data-act=p-toggle]').forEach(b => { const on = mk.show.has(b.dataset.v); b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); }); updateMarketing(); };
onSubmit({
  'p-save'(form) { if (!form.dataset.id && +form.dataset.step < P_STEPS.length - 1) nextStep(form); else saveProspect(form); },
  async 'p-log-save'(form) {
    const p = find('prospects', form.dataset.id), e = form.elements;
    const entry = { id: uid(), date: e.date.value || today(), method: e.method.value || 'Other', outcome: e.outcome.value || 'Contacted', notes: e.notes.value.trim() };
    const rec = { ...p, activity: [entry, ...(p.activity || [])].sort((a, b) => b.date.localeCompare(a.date)), status: entry.outcome, lastContact: [p.lastContact, entry.date].filter(Boolean).sort().pop(), nextFollowUp: entry.outcome === 'Not interested' ? '' : e.nextFollowUp.value };
    await put('prospects', rec);
    mk.show.add(rec.status); mk.focusId = hasPin(rec) ? rec.id : null;
    closeDrawer(); ui.rerender(); toast(`Logged. ${rec.company} is now “${rec.status}”.`);
  },
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.name !== 'company' || !t.closest('form[data-submit="p-save"]')) return;
  const form = t.closest('form'), v = t.value.trim().toLowerCase(), box = $('[data-dup]', form);
  const hit = v.length > 2 && (db.prospects.some(p => p.id !== form.dataset.id && p.company.toLowerCase() === v) ? 'prospects' : db.customers.some(c => c.name.toLowerCase() === v) ? 'customers' : '');
  box.hidden = !hit; if (hit) box.textContent = `Heads up: “${t.value.trim()}” is already in your ${hit}.`;
});
