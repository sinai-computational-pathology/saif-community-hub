import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {audit} from './audit_public_release.mjs';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
audit(path.join(root,'_site'));
// The three categories the site links to must NOT carry a discussion form template:
// GitHub renders the form and drops the title/body query parameters, which would strip
// the combination, hypothesis id and PHI warning the site fills in for the contributor.
for(const category of ['ideas','q-a','show-and-tell']) assert(!fs.existsSync(path.join(root,`.github/DISCUSSION_TEMPLATE/${category}.yml`)),`${category} must stay template-free so prefill works`);
const site=fs.readFileSync(path.join(root,'site/app.js'),'utf8');
for(const text of ['Contribution type:','Combination:','Reference (optional','Do not post PHI']) assert(site.includes(text),`prefilled body must carry: ${text}`);
const source=fs.readFileSync(path.join(root,'site/app.js'),'utf8');
for(const text of ['#/signals','claim','No literature-linked hypothesis has been reviewed','Community submissions are separate']) assert(source.includes(text),text);
console.log('Route, empty-state and contribution contracts passed.');
