/* Job flow: stages, phases, readiness gates, 811 tickets, change orders, closeout.
   Pure helpers over a job record + db. Views change jobs only through put(). */
import { num, round, uid, today, addDays, daysUntil, parse, iso, fmtDate, shortDate, weekday } from './core.js';
import { db } from './store.js';

/* ---------------------------------------------------------------- stages */
export const STAGES = ['Sold', 'Getting ready', 'Scheduled', 'In progress', 'Punch & walkthrough', 'Invoiced', 'Closed'];
export const PHASE_TYPES = ['Excavation & grading', 'Base', 'Milling', 'Asphalt paving', 'Patching', 'Concrete flatwork', 'Curb & gutter', 'Striping', 'Sealcoat', 'Punch work', 'Other'];
const DIG_TYPES = ['Excavation & grading', 'Base', 'Milling', 'Patching', 'Concrete flatwork', 'Curb & gutter'];
const ORDER_TYPES = { 'Asphalt paving': 'asphalt', Patching: 'asphalt', Base: 'rock', 'Concrete flatwork': 'concrete', 'Curb & gutter': 'concrete' };
export const phaseDigs = p => DIG_TYPES.includes(p.type);
export const phaseOrderKind = p => ORDER_TYPES[p.type] || '';
export const isOpenJob = j => !['On hold', 'Cancelled'].includes(j.status) && !(j.closeout && j.closeout.closedOn);

/** Approved change orders add to the contract and the budget. */
export const approvedCOs = j => (j.changes || []).filter(c => c.status === 'Approved');
export const pendingCOs = j => (j.changes || []).filter(c => c.status === 'Pending');
export const contract = j => num(j.value) + approvedCOs(j).reduce((t, c) => t + num(c.amount), 0);
export const budgetTotal = j => num(j.budget && j.budget.total) + approvedCOs(j).reduce((t, c) => t + num(c.cost), 0);

const invoiced = j => db.invoices.filter(i => i.jobId === j.id).reduce((t, i) => t + num(i.amount), 0);
const paid = j => db.invoices.filter(i => i.jobId === j.id).reduce((t, i) => t + num(i.paid), 0);
export const phasesDone = j => (j.phases || []).length > 0 && j.phases.every(p => p.status === 'Done');
const started = j => (j.phases || []).some(p => p.status === 'Done' || (p.start && p.start <= today())) || db.time.some(t => t.jobId === j.id) || db.logs.some(g => g.jobId === j.id);

export function stage(j) {
  if (j.status === 'Cancelled') return 'Cancelled';
  if (j.status === 'On hold') return 'On hold';
  if (j.closeout && j.closeout.closedOn) return 'Closed';
  const c = contract(j);
  if (phasesDone(j) && walkedThrough(j) && c > 0 && invoiced(j) >= c - 1) return 'Invoiced';
  if (phasesDone(j)) return 'Punch & walkthrough';
  if (started(j)) return 'In progress';
  const ph = j.phases || [];
  if (ph.length && ph.every(p => p.status === 'Done' || (p.start && p.crewId)) && ph.every(p => p.status === 'Done' || gate(j, p).ready)) return 'Scheduled';
  return soldMissing(j).length ? 'Sold' : 'Getting ready';
}
export const stageIndex = s => STAGES.indexOf(s);
export const walkedThrough = j => !!(j.closeout && j.closeout.walkthroughOn) && !(j.punch || []).some(x => x.status !== 'Verified');

/** What must be known about a sold job before it can be planned. */
export function soldMissing(j) {
  const out = [];
  if (!num(j.value)) out.push('contract value');
  if (!j.address) out.push('site address');
  if (!(j.site && (j.site.contact || j.site.phone))) out.push('on-site contact');
  return out;
}

/* ---------------------------------------------------------------- phases */
export function syncSummary(j) {
  // Keep the job-level dates/crew in step with its phases (used by lists, home and the clock).
  const ph = (j.phases || []).filter(p => p.start);
  j.start = ph.length ? ph.map(p => p.start).sort()[0] : '';
  j.end = ph.length ? ph.map(p => p.end || p.start).sort().pop() : '';
  const next = (j.phases || []).filter(p => p.status !== 'Done' && p.crewId).sort((a, b) => (a.start || '9999').localeCompare(b.start || '9999'))[0];
  j.crewId = next ? next.crewId : (j.phases || []).map(p => p.crewId).filter(Boolean).pop() || j.crewId || '';
  return j;
}
export const phaseOn = (p, day) => p.start && p.start <= day && (p.end || p.start) >= day;
export const phaseDays = p => p.start ? Math.round((parse(p.end || p.start) - parse(p.start)) / 864e5) + 1 : num(p.days) || 1;
export const phaseLabel = (j, p) => `${j.number} · ${p.name || p.type}`;

/** Default phases for a new job, built from the estimate's lines (one per kind of work). */
export function phasesFromEstimate(est, priced, s) {
  const byType = {};
  const crewFor = cat => (s.crews.find(c => c.cat === cat) || {}).id || '';
  for (const l of priced) {
    const a = l.line && l.line.kind === 'assembly' ? s.assemblies.find(x => x.id === l.line.assemblyId) : null;
    const id = a ? a.id : l.line && l.line.itemId;
    let type = null;
    if (/overlay|mill/i.test(id || l.desc)) type = 'Asphalt paving';
    else if (/patch/i.test(id || l.desc)) type = 'Patching';
    else if (/^a-/.test(id || '')) type = 'Asphalt paving';
    else if (/curb/i.test(id || l.desc)) type = 'Curb & gutter';
    else if (/^c-/.test(id || '')) type = 'Concrete flatwork';
    else if (/^x-/.test(id || '')) type = 'Excavation & grading';
    else if (/strip|stall/i.test(id || l.desc)) type = 'Striping';
    if (!type) continue;
    const ph = byType[type] || (byType[type] = { id: uid(), type, name: type, crewId: type === 'Striping' ? '' : crewFor(l.cat), start: '', end: '', days: 0, qty: 0, unit: l.unit, tons: 0, cy: 0, status: 'Planned', notes: [] });
    ph.days += num(l.days); ph.tons += num(l.hmaTons) + num(l.baseTons); ph.cy += num(l.cy);
    if (ph.unit === l.unit) ph.qty += num(l.qty);
    ph.notes.push(`${l.desc}: ${round(l.qty, 0)} ${l.unit}`);
  }
  // Mill & overlay is two days of work: a milling phase ahead of the paving phase (milling also needs 811).
  const pave = byType['Asphalt paving'];
  const mills = priced.some(l => l.line && l.line.kind === 'assembly' && ((s.assemblies.find(x => x.id === l.line.assemblyId) || {}).parts || []).some(p => p.item === 'mill'));
  if (pave && mills && !byType.Milling) byType.Milling = { id: uid(), type: 'Milling', name: 'Milling', crewId: pave.crewId, start: '', end: '', days: Math.max(1, Math.ceil(pave.days / 2)), qty: pave.qty, unit: pave.unit, tons: 0, cy: 0, status: 'Planned', notes: ['Mill ahead of paving; haul millings off'] };
  const order = ['Excavation & grading', 'Base', 'Milling', 'Patching', 'Concrete flatwork', 'Curb & gutter', 'Asphalt paving', 'Striping'];
  return Object.values(byType).sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type)).map(p => ({
    ...p, days: Math.max(1, Math.ceil(p.days || 1)), qty: round(p.qty, 0), tons: round(p.tons, 0), cy: round(p.cy, 1), notes: p.notes.join('\n'),
    order: phaseOrderKind(p) ? { kind: phaseOrderKind(p), supplier: '', product: '', qty: phaseOrderKind(p) === 'concrete' ? round(p.cy * 1.05, 1) : round(p.tons, 0), unit: phaseOrderKind(p) === 'concrete' ? 'CY' : 'TON', time: '07:00', status: 'Not ordered' } : null,
  }));
}
/** Migrate a job with no phases (older data) into one phase. */
export function ensurePhases(j) {
  if (Array.isArray(j.phases)) return j;
  const type = { Asphalt: 'Asphalt paving', Concrete: 'Concrete flatwork', Excavation: 'Excavation & grading' }[j.type] || 'Other';
  j.phases = [{ id: uid(), type, name: type, crewId: j.crewId || '', start: j.start || '', end: j.end || j.start || '', days: 1, qty: '', unit: '', status: j.status === 'Complete' ? 'Done' : 'Planned', notes: '', order: null }];
  j._migrated = true; // saved back once so everyone shares the same phase ids
  return j;
}

/* ---------------------------------------------------------------- 811 locate tickets */
// Working days skip weekends and federal holidays. Rules (verify on each ticket):
//   MO (RSMo 319.026): notice at least 2 and at most 10 working days before digging.
//   KS (K.S.A. 66-1804): 2 full working days (call day doesn't count), at most 20 calendar days ahead; valid 20 days after the start date.
export function holidays(year) {
  const nth = (m, wd, n) => { const d = new Date(year, m, 1); let c = 0; while (true) { if (d.getDay() === wd && ++c === n) return iso(d); d.setDate(d.getDate() + 1); } };
  const last = (m, wd) => { const d = new Date(year, m + 1, 0); while (d.getDay() !== wd) d.setDate(d.getDate() - 1); return iso(d); };
  const obs = (m, day) => { const d = new Date(year, m, day); if (d.getDay() === 6) d.setDate(day - 1); if (d.getDay() === 0) d.setDate(day + 1); return iso(d); };
  return [obs(0, 1), nth(0, 1, 3), nth(1, 1, 3), last(4, 1), obs(5, 19), obs(6, 4), nth(8, 1, 1), nth(10, 4, 4), obs(11, 25)];
}
export const isWorkday = s => { const d = parse(s).getDay(); return d !== 0 && d !== 6 && !holidays(parse(s).getFullYear()).includes(s); };
export function addWorkdays(s, n) { let d = s, k = 0; while (k < n) { d = addDays(d, 1); if (isWorkday(d)) k++; } return d; }
export function locateDates(t) {
  if (!t || !t.called) return null;
  const ks = t.state === 'KS';
  const digReady = ks ? addWorkdays(t.called, 3) : addWorkdays(t.called, num(db.settings.mo811Days) || 2); // KS: two FULL working days after the call day
  const startBy = ks ? addDays(t.called, 20) : addWorkdays(t.called, 10);
  return { digReady, startBy, validDays: ks ? 20 : 21 };
}
export function locateStatus(j) {
  const digs = (j.phases || []).filter(p => phaseDigs(p) && p.status !== 'Done');
  if (!digs.length) return { need: false };
  const t = j.locate || {};
  if (!t.called) return { need: true, ok: false, label: '811 not called', tone: 'red' };
  const d = locateDates(t);
  const first = digs.map(p => p.start).filter(Boolean).sort()[0];
  const lastEnd = digs.map(p => p.end || p.start).filter(Boolean).sort().pop();
  if (first && first < d.digReady) return { need: true, ok: false, label: `Too early — 811 clears ${shortDate(d.digReady)}`, tone: 'red', ...d };
  if (first && first > d.startBy) return { need: true, ok: false, label: `Ticket too old for ${shortDate(first)} — re-call 811`, tone: 'red', ...d };
  if (first && lastEnd && daysUntil(lastEnd) - daysUntil(first) > d.validDays) return { need: true, ok: false, label: `Work runs past the ticket's life — re-call 811`, tone: 'yellow', ...d };
  if (!t.ticket) return { need: true, ok: false, label: 'Add the 811 ticket number', tone: 'yellow', ...d };
  return { need: true, ok: true, label: daysUntil(d.digReady) > 0 ? `811 clears ${shortDate(d.digReady)}` : `811 clear · #${t.ticket}`, tone: 'green', ...d };
}

/* ---------------------------------------------------------------- readiness gate (soft) */
/** Checklist a phase must pass before its day. Returns { items: [{label, ok, na, why}], ready, open }. */
export function gate(j, p) {
  const items = [];
  if (phaseDigs(p)) { const l = locateStatus(j); items.push({ key: 'locate', label: '811 locate', ok: l.ok, why: l.label }); }
  const pm = j.permit || {};
  if (pm.needed !== 'no') items.push({ key: 'permit', label: 'Permit / right-of-way', ok: pm.needed === 'yes' ? !!pm.number : false, na: false, why: pm.needed === 'yes' ? (pm.number ? `#${pm.number}` : 'Permit number missing') : 'Needed? Mark yes or no on the job' });
  if (p.order) items.push({ key: 'order', label: p.order.kind === 'concrete' ? 'Concrete ordered' : p.order.kind === 'rock' ? 'Base rock ordered' : 'Hot-mix ordered', ok: ['Placed', 'Confirmed', 'Delivered'].includes(p.order.status), why: p.order.status });
  if (p.type === 'Striping') items.push({ key: 'sub', label: 'Striping sub confirmed', ok: !!p.subConfirmed, why: p.subConfirmed ? 'Confirmed' : 'Not confirmed' });
  items.push({ key: 'notified', label: 'Customer told the date & access', ok: !!p.notifiedOn, why: p.notifiedOn ? `Told ${shortDate(p.notifiedOn)}` : 'Not yet' });
  const open = items.filter(i => !i.ok && !i.na);
  return { items, open, ready: open.length === 0 };
}
/** Earliest sensible date (e.g., striping waits 14 days after the surface is paved). */
export function earliest(j, p) {
  if (p.type !== 'Striping') return '';
  const pave = (j.phases || []).filter(x => x.type === 'Asphalt paving' && (x.end || x.start)).map(x => x.end || x.start).sort().pop();
  return pave ? addDays(pave, num(db.settings.stripeWaitDays) || 14) : '';
}

/* ---------------------------------------------------------------- next action (one per job) */
export function nextAction(j) {
  const st = stage(j);
  if (st === 'Sold') return { text: `Add ${soldMissing(j).join(', ')}`, tone: 'yellow' };
  if (['Getting ready', 'Scheduled'].includes(st) || st === 'In progress') {
    const ph = (j.phases || []).filter(p => p.status !== 'Done').sort((a, b) => (a.start || '9999').localeCompare(b.start || '9999'));
    const unsched = ph.find(p => !p.start || !p.crewId);
    const soon = ph.find(p => p.start && !gate(j, p).ready);
    if (soon) { const g = gate(j, soon); return { text: `${soon.name} needs: ${g.open.map(i => i.key === 'locate' ? i.why : i.label.toLowerCase()).join(', ')}`, tone: daysUntil(soon.start) <= 5 ? 'red' : 'yellow' }; }
    if (unsched) { const e = earliest(j, unsched); return { text: `Schedule ${unsched.name}${e ? ` (not before ${shortDate(e)})` : ''}`, tone: 'yellow' }; }
    const next = ph.find(p => p.start);
    if (next) return { text: `${next.name} ${next.start === today() ? 'today' : weekday(next.start) + ' ' + shortDate(next.start)}`, tone: 'blue' };
  }
  if (st === 'Punch & walkthrough') {
    const openPunch = (j.punch || []).filter(x => x.status !== 'Verified').length;
    if (openPunch) return { text: `${openPunch} punch item${openPunch === 1 ? '' : 's'} open`, tone: 'yellow' };
    if (!(j.closeout && j.closeout.walkthroughOn)) return { text: 'Final walkthrough with the customer', tone: 'yellow' };
    if (pendingCOs(j).length) return { text: 'Settle pending change orders before the final invoice', tone: 'yellow' };
    return { text: `Send the final invoice (${Math.max(0, Math.round((1 - invoiced(j) / Math.max(1, contract(j))) * 100))}% unbilled)`, tone: 'yellow' };
  }
  if (st === 'Invoiced') {
    if (paid(j) < contract(j) - 1) return { text: 'Waiting on payment', tone: 'blue' };
    const left = closeoutItems(j).filter(x => !x.ok);
    return { text: left.length ? `Close out: ${left.map(x => x.label.toLowerCase()).join(', ')}` : 'Mark closed', tone: 'green' };
  }
  if (st === 'Closed') return { text: 'Closed — under warranty', tone: 'green' };
  return { text: st, tone: 'gray' };
}

/** What a daily report changes on its job (mirrored on the server for foremen). Mutates job and log; returns true if the job changed. */
export function applyLog(job, log) {
  let changed = false;
  if (log.pct !== '' && log.pct != null && num(log.pct) !== num(job.pct)) { job.pct = Math.max(0, Math.min(100, num(log.pct))); changed = true; }
  const p = log.phaseDone && log.phaseId && (job.phases || []).find(x => x.id === log.phaseId);
  if (p && p.status !== 'Done') { p.status = 'Done'; if (!p.start) { p.start = log.date; p.end = log.date; } changed = true; }
  if (log.extraWork && log.extraDesc && !log.coId) {
    const co = { id: uid(), number: `CO-${(job.changes || []).length + 1}`, desc: log.extraDesc, amount: 0, cost: 0, status: 'Pending', requested: log.date, source: 'field', logId: log.id };
    job.changes = [...(job.changes || []), co]; log.coId = co.id; changed = true;
  }
  if (phasesDone(job) && job.status !== 'Complete') { job.status = 'Complete'; job.completed = job.completed || log.date; job.pct = 100; changed = true; }
  return changed;
}

/* ---------------------------------------------------------------- closeout */
export function closeoutItems(j) {
  const c = j.closeout || {}, commercial = !/Residential/.test((db.customers.find(x => x.id === j.customerId) || {}).type || '');
  const items = [
    { key: 'walkthrough', label: 'Final walkthrough signed', ok: walkedThrough(j) },
    { key: 'invoice', label: 'Final invoice sent', ok: contract(j) > 0 && invoiced(j) >= contract(j) - 1 },
    { key: 'paid', label: 'Paid in full', ok: contract(j) > 0 && paid(j) >= contract(j) - 1 },
    { key: 'cos', label: 'No pending change orders', ok: !pendingCOs(j).length },
    { key: 'waivers', label: 'Lien waivers', ok: !!c.waivers || !commercial, manual: commercial },
    { key: 'permitFinal', label: 'Permit final inspection', ok: !!c.permitFinal || (j.permit || {}).needed !== 'yes', manual: (j.permit || {}).needed === 'yes' },
    { key: 'warrantyLetter', label: 'Warranty letter & keep-off guide sent', ok: !!c.warrantyLetter, manual: true },
    { key: 'photos', label: 'Final photos saved', ok: !!c.photos, manual: true },
    { key: 'review', label: 'Review requested', ok: !!c.review, manual: true },
  ];
  return items;
}

/* ---------------------------------------------------------------- customer messages (copy & send) */
export function messages(j, p) {
  const co = db.settings.company, when = p && p.start ? `${weekday(p.start)}, ${fmtDate(p.start)}` : 'the scheduled day';
  const site = j.address || 'your property';
  return [
    ['Date confirmed', `Hi, this is ${co.name}. We have your ${p ? p.name.toLowerCase() : 'project'} at ${site} scheduled for ${when}. Our crew arrives around ${(p && p.startTime) || '7:00 AM'}. Please have vehicles moved out of the work area the night before. Questions? ${co.phone}`],
    ['Day before', `Reminder from ${co.name}: we’re at ${site} tomorrow (${when}) for ${p ? p.name.toLowerCase() : 'your project'}. Please keep the area clear of vehicles and people until we let you know it’s ready. ${co.phone}`],
    ['Rain-out', `Hi from ${co.name} — weather won’t let us do quality work at ${site} on ${when}. We’ll move you to the next good day and confirm the new date shortly. Thanks for understanding. ${co.phone}`],
    ['Keep-off', `Your ${p && /concrete|curb/i.test(p.type) ? 'concrete' : 'pavement'} at ${site} is finished. Please keep vehicles off for ${p && /concrete|curb/i.test(p.type) ? '7 days (foot traffic after 24 hours)' : '24–48 hours'}, and avoid sharp turns and parked trailers in hot weather for the first weeks. Thank you for choosing ${co.name}!`],
    ['Review request', `Thanks again for choosing ${co.name}. If you’re happy with the work at ${site}, a quick Google review would mean a lot to our family business. ${co.phone}`],
  ];
}
export { uid, round, addDays };
