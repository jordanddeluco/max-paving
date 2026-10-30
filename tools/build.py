import os, html, json

OUT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PHONE = "(816) 220-7777"
PHONE_TEL = "+18162207777"
EMAIL = "maxpavingkc@gmail.com"  # quote-form inbox (FormSubmit)
ESTIMATORS = [("Wendell", "wendell@maxpavingkc.com"), ("Daniel", "daniel@maxpavingkc.com")]
ADDRESS = ("29803 SW Eagles Parkway", "Grain Valley", "MO", "64029")
HQ = "Grain Valley, MO"
FB = "https://www.facebook.com/profile.php?id=100043755836975"
MAPS = "https://www.google.com/maps/place/MAX+Paving/@39.0101573,-94.2924242,17z/data=!3m1!4b1!4m5!3m4!1s0x87c11b706681c095:0xa1b24de750c290f!8m2!3d39.0101573!4d-94.2902355"
MAP_EMBED = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3100.2260232275817!2d-94.2924241846463!3d39.01015727955338!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x87c11b706681c095%3A0xa1b24de750c290f!2sMAX%20Paving!5e0!3m2!1sen!2sus!4v1674518672093!5m2!1sen!2sus"
SITE = "https://jordanddeluco.github.io/max-paving/"
REVIEWS_URL = "https://share.google/hT4Gpq2Xz3r9wQ2np"
WRITE_REVIEW_URL = "https://www.google.com/search?q=MAX+Paving+Blue+Springs+MO#lrd=0x87c11b706681c095:0xa1b24de750c290f,3"
REVIEW_COUNT = 5
REVIEWS = [
    ("Paul Deluco", "Hired Max Paving a few years back to pave my driveway and pour a concrete pad for one of my buildings. I thought they did an incredible job — and what really proved it was how everything held up afterward. Both the driveway and the pad have lasted incredibly well through everything Missouri weather throws at them. No cracking, no settling, no surprises. That’s exactly why they’re the first call I made when I had more work come up. Gary and the crew did it right the first time. Highly recommend."),
    ("Steve Howard", "I’ve been working with Gary and Max Paving for 8-9 years now and I would highly recommend their services. Gary is fantastic to work with, great with customers, and his crews do fantastic work."),
    ("Carol Foster", "Max Paving was a pleasure to work with from start to finish. Their pricing was fair and straightforward. They had excellent communication from start to finish and we always knew what was happening and when. What stood out most was their willingness to do whatever it took to make sure we were happy with the results. Highly recommend."),
]
STATS = [("25+", "Crew years in the trade"), ("100 mi", "Service radius"), ("Family", "Owned &amp; operated"), ("Free", "Written proposals")]

# Long-form service + city copy (from maxpavingkc.com) lives in content.json; everything else is here.
with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "content.json"), encoding="utf-8") as f:
    _content = json.load(f)
SUBSERVICES = _content["services"]   # pages only for entries with "file"; the rest are listed on their category page
LOCATIONS = _content["locations"]    # pages only for entries with "file"
MORE_AREAS = ["Raytown", "Belton", "Raymore", "Grandview", "Gladstone", "North Kansas City", "Kearney", "Smithville", "Excelsior Springs", "Platte City", "Parkville", "Riverside", "Odessa", "Peculiar", "Harrisonville", "Leawood", "Prairie Village", "Mission", "Merriam", "Spring Hill", "Bonner Springs", "Lansing"]

CATEGORIES = [
    {
        "key": "concrete", "id": "commercial-concrete", "file": "commercial-concrete-kansas-city.html",
        "name": "Commercial &amp; Residential Concrete", "short": "Concrete",
        "tag": "Driveways, parking lots, sidewalks, curbs, repair &amp; replacement.",
        "title": "Concrete Contractor Kansas City | Parking Lots, Driveways & Repair | Max Paving",
        "desc": "Commercial and residential concrete contractor in Kansas City: parking lots, sidewalks, curbs, pads, truck lanes, driveways, repair and replacement. In-house crews, free written proposals.",
        "h1": "Concrete Contractor in Kansas City", "headline": "Every phase of the pour, by our own crews",
        "img": "assets/img/SERVICES_Residential_Concrete_Driveways.IMG_3067_EDIT-copy-scaled.jpg", "alt": "New concrete driveway and flatwork poured by Max Paving",
        "intro": "Max Paving handles every phase of concrete work, from breakout and excavation through forming, pouring and finishing. New installs, full removal and replacement, and targeted repair across commercial and residential properties.",
        "body": ["All concrete work is handled by our in-house crews to the same standard on every project, commercial and residential, across the full Kansas City metro.",
                 "Our superintendent is educated in all mix designs and applications, from simple floors to commercial parking lots, so every pour is planned for the load and the conditions it will face. Truck lanes and dock aprons get specced for the concentrated loads they actually carry."],
    },
    {
        "key": "asphalt", "id": "commercial-asphalt", "file": "asphalt-paving-kansas-city.html",
        "name": "Commercial &amp; Residential Asphalt", "short": "Asphalt",
        "tag": "Parking lots, driveways, overlays, milling, patching, repairs.",
        "title": "Asphalt Paving Kansas City | Parking Lots, Overlays & Repair | Max Paving",
        "desc": "Asphalt paving contractor in Kansas City: new parking lots, driveways, mill and overlay, patch repair, private roads and ADA routes. In-house crews, free written proposals.",
        "h1": "Asphalt Paving in Kansas City", "headline": "New lots, overlays and repairs, start to finish",
        "img": "assets/img/SERVICES_Commercial_Asphalt.IMG_3073-scaled.jpg", "alt": "Freshly paved commercial asphalt parking lot in Kansas City",
        "intro": "From new construction to repair and resurfacing, our asphalt crews handle the full project lifecycle: subgrade prep, base, paving and finish work. Commercial parking lots, private roads and residential driveways.",
        "body": ["From a piece of land to a level parking lot, or whatever your need might be, we won’t make it complicated. The goal is to make improving, repairing or maintaining the area as easy as possible.",
                 "The first question we answer on site is whether the base is still good. That decides between an economical resurface and a rebuild, and we’ll show you the evidence behind whichever we recommend."],
    },
    {
        "key": "excavation", "id": "excavation-and-site-preparation", "file": "excavation-site-preparation-kansas-city.html",
        "name": "Excavation, Site Prep &amp; Drainage", "short": "Excavation",
        "tag": "Grading, subgrade prep, drainage, catch basins, water management.",
        "title": "Excavation, Site Prep & Drainage Kansas City | Max Paving",
        "desc": "In-house excavation, grading, subgrade preparation and drainage for paving projects across the Kansas City metro. The base gets built right before any asphalt or concrete goes down.",
        "h1": "Excavation &amp; Site Preparation in Kansas City", "headline": "The part you never see decides how long it lasts",
        "img": "assets/img/SERVICES_Excavation_and_Site_Preparation.IMG_3060_EDIT-scaled.jpg", "alt": "Excavation and site preparation for a commercial paving project",
        "intro": "Every paving job stands or fails on the work underneath it. Our excavation crews handle mass grading, subgrade compaction, drainage design and install, and the site prep that decides how long your surface lasts.",
        "body": ["Pavement fails from underneath. Because our own crews do the excavation and base, the part you’ll never see gets built to the same standard as the part you will. Our proposals talk about subgrade before they talk about surface.",
                 "Many paving companies sub out the dirt work or don’t touch it at all. We build the whole section, so nobody points at another trade later."],
    },
]
CAT = {c["key"]: c for c in CATEGORIES}
for c in CATEGORIES:
    c["subs"] = [s for s in SUBSERVICES if s["cat"] == c["key"]]
SUB_BY_SLUG = {s["slug"]: s for s in SUBSERVICES}

PROJECTS = [  # (photo key, title, where/when, category, alt)
    ("sidewalk-accessible-ramp", "Sidewalk &amp; Accessible Ramp", "Office park · 2026", "concrete", "New concrete sidewalk and accessible curb ramp beside an office building parking lot"),
    ("medical-office-parking-lot", "Parking Lot Paving", "Medical office building", "asphalt", "Aerial view of a newly paved asphalt parking lot with landscaped islands at a medical office building"),
    ("dumpster-enclosure-approach", "Dumpster Enclosure Approach", "Commercial property · 2026", "concrete", "New concrete approach leading to a dumpster enclosure at a commercial property"),
    ("curb-and-gutter", "Curb &amp; Gutter", "Commercial property · 2026", "concrete", "New concrete curb and gutter along a lawn edge at a commercial property"),
    ("access-drive-and-parking", "Access Drive &amp; Parking", "KC metro", "asphalt", "Aerial view of a newly paved asphalt access drive and parking area surrounded by trees"),
    ("concrete-gate-approach", "Concrete Gate Approach", "Self-storage facility · 2026", "concrete", "New concrete slab poured at a gated facility entrance, coned off while curing"),
    ("parking-lot-concrete-section", "Parking Lot Concrete Section", "Commercial property · 2026", "concrete", "Replaced concrete section in a parking lot drive lane next to a landscaped island"),
    ("commercial-lot-paving", "Commercial Lot Paving", "Commercial property", "asphalt", "Aerial view of a newly paved asphalt parking lot beside a brick commercial building"),
    ("concrete-curb-island", "Concrete Curb Island", "Office park · 2026", "concrete", "New rounded concrete curb island, coned off while it cures"),
]
PROJECT_ALT = {p[0]: p[4] for p in PROJECTS}

TEAM = [  # (name, role, photo or None, bio, email)
    ("Gary Stucker", "Owner &amp; President", "assets/img/Gary_Stucker_headshot_square-scaled.jpg",
     "Runs the company he built, and stays close to the work. With over 25 years in the industry, Gary is the highway and parking lot expert, with completed work for hospitals and larger roads among other locations. If you’ve dealt with Max Paving before, you’ve probably dealt with Gary.", "Gary@maxpavingkc.com"),
    ("Wendell Gourley", "Lead Estimator &amp; Project Manager", None,
     "Walks the site, measures the job, writes the number and manages the project, so the person who priced your job is the one who answers for it.", "wendell@maxpavingkc.com"),
    ("Mike Gann", "Superintendent", "assets/img/Mike_Gann_headshot.2_square.jpg",
     "Runs the crews in the field. Mike adds another 20 years of experience, from simple floors to commercial parking lots, and is educated in all concrete mix designs and applications. When the schedule says the paver shows up Tuesday, Mike is why it does.", None),
    ("Christina Parton", "Controller", "assets/img/Christina_Parton_headshot_square.jpg",
     "Keeps the books straight and the paperwork moving, from proposals to final invoices. Christina brings more than a decade of executive administration and financial oversight to keep our processes in order.", "Christina@maxpavingkc.com"),
    ("Daniel Cushman", "Contract Administrator", None,
     "Estimates projects alongside Wendell, and handles the contracts, documentation and details that keep commercial projects clean from signature to closeout.", "daniel@maxpavingkc.com"),
]

STEPS = [  # (title, short, detailed)
    ("Free Site Assessment", "We walk the property, measure it, and talk through what you actually need.",
     "We schedule a free onsite walk-through to understand your project, review existing conditions and discuss what you want done. No commission-based salespeople: you talk directly with our estimators."),
    ("Written Proposal", "Scope, materials, and the full price in writing. We look for problems before we price, not after.",
     "Within a few business days you receive a written proposal covering scope, materials, methodology and the total price. We work out site conditions before we price. If something turns up nobody could have known, like soft ground under old pavement, we stop and talk it through with you before any change order."),
    ("Scheduled Start", "Planned around weather and your operations. If the schedule moves, you hear it from us first.",
     "Once you approve the proposal, we coordinate the start date around weather, your business operations and any other contractors. You know what’s happening and when."),
    ("The Build", "Excavation through finished surface, every phase by our own crews.",
     "Our in-house crews handle every phase, from excavation and base through forming, pouring or paving, and finishing. You see the same faces from start to finish."),
    ("Final Walkthrough", "We walk the finished work with you, and back it with a written guarantee.",
     "Before we leave, we walk the finished work with you. Anything that doesn’t meet our standard gets addressed before sign-off, and the project leaves with a one-year warranty on labor and workmanship."),
]
DIFFERENCE = [
    ("Estimators, Not Salespeople", "Most contractors send a commission salesperson to quote and a stranger to build. Here, Wendell or Daniel walks the site and writes the number themselves. The person who priced your job is the person who answers for it."),
    ("Three Trades, One Contract", "Concrete, asphalt, and the excavation underneath both, all self-performed. We build the whole section, so nobody points at another trade later."),
    ("The Base Is The Job", "Pavement fails from underneath. Because our own crews do the excavation and base, the part you’ll never see is built to the same standard as the part you will."),
    ("Municipal-Grade Paperwork", "Fully licensed and insured, with the documentation cities require before a truck ever rolls, including the Cities of Leavenworth and Warrensburg. Your vendor paperwork is already on file."),
    ("Reviews You Can Verify", "The reviews on this site come straight from our Google profile, not typed in by us. Read every one at the source."),
    ("The Small Job Gets The Big Crew", "We started on residential driveways in 2014 and never dropped them. Your driveway gets the same crews, materials and compaction standard as a warehouse truck lane."),
    ("In Writing, Or It Didn’t Happen", "Scope, materials, price and the workmanship guarantee all go on paper before work starts. Calls come back the same or next business day, before the job and after it."),
]
COMPARE_LOW = ["An estimate from a salesperson, with allowances that grow later", "Whatever’s under the pavement stays under the pavement",
               "One thickness for the whole lot, trucks or not", "Crews subbed to whoever’s available that week",
               "Mid-project questions go to an office voicemail", "Gone at the punch list"]
COMPARE_MAX = ["Written scope and full price from Wendell or Daniel, our estimators", "Subgrade and base built to spec, because that’s what fails first",
               "Sections specced to traffic: heavier where trucks live", "Our own operators and finishers, same faces all project",
               "Callbacks the same or next business day, from someone actually on your job", "Final walkthrough and a written workmanship guarantee"]
INCLUDED = ["Free onsite consultation and project evaluation", "Written proposal with scope, materials, timeline and total price",
            "Base, drainage and slope planned on every job", "Our own operators and finishers on every job",
            "Materials as specified in the proposal, never substituted", "Thorough site cleanup before we leave",
            "One-year written workmanship guarantee", "Callbacks the same or next business day"]
GUARANTEE = ["Free, detailed written proposals", "The scope we quote is the scope we build", "Materials as specified, never substituted",
             "Our own crews on every job", "Cleanup included, site ready when we leave", "If it’s not right, we come back and make it right"]

FAQS = [
    ("Do you offer free estimates?", "Yes. Every project starts with a free site assessment: we walk the property, measure it and talk through what you need. Then you get a written proposal with the scope, materials and full price, usually within a few business days."),
    ("What areas do you serve?", "We work anywhere within 100 miles of our shop in Grain Valley, MO, which covers the full Kansas City metro on both the Missouri and Kansas sides. Not sure if we reach you? Call. We probably do."),
    ("Do you do both asphalt and concrete?", "Yes, plus the excavation, base and drainage underneath both. All three trades are self-performed by our own crews, so you deal with one company and one contract."),
    ("Do you handle residential work?", "Yes. Driveways, sidewalks, pads and repair for homeowners, built by the same crews, with the same materials and the same written guarantee as our commercial work."),
    ("Concrete or asphalt?", "Both are good when they’re built right. Concrete costs more up front and lasts longer; asphalt costs less and needs more upkeep. It depends on your budget, how long you’ll own the property and what’s under the pavement now. We’ll give you both numbers if you want the comparison."),
    ("Do you guarantee your work?", "Yes. Every concrete pour and asphalt lift carries a one-year written warranty on labor and workmanship, and it goes in the proposal, not in fine print. If something settles or cracks that shouldn’t within that year, call us and we fix it."),
    ("Are you licensed and insured?", "Fully licensed and insured, with certificates of insurance and vendor onboarding paperwork ready for GCs, property managers and municipalities. We work for cities that require documented proof before a truck rolls."),
]
FORM_ACTION = "https://formsubmit.co/ajax/" + EMAIL
SERVICE_OPTIONS = ["Commercial Concrete", "Residential Concrete", "Concrete Repair & Replacement", "Commercial Asphalt", "Residential Asphalt",
                   "Asphalt Mill & Overlay", "Asphalt Patch Repair", "Excavation, Site Prep & Drainage", "Not sure yet"]
PROPERTY_OPTIONS = ["Commercial", "Residential", "Industrial / Warehouse", "HOA / Multifamily", "Church / Nonprofit", "Municipal / Government"]
TIMELINE_OPTIONS = ["As soon as possible", "Within 30 days", "1–3 months", "3+ months", "Just exploring"]


def e(s):
    return html.escape(s, quote=True)


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
    "x": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    "up": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>',
    "close": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
}

NAV = [
    ("Home", "index.html", []),
    ("About", "about.html", [("Our Story", "about.html"), ("Our Team", "team.html"), ("Our Commitment", "commitment.html"), ("Careers", "careers.html")]),
    ("Services", "services.html", [(c["short"] if c["key"] != "excavation" else "Excavation &amp; Site Prep", c["file"]) for c in CATEGORIES] +
                                  [("Commercial &amp; Industrial", "commercial.html"), ("Residential", "residential.html"), ("All Services", "services.html")]),
    ("Locations", "locations.html", []),
    ("Commitment", "commitment.html", []),
    ("Contact", "contact.html", []),
]
# which top-level item lights up for pages that are not in the nav themselves
NAV_PARENT = {"team.html": "about.html", "careers.html": "about.html", "commercial.html": "services.html", "residential.html": "services.html"}
for c in CATEGORIES:
    NAV_PARENT[c["file"]] = "services.html"
    for s in c["subs"]:
        if "file" in s:
            NAV_PARENT[s["file"]] = "services.html"
for l in LOCATIONS:
    if "file" in l:
        NAV_PARENT[l["file"]] = "locations.html"


def header(active):
    active = NAV_PARENT.get(active, active)
    items = []
    for label, href, subs in NAV:
        cls = "nav__item" + (" is-active" if active == href else "")
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
      <li>{ICON['pin']}<a href="{MAPS}" target="_blank" rel="noopener">{HQ}</a></li>
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


def _options(opts):
    return '<option value="">&mdash; Select &mdash;</option>' + "".join(f"<option>{e(o)}</option>" for o in opts)


def quote_form(page_name, plain=False):
    return f"""
<form class="form{' form--plain' if plain else ''}" action="{FORM_ACTION}" method="POST" data-quote-form novalidate>
  <input type="hidden" name="_subject" value="New quote request from maxpavingkc.com">
  <input type="hidden" name="_template" value="table">
  <input type="hidden" name="_captcha" value="false">
  <input type="hidden" name="page" value="{page_name}">
  <input type="text" name="_honey" class="honey" tabindex="-1" autocomplete="off" aria-hidden="true">
  <div class="form__row">
    <div class="field"><label for="full_name">Your Name <abbr title="required">*</abbr></label><input type="text" id="full_name" name="name" required autocomplete="name"></div>
    <div class="field"><label for="phone_number">Phone <abbr title="required">*</abbr></label><input type="tel" id="phone_number" name="phone" required autocomplete="tel"></div>
  </div>
  <div class="form__row">
    <div class="field"><label for="email_address">Email</label><input type="email" id="email_address" name="email" autocomplete="email"></div>
    <div class="field"><label for="company">Company</label><input type="text" id="company" name="company" autocomplete="organization"></div>
  </div>
  <div class="form__row">
    <div class="field"><label for="service">Service Needed</label><select id="service" name="service">{_options(SERVICE_OPTIONS)}</select></div>
    <div class="field"><label for="property_type">Property Type</label><select id="property_type" name="property_type">{_options(PROPERTY_OPTIONS)}</select></div>
  </div>
  <div class="form__row">
    <div class="field"><label for="project_address">Project Address</label><input type="text" id="project_address" name="project_address" autocomplete="street-address"></div>
    <div class="field"><label for="timeline">Timeline</label><select id="timeline" name="timeline">{_options(TIMELINE_OPTIONS)}</select></div>
  </div>
  <div class="field"><label for="project_details">Project Details <abbr title="required">*</abbr></label><textarea id="project_details" name="project_details" required></textarea></div>
  <div class="form__foot">
    <button class="btn btn--yellow" type="submit">Request a Free Proposal {ICON['arrow']}</button>
    <p class="form__note">We reply the same or next business day. We never sell your information. <a href="privacy-policy.html">Privacy</a></p>
  </div>
  <div class="form__msg form__msg--ok" role="status">Thank you! Wendell or Daniel will get back to you the same or next business day.</div>
  <div class="form__msg form__msg--err" role="alert">There was an error sending your request. Please call us at {PHONE}.</div>
</form>
"""


def quote_section(page_name, title="Request a Free Proposal", lead="Tell us about your project. We’ll come walk it, measure it, and put the scope and price in writing. No pressure, no salespeople."):
    return f"""
<section class="quote section" id="quote">
  <div class="container">
    <div class="quote__aside reveal">
      <span class="eyebrow">Free written proposals</span>
      <h2>{title}</h2>
      <p class="lead">{lead}</p>
      <ul>
        <li>{ICON['check']}Callbacks the same or next business day</li>
        <li>{ICON['check']}Priced by the estimator who answers for it</li>
        <li>{ICON['check']}One-year written workmanship guarantee</li>
      </ul>
      <p class="quote__phone">Prefer to talk? <a href="tel:{PHONE_TEL}">{PHONE}</a></p>
    </div>
    <div class="reveal">{quote_form(page_name)}</div>
  </div>
</section>
"""


def reviews_section():
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
    <h2>What our customers say.</h2>
    <a class="reviews__rating" href="{REVIEWS_URL}" target="_blank" rel="noopener"><span class="review__stars">{stars}</span><strong>5.0</strong><span>on Google &middot; {REVIEW_COUNT} reviews</span></a>
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


def area_chip(l):
    return f'<li><a href="{l["file"]}">{e(l["place"])}</a></li>' if "file" in l else f"<li>{e(l['place'])}</li>"


def areas_section():
    chips = "".join(area_chip(l) for l in LOCATIONS)
    return f"""
<section class="section section--tight areas" id="service-area">
  <div class="container">
    <div class="areas__grid">
      <div class="reveal">
        <span class="eyebrow">Service area</span>
        <h2>Anywhere within 100 miles of Grain Valley</h2>
        <p>From our shop in Grain Valley, MO we work across the full Kansas City metro on both sides of the state line. Not sure if we reach you? <a href="tel:{PHONE_TEL}">Call {PHONE}</a>. We probably do. <a href="locations.html">See all locations</a>.</p>
      </div>
      <ul class="areas__list reveal">{chips}</ul>
    </div>
  </div>
</section>
"""


def faq_section(faqs=FAQS, title="Frequently asked questions", eyebrow="Questions", gray=True):
    items = "".join(f"""
      <details class="faq reveal">
        <summary>{e(q)}</summary>
        <p>{e(a)}</p>
      </details>""" for q, a in faqs)
    return f"""
<section class="section{' section--gray' if gray else ''}" id="faq">
  <div class="container faq__wrap">
    <div class="center mx reveal">
      <span class="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
    </div>
    <div class="faq__list">{items}</div>
  </div>
</section>
"""


def picture(key, alt, sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 380px", eager=False):
    base = f"assets/img/projects/{key}"
    srcset = lambda ext: ", ".join(f"{base}-{w}.{ext} {w}w" for w in (400, 800, 1200))
    load = "" if eager else ' loading="lazy"'
    return (f'<picture><source type="image/webp" srcset="{srcset("webp")}" sizes="{sizes}">'
            f'<img src="{base}-800.jpg" srcset="{srcset("jpg")}" sizes="{sizes}" alt="{e(alt)}" width="1200" height="900"{load} decoding="async"></picture>')


def gallery(cat=None, title="Jobs we’ve finished around the metro", eyebrow="Recent work", gray=False):
    shots = [p for p in PROJECTS if cat in (None, p[3])] or PROJECTS
    figs = "".join(f"""
      <figure class="gallery__item reveal">
        <a href="assets/img/projects/{k}-1200.jpg" data-lightbox aria-label="View larger photo: {t}">{picture(k, alt)}</a>
        <figcaption><strong>{t}</strong><span>{where} &middot; {CAT[c]['short']}</span></figcaption>
      </figure>""" for k, t, where, c, alt in shots)
    return f"""
<section class="section{' section--gray' if gray else ''}" id="work">
  <div class="container">
    <div class="center mx reveal">
      <span class="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p class="lead">A few recent ones, photographed by the crew that did the work.</p>
    </div>
    <div class="gallery">{figs}</div>
  </div>
</section>
"""


def stats_strip():
    return '<section class="trust"><div class="container trust__row">' + "".join(
        f'<div class="trust__item"><strong>{n}</strong><span>{l}</span></div>' for n, l in STATS) + "</div></section>"


def process_section(gray=True, detailed=False, eyebrow="How it works", title="From free assessment to final walkthrough"):
    steps = "".join(f"""
      <li class="process__step reveal"><span class="process__num">{i:02d}</span><h3>{t}</h3><p>{long if detailed else short}</p></li>"""
                    for i, (t, short, long) in enumerate(STEPS, 1))
    return f"""
<section class="section{' section--gray' if gray else ''}" id="process">
  <div class="container">
    <div class="center mx reveal">
      <span class="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p class="lead">Five steps, one company, no handoffs. Here&rsquo;s what hiring us actually looks like.</p>
    </div>
    <ol class="process{' process--detailed' if detailed else ''}">{steps}</ol>
  </div>
</section>
"""


def compare_section(gray=False, lead="Paving bids rarely differ on the asphalt or the concrete. They differ on everything underneath and around it."):
    low = "".join(f"<li>{ICON['x']}<span>{x}</span></li>" for x in COMPARE_LOW)
    mx = "".join(f"<li>{ICON['check']}<span>{x}</span></li>" for x in COMPARE_MAX)
    return f"""
<section class="section{' section--gray' if gray else ''}" id="compare">
  <div class="container">
    <div class="center mx reveal">
      <span class="eyebrow">Side by side</span>
      <h2>What the low bid leaves out</h2>
      <p class="lead">{lead}</p>
    </div>
    <div class="compare">
      <div class="compare__col compare__col--low reveal reveal--left"><h3>The typical low bid</h3><ul>{low}</ul></div>
      <div class="compare__col compare__col--max reveal reveal--right"><h3>The Max Paving proposal</h3><ul>{mx}</ul></div>
    </div>
  </div>
</section>
"""


def checklist(items):
    return '<ul class="checklist">' + "".join(f"<li>{ICON['check']}<span>{e(i)}</span></li>" for i in items) + "</ul>"


def tags(auds):
    return '<div class="tags">' + "".join(f'<a class="tag" href="{a.lower()}.html">{a}</a>' for a in auds) + "</div>"


def svc_card(s, show_cat=False):
    head = f'<span class="svc-card__cat">{CAT[s["cat"]]["short"]}</span>' if show_cat else ""
    if "file" in s:
        first = s["paras"][0]
        blurb = first if len(first) < 150 else first[:first.rfind(" ", 0, 140)] + "…"
        return f"""
      <a class="svc-card svc-card--link reveal" href="{s['file']}">{head}<h3>{e(s['name'])}</h3><p>{e(blurb)}</p><span class="svc-card__more">Learn more {ICON['arrow']}</span></a>"""
    return f"""
      <div class="svc-card reveal">{head}<h3>{e(s['name'])}</h3><p>{e(s['blurb'])}</p><span class="svc-card__aud">{' &middot; '.join(s['audiences'])}</span></div>"""


def category_cards():
    return "".join(f"""
      <a class="member reveal" href="{c['file']}">
        <div class="member__photo member__photo--wide"><img src="{c['img']}" alt="{c['alt']}" loading="lazy"></div>
        <div class="member__body"><span class="member__role">0{i}</span><h3>{c['name']}</h3><p>{c['tag']}</p></div>
      </a>""" for i, c in enumerate(CATEGORIES, 1))


def audience_row():
    return f"""
    <div class="audience">
      <a class="audience__card audience__card--dark reveal reveal--left" href="commercial.html"><small>Managing a property?</small><strong>Commercial &amp; industrial</strong><span>Warehouses, parking lots, municipal work and property management {ICON['arrow']}</span></a>
      <a class="audience__card reveal reveal--right" href="residential.html"><small>Homeowner?</small><strong>Residential services</strong><span>Driveways, sidewalks, pads and repair from the same crews {ICON['arrow']}</span></a>
    </div>"""


def footer():
    svc = "".join(f'<li><a href="{c["file"]}">{c["short"] if c["key"] != "excavation" else "Excavation &amp; Site Prep"}</a></li>' for c in CATEGORIES) + \
        '<li><a href="commercial.html">Commercial &amp; Industrial</a></li><li><a href="residential.html">Residential</a></li><li><a href="services.html">All Services</a></li>'
    company = "".join(f'<li><a href="{h}">{l}</a></li>' for l, h in [("About", "about.html"), ("Our Team", "team.html"), ("Our Commitment", "commitment.html"), ("Careers", "careers.html"), ("Contact", "contact.html"), ("Privacy Policy", "privacy-policy.html")])
    areas = "".join([f'<li><a href="{l["file"]}">{e(l["place"])}</a></li>' for l in LOCATIONS if "file" in l][:8]) + '<li><a href="locations.html">All locations</a></li>'
    mails = "".join(f'<li>{ICON["mail"]}<a href="mailto:{m}">{m}</a></li>' for _, m in ESTIMATORS)
    return f"""
<footer class="footer">
  <div class="container">
    <div class="footer__top">
      <div class="footer__brand">
        <a href="index.html" aria-label="Max Paving home"><img class="footer__logo" src="assets/img/Max_Paving_Logo_WHITE.png" alt="Max Paving" width="1587" height="832"></a>
        <p>Family-owned concrete and asphalt contractor serving the Kansas City metro since 2014.</p>
        <ul class="footer__contact">
          <li>{ICON['phone']}<a href="tel:{PHONE_TEL}">{PHONE}</a></li>
          {mails}
          <li>{ICON['pin']}<a href="{MAPS}" target="_blank" rel="noopener">{ADDRESS[0]}, {ADDRESS[1]}, {ADDRESS[2]} {ADDRESS[3]}</a></li>
          <li>{ICON['clock']}<span>Mon &ndash; Fri, 8 AM &ndash; 5 PM &middot; Sat by appointment</span></li>
        </ul>
      </div>
      <div class="footer__col"><h4>Services</h4><ul>{svc}</ul></div>
      <div class="footer__col"><h4>Company</h4><ul>{company}</ul></div>
      <div class="footer__col"><h4>Service areas</h4><ul>{areas}</ul></div>
    </div>
    <div class="footer__bottom">
      <span>&copy; <span data-year>2026</span> Max Paving. All Rights Reserved. Licensed &amp; insured.</span>
      <span><a href="{REVIEWS_URL}" target="_blank" rel="noopener">Google Reviews</a> &nbsp;&middot;&nbsp; <a href="{FB}" target="_blank" rel="noopener">Facebook</a> &nbsp;&middot;&nbsp; <a href="privacy-policy.html">Privacy</a></span>
    </div>
  </div>
</footer>
<button class="totop" aria-label="Back to top">{ICON['up']}</button>
<script src="js/main.js?v={ASSET_V["js"]}"></script>
"""


def jsonld(filename, title, crumbs, extra=None):
    biz = {
        "@type": "LocalBusiness", "@id": SITE + "#organization", "name": "Max Paving",
        "alternateName": "Max Paving KC", "url": SITE, "logo": SITE + "assets/img/Max_Paving_Logo_HORIZONTAL_DIGITAL.jpg",
        "image": SITE + "assets/img/projects/medical-office-parking-lot-1200.jpg", "telephone": "+1-816-220-7777", "email": ESTIMATORS[0][1],
        "description": "Family-owned concrete, asphalt, excavation and site preparation contractor serving the Kansas City metropolitan area since 2014.",
        "foundingDate": "2014", "priceRange": "$$",
        "address": {"@type": "PostalAddress", "streetAddress": ADDRESS[0], "addressLocality": ADDRESS[1], "addressRegion": ADDRESS[2], "postalCode": ADDRESS[3], "addressCountry": "US"},
        "geo": {"@type": "GeoCoordinates", "latitude": 39.0101573, "longitude": -94.2902355},
        "areaServed": [{"@type": "City", "name": l["place"]} for l in LOCATIONS] + [{"@type": "AdministrativeArea", "name": "Kansas City Metropolitan Area"}],
        "openingHoursSpecification": [{"@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "opens": "08:00", "closes": "17:00"}],
        "sameAs": [FB, MAPS],
        "aggregateRating": {"@type": "AggregateRating", "ratingValue": "5.0", "bestRating": "5", "reviewCount": str(REVIEW_COUNT)},
        "review": [{"@type": "Review", "author": {"@type": "Person", "name": n}, "reviewRating": {"@type": "Rating", "ratingValue": "5", "bestRating": "5"}, "reviewBody": t} for n, t in REVIEWS],
        "hasOfferCatalog": {"@type": "OfferCatalog", "name": "Paving services", "itemListElement": [
            {"@type": "OfferCatalog", "name": html.unescape(c["name"]), "url": SITE + c["file"], "itemListElement": [
                {"@type": "Offer", "itemOffered": {"@type": "Service", "name": s["name"], **({"url": SITE + s["file"]} if "file" in s else {})}} for s in c["subs"]]}
            for c in CATEGORIES
        ]},
    }
    items = [{"@type": "ListItem", "position": 1, "name": "Home", "item": SITE}]
    for i, (n, h) in enumerate(crumbs, 2):
        items.append({"@type": "ListItem", "position": i, "name": html.unescape(n), "item": SITE + h})
    graph = {"@context": "https://schema.org", "@graph": [biz,
        {"@type": "WebSite", "@id": SITE + "#website", "url": SITE, "name": "Max Paving", "publisher": {"@id": SITE + "#organization"}},
        {"@type": "WebPage", "url": SITE + filename, "name": title, "isPartOf": {"@id": SITE + "#website"}, "about": {"@id": SITE + "#organization"}},
        {"@type": "BreadcrumbList", "itemListElement": items}]}
    if extra:
        graph["@graph"].extend(extra)
    if filename == "index.html":
        graph["@graph"].append({"@type": "VideoObject", "name": "Max Paving — Asphalt and Concrete for Kansas City", "description": "Max Paving crews at work on commercial asphalt and concrete projects in the Kansas City metropolitan area.", "thumbnailUrl": SITE + "assets/video/max-paving-hero-poster.jpg", "contentUrl": SITE + "assets/video/max-paving-hero.mp4", "embedUrl": "https://www.youtube.com/embed/7aetdRQ40f0", "uploadDate": "2022-12-21", "duration": "PT1M15S"})
    return json.dumps(graph, ensure_ascii=False).replace("</", "<\\/")


import hashlib
def _v(rel):
    with open(os.path.join(OUT, rel), "rb") as f:
        return hashlib.md5(f.read()).hexdigest()[:8]
ASSET_V = {"css": None, "js": None}


def faq_schema(faqs=FAQS):
    return {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faqs]}


def service_schema(name, url, desc, area=None):
    return {"@type": "Service", "name": name, "serviceType": name, "url": SITE + url, "provider": {"@id": SITE + "#organization"},
            "areaServed": [{"@type": "City", "name": area}] if area else [{"@type": "City", "name": l["place"]} for l in LOCATIONS], "description": desc}


SITEMAP = []


def page(filename, title, desc, active, body, crumbs=(), extra=None, priority="0.7"):
    ASSET_V["css"] = ASSET_V["css"] or _v("css/style.css")
    ASSET_V["js"] = ASSET_V["js"] or _v("js/main.js")
    canon = SITE + ("" if filename == "index.html" else filename)
    if filename != "404.html":
        SITEMAP.append((filename, priority))
    preload = '\n  <link rel="preload" as="image" href="assets/video/max-paving-hero-poster.jpg" fetchpriority="high">' if filename == "index.html" else ""
    robots = "noindex, follow" if filename == "404.html" else "index, follow, max-image-preview:large"
    doc = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{e(title)}</title>
  <meta name="description" content="{e(desc)}">
  <link rel="canonical" href="{canon}">
  <meta name="robots" content="{robots}">
  <meta name="theme-color" content="#fecf0e">
  <meta name="geo.region" content="US-MO">
  <meta name="geo.placename" content="Grain Valley, Missouri">
  <meta name="geo.position" content="39.0101573;-94.2902355">
  <meta property="og:locale" content="en_US">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Max Paving">
  <meta property="og:url" content="{canon}">
  <meta property="og:title" content="{e(title)}">
  <meta property="og:description" content="{e(desc)}">
  <meta property="og:image" content="{SITE}assets/img/og-image.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Max Paving — asphalt and concrete paving in Kansas City">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{e(title)}">
  <meta name="twitter:description" content="{e(desc)}">
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


def cta_band(title="Ready to start your project?", text="Free written proposals across the KC metro. Calls returned the same or next business day."):
    return f"""
<section class="cta section">
  <div class="container reveal">
    <span class="eyebrow">Let's talk</span>
    <h2>{title}</h2>
    <p>{text}</p>
    <a class="btn btn--yellow" href="contact.html#quote">Request a Proposal {ICON['arrow']}</a>
  </div>
</section>
"""


# ---------------------------------------------------------------- HOME
max4 = [("Free Consultation", "We walk the site with you, measure it, and put the full scope and price in writing. Costs you nothing.", "contact.html#quote", "Get a proposal"),
        ("No Salespeople", "Wendell and Daniel do the estimating themselves. The person who prices your job answers for it.", "commitment.html", "Our commitment"),
        ("Our Own Crews", "The people on your property work for us, not a sub we found last week. You see the same faces all project.", "about.html", "How we work"),
        ("A Real Guarantee", "A one-year warranty on labor and workmanship, in writing. If something settles or cracks that shouldn’t, we fix it.", "commitment.html#guarantee", "Read the guarantee")]
home = f"""
<section class="hero hero--video">
  <div class="hero__bg" aria-hidden="true"></div>
  <div class="container hero__stack">
    <span class="hero__eyebrow">Kansas City Metro &middot; Since 2014</span>
    <h1>Kansas City Asphalt &amp; Concrete Paving, <em>Done Right the First Time.</em></h1>
    <p class="hero__sub">Concrete and asphalt for commercial and residential properties across the Kansas City metro. Our own crews and equipment on every job, and a written proposal before any work starts.</p>

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

    <a class="btn btn--yellow hero__cta" href="contact.html#quote">Request a Free Proposal {ICON['arrow']}</a>
    <p class="hero__proof">
      <a class="hero__stars" href="{REVIEWS_URL}" target="_blank" rel="noopener"><span class="review__stars">{ICON['star'] * 5}</span><strong>5.0 Google rating</strong></a>
      <span>Family-owned since 2014 &middot; Licensed &amp; insured &middot; One-year written guarantee</span>
    </p>
  </div>
</section>
{stats_strip()}

<section class="section" id="intro">
  <div class="container split">
    <div class="reveal reveal--left">
      <span class="eyebrow">Who we are</span>
      <h2>Your project. Done right. Done once.</h2>
      <p>&ldquo;Making your project our mission&rdquo; has been the line since the first driveway in 2014. It means the schedule we gave you is the one we work to, the crew you met stays on your job, and the finished surface is one we&rsquo;d put our name on. Because we do.</p>
      <p>We self-perform the whole job, from excavation and base work through the finished surface. You deal with one company and one contract.</p>
      <a class="btn btn--black" href="about.html">About Max Paving {ICON['arrow']}</a>
    </div>
    <div class="media media--tall media--accent reveal reveal--right"><img src="assets/img/ABOUT_Commercial_Asphalt.IMG_3069_EDIT-scaled.jpg" alt="Max Paving crew paving a commercial lot in Kansas City" loading="lazy"></div>
  </div>
</section>

<section class="section section--gray">
  <div class="container">
    <div class="center mx reveal">
      <span class="eyebrow">What we do</span>
      <h2>Concrete &amp; asphalt, start to finish</h2>
      <p class="lead">Three trades, all in-house: the concrete, the asphalt, and the excavation underneath both.</p>
    </div>
    <div class="grid-3" style="margin-top:44px">{category_cards()}
    </div>
    {audience_row()}
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="center mx reveal">
      <span class="eyebrow">Why owners choose us</span>
      <h2>The Max difference</h2>
      <p class="lead">Most of our work comes from repeat clients and referrals. This is why they come back.</p>
    </div>
    <div class="grid-4" style="margin-top:44px">""" + "".join(f"""
      <a class="card card--link reveal" href="{href}"><span class="card__step">0{i}</span><h3>{t}</h3><p>{d}</p><span class="card__more">{more} {ICON['arrow']}</span></a>""" for i, (t, d, href, more) in enumerate(max4, 1)) + f"""
    </div>
  </div>
</section>
""" + process_section() + gallery() + reviews_section() + areas_section() + faq_section() + cta_band("Have a project in mind?", "We look forward to hearing about your mission, and making it possible with our services.")
page("index.html", "Concrete & Asphalt Paving Contractor Kansas City | Max Paving",
     "Family-owned concrete and asphalt contractor serving the Kansas City metro since 2014. Parking lots, driveways, repair, replacement and excavation. In-house crews, free written proposals.",
     "index.html", home, extra=[faq_schema()], priority="1.0")

# ---------------------------------------------------------------- ABOUT
values6 = [("Communicate", "You’ll know what’s happening on your project and when. If the schedule moves because of weather, you hear it from us first."),
           ("Show Up", "Crews on site when we said they’d be there. Calls returned the same or next business day."),
           ("In-House", "Our operators and finishers work directly for Max Paving. When you have a question, the person responsible is easy to find."),
           ("Earn It", "Most of our work comes from people who hired us before, or were told to by someone who did."),
           ("Local Knowledge", "Missouri clay never sits still, and winter finds every shortcut in a slab. We build for the weather this region gets."),
           ("Turnkey", "Excavation, base, paving, finishing and cleanup under one contract. You don’t referee between contractors.")]
creds = [("Licensed", "Fully licensed, with the paperwork current and on file. Municipal contracts don’t allow it any other way."),
         ("Insured", "Fully insured, with certificates of insurance ready when your vendor onboarding needs them, whether you’re a GC, a property manager or a city clerk."),
         ("Vetted By Municipalities", "We work for cities that require documented proof before a truck ever rolls. The documentation stays current all year.")]
clients = [("Commercial Properties", "Parking lots, drives and concrete work for office parks, retail and industrial facilities."),
           ("Churches &amp; Nonprofits", "Long-term relationships with congregations and community organizations across the metro."),
           ("HOAs &amp; Multifamily", "Driveways, walks and parking areas, scheduled so residents can still get in and out."),
           ("Municipal Work", "Prime contractor on curb and sidewalk work for the City of Warrensburg (2025), the City of Leavenworth (2026) and a Gardner Edgerton school district building (2026), plus all of the concrete on Oak Grove’s 2026 street program as a subcontractor.")]
about = page_hero("About Max Paving", ["About"], "One family. Paving KC since 2014.") + f"""
<section class="section">
  <div class="container split">
    <div class="reveal reveal--left">
      <span class="eyebrow">Our story</span>
      <h2>Family owned. One standard.</h2>
      <p>Max Paving is a family-owned concrete and asphalt contractor in Grain Valley, Missouri. Since 2014 we&rsquo;ve been building parking lots, driveways and sidewalks around the Kansas City metro, along with the excavation and base work that comes before them. The company is younger than the people in it: our crew has more than 25 years in this trade.</p>
      <p>We&rsquo;re not the biggest contractor in town, and we&rsquo;re fine with that. The work gets done by our own people, on our own equipment, and we&rsquo;d rather keep it that way than grow past what we can stand behind. A homeowner&rsquo;s driveway gets the same crews and the same attention as a warehouse truck lane.</p>
      <a class="btn btn--black" href="team.html">Meet Our Team {ICON['arrow']}</a>
    </div>
    <div class="media media--tall media--accent reveal reveal--right"><img src="assets/img/ABOUT_Commercial_Asphalt.IMG_3069_EDIT-scaled.jpg" alt="Max Paving crew paving commercial asphalt"></div>
  </div>
</section>
{stats_strip()}

<section class="section section--gray section--tight">
  <div class="container">
    <div class="values">
      <div class="value reveal">
        <img src="assets/img/about-13.png" alt="" width="517" height="517">
        <div><h3>Mission</h3><p>Deliver concrete and asphalt work that owners, GCs and facility managers can trust from the first proposal to the final walkthrough. Quote it honestly, build it with our own crews, and make it last.</p></div>
      </div>
      <div class="value reveal">
        <img src="assets/img/about-14.png" alt="" width="517" height="517">
        <div><h3>Vision</h3><p>To be the contractor Kansas City calls first when something needs to be paved, repaired or replaced. Every finished job is the case for the next one.</p></div>
      </div>
      <div class="value reveal">
        <img src="assets/img/about-15.png" alt="" width="517" height="517">
        <div><h3>Commitment</h3><p>We treat customers&rsquo; projects as our own. Taking care of our team members and turning our opportunity to serve into helping others in need lies close to the company&rsquo;s heart.</p></div>
      </div>
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="center mx reveal">
      <span class="eyebrow">Our values</span>
      <h2>How we operate</h2>
    </div>
    <div class="grid-3" style="margin-top:44px">""" + "".join(f"""
      <article class="card reveal"><span class="card__step">0{i}</span><h3>{t}</h3><p>{d}</p></article>""" for i, (t, d) in enumerate(values6, 1)) + f"""
    </div>
  </div>
</section>

<section class="section section--dark" id="credentials">
  <div class="container">
    <div class="center mx reveal">
      <span class="eyebrow">Credentials</span>
      <h2>Licensed. Insured. Documented.</h2>
    </div>
    <div class="grid-3" style="margin-top:44px">""" + "".join(f"""
      <article class="card reveal"><h3>{t}</h3><p>{d}</p></article>""" for t, d in creds) + f"""
    </div>
    <p class="center reveal" style="margin:36px 0 0">Need a certificate of insurance or vendor paperwork for onboarding? <a class="link-yellow" href="contact.html#quote">Ask us and we&rsquo;ll get it to you.</a></p>
  </div>
</section>

<section class="section" id="history">
  <div class="container split split--rev">
    <div class="prose reveal reveal--right">
      <div class="history-tag">2014 <small>Founded</small></div>
      <h2>History of the company</h2>
      <p>Max Paving started in 2014 doing small private residential driveways. Despite decades of previous industry experience among the crew, a small and humble beginning laid the ground for the professional paving company it has become.</p>
      <p>The work grew the way reputation grows in this trade: one finished job recommending the next, until the driveways became parking lots, the parking lots became commercial and municipal contracts, and the crew grew to match.</p>
      <p>Above all, pride stems from the opportunity to take care of our team members and their families, as well as a number of non-profit organizations supporting local and international communities. Honesty and integrity run through the entire business.</p>
      <p><strong>&ldquo;Making your project our mission.&rdquo;</strong> The line we started with in 2014, and still the whole job description.</p>
    </div>
    <div class="media media--tall reveal reveal--left"><img src="assets/img/process.jpg" alt="Max Paving dump truck" loading="lazy"></div>
  </div>
</section>

<section class="section section--gray">
  <div class="container">
    <div class="center mx reveal">
      <span class="eyebrow">Community</span>
      <h2>Built in Grain Valley. Working across the metro.</h2>
      <p class="lead">Our project list is built on word of mouth from owners who&rsquo;ve worked with us before, and the contractors who trust us as a subcontractor.</p>
    </div>
    <div class="grid-4" style="margin-top:44px">""" + "".join(f"""
      <article class="card reveal"><h3>{t}</h3><p>{d}</p></article>""" for t, d in clients) + f"""
    </div>
    <p class="center reveal" style="margin:36px 0 0">Think you&rsquo;d fit on a crew? <a class="link-under" href="careers.html">We always want to hear from good people</a>.</p>
  </div>
</section>
""" + quote_section("about.html")
page("about.html", "About Max Paving | Family-Owned Paving Contractor Since 2014",
     "Family-owned concrete and asphalt contractor in Grain Valley, MO, founded in 2014 by people already experienced in the trade. Licensed, insured, and trusted by Kansas City municipalities.",
     "about.html", about, [("About", "about.html")])

# ---------------------------------------------------------------- TEAM
def member(name, role, photo, bio, mail):
    initials = "".join(w[0] for w in name.split()[:2])
    pic = f'<img src="{photo}" alt="{name}" loading="lazy">' if photo else f'<span class="member__initials" aria-hidden="true">{initials}</span>'
    contact = ""
    if mail:
        contact = f'<div class="member__contact"><a href="mailto:{mail}">{ICON["mail"]}{mail}</a></div>'
    return f"""
      <article class="member reveal">
        <div class="member__photo{' member__photo--initials' if not photo else ''}">{pic}</div>
        <div class="member__body">
          <span class="member__role">{role}</span>
          <h3>{name}</h3>
          <p>{bio}</p>
          {contact}
        </div>
      </article>"""

team = page_hero("Our Team", ['<a href="about.html">About</a>', "Team"], "Who you’ll be working with") + f"""
<section class="section">
  <div class="container">
    <div class="center mx reveal">
      <span class="eyebrow">The people behind the mission</span>
      <h2>Our Team</h2>
      <p class="lead">Our team consists of 15 members who each bring their specialties to the table. On-site crew members are OSHA certified and go through continually updated safety training, and before arriving at a project we review its general and specific hazards with the crew. No commission salespeople: the person who prices your job answers for it.</p>
    </div>
    <div class="team" style="margin-top:48px">{''.join(member(*m) for m in TEAM)}
    </div>
    <p class="center reveal" style="margin:44px 0 0">Think you&rsquo;d fit on a crew? <a class="link-under" href="careers.html">See careers at Max Paving</a>.</p>
  </div>
</section>
""" + quote_section("team.html")
page("team.html", "Our Team | Max Paving Kansas City",
     "Meet the Max Paving team: owner Gary Stucker, estimators Wendell Gourley and Daniel Cushman, superintendent Mike Gann and controller Christina Parton, leading OSHA-certified in-house crews.",
     "team.html", team, [("About", "about.html"), ("Our Team", "team.html")])

# ---------------------------------------------------------------- SERVICES (overview)
def tab_panel(c, first):
    links = "".join(f'<li><a href="{s["file"]}">{e(s["name"])}</a></li>' for s in c["subs"] if "file" in s)
    more = ", ".join(e(s["name"]) for s in c["subs"] if "file" not in s)
    listing = f'<ul class="link-list">{links}</ul>' if links else ""
    return f"""
        <div class="tabs__panel service{' is-active' if first else ''}" id="{c['id']}" role="tabpanel">
          <div class="media"><img src="{c['img']}" alt="{c['alt']}" loading="lazy"></div>
          <div class="service__body">
            <div>
              <h3>{c['name']}</h3>
              <p>{c['intro']}</p>
              <a class="btn btn--black btn--sm" href="{c['file']}">All {c['short'].lower()} services {ICON['arrow']}</a>
            </div>
            <div>
              {listing}
              <p class="muted">{'Also' if links else 'Includes'}: {more}.</p>
            </div>
          </div>
        </div>"""

tab_btns = "".join(f'<button class="tabs__btn" role="tab" data-tab="{c["id"]}" aria-selected="{"true" if i == 1 else "false"}"><span class="num">{i}</span>{c["short"] if c["key"] != "excavation" else "Excavation &amp; Site Prep"}</button>' for i, c in enumerate(CATEGORIES, 1))
services = page_hero("Services", ["Services"], "From excavation to finished surface") + f"""
<section class="section">
  <div class="container">
    <div class="split" style="align-items:start">
      <div class="reveal">
        <span class="eyebrow">Our services</span>
        <h2>Three trades. Thirty services. One company, start to finish.</h2>
      </div>
      <div class="prose reveal">
        <p>Concrete, asphalt, and the excavation underneath both, all self-performed by our own crews. That means one contract and one point of contact, whether it&rsquo;s a driveway replacement or a phased warehouse truck lane.</p>
        <p>Raise your expectations and we will make it our mission to exceed them. You want it completed correctly the first time, and so do we.</p>
      </div>
    </div>
    {audience_row()}
  </div>
</section>

<section class="section section--gray" style="padding-top:0">
  <div class="container">
    <div class="tabs" data-tabs style="padding-top:clamp(48px,6vw,80px)">
      <div class="tabs__nav" role="tablist" aria-label="Service categories">{tab_btns}</div>
      <div>{''.join(tab_panel(c, i == 0) for i, c in enumerate(CATEGORIES))}
      </div>
    </div>
  </div>
</section>
""" + gallery() + areas_section() + quote_section("services.html")
page("services.html", "Concrete, Asphalt & Excavation Services | Max Paving Kansas City",
     "Concrete and asphalt contractor in Kansas City: parking lots, driveways, sidewalks, curbs, repair and replacement, mill and overlay, and excavation. All in-house, free written proposals.",
     "services.html", services, [("Services", "services.html")])

# ---------------------------------------------------------------- CATEGORY PAGES
for c in CATEGORIES:
    cards = "".join(svc_card(s) for s in c["subs"])
    others = "".join(f'<li><a href="{o["file"]}">{o["name"]}</a></li>' for o in CATEGORIES if o is not c)
    body_ps = "".join(f"<p>{b}</p>" for b in c["body"])
    content = page_hero(c["h1"], ['<a href="services.html">Services</a>', c["short"]], c["tag"]) + f"""
<section class="section">
  <div class="container split">
    <div class="reveal reveal--left">
      <span class="eyebrow">{c['name']}</span>
      <h2>{c['headline']}</h2>
      <p class="lead">{c['intro']}</p>
      {body_ps}
      <a class="btn btn--black" href="#quote">Request a Free Proposal {ICON['arrow']}</a>
    </div>
    <div class="media media--tall media--accent reveal reveal--right"><img src="{c['img']}" alt="{c['alt']}"></div>
  </div>
</section>

<section class="section section--gray" id="services">
  <div class="container">
    <div class="center mx reveal">
      <span class="eyebrow">{len(c['subs'])} services in this category</span>
      <h2>All {c['short'].lower()} services</h2>
    </div>
    <div class="svc-grid">{cards}
    </div>
    <div class="center reveal" style="margin-top:36px"><span class="muted">Other services</span><ul class="inline-links center-links">{others}</ul></div>
  </div>
</section>

<section class="section section--tight">
  <div class="container split" style="align-items:start">
    <div class="reveal">
      <span class="eyebrow">What&rsquo;s included</span>
      <h2>With every project</h2>
      {checklist(INCLUDED)}
    </div>
    <div class="reveal">
      <span class="eyebrow">Our process</span>
      <h2>Five steps, no handoffs</h2>
      <ol class="steps">{''.join(f'<li><strong>{t}.</strong> {s}</li>' for t, s, _ in STEPS)}</ol>
    </div>
  </div>
</section>
""" + gallery(c["key"], gray=True) + areas_section() + faq_section() + quote_section(c["file"], f"Get a Free {c['short']} Proposal")
    schema = service_schema(html.unescape(c["name"]), c["file"], c["desc"])
    page(c["file"], c["title"], c["desc"], c["file"], content,
         [("Services", "services.html"), (c["short"], c["file"])], extra=[schema, faq_schema()], priority="0.9")

# ---------------------------------------------------------------- SUB-SERVICE PAGES
spot_by_service = {}
for l in LOCATIONS:
    if l.get("spotlight"):
        spot_by_service.setdefault(l["spotlight"]["service"], []).append(l)

for s in SUBSERVICES:
    if "file" not in s:
        continue
    c = CAT[s["cat"]]
    paras = "".join(f"<p>{e(p)}</p>" for p in s["paras"])
    img = (picture(s["img"], PROJECT_ALT[s["img"]], "(max-width: 860px) 100vw, 560px", eager=True) if s.get("img")
           else f'<img src="{c["img"]}" alt="{c["alt"]}">')
    siblings = "".join(f'<li><a href="{o["file"]}">{e(o["name"])}</a></li>' for o in c["subs"] if "file" in o and o is not s)
    city_links = "".join(f'<li><a href="{l["file"]}#spotlight">{e(s["name"])} in {e(l["place"])}</a></li>' for l in spot_by_service.get(s["slug"], []))
    city_block = f'<p class="muted" style="margin-top:18px">Local detail: </p><ul class="inline-links">{city_links}</ul>' if city_links else ""
    content = page_hero(e(s["name"]) + " in Kansas City", ['<a href="services.html">Services</a>', f'<a href="{c["file"]}">{c["short"]}</a>', e(s["name"])], "Free proposals &middot; In-house crews &middot; Family owned") + f"""
<section class="section">
  <div class="container split split--top">
    <div class="prose reveal reveal--left">
      <span class="eyebrow">{c['short']} &middot; {e(s['name'])}</span>
      {tags(s['audiences'])}
      <h2>{e(s['name'])} in the Kansas City metro</h2>
      {paras}
      <div class="btn-row"><a class="btn btn--black" href="#quote">Request a Free Proposal {ICON['arrow']}</a><a class="btn btn--line" href="tel:{PHONE_TEL}">Call {PHONE}</a></div>
      {city_block}
    </div>
    <div class="sticky-col reveal reveal--right">
      <div class="media media--tall media--accent">{img}</div>
      <div class="aside-card">
        <h3>Included with every project</h3>
        {checklist(INCLUDED)}
      </div>
    </div>
  </div>
</section>
""" + faq_section(s["faqs"], f"{e(s['name'])} FAQs", "Common questions") + f"""
<section class="section section--tight">
  <div class="container center">
    <span class="eyebrow">More {c['short'].lower()} work</span>
    <ul class="inline-links center-links">{siblings}<li><a href="{c['file']}">All {c['short'].lower()} services</a></li></ul>
  </div>
</section>
""" + process_section() + quote_section(s["file"], f"Get a Free {e(s['name'])} Proposal")
    page(s["file"], s["title"], s["desc"], s["file"], content,
         [("Services", "services.html"), (c["short"], c["file"]), (s["name"], s["file"])],
         extra=[service_schema(s["name"], s["file"], s["desc"]), faq_schema(s["faqs"])], priority="0.8")

# ---------------------------------------------------------------- COMMERCIAL / RESIDENTIAL
why_warehouse = [
    ("Concrete Designed For The Loads", "Dock approaches, dolly pads and slow-turning semis shove asphalt around and crack car-spec slabs. We spec truck lanes and dock aprons for the loads they actually carry, which is why our estimators ask about your truck counts before we talk numbers. Most of that concrete ends up 8 to 10 inches thick, over a base, drainage and slope built for it."),
    ("Phased So Receiving Keeps Receiving", "We sequence pours and cure windows around your dock schedule so the facility keeps operating. A standard mix needs about a week before trucks go back on it; a faster-curing mix can cut that to two or three days when the schedule demands it."),
    ("Multi-Year Phasing", "We break big scopes into phases across seasons and budget years: a written plan for what gets built when, so the spend fits your budget cycle and the property never stops working."),
    ("One Contract, Excavation To Surface", "Site excavation, base, drainage, concrete and the asphalt drive lanes around it, all self-performed. No coordinating three vendors on one yard."),
    ("Paperwork Already On File", "Fully licensed and insured, with the documentation cities require before a truck ever rolls. Certificates of insurance and vendor onboarding without the runaround."),
    ("A Guarantee In Writing", "Every pour and every lift is backed by a one-year written warranty on labor and workmanship, and the estimator who priced the job answers for it."),
]
who_for = [("Municipalities &amp; Public Work", "Public contracts across western Missouri and eastern Kansas. As prime contractor: curb and sidewalk work for the City of Leavenworth (2026), a Gardner Edgerton school district building (2026) and the City of Warrensburg (2025). Procurement-ready documentation and work that holds up to public scrutiny."),
           ("Property Managers &amp; HOAs", "Written proposals your budget cycle can use, multi-year phasing when the reserve plan calls for it, and scheduling that keeps residents and tenants moving while we work."),
           ("General Contractors", "Flatwork, paving and sitework as a subcontractor GCs can stop worrying about: our own crews, real schedules and paperwork that clears your compliance desk. In 2026 we did all of the concrete on the City of Oak Grove’s street program.")]
commercial_svcs = [s for s in SUBSERVICES if "Commercial" in s["audiences"] and "file" in s]
commercial = page_hero("Commercial &amp; Industrial Paving", ['<a href="services.html">Services</a>', "Commercial &amp; Industrial"], "Built for properties that work for a living") + f"""
<section class="section">
  <div class="container">
    <div class="center mx reveal">
      <span class="eyebrow">Industrial concrete</span>
      <h2>Why warehouses choose us for concrete</h2>
      <p class="lead">Heavy-duty concrete and asphalt for warehouses, municipalities, property managers and general contractors across the Kansas City metro.</p>
    </div>
    <div class="grid-3" style="margin-top:44px">""" + "".join(f"""
      <article class="card reveal"><span class="card__check">{ICON['check']}</span><h3>{t}</h3><p>{d}</p></article>""" for t, d in why_warehouse) + f"""
    </div>
    <p class="center reveal" style="margin:36px 0 0"><a class="btn btn--black" href="heavy-duty-concrete-paving-kansas-city.html">Heavy-duty concrete paving {ICON['arrow']}</a></p>
  </div>
</section>

<section class="section section--dark">
  <div class="container">
    <div class="center mx reveal">
      <span class="eyebrow">Who we build for</span>
      <h2>Different properties, same standard</h2>
    </div>
    <div class="grid-3" style="margin-top:44px">""" + "".join(f"""
      <article class="card reveal"><h3>{t}</h3><p>{d}</p></article>""" for t, d in who_for) + f"""
    </div>
  </div>
</section>

<section class="section section--gray">
  <div class="container">
    <div class="center mx reveal">
      <span class="eyebrow">Commercial services</span>
      <h2>Popular commercial work</h2>
    </div>
    <div class="svc-grid">{''.join(svc_card(s, True) for s in commercial_svcs)}
    </div>
  </div>
</section>
""" + compare_section() + gallery(gray=True) + process_section(gray=False) + quote_section("commercial.html", "Walk the property with us",
    f"Tell us what the property needs to do, and we’ll put the scope, the phasing and the full price in writing. Free, detailed, and built to survive your review process. Or call {PHONE} and ask for Wendell or Daniel.")
page("commercial.html", "Commercial & Industrial Paving Kansas City | Warehouses, Lots, Municipal | Max Paving",
     "Heavy-duty concrete and asphalt for warehouses, municipalities, property managers and GCs across Kansas City. Phased scheduling, procurement-ready paperwork, written guarantee.",
     "commercial.html", commercial, [("Services", "services.html"), ("Commercial & Industrial", "commercial.html")], priority="0.8")

res_get = ["Free written proposal with the full price", "The estimator quotes it, not a salesperson", "Our own crews and equipment",
           "Fully licensed and insured", "Cleanup is part of the job", "One-year written workmanship guarantee"]
res_svcs = [("Concrete Driveways", "concrete-driveways", "New pours and full replacements, built on a real base with the reinforcement Missouri clay demands."),
            ("Asphalt Driveways", "asphalt-driveways", "The lower-upfront-cost option, done right: compacted base, proper thickness, clean edges."),
            ("Sidewalks &amp; Walkways", "concrete-sidewalks", "New walks, trip-hazard replacements, and the sections the city tagged for repair."),
            ("Pads &amp; Slabs", "concrete-pads", "HVAC pads, shed and garage slabs, patios and equipment pads, poured level and drained right."),
            ("Repair &amp; Replacement", "concrete-repair-replacement", "Settled panels, spalled surfaces and cracked sections, removed and replaced joint to joint."),
            ("Exposed Aggregate &amp; Finishes", "exposed-aggregate-concrete", "Decorative finishes for driveways, walks and patios that hold up to KC winters.")]
res_why = [("The Price Is In Writing", "A written proposal with the scope, materials and full number. If something unexpected turns up under your driveway, we talk before we bill."),
           ("Built Like Our Commercial Work", "Same crews, same mix standards, same compaction. Residential is where thin bases and weak mixes hide; ours don’t change when the job gets smaller."),
           ("Licensed, Insured, Reachable", "Fully licensed and insured, and we answer the phone, including the follow-up call after the job is done."),
           ("Your Yard Isn’t A Job Site For Long", "Forms out, spoils hauled, site raked, and the driveway usable on the schedule we gave you."),
           ("A Guarantee In Writing", "A one-year written warranty on labor and workmanship. If something settles or cracks that shouldn’t within that year, we fix it.")]
def res_card(t, slug, d):
    s = SUB_BY_SLUG[slug]
    if "file" in s:
        return f'<a class="svc-card svc-card--link reveal" href="{s["file"]}"><h3>{t}</h3><p>{d}</p><span class="svc-card__more">Learn more {ICON["arrow"]}</span></a>'
    return f'<div class="svc-card reveal"><h3>{t}</h3><p>{d}</p></div>'
residential = page_hero("Residential Paving", ['<a href="services.html">Services</a>', "Residential"], "The commercial crew, at your driveway") + f"""
<section class="section">
  <div class="container split">
    <div class="reveal reveal--left">
      <span class="eyebrow">Small jobs, big-job standard</span>
      <h2>Your driveway gets the warehouse treatment</h2>
      <p>Max Paving started in 2014 doing small private residential driveways, and we never stopped taking them. The company grew into commercial contracts, but a homeowner&rsquo;s driveway still gets the same crews and the same attention as a warehouse truck lane.</p>
      <p>That matters more than it sounds. Residential concrete and asphalt is where corners usually get cut, because a homeowner can&rsquo;t see a thin base or a weak mix until winter finds it. We build your driveway to the standard the commercial work demands, because it&rsquo;s the same people.</p>
      {checklist(res_get)}
    </div>
    <div class="media media--tall media--accent reveal reveal--right"><img src="assets/img/SERVICES_Residential_Concrete_Driveways.IMG_3067_EDIT-copy-scaled.jpg" alt="New residential concrete driveway"></div>
  </div>
</section>

<section class="section section--gray">
  <div class="container">
    <div class="center mx reveal">
      <span class="eyebrow">What we do at home</span>
      <h2>Residential services</h2>
    </div>
    <div class="svc-grid">{''.join(res_card(*r) for r in res_svcs)}
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="center mx reveal">
      <span class="eyebrow">Why homeowners choose us</span>
      <h2>Hired for the big jobs. Trusted with the small ones.</h2>
    </div>
    <div class="grid-3" style="margin-top:44px">""" + "".join(f"""
      <article class="card reveal"><span class="card__check">{ICON['check']}</span><h3>{t}</h3><p>{d}</p></article>""" for t, d in res_why) + f"""
      <article class="card card--yellow reveal"><h3>Concrete or asphalt?</h3><p>Both are good driveways when they&rsquo;re built right. Concrete costs more up front and lasts longer; asphalt costs less and needs more upkeep. It depends on your budget, how long you&rsquo;ll own the house and what&rsquo;s under the driveway now. We&rsquo;ll give you both numbers if you want the comparison.</p></article>
    </div>
  </div>
</section>
""" + reviews_section() + process_section(gray=False) + quote_section("residential.html", "Get a real number",
    f"Tell us about the project and we’ll come walk it, measure it, and put the price in writing. No pressure, no salespeople. Rather just talk? Call {PHONE}.")
page("residential.html", "Residential Driveways, Sidewalks & Repair Kansas City | Max Paving",
     "Concrete and asphalt driveways, sidewalks, pads and repair for Kansas City homeowners, built by the same crews as our commercial work. Free written proposals, one-year guarantee.",
     "residential.html", residential, [("Services", "services.html"), ("Residential", "residential.html")], priority="0.8")

# ---------------------------------------------------------------- COMMITMENT
commitment = page_hero("Our Commitment", ["Commitment"], "Every project is our reputation") + f"""
<section class="section">
  <div class="container split">
    <div class="reveal reveal--left">
      <span class="eyebrow">Our commitment</span>
      <h2>A promise is a promise</h2>
      <p class="lead">From your free estimate to the finished product, our mission is to keep ours. Here&rsquo;s how we work, what you can expect, and the guarantee behind every pour and every lift.</p>
      <a class="btn btn--black" href="#quote">Get a Proposal {ICON['arrow']}</a>
    </div>
    <div class="media media--tall media--accent reveal reveal--right"><img src="assets/img/process.jpg" alt="Max Paving dump truck on site"></div>
  </div>
</section>

<section class="section section--gray">
  <div class="container">
    <div class="center mx reveal">
      <span class="eyebrow">The Max difference</span>
      <h2>What we do that not everyone does</h2>
    </div>
    <div class="grid-3" style="margin-top:44px">""" + "".join(f"""
      <article class="card reveal"><span class="card__step">0{i}</span><h3>{t}</h3><p>{d}</p></article>""" for i, (t, d) in enumerate(DIFFERENCE, 1)) + f"""
    </div>
  </div>
</section>
""" + compare_section() + process_section(detailed=True, title="Our five-step project process") + f"""
<section class="section section--dark" id="guarantee">
  <div class="container split">
    <div class="reveal reveal--left">
      <span class="eyebrow">The Max Paving guarantee</span>
      <h2>If it&rsquo;s not right, we make it right.</h2>
      <p class="lead">Every concrete pour and every asphalt lift we install carries a one-year warranty on labor and workmanship, and it goes in the proposal, not in fine print. If the work doesn&rsquo;t perform as it should within that year, we come back and fix it.</p>
      {checklist(GUARANTEE)}
    </div>
    <div class="reveal reveal--right">
      <h3>Why this matters</h3>
      <p>Anyone can quote you a parking lot. The question is whether that contractor still answers the phone after the job is paid for, if something settles, cracks or holds water.</p>
      <p>Max Paving has been at this since 2014, built by people who were in the trade long before that, and we plan on being here a lot longer. A guarantee is only as good as the company standing behind it.</p>
    </div>
  </div>
</section>
""" + reviews_section() + quote_section("commitment.html")
page("commitment.html", "Our Commitment: Process & Guarantee | Max Paving Kansas City",
     "How Max Paving handles every project: estimators instead of salespeople, in-house crews, a five-step process and a one-year written warranty on labor and workmanship.",
     "commitment.html", commitment, [("Commitment", "commitment.html")])

# ---------------------------------------------------------------- CAREERS
trades = ["Heavy equipment operators", "Concrete finishers and form setters", "Asphalt laborers and rakers", "CDL drivers", "Experienced foremen"]
careers = page_hero("Careers", ['<a href="about.html">About</a>', "Careers"], "Come build things that last") + f"""
<section class="section">
  <div class="container split" style="align-items:start">
    <div class="prose reveal reveal--left">
      <span class="eyebrow">Working here</span>
      <h2>The work speaks. So do we.</h2>
      <p>Max Paving runs its own crews on its own equipment. The people we hire aren&rsquo;t handed off to a sub or shuffled between companies: you work for us, alongside the same crew, on projects across the Kansas City metro.</p>
      <p>The work is concrete, asphalt and the excavation underneath both. Driveways to distribution centers, and the municipal jobs in between. It&rsquo;s outdoor trade work, busiest spring through fall, and at the end of a project you can drive past something that will outlast the truck you drove there.</p>
      <p>We always want to hear from good people looking to further their career, whether that&rsquo;s a laborer working toward finisher, a finisher working toward foreman, or an operator who wants more seat time on bigger work. If the crews are full the day you call, we&rsquo;ll say so, keep your name, and reach out when there&rsquo;s room.</p>
    </div>
    <div class="reveal reveal--right">
      <div class="aside-card">
        <h3>Trades we hire</h3>
        <p class="muted">When crews have room</p>
        {checklist(trades)}
      </div>
      <div class="aside-card aside-card--yellow">
        <h3>No portal. Just call.</h3>
        <p>Call the office at <a href="tel:{PHONE_TEL}"><strong>{PHONE}</strong></a> and tell us your trade, your experience and when you can start. Rather write it down? Use the <a href="contact.html#quote"><strong>contact form</strong></a> and put &ldquo;careers&rdquo; in the message.</p>
      </div>
    </div>
  </div>
</section>

<section class="section section--gray section--tight">
  <div class="container mx prose reveal">
    <span class="eyebrow">Equal opportunity</span>
    <h2>Everyone gets the same shot.</h2>
    <p>Max Paving is an equal opportunity employer. Employment decisions are based on qualifications, experience and work ethic, and on nothing else. We do not discriminate on the basis of race, color, religion, sex (including pregnancy, sexual orientation and gender identity), national origin, age, disability, veteran status, genetic information, or any other status protected by federal, state or local law.</p>
    <p>That policy covers every part of the job: hiring, pay, assignments, training, advancement, and how people are treated on our crews. If you need an accommodation to apply or to do the work, tell us when you call and we&rsquo;ll work it out.</p>
  </div>
</section>
""" + cta_band("Know a good operator or finisher?", f"Have them call {PHONE}. We always want to hear from good people.")
page("careers.html", "Careers | Crew Jobs at Max Paving Kansas City",
     "Equipment operators, concrete finishers, asphalt laborers and CDL drivers. Family-owned Kansas City contractor with in-house crews and work you can point at.",
     "careers.html", careers, [("About", "about.html"), ("Careers", "careers.html")], priority="0.4")

# ---------------------------------------------------------------- LOCATIONS
def loc_list(state):
    return "".join(f'<li><a href="{l["file"]}">{e(l["place"])}</a></li>' if "file" in l else f"<li>{e(l['place'])}</li>" for l in LOCATIONS if l["state"] == state)

locations = page_hero("Service Locations", ["Locations"], "Where we work in the KC metro") + f"""
<section class="section">
  <div class="container split" style="align-items:start">
    <div class="reveal reveal--left">
      <span class="eyebrow">Service area overview</span>
      <h2>100-mile radius from Grain Valley, MO</h2>
      <p>From our headquarters at {ADDRESS[0]}, {ADDRESS[1]}, MO we work across the full Kansas City metropolitan area, on both sides of the state line. If you&rsquo;re not sure whether we reach your project, just call. Chances are we do.</p>
      <div class="map" style="margin-top:28px"><iframe src="{MAP_EMBED}" title="Max Paving on Google Maps" loading="lazy" allowfullscreen referrerpolicy="no-referrer-when-downgrade"></iframe></div>
    </div>
    <div class="loc-cols reveal reveal--right">
      <div><h3>Missouri side</h3><ul class="link-list">{loc_list('MO')}</ul></div>
      <div><h3>Kansas side</h3><ul class="link-list">{loc_list('KS')}</ul></div>
    </div>
  </div>
</section>

<section class="section section--gray section--tight">
  <div class="container center reveal">
    <span class="eyebrow">And everywhere in between</span>
    <h2>We also work in</h2>
    <ul class="areas__list areas__list--center">{''.join(f'<li>{a}</li>' for a in MORE_AREAS)}</ul>
    <p style="margin-top:24px">If your town isn&rsquo;t listed, <a class="link-under" href="tel:{PHONE_TEL}">call {PHONE}</a>. We probably cover it.</p>
  </div>
</section>
""" + quote_section("locations.html")
page("locations.html", "Service Locations | Max Paving | Kansas City Metro, MO & KS",
     "Max Paving serves the full Kansas City metropolitan area, Missouri and Kansas sides, within a 100-mile radius of Grain Valley, MO. Find your city.",
     "locations.html", locations, [("Locations", "locations.html")], priority="0.8")

for l in LOCATIONS:
    if "file" not in l:
        continue
    city = e(l["city"])
    popular = "".join(f'<li><a href="{s["file"]}">{e(s["name"])}</a></li>' for s in SUBSERVICES if "file" in s)
    paras = "".join(f"<p>{e(p)}</p>" for p in l["paras"])
    faqs = [tuple(f) for f in l["faqs"]]
    spot = ""
    sp = l.get("spotlight")
    if sp:
        svc = SUB_BY_SLUG[sp["service"]]
        faqs += [tuple(f) for f in sp["faqs"]]
        spot = f"""
<section class="section" id="spotlight">
  <div class="container split" style="align-items:start">
    <div class="prose reveal reveal--left">
      <span class="eyebrow">Local spotlight</span>
      <h2>{e(sp['title'])}</h2>
      {''.join(f'<p>{e(p)}</p>' for p in sp['paras'])}
      <a class="btn btn--black" href="{svc['file']}">More on {e(svc['name']).lower()} {ICON['arrow']}</a>
    </div>
    <div class="media media--tall media--accent reveal reveal--right">{picture(svc['img'], PROJECT_ALT[svc['img']], "(max-width: 860px) 100vw, 560px")}</div>
  </div>
</section>"""
    nearby = "".join(f'<li><a href="{o["file"]}">{e(o["place"])}</a></li>' for o in LOCATIONS if "file" in o and o is not l and o["state"] == l["state"])
    content = page_hero(f"Concrete &amp; Asphalt in {e(l['place'])}", ['<a href="locations.html">Locations</a>', e(l["place"])],
                        f"Serving {e(l['place'])} from Grain Valley, MO") + f"""
<section class="section">
  <div class="container">
    <div class="center mx reveal">
      <span class="eyebrow">What we do in {city}</span>
      <h2>Concrete &amp; asphalt services for {city} properties</h2>
      <p class="lead">Whether you&rsquo;re a homeowner needing a new driveway, a property manager handling a parking lot, or a GC coordinating a commercial build, we handle every phase in-house, from excavation through finished surface.</p>
    </div>
    <div class="grid-3" style="margin-top:44px">{category_cards()}
    </div>
    <ul class="areas__list areas__list--center" style="margin-top:32px">{popular}</ul>
  </div>
</section>

<section class="section section--gray">
  <div class="container split split--top">
    <div class="prose reveal reveal--left">
      <span class="eyebrow">About our work in {city}</span>
      <h2>Local knowledge. KC metro standards.</h2>
      {paras}
    </div>
    <div class="sticky-col reveal reveal--right">
      <div class="aside-card">
        <h3>{e(l['place'])}</h3>
        <p class="muted">Service coverage</p>
        {checklist(l['coverage'])}
        <div class="btn-row"><a class="btn btn--yellow btn--sm" href="#quote">Free proposal {ICON['arrow']}</a><a class="btn btn--line btn--sm" href="tel:{PHONE_TEL}">{PHONE}</a></div>
      </div>
    </div>
  </div>
</section>
{spot}
""" + faq_section(faqs, f"Paving in {city}: FAQs", "Common questions", gray=bool(sp)) + f"""
<section class="section section--tight">
  <div class="container center">
    <span class="eyebrow">Nearby areas</span>
    <ul class="inline-links center-links">{nearby}<li><a href="locations.html">All locations</a></li></ul>
  </div>
</section>
""" + quote_section(l["file"], f"Free proposal for your {city} project", "Callbacks the same or next business day. In-house crews. Free, detailed proposals.")
    extra = [service_schema("Concrete and asphalt paving", l["file"], l["desc"], l["place"]), faq_schema(faqs)]
    page(l["file"], l["title"], l["desc"], l["file"], content, [("Locations", "locations.html"), (l["place"], l["file"])], extra=extra, priority="0.7")

# ---------------------------------------------------------------- CONTACT
est = " &amp; ".join(f'<a href="mailto:{m}">{m}</a>' for _, m in ESTIMATORS)
contact = page_hero("Contact Us", ["Contact"], "Request a free proposal") + f"""
<section class="section" id="quote">
  <div class="container contact-grid">
    <div class="reveal">
      <span class="eyebrow">Get in touch</span>
      <h2>Talk directly with the estimators</h2>
      <p class="lead">Tell us about your project. Wendell, our lead estimator, or Daniel returns every call the same or next business day.</p>
      <ul class="info-list">
        <li><span class="ico">{ICON['phone']}</span><div><small>Phone</small><a href="tel:{PHONE_TEL}">{PHONE}</a></div></li>
        <li><span class="ico">{ICON['mail']}</span><div><small>Email</small>{est}</div></li>
        <li><span class="ico">{ICON['pin']}</span><div><small>Office</small><a href="{MAPS}" target="_blank" rel="noopener">{ADDRESS[0]}<br>{ADDRESS[1]}, {ADDRESS[2]} {ADDRESS[3]}</a></div></li>
        <li><span class="ico">{ICON['clock']}</span><div><small>Hours</small><table class="hours"><tr><td>Monday &ndash; Friday</td><td>8:00 AM &ndash; 5:00 PM</td></tr><tr><td>Saturday</td><td>By appointment</td></tr><tr><td>Sunday</td><td>Closed</td></tr></table></div></li>
      </ul>
      <div class="map"><iframe src="{MAP_EMBED}" title="Max Paving on Google Maps" loading="lazy" allowfullscreen referrerpolicy="no-referrer-when-downgrade"></iframe></div>
    </div>
    <div class="reveal">{quote_form("contact.html", plain=True)}</div>
  </div>
</section>
""" + reviews_section() + areas_section()
page("contact.html", "Contact Max Paving | Free Paving Proposals | (816) 220-7777",
     "Get a free proposal for concrete or asphalt work in the Kansas City metro. Call (816) 220-7777 or use the form. Calls returned the same or next business day.",
     "contact.html", contact, [("Contact", "contact.html")], priority="0.8")

# ---------------------------------------------------------------- PRIVACY
privacy = page_hero("Privacy Policy", ["Privacy Policy"], "What we collect, and what we do with it") + f"""
<section class="section">
  <div class="container legal prose">
    <p class="muted">Last updated: October 30, 2026</p>
    <p>This policy explains how Max Paving (&ldquo;we,&rdquo; &ldquo;us&rdquo;) handles information collected through this website. We&rsquo;re a concrete and asphalt contractor, not a data company: we collect what we need to respond to you and prepare a proposal, and we don&rsquo;t sell it.</p>
    <h2>What we collect</h2>
    <p><strong>Information you give us.</strong> When you submit the quote request form, we receive what you enter: your name and phone number and, if you provide them, your email address, company, project address, the service and property type you select, your timeline and your project details. We also record which page of the site the request came from.</p>
    <p><strong>Information collected automatically.</strong> Like most websites, our hosting provider records standard technical information when you visit, such as your IP address, browser type and the pages requested.</p>
    <h2>How we use it</h2>
    <ul>
      <li>To contact you about your request, schedule a site visit and prepare a proposal</li>
      <li>To carry out and follow up on work you hire us for</li>
      <li>To understand which pages lead people to contact us, so we can improve them</li>
      <li>To keep business records and meet legal obligations</li>
    </ul>
    <p>We do not sell, rent or trade your personal information, and we don&rsquo;t add you to a marketing list because you asked for a quote.</p>
    <h2>Who else handles it</h2>
    <p>We share information only with service providers that help us run the site and the business, and only as needed for that purpose: our website host; FormSubmit, which delivers quote form submissions to our email inbox; our business email provider; and Google, which supplies the reviews linked from this site and the map on our contact page under its own privacy policy. We may also disclose information if required by law, or to protect our rights or the safety of others.</p>
    <h2>How long we keep it</h2>
    <p>We keep quote requests and project records for as long as we need them to respond to you, complete and support our work, and keep normal business and tax records. When we no longer need information, we delete it.</p>
    <h2>Your choices</h2>
    <p>You can ask us what information we have about you, ask us to correct it, or ask us to delete it, subject to records we&rsquo;re required to keep. If you&rsquo;d rather we didn&rsquo;t contact you again about a request, tell us and we&rsquo;ll stop.</p>
    <h2>Security</h2>
    <p>This site is served over an encrypted (HTTPS) connection, and we limit access to submitted information to the people who need it. No method of transmission or storage is completely secure, but we take reasonable steps to protect what you share with us.</p>
    <h2>Children</h2>
    <p>This site is intended for adults arranging construction work. We don&rsquo;t knowingly collect information from children under 13.</p>
    <h2>Contact us</h2>
    <p>Max Paving<br>{ADDRESS[0]}<br>{ADDRESS[1]}, {ADDRESS[2]} {ADDRESS[3]}<br>Phone: <a href="tel:{PHONE_TEL}">{PHONE}</a><br>Email: {est}</p>
  </div>
</section>
"""
page("privacy-policy.html", "Privacy Policy | Max Paving", "What Max Paving collects when you contact us through this site, and what we do with it.",
     "privacy-policy.html", privacy, [("Privacy Policy", "privacy-policy.html")], priority="0.2")

# ---------------------------------------------------------------- 404
page("404.html", "Page not found | Max Paving", "The page you were looking for could not be found.", "", page_hero("Page not found", ["404"], "That page has moved or never existed.") + f"""
<section class="section center">
  <div class="container mx">
    <p class="lead">Try the home page, browse <a class="link-under" href="services.html">our services</a>, or reach us directly at <a href="tel:{PHONE_TEL}">{PHONE}</a>.</p>
    <a class="btn btn--yellow" href="index.html">Back to Home {ICON['arrow']}</a>
  </div>
</section>
""")

with open(os.path.join(OUT, "robots.txt"), "w") as f:
    f.write("User-agent: *\nAllow: /\nSitemap: " + SITE + "sitemap.xml\n")
import datetime
today = datetime.date.today().isoformat()
with open(os.path.join(OUT, "sitemap.xml"), "w") as f:
    f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
    for pg, pr in SITEMAP:
        loc = "" if pg == "index.html" else pg
        f.write(f"  <url><loc>{SITE}{loc}</loc><lastmod>{today}</lastmod><changefreq>monthly</changefreq><priority>{pr}</priority></url>\n")
    f.write("</urlset>\n")
print("built", len(SITEMAP), "pages")
