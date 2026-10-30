/* Schedule: crew × day board with multi-day bars, sold-work tray, drag or click to place, rain-day shift, conflicts, weather. */
import { $, $$, esc, num, money, today, addDays, monday, weekday, shortDate, fmtDate, icon, badge, isWeekend } from '../core.js';
import { db, S, put, find, can } from '../store.js';
import { act, hero, btn, toast, ui, custName, crewName } from '../ui.js';
import { onDay, jobDays, crewMembers, hasExpiredDriving, eqStatus } from '../derive.js';
import { loadWeather, wxFor, wxGo, verdict } from '../weather.js';
import { openJob } from './jobs.js';

export default {
  title: 'Schedule',
  roles: ['owner', 'office', 'estimator', 'foreman', 'crew'],
  badge: () => tray().length,
  render() { return board(); },
};
const editable = () => can.write('jobs');
const tray = () => db.jobs.filter(j => !['Complete', 'On hold'].includes(j.status) && (!j.start || !j.crewId));
const workday = d => !isWeekend(d) || (db.settings.workSaturday && new Date(d + 'T00:00:00').getDay() === 6);
const nextWorkday = (d, step = 1) => { let x = addDays(d, step); while (!workday(x)) x = addDays(x, step > 0 ? 1 : -1); return x; };
const spanDays = j => Math.max(1, Math.round((new Date((j.end || j.start) + 'T00:00:00') - new Date(j.start + 'T00:00:00')) / 864e5) + 1);

function conflicts(j) {
  const out = [];
  const people = crewMembers(j.crewId);
  people.filter(hasExpiredDriving).forEach(p => out.push(`${p.name}’s CDL / medical card is expired`));
  db.equipment.filter(q => q.crewId === j.crewId && eqStatus(q) === 'Down for repair').forEach(q => out.push(`${q.unit} ${q.name} is down for repair`));
  const clash = db.jobs.filter(o => o.id !== j.id && o.crewId === j.crewId && o.start && !['Complete', 'On hold'].includes(o.status) && o.start <= (j.end || j.start) && (o.end || o.start) >= j.start);
  clash.forEach(o => out.push(`Overlaps ${o.number} on the same crew`));
  for (let d = j.start; d <= (j.end || j.start); d = addDays(d, 1)) { const w = wxFor(d), go = w && wxGo(w, j.type); if (go === 'No') { out.push(`${weekday(d)}: weather says no-go for ${j.type.toLowerCase()}`); break; } }
  return out;
}

function board() {
  loadWeather();
  ui.week = ui.week || monday(today());
  const nDays = ui.twoWeeks ? 14 : 7;
  const days = Array.from({ length: nDays }, (_, i) => addDays(ui.week, i)).filter(d => workday(d) || db.jobs.some(j => j.crewId && onDay(j, d)));
  const crews = db.settings.crews;
  const first = days[0], last = days[days.length - 1];
  const col = d => days.indexOf(d);
  const placing = ui.placing && find('jobs', ui.placing);

  const dayHead = days.map(d => {
    const w = wxFor(d), v = w && verdict(w);
    const dollars = db.jobs.filter(j => j.crewId && onDay(j, d) && j.status !== 'On hold').reduce((t, j) => t + num(j.value) / Math.max(1, jobDays(j)), 0);
    return `<div class="sb__day${d === today() ? ' is-today' : ''}${isWeekend(d) ? ' is-weekend' : ''}">
      <strong>${weekday(d)} <span>${shortDate(d)}</span></strong>
      ${w ? `<small>${w.high ?? '–'}° · ${w.rain || 0}% rain</small><span class="sb__wx" title="A = asphalt, C = concrete">A ${badge(v.a)} C ${badge(v.c)}</span>` : '<small class="muted">No forecast</small>'}
      ${can.money() && dollars ? `<em class="sb__dollars">${money(dollars)}</em>` : ''}
    </div>`;
  }).join('');

  const rows = crews.map(c => {
    const jobs = db.jobs.filter(j => j.crewId === c.id && j.start && !['On hold'].includes(j.status) && j.start <= last && (j.end || j.start) >= first).sort((a, b) => a.start.localeCompare(b.start));
    const lanes = [];
    const bars = jobs.map(j => {
      const s = Math.max(0, col(j.start) < 0 ? 0 : col(j.start));
      const startIdx = j.start < first ? 0 : days.findIndex(d => d >= j.start);
      let endIdx = days.length - 1; for (let i = days.length - 1; i >= 0; i--) { if (days[i] <= (j.end || j.start)) { endIdx = i; break; } }
      if (startIdx < 0 || endIdx < startIdx) return '';
      let lane = lanes.findIndex(l => l < startIdx); if (lane < 0) { lane = lanes.length; lanes.push(endIdx); } else lanes[lane] = endIdx;
      const warn = j.status !== 'Complete' ? conflicts(j) : [];
      return `<button type="button" class="sb__bar sb__bar--${esc((j.type || 'mixed').toLowerCase())}${j.status === 'Complete' ? ' is-done' : ''}${warn.length ? ' has-warn' : ''}" style="grid-column:${startIdx + 1} / ${endIdx + 2};grid-row:${lane + 1}" ${editable() ? 'draggable="true"' : ''} data-drag-job="${j.id}" data-act="sb-open" data-id="${j.id}" title="${esc(warn.join('\n'))}">
        <strong>${warn.length ? icon('shield', 'warn-ico') : ''}${esc(j.number)} · ${esc(j.name)}</strong><small>${esc(custName(j.customerId))}${j.start < first ? ' · continued' : ''} · ${spanDays(j)}d</small>
      </button>`;
    }).join('');
    const people = crewMembers(c.id);
    return `<div class="sb__crew" style="--c:${c.color}">
      <strong>${esc(c.name)}</strong><small>${people.length} people</small>
      ${editable() ? `<button type="button" class="linkish" data-act="sb-rain" data-crew="${c.id}" title="Push this crew’s remaining work back one working day">Rain day →</button>` : ''}
    </div>
    <div class="sb__lane" style="--cols:${days.length};--rows:${Math.max(1, lanes.length)}">
      <div class="sb__cells">${days.map(d => `<div class="sb__cell${d === today() ? ' is-today' : ''}${placing ? ' is-target' : ''}" data-drop-crew="${c.id}" data-date="${d}" ${placing ? `data-act="sb-place" data-crew="${c.id}"` : ''}></div>`).join('')}</div>
      <div class="sb__bars">${bars}</div>
    </div>`;
  }).join('');

  const t = tray();
  return hero({
    eyebrow: 'Build', title: 'Schedule',
    sub: editable() ? 'Drag sold work from the tray onto a crew and day, or click a job then click a day. Drag bars to move them — the length stays the same.' : 'Who is where. Ask the office to make changes.',
    actions: `<div class="week-nav week-nav--hero">
      <button type="button" class="btn btn--outline btn--sm" data-act="sb-week" data-v="-7" aria-label="Previous week">‹</button>
      <button type="button" class="btn btn--outline btn--sm" data-act="sb-week" data-v="0">Today</button>
      <button type="button" class="btn btn--outline btn--sm" data-act="sb-week" data-v="7" aria-label="Next week">›</button>
      <button type="button" class="btn btn--outline btn--sm" data-act="sb-span">${ui.twoWeeks ? '1 week' : '2 weeks'}</button></div>`,
  }) + `<div class="page">
    ${editable() ? `<section class="tray${placing ? ' is-placing' : ''}">
      <div class="tray__head"><span class="eyebrow eyebrow--sm">Sold work to schedule</span><strong>${t.length ? `${t.length} job${t.length === 1 ? '' : 's'} waiting` : 'Nothing waiting — every sold job has a crew and date.'}</strong>
      ${placing ? `<span class="tray__hint">Click a crew and day to place <b>${esc(placing.number)}</b> ${btn('Cancel', 'sb-cancel', { kind: 'ghost', size: 'sm' })}</span>` : ''}</div>
      <div class="tray__items">${t.map(j => `<button type="button" class="tray__job${ui.placing === j.id ? ' is-on' : ''}" draggable="true" data-drag-job="${j.id}" data-act="sb-pick" data-id="${j.id}">
        <strong>${esc(j.number)} · ${esc(j.name)}</strong><small>${esc(custName(j.customerId))} · ${esc(j.type)}${j.budget ? ` · ~${Math.max(1, Math.ceil(j.budget.days))} day${Math.ceil(j.budget.days) > 1 ? 's' : ''}` : ''}${can.money() ? ` · ${money(j.value)}` : ''}</small></button>`).join('')}</div>
    </section>` : ''}
    <h2 class="sb-title">${fmtDate(first)} – ${fmtDate(last)}</h2>
    <div class="card sb-card"><div class="sb" style="--cols:${days.length}">
      <div class="sb__corner">Crew</div>${dayHead}
      ${rows}
    </div></div>
    <p class="muted small">Bars show a shield when something needs a look: an expired CDL on the crew, equipment down, a crew double-booked, or a no-go forecast. Hover a bar for details.</p>
  </div>`;
}

async function placeJob(jobId, crewId, date) {
  const j = find('jobs', jobId); if (!j) return;
  const len = j.start ? spanDays(j) : Math.max(1, Math.ceil((j.budget && j.budget.days) || 1));
  let end = date; for (let i = 1; i < len; i++) end = nextWorkday(end);
  const moved = j.start && j.start !== date;
  const log = [...(j.schedLog || []), { on: today(), by: S.user ? S.user.name : 'Office', note: j.start ? `Moved from ${j.start} to ${date}` : `Scheduled for ${date}` }];
  await put('jobs', { ...j, crewId, start: date, end, schedLog: log });
  ui.placing = null; ui.rerender();
  const crew = crewName(crewId);
  toast(`${j.number} → ${crew}, ${shortDate(date)}${end !== date ? '–' + shortDate(end) : ''}.${moved ? ' Let the crew and customer know.' : ''}`);
}
act({
  'sb-week'(el) { ui.week = el.dataset.v === '0' ? monday(today()) : addDays(ui.week, +el.dataset.v); ui.rerender(); },
  'sb-span'() { ui.twoWeeks = !ui.twoWeeks; ui.rerender(); },
  'sb-open'(el) { if (!dragging) openJob(el.dataset.id); },
  'sb-pick'(el) { ui.placing = ui.placing === el.dataset.id ? null : el.dataset.id; ui.rerender(); },
  'sb-cancel'() { ui.placing = null; ui.rerender(); },
  'sb-place'(el) { if (ui.placing) placeJob(ui.placing, el.dataset.crew, el.dataset.date); },
  async 'sb-rain'(el) {
    const crewId = el.dataset.crew, from = today() < ui.week ? ui.week : today();
    const jobs = db.jobs.filter(j => j.crewId === crewId && j.start && !['Complete', 'On hold'].includes(j.status) && (j.end || j.start) >= from);
    if (!jobs.length) return toast(`${crewName(crewId)} has nothing scheduled from ${shortDate(from)} on.`);
    for (const j of jobs) {
      const start = j.start >= from ? nextWorkday(j.start) : j.start, end = nextWorkday(j.end || j.start);
      await put('jobs', { ...j, start, end, schedLog: [...(j.schedLog || []), { on: today(), by: S.user ? S.user.name : 'Office', note: `Rain day — pushed back one working day` }] });
    }
    ui.rerender(); toast(`${crewName(crewId)}: ${jobs.length} job${jobs.length === 1 ? '' : 's'} pushed back a working day. Let customers know.`);
  },
});

// Drag & drop (mouse). Click-to-place covers touch screens.
let dragging = null;
document.addEventListener('dragstart', e => { const b = e.target.closest('[data-drag-job]'); if (b) { dragging = b.dataset.dragJob; e.dataTransfer.effectAllowed = 'move'; b.classList.add('is-dragging'); } });
document.addEventListener('dragend', e => { const b = e.target.closest('[data-drag-job]'); if (b) b.classList.remove('is-dragging'); $$('.sb__cell.is-over').forEach(c => c.classList.remove('is-over')); setTimeout(() => { dragging = null; }, 0); });
document.addEventListener('dragover', e => { const c = e.target.closest('[data-drop-crew]'); if (c && dragging) { e.preventDefault(); $$('.sb__cell.is-over').forEach(x => x !== c && x.classList.remove('is-over')); c.classList.add('is-over'); } });
document.addEventListener('drop', e => {
  const c = e.target.closest('[data-drop-crew]'); if (!c || !dragging) return;
  e.preventDefault(); const id = dragging; dragging = null;
  placeJob(id, c.dataset.dropCrew, c.dataset.date);
});
// Bars sit above the cells; let drops "fall through" a bar to the day under the cursor.
document.addEventListener('dragover', e => {
  if (!dragging || e.target.closest('[data-drop-crew]')) return;
  const lane = e.target.closest('.sb__lane'); if (!lane) return;
  const cells = $$('.sb__cell', lane), r = lane.getBoundingClientRect(), i = Math.min(cells.length - 1, Math.max(0, Math.floor((e.clientX - r.left) / (r.width / cells.length))));
  e.preventDefault(); $$('.sb__cell.is-over').forEach(x => x.classList.remove('is-over')); cells[i].classList.add('is-over'); lane.dataset.overIdx = i;
});
document.addEventListener('drop', e => {
  if (!dragging || e.target.closest('[data-drop-crew]')) return;
  const lane = e.target.closest('.sb__lane'); if (!lane) return;
  e.preventDefault(); const cell = $$('.sb__cell', lane)[+lane.dataset.overIdx || 0], id = dragging; dragging = null;
  placeJob(id, cell.dataset.dropCrew, cell.dataset.date);
});
