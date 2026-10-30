/* ==========================================================================
   Max Paving Manage — server
   Node 18+, no dependencies. Serves the panel, keeps one shared copy of the
   company's data, handles logins/roles, and talks to QuickBooks Online.

     node manage/server/server.mjs          (settings in manage/server/.env)

   Data lives in DATA_DIR (default manage/server/data) as JSON files. Back that
   folder up — it is the company's database.
   ========================================================================== */
import http from 'node:http';
import crypto from 'node:crypto';
import path from 'node:path';
import { readFileSync, existsSync, mkdirSync, writeFileSync, renameSync, chmodSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..'); // the manage/ folder (static files)

/* ---------------------------------------------------------------- config */
(function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
})(path.join(HERE, '.env'));

const env = process.env;
const PORT = Number(env.PORT) || 8790;
const PUBLIC_URL = (env.PUBLIC_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const SECURE = PUBLIC_URL.startsWith('https://');
const argData = (process.argv.find(a => a.startsWith('--data=')) || '').slice(7); // node server.mjs --data=/path
const DATA_DIR = path.resolve(argData || env.DATA_DIR || path.join(HERE, 'data'));
const SESSION_DAYS = 30;
const QB = {
  clientId: env.QBO_CLIENT_ID || '',
  secret: env.QBO_CLIENT_SECRET || '',
  env: env.QBO_ENV === 'production' ? 'production' : 'sandbox',
  redirect: env.QBO_REDIRECT_URI || `${PUBLIC_URL}/api/qbo/callback`,
  authUrl: 'https://appcenter.intuit.com/connect/oauth2',
  tokenUrl: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
  revokeUrl: 'https://developer.api.intuit.com/v2/oauth2/tokens/revoke',
  minor: env.QBO_MINOR_VERSION || '75',
};
QB.api = QB.env === 'production' ? 'https://quickbooks.api.intuit.com' : 'https://sandbox-quickbooks.api.intuit.com';
QB.configured = !!(QB.clientId && QB.secret);

/* ---------------------------------------------------------------- storage */
mkdirSync(DATA_DIR, { recursive: true });
const file = n => path.join(DATA_DIR, n);
function readJson(n, fallback) {
  try { return JSON.parse(readFileSync(file(n), 'utf8')); } catch { return fallback; }
}
function writeJson(n, value) {
  const tmp = file(n) + '.tmp';
  writeFileSync(tmp, JSON.stringify(value, null, 1));
  renameSync(tmp, file(n)); // atomic replace, so a crash never leaves half a file
  try { chmodSync(file(n), 0o600); } catch { /* not supported on Windows */ }
}

// Secret used to encrypt QuickBooks tokens at rest.
const KEY = (() => {
  if (env.APP_SECRET) return crypto.createHash('sha256').update(env.APP_SECRET).digest();
  const f = file('secret.key');
  if (!existsSync(f)) { writeFileSync(f, crypto.randomBytes(32).toString('hex')); try { chmodSync(f, 0o600); } catch { /* Windows */ } }
  return Buffer.from(readFileSync(f, 'utf8').trim(), 'hex');
})();
const seal = obj => {
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const data = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  return { iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), data: data.toString('base64') };
};
const unseal = box => {
  if (!box) return null;
  try {
    const d = crypto.createDecipheriv('aes-256-gcm', KEY, Buffer.from(box.iv, 'base64'));
    d.setAuthTag(Buffer.from(box.tag, 'base64'));
    return JSON.parse(Buffer.concat([d.update(Buffer.from(box.data, 'base64')), d.final()]).toString('utf8'));
  } catch { return null; }
};

// Shared business data: { seq, settings, meta, collections: { name: { id: record } }, tombstones: [] }
const COLLECTIONS = ['customers', 'leads', 'prospects', 'estimates', 'jobs', 'logs', 'time', 'invoices', 'staff', 'equipment', 'docs'];
const store = readJson('data.json', null) || { seq: 0, settings: null, meta: {}, collections: {}, tombstones: [] };
COLLECTIONS.forEach(c => { store.collections[c] = store.collections[c] || {}; });
let users = readJson('users.json', []);
const sessions = new Map(Object.entries(readJson('sessions.json', {})));
let qbo = readJson('qbo.json', { tokens: null, info: null, log: [] });

let saveTimer = null;
function persist() { // debounce disk writes; data is small
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    store.tombstones = store.tombstones.slice(-3000);
    writeJson('data.json', store);
  }, 150);
}
const persistUsers = () => writeJson('users.json', users);
const persistSessions = () => writeJson('sessions.json', Object.fromEntries(sessions));
const persistQbo = () => writeJson('qbo.json', qbo);
process.on('SIGINT', () => { clearTimeout(saveTimer); writeJson('data.json', store); process.exit(0); });
process.on('SIGTERM', () => { clearTimeout(saveTimer); writeJson('data.json', store); process.exit(0); });

function putRecord(c, rec, user) {
  rec.updatedAt = new Date().toISOString();
  rec.updatedBy = user ? user.name : 'system';
  rec._seq = ++store.seq;
  store.collections[c][rec.id] = rec;
  persist();
  return rec;
}
function deleteRecord(c, id) {
  delete store.collections[c][id];
  store.tombstones.push({ c, id, _seq: ++store.seq });
  persist();
}

/* ---------------------------------------------------------------- roles */
// Server-side permissions. The panel hides what a role can't use; this enforces it.
const ALL = new Set(COLLECTIONS);
const ROLES = {
  owner: { label: 'Owner', read: ALL, write: ALL, settings: true, money: true, users: true, qbo: true },
  office: { label: 'Office / admin', read: ALL, write: ALL, settings: true, money: true, users: false, qbo: true },
  estimator: { label: 'Estimator', read: new Set(['customers', 'leads', 'prospects', 'estimates', 'jobs', 'logs', 'staff', 'equipment', 'docs', 'invoices']), write: new Set(['customers', 'leads', 'prospects', 'estimates', 'jobs', 'logs']), money: false },
  foreman: { label: 'Foreman', read: new Set(['customers', 'jobs', 'logs', 'time', 'staff', 'equipment', 'estimates']), write: new Set(['logs', 'time', 'equipment']), money: false },
  crew: { label: 'Crew', read: new Set(['jobs', 'time', 'staff']), write: new Set(['time']), money: false },
};
// Fields some roles should never receive.
function redact(c, rec, user) {
  const role = ROLES[user.role];
  if (role.money) return rec;
  let r = rec;
  if (c === 'staff') { r = { ...r }; delete r.rate; delete r.qboEmployeeId; }
  if (c === 'jobs' && user.role === 'crew') { r = { ...r }; delete r.value; delete r.budget; }
  if (c === 'estimates' && user.role === 'foreman') { r = { id: r.id, number: r.number, title: r.title, customerId: r.customerId, address: r.address, status: r.status, _seq: r._seq }; }
  return r;
}
function visible(c, rec, user) {
  if (c === 'time' && user.role === 'crew') return rec.staffId && rec.staffId === user.staffId;
  return true;
}
const canRead = (user, c) => ROLES[user.role]?.read.has(c);
const canWrite = (user, c, rec) => {
  if (!ROLES[user.role]?.write.has(c)) return false;
  if (c === 'time' && user.role === 'crew') return rec && rec.staffId === user.staffId && rec.status !== 'approved';
  return true;
};

/* ---------------------------------------------------------------- auth */
const hashPassword = (pw, salt = crypto.randomBytes(16).toString('hex')) =>
  ({ salt, hash: crypto.scryptSync(pw, salt, 64).toString('hex') });
const checkPassword = (pw, u) => {
  const h = crypto.scryptSync(pw, u.salt, 64);
  return crypto.timingSafeEqual(h, Buffer.from(u.hash, 'hex'));
};
const tokenHash = t => crypto.createHash('sha256').update(t).digest('hex');
const publicUser = u => u && ({ id: u.id, name: u.name, email: u.email, role: u.role, roleLabel: ROLES[u.role]?.label, staffId: u.staffId || '', active: u.active !== false, perms: perms(u) });
const perms = u => { const r = ROLES[u.role]; return { read: [...r.read], write: [...r.write], settings: !!r.settings, money: !!r.money, users: !!r.users, qbo: !!r.qbo }; };

function getCookie(req, name) {
  const m = (req.headers.cookie || '').match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : '';
}
function sessionUser(req) {
  const t = getCookie(req, 'mp_session'); if (!t) return null;
  const s = sessions.get(tokenHash(t));
  if (!s || s.expires < Date.now()) return null;
  const u = users.find(x => x.id === s.userId && x.active !== false);
  return u ? { ...u, _session: tokenHash(t) } : null;
}
function startSession(res, user) {
  const t = crypto.randomBytes(32).toString('base64url');
  sessions.set(tokenHash(t), { userId: user.id, expires: Date.now() + SESSION_DAYS * 864e5 });
  persistSessions();
  res.setHeader('Set-Cookie', `mp_session=${t}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${SECURE ? '; Secure' : ''}`);
}
const attempts = new Map(); // simple login throttle: 8 tries / 15 min per IP+email
function throttled(key) {
  const now = Date.now(), a = (attempts.get(key) || []).filter(t => now - t < 15 * 60e3);
  attempts.set(key, a);
  return a.length >= 8;
}

/* ---------------------------------------------------------------- http helpers */
const json = (res, code, body) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
const fail = (res, code, message) => json(res, code, { error: message });
async function body(req) {
  const chunks = []; let size = 0;
  for await (const c of req) { size += c.length; if (size > 25e6) throw Object.assign(new Error('Request too large'), { code: 413 }); chunks.push(c); }
  if (!size) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw Object.assign(new Error('Bad JSON'), { code: 400 }); }
}
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon', '.md': 'text/plain; charset=utf-8' };
async function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname).replace(/^\/+/, '');
  if (!rel || rel.endsWith('/')) rel += 'index.html';
  const abs = path.resolve(ROOT, rel);
  // Never serve outside manage/, and never the server folder (code, .env, data).
  if (!abs.startsWith(ROOT + path.sep) || abs.startsWith(HERE + path.sep) || abs === HERE) return fail(res, 404, 'Not found');
  try {
    const buf = await readFile(abs);
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(abs).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'same-origin',
    });
    res.end(buf);
  } catch { fail(res, 404, 'Not found'); }
}

/* ---------------------------------------------------------------- QuickBooks */
const qbLog = (msg, ok = true) => { qbo.log = [{ at: new Date().toISOString(), ok, msg }, ...(qbo.log || [])].slice(0, 60); persistQbo(); };
const getTokens = () => unseal(qbo.tokens);
const setTokens = t => { qbo.tokens = seal(t); persistQbo(); };
const basic = () => 'Basic ' + Buffer.from(`${QB.clientId}:${QB.secret}`).toString('base64');

async function tokenRequest(params) {
  const r = await fetch(QB.tokenUrl, {
    method: 'POST',
    headers: { Authorization: basic(), Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`QuickBooks sign-in failed (${r.status}${j.error ? ': ' + j.error : ''})`);
  return j;
}
function storeTokenResponse(j, realmId) {
  const now = Date.now(), prev = getTokens() || {};
  setTokens({
    realmId: realmId || prev.realmId,
    access: j.access_token,
    refresh: j.refresh_token || prev.refresh, // Intuit may rotate the refresh token — always keep the newest
    accessExpires: now + (j.expires_in || 3600) * 1000,
    refreshExpires: now + (j.x_refresh_token_expires_in || 100 * 86400) * 1000,
  });
}
let refreshing = null;
async function accessToken() {
  const t = getTokens(); if (!t) throw new Error('QuickBooks is not connected.');
  if (t.accessExpires - Date.now() > 5 * 60e3) return t;
  refreshing = refreshing || tokenRequest({ grant_type: 'refresh_token', refresh_token: t.refresh })
    .then(j => storeTokenResponse(j))
    .finally(() => { refreshing = null; });
  await refreshing;
  return getTokens();
}
async function qbFetch(method, apiPath, payload, retry = true) {
  const t = await accessToken();
  const sep = apiPath.includes('?') ? '&' : '?';
  const r = await fetch(`${QB.api}/v3/company/${t.realmId}/${apiPath}${sep}minorversion=${QB.minor}`, {
    method,
    headers: { Authorization: `Bearer ${t.access}`, Accept: 'application/json', ...(payload ? { 'Content-Type': 'application/json' } : {}) },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  if (r.status === 401 && retry) { setTokens({ ...t, accessExpires: 0 }); return qbFetch(method, apiPath, payload, false); }
  const j = await r.json().catch(() => ({}));
  if (r.status === 429) throw new Error('QuickBooks is rate-limiting requests — wait a minute and try again.');
  // Faults can come back as "Fault" or "fault", sometimes with HTTP 200.
  const fault = j.Fault || j.fault;
  if (!r.ok || fault) {
    const e = ((fault && (fault.Error || fault.error)) || [])[0] || {};
    const msg = e.Message || e.message || r.statusText, detail = e.Detail || e.detail, code = e.code;
    const tid = r.headers.get('intuit_tid');
    throw new Error(`QuickBooks: ${code === '6140' ? 'that document number is already used in QuickBooks' : msg}${detail && code !== '6140' ? ' — ' + detail : ''}${tid ? ` (ref ${tid})` : ''}`);
  }
  return j;
}
const qbQuery = q => qbFetch('GET', 'query?query=' + encodeURIComponent(q)).then(j => j.QueryResponse || {});
const qEsc = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const money2 = n => Math.round((Number(n) || 0) * 100) / 100;

function qbAddress(rec) {
  if (!rec.street && !rec.city && !rec.address) return undefined;
  return rec.street || rec.city ? { Line1: rec.street || '', City: rec.city || '', CountrySubDivisionCode: rec.state || '', PostalCode: rec.zip || '' } : { Line1: rec.address };
}
async function pushCustomer(id, user) {
  const c = store.collections.customers[id]; if (!c) throw new Error('Customer not found.');
  const name = c.name.replace(/[:\t\n]/g, ' ').trim().slice(0, 100); // QuickBooks rejects colons, tabs and newlines in names
  const fields = {
    DisplayName: name, CompanyName: c.type === 'Residential' ? undefined : name,
    PrimaryEmailAddr: c.email ? { Address: c.email } : undefined,
    PrimaryPhone: c.phone ? { FreeFormNumber: c.phone } : undefined,
    BillAddr: qbAddress(c),
    Notes: c.contact ? `Contact: ${c.contact}` : undefined,
  };
  let qbId = c.qbo && c.qbo.id, sync;
  if (!qbId) {
    const found = (await qbQuery(`select Id, SyncToken from Customer where DisplayName = '${qEsc(name)}'`)).Customer;
    if (found && found[0]) { qbId = found[0].Id; sync = found[0].SyncToken; }
  }
  let out;
  if (qbId) {
    if (!sync) sync = ((await qbFetch('GET', `customer/${qbId}`)).Customer || {}).SyncToken;
    out = (await qbFetch('POST', 'customer', { ...fields, Id: qbId, SyncToken: sync, sparse: true })).Customer;
  } else out = (await qbFetch('POST', 'customer', fields)).Customer;
  putRecord('customers', { ...c, qbo: { id: out.Id, syncedAt: new Date().toISOString() } }, user);
  return out.Id;
}
// Each job becomes a QuickBooks sub-customer under its customer (Intuit's recommended way to track jobs).
async function pushJob(jobId, user) {
  const job = store.collections.jobs[jobId]; if (!job) return null;
  const parentId = await pushCustomer(job.customerId, user);
  if (store.settings && store.settings.qboJobs === false) return parentId;
  if (job.qbo && job.qbo.id) return job.qbo.id;
  const name = `${job.number || ''} ${job.name || 'Job'}`.replace(/[:\t\n]/g, ' ').trim().slice(0, 100);
  const found = (await qbQuery(`select Id from Customer where DisplayName = '${qEsc(name)}'`)).Customer;
  const out = found && found[0] ? found[0] : (await qbFetch('POST', 'customer', { DisplayName: name, Job: true, ParentRef: { value: parentId }, BillWithParent: true })).Customer;
  putRecord('jobs', { ...store.collections.jobs[jobId], qbo: { id: out.Id, syncedAt: new Date().toISOString() } }, user);
  return out.Id;
}
function itemRefFor(line) {
  const map = (store.settings && store.settings.qboItems) || {};
  const ref = map[line.cat] || map.General;
  if (!ref) throw new Error(`Pick a QuickBooks product/service for "${line.cat || 'General'}" work in Settings → QuickBooks first.`);
  return { value: ref };
}
function salesLines(lines) {
  return lines.filter(l => !l.option && (Number(l.qty) || 0) !== 0).map(l => ({
    DetailType: 'SalesItemLineDetail',
    Amount: money2((Number(l.qty) || 0) * (Number(l.price) || 0)),
    Description: String(l.desc || '').slice(0, 4000),
    SalesItemLineDetail: { ItemRef: itemRefFor(l), Qty: Number(l.qty) || 0, UnitPrice: money2(l.price) },
  }));
}
async function upsertTxn(entity, rec, payload) {
  const key = entity.toLowerCase();
  if (rec.qbo && rec.qbo.id) {
    const cur = (await qbFetch('GET', `${key}/${rec.qbo.id}`))[entity];
    return (await qbFetch('POST', key, { ...payload, Id: rec.qbo.id, SyncToken: cur.SyncToken, sparse: true }))[entity];
  }
  return (await qbFetch('POST', key, payload))[entity];
}
async function pushEstimate(id, user) {
  const e = store.collections.estimates[id]; if (!e) throw new Error('Estimate not found.');
  const custId = await pushCustomer(e.customerId, user);
  const out = await upsertTxn('Estimate', e, {
    CustomerRef: { value: custId }, TxnDate: e.date || undefined, DocNumber: String(e.number || '').slice(0, 21),
    ExpirationDate: e.validUntil || undefined, Line: salesLines(e.priced || []),
    CustomerMemo: e.title ? { value: String(e.title).slice(0, 1000) } : undefined,
  });
  putRecord('estimates', { ...store.collections.estimates[id], qbo: { id: out.Id, syncedAt: new Date().toISOString() } }, user);
  return out;
}
async function pushInvoice(id, user) {
  const i = store.collections.invoices[id]; if (!i) throw new Error('Invoice not found.');
  const custId = i.jobId && store.collections.jobs[i.jobId] ? await pushJob(i.jobId, user) : await pushCustomer(i.customerId, user);
  const lines = i.lines && i.lines.length ? i.lines : [{ desc: i.notes || 'Paving work', qty: 1, price: i.amount, cat: 'General' }];
  const out = await upsertTxn('Invoice', i, {
    CustomerRef: { value: custId }, TxnDate: i.issued || undefined, DueDate: i.due || undefined,
    DocNumber: String(i.number || '').slice(0, 21), Line: salesLines(lines),
    PrivateNote: i.jobId && store.collections.jobs[i.jobId] ? `Job ${store.collections.jobs[i.jobId].number} · ${store.collections.jobs[i.jobId].name}`.slice(0, 4000) : undefined,
  });
  putRecord('invoices', { ...store.collections.invoices[id], qbo: { id: out.Id, syncedAt: new Date().toISOString() }, amount: money2(out.TotalAmt), paid: money2(out.TotalAmt - out.Balance) }, user);
  return out;
}
async function pushTime(ids, user) {
  const done = [], errors = [];
  for (const id of ids) {
    const t = store.collections.time[id];
    try {
      if (!t) throw new Error('Time entry not found.');
      if (t.status !== 'approved') throw new Error('Only approved time is sent to QuickBooks.');
      if (t.qbo && t.qbo.id) { done.push(id); continue; }
      const s = store.collections.staff[t.staffId];
      if (!s || !s.qboEmployeeId) throw new Error(`Link ${s ? s.name : 'this person'} to a QuickBooks employee in Settings → QuickBooks.`);
      const job = store.collections.jobs[t.jobId];
      const custId = job && job.customerId ? await pushJob(job.id, user) : undefined;
      const hrs = Math.max(0, Number(t.hours) || 0), whole = Math.floor(hrs);
      const out = (await qbFetch('POST', 'timeactivity', {
        NameOf: 'Employee', EmployeeRef: { value: s.qboEmployeeId }, TxnDate: t.date,
        Hours: whole, Minutes: Math.round((hrs - whole) * 60),
        CustomerRef: custId ? { value: custId } : undefined,
        Description: [job ? `${job.number} ${job.name}` : '', t.costCode, t.notes].filter(Boolean).join(' · ').slice(0, 4000),
      })).TimeActivity;
      putRecord('time', { ...t, qbo: { id: out.Id, syncedAt: new Date().toISOString() } }, user);
      done.push(id);
    } catch (err) { errors.push({ id, error: err.message }); }
  }
  return { done, errors };
}
async function pullInvoices(user) {
  const synced = Object.values(store.collections.invoices).filter(i => i.qbo && i.qbo.id);
  let updated = 0;
  for (let k = 0; k < synced.length; k += 50) {
    const chunk = synced.slice(k, k + 50);
    const rows = (await qbQuery(`select Id, TotalAmt, Balance from Invoice where Id in (${chunk.map(i => `'${qEsc(i.qbo.id)}'`).join(',')})`)).Invoice || [];
    for (const row of rows) {
      const inv = chunk.find(i => i.qbo.id === row.Id);
      const paid = money2(row.TotalAmt - row.Balance);
      if (inv && (inv.paid !== paid || inv.amount !== money2(row.TotalAmt))) {
        putRecord('invoices', { ...inv, amount: money2(row.TotalAmt), paid, qbo: { ...inv.qbo, pulledAt: new Date().toISOString() } }, user);
        updated++;
      }
    }
  }
  return updated;
}

/* ---------------------------------------------------------------- routes */
const oauthStates = new Map(); // state -> { userId, at }

async function api(req, res, url) {
  const p = url.pathname, m = req.method;
  // CSRF guard: every state-changing call must come from our own page via fetch.
  if (m !== 'GET' && req.headers['x-mp'] !== '1') return fail(res, 403, 'Missing request header.');

  if (p === '/api/health') return json(res, 200, { ok: true, app: 'max-paving-manage', qbo: QB.configured, env: QB.env });

  if (p === '/api/session' && m === 'GET') {
    if (!users.length) return json(res, 200, { needsSetup: true });
    const u = sessionUser(req);
    return u ? json(res, 200, { user: publicUser(u) }) : fail(res, 401, 'Not signed in.');
  }
  if (p === '/api/setup' && m === 'POST') {
    if (users.length) return fail(res, 409, 'Already set up.');
    const b = await body(req);
    if (!b.name || !b.email || !b.password || b.password.length < 10) return fail(res, 400, 'Name, email and a password of at least 10 characters are required.');
    const u = { id: crypto.randomUUID(), name: String(b.name).trim(), email: String(b.email).trim().toLowerCase(), role: 'owner', staffId: '', active: true, created: new Date().toISOString(), ...hashPassword(b.password) };
    users.push(u); persistUsers();
    if (b.seed && typeof b.seed === 'object') importData(b.seed, u);
    startSession(res, u);
    return json(res, 200, { user: publicUser(u) });
  }
  if (p === '/api/login' && m === 'POST') {
    const b = await body(req), email = String(b.email || '').trim().toLowerCase(), key = `${req.socket.remoteAddress}|${email}`;
    if (throttled(key)) return fail(res, 429, 'Too many tries. Wait 15 minutes and try again.');
    const u = users.find(x => x.email === email && x.active !== false);
    if (!u || !checkPassword(String(b.password || ''), u)) { attempts.get(key).push(Date.now()); return fail(res, 401, 'Email or password is wrong.'); }
    attempts.delete(key);
    startSession(res, u);
    return json(res, 200, { user: publicUser(u) });
  }
  if (p === '/api/logout' && m === 'POST') {
    const u = sessionUser(req); if (u) { sessions.delete(u._session); persistSessions(); }
    res.setHeader('Set-Cookie', `mp_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${SECURE ? '; Secure' : ''}`);
    return json(res, 200, { ok: true });
  }

  // Everything below needs a signed-in user.
  const user = sessionUser(req);
  if (!user) return fail(res, 401, 'Not signed in.');
  const role = ROLES[user.role];

  if (p === '/api/password' && m === 'POST') {
    const b = await body(req);
    if (!checkPassword(String(b.current || ''), user)) return fail(res, 400, 'Current password is wrong.');
    if (!b.next || b.next.length < 10) return fail(res, 400, 'Use at least 10 characters.');
    Object.assign(users.find(x => x.id === user.id), hashPassword(b.next)); persistUsers();
    return json(res, 200, { ok: true });
  }

  if (p === '/api/data' && m === 'GET') {
    const out = { seq: store.seq, settings: store.settings, meta: store.meta };
    for (const c of COLLECTIONS) out[c] = canRead(user, c) ? Object.values(store.collections[c]).filter(r => visible(c, r, user)).map(r => redact(c, r, user)) : [];
    return json(res, 200, out);
  }
  if (p === '/api/changes' && m === 'GET') {
    const since = Number(url.searchParams.get('since')) || 0;
    const changes = [];
    for (const c of COLLECTIONS) {
      if (!canRead(user, c)) continue;
      for (const r of Object.values(store.collections[c])) if (r._seq > since && visible(c, r, user)) changes.push({ c, rec: redact(c, r, user) });
    }
    const deleted = store.tombstones.filter(t => t._seq > since && canRead(user, t.c)).map(t => ({ c: t.c, id: t.id }));
    return json(res, 200, { seq: store.seq, changes, deleted, settings: store.meta.settingsSeq > since ? store.settings : undefined });
  }
  let mm;
  if ((mm = p.match(/^\/api\/rec\/([a-z]+)\/([\w-]+)$/))) {
    const [, c, id] = mm;
    if (!COLLECTIONS.includes(c)) return fail(res, 404, 'Unknown list.');
    if (m === 'PUT') {
      const b = await body(req), rec = b.rec;
      if (!rec || rec.id !== id) return fail(res, 400, 'Bad record.');
      const prev = store.collections[c][id];
      if (!canWrite(user, c, rec) || (prev && !canWrite(user, c, prev))) return fail(res, 403, 'You don’t have access to change this.');
      const keep = {};
      // Fields only the server sets, or that this role can't see: keep the stored values.
      if (prev) { ['qbo'].forEach(k => { if (prev[k] !== undefined) keep[k] = prev[k]; }); if (!role.money && c === 'staff') { keep.rate = prev.rate; keep.qboEmployeeId = prev.qboEmployeeId; } if (user.role === 'crew' && c === 'jobs') return fail(res, 403, 'Read only.'); }
      if (c === 'time' && rec.status === 'approved' && !(prev && prev.status === 'approved') && !['owner', 'office'].includes(user.role)) return fail(res, 403, 'Only the office can approve time.');
      // A daily report moves its job forward even for foremen who can't edit jobs:
      // % complete, "this phase is finished", and extra work → a pending change order. (Same rules as jobflow.applyLog.)
      if (c === 'logs' && store.collections.jobs[rec.jobId]) {
        const job = JSON.parse(JSON.stringify(store.collections.jobs[rec.jobId]));
        let changed = false;
        if (rec.pct !== '' && rec.pct != null && Number(rec.pct) !== Number(job.pct)) { job.pct = Math.max(0, Math.min(100, Number(rec.pct) || 0)); changed = true; }
        const ph = rec.phaseDone && rec.phaseId && (job.phases || []).find(x => x.id === rec.phaseId);
        if (ph && ph.status !== 'Done') { ph.status = 'Done'; if (!ph.start) { ph.start = rec.date; ph.end = rec.date; } changed = true; }
        if (rec.extraWork && rec.extraDesc && !rec.coId) {
          const co = { id: crypto.randomUUID(), number: `CO-${(job.changes || []).length + 1}`, desc: String(rec.extraDesc).slice(0, 2000), amount: 0, cost: 0, status: 'Pending', requested: rec.date, source: 'field', logId: rec.id };
          job.changes = [...(job.changes || []), co]; rec.coId = co.id; changed = true;
        }
        if ((job.phases || []).length && job.phases.every(x => x.status === 'Done') && job.status !== 'Complete') { job.status = 'Complete'; job.completed = job.completed || rec.date; job.pct = 100; changed = true; }
        if (changed) putRecord('jobs', job, user);
      }
      const saved = putRecord(c, { ...rec, ...keep }, user);
      return json(res, 200, { rec: redact(c, saved, user), seq: store.seq });
    }
    if (m === 'DELETE') {
      const prev = store.collections[c][id];
      if (prev && !canWrite(user, c, prev)) return fail(res, 403, 'You don’t have access to delete this.');
      if (prev) deleteRecord(c, id);
      return json(res, 200, { ok: true, seq: store.seq });
    }
  }
  if (p === '/api/settings' && m === 'PUT') {
    if (!role.settings) return fail(res, 403, 'Only the owner or office can change settings.');
    const b = await body(req);
    store.settings = b.settings; store.meta.settingsSeq = ++store.seq; persist();
    return json(res, 200, { ok: true, seq: store.seq });
  }
  if (p === '/api/meta' && m === 'PUT') {
    if (!role.settings) return fail(res, 403, 'Not allowed.');
    const b = await body(req); store.meta = { ...store.meta, ...b.meta, settingsSeq: ++store.seq }; persist();
    return json(res, 200, { ok: true, seq: store.seq });
  }
  if (p === '/api/import' && m === 'POST') {
    if (user.role !== 'owner') return fail(res, 403, 'Only the owner can import data.');
    importData(await body(req), user);
    return json(res, 200, { ok: true, seq: store.seq });
  }
  if (p === '/api/export' && m === 'GET') {
    if (user.role !== 'owner') return fail(res, 403, 'Only the owner can export everything.');
    const out = { settings: store.settings, meta: store.meta };
    for (const c of COLLECTIONS) out[c] = Object.values(store.collections[c]);
    return json(res, 200, out);
  }

  // Users (owner only)
  if (p === '/api/users' && m === 'GET') {
    if (!role.users) return fail(res, 403, 'Owner only.');
    return json(res, 200, { users: users.map(publicUser), roles: Object.fromEntries(Object.entries(ROLES).map(([k, v]) => [k, v.label])) });
  }
  if (p === '/api/users' && m === 'POST') {
    if (!role.users) return fail(res, 403, 'Owner only.');
    const b = await body(req), email = String(b.email || '').trim().toLowerCase();
    if (!b.name || !email || !ROLES[b.role]) return fail(res, 400, 'Name, email and role are required.');
    if (!b.password || b.password.length < 10) return fail(res, 400, 'Give them a temporary password of at least 10 characters.');
    if (users.some(u => u.email === email)) return fail(res, 409, 'That email already has a login.');
    const u = { id: crypto.randomUUID(), name: String(b.name).trim(), email, role: b.role, staffId: b.staffId || '', active: true, created: new Date().toISOString(), ...hashPassword(b.password) };
    users.push(u); persistUsers();
    return json(res, 200, { user: publicUser(u) });
  }
  if ((mm = p.match(/^\/api\/users\/([\w-]+)$/)) && m === 'PATCH') {
    if (!role.users) return fail(res, 403, 'Owner only.');
    const u = users.find(x => x.id === mm[1]); if (!u) return fail(res, 404, 'No such user.');
    const b = await body(req);
    if (u.id === user.id && (b.role && b.role !== 'owner' || b.active === false)) return fail(res, 400, 'You can’t remove your own owner access.');
    if (b.name) u.name = String(b.name).trim();
    if (b.role && ROLES[b.role]) u.role = b.role;
    if (b.staffId !== undefined) u.staffId = b.staffId;
    if (b.active !== undefined) { u.active = !!b.active; if (!u.active) for (const [k, s] of sessions) if (s.userId === u.id) sessions.delete(k); persistSessions(); }
    if (b.password) { if (b.password.length < 10) return fail(res, 400, 'Use at least 10 characters.'); Object.assign(u, hashPassword(b.password)); }
    persistUsers();
    return json(res, 200, { user: publicUser(u) });
  }

  // QuickBooks
  if (p.startsWith('/api/qbo/')) {
    if (p === '/api/qbo/status' && m === 'GET') {
      const t = getTokens();
      return json(res, 200, { configured: QB.configured, env: QB.env, connected: !!t, realmId: t && t.realmId, company: qbo.info, refreshExpires: t && t.refreshExpires, log: role.qbo ? qbo.log : [], redirect: QB.redirect });
    }
    if (!role.qbo) return fail(res, 403, 'Only the owner or office can use QuickBooks.');
    if (p === '/api/qbo/connect' && m === 'GET') {
      if (!QB.configured) return fail(res, 400, 'Add QBO_CLIENT_ID and QBO_CLIENT_SECRET to the server .env first.');
      const state = crypto.randomBytes(16).toString('hex');
      oauthStates.set(state, { userId: user.id, at: Date.now() });
      const q = new URLSearchParams({ client_id: QB.clientId, response_type: 'code', scope: 'com.intuit.quickbooks.accounting', redirect_uri: QB.redirect, state });
      res.writeHead(302, { Location: `${QB.authUrl}?${q}` }); return res.end();
    }
    if (p === '/api/qbo/callback' && m === 'GET') {
      const state = url.searchParams.get('state'), s = oauthStates.get(state);
      oauthStates.delete(state);
      if (!s || s.userId !== user.id || Date.now() - s.at > 10 * 60e3) return redirectBack(res, 'error', 'The QuickBooks sign-in expired. Try Connect again.');
      if (url.searchParams.get('error')) return redirectBack(res, 'error', 'QuickBooks connection was cancelled.');
      try {
        const j = await tokenRequest({ grant_type: 'authorization_code', code: url.searchParams.get('code'), redirect_uri: QB.redirect });
        storeTokenResponse(j, url.searchParams.get('realmId'));
        const info = (await qbFetch('GET', `companyinfo/${getTokens().realmId}`)).CompanyInfo || {};
        qbo.info = { name: info.CompanyName, country: info.Country, connectedAt: new Date().toISOString(), connectedBy: user.name };
        qbLog(`Connected to ${info.CompanyName || 'QuickBooks'} (${QB.env}).`);
        return redirectBack(res, 'connected');
      } catch (err) { qbLog(err.message, false); return redirectBack(res, 'error', err.message); }
    }
    if (p === '/api/qbo/disconnect' && m === 'POST') {
      const t = getTokens();
      if (t) await fetch(QB.revokeUrl, { method: 'POST', headers: { Authorization: basic(), Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ token: t.refresh }) }).catch(() => {});
      qbo.tokens = null; qbo.info = null; persistQbo(); qbLog('Disconnected.');
      return json(res, 200, { ok: true });
    }
    try {
      if (p === '/api/qbo/lists' && m === 'GET') {
        const [items, emps] = await Promise.all([
          qbQuery("select Id, Name, Type from Item where Active = true MAXRESULTS 1000"),
          qbQuery('select Id, DisplayName from Employee where Active = true MAXRESULTS 1000'),
        ]);
        return json(res, 200, {
          items: (items.Item || []).filter(i => ['Service', 'NonInventory', 'Inventory'].includes(i.Type)).map(i => ({ id: i.Id, name: i.Name, type: i.Type })),
          employees: (emps.Employee || []).map(e => ({ id: e.Id, name: e.DisplayName })),
        });
      }
      if (p === '/api/qbo/push' && m === 'POST') {
        const b = await body(req);
        let out;
        if (b.kind === 'customer') out = { id: await pushCustomer(b.id, user) };
        else if (b.kind === 'estimate') out = await pushEstimate(b.id, user);
        else if (b.kind === 'invoice') out = await pushInvoice(b.id, user);
        else if (b.kind === 'time') { out = await pushTime(b.ids || [], user); qbLog(`Sent ${out.done.length} time entr${out.done.length === 1 ? 'y' : 'ies'}${out.errors.length ? `, ${out.errors.length} skipped` : ''}.`, !out.errors.length); return json(res, 200, { ...out, seq: store.seq }); }
        else return fail(res, 400, 'Unknown sync type.');
        qbLog(`Sent ${b.kind} ${b.label || ''}`.trim() + '.');
        return json(res, 200, { ok: true, qboId: out.Id || out.id, seq: store.seq });
      }
      if (p === '/api/qbo/pull' && m === 'POST') {
        const n = await pullInvoices(user);
        qbLog(`Checked invoice payments — ${n} updated.`);
        return json(res, 200, { updated: n, seq: store.seq });
      }
    } catch (err) {
      qbLog(err.message, false);
      return fail(res, 502, err.message);
    }
  }
  return fail(res, 404, 'Not found.');
}
function redirectBack(res, status, msg) {
  res.writeHead(302, { Location: `/#settings/quickbooks?qbo=${status}${msg ? '&msg=' + encodeURIComponent(msg) : ''}` });
  res.end();
}
function importData(d, user) {
  if (!d || typeof d !== 'object') return;
  if (d.settings) { store.settings = d.settings; store.meta.settingsSeq = store.seq + 1; }
  if (d.meta) store.meta = { ...store.meta, ...d.meta };
  for (const c of COLLECTIONS) if (Array.isArray(d[c])) for (const r of d[c]) if (r && r.id) putRecord(c, r, user);
  persist();
}

/* ---------------------------------------------------------------- server */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, PUBLIC_URL);
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    if (req.method !== 'GET' && req.method !== 'HEAD') return fail(res, 405, 'Method not allowed');
    return await serveStatic(req, res, url.pathname);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) fail(res, err.code && err.code < 600 ? err.code : 500, err.code ? err.message : 'Server error.');
  }
});
server.listen(PORT, () => {
  console.log(`Max Paving Manage running at ${PUBLIC_URL} (data: ${DATA_DIR})`);
  console.log(QB.configured ? `QuickBooks: ${QB.env} app configured, redirect URI ${QB.redirect}` : 'QuickBooks: not configured (add QBO_CLIENT_ID / QBO_CLIENT_SECRET to manage/server/.env)');
});
// Pick up payments recorded in QuickBooks every 15 minutes (enough for a company this size; no webhook needed).
setInterval(() => { if (getTokens()) pullInvoices(null).catch(err => qbLog(`Auto payment check: ${err.message}`, false)); }, 15 * 60e3);
