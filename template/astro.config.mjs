import { defineConfig } from 'astro/config';

// BUSINESS_DATA (absolute path to a business.json) and OUT_DIR are set by
// scripts/generate-site.mjs; defaults keep `npm run dev` working on the
// reference data in src/data/business.json.
export default defineConfig({
  outDir: process.env.OUT_DIR || './dist',
});
