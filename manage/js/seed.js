/* Default settings (cost book, crews, assemblies) and the sample company used for demos.
   Every sample record has sample: true so "Clear sample data" can remove it. */
import { uid, today, addDays, monday } from './core.js';

// Placeholder unit costs so the sample estimates add up. Replace in Settings → Cost book.
const COST_BOOK = [
  ['hma-surf', 'HMA surface mix', 'TON', 78, 'Material', 'Asphalt'],
  ['hma-base', 'HMA base mix', 'TON', 70, 'Material', 'Asphalt'],
  ['tack', 'Tack coat', 'GAL', 4.25, 'Material', 'Asphalt'],
  ['ab3', 'Aggregate base (AB-3)', 'TON', 24, 'Material', 'Excavation'],
  ['conc4000', 'Concrete 4000 psi', 'CY', 168, 'Material', 'Concrete'],
  ['mesh', 'Rebar / wire mesh', 'SF', 0.55, 'Material', 'Concrete'],
  ['cure', 'Curing compound', 'SF', 0.06, 'Material', 'Concrete'],
  ['joint', 'Joint sealant', 'LF', 1.1, 'Material', 'Concrete'],
  ['forms', 'Forms & stakes', 'LF', 0.9, 'Material', 'Concrete'],
  ['dwp', 'Detectable warning panel', 'EA', 260, 'Material', 'Concrete'],
  ['mill', 'Milling (subcontract)', 'SY', 1.75, 'Subcontract', 'Asphalt'],
  ['sawcut', 'Saw cutting', 'LF', 3, 'Subcontract', 'General'],
  ['dump', 'Disposal / dump fees', 'TON', 20, 'Other', 'Excavation'],
  ['truck', 'Tandem dump truck', 'HR', 105, 'Trucking', 'General'],
  ['mob', 'Mobilization (equipment move)', 'LS', 950, 'Equipment', 'General'],
  ['traffic', 'Traffic control & signage', 'DAY', 350, 'Other', 'General'],
].map(([id, name, unit, cost, type, cat]) => ({ id, name, unit, cost, type, cat }));

const CREWS = [
  { id: 'asphalt', name: 'Asphalt crew', cat: 'Asphalt', size: 6, hoursPerDay: 10, avgRate: 30, equipDayCost: 1850, color: '#111111' },
  { id: 'concrete', name: 'Concrete crew', cat: 'Concrete', size: 5, hoursPerDay: 10, avgRate: 29, equipDayCost: 450, color: '#e5b800' },
  { id: 'excavation', name: 'Excavation crew', cat: 'Excavation', size: 3, hoursPerDay: 10, avgRate: 31, equipDayCost: 1650, color: '#8a5a2b' },
];

// rule: per = qty × factor · hma = tons of hot-mix for the thickness · conc = CY of concrete for the thickness
//       base = tons of base rock at `factor` inches · haul = truck hours for the tons above · fixed = factor
const P = (item, rule, factor = 1) => ({ item, rule, factor });
const ASSEMBLIES = [
  { id: 'a-overlay', name: 'Mill & overlay', cat: 'Asphalt', unit: 'SY', thick: 2, prod: 3000, crew: 'asphalt', parts: [P('mill', 'per', 1), P('tack', 'per', 0.05), P('hma-surf', 'hma'), P('truck', 'haul')] },
  { id: 'a-newlot', name: 'New asphalt lot (6" base)', cat: 'Asphalt', unit: 'SY', thick: 3, prod: 1200, crew: 'asphalt', parts: [P('ab3', 'base', 6), P('hma-base', 'hma'), P('tack', 'per', 0.05), P('truck', 'haul')] },
  { id: 'a-drive', name: 'Asphalt driveway (4" base)', cat: 'Asphalt', unit: 'SY', thick: 2.5, prod: 900, crew: 'asphalt', parts: [P('ab3', 'base', 4), P('hma-surf', 'hma'), P('truck', 'haul')] },
  { id: 'a-patch', name: 'Asphalt patch, remove & replace', cat: 'Asphalt', unit: 'SF', thick: 4, prod: 1200, crew: 'asphalt', parts: [P('sawcut', 'per', 0.4), P('dump', 'per', 0.025), P('tack', 'per', 0.006), P('hma-base', 'hma'), P('truck', 'haul')] },
  { id: 'c-pave', name: 'Concrete paving', cat: 'Concrete', unit: 'SF', thick: 6, prod: 2200, crew: 'concrete', parts: [P('ab3', 'base', 4), P('conc4000', 'conc'), P('mesh', 'per', 1), P('cure', 'per', 1), P('joint', 'per', 0.1), P('truck', 'haul')] },
  { id: 'c-heavy', name: 'Heavy-duty concrete (truck lanes)', cat: 'Concrete', unit: 'SF', thick: 8, prod: 1800, crew: 'concrete', parts: [P('ab3', 'base', 6), P('conc4000', 'conc'), P('mesh', 'per', 1.2), P('cure', 'per', 1), P('joint', 'per', 0.1), P('truck', 'haul')] },
  { id: 'c-walk', name: 'Concrete sidewalk', cat: 'Concrete', unit: 'SF', thick: 4, prod: 900, crew: 'concrete', parts: [P('ab3', 'base', 2), P('conc4000', 'conc'), P('mesh', 'per', 1), P('cure', 'per', 1), P('forms', 'per', 0.3)] },
  { id: 'c-curb', name: 'Curb & gutter (30")', cat: 'Concrete', unit: 'LF', thick: 0, prod: 350, crew: 'concrete', parts: [P('conc4000', 'per', 0.06), P('forms', 'per', 2), P('ab3', 'per', 0.05)] },
  { id: 'c-ramp', name: 'ADA curb ramp', cat: 'Concrete', unit: 'EA', thick: 0, prod: 1.5, crew: 'concrete', parts: [P('conc4000', 'per', 2.5), P('dwp', 'per', 1), P('forms', 'per', 30), P('sawcut', 'per', 20)] },
  { id: 'x-remove', name: 'Remove & dispose concrete', cat: 'Excavation', unit: 'SF', thick: 6, prod: 2500, crew: 'excavation', parts: [P('sawcut', 'per', 0.25), P('dump', 'per', 0.04), P('truck', 'haul')] },
  { id: 'x-excav', name: 'Excavation & haul-off', cat: 'Excavation', unit: 'CY', thick: 0, prod: 250, crew: 'excavation', parts: [P('dump', 'per', 1.4), P('truck', 'haul')] },
  { id: 'x-grade', name: 'Fine grade & proof roll', cat: 'Excavation', unit: 'SY', thick: 0, prod: 4000, crew: 'excavation', parts: [] },
];

export function defaultSettings() {
  return {
    company: { name: 'Max Paving', phone: '(816) 220-7777', email: 'maxpavingkc@gmail.com', address: '29803 SW Eagles Pkwy, Grain Valley, MO 64029', website: 'maxpavingkc.com' },
    crews: CREWS.map(c => ({ ...c })),
    costBook: COST_BOOK.map(c => ({ ...c })),
    assemblies: ASSEMBLIES.map(a => ({ ...a, parts: a.parts.map(p => ({ ...p })) })),
    estimators: ['Wendell Gourley', 'Daniel Cushman', 'Gary Stucker'],
    overheadPct: 10, marginPct: 25, burdenPct: 30,
    hmaLbPerSyIn: 110, baseDensity: 140, wastePct: 5, concreteWastePct: 8,
    truckTons: 20, haulMin: 25, loadMin: 20,
    asphaltMinF: 50, concreteMinF: 40, rainMaxPct: 50,
    lat: 39.0102, lon: -94.2902,
    warrantyMonths: 12, termsDays: 30, proposalValidDays: 30, otHours: 40, followUpDays: 7,
    qboItems: {},
    sampleRates: true,
  };
}

/* ---------------------------------------------------------------- sample company */
export function sampleProspects() {
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

const realStaff = () => [
  { id: 's1', name: 'Gary Stucker', title: 'Owner', crewId: '', phone: '(816) 220-7777', email: 'gary@maxpavingkc.com', rate: '', active: 'Active', certs: [] },
  { id: 's2', name: 'Wendell Gourley', title: 'Lead Estimator & Project Manager', crewId: '', phone: '(816) 220-7777', email: 'wendell@maxpavingkc.com', rate: '', active: 'Active', certs: [] },
  { id: 's3', name: 'Mike Gann', title: 'Superintendent', crewId: '', phone: '(816) 220-7777', email: '', rate: '', active: 'Active', certs: [{ name: 'OSHA 30', number: '', expires: '' }] },
  { id: 's4', name: 'Christina Parton', title: 'Controller', crewId: '', phone: '(816) 220-7777', email: 'christina@maxpavingkc.com', rate: '', active: 'Active', certs: [] },
  { id: 's5', name: 'Daniel Cushman', title: 'Contract Administrator', crewId: '', phone: '(816) 220-7777', email: 'daniel@maxpavingkc.com', rate: '', active: 'Active', certs: [] },
];

export function sampleData() {
  const t = today(), d = n => addDays(t, n), S = { sample: true }, wk = monday(t);
  const crewPeople = [
    ['Tony Alvarez', 'Asphalt foreman', 'asphalt', 34, [['OSHA 30', ''], ['CDL Class A', d(220)], ['DOT medical card', d(40)]]],
    ['Jake Morris', 'Paver operator', 'asphalt', 30, [['OSHA 10', ''], ['CDL Class B', d(500)], ['DOT medical card', d(300)]]],
    ['Ray Dunn', 'Roller operator', 'asphalt', 27, [['OSHA 10', '']]],
    ['Chris Pena', 'Raker / laborer', 'asphalt', 24, [['OSHA 10', ''], ['Flagger', d(25)]]],
    ['Eli Carter', 'Concrete foreman', 'concrete', 33, [['OSHA 30', ''], ['ACI concrete field tech', d(410)]]],
    ['Marcus Webb', 'Concrete finisher', 'concrete', 28, [['OSHA 10', '']]],
    ['Ben Ortiz', 'Form setter / laborer', 'concrete', 24, [['OSHA 10', '']]],
    ['Dan Kowalski', 'Excavator operator', 'excavation', 31, [['OSHA 10', ''], ['CDL Class A', d(-4)], ['DOT medical card', d(150)]]],
  ].map(([name, title, crewId, rate, certs], i) => ({ id: 'sp' + i, name, title, crewId, phone: `(816) 555-01${70 + i}`, email: '', rate, active: 'Active', certs: certs.map(([n, e]) => ({ name: n, number: '', expires: e })), ...S }));

  const L = (assemblyId, qty, extra = {}) => ({ id: uid(), kind: 'assembly', assemblyId, qty, section: 'base', ...extra });
  const estimates = [
    { id: 'e1', number: 'E-1001', title: 'Parking lot mill & overlay', customerId: 'c1', address: '1200 NW Oakview Dr, Lee\'s Summit, MO', estimator: 'Daniel Cushman', date: d(-21), status: 'Accepted', haulMin: 20,
      sections: [{ id: 'base', name: 'Base scope', type: 'base' }], lines: [L('a-overlay', 2800), { id: uid(), kind: 'item', itemId: 'mob', qty: 1, section: 'base' }, { id: uid(), kind: 'item', itemId: 'traffic', qty: 2, section: 'base' }],
      notes: 'Work in two phases so half the lot stays open.', accepted: { by: 'Dana (property manager)', on: d(-14), option: '', addons: [] }, ...S },
    { id: 'e2', number: 'E-1002', title: 'Driveway & walk panel replacement', customerId: 'c6', address: 'Prairie Ridge Dr, Overland Park, KS', estimator: 'Wendell Gourley', date: d(-9), status: 'Sent', sentOn: d(-9),
      sections: [{ id: 'base', name: 'Base scope', type: 'base' }, { id: 'ad1', name: 'Seal all joints', type: 'addon' }],
      lines: [L('x-remove', 1400), L('c-pave', 1100), L('c-walk', 300), { id: uid(), kind: 'item', itemId: 'joint', qty: 600, section: 'ad1' }], notes: '', ...S },
    { id: 'e3', number: 'E-1003', title: 'Dumpster pad & approach', customerId: 'c2', address: 'Independence, MO', estimator: 'Wendell Gourley', date: d(-1), status: 'Draft',
      sections: [{ id: 'base', name: 'Base scope', type: 'base' }], lines: [L('x-excav', 22), L('c-heavy', 640), { id: uid(), kind: 'item', itemId: 'mob', qty: 1, section: 'base' }], notes: '', ...S },
    { id: 'e4', number: 'E-1004', title: 'Sidewalk & ADA ramp', customerId: 'c3', address: 'Blue Springs, MO', estimator: 'Wendell Gourley', date: d(-15), status: 'Accepted',
      sections: [{ id: 'base', name: 'Base scope', type: 'base' }], lines: [L('x-remove', 420), L('c-walk', 420), L('c-ramp', 1)], notes: '', accepted: { by: 'Facilities committee', on: d(-10), option: '', addons: [] }, ...S },
    { id: 'e5', number: 'E-1005', title: 'Lot repair options', customerId: 'c7', address: 'Kansas City, MO', estimator: 'Daniel Cushman', date: d(-2), status: 'Draft',
      sections: [{ id: 'g', name: 'Good — patch the worst areas', type: 'option' }, { id: 'b', name: 'Better — patch + 2" overlay drive lanes', type: 'option' }, { id: 'x', name: 'Best — mill & overlay entire lot', type: 'option' }],
      lines: [L('a-patch', 1800, { section: 'g' }), L('a-patch', 1800, { section: 'b' }), L('a-overlay', 1600, { section: 'b' }), L('a-overlay', 4200, { section: 'x' })], notes: 'Pick one option. Pricing holds for 30 days.', ...S },
  ];

  const jobs = [
    { id: 'j1', number: 'J-1001', name: 'Oakview lot mill & overlay', customerId: 'c1', estimateId: 'e1', address: '1200 NW Oakview Dr, Lee\'s Summit, MO', type: 'Asphalt', crewId: 'asphalt', start: d(-1), end: d(2), status: 'In progress', value: 0, completed: '', pct: 40, notes: 'Phase 1 = north half. Plant order confirmed.', ...S },
    { id: 'j2', number: 'J-1002', name: 'Hillcrest sidewalk & ADA ramp', customerId: 'c3', estimateId: 'e4', address: 'Blue Springs, MO', type: 'Concrete', crewId: 'concrete', start: d(3), end: d(5), status: 'Scheduled', value: 0, completed: '', pct: 0, notes: 'Call 811 locate before dig.', ...S },
    { id: 'j3', number: 'J-0987', name: 'Summit Builders curb & gutter', customerId: 'c4', estimateId: '', address: 'Olathe, KS', type: 'Concrete', crewId: 'concrete', start: d(-346), end: d(-341), status: 'Complete', value: 28500, completed: d(-340), pct: 100, notes: 'Subcontract under Summit Builders.', ...S },
    { id: 'j4', number: 'J-0995', name: 'Miller driveway', customerId: 'c5', estimateId: '', address: 'Grain Valley, MO', type: 'Concrete', crewId: 'concrete', start: d(-64), end: d(-61), status: 'Complete', value: 11800, completed: d(-60), pct: 100, notes: '', ...S },
    { id: 'j5', number: 'J-1003', name: 'Riverside drive lane regrade', customerId: 'c2', estimateId: '', address: 'Independence, MO', type: 'Excavation', crewId: 'excavation', start: d(1), end: d(1), status: 'Scheduled', value: 4200, completed: '', pct: 0, notes: '', ...S },
    { id: 'j6', number: 'J-1004', name: 'Northland dock apron', customerId: 'c8', estimateId: '', address: 'Riverside, MO', type: 'Concrete', crewId: '', start: '', end: '', status: 'Scheduled', value: 18400, completed: '', pct: 0, notes: 'Approved — needs a date. Phase around receiving hours.', ...S },
  ];

  // This week's clock history for the asphalt and excavation crews (yesterday + today).
  const at = (day, h, m = 0) => { const x = new Date(day + 'T00:00:00'); x.setHours(h, m, 0, 0); return x.toISOString(); };
  const time = [];
  ['sp0', 'sp1', 'sp2', 'sp3'].forEach(s => {
    time.push({ id: uid(), staffId: s, jobId: 'j1', costCode: 'Milling', date: d(-1), start: at(d(-1), 7), end: at(d(-1), 17, 30), breakMin: 30, hours: 10, status: 'submitted', source: 'crew', notes: '', ...S });
    time.push({ id: uid(), staffId: s, jobId: 'j1', costCode: 'Asphalt paving', date: t, start: at(t, 6, 45), end: '', breakMin: 0, hours: 0, status: 'open', source: 'crew', notes: '', ...S });
  });
  for (let i = 0; i < 4; i++) {
    const day = addDays(wk, i); if (day >= d(-1)) break;
    ['sp4', 'sp5', 'sp6'].forEach(s => time.push({ id: uid(), staffId: s, jobId: 'j4', costCode: 'Shop / yard', date: day, start: at(day, 7), end: at(day, 16), breakMin: 30, hours: 8.5, status: 'approved', source: 'crew', notes: '', ...S }));
  }

  return {
    prospects: sampleProspects(),
    customers: [
      { id: 'c1', name: 'Oakview Office Park', type: 'Commercial', contact: 'Dana (property manager)', phone: '(816) 555-0142', email: 'dana@example.com', address: '1200 NW Oakview Dr, Lee\'s Summit, MO', notes: '', ...S },
      { id: 'c2', name: 'Riverside Self Storage', type: 'Commercial', contact: 'Front office', phone: '(816) 555-0177', email: '', address: 'Independence, MO', notes: '', ...S },
      { id: 'c3', name: 'Hillcrest Community Church', type: 'Church / Nonprofit', contact: 'Facilities committee', phone: '(816) 555-0118', email: '', address: 'Blue Springs, MO', notes: '', ...S },
      { id: 'c4', name: 'Summit Builders', type: 'General contractor', contact: 'Project manager', phone: '(913) 555-0190', email: 'pm@example.com', address: 'Olathe, KS', notes: '', ...S },
      { id: 'c5', name: 'Miller residence', type: 'Residential', contact: 'Homeowner', phone: '(816) 555-0163', email: '', address: 'Grain Valley, MO', notes: '', ...S },
      { id: 'c6', name: 'Prairie Ridge HOA', type: 'HOA / Multifamily', contact: 'Board treasurer', phone: '(913) 555-0104', email: '', address: 'Overland Park, KS', notes: '', ...S },
      { id: 'c7', name: 'Eastside Medical Building', type: 'Commercial', contact: 'Facilities office', phone: '(816) 555-0151', email: '', address: 'Kansas City, MO', notes: '', ...S },
      { id: 'c8', name: 'Northland Warehouse', type: 'Industrial / Warehouse', contact: 'Sam Patel', phone: '(816) 555-0129', email: '', address: 'Riverside, MO', notes: '', ...S },
    ],
    leads: [
      { id: 'l1', created: t, name: 'Sam Patel', company: 'Northland Warehouse', phone: '(816) 555-0129', email: '', service: 'Commercial Concrete', propertyType: 'Industrial / Warehouse', address: 'Riverside, MO', timeline: 'Within 30 days', source: 'Website form', assignedTo: '', siteVisit: '', status: 'New', notes: 'Second building’s dock aprons are cracking too.', ...S },
      { id: 'l2', created: d(-2), name: 'Lisa Grant', company: '', phone: '(816) 555-0185', email: '', service: 'Residential Concrete', propertyType: 'Residential', address: 'Lee\'s Summit, MO', timeline: '1–3 months', source: 'Referral', assignedTo: 'Wendell Gourley', siteVisit: d(2), status: 'Site visit', notes: 'Driveway replacement, ~900 SF.', ...S },
      { id: 'l3', created: d(-4), name: 'Facilities office', company: 'Eastside Medical Building', phone: '(816) 555-0151', email: '', service: 'Asphalt Mill & Overlay', propertyType: 'Commercial', address: 'Kansas City, MO', timeline: '3+ months', source: 'Phone call', assignedTo: 'Daniel Cushman', siteVisit: d(-3), status: 'Proposal sent', notes: 'Wants good / better / best pricing.', ...S },
      { id: 'l4', created: d(-12), name: 'Board treasurer', company: 'Prairie Ridge HOA', phone: '(913) 555-0104', email: '', service: 'Concrete Repair & Replacement', propertyType: 'HOA / Multifamily', address: 'Overland Park, KS', timeline: 'Within 30 days', source: 'Repeat customer', assignedTo: 'Wendell Gourley', siteVisit: d(-10), status: 'Proposal sent', notes: '', ...S },
      { id: 'l5', created: d(-30), name: 'Chris Long', company: '', phone: '(816) 555-0108', email: '', service: 'Residential Asphalt', propertyType: 'Residential', address: 'Oak Grove, MO', timeline: 'Just exploring', source: 'Website form', assignedTo: 'Daniel Cushman', siteVisit: '', status: 'Lost', notes: 'Went with a sealcoat-only company.', ...S },
    ],
    estimates,
    jobs,
    time,
    logs: [
      { id: 'g1', date: d(-1), jobId: 'j1', crewId: 'asphalt', foremanId: 'sp0', weather: 'Sunny, 61°F', crewCount: 4, manHours: 40, hmaTons: 0, baseTons: 0, concreteCY: 0, truckHours: 18, qtyDone: 1400, qtyUnit: 'SY', qtyDesc: 'Milled north half', equipment: [{ id: 'q1', hours: 0 }, { id: 'q3', hours: 9 }], injury: false, delay: false, visitor: false, extraWork: false, notes: 'Milled north half. 14 loads back to plant.', signedBy: 'Tony Alvarez', ...S },
    ],
    invoices: [
      { id: 'i1', number: 'INV-2041', jobId: 'j3', customerId: 'c4', issued: d(-338), due: d(-308), lines: [{ desc: 'Curb & gutter — complete', qty: 1, unit: 'LS', price: 28500, cat: 'Concrete' }], amount: 28500, paid: 28500, notes: '', ...S },
      { id: 'i2', number: 'INV-2077', jobId: 'j4', customerId: 'c5', issued: d(-58), due: d(-28), lines: [{ desc: 'Concrete driveway — complete', qty: 1, unit: 'LS', price: 11800, cat: 'Concrete' }], amount: 11800, paid: 6000, notes: 'Balance promised by end of month.', ...S },
      { id: 'i3', number: 'INV-2089', jobId: 'j1', customerId: 'c1', issued: d(-4), due: d(26), lines: [{ desc: 'Progress billing — phase 1 (30%)', qty: 1, unit: 'LS', price: 20000, cat: 'Asphalt' }], amount: 20000, paid: 0, notes: '', ...S },
    ],
    staff: [...realStaff(), ...crewPeople],
    equipment: [
      { id: 'q1', unit: 'P-1', name: 'Asphalt paver', type: 'Paver', crewId: 'asphalt', hours: 2410, serviceDue: d(30), serviceHours: 2500, status: 'In use', notes: '', ...S },
      { id: 'q2', unit: 'R-2', name: 'Double-drum roller', type: 'Roller', crewId: 'asphalt', hours: 1880, serviceDue: d(9), serviceHours: 1900, status: 'In use', notes: '', ...S },
      { id: 'q3', unit: 'SS-1', name: 'Skid steer + cold planer', type: 'Skid steer', crewId: 'asphalt', hours: 3120, serviceDue: d(60), serviceHours: 3250, status: 'In use', notes: '', ...S },
      { id: 'q4', unit: 'EX-1', name: 'Mini excavator', type: 'Excavator', crewId: 'excavation', hours: 1544, serviceDue: d(-3), serviceHours: 1500, status: 'Down for repair', notes: 'Hydraulic leak — parts on order.', ...S },
      { id: 'q5', unit: 'T-12', name: 'Tandem dump truck', type: 'Dump truck', crewId: '', hours: 0, serviceDue: d(45), serviceHours: 0, status: 'Available', notes: 'DOT annual inspection with next service.', ...S },
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
