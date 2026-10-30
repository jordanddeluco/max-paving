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

**Estimates** — four steps, each on its own screen:
1. **Takeoff.** Start from a job-type template (commercial mill & overlay, patch & base repair, new lot, residential driveway, concrete flatwork/curb/ADA, dumpster pad, excavation), a past estimate, or blank.
   - Measure named areas on the aerial: area, cut-outs for islands and buildings, perimeter, tie-in edges where new paving meets old (these drive the saw-cut LF), linear runs and counts.
   - Record site-visit notes: surface, access and phasing, drainage, condition.
2. **Pricing.** Lines stay **linked to the measured areas**: re-measure and every linked line updates, with an optional extra % for overbreak.
   - **Quick-add** box (press `/`) searches assemblies and cost-book items.
   - Assemblies calculate hot-mix tons, tack, base, concrete CY, crew days, man-hours and trucking.
   - Price = cost + overhead + target margin, with margin and markup shown side by side and $/SY.
   - Good / Better / Best options and add-ons.
   - Customer view hides costs. Per-line customer and internal notes.
3. **Review.**
   - **"Did you address it?" checklist:** filtered by job type, each item answered Included / Excluded / N/A — mobilization, traffic control, 811, permits, saw cut, base repair, drainage, structures, ADA, striping, escalation, concrete joints/cure/pump, undercut, swell…
   - **Sanity checks:** zero-quantity lines, below-cost lines, no mobilization, under the minimum job charge (one click adds an adjustment), unit prices >25% off past won jobs, stale or placeholder cost book.
   - **Margin guardrails:** warning under 20%; under 15% needs the owner's approval with a reason.
   - Optional second look by the other estimator.
4. **Proposal.** Scope of work generated from the priced lines (editable), plus an exclusions & clarifications library.
   - Excluded checklist items are added automatically.
   - Deposit, retainage and validity terms.
   - Optional **asphalt escalation clause** tied to the MoDOT index.
   - Live preview; prints to PDF.

**Sending locks the prices.** Any change after that is a lettered **revision** (Rev B, C…) with a note, and the history shows what changed. Accepting turns the estimate into a job, splitting it into phases (e.g. Milling → Asphalt paving → Striping) with material orders already sized.

**Jobs** — every job moves through seven stages: Sold → Getting ready → Scheduled → In progress → Punch & walkthrough → Invoiced → Closed (plus On hold / Cancelled). Each job shows **one next action**. The job page has these tabs:
- **Overview:**
  - stage tracker;
  - health chips: Ready (checklist), Schedule, Money, Billing;
  - site packet: contact, gate code, notes;
  - 811 & permit status;
  - copy-ready customer messages: date confirmed, day before, rain-out, keep-off, review request.
- **Phases & orders:** each phase has its own crew, dates and start time, plus a **readiness checklist**:
  - 811 ticket with legal dig and start-by dates worked out under Missouri/Kansas rules;
  - permit;
  - material ordered;
  - striping sub confirmed;
  - customer told.

  Each phase also carries its **material order**: supplier, mix, tons/CY, first load, trucks or pump, status, confirmation #. Striping can't be booked until the paving has cured (14 days, adjustable).
- **Change orders:** extra work found in the field (from the daily report) or added by the office, priced, then approved in writing. Approved ones raise the contract and the budget, and pending ones hold up the final invoice. Printable for signature.
- **Closeout:** punch list (Open → Fixed → Verified); final walkthrough sign-off with a printable sheet; closeout checklist (final invoice, paid, no pending COs, lien waivers, permit final, warranty letter, photos, review request).
- **Costs:** budget vs actual by cost type and production, including change-order cost. Flagged *At risk* at 110% projected.
- **Field:** that job's daily reports and time.
- **Billing.**

**Schedule** — phases, not whole jobs, are what gets scheduled:
- **Board:**
  - crews × days, with a row for subs (striping, sealcoat);
  - a tray of phases waiting for a date — drag, or click then click a day;
  - **soft readiness gate:** placing a phase that isn't ready lists what's missing and asks for a reason, rather than blocking;
  - **rain day:** pushes a crew's remaining phases back a working day and flags the material orders to call;
  - conflict outlines: open checklist items this week, expired CDL, equipment down, overlap, no-go weather, striping too soon.
- **Tomorrow:** each crew's dispatch sheet — where, start time, contact, access, work, material, 811, crew and equipment. It has a "copy for foreman" text, the day's material orders to place or confirm, and a list of orders that moved and need a call. Printable.

**Crew & time**
- Foreman crew clock-in and clock-out, with job and cost code pre-filled from the schedule. Clock-out asks about injuries and break minutes. Location is stamped only when chosen.
- Weekly timesheets with overtime after 40 hours. Approving a week locks it for payroll; it then goes out by CSV or to QuickBooks.
- 2-minute **daily reports**:
  - crew, man-hours (from the clock), hot-mix, base and concrete, truck hours;
  - quantity done and % complete;
  - equipment hours (which advance the hour meters);
  - four yes/no checks: injury, delay, visitor, extra work (a description of the extra work becomes a pending change order for the office to price);
  - which phase, and "this phase is finished" (which moves the job toward punch & walkthrough);
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
- **811 rules** are built in as Missouri RSMo 319.026 (2–10 working days' notice, effective 8/28/2025) and Kansas K.S.A. 66-1804 (2 full working days; valid 20 days after the start). Always go by the dates on the ticket. The Missouri notice days are a setting.
- **Escalation clause wording** follows the MoDOT asphalt price index method. Have an attorney look at it before relying on it.
- **Not built yet:**
  - editing job-type templates in Settings (they ship with the panel);
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
