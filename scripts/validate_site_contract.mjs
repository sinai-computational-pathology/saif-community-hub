import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const bundleSource = fs.readFileSync(path.join(repoDir, "_site", "claims_bundle.js"), "utf8");
const bundle = JSON.parse(bundleSource.replace(/^window\.SAIF_COMMUNITY\s*=\s*/, "").replace(/;\s*$/, ""));
const demoMap = { age: "age", race_self_reported_ancestry: "race", sex: "sex" };
const expectedDiscussionForms = [
  "announcements.yml",
  "general.yml",
  "ideas.yml",
  "q-a.yml",
  "show-and-tell.yml",
];
const failures = [];
const seenCombos = new Set();

for (const dossier of bundle.dossiers) {
  if (seenCombos.has(dossier.combo)) failures.push(`duplicate dossier ${dossier.combo}`);
  seenCombos.add(dossier.combo);
  if (!demoMap[dossier.demographic]) failures.push(`unmapped Atlas demographic ${dossier.demographic}`);
  const ids = new Set();
  for (const claim of dossier.claims) {
    if (ids.has(claim.id)) failures.push(`duplicate claim permalink ${dossier.combo}:${claim.id}`);
    ids.add(claim.id);
  }
}

for (const filename of expectedDiscussionForms) {
  if (!fs.existsSync(path.join(repoDir, ".github", "DISCUSSION_TEMPLATE", filename))) failures.push(`missing Discussion form ${filename}`);
}

const appSource = fs.readFileSync(path.join(repoDir, "_site", "app.js"), "utf8");
for (const category of ["ideas", "q-a", "show-and-tell"]) {
  if (!appSource.includes(`discussionHref("${category}")`)) failures.push(`missing dossier action for ${category}`);
}
if (!appSource.includes("#/combo/")) failures.push("missing Results Atlas deep-link contract");

if (failures.length) {
  failures.forEach((failure) => console.error(`SITE CONTRACT FAILED: ${failure}`));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    contract: "passed",
    dossierRoutes: bundle.dossiers.length,
    claimPermalinks: bundle.dossiers.reduce((count, dossier) => count + dossier.claims.length, 0),
    discussionForms: expectedDiscussionForms.length,
  }, null, 2));
}
