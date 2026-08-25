const community = window.SAIF_COMMUNITY;
const atlas = window.SAIF_RESULTS || null;
const app = document.querySelector("#app");
const main = document.querySelector("#main-content");
const menuButton = document.querySelector(".menu-button");
const primaryNav = document.querySelector("#primary-nav");

const REPO = "https://github.com/sinai-computational-pathology/saif-community-hub";
const DISCUSSIONS = `${REPO}/discussions`;
const DEMOGRAPHIC_ORDER = { age: 0, race_self_reported_ancestry: 1, sex: 2 };
const DEMOGRAPHIC_SHORT = { age: "Age", race_self_reported_ancestry: "Race / ancestry", sex: "Sex" };
const ATLAS_DEMOGRAPHIC = { age: "age", race_self_reported_ancestry: "race", sex: "sex" };
const CLAIM_DEMOGRAPHIC = { age: "age", race: "race_self_reported_ancestry", sex: "sex" };
const EVIDENCE_LABEL = {
  verified: "Verified",
  "needs claim-level validation": "Needs claim review",
  "source metadata incomplete": "Source incomplete",
};

const state = {
  search: "",
  demographic: "all",
  section: "all",
  evidence: "all",
  signalSearch: "",
  signalDemographic: "all",
  signalSort: "residual",
};

function esc(value = "") {
  return String(value).replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]);
}

function route() {
  const hash = location.hash || "#/";
  const dossier = hash.match(/^#\/hypothesis\/([^/]+)\/([^/]+)(?:\/claim\/([^/]+))?$/);
  if (dossier) return { page: "dossier", organ: decodeURIComponent(dossier[1]), demographic: decodeURIComponent(dossier[2]), claim: dossier[3] ? decodeURIComponent(dossier[3]) : null };
  if (hash === "#/hypotheses") return { page: "hypotheses" };
  if (hash === "#/signals") return { page: "signals" };
  if (hash === "#/governance") return { page: "governance" };
  return { page: "home" };
}

function dossierHref(dossier, claimId = "") {
  const base = `#/hypothesis/${encodeURIComponent(dossier.organ_slug)}/${encodeURIComponent(dossier.demographic)}`;
  return claimId ? `${base}/claim/${encodeURIComponent(claimId)}` : base;
}

function atlasHref(dossier) {
  const base = community.release.atlasUrl;
  return `${base}#/combo/${encodeURIComponent(dossier.organ_slug)}/${ATLAS_DEMOGRAPHIC[dossier.demographic] || encodeURIComponent(dossier.demographic)}`;
}

function dossierForResult(result) {
  return community.dossiers.find((dossier) => dossier.organ_slug === result.organSlug && dossier.demographic === CLAIM_DEMOGRAPHIC[result.demographic]);
}

function resultForDossier(dossier) {
  return atlas?.combos?.find((result) => result.organSlug === dossier.organ_slug && result.demographic === ATLAS_DEMOGRAPHIC[dossier.demographic]);
}

function formatAuc(value) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(3) : "—";
}

function formatDelta(value) {
  if (!Number.isFinite(Number(value))) return "—";
  const number = Number(value);
  return `${number > 0 ? "+" : ""}${number.toFixed(3)}`;
}

function taxonomyLabel(claim) {
  return claim.section === "histomorphology" ? "Biological / histomorphological" : "Disease / clinical context";
}

function literatureTrack(claim) {
  if (!claim.literature?.length || claim.evidence_status === "source metadata incomplete") return { label: "Limited", detail: "Source coverage incomplete", tone: "limited" };
  if (claim.evidence_status === "verified") return { label: "Reviewed", detail: "Claim-level source support checked", tone: "reviewed" };
  return { label: "Limited", detail: "Claim-level support still under review", tone: "limited" };
}

function renderObservation(result, dossier, compact = false) {
  if (!result) return `<div class="observation-unavailable"><strong>SAIF observation unavailable</strong><p>Open the Results Atlas to check whether this combination is part of the approved aggregate release.</p></div>`;
  const s1 = Number(result.strategies?.S1?.mean);
  const s2 = Number(result.strategies?.S2?.mean);
  const s3 = Number(result.strategies?.S3_CC?.mean);
  const retained = Number(result.contrasts?.aboveChanceRetentionPct);
  return `<div class="observation-card${compact ? " compact" : ""}">
    <div class="observation-heading"><div><p class="eyebrow">SAIF observation</p><h2>${esc(result.organ)} × ${esc(result.demoLabel)}</h2></div><a href="${esc(atlasHref(dossier))}" target="_blank" rel="noopener">Inspect full result ↗</a></div>
    <div class="observation-ladder"><div><small>S1 · observed</small><strong>${formatAuc(s1)}</strong></div><span>Prevalence balance <b>${formatDelta(s2 - s1)}</b></span><div><small>S2 · balanced</small><strong>${formatAuc(s2)}</strong></div><span>Diagnosis-cluster balance <b>${formatDelta(s3 - s2)}</b></span><div><small>S3 CC · residual</small><strong>${formatAuc(s3)}</strong></div></div>
    <div class="observation-question"><strong>What remains unexplained?</strong><p>${Number.isFinite(retained) ? `${retained.toFixed(0)}% of above-chance S1 performance is retained under S3 CC.` : "Residual retention is unavailable."} This association can motivate follow-up, but it does not identify its source.</p></div>
  </div>`;
}

function supportedResults() {
  return (atlas?.combos || []).filter(dossierForResult);
}

function resultSortValue(result) {
  if (state.signalSort === "retained") return Number(result.contrasts?.aboveChanceRetentionPct || 0);
  if (state.signalSort === "control") return Number(result.strategies?.S1?.mean || 0) - Number(result.strategies?.S3_CC?.mean || 0);
  return Number(result.strategies?.S3_CC?.mean || 0);
}

function renderSignals() {
  const query = state.signalSearch.trim().toLowerCase();
  const results = supportedResults()
    .filter((result) => (state.signalDemographic === "all" || result.demographic === state.signalDemographic) && (!query || `${result.organ} ${result.demoLabel}`.toLowerCase().includes(query)))
    .sort((a, b) => resultSortValue(b) - resultSortValue(a));

  app.innerHTML = `${editionBanner()}<section class="signals-hero"><div class="page-width"><p class="eyebrow">Start from a result</p><h1>Explore signals that remain after controls.</h1><p>Rank approved Aim 1a combinations, inspect what prevalence and diagnosis balancing changes, then open the hypotheses that could explain the residual signal.</p></div></section>
    <section class="page-width signals-layout">
      <div class="control-ladder"><div><strong>S1</strong><span>Observed distribution</span></div><i>→</i><div><strong>S2</strong><span>Prevalence-balanced</span></div><i>→</i><div><strong>S3 CC</strong><span>Diagnosis-cluster-balanced</span></div></div>
      ${atlas ? `<div class="signal-filters"><label><span>Search</span><input id="signal-search" type="search" value="${esc(state.signalSearch)}" placeholder="Organ or demographic"></label><label><span>Demographic</span><select id="signal-demographic"><option value="all">All demographics</option><option value="age">Age</option><option value="race">Race / ancestry</option><option value="sex">Sex</option></select></label><label><span>Rank by</span><select id="signal-sort"><option value="residual">Residual S3 CC AUROC</option><option value="retained">Above-chance signal retained</option><option value="control">S1 to S3 CC reduction</option></select></label></div>
      <p class="signal-boundary">Ranking helps prioritize review. Residual prediction does not identify a mechanism or establish intrinsic demographic biology.</p>
      <div class="signal-grid">${results.map((result, index) => {
        const dossier = dossierForResult(result);
        return `<article class="signal-card"><div class="signal-rank"><span>#${index + 1}</span><span>${esc(result.demoLabel)}</span></div><h2>${esc(result.organ)}</h2><div class="signal-metrics"><div><small>S1 observed</small><strong>${formatAuc(result.strategies?.S1?.mean)}</strong></div><div><small>S2 balanced</small><strong>${formatAuc(result.strategies?.S2?.mean)}</strong></div><div><small>S3 CC residual</small><strong>${formatAuc(result.strategies?.S3_CC?.mean)}</strong></div><div><small>Retained</small><strong>${Number(result.contrasts?.aboveChanceRetentionPct || 0).toFixed(0)}%</strong></div></div><p>${dossier.claims.length} candidate hypotheses · ${dossier.claims.filter((claim) => claim.evidence_status !== "verified").length} still need claim-level review</p><div class="signal-actions"><a href="${esc(atlasHref(dossier))}" target="_blank" rel="noopener">Inspect result ↗</a><a href="${dossierHref(dossier)}">Review hypotheses →</a></div></article>`;
      }).join("") || `<div class="empty-state"><strong>No supported results match these filters.</strong></div>`}</div>` : `<div class="empty-state"><strong>The Results Atlas is temporarily unavailable.</strong><p>Browse hypotheses now or open the Atlas directly.</p></div>`}
    </section>`;

  if (!atlas) return;
  const demographic = document.querySelector("#signal-demographic");
  const sort = document.querySelector("#signal-sort");
  demographic.value = state.signalDemographic;
  sort.value = state.signalSort;
  document.querySelector("#signal-search").addEventListener("input", (event) => { state.signalSearch = event.target.value; renderSignals(); document.querySelector("#signal-search")?.focus(); });
  demographic.addEventListener("change", (event) => { state.signalDemographic = event.target.value; renderSignals(); });
  sort.addEventListener("change", (event) => { state.signalSort = event.target.value; renderSignals(); });
}

function discussionHref(category) {
  return `${DISCUSSIONS}/new?category=${encodeURIComponent(category)}`;
}

function sourceHref(source) {
  if (source.doi) return `https://doi.org/${encodeURIComponent(source.doi)}`;
  if (source.pmid) return `https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(source.pmid)}/`;
  return source.url || "";
}

function evidencePill(status) {
  const tone = status === "verified" ? "verified" : status === "source metadata incomplete" ? "incomplete" : "review";
  return `<span class="status-pill ${tone}">${esc(EVIDENCE_LABEL[status] || status || "Unreviewed")}</span>`;
}

function editionBanner() {
  if (community.edition !== "frozen") return "";
  return `<div class="edition-banner"><strong>Frozen paper supplement</strong><span>This version is immutable. Visit the <a href="${esc(community.release.siteUrl.replace(/supplement\/v\d+(?:\.\d+)*\/$/, ""))}">living edition</a> for later updates.</span></div>`;
}

function renderHome() {
  const stats = community.stats;
  const openQuestions = supportedResults().sort((a, b) => Number(b.strategies?.S3_CC?.mean || 0) - Number(a.strategies?.S3_CC?.mean || 0)).slice(0, 3);
  app.innerHTML = `${editionBanner()}
    <section class="hero page-width">
      <div class="hero-copy">
        <p class="eyebrow">Pan-organ demographic signal research</p>
        <h1>Turn an unexplained signal into a <em>testable hypothesis.</em></h1>
        <p class="hero-lede">Start with an approved SAIF result, review candidate explanations, and propose what the next experiment should test.</p>
        <div class="hero-actions">
          <a class="button primary" href="#/signals">Explore unexplained signals</a>
          <a class="button secondary" href="#/hypotheses">Browse hypotheses</a>
          <a class="text-link" href="${discussionHref("ideas")}" target="_blank" rel="noopener">Propose a hypothesis <span aria-hidden="true">→</span></a>
        </div>
      </div>
      <aside class="hero-atlas-card" aria-label="Community corpus summary">
        <div class="signal-orbit" aria-hidden="true"><i></i><i></i><i></i><b>H&amp;E</b></div>
        <div class="metric-row"><strong>${atlas?.comboCount || "—"}</strong><span>approved result combinations</span></div>
        <div class="metric-row"><strong>${stats.dossiers}</strong><span>linked hypothesis dossiers</span></div>
        <div class="metric-row"><strong>${stats.claims}</strong><span>testable claims</span></div>
        <p>Living edition · human-reviewed updates</p>
      </aside>
    </section>
    <section class="caution-band">
      <div class="page-width caution-inner"><span class="caution-mark" aria-hidden="true">!</span><p><strong>Prediction is not mechanism.</strong> Signal may reflect diagnosis mix, sampling, access, exposure, workflow, or morphology. These hypotheses guide follow-up; they are not causal conclusions.</p></div>
    </section>
    <section class="page-width open-questions-section">
      <div class="section-heading"><p class="eyebrow">Where we need ideas</p><h2>Open questions from current residual signals</h2><p>These combinations rank highly by residual S3 CC AUROC among results with a published hypothesis dossier. They are prompts for review, not claims of biological importance.</p></div>
      <div class="open-question-grid">${openQuestions.length ? openQuestions.map((result) => {
        const dossier = dossierForResult(result);
        return `<article><div class="question-metric"><span>${esc(result.demoLabel)}</span><strong>${formatAuc(result.strategies?.S3_CC?.mean)} <small>S3 CC</small></strong></div><h3>${esc(result.organ)}</h3><p>What carries the residual signal after prevalence and diagnosis-cluster balancing?</p><div><span>${dossier.claims.length} candidate hypotheses</span><span>${dossier.claims.filter((claim) => claim.evidence_status !== "verified").length} need review</span></div><a href="${dossierHref(dossier)}">Review this open question →</a></article>`;
      }).join("") : `<div class="empty-state"><strong>Open-question ranking is temporarily unavailable.</strong><p>The hypothesis registry remains available.</p></div>`}</div>
      <div class="open-question-actions"><a class="button dark" href="#/signals">Explore all linked signals</a><a class="text-link" href="${discussionHref("ideas")}" target="_blank" rel="noopener">Propose a different mechanism →</a></div>
    </section>
    <section class="page-width pathway-section">
      <div class="section-heading"><p class="eyebrow">Community hypothesis registry</p><h2>Observation → mechanism → prediction → validation</h2></div>
      <div class="pathway-grid">
        <article><span>01</span><h3>See the result</h3><p>Compare observed, prevalence-balanced, and diagnosis-cluster-balanced performance.</p><a href="#/signals">Explore signals <span aria-hidden="true">→</span></a></article>
        <article><span>02</span><h3>Test an explanation</h3><p>Review mechanisms, literature, observable predictions, confounders, and proposed validation.</p><a href="#/hypotheses">Browse hypotheses <span aria-hidden="true">→</span></a></article>
        <article><span>03</span><h3>Propose a hypothesis</h3><p>State the mechanism, rationale, expected observation, and optional experiment in a guided public form.</p><a href="${discussionHref("ideas")}" target="_blank" rel="noopener">Open proposal form <span aria-hidden="true">↗</span></a></article>
      </div>
    </section>
    <section class="page-width feature-split">
      <div>
        <p class="eyebrow">Built for scientific review</p>
        <h2>Every claim shows how it can be tested.</h2>
        <p>Mechanism, visible features, confounders, validation, sources, and review status stay together. Permanent claim IDs connect discussions, corrections, and experiments.</p>
        <a class="button dark" href="#/hypotheses">Open the explorer</a>
      </div>
      <div class="claim-preview" aria-label="Example claim structure">
        <div class="preview-head"><span class="claim-id">M3</span>${evidencePill("needs claim-level validation")}</div>
        <h3>Candidate morphology or contextual carrier</h3>
        <dl><div><dt>Could reflect</dt><dd>Background tissue, disease mix, or workflow</dd></div><div><dt>Must control</dt><dd>Diagnosis, site, procedure, institution</dd></div><div><dt>Next test</dt><dd>Matched review and independent replication</dd></div></dl>
      </div>
    </section>`;
}

function dossierMatches(dossier) {
  const query = state.search.trim().toLowerCase();
  const candidates = dossier.claims.filter((claim) => {
    if (state.section !== "all" && claim.section !== state.section) return false;
    if (state.evidence !== "all" && claim.evidence_status !== state.evidence) return false;
    return true;
  });
  if (!candidates.length) return false;
  if (state.demographic !== "all" && dossier.demographic !== state.demographic) return false;
  if (!query) return true;
  return `${dossier.organ} ${dossier.demographic_label} ${dossier.summary} ${candidates.map((claim) => `${claim.id} ${claim.hypothesis} ${claim.mechanism}`).join(" ")}`.toLowerCase().includes(query);
}

function evidenceSummary(dossier) {
  const counts = dossier.claims.reduce((accumulator, claim) => {
    accumulator[claim.evidence_status] = (accumulator[claim.evidence_status] || 0) + 1;
    return accumulator;
  }, {});
  if (counts.verified) return `${counts.verified} verified`;
  if (counts["needs claim-level validation"]) return `${counts["needs claim-level validation"]} need review`;
  return "Source gaps remain";
}

function renderHypotheses() {
  const dossiers = [...community.dossiers].sort((a, b) => a.organ.localeCompare(b.organ) || DEMOGRAPHIC_ORDER[a.demographic] - DEMOGRAPHIC_ORDER[b.demographic]);
  const visible = dossiers.filter(dossierMatches);
  app.innerHTML = `${editionBanner()}<section class="explorer-hero"><div class="page-width"><p class="eyebrow">Hypothesis explorer</p><h1>Find the idea behind a signal.</h1><p>Filter explanations by organ, demographic, claim type, or evidence status.</p></div></section>
    <section class="page-width explorer-layout">
      <div class="filter-panel" aria-label="Hypothesis filters">
        <label class="search-field"><span>Search</span><input id="search" type="search" value="${esc(state.search)}" placeholder="Organ, claim, mechanism…"></label>
        <label><span>Demographic</span><select id="demographic"><option value="all">All demographics</option><option value="age">Age</option><option value="race_self_reported_ancestry">Race / ancestry</option><option value="sex">Sex</option></select></label>
        <label><span>Claim section</span><select id="section"><option value="all">All claim sections</option><option value="clinical_context">Clinical context</option><option value="histomorphology">Histomorphology</option></select></label>
        <label><span>Evidence status</span><select id="evidence"><option value="all">All evidence states</option><option value="verified">Verified</option><option value="needs claim-level validation">Needs claim review</option><option value="source metadata incomplete">Source incomplete</option></select></label>
      </div>
      <div class="result-toolbar"><p><strong>${visible.length}</strong> of ${dossiers.length} dossiers</p><button id="clear-filters" type="button">Clear filters</button></div>
      <div class="dossier-grid">${visible.length ? visible.map((dossier) => `<a class="dossier-card" href="${dossierHref(dossier)}">
        <div class="dossier-card-top"><span class="demographic-chip demo-${esc(dossier.demographic)}">${esc(DEMOGRAPHIC_SHORT[dossier.demographic] || dossier.demographic_label)}</span><span>${dossier.claims.length} claims</span></div>
        <h2>${esc(dossier.organ)}</h2><p>${esc(dossier.summary)}</p>
        <div class="dossier-card-footer"><span>${esc(evidenceSummary(dossier))}</span><strong>Open dossier <span aria-hidden="true">→</span></strong></div>
      </a>`).join("") : `<div class="empty-state"><strong>No dossiers match these filters.</strong><p>Clear one or more filters to broaden the explorer.</p></div>`}</div>
    </section>`;

  const controls = { demographic: state.demographic, section: state.section, evidence: state.evidence };
  for (const [id, value] of Object.entries(controls)) {
    const select = document.querySelector(`#${id}`);
    select.value = value;
    select.addEventListener("change", (event) => { state[id] = event.target.value; renderHypotheses(); });
  }
  document.querySelector("#search").addEventListener("input", (event) => { state.search = event.target.value; renderHypotheses(); document.querySelector("#search")?.focus(); });
  document.querySelector("#clear-filters").addEventListener("click", () => { Object.assign(state, { search: "", demographic: "all", section: "all", evidence: "all" }); renderHypotheses(); });
}

function renderLiterature(literature = []) {
  if (!literature.length) return `<p class="source-gap">No claim-level source is linked yet.</p>`;
  return `<ol class="source-list">${literature.map((source) => {
    const href = sourceHref(source);
    const identifier = source.doi ? `DOI ${source.doi}` : source.pmid ? `PMID ${source.pmid}` : "Source";
    return `<li>${href ? `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(source.short_citation || source.citation || identifier)} <span aria-hidden="true">↗</span></a>` : `<span>${esc(source.short_citation || source.citation || "Source metadata incomplete")}</span>`}<small>${esc(identifier)} · ${esc(EVIDENCE_LABEL[source.evidence_status] || source.evidence_status || "Evidence status not assigned")}</small></li>`;
  }).join("")}</ol>`;
}

function renderClaim(dossier, claim) {
  const permalink = `${community.release.siteUrl}${dossierHref(dossier, claim.id)}`;
  const result = resultForDossier(dossier);
  const literature = literatureTrack(claim);
  const observation = result ? `Residual S3 CC AUROC ${formatAuc(result.strategies?.S3_CC?.mean)}; ${Number(result.contrasts?.aboveChanceRetentionPct || 0).toFixed(0)}% of above-chance S1 performance retained.` : "Approved result details are available in the Results Atlas.";
  return `<article id="claim-${esc(claim.id)}" class="claim-card">
    <header><div><span class="claim-id">${esc(claim.id)}</span><span class="taxonomy-chip">${esc(taxonomyLabel(claim))}</span></div><span class="claim-status">${esc(claim.status)}</span></header>
    <h3>${esc(claim.hypothesis)}</h3>
    <div class="evidence-tracks"><div class="track-${literature.tone}"><small>Literature evidence</small><strong>${esc(literature.label)}</strong><span>${esc(literature.detail)}</span></div><div class="track-untested"><small>SAIF evidence</small><strong>Untested</strong><span>No claim-level SAIF test is linked yet</span></div></div>
    <div class="scientific-object">
      <div><h4>Proposed mechanism</h4><p>${esc(claim.mechanism)}</p></div>
      <div><h4>SAIF observation being explained</h4><p>${esc(observation)}</p></div>
      <div><h4>Falsifiable prediction</h4><p>${esc(claim.features || "Not yet specified.")}</p><small>${claim.features ? "Candidate observable features are defined; direction and decision rule still need formalization." : "Incomplete hypothesis: no observable prediction is published."}</small></div>
      <div><h4>Key confounders</h4><p>${esc(claim.confounders)}</p></div>
      <div class="validation-block"><h4>Possible validation experiment</h4><p>${esc(claim.validation || "Not yet specified.")}</p></div>
    </div>
    <details><summary>Literature rationale and sources <span>${claim.literature?.length || 0}</span></summary>${renderLiterature(claim.literature)}</details>
    <footer><a href="${dossierHref(dossier, claim.id)}" aria-label="Permanent link to claim ${esc(claim.id)}">Permalink</a><button class="copy-context" type="button" data-context="${esc(`${dossier.organ} × ${dossier.demographic_label}, claim ${claim.id} — ${permalink}`)}">Copy context</button><a href="${discussionHref("ideas")}" target="_blank" rel="noopener">Propose an alternative hypothesis ↗</a></footer>
  </article>`;
}

function renderDossier(current) {
  const dossier = community.dossiers.find((entry) => entry.organ_slug === current.organ && entry.demographic === current.demographic);
  if (!dossier) {
    app.innerHTML = `<section class="page-width not-found"><p class="eyebrow">Not found</p><h1>This hypothesis dossier is unavailable.</h1><a class="button primary" href="#/hypotheses">Return to explorer</a></section>`;
    return;
  }
  const context = `${dossier.organ} × ${dossier.demographic_label}`;
  const result = resultForDossier(dossier);
  app.innerHTML = `${editionBanner()}<section class="dossier-hero"><div class="page-width">
      <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="#/hypotheses">Hypotheses</a><span aria-hidden="true">/</span><span>${esc(dossier.organ)}</span></nav>
      <div class="dossier-heading"><div><span class="demographic-chip demo-${esc(dossier.demographic)}">${esc(dossier.demographic_label)}</span><h1>${esc(dossier.organ)} <em>×</em> ${esc(dossier.demographic_label)}</h1><p>${esc(dossier.summary)}</p></div>
      <a class="atlas-link-card" href="${esc(atlasHref(dossier))}" target="_blank" rel="noopener"><small>Approved aggregate evidence</small><strong>Open matching Results Atlas dossier</strong><span>Results remain independently audited <b aria-hidden="true">↗</b></span></a></div>
    </div></section>
    <section class="interpretation-boundary"><div class="page-width"><strong>Interpretation boundary</strong><p>These are testable explanations for observed prediction patterns. They do not establish causality, intrinsic demographic biology, or clinical utility. Case mix, access, exposure, sampling, and workflow remain competing explanations.</p></div></section>
    <section class="page-width observation-section">${renderObservation(result, dossier)}</section>
    <section class="page-width dossier-content">
      <div class="claim-section-heading"><div><p class="eyebrow">Clinical context</p><h2>Disease, care pathway, and sampling hypotheses</h2></div><span>${dossier.claims.filter((claim) => claim.section === "clinical_context").length} claims</span></div>
      <div class="claim-list">${dossier.claims.filter((claim) => claim.section === "clinical_context").map((claim) => renderClaim(dossier, claim)).join("") || `<div class="empty-section">No clinical-context claim is currently published.</div>`}</div>
      <div class="claim-section-heading morphology"><div><p class="eyebrow">Histomorphology</p><h2>Candidate H&amp;E-visible carriers</h2></div><span>${dossier.claims.filter((claim) => claim.section === "histomorphology").length} claims</span></div>
      <div class="claim-list">${dossier.claims.filter((claim) => claim.section === "histomorphology").map((claim) => renderClaim(dossier, claim)).join("") || `<div class="empty-section">No histomorphology claim is currently published.</div>`}</div>
    </section>
    <section class="collaboration-panel"><div class="page-width"><div><p class="eyebrow">Contribute a falsifiable idea</p><h2>What else could explain this signal?</h2><p>Include <strong>${esc(context)}</strong> and the permanent claim ID in your post. Discussions are public; never share PHI, restricted data, credentials, or unpublished sensitive results.</p></div><div class="collaboration-actions">
      <a href="${discussionHref("ideas")}" target="_blank" rel="noopener"><strong>Propose a hypothesis</strong><span>State a mechanism, rationale, expected observation, and optional experiment →</span></a>
      <a href="${discussionHref("q-a")}" target="_blank" rel="noopener"><strong>Suggest evidence</strong><span>Add a DOI, PMID, or correction →</span></a>
      <a href="${discussionHref("show-and-tell")}" target="_blank" rel="noopener"><strong>Propose a follow-up study</strong><span>Define a cohort, test, and success criterion →</span></a>
    </div></div></section>`;

  document.querySelectorAll(".copy-context").forEach((button) => button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.context);
      button.textContent = "Copied";
    } catch {
      button.textContent = "Copy unavailable";
    }
  }));
  if (current.claim) requestAnimationFrame(() => document.querySelector(`#claim-${CSS.escape(current.claim)}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
}

function renderGovernance() {
  app.innerHTML = `${editionBanner()}<section class="governance-hero"><div class="page-width"><p class="eyebrow">Methods &amp; governance</p><h1>Separate evidence, hypothesis, and conclusion.</h1><p>The Hub supports public scientific review while protecting unpublished and restricted work.</p></div></section>
    <section class="page-width governance-grid">
      <article><span>01</span><h2>Results remain separate</h2><p>The SAIF Results Atlas remains the sole source for approved aggregate results. The living Hub reads that public bundle at runtime and does not publish a second copy.</p></article>
      <article><span>02</span><h2>Claims remain traceable</h2><p>Each hypothesis has an immutable ID, mechanism category, separate literature and SAIF evidence tracks, confounders, and suggested validation. Claims are retired rather than silently deleted.</p></article>
      <article><span>03</span><h2>Community input is reviewed</h2><p>Discussions can challenge or extend claims, but only human-reviewed pull requests change the public corpus. A discussion or completed experiment is not automatically a paper claim.</p></article>
      <article><span>04</span><h2>Publication is default-deny</h2><p>The release builder allowlists public claim fields. Internal workplans, prompts, rankings, annotations, comments, paths, credentials, identifiers, and unapproved results are excluded.</p></article>
    </section>
    <section class="page-width method-flow"><div class="section-heading"><p class="eyebrow">Evidence workflow</p><h2>How a public hypothesis changes</h2></div><ol><li><strong>SAIF result raises a question</strong><span>Record the exact organ–demographic association and control behavior.</span></li><li><strong>Mechanism is proposed</strong><span>State the rationale, observable prediction, confounders, and possible validation.</span></li><li><strong>Evidence tracks remain separate</strong><span>Literature plausibility does not count as claim-level SAIF support.</span></li><li><strong>Community critiques the hypothesis</strong><span>Surface alternative explanations and conflicting evidence publicly.</span></li><li><strong>Maintainer completes human review</strong><span>Verify exact source support and causal framing before merge.</span></li></ol></section>
    <section class="race-framing"><div class="page-width"><div><p class="eyebrow">Demographic interpretation</p><h2>Race and self-reported ancestry are not direct tissue mechanisms.</h2></div><p>They can proxy pigmentation, geography, exposure, access, referral, institution, diagnosis mix, or other social and technical context. The Hub uses narrower mechanism language only when directly supported and retains competing contextual explanations.</p></div></section>
    <section class="page-width governance-cta"><h2>Read the full community policies.</h2><div><a href="${REPO}/blob/main/GOVERNANCE.md" target="_blank" rel="noopener">Governance <span aria-hidden="true">↗</span></a><a href="${REPO}/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener">Contribution guide <span aria-hidden="true">↗</span></a><a href="${REPO}/blob/main/SECURITY.md" target="_blank" rel="noopener">Sensitive-data reporting <span aria-hidden="true">↗</span></a></div></section>`;
}

function updateNav(page) {
  document.querySelectorAll("[data-nav]").forEach((link) => {
    const active = link.dataset.nav === (page === "dossier" ? "hypotheses" : page);
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page"); else link.removeAttribute("aria-current");
  });
}

function render() {
  if (!community?.dossiers) {
    app.innerHTML = `<section class="page-width not-found"><h1>The public claim bundle could not be loaded.</h1><p>Please report this as a site defect.</p></section>`;
    return;
  }
  const current = route();
  updateNav(current.page);
  if (current.page === "hypotheses") renderHypotheses();
  else if (current.page === "signals") renderSignals();
  else if (current.page === "dossier") renderDossier(current);
  else if (current.page === "governance") renderGovernance();
  else renderHome();
  primaryNav.classList.remove("open");
  menuButton.setAttribute("aria-expanded", "false");
  if (!(current.page === "dossier" && current.claim)) {
    window.scrollTo({ top: 0, behavior: "instant" });
    main.focus({ preventScroll: true });
  }
}

menuButton.addEventListener("click", () => {
  const open = primaryNav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(open));
});
window.addEventListener("hashchange", render);
render();
