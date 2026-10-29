const community = window.SAIF_COMMUNITY;
const atlas = window.SAIF_RESULTS;
const app = document.querySelector('#app');
const main = document.querySelector('#main-content');
const REPO = 'https://github.com/sinai-computational-pathology/saif-community-hub';
const local = ['localhost','127.0.0.1'].includes(location.hostname);
const ATLAS_URL = local ? '../../public_results_release/' : 'https://sinai-computational-pathology.github.io/saif-results-atlas/';
const esc = (v = '') => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const disclaimer = 'These hypotheses are literature-linked candidates for follow-up and have not been shown to explain the model predictions.';
const sources = new Map((community?.sources || []).map(s => [s.source_id,s]));

// Reader-facing labels for the stored scientific classifications. The records keep their
// original `type`; only the display name changes.
const CATEGORY = {'Morphology':'Tissue Morphology','Clinical/context':'Clinical & Sampling'};
const categoryOf = c => CATEGORY[c.type] || c.type;
let activeCategory = 'all';

// Hash carries the route; an optional `?cat=` query carries filter state so a
// filtered view is shareable. Links written before Round 2 have no query and
// still resolve, including the legacy '#/combo/...' and '/claim/<id>' forms.
const SIGNALS_ROUTE = '#/signals';
function route() {
  const [path, qs] = (location.hash || '#/').slice(1).split('?');
  const cat = new URLSearchParams(qs || '').get('cat');
  const match = path.match(/^\/(?:hypothesis|combo)\/([^/]+)\/([^/]+)(?:\/claim\/([^/]+))?\/?$/);
  if (match) return {page:'detail',organ:decodeURIComponent(match[1]),demo:decodeURIComponent(match[2]) === 'race_self_reported_ancestry' ? 'race' : decodeURIComponent(match[2]),claim:match[3] ? decodeURIComponent(match[3]) : null,cat};
  if (`#${path}` === SIGNALS_ROUTE) return {page:'signals'};
  if (path === '/governance') return {page:'governance'};
  if (path === '/contribute') return {page:'contribute'};
  return {page:'home'};
}
function routePath() {return (location.hash || '#/').slice(1).split('?')[0];}
function writeUrl(path) {
  const q = activeCategory !== 'all' ? `?cat=${encodeURIComponent(activeCategory)}` : '';
  history.replaceState(null,'',`#${path}${q}`);
}
function href(s) {return `#/hypothesis/${encodeURIComponent(s.organ)}/${s.demographic === 'race' ? 'race_self_reported_ancestry' : s.demographic}`;}
function result(s) {return atlas.combos.find(c => c.organSlug === s.organ && c.demographic === s.demographic);}
function atlasHref(c) {return `${ATLAS_URL}#/combo/${encodeURIComponent(c.organSlug)}/${c.demographic}`;}
function shortId(c) {return c.id.split(':').at(-1);}
function question(c) {return `What tissue or contextual features could be associated with ${String(c.demoLabel).toLowerCase()} predictability in ${String(c.organ).toLowerCase()} histopathology?`;}

// "Thong HY, Jee SH, ... . Title. Journal. 2003." -> "Thong et al. 2003"
function shortRef(citation = '') {
  const year = (String(citation).match(/\b(?:19|20)\d{2}\b/g) || []).pop();
  const head = String(citation).split(/\.\s/)[0] || '';
  const surname = (head.split(',')[0] || '').trim().split(/\s+/)[0];
  if (!surname) return citation;
  const many = head.includes(',') || /\bet al\b/i.test(head);
  return `${surname}${many ? ' et al.' : ''}${year ? ' ' + year : ''}`;
}
// The three categories the site links to carry no discussion form template, so
// GitHub applies these title/body query parameters. The context a contributor
// would otherwise retype — combination, hypothesis id and title, type, links —
// is filled in here, leaving one free-text field and an optional reference.
const TYPE_LABEL = {'ideas':'Idea or alternative','show-and-tell':'Evidence','q-a':'Question'};
const TYPE_TAG = {'ideas':'Idea','show-and-tell':'Evidence','q-a':'Question'};
function discussionHref(category, c, topic = null, candidate = null) {
  const context = c ? `${c.organ} / ${c.demoLabel}` : 'Not specified';
  const hypothesis = c ? `https://sinai-computational-pathology.github.io/saif-community-hub/${href({organ:c.organSlug,demographic:c.demographic})}${candidate?'/claim/'+encodeURIComponent(shortId(candidate)):''}` : '';
  const experiment = c ? `https://sinai-computational-pathology.github.io/saif-results-atlas/#/combo/${c.organSlug}/${c.demographic}` : '';
  const body = [
    `**Contribution type:** ${TYPE_LABEL[category] || TYPE_LABEL['q-a']}`,
    `**Combination:** ${context}`,
    candidate ? `**Hypothesis:** ${shortId(candidate)} — ${candidate.title}` : null,
    hypothesis ? `**Pages:** [hypothesis](${hypothesis})${experiment ? ` · [experimental results](${experiment})` : ''}` : null,
    '',
    '**Reference (optional — DOI, PMID or URL):**',
    '',
    '---',
    '',
    'Write your contribution here.',
    '',
    '',
    '<sub>This discussion is public. Do not post PHI, patient or specimen identifiers, restricted data, or credentials.</sub>'
  ].filter(v => v !== null).join('\n');
  const label = candidate ? `${candidate.title} — ${context}` : (topic ? `${topic} — ${context}` : context);
  const params = new URLSearchParams({category,title:`[${TYPE_TAG[category] || 'Question'}] ${label}`,body});
  return `${REPO}/discussions/new?${params}`;
}
// No discussions exist for these hypotheses yet, so this points at the search or
// category view rather than implying a thread or count is available.
function browseHref(c, candidate = null) {
  const q = candidate ? candidate.title : (c ? `${c.organ} / ${c.demoLabel}` : '');
  return `${REPO}/discussions${q ? `?discussions_q=${encodeURIComponent(q)}` : ''}`;
}
function contributions(c) {return `<section class="collaboration-panel"><div class="page-width"><div><p class="eyebrow">Community contributions</p><h2>Add a question or evidence</h2><p>Community submissions are separate from the study-linked candidates shown here. Contributions open a GitHub discussion; they do not edit this page.</p><p class="panel-links"><a href="#/contribute">What makes a useful contribution →</a><a href="${esc(browseHref(c))}" target="_blank" rel="noopener">Browse existing discussions ↗</a></p></div><div class="collaboration-actions"><a class="button primary" href="${esc(discussionHref('ideas',c))}" target="_blank" rel="noopener">Propose a hypothesis ↗</a><a class="button" href="${esc(discussionHref('show-and-tell',c))}" target="_blank" rel="noopener">Add evidence ↗</a><a class="button" href="${esc(discussionHref('q-a',c))}" target="_blank" rel="noopener">Ask a question ↗</a></div></div></section>`;}

// Prominent literature block: who/when, what it showed, where to read it, what limits it.
function evidence(links, tone = 'support') {
  return `<ul class="evidence-list ${tone}">${links.map(l => {
    const s = sources.get(l.source_id);
    return `<li class="evidence-item"><p class="evidence-claim">${esc(l.support)}</p><p class="evidence-meta"><a class="evidence-ref" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(shortRef(s.citation))} ↗</a><span class="tag ${s.access_status === 'open full text' ? 'tag-open' : 'tag-limited'}">${esc(s.access_status)}</span><span class="tag tag-rel">${esc(s.evidence_relation)}</span></p><p class="evidence-locator">${esc(l.locator)}</p></li>`;
  }).join('')}</ul>`;
}
function card(c, signal) {
  const id = shortId(c);
  const cat = categoryOf(c);
  return `<article class="hcard" id="${esc(id)}" data-category="${esc(cat)}">
  <button class="hcard-head" type="button" data-toggle="${esc(id)}" aria-expanded="false" aria-controls="body-${esc(id)}">
    <span class="hcard-text"><span class="badge badge-${c.type === 'Morphology' ? 'morph' : 'clin'}">${esc(cat)}</span><span class="hcard-title">${esc(c.title)}</span><span class="hcard-lede">${esc(c.hypothesis)}</span><span class="hcard-meta">${c.evidence.length} reference${c.evidence.length === 1 ? '' : 's'}</span></span>
    <span class="hcard-cta"><span class="cta-label">Explore</span><span class="chev" aria-hidden="true"></span></span>
  </button>
  <div class="hcard-body" id="body-${esc(id)}" hidden>
    <div class="hcard-inner">
      <section class="block"><h3>Literature evidence</h3>${evidence(c.evidence)}</section>
      <section class="block"><h3>What to measure next</h3><ul class="measure-list">${c.features.map(f => `<li>${esc(f)}</li>`).join('')}</ul></section>
      <details class="sub"><summary>Limitations (${c.limitations.length})</summary><ul class="plain-list">${c.limitations.map(l => `<li>${esc(l)}</li>`).join('')}</ul></details>
      <details class="sub"><summary>Status and provenance</summary><p><strong>${esc(c.claim_status)}</strong> · ${c.human_reviewed ? 'human-reviewed' : 'not human-reviewed'} · model reliance untested.</p><p>Generated 24 September 2026 from a frozen prompt; source checking used the same model and is not independent verification. <a href="#/governance">Full provenance →</a></p></details>
      <div class="hcard-actions"><a class="button primary" href="${esc(discussionHref('q-a',signal,'Discuss: '+c.title,c))}" target="_blank" rel="noopener">Discuss this hypothesis ↗</a><a class="button" href="${esc(discussionHref('show-and-tell',signal,'Evidence: '+c.title,c))}" target="_blank" rel="noopener">Add evidence ↗</a><a class="button" href="${esc(discussionHref('ideas',signal,'Alternative explanation for: '+c.title,c))}" target="_blank" rel="noopener">Propose an alternative ↗</a></div>
      <p class="action-note"><a href="${esc(browseHref(signal,c))}" target="_blank" rel="noopener">Search discussions for this hypothesis ↗</a></p>
    </div>
  </div>
</article>`;
}
function renderHome() {
  app.innerHTML = `<section class="explorer-intro"><div class="page-width">
    <p class="eyebrow">Demographic signals in routine histopathology</p>
    <h1>Hypothesis Explorer</h1>
    <p class="lede">Models read demographic attributes from routine H&amp;E slides. These are the candidate explanations we could find in the literature — open for criticism, evidence and testing.</p>
    <p class="notice">All hypotheses are <strong>proposed and unvalidated</strong>. None has been shown to explain model behaviour.</p>
  </div></section>
  <section class="page-width exemplar-grid">${community.signals.map(s => {
    const c = result(s);
    const refs = new Set(s.candidates.flatMap(x => x.evidence).map(l => l.source_id)).size;
    return `<a class="exemplar-card" href="${href(s)}"><p class="eyebrow">${esc(c.demoLabel)}</p><h2>${esc(c.organ)}</h2><p class="exemplar-q">${esc(question(c))}</p><p class="exemplar-meta"><strong>${s.candidates.length}</strong> hypotheses · <strong>${refs}</strong> references</p><span class="cta-inline">Explore →</span></a>`;
  }).join('')}</section>
  <section class="page-width atlas-strip"><p>Looking for the experimental results? All 69 organ–demographic combinations live in the Results Atlas. <a href="${SIGNALS_ROUTE}">See which have hypotheses →</a></p><a class="button" href="${ATLAS_URL}">Open Results Atlas →</a></section>
  ${contributions()}`;
}
function renderSignals() {
  app.innerHTML=`<section class="explorer-intro"><div class="page-width"><h1>Experimental signals</h1><p class="lede">All 69 combinations are available in the Results Atlas. Three have literature-linked candidate explanations in this release.</p><a class="button primary" href="${ATLAS_URL}">Open Results Atlas →</a></div></section><section class="page-width signal-links">${atlas.combos.map(c => `<a href="${href({organ:c.organSlug,demographic:c.demographic})}">${esc(c.organ)} · ${esc(c.demoLabel)}</a>`).join('')}</section>`;
}
function renderDetail(current) {
  const c = atlas.combos.find(c => c.organSlug===current.organ && c.demographic===current.demo);
  if (!c) {app.innerHTML='<section class="page-width not-found"><h1>Signal unavailable</h1><a class="button" href="#/">Return to the examples</a></section>';return;}
  const s = community.signals.find(s => s.organ===current.organ && s.demographic===current.demo);
  const knownClaim = s?.candidates.some(x => shortId(x)===current.claim);
  if (!s) {
    app.innerHTML=`<section class="exemplar-hero"><div class="page-width"><a class="back" href="#/">← All examples</a><p class="eyebrow">${esc(c.demoLabel)}</p><h1>${esc(c.organ)}</h1><p class="lede">No literature-linked hypothesis has been reviewed for this signal yet.</p><a class="button primary" href="${atlasHref(c)}">View experimental results →</a></div></section>${contributions(c)}`;
    return;
  }
  const cats = [...new Set(s.candidates.map(categoryOf))];
  const allRefs = [...new Set([...s.candidates.flatMap(x => x.evidence), ...s.limiting_evidence].map(l => l.source_id))];
  app.innerHTML = `<section class="exemplar-hero"><div class="page-width">
    <a class="back" href="#/">← All examples</a>
    <p class="eyebrow">${esc(c.demoLabel)}</p>
    <h1>${esc(c.organ)}</h1>
    <p class="exemplar-q">${esc(question(c))}</p>
    <p class="lede">${esc(s.summary)}</p>
    ${current.claim && !knownClaim ? '<p class="empty-section">This historical hypothesis is not included in the current release. Current content for this signal appears below.</p>' : ''}
    <p class="notice"><strong>${s.candidates.length} proposed hypotheses</strong> · unvalidated · model reliance untested</p>
    <a class="button primary" href="${atlasHref(c)}">View experimental results in Results Atlas →</a>
  </div></section>
  <section class="page-width filter-bar" role="group" aria-label="Filter hypotheses by category">
    <button class="chip" type="button" data-filter="all">All <span>${s.candidates.length}</span></button>
    ${cats.map(cat => `<button class="chip" type="button" data-filter="${esc(cat)}">${esc(cat)} <span>${s.candidates.filter(x => categoryOf(x)===cat).length}</span></button>`).join('')}
  </section>
  <section class="page-width card-list">${s.candidates.map(x => card(x,c)).join('')}<p class="filter-empty" hidden>No hypotheses in this category.</p></section>
  ${s.limiting_evidence.length ? `<section class="page-width block limiting-block"><h2>Limiting and contradictory evidence</h2><p class="block-note">Findings that constrain or argue against the candidates above. Retained deliberately.</p>${evidence(s.limiting_evidence,'limit')}</section>` : ''}
  <section class="page-width"><details class="bibliography"><summary>Full bibliography (${allRefs.length} sources)</summary><p class="block-note">Sources support specific literature premises; their relevance to this study's cohort and model is indirect.</p><ol class="source-list">${allRefs.map(id => {const r=sources.get(id);return `<li><p>${esc(r.citation)}</p><a href="https://doi.org/${esc(r.doi)}" target="_blank" rel="noopener">DOI: ${esc(r.doi)}</a> · <a href="https://pubmed.ncbi.nlm.nih.gov/${esc(r.pmid)}/" target="_blank" rel="noopener">PMID: ${esc(r.pmid)}</a></li>`;}).join('')}</ol></details></section>
  ${contributions(c)}`;
  activeCategory = cats.includes(current.cat) ? current.cat : 'all';
  applyFilter();
  if (knownClaim) setExpanded(current.claim,true,false);
}
function renderGovernance() {app.innerHTML=`<section class="page-width prose"><h1>About this resource</h1><p>The Results Atlas reports experimental AUROCs across training controls. The Hypothesis Explorer presents literature-linked candidates for three examples.</p><p>${disclaimer}</p><p>Literature searches were targeted and exploratory. Source checking was AI-assisted; the candidate records remain proposed and do not record human approval. Neither source support nor author review would establish model reliance.</p><p>Self-reported race categories describe study labels; they do not identify intrinsic racial biology.</p><h2>Categories</h2><p><strong>Tissue Morphology</strong> covers candidates recorded as morphology in the underlying records. <strong>Clinical &amp; Sampling</strong> covers candidates recorded as clinical or contextual. The stored scientific classification is unchanged; only the display name differs.</p><h2>Generation provenance</h2><p>All seven candidates come from three sealed runs of a frozen prompt, executed on 24 September 2026 (UTC) with OpenAI <code>gpt-6-astra</code> at reasoning setting <code>medium</code>. The backend model version, sampling seed and temperature were not exposed by the runtime. Generation and source checking used the same model in the same session, so they are not independent replication or human verification.</p><ul><li>Prompt <code>hypothesis_literature_v1</code>, SHA-256 <code>e16b158d8cedf9eafd38f0c2c152110ff3976696ed08cd07d5eadd029798cb8c</code></li><li>Output schema SHA-256 <code>d6503345c77d7038b7c68ef02063431859e3d319b88422a707fa49e404f4d670</code></li><li>Skin run <code>20260924T172017Z_23b25561</code>; breast run <code>20260924T203828Z_3860d41f</code>; gastric run <code>20260924T203828Z_114a41eb</code></li></ul><p>The skin run received only its residual AUROC, best-context AUROC and their difference as inputs; the other strategy values were verified afterwards and were not generation inputs. Every cited source records the material actually inspected — open full text or abstract only — and all source-to-study relations are indirect, because no cited study examined this cohort or model.</p><p>Historical claims from earlier editions are not part of this release. They remain frozen in the repository at <a href="https://github.com/sinai-computational-pathology/saif-community-hub/tree/main/supplement/v1" target="_blank" rel="noopener">supplement/v1 ↗</a>, and are deliberately not served by this site.</p><a class="button" href="${ATLAS_URL}">Open Results Atlas →</a></section>${contributions()}`;}

function renderContribute() {
  app.innerHTML = `<section class="page-width prose">
    <a class="back" href="#/">← All examples</a>
    <h1>How to contribute</h1>
    <p class="lede">These seven hypotheses are starting points, not conclusions. The most useful contributions are the ones that make a hypothesis easier to test — or harder to believe.</p>
    <p>Everything here is <strong>proposed and not human-reviewed</strong>. Disagreement is a valid contribution; so is a source that undermines a candidate.</p>
    <h2>Three kinds of contribution</h2>
    <div class="contrib-grid">
      <div class="contrib-card"><h3>Propose a hypothesis</h3><p>An explanation we missed, or an alternative reading of one already listed. Most valuable when it names something observable in tissue.</p><a class="button primary" href="${esc(discussionHref('ideas'))}" target="_blank" rel="noopener">Propose ↗</a></div>
      <div class="contrib-card"><h3>Add or challenge evidence</h3><p>A paper that supports or contradicts a candidate. Contradicting evidence is as welcome as supporting evidence.</p><a class="button primary" href="${esc(discussionHref('show-and-tell'))}" target="_blank" rel="noopener">Add evidence ↗</a></div>
      <div class="contrib-card"><h3>Ask a question</h3><p>About a candidate, the cohort, or how the hypotheses were generated.</p><a class="button primary" href="${esc(discussionHref('q-a'))}" target="_blank" rel="noopener">Ask ↗</a></div>
    </div>
    <h2>What makes a contribution useful</h2>
    <ul class="plain-list guide-list">
      <li><strong>Cite something resolvable.</strong> A DOI or PubMed ID, not a description. Every source on this site carries both.</li>
      <li><strong>Say what the source actually reports</strong>, not what it implies. The prefilled template asks for this separately on purpose.</li>
      <li><strong>State what you read.</strong> Full text and abstract-only are different kinds of evidence, and the site labels every source accordingly.</li>
      <li><strong>Name the limits.</strong> Different cohort, different modality, different disease setting — these are the usual reasons a plausible source does not transfer.</li>
      <li><strong>Say what would falsify it.</strong> A hypothesis that no observation could contradict is not yet useful here.</li>
    </ul>
    <h2>What happens next</h2>
    <p>A contribution opens a thread in GitHub Discussions. It does not edit this page, and nothing posted there becomes part of the record automatically. Published candidates change only through the generation and review process described in <a href="#/governance">scientific scope</a>.</p>
    <p><a class="button" href="${esc(browseHref())}" target="_blank" rel="noopener">Browse all discussions ↗</a></p>
  </section>${contributions()}`;
}
function setExpanded(id, open, moveHash = true) {
  const article = document.getElementById(id);
  if (!article) return;
  const head = article.querySelector('.hcard-head');
  const body = article.querySelector('.hcard-body');
  head.setAttribute('aria-expanded',String(open));
  article.classList.toggle('is-open',open);
  body.hidden = !open;
  head.querySelector('.cta-label').textContent = open ? 'Collapse' : 'Explore';
  if (moveHash) {
    const base = routePath().replace(/\/claim\/[^/]+\/?$/,'');
    writeUrl(open ? `${base}/claim/${encodeURIComponent(id)}` : base);
    // Expanding a card far down the page would otherwise leave its body below the fold.
    if (open) article.scrollIntoView({block:'start',behavior:'smooth'});
  }
}
function applyFilter(persist = false) {
  const cards = [...document.querySelectorAll('.hcard')];
  if (!cards.length) return;
  let shown = 0;
  for (const el of cards) {
    const match = activeCategory === 'all' || el.dataset.category === activeCategory;
    el.hidden = !match;
    if (match) shown++;
  }
  for (const chip of document.querySelectorAll('.chip')) chip.classList.toggle('is-active',chip.dataset.filter === activeCategory);
  const empty = document.querySelector('.filter-empty');
  if (empty) empty.hidden = shown > 0;
  if (persist) writeUrl(routePath());
}
app.addEventListener('click', e => {
  const chip = e.target.closest('.chip');
  if (chip) {activeCategory = chip.dataset.filter; applyFilter(true); return;}
  const head = e.target.closest('.hcard-head');
  if (head) {setExpanded(head.dataset.toggle, head.getAttribute('aria-expanded') !== 'true');}
});
function render() {
  if (!community || !atlas) {app.innerHTML='<p class="page-width">Data could not be loaded. Please reload the page.</p>';return;}
  const current=route();
  activeCategory = 'all';
  if(current.page==='detail') renderDetail(current);
  else if(current.page==='signals') renderSignals();
  else if(current.page==='governance') renderGovernance();
  else if(current.page==='contribute') renderContribute();
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
