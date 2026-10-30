/* Shared helpers, lists and icons. No state lives here. */

export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const num = v => { const n = parseFloat(String(v ?? '').replace(/[$,]/g, '')); return isFinite(n) ? n : 0; };
export const round = (n, d = 2) => Math.round(num(n) * 10 ** d) / 10 ** d;
export const money = (n, cents) => num(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });
export const fix = (n, d = 1) => num(n).toLocaleString('en-US', { maximumFractionDigits: d });
export const pct = (n, d = 0) => `${fix(num(n) * 100, d)}%`;

/* dates — all local, YYYY-MM-DD */
export const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const today = () => iso(new Date());
export const parse = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
export const addMonths = (s, n) => { const d = parse(s); d.setMonth(d.getMonth() + n); return iso(d); };
export const daysUntil = s => Math.round((parse(s) - parse(today())) / 864e5);
export const fmtDate = s => s ? parse(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
export const shortDate = s => s ? parse(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
export const weekday = s => parse(s).toLocaleDateString('en-US', { weekday: 'short' });
export const monday = s => { const d = parse(s); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return iso(d); };
export const isWeekend = s => [0, 6].includes(parse(s).getDay());
export const inWords = n => n === 0 ? 'today' : n === 1 ? 'tomorrow' : n === -1 ? 'yesterday' : n > 0 ? `in ${n} days` : `${-n} days ago`;
export const fmtTime = ts => ts ? new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
export const hoursBetween = (a, b) => Math.max(0, (new Date(b) - new Date(a)) / 36e5);
export const fmtHours = h => { const m = Math.round(num(h) * 60); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`; };
export const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };

/* lists — lead/website lists match the quote form on maxpavingkc.com */
export const SERVICES = ['Commercial Concrete', 'Residential Concrete', 'Concrete Repair & Replacement', 'Commercial Asphalt', 'Residential Asphalt', 'Asphalt Mill & Overlay', 'Asphalt Patch Repair', 'Excavation, Site Prep & Drainage', 'Not sure yet'];
export const PROPERTY_TYPES = ['Commercial', 'Residential', 'Industrial / Warehouse', 'HOA / Multifamily', 'Municipal / Government', 'Church / Nonprofit'];
export const CUSTOMER_TYPES = ['Commercial', 'Industrial / Warehouse', 'Residential', 'HOA / Multifamily', 'Municipal / Government', 'General contractor', 'Church / Nonprofit'];
export const TIMELINES = ['As soon as possible', 'Within 30 days', '1–3 months', '3+ months', 'Just exploring'];
export const LEAD_SOURCES = ['Website form', 'Phone call', 'Referral', 'Repeat customer', 'Bid invitation', 'Marketing outreach', 'Google', 'Other'];
export const LEAD_STAGES = ['New', 'Contacted', 'Site visit', 'Proposal sent', 'Won', 'Lost'];
export const UNITS = ['SY', 'SF', 'LF', 'CY', 'TON', 'GAL', 'EA', 'LS', 'HR', 'DAY'];
export const CATS = ['Asphalt', 'Concrete', 'Excavation', 'General'];
export const COST_TYPES = ['Material', 'Labor', 'Equipment', 'Trucking', 'Subcontract', 'Other'];
export const COST_CODES = ['Asphalt paving', 'Milling', 'Patching', 'Concrete flatwork', 'Curb & gutter', 'Excavation & grading', 'Base & compaction', 'Trucking', 'Mobilization', 'Shop / yard', 'Travel', 'Equipment repair'];
export const JOB_STATUSES = ['Scheduled', 'In progress', 'Punch list', 'Complete', 'On hold'];
export const BUSINESS_TYPES = ['Office / office park', 'Retail / shopping center', 'Restaurant', 'Industrial / warehouse', 'Distribution / logistics', 'Medical / healthcare', 'Church / place of worship', 'School / education', 'HOA / apartments', 'Hotel / hospitality', 'Auto dealer / service', 'Self storage', 'Municipal / government', 'General contractor', 'Property management', 'Other'];
export const P_STATUSES = ['Not contacted', 'Contacted', 'Interested', 'Not interested', 'Converted'];
export const P_COLOR = { 'Not contacted': '#8a8a85', Contacted: '#2563c9', Interested: '#e5a800', 'Not interested': '#c4351f', Converted: '#1f8a4c' };
export const P_SOURCES = ['Drive-by', 'Google Maps', 'Referral', 'Bid list / plan room', 'Networking event', 'Past relationship', 'Other'];
export const P_METHODS = ['Phone call', 'Voicemail', 'Email', 'In person', 'Mailer / door hanger', 'LinkedIn', 'Other'];
export const CERTS = ['OSHA 10', 'OSHA 30', 'CDL Class A', 'CDL Class B', 'DOT medical card', 'First aid / CPR', 'Flagger', 'Forklift', 'ACI concrete field tech', 'Other'];

export const TONE = {
  New: 'blue', Contacted: 'yellow', 'Site visit': 'yellow', 'Proposal sent': 'yellow', Won: 'green', Lost: 'gray',
  Draft: 'gray', Sent: 'yellow', Accepted: 'green', Declined: 'gray',
  Scheduled: 'blue', 'In progress': 'yellow', 'Punch list': 'yellow', Complete: 'green', 'On hold': 'gray',
  Open: 'blue', Partial: 'yellow', Paid: 'green', Overdue: 'red',
  Available: 'green', 'In use': 'blue', 'Down for repair': 'red', 'Service due': 'yellow',
  Active: 'green', Inactive: 'gray', Current: 'green', Expiring: 'yellow', Expired: 'red',
  Go: 'green', Watch: 'yellow', No: 'red',
  open: 'yellow', submitted: 'blue', approved: 'green', Synced: 'green', 'Not synced': 'gray',
};
export const badge = (s, label) => s ? `<span class="badge badge--${TONE[s] || 'gray'}">${esc(label || s)}</span>` : '';
export const pstat = s => `<span class="pstat" style="--c:${P_COLOR[s] || '#8a8a85'}">${esc(s)}</span>`;
export const initials = name => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

const ICONS = {
  home: '<path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  hammer: '<path d="m15 12-8.5 8.5a2.1 2.1 0 0 1-3-3L12 9"/><path d="M17.6 15 22 10.6l-6.6-6.6a3 3 0 0 0-4.2 0L9.6 5.6 13 9l2 2z"/>',
  clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 12h6M9 16h6"/>',
  hardhat: '<path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1z"/><path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5M4 15v-3a6 6 0 0 1 6-6M14 6a6 6 0 0 1 6 6v3"/>',
  truck: '<path d="M10 17h4V5H2v12h3M14 9h4l4 4v4h-3"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="2.5"/>',
  dollar: '<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  badge: '<circle cx="12" cy="8" r="6"/><path d="M15.5 13 17 22l-5-3-5 3 1.5-9"/>',
  calc: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14v4M8 18h.01M12 18h.01"/>',
  map: '<path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4z"/><path d="M8 2v16M16 6v16"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  back: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  play: '<path d="M6 4v16l14-8z"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="1"/>',
  ruler: '<path d="M21.3 8.7 8.7 21.3a1 1 0 0 1-1.4 0l-4.6-4.6a1 1 0 0 1 0-1.4L15.3 2.7a1 1 0 0 1 1.4 0l4.6 4.6a1 1 0 0 1 0 1.4z"/><path d="m7.5 10.5 2 2M10.5 7.5l2 2M13.5 4.5l2 2M4.5 13.5l2 2"/>',
  print: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  sync: '<path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  qb: '<circle cx="12" cy="12" r="10"/><path d="M8.5 8v8h-1a3 3 0 0 1 0-6H9M15.5 16V8h1a3 3 0 0 1 0 6H15"/>',
};
export const icon = (n, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;
