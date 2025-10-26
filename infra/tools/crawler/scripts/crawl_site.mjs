import fs from 'fs'; import yaml from 'js-yaml';
const target = yaml.load(fs.readFileSync('infra/context/target_site.yaml', 'utf-8'));
const siteMap = { target: target.target_url, pages: [] };
fs.mkdirSync('infra/context', { recursive: true });
fs.writeFileSync('infra/context/site_map.json', JSON.stringify(siteMap, null, 2));
fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync('docs/01_feature_map.md', '# Feature Map\n\n- Placeholder features');
console.log('Crawl placeholder complete.');
