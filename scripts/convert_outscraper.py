#!/usr/bin/env python3
"""Convert a raw Outscraper pull (.xlsx or .csv) into leads/leads.json.

Rules (see README):
- dedupe by place_id (Outscraper emits one row per enriched contact)
- keep only businesses with no real website (empty, or Facebook/Yelp-only)
- keep only emails validated RECEIVING / Verified / SMTP validated;
  otherwise email=null + fallback_channel
- drop non-businesses and national franchises
- merge into existing leads.json without clobbering demo_url/slug

Usage: python3 scripts/convert_outscraper.py <input.(xlsx|csv)> [-o leads/leads.json]
"""
import argparse
import csv
import json
import re
import sys
from pathlib import Path

GOOD_EMAIL_STATUSES = ("receiving", "verified", "smtp validated", "smtp_validated")

SOCIAL_ONLY = ("facebook.com", "m.facebook.com", "fb.com", "yelp.com")

# name substrings that mark national chains/franchises (corporate sites exist)
FRANCHISES = (
    "mister sparky", "mr. electric", "mr electric", "mr. rooter", "roto-rooter",
    "benjamin franklin plumbing", "intoxalock", "united rentals", "p.c. richard",
    "pc richard", "servpro", "home depot", "lowe's", "best buy", "sears",
    "one hour heating", "aire serv", "safelite", "smart start", "draeger",
)

# category/type keywords that mark non-businesses
NONBIZ = (
    "substation", "labor union", "union", "government", "municipal", "city hall",
    "association", "school", "church", "utility company", "electric utility",
    "power station", "post office", "library",
)


def read_rows(path: Path):
    if path.suffix.lower() in (".xlsx", ".xls"):
        import openpyxl
        wb = openpyxl.load_workbook(path, read_only=True)
        ws = wb.active
        rows = list(ws.iter_rows(values_only=True))
        hdr = [str(h) if h is not None else "" for h in rows[0]]
        return [dict(zip(hdr, r)) for r in rows[1:]]
    with open(path, newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def s(v):
    """Normalize a cell to a stripped string ('' for None)."""
    return str(v).strip() if v is not None and str(v).strip().lower() != "none" else ""


def num(v):
    try:
        return float(v) if v is not None and str(v).strip() != "" else None
    except (TypeError, ValueError):
        return None


def slugify(name):
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return re.sub(r"-{2,}", "-", slug)


def classify_website(url):
    """Returns (is_prospect, facebook_url_or_None)."""
    if not url:
        return True, None
    low = url.lower()
    if any(d in low for d in SOCIAL_ONLY):
        fb = url if "facebook" in low or "fb.com" in low else None
        return True, fb
    return False, None


def is_junk(name, category, type_):
    low_name = name.lower()
    if any(f in low_name for f in FRANCHISES):
        return "national franchise"
    cats = f"{category} {type_}".lower()
    if any(k in cats for k in NONBIZ):
        return f"non-business ({category or type_})"
    return None


def good_email(email, status):
    if not email or "@" not in email:
        return False
    return any(g in status.lower() for g in GOOD_EMAIL_STATUSES)


def convert(rows, existing):
    by_pid = {}
    order = []
    for r in rows:
        pid = s(r.get("place_id"))
        if not pid:
            continue
        if pid not in by_pid:
            by_pid[pid] = []
            order.append(pid)
        by_pid[pid].append(r)

    prior = {l["place_id"]: l for l in existing}
    leads, dropped = [], []

    for pid in order:
        group = by_pid[pid]
        r = group[0]
        name = s(r.get("name"))
        category = s(r.get("category")) or s(r.get("type"))

        if s(r.get("business_status")) and s(r.get("business_status")) != "OPERATIONAL":
            dropped.append((name, f"status {s(r.get('business_status'))}"))
            continue

        junk = is_junk(name, s(r.get("category")), s(r.get("type")))
        if junk:
            dropped.append((name, junk))
            continue

        website = s(r.get("website"))
        is_prospect, fb_from_site = classify_website(website)
        if not is_prospect:
            dropped.append((name, "has website"))
            continue

        # pick the first validated email across the contact rows
        email = None
        for row in group:
            e, st = s(row.get("email")), s(row.get("email.emails_validator.status"))
            if good_email(e, st):
                email = e.lower()
                break

        facebook = fb_from_site or s(r.get("contact_facebook")) or s(r.get("company_facebook")) or None
        booking = s(r.get("booking_appointment_link")) or None
        fallback = None
        if not email:
            fallback = "facebook" if facebook else ("booking" if booking else "phone")

        rating = num(r.get("rating"))
        reviews = num(r.get("reviews"))
        reviews = int(reviews) if reviews is not None else None
        five_star = num(r.get("reviews_per_score_5"))
        five_star = int(five_star) if five_star is not None else None

        grade = "A" if (rating or 0) >= 4.5 and (reviews or 0) >= 10 else "B"

        hours = None
        wh = s(r.get("working_hours"))
        if wh:
            try:
                hours = json.loads(wh)
            except json.JSONDecodeError:
                pass

        old = prior.get(pid, {})
        lead = {
            "place_id": pid,
            "slug": old.get("slug") or slugify(name),
            "name": name,
            "category": category,
            "subtypes": s(r.get("subtypes")) or None,
            "phone": s(r.get("phone")) or None,
            "email": email,
            "fallback_channel": fallback,
            "facebook": facebook,
            "booking_link": booking,
            "street": s(r.get("street")) or None,
            "city": s(r.get("city")) or None,
            "county": s(r.get("county")) or None,
            "state": s(r.get("state_code")) or s(r.get("state")) or None,
            "zip": s(r.get("postal_code")) or None,
            "lat": num(r.get("latitude")),
            "lng": num(r.get("longitude")),
            "rating": rating,
            "review_count": reviews,
            "five_star_count": five_star,
            "hours": hours,
            "photo": s(r.get("photo")) or None,
            "photos_count": int(num(r.get("photos_count")) or 0),
            "google_url": s(r.get("location_link")) or None,
            "reviews_link": s(r.get("reviews_link")) or None,
            "website_field": website or None,
            "grade": grade,
            "demo_url": old.get("demo_url"),
        }
        # preserve manual enrichments from a previous run
        for k in ("areas", "region", "stripe_url", "services_resolved"):
            if old.get(k) is not None:
                lead[k] = old[k]
        leads.append(lead)

    # resolve slug collisions deterministically
    seen = {}
    for lead in leads:
        base = lead["slug"]
        if base in seen:
            seen[base] += 1
            lead["slug"] = f"{base}-{seen[base]}"
        else:
            seen[base] = 1

    return leads, dropped


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("-o", "--out", default="leads/leads.json")
    args = ap.parse_args()

    rows = read_rows(Path(args.input))
    out = Path(args.out)
    existing = json.loads(out.read_text()) if out.exists() else []

    leads, dropped = convert(rows, existing)

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(leads, indent=2) + "\n")

    with_email = [l for l in leads if l["email"]]
    a_list = [l for l in leads if l["grade"] == "A"]
    print(f"rows in: {len(rows)}  ->  unique businesses: {len(rows) and len({s(r.get('place_id')) for r in rows if s(r.get('place_id'))})}")
    print(f"kept as leads: {len(leads)}  (A-list: {len(a_list)}, B-list: {len(leads) - len(a_list)})")
    print(f"with validated email: {len(with_email)}  |  no email (fallback channel): {len(leads) - len(with_email)}")
    print(f"dropped: {len(dropped)}")
    for name, why in dropped:
        print(f"  - {name}: {why}")
    print(f"\nwrote {out}")


if __name__ == "__main__":
    sys.exit(main())
