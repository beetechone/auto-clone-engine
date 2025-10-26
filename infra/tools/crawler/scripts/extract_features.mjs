import fs from 'fs';
const siteMapPath = process.argv[2] || 'infra/context/site_map.json';
const siteMap = JSON.parse(fs.readFileSync(siteMapPath, 'utf-8'));
const backlog = [
  { id: 'F-QR-001', title: 'Create URL QR', phase: 1, acceptance: 'Given URL, when generate, then PNG/SVG produced' }
];
process.stdout.write(JSON.stringify(backlog, null, 2));
