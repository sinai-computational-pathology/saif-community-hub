import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {audit} from './audit_public_release.mjs';
const yaml=createRequire(import.meta.url)('js-yaml');
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
audit(path.join(root,'_site'));
// Each linked category carries a four-field form. GitHub cannot prefill a dropdown from
// the URL, so the contribution type is preselected per category via `default`, and only
// the free-text contribution is genuinely required of the contributor.
const TYPE_INDEX={ideas:0,'show-and-tell':1,'q-a':2};
for(const [category,index] of Object.entries(TYPE_INDEX)){
 const file=path.join(root,`.github/DISCUSSION_TEMPLATE/${category}.yml`);
 assert(fs.existsSync(file),`${category}.yml missing`);
 const form=yaml.load(fs.readFileSync(file,'utf8'));
 const ids=form.body.filter(b=>b.id).map(b=>b.id);
 assert.deepEqual(ids,['hypothesis','contribution_type','reference','contribution'],`${category}: unexpected fields`);
 const dropdown=form.body.find(b=>b.type==='dropdown');
 assert.equal(dropdown.attributes.default,index,`${category}: contribution type must be preselected`);
 assert.equal(dropdown.attributes.options.length,3,`${category}: three contribution types`);
 const required=form.body.filter(b=>b.validations&&b.validations.required).map(b=>b.id);
 for(const optional of ['hypothesis','reference']) assert(!required.includes(optional),`${category}: ${optional} must stay optional`);
 assert(required.includes('contribution'),`${category}: contribution must be required`);
 assert(form.body.some(b=>b.type==='markdown'&&/Do not post PHI/.test(b.attributes.value)),`${category}: PHI warning missing`);
}
const site=fs.readFileSync(path.join(root,'site/app.js'),'utf8');
for(const text of ["params.set('hypothesis'",'TYPE_TAG']) assert(site.includes(text),`link builder must carry: ${text}`);
const source=fs.readFileSync(path.join(root,'site/app.js'),'utf8');
for(const text of ['#/signals','claim','No literature-linked hypothesis has been reviewed','Community submissions are separate']) assert(source.includes(text),text);
console.log('Route, empty-state and contribution contracts passed.');
