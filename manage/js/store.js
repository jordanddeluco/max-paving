/* Data store. Two modes:
   - local:  everything in this browser's localStorage (demo / single computer)
   - server: shared data on the Max Paving server (logins, roles, QuickBooks)
   Views read `db` directly and change data only through put / del / saveSettings. */
import { uid, num, today, addDays, monday } from './core.js';
import { defaultSettings, sampleData, sampleProspects } from './seed.js';
import { budgetFrom, priceEstimate } from './calc.js';
import { ensurePhases, syncSummary } from './jobflow.js';

export const COLLECTIONS = ['customers', 'leads', 'prospects', 'estimates', 'jobs', 'logs', 'time', 'invoices', 'staff', 'equipment', 'docs'];
const KEY = 'maxpaving.manage.v2', OLD_KEY = 'maxpaving.manage.v1';

export const S = { mode: 'local', user: null, seq: 0, status: 'ok', qbo: null, listeners: new Set() };
export let db = null;

export const can = {
  read: c => S.mode === 'local' || (S.user && S.user.perms.read.includes(c)),
  write: c => S.mode === 'local' || (S.user && S.user.perms.write.includes(c)),
  settings: () => S.mode === 'local' || !!(S.user && S.user.perms.settings),
  money: () => S.mode === 'local' || !!(S.user && S.user.perms.money),
  users: () => S.mode === 'server' && !!(S.user && S.user.perms.users),
  qbo: () => S.mode === 'server' && !!(S.user && S.user.perms.qbo),
  approve: () => S.mode === 'local' || ['owner', 'office'].includes(S.user && S.user.role),
};
export const role = () => S.mode === 'local' ? 'owner' : S.user.role;
export const myStaffId = () => S.mode === 'local' ? '' : S.user.staffId;

/* ---------------------------------------------------------------- shape + migration */
function normalize(o) {
  o = o && typeof o === 'object' ? o : {};
  COLLECTIONS.forEach(c => { if (!Array.isArray(o[c])) o[c] = []; });
  const def = defaultSettings();
  const s = o.settings || {};
  o.settings = { ...def, ...s, company: { ...def.company, ...(s.company || {}) } };
  // v1 stored crews as names and had no cost book / assemblies.
  if (!Array.isArray(o.settings.crews) || typeof o.settings.crews[0] === 'string') o.settings.crews = def.crews;
  if (!Array.isArray(o.settings.costBook)) o.settings.costBook = def.costBook;
  if (!Array.isArray(o.settings.assemblies)) o.settings.assemblies = def.assemblies;
  // Newer defaults that older saved settings don't have yet.
  def.costBook.forEach(c => { if (!o.settings.costBook.some(x => x.id === c.id)) o.settings.costBook.push(c); });
  o.settings.assemblies.forEach(a => { if (a.scope === undefined) a.scope = (def.assemblies.find(x => x.id === a.id) || {}).scope || ''; });
  delete o.settings.priceBook;
  o.jobs.forEach(j => {
    ensurePhases(j);
    ['site', 'locate', 'permit', 'closeout'].forEach(k => { j[k] = j[k] || {}; });
    j.changes = j.changes || []; j.punch = j.punch || [];
    if (['Scheduled', 'In progress', 'Punch list'].includes(j.status)) j.status = 'Active';
    syncSummary(j);
  });
  o.estimates.forEach(e => { e.areas = e.areas || []; e.rev = e.rev || 'A'; e.checks = e.checks || {}; });
  o.meta = o.meta || {};
  return o;
}
function fromV1(v1) {
  const o = normalize({ ...v1, settings: { ...(v1.settings || {}), crews: undefined, priceBook: undefined } });
  const crewId = name => (o.settings.crews.find(c => c.name.toLowerCase() === String(name || '').toLowerCase()) || {}).id || '';
  o.jobs.forEach(j => { if (j.crew !== undefined && j.crewId === undefined) { j.crewId = crewId(j.crew); delete j.crew; } });
  o.logs.forEach(g => { if (g.crew !== undefined) { g.crewId = crewId(g.crew); delete g.crew; } if (g.asphaltTons !== undefined) { g.hmaTons = g.asphaltTons; delete g.asphaltTons; } if (g.hours !== undefined) { g.manHours = g.hours; delete g.hours; } });
  o.staff.forEach(p => { if (p.crew !== undefined) { p.crewId = crewId(p.crew); delete p.crew; } if (p.role && !p.title) { p.title = p.role; delete p.role; } p.certs = p.certs || [p.osha && { name: p.osha, expires: '' }, p.cdlExpires && { name: 'CDL Class A', expires: p.cdlExpires }, p.medExpires && { name: 'DOT medical card', expires: p.medExpires }].filter(Boolean); });
  o.estimates.forEach(e => {
    if (e.sections) return;
    e.sections = [{ id: 'base', name: 'Base scope', type: 'base' }];
    e.lines = (e.lines || []).map(l => ({ id: uid(), kind: 'custom', desc: l.desc, qty: l.qty, unit: l.unit, unitCost: 0, priceEach: l.price, section: 'base' }));
  });
  o.invoices.forEach(i => { if (!i.lines) i.lines = [{ desc: i.notes || 'Paving work', qty: 1, unit: 'LS', price: num(i.amount), cat: 'General' }]; });
  if (o.meta.sample && !o.prospects.length) o.prospects = sampleProspects();
  return o;
}
export function seedDb() {
  const o = normalize({ settings: defaultSettings(), meta: { sample: true, created: today() }, ...sampleData() });
  finishJobs(o);
  return o;
}
// Jobs that came from an estimate get their contract value and budget from it.
function finishJobs(o) {
  o.jobs.forEach(j => {
    const e = j.estimateId && o.estimates.find(x => x.id === j.estimateId);
    if (e && !num(j.value)) j.value = Math.round(priceEstimate(e, o.settings).contract.price);
    if (e && !j.budget) j.budget = budgetFrom(e, o.settings);
  });
}

/* ---------------------------------------------------------------- local mode */
function loadLocal() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const o = normalize(JSON.parse(raw)); o.jobs.forEach(j => { delete j._migrated; }); return o; }
    const old = localStorage.getItem(OLD_KEY);
    if (old) { const o = fromV1(JSON.parse(old)); finishJobs(o); return o; }
  } catch (e) { /* storage blocked or corrupt: start fresh */ }
  return seedDb();
}
let saveTimer = null;
function saveLocal() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(db)); }
    catch (e) { emit('error', 'Could not save — browser storage is blocked or full. Export a backup in Settings.'); }
  }, 60);
}

/* ---------------------------------------------------------------- server mode */
const API = path => 'api/' + path;
export async function api(path, opts = {}) {
  const r = await fetch(API(path), {
    method: opts.method || 'GET', credentials: 'same-origin',
    headers: { 'X-MP': '1', ...(opts.body ? { 'Content-Type': 'application/json' } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || `Request failed (${r.status})`), { status: r.status });
  return j;
}
/** Detect the server. Returns 'local' | 'login' | 'setup' | 'ready'. */
export async function boot() {
  let health = null;
  try {
    const r = await fetch(API('health'), { credentials: 'same-origin' });
    if (r.ok && (r.headers.get('content-type') || '').includes('json')) health = await r.json();
  } catch (e) { /* no server */ }
  if (!health || health.app !== 'max-paving-manage') { S.mode = 'local'; db = loadLocal(); saveLocal(); return 'local'; }
  S.mode = 'server'; S.qboConfigured = health.qbo;
  try {
    const s = await api('session');
    if (s.needsSetup) return 'setup';
    S.user = s.user;
  } catch (e) { return 'login'; }
  await loadServer();
  return 'ready';
}
export async function loadServer() {
  const d = await api('data');
  S.seq = d.seq;
  db = normalize(d);
  // Jobs from before phases existed get their phase saved once, by someone allowed to edit jobs.
  const migrated = db.jobs.filter(j => j._migrated);
  migrated.forEach(j => { delete j._migrated; });
  if (migrated.length && can.write('jobs')) for (const j of migrated) await put('jobs', j).catch(() => {});
  startPolling();
}
export async function login(email, password) { S.user = (await api('login', { method: 'POST', body: { email, password } })).user; await loadServer(); }
export async function setup(form) {
  // First run: create the owner. Optionally start from this browser's local data.
  let seed = null;
  if (form.start === 'local') { const raw = localStorage.getItem(KEY) || localStorage.getItem(OLD_KEY); seed = raw ? (localStorage.getItem(KEY) ? JSON.parse(raw) : fromV1(JSON.parse(raw))) : null; }
  else if (form.start === 'sample') seed = seedDb();
  else seed = normalize({ settings: defaultSettings(), meta: {} });
  if (seed) { seed.settings.sampleRates = form.start === 'sample' || seed.settings.sampleRates; }
  S.user = (await api('setup', { method: 'POST', body: { name: form.name, email: form.email, password: form.password, seed } })).user;
  await loadServer();
}
export async function logout() { await api('logout', { method: 'POST' }).catch(() => {}); location.reload(); }

let pollTimer = null, pending = 0;
function startPolling() {
  clearInterval(pollTimer);
  pollTimer = setInterval(pull, 20000);
  window.addEventListener('focus', pull);
}
export async function pull() {
  if (S.mode !== 'server' || pending) return;
  try {
    const ch = await api('changes?since=' + S.seq);
    if (!ch.changes.length && !ch.deleted.length && !ch.settings) { setStatus('ok'); return; }
    ch.changes.forEach(({ c, rec }) => upsertLocal(c, rec));
    ch.deleted.forEach(({ c, id }) => { db[c] = db[c].filter(r => r.id !== id); });
    if (ch.settings) db.settings = normalize({ settings: ch.settings }).settings;
    S.seq = ch.seq;
    setStatus('ok');
    emit('remote');
  } catch (e) { setStatus(e.status === 401 ? 'signedout' : 'offline'); }
}
function upsertLocal(c, rec) {
  const i = db[c].findIndex(r => r.id === rec.id);
  if (i >= 0) db[c][i] = rec; else db[c].push(rec);
}
function setStatus(s) { if (S.status !== s) { S.status = s; emit('status'); } }

/* ---------------------------------------------------------------- writes */
export function find(c, id) { return id ? db[c].find(r => r.id === id) : undefined; }
export function put(c, rec) {
  if (!rec.id) rec.id = uid();
  upsertLocal(c, rec);
  if (S.mode === 'local') { saveLocal(); return Promise.resolve(rec); }
  pending++; setStatus('saving');
  return api(`rec/${c}/${encodeURIComponent(rec.id)}`, { method: 'PUT', body: { rec } })
    .then(r => { upsertLocal(c, r.rec); return r.rec; }) // S.seq only moves on pull, so teammates' changes are never skipped
    .catch(e => { emit('error', e.message); setStatus('offline'); throw e; })
    .finally(() => { pending--; if (!pending && S.status === 'saving') setStatus('ok'); });
}
export function del(c, id) {
  db[c] = db[c].filter(r => r.id !== id);
  if (S.mode === 'local') { saveLocal(); return Promise.resolve(); }
  return api(`rec/${c}/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(e => { emit('error', e.message); throw e; });
}
export function saveSettings() {
  if (S.mode === 'local') { saveLocal(); return Promise.resolve(); }
  return api('settings', { method: 'PUT', body: { settings: db.settings } }).catch(e => { emit('error', e.message); throw e; });
}
export function saveMeta(meta) {
  Object.assign(db.meta, meta);
  if (S.mode === 'local') { saveLocal(); return Promise.resolve(); }
  return api('meta', { method: 'PUT', body: { meta } });
}
export const nextNumber = (c, prefix, start) => {
  const n = db[c].map(r => parseInt(String(r.number || '').replace(/\D/g, ''), 10)).filter(isFinite);
  return prefix + (n.length ? Math.max(...n) + 1 : start);
};

/* ---------------------------------------------------------------- bulk data actions */
export async function clearSample() {
  const gone = [];
  COLLECTIONS.forEach(c => db[c].filter(r => r.sample).forEach(r => gone.push([c, r.id])));
  if (S.mode === 'local') { COLLECTIONS.forEach(c => { db[c] = db[c].filter(r => !r.sample); }); db.meta.sample = false; saveLocal(); return; }
  for (const [c, id] of gone) await del(c, id);
  await saveMeta({ sample: false });
}
export function resetLocal() { db = seedDb(); saveLocal(); }
export function exportData() { return JSON.stringify(db, null, 2); }
export async function importData(obj) {
  if (!obj || !obj.settings || !Array.isArray(obj.jobs)) throw new Error('That file isn’t a Max Paving Manage backup.');
  const o = obj.sections !== undefined || obj.v === 1 && !obj.settings.costBook ? fromV1(obj) : normalize(obj);
  if (S.mode === 'local') { db = o; saveLocal(); return; }
  await api('import', { method: 'POST', body: o });
  await loadServer();
}

/* ---------------------------------------------------------------- events */
export function on(fn) { S.listeners.add(fn); }
export function emit(type, detail) { S.listeners.forEach(fn => fn(type, detail)); }
export { addDays, monday };
