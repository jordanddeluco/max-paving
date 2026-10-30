/* Billing: invoices, payments, receivables aging, QuickBooks sync (server) or CSV export (local). */
import { $, $$, esc, num, round, money, fix, today, addDays, fmtDate, daysUntil, icon, badge, uid, UNITS, CATS } from '../core.js';
import { db, S, put, del, find, can, nextNumber, api, pull } from '../store.js';
import { act, onSubmit, onInput, hero, card, kpi, btn, linkBtn, table, f, fieldHtml, formDrawer, closeDrawer, collect, validate, toast, confirmTwice, custName, jobLabel, ui, chips, filter, bar, stats, qbBadge, download, csv, printHtml } from '../ui.js';
import { invBalance, invStatus, invTotal, jobInvoiced } from '../derive.js';
import { pricedLines } from '../calc.js';

export default {
  title: 'Billing',
  roles: ['owner', 'office'],
  badge: () => db.invoices.filter(i => invStatus(i) === 'Overdue').length,
  render(r) {
    const html = page();
    const open = r.q.get('open');
    return { html, after: () => { if (open) setTimeout(() => openInvoice(open), 0); } };
  },
};

function aging() {
  const b = { Current: 0, '1–30': 0, '31–60': 0, '61–90': 0, '90+': 0 };
  db.invoices.forEach(i => {
    const bal = invBalance(i); if (bal <= 0.005) return;
    const late = i.due ? -daysUntil(i.due) : 0;
    b[late <= 0 ? 'Current' : late <= 30 ? '1–30' : late <= 60 ? '31–60' : late <= 90 ? '61–90' : '90+'] += bal;
  });
  return b;
}
function page() {
  const st = filter('invoices', 'Unpaid');
  const all = db.invoices.slice().sort((a, b) => (b.issued || '').localeCompare(a.issued || ''));
  const rows = st.s === 'All' ? all : st.s === 'Unpaid' ? all.filter(i => invStatus(i) !== 'Paid') : all.filter(i => invStatus(i) === st.s);
  const states = ['Unpaid', 'Open', 'Partial', 'Overdue', 'Paid', 'All'];
  const counts = Object.fromEntries(states.map(s => [s, s === 'All' ? all.length : s === 'Unpaid' ? all.filter(i => invStatus(i) !== 'Paid').length : all.filter(i => invStatus(i) === s).length]));
  const ag = aging(), owed = Object.values(ag).reduce((a, b) => a + b, 0), max = Math.max(1, ...Object.values(ag));
  const month = today().slice(0, 7);
  const billedMonth = db.invoices.filter(i => (i.issued || '').startsWith(month)).reduce((t, i) => t + num(i.amount), 0);
  const unbilled = db.jobs.filter(j => j.status !== 'On hold').reduce((t, j) => t + Math.max(0, num(j.value) * num(j.pct) / 100 - jobInvoiced(j)), 0);
  return hero({
    eyebrow: 'Office', title: 'Billing',
    sub: S.mode === 'server' && S.qboConfigured ? 'Invoices here go to QuickBooks with one click, and payments recorded in QuickBooks flow back automatically.' : 'Invoice from jobs, track who owes what, and hand the accounting to QuickBooks.',
    actions: btn('New invoice', 'inv-new', { ic: 'plus' }) + (S.mode === 'server' && can.qbo() ? btn('Check QuickBooks for payments', 'qbo-pull', { kind: 'outline', ic: 'sync' }) : btn('QuickBooks CSV', 'inv-csv', { kind: 'outline' })),
  }) + `<div class="page">
    <section class="kpis">
      ${kpi('Owed to us', money(owed), `${db.invoices.filter(i => invBalance(i) > 0.005).length} open invoices`)}
      ${kpi('Overdue', money(owed - ag.Current), owed - ag.Current > 0 ? 'Follow up this week' : 'Nothing overdue', { tone: owed - ag.Current > 0 ? 'alert' : '' })}
      ${kpi('Billed this month', money(billedMonth))}
      ${kpi('Earned, not billed', money(unbilled), 'Progress on open jobs not invoiced yet')}
    </section>
    ${card('Receivables aging', `<div class="aging">${Object.entries(ag).map(([k, v]) => `<div class="aging__col${k !== 'Current' && v > 0 ? ' is-late' : ''}"><small>${k === 'Current' ? 'Not due' : k + ' days late'}</small><strong>${money(v)}</strong>${bar(v, max, k === 'Current' ? '' : 'bad')}</div>`).join('')}</div>`, { eyebrow: 'Who owes what' })}
    <div class="toolbar"><input class="search" type="search" placeholder="Search invoices…" value="${esc(st.q)}" data-on-input="search" data-key="invoices" aria-label="Search invoices">${chips('invoices', states, st.s, counts)}</div>
    ${table([
      { l: 'Invoice', v: i => `<strong>${esc(i.number)}</strong> ${qbBadge(i)}` },
      { l: 'Customer / job', v: i => `<strong>${esc(custName(i.customerId))}</strong><small class="muted block">${esc(jobLabel(find('jobs', i.jobId)))}</small>`, text: i => `${custName(i.customerId)} ${jobLabel(find('jobs', i.jobId))}` },
      { l: 'Issued', v: i => fmtDate(i.issued) }, { l: 'Due', v: i => fmtDate(i.due) },
      { l: 'Amount', r: true, v: i => money(i.amount) }, { l: 'Balance', r: true, v: i => `<strong>${money(invBalance(i))}</strong>` },
      { l: 'Status', v: i => badge(invStatus(i)) },
    ], rows, { onRow: i => `data-act="inv-edit" data-id="${i.id}"`, emptyText: 'No invoices here.' })}
  </div>`;
}

/* ---------------------------------------------------------------- invoice form */
const linesEditor = lines => `<div class="inv-lines"><div class="lines__scroll"><table class="lines__table"><thead><tr><th>Description</th><th class="r">Qty</th><th>Unit</th><th class="r">Rate</th><th>Category</th><th class="r">Amount</th><th></th></tr></thead>
  <tbody>${(lines.length ? lines : [{ qty: 1, unit: 'LS', cat: 'General' }]).map(lineRow).join('')}</tbody></table></div>
  <div class="lines__foot">${btn('Add line', 'inv-line-add', { kind: 'ghost', size: 'sm', ic: 'plus' })}<span data-fill></span><div class="lines__total">Total <strong data-inv-total>${money(invTotal(lines), true)}</strong></div></div></div>`;
const lineRow = l => `<tr><td><input name="l_desc" value="${esc(l.desc || '')}" aria-label="Description"></td><td class="r"><input name="l_qty" type="number" step="any" value="${esc(l.qty ?? 1)}" aria-label="Quantity" data-on-input="inv-calc"></td>
  <td><select name="l_unit" aria-label="Unit">${UNITS.map(u => `<option${u === (l.unit || 'LS') ? ' selected' : ''}>${u}</option>`).join('')}</select></td>
  <td class="r"><input name="l_price" type="number" step="0.01" value="${esc(l.price ?? '')}" aria-label="Rate" data-on-input="inv-calc"></td>
  <td><select name="l_cat" aria-label="Category (maps to a QuickBooks product)">${CATS.map(c => `<option${c === (l.cat || 'General') ? ' selected' : ''}>${c}</option>`).join('')}</select></td>
  <td class="r" data-amt>${money(num(l.qty) * num(l.price), true)}</td><td><button type="button" class="x" data-act="inv-line-del" aria-label="Remove line">×</button></td></tr>`;

const INV_FIELDS = () => [
  f('number', 'Invoice #', 'text', { req: true }), f('customerId', 'Customer', 'ref', { ref: 'customers', req: true }),
  f('jobId', 'Job', 'select', { o: () => db.jobs.map(j => [j.id, jobLabel(j)]), blank: 'No job' }),
  f('issued', 'Issued', 'date', { req: true }), f('due', 'Due', 'date', { req: true }),
  f('lines', 'Lines', 'html', { wide: true, html: v => linesEditor(v || []) }),
  f('notes', 'Memo', 'textarea', { wide: true }),
];
export function openInvoice(id, preset = {}) {
  const i = id ? find('invoices', id) : (() => {
    const job = preset.jobId && find('jobs', preset.jobId);
    return { number: nextNumber('invoices', 'INV-', 2001), issued: today(), due: addDays(today(), num(db.settings.termsDays) || 30), customerId: job ? job.customerId : '', jobId: job ? job.id : '', lines: [], ...preset };
  })();
  const job = i.jobId && find('jobs', i.jobId);
  const pays = i.payments || [];
  const fromQb = i.qbo && i.qbo.id;
  formDrawer({
    eyebrow: 'Invoice', title: id ? `${esc(i.number)} · ${esc(custName(i.customerId))}` : 'New invoice', fields: INV_FIELDS(), rec: i, submit: 'inv-save', id, wide: true,
    extra: (id ? stats([['Amount', money(i.amount)], ['Paid', money(i.paid)], ['Balance', money(invBalance(i)), invStatus(i) === 'Overdue' ? 'warn' : ''], ['Status', invStatus(i)]]) : '')
      + (!id && job ? `<div class="fill-bar"><span>Bill this job:</span>
          ${btn('Remaining balance', 'inv-fill', { kind: 'ghost', size: 'sm', attrs: 'data-mode="remaining"' })}
          <label class="inline">Progress <input type="number" min="1" max="100" step="1" value="${Math.max(0, Math.round(num(job.pct) - jobInvoiced(job) / Math.max(1, num(job.value)) * 100)) || 50}" data-fill-pct aria-label="Percent of contract">%</label>${btn('Fill', 'inv-fill', { kind: 'ghost', size: 'sm', attrs: 'data-mode="progress"' })}
          ${job.estimateId ? btn('Full scope lines', 'inv-fill', { kind: 'ghost', size: 'sm', attrs: 'data-mode="scope"' }) : ''}
          <small class="muted">Contract ${money(job.value)} · already invoiced ${money(jobInvoiced(job))}</small></div>` : '')
      + (fromQb ? '<p class="note">This invoice is in QuickBooks. Record payments there — they come back here automatically.</p>' : ''),
    footer: [
      id && !fromQb && invBalance(i) > 0.005 ? btn('Record payment', 'inv-pay', { kind: 'ghost', size: 'sm', ic: 'dollar' }) : '',
      id && S.mode === 'server' && can.qbo() ? btn(fromQb ? 'Update QuickBooks' : 'Send to QuickBooks', 'inv-qbo', { kind: 'ghost', size: 'sm', ic: 'qb' }) : '',
      id ? btn('Print', 'inv-print', { kind: 'ghost', size: 'sm', ic: 'print' }) : '',
    ].join(''),
    del: id && !fromQb ? 'inv-del' : '',
    note: pays.length ? `Payments: ${pays.map(p => `${money(p.amount, true)} on ${fmtDate(p.date)}${p.method ? ' (' + esc(p.method) + ')' : ''}`).join(' · ')}` : '',
  });
}
function readLines(form) {
  return $$('.inv-lines tbody tr', form).map(tr => ({ desc: $('[name=l_desc]', tr).value.trim(), qty: num($('[name=l_qty]', tr).value), unit: $('[name=l_unit]', tr).value, price: round(num($('[name=l_price]', tr).value), 2), cat: $('[name=l_cat]', tr).value }))
    .filter(l => l.desc || l.price);
}
function recalc(form) {
  $$('.inv-lines tbody tr', form).forEach(tr => { $('[data-amt]', tr).textContent = money(num($('[name=l_qty]', tr).value) * num($('[name=l_price]', tr).value), true); });
  $('[data-inv-total]', form).textContent = money(invTotal(readLines(form)), true);
}
onInput({ 'inv-calc'(el) { recalc(el.closest('form')); } });
act({
  'inv-new': () => openInvoice(),
  'inv-edit': el => openInvoice(el.dataset.id),
  'inv-line-add'(el) { const tb = $('.inv-lines tbody', el.closest('form')); tb.insertAdjacentHTML('beforeend', lineRow({ qty: 1, unit: 'LS', cat: 'General' })); $('tr:last-child [name=l_desc]', tb).focus(); },
  'inv-line-del'(el) { const form = el.closest('form'); el.closest('tr').remove(); recalc(form); },
  'inv-fill'(el) {
    const form = el.closest('form'), job = find('jobs', form.elements.jobId.value) ; if (!job) return;
    const tb = $('.inv-lines tbody', form), cat = job.type === 'Mixed' ? 'General' : job.type;
    let lines;
    if (el.dataset.mode === 'remaining') lines = [{ desc: `${job.name} — balance of contract`, qty: 1, unit: 'LS', price: round(Math.max(0, num(job.value) - jobInvoiced(job)), 2), cat }];
    else if (el.dataset.mode === 'progress') { const p = num($('[data-fill-pct]', form).value); lines = [{ desc: `${job.name} — progress billing, ${p}% of contract`, qty: 1, unit: 'LS', price: round(num(job.value) * p / 100, 2), cat }]; }
    else lines = pricedLines(find('estimates', job.estimateId), db.settings);
    tb.innerHTML = lines.map(lineRow).join(''); recalc(form);
  },
  async 'inv-del'(el) { if (!confirmTwice(el, 'Click again to delete')) return; await del('invoices', el.closest('form').dataset.id); closeDrawer(); ui.rerender(); toast('Invoice deleted.'); },
  'inv-pay'(el) {
    const i = find('invoices', el.closest('form').dataset.id);
    formDrawer({ eyebrow: i.number, title: 'Record payment', submit: 'inv-pay', id: i.id, rec: { date: today(), amount: round(invBalance(i), 2), method: 'Check' }, saveLabel: 'Record payment', fields: [
      f('amount', 'Amount', 'money', { req: true }), f('date', 'Date', 'date', { req: true }), f('method', 'Method', 'select', { o: ['Check', 'ACH', 'Card', 'Cash', 'Other'], noBlank: true }), f('ref', 'Check # / reference'),
    ] });
  },
  async 'inv-qbo'(el) {
    const id = el.closest('form').dataset.id; el.disabled = true;
    try { await api('qbo/push', { method: 'POST', body: { kind: 'invoice', id, label: find('invoices', id).number } }); await pull(); closeDrawer(); ui.rerender(); toast('Invoice is in QuickBooks.'); }
    catch (e) { toast(e.message, 'bad'); el.disabled = false; }
  },
  async 'qbo-pull'(el) {
    el.disabled = true;
    try { const r = await api('qbo/pull', { method: 'POST' }); await pull(); ui.rerender(); toast(r.updated ? `${r.updated} invoice${r.updated === 1 ? '' : 's'} updated from QuickBooks.` : 'Everything matches QuickBooks.'); }
    catch (e) { toast(e.message, 'bad'); }
    el.disabled = false;
  },
  'inv-print'(el) { printInvoice(find('invoices', el.closest('form').dataset.id)); },
  'inv-csv'() {
    // Columns for QuickBooks Online: Settings → Import data → Invoices (map columns on import).
    const rows = db.invoices.filter(i => !(i.qbo && i.qbo.id)).flatMap(i => (i.lines && i.lines.length ? i.lines : [{ desc: 'Paving work', qty: 1, price: i.amount, cat: 'General' }]).map(l => [i.number, custName(i.customerId), i.issued, i.due, `Net ${db.settings.termsDays}`, jobLabel(find('jobs', i.jobId)), `${l.cat || 'General'} work`, l.desc, l.qty, l.price, round(num(l.qty) * num(l.price), 2)]));
    download(`quickbooks-invoices-${today()}.csv`, csv([['InvoiceNo', 'Customer', 'InvoiceDate', 'DueDate', 'Terms', 'Memo', 'Item(Product/Service)', 'ItemDescription', 'ItemQuantity', 'ItemRate', 'ItemAmount'], ...rows]));
    toast('Invoices CSV downloaded — import it in QuickBooks under Settings → Import data → Invoices.');
  },
});
onSubmit({
  async 'inv-save'(form) {
    const fields = INV_FIELDS(); if (!validate(form, fields)) return;
    const v = collect(form, fields), prev = form.dataset.id ? find('invoices', form.dataset.id) : null;
    v.lines = readLines(form);
    if (!v.lines.length) return toast('Add at least one line.', 'bad');
    if (v.due < v.issued) return toast('Due date is before the issue date.', 'bad');
    if (db.invoices.some(i => i.number === v.number && i.id !== form.dataset.id)) return toast(`Invoice ${v.number} already exists.`, 'bad');
    v.amount = round(invTotal(v.lines), 2);
    await put('invoices', { ...(prev || { id: uid(), paid: 0, payments: [] }), ...v });
    closeDrawer(); ui.rerender(); toast(prev ? 'Invoice saved.' : `${v.number} created.`);
  },
  async 'inv-pay'(form) {
    const i = find('invoices', form.dataset.id), e = form.elements, amt = round(num(e.amount.value), 2);
    if (amt <= 0) return toast('Enter the amount received.', 'bad');
    const payments = [...(i.payments || []), { date: e.date.value || today(), amount: amt, method: e.method.value, ref: e.ref.value.trim() }];
    await put('invoices', { ...i, payments, paid: round(payments.reduce((t, p) => t + num(p.amount), 0), 2) });
    closeDrawer(); ui.rerender(); toast(`${money(amt, true)} recorded on ${i.number}.`);
  },
});
function printInvoice(i) {
  const c = find('customers', i.customerId) || {}, co = db.settings.company, job = find('jobs', i.jobId);
  printHtml(`<article class="pr">
    <header class="pr__head"><img src="img/logo-horizontal.jpg" alt="Max Paving"><div class="pr__co">${esc(co.address)}<br>${esc(co.phone)} · ${esc(co.email)}</div></header>
    <h1>Invoice ${esc(i.number)}</h1>
    <div class="pr__meta"><div><small>Bill to</small><strong>${esc(c.name || '')}</strong>${c.address ? `<br>${esc(c.address)}` : ''}</div><div><small>Job</small><strong>${esc(job ? job.name : '')}</strong>${job && job.address ? `<br>${esc(job.address)}` : ''}</div><div><small>Dates</small><strong>Issued ${fmtDate(i.issued)}</strong><br>Due ${fmtDate(i.due)}</div></div>
    <table class="pr__table"><thead><tr><th>Description</th><th class="r">Qty</th><th>Unit</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead>
      <tbody>${(i.lines || []).map(l => `<tr><td>${esc(l.desc)}</td><td class="r">${fix(l.qty, 2)}</td><td>${esc(l.unit)}</td><td class="r">${money(l.price, true)}</td><td class="r">${money(num(l.qty) * num(l.price), true)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="4">Total</td><td class="r">${money(i.amount, true)}</td></tr>${num(i.paid) ? `<tr><td colspan="4">Paid</td><td class="r">${money(i.paid, true)}</td></tr><tr><td colspan="4">Balance due</td><td class="r">${money(invBalance(i), true)}</td></tr>` : ''}</tfoot></table>
    ${i.notes ? `<p>${esc(i.notes)}</p>` : ''}<p>Payment due net ${esc(db.settings.termsDays)} days. Thank you for your business.</p>
  </article>`);
}
