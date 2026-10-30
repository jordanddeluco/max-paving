# Max Paving — Manage panel

The back office for Max Paving (planned for `manage.maxpavingkc.com`). It covers:
- sales and marketing;
- estimating;
- scheduling;
- crew time;
- daily reports;
- job costing;
- billing.

Accounting stays in **QuickBooks Online**, and the panel connects to it.

It is plain HTML, CSS and JavaScript modules with no build step, styled to match maxpavingkc.com.

## Two ways to run it

| | Local mode | Server mode (recommended for the company) |
|---|---|---|
| How | Open `manage/` from any static server (e.g. `python -m http.server` in the repo, then `/manage/`) | `node manage/server/server.mjs` (Node 18+, no installs) |
| Data | This browser only | One shared copy on the server, synced to everyone within 20 s |
| Logins & roles | — | Owner, Office, Estimator, Foreman, Crew |
| QuickBooks | CSV exports | Live: customers, estimates, invoices, approved time out; payments in |

The panel detects which mode it's in automatically. The GitHub Pages copy runs in local mode as a demo with sample data.

### Starting the server
1. Copy `manage/server/.env.example` to `manage/server/.env` and fill it in. `APP_SECRET` is required; the QuickBooks keys are optional at first.
2. Run `node manage/server/server.mjs` and open the address it prints. The default is http://localhost:8790.
3. Create the **owner** login. You can start empty, with sample data, or with the data saved in your browser.
4. Add everyone else under **Settings → Users** and link each login to a person on the crew list so their time clock works.

Data lives in `manage/server/data/`, which git ignores. **Back that folder up.** It is the company's database.

For `manage.maxpavingkc.com`, run the same command on a small server or VM behind HTTPS (Caddy or nginx), and set `PUBLIC_URL=https://manage.maxpavingkc.com`. The panel must **not** be served from GitHub Pages in server mode.

### Connecting QuickBooks Online
1. Create an app at https://developer.intuit.com (QuickBooks Online, accounting scope).
2. Add the redirect URI `PUBLIC_URL/api/qbo/callback`. Settings → QuickBooks shows the exact value to copy.
3. Put the Client ID and Secret in `.env`. Use `QBO_ENV=sandbox` with the Development keys first, then switch to the Production keys once Intuit's app assessment is approved.
4. In the panel go to **Settings → QuickBooks**, press Connect, and then:
   - map Asphalt / Concrete / Excavation / General work to your QuickBooks products/services;
   - link each person to their QuickBooks employee.

**What syncs:**
- Customers.
- Jobs, as sub-customers, so job profit shows up in QuickBooks reports.
- Estimates and invoices, one click each.
- Approved time, as TimeActivity entries for payroll.
- Payments recorded in QuickBooks come back every 15 minutes, or on demand.

Tokens are encrypted at rest. Intuit rotates the refresh token, and the server always keeps the newest one. At Max Paving's size the API is free: the Builder tier allows 500,000 read calls a month.

## What's in it

The research behind these choices is summarised at the bottom.

**Home**
- Office roles see today's crews with clock-in counts, the key numbers (proposals out, won, backlog, owed), the 7-day paving weather, and a needs-attention queue.
- The needs-attention queue lists only what needs action:
  - leads to call, site visits, proposals due a follow-up;
  - accepted estimates without a job, sold work not on the schedule;
  - jobs to invoice, time to approve, forgotten clock-outs;
  - missing daily reports, jobs over budget;
  - expiring insurance, certifications and equipment service;
  - warranty check-ins.
- **Foremen and crew** instead get *My day*: today's job with a directions link, the scope, planned materials and the crew clock. Field roles never see prices or pay rates.

**Sales**
- Lead pipeline board you can drag cards across.
- Prospects map: Marketing, with the 4-step add flow and contact log.
- Customers, with history and balances.

**Estimates**
- Estimates are built from **assemblies**: pick "Mill & overlay", type 2,800 SY and the depth. Hot-mix tons, tack, base, concrete CY, crew days, man-hours and **trucking** are calculated (truck cycle from haul time, load time and tons per truck).
- Costs are split into material, labor (loaded with burden), equipment, trucking and subcontract.
- Price comes from overhead % plus target margin %, with markup shown alongside. Any unit price can be overridden.
- **Good / Better / Best** options and optional add-ons.
- **Measure on the aerial**: outline areas or lengths on satellite imagery to fill quantities.
- Printable branded proposal; accept with the chosen option and add-ons; one-click job.

**Jobs**
- Progress and contract versus invoiced and collected.
- **Budget vs actual** by cost type and production: man-hours, tons, CY, truck hours. Flagged *At risk* when projected cost reaches 110% of the estimate.

**Schedule**
- Crew × day board with multi-day bars.
- A sold-work tray: drag, or click a job and then a day.
- One-click rain day that pushes a crew's work back a working day.
- Daily dollars and weather go / no-go badges.
- Conflict flags: expired CDL or medical card, equipment down, double-booking, no-go forecast.

**Crew & time**
- Foreman crew clock-in and clock-out, with job and cost code pre-filled from the schedule. Clock-out asks about injuries and break minutes. Location is stamped only when chosen.
- Weekly timesheets with overtime after 40 hours. Approving a week locks it for payroll; it then goes out by CSV or to QuickBooks.
- 2-minute **daily reports**:
  - crew, man-hours (from the clock), hot-mix, base and concrete, truck hours;
  - quantity done and % complete;
  - equipment hours (which advance the hour meters);
  - four yes/no checks: injury, delay, visitor, extra work;
  - foreman signature; printable.
- People list with certifications and expiry dates.

**Billing**
- Invoices from jobs: progress %, remaining balance, or full scope lines.
- Payments and receivables aging.
- QuickBooks sync, or CSV.

**Equipment & docs**
- Equipment hours and service status.
- Compliance documents: COIs, licenses, bonds, vendor registrations.
- Warranty tracker for the one-year workmanship warranty.

**Settings**
- Company and rules (weather, terms, warranty, overtime).
- **Crew rates**, which drive estimate labor and equipment.
- **Cost book**: your unit costs.
- **Assemblies** and estimating defaults.
- Users, QuickBooks, and data (backup / import / clear sample).

## Files
```
manage/
  index.html, app.css           shell + styles
  js/main.js                    boot, sign-in, routing, events
  js/store.js                   local/server data store and sync
  js/calc.js                    estimating engine, job costing, overtime
  js/derive.js                  balances, statuses, the needs-attention queue
  js/seed.js                    default cost book / crews / assemblies + sample company
  js/ui.js, js/core.js          shared UI and helpers
  js/weather.js                 National Weather Service forecast + go/no-go rules
  js/views/*.js                 one file per section
  server/server.mjs             logins, roles, shared data, QuickBooks (no dependencies)
```

## Notes
- **Placeholders:** sample costs and crew rates are placeholders. Replace them in Settings → Cost book and Crews & rates before pricing real work.
- **Rules of thumb:** weather rules (asphalt 50 °F+, concrete overnight 40 °F+) and the 110 lb/SY-inch hot-mix figure are rules of thumb. The project spec and your mix design govern.
- **Third-party services:**
  - Address lookup uses OpenStreetMap's free Nominatim service, fine for one-at-a-time use.
  - The aerial imagery is Esri World Imagery; check Esri's terms before heavy commercial use.
  - The forecast is from api.weather.gov.
- **Not built yet:**
  - photos on daily reports;
  - customer e-sign links and texting;
  - pulling website quote-form submissions straight into Leads.

## Research behind it

The design borrows from:
- **Paving tools:** OneCrew, Bitumio, SiteRecon / Go iPave, HCSS HeavyBid and HeavyJob, LMN.
- **Field-service and time tools:** Jobber, ServiceTitan, busybusy, ClockShark, QuickBooks Time, Raken, Procore.

What it borrows:
- assemblies driven by measured quantities;
- trucking cycle maths;
- loaded rates with margin and markup shown side by side;
- a sold-work queue feeding a crew board;
- foreman crew clock-in;
- prefilled daily reports;
- estimate-vs-actual flagged at 110%;
- weekly approve → lock → QuickBooks;
- Good/Better/Best quotes;
- an owner home that shows only what needs action.

What reviewers complain about in those tools, and this panel avoids:
- heavy-civil complexity;
- disconnected modules;
- per-seat pricing that locks out the field;
- cluttered screens.
