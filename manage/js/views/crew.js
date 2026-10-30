/* Crew & time: time clock, timesheets, daily reports, people. Also the field "My day" home screen. */
import { $, $$, esc, num, round, money, fix, today, addDays, monday, fmtDate, shortDate, weekday, fmtTime, hoursBetween, fmtHours, greeting, icon, badge, initials, uid, COST_CODES, CERTS, UNITS, daysUntil } from '../core.js';
import { db, S, put, del, find, can, role, myStaffId, api } from '../store.js';
import { act, onSubmit, onChange, hero, tabs, card, btn, linkBtn, table, f, fieldHtml, formDrawer, openDrawer, closeDrawer, collect, validate, toast, confirmTwice, crewOf, crewName, crewDot, custName, jobLabel, staffName, empty, stats, ui, printHtml, download, csv, expStatus } from '../ui.js';
import { onDay, crewMembers, isClockedIn, certAlerts, hasExpiredDriving } from '../derive.js';
import { weekSummary } from '../calc.js';
import { WX, wxFor, wxGo, loadWeather } from '../weather.js';
import { estTotals } from '../derive.js';

const TABS = () => [
  ['clock', 'Time clock'],
  role() !== 'crew' && ['timesheets', 'Timesheets', db.time.filter(t => t.status === 'submitted').length || ''],
  role() !== 'crew' && ['reports', 'Daily reports'],
  role() !== 'crew' && ['people', 'People'],
];
export default {
  title: 'Crew & time',
  roles: ['owner', 'office', 'estimator', 'foreman', 'crew'],
  badge: () => db.time.filter(t => !t.end && t.date < today()).length,
  render(r) {
    const tab = r.parts[0] || (role() === 'estimator' ? 'reports' : 'clock');
    const body = { clock, timesheets, reports, people }[tab] || clock;
    return body(r) ;
  },
};
const page = (tab, h, body) => h + tabs(TABS(), tab, 'crew') + `<div class="page">${body}</div>`;

/* ---------------------------------------------------------------- clock helpers */
const defaultCode = job => job ? ({ Asphalt: 'Asphalt paving', Concrete: 'Concrete flatwork', Excavation: 'Excavation & grading' }[job.type] || 'Asphalt paving') : 'Shop / yard';
const todaysJob = crewId => db.jobs.find(j => j.crewId === crewId && onDay(j, today()) && !['Complete', 'On hold'].includes(j.status));
const hoursOf = t => Math.max(0, hoursBetween(t.start, t.end || new Date().toISOString()) - num(t.breakMin) / 60);
const nowIso = () => new Date().toISOString();
const atTime = (date, hhmm) => { const [h, m] = String(hhmm || '00:00').split(':').map(Number); const d = new Date(date + 'T00:00:00'); d.setHours(h || 0, m || 0, 0, 0); return d.toISOString(); };
const hhmm = ts => { if (!ts) return ''; const d = new Date(ts); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
function stampGps() {
  return new Promise(res => {
    if (!navigator.geolocation) return res(null);
    navigator.geolocation.getCurrentPosition(p => res({ lat: round(p.coords.latitude, 5), lng: round(p.coords.longitude, 5) }), () => res(null), { timeout: 6000, maximumAge: 60000 });
  });
}
async function clockIn(staffIds, { jobId, costCode, start = nowIso(), gps }) {
  const where = gps ? await stampGps() : null;
  for (const staffId of staffIds) {
    if (isClockedIn(staffId)) continue;
    await put('time', { id: uid(), staffId, jobId, costCode, date: today(), start, end: '', breakMin: 0, hours: 0, status: 'open', source: staffIds.length > 1 ? 'crew' : 'clock', gps: where, notes: '', by: S.user ? S.user.name : '' });
  }
}
async function clockOut(staffIds, { end = nowIso(), breakMin = 0, injury = false, notes = '' }) {
  for (const staffId of staffIds) {
    const t = isClockedIn(staffId); if (!t) continue;
    const brk = num(breakMin);
    const rec = { ...t, end, breakMin: brk, injury: !!injury, notes: [t.notes, notes].filter(Boolean).join(' · ') };
    rec.hours = round(hoursOf(rec), 2);
    rec.status = 'submitted'; // clocking out confirms the time; the office approves the week
    await put('time', rec);
  }
}

/* ---------------------------------------------------------------- My day (foreman / crew home) */
export function myDay() {
  const me = find('staff', myStaffId());
  const first = S.user ? S.user.name.split(' ')[0] : '';
  if (!me) return hero({ eyebrow: fmtDate(today()), title: `${greeting()}${first ? ', ' + esc(first) : ''}.`, sub: 'Your login isn’t linked to a person on the crew list yet. Ask the office to link it in Settings → Users.' });
  const crew = crewOf(me.crewId), job = crew && todaysJob(crew.id);
  const est = job && find('estimates', job.estimateId);
  const scope = est ? estTotals(est).contract.sections.flatMap(s => s.lines) : [];
  const wk = monday(today());
  const mine = db.time.filter(t => t.staffId === me.id && t.date >= wk);
  const weekHrs = mine.reduce((s, t) => s + (t.end ? num(t.hours) : hoursOf(t)), 0);
  const mapUrl = job && job.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}` : '';
  const go = job ? wxGo(wxFor(today()), job.type) : null;
  loadWeather();
  const foreman = role() === 'foreman';
  const openT = isClockedIn(me.id);
  return hero({
    eyebrow: fmtDate(today()), title: `${greeting()}, ${esc(first || me.name)}.`,
    sub: job ? `Today: ${esc(job.name)}` : 'No job on the schedule for your crew today.',
    actions: foreman && job ? btn('Daily report', 'log-new', { ic: 'clipboard', attrs: `data-job="${job.id}"` }) : '',
  }) + `<div class="page">
    <div class="grid-2">
      ${card(job ? esc(job.name) : 'Nothing scheduled', job ? `
        <p class="lead-sm">${esc(custName(job.customerId))}${job.address ? ` · ${esc(job.address)}` : ''}</p>
        <div class="btn-row">${mapUrl ? `<a class="btn btn--black btn--sm" href="${mapUrl}" target="_blank" rel="noopener">${icon('map')}<span>Directions</span></a>` : ''}${go ? `<span class="wx-inline">Weather ${badge(go)}</span>` : ''}</div>
        ${scope.length ? `<h3 class="sub-h">Scope</h3><ul class="scope">${scope.map(l => `<li><span>${esc(l.desc)}</span><b>${fix(l.qty, 0)} ${esc(l.unit)}</b></li>`).join('')}</ul>` : ''}
        ${job.budget ? `<h3 class="sub-h">Planned materials</h3>${stats([['Hot-mix', fix(job.budget.hmaTons, 0) + ' t'], ['Base rock', fix(job.budget.baseTons, 0) + ' t'], ['Concrete', fix(job.budget.cy, 1) + ' CY'], ['Truck hours', fix(job.budget.truckHrs, 0)]])}` : ''}
        ${job.notes ? `<h3 class="sub-h">Notes</h3><p>${esc(job.notes)}</p>` : ''}` : '<p class="muted">Check with the superintendent for today’s assignment.</p>', { eyebrow: 'Today’s job' })}
      <div class="stack">
        ${foreman && crew ? crewCard(crew) : card('Your time', `
          <div class="clock-me">
            <strong>${openT ? `On the clock since ${fmtTime(openT.start)}` : 'Off the clock'}</strong>
            <span class="muted">${openT ? `${fmtHours(hoursOf(openT))} so far · ${esc(openT.costCode || '')}` : job ? `Clock in to ${esc(job.name)}` : 'Clock in to shop / yard'}</span>
            ${openT ? btn('Clock out', 'clock-out-one', { kind: 'black', ic: 'stop', attrs: `data-id="${me.id}"` }) : btn('Clock in', 'clock-in-one', { ic: 'play', attrs: `data-id="${me.id}"` })}
          </div>`, { eyebrow: 'Time clock' })}
        ${card('This week', stats([['Hours', fmtHours(weekHrs)], ['Overtime', fmtHours(Math.max(0, weekHrs - num(db.settings.otHours || 40)))]]), { eyebrow: 'Your hours' })}
      </div>
    </div>
  </div>`;
}

/* ---------------------------------------------------------------- time clock tab */
function crewCard(c) {
  const people = crewMembers(c.id), job = todaysJob(c.id), inCount = people.filter(p => isClockedIn(p.id)).length;
  const can_ = can.write('time');
  return `<section class="card clock-crew" style="--c:${c.color}">
    <div class="clock-crew__head">
      <div><span class="eyebrow eyebrow--sm">${esc(c.name)}</span><h2>${job ? esc(job.name) : 'No job scheduled today'}</h2><small class="muted">${inCount} of ${people.length} on the clock${job ? ` · default code: ${esc(defaultCode(job))}` : ''}</small></div>
      ${can_ ? `<div class="btn-row">${inCount < people.length ? btn('Clock in crew', 'clock-in-crew', { size: 'sm', ic: 'play', attrs: `data-crew="${c.id}"` }) : ''}${inCount ? btn('Switch job', 'switch-crew', { kind: 'ghost', size: 'sm', attrs: `data-crew="${c.id}"` }) + btn('Clock out crew', 'clock-out-crew', { kind: 'black', size: 'sm', ic: 'stop', attrs: `data-crew="${c.id}"` }) : ''}</div>` : ''}
    </div>
    <ul class="people">${people.map(personRow).join('') || '<li class="muted">No one is assigned to this crew. Set crews in Crew & time → People.</li>'}</ul>
  </section>`;
}
function personRow(p) {
  const t = isClockedIn(p.id), j = t && find('jobs', t.jobId), warn = hasExpiredDriving(p);
  const mine = role() === 'crew' ? p.id === myStaffId() : can.write('time');
  return `<li class="person${t ? ' is-in' : ''}">
    <span class="avatar">${esc(initials(p.name))}</span>
    <span class="person__main"><strong>${esc(p.name)}${warn ? ' <span class="badge badge--red" title="CDL or DOT medical card expired">License expired</span>' : ''}</strong>
      <small>${t ? `In since ${fmtTime(t.start)} · ${esc(j ? j.number : 'No job')} · ${esc(t.costCode || 'no cost code')}` : esc(p.title || '')}</small></span>
    ${t ? `<span class="person__time">${fmtHours(hoursOf(t))}</span>` : ''}
    ${mine ? (t ? btn('Out', 'clock-out-one', { kind: 'ghost', size: 'sm', attrs: `data-id="${p.id}"` }) : btn('In', 'clock-in-one', { kind: 'ghost', size: 'sm', attrs: `data-id="${p.id}"` })) : ''}
  </li>`;
}
function clock() {
  const open = db.time.filter(t => !t.end);
  const stale = open.filter(t => t.date < today());
  const loose = db.staff.filter(p => p.active !== 'Inactive' && !db.settings.crews.some(c => c.id === p.crewId) && db.time.some(t => t.staffId === p.id));
  const crews = role() === 'crew' ? db.settings.crews.filter(c => c.id === (find('staff', myStaffId()) || {}).crewId) : db.settings.crews;
  return page('clock', hero({
    eyebrow: 'Crew & time', title: 'Time clock',
    sub: `${open.length} ${open.length === 1 ? 'person is' : 'people are'} on the clock right now. Foremen can clock in the whole crew — job and cost code come from today’s schedule.`,
    actions: can.write('time') && role() !== 'crew' ? btn('Add time', 'time-new', { kind: 'outline', ic: 'plus' }) : '',
  }), `
    ${stale.length ? `<p class="alert alert--bad">${icon('clock')} ${stale.length} clock-in${stale.length === 1 ? ' was' : 's were'} never closed (${[...new Set(stale.map(t => staffName(t.staffId)))].join(', ')}). <a href="#crew/timesheets">Fix in Timesheets →</a></p>` : ''}
    <div class="clock-grid">${crews.map(crewCard).join('')}
      ${loose.length && role() !== 'crew' ? card('Office & unassigned', `<ul class="people">${loose.map(personRow).join('')}</ul>`, { eyebrow: 'Others' }) : ''}
    </div>
    <p class="muted small">Location is stamped only at clock-in, when the box is ticked, and only with the device’s permission. Nothing is tracked off the clock.</p>`);
}

const jobOptions = () => db.jobs.filter(j => j.status !== 'Complete').map(j => [j.id, jobLabel(j)]);
function crewClockDrawer(c, mode) {
  const people = crewMembers(c.id).filter(p => mode === 'in' ? !isClockedIn(p.id) : !!isClockedIn(p.id));
  const job = todaysJob(c.id);
  const list = `<fieldset class="checks"><legend>Who</legend>${people.map(p => `<label><input type="checkbox" name="who" value="${p.id}" checked> ${esc(p.name)} <small class="muted">${esc(p.title || '')}</small></label>`).join('') || '<p class="muted">Everyone is already ' + (mode === 'in' ? 'in' : 'out') + '.</p>'}</fieldset>`;
  const now = hhmm(nowIso());
  const fields = mode === 'out'
    ? `${fieldHtml(f('time', 'Clock-out time', 'time'), now)}${fieldHtml(f('breakMin', 'Unpaid break (minutes)', 'number'), 30)}
       ${fieldHtml(f('injury', 'Was anyone hurt today?', 'select', { o: [['no', 'No'], ['yes', 'Yes — log it in the daily report']], noBlank: true }), 'no')}
       ${fieldHtml(f('accurate', 'I checked these times and they’re accurate', 'check', { wide: true }), true)}`
    : `${fieldHtml(f('jobId', 'Job', 'select', { o: jobOptions, blank: 'Shop / no job' }), job ? job.id : '')}${fieldHtml(f('costCode', 'Cost code', 'select', { o: COST_CODES, noBlank: true }), defaultCode(job))}
       ${fieldHtml(f('time', 'Clock-in time', 'time'), now)}${fieldHtml(f('gps', 'Stamp our location', 'check'), false)}`;
  openDrawer(`<form class="form" data-submit="crew-clock" data-mode="${mode}" data-switch="${mode === 'switch' ? 1 : ''}" novalidate>
    <header class="form__head"><div><span class="eyebrow eyebrow--sm">${esc(c.name)}</span><h2>${mode === 'out' ? 'Clock out crew' : mode === 'switch' ? 'Switch job / cost code' : 'Clock in crew'}</h2></div><button type="button" class="x x--lg" data-act="close" aria-label="Close">×</button></header>
    <div class="form__body">${list}<div class="fields">${fields}</div></div>
    <footer class="form__foot"><div class="form__actions"></div><button type="button" class="btn btn--ghost" data-act="close">Cancel</button><button type="submit" class="btn btn--yellow">${mode === 'out' ? 'Clock out' : mode === 'switch' ? 'Switch' : 'Clock in'}</button></footer>
  </form>`);
}
act({
  'clock-in-crew'(el) { crewClockDrawer(crewOf(el.dataset.crew), 'in'); },
  'clock-out-crew'(el) { crewClockDrawer(crewOf(el.dataset.crew), 'out'); },
  'switch-crew'(el) { crewClockDrawer(crewOf(el.dataset.crew), 'switch'); },
  async 'clock-in-one'(el) {
    const p = find('staff', el.dataset.id), job = p && todaysJob(p.crewId);
    await clockIn([p.id], { jobId: job ? job.id : '', costCode: defaultCode(job) });
    toast(`${p.name} clocked in${job ? ' to ' + job.number : ''}.`); ui.rerender();
  },
  async 'clock-out-one'(el) {
    const p = find('staff', el.dataset.id), t = isClockedIn(p.id);
    await clockOut([p.id], { breakMin: hoursOf(t) > 6 ? 30 : 0 });
    toast(`${p.name} clocked out.`); ui.rerender();
  },
});
onSubmit({
  async 'crew-clock'(form) {
    const who = $$('input[name=who]:checked', form).map(x => x.value), e = form.elements, mode = form.dataset.mode;
    if (!who.length) return toast('Pick at least one person.', 'bad');
    const at = atTime(today(), e.time.value);
    if (mode === 'out') {
      if (!e.accurate.checked) return toast('Check the times, then tick the box.', 'bad');
      await clockOut(who, { end: at, breakMin: e.breakMin.value, injury: e.injury.value === 'yes', notes: e.injury.value === 'yes' ? 'Injury reported at clock-out' : '' });
      toast(`${who.length} clocked out.${e.injury.value === 'yes' ? ' Add the injury details to today’s daily report.' : ''}`);
    } else {
      if (form.dataset.switch) await clockOut(who, { end: at, breakMin: 0 });
      await clockIn(who, { jobId: e.jobId.value, costCode: e.costCode.value, start: at, gps: e.gps.checked });
      toast(form.dataset.switch ? `Switched ${who.length} to ${e.costCode.value}.` : `${who.length} clocked in.`);
    }
    closeDrawer(); ui.rerender();
  },
});

/* ---------------------------------------------------------------- time entry editor */
const TIME_FIELDS = () => [
  f('staffId', 'Person', 'select', { o: () => db.staff.filter(s => s.active !== 'Inactive').map(s => [s.id, s.name]), req: true }),
  f('date', 'Date', 'date', { req: true, def: today }),
  f('jobId', 'Job', 'select', { o: () => db.jobs.map(j => [j.id, jobLabel(j)]), blank: 'Shop / no job' }),
  f('costCode', 'Cost code', 'select', { o: COST_CODES, req: true }),
  f('startT', 'Start', 'time', { req: true }), f('endT', 'End', 'time', { help: 'Leave empty if still on the clock' }),
  f('breakMin', 'Unpaid break (min)', 'number'),
  can.approve() && f('status', 'Status', 'select', { o: [['open', 'Open'], ['submitted', 'Submitted'], ['approved', 'Approved (locked)']], noBlank: true }),
  f('notes', 'Notes', 'textarea', { wide: true }),
].filter(Boolean);
export function openTime(id, preset = {}) {
  const t = id ? find('time', id) : { date: today(), breakMin: 30, status: 'submitted', ...preset };
  const locked = t.status === 'approved' && !can.approve();
  formDrawer({
    eyebrow: 'Time entry', title: id ? `${esc(staffName(t.staffId))} · ${fmtDate(t.date)}` : 'Add time', fields: TIME_FIELDS(), submit: 'time-save', id,
    rec: { ...t, startT: hhmm(t.start) || '07:00', endT: hhmm(t.end) || (id ? '' : '17:00') },
    note: locked ? 'This week is approved and locked. Ask the office to unlock it.' : t.qbo ? 'Already sent to QuickBooks — change it there too.' : '',
    del: id && !locked ? 'time-del' : '',
  });
}
act({ 'time-new': () => openTime(), 'time-edit': el => openTime(el.dataset.id),
  async 'time-del'(el) { if (!confirmTwice(el, 'Click again to delete')) return; await del('time', el.closest('form').dataset.id); closeDrawer(); ui.rerender(); toast('Time entry deleted.'); } });
onSubmit({
  async 'time-save'(form) {
    const fields = TIME_FIELDS(); if (!validate(form, fields)) return;
    const v = collect(form, fields), prev = form.dataset.id ? find('time', form.dataset.id) : null;
    if (prev && prev.status === 'approved' && !can.approve()) return toast('This entry is locked.', 'bad');
    const rec = { ...(prev || { id: uid(), source: 'manual' }), staffId: v.staffId, date: v.date, jobId: v.jobId, costCode: v.costCode, breakMin: num(v.breakMin), notes: v.notes, start: atTime(v.date, v.startT), end: v.endT ? atTime(v.date, v.endT) : '' };
    if (rec.end && rec.end < rec.start) return toast('End time is before the start time.', 'bad');
    rec.hours = rec.end ? round(hoursOf(rec), 2) : 0;
    rec.status = v.status || (rec.end ? 'submitted' : 'open');
    await put('time', rec); closeDrawer(); ui.rerender(); toast('Time saved.');
  },
});

/* ---------------------------------------------------------------- timesheets tab */
function timesheets(r) {
  ui.week = ui.week || monday(today());
  const wk = r.q.get('week') || ui.week, days = Array.from({ length: 7 }, (_, i) => addDays(wk, i)), end = days[6];
  const entries = db.time.filter(t => t.date >= wk && t.date <= end);
  const ot = num(db.settings.otHours) || 40;
  const people = db.staff.filter(p => entries.some(t => t.staffId === p.id) || (p.crewId && p.active !== 'Inactive'));
  const rows = people.map(p => {
    const mine = entries.filter(t => t.staffId === p.id);
    const sum = weekSummary(mine.map(t => ({ hours: t.end ? t.hours : hoursOf(t) })), db.settings);
    const sts = [...new Set(mine.map(t => t.status))];
    const status = !mine.length ? '' : sts.length === 1 ? sts[0] : sts.includes('open') ? 'open' : 'submitted';
    const flags = mine.filter(t => !t.jobId && !/Shop|Travel|repair/i.test(t.costCode || '') || !t.costCode).length;
    return { p, mine, sum, status, flags };
  });
  const totals = rows.reduce((a, x) => ({ h: a.h + x.sum.total, o: a.o + x.sum.overtime }), { h: 0, o: 0 });
  const toApprove = entries.filter(t => t.status === 'submitted').length;
  const approved = entries.filter(t => t.status === 'approved');
  const label = { open: 'Open', submitted: 'Submitted', approved: 'Approved' };
  return page('timesheets', hero({
    eyebrow: 'Crew & time', title: 'Timesheets',
    sub: `Week of ${fmtDate(wk)}. Foremen confirm hours at clock-out; the office approves the week, which locks it for payroll.`,
    actions: [
      can.approve() && toApprove ? btn(`Approve ${toApprove}`, 'ts-approve-all', { ic: 'check', attrs: `data-week="${wk}"` }) : '',
      S.mode === 'server' && can.qbo() && approved.some(t => !t.qbo) ? btn('Send to QuickBooks', 'ts-qbo', { kind: 'outline', ic: 'qb', attrs: `data-week="${wk}"` }) : '',
      btn('Download CSV', 'ts-csv', { kind: 'outline', attrs: `data-week="${wk}"` }),
    ].join(''),
  }), `
    <div class="toolbar">
      <div class="week-nav"><a class="btn btn--ghost btn--sm" href="#crew/timesheets?week=${addDays(wk, -7)}" aria-label="Previous week">‹</a><a class="btn btn--ghost btn--sm" href="#crew/timesheets?week=${monday(today())}">This week</a><a class="btn btn--ghost btn--sm" href="#crew/timesheets?week=${addDays(wk, 7)}" aria-label="Next week">›</a><strong>${shortDate(wk)} – ${shortDate(end)}</strong></div>
      ${stats([['Total hours', fmtHours(totals.h)], ['Overtime', fmtHours(totals.o), totals.o ? 'warn' : ''], ['To approve', toApprove]])}
    </div>
    <div class="card table-card"><table class="table ts">
      <thead><tr><th>Person</th>${days.map(d => `<th class="r${d === today() ? ' is-today' : ''}">${weekday(d)}<small>${shortDate(d)}</small></th>`).join('')}<th class="r">Total</th><th class="r">OT</th><th>Status</th><th></th></tr></thead>
      <tbody>${rows.map(({ p, mine, sum, status, flags }) => `<tr>
        <td data-label="Person"><strong>${esc(p.name)}</strong><small class="muted block">${esc(crewName(p.crewId))}</small></td>
        ${days.map(d => { const ds = mine.filter(t => t.date === d); const h = ds.reduce((s, t) => s + (t.end ? num(t.hours) : hoursOf(t)), 0); const open = ds.some(t => !t.end);
          return `<td class="r ts__cell${d === today() ? ' is-today' : ''}" data-label="${weekday(d)}"><button type="button" class="ts__btn${open ? ' is-open' : ''}" data-act="ts-day" data-staff="${p.id}" data-date="${d}">${h ? fmtHours(h) : '<span class="muted">+</span>'}</button></td>`; }).join('')}
        <td class="r" data-label="Total"><strong>${fmtHours(sum.total)}</strong></td>
        <td class="r" data-label="OT">${sum.overtime ? `<span class="badge badge--yellow">${fmtHours(sum.overtime)}</span>` : sum.total >= ot - 4 && sum.total < ot ? '<span class="badge badge--gray" title="Close to overtime">near</span>' : ''}</td>
        <td data-label="Status">${status ? badge(status, label[status]) : ''}${flags ? ` <span class="badge badge--red" title="Entries without a job or cost code">${flags} missing job</span>` : ''}</td>
        <td data-label="">${can.approve() && mine.some(t => t.status !== 'approved' && t.end) ? btn('Approve', 'ts-approve', { kind: 'ghost', size: 'sm', attrs: `data-staff="${p.id}" data-week="${wk}"` }) : can.approve() && mine.length && mine.every(t => t.status === 'approved') ? btn('Unlock', 'ts-unlock', { kind: 'ghost', size: 'sm', attrs: `data-staff="${p.id}" data-week="${wk}"` }) : ''}</td>
      </tr>`).join('')}</tbody>
    </table></div>
    <p class="muted small">Overtime is 1.5× after ${ot} hours in the week (federal rule; Missouri has no daily overtime). Click any day to see or fix entries.</p>`);
}
const weekEntries = (wk, staffId) => db.time.filter(t => t.date >= wk && t.date <= addDays(wk, 6) && (!staffId || t.staffId === staffId));
act({
  'ts-day'(el) {
    const ds = db.time.filter(t => t.staffId === el.dataset.staff && t.date === el.dataset.date);
    if (!ds.length) return openTime(null, { staffId: el.dataset.staff, date: el.dataset.date });
    openDrawer(`<div class="form"><header class="form__head"><div><span class="eyebrow eyebrow--sm">${fmtDate(el.dataset.date)}</span><h2>${esc(staffName(el.dataset.staff))}</h2></div><button type="button" class="x x--lg" data-act="close" aria-label="Close">×</button></header>
      <div class="form__body"><ul class="entries">${ds.map(t => { const j = find('jobs', t.jobId); return `<li data-act="time-edit" data-id="${t.id}" tabindex="0"><span><strong>${fmtTime(t.start)} – ${t.end ? fmtTime(t.end) : 'now'}</strong><small>${esc(j ? jobLabel(j) : 'No job')} · ${esc(t.costCode || 'no cost code')}${t.breakMin ? ` · ${t.breakMin} min break` : ''}${t.gps ? ' · location stamped' : ''}${t.injury ? ' · injury reported' : ''}</small></span><span>${fmtHours(t.end ? t.hours : hoursOf(t))} ${badge(t.status)}</span></li>`; }).join('')}</ul></div>
      <footer class="form__foot"><div class="form__actions"></div>${btn('Add entry', 'ts-add', { kind: 'ghost', attrs: `data-staff="${el.dataset.staff}" data-date="${el.dataset.date}"` })}<button type="button" class="btn btn--yellow" data-act="close">Done</button></footer></div>`, { onClose: null });
  },
  'ts-add'(el) { closeDrawer(); openTime(null, { staffId: el.dataset.staff, date: el.dataset.date }); },
  async 'ts-approve'(el) { await setWeek(el.dataset.week, el.dataset.staff, 'approved'); },
  async 'ts-approve-all'(el) { await setWeek(el.dataset.week, '', 'approved'); },
  async 'ts-unlock'(el) { if (!confirmTwice(el, 'Unlock?')) return; await setWeek(el.dataset.week, el.dataset.staff, 'submitted', true); },
  async 'ts-qbo'(el) {
    const ids = weekEntries(el.dataset.week).filter(t => t.status === 'approved' && !t.qbo).map(t => t.id);
    el.disabled = true;
    try { const r = await api('qbo/push', { method: 'POST', body: { kind: 'time', ids } }); toast(`${r.done.length} sent to QuickBooks${r.errors.length ? ` — ${r.errors[0].error}` : ''}.`, r.errors.length ? 'bad' : ''); }
    catch (e) { toast(e.message, 'bad'); }
    el.disabled = false;
  },
  'ts-csv'(el) {
    const rows = weekEntries(el.dataset.week).sort((a, b) => (staffName(a.staffId) + a.date).localeCompare(staffName(b.staffId) + b.date));
    download(`timesheets-${el.dataset.week}.csv`, csv([['Employee', 'Date', 'Job', 'Customer', 'Cost code', 'Start', 'End', 'Break (min)', 'Hours', 'Status'],
      ...rows.map(t => { const j = find('jobs', t.jobId); return [staffName(t.staffId), t.date, j ? jobLabel(j) : '', j ? custName(j.customerId) : '', t.costCode, fmtTime(t.start), t.end ? fmtTime(t.end) : '', t.breakMin, t.end ? t.hours : '', t.status]; })]));
  },
});
async function setWeek(wk, staffId, status, unlock) {
  const list = weekEntries(wk, staffId).filter(t => t.end && (unlock ? t.status === 'approved' : t.status !== 'approved'));
  for (const t of list) await put('time', { ...t, status, approvedBy: status === 'approved' ? (S.user ? S.user.name : 'Office') : '' });
  ui.rerender(); toast(unlock ? 'Week unlocked.' : `${list.length} entr${list.length === 1 ? 'y' : 'ies'} approved and locked.`);
}

/* ---------------------------------------------------------------- daily reports */
function reports() {
  const rows = db.logs.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const flags = g => [g.injury && '<span class="badge badge--red">Injury</span>', g.delay && '<span class="badge badge--yellow">Delay</span>', g.extraWork && '<span class="badge badge--blue">Extra work</span>', g.visitor && '<span class="badge badge--gray">Visitor</span>'].filter(Boolean).join(' ');
  return page('reports', hero({
    eyebrow: 'Crew & time', title: 'Daily reports',
    sub: 'Two minutes at the end of the day: hours, tons, quantities and anything that went wrong. Feeds job costing.',
    actions: can.write('logs') ? btn('New daily report', 'log-new', { ic: 'plus' }) : '',
  }), `<div class="toolbar">${searchBox()}</div>` + table([
    { l: 'Date', v: g => fmtDate(g.date) },
    { l: 'Job', v: g => esc(jobLabel(find('jobs', g.jobId))) },
    { l: 'Crew', v: g => `${crewDot(g.crewId)} ${esc(crewName(g.crewId))}` },
    { l: 'Hours', r: true, v: g => fix(g.manHours, 1) },
    { l: 'Material', v: g => [num(g.hmaTons) && `${fix(g.hmaTons)} t HMA`, num(g.concreteCY) && `${fix(g.concreteCY)} CY`, num(g.baseTons) && `${fix(g.baseTons)} t base`].filter(Boolean).join(' · ') || '<span class="muted">—</span>' },
    { l: 'Done', v: g => num(g.qtyDone) ? `${fix(g.qtyDone, 0)} ${esc(g.qtyUnit || '')}` : '' },
    { l: 'Flags', v: flags },
    { l: 'Signed', v: g => g.signedBy ? `${icon('check')} ${esc(g.signedBy)}` : '<span class="badge badge--yellow">Not signed</span>' },
  ], rows, { onRow: g => `data-act="log-edit" data-id="${g.id}"`, emptyText: 'No daily reports yet.' }));
}
const searchBox = () => `<input class="search" type="search" placeholder="Search reports…" data-on-input="search" data-key="reports" aria-label="Search">`;
const YESNO = [['injury', 'Was anyone hurt?'], ['delay', 'Any delays (weather, plant, trucks, inspector)?'], ['visitor', 'Inspector or visitor on site?'], ['extraWork', 'Customer asked for extra work? (change order)']];
export function openLog(id, preset = {}) {
  const me = find('staff', myStaffId());
  const g = id ? find('logs', id) : (() => {
    const crewId = preset.crewId || (me && me.crewId) || '';
    const job = preset.jobId ? find('jobs', preset.jobId) : crewId && todaysJob(crewId);
    return { date: today(), jobId: job ? job.id : '', crewId: job ? job.crewId : crewId, foremanId: me ? me.id : '', equipment: [], ...preset };
  })();
  const job = find('jobs', g.jobId);
  const w = !id && g.date === today() && wxFor(today());
  if (!id && w) g.weather = `${w.short || ''}, ${w.high ?? w.low}°F`;
  const clockH = (jobId, date) => db.time.filter(t => t.jobId === jobId && t.date === date).reduce((s, t) => s + (t.end ? num(t.hours) : hoursOf(t)), 0);
  const clockPeople = (jobId, date) => new Set(db.time.filter(t => t.jobId === jobId && t.date === date).map(t => t.staffId)).size;
  if (!id && g.jobId) { g.manHours = round(clockH(g.jobId, g.date), 1); g.crewCount = clockPeople(g.jobId, g.date); }
  const eq = db.equipment.filter(q => q.crewId === g.crewId || (g.equipment || []).some(x => x.id === q.id));
  const eqHtml = () => eq.length ? `<div class="eq-hours">${eq.map(q => { const used = (g.equipment || []).find(x => x.id === q.id); return `<label><input type="checkbox" name="eq_${q.id}"${used ? ' checked' : ''}> ${esc(q.unit)} ${esc(q.name)}<input type="number" step="0.5" min="0" name="eqh_${q.id}" value="${used ? esc(used.hours) : ''}" placeholder="hrs" aria-label="Hours for ${esc(q.name)}"></label>`; }).join('')}</div>` : '<p class="muted small">No equipment assigned to this crew.</p>';
  const fields = [
    f('date', 'Date', 'date', { req: true }), f('jobId', 'Job', 'select', { o: () => db.jobs.filter(j => j.status !== 'Complete' || j.id === g.jobId).map(j => [j.id, jobLabel(j)]), req: true }),
    f('crewId', 'Crew', 'select', { o: () => db.settings.crews.map(c => [c.id, c.name]) }), f('foremanId', 'Foreman', 'select', { o: () => db.staff.map(s => [s.id, s.name]) }),
    f('weather', 'Weather', 'text', { help: WX.days ? 'Filled from the forecast — fix it if it was different on site.' : '' }),
    f('crewCount', 'Crew on site', 'number'), f('manHours', 'Man-hours', 'number', { help: g.jobId ? `Time clock shows ${fix(clockH(g.jobId, g.date), 1)} h for this job today.` : '' }),
    f('hmaTons', 'Hot-mix placed (tons)', 'number', { help: job && job.budget ? `Estimate: ${fix(job.budget.hmaTons, 0)} t total` : '' }), f('baseTons', 'Base rock (tons)', 'number'),
    f('concreteCY', 'Concrete placed (CY)', 'number', { help: job && job.budget ? `Estimate: ${fix(job.budget.cy, 1)} CY total` : '' }), f('truckHours', 'Truck hours', 'number'),
    f('qtyDone', 'Quantity completed', 'number'), f('qtyUnit', 'Unit', 'select', { o: UNITS }), f('qtyDesc', 'What was completed', 'text', { wide: true, ph: 'e.g. Paved north half, 2" surface' }),
    f('pct', 'Job % complete after today', 'number', { help: job ? `Was ${num(job.pct)}%` : '' }),
    f('equipment', 'Equipment used (hours)', 'html', { wide: true, html: eqHtml }),
    ...YESNO.map(([k, l]) => f(k, l, 'check', { wide: true })),
    f('notes', 'Notes — delays, issues, extra work details', 'textarea', { wide: true }),
    f('signedBy', 'Foreman signature (type your name)', 'text', { wide: true, help: 'Signing submits the report.' }),
  ];
  formDrawer({ eyebrow: 'Daily report', title: id ? `${esc(job ? job.name : 'Report')} · ${fmtDate(g.date)}` : 'New daily report', fields, rec: { ...g, pct: job ? num(job.pct) : '' }, submit: 'log-save', id, wide: true, del: id && can.write('logs') ? 'log-del' : '', footer: id ? btn('Print', 'log-print', { kind: 'ghost', size: 'sm', ic: 'print' }) : '', saveLabel: 'Save report' });
  ui.logFields = fields;
}
act({
  'log-new'(el) { openLog(null, el.dataset.job ? { jobId: el.dataset.job } : {}); },
  'log-edit'(el) { openLog(el.dataset.id); },
  async 'log-del'(el) { if (!confirmTwice(el, 'Click again to delete')) return; await del('logs', el.closest('form').dataset.id); closeDrawer(); ui.rerender(); toast('Report deleted.'); },
  'log-print'(el) { printLog(find('logs', el.closest('form').dataset.id)); },
});
onSubmit({
  async 'log-save'(form) {
    const fields = ui.logFields; if (!validate(form, fields)) return;
    const v = collect(form, fields), prev = form.dataset.id ? find('logs', form.dataset.id) : null;
    const equipment = db.equipment.filter(q => form.elements['eq_' + q.id] && form.elements['eq_' + q.id].checked).map(q => ({ id: q.id, hours: num(form.elements['eqh_' + q.id].value) }));
    const rec = { ...(prev || { id: uid() }), ...v, equipment, signedAt: v.signedBy && !(prev && prev.signedBy) ? new Date().toISOString() : (prev && prev.signedAt) || '' };
    // Equipment hour meters move forward by the change in hours on this report.
    for (const u of equipment) {
      const before = ((prev && prev.equipment) || []).find(x => x.id === u.id), delta = num(u.hours) - num(before && before.hours);
      const q = find('equipment', u.id); if (q && delta && can.write('equipment')) await put('equipment', { ...q, hours: round(num(q.hours) + delta, 1) });
    }
    await put('logs', rec);
    // In server mode the server moves the job's % complete from the report; locally we do it here.
    const job = find('jobs', rec.jobId);
    if (S.mode === 'local' && job && v.pct !== '' && num(v.pct) !== num(job.pct)) await put('jobs', { ...job, pct: Math.max(0, Math.min(100, num(v.pct))), status: job.status === 'Scheduled' ? 'In progress' : job.status });
    if (S.mode === 'server') await import('../store.js').then(m => m.pull());
    closeDrawer(); ui.rerender(); toast(rec.signedBy ? 'Report signed and saved.' : 'Report saved — sign it when the day is done.');
  },
});
// Picking a job on a new report reloads it with that job's crew, equipment and clocked hours.
document.addEventListener('change', e => {
  const form = e.target.closest('form[data-submit="log-save"]');
  if (!form || form.dataset.id || !['jobId', 'date'].includes(e.target.name) || !form.elements.jobId.value) return;
  const job = find('jobs', form.elements.jobId.value);
  openLog(null, { jobId: job.id, crewId: job.crewId, date: form.elements.date.value || today() });
});
function printLog(g) {
  const job = find('jobs', g.jobId), co = db.settings.company;
  printHtml(`<article class="pr">
    <header class="pr__head"><img src="img/logo-horizontal.jpg" alt="Max Paving"><div class="pr__co">${esc(co.address)}<br>${esc(co.phone)}</div></header>
    <h1>Daily report · ${fmtDate(g.date)}</h1>
    <div class="pr__meta"><div><small>Job</small><strong>${esc(jobLabel(job))}</strong><br>${esc(job ? custName(job.customerId) : '')}</div><div><small>Crew</small><strong>${esc(crewName(g.crewId))}</strong><br>Foreman: ${esc(staffName(g.foremanId))}</div><div><small>Weather</small><strong>${esc(g.weather || '—')}</strong></div></div>
    <table class="pr__table"><tbody>
      <tr><td>Crew on site / man-hours</td><td class="r">${fix(g.crewCount, 0)} people · ${fix(g.manHours, 1)} h</td></tr>
      <tr><td>Hot-mix / base / concrete</td><td class="r">${fix(g.hmaTons)} t · ${fix(g.baseTons)} t · ${fix(g.concreteCY)} CY</td></tr>
      <tr><td>Truck hours</td><td class="r">${fix(g.truckHours)}</td></tr>
      <tr><td>Completed</td><td class="r">${fix(g.qtyDone, 0)} ${esc(g.qtyUnit || '')} — ${esc(g.qtyDesc || '')}</td></tr>
      <tr><td>Equipment</td><td class="r">${(g.equipment || []).map(u => { const q = find('equipment', u.id); return q ? `${esc(q.unit)} ${fix(u.hours)} h` : ''; }).join(' · ') || '—'}</td></tr>
      ${YESNO.map(([k, l]) => `<tr><td>${l}</td><td class="r">${g[k] ? 'Yes' : 'No'}</td></tr>`).join('')}
    </tbody></table>
    ${g.notes ? `<h2>Notes</h2><p>${esc(g.notes)}</p>` : ''}
    <div class="pr__sign"><div>Foreman<span>${esc(g.signedBy || '')}</span></div><div>Date<span>${g.signedAt ? fmtDate(g.signedAt.slice(0, 10)) : ''}</span></div><div></div></div>
  </article>`);
}

/* ---------------------------------------------------------------- people */
function people() {
  const st = ui.filters.people || (ui.filters.people = { s: 'Active' });
  const rows = db.staff.filter(p => st.s === 'All' || (p.active || 'Active') === st.s).sort((a, b) => a.name.localeCompare(b.name));
  return page('people', hero({
    eyebrow: 'Crew & time', title: 'People',
    sub: 'Everyone on the team: crew, pay rate, and certifications with expiry dates. Expired CDLs and medical cards are flagged on the schedule.',
    actions: can.write('staff') ? btn('Add person', 'person-new', { ic: 'plus' }) : '',
  }), `<div class="toolbar"><input class="search" type="search" placeholder="Search people…" data-on-input="search" data-key="people" aria-label="Search people"><div class="chips">${['Active', 'Inactive', 'All'].map(s => `<button type="button" class="chip${s === st.s ? ' is-on' : ''}" data-act="filter" data-key="people" data-v="${s}">${s}</button>`).join('')}</div></div>` + table([
    { l: 'Name', v: p => `<span class="cell-person"><span class="avatar avatar--sm">${esc(initials(p.name))}</span><span><strong>${esc(p.name)}</strong><small class="muted block">${esc(p.title || '')}</small></span></span>`, text: p => p.name + ' ' + (p.title || '') },
    { l: 'Crew', v: p => p.crewId ? `${crewDot(p.crewId)} ${esc(crewName(p.crewId))}` : '<span class="muted">Office</span>' },
    { l: 'Phone', v: p => p.phone ? `<a href="tel:${esc(p.phone.replace(/[^\d+]/g, ''))}">${esc(p.phone)}</a>` : '' },
    { l: 'Certifications', v: p => (p.certs || []).map(c => { const s = expStatus(c.expires); return `<span class="badge badge--${s === 'Expired' ? 'red' : s === 'Expiring' ? 'yellow' : 'gray'}" title="${c.expires ? 'Expires ' + esc(c.expires) : 'No expiry'}">${esc(c.name)}</span>`; }).join(' ') },
    can.money() && { l: 'Rate', r: true, v: p => num(p.rate) ? money(p.rate, true) + '/h' : '' },
    { l: 'Status', v: p => badge(p.active || 'Active') },
  ].filter(Boolean), rows, { onRow: p => `data-act="person-edit" data-id="${p.id}"` }));
}
const PERSON_FIELDS = () => [
  f('name', 'Name', 'text', { req: true }), f('title', 'Job title'),
  f('crewId', 'Crew', 'select', { o: () => db.settings.crews.map(c => [c.id, c.name]), blank: 'Office / no crew' }), f('active', 'Status', 'select', { o: ['Active', 'Inactive'], noBlank: true }),
  f('phone', 'Phone', 'tel'), f('email', 'Email', 'email'),
  can.money() && f('rate', 'Hourly pay rate', 'money', { help: 'Used for job costing (plus burden from Settings).' }),
  f('hired', 'Hire date', 'date'), f('emergency', 'Emergency contact', 'text', { wide: true }),
  f('certs', 'Certifications & licenses', 'html', { wide: true, html: certsEditor }),
  f('notes', 'Notes', 'textarea', { wide: true }),
].filter(Boolean);
function certsEditor(list) {
  const row = c => `<div class="cert-row"><input list="cert-list" name="cert_name" value="${esc(c.name)}" placeholder="Certification" aria-label="Certification"><input name="cert_number" value="${esc(c.number || '')}" placeholder="Number" aria-label="Number"><input type="date" name="cert_expires" value="${esc(c.expires || '')}" aria-label="Expires"><button type="button" class="x" data-act="cert-del" aria-label="Remove">×</button></div>`;
  return `<div class="certs">${(Array.isArray(list) ? list : []).map(row).join('')}</div><datalist id="cert-list">${CERTS.map(c => `<option value="${esc(c)}">`).join('')}</datalist>${btn('Add certification', 'cert-add', { kind: 'ghost', size: 'sm', ic: 'plus' })}`;
}
act({
  'person-new': () => formDrawer({ eyebrow: 'People', title: 'Add person', fields: PERSON_FIELDS(), rec: { active: 'Active', certs: [] }, submit: 'person-save' }),
  'person-edit'(el) { const p = find('staff', el.dataset.id); formDrawer({ eyebrow: 'People', title: esc(p.name), fields: PERSON_FIELDS(), rec: p, submit: 'person-save', del: can.write('staff') ? 'person-del' : '' }); },
  'cert-add'(el) { $('.certs', el.closest('.field')).insertAdjacentHTML('beforeend', certsEditor([{ name: '' }]).match(/<div class="cert-row">[\s\S]*?<\/div>/)[0]); },
  'cert-del'(el) { el.closest('.cert-row').remove(); },
  async 'person-del'(el) { if (!confirmTwice(el, 'Click again to delete')) return; await del('staff', el.closest('form').dataset.id); closeDrawer(); ui.rerender(); toast('Person removed.'); },
});
onSubmit({
  async 'person-save'(form) {
    const fields = PERSON_FIELDS(); if (!validate(form, fields)) return;
    const v = collect(form, fields), prev = form.dataset.id ? find('staff', form.dataset.id) : null;
    const names = $$('[name=cert_name]', form), nums = $$('[name=cert_number]', form), exps = $$('[name=cert_expires]', form);
    v.certs = names.map((n, i) => ({ name: n.value.trim(), number: nums[i].value.trim(), expires: exps[i].value })).filter(c => c.name);
    await put('staff', { ...(prev || { id: uid() }), ...v }); closeDrawer(); ui.rerender(); toast(`${v.name} saved.`);
  },
});
