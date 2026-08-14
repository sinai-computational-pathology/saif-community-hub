import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const siteDir = path.join(repoDir, "_site");
const version = process.argv.find((argument) => /^v\d+(\.\d+)*$/.test(argument)) || "v1";
const verifyOnly = process.argv.includes("--verify");
const snapshotDir = path.join(repoDir, "supplement", version);

if (!fs.existsSync(siteDir)) throw new Error("Build the living site before freezing a supplement.");
if (verifyOnly) {
  if (!fs.existsSync(snapshotDir)) throw new Error(`Supplement ${version} does not exist.`);
  const manifest = JSON.parse(fs.readFileSync(path.join(snapshotDir, "snapshot_manifest.json"), "utf8"));
  const files = fs.readdirSync(snapshotDir).filter((name) => name !== "snapshot_manifest.json").sort();
  for (const file of files) {
    const digest = crypto.createHash("sha256").update(fs.readFileSync(path.join(snapshotDir, file))).digest("hex");
    if (manifest.files[file] !== digest) throw new Error(`Supplement ${version} changed: ${file}`);
  }
  console.log(JSON.stringify({ snapshot: version, verification: "passed", files: files.length }, null, 2));
  process.exit(0);
}
if (fs.existsSync(snapshotDir)) throw new Error(`Supplement ${version} already exists and is immutable.`);

fs.mkdirSync(snapshotDir, { recursive: true });
for (const name of fs.readdirSync(siteDir)) {
  if (name === "supplement") continue;
  fs.cpSync(path.join(siteDir, name), path.join(snapshotDir, name), { recursive: true });
}

const bundlePath = path.join(snapshotDir, "claims_bundle.js");
const bundle = JSON.parse(fs.readFileSync(bundlePath, "utf8").replace(/^window\.SAIF_COMMUNITY\s*=\s*/, "").replace(/;\s*$/, ""));
bundle.edition = "frozen";
bundle.release.siteUrl = `${bundle.release.siteUrl}supplement/${version}/`;
bundle.release.atlasUrl = `${bundle.release.atlasUrl}supplement/${version}/`;
fs.writeFileSync(bundlePath, `window.SAIF_COMMUNITY = ${JSON.stringify(bundle)};\n`);

let commitSha = process.env.GITHUB_SHA || "uncommitted";
try { commitSha = execFileSync("git", ["-C", repoDir, "rev-parse", "HEAD"], { encoding: "utf8" }).trim(); } catch {}
const files = {};
for (const name of fs.readdirSync(snapshotDir).sort()) {
  if (name === "snapshot_manifest.json") continue;
  files[name] = crypto.createHash("sha256").update(fs.readFileSync(path.join(snapshotDir, name))).digest("hex");
}
const livingManifest = JSON.parse(fs.readFileSync(path.join(siteDir, "release_manifest.json"), "utf8"));
const snapshotManifest = {
  schemaVersion: 1,
  version,
  releaseId: `${livingManifest.releaseId}-supplement-${version}`,
  generatedAt: new Date().toISOString(),
  commitSha,
  claimCount: livingManifest.claims,
  dossierCount: livingManifest.dossiers,
  organCount: livingManifest.organs,
  citationCount: livingManifest.citations,
  citationValidation: process.env.CITATION_VALIDATION_STATUS || "schema-validated; DOI and PMID resolution tracked by CI",
  linkedAtlasReleaseId: livingManifest.atlasReleaseId,
  files,
};
fs.writeFileSync(path.join(snapshotDir, "snapshot_manifest.json"), `${JSON.stringify(snapshotManifest, null, 2)}\n`);
console.log(JSON.stringify({ snapshot: version, status: "frozen", snapshotDir, files: Object.keys(files).length }, null, 2));
