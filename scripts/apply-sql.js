#!/usr/bin/env node
// Apply a SQL file to Supabase via the Management API
// Usage: SUPABASE_PAT=sbp_... node scripts/apply-sql.js <sql-file> [<sql-file> ...]

const fs = require('fs');
const path = require('path');
const https = require('https');

const PAT = process.env.SUPABASE_PAT;
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'jzrsnfpgydiaoeiijypm';

if (!PAT) { console.error('SUPABASE_PAT env required'); process.exit(1); }
const files = process.argv.slice(2);
if (!files.length) { console.error('Usage: node apply-sql.js <file.sql> ...'); process.exit(1); }

function query(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const req = https.request({
      method: 'POST',
      host: 'api.supabase.com',
      path: `/v1/projects/${PROJECT_REF}/database/query`,
      headers: {
        'Authorization': `Bearer ${PAT}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  for (const f of files) {
    const full = path.resolve(f);
    const sql = fs.readFileSync(full, 'utf8');
    console.log(`\n▶ Applying ${f}  (${sql.length} bytes)`);
    const { status, body } = await query(sql);
    if (status >= 200 && status < 300) {
      console.log(`  ✅ ${status} OK`);
      if (body && body !== '[]' && body.length < 500) console.log(`  ${body}`);
    } else {
      console.error(`  ❌ ${status}: ${body.slice(0, 800)}`);
      process.exit(1);
    }
  }
  console.log('\n▶ Verifying tables + row counts');
  const verify = `SELECT
    (SELECT count(*) FROM taksha_modules) AS modules,
    (SELECT count(*) FROM taksha_sections) AS sections,
    (SELECT count(*) FROM taksha_content) AS content_rows,
    (SELECT count(*) FROM taksha_videos) AS videos;`;
  const { body } = await query(verify);
  console.log(`  ${body}`);
})().catch((e) => { console.error(e); process.exit(1); });
