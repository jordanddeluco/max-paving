# Max Paving — website

Static rebuild of [maxpavingkc.com](https://maxpavingkc.com) with an updated UI. No build step — plain HTML, CSS and JS, ready for GitHub Pages.

## Pages
- `index.html` — Home
- `about.html` — About (with `#history` anchor)
- `team.html` — Our Team
- `services.html` — Services (tabs: `#excavation-and-site-preparation`, `#commercial-concrete`, `#commercial-asphalt`)
- `commitment.html` — Commitment
- `contact.html` — Contact + quote form
- `asphalt-paving-kansas-city.html`, `commercial-concrete-kansas-city.html`, `excavation-site-preparation-kansas-city.html` — dedicated service landing pages (each with Service + FAQ schema)
- `404.html` — not-found page (GitHub Pages serves it automatically)

## Media
All original logos, icons and photos are in `assets/img/`. The home-page hero video (the company's YouTube video `7aetdRQ40f0`, 75 s) is hosted locally at `assets/video/max-paving-hero.mp4` (720p, 9.5 MB) with a poster frame; it autoplays muted with a sound toggle.

## Quote / contact form
The form posts to [FormSubmit](https://formsubmit.co) (`https://formsubmit.co/ajax/maxpavingkc@gmail.com`), which forwards submissions to the inbox with no backend. **First time only:** submit the form once from the live site and click the activation link FormSubmit emails to maxpavingkc@gmail.com. To use a different address, change `EMAIL` in the `<form action>` on each page.

## SEO
- Unique keyword-rich `<title>` / meta description per page, canonical URLs, Open Graph + Twitter cards, geo meta.
- JSON-LD structured data on every page: `LocalBusiness` (address, hours, phone, services), `WebSite`, `WebPage`, `BreadcrumbList`.
- Service-area section + `areaServed` (14 KC-metro cities), visible FAQ + `FAQPage` schema, 1200×630 social-share image (`assets/img/og-image.jpg`), photos downscaled to 1600px for speed.
- `sitemap.xml` (with lastmod) and `robots.txt` at the root; one `<h1>` per page; descriptive image `alt` text; hero image preloaded, other images lazy-loaded.
- Canonical/sitemap URLs are generated from `SITE` in `tools/build.py` (currently `https://jordanddeluco.github.io/max-paving/`). When the custom domain is attached, set `SITE = "https://maxpavingkc.com/"`, add a `CNAME` file containing `maxpavingkc.com`, run `python tools/build.py`, and push.

## Build
All pages are generated from `tools/build.py` (shared header/footer/forms/schema). Edit the script, run `python tools/build.py`, commit and push.

## Hosting
Live on GitHub Pages from `main` / root: https://jordanddeluco.github.io/max-paving/

To use the real domain: in the repo Settings → Pages → Custom domain enter `maxpavingkc.com`, point the domain's DNS at GitHub Pages (A records 185.199.108–111.153 and a `www` CNAME to `jordanddeluco.github.io`), then update `SITE` as above.
