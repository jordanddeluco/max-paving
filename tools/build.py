import os, html

OUT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PHONE = "(816) 220-7777"
PHONE_TEL = "+18162207777"
EMAIL = "maxpavingkc@gmail.com"
FB = "https://www.facebook.com/profile.php?id=100043755836975"
MAPS = "https://www.google.com/maps/place/MAX+Paving/@39.0101573,-94.2924242,17z/data=!3m1!4b1!4m5!3m4!1s0x87c11b706681c095:0xa1b24de750c290f!8m2!3d39.0101573!4d-94.2902355"
MAP_EMBED = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3100.2260232275817!2d-94.2924241846463!3d39.01015727955338!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x87c11b706681c095%3A0xa1b24de750c290f!2sMAX%20Paving!5e0!3m2!1sen!2sus!4v1674518672093!5m2!1sen!2sus"
SITE = "https://jordanddeluco.github.io/max-paving/"
REVIEWS_URL = "https://share.google/hT4Gpq2Xz3r9wQ2np"
WRITE_REVIEW_URL = "https://www.google.com/search?q=MAX+Paving+Blue+Springs+MO#lrd=0x87c11b706681c095:0xa1b24de750c290f,3"
REVIEWS = [
    ("Paul Deluco", "Hired Max Paving a few years back to pave my driveway and pour a concrete pad for one of my buildings. I thought they did an incredible job \u2014 and what really proved it was how everything held up afterward. Both the driveway and the pad have lasted incredibly well through everything Missouri weather throws at them. No cracking, no settling, no surprises. That\u2019s exactly why they\u2019re the first call I made when I had more work come up. Gary and the crew did it right the first time. Highly recommend."),
    ("Steve Howard", "I\u2019ve been working with Gary and Max Paving for 8-9 years now and I would highly recommend their services. Gary is fantastic to work with, great with customers, and his crews do fantastic work."),
    ("Carol Foster", "Max Paving was a pleasure to work with from start to finish. Their pricing was fair and straightforward. They had excellent communication from start to finish and we always knew what was happening and when. What stood out most was their willingness to do whatever it took to make sure we were happy with the results. Highly recommend."),
]
SERVICE_AREAS = ["Kansas City", "Blue Springs", "Independence", "Lee's Summit", "Grain Valley", "Raytown", "Liberty", "Oak Grove", "Grandview", "Belton", "Overland Park", "Olathe", "Lenexa", "Shawnee"]
FAQS = [
    ("Do you offer free estimates?", "Yes. Every project starts with a free evaluation and estimate. We look at your property, answer all of your paving questions, and give you a clear plan before any work begins."),
    ("What areas do you serve?", "Max Paving is based in Blue Springs, MO and serves commercial and residential customers throughout the Kansas City metropolitan area, including Independence, Lee's Summit, Grain Valley, Raytown, Liberty and the Kansas suburbs."),
    ("Do you do both asphalt and concrete?", "Yes. We are a start-to-finish contractor for commercial asphalt paving, commercial concrete, and residential concrete driveways, and we do our own excavation and site preparation in-house."),
    ("Do you handle residential work?", "Our residential work today is concrete driveways on larger residential properties. Commercial paving \u2014 parking lots, flatwork, repairs and maintenance \u2014 is our specialty."),
    ("What does the process look like?", "Three steps: a free evaluation and estimate, excavation and site preparation with drainage and subgrade in mind, then construction or maintenance of the flatwork and asphalt paving. We keep you updated at every stage."),
    ("Is your crew certified?", "Our on-site team members are OSHA certified and go through continually updated safety training. Before arriving at a project we review its general and specific hazards with the crew."),
]
SERVICES = [
    {
        "file": "asphalt-paving-kansas-city.html", "id": "commercial-asphalt", "name": "Commercial Asphalt Paving",
        "title": "Commercial Asphalt Paving Kansas City | Parking Lots & Repairs | Max Paving",
        "desc": "Commercial asphalt paving contractor in Kansas City, MO. New parking lots, asphalt repair and maintenance done right the first time. Free estimates from Max Paving.",
        "h1": "Commercial Asphalt Paving in Kansas City",
        "img": "assets/img/SERVICES_Commercial_Asphalt.IMG_3073-scaled.jpg", "alt": "Freshly paved commercial asphalt parking lot in Kansas City",
        "intro": "From a piece of land to a level parking lot, or whatever your need might be, Max Paving won\u2019t make it complicated. Our goal is to make the process of improving, repairing, and/or maintaining the area as easy as possible.",
        "body": ["We pride ourselves in our communication and problem-solving skills developed throughout the years. With an experienced asphalt crew, we do your project right the first time.",
                 "Whether you need a new parking lot paved, an existing lot repaired, or ongoing maintenance to protect your investment, our team handles the entire process in-house \u2014 from excavation and site preparation to the finished asphalt surface."],
        "bullets": ["New commercial parking lots", "Asphalt repair and maintenance", "Excavation and site preparation included", "Drainage and subgrade planned up front", "Experienced, OSHA-certified asphalt crew"],
    },
    {
        "file": "commercial-concrete-kansas-city.html", "id": "commercial-concrete", "name": "Commercial Concrete",
        "title": "Commercial Concrete Contractor Kansas City | Flatwork & Driveways | Max Paving",
        "desc": "Commercial concrete contractor in Kansas City, MO with 20+ years of experience. Concrete flatwork, repairs, new installations and residential concrete driveways. Free estimates.",
        "h1": "Commercial Concrete in Kansas City",
        "img": "assets/img/SERVICES_Residential_Concrete_Driveways.IMG_3067_EDIT-copy-scaled.jpg", "alt": "New concrete driveway and flatwork poured by Max Paving",
        "intro": "With experience stretching over two decades, the shared knowledge in concrete construction maintains our confidence in providing customers the service and product they deserve. Expect excellence whether a repair and/or a new installation is on the agenda. Max Paving makes it possible.",
        "body": ["<strong>Residential concrete driveways.</strong> Residential driveway projects have been foundational in our business. The driveway work that Max Paving offers today is exclusively concrete work on larger-sized residential areas. Our attitude is the same though, we aim to satisfy.",
                 "Our concrete superintendent is educated in all mix-designs and applications, from simple floors to commercial parking lot projects, so every pour is planned for the load and conditions it will face."],
        "bullets": ["Commercial concrete flatwork", "Concrete repair and new installation", "Residential concrete driveways (larger properties)", "All mix designs and applications", "Two decades of concrete experience"],
    },
    {
        "file": "excavation-site-preparation-kansas-city.html", "id": "excavation-and-site-preparation", "name": "Excavation & Site Preparation",
        "title": "Excavation & Site Preparation Kansas City | Max Paving",
        "desc": "In-house excavation and site preparation for paving projects across the Kansas City metro. Proper drainage and subgrade before any asphalt or concrete goes down. Free estimates.",
        "h1": "Excavation &amp; Site Preparation in Kansas City",
        "img": "assets/img/SERVICES_Excavation_and_Site_Preparation.IMG_3060_EDIT-scaled.jpg", "alt": "Excavation and site preparation for a commercial paving project",
        "intro": "With our experienced crews we do all excavation and site preparation in-house. Your project will be therefore appropriately prepared for the paving process.",
        "body": ["We are proud to offer this complete turnkey process to our customers. Convinced that an optimal set-up is vital for the desired result, we will gladly turn your property around before beginning the flatwork.",
                 "We set every project up for success with water drainage and subgrade conditions in mind \u2014 the groundwork that determines how long your asphalt or concrete lasts."],
        "bullets": ["All excavation done in-house", "Grading and subgrade preparation", "Water drainage planned before paving", "Turnkey: prep through finished surface", "Commercial and residential sites"],
    },
]
FORM_ACTION = "https://formsubmit.co/ajax/" + EMAIL

ICON = {
    "phone": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.6a2 2 0 0 1-.5 2.1L8 9.7a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.8.3 1.7.6 2.6.7a2 2 0 0 1 1.7 2z"/></svg>',
    "pin": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    "clock": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    "mail": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>',
    "fb": '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.6 1.6-1.6h1.7V4.4c-.3 0-1.3-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.2v2.3H7.4V14h2.8v8h3.3z"/></svg>',
    "arrow": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    "chev": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    "star": '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.9 6.1 6.7.8-4.9 4.6 1.3 6.6L12 17.3l-6 3.3 1.3-6.6L2.4 9.4l6.7-.8z"/></svg>',
    "google": '<svg viewBox="0 0 24 24"><path fill="#4285F4" d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.3c1.9-1.8 3-4.4 3-7.6z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.3-2.6c-.9.6-2 1-3.3 1-2.6 0-4.8-1.7-5.5-4.1H3.1v2.6A10 10 0 0 0 12 22z"/><path fill="#FBBC05" d="M6.5 13.9a6 6 0 0 1 0-3.8V7.5H3.1a10 10 0 0 0 0 9z"/><path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.5l3.4 2.6C7.2 7.7 9.4 6 12 6z"/></svg>',
    "sound_off": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="m23 9-6 6M17 9l6 6"/></svg>',
    "sound_on": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14"/></svg>',
    "down": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>',
    "play": '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>',
    "replay": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>',
    "check": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    "up": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>',
}

NAV = [
    ("Home", "index.html", []),
    ("About", "about.html", [("Our History", "about.html#history"), ("Our Team", "team.html")]),
    ("Services", "services.html", [
        ("Commercial Asphalt Paving", "asphalt-paving-kansas-city.html"),
        ("Commercial Concrete", "commercial-concrete-kansas-city.html"),
        ("Excavation & Site Preparation", "excavation-site-preparation-kansas-city.html"),
    ]),
    ("Commitment", "commitment.html", []),
    ("Contact", "contact.html", []),
]


def header(active):
    items = []
    for label, href, subs in NAV:
        cls = "nav__item" + (" is-active" if active == href or (active == "team.html" and href == "about.html") else "")
        sub = ""
        link_inner = label
        if subs:
            link_inner += ICON["chev"]
            sub = "<ul class=\"nav__sub\">" + "".join(f'<li><a href="{h}">{l}</a></li>' for l, h in subs) + "</ul>"
        items.append(f'<li class="{cls}"><a class="nav__link" href="{href}">{link_inner}</a>{sub}</li>')
    return f"""
<div class="topbar">
  <div class="container">
    <ul class="topbar__list">
      <li>{ICON['phone']}<a href="tel:{PHONE_TEL}">{PHONE}</a></li>
      <li>{ICON['pin']}<a href="{MAPS}" target="_blank" rel="noopener">Blue Springs, MO</a></li>
      <li>{ICON['clock']}<span>Hours: Monday &ndash; Friday, 8 AM &ndash; 5 PM</span></li>
    </ul>
    <a class="topbar__social" href="{FB}" target="_blank" rel="noopener" aria-label="Max Paving on Facebook">{ICON['fb']}<span>Facebook</span></a>
  </div>
</div>
<header class="header">
  <div class="container">
    <a class="brand" href="index.html" aria-label="Max Paving home"><img src="assets/img/Max_Paving_Logo_HORIZONTAL_DIGITAL.jpg" alt="Max Paving — Asphalt and Concrete for Kansas City" width="1050" height="248"></a>
    <button class="nav-toggle" aria-label="Toggle menu" aria-expanded="false" aria-controls="site-nav"><span></span><span></span><span></span></button>
    <nav class="nav" id="site-nav" aria-label="Main">
      <ul class="nav__list">{''.join(items)}</ul>
      <a class="btn btn--yellow btn--sm nav__cta" href="contact.html#quote">Get a Quote</a>
    </nav>
  </div>
</header>
"""


def quote_form(plain=False):
    return f"""
<form class="form{' form--plain' if plain else ''}" action="{FORM_ACTION}" method="POST" data-quote-form novalidate>
  <input type="hidden" name="_subject" value="New quote request from maxpavingkc.com">
  <input type="hidden" name="_template" value="table">
  <input type="hidden" name="_captcha" value="false">
  <input type="text" name="_honey" class="honey" tabindex="-1" autocomplete="off" aria-hidden="true">
  <div class="form__row">
    <div class="field"><label for="first_name">First Name <abbr title="required">*</abbr></label><input type="text" id="first_name" name="first_name" required autocomplete="given-name"></div>
    <div class="field"><label for="last_name">Last Name <abbr title="required">*</abbr></label><input type="text" id="last_name" name="last_name" required autocomplete="family-name"></div>
  </div>
  <div class="form__row">
    <div class="field"><label for="email_address">Email Address <abbr title="required">*</abbr></label><input type="email" id="email_address" name="email_address" required autocomplete="email"></div>
    <div class="field"><label for="phone_number">Phone Number</label><input type="tel" id="phone_number" name="phone_number" autocomplete="tel"></div>
  </div>
  <div class="field"><label for="subject">Subject</label><input type="text" id="subject" name="subject"></div>
  <div class="field"><label for="project_details">Project Details <abbr title="required">*</abbr></label><textarea id="project_details" name="project_details" required></textarea></div>
  <div class="form__foot">
    <button class="btn btn--yellow" type="submit">Submit {ICON['arrow']}</button>
    <p class="form__note">We typically reply within one business day.</p>
  </div>
  <div class="form__msg form__msg--ok" role="status">Thank you for contacting us! We will follow up with you soon.</div>
  <div class="form__msg form__msg--err" role="alert">There was an error trying to send your message. Please try again later.</div>
</form>
"""


def quote_section(title="Get A Quote Today"):
    return f"""
<section class="quote section" id="quote">
  <div class="container">
    <div class="quote__aside reveal">
      <span class="eyebrow">Free evaluation &amp; estimate</span>
      <h2>{title}</h2>
      <p class="lead">We look forward to hearing about your mission, and making it possible with our services.</p>
      <p class="quote__phone">Prefer to talk? <a href="tel:{PHONE_TEL}">{PHONE}</a></p>
    </div>
    <div class="reveal">{quote_form()}</div>
  </div>
</section>
"""


def reviews_section(dark=False):
    stars = ICON["star"] * 5
    def card(name, text):
        initials = "".join(w[0] for w in name.split()[:2]).upper()
        return f"""
        <figure class="review">
          <figcaption><span class="review__avatar">{initials}</span><span><strong>{name}</strong><small>Google review</small></span></figcaption>
          <div class="review__stars" aria-label="5 out of 5 stars">{stars}</div>
          <blockquote>{text}</blockquote>
        </figure>"""
    cards = "".join(card(n, t) for n, t in REVIEWS)
    return f"""
<section class="reviews section--gray" id="reviews">
  <div class="container center reveal">
    <span class="eyebrow">Google reviews</span>
    <h2>Trusted across Kansas City.</h2>
    <a class="reviews__rating" href="{REVIEWS_URL}" target="_blank" rel="noopener"><span class="review__stars">{stars}</span><strong>5.0</strong><span>on Google &middot; 4 reviews</span></a>
  </div>
  <div class="reviews__marquee">
    <div class="reviews__track">
      <div class="reviews__set">{cards}</div>
      <div class="reviews__set" aria-hidden="true">{cards}</div>
    </div>
  </div>
  <div class="container reviews__actions">
    <a class="btn btn--yellow btn--sm" href="{REVIEWS_URL}" target="_blank" rel="noopener">Read all reviews {ICON['arrow']}</a>
    <a class="btn btn--outline btn--sm" href="{WRITE_REVIEW_URL}" target="_blank" rel="noopener">Write a review</a>
  </div>
</section>
"""


def areas_section():
    chips = "".join(f"<li>{c}</li>" for c in SERVICE_AREAS)
    return f"""
<section class="section section--tight areas" id="service-area">
  <div class="container">
    <div class="areas__grid">
      <div class="reveal">
        <span class="eyebrow">Service area</span>
        <h2>Paving contractor for the Kansas City metro</h2>
        <p>Based in Blue Springs, MO, Max Paving serves commercial and residential customers across the Kansas City metropolitan area on both sides of the state line. Not sure if we cover your location? <a href="tel:{PHONE_TEL}">Call {PHONE}</a> or <a href="contact.html#quote">request a quote</a>.</p>
      </div>
      <ul class="areas__list reveal">{chips}</ul>
    </div>
  </div>
</section>
"""


def faq_section():
    items = "".join(f"""
      <details class="faq reveal">
        <summary>{q}</summary>
        <p>{a}</p>
      </details>""" for q, a in FAQS)
    return f"""
<section class="section section--gray" id="faq">
  <div class="container faq__wrap">
    <div class="center mx reveal">
      <span class="eyebrow">Questions</span>
      <h2>Frequently asked questions</h2>
    </div>
    <div class="faq__list">{items}</div>
  </div>
</section>
"""


def footer():
    links = "".join(f'<li><a href="{h}">{l}</a></li>' for l, h, _ in NAV) + \
        '<li><a href="team.html">Our Team</a></li><li><a href="about.html#history">Our History</a></li>'
    return f"""
<footer class="footer">
  <div class="container">
    <div class="footer__row">
      <a href="index.html" aria-label="Max Paving home"><img class="footer__logo" src="assets/img/Max_Paving_Logo_WHITE.png" alt="Max Paving" width="1587" height="832"></a>
      <ul class="footer__contact">
        <li>{ICON['phone']}<a href="tel:{PHONE_TEL}">{PHONE}</a></li>
        <li>{ICON['mail']}<a href="mailto:{EMAIL}">{EMAIL}</a></li>
        <li>{ICON['pin']}<a href="{MAPS}" target="_blank" rel="noopener">Blue Springs, MO</a></li>
        <li>{ICON['clock']}<span>Mon &ndash; Fri, 8 AM &ndash; 5 PM</span></li>
      </ul>
    </div>
    <div class="footer__bottom">
      <span>&copy; <span data-year>2026</span> Max Paving. All Rights Reserved.</span>
      <span><a href="{REVIEWS_URL}" target="_blank" rel="noopener">Google Reviews</a> &nbsp;&middot;&nbsp; <a href="{FB}" target="_blank" rel="noopener">Facebook</a> &nbsp;&middot;&nbsp; <a href="contact.html">Contact</a></span>
    </div>
  </div>
</footer>
<button class="totop" aria-label="Back to top">{ICON['up']}</button>
<script src="js/main.js?v={ASSET_V["js"]}"></script>
"""


def jsonld(filename, title, crumbs, extra=None):
    import json
    biz = {
        "@type": "LocalBusiness", "@id": SITE + "#organization", "name": "Max Paving",
        "alternateName": "Max Paving KC", "url": SITE, "logo": SITE + "assets/img/Max_Paving_Logo_HORIZONTAL_DIGITAL.jpg",
        "image": SITE + "assets/img/paver-2_edit_v2-scaled.jpg", "telephone": "+1-816-220-7777", "email": EMAIL,
        "description": "Asphalt paving, commercial concrete, excavation and site preparation contractor serving the Kansas City metropolitan area since 2014.",
        "foundingDate": "2014", "priceRange": "$$",
        "address": {"@type": "PostalAddress", "streetAddress": "29803 SW Eagles Pkwy", "addressLocality": "Blue Springs", "addressRegion": "MO", "postalCode": "64029", "addressCountry": "US"},
        "geo": {"@type": "GeoCoordinates", "latitude": 39.0101573, "longitude": -94.2902355},
        "areaServed": [{"@type": "City", "name": c} for c in SERVICE_AREAS] + [{"@type": "AdministrativeArea", "name": "Kansas City Metropolitan Area"}],
        "openingHoursSpecification": [{"@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"], "opens": "08:00", "closes": "17:00"}],
        "sameAs": [FB, MAPS],
        "aggregateRating": {"@type": "AggregateRating", "ratingValue": "5.0", "bestRating": "5", "reviewCount": "4"},
        "review": [{"@type": "Review", "author": {"@type": "Person", "name": n}, "reviewRating": {"@type": "Rating", "ratingValue": "5", "bestRating": "5"}, "reviewBody": t} for n, t in REVIEWS],
        "hasOfferCatalog": {"@type": "OfferCatalog", "name": "Paving services", "itemListElement": [
            {"@type": "Offer", "itemOffered": {"@type": "Service", "name": sv["name"], "url": SITE + sv["file"]}} for sv in SERVICES
        ]},
    }
    items = [{"@type": "ListItem", "position": 1, "name": "Home", "item": SITE}]
    for i, (n, h) in enumerate(crumbs, 2):
        items.append({"@type": "ListItem", "position": i, "name": n, "item": SITE + h})
    graph = {"@context": "https://schema.org", "@graph": [biz,
        {"@type": "WebSite", "@id": SITE + "#website", "url": SITE, "name": "Max Paving", "publisher": {"@id": SITE + "#organization"}},
        {"@type": "WebPage", "url": SITE + filename, "name": title, "isPartOf": {"@id": SITE + "#website"}, "about": {"@id": SITE + "#organization"}},
        {"@type": "BreadcrumbList", "itemListElement": items}]}
    if extra:
        graph["@graph"].extend(extra)
    if filename == "index.html":
        graph["@graph"].append({"@type": "VideoObject", "name": "Max Paving \u2014 Asphalt and Concrete for Kansas City", "description": "Max Paving crews at work on commercial asphalt and concrete projects in the Kansas City metropolitan area.", "thumbnailUrl": SITE + "assets/video/max-paving-hero-poster.jpg", "contentUrl": SITE + "assets/video/max-paving-hero.mp4", "embedUrl": "https://www.youtube.com/embed/7aetdRQ40f0", "uploadDate": "2022-12-21", "duration": "PT1M15S"})
    return json.dumps(graph, ensure_ascii=False)


import hashlib
def _v(rel):
    with open(os.path.join(OUT, rel), "rb") as f:
        return hashlib.md5(f.read()).hexdigest()[:8]
ASSET_V = {"css": None, "js": None}


def faq_schema():
    return {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQS]}


def page(filename, title, desc, active, body, crumbs=(), extra=None):
    ASSET_V["css"] = ASSET_V["css"] or _v("css/style.css")
    ASSET_V["js"] = ASSET_V["js"] or _v("js/main.js")
    canon = SITE + ("" if filename == "index.html" else filename)
    preload = '\n  <link rel="preload" as="image" href="assets/video/max-paving-hero-poster.jpg" fetchpriority="high">' if filename == "index.html" else ""
    doc = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <meta name="description" content="{html.escape(desc)}">
  <link rel="canonical" href="{canon}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta name="theme-color" content="#fecf0e">
  <meta name="geo.region" content="US-MO">
  <meta name="geo.placename" content="Blue Springs, Missouri">
  <meta name="geo.position" content="39.0101573;-94.2902355">
  <meta property="og:locale" content="en_US">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Max Paving">
  <meta property="og:url" content="{canon}">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{html.escape(desc)}">
  <meta property="og:image" content="{SITE}assets/img/og-image.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Max Paving \u2014 asphalt and concrete paving in Kansas City">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{title}">
  <meta name="twitter:description" content="{html.escape(desc)}">
  <meta name="twitter:image" content="{SITE}assets/img/og-image.jpg">
  <link rel="icon" type="image/png" href="assets/img/Max_Paving_Logo_DIGITAL.png">
  <link rel="apple-touch-icon" href="assets/img/Max_Paving_Logo_DIGITAL.png">
  <script type="application/ld+json">{jsonld(filename, title, crumbs, extra)}</script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Raleway:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css?v={ASSET_V["css"]}">{preload}
</head>
<body>
{header(active)}
<main>
{body}
</main>
{footer()}
</body>
</html>
"""
    with open(os.path.join(OUT, filename), "w", encoding="utf-8") as f:
        f.write(doc)


def page_hero(title, crumbs, tagline="Making Your Project Our Mission"):
    trail = '<a href="index.html">Home</a>' + "".join(f'<span>/</span>{c}' for c in crumbs)
    return f"""
<section class="page-hero">
  <div class="container">
    <div>
      <div class="crumbs">{trail}</div>
      <h1>{title}</h1>
      <p>{tagline}</p>
    </div>
  </div>
</section>
"""


# ---------------------------------------------------------------- HOME
home = f"""
<section class="hero hero--video">
  <div class="hero__bg" aria-hidden="true"></div>
  <div class="container hero__stack">
    <span class="hero__eyebrow">Kansas City &middot; Since 2014</span>
    <h1>Kansas City Asphalt &amp; Concrete Paving, <em>Done Right the First Time.</em></h1>
    <p class="hero__sub">Commercial asphalt, concrete and excavation for the Kansas City metro. Free estimates.</p>

    <div class="hero__frame">
      <div class="hero__media" aria-hidden="true">
        <video id="hero-video" autoplay muted playsinline preload="metadata" poster="assets/video/max-paving-hero-poster.jpg">
          <source src="assets/video/max-paving-hero.mp4" type="video/mp4">
        </video>
      </div>
      <!-- Play: restarts the video from the top with sound -->
      <button class="hero__play" type="button" data-play aria-label="Play video with sound">{ICON['play']}</button>
      <!-- Message shown over the blurred video once it finishes -->
      <div class="hero__panel">
        <div class="hero__inner">
          <p class="hero__title">Making your project <em>our mission.</em></p>
          <div class="hero__actions">
            <a class="btn btn--yellow" href="contact.html#quote">Get a Free Quote {ICON['arrow']}</a>
            <button class="btn btn--ghost" type="button" data-replay>{ICON['replay']} Replay video</button>
          </div>
        </div>
      </div>
      <button class="hero__sound" type="button" aria-pressed="false" aria-label="Unmute video" data-sound>
        <span class="hero__sound-off">{ICON['sound_off']}</span><span class="hero__sound-on">{ICON['sound_on']}</span>
      </button>
    </div>

    <a class="btn btn--yellow hero__cta" href="contact.html#quote">Get a Free Quote {ICON['arrow']}</a>
    <p class="hero__proof">
      <a class="hero__stars" href="{REVIEWS_URL}" target="_blank" rel="noopener"><span class="review__stars">{ICON['star'] * 5}</span><strong>5.0 Google rating</strong></a>
      <span>Family-owned since 2014 &middot; 20+ years of experience &middot; OSHA-certified crews</span>
    </p>
  </div>
</section>


<section class="section" id="intro">
  <div class="container split">
    <div class="reveal reveal--left">
      <span class="eyebrow">Who we are</span>
      <h2>Quality Results &amp;<br>Continual Communication</h2>
      <p>Max Paving is a start to finish maintenance and new construction company with decades of experience in the concrete and asphalt industry, serving commercial and residential customers within the Kansas City metropolitan area.</p>
      <p>Working with our certified team, you can expect top-class communication, a turnkey process with integrity, and promises to be kept.</p>
      <a class="btn btn--black" href="about.html">About Max Paving {ICON['arrow']}</a>
    </div>
    <div class="media media--tall media--accent reveal reveal--right"><img src="assets/img/ABOUT_Commercial_Asphalt.IMG_3069_EDIT-scaled.jpg" alt="Max Paving crew paving a commercial lot in Kansas City" loading="lazy"></div>
  </div>
</section>

<section class="section section--gray">
  <div class="container">
    <div class="center mx reveal">
      <span class="eyebrow">How we work</span>
      <h2>Our Three-Step Process</h2>
      <p class="lead">Specializing in commercial paving with a determined problem-solving mindset, Max Paving is a safe industry option. When you have a project, let us make it our mission to take you through the steps:</p>
    </div>
    <div class="grid-3" style="margin-top:44px">
      <article class="card reveal">
        <span class="card__step">01</span>
        <img class="card__icon" src="assets/img/home_1.png" alt="" width="517" height="517">
        <h3>Free Evaluation and Estimate</h3>
        <p>We evaluate your commercial property and answer all your paving questions until there are none remaining. We are a solutions company.</p>
      </article>
      <article class="card reveal">
        <span class="card__step">02</span>
        <img class="card__icon" src="assets/img/home_2.png" alt="" width="518" height="517">
        <h3>Excavation and Site Preparation</h3>
        <p>We set the project up for success with water drainage with subgrade conditions in mind.</p>
      </article>
      <article class="card reveal">
        <span class="card__step">03</span>
        <img class="card__icon" src="assets/img/home_3.png" alt="" width="518" height="517">
        <h3>Construction and Maintenance of Flatwork and Asphalt Paving</h3>
        <p>With a professional process created for the customer, we treat every project like our own.</p>
      </article>
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="center mx reveal">
      <span class="eyebrow">What we do</span>
      <h2>Complex projects require clear solutions</h2>
      <p class="lead">Excavation and site preparation, commercial concrete and commercial asphalt — all in-house, all turnkey.</p>
    </div>
    <div class="grid-3" style="margin-top:44px">
      <a class="member reveal" href="excavation-site-preparation-kansas-city.html">
        <div class="member__photo"><img src="assets/img/SERVICES_Excavation_and_Site_Preparation.IMG_3060_EDIT-scaled.jpg" alt="Excavation and site preparation" loading="lazy"></div>
        <div class="member__body"><h3>Excavation and Site Preparation</h3><p>Appropriately prepared for the paving process, with drainage and subgrade in mind.</p></div>
      </a>
      <a class="member reveal" href="commercial-concrete-kansas-city.html">
        <div class="member__photo"><img src="assets/img/SERVICES_Residential_Concrete_Driveways.IMG_3067_EDIT-copy-scaled.jpg" alt="Commercial concrete" loading="lazy"></div>
        <div class="member__body"><h3>Commercial Concrete</h3><p>Repairs and new installations backed by over two decades of concrete construction experience.</p></div>
      </a>
      <a class="member reveal" href="asphalt-paving-kansas-city.html">
        <div class="member__photo"><img src="assets/img/SERVICES_Commercial_Asphalt.IMG_3073-scaled.jpg" alt="Commercial asphalt" loading="lazy"></div>
        <div class="member__body"><h3>Commercial Asphalt</h3><p>From a piece of land to a level parking lot — improving, repairing and maintaining made easy.</p></div>
      </a>
    </div>
  </div>
</section>

""" + reviews_section() + areas_section() + faq_section() + f"""
<section class="cta section">
  <div class="container reveal">
    <span class="eyebrow">Let's talk</span>
    <h2>Have a project in mind?</h2>
    <p>We look forward to hearing about your mission, and making it possible with our services.</p>
    <a class="btn btn--yellow" href="contact.html#quote">Get a Quote {ICON['arrow']}</a>
  </div>
</section>
"""
page("index.html", "Asphalt Paving & Concrete Contractor Kansas City, MO | Max Paving",
     "Max Paving is a start-to-finish asphalt paving, commercial concrete and excavation contractor with 20+ years of experience serving the Kansas City metropolitan area. Free estimates.",
     "index.html", home, extra=[faq_schema()])

# ---------------------------------------------------------------- ABOUT
about = page_hero("About", ["About"]) + f"""
<section class="section">
  <div class="container split">
    <div class="reveal reveal--left">
      <span class="eyebrow">About Max Paving</span>
      <h2>A family-owned business with a growing connection to Kansas City</h2>
      <p>Max Paving is a family-owned business with a growing connection to the Kansas City metropolitan area. With over 20 years of experience in the asphalt and concrete industry, our turnkey constructions and extensive maintenance work are made safe and professional for our customers and team. We value kept promises so expect a timely, qualitative service with top-class communication for a job done right the first time.</p>
      <a class="btn btn--black" href="team.html">Meet Our Team {ICON['arrow']}</a>
    </div>
    <div class="media media--tall media--accent reveal reveal--right"><img src="assets/img/ABOUT_Commercial_Asphalt.IMG_3069_EDIT-scaled.jpg" alt="Max Paving crew paving commercial asphalt"></div>
  </div>
</section>

<section class="section section--gray section--tight">
  <div class="container">
    <div class="values">
      <div class="value reveal">
        <img src="assets/img/about-13.png" alt="" width="517" height="517">
        <div><h3>Mission</h3><p>Having the most satisfied asphalt and concrete customers in the Kansas City metropolitan area; making their mission possible with communicative professionalism.</p></div>
      </div>
      <div class="value reveal">
        <img src="assets/img/about-14.png" alt="" width="517" height="517">
        <div><h3>Vision</h3><p>To partner with each customer, excel in our field, and make an impact on the world around us.</p></div>
      </div>
      <div class="value reveal">
        <img src="assets/img/about-15.png" alt="" width="517" height="517">
        <div><h3>Commitment</h3><p>We are convinced that a correctly completed process benefits both parties. This belief makes us committed to treating customers’ projects as our own. Also, taking care of team members and transforming our opportunity to serve clients into helping others in need lies close to the company’s heart.</p></div>
      </div>
    </div>
  </div>
</section>

<section class="section" id="history">
  <div class="container split split--rev">
    <div class="prose reveal reveal--right">
      <div class="history-tag">2014 <small>Founded</small></div>
      <h2>History of the Company</h2>
      <p>Max Paving started their asphalt and concrete business in 2014. Despite decades of previous industry experience among the workers, a small and humble beginning laid the ground for the large-scale professional paving company it has turned into.</p>
      <p>Constructing small, private residential driveways eventually turned into bigger and more complex projects where the team could move towards the level of potential and expertise held from scratch. Determined to reach the original vision of the company, Max Paving is year by year getting closer to making every mission possible.</p>
      <p>Kansas City and its metropolitan area have become home to this industry option which treats customer’s projects like their own. Providing a fair process and top-level communication, and creating processes unique to each customer has led to success.</p>
      <p>Above all, however, pride stems from the opportunity to take care of our team members and their families as well as a number of non-profit organizations supporting local and international communities. A concept of honesty and integrity runs through the entire business with positive change in the world at its core.</p>
    </div>
    <div class="media media--tall reveal reveal--left"><img src="assets/img/process.jpg" alt="Max Paving dump truck" loading="lazy"></div>
  </div>
</section>
""" + quote_section()
page("about.html", "About Max Paving | Family-Owned Paving Company in Kansas City",
     "Family-owned since 2014 with over 20 years of asphalt and concrete experience. Learn about Max Paving's mission, vision, commitment and history in the Kansas City metro.",
     "about.html", about, [("About", "about.html")])

# ---------------------------------------------------------------- TEAM
team = page_hero("Our Team", ['<a href="about.html">About</a>', "Team"]) + f"""
<section class="section">
  <div class="container">
    <div class="center mx reveal">
      <span class="eyebrow">The people behind the mission</span>
      <h2>Our Team</h2>
      <p class="lead">Our team consists of 15 members who each bring their specialties to the table. On-site workers are all OSHA certified and continuously go through updated safety training. Before arriving at the project location, we make sure our team is aware of its general and specific hazards. We put effort into educating our team of your project so success can be obtained.</p>
    </div>
    <div class="team" style="margin-top:48px">
      <article class="member reveal">
        <div class="member__photo"><img src="assets/img/Gary_Stucker_headshot_square-scaled.jpg" alt="Gary Stucker" loading="lazy"></div>
        <div class="member__body">
          <span class="member__role">Owner &amp; President</span>
          <h3>Gary Stucker</h3>
          <p>Leading the way with over 25 years of experience in the industry, Gary’s well-rounded knowledge has been a leading factor to the company’s success. He is the highway and parking lot expert with completed work for hospitals and larger roads, among other locations. As a professionally-oriented listener and communicator, Gary keeps the ball rolling.</p>
          <div class="member__contact"><a href="mailto:Gary@maxpavingkc.com">{ICON['mail']}Gary@maxpavingkc.com</a></div>
        </div>
      </article>
      <article class="member reveal">
        <div class="member__photo"><img src="assets/img/Christina_Parton_headshot_square.jpg" alt="Christina Parton" loading="lazy"></div>
        <div class="member__body">
          <span class="member__role">Controller</span>
          <h3>Christina Parton</h3>
          <p>As our full-time administrator, she brings more than a decade of experience in the executive administrative role and hands-on exposure to overseeing financial functions in corporate organizations. Christina brings innovative ways and organization to keep our processes in order.</p>
          <div class="member__contact">
            <a href="tel:{PHONE_TEL}">{ICON['phone']}{PHONE}</a>
            <a href="mailto:Christina@maxpavingkc.com">{ICON['mail']}Christina@maxpavingkc.com</a>
          </div>
        </div>
      </article>
      <article class="member reveal">
        <div class="member__photo"><img src="assets/img/Mike_Gann_headshot.2_square.jpg" alt="Mike Gann" loading="lazy"></div>
        <div class="member__body">
          <span class="member__role">Concrete Superintendent</span>
          <h3>Mike Gann</h3>
          <p>Adding an additional 20 years of experience to the business, Mike is well-rounded and reliable with everything from simple floors to commercial parking lot projects. As our industry leader for everything concrete, he is educated in all mix-designs and applications. With his leadership we have been able to execute highly successful projects.</p>
        </div>
      </article>
    </div>
  </div>
</section>
""" + quote_section()
page("team.html", "Our Team | Max Paving Kansas City",
     "Meet the Max Paving team: Gary Stucker, Christina Parton and Mike Gann lead 15 OSHA-certified asphalt and concrete professionals serving the Kansas City metro.",
     "team.html", team, [("About", "about.html"), ("Our Team", "team.html")])

# ---------------------------------------------------------------- SERVICES
services = page_hero("Services", ["Services"]) + f"""
<section class="section">
  <div class="container">
    <div class="split" style="align-items:start">
      <div class="reveal">
        <span class="eyebrow">Our services</span>
        <h2>Complex projects require clear solutions and that’s what Max Paving can do for you.</h2>
      </div>
      <div class="prose reveal">
        <p>Expanding the company’s scope of work to offering excavation and site preparation in addition to our various kinds of asphalt and concrete constructions, Max Paving is a solution for commercial customers within the Kansas City metropolitan area.</p>
        <p>As your project becomes our priority, Max Paving’s team will make the way to “mission completed” both timely and professional. So raise your expectations and we will make it our mission to exceed them – we know you want it completed correctly the first time.</p>
      </div>
    </div>
  </div>
</section>

<section class="section section--gray" style="padding-top:0">
  <div class="container">
    <div class="tabs" data-tabs style="padding-top:clamp(48px,6vw,80px)">
      <div class="tabs__nav" role="tablist" aria-label="Services">
        <button class="tabs__btn" role="tab" data-tab="excavation-and-site-preparation" aria-selected="true"><span class="num">1</span>Excavation and Site Preparation</button>
        <button class="tabs__btn" role="tab" data-tab="commercial-concrete" aria-selected="false"><span class="num">2</span>Commercial Concrete</button>
        <button class="tabs__btn" role="tab" data-tab="commercial-asphalt" aria-selected="false"><span class="num">3</span>Commercial Asphalt</button>
      </div>
      <div>
        <div class="tabs__panel service is-active" id="excavation-and-site-preparation" role="tabpanel">
          <div class="media"><img src="assets/img/SERVICES_Excavation_and_Site_Preparation.IMG_3060_EDIT-scaled.jpg" alt="Excavation and site preparation" loading="lazy"></div>
          <div class="service__body">
            <div>
              <h3>Excavation and Site Preparation</h3>
              <p>With our experienced crews we do all excavation and site preparation in-house. Your project will be therefore appropriately prepared for the paving process.</p>
              <p>We are proud to offer this complete turnkey process to our customers. Convinced that an optimal set-up is vital for the desired result, we will gladly turn your property around before beginning the flatwork.</p>
              <a class="btn btn--black btn--sm" href="excavation-site-preparation-kansas-city.html">Excavation details {ICON['arrow']}</a>
            </div>
            <div class="media media--wide"><img src="assets/img/services_excavation.jpg" alt="Excavator preparing a site" loading="lazy"></div>
          </div>
        </div>
        <div class="tabs__panel service" id="commercial-concrete" role="tabpanel">
          <div class="media"><img src="assets/img/SERVICES_Residential_Concrete_Driveways.IMG_3067_EDIT-copy-scaled.jpg" alt="Concrete work" loading="lazy"></div>
          <div class="service__body">
            <div>
              <h3>Commercial Concrete</h3>
              <p>With experience stretching over two decades, the shared knowledge in concrete construction maintains our confidence in providing customers the service and product they deserve. Expect excellence whether a repair and/or a new installation is on the agenda. Max Paving makes it possible.</p>
              <a class="btn btn--black btn--sm" href="commercial-concrete-kansas-city.html">Concrete details {ICON['arrow']}</a>
            </div>
            <div>
              <h3>Residential Concrete Driveways</h3>
              <p>Residential driveway projects have been foundational in our business. The driveway work that Max Paving offers today is exclusively concrete work on larger-sized residential areas. Our attitude is the same though, we aim to satisfy.</p>
            </div>
          </div>
        </div>
        <div class="tabs__panel service" id="commercial-asphalt" role="tabpanel">
          <div class="media"><img src="assets/img/SERVICES_Commercial_Asphalt.IMG_3073-scaled.jpg" alt="Commercial asphalt paving" loading="lazy"></div>
          <div class="service__body">
            <div>
              <h3>Commercial Asphalt</h3>
              <p>From a piece of land to a level parking lot, or whatever your need might be, Max Paving won’t make it complicated. Our goal is to make the process of improving, repairing, and/or maintaining the area as easy as possible.</p>
            </div>
            <div>
              <p>We pride ourselves in our communication and problem-solving skills developed throughout the years. With an experienced asphalt crew, we do your project right the first time.</p>
              <a class="btn btn--black btn--sm" href="asphalt-paving-kansas-city.html">Asphalt details {ICON['arrow']}</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
""" + quote_section()
page("services.html", "Asphalt, Concrete & Excavation Services | Max Paving Kansas City",
     "Commercial asphalt paving, commercial concrete, residential concrete driveways, excavation and site preparation — done in-house by Max Paving for the Kansas City metropolitan area.",
     "services.html", services, [("Services", "services.html")])

# ---------------------------------------------------------------- COMMITMENT
commitment = page_hero("Commitment", ["Commitment"]) + f"""
<section class="section">
  <div class="container split">
    <div class="reveal reveal--left">
      <span class="eyebrow">Our Commitment</span>
      <h2>A promise is a promise</h2>
      <p class="lead">At Max Paving, a promise is a promise and from your free estimate to the finished product, our mission is to keep ours.</p>
      <a class="btn btn--black" href="#quote">Get a Quote {ICON['arrow']}</a>
    </div>
    <div class="media media--tall media--accent reveal reveal--right"><img src="assets/img/process.jpg" alt="Max Paving dump truck on site"></div>
  </div>
</section>

<section class="section section--gray section--tight">
  <div class="container">
    <div class="values">
      <div class="value reveal">
        <img src="assets/img/icons-16.png" alt="" width="517" height="517">
        <div><h3>Our Promise</h3><p>At Max Paving, a promise is a promise and from your free estimate to the finished product, our mission is to keep ours.</p></div>
      </div>
      <div class="value reveal">
        <img src="assets/img/icons-18.png" alt="" width="517" height="517">
        <div><h3>Continual Communication</h3><p>Starting from the very beginning with excavation and site preparation, we make it a routine to communicate the progress with our customers. To us, keeping you up-to-date and educated on the logistics and reasons behind our approach is a given. Whether you need asphalt or concrete doesn’t matter, we do them both with excellence.</p></div>
      </div>
      <div class="value reveal">
        <img src="assets/img/icons-17.png" alt="" width="517" height="517">
        <div><h3>Quality Results</h3><p>Striving to satisfy customers with more than quality results, our simple process should leave you just as content.</p></div>
      </div>
    </div>
  </div>
</section>
""" + quote_section()
page("commitment.html", "Our Commitment | Max Paving Kansas City",
     "At Max Paving, a promise is a promise. From your free estimate to the finished product, expect continual communication and quality asphalt and concrete results in Kansas City.",
     "commitment.html", commitment, [("Commitment", "commitment.html")])

# ---------------------------------------------------------------- CONTACT
contact = page_hero("Contact Us", ["Contact"], "Thank you for considering us for your project!") + f"""
<section class="section" id="quote">
  <div class="container contact-grid">
    <div class="reveal">
      <span class="eyebrow">Contact</span>
      <h2>Have a Project in Mind?</h2>
      <p class="lead">We look forward to hearing about your mission, and making it possible with our services.</p>
      <ul class="info-list">
        <li><span class="ico">{ICON['phone']}</span><div><small>Phone</small><a href="tel:{PHONE_TEL}">{PHONE}</a></div></li>
        <li><span class="ico">{ICON['pin']}</span><div><small>Location</small><a href="{MAPS}" target="_blank" rel="noopener">Blue Springs, MO</a></div></li>
        <li><span class="ico">{ICON['mail']}</span><div><small>Email</small><a href="mailto:{EMAIL}">{EMAIL}</a></div></li>
        <li><span class="ico">{ICON['clock']}</span><div><small>Hours</small><strong>Monday &ndash; Friday: 8 AM &ndash; 5 PM</strong></div></li>
      </ul>
      <div class="map"><iframe src="{MAP_EMBED}" title="Max Paving on Google Maps" loading="lazy" allowfullscreen referrerpolicy="no-referrer-when-downgrade"></iframe></div>
    </div>
    <div class="reveal">{quote_form(plain=True)}</div>
  </div>
</section>
""" + reviews_section() + areas_section()
page("contact.html", "Contact Max Paving | Free Paving Quote in Kansas City",
     "Contact Max Paving in Blue Springs, MO. Call (816) 220-7777 or request a free quote for asphalt paving, concrete and excavation in the Kansas City metropolitan area.",
     "contact.html", contact, [("Contact", "contact.html")])


# ---------------------------------------------------------------- SERVICE PAGES
for sv in SERVICES:
    others = "".join(f'<li><a href="{o["file"]}">{o["name"]}</a></li>' for o in SERVICES if o is not sv)
    bullets = "".join(f"<li>{ICON['check']}<span>{b}</span></li>" for b in sv["bullets"])
    body_ps = "".join(f"<p>{b}</p>" for b in sv["body"])
    svc_schema = {"@type": "Service", "name": sv["name"], "serviceType": sv["name"], "url": SITE + sv["file"],
                  "provider": {"@id": SITE + "#organization"}, "areaServed": [{"@type": "City", "name": c} for c in SERVICE_AREAS],
                  "description": sv["desc"]}
    content = page_hero(sv["h1"], ['<a href="services.html">Services</a>', sv["name"]]) + f"""
<section class="section">
  <div class="container split">
    <div class="reveal reveal--left">
      <span class="eyebrow">{sv['name']}</span>
      <h2>{sv['intro']}</h2>
      {body_ps}
      <a class="btn btn--black" href="#quote">Get a Free Quote {ICON['arrow']}</a>
    </div>
    <div class="media media--tall media--accent reveal reveal--right"><img src="{sv['img']}" alt="{sv['alt']}"></div>
  </div>
</section>

<section class="section section--gray section--tight">
  <div class="container split" style="align-items:start">
    <div class="reveal">
      <span class="eyebrow">What's included</span>
      <h2>{sv['name']} services</h2>
      <ul class="checklist">{bullets}</ul>
    </div>
    <div class="reveal">
      <span class="eyebrow">Our process</span>
      <h2>Three simple steps</h2>
      <ol class="steps">
        <li><strong>Free evaluation and estimate.</strong> We evaluate your property and answer all your paving questions until there are none remaining.</li>
        <li><strong>Excavation and site preparation.</strong> We set the project up for success with water drainage and subgrade conditions in mind.</li>
        <li><strong>Construction and maintenance.</strong> With a professional process created for the customer, we treat every project like our own.</li>
      </ol>
      <p class="prose">Also see:</p><ul class="inline-links">{others}</ul>
    </div>
  </div>
</section>
""" + areas_section() + faq_section() + quote_section(f"Get a Free {sv['name']} Quote")
    page(sv["file"], sv["title"], sv["desc"], "services.html", content,
         [("Services", "services.html"), (sv["name"], sv["file"])], extra=[svc_schema, faq_schema()])

# ---------------------------------------------------------------- 404
page("404.html", "Page not found | Max Paving", "The page you were looking for could not be found.", "", page_hero("Page not found", ["404"], "That page has moved or never existed.") + f"""
<section class="section center">
  <div class="container mx">
    <p class="lead">Try the home page, or reach us directly at <a href="tel:{PHONE_TEL}">{PHONE}</a>.</p>
    <a class="btn btn--yellow" href="index.html">Back to Home {ICON['arrow']}</a>
  </div>
</section>
""")
with open(os.path.join(OUT, "404.html"), encoding="utf-8") as f:
    nf = f.read().replace('<meta name="robots" content="index, follow, max-image-preview:large">', '<meta name="robots" content="noindex, follow">')
with open(os.path.join(OUT, "404.html"), "w", encoding="utf-8") as f:
    f.write(nf)

with open(os.path.join(OUT, "robots.txt"), "w") as f:
    f.write("User-agent: *\nAllow: /\nSitemap: " + SITE + "sitemap.xml\n")
import datetime
today = datetime.date.today().isoformat()
pages = ["", "about.html", "team.html", "services.html", "commitment.html", "contact.html"] + [sv["file"] for sv in SERVICES]
with open(os.path.join(OUT, "sitemap.xml"), "w") as f:
    f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
    for pg in pages:
        pr = '1.0' if pg == '' else ('0.9' if pg.endswith('kansas-city.html') else '0.8')
        f.write(f"  <url><loc>{SITE}{pg}</loc><lastmod>{today}</lastmod><changefreq>monthly</changefreq><priority>{pr}</priority></url>\n")
    f.write("</urlset>\n")
print("built")
