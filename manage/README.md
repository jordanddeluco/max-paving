# Max Paving — Manage panel

A simple back-office panel for running Max Paving, planned for `manage.maxpavingkc.com`. It's plain HTML, CSS and JS like the website, with no build step. Open `manage/index.html` through any static server, for example the site's `python -m http.server 8877`, then go to http://localhost:8877/manage/.

## What's in it

| Section | What it's for |
|---|---|
| **Dashboard** | KPIs (open leads, proposals out, won this year and win rate, backlog, money owed and overdue), a 7-day paving-weather strip, a "Needs attention" list (call-backs, site visits, proposal follow-ups, overdue invoices, expiring insurance and licenses, CDL and medical cards, equipment service, warranty check-ins), this week's jobs, and the lead pipeline. |
| **Schedule** | Crew × day board (Mon–Sat) with weather go/watch/no badges for asphalt and concrete. |
| **Marketing** | Potential customers you want to win. A 4-step add flow (company → location → contact → status) with duplicate warning, address lookup and a draggable map pin. An interactive map colours pins by status, and toggles show or hide Not contacted / Contacted / Interested / Not interested / Converted, with a synced list beside it. **Log contact** records each call, email or visit and sets the next follow-up, which appears on the dashboard. **Convert to lead** hands an interested prospect to Leads. |
| **Leads** | Quote requests. The fields match the website's quote form. Statuses run New → Contacted → Site visit → Proposal sent → Won/Lost. **Create estimate** turns a lead into a customer and a draft estimate. |
| **Estimates** | Line-item proposals in paving units (SY, SF, LF, CY, TON, EA, LS) with a price book. **Print proposal** produces a branded, signable PDF with the warranty terms. **Accept → create job** carries the scope and value over to a job. |
| **Customers** | Commercial, industrial, residential, HOA, municipal, GC, and church/nonprofit, with jobs and billed totals. |
| **Jobs** | Number, crew, dates, value and status. Shows man-hours, tons and CY from the daily logs, plus invoiced and collected amounts. Marking a job Complete starts its warranty. |
| **Daily logs** | Crew, foreman, man-hours, asphalt tons, concrete CY, base tons, weather and notes, per job per day. |
| **Crew & staff** | Roles, crews, OSHA card, hourly rate, and CDL and DOT medical-card expiry dates. |
| **Equipment** | Unit numbers, hour meters, service by date or hours, and down-for-repair status. |
| **Invoices** | Progress and final billing with Open/Partial/Overdue/Paid status. Accounting itself stays in QuickBooks. |
| **Compliance** | COIs, licenses, bonds and municipal vendor registrations, with expiry alerts. |
| **Warranties** | Every completed job's one-year workmanship warranty, with an alert 60 days before it ends. |
| **Calculators** | Asphalt tonnage, concrete yardage and aggregate-base tons. |
| **Settings** | Company info, crews, estimators, warranty and payment terms, weather thresholds, material densities, the price book, and data export/import/reset. |

It starts with **sample data**: invented customers, jobs and invoices, plus the real team names from the website. A banner and a Settings button clear it. The price book rates are placeholders and need replacing with real unit prices.

## Where the data lives

Everything is saved in the browser's `localStorage` on the computer being used. It is **not shared** between computers or people yet. Use **Settings → Export backup** regularly.

## Maps

The map uses Leaflet (from cdnjs) and OpenStreetMap tiles. **Find on map** looks up an address with OpenStreetMap's free Nominatim geocoder, which is fine for adding prospects one at a time. Bulk imports would need a paid geocoder (Google, Mapbox) or a CSV that already has coordinates. Business addresses are sent to Nominatim only when you press the button or move past the location step.

## Weather rules

The forecast comes from the free National Weather Service API (api.weather.gov) for Grain Valley. The badges are rules of thumb that can be changed in Settings:

- **Asphalt:** air temp 50°F+ and rain chance under 50%.
- **Concrete:** overnight low 40°F+ (otherwise plan cold-weather protection, per ACI 306's 40°F cold-weather threshold) and rain chance under 50%.

The project or city spec always governs.

## Research behind it

The modules come from what paving and concrete software sells to small contractors: OneCrew, Bitumio, QuoteIQ, Jobber, Projul and PavementSoft. Those tools all centre on the same few things:

- Estimating by area and tonnage.
- Turning an estimate into a job without re-typing it.
- Crew scheduling tied to weather.
- Daily logs that record tons placed and hours.
- Invoicing that syncs with QuickBooks.

Max Paving's own website promises a few things this panel also tracks:

- Estimators, not salespeople.
- In-house crews.
- A one-year written warranty.
- Municipal-grade paperwork.

## Before it goes live at manage.maxpavingkc.com

1. **Login and a shared database.** It must not be public as-is, and the team needs to see the same data. Easiest path: Supabase or Firebase (auth + database). Alternatively, put the static app behind Cloudflare Access and back it with a small API.
2. **Website quote form → Leads** automatically, instead of re-typing FormSubmit emails.
3. **QuickBooks Online sync** for customers and invoices.
4. **Job photos** (before/after) and a phone-friendly daily-log screen for foremen.
5. **E-signature** on proposals, and emailing proposals and invoices from the panel.

Note: this folder sits inside the website repo, so pushing it would also publish it at `/manage/` on GitHub Pages. That is harmless while data stays in each browser, but move it to its own repo or host before adding a real backend.
