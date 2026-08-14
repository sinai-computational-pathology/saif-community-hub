import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const siteDir = path.join(repoDir, "_site");
const failures = [];
const allowedRootFiles = new Set([".nojekyll", "app.js", "claims_bundle.js", "favicon.png", "index.html", "og.png", "release_manifest.json", "styles.css"]);
const forbiddenFilename = /(^|\/)(claims|prompts?|imports?|workplans?|review|rankings?|results?_bundle|backend|supabase|credentials?|secrets?|raw)(\/|\.|$)/i;
const forbiddenText = /(github\.mountsinai\.org|\/Users\/|Dropbox|\/sc\/|accession_no|patient_id|case_id|specimen_id|slide_id|report_text|source_path|file_path|supabase|api[_-]?key|anon[_-]?key)/i;
const secretShape = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/;

function fail(message) { failures.push(message); }
function listFiles(directory, prefix = "") {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.posix.join(prefix, entry.name);
    return entry.isDirectory() ? listFiles(path.join(directory, entry.name), relative) : [relative];
  });
}

if (!fs.existsSync(siteDir)) fail("_site does not exist; run npm run build first");
const files = fs.existsSync(siteDir) ? listFiles(siteDir).sort() : [];
for (const file of files) {
  const root = file.split("/")[0];
  if (root !== "supplement" && !allowedRootFiles.has(file)) fail(`unapproved site file: ${file}`);
  if (forbiddenFilename.test(file)) fail(`forbidden filename: ${file}`);
  const content = fs.readFileSync(path.join(siteDir, file));
  if (content.includes(0)) continue;
  const text = content.toString("utf8");
  if (forbiddenText.test(text)) fail(`forbidden text in ${file}`);
  if (secretShape.test(text)) fail(`secret-shaped token in ${file}`);
}

const appSource = fs.existsSync(path.join(siteDir, "app.js")) ? fs.readFileSync(path.join(siteDir, "app.js"), "utf8") : "";
if (/localStorage|sessionStorage|indexedDB|XMLHttpRequest|\bfetch\s*\(/.test(appSource)) fail("public app contains a browser storage or network-write surface");

if (fs.existsSync(path.join(siteDir, "claims_bundle.js"))) {
  const source = fs.readFileSync(path.join(siteDir, "claims_bundle.js"), "utf8");
  const bundle = JSON.parse(source.replace(/^window\.SAIF_COMMUNITY\s*=\s*/, "").replace(/;\s*$/, ""));
  for (const dossier of bundle.dossiers || []) {
    if (!dossier.organ_slug || !dossier.demographic || !dossier.summary) fail(`incomplete dossier: ${dossier.combo || "unknown"}`);
    for (const claim of dossier.claims || []) {
      if (!claim.id || !claim.hypothesis || !claim.evidence_status || !claim.validation) fail(`incomplete claim: ${dossier.combo}:${claim.id || "unknown"}`);
      if (!Array.isArray(claim.literature)) fail(`claim literature is not an array: ${dossier.combo}:${claim.id}`);
    }
  }
}

if (failures.length) {
  failures.forEach((message) => console.error(`COMMUNITY RELEASE AUDIT FAILED: ${message}`));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ audit: "passed", files: files.length, publicWriteSurface: "GitHub Discussions only" }, null, 2));
}
