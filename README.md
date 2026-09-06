# Site Dude

Automated premade-website pipeline: Outscraper pull → `leads/leads.json` → one demo site per lead → Cloudflare Pages at `businessname.sitedude.com`.

## Layout

- `leads/` — lead batches. `leads.json` is the pipeline trigger; committing a change to it kicks off site generation.
- `template/` — the Astro site template. All business details render from a single JSON data file.
- `sites/` — generated per-lead output (`sites/<slug>/business.json` + built `dist/` is created at build time, not committed).
- `scripts/` — processing scripts (CSV → leads, lead → site).
- `.github/workflows/generate-sites.yml` — builds + deploys a site for every lead whose `demo_url` is null, then writes the live URL back into `leads.json`.

## Scripts

Convert a raw Outscraper CSV into leads:

```
node scripts/convert-outscraper.mjs <input.csv> [-o leads/leads.json]
```

Rules applied: dedupe by `place_id` (emails merged across duplicate contact rows), keep only no-website businesses (empty website field, or Facebook/Yelp-only), keep only emails validated RECEIVING / Verified / SMTP validated (otherwise `email: null` + a `fallback_channel`), drop non-businesses and national franchises. Merges into an existing `leads.json` without clobbering `demo_url`.

Generate a site for one lead (or all pending):

```
node scripts/generate-site.mjs --lead <place_id-or-slug>
node scripts/generate-site.mjs --all          # every lead with demo_url == null
node scripts/generate-site.mjs --data <file>  # one-off from a standalone business.json
```

Output lands in `sites/<slug>/dist/`, ready for Pages.

## Deploy secrets (GitHub Actions)

`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` — the workflow skips deployment until these exist.
