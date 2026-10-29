import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export function audit(site) {
 const files=fs.readdirSync(site).filter(f=>!['.git','.github'].includes(f)).sort();
 const allowed=new Set(['app.js','organ-icons.js','global-overview.js','index.html','styles.css','favicon.svg','results_bundle.js','claims_bundle.js','release_manifest.json','README.md','.nojekyll']);
 const forbidden=/github\.mountsinai\.org|\/Users\/|Dropbox|\/sc\/|accession_no|patient_id|case_id|specimen_id|slide_id|report_text|source_path|file_path|supabase|api[_-]?key/i;
 for(const f of files){assert(allowed.has(f),`Unexpected public file: ${f}`);assert(!forbidden.test(fs.readFileSync(path.join(site,f),'utf8')),`Private content: ${f}`);}
 const sandbox={window:{}};
 vm.runInNewContext(fs.readFileSync(path.join(site,'results_bundle.js'),'utf8'),sandbox);
 const b=JSON.parse(JSON.stringify(sandbox.window.SAIF_RESULTS));
 assert.equal(b.combos.length,69);assert.equal(new Set(b.combos.map(c=>c.key)).size,69);
 assert.deepEqual(['age','race','sex'].map(d=>b.combos.filter(c=>c.demographic===d).length),[25,25,19]);
 for(const c of b.combos){
  for(const k of b.strategyOrder){assert.equal(typeof c.strategies[k].mean,'number');assert(c.strategies[k].mean>=0&&c.strategies[k].mean<=1);assert.equal(c.strategies[k].folds.length,10);}
  assert.equal(c.diagnosisContextChange,c.strategies.S3_RND.mean-c.strategies.S3_CC.mean);
  assert.equal(Object.keys(c.clusterPerformance.variants).length,2);
 }
 assert.equal(b.combos.filter(c=>c.hypothesisAvailable).length,3);
 if(files.includes('claims_bundle.js')) {
  vm.runInNewContext(fs.readFileSync(path.join(site,'claims_bundle.js'),'utf8'),sandbox);
  const h=JSON.parse(JSON.stringify(sandbox.window.SAIF_COMMUNITY));
  assert.equal(h.signals.length,3);assert.equal(h.sources.length,17);
  const sources=new Set(h.sources.map(s=>s.source_id));assert.equal(sources.size,17);
  assert.deepEqual(h.signals.map(s=>s.candidates.length),[3,2,2]);
  for(const s of h.signals){
   assert(b.combos.some(c=>c.organSlug===s.organ&&c.demographic===s.demographic&&c.hypothesisAvailable));
   for(const c of s.candidates){assert.equal(c.claim_status,'proposed');assert.equal(c.human_reviewed,false);assert(!('confidence' in c));assert(!('provenance' in c));assert(c.limitations.length>=2);for(const l of c.evidence)assert(sources.has(l.source_id));}
   for(const l of s.limiting_evidence)assert(sources.has(l.source_id));
  }
  assert(h.signals[2].summary.includes('no sufficiently supported direct morphology explanation'));
  assert(h.signals[2].candidates.every(c=>c.type==='Clinical/context'));
 }
 const html=fs.readFileSync(path.join(site,'index.html'),'utf8');
 assert(!/\bSAIF\b/.test(html.replace(/https?:[^"\s<]+/g,'')),'Visible internal branding');
 assert(!/https:[^"\s]+results_bundle\.js/.test(html),'Remote legacy results dependency');
 const app=fs.readFileSync(path.join(site,'app.js'),'utf8');
 assert(!/localStorage|sessionStorage|indexedDB|XMLHttpRequest|\bfetch\s*\(/.test(app),'Unexpected runtime storage/network surface');
 return {audit:'passed',tasks:69,files:files.length};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) console.log(audit(path.join(root,'_site')));
