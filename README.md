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
- Canonical/sitemap URLs assume the site is served at `https://maxpavingkc.com/`. If it lives elsewhere (e.g. `https://<user>.github.io/<repo>/`), change `SITE` and rebuild, or find-and-replace `https://maxpavingkc.com/` in the HTML, `sitemap.xml` and `robots.txt`.

## Deploy to GitHub Pages
1. Push this folder to a repository.
2. Settings → Pages → Source: *Deploy from a branch*, branch `main`, folder `/ (root)`.
