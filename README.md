# Max Paving — website

Static rebuild of [maxpavingkc.com](https://maxpavingkc.com) with an updated UI. No build step — plain HTML, CSS and JS, ready for GitHub Pages.

## Pages (40, all generated)
- `index.html` — Home (stats, Max Difference, 5-step process, project gallery, reviews, FAQ)
- `about.html` (story, credentials, values, `#history`), `team.html` (5 people), `commitment.html` (low-bid comparison, `#guarantee`), `careers.html`
- `services.html` — overview with tabs: `#commercial-concrete`, `#commercial-asphalt`, `#excavation-and-site-preparation`
- Category pages (URLs kept from the first build): `commercial-concrete-kansas-city.html` (12 services), `asphalt-paving-kansas-city.html` (6), `excavation-site-preparation-kansas-city.html` (12)
- 11 service pages with full copy + FAQs, e.g. `concrete-parking-lots-kansas-city.html`; the other 19 services are listed as cards on their category page
- `commercial.html`, `residential.html` — audience pages
- `locations.html` + 15 city pages, e.g. `paving-blue-springs-mo.html` (Blue Springs and Lee's Summit include a service spotlight)
- `contact.html`, `privacy-policy.html`, `404.html`

## Content
- Long-form copy (service pages, city pages) lives in `tools/content.json`, taken from the live maxpavingkc.com. A service or city gets its own page only when its entry has a `"file"`; entries without one are listed but get no thin page.
- Everything else (categories, team, projects, process, FAQs, reviews, contact details) is near the top of `tools/build.py`.

## Media
All original logos, icons and photos are in `assets/img/`. Project photos from the live site are in `assets/img/projects/` at 400/800/1200 px in JPG + WebP (served with `srcset`; click opens a lightbox). The home-page hero video (the company's YouTube video `7aetdRQ40f0`, 75 s) is hosted locally at `assets/video/max-paving-hero.mp4` (720p, 9.5 MB) with a poster frame; it autoplays muted with a sound toggle.

## Quote / contact form
Fields: name, phone (required), email, company, service needed, property type, project address, timeline, details, plus the page it was sent from. The form posts to [FormSubmit](https://formsubmit.co) (`https://formsubmit.co/ajax/maxpavingkc@gmail.com`), which forwards submissions to the inbox with no backend. **First time only:** submit the form once from the live site and click the activation link FormSubmit emails to maxpavingkc@gmail.com. To use a different address, change `EMAIL` in `tools/build.py` and rebuild.

## SEO
- Unique keyword-rich `<title>` / meta description per page, canonical URLs, Open Graph + Twitter cards, geo meta.
- JSON-LD structured data on every page: `LocalBusiness` (address, hours, phone, services), `WebSite`, `WebPage`, `BreadcrumbList`.
- Service-area section + `areaServed` (16 KC-metro cities), visible FAQ + `FAQPage` schema, 1200×630 social-share image (`assets/img/og-image.jpg`), photos downscaled to 1600px for speed.
- `sitemap.xml` (with lastmod) and `robots.txt` at the root; one `<h1>` per page; descriptive image `alt` text; hero image preloaded, other images lazy-loaded.
- Canonical/sitemap URLs are generated from `SITE` in `tools/build.py` (currently `https://jordanddeluco.github.io/max-paving/`). When the custom domain is attached, set `SITE = "https://maxpavingkc.com/"`, add a `CNAME` file containing `maxpavingkc.com`, run `python tools/build.py`, and push.

## Build
All pages are generated from `tools/build.py` (shared header/footer/forms/schema). Edit the script, run `python tools/build.py`, commit and push.

## Hosting
Live on GitHub Pages from `main` / root: https://jordanddeluco.github.io/max-paving/

To use the real domain: in the repo Settings → Pages → Custom domain enter `maxpavingkc.com`, point the domain's DNS at GitHub Pages (A records 185.199.108–111.153 and a `www` CNAME to `jordanddeluco.github.io`), then update `SITE` as above.
