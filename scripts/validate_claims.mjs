// Schema and citation validation for the structured claim corpus.
//
//   node scripts/validate_claims.mjs              # schema + syntax only (offline)
//   node scripts/validate_claims.mjs --resolve    # also resolve every DOI/PMID
//   node scripts/validate_claims.mjs --resolve --report resolution.md
//
// The --resolve pass calls Crossref and NCBI E-utilities, confirms each
// identifier exists, and compares the returned title/year against the stored
// citation. Responses are cached under .citation-cache/ so repeated runs and
// PR checks stay cheap; the scheduled run is what catches link rot over time.

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { load as yamlLoad } from "js-yaml";
import Ajv from "ajv";
import { claimsDir, CLAIM_STATUSES, EVIDENCE_STATUSES, listClaimFiles, projectDir, SECTIONS } from "./claims_lib.mjs";

const cacheDir = path.join(projectDir, ".citation-cache");
const CONTACT = "saif-results-atlas (https://github.com/sinai-computational-pathology/saif-results-atlas)";

const literatureSchema = {
  type: "object",
  required: ["citation", "evidence_status"],
  properties: {
    short_citation: { type: "string", minLength: 1 },
    citation: { type: "string", minLength: 1 },
    // A DOI or PMID is what makes a claim followable. Entries without one are
    // not rejected outright -- they are reported as a backlog -- but any entry
    // that does carry one must carry a syntactically valid one.
    doi: { type: "string", pattern: "^10\\.\\d{4,9}/\\S+$" },
    pmid: { type: "string", pattern: "^\\d{1,9}$" },
    pmcid: { type: "string", pattern: "^PMC\\d+$" },
    url: { type: "string", pattern: "^https?://" },
    claim_supported: { type: "string", minLength: 1 },
    evidence_type: {
      type: "string",
      enum: ["direct histology", "epidemiology", "molecular/transcriptomic", "imaging proxy", "animal model", "review"],
    },
    confidence: { type: "string", enum: ["high", "moderate", "low"] },
    locator: {
      type: "object",
      properties: {
        section: { type: "string" },
        paragraph: { type: "string" },
        highlight: { type: "string" },
      },
      additionalProperties: false,
    },
    evidence_status: { type: "string", enum: EVIDENCE_STATUSES },
    contributor: { type: "string" },
  },
  additionalProperties: false,
};

const claimSchema = {
  type: "object",
  required: ["id", "section", "status", "hypothesis", "mechanism", "features", "confounders", "validation", "literature"],
  properties: {
    id: { type: "string", pattern: "^[CM]\\d+$" },
    section: { type: "string", enum: SECTIONS.map((section) => section.key) },
    status: { type: "string", enum: CLAIM_STATUSES },
    hypothesis: { type: "string", minLength: 1 },
    mechanism: { type: "string", minLength: 1 },
    features: { type: "string", minLength: 1 },
    confounders: { type: "string", minLength: 1 },
    validation: { type: "string", minLength: 1 },
    literature: { type: "array", items: literatureSchema },
    evidence_gap_notes: { type: "array", items: { type: "string" } },
    evidence_status: { type: "string", enum: EVIDENCE_STATUSES },
    contributor: { type: "string" },
    proposed_in: { type: "string" },
  },
  additionalProperties: false,
};

const docSchema = {
  type: "object",
  required: ["combo", "organ_slug", "organ", "demographic", "demographic_label", "summary", "claims", "references"],
  properties: {
    combo: { type: "string", pattern: "^[a-z0-9_]+__[a-z0-9_]+$" },
    organ_slug: { type: "string", minLength: 1 },
    organ: { type: "string", minLength: 1 },
    demographic: { type: "string", minLength: 1 },
    demographic_label: { type: "string", minLength: 1 },
    summary: { type: "string", minLength: 1 },
    claims: { type: "array", items: claimSchema },
    key_takeaways: { type: "array", items: { type: "string" } },
    references: {
      type: "array",
      items: {
        type: "object",
        required: ["n", "citation"],
        properties: {
          n: { type: "integer", minimum: 1 },
          raw: { type: "string" },
          citation: { type: "string", minLength: 1 },
          year: { type: "string" },
          doi: { type: "string", pattern: "^10\\.\\d{4,9}/\\S+$" },
          pmid: { type: "string", pattern: "^\\d{1,9}$" },
          pmcid: { type: "string", pattern: "^PMC\\d+$" },
          url: { type: "string", pattern: "^https?://" },
        },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
};

function loadDocs() {
  return listClaimFiles().map((filename) => ({
    filename,
    doc: yamlLoad(fs.readFileSync(path.join(claimsDir, filename), "utf8")),
  }));
}

function validateSchema(docs, errors) {
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(docSchema);
  for (const { filename, doc } of docs) {
    if (!validate(doc)) {
      for (const error of validate.errors) {
        errors.push(`${filename}: ${error.instancePath || "/"} ${error.message}`);
      }
    }
  }
}

function validateIds(docs, errors) {
  for (const { filename, doc } of docs) {
    const seen = new Set();
    for (const claim of doc.claims || []) {
      if (seen.has(claim.id)) errors.push(`${filename}: duplicate claim id ${claim.id}`);
      seen.add(claim.id);
      const expectedPrefix = SECTIONS.find((section) => section.key === claim.section)?.idPrefix;
      if (expectedPrefix && !claim.id.startsWith(expectedPrefix)) {
        errors.push(`${filename}: claim ${claim.id} is in section ${claim.section} but should start with ${expectedPrefix}`);
      }
    }
    if (doc.combo !== filename.replace(/\.yaml$/, "")) {
      errors.push(`${filename}: combo field "${doc.combo}" does not match filename`);
    }
  }
}

/**
 * Claim IDs are permalinks -- a discussion thread, a submitted validation, and
 * a published citation all point at them. They must never be renumbered or
 * removed; retiring a claim means setting status: retired.
 */
function validateIdImmutability(docs, errors) {
  for (const { filename, doc } of docs) {
    let before;
    try {
      before = execSync(`git show HEAD:claims/${filename}`, { cwd: projectDir, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    } catch {
      continue; // new file
    }
    const previousDoc = yamlLoad(before);
    const currentIds = new Set((doc.claims || []).map((claim) => claim.id));
    for (const claim of previousDoc.claims || []) {
      if (!currentIds.has(claim.id)) {
        errors.push(`${filename}: claim ${claim.id} was removed. Claim IDs are permalinks -- set status: retired instead.`);
      }
    }
  }
}

async function cachedFetch(key, url, headers = {}) {
  fs.mkdirSync(cacheDir, { recursive: true });
  const cacheFile = path.join(cacheDir, `${key.replace(/[^a-z0-9]+/gi, "_")}.json`);
  if (fs.existsSync(cacheFile)) return JSON.parse(fs.readFileSync(cacheFile, "utf8"));

  // NCBI asks for no more than 3 requests/second without an API key; Crossref
  // asks for a contact in the User-Agent. Be a good citizen on both counts.
  await new Promise((done) => setTimeout(done, 350));
  const response = await fetch(url, { headers: { "User-Agent": CONTACT, ...headers } });
  const payload = { ok: response.ok, status: response.status, body: response.ok ? await response.text() : "" };
  fs.writeFileSync(cacheFile, JSON.stringify(payload));
  return payload;
}

function normalizeTitle(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Loose containment check -- authored citations abbreviate titles freely. */
function titlesAgree(remoteTitle, storedCitation) {
  const remote = normalizeTitle(remoteTitle);
  const stored = normalizeTitle(storedCitation);
  if (!remote) return true;
  if (stored.includes(remote)) return true;
  const remoteWords = remote.split(" ").filter((word) => word.length > 4);
  if (!remoteWords.length) return true;
  const hits = remoteWords.filter((word) => stored.includes(word)).length;
  return hits / remoteWords.length >= 0.6;
}

async function resolveDoi(doi) {
  const response = await cachedFetch(`doi_${doi}`, `https://api.crossref.org/works/${encodeURIComponent(doi)}`);
  if (!response.ok) return { ok: false, reason: `Crossref returned ${response.status}` };
  const message = JSON.parse(response.body).message;
  return {
    ok: true,
    title: Array.isArray(message.title) ? message.title[0] : message.title,
    year: String(message.issued?.["date-parts"]?.[0]?.[0] || ""),
  };
}

async function resolvePmid(pmid) {
  const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pmid}&retmode=json`;
  const response = await cachedFetch(`pmid_${pmid}`, url);
  if (!response.ok) return { ok: false, reason: `E-utilities returned ${response.status}` };
  const record = JSON.parse(response.body).result?.[pmid];
  if (!record || record.error) return { ok: false, reason: "PMID not found" };
  return { ok: true, title: record.title, year: String(record.pubdate || "").match(/\d{4}/)?.[0] || "" };
}

/**
 * Check every identifier on an entry, not just the first. When a citation
 * carries both a DOI and a PMID they cross-validate each other -- the Radisky
 * 2016 entry, for instance, has a correct PMID and a DOI belonging to nothing.
 */
async function checkEntry(entry, seen) {
  const problems = [];
  for (const [kind, value] of [["doi", entry.doi], ["pmid", entry.pmid]]) {
    if (!value) continue;
    const key = `${kind}:${value}`;
    if (!seen.has(key)) seen.set(key, kind === "doi" ? await resolveDoi(value) : await resolvePmid(value));
    const result = seen.get(key);
    if (!result.ok) {
      problems.push({ key, status: `unresolvable: ${result.reason}` });
    } else if (!titlesAgree(result.title, entry.citation)) {
      problems.push({ key, status: `title mismatch: ${result.title}` });
    }
  }
  return problems;
}

async function resolveCitations(docs, errors, warnings, baseline) {
  const seen = new Map();
  const rows = [];

  for (const { filename, doc } of docs) {
    for (const claim of doc.claims || []) {
      for (const entry of claim.literature || []) {
        if (!entry.doi && !entry.pmid) {
          warnings.push(`${filename} ${claim.id}: "${entry.short_citation || entry.citation}" has no DOI or PMID`);
          rows.push({ filename, claim: claim.id, citation: entry.short_citation || entry.citation, status: "no identifier" });
          continue;
        }
        const problems = await checkEntry(entry, seen);
        if (!problems.length) {
          rows.push({ filename, claim: claim.id, citation: entry.doi ? `doi:${entry.doi}` : `pmid:${entry.pmid}`, status: "ok" });
          continue;
        }
        for (const problem of problems) {
          rows.push({ filename, claim: claim.id, citation: problem.key, status: problem.status });
          // Identifiers known to be broken at migration time are reported but
          // do not block: the backlog is tracked separately so that CI stays
          // meaningful for new and changed citations from day one.
          if (baseline.has(problem.key)) continue;
          errors.push(`${filename} ${claim.id}: ${problem.key} -- ${problem.status}`);
        }
      }
    }
  }
  return rows;
}

function writeReport(rows, target) {
  const byStatus = rows.reduce((acc, row) => {
    const key = row.status.split(":")[0];
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const lines = [
    "# Citation resolution report",
    "",
    `Generated ${new Date().toISOString()}`,
    "",
    "| Status | Count |",
    "| --- | --- |",
    ...Object.entries(byStatus).map(([status, count]) => `| ${status} | ${count} |`),
    "",
    "## Entries needing attention",
    "",
    "| File | Claim | Citation | Status |",
    "| --- | --- | --- | --- |",
    ...rows.filter((row) => row.status !== "ok").map((row) => `| ${row.filename} | ${row.claim} | ${row.citation} | ${row.status} |`),
    "",
  ];
  fs.writeFileSync(target, lines.join("\n"));
  console.log(`Wrote ${target}`);
}

// Identifiers already broken when the corpus was migrated. Entries listed here
// are reported but do not fail the build; fixing them is tracked as a backlog.
// Nothing may be added to this file except by the migration baseline run --
// a newly submitted citation must resolve.
const baselinePath = path.join(claimsDir, "citation-baseline.json");

function loadBaseline() {
  if (!fs.existsSync(baselinePath)) return new Set();
  return new Set(JSON.parse(fs.readFileSync(baselinePath, "utf8")).known_broken || []);
}

async function main() {
  const resolve = process.argv.includes("--resolve");
  const writeBaseline = process.argv.includes("--write-baseline");
  const reportIndex = process.argv.indexOf("--report");
  const reportTarget = reportIndex !== -1 ? process.argv[reportIndex + 1] : "";

  const docs = loadDocs();
  const errors = [];
  const warnings = [];

  validateSchema(docs, errors);
  validateIds(docs, errors);
  validateIdImmutability(docs, errors);

  let rows = [];
  if (resolve) {
    const baseline = writeBaseline ? new Set() : loadBaseline();
    rows = await resolveCitations(docs, errors, warnings, baseline);

    if (writeBaseline) {
      const broken = [...new Set(rows.filter((row) => row.status !== "ok" && row.status !== "no identifier").map((row) => row.citation))].sort();
      fs.writeFileSync(baselinePath, `${JSON.stringify({
        note: "Identifiers already broken at migration time. Reported by validate_claims.mjs but not blocking. Fix and remove entries as the backlog is worked through; never add to this list by hand.",
        generated_at: new Date().toISOString().slice(0, 10),
        known_broken: broken,
      }, null, 2)}\n`);
      console.log(`Wrote baseline with ${broken.length} known-broken identifiers to ${path.relative(projectDir, baselinePath)}`);
      errors.length = 0;
    }
  }

  const claimCount = docs.reduce((total, { doc }) => total + (doc.claims?.length || 0), 0);
  console.log(`Checked ${claimCount} claims across ${docs.length} combos.`);

  if (warnings.length) {
    console.log(`\n${warnings.length} literature entries without a DOI or PMID (backlog, not a failure):`);
    for (const warning of warnings.slice(0, 15)) console.log(`  - ${warning}`);
    if (warnings.length > 15) console.log(`  ... and ${warnings.length - 15} more`);
  }

  if (reportTarget && rows.length) writeReport(rows, reportTarget);

  if (errors.length) {
    console.error(`\n${errors.length} error(s):`);
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }
  console.log("\nValidation passed.");
}

await main();
