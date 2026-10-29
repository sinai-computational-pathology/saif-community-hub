const community = window.SAIF_COMMUNITY;
const atlas = window.SAIF_RESULTS;
const app = document.querySelector('#app');
const main = document.querySelector('#main-content');
const REPO = 'https://github.com/sinai-computational-pathology/saif-community-hub';
const local = ['localhost','127.0.0.1'].includes(location.hostname);
const ATLAS_URL = local ? '../../public_results_release/' : 'https://sinai-computational-pathology.github.io/saif-results-atlas/';
const esc = (v = '') => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const finite = v => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
const fmt = v => finite(v) ? Number(v).toFixed(3) : 'Unavailable';
const disclaimer = 'These hypotheses are literature-linked candidates for follow-up and have not been shown to explain the model predictions.';
const sources = new Map((community?.sources || []).map(s => [s.source_id,s]));
function route() {
  const hash = location.hash || '#/';
  const match = hash.match(/^#\/(?:hypothesis|combo)\/([^/]+)\/([^/]+)(?:\/claim\/([^/]+))?\/?$/);
  if (match) return {page:'detail',organ:decodeURIComponent(match[1]),demo:decodeURIComponent(match[2]) === 'race_self_reported_ancestry' ? 'race' : decodeURIComponent(match[2]),claim:match[3] ? decodeURIComponent(match[3]) : null};
  if (hash === '#/signals') return {page:'signals'};
  if (hash === '#/governance') return {page:'governance'};
  return {page:'home'};
}
function href(s) {return `#/hypothesis/${encodeURIComponent(s.organ)}/${s.demographic === 'race' ? 'race_self_reported_ancestry' : s.demographic}`;}
function result(s) {return atlas.combos.find(c => c.organSlug === s.organ && c.demographic === s.demographic);}
function atlasHref(c) {return `${ATLAS_URL}#/combo/${encodeURIComponent(c.organSlug)}/${c.demographic}`;}
function discussionHref(category, c, topic = 'New hypothesis', candidate = null) {
  const context = c ? `${c.organ} / ${c.demoLabel}` : 'Organ / demographic target';
  const hypothesis=c ? `https://sinai-computational-pathology.github.io/saif-community-hub/${href({organ:c.organSlug,demographic:c.demographic})}${candidate?'/claim/'+encodeURIComponent(candidate.id.split(':').at(-1)):''}` : '';
  const experiment=c ? `https://sinai-computational-pathology.github.io/saif-results-atlas/#/combo/${c.organSlug}/${c.demographic}` : '';
  const params = new URLSearchParams({category,title:`${topic}: ${context}`,body:`Signal: ${context}\n${candidate?`Candidate: ${candidate.title}\n`:""}Hypotheses: ${hypothesis}\nExperimental results: ${experiment}\n\nProposed explanation or relevant evidence:\n\nSource link and what it supports or challenges:\n\nImportant limitations:\n`});
  return `${REPO}/discussions/new?${params}`;
}
function contributions(c) {return `<section class="collaboration-panel"><div class="page-width"><div><p class="eyebrow">Community contributions</p><h2>Add a question or evidence</h2><p>Community submissions are separate from the study-linked candidates shown here. Contributions open a GitHub discussion; they do not edit this page.</p></div><div class="collaboration-actions"><a href="${esc(discussionHref('ideas',c))}" target="_blank" rel="noopener"><strong>Propose a hypothesis or alternative explanation ↗</strong></a><a href="${esc(discussionHref('show-and-tell',c,'Relevant literature or evidence'))}" target="_blank" rel="noopener"><strong>Add supporting or conflicting evidence ↗</strong></a><a href="${esc(discussionHref('q-a',c,'Question'))}" target="_blank" rel="noopener"><strong>Ask a question ↗</strong></a></div></div></section>`;}
function evidence(links) {
  return `<ul class="source-list">${links.map(l => {
    const s=sources.get(l.source_id);
    return `<li><p>${esc(l.support)}</p><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.citation.split('.')[0])} · paper ↗</a><small>${esc(l.locator)} · ${esc(s.access_status)}</small></li>`;
  }).join('')}</ul>`;
}
function card(c, signal) {return `<article class="claim-card" id="${esc(c.id.split(':').at(-1))}"><p class="eyebrow">Literature-linked candidate · ${esc(c.type)}</p><h2>${esc(c.title)}</h2><h3>Candidate explanation</h3><p>${esc(c.hypothesis)}</p><div class="claim-details"><div><h3>What to inspect</h3><ul>${c.features.map(f => `<li>${esc(f)}</li>`).join('')}</ul></div><div><h3>Important limitations</h3><ul>${c.limitations.map(l => `<li>${esc(l)}</li>`).join('')}</ul></div></div><details open><summary>Literature evidence</summary>${evidence(c.evidence)}</details><footer class="candidate-actions"><a href="${atlasHref(signal)}">View experimental results →</a><a href="${esc(discussionHref('q-a',signal,'Discuss: '+c.title,c))}" target="_blank" rel="noopener">Discuss this hypothesis ↗</a><a href="${esc(discussionHref('show-and-tell',signal,'Evidence: '+c.title,c))}" target="_blank" rel="noopener">Suggest evidence ↗</a></footer></article>`;}
function renderHome() {
  app.innerHTML=`<section class="index-hero"><div class="page-width"><p class="eyebrow">Demographic signals in routine histopathology</p><h1>Evidence and candidate explanations</h1><p>Three manuscript examples connect experimental observations to literature and testable follow-up.</p><p>${disclaimer}</p><a class="text-link" href="${ATLAS_URL}">Browse all 69 experimental signals →</a></div></section><section class="page-width dossier-grid">${community.signals.map(s => {
    const c=result(s);
    return `<a class="dossier-card" href="${href(s)}"><p class="eyebrow">${esc(c.demoLabel)}</p><h2>${esc(c.organ)}</h2><p>${esc(s.summary)}</p><p>S3CC controlled AUROC <strong>${fmt(c.strategies.S3_CC.mean)}</strong></p><span>Explore ${s.candidates.length} candidates →</span></a>`;
  }).join('')}</section>${contributions()}`;
}
function renderSignals() {
  app.innerHTML=`<section class="index-hero"><div class="page-width"><h1>Experimental signals</h1><p>All 69 combinations are available in the Results Atlas. Three have literature-linked candidate explanations in this release.</p><a class="button dark" href="${ATLAS_URL}">Open Results Atlas →</a></div></section><section class="page-width signal-links">${atlas.combos.map(c => `<a href="${href({organ:c.organSlug,demographic:c.demographic})}">${esc(c.organ)} · ${esc(c.demoLabel)}</a>`).join('')}</section>`;
}
function renderDetail(current) {
  const c=atlas.combos.find(c => c.organSlug===current.organ && c.demographic===current.demo);
  if (!c) {app.innerHTML='<section class="page-width not-found"><h1>Signal unavailable</h1><a href="#/">Return to the examples</a></section>';return;}
  const s=community.signals.find(s => s.organ===current.organ && s.demographic===current.demo);
  const allLinks=s ? [...s.candidates.flatMap(c => c.evidence),...s.limiting_evidence] : [];
  const used=[...new Set(allLinks.map(l => l.source_id))];
  const knownClaim=s?.candidates.some(c => c.id.split(':').at(-1)===current.claim);
  app.innerHTML=`<section class="dossier-hero"><div class="page-width"><a href="#/">← All examples</a><p class="eyebrow">${esc(c.demoLabel)}</p><h1>${esc(c.organ)}</h1><p class="observation-inline">Experimental context · ${['S1','S2','S3_CC'].map(k=>`${k.replaceAll('_','')} <strong>${fmt(c.strategies[k].mean)}</strong>`).join(' · ')} · <a href="${atlasHref(c)}">View experimental results →</a></p>${current.claim && !knownClaim ? '<p class="empty-section">This historical hypothesis is not included in the current release. Current content for this signal appears below.</p>' : ''}<p>${s ? esc(s.summary) : 'No literature-linked hypothesis has been reviewed for this signal yet.'}</p>${s ? `<p class="candidate-boundary">${disclaimer}</p>` : ''}</div></section>${s ? `<section class="page-width claim-list">${s.candidates.map(candidate=>card(candidate,c)).join('')}<details class="boundary-sources"><summary>Additional limiting evidence</summary>${evidence(s.limiting_evidence)}</details><section class="reference-section"><h2>References</h2><p>Sources support specific literature premises; their relevance to this study's cohort and model is indirect.</p><ol class="source-list">${used.map(id => {const r=sources.get(id);return `<li><p>${esc(r.citation)}</p><a href="https://doi.org/${esc(r.doi)}" target="_blank" rel="noopener">DOI: ${esc(r.doi)}</a> · <a href="https://pubmed.ncbi.nlm.nih.gov/${esc(r.pmid)}/" target="_blank" rel="noopener">PMID: ${esc(r.pmid)}</a></li>`;}).join('')}</ol></section></section>` : ''}${contributions(c)}`;
}
function renderGovernance() {app.innerHTML=`<section class="page-width not-found"><h1>About this resource</h1><p>The Results Atlas reports experimental AUROCs across training controls. The Hypothesis Explorer presents literature-linked candidates for three examples.</p><p>${disclaimer}</p><p>Literature searches were targeted and exploratory. Source checking was AI-assisted; the candidate records remain proposed and do not record human approval. Neither source support nor author review would establish model reliance.</p><p>Self-reported race categories describe study labels; they do not identify intrinsic racial biology.</p><a href="${ATLAS_URL}">Open the Results Atlas →</a></section>${contributions()}`;}
function render() {
  if (!community || !atlas) {app.innerHTML='<p class="page-width">Data could not be loaded. Please reload the page.</p>';return;}
  const current=route();
  if(current.page==='detail') renderDetail(current);
  else if(current.page==='signals') renderSignals();
  else if(current.page==='governance') renderGovernance();
  else renderHome();
  if(current.claim) document.getElementById(current.claim)?.scrollIntoView({block:'start'});
  document.querySelector('#primary-nav').classList.remove('open');
  document.querySelector('.menu-button').setAttribute('aria-expanded','false');
}
document.querySelector('.menu-button').addEventListener('click',e => {const open=document.querySelector('#primary-nav').classList.toggle('open');e.currentTarget.setAttribute('aria-expanded',String(open));});
document.querySelector('#primary-nav').addEventListener('click', e => {if(e.target.closest('a')) {document.querySelector('#primary-nav').classList.remove('open');document.querySelector('.menu-button').setAttribute('aria-expanded','false');}});
if(local) for(const a of document.querySelectorAll('a[href="https://sinai-computational-pathology.github.io/saif-results-atlas/"]')) a.href=ATLAS_URL;
window.addEventListener('hashchange',()=>{render();main.focus({preventScroll:true});if(!route().claim)window.scrollTo(0,0);});
render();
