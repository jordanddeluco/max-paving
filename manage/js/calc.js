/* Estimating engine + job costing. Pure functions over (record, settings). */
import { num, round } from './core.js';

export const COST_KEYS = ['Material', 'Labor', 'Equipment', 'Trucking', 'Subcontract', 'Other'];
const zero = () => Object.fromEntries(COST_KEYS.map(k => [k, 0]));

export const crewDayLabor = (crew, s) => num(crew.size) * num(crew.hoursPerDay || 10) * num(crew.avgRate) * (1 + num(s.burdenPct) / 100);
export const crewDayCost = (crew, s) => crewDayLabor(crew, s) + num(crew.equipDayCost);
const toSY = (q, unit) => unit === 'SF' ? q / 9 : unit === 'SY' ? q : 0;
const toSF = (q, unit) => unit === 'SY' ? q * 9 : unit === 'SF' ? q : 0;

/** Truck hours to haul `tons` given haul minutes one way. */
export function truckHours(tons, s, haulMin) {
  if (!tons) return 0;
  const loads = Math.ceil(tons / (num(s.truckTons) || 20));
  return loads * (2 * num(haulMin ?? s.haulMin) + num(s.loadMin)) / 60;
}

export function lineUnit(line, s) {
  if (line.kind === 'assembly') return (s.assemblies.find(x => x.id === line.assemblyId) || {}).unit || 'EA';
  if (line.kind === 'item') return (s.costBook.find(c => c.id === line.itemId) || {}).unit || 'EA';
  return line.unit || 'EA';
}
/** A measured area's quantity in a given unit. Areas carry sf (net of cut-outs), lf (perimeter or length), tieIn (LF against existing pavement) and ea (count). */
export function areaQty(area, unit, depthIn = 0, measure = '') {
  const sf = num(area.sf), lf = measure === 'tieIn' ? num(area.tieIn) : num(area.lf);
  return unit === 'SF' ? sf : unit === 'SY' ? sf / 9 : unit === 'LF' ? lf : unit === 'CY' ? sf * num(depthIn) / 12 / 27 : unit === 'TON' ? 0 : num(area.ea) || 1;
}
/** Line quantity: typed, or taken from a measured area (plus an optional extra % for overbreak/waste). */
export function resolveQty(line, s, est = {}) {
  if (!line.areaId) return num(line.qty);
  const area = (est.areas || []).find(a => a.id === line.areaId);
  if (!area) return num(line.qty);
  const unit = lineUnit(line, s);
  const q = areaQty(area, unit, line.depth, line.measure);
  return round(q * (1 + num(line.extraPct) / 100), unit === 'EA' || unit === 'LS' ? 0 : 1);
}

/**
 * Cost one estimate line.
 * line: { kind: 'assembly'|'item'|'custom', assemblyId?, itemId?, qty | areaId, thick?, unitCost?, unit?, desc?, priceEach? }
 * Returns { desc, cat, unit, qty, cost: {type: $}, total, days, manHours, tons: {hma, base, other}, cy, parts: [...] }
 */
export function costLine(line, s, est = {}) {
  const q = resolveQty(line, s, est), cost = zero(), parts = [];
  const out = { desc: line.desc || '', cat: 'General', unit: line.unit || 'EA', qty: q, cost, total: 0, days: 0, manHours: 0, hmaTons: 0, baseTons: 0, cy: 0, truckHrs: 0, parts };
  const item = id => s.costBook.find(c => c.id === id);

  if (line.kind === 'assembly') {
    const a = s.assemblies.find(x => x.id === line.assemblyId);
    if (!a) { out.desc = out.desc || '(assembly removed)'; return out; }
    const thick = line.thick !== undefined && line.thick !== '' ? num(line.thick) : num(a.thick);
    Object.assign(out, { desc: line.desc || `${a.name}${thick ? ` — ${thick}"` : ''}`, cat: a.cat, unit: a.unit });
    let haulTons = 0;
    for (const p of a.parts) {
      const it = item(p.item); if (!it) continue;
      let qty = 0;
      if (p.rule === 'per') qty = q * num(p.factor);
      else if (p.rule === 'fixed') qty = num(p.factor);
      else if (p.rule === 'hma') { qty = toSY(q, a.unit) * thick * num(s.hmaLbPerSyIn || 110) / 2000 * (1 + num(s.wastePct) / 100); out.hmaTons += qty; }
      else if (p.rule === 'base') { qty = toSF(q, a.unit) * num(p.factor) / 12 * num(s.baseDensity || 140) / 2000 * (1 + num(s.wastePct) / 100); out.baseTons += qty; }
      else if (p.rule === 'conc') { qty = toSF(q, a.unit) * thick / 12 / 27 * (1 + num(s.concreteWastePct) / 100); out.cy += qty; }
      else if (p.rule === 'haul') { qty = truckHours(haulTons, s, est.haulMin); out.truckHrs += qty; }
      if (it.unit === 'TON' && p.rule !== 'haul') haulTons += qty;
      if (it.unit === 'CY' && p.rule === 'per' && it.id.startsWith('conc')) out.cy += qty;
      const c = qty * num(it.cost);
      cost[it.type in cost ? it.type : 'Other'] += c;
      parts.push({ name: it.name, unit: it.unit, qty, unitCost: num(it.cost), cost: c, type: it.type });
    }
    const crew = s.crews.find(c => c.id === a.crew);
    if (crew && num(a.prod) > 0 && q > 0) {
      const days = q / num(a.prod);
      out.days = days;
      out.manHours = days * num(crew.size) * num(crew.hoursPerDay || 10);
      const lab = days * crewDayLabor(crew, s), eq = days * num(crew.equipDayCost);
      cost.Labor += lab; cost.Equipment += eq;
      parts.push({ name: `${crew.name} labor (${round(out.manHours, 0)} man-hrs)`, unit: 'DAY', qty: days, unitCost: crewDayLabor(crew, s), cost: lab, type: 'Labor' });
      parts.push({ name: `${crew.name} equipment`, unit: 'DAY', qty: days, unitCost: num(crew.equipDayCost), cost: eq, type: 'Equipment' });
    }
  } else if (line.kind === 'item') {
    const it = item(line.itemId);
    if (!it) { out.desc = out.desc || '(item removed)'; return out; }
    Object.assign(out, { desc: line.desc || it.name, cat: it.cat || 'General', unit: it.unit });
    const c = q * num(it.cost);
    cost[it.type in cost ? it.type : 'Other'] += c;
    if (it.type === 'Trucking') out.truckHrs += q;
    parts.push({ name: it.name, unit: it.unit, qty: q, unitCost: num(it.cost), cost: c, type: it.type });
  } else { // custom line: type your own cost
    Object.assign(out, { cat: line.cat || 'General', unit: line.unit || 'EA' });
    const c = q * num(line.unitCost);
    cost[line.costType in cost ? line.costType : 'Other'] += c;
  }
  out.total = COST_KEYS.reduce((t, k) => t + cost[k], 0);
  return out;
}

/** Price an estimate: per-line cost, sell price, section totals, margin. */
export function priceEstimate(est, s) {
  const oh = num(est.overheadPct ?? s.overheadPct) / 100;
  const margin = Math.min(0.9, num(est.marginPct ?? s.marginPct) / 100);
  const sections = (est.sections && est.sections.length ? est.sections : [{ id: 'base', name: 'Base scope', type: 'base' }]);
  const lock = est.locked && est.locked.lines; // a sent proposal keeps the numbers the customer saw
  const lines = (est.lines || []).map(l => {
    const c = lock && lock[l.id] ? { ...costLine(l, s, est), ...lock[l.id].c } : costLine(l, s, est);
    const auto = c.qty ? c.total * (1 + oh) / (1 - margin) / c.qty : 0; // unit sell price
    const unitPrice = lock && lock[l.id] ? lock[l.id].unitPrice : l.priceEach !== undefined && l.priceEach !== '' ? num(l.priceEach) : auto;
    return { ...c, line: l, section: sections.some(x => x.id === l.section) ? l.section : sections[0].id, unitPrice, price: unitPrice * c.qty, overridden: l.priceEach !== undefined && l.priceEach !== '' };
  });
  const bySection = sections.map(sec => {
    const ls = lines.filter(l => l.section === sec.id);
    const cost = ls.reduce((t, l) => t + l.total, 0), price = ls.reduce((t, l) => t + l.price, 0);
    return { ...sec, lines: ls, cost, price, margin: price ? (price - cost * (1 + oh)) / price : 0 };
  });
  // Contract = base sections + the chosen (or first) option + accepted add-ons.
  const acc = est.accepted || {};
  const options = bySection.filter(x => x.type === 'option');
  const chosenOption = options.find(o => o.id === acc.option) || (est.status === 'Accepted' ? options[0] : null);
  const included = bySection.filter(x => x.type === 'base' || x === chosenOption || (x.type === 'addon' && (acc.addons || []).includes(x.id)));
  const sum = (arr, k) => arr.reduce((t, x) => t + x[k], 0);
  const baseOnly = bySection.filter(x => x.type === 'base');
  const headline = options.length && !chosenOption ? [...baseOnly, options[0]] : included;
  return {
    oh, margin, lines, sections: bySection, options, chosenOption,
    contract: { sections: included, cost: sum(included, 'cost'), price: sum(included, 'price') },
    headline: { cost: sum(headline, 'cost'), price: sum(headline, 'price') }, // what the list shows ("from" price if options)
    hasOptions: options.length > 0,
  };
}

/** Freeze every line's quantity, cost and unit price (called when a proposal is sent). */
export function lockPrices(est, s) {
  const p = priceEstimate({ ...est, locked: null }, s), lines = {};
  p.lines.forEach(r => { lines[r.line.id] = { unitPrice: r.unitPrice, c: { qty: r.qty, total: r.total, cost: r.cost, days: r.days, manHours: r.manHours, hmaTons: r.hmaTons, baseTons: r.baseTons, cy: r.cy, truckHrs: r.truckHrs, desc: r.desc, unit: r.unit, cat: r.cat, parts: r.parts } }; });
  return { at: new Date().toISOString(), lines, price: p.headline.price };
}

/** Customer-facing priced lines for QuickBooks / invoices. */
export function pricedLines(est, s) {
  const p = priceEstimate(est, s);
  return p.contract.sections.flatMap(sec => sec.lines.map(l => ({ desc: l.desc, qty: round(l.qty, 2), unit: l.unit, price: round(l.unitPrice, 2), cat: l.cat, section: sec.name })));
}

/** Budget snapshot carried from an accepted estimate to its job. */
export function budgetFrom(est, s) {
  const p = priceEstimate(est, s), ls = p.contract.sections.flatMap(x => x.lines);
  const cost = zero();
  ls.forEach(l => COST_KEYS.forEach(k => { cost[k] += l.cost[k]; }));
  const sum = k => ls.reduce((t, l) => t + num(l[k]), 0);
  return { cost, total: p.contract.cost, price: p.contract.price, manHours: sum('manHours'), days: sum('days'), hmaTons: sum('hmaTons'), baseTons: sum('baseTons'), cy: sum('cy'), truckHrs: sum('truckHrs') };
}

/** Actual cost so far from time entries and daily reports. */
export function jobActuals(job, db, s) {
  const time = db.time.filter(t => t.jobId === job.id);
  const logs = db.logs.filter(g => g.jobId === job.id);
  const burden = 1 + num(s.burdenPct) / 100;
  const staffRate = id => num((db.staff.find(x => x.id === id) || {}).rate) || avgCrewRate(s);
  const hours = time.reduce((t, x) => t + num(x.hours), 0);
  const labor = time.reduce((t, x) => t + num(x.hours) * staffRate(x.staffId) * burden, 0);
  const itemCost = id => num((s.costBook.find(c => c.id === id) || {}).cost);
  const hma = logs.reduce((t, g) => t + num(g.hmaTons), 0), base = logs.reduce((t, g) => t + num(g.baseTons), 0), cy = logs.reduce((t, g) => t + num(g.concreteCY), 0), truck = logs.reduce((t, g) => t + num(g.truckHours), 0);
  const crew = s.crews.find(c => c.id === job.crewId);
  const workDays = new Set(logs.map(g => g.date)).size;
  const cost = zero();
  cost.Labor = labor;
  cost.Material = hma * itemCost('hma-surf') + base * itemCost('ab3') + cy * itemCost('conc4000');
  cost.Trucking = truck * itemCost('truck');
  cost.Equipment = crew ? workDays * num(crew.equipDayCost) : 0;
  const total = COST_KEYS.reduce((t, k) => t + cost[k], 0);
  return { cost, total, manHours: hours, hmaTons: hma, baseTons: base, cy, truckHrs: truck, workDays };
}
const avgCrewRate = s => { const r = s.crews.map(c => num(c.avgRate)).filter(Boolean); return r.length ? r.reduce((a, b) => a + b) / r.length : 25; };

/** Raken-style status: projected vs budget. */
export function costStatus(actual, budget, pctComplete) {
  if (!budget || !budget.total) return { label: 'No budget', tone: 'gray', projected: actual.total };
  const done = Math.max(0.05, num(pctComplete) / 100);
  const projected = actual.total / done;
  const ratio = projected / budget.total;
  return ratio >= 1.1 ? { label: 'At risk', tone: 'red', projected, ratio } : ratio <= 0.9 && actual.total > 0 ? { label: 'Under budget', tone: 'green', projected, ratio } : { label: 'On track', tone: 'blue', projected, ratio };
}

/** Weekly hours per person with FLSA overtime (> otHours/week). */
export function weekSummary(entries, s) {
  const reg = num(s.otHours) || 40;
  const total = entries.reduce((t, e) => t + num(e.hours), 0);
  return { total, regular: Math.min(total, reg), overtime: Math.max(0, total - reg) };
}
