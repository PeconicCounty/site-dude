#!/usr/bin/env node
// Generate demo site(s) from leads/leads.json using the Astro template.
//
//   node scripts/generate-site.mjs --lead <place_id-or-slug>
//   node scripts/generate-site.mjs --all            # every lead with demo_url == null
//   node scripts/generate-site.mjs --data <file>    # one-off from a standalone business.json
//
// Writes sites/<slug>/business.json and builds to sites/<slug>/dist.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tradeFor } from './lib/trades.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE = path.join(ROOT, 'template');
const SITES = path.join(ROOT, 'sites');

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function formatPhone(raw) {
  const digits = (raw || '').replace(/\D/g, '').replace(/^1/, '');
  if (digits.length !== 10) return { display: raw || '', e164: raw || '' };
  return {
    display: `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`,
    e164: `+1${digits}`,
  };
}

function prettyTime(t) {
  // "9AM-5PM" -> "9 AM – 5 PM"; leaves "Closed"/"Open 24 hours" alone
  return t.replace(/(\d)(AM|PM)/gi, '$1 $2').replace(/-/, ' – ');
}

function to24h(t) {
  const m = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10) % 12;
  if (m[3].toUpperCase() === 'PM') h += 12;
  return `${String(h).padStart(2, '0')}:${m[2] || '00'}`;
}

function buildHours(hoursDict) {
  if (!hoursDict) return { rows: [], spec: [] };
  const days = DAY_ORDER.filter((d) => d in hoursDict).map((d) => ({
    day: d,
    value: Array.isArray(hoursDict[d]) ? hoursDict[d].join(', ') : String(hoursDict[d]),
  }));

  // collapse consecutive days with identical hours into "Monday – Friday" rows
  const rows = [];
  for (const d of days) {
    const last = rows[rows.length - 1];
    if (last && last.value === d.value) {
      last.to = d.day;
    } else {
      rows.push({ from: d.day, to: d.day, value: d.value });
    }
  }
  const displayRows = rows.map((r) => ({
    days: r.from === r.to ? r.from : `${r.from} – ${r.to}`,
    time: prettyTime(r.value),
  }));

  const spec = [];
  for (const r of rows) {
    if (/closed/i.test(r.value)) continue;
    const startIdx = DAY_ORDER.indexOf(r.from);
    const endIdx = DAY_ORDER.indexOf(r.to);
    const dayOfWeek = DAY_ORDER.slice(startIdx, endIdx + 1);
    if (/open 24 hours/i.test(r.value)) {
      spec.push({ dayOfWeek, opens: '00:00', closes: '23:59' });
      continue;
    }
    const m = r.value.match(/^(.+?)-(.+)$/);
    if (!m) continue;
    const opens = to24h(m[1].trim());
    const closes = to24h(m[2].trim());
    if (opens && closes) spec.push({ dayOfWeek, opens, closes });
  }
  return { rows: displayRows, spec };
}

export function businessFromLead(lead) {
  const trade = tradeFor(lead.category);
  const phone = formatPhone(lead.phone);
  const hours = buildHours(lead.hours);
  const words = (lead.name || '').toUpperCase().split(/\s+/);
  const areas = lead.areas && lead.areas.length ? lead.areas : [lead.city].filter(Boolean);
  return {
    name: lead.name,
    logo_main: words.slice(0, -1).join(' '),
    logo_accent: words[words.length - 1],
    phone_display: phone.display,
    phone_e164: phone.e164,
    street: lead.street,
    city: lead.city,
    state: lead.state || 'NY',
    zip: lead.zip,
    lat: lead.lat,
    lng: lead.lng,
    rating: lead.rating,
    review_count: lead.review_count,
    five_star_count: lead.five_star_count,
    google_url: lead.google_url || null,
    trade_noun: trade.trade_noun,
    trade_work: trade.trade_work,
    schema_type: trade.schema_type,
    accent: trade.accent,
    region: lead.region || (lead.county ? `${lead.county.replace(/ county$/i, '')} County` : `the ${lead.city} area`),
    hours: hours.rows,
    hours_spec: hours.spec,
    areas,
    services: lead.services_resolved || trade.services,
    stripe_url: lead.stripe_url || '#',
  };
}

function buildSite(slug, business) {
  const siteDir = path.join(SITES, slug);
  fs.mkdirSync(siteDir, { recursive: true });
  const dataPath = path.join(siteDir, 'business.json');
  fs.writeFileSync(dataPath, JSON.stringify(business, null, 2) + '\n');
  execFileSync('npm', ['run', 'build', '--silent'], {
    cwd: TEMPLATE,
    stdio: 'inherit',
    env: { ...process.env, BUSINESS_DATA: dataPath, OUT_DIR: path.join(siteDir, 'dist') },
  });
  console.log(`built sites/${slug}/dist`);
  return siteDir;
}

function loadLeads(leadsPath) {
  return JSON.parse(fs.readFileSync(leadsPath, 'utf8'));
}

const args = process.argv.slice(2);
function opt(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}

const leadsPath = opt('--leads') || path.join(ROOT, 'leads', 'leads.json');

if (opt('--data')) {
  const dataFile = path.resolve(opt('--data'));
  const business = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  const slug = opt('--slug') || business.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  buildSite(slug, business);
} else if (args.includes('--all')) {
  const leads = loadLeads(leadsPath);
  const pending = leads.filter((l) => !l.demo_url);
  if (!pending.length) {
    console.log('no pending leads (all have demo_url)');
    process.exit(0);
  }
  for (const lead of pending) buildSite(lead.slug, businessFromLead(lead));
} else if (opt('--lead')) {
  const key = opt('--lead');
  const leads = loadLeads(leadsPath);
  const lead = leads.find((l) => l.place_id === key || l.slug === key);
  if (!lead) {
    console.error(`lead not found: ${key}`);
    process.exit(1);
  }
  buildSite(lead.slug, businessFromLead(lead));
} else {
  console.error('usage: generate-site.mjs --lead <place_id|slug> | --all | --data <business.json> [--slug <slug>]');
  process.exit(1);
}
