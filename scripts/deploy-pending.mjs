#!/usr/bin/env node
// Deploy every built-but-undeployed lead site to Cloudflare Pages and write
// the live demo URL back into leads/leads.json.
//
// Env: CLOUDFLARE_API_TOKEN (Pages:Edit), CLOUDFLARE_ACCOUNT_ID, and
// optionally DEMO_DOMAIN (e.g. "sitedude.com"). Without DEMO_DOMAIN the demo
// URL is the project's pages.dev address; with it, <slug>.DEMO_DOMAIN is
// attached to the project and used instead (the zone must be in the same
// Cloudflare account — Pages then manages the DNS record itself).
//
// Runs in CI, but works locally too if the env vars are exported.

import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const { CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, DEMO_DOMAIN } = process.env;
if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ACCOUNT_ID) {
  console.error('CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required');
  process.exit(1);
}

const API = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects`;
const headers = { Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`, 'Content-Type': 'application/json' };

async function cf(method, path, body) {
  const res = await fetch(`${API}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return res.json();
}

function wrangler(args) {
  execFileSync('npx', ['--yes', 'wrangler', ...args], { stdio: 'inherit' });
}

const leads = JSON.parse(fs.readFileSync('leads/leads.json', 'utf8'));
let failures = 0;

for (const lead of leads) {
  const project = `sd-${lead.slug}`.slice(0, 58).replace(/-+$/, '');

  // a site deployed to pages.dev before DEMO_DOMAIN existed gets its custom
  // domain attached (and its demo_url upgraded) once the secret is set
  if (lead.demo_url && DEMO_DOMAIN && lead.demo_url.endsWith('.pages.dev')) {
    const domain = `${lead.slug}.${DEMO_DOMAIN}`;
    const res = await cf('POST', `/${project}/domains`, { name: domain });
    if (res.success || (res.errors || []).some((e) => /already|exists/i.test(e.message))) {
      lead.demo_url = `https://${domain}`;
      console.log(`upgraded ${lead.name} -> ${lead.demo_url}`);
    } else {
      console.error(`domain attach failed for ${domain}: ${JSON.stringify(res.errors)}`);
    }
    continue;
  }
  if (lead.demo_url) continue;
  const dist = `sites/${lead.slug}/dist`;
  if (!fs.existsSync(`${dist}/index.html`)) {
    console.error(`skip ${lead.slug}: ${dist} not built`);
    failures++;
    continue;
  }
  try {
    const existing = await cf('GET', `/${project}`);
    if (!existing.success) {
      wrangler(['pages', 'project', 'create', project, '--production-branch', 'main']);
    }
    wrangler(['pages', 'deploy', dist, '--project-name', project, '--branch', 'main', '--commit-dirty=true']);

    if (DEMO_DOMAIN) {
      const domain = `${lead.slug}.${DEMO_DOMAIN}`;
      const res = await cf('POST', `/${project}/domains`, { name: domain });
      if (res.success || (res.errors || []).some((e) => /already|exists/i.test(e.message))) {
        lead.demo_url = `https://${domain}`;
      } else {
        console.error(`domain attach failed for ${domain}: ${JSON.stringify(res.errors)}`);
        lead.demo_url = `https://${project}.pages.dev`;
      }
    } else {
      lead.demo_url = `https://${project}.pages.dev`;
    }
    console.log(`deployed ${lead.name} -> ${lead.demo_url}`);
  } catch (err) {
    console.error(`deploy failed for ${lead.slug}: ${err.message}`);
    failures++;
  }
}

fs.writeFileSync('leads/leads.json', JSON.stringify(leads, null, 2) + '\n');
if (failures) {
  console.error(`${failures} deploy(s) failed`);
  process.exit(1);
}
