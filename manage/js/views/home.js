/* Home: the owner/office "today" screen. Foremen and crew get "My day" instead (from crew.js). */
import { esc, money, today, fmtDate, greeting, icon, badge, num, LEAD_STAGES } from '../core.js';
import { db, S, role } from '../store.js';
import { hero, card, kpi, btn, linkBtn, custName, bar } from '../ui.js';
import { attention, invBalance, invStatus, onDay, crewMembers, isClockedIn, jobInvoiced, estTotals } from '../derive.js';
import { weatherStrip, wxFor, wxGo } from '../weather.js';
import { myDay } from './crew.js';

export default {
  title: 'Home',
  badge: () => 0,
  render() {
    return ['foreman', 'crew'].includes(role()) ? myDay() : office();
  },
};

function office() {
  const t = today(), year = t.slice(0, 4), first = S.user ? S.user.name.split(' ')[0] : '';
  const sent = db.estimates.filter(e => e.status === 'Sent');
  const out = sent.reduce((s, e) => s + estTotals(e).headline.price, 0);
  const decided = db.estimates.filter(e => ['Accepted', 'Declined'].includes(e.status) && (e.date || '').startsWith(year));
  const won = decided.filter(e => e.status === 'Accepted');
  const wonValue = won.reduce((s, e) => s + estTotals(e).contract.price, 0);
  const open = db.jobs.filter(j => !['Complete', 'On hold'].includes(j.status));
  const backlog = open.reduce((s, j) => s + Math.max(0, num(j.value) - jobInvoiced(j)), 0);
  const ar = db.invoices.reduce((s, i) => s + Math.max(0, invBalance(i)), 0);
  const overdue = db.invoices.filter(i => invStatus(i) === 'Overdue').reduce((s, i) => s + invBalance(i), 0);
  const items = attention();
  const stages = LEAD_STAGES.map(s => [s, db.leads.filter(l => l.status === s).length]);
  const maxStage = Math.max(1, ...stages.map(x => x[1]));

  const crews = db.settings.crews.map(c => {
    const jobs = db.jobs.filter(j => j.crewId === c.id && onDay(j, t) && !['Complete', 'On hold'].includes(j.status));
    const people = crewMembers(c.id), inNow = people.filter(p => isClockedIn(p.id)).length;
    const j = jobs[0], go = j ? wxGo(wxFor(t), j.type) : null;
    return `<a class="crew-card" style="--c:${c.color}" href="${j ? `#jobs/${j.id}` : '#schedule'}">
      <div class="crew-card__head"><span class="crew-card__name">${esc(c.name)}</span><span class="crew-card__count${inNow ? ' is-on' : ''}">${inNow}/${people.length || c.size} clocked in</span></div>
      ${j ? `<strong class="crew-card__job">${esc(j.name)}</strong><small>${esc(custName(j.customerId))}${j.address ? ' · ' + esc(j.address) : ''}</small>
        <div class="crew-card__foot">${badge(j.status)}${go ? `<span class="small muted">Weather</span> ${badge(go)}` : ''}${jobs.length > 1 ? `<span class="small muted">+${jobs.length - 1} more</span>` : ''}</div>`
        : `<strong class="crew-card__job muted">Not scheduled today</strong><small>Open the schedule to place sold work</small>`}
    </a>`;
  }).join('');

  return hero({
    eyebrow: fmtDate(t),
    title: `${greeting()}${first ? ', ' + esc(first) : ''}.`,
    sub: items.length ? `${items.length} thing${items.length === 1 ? '' : 's'} need${items.length === 1 ? 's' : ''} attention today.` : 'Everything is caught up.',
    actions: btn('New estimate', 'est-new', { ic: 'plus' }) + linkBtn('Crew clock', '#crew/clock', { kind: 'outline', ic: 'clock' }),
  }) + `
  <div class="page">
    <section class="crews">${crews}</section>
    <section class="kpis">
      ${kpi('Proposals out', money(out), `${sent.length} waiting on an answer`, { href: '#estimates' })}
      ${kpi(`Won in ${year}`, money(wonValue), decided.length ? `${Math.round(won.length / decided.length * 100)}% win rate` : 'No decisions yet', { href: '#estimates' })}
      ${kpi('Backlog', money(backlog), `${open.length} open job${open.length === 1 ? '' : 's'}`, { href: '#jobs' })}
      ${kpi('Owed to us', money(ar), overdue > 0 ? `${money(overdue)} overdue` : 'Nothing overdue', { href: '#billing', tone: overdue > 0 ? 'alert' : '' })}
    </section>
    <div class="grid-2">
      ${card('Needs attention', items.length ? `<ul class="todo">${items.map(i => `<li><a href="${i.href}"><span class="todo__dot todo__dot--${i.tone}"></span><span><strong>${esc(i.title)}</strong><small>${esc(i.sub)}</small></span>${icon('arrow')}</a></li>`).join('')}</ul>` : `<div class="all-clear">${icon('check')}<strong>All caught up.</strong><span>New leads, approvals and alerts show up here.</span></div>`, { eyebrow: 'Action queue', right: items.length ? `<span class="count">${items.length}</span>` : '' })}
      <div class="stack">
        ${card('Paving weather', weatherStrip(), { eyebrow: 'Next 7 days', cls: 'card--wx', right: `<a class="small" href="#settings/company">Rules</a>` })}
        ${card('Sales pipeline', `<div class="pipe">${stages.map(([s, n]) => `<a class="pipe__row" href="#sales/leads"><span>${s}</span>${bar(n, maxStage)}<b>${n}</b></a>`).join('')}</div>`, { eyebrow: 'Leads by stage', right: '<a class="small" href="#sales/leads">All leads →</a>' })}
      </div>
    </div>
  </div>`;
}
