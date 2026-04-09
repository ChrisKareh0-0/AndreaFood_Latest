require('dotenv').config();
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const FormData = require('form-data');

const projectRoot = __dirname;
const localStorePath = path.join(projectRoot, '.local-store.json');
const apiBase = String(process.env.API_BASE || process.argv[2] || '').trim().replace(/\/$/, '');
const sourceRoot = process.env.MEDIA_SOURCE_PATH
  ? path.resolve(projectRoot, process.env.MEDIA_SOURCE_PATH)
  : null;
const concurrency = Math.max(
  1,
  Number(process.env.MEDIA_UPLOAD_CONCURRENCY || process.env.UPLOAD_CONCURRENCY || 1)
);
const dryRun = process.argv.includes('--dry-run');
const failFast = process.argv.includes('--fail-fast');

function fail(message) {
  console.error(`Upload failed: ${message}`);
  process.exit(1);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
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

function normalizeClientPath(relativeUrl) {
  return decodeURIComponent(String(relativeUrl || ''))
    .replace(/^\/clients\//i, '')
    .replace(/^clients\//i, '')
    .replace(/[?#].*$/, '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');
}

function resolveSourceFile(relativeUrl, index) {
  const relativePath = normalizeClientPath(relativeUrl);
  const target = relativePath.toLowerCase();
  const exact = index.byRelative.get(target);

  if (exact) {
    return { path: exact, match: 'exact', relativePath };
  }

  const suffixMatches = [];
  for (const [candidateRelative, candidatePath] of index.byRelative.entries()) {
    if (candidateRelative === target || candidateRelative.endsWith(`/${target}`)) {
      suffixMatches.push(candidatePath);
    }
  }

  if (suffixMatches.length === 1) {
    return { path: suffixMatches[0], match: 'suffix', relativePath };
  }

  const baseName = path.basename(relativePath).toLowerCase();
  const baseNameMatches = index.byBaseName.get(baseName) || [];
  if (baseNameMatches.length === 1) {
    return { path: baseNameMatches[0], match: 'basename', relativePath };
  }

  const candidates = suffixMatches.length > 1 ? suffixMatches : baseNameMatches;
  return {
    path: null,
    match: candidates.length > 1 ? 'ambiguous' : 'missing',
    relativePath,
    candidates,
  };
}

function readReferencedUrls() {
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

function getPathname(value) {
  try {
    return new URL(value, apiBase).pathname;
  } catch {
    return value;
  }
}

function getFormLength(form) {
  return new Promise((resolve, reject) => {
    form.getLength((error, length) => {
      if (error) return reject(error);
      resolve(length);
    });
  });
}

async function uploadResolvedFile(task) {
  const form = new FormData();
  const clientFolder = path.posix.dirname(task.relativePath) === '.'
    ? 'misc'
    : path.posix.dirname(task.relativePath);

  form.append('clientFolder', clientFolder);
  form.append('file', fs.createReadStream(task.sourceFile), {
    filename: path.posix.basename(task.relativePath),
    knownLength: task.bytes,
  });

  const url = new URL('/api/media/upload', apiBase);
  const transport = url.protocol === 'https:' ? https : http;
  const headers = form.getHeaders();
  headers['Content-Length'] = await getFormLength(form);

  return new Promise((resolve, reject) => {
    const request = transport.request({
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      method: 'POST',
      path: `${url.pathname}${url.search}`,
      headers,
    }, (response) => {
      const chunks = [];

      response.on('data', (chunk) => {
        chunks.push(chunk);
      });

      response.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        let payload = {};

        try {
          payload = body ? JSON.parse(body) : {};
        } catch {
          payload = { raw: body };
        }

        if (response.statusCode < 200 || response.statusCode >= 300 || payload?.success === false) {
          return reject(new Error(payload?.error || `HTTP ${response.statusCode}`));
        }

        resolve(payload);
      });
    });

    request.on('error', reject);
    request.setTimeout(300000, () => {
      request.destroy(new Error('Upload timed out'));
    });

    form.pipe(request);
  });
}

async function runQueue(items, limit, worker) {
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const currentIndex = index;
      index += 1;
      if (currentIndex >= items.length) return;
      await worker(items[currentIndex], currentIndex);
    }
  });

  await Promise.all(workers);
}

async function main() {
  if (!apiBase) {
    fail('API_BASE is required. Example: API_BASE=https://andreafoodstyle.com');
  }

  if (!sourceRoot) {
    fail('MEDIA_SOURCE_PATH is required. Point it at the folder that contains your raw client media library.');
  }

  if (!fs.existsSync(sourceRoot)) {
    fail(`MEDIA_SOURCE_PATH does not exist: ${sourceRoot}`);
  }

  const referencedUrls = readReferencedUrls();
  const fileIndex = buildFileIndex(sourceRoot);
  const resolvedTasks = [];
  const missing = [];
  const ambiguous = [];

  for (const url of referencedUrls) {
    const resolved = resolveSourceFile(url, fileIndex);
    if (!resolved.path) {
      if (resolved.match === 'ambiguous') {
        ambiguous.push({
          url,
          candidates: resolved.candidates.map((candidate) =>
            path.relative(sourceRoot, candidate).replace(/\\/g, '/')
          ),
        });
      } else {
        missing.push(url);
      }
      continue;
    }

    const sourceStats = fs.statSync(resolved.path);
    resolvedTasks.push({
      url,
      sourceFile: resolved.path,
      sourceRelative: path.relative(sourceRoot, resolved.path).replace(/\\/g, '/'),
      relativePath: resolved.relativePath,
      bytes: sourceStats.size,
      match: resolved.match,
    });
  }

  const report = {
    apiBase,
    sourceRoot,
    dryRun,
    totals: {
      referenced: referencedUrls.length,
      resolved: resolvedTasks.length,
      uploaded: 0,
      failed: 0,
      missing: missing.length,
      ambiguous: ambiguous.length,
      uploadedBytes: 0,
      uploadedSize: '0 B',
    },
    uploaded: [],
    failed: [],
    missing,
    ambiguous,
  };

  if (!dryRun) {
    console.log(`Uploading ${resolvedTasks.length} files to ${apiBase} with concurrency ${concurrency}`);
  } else {
    console.log(`Dry run: resolved ${resolvedTasks.length} of ${referencedUrls.length} referenced files`);
  }

  await runQueue(resolvedTasks, concurrency, async (task, taskIndex) => {
    const label = `[${taskIndex + 1}/${resolvedTasks.length}] ${task.relativePath}`;

    if (dryRun) {
      console.log(`${label} -> ${task.sourceRelative} (${task.match})`);
      return;
    }

    const startedAt = Date.now();
    try {
      const payload = await uploadResolvedFile(task);
      const returnedPath = getPathname(payload.url || '');

      report.uploaded.push({
        url: task.url,
        source: task.sourceRelative,
        match: task.match,
        returnedUrl: payload.url || '',
        returnedPath,
        bytes: task.bytes,
        durationMs: Date.now() - startedAt,
      });
      report.totals.uploaded += 1;
      report.totals.uploadedBytes += task.bytes;
      report.totals.uploadedSize = formatBytes(report.totals.uploadedBytes);

      console.log(`${label} uploaded in ${Date.now() - startedAt}ms (${formatBytes(task.bytes)})`);
    } catch (error) {
      report.failed.push({
        url: task.url,
        source: task.sourceRelative,
        match: task.match,
        error: error.message,
      });
      report.totals.failed += 1;
      console.log(`${label} failed: ${error.message}`);
      if (failFast) {
        throw error;
      }
    }
  });

  const reportPath = path.join(projectRoot, 'media-upload-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log('');
  console.log(`Referenced URLs: ${report.totals.referenced}`);
  console.log(`Resolved files: ${report.totals.resolved}`);
  console.log(`Uploaded: ${report.totals.uploaded}`);
  console.log(`Failed: ${report.totals.failed}`);
  console.log(`Missing: ${report.totals.missing}`);
  console.log(`Ambiguous: ${report.totals.ambiguous}`);
  console.log(`Uploaded size: ${report.totals.uploadedSize}`);
  console.log(`Report written to: ${reportPath}`);

  if (report.totals.failed > 0 || report.totals.missing > 0 || report.totals.ambiguous > 0) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(`Upload failed: ${error.message}`);
  process.exit(1);
});
