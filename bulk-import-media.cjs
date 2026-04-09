require('dotenv').config();
const fs = require('fs');
const path = require('path');

const projectRoot = __dirname;
const localStorePath = path.join(projectRoot, '.local-store.json');
const sourceRoot = process.env.MEDIA_SOURCE_PATH
  ? path.resolve(projectRoot, process.env.MEDIA_SOURCE_PATH)
  : null;
const targetRoot = path.resolve(
  projectRoot,
  process.env.MEDIA_STORAGE_PATH || path.join('public', 'clients')
);
const dryRun = process.argv.includes('--dry-run');

function fail(message) {
  console.error(`Import failed: ${message}`);
  process.exit(1);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function listFiles(rootDir) {
  const results = [];

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      results.push(fullPath);
    }
  }

  walk(rootDir);
  return results;
}

function buildFileIndex(rootDir) {
  const byRelative = new Map();
  const byBaseName = new Map();

  for (const filePath of listFiles(rootDir)) {
    const relative = path.relative(rootDir, filePath).replace(/\\/g, '/');
    byRelative.set(relative.toLowerCase(), filePath);

    const baseName = path.basename(filePath).toLowerCase();
    const existing = byBaseName.get(baseName) || [];
    existing.push(filePath);
    byBaseName.set(baseName, existing);
  }

  return { byRelative, byBaseName };
}

function resolveSourceFile(relativeUrl, index) {
  const relativePath = relativeUrl.replace(/^\/clients\//, '').replace(/\\/g, '/');
  const exact = index.byRelative.get(relativePath.toLowerCase());
  if (exact) {
    return { path: exact, match: 'exact', relativePath };
  }

  const suffixMatches = [];
  for (const [candidateRelative, candidatePath] of index.byRelative.entries()) {
    if (candidateRelative === relativePath.toLowerCase() || candidateRelative.endsWith(`/${relativePath.toLowerCase()}`)) {
      suffixMatches.push(candidatePath);
    }
  }

  if (suffixMatches.length === 1) {
    return { path: suffixMatches[0], match: 'suffix', relativePath };
  }

  const baseName = path.basename(relativePath).toLowerCase();
  const candidates = index.byBaseName.get(baseName) || [];
  if (candidates.length === 1) {
    return { path: candidates[0], match: 'basename', relativePath };
  }

  const ambiguousCandidates = suffixMatches.length > 1 ? suffixMatches : candidates;
  return {
    path: null,
    match: ambiguousCandidates.length > 1 ? 'ambiguous' : 'missing',
    relativePath,
    candidates: ambiguousCandidates,
  };
}

function copyFile(sourceFile, destinationFile) {
  ensureDir(path.dirname(destinationFile));
  fs.copyFileSync(sourceFile, destinationFile);
}

function readLocalStoreUrls() {
  if (!fs.existsSync(localStorePath)) {
    fail(`Missing .local-store.json at ${localStorePath}`);
  }

  const payload = readJson(localStorePath);
  const clients = JSON.parse(payload.clients || '[]');
  const urls = new Set();

  for (const client of clients) {
    for (const url of Array.isArray(client.images) ? client.images : []) {
      if (typeof url === 'string' && url.startsWith('/clients/')) {
        urls.add(url);
      }
    }
    for (const url of [client.thumbnailUrl, client.logo]) {
      if (typeof url === 'string' && url.startsWith('/clients/')) {
        urls.add(url);
      }
    }
  }

  return Array.from(urls).sort((a, b) => a.localeCompare(b));
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}

function main() {
  if (!sourceRoot) {
    fail('MEDIA_SOURCE_PATH is required. Point it at the folder containing your raw client media library.');
  }

  if (!fs.existsSync(sourceRoot)) {
    fail(`MEDIA_SOURCE_PATH does not exist: ${sourceRoot}`);
  }

  ensureDir(targetRoot);

  const urls = readLocalStoreUrls();
  const index = buildFileIndex(sourceRoot);
  const copied = [];
  const missing = [];
  const ambiguous = [];
  let copiedBytes = 0;

  for (const url of urls) {
    const resolved = resolveSourceFile(url, index);
    if (!resolved.path) {
      if (resolved.match === 'ambiguous') {
        ambiguous.push({
          url,
          candidates: resolved.candidates.map((candidate) => path.relative(sourceRoot, candidate).replace(/\\/g, '/')),
        });
      } else {
        missing.push(url);
      }
      continue;
    }

    const destination = path.join(targetRoot, resolved.relativePath);
    const sourceStats = fs.statSync(resolved.path);

    if (!dryRun) {
      copyFile(resolved.path, destination);
    }

    copied.push({
      url,
      match: resolved.match,
      source: path.relative(sourceRoot, resolved.path).replace(/\\/g, '/'),
      destination: path.relative(targetRoot, destination).replace(/\\/g, '/'),
      bytes: sourceStats.size,
    });
    copiedBytes += sourceStats.size;
  }

  const report = {
    sourceRoot,
    targetRoot,
    dryRun,
    totals: {
      referenced: urls.length,
      copied: copied.length,
      missing: missing.length,
      ambiguous: ambiguous.length,
      copiedBytes,
      copiedSize: formatBytes(copiedBytes),
    },
    copied,
    missing,
    ambiguous,
  };

  const reportPath = path.join(projectRoot, 'media-import-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`Referenced media: ${urls.length}`);
  console.log(`Copied: ${copied.length}`);
  console.log(`Missing: ${missing.length}`);
  console.log(`Ambiguous: ${ambiguous.length}`);
  console.log(`Size copied: ${formatBytes(copiedBytes)}`);
  console.log(`Report written to: ${reportPath}`);

  if (missing.length > 0 || ambiguous.length > 0) {
    process.exitCode = 2;
  }
}

main();
