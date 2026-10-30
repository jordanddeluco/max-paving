/* Schedule: phases on a crew × day board (sold-work tray, drag or click to place, soft readiness gate, rain-day shift)
   and Tomorrow — the dispatch sheet for each crew plus the material orders to call in. */
import { $, $$, esc, num, money, fix, today, addDays, monday, weekday, shortDate, fmtDate, icon, badge, isWeekend, initials } from '../core.js';
import { db, S, put, find, can } from '../store.js';
import { act, onSubmit, hero, tabs, card, btn, linkBtn, f, formDrawer, closeDrawer, toast, ui, custName, crewName, printHtml } from '../ui.js';
import { crewMembers, hasExpiredDriving, eqStatus } from '../derive.js';
import { loadWeather, wxFor, wxGo, verdict } from '../weather.js';
import { gate, earliest, locateStatus, phaseDigs, phaseOn, syncSummary, isOpenJob, addWorkdays, isWorkday } from '../jobflow.js';
import { openJob } from './jobs.js';

export default {
  title: 'Schedule',
  roles: ['owner', 'office', 'estimator', 'foreman', 'crew'],
  badge: () => trayItems().length,
  render(r) { return r.parts[0] === 'tomorrow' ? tomorrow(r) : board(); },
};
const editable = () => can.write('jobs');
const T = () => [['board', 'Board'], ['tomorrow', `Tomorrow · ${shortDate(nextDay())}`]];
const nextDay = () => { let d = addDays(today(), 1); while (!isWorkday(d) && !(db.settings.workSaturday && new Date(d + 'T00:00:00').getDay() === 6)) d = addDays(d, 1); return d; };
const allPhases = () => db.jobs.filter(isOpenJob).flatMap(j => (j.phases || []).map(p => ({ j, p })));
const trayItems = () => allPhases().filter(({ p }) => p.status !== 'Done' && !p.start);
// Crews, plus a row for subcontracted phases (striping, sealcoat) that have a date but no crew of ours.
const ROWS = () => [...db.settings.crews, { id: '', name: 'Subs / no crew', color: '#9a9a96', sub: true }];
const spanDays = p => { let n = 0; for (let d = p.start; d <= (p.end || p.start); d = addDays(d, 1)) if (isWorkday(d) || d === p.start) n++; return Math.max(1, n); };
const showDay = d => isWorkday(d) || (db.settings.workSaturday && new Date(d + 'T00:00:00').getDay() === 6);

function conflicts(j, p) {
  const out = [];
  if (p.status === 'Done') return out;
  const g = gate(j, p);
  if (p.start && !g.ready && !p.override && (new Date(p.start + 'T00:00:00') - new Date(today() + 'T00:00:00')) / 864e5 <= 7) out.push(...g.open.map(i => `${i.label}: ${i.why}`));
  const e = earliest(j, p); if (e && p.start && p.start < e) out.push(`Too soon — not before ${shortDate(e)}`);
  if (p.crewId) {
    crewMembers(p.crewId).filter(hasExpiredDriving).forEach(s => out.push(`${s.name}’s CDL / medical card is expired`));
    db.equipment.filter(q => q.crewId === p.crewId && eqStatus(q) === 'Down for repair').forEach(q => out.push(`${q.unit} ${q.name} is down`));
    allPhases().filter(x => x.p !== p && x.p.crewId === p.crewId && x.p.start && x.p.status !== 'Done' && x.p.start <= (p.end || p.start) && (x.p.end || x.p.start) >= p.start).forEach(x => out.push(`Overlaps ${x.j.number} ${x.p.name}`));
  }
  const type = /asphalt|patch|milling/i.test(p.type) ? 'Asphalt' : /concrete|curb/i.test(p.type) ? 'Concrete' : '';
  for (let d = p.start; type && d <= (p.end || p.start); d = addDays(d, 1)) { const w = wxFor(d); if (w && wxGo(w, type) === 'No') { out.push(`${weekday(d)}: weather no-go for ${type.toLowerCase()}`); break; } }
  return out;
}

/* ---------------------------------------------------------------- board */
function board() {
  loadWeather();
  ui.week = ui.week || monday(today());
  const n = ui.twoWeeks ? 14 : 7;
  const days = Array.from({ length: n }, (_, i) => addDays(ui.week, i)).filter(d => showDay(d) || allPhases().some(({ p }) => p.crewId && phaseOn(p, d)));
  const first = days[0], last = days[days.length - 1];
  const placing = ui.placing && allPhases().find(x => x.p.id === ui.placing);
  const dayHead = days.map(d => {
    const w = wxFor(d), v = w && verdict(w);
    const dollars = allPhases().filter(({ p }) => p.crewId && phaseOn(p, d)).reduce((t, { j, p }) => t + num(j.value) / Math.max(1, (j.phases || []).reduce((s, x) => s + (x.start ? spanDays(x) : num(x.days) || 1), 0)), 0);
    return `<div class="sb__day${d === today() ? ' is-today' : ''}${isWeekend(d) ? ' is-weekend' : ''}">
      <strong>${weekday(d)} <span>${shortDate(d)}</span></strong>
      ${w ? `<small>${w.high ?? '–'}° · ${w.rain || 0}% rain</small><span class="sb__wx" title="A = asphalt, C = concrete">A ${badge(v.a)} C ${badge(v.c)}</span>` : '<small class="muted">No forecast</small>'}
      ${can.money() && dollars ? `<em class="sb__dollars">${money(dollars)}</em>` : ''}
    </div>`;
  }).join('');
  const rows = ROWS().map(c => {
    const items = allPhases().filter(({ p }) => (p.crewId || '') === c.id && p.start && p.start <= last && (p.end || p.start) >= first).sort((a, b) => a.p.start.localeCompare(b.p.start));
    if (c.sub && !items.length && !placing) return '';
    const lanes = [];
    const bars = items.map(({ j, p }) => {
      const s = p.start < first ? 0 : days.findIndex(d => d >= p.start);
      let e = days.length - 1; for (let i = days.length - 1; i >= 0; i--) { if (days[i] <= (p.end || p.start)) { e = i; break; } }
      if (s < 0 || e < s) return '';
      let lane = lanes.findIndex(l => l < s); if (lane < 0) { lane = lanes.length; lanes.push(e); } else lanes[lane] = e;
      const warn = conflicts(j, p);
      const kind = /asphalt|milling|patch/i.test(p.type) ? 'asphalt' : /concrete|curb/i.test(p.type) ? 'concrete' : /excav|base/i.test(p.type) ? 'excavation' : 'mixed';
      return `<button type="button" class="sb__bar sb__bar--${kind}${p.status === 'Done' ? ' is-done' : ''}${warn.length ? ' has-warn' : ''}" style="grid-column:${s + 1} / ${e + 2};grid-row:${lane + 1}" ${editable() ? 'draggable="true"' : ''} data-drag-phase="${p.id}" data-job="${j.id}" data-act="sb-open" title="${esc(warn.join('\n'))}">
        <strong>${warn.length ? icon('shield', 'warn-ico') : ''}${esc(j.number)} · ${esc(p.name)}</strong><small>${esc(custName(j.customerId))}${p.start < first ? ' · continued' : ''} · ${spanDays(p)}d${p.order ? ` · ${esc(p.order.status === 'Confirmed' ? 'material ✓' : 'material: ' + p.order.status.toLowerCase())}` : ''}</small>
      </button>`;
    }).join('');
    return `<div class="sb__crew" style="--c:${c.color}"><strong>${esc(c.name)}</strong><small>${c.sub ? 'Striping, sealcoat & others' : `${crewMembers(c.id).length} people`}</small>${editable() && !c.sub ? `<button type="button" class="linkish" data-act="sb-rain" data-crew="${c.id}" title="Push this crew’s remaining work back one working day">Rain day →</button>` : ''}</div>
      <div class="sb__lane" style="--cols:${days.length};--rows:${Math.max(1, lanes.length)}">
        <div class="sb__cells">${days.map(d => `<div class="sb__cell${d === today() ? ' is-today' : ''}${placing ? ' is-target' : ''}" data-drop-crew="${c.id}" data-date="${d}" ${placing ? `data-act="sb-place" data-crew="${c.id}"` : ''}></div>`).join('')}</div>
        <div class="sb__bars">${bars}</div>
      </div>`;
  }).join('');
  const t = trayItems();
  return hero({
    eyebrow: 'Build', title: 'Schedule',
    sub: editable() ? 'Drag phases from the tray onto a crew and day, or click one then click a day. Drag bars to move them — the length stays the same.' : 'Who is where. Ask the office to make changes.',
    actions: `<div class="week-nav week-nav--hero"><button type="button" class="btn btn--outline btn--sm" data-act="sb-week" data-v="-7" aria-label="Previous week">‹</button><button type="button" class="btn btn--outline btn--sm" data-act="sb-week" data-v="0">Today</button><button type="button" class="btn btn--outline btn--sm" data-act="sb-week" data-v="7" aria-label="Next week">›</button><button type="button" class="btn btn--outline btn--sm" data-act="sb-span">${ui.twoWeeks ? '1 week' : '2 weeks'}</button></div>`,
  }) + tabs(T(), 'board', 'schedule') + `<div class="page">
    ${editable() ? `<section class="tray${placing ? ' is-placing' : ''}">
      <div class="tray__head"><span class="eyebrow eyebrow--sm">Sold work to schedule</span><strong>${t.length ? `${t.length} phase${t.length === 1 ? '' : 's'} waiting` : 'Nothing waiting — every phase has a crew and date.'}</strong>
      ${placing ? `<span class="tray__hint">Click a crew and day to place <b>${esc(placing.j.number)} · ${esc(placing.p.name)}</b> ${btn('Cancel', 'sb-cancel', { kind: 'ghost', size: 'sm' })}</span>` : ''}</div>
      <div class="tray__items">${t.map(({ j, p }) => { const e = earliest(j, p), g = gate(j, p); return `<button type="button" class="tray__job${ui.placing === p.id ? ' is-on' : ''}" draggable="true" data-drag-phase="${p.id}" data-job="${j.id}" data-act="sb-pick" data-id="${p.id}">
        <strong>${esc(j.number)} · ${esc(p.name)}</strong><small>${esc(custName(j.customerId))} · ${num(p.days) || 1} day${num(p.days) > 1 ? 's' : ''}${e ? ` · not before ${shortDate(e)}` : ''}${g.ready ? '' : ` · ${g.open.length} not ready`}</small></button>`; }).join('')}</div>
    </section>` : ''}
    <h2 class="sb-title">${fmtDate(first)} – ${fmtDate(last)}</h2>
    <div class="card sb-card"><div class="sb" style="--cols:${days.length}"><div class="sb__corner">Crew</div>${dayHead}${rows}</div></div>
    <p class="muted small">A red outline means something needs a look within the week: checklist items open, an expired CDL, equipment down, overlap, a no-go forecast, or striping too soon after paving. Hover a bar for details.</p>
  </div>`;
}

/* placing, with a soft readiness gate */
async function placePhase(jobId, phaseId, crewId, date, override) {
  const j = JSON.parse(JSON.stringify(find('jobs', jobId))), p = j.phases.find(x => x.id === phaseId); if (!p) return;
  const len = p.start ? spanDays(p) : Math.max(1, num(p.days) || 1);
  const trial = { ...p, crewId, start: date, end: addWorkdays(date, len - 1) };
  const g = gate(j, trial), e = earliest(j, trial), loc = phaseDigs(trial) ? locateStatus({ ...j, phases: j.phases.map(x => x.id === p.id ? trial : x) }) : { ok: true };
  const problems = [...g.open.map(i => `${i.label} — ${i.why}`), ...(e && date < e ? [`Striping before ${shortDate(e)} (paving needs to cure)`] : []), ...(loc.need && !loc.ok && !g.open.some(i => i.key === 'locate') ? [loc.label] : [])];
  if (problems.length && !override) {
    ui.pendingPlace = { jobId, phaseId, crewId, date };
    return formDrawer({ eyebrow: `${j.number} · ${p.name}`, title: `Not ready for ${weekday(date)} ${shortDate(date)}`, submit: 'sb-force', rec: {}, saveLabel: 'Schedule anyway',
      extra: `<ul class="checks-out">${problems.map(x => `<li class="is-warn">${icon('clock')}<span>${esc(x)}</span></li>`).join('')}</ul><p class="muted small">You can still schedule it — the reason is saved on the phase so everyone knows.</p>`,
      fields: [f('reason', 'Why schedule it now?', 'text', { req: true, wide: true, ph: 'e.g. Ticket called today, clears Wednesday morning' })] });
  }
  const moved = p.start && p.start !== date;
  Object.assign(p, { crewId, start: date, end: trial.end, days: len });
  if (override) p.override = { reason: override, by: S.user ? S.user.name : 'Office', at: today() };
  if (moved && p.order && ['Placed', 'Confirmed'].includes(p.order.status)) { p.order.moved = date; p.order.status = 'Placed'; }
  p.log = [...(p.log || []), { on: today(), by: S.user ? S.user.name : 'Office', note: moved ? `Moved to ${date}` : `Scheduled for ${date}` }];
  await put('jobs', syncSummary(j));
  ui.placing = null; ui.rerender();
  toast(`${j.number} ${p.name} → ${crewName(crewId)}, ${shortDate(date)}${p.end !== date ? '–' + shortDate(p.end) : ''}.${moved ? ' Let the crew and customer know.' : ''}${moved && p.order && p.order.moved ? ` Call ${p.order.supplier || 'the supplier'} to move the order.` : ''}`);
}
onSubmit({ async 'sb-force'(form) { const reason = form.elements.reason.value.trim(); if (!reason) return toast('Add a reason.', 'bad'); const x = ui.pendingPlace; closeDrawer(); await placePhase(x.jobId, x.phaseId, x.crewId, x.date, reason); } });
act({
  'sb-week'(el) { ui.week = el.dataset.v === '0' ? monday(today()) : addDays(ui.week, +el.dataset.v); ui.rerender(); },
  'sb-span'() { ui.twoWeeks = !ui.twoWeeks; ui.rerender(); },
  'sb-open'(el) { if (!dragging) location.hash = `jobs/${el.dataset.job}/phases`; },
  'sb-pick'(el) { ui.placing = ui.placing === el.dataset.id ? null : el.dataset.id; ui.rerender(); },
  'sb-cancel'() { ui.placing = null; ui.rerender(); },
  'sb-place'(el) { const x = allPhases().find(y => y.p.id === ui.placing); if (x) placePhase(x.j.id, x.p.id, el.dataset.crew, el.dataset.date); },
  async 'sb-rain'(el) {
    const crewId = el.dataset.crew, from = today() < ui.week ? ui.week : today();
    const hits = allPhases().filter(({ p }) => p.crewId === crewId && p.start && p.status !== 'Done' && (p.end || p.start) >= from);
    if (!hits.length) return toast(`${crewName(crewId)} has nothing scheduled from ${shortDate(from)} on.`);
    const calls = [];
    for (const jobId of [...new Set(hits.map(h => h.j.id))]) {
      const j = JSON.parse(JSON.stringify(find('jobs', jobId)));
      j.phases.filter(p => hits.some(h => h.p.id === p.id)).forEach(p => {
        if (p.start >= from) p.start = addWorkdays(p.start, 1);
        p.end = addWorkdays(p.end || p.start, 1);
        if (p.order && ['Placed', 'Confirmed'].includes(p.order.status)) { p.order.moved = p.start; p.order.status = 'Placed'; calls.push(p.order.supplier || `${j.number} supplier`); }
        p.log = [...(p.log || []), { on: today(), by: S.user ? S.user.name : 'Office', note: 'Rain day — pushed back one working day' }];
      });
      await put('jobs', syncSummary(j));
    }
    ui.rerender(); toast(`${crewName(crewId)}: ${hits.length} phase${hits.length === 1 ? '' : 's'} pushed back a working day.${calls.length ? ` Call: ${[...new Set(calls)].join(', ')}.` : ''} Let customers know.`);
  },
});

// Drag & drop (mouse). Click-to-place covers touch screens.
let dragging = null;
document.addEventListener('dragstart', e => { const b = e.target.closest('[data-drag-phase]'); if (b) { dragging = { phase: b.dataset.dragPhase, job: b.dataset.job }; e.dataTransfer.effectAllowed = 'move'; b.classList.add('is-dragging'); } });
document.addEventListener('dragend', e => { const b = e.target.closest('[data-drag-phase]'); if (b) b.classList.remove('is-dragging'); $$('.sb__cell.is-over').forEach(c => c.classList.remove('is-over')); setTimeout(() => { dragging = null; }, 0); });
const cellAt = (lane, x) => { const cells = $$('.sb__cell', lane), r = lane.getBoundingClientRect(); return cells[Math.min(cells.length - 1, Math.max(0, Math.floor((x - r.left) / (r.width / cells.length))))]; };
document.addEventListener('dragover', e => {
  if (!dragging) return;
  const lane = e.target.closest('.sb__lane'); if (!lane) return;
  e.preventDefault(); $$('.sb__cell.is-over').forEach(x => x.classList.remove('is-over')); cellAt(lane, e.clientX).classList.add('is-over');
});
document.addEventListener('drop', e => {
  if (!dragging) return;
  const lane = e.target.closest('.sb__lane'); if (!lane) return;
  e.preventDefault(); const cell = cellAt(lane, e.clientX), d = dragging; dragging = null;
  placePhase(d.job, d.phase, cell.dataset.dropCrew, cell.dataset.date);
});

/* ---------------------------------------------------------------- tomorrow: dispatch sheet + orders */
function tomorrow(r) {
  loadWeather();
  const day = r.q.get('d') || nextDay();
  const work = allPhases().filter(({ p }) => p.status !== 'Done' && phaseOn(p, day));
  const w = wxFor(day), v = w && verdict(w);
  const orders = work.filter(({ p }) => p.order && p.order.status !== 'Cancelled');
  const moved = allPhases().filter(({ p }) => p.order && p.order.moved && p.status !== 'Done');
  const crewCard = c => {
    const mine = work.filter(({ p }) => p.crewId === c.id);
    const people = crewMembers(c.id), eq = db.equipment.filter(q => q.crewId === c.id);
    return `<section class="card dispatch" style="--c:${c.color}">
      <div class="dispatch__head"><div><span class="eyebrow eyebrow--sm">${esc(c.name)}</span><h2>${mine.length ? mine.map(({ j, p }) => `${esc(j.number)} · ${esc(p.name)}`).join(' + ') : 'Nothing scheduled'}</h2></div>${mine.length ? btn('Copy for foreman', 'disp-copy', { kind: 'ghost', size: 'sm', ic: 'copy', attrs: `data-crew="${c.id}" data-day="${day}"` }) : ''}</div>
      ${mine.map(({ j, p }) => { const g = gate(j, p), l = phaseDigs(p) ? locateStatus(j) : null; const map = j.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(j.address)}` : '';
        return `<div class="dispatch__job">
          <dl class="packet"><dt>Where</dt><dd>${map ? `<a href="${map}" target="_blank" rel="noopener">${esc(j.address)}</a>` : esc(j.address || '—')}</dd><dt>Start</dt><dd>${esc(p.startTime || '7:00')} on site</dd><dt>Contact</dt><dd>${esc((j.site || {}).contact || '—')}${(j.site || {}).phone ? ` · <a href="tel:${esc(j.site.phone.replace(/[^\d+]/g, ''))}">${esc(j.site.phone)}</a>` : ''}</dd>${(j.site || {}).gate ? `<dt>Access</dt><dd>${esc(j.site.gate)}</dd>` : ''}<dt>Work</dt><dd>${esc(p.notes || p.name)}${p.qty ? ` — ${fix(p.qty, 0)} ${esc(p.unit || '')}` : ''}</dd>
            ${p.order ? `<dt>Material</dt><dd>${fix(p.order.qty, 0)} ${esc(p.order.unit)} ${esc(p.order.product || '')} from ${esc(p.order.supplier || '—')} · first load ${esc(p.order.time || '')} · ${badge(p.order.status === 'Confirmed' ? 'Go' : 'Watch', p.order.status)}</dd>` : ''}
            ${l ? `<dt>811</dt><dd><span class="badge badge--${l.tone}">${esc(l.label)}</span></dd>` : ''}</dl>
          ${g.ready ? '' : `<p class="phase__hint is-bad">${icon('shield')} Not ready: ${esc(g.open.map(i => i.label).join(', '))}</p>`}
        </div>`; }).join('')}
      ${mine.length ? `<div class="dispatch__crew"><span class="label">Crew</span>${people.map(s => `<span class="chip-p"><span class="avatar avatar--xs">${esc(initials(s.name))}</span>${esc(s.name)}${hasExpiredDriving(s) ? ' ⚠' : ''}</span>`).join('') || '<span class="muted">No one assigned</span>'}</div>
        ${eq.length ? `<div class="dispatch__crew"><span class="label">Equipment</span>${eq.map(q => `<span class="chip-p${eqStatus(q) === 'Down for repair' ? ' is-bad' : ''}">${esc(q.unit)} ${esc(q.name)}</span>`).join('')}</div>` : ''}` : ''}
    </section>`;
  };
  return hero({
    eyebrow: 'Build · Dispatch', title: `${weekday(day)}, ${fmtDate(day)}`,
    sub: w ? `${w.short || ''} · ${w.high ?? '–'}°/${w.low ?? '–'}° · ${w.rain || 0}% rain — asphalt ${v.a.toLowerCase()}, concrete ${v.c.toLowerCase()}.` : 'Each crew’s sheet for the next working day, and the material orders to call in.',
    actions: btn('Print sheets', 'disp-print', { kind: 'outline', ic: 'print' }) + `<a class="btn btn--outline btn--sm" href="#schedule/tomorrow?d=${addDays(day, -1)}">‹</a><a class="btn btn--outline btn--sm" href="#schedule/tomorrow?d=${addDays(day, 1)}">›</a>`,
  }) + tabs(T(), 'tomorrow', 'schedule') + `<div class="page">
    ${moved.length ? `<p class="alert alert--bad">${icon('clock')} Orders that moved — call and re-confirm: ${moved.map(({ j, p }) => `<a href="#jobs/${j.id}/phases">${esc(p.order.supplier || 'supplier')} · ${esc(j.number)} → ${shortDate(p.order.moved)}</a>`).join(', ')}</p>` : ''}
    ${card(`Material orders for ${weekday(day)}`, orders.length ? `<table class="table table--plain"><thead><tr><th>Supplier</th><th>Job</th><th>What</th><th class="r">Qty</th><th>First load</th><th>Status</th><th></th></tr></thead><tbody>${orders.map(({ j, p }) => `<tr><td><strong>${esc(p.order.supplier || '—')}</strong></td><td>${esc(j.number)} · ${esc(p.name)}</td><td>${esc(p.order.product || '')}${p.order.pump ? ` · pump: ${esc(p.order.pump)}` : ''}</td><td class="r">${fix(p.order.qty, 0)} ${esc(p.order.unit)}</td><td>${esc(p.order.time || '')}</td><td>${badge(p.order.status === 'Confirmed' ? 'Go' : p.order.status === 'Not ordered' ? 'No' : 'Watch', p.order.status)}</td><td>${editable() && p.order.status !== 'Confirmed' ? btn(p.order.status === 'Not ordered' ? 'Placed' : 'Confirmed', 'disp-confirm', { kind: 'ghost', size: 'sm', attrs: `data-job="${j.id}" data-ph="${p.id}"` }) : ''}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">No material orders for this day.</p>', { eyebrow: 'Call the plants' })}
    <div class="dispatch-grid">${db.settings.crews.map(crewCard).join('')}</div>
  </div>`;
}
function sheetText(crewId, day) {
  const c = db.settings.crews.find(x => x.id === crewId);
  const mine = allPhases().filter(({ p }) => p.crewId === crewId && p.status !== 'Done' && phaseOn(p, day));
  return [`${c.name} — ${weekday(day)} ${shortDate(day)}`, ...mine.map(({ j, p }) => [
    `${j.number} ${p.name}`, j.address && `Where: ${j.address}`, `Start: ${p.startTime || '7:00'}`,
    (j.site || {}).contact && `Contact: ${j.site.contact}${j.site.phone ? ' ' + j.site.phone : ''}`, (j.site || {}).gate && `Access: ${j.site.gate}`,
    p.order && `Material: ${p.order.qty} ${p.order.unit} ${p.order.product || ''} from ${p.order.supplier || '?'} @ ${p.order.time} (${p.order.status})`,
    p.notes && `Notes: ${p.notes}`,
  ].filter(Boolean).join('\n'))].join('\n\n');
}
act({
  'disp-copy'(el) { const t = sheetText(el.dataset.crew, el.dataset.day); navigator.clipboard.writeText(t).then(() => toast('Copied — paste it into a text to the foreman.'), () => toast(t)); },
  async 'disp-confirm'(el) {
    const j = JSON.parse(JSON.stringify(find('jobs', el.dataset.job))), p = j.phases.find(x => x.id === el.dataset.ph);
    p.order.status = p.order.status === 'Not ordered' ? 'Placed' : 'Confirmed'; if (p.order.status === 'Confirmed') delete p.order.moved;
    await put('jobs', j); ui.rerender(); toast(`${p.order.supplier || 'Order'}: ${p.order.status.toLowerCase()}.`);
  },
  'disp-print'() { printHtml(`<article class="pr">${$$('.dispatch').map(d => `<div class="pr__opt">${d.innerHTML.replace(/<button[\s\S]*?<\/button>/g, '')}</div>`).join('')}</article>`); },
});
