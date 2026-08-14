import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as yaml from "js-yaml";

const repoDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const claimsDir = path.join(repoDir, "claims");
const siteSource = path.join(repoDir, "site");
const siteDir = path.join(repoDir, "_site");
const sourceManifest = JSON.parse(fs.readFileSync(path.join(repoDir, "community_release_manifest.json"), "utf8"));

const claimFiles = fs.readdirSync(claimsDir).filter((name) => name.endsWith(".yaml")).sort();
const dossiers = claimFiles.map((filename) => {
  const dossier = yaml.load(fs.readFileSync(path.join(claimsDir, filename), "utf8"));
  return { ...dossier, filename };
});

const claims = dossiers.flatMap((dossier) => dossier.claims.map((claim) => ({
  ...claim,
  combo: dossier.combo,
  organ_slug: dossier.organ_slug,
  organ: dossier.organ,
  demographic: dossier.demographic,
  demographic_label: dossier.demographic_label,
})));
const organs = [...new Set(dossiers.map((dossier) => dossier.organ_slug))];
const citations = new Set(dossiers.flatMap((dossier) => dossier.claims.flatMap((claim) => claim.literature || []).map((entry) => entry.doi || entry.pmid || entry.url || entry.citation)).filter(Boolean));

const bundle = {
  schemaVersion: 1,
  edition: "living",
  generatedAt: new Date().toISOString(),
  release: sourceManifest,
  stats: {
    dossiers: dossiers.length,
    claims: claims.length,
    organs: organs.length,
    citations: citations.size,
    verifiedClaims: claims.filter((claim) => claim.evidence_status === "verified").length,
  },
  dossiers,
};

fs.rmSync(siteDir, { recursive: true, force: true });
fs.mkdirSync(siteDir, { recursive: true });
fs.cpSync(siteSource, siteDir, { recursive: true });
if (fs.existsSync(path.join(repoDir, "supplement"))) {
  fs.cpSync(path.join(repoDir, "supplement"), path.join(siteDir, "supplement"), { recursive: true });
}

const serialized = JSON.stringify(bundle);
fs.writeFileSync(path.join(siteDir, "claims_bundle.js"), `window.SAIF_COMMUNITY = ${serialized};\n`);
const releaseManifest = {
  ...sourceManifest,
  edition: "living",
  generatedAt: bundle.generatedAt,
  ...bundle.stats,
  bundleSha256: crypto.createHash("sha256").update(serialized).digest("hex"),
};
fs.writeFileSync(path.join(siteDir, "release_manifest.json"), `${JSON.stringify(releaseManifest, null, 2)}\n`);

console.log(JSON.stringify({ build: "complete", siteDir, ...bundle.stats }, null, 2));
