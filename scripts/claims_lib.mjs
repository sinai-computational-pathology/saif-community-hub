// Shared parsing/serialisation helpers for the structured claim corpus.
//
// The organ deep dives were originally authored as Markdown tables. Markdown is
// unreviewable as a contribution format: a submitted claim cannot be schema
// checked, diffed, or merged into a table cell by a bot. These helpers invert
// the relationship -- YAML under claims/ is the source of truth, and the
// Markdown under organ_deep_dives/ is generated from it.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const projectDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const deepDiveDir = path.join(projectDir, "organ_deep_dives");
export const claimsDir = path.join(projectDir, "claims");

export const SECTIONS = [
  { key: "clinical_context", heading: "Disease Prevalence / Clinical Context Hypotheses", idPrefix: "C" },
  { key: "histomorphology", heading: "Histomorphological / Biological Variation Hypotheses", idPrefix: "M" },
];

// The two hypothesis tables use slightly different wording for column 4; both
// mean the same thing, so the YAML keeps one field name and the generator
// restores the per-section heading.
export const COLUMN_FIELDS = ["id", "hypothesis", "mechanism", "features", "confounders", "validation", "supporting_literature"];
export const FEATURES_HEADING = {
  clinical_context: "H&E / metadata features to inspect",
  histomorphology: "H&E features to inspect",
};
export const TABLE_HEADINGS = [
  "ID",
  "Hypothesis",
  "Potential mechanism",
  null, // per-section, see FEATURES_HEADING
  "Main confounders or matching variables",
  "Suggested validation",
  "Supporting literature",
];

export const CLAIM_STATUSES = ["active", "retired", "proposed"];
export const EVIDENCE_STATUSES = ["verified", "needs claim-level validation", "source metadata incomplete"];

export function splitRow(line) {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

export function isSeparatorRow(line) {
  return /^\|[\s:|-]+\|$/.test(line.trim());
}

/** Split a section of Markdown into its lead paragraphs and its first table. */
export function extractTable(lines) {
  const start = lines.findIndex((line) => line.trim().startsWith("|"));
  if (start === -1) return { before: lines, rows: [], header: [] };
  let end = start;
  while (end < lines.length && lines[end].trim().startsWith("|")) end += 1;
  const tableLines = lines.slice(start, end).filter((line) => !isSeparatorRow(line));
  const [header, ...rows] = tableLines.map(splitRow);
  return { before: lines.slice(0, start), rows, header, after: lines.slice(end) };
}

/**
 * Parse a numbered reference line into a structured record.
 * Handles the two styles present in the corpus: `PMID: x. PMCID: y. DOI: z.`
 * and a trailing bare URL.
 */
export function parseReference(raw, index) {
  const text = raw.replace(/^\d+\.\s*/, "").trim();
  // DOIs contain periods, so the match must run to whitespace and only then
  // shed trailing sentence punctuation -- a non-greedy stop at the first "."
  // truncates 10.1038/sj.bjc.6604635 to 10.1038/sj.
  const doi = text.match(/\bDOI:\s*(10\.\S+)/i)?.[1]?.replace(/[.,;)\]]+$/, "") || "";
  const pmid = text.match(/\bPMID:\s*(\d+)/i)?.[1] || "";
  // Only an explicit PMCID label counts -- a PMC id appearing inside a URL is
  // not something the author wrote as a separate field.
  const pmcid = text.match(/\bPMCID:\s*(PMC\d+)/i)?.[1] || "";
  const url = text.match(/\bhttps?:\/\/\S+/)?.[0]?.replace(/[.,;]+$/, "") || "";

  // Citation text is everything before the identifier run. Identifier tokens
  // are removed together with the punctuation that separated them, otherwise
  // "2015. PMID: x; PMCID: y." collapses to a stray "; .".
  const citation = text
    .replace(/\bPMID:\s*\d+\s*[;,.]?/gi, "")
    .replace(/\bPMCID:\s*PMC\d+\s*[;,.]?/gi, "")
    .replace(/\bDOI:\s*10\.\S+/gi, "")
    .replace(/\bhttps?:\/\/\S+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/[;,.\s]+$/, "");

  // Some references carry more than one year ("2017/2020 indexed"); keep them
  // all so a short citation can match any of them.
  const years = citation.match(/\b(19|20)\d{2}\b/g) || [];
  const firstAuthorSurname = matchSurname(citation);

  // `raw` is the authored line, emitted verbatim by the generator so that
  // regenerating Markdown never reformats a human-curated citation. The parsed
  // fields alongside it are what CI validates and what the viewer links to.
  const record = { n: index + 1, raw: text, citation, year: years[0] || "" };
  if (doi) record.doi = doi;
  if (pmid) record.pmid = pmid;
  if (pmcid) record.pmcid = pmcid;
  if (url) record.url = url;
  record._firstAuthorSurname = firstAuthorSurname;
  record._years = years;
  record._raw = text;
  return record;
}

// Surnames in this corpus include lowercase nobiliary particles ("van
// Blankenstein") and non-ASCII letters ("Dąbrowska"), so a plain [A-Z][a-z]+
// match drops real citations.
const SURNAME_PARTICLES = "(?:van|von|de|del|della|di|da|dos|du|la|le|ten|ter)";
const SURNAME_RE = new RegExp(`^(${SURNAME_PARTICLES}\\s+)?(\\p{Lu}[\\p{L}'’-]+)`, "u");

export function matchSurname(text) {
  const match = text.trim().match(SURNAME_RE);
  if (!match) return "";
  return `${match[1] || ""}${match[2]}`.trim();
}

// Several "Supporting literature" cells hold editorial notes rather than
// citations ("modern source needed", "E40 incomplete"). They are provenance
// about a gap, not a source, and must not be validated as one.
const EDITORIAL_NOTE_RE = /^(?:E\d+\b|needs?\b|no\b|modern source|stronger source|pending\b|tbd\b|none\b)/i;

export function isEditorialNote(text) {
  const cleaned = text.trim();
  if (!cleaned) return false;
  if (EDITORIAL_NOTE_RE.test(cleaned)) return true;
  // A citation always carries a surname; a note usually does not.
  return !matchSurname(cleaned) && !/\b(19|20)\d{2}\b/.test(cleaned);
}

/**
 * Match a short in-table citation ("Radisky et al., 2016") to a numbered
 * reference in the same file. Surname plus year is unambiguous within a single
 * deep dive; anything that does not match is preserved verbatim so no evidence
 * is silently dropped.
 */
export function matchReference(shortCitation, references) {
  const cleaned = shortCitation.trim().replace(/\.$/, "");
  if (!cleaned) return null;
  const surname = matchSurname(cleaned);
  const year = cleaned.match(/\b(19|20)\d{2}\b/)?.[0] || "";

  const candidates = references.filter((ref) => {
    const surnameHit = surname && ref._firstAuthorSurname.toLowerCase() === surname.toLowerCase();
    const yearHit = year && ref._years.includes(year);
    if (surname && year) return surnameHit && yearHit;
    if (surname) return surnameHit;
    return false;
  });
  if (candidates.length === 1) return candidates[0];

  // Fall back to a containment check against the full reference text.
  const loose = references.filter((ref) => surname && ref._raw.toLowerCase().includes(surname.toLowerCase()) && (!year || ref._years.includes(year)));
  return loose.length === 1 ? loose[0] : null;
}

export function comboFromFilename(filename) {
  const base = filename.replace(/\.md$/, "");
  const [organSlug, demographic] = base.split("__");
  return { organSlug, demographic, base };
}

export function listDeepDives() {
  return fs.readdirSync(deepDiveDir).filter((name) => name.endsWith(".md")).sort();
}

export function listClaimFiles() {
  if (!fs.existsSync(claimsDir)) return [];
  return fs.readdirSync(claimsDir).filter((name) => name.endsWith(".yaml")).sort();
}
