/* Estimates: list + the estimate workspace.
   1 Takeoff (named areas measured on the aerial) → 2 Pricing (lines linked to areas) → 3 Review (checklist, sanity checks,
   margin guardrail, revisions) → 4 Proposal (scope narrative, exclusions, terms, preview). Sending locks the prices;
   later edits become lettered revisions. */
import { $, $$, esc, num, round, money, fix, pct, today, addDays, fmtDate, shortDate, daysUntil, icon, badge, uid, UNITS, CATS, COST_TYPES } from '../core.js';
import { db, S, put, del, find, can, role, nextNumber, api, pull } from '../store.js';
import { act, onSubmit, onInput, onChange, hero, tabs, card, btn, linkBtn, table, f, fieldHtml, formDrawer, openDrawer, closeDrawer, collect, toast, confirmTwice, custName, ui, qbBadge, chips, filter, printHtml, bar } from '../ui.js';
import { priceEstimate, costLine, budgetFrom, pricedLines, lockPrices, COST_KEYS, lineUnit, areaQty } from '../calc.js';
import { phasesFromEstimate, syncSummary } from '../jobflow.js';
import { geocode } from './sales.js';

const STATUSES = ['Draft', 'Sent', 'Accepted', 'Declined'];
const SEC_TYPES = { base: 'Base scope', option: 'Option', addon: 'Add-on' };
const KIND_LABEL = { area: 'Area', linear: 'Linear run', count: 'Count' };
const AREA_COLORS = ['#fecf0e', '#38bdf8', '#f472b6', '#a3e635', '#fb923c', '#c084fc', '#2dd4bf'];
const ESRI = ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 20, maxNativeZoom: 19, attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics' }];

export default {
  title: 'Estimates',
  roles: ['owner', 'office', 'estimator'],
  badge: () => db.estimates.filter(e => e.status === 'Accepted' && !db.jobs.some(j => j.estimateId === e.id)).length,
  render(r) {
    if (!r.parts[0]) return list();
    const e = find('estimates', r.parts[0]);
    const step = r.parts[1] || (e && !(e.areas || []).length && !(e.lines || []).length ? 'takeoff' : 'pricing');
    return workspace(r.parts[0], step);
  },
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
    sub: `Measure the site, pick a job type, review, send. ${money(sent)} out with customers right now.`,
    actions: btn('New estimate', 'est-new', { ic: 'plus' }),
  }) + `<div class="page">
    <div class="toolbar"><input class="search" type="search" placeholder="Search estimates…" value="${esc(st.q)}" data-on-input="search" data-key="estimates" aria-label="Search estimates">${chips('estimates', ['All', ...STATUSES], st.s, counts)}</div>
    ${table([
      { l: '#', v: e => `<strong>${esc(e.number)}</strong>${e.rev && e.rev !== 'A' ? ` <span class="badge badge--gray">Rev ${esc(e.rev)}</span>` : ''} ${qbBadge(e)}` },
      { l: 'Date', v: e => fmtDate(e.date) },
      { l: 'Project', v: e => `<strong>${esc(e.title || 'Untitled')}</strong><small class="muted block">${esc(custName(e.customerId))}</small>`, text: e => `${e.title} ${custName(e.customerId)}` },
      { l: 'Estimator', v: e => esc(e.estimator || '') },
      { l: 'Total', r: true, v: e => { const p = priceEstimate(e, db.settings); return `${p.hasOptions && !p.chosenOption ? '<small class="muted">from </small>' : ''}<strong>${money(p.headline.price)}</strong>`; } },
      { l: 'Margin', r: true, v: e => { const m = marginOf(priceEstimate(e, db.settings)); return `<span class="${m < num(db.settings.marginFloorPct) / 100 ? 'txt-bad' : ''}">${pct(m)}</span>`; } },
      { l: 'Status', v: e => badge(e.status) + (e.status === 'Sent' && e.validUntil && daysUntil(e.validUntil) < 0 ? ' <span class="badge badge--red">Expired</span>' : '') + (e.status === 'Accepted' && !db.jobs.some(j => j.estimateId === e.id) ? ' <span class="badge badge--blue">Needs job</span>' : '') },
    ], rows, { onRow: e => `data-act="est-open" data-id="${e.id}"`, emptyText: 'No estimates here yet.' })}
  </div>`;
}
const marginOf = p => { const t = p.hasOptions && !p.chosenOption ? p.headline : p.contract; return t.price ? (t.price - t.cost * (1 + p.oh)) / t.price : 0; };
act({ 'est-open': el => { location.hash = `estimates/${el.dataset.id}`; } });

/* ---------------------------------------------------------------- new estimate: job type template or copy */
export function openEstimateNew(preset = {}) {
  const tpls = db.settings.templates || [];
  const past = db.estimates.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 40);
  openDrawer(`<form class="form" data-submit="est-create" novalidate>
    <header class="form__head"><div><span class="eyebrow eyebrow--sm">New estimate</span><h2>Start an estimate</h2></div><button type="button" class="x x--lg" data-act="close" aria-label="Close">×</button></header>
    <div class="form__body">
      <span class="label-h">Job type</span>
      <div class="tpl-grid">
        ${tpls.map((t, i) => `<label class="tpl"><input type="radio" name="tpl" value="${t.id}"${i === 0 ? ' checked' : ''}><span><strong>${esc(t.name)}</strong><small>${esc(t.areas.map(a => a[0]).join(' · '))}</small></span></label>`).join('')}
        <label class="tpl"><input type="radio" name="tpl" value="blank"><span><strong>Blank</strong><small>Add your own areas and lines</small></span></label>
        <label class="tpl"><input type="radio" name="tpl" value="copy"><span><strong>Copy a past estimate</strong><small>Repriced from today’s cost book</small></span></label>
      </div>
      <div class="field field--wide" data-copy-pick hidden><label for="f_copyFrom">Copy from</label><select id="f_copyFrom" name="copyFrom">${past.map(e => `<option value="${e.id}">${esc(e.number)} · ${esc(e.title)} · ${esc(custName(e.customerId))}</option>`).join('')}</select></div>
      <div class="fields" style="margin-top:16px">
        ${fieldHtml(f('customerId', 'Customer', 'select', { o: () => db.customers.slice().sort((a, b) => a.name.localeCompare(b.name)).map(c => [c.id, c.name]), blank: '+ New customer…' }), preset.customerId || '')}
        ${fieldHtml(f('newCustomer', 'New customer name', 'text', { help: 'Only if the customer isn’t in the list.' }), '')}
        ${fieldHtml(f('title', 'Project title', 'text', { req: true, wide: true, ph: 'e.g. Front lot mill & overlay' }), preset.title || '')}
        ${fieldHtml(f('address', 'Project address', 'text', { wide: true, help: 'Used to find the site on the aerial.' }), preset.address || '')}
        ${fieldHtml(f('estimator', 'Estimator', 'select', { o: () => db.settings.estimators }), preset.estimator || (S.user && db.settings.estimators.includes(S.user.name) ? S.user.name : ''))}
        ${fieldHtml(f('date', 'Date', 'date'), today())}
      </div>
      <input type="hidden" name="leadId" value="${esc(preset.leadId || '')}"><input type="hidden" name="notes" value="${esc(preset.notes || '')}">
    </div>
    <footer class="form__foot"><div class="form__actions"></div><button type="button" class="btn btn--ghost" data-act="close">Cancel</button><button type="submit" class="btn btn--yellow">Create estimate</button></footer>
  </form>`);
}
act({ 'est-new': () => openEstimateNew() });
document.addEventListener('change', e => { if (e.target.name === 'tpl' && e.target.closest('form[data-submit="est-create"]')) $('[data-copy-pick]').hidden = e.target.value !== 'copy'; });

function applyTemplate(est, tpl) {
  const areaIds = tpl.areas.map(([name, kind], i) => { const a = { id: uid(), name, kind, sf: 0, lf: 0, tieIn: 0, ea: 0, shapes: [], color: AREA_COLORS[i % AREA_COLORS.length] }; est.areas.push(a); return a.id; });
  for (const [ref, ai, qty, extra = {}] of tpl.lines) {
    let section = 'base';
    if (extra.section) { let sec = est.sections.find(s => s.name === extra.section); if (!sec) { sec = { id: uid(), type: 'addon', name: extra.section }; est.sections.push(sec); } section = sec.id; }
    const line = { id: uid(), section, qty: qty || '', ...(ref.startsWith('i:') ? { kind: 'item', itemId: ref.slice(2) } : { kind: 'assembly', assemblyId: ref }) };
    if (ai !== null && ai !== undefined) line.areaId = areaIds[ai];
    ['measure', 'depth', 'extraPct'].forEach(k => { if (extra[k] !== undefined) line[k] = extra[k]; });
    est.lines.push(line);
  }
  est.jobType = tpl.id;
  if (tpl.residential) est.depositPct = num(db.settings.depositResidentialPct);
}
onSubmit({
  async 'est-create'(form) {
    const e = form.elements, tplId = form.querySelector('input[name=tpl]:checked').value;
    if (!e.title.value.trim()) return toast('Give the project a title.', 'bad');
    let customerId = e.customerId.value;
    if (!customerId) {
      const name = e.newCustomer.value.trim(); if (!name) return toast('Pick a customer or type a new customer name.', 'bad');
      customerId = (db.customers.find(c => c.name.toLowerCase() === name.toLowerCase()) || await put('customers', { id: uid(), name, type: 'Commercial', contact: '', phone: '', email: '', address: e.address.value.trim(), notes: '' })).id;
    }
    const cust = find('customers', customerId);
    let est = {
      id: uid(), number: nextNumber('estimates', 'E-', 1001), rev: 'A', date: e.date.value || today(), title: e.title.value.trim(), customerId, address: e.address.value.trim(),
      estimator: e.estimator.value, status: 'Draft', leadId: e.leadId.value, notes: e.notes.value, areas: [], lines: [], checks: {}, site: {},
      sections: [{ id: 'base', name: 'Base scope', type: 'base' }], overheadPct: db.settings.overheadPct, marginPct: db.settings.marginPct, haulMin: db.settings.haulMin,
      depositPct: cust && cust.type === 'Residential' ? num(db.settings.depositResidentialPct) : 0, retainagePct: cust && cust.type === 'General contractor' ? num(db.settings.retainagePct) : 0,
      picks: defaultPicks(),
    };
    if (tplId === 'copy') {
      const src = find('estimates', e.copyFrom.value);
      if (src) est = { ...JSON.parse(JSON.stringify(src)), ...pick(est, ['id', 'number', 'rev', 'date', 'title', 'customerId', 'address', 'estimator', 'status', 'leadId']), locked: null, revisions: [], accepted: null, sentOn: '', validUntil: '', approval: null, reviewedBy: '', qbo: null, copiedFrom: src.number };
    } else if (tplId !== 'blank') applyTemplate(est, db.settings.templates.find(t => t.id === tplId));
    await put('estimates', est);
    closeDrawer(); location.hash = `estimates/${est.id}/takeoff`;
  },
});
const pick = (o, keys) => Object.fromEntries(keys.map(k => [k, o[k]]));
const defaultPicks = () => (db.settings.scopeLib || []).filter(x => x.kind === 'exclusion' || ['c-access', 'c-measure', 'c-mob', 'c-weather'].includes(x.id)).map(x => x.id);

/* ---------------------------------------------------------------- workspace */
// `cur` is the working copy; it autosaves half a second after the last change.
let cur = null, saveT = null, dirty = false;
const locked = () => cur && ['Sent', 'Accepted', 'Declined'].includes(cur.status);
function save(now) {
  clearTimeout(saveT); dirty = true;
  const go = () => { dirty = false; cur.priced = pricedLines(cur, db.settings); setSaved('Saving…'); return put('estimates', JSON.parse(JSON.stringify(cur))).then(() => setSaved('All changes saved')); };
  if (now) return go();
  saveT = setTimeout(go, 500); setSaved('Editing…');
  return null;
}
const setSaved = t => { const s = $('[data-save-state]'); if (s) s.textContent = t; };
const P = () => priceEstimate(cur, db.settings);

function workspace(id, step) {
  const e = find('estimates', id);
  if (!e) return hero({ title: 'Estimate not found', back: '#estimates' });
  if (!cur || cur.id !== id || !dirty) cur = JSON.parse(JSON.stringify(e));
  cur.sections = cur.sections && cur.sections.length ? cur.sections : [{ id: 'base', name: 'Base scope', type: 'base' }];
  cur.areas = cur.areas || []; cur.checks = cur.checks || {}; cur.site = cur.site || {}; cur.picks = cur.picks || defaultPicks();
  const p = P(), rv = review(p);
  const job = db.jobs.find(j => j.estimateId === cur.id);
  const lead = cur.leadId && find('leads', cur.leadId);
  const next = cur.status === 'Draft' ? (rv.ready ? btn('Mark sent', 'est-sent', { ic: 'check' }) : linkBtn(`Review · ${rv.open} to do`, `#estimates/${cur.id}/review`, { ic: 'check' }))
    : cur.status === 'Sent' ? btn('Customer accepted', 'est-accept', { ic: 'check' }) + btn('Revise', 'est-revise', { kind: 'outline' })
    : cur.status === 'Accepted' && !job ? btn('Create job', 'est-job', { ic: 'hammer' }) : job ? linkBtn('Open job', `#jobs/${job.id}`, { kind: 'outline', ic: 'hammer' }) : '';
  const steps = [['takeoff', `Takeoff${cur.areas.length ? ` · ${cur.areas.length}` : ''}`], ['pricing', `Pricing · ${money(p.headline.price)}`], ['review', rv.ready ? 'Review ✓' : `Review · ${rv.open}`], ['proposal', 'Proposal']];
  const body = { takeoff, pricing, review: reviewStep, proposal }[step] || pricing;
  const out = body(p, rv);
  return {
    html: hero({
      back: '#estimates', eyebrow: `${esc(cur.number)}${cur.rev && cur.rev !== 'A' ? ` · Rev ${esc(cur.rev)}` : ''} · ${badge(cur.status)} ${qbBadge(cur)}`,
      title: esc(cur.title || 'Untitled estimate'),
      meta: `<span>${icon('users')}${esc(custName(cur.customerId))}</span>${cur.address ? `<span>${icon('map')}${esc(cur.address)}</span>` : ''}${cur.estimator ? `<span>${icon('briefcase')}${esc(cur.estimator)}</span>` : ''}<span>${icon('calendar')}${fmtDate(cur.date)}</span>${cur.validUntil ? `<span>${icon('clock')}Valid until ${fmtDate(cur.validUntil)}</span>` : ''}${lead ? `<a href="#sales/leads?open=${lead.id}">${icon('inbox')}Lead</a>` : ''}`,
      actions: btn('Proposal', 'est-print', { kind: 'outline', ic: 'print' }) + next,
    }) + tabs(steps, step, `estimates/${cur.id}`) + `<div class="page est">
      ${locked() ? `<p class="alert">${icon('check')} ${cur.status === 'Sent' ? `Sent ${cur.sentOn ? fmtDate(cur.sentOn) : ''} — prices are locked to what the customer saw. Use <b>Revise</b> to change anything.` : `This estimate is ${cur.status.toLowerCase()} and locked.`}</p>` : ''}
      ${out.html || out}
    </div>`,
    after: out.after,
  };
}

/* ---------------------------------------------------------------- 1 · Takeoff */
let omap = null;
function takeoff() {
  const ro = locked();
  const used = a => cur.lines.filter(l => l.areaId === a.id).length;
  const areaCard = (a, i) => `<div class="area" style="--c:${a.color || AREA_COLORS[i % AREA_COLORS.length]}" data-area="${a.id}">
    <div class="area__head"><span class="area__dot"></span><input class="area__name" value="${esc(a.name)}" data-on-input="area-field" data-k="name" aria-label="Area name"${ro ? ' disabled' : ''}>
      <select data-on-change="area-field" data-k="kind" aria-label="Kind"${ro ? ' disabled' : ''}>${Object.entries(KIND_LABEL).map(([k, l]) => `<option value="${k}"${k === a.kind ? ' selected' : ''}>${l}</option>`).join('')}</select>
      ${ro ? '' : `<button type="button" class="x" data-act="area-del" aria-label="Remove area">×</button>`}</div>
    <div class="area__nums">
      ${a.kind === 'area' ? `${numIn(a, 'sf', 'SF')}<div class="area__ro"><small>SY</small><b>${fix(num(a.sf) / 9, 0)}</b></div>${numIn(a, 'lf', 'Perimeter LF')}${numIn(a, 'tieIn', 'Tie-in LF')}`
        : a.kind === 'linear' ? numIn(a, 'lf', 'Length LF') : numIn(a, 'ea', 'Count')}
    </div>
    <div class="area__foot">${a.kind !== 'count' && !ro ? btn((a.shapes || []).length ? 'Re-measure' : 'Measure on aerial', 'area-measure', { kind: (a.shapes || []).length ? 'ghost' : 'black', size: 'sm', ic: 'ruler' }) : ''}<small class="muted">${used(a) ? `Drives ${used(a)} line${used(a) === 1 ? '' : 's'}` : 'Not used by any line yet'}${(a.shapes || []).length ? ` · ${(a.shapes || []).length} shape${a.shapes.length === 1 ? '' : 's'} drawn` : ''}</small></div>
  </div>`;
  const numIn = (a, k, l) => `<label class="area__num"><small>${l}</small><input type="number" step="any" value="${esc(round(num(a[k]), 1) || '')}" data-on-input="area-field" data-k="${k}"${ro ? ' disabled' : ''}></label>`;
  const s = cur.site;
  return {
    html: `<div class="takeoff">
      <div class="takeoff__map card"><div class="map map--tall" id="takeoff-map"></div></div>
      <div class="stack">
        ${card('Measured areas', `${cur.areas.map(areaCard).join('') || '<p class="muted">No areas yet. Add one for each part of the job — “Front lot”, “Drive lane”, “Curb run”.</p>'}
          ${ro ? '' : `<div class="btn-row">${btn('Add area', 'area-add', { kind: 'ghost', size: 'sm', ic: 'plus', attrs: 'data-kind="area"' })}${btn('Add linear run', 'area-add', { kind: 'ghost', size: 'sm', ic: 'plus', attrs: 'data-kind="linear"' })}${btn('Add count', 'area-add', { kind: 'ghost', size: 'sm', ic: 'plus', attrs: 'data-kind="count"' })}</div>`}
          <p class="muted small">Lines on the Pricing step stay linked to these areas — re-measure and every linked line updates. Draw islands and buildings as cut-outs; trace edges that meet existing pavement as tie-ins (saw cut).</p>`, { eyebrow: 'Step 1 · Takeoff' })}
        ${card('Site visit', `<div class="fields">
          ${fieldHtml(f('s_surface', 'Existing surface', 'select', { o: ['Existing asphalt', 'Milled asphalt', 'Concrete', 'Gravel', 'Dirt / new', 'Mixed'] }), s.surface || '')}
          ${fieldHtml(f('s_access', 'Access & phasing', 'text', { ph: 'One entrance? Gate code? Hours?' }), s.access || '')}
          ${fieldHtml(f('s_drainage', 'Drainage & slopes', 'text', { ph: 'Low spots, slopes under 1–2%' }), s.drainage || '')}
          ${fieldHtml(f('s_condition', 'Condition & concerns', 'textarea', { wide: true, rows: 2, ph: 'Base failures, soft spots, structures to raise…' }), s.condition || '')}
        </div>`, { eyebrow: 'Notes for the estimate (internal)' })}
        <div class="btn-row">${linkBtn('Next: pricing', `#estimates/${cur.id}/pricing`, { ic: 'arrow' })}<span class="save-state" data-save-state>All changes saved</span></div>
      </div>
    </div>`,
    after() { drawOverview(); return () => { if (omap) { omap.remove(); omap = null; } }; },
  };
}
function drawOverview() {
  const el = $('#takeoff-map'); if (!el) return;
  if (!window.L) { el.innerHTML = '<p class="map__off">The aerial couldn’t load. You can still type quantities.</p>'; return; }
  omap = L.map(el, { scrollWheelZoom: false }).setView([db.settings.lat, db.settings.lon], 12);
  omap.on('click focus', () => omap.scrollWheelZoom.enable()); omap.on('mouseout blur', () => omap.scrollWheelZoom.disable());
  L.tileLayer(...ESRI).addTo(omap);
  const layers = [];
  cur.areas.forEach((a, i) => (a.shapes || []).forEach(sh => {
    const c = a.color || AREA_COLORS[i % AREA_COLORS.length];
    const lyr = sh.mode === 'area' ? L.polygon(sh.pts, { color: c, weight: 3, fillOpacity: .25 }) : sh.mode === 'cut' ? L.polygon(sh.pts, { color: '#ef4444', weight: 2, dashArray: '5 4', fillOpacity: .15 }) : L.polyline(sh.pts, { color: sh.mode === 'tieIn' ? '#ef4444' : c, weight: 4, dashArray: sh.mode === 'tieIn' ? '6 6' : null });
    lyr.bindTooltip(`${esc(a.name)}${a.kind === 'area' ? ` · ${fix(num(a.sf) / 9, 0)} SY` : a.kind === 'linear' ? ` · ${fix(a.lf, 0)} LF` : ''}`, { sticky: true }).addTo(omap); layers.push(lyr);
  }));
  if (layers.length) omap.fitBounds(L.featureGroup(layers).getBounds(), { padding: [30, 30], maxZoom: 20 });
  else if (cur.address) geocode(cur.address).then(h => { if (h && omap) omap.setView([h.lat, h.lng], 18); }).catch(() => {});
  setTimeout(() => omap && omap.invalidateSize(), 200);
}
const areaOf = el => cur.areas.find(a => a.id === el.closest('[data-area]').dataset.area);
onInput({
  'area-field'(el) { const a = areaOf(el), k = el.dataset.k; a[k] = ['sf', 'lf', 'tieIn', 'ea'].includes(k) ? num(el.value) : el.value; if (k === 'sf') { const ro = el.closest('.area').querySelector('.area__ro b'); if (ro) ro.textContent = fix(num(el.value) / 9, 0); } save(); },
});
onChange({
  'area-field'(el) { const a = areaOf(el); a[el.dataset.k] = el.value; save(true).then(() => ui.rerender()); },
});
document.addEventListener('input', e => {
  const t = e.target; if (!cur || !t.name || !t.name.startsWith('s_') || !t.closest('.takeoff')) return;
  cur.site[t.name.slice(2)] = t.value; save();
});
document.addEventListener('change', e => { const t = e.target; if (cur && t.name === 's_surface' && t.closest('.takeoff')) { cur.site.surface = t.value; save(); } });
act({
  async 'area-add'(el) {
    const kind = el.dataset.kind, n = cur.areas.filter(a => a.kind === kind).length + 1;
    cur.areas.push({ id: uid(), name: kind === 'area' ? `Area ${n}` : kind === 'linear' ? `Linear run ${n}` : `Count ${n}`, kind, sf: 0, lf: 0, tieIn: 0, ea: 0, shapes: [], color: AREA_COLORS[cur.areas.length % AREA_COLORS.length] });
    await save(true); ui.rerender(); const last = $$('.area__name').pop(); if (last) { last.focus(); last.select(); }
  },
  async 'area-del'(el) {
    const a = areaOf(el), n = cur.lines.filter(l => l.areaId === a.id).length;
    if (!confirmTwice(el, n ? `Unlink ${n} line${n === 1 ? '' : 's'}?` : 'Remove?')) return;
    cur.lines.forEach(l => { if (l.areaId === a.id) { l.qty = round(areaQty(a, lineUnit(l, db.settings), l.depth, l.measure), 1); delete l.areaId; } });
    cur.areas = cur.areas.filter(x => x !== a); await save(true); ui.rerender();
  },
  'area-measure'(el) { openMeasure(areaOf(el).id); },
});

/* measuring tool: draw areas, cut-outs, tie-in edges and linear runs on the aerial */
let mmap = null, shapes = [], current = null, mode = 'area', mArea = null;
const R = 6378137, M2_SF = 10.7639, M_FT = 3.28084;
function areaM2(pts) { // planar approximation around the centre — accurate for job-site sized areas
  if (pts.length < 3) return 0;
  const lat0 = pts.reduce((t, p) => t + p.lat, 0) / pts.length * Math.PI / 180;
  const xy = pts.map(p => [R * p.lng * Math.PI / 180 * Math.cos(lat0), R * p.lat * Math.PI / 180]);
  let a = 0; for (let i = 0; i < xy.length; i++) { const [x1, y1] = xy[i], [x2, y2] = xy[(i + 1) % xy.length]; a += x1 * y2 - x2 * y1; }
  return Math.abs(a) / 2;
}
const lenM = (pts, closed) => { if (!mmap) return 0; let t = 0; for (let i = 1; i < pts.length; i++) t += mmap.distance(pts[i - 1], pts[i]); if (closed && pts.length > 2) t += mmap.distance(pts[pts.length - 1], pts[0]); return t; };
function totals() {
  const all = [...shapes, ...(current && current.pts.length ? [current] : [])];
  const sum = (m, fn) => all.filter(s => s.mode === m).reduce((t, s) => t + fn(s), 0);
  const sf = Math.max(0, sum('area', s => areaM2(s.pts)) - sum('cut', s => areaM2(s.pts))) * M2_SF;
  const perim = (sum('area', s => lenM(s.pts, true)) + sum('cut', s => lenM(s.pts, true))) * M_FT;
  return { sf, perim, tieIn: sum('tieIn', s => lenM(s.pts)) * M_FT, length: sum('length', s => lenM(s.pts)) * M_FT };
}
function openMeasure(areaId) {
  mArea = cur.areas.find(a => a.id === areaId);
  mode = mArea.kind === 'linear' ? 'length' : 'area'; current = null;
  const modes = mArea.kind === 'linear' ? [['length', 'Length']] : [['area', 'Area'], ['cut', 'Cut-out'], ['tieIn', 'Tie-in edge']];
  openDrawer(`<div class="form measure" data-no-autofocus>
    <header class="form__head"><div><span class="eyebrow eyebrow--sm">Measure · ${esc(cur.title)}</span><h2>${esc(mArea.name)}</h2></div><button type="button" class="x x--lg" data-act="close" aria-label="Close">×</button></header>
    <div class="measure__bar">
      <div class="seg">${modes.map(([v, l]) => `<button type="button" data-act="m-mode" data-v="${v}" class="${v === mode ? 'is-on' : ''}">${l}</button>`).join('')}</div>
      <input class="search" placeholder="Find an address…" value="${esc(cur.address || '')}" data-on-change="m-find" aria-label="Find an address">
      ${btn('Undo point', 'm-undo', { kind: 'ghost', size: 'sm' })}${btn('Finish shape', 'm-next', { kind: 'ghost', size: 'sm' })}${btn('Clear all', 'm-clear', { kind: 'ghost', size: 'sm' })}
    </div>
    <p class="measure__help muted small">Click around the edge; double-click to finish a shape. ${mArea.kind === 'area' ? '<b>Cut-out</b> removes islands and buildings. <b>Tie-in edge</b>: trace where new paving meets existing pavement (drives saw-cut LF).' : 'Click along the run; double-click to finish.'}</p>
    <div class="measure__map" id="measure-map"></div>
    <footer class="form__foot measure__foot"><div class="measure__total" data-m-total></div><button type="button" class="btn btn--ghost" data-act="close">Cancel</button><button type="button" class="btn btn--yellow" data-act="m-save">Save measurement</button></footer>
  </div>`, { wide: true, onClose: () => { if (mmap) { mmap.remove(); mmap = null; } } });
  if (!window.L) { $('#measure-map').innerHTML = '<p class="map__off">The map couldn’t load. Check the internet connection.</p>'; return; }
  mmap = L.map('measure-map', { doubleClickZoom: false }).setView([db.settings.lat, db.settings.lon], 12);
  L.tileLayer(...ESRI).addTo(mmap);
  // other areas, faint, for context
  cur.areas.filter(a => a !== mArea).forEach(a => (a.shapes || []).forEach(sh => (sh.mode === 'area' ? L.polygon(sh.pts, { color: '#fff', weight: 1, fillOpacity: .08, interactive: false }) : L.polyline(sh.pts, { color: '#fff', weight: 1, interactive: false })).addTo(mmap)));
  shapes = (mArea.shapes || []).map(sh => { const s = newShape(sh.mode); s.pts = sh.pts.map(p => L.latLng(p[0], p[1])); draw(s); return s; });
  mmap.on('click', ev => { if (!current) current = newShape(mode); current.pts.push(ev.latlng); draw(current); });
  mmap.on('dblclick', () => finishShape());
  setTimeout(() => {
    if (!mmap) return; mmap.invalidateSize();
    const all = shapes.flatMap(s => s.pts);
    if (all.length) mmap.fitBounds(L.latLngBounds(all), { padding: [40, 40], maxZoom: 20 });
    else if (cur.address) geocode(cur.address).then(h => { if (h && mmap) mmap.setView([h.lat, h.lng], 19); }).catch(() => {});
  }, 250);
  showTotal();
}
const STYLE = { area: { color: '#fecf0e', weight: 3, fillColor: '#fecf0e', fillOpacity: .25 }, cut: { color: '#ef4444', weight: 2, dashArray: '5 4', fillColor: '#ef4444', fillOpacity: .2 }, tieIn: { color: '#ef4444', weight: 4, dashArray: '6 6' }, length: { color: '#38bdf8', weight: 4 } };
const newShape = m => ({ mode: m, pts: [], layer: null, dots: L.layerGroup().addTo(mmap) });
function draw(s) {
  if (s.layer) s.layer.remove();
  s.layer = ((s.mode === 'area' || s.mode === 'cut') && s.pts.length > 2 ? L.polygon(s.pts, STYLE[s.mode]) : L.polyline(s.pts, STYLE[s.mode])).addTo(mmap);
  s.dots.clearLayers(); if (s === current) s.pts.forEach(p => L.circleMarker(p, { radius: 4, color: '#111', weight: 2, fillColor: '#fecf0e', fillOpacity: 1 }).addTo(s.dots));
  showTotal();
}
function finishShape() {
  if (!current) return;
  const min = current.mode === 'area' || current.mode === 'cut' ? 3 : 2;
  if (current.pts.length >= min) { current.dots.clearLayers(); shapes.push(current); } else { if (current.layer) current.layer.remove(); current.dots.remove(); }
  current = null; showTotal();
}
function showTotal() {
  const el = $('[data-m-total]'); if (!el) return;
  const t = totals();
  el.innerHTML = mArea.kind === 'linear' ? `<strong>${fix(t.length, 0)} LF</strong>` : `<strong>${fix(t.sf, 0)} SF · ${fix(t.sf / 9, 0)} SY</strong> <span class="muted">· perimeter ${fix(t.perim, 0)} LF · tie-in ${fix(t.tieIn, 0)} LF</span>`;
}
async function findAddress(q) { try { const hit = await geocode(q); if (hit && mmap) mmap.setView([hit.lat, hit.lng], 19); } catch (e) { /* stay put */ } }
act({
  'm-mode'(el) { finishShape(); mode = el.dataset.v; $$('[data-act="m-mode"]').forEach(b => b.classList.toggle('is-on', b === el)); },
  'm-undo'() { if (current && current.pts.length) { current.pts.pop(); draw(current); } else if (shapes.length) { current = shapes.pop(); current.pts.pop(); draw(current); } },
  'm-next'() { finishShape(); },
  'm-clear'(el) { if (!confirmTwice(el, 'Clear every shape?')) return; [...shapes, current].filter(Boolean).forEach(s => { if (s.layer) s.layer.remove(); s.dots.remove(); }); shapes = []; current = null; showTotal(); },
  async 'm-save'() {
    finishShape();
    const t = totals();
    mArea.shapes = shapes.map(s => ({ mode: s.mode, pts: s.pts.map(p => [round(p.lat, 7), round(p.lng, 7)]) }));
    if (mArea.kind === 'linear') mArea.lf = round(t.length, 1); else Object.assign(mArea, { sf: round(t.sf, 1), lf: round(t.perim, 1), tieIn: round(t.tieIn, 1) });
    closeDrawer(); await save(true); ui.rerender();
    toast(mArea.kind === 'linear' ? `${mArea.name}: ${fix(mArea.lf, 0)} LF.` : `${mArea.name}: ${fix(mArea.sf / 9, 0)} SY — linked lines updated.`);
  },
});
onChange({ 'm-find'(el) { if (el.value.trim()) findAddress(el.value.trim()); } });

/* ---------------------------------------------------------------- 2 · Pricing */
function pricing(p) {
  const ro = locked(), custView = !!ui.custView;
  const empty = !cur.lines.length;
  return `${empty && !ro ? card('Start from a job type', `<div class="tpl-grid tpl-grid--inline">${(db.settings.templates || []).map(t => `<button type="button" class="tpl tpl--btn" data-act="tpl-apply" data-id="${t.id}"><strong>${esc(t.name)}</strong><small>${esc(t.areas.map(a => a[0]).join(' · '))}</small></button>`).join('')}</div><p class="muted small">Adds the areas and lines for that kind of job. Or type below to add lines one at a time.</p>`, { eyebrow: 'Quick start' }) : ''}
  <div class="est__grid${custView ? ' is-custview' : ''}">
    <div class="est__main">
      ${ro ? '' : `<div class="quick-add">
        ${icon('plus')}<input type="search" placeholder="Add a line — type overlay, curb, mobilization…   ( / )" data-on-input="qa-search" data-qa autocomplete="off" aria-label="Add a line">
        <select data-qa-sec aria-label="Add to section">${cur.sections.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select>
        <ul class="quick-add__list" hidden></ul>
      </div>`}
      <div class="est-toolbar"><label class="toggle"><input type="checkbox" data-on-change="cust-view"${custView ? ' checked' : ''}> Customer view (hide costs)</label><span class="muted small">${cur.areas.length ? `${cur.areas.length} measured area${cur.areas.length === 1 ? '' : 's'} · <a href="#estimates/${cur.id}/takeoff">edit takeoff</a>` : `<a href="#estimates/${cur.id}/takeoff">Measure areas</a> to link quantities`}</span></div>
      ${p.sections.map(sec => sectionHtml(sec, ro)).join('')}
      ${ro ? '' : `<div class="est__add">${btn('Add option (good / better / best)', 'sec-add', { kind: 'ghost', size: 'sm', ic: 'plus', attrs: 'data-type="option"' })}${btn('Add an add-on', 'sec-add', { kind: 'ghost', size: 'sm', ic: 'plus', attrs: 'data-type="addon"' })}</div>`}
    </div>
    <aside class="est__aside">${summaryHtml(p)}</aside>
  </div>`;
}
function sectionHtml(sec, ro) {
  return `<section class="card est-sec est-sec--${sec.type}" data-sec="${sec.id}">
    <header class="est-sec__head">
      <span class="est-sec__type">${SEC_TYPES[sec.type]}</span>
      <input class="est-sec__name" value="${esc(sec.name)}" data-on-input="sec-name" data-sec="${sec.id}" aria-label="Section name"${ro ? ' disabled' : ''}>
      <span class="est-sec__total"><strong data-sec-price="${sec.id}">${money(sec.price)}</strong><small data-sec-margin="${sec.id}" class="cost-only">${pct(sec.margin)} margin</small></span>
      ${!ro && sec.type !== 'base' ? `<button type="button" class="x" data-act="sec-del" data-sec="${sec.id}" aria-label="Remove section">×</button>` : ''}
    </header>
    <div class="est-lines-wrap"><table class="est-lines">
      <thead><tr><th>Item</th><th class="r">Quantity</th><th class="r">Depth"</th><th class="r cost-only">Cost</th><th class="r">Unit price</th><th class="r">Total</th><th></th></tr></thead>
      <tbody>${sec.lines.map(r => lineHtml(r, ro)).join('') || `<tr><td colspan="7" class="muted est-lines__empty">No lines yet — type above to add one.</td></tr>`}</tbody>
    </table></div>
  </section>`;
}
function qtyCell(r, ro) {
  const l = r.line, dis = ro ? ' disabled' : '';
  const areas = cur.areas.filter(a => (r.unit === 'LF' ? true : r.unit === 'EA' ? a.kind === 'count' : ['SY', 'SF', 'CY'].includes(r.unit) ? a.kind === 'area' : false));
  const linkSel = areas.length || l.areaId ? `<select class="qty__link" data-on-change="line-field" data-k="areaId" aria-label="Quantity from"${dis}><option value="">Typed</option>${areas.map(a => `<option value="${a.id}"${a.id === l.areaId ? ' selected' : ''}>${esc(a.name)}</option>`).join('')}</select>` : '';
  if (!l.areaId) return `<div class="qty"><input type="number" step="any" value="${esc(l.qty)}" data-on-input="line-field" data-k="qty" aria-label="Quantity"${dis}><span class="qty__unit">${esc(r.unit)}</span></div>${linkSel}`;
  const a = cur.areas.find(x => x.id === l.areaId);
  return `<div class="qty qty--linked" title="From the takeoff">${icon('ruler')}<b data-cell="qty">${fix(r.qty, 1)}</b><span class="qty__unit">${esc(r.unit)}</span></div>
    <div class="qty__opts">${linkSel}${r.unit === 'LF' && a && a.kind === 'area' ? `<select data-on-change="line-field" data-k="measure" aria-label="Which edge"${dis}><option value=""${l.measure !== 'tieIn' ? ' selected' : ''}>Perimeter</option><option value="tieIn"${l.measure === 'tieIn' ? ' selected' : ''}>Tie-in</option></select>` : ''}<label class="qty__extra">+<input type="number" step="1" value="${esc(l.extraPct ?? '')}" placeholder="0" data-on-input="line-field" data-k="extraPct" aria-label="Extra percent"${dis}>%</label></div>`;
}
function lineHtml(r, ro) {
  const l = r.line, a = l.kind === 'assembly' && db.settings.assemblies.find(x => x.id === l.assemblyId);
  const dis = ro ? ' disabled' : '';
  const depthCell = a && num(a.thick) ? `<input type="number" step="0.5" value="${esc(l.thick ?? '')}" placeholder="${a.thick}" data-on-input="line-field" data-k="thick" aria-label="Depth in inches"${dis}>`
    : r.unit === 'CY' && l.areaId ? `<input type="number" step="1" value="${esc(l.depth ?? '')}" placeholder="in" data-on-input="line-field" data-k="depth" aria-label="Dig depth in inches"${dis}>`
    : l.kind === 'custom' ? `<input type="number" step="0.01" value="${esc(l.unitCost ?? '')}" placeholder="cost/unit" data-on-input="line-field" data-k="unitCost" aria-label="Unit cost"${dis}>` : '<span class="muted">—</span>';
  return `<tr class="est-line${num(r.qty) ? '' : ' is-zero'}" data-line="${l.id}">
    <td class="est-line__desc">
      <input value="${esc(l.desc || '')}" placeholder="${esc(r.desc)}" data-on-input="line-field" data-k="desc" aria-label="Description"${dis}>
      <small>${a ? `${esc(a.cat)} assembly · ${fix(a.prod, 0)} ${a.unit}/day` : l.kind === 'item' ? 'Cost book item' : `<select data-on-change="line-field" data-k="costType" aria-label="Cost type"${dis}>${COST_TYPES.map(t => `<option${t === (l.costType || 'Other') ? ' selected' : ''}>${t}</option>`).join('')}</select> ${l.kind === 'custom' ? `<select data-on-change="line-field" data-k="unit" aria-label="Unit"${dis}>${UNITS.map(u => `<option${u === (l.unit || 'EA') ? ' selected' : ''}>${u}</option>`).join('')}</select>` : ''}`}
        · <button type="button" class="linkish" data-act="line-break">${r.parts.length ? 'Breakdown & notes' : 'Notes'}</button>${l.note ? ' · <span title="Customer note">📝</span>' : ''}</small>
    </td>
    <td class="r">${qtyCell(r, ro)}</td>
    <td class="r">${depthCell}</td>
    <td class="r muted cost-only" data-cell="cost">${money(r.total)}</td>
    <td class="r"><input type="number" step="0.01" value="${esc(l.priceEach ?? '')}" placeholder="${round(r.unitPrice, 2)}" data-on-input="line-field" data-k="priceEach" aria-label="Unit price (leave empty to use the margin)" class="${r.overridden ? 'is-override' : ''}"${dis}></td>
    <td class="r" data-cell="price"><strong>${money(r.price)}</strong></td>
    <td>${ro ? '' : '<button type="button" class="x" data-act="line-del" aria-label="Remove line">×</button>'}</td>
  </tr>
  <tr class="est-break" data-break="${l.id}" hidden><td colspan="7">
    <div class="est-break__notes"><label>Note for the customer (prints under this line)<input value="${esc(l.note || '')}" data-on-input="line-field" data-k="note"${dis}></label><label>Internal note<input value="${esc(l.internal || '')}" data-on-input="line-field" data-k="internal"${dis}></label></div>
    <div class="cost-only">${breakdownHtml(r)}</div>
  </td></tr>`;
}
const breakdownHtml = r => r.parts.length ? `<table class="parts"><thead><tr><th>Part</th><th class="r">Qty</th><th>Unit</th><th class="r">Unit cost</th><th class="r">Cost</th><th>Type</th></tr></thead><tbody>${r.parts.map(x => `<tr><td>${esc(x.name)}</td><td class="r">${fix(x.qty, 2)}</td><td>${esc(x.unit)}</td><td class="r">${money(x.unitCost, true)}</td><td class="r">${money(x.cost)}</td><td>${esc(x.type)}</td></tr>`).join('')}</tbody></table>` : '';

function summaryHtml(p) {
  const target = p.hasOptions && !p.chosenOption ? p.headline : p.contract;
  const lines = p.contract.sections.flatMap(s => s.lines).concat(p.hasOptions && !p.chosenOption && p.options[0] ? p.options[0].lines : []);
  const cost = Object.fromEntries(COST_KEYS.map(k => [k, lines.reduce((t, l) => t + l.cost[k], 0)]));
  const sum = k => lines.reduce((t, l) => t + num(l[k]), 0);
  const ohCost = target.cost * p.oh, profit = target.price - target.cost - ohCost, margin = target.price ? profit / target.price : 0;
  const markup = target.cost ? (target.price - target.cost) / target.cost : 0;
  const maxC = Math.max(1, ...Object.values(cost));
  const sy = lines.filter(l => l.unit === 'SY' || l.unit === 'SF').reduce((t, l) => Math.max(t, l.unit === 'SY' ? l.qty : l.qty / 9), 0);
  const tonsPerDay = sum('days') ? (sum('hmaTons') + sum('baseTons')) / Math.max(1, Math.ceil(sum('days'))) : 0;
  const cycleMin = 2 * num(cur.haulMin ?? db.settings.haulMin) + num(db.settings.loadMin);
  const trucks = tonsPerDay ? Math.ceil(tonsPerDay / num(db.settings.truckTons || 20) * cycleMin / (num(db.settings.crews[0]?.hoursPerDay || 10) * 60)) : 0;
  const warn = num(db.settings.marginWarnPct) / 100, floor = num(db.settings.marginFloorPct) / 100;
  const ro = locked() ? ' disabled' : '';
  return `<div class="card sum">
    <span class="eyebrow eyebrow--sm">${p.hasOptions && !p.chosenOption ? 'Base + first option' : 'Contract'}</span>
    <div class="sum__price" data-sum="price">${money(target.price)}</div>
    ${sy ? `<div class="sum__per">${money(target.price / sy, true)} per SY</div>` : ''}
    <div class="cost-only">
      <div class="sum__row"><span>Direct cost</span><b>${money(target.cost)}</b></div>
      <div class="sum__row"><span>Overhead</span><b>${money(ohCost)}</b></div>
      <div class="sum__row sum__row--hl"><span>Gross profit</span><b class="${profit < 0 ? 'txt-bad' : ''}">${money(profit)}</b></div>
      <div class="sum__pills"><span class="${margin < floor ? 'is-bad' : margin < warn ? 'is-warn' : ''}">Margin <b>${pct(margin, 1)}</b><small>profit ÷ price</small></span><span>Markup <b>${pct(markup, 0)}</b><small>÷ cost</small></span></div>
      ${margin < floor ? `<p class="alert alert--bad">Below the ${pct(floor)} floor — needs owner approval to send.</p>` : margin < warn ? `<p class="alert">Under the ${pct(warn)} target by ${money(target.price * (warn - margin))}.</p>` : ''}
      <div class="sum__inputs">
        <label>Overhead %<input type="number" step="0.5" value="${esc(cur.overheadPct ?? db.settings.overheadPct)}" data-on-input="est-pct" data-k="overheadPct"${ro}></label>
        <label>Target margin %<input type="number" step="0.5" value="${esc(cur.marginPct ?? db.settings.marginPct)}" data-on-input="est-pct" data-k="marginPct"${ro}></label>
      </div>
    </div>
  </div>
  <div class="card sum cost-only">
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
    ${trucks ? `<small class="muted">≈ ${trucks} truck${trucks === 1 ? '' : 's'} to keep the crew supplied (${fix(tonsPerDay, 0)} t/day, ${cycleMin}-min cycle).</small>` : ''}
  </div>
  ${p.hasOptions ? `<div class="card sum"><span class="eyebrow eyebrow--sm">Options for the customer</span>${p.options.map(o => `<div class="sum__row"><span>${esc(o.name)}</span><b>${money(o.price)}</b></div>`).join('')}${p.sections.filter(s => s.type === 'addon').map(o => `<div class="sum__row"><span>+ ${esc(o.name)}</span><b>${money(o.price)}</b></div>`).join('')}</div>` : ''}
  <p class="save-state" data-save-state>All changes saved</p>
  <div class="sum__more">${btn('Details', 'est-details', { kind: 'ghost', size: 'sm' })}${btn('Duplicate', 'est-dup', { kind: 'ghost', size: 'sm', ic: 'copy' })}${S.mode === 'server' && can.qbo() ? btn(cur.qbo ? 'Update QuickBooks' : 'Send to QuickBooks', 'est-qbo', { kind: 'ghost', size: 'sm', ic: 'qb' }) : ''}${['Draft', 'Sent'].includes(cur.status) ? btn('Declined', 'est-decline', { kind: 'ghost', size: 'sm' }) : ''}${btn('Delete', 'est-del', { kind: 'danger', size: 'sm' })}</div>`;
}

/* live updates without re-rendering (keeps the cursor in place) */
function refresh() {
  const p = P();
  p.lines.forEach(r => {
    const tr = $(`tr[data-line="${r.line.id}"]`); if (!tr) return;
    $('[data-cell="cost"]', tr).textContent = money(r.total);
    $('[data-cell="price"]', tr).innerHTML = `<strong>${money(r.price)}</strong>`;
    const q = $('[data-cell="qty"]', tr); if (q) q.textContent = fix(r.qty, 1);
    tr.classList.toggle('is-zero', !num(r.qty));
    const pe = $('[data-k="priceEach"]', tr); pe.placeholder = round(r.unitPrice, 2); pe.classList.toggle('is-override', r.overridden);
    $('[data-k="desc"]', tr).placeholder = r.desc;
    const br = $(`[data-break="${r.line.id}"] .cost-only`); if (br) br.innerHTML = breakdownHtml(r);
  });
  p.sections.forEach(s => { const a = $(`[data-sec-price="${s.id}"]`), m = $(`[data-sec-margin="${s.id}"]`); if (a) a.textContent = money(s.price); if (m) m.textContent = `${pct(s.margin)} margin`; });
  const aside = $('.est__aside');
  if (aside) { const focused = document.activeElement && aside.contains(document.activeElement) ? document.activeElement.dataset.k : null; aside.innerHTML = summaryHtml(p); if (focused) { const el = $(`[data-k="${focused}"]`, aside); if (el) { el.focus(); const v = el.value; el.value = ''; el.value = v; } } }
}
onInput({
  'line-field'(el) {
    const tr = el.closest('tr'), id = tr.dataset.line || tr.dataset.break, l = cur.lines.find(x => x.id === id); if (!l) return;
    const k = el.dataset.k; l[k] = ['qty', 'thick', 'priceEach', 'unitCost', 'depth', 'extraPct'].includes(k) ? (el.value === '' ? '' : num(el.value)) : el.value;
    refresh(); save();
  },
  'sec-name'(el) { cur.sections.find(x => x.id === el.dataset.sec).name = el.value; save(); },
  'est-pct'(el) { cur[el.dataset.k] = el.value === '' ? '' : num(el.value); refresh(); save(); },
});
onChange({
  async 'line-field'(el) {
    const id = el.closest('tr').dataset.line, l = cur.lines.find(x => x.id === id), k = el.dataset.k;
    if (k === 'areaId' && !el.value && l.areaId) { const a = cur.areas.find(x => x.id === l.areaId); if (a) l.qty = round(areaQty(a, lineUnit(l, db.settings), l.depth, l.measure), 1); }
    l[k] = el.value; if (k === 'areaId' && !el.value) delete l.areaId;
    await save(true); ui.rerender();
  },
  'cust-view'(el) { ui.custView = el.checked; ui.rerender(); },
});
act({
  async 'line-del'(el) { const id = el.closest('tr').dataset.line; cur.lines = cur.lines.filter(l => l.id !== id); await save(true); ui.rerender(); },
  'line-break'(el) { const id = el.closest('tr').dataset.line, row = $(`[data-break="${id}"]`); row.hidden = !row.hidden; },
  async 'sec-add'(el) {
    const type = el.dataset.type, n = cur.sections.filter(s => s.type === type).length, names = ['Good', 'Better', 'Best'];
    cur.sections.push({ id: uid(), type, name: type === 'option' ? `${names[n] || 'Option ' + (n + 1)} — describe this option` : 'Add-on — describe it' });
    await save(true); ui.rerender();
  },
  async 'sec-del'(el) { if (!confirmTwice(el, 'Remove?')) return; const id = el.dataset.sec; cur.sections = cur.sections.filter(s => s.id !== id); cur.lines = cur.lines.filter(l => l.section !== id); await save(true); ui.rerender(); },
  async 'tpl-apply'(el) { applyTemplate(cur, db.settings.templates.find(t => t.id === el.dataset.id)); await save(true); location.hash = `estimates/${cur.id}/takeoff`; toast('Template added — measure the areas and the lines fill in.'); },
});

// quick-add search: assemblies, cost-book items, custom line
function qaResults(q) {
  q = q.trim().toLowerCase(); if (!q) return [];
  const s = db.settings, words = q.split(/\s+/);
  const hit = text => words.every(w => text.toLowerCase().includes(w));
  return [
    ...s.assemblies.filter(a => hit(`${a.name} ${a.cat} assembly`)).map(a => ({ v: 'a:' + a.id, l: a.name, sub: `${a.cat} assembly · per ${a.unit}` })),
    ...s.costBook.filter(c => hit(`${c.name} ${c.cat} ${c.type}`)).map(c => ({ v: 'i:' + c.id, l: c.name, sub: `${c.type} · per ${c.unit}` })),
    { v: 'custom:' + q, l: `Custom line “${q}”`, sub: 'Type your own cost' },
  ].slice(0, 8);
}
onInput({
  'qa-search'(el) {
    const list = el.parentElement.querySelector('.quick-add__list'), res = qaResults(el.value);
    list.hidden = !res.length; ui.qaIdx = 0;
    list.innerHTML = res.map((r, i) => `<li class="${i === 0 ? 'is-on' : ''}" data-act="qa-add" data-v="${esc(r.v)}"><strong>${esc(r.l)}</strong><small>${esc(r.sub)}</small></li>`).join('');
  },
});
async function qaAdd(v) {
  const sec = ($('[data-qa-sec]') || {}).value || cur.sections[0].id;
  const line = { id: uid(), section: sec, qty: '' };
  if (v.startsWith('a:')) Object.assign(line, { kind: 'assembly', assemblyId: v.slice(2) });
  else if (v.startsWith('i:')) Object.assign(line, { kind: 'item', itemId: v.slice(2), qty: 1 });
  else Object.assign(line, { kind: 'custom', desc: v.slice(7), unit: 'EA', unitCost: '', costType: 'Subcontract', qty: 1 });
  // Link to the only matching area automatically.
  const unit = lineUnit(line, db.settings), fits = cur.areas.filter(a => (['SY', 'SF'].includes(unit) && a.kind === 'area') || (unit === 'LF' && a.kind === 'linear') || (unit === 'EA' && a.kind === 'count'));
  if (fits.length === 1 && line.kind !== 'custom') line.areaId = fits[0].id;
  cur.lines.push(line); await save(true); ui.rerender();
  const tr = $(`tr[data-line="${line.id}"]`); const inp = tr && $(line.kind === 'custom' ? '[data-k="unitCost"]' : line.areaId ? '[data-qa]' : '[data-k="qty"]', line.areaId ? document : tr); if (inp) inp.focus();
}
act({ 'qa-add'(el) { qaAdd(el.dataset.v); } });
document.addEventListener('keydown', e => {
  const qa = e.target.closest && e.target.closest('[data-qa]');
  if (qa) {
    const items = $$('.quick-add__list li');
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); ui.qaIdx = Math.max(0, Math.min(items.length - 1, (ui.qaIdx || 0) + (e.key === 'ArrowDown' ? 1 : -1))); items.forEach((li, i) => li.classList.toggle('is-on', i === ui.qaIdx)); }
    if (e.key === 'Enter' && items.length) { e.preventDefault(); qaAdd(items[ui.qaIdx || 0].dataset.v); }
    if (e.key === 'Escape') { qa.value = ''; $('.quick-add__list').hidden = true; }
    return;
  }
  if (e.key === '/' && !e.target.matches('input, textarea, select') && $('[data-qa]')) { e.preventDefault(); $('[data-qa]').focus(); }
});

/* ---------------------------------------------------------------- 3 · Review */
function review(p) {
  const s = db.settings, cats = new Set(['All', ...p.lines.map(l => l.cat)]);
  const checks = (s.checks || []).filter(c => cats.has(c.cat));
  const answered = checks.filter(c => cur.checks[c.key]);
  const issues = [];
  const add = (sev, text, fix_) => issues.push({ sev, text, fix: fix_ });
  const priced = p.contract.sections.flatMap(x => x.lines).concat(p.hasOptions && !p.chosenOption ? p.options.flatMap(o => o.lines) : []);
  if (!p.lines.length) add('error', 'No lines yet.');
  p.lines.filter(l => !num(l.qty)).forEach(l => add('error', `“${l.desc}” has no quantity${l.line.areaId ? ' — measure its area' : ''}.`));
  p.lines.filter(l => num(l.qty) && !l.total && !l.overridden).forEach(l => add('warn', `“${l.desc}” has no cost.`));
  p.lines.filter(l => l.overridden && l.price < l.total).forEach(l => add('error', `“${l.desc}” is priced below its cost.`));
  if (!p.lines.some(l => /mobil/i.test(l.desc))) add('warn', 'No mobilization line.');
  const target = p.hasOptions && !p.chosenOption ? p.headline : p.contract;
  if (target.price && target.price < num(s.minJobCharge)) add('warn', `Under the ${money(s.minJobCharge)} minimum job charge.`, 'min');
  // $/unit against past accepted estimates for the same assembly
  for (const l of p.lines.filter(x => x.line.kind === 'assembly' && num(x.qty))) {
    const hist = db.estimates.filter(e => e.id !== cur.id && e.status === 'Accepted').flatMap(e => priceEstimate(e, s).lines.filter(x => x.line.assemblyId === l.line.assemblyId && num(x.qty)).map(x => x.unitPrice));
    if (hist.length >= 2) { const avg = hist.reduce((a, b) => a + b, 0) / hist.length; if (Math.abs(l.unitPrice - avg) / avg > 0.25) add('warn', `${l.desc}: ${money(l.unitPrice, true)}/${l.unit} vs ${money(avg, true)} on past won jobs (${hist.length}).`); }
  }
  if (s.costBookUpdated && daysUntil(s.costBookUpdated) < -60) add('warn', `Cost book prices are ${-daysUntil(s.costBookUpdated)} days old — check plant and ready-mix prices.`);
  if (!s.costBookUpdated || s.sampleRates) add('warn', 'Cost book still has placeholder prices.');
  if (!cur.areas.length && p.lines.some(l => ['SY', 'SF'].includes(l.unit))) add('warn', 'Quantities are typed, not measured — consider a takeoff.');
  const m = marginOf(p), floor = num(s.marginFloorPct) / 100, warn = num(s.marginWarnPct) / 100;
  const marginOk = m >= floor || (cur.approval && cur.approval.margin <= m + 0.0001 && round(cur.approval.price, 0) === round(target.price, 0));
  if (m < floor && !marginOk) add('error', `Margin ${pct(m, 1)} is below the ${pct(floor)} floor — needs owner approval.`, 'approve');
  else if (m < warn) add('warn', `Margin ${pct(m, 1)} is under the ${pct(warn)} target.`);
  const errors = issues.filter(i => i.sev === 'error').length;
  const open = (checks.length - answered.length) + errors;
  return { checks, answered, issues, errors, marginOk, ready: open === 0 && p.lines.length > 0, open, margin: m };
}
function reviewStep(p, rv) {
  const ro = locked();
  const STATES = [['inc', 'Included'], ['exc', 'Excluded'], ['na', 'N/A']];
  const hasItem = c => c.item && cur.lines.some(l => l.itemId === c.item || (db.settings.assemblies.find(a => a.id === l.assemblyId) || { parts: [] }).parts.some(x => x.item === c.item));
  const revs = cur.revisions || [];
  return `<div class="grid-2">
    ${card(`Did you address it? <small class="muted">${rv.answered.length} of ${rv.checks.length}</small>`, `<p class="muted small">Answer each one so nothing is forgotten. Excluded items are written into the proposal’s exclusions automatically.</p>
      <ul class="checklist-tri">${rv.checks.map(c => `<li class="${cur.checks[c.key] ? 'is-done' : ''}"><span>${esc(c.label)}${c.cat !== 'All' ? ` <small class="muted">${esc(c.cat)}</small>` : ''}</span>
        <div class="seg seg--sm">${STATES.map(([v, l]) => `<button type="button" class="${cur.checks[c.key] === v ? 'is-on' : ''}" data-act="chk" data-k="${c.key}" data-v="${v}"${ro ? ' disabled' : ''}>${l}</button>`).join('')}</div>
        ${cur.checks[c.key] === 'inc' && c.item && !hasItem(c) && !ro ? `<button type="button" class="linkish" data-act="chk-add" data-item="${c.item}">Add the line</button>` : ''}</li>`).join('')}</ul>`, { eyebrow: 'Checklist' })}
    <div class="stack">
      ${card(rv.ready ? 'Ready to send' : `${rv.open} thing${rv.open === 1 ? '' : 's'} before sending`, `<ul class="checks-out">${rv.issues.map(i => `<li class="is-${i.sev}">${icon(i.sev === 'error' ? 'shield' : 'clock')}<span>${esc(i.text)}</span>${i.fix === 'min' && !ro ? btn('Add minimum charge', 'min-add', { kind: 'ghost', size: 'sm' }) : ''}${i.fix === 'approve' && (role() === 'owner') && !ro ? btn('Approve', 'margin-approve', { kind: 'ghost', size: 'sm' }) : ''}</li>`).join('') || `<li class="is-ok">${icon('check')}<span>No problems found.</span></li>`}</ul>
        ${cur.approval ? `<p class="muted small">Margin approved by ${esc(cur.approval.by)} on ${fmtDate(cur.approval.at.slice(0, 10))}: “${esc(cur.approval.reason)}”.</p>` : ''}
        <div class="fields">${fieldHtml(f('reviewedBy', 'Second look by (optional)', 'select', { o: () => db.settings.estimators.filter(x => x !== cur.estimator), blank: 'Nobody yet' }), cur.reviewedBy || '')}</div>
        ${rv.ready && cur.status === 'Draft' ? `<div class="btn-row">${btn('Mark sent', 'est-sent', { ic: 'check' })}${linkBtn('Preview proposal', `#estimates/${cur.id}/proposal`, { kind: 'ghost' })}</div>` : ''}`, { eyebrow: 'Sanity checks', cls: rv.ready ? 'card--ok' : '' })}
      ${card('Revisions', revs.length ? `<table class="table table--plain"><thead><tr><th>Rev</th><th>Sent</th><th class="r">Price</th><th>What changed</th></tr></thead><tbody>${revs.map(r => `<tr><td>${esc(r.rev)}</td><td>${r.sentOn ? fmtDate(r.sentOn) : ''}</td><td class="r">${money(r.price)}</td><td>${esc(r.note || '')}</td></tr>`).join('')}<tr><td><b>${esc(cur.rev)}</b></td><td>${cur.sentOn ? fmtDate(cur.sentOn) : 'current'}</td><td class="r"><b>${money(p.headline.price)}</b></td><td>${diffNote(revs[revs.length - 1], p)}</td></tr></tbody></table>` : `<p class="muted">Rev ${esc(cur.rev || 'A')} — no earlier versions. Sending locks the prices; changes after that become Rev B, C…</p>`, { eyebrow: 'History' })}
    </div>
  </div>`;
}
function diffNote(prev, p) {
  if (!prev || !prev.lines) return '';
  const now = p.lines.map(l => ({ d: l.desc, q: round(l.qty, 1), u: round(l.unitPrice, 2) }));
  const was = prev.lines;
  const added = now.filter(n => !was.some(w => w.d === n.d)).length, removed = was.filter(w => !now.some(n => n.d === w.d)).length;
  const changed = now.filter(n => was.some(w => w.d === n.d && (w.q !== n.q || w.u !== n.u))).length;
  return [added && `${added} added`, removed && `${removed} removed`, changed && `${changed} changed`].filter(Boolean).join(', ') || 'No line changes';
}
act({
  async chk(el) { cur.checks[el.dataset.k] = cur.checks[el.dataset.k] === el.dataset.v ? '' : el.dataset.v; await save(true); ui.rerender(); },
  async 'chk-add'(el) { cur.lines.push({ id: uid(), kind: 'item', itemId: el.dataset.item, qty: 1, section: cur.sections[0].id }); await save(true); toast('Line added on the Pricing step — set its quantity.'); ui.rerender(); },
  async 'min-add'() {
    const p = P(), gap = num(db.settings.minJobCharge) - p.headline.price;
    cur.lines.push({ id: uid(), kind: 'custom', desc: 'Minimum job charge adjustment', qty: 1, unit: 'LS', unitCost: 0, costType: 'Other', priceEach: round(gap, 2), section: cur.sections[0].id });
    await save(true); ui.rerender(); toast(`Added ${money(gap)} to reach the minimum job charge.`);
  },
  'margin-approve'() {
    formDrawer({ eyebrow: cur.number, title: 'Approve a low margin', submit: 'margin-approve', rec: {}, saveLabel: 'Approve', fields: [f('reason', 'Why is this price OK?', 'textarea', { req: true, wide: true, ph: 'e.g. Repeat customer, fills a gap in the schedule' })] });
  },
});
onSubmit({
  async 'margin-approve'(form) {
    const reason = form.elements.reason.value.trim(); if (!reason) return toast('Add a reason.', 'bad');
    const p = P(), t = p.hasOptions && !p.chosenOption ? p.headline : p.contract;
    cur.approval = { by: S.user ? S.user.name : 'Owner', at: new Date().toISOString(), reason, margin: marginOf(p), price: t.price };
    await save(true); closeDrawer(); ui.rerender(); toast('Approved.');
  },
});
document.addEventListener('change', e => { if (cur && e.target.name === 'reviewedBy' && e.target.closest('.est')) { cur.reviewedBy = e.target.value; save(); } });

/* ---------------------------------------------------------------- 4 · Proposal */
function scopeNarrative(p) {
  const s = db.settings;
  const sent = l => {
    const a = l.line.kind === 'assembly' && s.assemblies.find(x => x.id === l.line.assemblyId);
    const area = l.line.areaId && cur.areas.find(x => x.id === l.line.areaId);
    const tpl = (a && a.scope) || `${l.desc}: {qty} {unit}{area}.`;
    return tpl.replace('{qty}', fix(l.qty, 0)).replace('{unit}', l.unit).replace('{area}', area ? ` (${area.name})` : '').replace(/\{thick\}/g, l.line.thick || (a && a.thick) || '');
  };
  return p.sections.filter(sec => sec.type === 'base').flatMap(sec => sec.lines).filter(l => num(l.qty) && !/mobiliz|minimum/i.test(l.desc)).map(sent).join(' ');
}
function exclusions() {
  const lib = db.settings.scopeLib || [];
  const fromChecks = (db.settings.checks || []).filter(c => cur.checks[c.key] === 'exc').map(c => `${c.label} — not included.`);
  const picked = lib.filter(x => (cur.picks || []).includes(x.id));
  const mobs = cur.lines.filter(l => l.itemId === 'mob').reduce((t, l) => t + num(l.qty), 0) || 1;
  const fill = t => t.replace('{mobs}', mobs).replace('{mobPrice}', money(db.settings.addMobPrice));
  return { exclusions: [...picked.filter(x => x.kind === 'exclusion').map(x => fill(x.text)), ...fromChecks], clarifications: picked.filter(x => x.kind === 'clarification').map(x => fill(x.text)) };
}
const isAsphalt = p => p.lines.some(l => l.cat === 'Asphalt' && num(l.hmaTons));
function proposal(p) {
  const ro = locked(), lib = db.settings.scopeLib || [];
  const auto = scopeNarrative(p);
  const esc_ = cur.escalation ?? (isAsphalt(p) && cur.checks.escalation === 'inc');
  return `<div class="prop">
    <div class="stack">
      ${card('Scope of work', `<textarea class="est-notes" rows="6" data-on-input="prop-field" data-k="scopeText"${ro ? ' disabled' : ''} placeholder="${esc(auto)}">${esc(cur.scopeText || '')}</textarea>
        <div class="btn-row">${ro ? '' : btn('Use the generated text', 'scope-regen', { kind: 'ghost', size: 'sm', ic: 'sync' })}<small class="muted">Left empty, the proposal uses the text generated from your lines (shown faintly).</small></div>`, { eyebrow: 'Written from the priced lines' })}
      ${card('Exclusions & clarifications', `<div class="picks">${['exclusion', 'clarification'].map(kind => `<div><h3 class="sub-h">${kind === 'exclusion' ? 'Not included' : 'Clarifications'}</h3>${lib.filter(x => x.kind === kind).map(x => `<label><input type="checkbox" data-on-change="pick" value="${x.id}"${(cur.picks || []).includes(x.id) ? ' checked' : ''}${ro ? ' disabled' : ''}> ${esc(x.text.replace('{mobs}', '1').replace('{mobPrice}', money(db.settings.addMobPrice)))}</label>`).join('')}</div>`).join('')}</div>
        ${(db.settings.checks || []).some(c => cur.checks[c.key] === 'exc') ? `<p class="muted small">Also excluded from the checklist: ${(db.settings.checks || []).filter(c => cur.checks[c.key] === 'exc').map(c => esc(c.label)).join(', ')}.</p>` : ''}
        <label class="field field--wide" style="margin-top:12px"><span class="label">Other notes for the customer</span><textarea class="est-notes" rows="3" data-on-input="prop-field" data-k="notes"${ro ? ' disabled' : ''}>${esc(cur.notes || '')}</textarea></label>`, { eyebrow: 'Say it so it isn’t assumed' })}
      ${card('Terms', `<div class="fields fields--4">
        <label class="field"><span class="label">Deposit %</span><input type="number" step="5" min="0" max="100" value="${esc(cur.depositPct ?? 0)}" data-on-input="prop-field" data-k="depositPct"${ro ? ' disabled' : ''}></label>
        <label class="field"><span class="label">Retainage %</span><input type="number" step="1" min="0" max="20" value="${esc(cur.retainagePct ?? 0)}" data-on-input="prop-field" data-k="retainagePct"${ro ? ' disabled' : ''}></label>
        <label class="field"><span class="label">Valid for (days)</span><input type="number" step="1" value="${esc(cur.validDays ?? db.settings.proposalValidDays)}" data-on-input="prop-field" data-k="validDays"${ro ? ' disabled' : ''}></label>
        <label class="field"><span class="label">Payment due (days)</span><input type="number" value="${esc(db.settings.termsDays)}" disabled></label>
      </div>
      ${isAsphalt(p) ? `<label class="field--check" style="margin-top:12px"><label><input type="checkbox" data-on-change="esc-toggle"${esc_ ? ' checked' : ''}${ro ? ' disabled' : ''}> Include the asphalt price escalation clause (${esc(db.settings.escalationIndex)}, ±${db.settings.escalationTriggerPct}% trigger)</label></label>
        ${esc_ ? `<div class="fields" style="margin-top:8px"><label class="field"><span class="label">Base index month</span><input value="${esc(cur.escBase || '')}" placeholder="e.g. Oct 2026" data-on-input="prop-field" data-k="escBase"${ro ? ' disabled' : ''}></label><label class="field"><span class="label">Base index ($/ton)</span><input value="${esc(cur.escIndex || '')}" placeholder="from MoDOT" data-on-input="prop-field" data-k="escIndex"${ro ? ' disabled' : ''}></label></div>` : ''}` : ''}`, { eyebrow: 'Money & paperwork' })}
    </div>
    <div class="prop__preview card"><div class="prop__paper">${proposalHtml(p)}</div></div>
  </div>`;
}
onInput({ 'prop-field'(el) { const k = el.dataset.k; cur[k] = ['depositPct', 'retainagePct', 'validDays'].includes(k) ? num(el.value) : el.value; save(); clearTimeout(ui.pT); ui.pT = setTimeout(() => { const pv = $('.prop__paper'); if (pv) pv.innerHTML = proposalHtml(P()); }, 400); } });
onChange({
  async pick(el) { cur.picks = cur.picks || []; if (el.checked) cur.picks.push(el.value); else cur.picks = cur.picks.filter(x => x !== el.value); await save(true); $('.prop__paper').innerHTML = proposalHtml(P()); },
  async 'esc-toggle'(el) { cur.escalation = el.checked; await save(true); ui.rerender(); },
});
act({ async 'scope-regen'() { cur.scopeText = scopeNarrative(P()); await save(true); ui.rerender(); } });

function proposalHtml(p) {
  const c = find('customers', cur.customerId) || {}, co = db.settings.company, s = db.settings;
  const rows = sec => sec.lines.map(l => `<tr><td>${esc(l.desc)}${l.line.areaId ? ` <small>(${esc((cur.areas.find(a => a.id === l.line.areaId) || {}).name || '')})</small>` : ''}${l.line.note ? `<div class="pr__note">${esc(l.line.note)}</div>` : ''}</td><td class="r">${fix(l.qty, 0)}</td><td>${esc(l.unit)}</td><td class="r">${money(l.unitPrice, true)}</td><td class="r">${money(l.price, true)}</td></tr>`).join('');
  const base = p.sections.filter(x => x.type === 'base'), opts = p.options, adds = p.sections.filter(x => x.type === 'addon');
  const baseTotal = base.reduce((t, x) => t + x.price, 0);
  const valid = addDays(cur.sentOn || cur.date || today(), num(cur.validDays ?? s.proposalValidDays) || 30);
  const ex = exclusions();
  const total = opts.length ? null : baseTotal;
  const dep = num(cur.depositPct), ret = num(cur.retainagePct);
  const escOn = cur.escalation ?? (isAsphalt(p) && cur.checks.escalation === 'inc');
  return `<article class="pr">
    <header class="pr__head"><img src="img/logo-horizontal.jpg" alt="Max Paving"><div class="pr__co">${esc(co.address)}<br>${esc(co.phone)} · ${esc(co.email)}<br>${esc(co.website || '')}</div></header>
    <h1>Proposal ${esc(cur.number)}${cur.rev && cur.rev !== 'A' ? ` · Rev ${esc(cur.rev)}` : ''}</h1>
    <div class="pr__meta">
      <div><small>Prepared for</small><strong>${esc(c.name || '')}</strong>${c.contact ? `<br>${esc(c.contact)}` : ''}${c.phone ? `<br>${esc(c.phone)}` : ''}${c.email ? `<br>${esc(c.email)}` : ''}</div>
      <div><small>Project</small><strong>${esc(cur.title)}</strong>${cur.address ? `<br>${esc(cur.address)}` : ''}</div>
      <div><small>Date</small><strong>${fmtDate(cur.sentOn || cur.date)}</strong><br>Valid until ${fmtDate(valid)}${cur.estimator ? `<br>Estimator: ${esc(cur.estimator)}` : ''}</div>
    </div>
    <h2>Scope of work</h2><p>${esc(cur.scopeText || scopeNarrative(p))}</p>
    ${cur.areas.filter(a => a.kind !== 'count' && (num(a.sf) || num(a.lf))).length ? `<p class="pr__areas">${cur.areas.filter(a => num(a.sf) || num(a.lf)).map(a => `<span><b>${esc(a.name)}</b> ${a.kind === 'area' ? `${fix(num(a.sf) / 9, 0)} SY` : `${fix(a.lf, 0)} LF`}</span>`).join('')}</p>` : ''}
    ${base.filter(x => x.lines.length).map(sec => `<h2>${esc(sec.name)}</h2><table class="pr__table"><thead><tr><th>Item</th><th class="r">Qty</th><th>Unit</th><th class="r">Unit price</th><th class="r">Amount</th></tr></thead><tbody>${rows(sec)}</tbody>${total !== null ? `<tfoot><tr><td colspan="4">Total</td><td class="r">${money(total, true)}</td></tr></tfoot>` : ''}</table>`).join('')}
    ${opts.length ? `<h2>Options — choose one</h2>${opts.map(o => `<div class="pr__opt"><div class="pr__opt-head"><span class="pr__box"></span><strong>${esc(o.name)}</strong><b>${money(o.price + baseTotal, true)}</b></div><table class="pr__table pr__table--sm"><tbody>${rows(o)}</tbody></table></div>`).join('')}` : ''}
    ${adds.length ? `<h2>Optional add-ons</h2>${adds.map(o => `<div class="pr__opt"><div class="pr__opt-head"><span class="pr__box"></span><strong>${esc(o.name)}</strong><b>+ ${money(o.price, true)}</b></div></div>`).join('')}` : ''}
    ${ex.exclusions.length ? `<h2>Not included</h2><ul>${ex.exclusions.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    ${ex.clarifications.length || escOn ? `<h2>Clarifications</h2><ul>${ex.clarifications.map(x => `<li>${esc(x)}</li>`).join('')}${escOn ? `<li>Hot-mix prices are based on the ${esc(s.escalationIndex)}${cur.escBase ? ` for ${esc(cur.escBase)}` : ''}${cur.escIndex ? ` ($${esc(cur.escIndex)}/ton)` : ''}. If the index for the month we pave differs by more than ${esc(s.escalationTriggerPct)}%, asphalt items are adjusted by the change in the index for the binder in the tons placed.</li>` : ''}</ul>` : ''}
    ${cur.notes ? `<h2>Notes</h2><p>${esc(cur.notes).replace(/\n/g, '<br>')}</p>` : ''}
    <h2>Terms</h2>
    <ul>
      <li>The scope above is the scope we build. Materials as specified, never substituted.</li>
      <li>If site conditions turn up that nobody could have known, we stop and talk it through with you before any change order.</li>
      <li>All work by Max Paving’s own crews. Cleanup included.</li>
      <li>One-year written warranty on labor and workmanship from the date of completion.</li>
      <li>${dep ? `${dep}% deposit when you accept; balance due on completion.` : `Payment due net ${esc(s.termsDays)} days from invoice.`}${ret ? ` ${ret}% retainage per the contract.` : ''}</li>
    </ul>
    <div class="pr__sign"><div>Accepted by (customer)<span></span></div><div>Date<span></span></div><div>Max Paving<span></span></div></div>
  </article>`;
}

/* ---------------------------------------------------------------- send, revise, accept, job */
act({
  async 'est-sent'() {
    const p = P(), rv = review(p);
    if (!rv.ready) { location.hash = `estimates/${cur.id}/review`; return toast(`${rv.open} thing${rv.open === 1 ? '' : 's'} to finish before sending.`, 'bad'); }
    cur.locked = lockPrices(cur, db.settings);
    cur.status = 'Sent'; cur.sentOn = today(); cur.validUntil = addDays(today(), num(cur.validDays ?? db.settings.proposalValidDays) || 30);
    if (!cur.scopeText) cur.scopeText = scopeNarrative(p);
    await save(true);
    const lead = cur.leadId && find('leads', cur.leadId); if (lead && ['New', 'Contacted', 'Site visit'].includes(lead.status)) await put('leads', { ...lead, status: 'Proposal sent' });
    ui.rerender(); toast(`Sent and locked. Follow-up reminder in ${db.settings.followUpDays || 7} days.`);
  },
  'est-revise'() { formDrawer({ eyebrow: cur.number, title: `Start revision ${nextRev(cur.rev)}`, submit: 'est-revise', rec: {}, saveLabel: 'Start revision', note: `Rev ${esc(cur.rev)} is kept exactly as sent.`, fields: [f('note', 'What’s changing?', 'textarea', { req: true, wide: true, ph: 'e.g. Customer added the back lot; dropped striping' })] }); },
  async 'est-decline'() {
    cur.status = 'Declined'; await save(true);
    const lead = cur.leadId && find('leads', cur.leadId); if (lead) await put('leads', { ...lead, status: 'Lost' });
    ui.rerender(); toast('Marked declined.');
  },
  'est-accept'() {
    const p = P(), addons = p.sections.filter(s => s.type === 'addon');
    openDrawer(`<form class="form" data-submit="est-accept" novalidate>
      <header class="form__head"><div><span class="eyebrow eyebrow--sm">${esc(cur.number)} · Rev ${esc(cur.rev || 'A')}</span><h2>Customer accepted</h2></div><button type="button" class="x x--lg" data-act="close" aria-label="Close">×</button></header>
      <div class="form__body">
        ${p.options.length ? `<fieldset class="checks"><legend>Which option did they choose?</legend>${p.options.map((o, i) => `<label><input type="radio" name="option" value="${o.id}"${i === 0 ? ' checked' : ''}> ${esc(o.name)} <b>${money(o.price)}</b></label>`).join('')}</fieldset>` : ''}
        ${addons.length ? `<fieldset class="checks"><legend>Add-ons they want</legend>${addons.map(o => `<label><input type="checkbox" name="addon" value="${o.id}"> ${esc(o.name)} <b>+${money(o.price)}</b></label>`).join('')}</fieldset>` : ''}
        <div class="fields">${fieldHtml(f('by', 'Accepted by', 'text'), (find('customers', cur.customerId) || {}).contact || '')}${fieldHtml(f('on', 'Date', 'date'), today())}${fieldHtml(f('makeJob', 'Create the job now (its phases go to the schedule’s sold-work tray)', 'check', { wide: true }), true)}</div>
      </div>
      <footer class="form__foot"><div class="form__actions"></div><button type="button" class="btn btn--ghost" data-act="close">Cancel</button><button type="submit" class="btn btn--yellow">Accept</button></footer></form>`);
  },
  'est-job'() { createJob(); },
  'est-print'() { printHtml(proposalHtml(P())); },
  'est-details'() {
    formDrawer({ eyebrow: cur.number, title: 'Estimate details', submit: 'est-details', rec: cur, fields: [
      f('title', 'Project title', 'text', { req: true, wide: true }), f('customerId', 'Customer', 'ref', { ref: 'customers', req: true }), f('address', 'Project address', 'text', { wide: true }),
      f('estimator', 'Estimator', 'select', { o: () => db.settings.estimators }), f('date', 'Date', 'date'), f('number', 'Estimate #'),
    ] });
  },
  async 'est-dup'() {
    const copy = { ...JSON.parse(JSON.stringify(cur)), id: uid(), number: nextNumber('estimates', 'E-', 1001), rev: 'A', revisions: [], locked: null, status: 'Draft', date: today(), accepted: null, sentOn: '', validUntil: '', approval: null, qbo: null, title: cur.title + ' (copy)', copiedFrom: cur.number };
    await put('estimates', copy); location.hash = `estimates/${copy.id}`; toast('Duplicated — prices come from today’s cost book.');
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
});
const nextRev = r => String.fromCharCode((String(r || 'A').charCodeAt(0) || 64) + 1);
onSubmit({
  async 'est-revise'(form) {
    const note = form.elements.note.value.trim(); if (!note) return toast('Say what’s changing.', 'bad');
    const p = P();
    cur.revisions = [...(cur.revisions || []), { rev: cur.rev || 'A', sentOn: cur.sentOn, price: p.headline.price, note, lines: p.lines.map(l => ({ d: l.desc, q: round(l.qty, 1), u: round(l.unitPrice, 2) })) }];
    Object.assign(cur, { rev: nextRev(cur.rev), status: 'Draft', locked: null, sentOn: '', validUntil: '', approval: null });
    await save(true); closeDrawer(); location.hash = `estimates/${cur.id}/pricing`; toast(`Rev ${cur.rev} started — prices follow today’s cost book again.`);
  },
  async 'est-accept'(form) {
    const opt = form.querySelector('input[name=option]:checked'), addons = [...form.querySelectorAll('input[name=addon]:checked')].map(x => x.value);
    if (!cur.locked) cur.locked = lockPrices(cur, db.settings);
    cur.status = 'Accepted'; cur.accepted = { by: form.elements.by.value, on: form.elements.on.value || today(), option: opt ? opt.value : '', addons, rev: cur.rev };
    await save(true);
    const lead = cur.leadId && find('leads', cur.leadId); if (lead) await put('leads', { ...lead, status: 'Won' });
    closeDrawer();
    if (form.elements.makeJob.checked) return createJob();
    ui.rerender(); toast('Accepted.');
  },
  async 'est-details'(form) {
    Object.assign(cur, collect(form, [f('title', ''), f('customerId', ''), f('address', ''), f('estimator', ''), f('date', ''), f('number', '')]));
    await save(true); closeDrawer(); ui.rerender();
  },
});
async function createJob() {
  const p = P();
  const lines = p.contract.sections.flatMap(s => s.lines);
  const byCat = {}; lines.forEach(l => { byCat[l.cat] = (byCat[l.cat] || 0) + l.price; });
  const type = Object.entries(byCat).filter(([c]) => c !== 'General').sort((a, b) => b[1] - a[1])[0]?.[0] || 'Mixed';
  const c = find('customers', cur.customerId) || {};
  const job = syncSummary({
    id: uid(), number: nextNumber('jobs', 'J-', 1001), name: cur.title, customerId: cur.customerId, estimateId: cur.id, address: cur.address,
    type, status: 'Active', value: Math.round(p.contract.price), budget: budgetFrom(cur, db.settings), pct: 0, completed: '', notes: [cur.site && cur.site.access, cur.notes].filter(Boolean).join('\n'),
    site: { contact: c.contact || '', phone: c.phone || '', gate: '', notes: cur.site && cur.site.access || '' }, locate: { state: /,\s*KS\b|Kansas/i.test(cur.address || '') ? 'KS' : 'MO' }, permit: { needed: cur.checks.permit === 'inc' ? 'yes' : cur.checks.permit ? 'no' : '' },
    phases: phasesFromEstimate(cur, lines, db.settings), changes: [], punch: [], closeout: {},
  });
  await put('jobs', job);
  cur = null;
  location.hash = `jobs/${job.id}/phases`;
  toast(`${job.number} created with ${job.phases.length} phase${job.phases.length === 1 ? '' : 's'} — they’re waiting in the schedule’s sold-work tray.`);
}
