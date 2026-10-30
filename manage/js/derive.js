/* Derived business facts used across views (balances, statuses, alerts). */
import { num, today, addDays, addMonths, daysUntil, monday } from './core.js';
import { db } from './store.js';
import { priceEstimate, jobActuals, costStatus } from './calc.js';
import { stage, nextAction, isOpenJob, phaseOn, contract, budgetTotal, pendingCOs, earliest, locateStatus, walkedThrough } from './jobflow.js';

export const invBalance = i => num(i.amount) - num(i.paid);
export function invStatus(i) {
  if (num(i.amount) > 0 && invBalance(i) <= 0.005) return 'Paid';
  if (i.due && daysUntil(i.due) < 0) return 'Overdue';
  return num(i.paid) > 0 ? 'Partial' : 'Open';
}
export const invTotal = lines => (lines || []).reduce((t, l) => t + num(l.qty) * num(l.price), 0);
export function jobInvoiced(j) { return db.invoices.filter(i => i.jobId === j.id).reduce((t, i) => t + num(i.amount), 0); }
export const jobCollected = j => db.invoices.filter(i => i.jobId === j.id).reduce((t, i) => t + num(i.paid), 0);
export const jobDays = j => j.start ? Math.max(1, Math.round((new Date((j.end || j.start) + 'T00:00:00') - new Date(j.start + 'T00:00:00')) / 864e5) + 1) : 0;
export const onDay = (j, day) => (j.phases || []).some(p => p.status !== 'Done' && phaseOn(p, day));
/** The phase a crew works on a given day (and its job). */
export function phaseToday(crewId, day = today()) {
  for (const j of db.jobs.filter(isOpenJob)) { const p = (j.phases || []).find(x => x.crewId === crewId && x.status !== 'Done' && phaseOn(x, day)); if (p) return { j, p }; }
  return null;
}
export const estTotals = e => priceEstimate(e, db.settings);

export const expStatus = s => !s ? 'Current' : daysUntil(s) < 0 ? 'Expired' : daysUntil(s) <= 60 ? 'Expiring' : 'Current';
export const eqStatus = q => q.status !== 'Down for repair' && ((q.serviceDue && daysUntil(q.serviceDue) <= 7) || (num(q.serviceHours) > 0 && num(q.hours) >= num(q.serviceHours))) ? 'Service due' : q.status;
export const warrantyOf = j => j.completed ? addMonths(j.completed, num(db.settings.warrantyMonths) || 12) : '';
export const warrantyStatus = j => { const w = warrantyOf(j); return !w ? '' : daysUntil(w) < 0 ? 'Expired' : daysUntil(w) <= 60 ? 'Expiring' : 'Active'; };
export const followDue = p => !!p.nextFollowUp && daysUntil(p.nextFollowUp) <= 0 && !['Converted', 'Not interested'].includes(p.status);
export const hasPin = p => p.lat !== '' && p.lat != null && p.lng !== '' && p.lng != null && isFinite(p.lat) && isFinite(p.lng);

export const staffCerts = s => (s.certs || []).filter(c => c.expires);
export const certAlerts = s => staffCerts(s).filter(c => daysUntil(c.expires) <= 60);
export const hasExpiredDriving = s => (s.certs || []).some(c => /CDL|DOT/.test(c.name) && c.expires && daysUntil(c.expires) < 0);

export const openEntries = () => db.time.filter(t => !t.end);
export const isClockedIn = staffId => db.time.find(t => t.staffId === staffId && !t.end);
export const crewMembers = crewId => db.staff.filter(s => s.crewId === crewId && s.active !== 'Inactive');
export const jobToday = crewId => (phaseToday(crewId) || {}).j;
export const jobStatusCost = j => j.budget ? costStatus(jobActuals(j, db, db.settings), { ...j.budget, total: budgetTotal(j) }, j.pct) : null;

/** Every item that needs someone's attention, most urgent first. [sortKey, tone, title, sub, href] */
export function attention() {
  const out = [], t = today(), s = db.settings;
  const push = (k, tone, title, sub, href) => out.push({ k, tone, title, sub, href });
  db.leads.filter(l => l.status === 'New').forEach(l => push(-50, 'blue', `Call back ${l.name}${l.company ? ' · ' + l.company : ''}`, `New ${l.source === 'Website form' ? 'website ' : ''}lead · ${l.service || 'service not set'}`, `#sales/leads?open=${l.id}`));
  db.leads.filter(l => l.siteVisit && ['New', 'Contacted', 'Site visit'].includes(l.status) && daysUntil(l.siteVisit) >= -1 && daysUntil(l.siteVisit) <= 7).forEach(l => push(daysUntil(l.siteVisit), 'blue', `Site visit: ${l.company || l.name}`, `${l.siteVisit === t ? 'Today' : l.siteVisit} · ${l.assignedTo || 'no estimator yet'}`, `#sales/leads?open=${l.id}`));
  db.estimates.filter(e => e.status === 'Sent' && daysUntil(e.sentOn || e.date) <= -num(s.followUpDays || 7)).forEach(e => push(-20, 'yellow', `Follow up on ${e.number}`, `${e.title} · sent ${-daysUntil(e.sentOn || e.date)} days ago, no answer`, `#estimates/${e.id}`));
  db.estimates.filter(e => e.status === 'Accepted' && !db.jobs.some(j => j.estimateId === e.id)).forEach(e => push(-30, 'green', `Turn ${e.number} into a job`, `${e.title} was accepted`, `#estimates/${e.id}`));
  // Jobs: one line per job when its next action is urgent, plus the specific slips the research flagged.
  const open = db.jobs.filter(isOpenJob);
  const tray = open.flatMap(j => (j.phases || []).filter(p => p.status !== 'Done' && !p.start));
  if (tray.length) push(-25, 'yellow', `${tray.length} sold phase${tray.length === 1 ? '' : 's'} waiting for a date`, 'Place them on the schedule', '#schedule');
  open.forEach(j => {
    const n = nextAction(j);
    if (n.tone === 'red') push(-38, 'red', `${j.number}: ${n.text}`, j.name, `#jobs/${j.id}/phases`);
    const loc = locateStatus(j);
    if (loc.need && !(j.locate && j.locate.called) && n.tone !== 'red') push(-22, 'yellow', `Call 811 for ${j.name}`, `${j.locate && j.locate.state === 'KS' ? 'Kansas: 2 full working days' : 'Missouri: 2–10 working days'} before digging`, `#jobs/${j.id}`);
    (j.phases || []).filter(p => p.order && p.order.moved && p.status !== 'Done').forEach(p => push(-36, 'red', `Call ${p.order.supplier || 'the supplier'}: ${j.number} moved`, `${p.name} is now ${p.order.moved} — re-confirm the order`, '#schedule/tomorrow'));
    (j.phases || []).filter(p => p.type === 'Striping' && !p.start && p.status !== 'Done').forEach(p => { const e = earliest(j, p); if (e && daysUntil(e) <= 7) push(-18, 'yellow', `Schedule striping for ${j.name}`, `Pavement is ready ${e <= t ? 'now' : 'on ' + e}`, `#jobs/${j.id}/phases`); });
    pendingCOs(j).filter(c => !num(c.amount)).forEach(c => push(-27, 'yellow', `Price ${c.number} on ${j.name}`, c.desc, `#jobs/${j.id}/changes`));
    if (stage(j) === 'Punch & walkthrough' && walkedThrough(j) && jobInvoiced(j) < contract(j) - 1) push(-28, 'yellow', `Send the final invoice for ${j.name}`, `${Math.round((1 - jobInvoiced(j) / Math.max(1, contract(j))) * 100)}% not billed yet`, `#jobs/${j.id}/billing`);
  });
  const tomorrowOrders = open.flatMap(j => (j.phases || []).filter(p => p.order && p.start === addDays(t, 1) && !['Confirmed', 'Delivered', 'Cancelled'].includes(p.order.status)));
  if (tomorrowOrders.length) push(-34, 'red', `${tomorrowOrders.length} material order${tomorrowOrders.length === 1 ? '' : 's'} for tomorrow not confirmed`, 'Call the plants before their cutoff', '#schedule/tomorrow');
  const submitted = db.time.filter(x => x.status === 'submitted').length;
  if (submitted) push(-26, 'blue', `Approve ${submitted} time entr${submitted === 1 ? 'y' : 'ies'}`, 'Submitted by foremen this week', '#crew/timesheets');
  db.time.filter(x => !x.end && x.date < t).forEach(x => push(-40, 'red', `${(db.staff.find(p => p.id === x.staffId) || {}).name || 'Someone'} is still clocked in from ${x.date}`, 'Forgot to clock out — fix the time', '#crew/timesheets'));
  open.filter(j => stage(j) === 'In progress').forEach(j => {
    const st = jobStatusCost(j); if (st && st.label === 'At risk') push(-35, 'red', `${j.name} is running over budget`, `Projected ${Math.round(st.ratio * 100)}% of estimated cost`, `#jobs/${j.id}/costs`);
  });
  const yesterday = addDays(t, -1);
  if (![0, 6].includes(new Date(yesterday + 'T00:00:00').getDay())) open.forEach(j => {
    if ((j.phases || []).some(p => p.crewId && phaseOn(p, yesterday)) && !db.logs.some(g => g.jobId === j.id && g.date === yesterday)) push(-15, 'yellow', `No daily report for ${j.name} yesterday`, 'Ask the foreman to file it', `#crew/reports`);
  });
  db.invoices.filter(i => invStatus(i) === 'Overdue').forEach(i => push(daysUntil(i.due), 'red', `Collect ${Math.round(invBalance(i)).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} · ${(db.customers.find(c => c.id === i.customerId) || {}).name || ''}`, `${i.number} overdue since ${i.due}`, `#billing/invoices?open=${i.id}`));
  db.docs.filter(d => expStatus(d.expires) !== 'Current').forEach(d => push(daysUntil(d.expires), daysUntil(d.expires) < 0 ? 'red' : 'yellow', `Renew: ${d.name}`, `${daysUntil(d.expires) < 0 ? 'Expired' : 'Expires'} ${d.expires}`, '#office/compliance'));
  db.staff.filter(p => p.active !== 'Inactive').forEach(p => certAlerts(p).forEach(c => push(daysUntil(c.expires), daysUntil(c.expires) < 0 ? 'red' : 'yellow', `${p.name}: ${c.name}`, `${daysUntil(c.expires) < 0 ? 'Expired' : 'Expires'} ${c.expires}`, '#crew/people')));
  db.equipment.filter(q => ['Service due', 'Down for repair'].includes(eqStatus(q))).forEach(q => push(q.status === 'Down for repair' ? -45 : daysUntil(q.serviceDue || t), q.status === 'Down for repair' ? 'red' : 'yellow', q.status === 'Down for repair' ? `${q.unit} ${q.name} is down` : `Service ${q.unit} ${q.name}`, q.status === 'Down for repair' ? (q.notes || 'Down for repair') : `Due ${q.serviceDue || ''}`, '#office/equipment'));
  db.prospects.filter(followDue).forEach(p => push(daysUntil(p.nextFollowUp), 'blue', `Follow up: ${p.company}`, `${p.contactName || 'Prospect'}${p.phone ? ' · ' + p.phone : ''}`, `#sales/prospects?open=${p.id}`));
  db.jobs.filter(j => warrantyStatus(j) === 'Expiring').forEach(j => push(daysUntil(warrantyOf(j)), 'green', `Warranty check-in: ${j.name}`, `Warranty ends ${warrantyOf(j)}`, '#office/warranties'));
  return out.sort((a, b) => a.k - b.k);
}
export { monday };
