const community = window.SAIF_COMMUNITY;
const app = document.querySelector("#app");
const main = document.querySelector("#main-content");
const menuButton = document.querySelector(".menu-button");
const primaryNav = document.querySelector("#primary-nav");

const REPO = "https://github.com/sinai-computational-pathology/saif-community-hub";
const DISCUSSIONS = `${REPO}/discussions`;
const DEMOGRAPHIC_ORDER = { age: 0, race_self_reported_ancestry: 1, sex: 2 };
const DEMOGRAPHIC_SHORT = { age: "Age", race_self_reported_ancestry: "Race / ancestry", sex: "Sex" };
const ATLAS_DEMOGRAPHIC = { age: "age", race_self_reported_ancestry: "race", sex: "sex" };
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
};

function esc(value = "") {
  return String(value).replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]);
}

function route() {
  const hash = location.hash || "#/";
  const dossier = hash.match(/^#\/hypothesis\/([^/]+)\/([^/]+)(?:\/claim\/([^/]+))?$/);
  if (dossier) return { page: "dossier", organ: decodeURIComponent(dossier[1]), demographic: decodeURIComponent(dossier[2]), claim: dossier[3] ? decodeURIComponent(dossier[3]) : null };
  if (hash === "#/hypotheses") return { page: "hypotheses" };
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
  app.innerHTML = `${editionBanner()}
    <section class="hero page-width">
      <div class="hero-copy">
        <p class="eyebrow">Pan-organ demographic signal research</p>
        <h1>From model signal to a <em>testable pathology hypothesis.</em></h1>
        <p class="hero-lede">Explore the results, literature-based explanations, and ways to contribute.</p>
        <div class="hero-actions">
          <a class="button primary" href="#/hypotheses">Explore hypotheses</a>
          <a class="button secondary" href="${esc(community.release.atlasUrl)}" target="_blank" rel="noopener">Inspect results <span aria-hidden="true">↗</span></a>
          <a class="text-link" href="${DISCUSSIONS}" target="_blank" rel="noopener">Join the discussion <span aria-hidden="true">→</span></a>
        </div>
      </div>
      <aside class="hero-atlas-card" aria-label="Community corpus summary">
        <div class="signal-orbit" aria-hidden="true"><i></i><i></i><i></i><b>H&amp;E</b></div>
        <div class="metric-row"><strong>${stats.dossiers}</strong><span>organ–demographic dossiers</span></div>
        <div class="metric-row"><strong>${stats.claims}</strong><span>testable claims</span></div>
        <div class="metric-row"><strong>${stats.citations}</strong><span>linked sources</span></div>
        <p>Living edition · human-reviewed updates</p>
      </aside>
    </section>
    <section class="caution-band">
      <div class="page-width caution-inner"><span class="caution-mark" aria-hidden="true">!</span><p><strong>Prediction is not mechanism.</strong> Signal may reflect diagnosis mix, sampling, access, exposure, workflow, or morphology. These hypotheses guide follow-up; they are not causal conclusions.</p></div>
    </section>
    <section class="page-width pathway-section">
      <div class="section-heading"><p class="eyebrow">Research path</p><h2>Review the evidence. Test the explanation. Plan what comes next.</h2></div>
      <div class="pathway-grid">
        <article><span>01</span><h3>Observe</h3><p>Review audited aggregate results for each organ–demographic combination.</p><a href="${esc(community.release.atlasUrl)}" target="_blank" rel="noopener">Open Results Atlas <span aria-hidden="true">↗</span></a></article>
        <article><span>02</span><h3>Interpret</h3><p>Compare hypotheses, evidence, confounders, and gaps.</p><a href="#/hypotheses">Browse hypothesis dossiers <span aria-hidden="true">→</span></a></article>
        <article><span>03</span><h3>Collaborate</h3><p>Critique claims, add literature, propose studies, or connect with collaborators.</p><a href="${DISCUSSIONS}" target="_blank" rel="noopener">Join discussions <span aria-hidden="true">↗</span></a></article>
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
  return `<article id="claim-${esc(claim.id)}" class="claim-card">
    <header><div><span class="claim-id">${esc(claim.id)}</span><span class="claim-status">${esc(claim.status)}</span></div>${evidencePill(claim.evidence_status)}</header>
    <h3>${esc(claim.hypothesis)}</h3>
    <p class="mechanism"><strong>Potential mechanism</strong>${esc(claim.mechanism)}</p>
    <div class="claim-details">
      <div><h4>Features to inspect</h4><p>${esc(claim.features)}</p></div>
      <div><h4>Key confounders</h4><p>${esc(claim.confounders)}</p></div>
      <div class="validation-block"><h4>Suggested validation</h4><p>${esc(claim.validation)}</p></div>
    </div>
    <details><summary>Source trail <span>${claim.literature?.length || 0}</span></summary>${renderLiterature(claim.literature)}</details>
    <footer><a href="${dossierHref(dossier, claim.id)}" aria-label="Permanent link to claim ${esc(claim.id)}">Permalink</a><button class="copy-context" type="button" data-context="${esc(`${dossier.organ} × ${dossier.demographic_label}, claim ${claim.id} — ${permalink}`)}">Copy discussion context</button></footer>
  </article>`;
}

function renderDossier(current) {
  const dossier = community.dossiers.find((entry) => entry.organ_slug === current.organ && entry.demographic === current.demographic);
  if (!dossier) {
    app.innerHTML = `<section class="page-width not-found"><p class="eyebrow">Not found</p><h1>This hypothesis dossier is unavailable.</h1><a class="button primary" href="#/hypotheses">Return to explorer</a></section>`;
    return;
  }
  const context = `${dossier.organ} × ${dossier.demographic_label}`;
  app.innerHTML = `${editionBanner()}<section class="dossier-hero"><div class="page-width">
      <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="#/hypotheses">Hypotheses</a><span aria-hidden="true">/</span><span>${esc(dossier.organ)}</span></nav>
      <div class="dossier-heading"><div><span class="demographic-chip demo-${esc(dossier.demographic)}">${esc(dossier.demographic_label)}</span><h1>${esc(dossier.organ)} <em>×</em> ${esc(dossier.demographic_label)}</h1><p>${esc(dossier.summary)}</p></div>
      <a class="atlas-link-card" href="${esc(atlasHref(dossier))}" target="_blank" rel="noopener"><small>Approved aggregate evidence</small><strong>Open matching Results Atlas dossier</strong><span>Results remain independently audited <b aria-hidden="true">↗</b></span></a></div>
    </div></section>
    <section class="interpretation-boundary"><div class="page-width"><strong>Interpretation boundary</strong><p>These are testable explanations for observed prediction patterns. They do not establish causality, intrinsic demographic biology, or clinical utility. Case mix, access, exposure, sampling, and workflow remain competing explanations.</p></div></section>
    <section class="page-width dossier-content">
      <div class="claim-section-heading"><div><p class="eyebrow">Clinical context</p><h2>Disease, care pathway, and sampling hypotheses</h2></div><span>${dossier.claims.filter((claim) => claim.section === "clinical_context").length} claims</span></div>
      <div class="claim-list">${dossier.claims.filter((claim) => claim.section === "clinical_context").map((claim) => renderClaim(dossier, claim)).join("") || `<div class="empty-section">No clinical-context claim is currently published.</div>`}</div>
      <div class="claim-section-heading morphology"><div><p class="eyebrow">Histomorphology</p><h2>Candidate H&amp;E-visible carriers</h2></div><span>${dossier.claims.filter((claim) => claim.section === "histomorphology").length} claims</span></div>
      <div class="claim-list">${dossier.claims.filter((claim) => claim.section === "histomorphology").map((claim) => renderClaim(dossier, claim)).join("") || `<div class="empty-section">No histomorphology claim is currently published.</div>`}</div>
    </section>
    <section class="collaboration-panel"><div class="page-width"><div><p class="eyebrow">Move the evidence forward</p><h2>Challenge, extend, or test this dossier.</h2><p>Include <strong>${esc(context)}</strong> and the permanent claim ID in your post. Discussions are public; never share PHI, restricted data, credentials, or unpublished sensitive results.</p></div><div class="collaboration-actions">
      <a href="${discussionHref("ideas")}" target="_blank" rel="noopener"><strong>Discuss a hypothesis</strong><span>Offer a critique or alternative explanation →</span></a>
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
      <article><span>01</span><h2>Results remain separate</h2><p>The SAIF Results Atlas is the sole public source for approved aggregate experiment results. The Hub links to it by stable organ–demographic route and never copies its performance data.</p></article>
      <article><span>02</span><h2>Claims remain traceable</h2><p>Each hypothesis has an immutable ID, evidence status, source trail, confounders, and suggested validation. Claims are retired rather than silently deleted.</p></article>
      <article><span>03</span><h2>Community input is reviewed</h2><p>Discussions can challenge or extend claims, but only human-reviewed pull requests change the public corpus. A discussion or completed experiment is not automatically a paper claim.</p></article>
      <article><span>04</span><h2>Publication is default-deny</h2><p>The release builder allowlists public claim fields. Internal workplans, prompts, rankings, annotations, comments, paths, credentials, identifiers, and unapproved results are excluded.</p></article>
    </section>
    <section class="page-width method-flow"><div class="section-heading"><p class="eyebrow">Evidence workflow</p><h2>How a public claim changes</h2></div><ol><li><strong>Literature or result raises a question</strong><span>Record the exact organ–demographic context.</span></li><li><strong>Structured claim is proposed</strong><span>State mechanism, features, confounders, validation, and source identifiers.</span></li><li><strong>Community critiques the claim</strong><span>Surface alternative explanations and conflicting evidence publicly.</span></li><li><strong>Maintainer completes human review</strong><span>Verify exact source support and causal framing before merge.</span></li><li><strong>Living edition updates</strong><span>Frozen paper supplements remain unchanged; corrections receive a new version.</span></li></ol></section>
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
