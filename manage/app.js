/* ==========================================================================
   Max Paving — Manage panel
   Plain JS, no build step. Everything is saved in this browser (localStorage);
   use Settings → Export to back it up. See README.md for the shared, logged-in
   version this is meant to grow into.
   ========================================================================== */
(() => {
  'use strict';

  /* ---------------------------------------------------------------- helpers */
  const KEY = 'maxpaving.manage.v1';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const num = v => { const n = parseFloat(String(v ?? '').replace(/[$,]/g, '')); return isFinite(n) ? n : 0; };
  const money = (n, cents) => num(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });
  const fix = (n, d = 1) => num(n).toLocaleString('en-US', { maximumFractionDigits: d });
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = () => iso(new Date());
  const parse = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  const addMonths = (s, n) => { const d = parse(s); d.setMonth(d.getMonth() + n); return iso(d); };
  const daysUntil = s => Math.round((parse(s) - parse(today())) / 864e5);
  const fmtDate = s => s ? parse(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
  const shortDate = s => s ? parse(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
  const weekday = s => parse(s).toLocaleDateString('en-US', { weekday: 'short' });
  const monday = s => { const d = parse(s); const w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return iso(d); };
  const inWords = n => n === 0 ? 'today' : n === 1 ? 'tomorrow' : n === -1 ? 'yesterday' : n > 0 ? `in ${n} days` : `${-n} days ago`;

  /* ---------------------------------------------------------------- lists */
  // Same choices as the quote form on maxpavingkc.com, so web leads map 1:1.
  const SERVICES = ['Commercial Concrete', 'Residential Concrete', 'Concrete Repair & Replacement', 'Commercial Asphalt', 'Residential Asphalt', 'Asphalt Mill & Overlay', 'Asphalt Patch Repair', 'Excavation, Site Prep & Drainage', 'Not sure yet'];
  const PROPERTY_TYPES = ['Commercial', 'Residential', 'Industrial / Warehouse', 'HOA / Multifamily', 'Municipal / Government', 'Church / Nonprofit'];
  const CUSTOMER_TYPES = ['Commercial', 'Industrial / Warehouse', 'Residential', 'HOA / Multifamily', 'Municipal / Government', 'General contractor', 'Church / Nonprofit'];
  const TIMELINES = ['As soon as possible', 'Within 30 days', '1–3 months', '3+ months', 'Just exploring'];
  const UNITS = ['SY', 'SF', 'LF', 'CY', 'TON', 'EA', 'LS', 'HR', 'DAY'];
  const WORK_TYPES = ['Asphalt', 'Concrete', 'Excavation', 'Mixed'];
  // Marketing prospects
  const BUSINESS_TYPES = ['Office / office park', 'Retail / shopping center', 'Restaurant', 'Industrial / warehouse', 'Distribution / logistics', 'Medical / healthcare', 'Church / place of worship', 'School / education', 'HOA / apartments', 'Hotel / hospitality', 'Auto dealer / service', 'Self storage', 'Municipal / government', 'General contractor', 'Property management', 'Other'];
  const P_STATUSES = ['Not contacted', 'Contacted', 'Interested', 'Not interested', 'Converted'];
  const P_COLOR = { 'Not contacted': '#8a8a85', Contacted: '#2563c9', Interested: '#e5a800', 'Not interested': '#c4351f', Converted: '#1f8a4c' };
  const P_SOURCES = ['Drive-by', 'Google Maps', 'Referral', 'Bid list / plan room', 'Networking event', 'Past relationship', 'Other'];
  const P_METHODS = ['Phone call', 'Voicemail', 'Email', 'In person', 'Mailer / door hanger', 'LinkedIn', 'Other'];
  const pstat = s => `<span class="pstat" style="--c:${P_COLOR[s] || '#8a8a85'}">${esc(s)}</span>`;

  const TONE = {
    New: 'blue', Contacted: 'yellow', 'Site visit': 'yellow', 'Proposal sent': 'yellow', Won: 'green', Lost: 'gray',
    Draft: 'gray', Sent: 'yellow', Accepted: 'green', Declined: 'gray',
    Scheduled: 'blue', 'In progress': 'yellow', 'Punch list': 'yellow', Complete: 'green', 'On hold': 'gray',
    Open: 'blue', Partial: 'yellow', Paid: 'green', Overdue: 'red',
    Available: 'green', 'In use': 'blue', 'Down for repair': 'red', 'Service due': 'yellow',
    Active: 'green', Inactive: 'gray', Current: 'green', Expiring: 'yellow', Expired: 'red',
    Go: 'green', Watch: 'yellow', No: 'red',
  };
  const badge = s => s ? `<span class="badge badge--${TONE[s] || 'gray'}">${esc(s)}</span>` : '';

  const ICONS = {
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
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  };
  const icon = n => `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;

  const NAV = [
    ['Overview', [['dashboard', 'Dashboard', 'grid'], ['schedule', 'Schedule', 'calendar']]],
    ['Sales', [['marketing', 'Marketing', 'map'], ['leads', 'Leads', 'inbox'], ['estimates', 'Estimates', 'file'], ['customers', 'Customers', 'users']]],
    ['Field', [['jobs', 'Jobs', 'hammer'], ['logs', 'Daily logs', 'clipboard'], ['staff', 'Crew & staff', 'hardhat'], ['equipment', 'Equipment', 'truck']]],
    ['Office', [['invoices', 'Invoices', 'dollar'], ['docs', 'Compliance', 'shield'], ['warranties', 'Warranties', 'badge']]],
    ['Tools', [['calc', 'Calculators', 'calc'], ['settings', 'Settings', 'gear']]],
  ];

  /* ---------------------------------------------------------------- data */
  const COLLECTIONS = ['customers', 'leads', 'estimates', 'jobs', 'logs', 'invoices', 'staff', 'equipment', 'docs', 'prospects'];

  const DEFAULT_SETTINGS = () => ({
    company: { name: 'Max Paving', phone: '(816) 220-7777', email: 'maxpavingkc@gmail.com', address: '29803 SW Eagles Pkwy, Grain Valley, MO 64029' },
    crews: ['Asphalt crew', 'Concrete crew', 'Excavation crew'],
    estimators: ['Wendell Gourley', 'Daniel Cushman', 'Gary Stucker'],
    hmaDensity: 145, baseDensity: 140, wastePct: 5, concreteWastePct: 8,
    asphaltMinF: 50, concreteMinF: 40, rainMaxPct: 50,
    lat: 39.0102, lon: -94.2902,
    warrantyMonths: 12, termsDays: 30, proposalValidDays: 30,
    sampleRates: true,
    // Sample unit rates so the demo estimates add up. Replace with real numbers in Settings.
    priceBook: [
      ['Asphalt', 'Mill existing asphalt (2")', 'SY', 3.5],
      ['Asphalt', 'Asphalt surface course, 2" compacted', 'SY', 18],
      ['Asphalt', 'Asphalt base course, 4" compacted', 'SY', 32],
      ['Asphalt', 'Asphalt patch, remove & replace', 'SF', 9],
      ['Asphalt', 'Tack coat', 'SY', 0.75],
      ['Concrete', 'Concrete paving, 6"', 'SF', 11],
      ['Concrete', 'Heavy-duty concrete, 8" (truck lanes)', 'SF', 15],
      ['Concrete', 'Concrete sidewalk, 4"', 'SF', 9],
      ['Concrete', 'Curb & gutter', 'LF', 38],
      ['Concrete', 'Concrete pad (HVAC / dumpster)', 'SF', 12],
      ['Concrete', 'ADA curb ramp', 'EA', 2400],
      ['Concrete', 'Remove & dispose existing concrete', 'SF', 3],
      ['Excavation', 'Excavation & haul-off', 'CY', 38],
      ['Excavation', 'Aggregate base, 6" compacted', 'SY', 9],
      ['Excavation', 'Fine grading & proof roll', 'SY', 2.5],
      ['Excavation', 'Catch basin / inlet', 'EA', 3800],
      ['Excavation', 'French drain', 'LF', 42],
      ['General', 'Mobilization', 'LS', 1500],
      ['General', 'Traffic control & signage', 'LS', 750],
    ].map(([cat, name, unit, price]) => ({ id: uid(), cat, name, unit, price })),
  });

  // Invented businesses pinned around the metro so the map has something to show.
  function sampleProspects() {
    const t = today(), d = n => addDays(t, n);
    const P = (company, businessType, city, state, lat, lng, contactName, phone, status, extra = {}) => ({
      id: uid(), company, businessType, website: '', address: '', city, state, zip: '', lat, lng, contactName, contactTitle: '', phone, email: '',
      status, interest: '', estValue: '', source: 'Drive-by', nextFollowUp: '', lastContact: '', notes: '', activity: [], created: d(-21), leadId: '', sample: true, ...extra,
    });
    const A = (n, method, outcome, notes) => ({ id: uid(), date: d(n), method, outcome, notes });
    return [
      P('Harlan Logistics Park', 'Distribution / logistics', 'Kansas City', 'MO', 39.1405, -94.5302, 'Facilities manager', '(816) 555-0201', 'Not contacted', { interest: 'Commercial Concrete', notes: 'Dock aprons spalling on the east building. Spotted from I-435.' }),
      P('Brightwater Dental Group', 'Medical / healthcare', 'Lee\'s Summit', 'MO', 38.9195, -94.3755, 'Office manager', '(816) 555-0214', 'Contacted', { interest: 'Asphalt Patch Repair', lastContact: d(-6), nextFollowUp: t, activity: [A(-6, 'Phone call', 'Contacted', 'Spoke with the office manager. The owner decides — call back next week.')] }),
      P('Cedar Crest Apartments', 'HOA / apartments', 'Independence', 'MO', 39.0868, -94.4087, 'Property manager', '(816) 555-0226', 'Interested', { interest: 'Asphalt Mill & Overlay', estValue: 85000, source: 'Referral', lastContact: d(-3), nextFollowUp: d(4), activity: [A(-3, 'In person', 'Interested', 'Walked the lot with the manager. Wants pricing for a 2-phase overlay next spring.'), A(-10, 'Email', 'Contacted', 'Sent intro email + project photos.')] }),
      P('Prairie Fire Grill', 'Restaurant', 'Blue Springs', 'MO', 39.0228, -94.2702, 'Owner', '(816) 555-0233', 'Not contacted', { interest: 'Asphalt Patch Repair', notes: 'Potholes at the drive-thru entrance.' }),
      P('Eastgate Self Storage', 'Self storage', 'Grain Valley', 'MO', 39.0121, -94.2105, 'Site manager', '(816) 555-0238', 'Not contacted', { interest: 'Commercial Concrete' }),
      P('Northpoint Office Center', 'Office / office park', 'Overland Park', 'KS', 38.9301, -94.6652, 'Building engineer', '(913) 555-0247', 'Contacted', { interest: 'Concrete Repair & Replacement', source: 'Google Maps', lastContact: d(-12), nextFollowUp: d(-2), activity: [A(-12, 'Voicemail', 'Contacted', 'Left voicemail for the building engineer.')] }),
      P('Cornerstone Fellowship', 'Church / place of worship', 'Olathe', 'KS', 38.8862, -94.7980, 'Facilities committee', '(913) 555-0252', 'Not interested', { lastContact: d(-15), activity: [A(-15, 'Phone call', 'Not interested', 'Lot was redone two years ago. Check back in 2028.')] }),
      P('Ridgeview Commerce Yard', 'Industrial / warehouse', 'Lenexa', 'KS', 38.9601, -94.7712, 'Operations', '(913) 555-0259', 'Not contacted', { interest: 'Commercial Concrete', source: 'Bid list / plan room' }),
      P('Midtown Auto Center', 'Auto dealer / service', 'Raytown', 'MO', 39.0040, -94.4562, 'Service manager', '(816) 555-0264', 'Converted', { interest: 'Commercial Asphalt', lastContact: d(-8), activity: [A(-8, 'Converted', 'Converted', 'Turned into a lead.')] }),
      P('Summit Shops Plaza', 'Retail / shopping center', 'Lee\'s Summit', 'MO', 38.9402, -94.4021, 'Leasing office', '(816) 555-0271', 'Not contacted', { interest: 'Asphalt Mill & Overlay' }),
      P('Lakeside Hotel & Suites', 'Hotel / hospitality', 'Kansas City', 'MO', 39.2051, -94.6011, 'General manager', '(816) 555-0283', 'Interested', { interest: 'Commercial Asphalt', estValue: 42000, lastContact: d(-2), nextFollowUp: d(1), activity: [A(-2, 'Email', 'Interested', 'Wants a proposal before their budget meeting.')] }),
    ];
  }

  function seed() {
    const t = today(), d = n => addDays(t, n), S = { sample: true };
    const settings = DEFAULT_SETTINGS();
    const L = (name, qty) => { const p = settings.priceBook.find(x => x.name === name); return { desc: p.name, qty, unit: p.unit, price: p.price }; };
    return {
      v: 1,
      meta: { sample: true, created: t, prospectsSeeded: true },
      settings,
      prospects: sampleProspects(),
      customers: [
        { id: 'c1', name: 'Oakview Office Park', type: 'Commercial', contact: 'Dana (property manager)', phone: '(816) 555-0142', email: 'dana@example.com', address: 'Lee\'s Summit, MO', ...S },
        { id: 'c2', name: 'Riverside Self Storage', type: 'Commercial', contact: 'Front office', phone: '(816) 555-0177', email: '', address: 'Independence, MO', ...S },
        { id: 'c3', name: 'Hillcrest Community Church', type: 'Church / Nonprofit', contact: 'Facilities committee', phone: '(816) 555-0118', email: '', address: 'Blue Springs, MO', ...S },
        { id: 'c4', name: 'Summit Builders', type: 'General contractor', contact: 'Project manager', phone: '(913) 555-0190', email: 'pm@example.com', address: 'Olathe, KS', ...S },
        { id: 'c5', name: 'Miller residence', type: 'Residential', contact: 'Homeowner', phone: '(816) 555-0163', email: '', address: 'Grain Valley, MO', ...S },
        { id: 'c6', name: 'Prairie Ridge HOA', type: 'HOA / Multifamily', contact: 'Board treasurer', phone: '(913) 555-0104', email: '', address: 'Overland Park, KS', ...S },
      ],
      leads: [
        { id: 'l1', created: t, name: 'Sam Patel', company: 'Northland Warehouse', phone: '(816) 555-0129', email: '', service: 'Commercial Concrete', propertyType: 'Industrial / Warehouse', address: 'Riverside, MO', timeline: 'Within 30 days', source: 'Website form', assignedTo: '', siteVisit: '', status: 'New', notes: 'Dock apron cracking at two doors. Asked about phasing so receiving stays open.', ...S },
        { id: 'l2', created: d(-2), name: 'Lisa Grant', company: '', phone: '(816) 555-0185', email: '', service: 'Residential Concrete', propertyType: 'Residential', address: 'Lee\'s Summit, MO', timeline: '1–3 months', source: 'Referral', assignedTo: 'Wendell Gourley', siteVisit: d(2), status: 'Site visit', notes: 'Driveway replacement, ~900 SF. Referred by Miller residence.', ...S },
        { id: 'l3', created: d(-4), name: 'Facilities office', company: 'Eastside Medical Building', phone: '(816) 555-0151', email: '', service: 'Asphalt Mill & Overlay', propertyType: 'Commercial', address: 'Kansas City, MO', timeline: '3+ months', source: 'Phone call', assignedTo: 'Daniel Cushman', siteVisit: '', status: 'Contacted', notes: 'Wants a two-year phased plan to fit their budget cycle.', ...S },
        { id: 'l4', created: d(-12), name: 'Board treasurer', company: 'Prairie Ridge HOA', phone: '(913) 555-0104', email: '', service: 'Concrete Repair & Replacement', propertyType: 'HOA / Multifamily', address: 'Overland Park, KS', timeline: 'Within 30 days', source: 'Repeat customer', assignedTo: 'Wendell Gourley', siteVisit: d(-10), status: 'Proposal sent', notes: '', ...S },
        { id: 'l5', created: d(-30), name: 'Chris Long', company: '', phone: '(816) 555-0108', email: '', service: 'Residential Asphalt', propertyType: 'Residential', address: 'Oak Grove, MO', timeline: 'Just exploring', source: 'Website form', assignedTo: 'Daniel Cushman', siteVisit: '', status: 'Lost', notes: 'Went with a sealcoat-only company.', ...S },
      ],
      estimates: [
        { id: 'e1', number: 'E-1001', title: 'Parking lot mill & overlay', customerId: 'c1', address: 'Lee\'s Summit, MO', estimator: 'Daniel Cushman', date: d(-21), status: 'Accepted', notes: 'Work in two phases so half the lot stays open.', lines: [L('Mobilization', 1), L('Mill existing asphalt (2")', 2800), L('Tack coat', 2800), L('Asphalt surface course, 2" compacted', 2800), L('Traffic control & signage', 1)], ...S },
        { id: 'e2', number: 'E-1002', title: 'Driveway & walk panel replacement', customerId: 'c6', address: 'Overland Park, KS', estimator: 'Wendell Gourley', date: d(-9), status: 'Sent', notes: '', lines: [L('Remove & dispose existing concrete', 1400), L('Concrete paving, 6"', 1100), L('Concrete sidewalk, 4"', 300)], ...S },
        { id: 'e3', number: 'E-1003', title: 'Dumpster pad & approach', customerId: 'c2', address: 'Independence, MO', estimator: 'Wendell Gourley', date: d(-1), status: 'Draft', notes: '', lines: [L('Excavation & haul-off', 22), L('Aggregate base, 6" compacted', 70), L('Heavy-duty concrete, 8" (truck lanes)', 640)], ...S },
        { id: 'e4', number: 'E-1004', title: 'Sidewalk & ADA ramp', customerId: 'c3', address: 'Blue Springs, MO', estimator: 'Wendell Gourley', date: d(-15), status: 'Accepted', notes: '', lines: [L('Remove & dispose existing concrete', 420), L('Concrete sidewalk, 4"', 420), L('ADA curb ramp', 1)], ...S },
      ],
      jobs: [
        { id: 'j1', number: 'J-1001', name: 'Oakview lot mill & overlay', customerId: 'c1', estimateId: 'e1', address: 'Lee\'s Summit, MO', type: 'Asphalt', crew: 'Asphalt crew', start: d(-1), end: d(2), status: 'In progress', value: 66800, completed: '', notes: 'Phase 1 = north half. Plant order confirmed.', ...S },
        { id: 'j2', number: 'J-1002', name: 'Hillcrest sidewalk & ADA ramp', customerId: 'c3', estimateId: 'e4', address: 'Blue Springs, MO', type: 'Concrete', crew: 'Concrete crew', start: d(3), end: d(5), status: 'Scheduled', value: 7440, completed: '', notes: 'Call 811 locate before dig.', ...S },
        { id: 'j3', number: 'J-0987', name: 'Summit Builders curb & gutter', customerId: 'c4', estimateId: '', address: 'Olathe, KS', type: 'Concrete', crew: 'Concrete crew', start: d(-346), end: d(-341), status: 'Complete', value: 28500, completed: d(-340), notes: 'Subcontract under Summit Builders.', ...S },
        { id: 'j4', number: 'J-0995', name: 'Miller driveway', customerId: 'c5', estimateId: '', address: 'Grain Valley, MO', type: 'Concrete', crew: 'Concrete crew', start: d(-64), end: d(-61), status: 'Complete', value: 11800, completed: d(-60), notes: '', ...S },
        { id: 'j5', number: 'J-1003', name: 'Riverside drive lane regrade', customerId: 'c2', estimateId: '', address: 'Independence, MO', type: 'Excavation', crew: 'Excavation crew', start: d(1), end: d(1), status: 'Scheduled', value: 4200, completed: '', notes: '', ...S },
      ],
      logs: [
        { id: 'g1', date: d(-1), jobId: 'j1', crew: 'Asphalt crew', foreman: 'Mike Gann', crewSize: 6, hours: 54, asphaltTons: 0, concreteCY: 0, baseTons: 0, weather: 'Sunny, 61°F', notes: 'Milled north half. 14 loads hauled to plant.', ...S },
        { id: 'g2', date: t, jobId: 'j1', crew: 'Asphalt crew', foreman: 'Mike Gann', crewSize: 6, hours: 51, asphaltTons: 146, concreteCY: 0, baseTons: 0, weather: 'Partly cloudy, 58°F', notes: 'Paved north half. Density looked good.', ...S },
      ],
      invoices: [
        { id: 'i1', number: 'INV-2041', jobId: 'j3', customerId: 'c4', issued: d(-338), due: d(-308), amount: 28500, paid: 28500, notes: '', ...S },
        { id: 'i2', number: 'INV-2077', jobId: 'j4', customerId: 'c5', issued: d(-58), due: d(-28), amount: 11800, paid: 6000, notes: 'Balance promised by end of month.', ...S },
        { id: 'i3', number: 'INV-2089', jobId: 'j1', customerId: 'c1', issued: d(-4), due: d(26), amount: 20000, paid: 0, notes: 'Progress billing — phase 1.', ...S },
      ],
      staff: [
        { id: 's1', name: 'Gary Stucker', role: 'Owner', crew: 'Office', phone: '(816) 220-7777', email: 'gary@maxpavingkc.com', osha: '', cdlExpires: '', medExpires: '', rate: '', active: 'Active' },
        { id: 's2', name: 'Wendell Gourley', role: 'Lead Estimator & Project Manager', crew: 'Office', phone: '(816) 220-7777', email: 'wendell@maxpavingkc.com', osha: '', cdlExpires: '', medExpires: '', rate: '', active: 'Active' },
        { id: 's3', name: 'Mike Gann', role: 'Superintendent', crew: 'Concrete crew', phone: '(816) 220-7777', email: '', osha: 'OSHA 30', cdlExpires: '', medExpires: '', rate: '', active: 'Active' },
        { id: 's4', name: 'Christina Parton', role: 'Controller', crew: 'Office', phone: '(816) 220-7777', email: 'christina@maxpavingkc.com', osha: '', cdlExpires: '', medExpires: '', rate: '', active: 'Active' },
        { id: 's5', name: 'Daniel Cushman', role: 'Contract Administrator', crew: 'Office', phone: '(816) 220-7777', email: 'daniel@maxpavingkc.com', osha: '', cdlExpires: '', medExpires: '', rate: '', active: 'Active' },
        { id: 's6', name: 'Sample operator', role: 'Equipment operator / CDL driver', crew: 'Asphalt crew', phone: '', email: '', osha: 'OSHA 10', cdlExpires: d(40), medExpires: d(130), rate: 28, active: 'Active', ...S },
        { id: 's7', name: 'Sample finisher', role: 'Concrete finisher', crew: 'Concrete crew', phone: '', email: '', osha: 'OSHA 10', cdlExpires: '', medExpires: '', rate: 26, active: 'Active', ...S },
      ],
      equipment: [
        { id: 'q1', unit: 'P-1', name: 'Asphalt paver', type: 'Paver', hours: 2410, serviceDue: d(30), serviceHours: 2500, status: 'In use', notes: '', ...S },
        { id: 'q2', unit: 'R-2', name: 'Double-drum roller', type: 'Roller', hours: 1880, serviceDue: d(9), serviceHours: 1900, status: 'In use', notes: '', ...S },
        { id: 'q3', unit: 'SS-1', name: 'Skid steer + cold planer', type: 'Skid steer', hours: 3120, serviceDue: d(60), serviceHours: 3250, status: 'Available', notes: '', ...S },
        { id: 'q4', unit: 'EX-1', name: 'Mini excavator', type: 'Excavator', hours: 1544, serviceDue: d(-3), serviceHours: 1500, status: 'Down for repair', notes: 'Hydraulic leak — parts on order.', ...S },
        { id: 'q5', unit: 'T-12', name: 'Tandem dump truck', type: 'Dump truck', hours: 0, serviceDue: d(45), serviceHours: 0, status: 'Available', notes: 'DOT annual inspection with next service.', ...S },
      ],
      docs: [
        { id: 'd1', name: 'General liability insurance (COI)', kind: 'Insurance', issuer: 'Insurance agent', number: '', expires: d(45), notes: 'Send updated COIs to property managers and GCs on renewal.', ...S },
        { id: 'd2', name: 'Commercial auto insurance', kind: 'Insurance', issuer: 'Insurance agent', number: '', expires: d(220), notes: '', ...S },
        { id: 'd3', name: 'Workers\' compensation', kind: 'Insurance', issuer: 'Insurance agent', number: '', expires: d(220), notes: '', ...S },
        { id: 'd4', name: 'City business license', kind: 'License', issuer: 'City', number: '', expires: d(62), notes: '', ...S },
        { id: 'd5', name: 'Municipal vendor registration', kind: 'Vendor registration', issuer: 'City purchasing office', number: '', expires: d(-5), notes: 'Renew before the next bid opening.', ...S },
      ],
    };
  }

  function migrate(o) {
    o = o && typeof o === 'object' ? o : {};
    COLLECTIONS.forEach(c => { if (!Array.isArray(o[c])) o[c] = []; });
    const def = DEFAULT_SETTINGS();
    o.settings = { ...def, ...(o.settings || {}), company: { ...def.company, ...((o.settings || {}).company || {}) } };
    o.meta = o.meta || {};
    // Browsers that saved data before Marketing existed still get the sample pins while in sample mode.
    if (o.meta.sample && !o.meta.prospectsSeeded && !o.prospects.length) o.prospects = sampleProspects();
    o.meta.prospectsSeeded = true;
    o.v = 1;
    return o;
  }
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) return migrate(JSON.parse(raw)); } catch (e) { /* fall through to sample data */ }
    return seed();
  }
  let db = load();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); }
    catch (e) { toast('Could not save — browser storage is blocked or full. Export a backup from Settings.'); }
  }
  save();

  const find = (c, id) => db[c].find(r => r.id === id);
  const nextNumber = (c, prefix, start) => {
    const n = db[c].map(r => parseInt(String(r.number || '').replace(/\D/g, ''), 10)).filter(isFinite);
    return prefix + (n.length ? Math.max(...n) + 1 : start);
  };

  /* ---------------------------------------------------------------- derived values */
  const estTotal = e => (e.lines || []).reduce((s, l) => s + num(l.qty) * num(l.price), 0);
  const invBalance = i => num(i.amount) - num(i.paid);
  const invStatus = i => {
    if (num(i.amount) > 0 && invBalance(i) <= 0.005) return 'Paid';
    if (i.due && daysUntil(i.due) < 0) return 'Overdue';
    return num(i.paid) > 0 ? 'Partial' : 'Open';
  };
  const expStatus = s => !s ? 'Current' : daysUntil(s) < 0 ? 'Expired' : daysUntil(s) <= 60 ? 'Expiring' : 'Current';
  const eqStatus = q => q.status !== 'Down for repair' && ((q.serviceDue && daysUntil(q.serviceDue) <= 7) || (num(q.serviceHours) > 0 && num(q.hours) >= num(q.serviceHours))) ? 'Service due' : q.status;
  const staffNextExpiry = s => [s.cdlExpires, s.medExpires].filter(Boolean).sort()[0] || '';
  const warrantyOf = j => j.status === 'Complete' && j.completed ? addMonths(j.completed, num(db.settings.warrantyMonths) || 12) : '';
  const warrantyStatus = j => { const w = warrantyOf(j); return !w ? '' : daysUntil(w) < 0 ? 'Expired' : daysUntil(w) <= 60 ? 'Expiring' : 'Active'; };
  const jobLogs = j => db.logs.filter(g => g.jobId === j.id);
  const refLabel = (c, id) => {
    const r = id && find(c, id); if (!r) return '';
    return c === 'jobs' ? `${r.number} · ${r.name}` : c === 'estimates' ? `${r.number} · ${r.title}` : r.name;
  };

  /* ---------------------------------------------------------------- modules (lists + forms) */
  // f: field. t = text | tel | email | select | date | number | money | textarea | ref | lines
  const f = (k, l, t = 'text', extra = {}) => ({ k, l, t, ...extra });
  const opts = o => typeof o === 'function' ? o() : o;

  const M = {
    leads: {
      label: 'Leads', one: 'Lead', blurb: 'Quote requests from the website, phone and referrals. Get every one to a site visit and a written proposal.',
      statuses: ['New', 'Contacted', 'Site visit', 'Proposal sent', 'Won', 'Lost'],
      fields: [
        f('name', 'Name', 'text', { req: true }), f('company', 'Company'),
        f('phone', 'Phone', 'tel'), f('email', 'Email', 'email'),
        f('service', 'Service needed', 'select', { o: SERVICES }), f('propertyType', 'Property type', 'select', { o: PROPERTY_TYPES }),
        f('address', 'Project address', 'text', { wide: true }),
        f('timeline', 'Timeline', 'select', { o: TIMELINES }),
        f('source', 'Source', 'select', { o: ['Website form', 'Phone call', 'Referral', 'Repeat customer', 'Bid invitation', 'Marketing outreach', 'Other'] }),
        f('assignedTo', 'Estimator', 'select', { o: () => db.settings.estimators }), f('siteVisit', 'Site visit', 'date'),
        f('status', 'Status', 'select', { o: ['New', 'Contacted', 'Site visit', 'Proposal sent', 'Won', 'Lost'], def: 'New' }),
        f('created', 'Received', 'date', { def: today }),
        f('notes', 'Notes', 'textarea', { wide: true }),
      ],
      cols: ['created', 'name', 'company', 'service', 'assignedTo', 'siteVisit', 'status'],
      sort: (a, b) => (b.created || '').localeCompare(a.created || ''),
      title: r => r.company ? `${r.name} · ${r.company}` : r.name,
      actions: [{ id: 'lead-est', label: 'Create estimate', show: r => !['Lost'].includes(r.status) }],
    },
    estimates: {
      label: 'Estimates', one: 'Estimate', blurb: 'Written proposals: scope, quantities and the full price. Print one for the customer to sign.',
      statuses: ['Draft', 'Sent', 'Accepted', 'Declined'], number: ['E-', 1001],
      fields: [
        f('number', 'Number'), f('date', 'Date', 'date', { def: today }),
        f('title', 'Project title', 'text', { req: true, wide: true }),
        f('customerId', 'Customer', 'ref', { ref: 'customers', req: true }), f('address', 'Project address'),
        f('estimator', 'Estimator', 'select', { o: () => db.settings.estimators }),
        f('status', 'Status', 'select', { o: ['Draft', 'Sent', 'Accepted', 'Declined'], def: 'Draft' }),
        f('lines', 'Scope & pricing', 'lines', { wide: true }),
        f('notes', 'Notes, phasing & exclusions (printed on the proposal)', 'textarea', { wide: true }),
      ],
      cols: ['number', 'date', 'title', 'customerId', 'estimator', 'total', 'status'],
      computed: { total: { l: 'Total', t: 'money', get: estTotal } },
      sort: (a, b) => (b.date || '').localeCompare(a.date || ''),
      title: r => `${r.number || 'New estimate'}${r.title ? ' · ' + r.title : ''}`,
      actions: [
        { id: 'est-print', label: 'Print proposal', show: r => r.id },
        { id: 'est-job', label: 'Accept → create job', show: r => r.id && r.status !== 'Declined' && !db.jobs.some(j => j.estimateId === r.id) },
      ],
    },
    customers: {
      label: 'Customers', one: 'Customer', blurb: 'Property owners, managers, GCs, cities and homeowners you work for.',
      statuses: CUSTOMER_TYPES, statusKey: 'type',
      fields: [
        f('name', 'Name', 'text', { req: true }), f('type', 'Type', 'select', { o: CUSTOMER_TYPES, def: 'Commercial' }),
        f('contact', 'Main contact'), f('phone', 'Phone', 'tel'), f('email', 'Email', 'email'), f('address', 'Address'),
        f('notes', 'Notes', 'textarea', { wide: true }),
      ],
      cols: ['name', 'type', 'contact', 'phone', 'jobs', 'billed'],
      computed: {
        jobs: { l: 'Jobs', t: 'number', get: c => db.jobs.filter(j => j.customerId === c.id).length },
        billed: { l: 'Billed', t: 'money', get: c => db.invoices.filter(i => i.customerId === c.id).reduce((s, i) => s + num(i.amount), 0) },
      },
      sort: (a, b) => a.name.localeCompare(b.name),
      title: r => r.name,
      extra: c => {
        const jobs = db.jobs.filter(j => j.customerId === c.id), est = db.estimates.filter(e => e.customerId === c.id);
        const bal = db.invoices.filter(i => i.customerId === c.id).reduce((s, i) => s + invBalance(i), 0);
        return stats([['Jobs', jobs.length], ['Estimates', est.length], ['Open balance', money(bal)]]);
      },
    },
    jobs: {
      label: 'Jobs', one: 'Job', blurb: 'Sold work, from scheduled through punch list and complete. Completed jobs start their one-year warranty.',
      statuses: ['Scheduled', 'In progress', 'Punch list', 'Complete', 'On hold'], number: ['J-', 1001],
      fields: [
        f('number', 'Job #'), f('name', 'Job name', 'text', { req: true }),
        f('customerId', 'Customer', 'ref', { ref: 'customers', req: true }), f('address', 'Job address'),
        f('type', 'Work type', 'select', { o: WORK_TYPES, def: 'Mixed' }), f('crew', 'Crew', 'select', { o: () => db.settings.crews }),
        f('start', 'Start', 'date'), f('end', 'Finish', 'date'),
        f('status', 'Status', 'select', { o: ['Scheduled', 'In progress', 'Punch list', 'Complete', 'On hold'], def: 'Scheduled' }),
        f('value', 'Contract value', 'money'),
        f('completed', 'Completed on (starts warranty)', 'date'), f('estimateId', 'From estimate', 'ref', { ref: 'estimates' }),
        f('notes', 'Notes', 'textarea', { wide: true }),
      ],
      cols: ['number', 'name', 'customerId', 'crew', 'start', 'end', 'value', 'status'],
      sort: (a, b) => (b.start || '').localeCompare(a.start || ''),
      title: r => `${r.number || 'New job'}${r.name ? ' · ' + r.name : ''}`,
      extra: j => {
        const g = jobLogs(j), inv = db.invoices.filter(i => i.jobId === j.id);
        const sum = k => g.reduce((s, x) => s + num(x[k]), 0);
        return stats([['Man-hours', fix(sum('hours'), 0)], ['Asphalt', fix(sum('asphaltTons')) + ' t'], ['Concrete', fix(sum('concreteCY')) + ' CY'], ['Invoiced', money(inv.reduce((s, i) => s + num(i.amount), 0))], ['Collected', money(inv.reduce((s, i) => s + num(i.paid), 0))]]);
      },
      actions: [
        { id: 'job-log', label: 'Add daily log', show: r => r.id },
        { id: 'job-inv', label: 'Create invoice', show: r => r.id },
      ],
    },
    logs: {
      label: 'Daily logs', one: 'Daily log', blurb: 'What each crew did today: hours, material placed, weather and notes. Feeds job costing.',
      fields: [
        f('date', 'Date', 'date', { def: today, req: true }), f('jobId', 'Job', 'ref', { ref: 'jobs', req: true }),
        f('crew', 'Crew', 'select', { o: () => db.settings.crews }), f('foreman', 'Foreman', 'select', { o: () => db.staff.filter(s => s.active !== 'Inactive').map(s => s.name) }),
        f('crewSize', 'Crew size', 'number'), f('hours', 'Total man-hours', 'number'),
        f('asphaltTons', 'Asphalt placed (tons)', 'number'), f('concreteCY', 'Concrete placed (CY)', 'number'),
        f('baseTons', 'Base rock (tons)', 'number'), f('weather', 'Weather'),
        f('notes', 'Work done, delays, issues', 'textarea', { wide: true }),
      ],
      cols: ['date', 'jobId', 'crew', 'foreman', 'hours', 'asphaltTons', 'concreteCY'],
      sort: (a, b) => (b.date || '').localeCompare(a.date || ''),
      title: r => `Log · ${fmtDate(r.date)}`,
    },
    invoices: {
      label: 'Invoices', one: 'Invoice', blurb: 'Progress and final billing. Keep accounting in QuickBooks — this is the quick view of who owes what.',
      statuses: ['Open', 'Partial', 'Overdue', 'Paid'], status: invStatus, number: ['INV-', 2001],
      fields: [
        f('number', 'Invoice #'), f('jobId', 'Job', 'ref', { ref: 'jobs' }),
        f('customerId', 'Customer', 'ref', { ref: 'customers', req: true }),
        f('issued', 'Issued', 'date', { def: today }), f('due', 'Due', 'date', { def: () => addDays(today(), num(db.settings.termsDays) || 30) }),
        f('amount', 'Amount', 'money', { req: true }), f('paid', 'Paid to date', 'money'),
        f('notes', 'Notes', 'textarea', { wide: true }),
      ],
      cols: ['number', 'customerId', 'jobId', 'issued', 'due', 'amount', 'balance', 'state'],
      computed: { balance: { l: 'Balance', t: 'money', get: invBalance }, state: { l: 'Status', t: 'status', get: invStatus } },
      sort: (a, b) => (b.issued || '').localeCompare(a.issued || ''),
      title: r => r.number || 'New invoice',
      actions: [{ id: 'inv-paid', label: 'Mark paid in full', show: r => r.id && invBalance(r) > 0 }],
    },
    staff: {
      label: 'Crew & staff', one: 'Person', blurb: 'Everyone on the team, their crew, certifications and license dates.',
      statuses: ['Active', 'Inactive'], statusKey: 'active',
      fields: [
        f('name', 'Name', 'text', { req: true }), f('role', 'Role'),
        f('crew', 'Crew', 'select', { o: () => ['Office', ...db.settings.crews] }), f('active', 'Status', 'select', { o: ['Active', 'Inactive'], def: 'Active' }),
        f('phone', 'Phone', 'tel'), f('email', 'Email', 'email'),
        f('osha', 'OSHA card', 'select', { o: ['OSHA 10', 'OSHA 30'] }), f('rate', 'Hourly rate', 'money'),
        f('cdlExpires', 'CDL expires', 'date'), f('medExpires', 'DOT medical card expires', 'date'),
        f('notes', 'Notes', 'textarea', { wide: true }),
      ],
      cols: ['name', 'role', 'crew', 'phone', 'osha', 'nextExp', 'active'],
      computed: { nextExp: { l: 'Next license date', t: 'expiry', get: staffNextExpiry } },
      sort: (a, b) => a.name.localeCompare(b.name),
      title: r => r.name,
    },
    equipment: {
      label: 'Equipment', one: 'Machine', blurb: 'Pavers, rollers, trucks and machines: hours, service dates and what is down.',
      statuses: ['Available', 'In use', 'Service due', 'Down for repair'], status: eqStatus,
      fields: [
        f('unit', 'Unit #'), f('name', 'Name', 'text', { req: true }),
        f('type', 'Type', 'select', { o: ['Paver', 'Roller', 'Skid steer', 'Excavator', 'Loader', 'Milling machine', 'Dump truck', 'Pickup', 'Trailer', 'Concrete equipment', 'Other'] }),
        f('status', 'Status', 'select', { o: ['Available', 'In use', 'Down for repair'], def: 'Available' }),
        f('hours', 'Hour meter', 'number'), f('serviceHours', 'Next service at (hours)', 'number'),
        f('serviceDue', 'Next service date', 'date'),
        f('notes', 'Notes', 'textarea', { wide: true }),
      ],
      cols: ['unit', 'name', 'type', 'hours', 'serviceHours', 'serviceDue', 'state'],
      computed: { state: { l: 'Status', t: 'status', get: eqStatus } },
      sort: (a, b) => String(a.unit).localeCompare(String(b.unit), undefined, { numeric: true }),
      title: r => `${r.unit ? r.unit + ' · ' : ''}${r.name || 'New machine'}`,
    },
    docs: {
      label: 'Compliance', one: 'Document', blurb: 'Insurance certificates, licenses, bonds and vendor registrations that municipal and GC work requires.',
      statuses: ['Current', 'Expiring', 'Expired'], status: d => expStatus(d.expires),
      fields: [
        f('name', 'Document', 'text', { req: true, wide: true }),
        f('kind', 'Kind', 'select', { o: ['Insurance', 'License', 'Bond', 'Vendor registration', 'Certification', 'Other'] }),
        f('issuer', 'Issued by'), f('number', 'Policy / license #'), f('expires', 'Expires', 'date'),
        f('notes', 'Notes', 'textarea', { wide: true }),
      ],
      cols: ['name', 'kind', 'issuer', 'expires', 'state'],
      computed: { state: { l: 'Status', t: 'status', get: d => expStatus(d.expires) } },
      sort: (a, b) => (a.expires || '9999').localeCompare(b.expires || '9999'),
      title: r => r.name || 'New document',
    },
  };

  /* ---------------------------------------------------------------- UI state */
  const ui = { filters: {}, week: monday(today()), page: 'dashboard' };
  const view = $('#view');

  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('is-on');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('is-on'), 2600);
  }
  const stats = pairs => `<div class="mini-stats">${pairs.map(([l, v]) => `<div><small>${esc(l)}</small><strong>${esc(v)}</strong></div>`).join('')}</div>`;
  const pageHead = (title, blurb, btn = '') => `<header class="page-head"><div><h1>${esc(title)}</h1>${blurb ? `<p>${esc(blurb)}</p>` : ''}</div>${btn}</header>`;
  const newBtn = (key, label) => `<button class="btn btn--yellow" type="button" data-act="new" data-m="${key}">+ ${esc(label)}</button>`;

  /* ---------------------------------------------------------------- cells */
  function cell(m, key, r) {
    const fd = m.fields.find(x => x.k === key), cp = m.computed && m.computed[key];
    const t = cp ? cp.t : fd ? fd.t : 'text';
    const v = cp ? cp.get(r) : r[key];
    if (key === 'status' || key === 'active' || t === 'status') return badge(v);
    if (t === 'money') return v === '' || v == null ? '' : money(v);
    if (t === 'number') return v === '' || v == null || num(v) === 0 ? '<span class="muted">—</span>' : fix(v);
    if (t === 'date') return esc(fmtDate(v));
    if (t === 'expiry') return v ? `${esc(fmtDate(v))} ${expStatus(v) !== 'Current' ? badge(expStatus(v)) : ''}` : '<span class="muted">—</span>';
    if (t === 'ref') return esc(refLabel(fd.ref, v));
    return esc(v);
  }
  const colLabel = (m, key) => (m.computed && m.computed[key] ? m.computed[key].l : (m.fields.find(x => x.k === key) || {}).l || key);
  const isNumCol = (m, key) => { const t = m.computed && m.computed[key] ? m.computed[key].t : (m.fields.find(x => x.k === key) || {}).t; return t === 'money' || t === 'number'; };
  const statusOf = (m, r) => m.status ? m.status(r) : r[m.statusKey || 'status'];

  /* ---------------------------------------------------------------- list view */
  function listView(key) {
    const m = M[key], st = ui.filters[key] || (ui.filters[key] = { q: '', s: 'All' });
    const all = db[key].slice().sort(m.sort || (() => 0));
    const rows = st.s === 'All' ? all : all.filter(r => statusOf(m, r) === st.s);
    const chips = m.statuses ? `<div class="chips">${['All', ...m.statuses].map(s => {
      const n = s === 'All' ? all.length : all.filter(r => statusOf(m, r) === s).length;
      return `<button type="button" class="chip${s === st.s ? ' is-on' : ''}" data-act="filter" data-m="${key}" data-v="${esc(s)}">${esc(s)} <span>${n}</span></button>`;
    }).join('')}</div>` : '';
    const body = rows.map(r => {
      const text = m.cols.map(c => { const d = document.createElement('div'); d.innerHTML = cell(m, c, r); return d.textContent; }).join(' ') + ' ' + (r.notes || '') + ' ' + (r.address || '');
      return `<tr data-act="edit" data-m="${key}" data-id="${r.id}" data-text="${esc(text.toLowerCase())}" tabindex="0">${m.cols.map(c => `<td${isNumCol(m, c) ? ' class="r"' : ''} data-label="${esc(colLabel(m, c))}">${cell(m, c, r)}</td>`).join('')}</tr>`;
    }).join('');
    return pageHead(m.label, m.blurb, newBtn(key, 'New ' + m.one.toLowerCase())) + `
      <div class="toolbar">
        <input class="search" type="search" placeholder="Search ${esc(m.label.toLowerCase())}…" value="${esc(st.q)}" data-search="${key}" aria-label="Search ${esc(m.label)}">
        ${chips}
      </div>
      <div class="card table-card">
        <table class="table">
          <thead><tr>${m.cols.map(c => `<th${isNumCol(m, c) ? ' class="r"' : ''}>${esc(colLabel(m, c))}</th>`).join('')}</tr></thead>
          <tbody>${body}</tbody>
        </table>
        <p class="empty"${rows.length ? ' hidden' : ''}>Nothing here yet. ${m.statuses && st.s !== 'All' ? 'Try another filter, or a' : 'A'}dd one with “+ New ${esc(m.one.toLowerCase())}”.</p>
      </div>`;
  }
  function applySearch(key) {
    const q = (ui.filters[key] || {}).q || '';
    let shown = 0;
    $$('tbody tr', view).forEach(tr => { const ok = !q || tr.dataset.text.includes(q.toLowerCase()); tr.hidden = !ok; if (ok) shown++; });
    const e = $('.empty', view); if (e) e.hidden = shown > 0;
  }

  /* ---------------------------------------------------------------- forms */
  function fieldHtml(fd, v) {
    const id = 'f_' + fd.k, req = fd.req ? ' required' : '', cls = 'field' + (fd.wide || fd.t === 'textarea' || fd.t === 'lines' ? ' field--wide' : '');
    const label = `<label for="${id}">${esc(fd.l)}${fd.req ? ' <abbr title="required">*</abbr>' : ''}</label>`;
    if (fd.t === 'lines') return `<div class="${cls}"><span class="label">${esc(fd.l)}</span>${linesHtml(v || [])}</div>`;
    if (fd.t === 'textarea') return `<div class="${cls}">${label}<textarea id="${id}" name="${fd.k}" rows="3"${req}>${esc(v)}</textarea></div>`;
    if (fd.t === 'select' || fd.t === 'ref') {
      let o = fd.t === 'ref'
        ? db[fd.ref].slice().sort((a, b) => refLabel(fd.ref, a.id).localeCompare(refLabel(fd.ref, b.id))).map(r => [r.id, refLabel(fd.ref, r.id)])
        : opts(fd.o).map(x => [x, x]);
      if (v && !o.some(([val]) => val === v)) o = [[v, fd.t === 'ref' ? '(deleted)' : v], ...o];
      return `<div class="${cls}">${label}<select id="${id}" name="${fd.k}"${req}><option value="">—</option>${o.map(([val, l]) => `<option value="${esc(val)}"${val === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></div>`;
    }
    const type = fd.t === 'money' || fd.t === 'number' ? 'number' : fd.t;
    const step = fd.t === 'money' ? ' step="0.01" min="0"' : fd.t === 'number' ? ' step="any"' : '';
    return `<div class="${cls}">${label}<input id="${id}" name="${fd.k}" type="${type}"${step} value="${esc(v)}"${req}${fd.t === 'money' ? ' inputmode="decimal"' : ''}></div>`;
  }

  function linesHtml(lines) {
    const pb = db.settings.priceBook;
    const cats = [...new Set(pb.map(p => p.cat))];
    return `<div class="lines" data-lines>
      <div class="lines__scroll"><table class="lines__table">
        <thead><tr><th>Description</th><th class="r">Qty</th><th>Unit</th><th class="r">Unit price</th><th class="r">Amount</th><th></th></tr></thead>
        <tbody>${lines.map(lineRow).join('')}</tbody>
      </table></div>
      <div class="lines__foot">
        <select data-pb aria-label="Add a line from the price book"><option value="">+ Add from price book…</option>${cats.map(c => `<optgroup label="${esc(c)}">${pb.filter(p => p.cat === c).map(p => `<option value="${p.id}">${esc(p.name)} — ${money(p.price, true)}/${esc(p.unit)}</option>`).join('')}</optgroup>`).join('')}</select>
        <button type="button" class="btn btn--ghost btn--sm" data-act="line-add">+ Blank line</button>
        <a class="lines__calc" href="#calc" target="_blank" rel="noopener">Tonnage &amp; yardage calculators ↗</a>
        <div class="lines__total">Total <strong data-total>${money(lines.reduce((s, l) => s + num(l.qty) * num(l.price), 0), true)}</strong></div>
      </div>
    </div>`;
  }
  const lineRow = (l = {}) => `<tr>
    <td><input name="l_desc" value="${esc(l.desc)}" aria-label="Description" placeholder="Describe the work"></td>
    <td class="r"><input name="l_qty" type="number" step="any" value="${esc(l.qty)}" aria-label="Quantity"></td>
    <td><select name="l_unit" aria-label="Unit">${UNITS.map(u => `<option${u === l.unit ? ' selected' : ''}>${u}</option>`).join('')}</select></td>
    <td class="r"><input name="l_price" type="number" step="0.01" value="${esc(l.price)}" aria-label="Unit price"></td>
    <td class="r" data-amt>${money(num(l.qty) * num(l.price), true)}</td>
    <td><button type="button" class="x" data-act="line-del" aria-label="Remove line">×</button></td>
  </tr>`;
  function recalcLines(wrap) {
    let total = 0;
    $$('tbody tr', wrap).forEach(tr => { const a = num($('[name=l_qty]', tr).value) * num($('[name=l_price]', tr).value); total += a; $('[data-amt]', tr).textContent = money(a, true); });
    $('[data-total]', wrap).textContent = money(total, true);
  }

  function openForm(key, id, preset = {}) {
    const m = M[key];
    let rec = id ? find(key, id) : null;
    if (!rec) {
      rec = {};
      m.fields.forEach(fd => { if (fd.def !== undefined) rec[fd.k] = typeof fd.def === 'function' ? fd.def() : fd.def; });
      if (m.number) rec.number = nextNumber(key, ...m.number);
      Object.assign(rec, preset);
    }
    const actions = (m.actions || []).filter(a => a.show(rec)).map(a => `<button type="button" class="btn btn--ghost btn--sm" data-act="form-action" data-a="${a.id}">${esc(a.label)}</button>`).join('');
    $('#drawer-panel').innerHTML = `
      <form class="form" data-form="${key}" data-id="${rec.id || ''}" novalidate>
        <header class="form__head">
          <div><small>${id ? 'Edit ' + esc(m.one.toLowerCase()) : 'New ' + esc(m.one.toLowerCase())}</small><h2>${esc(m.title(rec) || m.one)}</h2></div>
          <button type="button" class="x x--lg" data-act="close" aria-label="Close">×</button>
        </header>
        <div class="form__body">
          ${rec.sample ? '<p class="note">Sample record — edit it, or clear all sample data in Settings.</p>' : ''}
          ${id && m.extra ? m.extra(rec) : ''}
          <div class="fields">${m.fields.map(fd => fieldHtml(fd, rec[fd.k] ?? '')).join('')}</div>
        </div>
        <footer class="form__foot">
          ${id ? '<button type="button" class="btn btn--danger btn--sm" data-act="delete">Delete</button>' : ''}
          <div class="form__actions">${actions}</div>
          <button type="button" class="btn btn--ghost" data-act="close">Cancel</button>
          <button type="submit" class="btn btn--yellow">Save</button>
        </footer>
      </form>`;
    showDrawer();
    const first = $('#drawer-panel input:not([type=hidden]), #drawer-panel select');
    if (first && !id) first.focus();
  }
  function showDrawer() { $('#drawer').hidden = false; document.body.classList.add('is-locked'); }
  function closeForm() {
    if (pickMap) { pickMap.remove(); pickMap = null; }
    pickPin = null;
    $('#drawer').hidden = true; document.body.classList.remove('is-locked'); $('#drawer-panel').innerHTML = '';
  }

  function collect(form, key) {
    const m = M[key], data = {};
    for (const fd of m.fields) {
      if (fd.t === 'lines') {
        data.lines = $$('[data-lines] tbody tr', form).map(tr => ({
          desc: $('[name=l_desc]', tr).value.trim(), qty: num($('[name=l_qty]', tr).value), unit: $('[name=l_unit]', tr).value, price: num($('[name=l_price]', tr).value),
        })).filter(l => l.desc || l.qty || l.price);
        continue;
      }
      const el = form.elements[fd.k]; if (!el) continue;
      let v = el.value.trim();
      if ((fd.t === 'money' || fd.t === 'number') && v !== '') v = num(v);
      data[fd.k] = v;
    }
    return data;
  }
  function saveForm(form) {
    const key = form.dataset.form, m = M[key];
    const missing = m.fields.filter(fd => fd.req && fd.t !== 'lines' && !String(form.elements[fd.k].value).trim());
    $$('.field.is-bad', form).forEach(x => x.classList.remove('is-bad'));
    if (missing.length) {
      missing.forEach(fd => form.elements[fd.k].closest('.field').classList.add('is-bad'));
      form.elements[missing[0].k].focus();
      toast(`Fill in: ${missing.map(fd => fd.l).join(', ')}`);
      return null;
    }
    const data = collect(form, key);
    let rec = form.dataset.id ? find(key, form.dataset.id) : null;
    if (rec) Object.assign(rec, data);
    else { rec = { id: uid(), ...data }; db[key].push(rec); form.dataset.id = rec.id; }
    if (key === 'jobs' && rec.status === 'Complete' && !rec.completed) rec.completed = rec.end || today();
    save();
    return rec;
  }

  /* ---------------------------------------------------------------- workflow actions */
  const ACTIONS = {
    'lead-est'(lead) {
      let c = db.customers.find(x => x.name.toLowerCase() === (lead.company || lead.name).toLowerCase());
      if (!c) {
        const typeMap = { 'Municipal / Government': 'Municipal / Government', Residential: 'Residential', 'Industrial / Warehouse': 'Industrial / Warehouse', 'HOA / Multifamily': 'HOA / Multifamily', 'Church / Nonprofit': 'Church / Nonprofit' };
        c = { id: uid(), name: lead.company || lead.name, type: typeMap[lead.propertyType] || 'Commercial', contact: lead.company ? lead.name : '', phone: lead.phone, email: lead.email, address: lead.address, notes: '' };
        db.customers.push(c);
      }
      if (['New', 'Contacted'].includes(lead.status)) lead.status = 'Site visit';
      save(); closeForm();
      openForm('estimates', null, { customerId: c.id, title: lead.service && lead.service !== 'Not sure yet' ? lead.service : '', address: lead.address, estimator: lead.assignedTo, notes: lead.notes ? 'Customer notes: ' + lead.notes : '' });
      toast('Customer saved — build the estimate.');
    },
    'est-print'(e) { printEstimate(e); },
    'est-job'(e) {
      e.status = 'Accepted';
      const cats = new Set((e.lines || []).map(l => (db.settings.priceBook.find(p => p.name === l.desc) || {}).cat).filter(c => c && c !== 'General'));
      const type = cats.size === 1 ? [...cats][0] : 'Mixed';
      save(); closeForm();
      openForm('jobs', null, { name: e.title, customerId: e.customerId, estimateId: e.id, address: e.address, type, value: Math.round(estTotal(e)), crew: db.settings.crews.find(c => c.toLowerCase().startsWith(type.toLowerCase())) || '' });
      toast('Estimate accepted — schedule the job.');
    },
    'job-log'(j) { closeForm(); openForm('logs', null, { jobId: j.id, crew: j.crew }); },
    'job-inv'(j) {
      const billed = db.invoices.filter(i => i.jobId === j.id).reduce((s, i) => s + num(i.amount), 0);
      closeForm(); openForm('invoices', null, { jobId: j.id, customerId: j.customerId, amount: Math.max(0, num(j.value) - billed) || '' });
    },
    'inv-paid'(i) { i.paid = num(i.amount); save(); closeForm(); render(); toast(`${i.number} marked paid.`); },
  };

  /* ---------------------------------------------------------------- proposal print */
  function printEstimate(e) {
    const c = find('customers', e.customerId) || {}, co = db.settings.company, s = db.settings;
    const rows = (e.lines || []).map(l => `<tr><td>${esc(l.desc)}</td><td class="r">${fix(l.qty, 2)}</td><td>${esc(l.unit)}</td><td class="r">${money(l.price, true)}</td><td class="r">${money(num(l.qty) * num(l.price), true)}</td></tr>`).join('');
    $('#print').innerHTML = `
      <article class="pr">
        <header class="pr__head">
          <img src="img/logo-horizontal.jpg" alt="Max Paving">
          <div class="pr__co">${esc(co.address)}<br>${esc(co.phone)} · ${esc(co.email)}</div>
        </header>
        <h1>Proposal ${esc(e.number)}</h1>
        <div class="pr__meta">
          <div><small>Prepared for</small><strong>${esc(c.name || '')}</strong>${c.contact ? `<br>${esc(c.contact)}` : ''}${c.phone ? `<br>${esc(c.phone)}` : ''}${c.email ? `<br>${esc(c.email)}` : ''}</div>
          <div><small>Project</small><strong>${esc(e.title)}</strong>${e.address ? `<br>${esc(e.address)}` : ''}</div>
          <div><small>Date</small><strong>${esc(fmtDate(e.date))}</strong><br>Valid until ${esc(fmtDate(addDays(e.date || today(), num(s.proposalValidDays) || 30)))}${e.estimator ? `<br>Estimator: ${esc(e.estimator)}` : ''}</div>
        </div>
        <table class="pr__table"><thead><tr><th>Scope</th><th class="r">Qty</th><th>Unit</th><th class="r">Unit price</th><th class="r">Amount</th></tr></thead>
          <tbody>${rows}</tbody><tfoot><tr><td colspan="4">Total</td><td class="r">${money(estTotal(e), true)}</td></tr></tfoot></table>
        ${e.notes ? `<h2>Notes</h2><p>${esc(e.notes).replace(/\n/g, '<br>')}</p>` : ''}
        <h2>Terms</h2>
        <ul>
          <li>The scope above is the scope we build. Materials as specified, never substituted.</li>
          <li>If site conditions turn up that nobody could have known, we stop and talk it through with you before any change order.</li>
          <li>All work by Max Paving's own crews. Cleanup included.</li>
          <li>One-year warranty on labor and workmanship from the date of completion.</li>
          <li>Payment due net ${esc(s.termsDays)} days from invoice.</li>
        </ul>
        <div class="pr__sign"><div>Accepted by (customer)<span></span></div><div>Date<span></span></div><div>Max Paving<span></span></div></div>
      </article>`;
    document.body.classList.add('is-printing');
    const done = () => { document.body.classList.remove('is-printing'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(() => window.print(), 50);
  }

  /* ---------------------------------------------------------------- weather */
  const WX = { days: null, err: false, loading: false };
  function loadWeather() {
    if (WX.days || WX.loading) return;
    try {
      const c = JSON.parse(sessionStorage.getItem('mp.wx') || 'null');
      if (c && Date.now() - c.t < 36e5 && c.lat === db.settings.lat && c.lon === db.settings.lon) { WX.days = c.days; return; }
    } catch (e) { /* no cache */ }
    WX.loading = true;
    const get = u => fetch(u, { headers: { Accept: 'application/geo+json' } }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
    get(`https://api.weather.gov/points/${db.settings.lat},${db.settings.lon}`)
      .then(p => get(p.properties.forecast))
      .then(fc => {
        const by = {};
        fc.properties.periods.forEach(p => {
          const date = p.startTime.slice(0, 10), d = by[date] || (by[date] = { date, rain: 0 });
          if (p.isDaytime) { d.high = p.temperature; d.short = p.shortForecast; } else { d.low = p.temperature; d.short = d.short || p.shortForecast; }
          d.rain = Math.max(d.rain, (p.probabilityOfPrecipitation && p.probabilityOfPrecipitation.value) || 0);
        });
        WX.days = Object.values(by).slice(0, 7);
        try { sessionStorage.setItem('mp.wx', JSON.stringify({ t: Date.now(), lat: db.settings.lat, lon: db.settings.lon, days: WX.days })); } catch (e) { /* ignore */ }
      })
      .catch(() => { WX.err = true; })
      .finally(() => { WX.loading = false; if (['dashboard', 'schedule'].includes(ui.page)) render(); });
  }
  // Rules of thumb only; the project spec governs.
  function verdict(d) {
    const s = db.settings, rain = d.rain || 0, hi = d.high ?? d.low, lo = d.low ?? d.high;
    const a = hi < s.asphaltMinF || rain >= s.rainMaxPct ? 'No' : hi < s.asphaltMinF + 5 || rain >= s.rainMaxPct - 20 ? 'Watch' : 'Go';
    const c = hi < s.concreteMinF || rain >= s.rainMaxPct ? 'No' : lo < s.concreteMinF || rain >= s.rainMaxPct - 20 ? 'Watch' : 'Go';
    return { a, c };
  }
  function weatherStrip(compact) {
    loadWeather();
    if (WX.err) return '<p class="muted small">Forecast unavailable right now (weather.gov). Check again later.</p>';
    if (!WX.days) return '<p class="muted small">Loading the 7-day forecast…</p>';
    const s = db.settings;
    return `<div class="wx${compact ? ' wx--compact' : ''}">${WX.days.map(d => {
      const v = verdict(d);
      return `<div class="wx__day${d.date === today() ? ' is-today' : ''}">
        <strong>${d.date === today() ? 'Today' : esc(weekday(d.date))}</strong>
        <span class="wx__temp">${d.high ?? '–'}° <small>/ ${d.low ?? '–'}°</small></span>
        <span class="wx__sky" title="${esc(d.short)}">${esc(d.short || '')}</span>
        <span class="wx__rain">${d.rain || 0}% rain</span>
        <span class="wx__go" title="Asphalt: high ${s.asphaltMinF}°F+ and rain under ${s.rainMaxPct}%">Asphalt ${badge(v.a)}</span>
        <span class="wx__go" title="Concrete: overnight low ${s.concreteMinF}°F+ (or plan cold-weather protection) and rain under ${s.rainMaxPct}%">Concrete ${badge(v.c)}</span>
      </div>`;
    }).join('')}</div>`;
  }

  /* ---------------------------------------------------------------- dashboard */
  function attention() {
    const out = [], t = today();
    db.leads.filter(l => l.status === 'New').forEach(l => out.push([daysUntil(l.created || t), 'leads', l.id, `Call back ${l.name}${l.company ? ' (' + l.company + ')' : ''}`, `New lead · ${l.service || 'service not set'} · received ${inWords(daysUntil(l.created || t))}`]));
    db.leads.filter(l => l.siteVisit && ['Contacted', 'Site visit', 'New'].includes(l.status) && daysUntil(l.siteVisit) >= -1 && daysUntil(l.siteVisit) <= 7).forEach(l => out.push([daysUntil(l.siteVisit), 'leads', l.id, `Site visit: ${l.company || l.name}`, `${fmtDate(l.siteVisit)} (${inWords(daysUntil(l.siteVisit))}) · ${l.assignedTo || 'no estimator'}`]));
    db.estimates.filter(e => e.status === 'Sent' && daysUntil(e.date) <= -7).forEach(e => out.push([daysUntil(e.date) + 7, 'estimates', e.id, `Follow up on ${e.number} · ${refLabel('customers', e.customerId)}`, `Sent ${inWords(daysUntil(e.date))} · ${money(estTotal(e))}`]));
    db.invoices.filter(i => invStatus(i) === 'Overdue').forEach(i => out.push([daysUntil(i.due), 'invoices', i.id, `Collect ${money(invBalance(i))} · ${refLabel('customers', i.customerId)}`, `${i.number} overdue since ${fmtDate(i.due)}`]));
    db.docs.filter(d => expStatus(d.expires) !== 'Current').forEach(d => out.push([daysUntil(d.expires), 'docs', d.id, `Renew: ${d.name}`, `${daysUntil(d.expires) < 0 ? 'Expired' : 'Expires'} ${fmtDate(d.expires)}`]));
    db.staff.filter(s => s.active !== 'Inactive').forEach(s => [['cdlExpires', 'CDL'], ['medExpires', 'DOT medical card']].forEach(([k, l]) => { if (s[k] && daysUntil(s[k]) <= 60) out.push([daysUntil(s[k]), 'staff', s.id, `${s.name}: ${l} renewal`, `${daysUntil(s[k]) < 0 ? 'Expired' : 'Expires'} ${fmtDate(s[k])}`]); }));
    db.equipment.filter(q => eqStatus(q) === 'Service due' || q.status === 'Down for repair').forEach(q => out.push([q.status === 'Down for repair' ? -999 : daysUntil(q.serviceDue || t), 'equipment', q.id, q.status === 'Down for repair' ? `${q.unit} ${q.name} is down` : `Service ${q.unit} ${q.name}`, q.status === 'Down for repair' ? (q.notes || 'Down for repair') : `Due ${fmtDate(q.serviceDue)}${num(q.serviceHours) ? ` or ${fix(q.serviceHours, 0)} hrs (now ${fix(q.hours, 0)})` : ''}`]));
    db.prospects.filter(followDue).forEach(p => out.push([daysUntil(p.nextFollowUp), 'prospects', p.id, `Follow up: ${p.company}`, `${[p.contactName, p.phone].filter(Boolean).join(' · ') || 'Prospect'} · due ${inWords(daysUntil(p.nextFollowUp))}`]));
    db.jobs.filter(j => warrantyStatus(j) === 'Expiring').forEach(j => out.push([daysUntil(warrantyOf(j)), 'jobs', j.id, `Warranty check-in: ${j.name}`, `Warranty ends ${fmtDate(warrantyOf(j))} — walk it before it does`]));
    return out.sort((a, b) => a[0] - b[0]);
  }

  function dashboard() {
    const t = today(), year = t.slice(0, 4);
    const openLeads = db.leads.filter(l => !['Won', 'Lost'].includes(l.status));
    const sent = db.estimates.filter(e => e.status === 'Sent');
    const decided = db.estimates.filter(e => ['Accepted', 'Declined'].includes(e.status) && (e.date || '').startsWith(year));
    const won = decided.filter(e => e.status === 'Accepted');
    const active = db.jobs.filter(j => ['Scheduled', 'In progress', 'Punch list'].includes(j.status));
    const ar = db.invoices.reduce((s, i) => s + Math.max(0, invBalance(i)), 0);
    const overdue = db.invoices.filter(i => invStatus(i) === 'Overdue').reduce((s, i) => s + invBalance(i), 0);
    const wk = monday(t), wkEnd = addDays(wk, 6);
    const thisWeek = db.jobs.filter(j => j.start && j.start <= wkEnd && (j.end || j.start) >= wk && j.status !== 'On hold').sort((a, b) => a.start.localeCompare(b.start));
    const items = attention();
    const pipe = M.leads.statuses.map(s => [s, db.leads.filter(l => l.status === s).length]);
    const maxPipe = Math.max(1, ...pipe.map(p => p[1]));

    return pageHead(`Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}`, `Here’s where Max Paving stands on ${fmtDate(t)}.`, newBtn('leads', 'New lead')) + `
      <section class="kpis">
        <a class="kpi" href="#leads"><small>Open leads</small><strong>${openLeads.length}</strong><span>${db.leads.filter(l => l.status === 'New').length} new, not yet contacted</span></a>
        <a class="kpi" href="#estimates"><small>Proposals out</small><strong>${money(sent.reduce((s, e) => s + estTotal(e), 0))}</strong><span>${sent.length} waiting on an answer</span></a>
        <a class="kpi" href="#estimates"><small>Won in ${year}</small><strong>${money(won.reduce((s, e) => s + estTotal(e), 0))}</strong><span>${decided.length ? Math.round(won.length / decided.length * 100) + '% win rate' : 'No decisions yet'}</span></a>
        <a class="kpi" href="#jobs"><small>Backlog</small><strong>${money(active.reduce((s, j) => s + num(j.value), 0))}</strong><span>${active.length} active or scheduled jobs</span></a>
        <a class="kpi${overdue > 0 ? ' kpi--alert' : ''}" href="#invoices"><small>Owed to us</small><strong>${money(ar)}</strong><span>${overdue > 0 ? money(overdue) + ' overdue' : 'Nothing overdue'}</span></a>
      </section>

      <section class="card">
        <div class="card__head"><h2>Paving weather · next 7 days</h2><a href="#settings" class="small">Rules: asphalt ${db.settings.asphaltMinF}°F+, concrete ${db.settings.concreteMinF}°F+ · project spec governs</a></div>
        ${weatherStrip()}
      </section>

      <div class="dash-grid">
        <section class="card">
          <div class="card__head"><h2>Needs attention</h2><span class="count">${items.length}</span></div>
          ${items.length ? `<ul class="todo">${items.map(([, m, id, title, sub]) => `<li data-act="${m === 'prospects' ? 'p-open' : 'edit'}" data-m="${m}" data-id="${id}" tabindex="0"><span class="todo__dot todo__dot--${m}"></span><div><strong>${esc(title)}</strong><small>${esc(sub)}</small></div></li>`).join('')}</ul>` : '<p class="muted">All caught up.</p>'}
        </section>
        <div class="stack">
          <section class="card">
            <div class="card__head"><h2>On the schedule this week</h2><a href="#schedule" class="small">Open schedule →</a></div>
            ${thisWeek.length ? `<ul class="jobs-mini">${thisWeek.map(j => `<li data-act="edit" data-m="jobs" data-id="${j.id}" tabindex="0"><div><strong>${esc(j.name)}</strong><small>${esc(j.crew || 'No crew')} · ${esc(shortDate(j.start))}${j.end && j.end !== j.start ? '–' + esc(shortDate(j.end)) : ''}</small></div>${badge(j.status)}</li>`).join('')}</ul>` : '<p class="muted">Nothing scheduled this week.</p>'}
          </section>
          <section class="card">
            <div class="card__head"><h2>Lead pipeline</h2><a href="#leads" class="small">All leads →</a></div>
            <div class="pipe">${pipe.map(([s, n]) => `<div class="pipe__row"><span>${esc(s)}</span><div class="pipe__bar"><i style="width:${n / maxPipe * 100}%"></i></div><b>${n}</b></div>`).join('')}</div>
          </section>
        </div>
      </div>`;
  }

  /* ---------------------------------------------------------------- schedule */
  function schedule() {
    const start = ui.week, days = Array.from({ length: 6 }, (_, i) => addDays(start, i));
    const crews = [...db.settings.crews, 'Unassigned'];
    const wxBy = {}; loadWeather(); (WX.days || []).forEach(d => { wxBy[d.date] = d; });
    const jobsFor = (crew, day) => db.jobs.filter(j => j.start && (crew === 'Unassigned' ? !db.settings.crews.includes(j.crew) : j.crew === crew) && j.start <= day && (j.end || j.start) >= day && j.status !== 'On hold');
    const label = `${shortDate(days[0])} – ${shortDate(days[5])}, ${days[5].slice(0, 4)}`;
    return pageHead('Schedule', 'Who is where this week. Click a job to change dates or crew.', newBtn('jobs', 'Schedule a job')) + `
      <div class="toolbar">
        <div class="week-nav"><button type="button" class="btn btn--ghost btn--sm" data-act="week" data-v="-7" aria-label="Previous week">‹</button><button type="button" class="btn btn--ghost btn--sm" data-act="week" data-v="0">This week</button><button type="button" class="btn btn--ghost btn--sm" data-act="week" data-v="7" aria-label="Next week">›</button><strong>${esc(label)}</strong></div>
      </div>
      <div class="card table-card">
        <div class="sched" style="--cols:${days.length}">
          <div class="sched__corner">Crew</div>
          ${days.map(d => { const w = wxBy[d], v = w && verdict(w); return `<div class="sched__day${d === today() ? ' is-today' : ''}"><strong>${esc(weekday(d))} ${esc(shortDate(d))}</strong>${w ? `<small>${w.high ?? '–'}° · ${w.rain || 0}% rain</small><span class="sched__wx">A ${badge(v.a)} C ${badge(v.c)}</span>` : ''}</div>`; }).join('')}
          ${crews.map(c => `<div class="sched__crew">${esc(c)}</div>${days.map(d => `<div class="sched__cell${d === today() ? ' is-today' : ''}">${jobsFor(c, d).map(j => `<button type="button" class="sched__job sched__job--${esc((j.type || 'mixed').toLowerCase())}${j.status === 'Complete' ? ' is-done' : ''}" data-act="edit" data-m="jobs" data-id="${j.id}"><strong>${esc(j.name)}</strong><small>${esc(refLabel('customers', j.customerId))}</small></button>`).join('')}</div>`).join('')}`).join('')}
        </div>
      </div>
      <p class="muted small">Weather badges: A = asphalt, C = concrete. Forecast covers the next 7 days only.</p>`;
  }

  /* ---------------------------------------------------------------- warranties */
  function warranties() {
    const st = ui.filters.warranties || (ui.filters.warranties = { s: 'All' });
    const all = db.jobs.filter(j => warrantyOf(j)).sort((a, b) => warrantyOf(a).localeCompare(warrantyOf(b)));
    const rows = st.s === 'All' ? all : all.filter(j => warrantyStatus(j) === st.s);
    return pageHead('Warranties', `Every completed job carries a ${db.settings.warrantyMonths}-month written warranty on labor and workmanship. Walk the work before it ends.`) + `
      <div class="toolbar"><div class="chips">${['All', 'Active', 'Expiring', 'Expired'].map(s => `<button type="button" class="chip${s === st.s ? ' is-on' : ''}" data-act="filter" data-m="warranties" data-v="${s}">${s} <span>${s === 'All' ? all.length : all.filter(j => warrantyStatus(j) === s).length}</span></button>`).join('')}</div></div>
      <div class="card table-card"><table class="table">
        <thead><tr><th>Job</th><th>Customer</th><th>Completed</th><th>Warranty ends</th><th>Time left</th><th>Status</th></tr></thead>
        <tbody>${rows.map(j => `<tr data-act="edit" data-m="jobs" data-id="${j.id}" tabindex="0"><td data-label="Job">${esc(j.number)} · ${esc(j.name)}</td><td data-label="Customer">${esc(refLabel('customers', j.customerId))}</td><td data-label="Completed">${esc(fmtDate(j.completed))}</td><td data-label="Warranty ends">${esc(fmtDate(warrantyOf(j)))}</td><td data-label="Time left">${esc(inWords(daysUntil(warrantyOf(j))))}</td><td data-label="Status">${badge(warrantyStatus(j))}</td></tr>`).join('')}</tbody>
      </table>${rows.length ? '' : '<p class="empty">Mark a job Complete (with a completed date) and its warranty shows up here.</p>'}</div>`;
  }

  /* ---------------------------------------------------------------- calculators */
  function calculators() {
    const s = db.settings;
    const calc = (id, title, sub, inputs, outputs) => `
      <section class="card calc" data-calc="${id}">
        <h2>${title}</h2><p class="muted small">${sub}</p>
        <div class="fields">${inputs.map(([k, l, v]) => `<div class="field"><label for="c_${id}_${k}">${l}</label><input id="c_${id}_${k}" type="number" step="any" data-k="${k}" value="${v}"></div>`).join('')}</div>
        <div class="calc__out">${outputs.map(([k, l]) => `<div><small>${l}</small><strong data-o="${k}">—</strong></div>`).join('')}</div>
      </section>`;
    const area = [['len', 'Length (ft)', ''], ['wid', 'Width (ft)', ''], ['area', 'or Area (sq ft)', '']];
    return pageHead('Calculators', 'Quick material quantities for estimating and ordering. Density and waste defaults live in Settings.') + `
      <div class="calc-grid">
        ${calc('asph', 'Asphalt tonnage', `Hot-mix at ${s.hmaDensity} lb/ft³ compacted.`, [...area, ['th', 'Compacted thickness (in)', 2], ['den', 'Density (lb/ft³)', s.hmaDensity], ['waste', 'Waste %', s.wastePct]], [['sy', 'Square yards'], ['tons', 'Tons to order'], ['loads', 'Truckloads (~20 t)']])}
        ${calc('conc', 'Concrete yardage', 'Cubic yards for slabs, drives and walks.', [...area, ['th', 'Thickness (in)', 6], ['waste', 'Waste %', s.concreteWastePct]], [['sf', 'Square feet'], ['cy', 'Cubic yards to order'], ['trucks', 'Trucks (~10 CY)']])}
        ${calc('base', 'Aggregate base', `Base rock at ${s.baseDensity} lb/ft³ compacted.`, [...area, ['th', 'Depth (in)', 6], ['den', 'Density (lb/ft³)', s.baseDensity], ['waste', 'Waste %', s.wastePct]], [['cy', 'Cubic yards'], ['tons', 'Tons to order'], ['loads', 'Truckloads (~20 t)']])}
      </div>`;
  }
  function runCalc(card) {
    const g = k => { const el = $(`[data-k="${k}"]`, card); return el ? num(el.value) : 0; };
    const out = (k, v) => { const el = $(`[data-o="${k}"]`, card); if (el) el.textContent = v; };
    const sf = g('area') || g('len') * g('wid'), ft = g('th') / 12, w = 1 + g('waste') / 100;
    if (!sf || !ft) { $$('[data-o]', card).forEach(o => { o.textContent = '—'; }); return; }
    const id = card.dataset.calc;
    if (id === 'asph') { const t = sf * ft * g('den') / 2000 * w; out('sy', fix(sf / 9)); out('tons', fix(t)); out('loads', fix(Math.ceil(t / 20), 0)); }
    if (id === 'conc') { const cy = sf * ft / 27 * w; out('sf', fix(sf, 0)); out('cy', fix(Math.ceil(cy * 4) / 4, 2)); out('trucks', fix(Math.ceil(cy / 10), 0)); }
    if (id === 'base') { const cy = sf * ft / 27, t = sf * ft * g('den') / 2000 * w; out('cy', fix(cy)); out('tons', fix(t)); out('loads', fix(Math.ceil(t / 20), 0)); }
  }

  /* ---------------------------------------------------------------- marketing: prospects + map */
  const OSM = ['https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' }];
  const mk = { show: new Set(P_STATUSES), type: '', q: '', view: null, focusId: null };
  let map = null, markers = {}, pickMap = null, pickPin = null;
  const hasPin = p => p.lat !== '' && p.lat != null && p.lng !== '' && p.lng != null && isFinite(p.lat) && isFinite(p.lng);
  const followDue = p => !!p.nextFollowUp && daysUntil(p.nextFollowUp) <= 0 && !['Converted', 'Not interested'].includes(p.status);
  const placeOf = p => [p.city, p.state].filter(Boolean).join(', ');
  const fullAddress = p => [p.address, p.city, [p.state, p.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const telHref = s => 'tel:' + String(s).replace(/[^\d+]/g, '');

  function filteredProspects() {
    const q = mk.q.trim().toLowerCase();
    return db.prospects
      .filter(p => mk.show.has(p.status) && (!mk.type || p.businessType === mk.type) &&
        (!q || [p.company, p.contactName, p.city, p.address, p.zip, p.phone, p.email, p.businessType, p.notes].join(' ').toLowerCase().includes(q)))
      .sort((a, b) => (followDue(b) - followDue(a)) || a.company.localeCompare(b.company));
  }

  function marketing() {
    const all = db.prospects, n = s => all.filter(p => p.status === s).length, due = all.filter(followDue).length;
    const types = [...new Set([...BUSINESS_TYPES, ...all.map(p => p.businessType).filter(Boolean)])];
    return pageHead('Marketing', 'Businesses you want to win. Add them as you find them, work them from the map, and turn the interested ones into leads.', '<button class="btn btn--yellow" type="button" data-act="p-new">+ Add prospect</button>') + `
      <section class="kpis kpis--4">
        <div class="kpi"><small>Prospects</small><strong>${all.length}</strong><span>${all.filter(hasPin).length} pinned on the map</span></div>
        <div class="kpi"><small>Not contacted yet</small><strong>${n('Not contacted')}</strong><span>Ready for a first call</span></div>
        <div class="kpi"><small>Interested</small><strong>${n('Interested')}</strong><span>${money(all.filter(p => p.status === 'Interested').reduce((s, p) => s + num(p.estValue), 0))} in possible work</span></div>
        <div class="kpi${due ? ' kpi--alert' : ''}"><small>Follow-ups due</small><strong>${due}</strong><span>${n('Converted')} turned into leads so far</span></div>
      </section>
      <div class="toolbar">
        <input class="search" type="search" placeholder="Search company, contact, city…" value="${esc(mk.q)}" data-mk="q" aria-label="Search prospects">
        <select class="select" data-mk="type" aria-label="Business type"><option value="">All business types</option>${types.map(t => `<option${t === mk.type ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>
      </div>
      <div class="chips chips--map" role="group" aria-label="Statuses shown on the map">
        ${P_STATUSES.map(s => `<button type="button" class="chip chip--dot${mk.show.has(s) ? ' is-on' : ''}" style="--c:${P_COLOR[s]}" data-act="p-toggle" data-v="${esc(s)}" aria-pressed="${mk.show.has(s)}"><i></i>${esc(s)} <span>${n(s)}</span></button>`).join('')}
        <button type="button" class="chip chip--link" data-act="p-only" data-v="Not contacted">Only not contacted</button>
        <button type="button" class="chip chip--link" data-act="p-all">Show all</button>
      </div>
      <div class="mk">
        <div class="card mk__map"><div class="map" id="mk-map" role="region" aria-label="Map of prospects"></div></div>
        <div class="card mk__list">
          <div class="mk__head"><strong data-mk-count></strong><span class="muted small">Click one to find it on the map</span></div>
          <ul class="plist" id="mk-list"></ul>
        </div>
      </div>`;
  }

  function initMap() {
    const el = $('#mk-map'); if (!el) return;
    if (!window.L) { el.innerHTML = '<p class="map__off">The map couldn’t load. Check the internet connection — the list still works.</p>'; return; }
    // Wheel zoom only after a click into the map, so scrolling the page doesn't hijack the map.
    map = L.map(el, { scrollWheelZoom: false });
    map.on('click focus', () => map.scrollWheelZoom.enable());
    map.on('mouseout blur', () => map.scrollWheelZoom.disable());
    L.tileLayer(...OSM).addTo(map);
    const pins = db.prospects.filter(hasPin);
    if (mk.view) map.setView(mk.view.c, mk.view.z);
    else if (pins.length) map.fitBounds(L.latLngBounds(pins.map(p => [p.lat, p.lng])), { padding: [36, 36], maxZoom: 13 });
    else map.setView([db.settings.lat, db.settings.lon], 10);
    map.on('moveend', () => { if (map) mk.view = { c: map.getCenter(), z: map.getZoom() }; });
  }

  function popupHtml(p) {
    return `<div class="pop">
      <strong class="pop__name">${esc(p.company)}</strong>
      <small class="muted">${esc([p.businessType, placeOf(p)].filter(Boolean).join(' · '))}</small>
      <div>${pstat(p.status)}</div>
      ${p.contactName ? `<div>${esc(p.contactName)}${p.contactTitle ? `, ${esc(p.contactTitle)}` : ''}</div>` : ''}
      ${p.phone ? `<a href="${telHref(p.phone)}">${esc(p.phone)}</a>` : ''}
      ${p.email ? `<a href="mailto:${esc(p.email)}">${esc(p.email)}</a>` : ''}
      <small class="muted">${p.lastContact ? `Last contact ${esc(fmtDate(p.lastContact))}` : 'Never contacted'}${p.nextFollowUp && !['Converted', 'Not interested'].includes(p.status) ? ` · follow up ${esc(shortDate(p.nextFollowUp))}` : ''}</small>
      <div class="pop__btns">
        ${p.status !== 'Converted' ? `<button type="button" class="btn btn--yellow btn--sm" data-act="p-log" data-id="${p.id}">Log contact</button>` : ''}
        <button type="button" class="btn btn--ghost btn--sm" data-act="p-open" data-id="${p.id}">Open</button>
      </div>
    </div>`;
  }

  function updateMarketing() {
    const list = $('#mk-list'); if (!list) return;
    const rows = filteredProspects();
    $('[data-mk-count]', view).textContent = `${rows.length} of ${db.prospects.length} prospects`;
    list.innerHTML = rows.map(p => `
      <li class="plist__item" data-act="p-focus" data-id="${p.id}" tabindex="0">
        <span class="plist__dot" style="--c:${P_COLOR[p.status]}"></span>
        <div class="plist__main"><strong>${esc(p.company)}</strong><small>${esc([p.businessType, placeOf(p)].filter(Boolean).join(' · '))}</small>${p.contactName || p.phone ? `<small>${esc([p.contactName, p.phone].filter(Boolean).join(' · '))}</small>` : ''}</div>
        <div class="plist__side">${pstat(p.status)}${followDue(p) ? `<em class="due">Follow up ${daysUntil(p.nextFollowUp) < 0 ? 'overdue' : 'today'}</em>` : ''}${hasPin(p) ? '' : '<em class="nopin">No map pin</em>'}</div>
      </li>`).join('') || '<li class="empty">No prospects match. Turn on more statuses, or add one.</li>';
    if (!map) return;
    Object.values(markers).forEach(m => m.remove()); markers = {};
    rows.filter(hasPin).forEach(p => {
      markers[p.id] = L.circleMarker([p.lat, p.lng], { radius: 9, weight: 2, color: '#ffffff', fillColor: P_COLOR[p.status], fillOpacity: 1 })
        .bindTooltip(esc(p.company), { direction: 'top', offset: [0, -8] })
        .bindPopup(() => popupHtml(p), { minWidth: 230, maxWidth: 280 })
        .on('click', () => markActive(p.id))
        .addTo(map);
    });
    if (mk.focusId && markers[mk.focusId]) focusProspect(mk.focusId);
    mk.focusId = null;
  }
  function markActive(id) {
    $$('.plist__item.is-active', view).forEach(li => li.classList.remove('is-active'));
    const li = $(`.plist__item[data-id="${id}"]`, view);
    if (li) { li.classList.add('is-active'); li.scrollIntoView({ block: 'nearest' }); }
  }
  function focusProspect(id) {
    const m = markers[id];
    if (!map || !m) { openProspect(id); return; }
    map.setView(m.getLatLng(), Math.max(map.getZoom(), 14));
    m.openPopup(); markActive(id);
    if (window.innerWidth < 900) $('#mk-map').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // Add / edit flow: four short steps, then save.
  const P_STEPS = ['Company', 'Location', 'Contact', 'Status & next step'];
  const P_FIELDS = [
    [f('company', 'Company name', 'text', { req: true, wide: true }), f('businessType', 'Business type', 'select', { o: BUSINESS_TYPES }), f('website', 'Website', 'url'),
      f('interest', 'Work they probably need', 'select', { o: SERVICES }), f('source', 'How you found them', 'select', { o: P_SOURCES })],
    [f('address', 'Street address', 'text', { wide: true }), f('city', 'City'), f('state', 'State', 'select', { o: ['MO', 'KS'] }), f('zip', 'ZIP')],
    [f('contactName', 'Contact person'), f('contactTitle', 'Title / role'), f('phone', 'Phone', 'tel'), f('email', 'Email', 'email')],
    [f('status', 'Status', 'select', { o: P_STATUSES }), f('nextFollowUp', 'Next follow-up', 'date'), f('estValue', 'Estimated job size', 'money'), f('notes', 'Notes', 'textarea', { wide: true })],
  ];
  const activityHtml = p => (p.activity || []).length ? `<div class="activity"><h3>Contact history</h3><ul>${p.activity.map(a => `<li><div><strong>${esc(fmtDate(a.date))}</strong> · ${esc(a.method)} ${pstat(a.outcome)}</div>${a.notes ? `<p>${esc(a.notes)}</p>` : ''}</li>`).join('')}</ul></div>` : '';

  function openProspect(id, step = 0) {
    const p = (id && find('prospects', id)) || { status: 'Not contacted', state: 'MO' };
    const isNew = !p.id, last = P_STEPS.length - 1;
    $('#drawer-panel').innerHTML = `
      <form class="form" data-pform data-id="${p.id || ''}" data-step="0" data-max="${isNew ? 0 : last}" novalidate>
        <header class="form__head">
          <div><small>${isNew ? 'Marketing · new prospect' : 'Marketing · prospect'}</small><h2>${isNew ? 'Add a potential customer' : esc(p.company)}</h2></div>
          <button type="button" class="x x--lg" data-act="close" aria-label="Close">×</button>
        </header>
        <ol class="wiz">${P_STEPS.map((s, i) => `<li><button type="button" data-act="p-step" data-v="${i}"><span>${i + 1}</span>${esc(s)}</button></li>`).join('')}</ol>
        <div class="form__body">
          ${p.sample ? '<p class="note">Sample prospect — edit it, or clear all sample data in Settings.</p>' : ''}
          ${P_FIELDS.map((fs, i) => `<section class="wiz__step" data-step="${i}"${i ? ' hidden' : ''}>
            ${i === 1 ? '<p class="muted small">Type the address and press <strong>Find on map</strong>, or just click the map to drop the pin. Drag the pin to fine-tune it.</p>' : ''}
            <div class="fields">${fs.map(fd => fieldHtml(fd, p[fd.k] ?? '')).join('')}</div>
            ${i === 0 ? '<p class="dup" data-dup hidden></p>' : ''}
            ${i === 1 ? `<div class="pick">
              <div class="btn-row"><button type="button" class="btn btn--black btn--sm" data-act="p-geocode">Find on map</button><span class="small muted" data-geo-msg>${hasPin(p) ? 'Pinned on the map.' : 'No pin yet.'}</span></div>
              <div class="pick__map" id="pick-map"></div>
              <input type="hidden" name="lat" value="${esc(p.lat ?? '')}"><input type="hidden" name="lng" value="${esc(p.lng ?? '')}">
            </div>` : ''}
            ${i === last ? activityHtml(p) : ''}
          </section>`).join('')}
        </div>
        <footer class="form__foot">
          ${isNew ? '' : '<button type="button" class="btn btn--danger btn--sm" data-act="p-delete">Delete</button>'}
          <div class="form__actions">${isNew ? '' : `${p.status !== 'Converted' ? '<button type="button" class="btn btn--ghost btn--sm" data-act="p-log">Log contact</button><button type="button" class="btn btn--ghost btn--sm" data-act="p-convert">Convert to lead</button>' : ''}`}</div>
          <button type="button" class="btn btn--ghost" data-act="p-back">Back</button>
          <button type="button" class="btn btn--black" data-act="p-next">Next</button>
          <button type="submit" class="btn btn--yellow" data-save>Save prospect</button>
        </footer>
      </form>`;
    showDrawer();
    goStep($('form[data-pform]'), step);
  }

  function goStep(form, n) {
    const isNew = !form.dataset.id, last = P_STEPS.length - 1, max = Math.max(num(form.dataset.max), n);
    form.dataset.step = n; form.dataset.max = max;
    $$('.wiz__step', form).forEach(s => { s.hidden = +s.dataset.step !== n; });
    $$('.wiz li', form).forEach((li, i) => {
      li.classList.toggle('is-on', i === n); li.classList.toggle('is-done', i < n);
      const b = $('button', li); b.disabled = isNew && i > max; if (i === n) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    $('[data-act=p-back]', form).hidden = n === 0;
    $('[data-act=p-next]', form).hidden = n === last;
    $('[data-save]', form).hidden = isNew && n < last;
    if (n === 1) initPickMap(form);
    const first = $(`.wiz__step[data-step="${n}"] input:not([type=hidden]), .wiz__step[data-step="${n}"] select`, form);
    if (first && isNew) first.focus({ preventScroll: true });
  }
  function nextStep(form) {
    const n = +form.dataset.step, e = form.elements;
    if (n === 0 && !e.company.value.trim()) { e.company.closest('.field').classList.add('is-bad'); e.company.focus(); toast('Add the company name first.'); return; }
    e.company.closest('.field').classList.remove('is-bad');
    if (n === 1 && e.lat.value === '' && (e.address.value.trim() || e.city.value.trim())) geocodeForm(form);
    goStep(form, Math.min(n + 1, P_STEPS.length - 1));
  }

  function initPickMap(form) {
    const el = $('#pick-map', form); if (!el) return;
    if (!window.L) { el.innerHTML = '<p class="map__off">Map unavailable — you can still save the address.</p>'; return; }
    if (pickMap) { setTimeout(() => pickMap && pickMap.invalidateSize(), 50); return; }
    const has = form.elements.lat.value !== '', lat = num(form.elements.lat.value), lng = num(form.elements.lng.value);
    pickMap = L.map(el).setView(has ? [lat, lng] : [db.settings.lat, db.settings.lon], has ? 16 : 10);
    L.tileLayer(...OSM).addTo(pickMap);
    if (has) setPin(form, lat, lng);
    pickMap.on('click', ev => setPin(form, ev.latlng.lat, ev.latlng.lng, false, 'Pin placed. Drag it to adjust.'));
    setTimeout(() => pickMap && pickMap.invalidateSize(), 260);
  }
  function setPin(form, lat, lng, recenter, msg) {
    form.elements.lat.value = (+lat).toFixed(6); form.elements.lng.value = (+lng).toFixed(6);
    if (pickMap) {
      if (!pickPin) {
        pickPin = L.marker([lat, lng], { draggable: true, icon: L.divIcon({ className: 'pin', html: '<span></span>', iconSize: [28, 28], iconAnchor: [14, 28] }) }).addTo(pickMap);
        pickPin.on('dragend', () => { const ll = pickPin.getLatLng(); form.elements.lat.value = ll.lat.toFixed(6); form.elements.lng.value = ll.lng.toFixed(6); geoMsg(form, 'Pin moved.'); });
      } else pickPin.setLatLng([lat, lng]);
      if (recenter) pickMap.setView([lat, lng], 16);
    }
    if (msg) geoMsg(form, msg);
  }
  const geoMsg = (form, m) => { const el = $('[data-geo-msg]', form); if (el) el.textContent = m; };

  // Free OpenStreetMap geocoder (Nominatim), biased toward the KC metro. Light, one-at-a-time use only.
  function geocode(q) {
    const url = 'https://nominatim.openstreetmap.org/search?' + new URLSearchParams({ q, format: 'jsonv2', limit: '1', countrycodes: 'us', viewbox: '-95.4,39.6,-93.4,38.4' });
    return fetch(url, { headers: { Accept: 'application/json' } })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(j => j[0] ? { lat: +j[0].lat, lng: +j[0].lon } : null);
  }
  async function geocodeForm(form) {
    const e = form.elements, q = [e.address.value, e.city.value, e.state.value, e.zip.value].map(s => s.trim()).filter(Boolean).join(', ');
    if (!q) { geoMsg(form, 'Type an address or city first.'); return false; }
    geoMsg(form, 'Looking up the address…');
    try {
      const hit = await geocode(q);
      if (!form.isConnected) return false;
      if (!hit) { geoMsg(form, 'Couldn’t find that address. Click the map to drop the pin yourself.'); return false; }
      setPin(form, hit.lat, hit.lng, true, 'Found it. Drag the pin if it’s not exactly right.');
      return true;
    } catch (err) { geoMsg(form, 'Address lookup isn’t available right now. Click the map to drop the pin.'); return false; }
  }

  // quiet = save without closing (used before Log contact / Convert)
  async function saveProspect(form, quiet) {
    const e = form.elements;
    if (!e.company.value.trim()) { goStep(form, 0); e.company.closest('.field').classList.add('is-bad'); e.company.focus(); toast('Add the company name first.'); return null; }
    if (e.lat.value === '' && (e.address.value.trim() || e.city.value.trim())) await geocodeForm(form);
    const data = {};
    P_FIELDS.flat().forEach(fd => { let v = e[fd.k].value.trim(); if (fd.t === 'money' && v !== '') v = num(v); data[fd.k] = v; });
    data.lat = e.lat.value === '' ? '' : num(e.lat.value);
    data.lng = e.lng.value === '' ? '' : num(e.lng.value);
    let p = form.dataset.id ? find('prospects', form.dataset.id) : null;
    const isNew = !p;
    if (p) Object.assign(p, data);
    else { p = { id: uid(), created: today(), activity: [], lastContact: '', leadId: '', ...data }; db.prospects.push(p); form.dataset.id = p.id; }
    save();
    if (quiet) return p;
    mk.show.add(p.status); mk.focusId = hasPin(p) ? p.id : null;
    closeForm();
    if (ui.page === 'marketing') render(); else location.hash = 'marketing';
    toast(`${p.company} ${isNew ? 'added' : 'saved'}${hasPin(p) ? '' : ' — no map pin yet'}.`);
    return p;
  }

  function openLog(id) {
    const p = find('prospects', id); if (!p) return;
    closeForm();
    $('#drawer-panel').innerHTML = `
      <form class="form" data-plog data-id="${p.id}" novalidate>
        <header class="form__head">
          <div><small>Log contact</small><h2>${esc(p.company)}</h2></div>
          <button type="button" class="x x--lg" data-act="close" aria-label="Close">×</button>
        </header>
        <div class="form__body">
          ${p.contactName || p.phone || p.email ? `<p class="log-who">${esc([p.contactName, p.contactTitle].filter(Boolean).join(', '))}${p.phone ? ` <a href="${telHref(p.phone)}">${esc(p.phone)}</a>` : ''}${p.email ? ` <a href="mailto:${esc(p.email)}">${esc(p.email)}</a>` : ''}</p>` : ''}
          <div class="fields">
            ${fieldHtml(f('date', 'Date', 'date'), today())}
            ${fieldHtml(f('method', 'How you reached out', 'select', { o: P_METHODS }), 'Phone call')}
            ${fieldHtml(f('outcome', 'Where it stands now', 'select', { o: ['Contacted', 'Interested', 'Not interested'] }), p.status === 'Interested' ? 'Interested' : 'Contacted')}
            ${fieldHtml(f('nextFollowUp', 'Next follow-up', 'date'), addDays(today(), 7))}
            ${fieldHtml(f('notes', 'What happened', 'textarea', { wide: true }), '')}
          </div>
          ${activityHtml(p)}
        </div>
        <footer class="form__foot">
          <div class="form__actions"></div>
          <button type="button" class="btn btn--ghost" data-act="close">Cancel</button>
          <button type="submit" class="btn btn--yellow">Save contact</button>
        </footer>
      </form>`;
    showDrawer();
  }
  function saveLog(form) {
    const p = find('prospects', form.dataset.id), e = form.elements;
    const entry = { id: uid(), date: e.date.value || today(), method: e.method.value || 'Other', outcome: e.outcome.value || 'Contacted', notes: e.notes.value.trim() };
    p.activity = [entry, ...(p.activity || [])].sort((a, b) => b.date.localeCompare(a.date));
    p.status = entry.outcome;
    p.lastContact = [p.lastContact, entry.date].filter(Boolean).sort().pop();
    p.nextFollowUp = entry.outcome === 'Not interested' ? '' : e.nextFollowUp.value;
    save(); mk.show.add(p.status); mk.focusId = ui.page === 'marketing' && hasPin(p) ? p.id : null;
    closeForm(); render(); toast(`Logged. ${p.company} is now “${p.status}”.`);
  }

  function convertProspect(p) {
    const typeMap = { 'Industrial / warehouse': 'Industrial / Warehouse', 'Distribution / logistics': 'Industrial / Warehouse', 'HOA / apartments': 'HOA / Multifamily', 'Municipal / government': 'Municipal / Government', 'School / education': 'Municipal / Government', 'Church / place of worship': 'Church / Nonprofit' };
    const lead = { id: uid(), created: today(), name: p.contactName || p.company, company: p.contactName ? p.company : '', phone: p.phone, email: p.email, service: p.interest || 'Not sure yet', propertyType: typeMap[p.businessType] || 'Commercial', address: fullAddress(p), timeline: '', source: 'Marketing outreach', assignedTo: '', siteVisit: '', status: 'Contacted', notes: p.notes || '' };
    db.leads.push(lead);
    p.status = 'Converted'; p.leadId = lead.id; p.nextFollowUp = '';
    p.activity = [{ id: uid(), date: today(), method: 'Converted', outcome: 'Converted', notes: 'Turned into a lead.' }, ...(p.activity || [])];
    save(); closeForm(); render();
    openForm('leads', lead.id);
    toast(`${p.company} is now a lead — assign an estimator and set the site visit.`);
  }

  /* ---------------------------------------------------------------- settings */
  function settings() {
    const s = db.settings, c = s.company;
    const inp = (path, label, v, type = 'text', extra = '') => `<div class="field"><label for="s_${path}">${label}</label><input id="s_${path}" data-s="${path}" type="${type}" value="${esc(v)}"${type === 'number' ? ' step="any"' : ''}${extra}></div>`;
    const pbRow = p => `<tr data-pid="${p.id}"><td><select data-p="cat" aria-label="Category">${['Asphalt', 'Concrete', 'Excavation', 'General'].map(x => `<option${x === p.cat ? ' selected' : ''}>${x}</option>`).join('')}</select></td><td><input data-p="name" value="${esc(p.name)}" aria-label="Item"></td><td><select data-p="unit" aria-label="Unit">${UNITS.map(u => `<option${u === p.unit ? ' selected' : ''}>${u}</option>`).join('')}</select></td><td class="r"><input data-p="price" type="number" step="0.01" value="${esc(p.price)}" aria-label="Price"></td><td><button type="button" class="x" data-act="pb-del" aria-label="Remove item">×</button></td></tr>`;
    return pageHead('Settings', 'Company details, crews, rates and your data.', '<button type="button" class="btn btn--yellow" data-act="settings-save">Save settings</button>') + `
      <div class="settings">
        <section class="card"><h2>Company</h2><div class="fields">
          ${inp('company.name', 'Name', c.name)}${inp('company.phone', 'Phone', c.phone)}${inp('company.email', 'Email', c.email)}${inp('company.address', 'Address', c.address)}
        </div></section>
        <section class="card"><h2>Crews &amp; estimators</h2><div class="fields">
          <div class="field field--wide"><label for="s_crews">Crews (comma-separated)</label><input id="s_crews" data-s="crews" data-list value="${esc(s.crews.join(', '))}"></div>
          <div class="field field--wide"><label for="s_est">Estimators (comma-separated)</label><input id="s_est" data-s="estimators" data-list value="${esc(s.estimators.join(', '))}"></div>
        </div></section>
        <section class="card"><h2>Terms &amp; warranty</h2><div class="fields">
          ${inp('warrantyMonths', 'Warranty (months)', s.warrantyMonths, 'number')}${inp('termsDays', 'Invoice terms (days)', s.termsDays, 'number')}${inp('proposalValidDays', 'Proposals valid for (days)', s.proposalValidDays, 'number')}
        </div></section>
        <section class="card"><h2>Weather &amp; materials</h2><p class="muted small">Rules of thumb for the go / watch / no badges. The project or city spec always governs.</p><div class="fields">
          ${inp('asphaltMinF', 'Asphalt minimum air temp (°F)', s.asphaltMinF, 'number')}${inp('concreteMinF', 'Concrete minimum overnight low (°F)', s.concreteMinF, 'number')}${inp('rainMaxPct', 'Rain chance that stops work (%)', s.rainMaxPct, 'number')}
          ${inp('lat', 'Forecast latitude', s.lat, 'number')}${inp('lon', 'Forecast longitude', s.lon, 'number')}
          ${inp('hmaDensity', 'Hot-mix density (lb/ft³)', s.hmaDensity, 'number')}${inp('baseDensity', 'Base rock density (lb/ft³)', s.baseDensity, 'number')}${inp('wastePct', 'Asphalt / base waste %', s.wastePct, 'number')}${inp('concreteWastePct', 'Concrete waste %', s.concreteWastePct, 'number')}
        </div></section>
        <section class="card settings__wide"><div class="card__head"><h2>Price book</h2><button type="button" class="btn btn--ghost btn--sm" data-act="pb-add">+ Add item</button></div>
          ${s.sampleRates ? '<p class="note">These are placeholder rates so the sample estimates add up. Replace them with your real unit prices.</p>' : ''}
          <div class="lines__scroll"><table class="lines__table pb"><thead><tr><th>Category</th><th>Item</th><th>Unit</th><th class="r">Unit price</th><th></th></tr></thead><tbody>${s.priceBook.map(pbRow).join('')}</tbody></table></div>
        </section>
        <section class="card settings__wide"><h2>Your data</h2>
          <p class="muted small">Everything lives in this browser on this computer. Export a backup regularly, and use Import to move it to another computer.</p>
          <div class="btn-row">
            <button type="button" class="btn btn--black" data-act="export">Export backup (.json)</button>
            <label class="btn btn--ghost">Import backup<input type="file" accept="application/json,.json" data-import hidden></label>
            ${db.meta.sample ? '<button type="button" class="btn btn--ghost" data-act="clear-sample">Clear sample data</button>' : ''}
            <button type="button" class="btn btn--danger" data-act="reset">Reset to sample data</button>
          </div>
        </section>
      </div>`;
  }
  function saveSettings() {
    const s = db.settings;
    $$('[data-s]', view).forEach(el => {
      const path = el.dataset.s.split('.');
      let v = el.value.trim();
      if (el.hasAttribute('data-list')) v = v.split(',').map(x => x.trim()).filter(Boolean);
      else if (el.type === 'number') v = num(v);
      if (path.length === 2) s[path[0]][path[1]] = v; else s[path[0]] = v;
    });
    s.priceBook = $$('.pb tbody tr', view).map(tr => ({ id: tr.dataset.pid, cat: $('[data-p=cat]', tr).value, name: $('[data-p=name]', tr).value.trim(), unit: $('[data-p=unit]', tr).value, price: num($('[data-p=price]', tr).value) })).filter(p => p.name);
    s.sampleRates = false;
    WX.days = null; WX.err = false;
    save(); render(); toast('Settings saved.');
  }

  /* ---------------------------------------------------------------- render */
  const VIEWS = { dashboard, schedule, marketing, warranties, calc: calculators, settings };
  const TITLES = Object.fromEntries(NAV.flatMap(([, items]) => items.map(([k, l]) => [k, l])));

  function render() {
    const page = (location.hash.slice(1) || 'dashboard').split('/')[0];
    ui.page = VIEWS[page] || M[page] ? page : 'dashboard';
    $('#nav').innerHTML = NAV.map(([group, items]) => `<div class="side__group"><span>${group}</span>${items.map(([k, l, ic]) => `<a href="#${k}" class="side__link${k === ui.page ? ' is-active' : ''}"${k === ui.page ? ' aria-current="page"' : ''}>${icon(ic)}<span>${l}</span>${badgeCount(k)}</a>`).join('')}</div>`).join('');
    $('#top-title').textContent = TITLES[ui.page] || '';
    $('#top-date').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    $('#banner').innerHTML = db.meta.sample ? `<div class="banner"><span><strong>You’re looking at sample data.</strong> Click around, then clear it when you’re ready to enter real work.</span><button type="button" class="btn btn--black btn--sm" data-act="clear-sample">Clear sample data</button></div>` : '';
    if (map) { map.remove(); map = null; markers = {}; }
    view.innerHTML = VIEWS[ui.page] ? VIEWS[ui.page]() : listView(ui.page);
    if (M[ui.page]) applySearch(ui.page);
    if (ui.page === 'marketing') { initMap(); updateMarketing(); }
    if (ui.page === 'calc') $$('[data-calc]', view).forEach(runCalc);
    document.title = `${TITLES[ui.page] || 'Dashboard'} · Max Paving Manage`;
  }
  function badgeCount(k) {
    const n = k === 'marketing' ? db.prospects.filter(followDue).length
      : k === 'leads' ? db.leads.filter(l => l.status === 'New').length
      : k === 'invoices' ? db.invoices.filter(i => invStatus(i) === 'Overdue').length
      : k === 'docs' ? db.docs.filter(d => expStatus(d.expires) !== 'Current').length : 0;
    return n ? `<em class="side__count">${n}</em>` : '';
  }

  /* ---------------------------------------------------------------- events */
  let armed = null; // two-click confirm for destructive buttons, instead of browser dialogs
  function confirmTwice(btn, label) {
    if (armed === btn) { armed = null; return true; }
    if (armed) { armed.textContent = armed.dataset.orig; armed.classList.remove('is-armed'); }
    armed = btn; btn.dataset.orig = btn.textContent; btn.textContent = label; btn.classList.add('is-armed');
    setTimeout(() => { if (armed === btn) { btn.textContent = btn.dataset.orig; btn.classList.remove('is-armed'); armed = null; } }, 4000);
    return false;
  }

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const act = el.dataset.act;
    const form = el.closest('form[data-form]'), pform = el.closest('form[data-pform]');
    switch (act) {
      // marketing
      case 'p-new': openProspect(); break;
      case 'p-open': openProspect(el.dataset.id); break;
      case 'p-focus': focusProspect(el.dataset.id); break;
      case 'p-step': goStep(pform, +el.dataset.v); break;
      case 'p-next': nextStep(pform); break;
      case 'p-back': goStep(pform, Math.max(0, +pform.dataset.step - 1)); break;
      case 'p-geocode': geocodeForm(pform); break;
      case 'p-log': if (pform) saveProspect(pform, true).then(p => p && openLog(p.id)); else openLog(el.dataset.id); break;
      case 'p-convert': saveProspect(pform, true).then(p => p && convertProspect(p)); break;
      case 'p-delete': {
        if (!confirmTwice(el, 'Click again to delete')) break;
        db.prospects = db.prospects.filter(p => p.id !== pform.dataset.id);
        save(); closeForm(); render(); toast('Prospect deleted.'); break;
      }
      case 'p-toggle': {
        const s = el.dataset.v; if (mk.show.has(s)) mk.show.delete(s); else mk.show.add(s);
        el.classList.toggle('is-on', mk.show.has(s)); el.setAttribute('aria-pressed', String(mk.show.has(s)));
        updateMarketing(); break;
      }
      case 'p-all': case 'p-only': {
        mk.show = new Set(act === 'p-all' ? P_STATUSES : [el.dataset.v]);
        $$('[data-act=p-toggle]', view).forEach(b => { const on = mk.show.has(b.dataset.v); b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); });
        updateMarketing(); break;
      }
      case 'new': openForm(el.dataset.m); break;
      case 'edit': openForm(el.dataset.m, el.dataset.id); break;
      case 'close': closeForm(); break;
      case 'filter': (ui.filters[el.dataset.m] || (ui.filters[el.dataset.m] = { q: '' })).s = el.dataset.v; render(); break;
      case 'week': ui.week = el.dataset.v === '0' ? monday(today()) : addDays(ui.week, +el.dataset.v); render(); break;
      case 'delete': {
        if (!confirmTwice(el, 'Click again to delete')) break;
        const key = form.dataset.form; db[key] = db[key].filter(r => r.id !== form.dataset.id);
        save(); closeForm(); render(); toast(`${M[key].one} deleted.`); break;
      }
      case 'form-action': { const rec = saveForm(form); if (rec) { ACTIONS[el.dataset.a](rec); render(); } break; }
      case 'line-add': { const tb = $('[data-lines] tbody', form); tb.insertAdjacentHTML('beforeend', lineRow({ unit: 'SF' })); $('tr:last-child [name=l_desc]', tb).focus(); break; }
      case 'line-del': { const w = el.closest('[data-lines]'); el.closest('tr').remove(); recalcLines(w); break; }
      case 'settings-save': saveSettings(); break;
      case 'pb-add': $('.pb tbody', view).insertAdjacentHTML('beforeend', `<tr data-pid="${uid()}"><td><select data-p="cat">${['Asphalt', 'Concrete', 'Excavation', 'General'].map(x => `<option>${x}</option>`).join('')}</select></td><td><input data-p="name" placeholder="New item" aria-label="Item"></td><td><select data-p="unit">${UNITS.map(u => `<option>${u}</option>`).join('')}</select></td><td class="r"><input data-p="price" type="number" step="0.01" aria-label="Price"></td><td><button type="button" class="x" data-act="pb-del" aria-label="Remove item">×</button></td></tr>`); break;
      case 'pb-del': el.closest('tr').remove(); break;
      case 'export': {
        const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `max-paving-manage-backup-${today()}.json`;
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        toast('Backup downloaded.'); break;
      }
      case 'clear-sample': {
        if (!confirmTwice(el, 'Click again to clear')) break;
        COLLECTIONS.forEach(c => { db[c] = db[c].filter(r => !r.sample); });
        db.meta.sample = false; save(); render(); toast('Sample data cleared. Your team list and price book were kept.'); break;
      }
      case 'reset': {
        if (!confirmTwice(el, 'Click again — this erases everything')) break;
        db = seed(); save(); render(); toast('Reset to sample data.'); break;
      }
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('#drawer').hidden) closeForm();
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('tr[data-act], li[data-act]')) { e.preventDefault(); e.target.click(); }
  });
  document.addEventListener('submit', e => {
    const pf = e.target.closest('form[data-pform]');
    if (pf) {
      e.preventDefault();
      // Enter on an early step of a new prospect moves forward instead of saving half-filled.
      if (!pf.dataset.id && +pf.dataset.step < P_STEPS.length - 1) nextStep(pf); else saveProspect(pf);
      return;
    }
    const lf = e.target.closest('form[data-plog]');
    if (lf) { e.preventDefault(); saveLog(lf); return; }
    const form = e.target.closest('form[data-form]'); if (!form) return;
    e.preventDefault();
    const key = form.dataset.form, isNew = !form.dataset.id;
    if (saveForm(form)) { closeForm(); render(); toast(`${M[key].one} ${isNew ? 'added' : 'saved'}.`); }
  });
  document.addEventListener('input', e => {
    const t = e.target;
    if (t.matches('[data-search]')) { ui.filters[t.dataset.search].q = t.value; applySearch(t.dataset.search); }
    if (t.matches('[data-mk=q]')) { mk.q = t.value; updateMarketing(); }
    if (t.name === 'company' && t.closest('form[data-pform]')) {
      const form = t.closest('form[data-pform]'), v = t.value.trim().toLowerCase(), box = $('[data-dup]', form);
      const hit = v.length > 2 && (db.prospects.some(p => p.id !== form.dataset.id && p.company.toLowerCase() === v) ? 'prospects' : db.customers.some(c => c.name.toLowerCase() === v) ? 'customers' : '');
      box.hidden = !hit;
      if (hit) box.textContent = `Heads up: “${t.value.trim()}” is already in your ${hit}.`;
    }
    if (t.closest('[data-lines]') && t.matches('[name=l_qty], [name=l_price]')) recalcLines(t.closest('[data-lines]'));
    const card = t.closest('[data-calc]');
    if (card) {
      if (t.dataset.k === 'len' || t.dataset.k === 'wid') { const a = $('[data-k=area]', card), l = num($('[data-k=len]', card).value), w = num($('[data-k=wid]', card).value); a.value = l && w ? Math.round(l * w * 100) / 100 : ''; }
      runCalc(card);
    }
  });
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.matches('[data-mk=type]')) { mk.type = t.value; updateMarketing(); }
    if (t.matches('[data-pb]') && t.value) {
      const p = db.settings.priceBook.find(x => x.id === t.value), w = t.closest('[data-lines]');
      $('tbody', w).insertAdjacentHTML('beforeend', lineRow({ desc: p.name, unit: p.unit, price: p.price, qty: '' }));
      t.value = ''; $('tbody tr:last-child [name=l_qty]', w).focus(); recalcLines(w);
    }
    if (t.matches('[data-import]') && t.files[0]) {
      const r = new FileReader();
      r.onload = () => {
        try {
          const o = JSON.parse(r.result);
          if (!o || !o.settings || !Array.isArray(o.jobs)) throw new Error('not a backup');
          db = migrate(o); save(); render(); toast('Backup imported.');
        } catch (err) { toast('That file isn’t a Max Paving Manage backup.'); }
      };
      r.readAsText(t.files[0]);
    }
  });

  // Mobile menu
  const side = $('#side'), menuBtn = $('#menu-btn'), scrim = $('#scrim');
  const setMenu = open => { document.body.classList.toggle('nav-open', open); menuBtn.setAttribute('aria-expanded', String(open)); };
  menuBtn.addEventListener('click', () => setMenu(!document.body.classList.contains('nav-open')));
  scrim.addEventListener('click', () => setMenu(false));
  side.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });

  window.addEventListener('hashchange', () => { closeForm(); render(); window.scrollTo(0, 0); });
  render();
})();
