require('dotenv').config();
const express = require('express');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const pool = require('./db.cjs');

const app = express();

const port = process.env.PORT || 8080;
const distPath = path.join(__dirname, 'dist');
const publicPath = path.join(__dirname, 'public');
const repoClientsPath = path.join(publicPath, 'clients');
const configuredMediaStoragePath = text(process.env.MEDIA_STORAGE_PATH);
const mediaStoragePath = configuredMediaStoragePath
  ? (path.isAbsolute(configuredMediaStoragePath)
      ? configuredMediaStoragePath
      : path.join(__dirname, configuredMediaStoragePath))
  : repoClientsPath;
const localStorePath = path.join(__dirname, '.local-store.json');
const mediaBaseUrl = (process.env.MEDIA_BASE_URL || '').replace(/\/$/, '');
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;
const previewJobs = new Map();

let databaseReady = false;
let databaseError = pool ? null : 'DATABASE_URL is not configured';
const localHeroImagePath = '/clients/site-content/personal/hero-image.png';
const enableLocalContentFallback =
  process.env.ENABLE_LOCAL_CONTENT_FALLBACK === 'true' ||
  (!pool && process.env.NODE_ENV !== 'production');
const localContent = {
  personalData: {
    fullName: 'Andrea Abi Khalil',
    email: 'andreaabikhalil@gmail.com',
    phone: '03 56 16 58',
    heroImage: fs.existsSync(path.join(repoClientsPath, 'site-content', 'personal', 'hero-image.png'))
      ? localHeroImagePath
      : '',
    profileImage: '',
  },
  bioContent: {},
  siteText: {},
  latestWorkPosts: [],
};

if (!fs.existsSync(publicPath)) fs.mkdirSync(publicPath, { recursive: true });
if (!fs.existsSync(repoClientsPath)) fs.mkdirSync(repoClientsPath, { recursive: true });
if (!fs.existsSync(mediaStoragePath)) fs.mkdirSync(mediaStoragePath, { recursive: true });

function getCache(key) {
  const cached = cache.get(key);
  if (!cached) return null;
  if (cached.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return cached.value;
}

function setCache(key, value, ttl = CACHE_TTL) {
  cache.set(key, { value, expiresAt: Date.now() + ttl });
}

function clearCache() {
  cache.clear();
}

function setApiCache(res, seconds = 120) {
  res.setHeader('Cache-Control', `public, max-age=${seconds}, stale-while-revalidate=300`);
}

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function uniqueStrings(values) {
  if (!Array.isArray(values)) return [];
  const seen = new Set();

  return values
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value) => {
      if (!value || seen.has(value)) return false;
      seen.add(value);
      return true;
    });
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function sanitizeFolderSegment(value, fallback = 'unknown') {
  const safe = String(value || '')
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return safe || fallback;
}

function safePathSegment(value) {
  const cleaned = String(value || '')
    .replace(/\0/g, '')
    .trim();

  if (!cleaned || cleaned === '.' || cleaned === '..') return '';
  return cleaned.replace(/[\\/]/g, '').trim();
}

function safeUploadFileName(value) {
  const cleaned = safePathSegment(path.basename(String(value || '')));
  return cleaned || `upload-${Date.now()}`;
}

function buildUploadFolder(value) {
  const parts = String(value || '')
    .split('/')
    .flatMap((part) => part.split('\\'))
    .map((part) => safePathSegment(part))
    .filter(Boolean);

  return parts.length > 0 ? parts.join(path.sep) : 'misc';
}

function buildMediaRoute(value) {
  const parts = String(value || '')
    .split('/')
    .flatMap((part) => part.split('\\'))
    .map((part) => safePathSegment(part))
    .filter(Boolean);

  return parts.length > 0 ? parts.join('/') : 'misc';
}

function mediaType(url) {
  if ((url || '').startsWith('data:video/')) return 'video';
  return /\.(mp4|webm|mov)$/i.test(url || '') ? 'video' : 'image';
}

function numberInRange(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function normalizeMediaRequestPath(value) {
  const input = text(value);
  if (!input || input.startsWith('data:')) return '';

  let pathname = input;
  if (/^https?:\/\//i.test(input)) {
    try {
      pathname = new URL(input).pathname;
    } catch {
      return '';
    }
  }

  if (!pathname.startsWith('/clients/')) return '';

  return pathname
    .replace(/^\/clients\//, '')
    .split('/')
    .flatMap((part) => part.split('\\'))
    .map((part) => safePathSegment(part))
    .filter(Boolean)
    .join('/');
}

function getExistingMediaFile(relativeRoute) {
  if (!relativeRoute) return null;

  const candidates = [
    path.join(mediaStoragePath, relativeRoute),
  ];

  if (mediaStoragePath !== repoClientsPath) {
    candidates.push(path.join(repoClientsPath, relativeRoute));
  }

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function buildPreviewFileInfo(relativeRoute, width, height, quality) {
  const parsed = path.parse(relativeRoute);
  const previewDir = path.join(
    mediaStoragePath,
    '__preview__',
    `w${width || 0}-h${height || 0}-q${quality}`,
    parsed.dir
  );
  const fileName = `${parsed.name}.webp`;

  return {
    route: `/clients/__preview__/w${width || 0}-h${height || 0}-q${quality}/${[
      parsed.dir.replace(/\\/g, '/'),
      fileName,
    ].filter(Boolean).join('/')}`,
    path: path.join(previewDir, fileName),
  };
}

async function generateImagePreview(sourcePath, targetPath, options) {
  const { width, height, quality } = options;
  await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });

  const tempPath = `${targetPath}.${process.pid}.${Date.now()}.tmp.webp`;
  const transformer = sharp(sourcePath).rotate();

  if (width || height) {
    transformer.resize({
      width: width || undefined,
      height: height || undefined,
      fit: width && height ? 'cover' : 'inside',
      position: 'attention',
      withoutEnlargement: true,
    });
  }

  await transformer.webp({ quality, effort: 4 }).toFile(tempPath);
  await fs.promises.rm(targetPath, { force: true });
  await fs.promises.rename(tempPath, targetPath);
}

async function ensureImagePreview(sourceUrl, options = {}) {
  const relativeRoute = normalizeMediaRequestPath(sourceUrl);
  if (!relativeRoute || mediaType(relativeRoute) !== 'image') return null;

  const sourcePath = getExistingMediaFile(relativeRoute);
  if (!sourcePath) return null;

  const width = numberInRange(options.width, 160, 2400, 960);
  const height = options.height
    ? numberInRange(options.height, 160, 2400, 0)
    : 0;
  const quality = numberInRange(options.quality, 40, 90, 72);
  const output = buildPreviewFileInfo(relativeRoute, width, height, quality);

  if (fs.existsSync(output.path)) {
    const [sourceStat, previewStat] = await Promise.all([
      fs.promises.stat(sourcePath),
      fs.promises.stat(output.path),
    ]);

    if (previewStat.mtimeMs >= sourceStat.mtimeMs) {
      return output;
    }
  }

  const jobKey = `${sourcePath}:${output.path}:${width}:${height}:${quality}`;
  let job = previewJobs.get(jobKey);

  if (!job) {
    job = generateImagePreview(sourcePath, output.path, { width, height, quality })
      .finally(() => {
        previewJobs.delete(jobKey);
      });
    previewJobs.set(jobKey, job);
  }

  await job;
  return output;
}

function mediaUrl(url) {
  const value = text(url);
  if (!value) return '';
  if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:')) return value;
  if (!mediaBaseUrl) return value;
  return `${mediaBaseUrl}${value.startsWith('/') ? '' : '/'}${value}`;
}

function parseJson(value, fallback = null) {
  if (value == null) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function totalMediaCount(clients) {
  if (!Array.isArray(clients)) return 0;
  return clients.reduce((sum, client) => sum + (Array.isArray(client?.images) ? client.images.length : 0), 0);
}

function buildAdminStatsFromClientPayload(clients) {
  const rows = Array.isArray(clients) ? clients : [];
  const categories = new Set();
  let totalClients = rows.length;
  let totalImages = 0;
  let totalVideos = 0;
  let clientsWithMedia = 0;

  for (const client of rows) {
    const media = Array.isArray(client?.media)
      ? client.media
      : Array.isArray(client?.images)
        ? client.images.map((url) => ({ url, type: mediaType(url) }))
        : [];

    if (media.length > 0) {
      clientsWithMedia += 1;
    }

    for (const item of media) {
      if ((item?.type || mediaType(item?.url || '')) === 'video') {
        totalVideos += 1;
      } else {
        totalImages += 1;
      }
    }

    const clientCategories = Array.isArray(client?.categories) ? client.categories : [];
    for (const category of clientCategories) {
      const value = text(category);
      if (value) {
        categories.add(value);
      }
    }
  }

  return {
    totalClients,
    clientsWithMedia,
    clientsWithoutMedia: Math.max(0, totalClients - clientsWithMedia),
    totalImages,
    totalVideos,
    totalMedia: totalImages + totalVideos,
    totalCategories: categories.size,
  };
}

function canUseLocalContentFallback() {
  return enableLocalContentFallback && (!pool || !databaseReady);
}

function loadClientsFromLocalStore() {
  if (!fs.existsSync(localStorePath)) return [];

  try {
    const payload = JSON.parse(fs.readFileSync(localStorePath, 'utf8'));
    return parseJson(payload.clients, []);
  } catch {
    return [];
  }
}

function normalizeClient(input, fallbackId) {
  const id = Number.isSafeInteger(Number(input?.id)) ? Number(input.id) : fallbackId;
  const name = text(input?.name);

  if (!name) throw new Error('Client name is required');

  const images = uniqueStrings(input?.images);
  const logo = text(input?.logo);
  const categories = uniqueStrings(input?.categories);
  const description = text(input?.description);
  const thumbnailUrl = text(input?.thumbnailUrl) || images[0] || logo || '';

  return {
    id,
    slug: `${slugify(name) || 'client'}-${id}`,
    name,
    logo,
    categories,
    description,
    thumbnailUrl,
    images,
  };
}

function serializeClient(row, media = null) {
  const logo = mediaUrl(row.logo);
  const galleryMedia = Array.isArray(media) ? media : null;
  const thumbnailUrl = mediaUrl(row.thumbnail_url || row.logo || galleryMedia?.[0]?.url || '');

  return {
    id: Number(row.id),
    name: row.name,
    slug: row.slug,
    logo,
    thumbnailUrl,
    previewType: mediaType(row.thumbnail_url || row.logo || galleryMedia?.[0]?.url || ''),
    categories: Array.isArray(row.categories) ? row.categories : [],
    description: row.description || '',
    mediaCount: Number(row.media_count || galleryMedia?.length || 0),
    images: galleryMedia ? galleryMedia.map((item) => item.url) : undefined,
    media: galleryMedia || undefined,
  };
}

function listLocalClients(options = {}) {
  const search = text(options.search).toLowerCase();
  const category = text(options.category);
  const includeMedia = Boolean(options.includeMedia);
  const page = Number.isFinite(options.page) ? options.page : 1;
  const limit = Number.isFinite(options.limit) ? options.limit : undefined;
  const cacheKey = `local-clients:${search}:${category}:${page}:${limit || 'all'}:${includeMedia ? 'full' : 'summary'}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const normalized = loadClientsFromLocalStore().map((client, index) =>
    normalizeClient(client, 1000000 + index)
  );

  const filtered = normalized.filter((client) => {
    const matchesSearch = !search || client.name.toLowerCase().includes(search);
    const matchesCategory = !category || category === 'All' || client.categories.includes(category);
    return matchesSearch && matchesCategory;
  });

  const total = filtered.length;
  const safeLimit = limit || Math.max(total, 1);
  const offset = (page - 1) * safeLimit;
  const slice = filtered.slice(offset, offset + safeLimit);

  const clients = slice.map((client) => {
    const row = {
      id: client.id,
      slug: client.slug,
      name: client.name,
      logo: includeMedia ? client.logo : (text(client.logo).startsWith('data:') ? '' : client.logo),
      categories: client.categories,
      description: client.description,
      thumbnail_url: includeMedia
        ? client.thumbnailUrl
        : (text(client.thumbnailUrl).startsWith('data:') ? '' : client.thumbnailUrl),
      media_count: client.images.length,
    };

    const media = includeMedia
      ? client.images.map((url, index) => ({
          id: index + 1,
          url: mediaUrl(url),
          type: mediaType(url),
          sortOrder: index,
        }))
      : null;

    return serializeClient(row, media);
  });

  const result = {
    clients,
    pagination: {
      page,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    },
    source: 'local-fallback',
  };

  setCache(cacheKey, result);
  return result;
}

function getLocalClientById(clientId, includeMedia = false) {
  const found = loadClientsFromLocalStore()
    .map((client, index) => normalizeClient(client, 1000000 + index))
    .find((client) => Number(client.id) === Number(clientId));

  if (!found) return null;

  return serializeClient(
    {
      id: found.id,
      slug: found.slug,
      name: found.name,
      logo: found.logo,
      categories: found.categories,
      description: found.description,
      thumbnail_url: found.thumbnailUrl,
      media_count: found.images.length,
    },
    includeMedia
      ? found.images.map((url, index) => ({
          id: index + 1,
          url: mediaUrl(url),
          type: mediaType(url),
          sortOrder: index,
        }))
      : null
  );
}

function getLocalAdminValue(key, fallback = null) {
  return Object.prototype.hasOwnProperty.call(localContent, key)
    ? localContent[key]
    : fallback;
}

async function dbQuery(query, params = []) {
  if (!pool || !databaseReady) {
    throw new Error(databaseError || 'Database unavailable');
  }
  return pool.query(query, params);
}

async function withTransaction(work) {
  if (!pool || !databaseReady) {
    throw new Error(databaseError || 'Database unavailable');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_data (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS clients (
      id BIGINT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      logo TEXT DEFAULT '',
      categories JSONB NOT NULL DEFAULT '[]'::jsonb,
      description TEXT DEFAULT '',
      thumbnail_url TEXT DEFAULT '',
      media_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS client_media (
      id BIGSERIAL PRIMARY KEY,
      client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'image',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query('CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_client_media_client_id_sort ON client_media(client_id, sort_order, id)');
}

async function upsertClient(dbClient, input, options = {}) {
  const replaceMedia = options.replaceMedia !== false;
  const existing = await dbClient.query('SELECT media_count, thumbnail_url FROM clients WHERE id = $1', [input.id]);
  const current = existing.rows[0];
  const mediaCount = replaceMedia ? input.images.length : Number(current?.media_count || 0);
  const thumbnailUrl = replaceMedia
    ? (input.thumbnailUrl || input.logo || input.images[0] || '')
    : (input.thumbnailUrl || input.logo || current?.thumbnail_url || '');

  await dbClient.query(
    `
      INSERT INTO clients (id, slug, name, logo, categories, description, thumbnail_url, media_count, updated_at)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, NOW())
      ON CONFLICT (id) DO UPDATE
      SET slug = EXCLUDED.slug,
          name = EXCLUDED.name,
          logo = EXCLUDED.logo,
          categories = EXCLUDED.categories,
          description = EXCLUDED.description,
          thumbnail_url = EXCLUDED.thumbnail_url,
          media_count = EXCLUDED.media_count,
          updated_at = NOW()
    `,
    [input.id, input.slug, input.name, input.logo, JSON.stringify(input.categories), input.description, thumbnailUrl, mediaCount]
  );

  if (!replaceMedia) return;

  await dbClient.query('DELETE FROM client_media WHERE client_id = $1', [input.id]);

  for (const [index, url] of input.images.entries()) {
    await dbClient.query(
      'INSERT INTO client_media (client_id, url, type, sort_order) VALUES ($1, $2, $3, $4)',
      [input.id, url, mediaType(url), index]
    );
  }
}

async function migrateLegacyClients() {
  const count = await pool.query('SELECT COUNT(*)::int AS count FROM clients');
  if (count.rows[0]?.count > 0) return;

  const localStoreClients = loadClientsFromLocalStore();
  let clients = Array.isArray(localStoreClients) ? localStoreClients : [];

  if (clients.length === 0) {
    const legacy = await pool.query("SELECT value FROM admin_data WHERE key = 'clients'");
    if (legacy.rows.length === 0) return;
    clients = parseJson(legacy.rows[0].value, []);
  } else {
    try {
      const legacy = await pool.query("SELECT value FROM admin_data WHERE key = 'clients'");
      const legacyClients = legacy.rows.length > 0 ? parseJson(legacy.rows[0].value, []) : [];
      if (totalMediaCount(legacyClients) > totalMediaCount(clients)) {
        clients = legacyClients;
      }
    } catch {
      // Prefer the checked-in local manifest if the legacy key is missing or too slow.
    }
  }

  if (!Array.isArray(clients) || clients.length === 0) return;

  await withTransaction(async (dbClient) => {
    for (const [index, client] of clients.entries()) {
      await upsertClient(dbClient, normalizeClient(client, Date.now() + index));
    }
  });
}

async function initializeDatabase() {
  if (!pool) return;

  try {
    await pool.query('SELECT 1');
    await ensureSchema();
    await migrateLegacyClients();
    databaseReady = true;
    databaseError = null;
    console.log('Database ready');
  } catch (error) {
    databaseReady = false;
    databaseError = error.message;
    console.warn('Database initialization failed:', error.message);
  }
}

function requireDatabase(res) {
  if (pool && databaseReady) return true;
  res.status(503).json({ error: 'Database unavailable', details: databaseError });
  return false;
}

async function getAdminValue(key, fallback = null) {
  const cacheKey = `admin:${key}`;
  const cached = getCache(cacheKey);
  if (cached !== null) return cached;

  const result = await dbQuery('SELECT value FROM admin_data WHERE key = $1', [key]);
  const value = result.rows.length > 0 ? parseJson(result.rows[0].value, fallback) : fallback;
  setCache(cacheKey, value);
  return value;
}

async function getAdminValues(entries) {
  const items = Array.isArray(entries) ? entries : [];
  if (items.length === 0) return {};

  const result = {};
  const missing = [];

  for (const entry of items) {
    const cacheKey = `admin:${entry.key}`;
    const cached = getCache(cacheKey);
    if (cached !== null) {
      result[entry.key] = cached;
      continue;
    }

    missing.push(entry);
  }

  if (missing.length > 0) {
    const keys = missing.map((entry) => entry.key);
    const rows = await dbQuery(
      'SELECT key, value FROM admin_data WHERE key = ANY($1::text[])',
      [keys]
    );
    const rowMap = new Map(rows.rows.map((row) => [row.key, row.value]));

    for (const entry of missing) {
      const value = rowMap.has(entry.key)
        ? parseJson(rowMap.get(entry.key), entry.fallback)
        : entry.fallback;
      result[entry.key] = value;
      setCache(`admin:${entry.key}`, value);
    }
  }

  return result;
}

async function setAdminValue(key, value) {
  await dbQuery(
    `
      INSERT INTO admin_data(key, value)
      VALUES ($1, $2)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `,
    [key, JSON.stringify(value)]
  );
  clearCache();
}

async function listClients(options = {}) {
  const search = text(options.search);
  const category = text(options.category);
  const includeMedia = Boolean(options.includeMedia);
  const page = Number.isFinite(options.page) ? options.page : 1;
  const limit = Number.isFinite(options.limit) ? options.limit : undefined;
  const cacheKey = `clients:${search}:${category}:${page}:${limit || 'all'}:${includeMedia ? 'full' : 'summary'}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const filters = [];
  const values = [];

  if (search) {
    values.push(`%${search}%`);
    filters.push(`name ILIKE $${values.length}`);
  }

  if (category && category !== 'All') {
    values.push(category);
    filters.push(`categories ? $${values.length}`);
  }

  const where = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
  const canLoadAllRowsDirectly = !search && !category && !includeMedia && !limit && page === 1;
  let total = 0;
  let safeLimit = 1;
  let rows;

  if (canLoadAllRowsDirectly) {
    rows = await dbQuery(
      `
        SELECT id, slug, name, logo, categories, description, thumbnail_url, media_count
        FROM clients
        ORDER BY name ASC
      `
    );
    total = rows.rows.length;
    safeLimit = Math.max(total, 1);
  } else {
    const countResult = await dbQuery(`SELECT COUNT(*)::int AS total FROM clients ${where}`, values);
    total = countResult.rows[0]?.total || 0;
    safeLimit = limit || Math.max(total, 1);
    const offset = (page - 1) * safeLimit;
    const rowValues = [...values, safeLimit, offset];
    rows = await dbQuery(
      `
        SELECT id, slug, name, logo, categories, description, thumbnail_url, media_count
        FROM clients
        ${where}
        ORDER BY name ASC
        LIMIT $${rowValues.length - 1} OFFSET $${rowValues.length}
      `,
      rowValues
    );
  }

  let mediaByClient = new Map();

  if (includeMedia && rows.rows.length > 0) {
    const ids = rows.rows.map((row) => row.id);
    const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
    const media = await dbQuery(
      `
        SELECT id, client_id, url, type, sort_order
        FROM client_media
        WHERE client_id IN (${placeholders})
        ORDER BY client_id ASC, sort_order ASC, id ASC
      `,
      ids
    );

    mediaByClient = media.rows.reduce((map, row) => {
      const key = String(row.client_id);
      const items = map.get(key) || [];
      items.push({
        id: Number(row.id),
        url: mediaUrl(row.url),
        type: row.type || mediaType(row.url),
        sortOrder: Number(row.sort_order || 0),
      });
      map.set(key, items);
      return map;
    }, new Map());
  }

  const clients = rows.rows.map((row) => {
    if (!includeMedia) {
      return serializeClient(
        {
          ...row,
          logo: text(row.logo).startsWith('data:') ? '' : row.logo,
          thumbnail_url: text(row.thumbnail_url).startsWith('data:') ? '' : row.thumbnail_url,
        },
        null
      );
    }

    return serializeClient(row, mediaByClient.get(String(row.id)) || []);
  });

  const result = {
    clients,
    pagination: {
      page,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    },
    source: 'database',
  };

  setCache(cacheKey, result);
  return result;
}

async function getClientById(clientId, includeMedia = false) {
  const row = await dbQuery(
    `
      SELECT id, slug, name, logo, categories, description, thumbnail_url, media_count
      FROM clients
      WHERE id = $1
    `,
    [clientId]
  );

  if (row.rows.length === 0) return null;

  if (!includeMedia) return serializeClient(row.rows[0], null);

  const media = await dbQuery(
    `
      SELECT id, url, type, sort_order
      FROM client_media
      WHERE client_id = $1
      ORDER BY sort_order ASC, id ASC
    `,
    [clientId]
  );

  return serializeClient(
    row.rows[0],
    media.rows.map((item) => ({
      id: Number(item.id),
      url: mediaUrl(item.url),
      type: item.type || mediaType(item.url),
      sortOrder: Number(item.sort_order || 0),
    }))
  );
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = buildUploadFolder(req.body?.clientFolder || 'misc');
    const uploadPath = path.join(mediaStoragePath, folder);
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, safeUploadFileName(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
});

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use((req, res, next) => {
  res.vary('Accept-Encoding');
  next();
});
app.use(express.static(distPath, {
  maxAge: '1h',
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate, no-transform');
      res.removeHeader('Content-Encoding');
    }
  },
}));
app.use('/public', express.static(publicPath, { maxAge: '7d' }));
app.use('/clients', express.static(mediaStoragePath, {
  maxAge: '30d',
  setHeaders(res, filePath) {
    res.setHeader('Cache-Control', /\.(mp4|webm|mov)$/i.test(filePath)
      ? 'public, max-age=604800'
      : 'public, max-age=2592000');
    res.setHeader('Accept-Ranges', 'bytes');
  },
}));
if (mediaStoragePath !== repoClientsPath) {
  app.use('/clients', express.static(repoClientsPath, {
    maxAge: '30d',
    setHeaders(res, filePath) {
      res.setHeader('Cache-Control', /\.(mp4|webm|mov)$/i.test(filePath)
        ? 'public, max-age=604800'
        : 'public, max-age=2592000');
      res.setHeader('Accept-Ranges', 'bytes');
    },
  }));
}
app.use('/clients', (req, res) => {
  res.status(404).end();
});

app.get('/api/health', async (req, res) => {
  const diagnostics = {
    databaseConfigured: !!pool,
    databaseReady,
    cacheEntries: cache.size,
    railwayEnvironment: process.env.RAILWAY_ENVIRONMENT || 'not set',
    localFallbackEnabled: enableLocalContentFallback,
  };

  if (canUseLocalContentFallback()) {
    return res.json({
      status: 'ok',
      database: pool ? 'unavailable' : 'not configured',
      source: 'local-fallback',
      diagnostics,
      timestamp: new Date().toISOString(),
    });
  }

  try {
    await pool.query('SELECT 1');
    res.json({
      status: databaseReady ? 'ok' : 'degraded',
      database: databaseReady ? 'connected' : 'starting',
      diagnostics: { ...diagnostics, reason: databaseError },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      database: 'unreachable',
      error: error.message,
      diagnostics,
      timestamp: new Date().toISOString(),
    });
  }
});

app.get('/api/admin/stats', async (req, res) => {
  if (canUseLocalContentFallback()) {
    const cacheKey = 'admin-stats:local';
    const cached = getCache(cacheKey);
    if (cached) {
      res.setHeader('X-Cache-Status', 'HIT');
      setApiCache(res, 60);
      return res.json(cached);
    }

    const localClients = listLocalClients({ includeMedia: true });
    const response = {
      source: 'local-fallback',
      stats: buildAdminStatsFromClientPayload(localClients.clients),
      timestamp: new Date().toISOString(),
    };

    setCache(cacheKey, response, 60 * 1000);
    setApiCache(res, 60);
    return res.json(response);
  }
  if (!requireDatabase(res)) return;

  try {
    const cacheKey = 'admin-stats:db';
    const cached = getCache(cacheKey);
    if (cached) {
      res.setHeader('X-Cache-Status', 'HIT');
      setApiCache(res, 60);
      return res.json(cached);
    }

    const [clientsCount, mediaCount, categoriesCount, clientsWithMediaCount] = await Promise.all([
      dbQuery('SELECT COUNT(*)::int AS total FROM clients'),
      dbQuery(`
        SELECT
          COUNT(*)::int AS total_media,
          COUNT(*) FILTER (WHERE type = 'image')::int AS total_images,
          COUNT(*) FILTER (WHERE type = 'video')::int AS total_videos
        FROM client_media
      `),
      dbQuery(`
        SELECT COUNT(DISTINCT category)::int AS total_categories
        FROM (
          SELECT jsonb_array_elements_text(categories) AS category
          FROM clients
        ) AS category_rows
      `),
      dbQuery('SELECT COUNT(*)::int AS total FROM clients WHERE media_count > 0'),
    ]);

    const totalClients = Number(clientsCount.rows[0]?.total || 0);
    const totalImages = Number(mediaCount.rows[0]?.total_images || 0);
    const totalVideos = Number(mediaCount.rows[0]?.total_videos || 0);
    const totalMedia = Number(mediaCount.rows[0]?.total_media || 0);
    const clientsWithMedia = Number(clientsWithMediaCount.rows[0]?.total || 0);

    const response = {
      source: 'database',
      stats: {
        totalClients,
        clientsWithMedia,
        clientsWithoutMedia: Math.max(0, totalClients - clientsWithMedia),
        totalImages,
        totalVideos,
        totalMedia,
        totalCategories: Number(categoriesCount.rows[0]?.total_categories || 0),
      },
      timestamp: new Date().toISOString(),
    };

    setCache(cacheKey, response, 60 * 1000);
    setApiCache(res, 60);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/media/preview', async (req, res) => {
  try {
    const preview = await ensureImagePreview(req.query.src, {
      width: req.query.w,
      height: req.query.h,
      quality: req.query.q,
    });

    if (!preview) {
      return res.status(404).json({ error: 'Preview source not found' });
    }

    res.setHeader('Cache-Control', 'public, max-age=2592000, stale-while-revalidate=604800, immutable');
    res.sendFile(preview.path);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/home-data', async (req, res) => {
  if (canUseLocalContentFallback()) {
    const cached = getCache('home-data:local');
    if (cached) {
      res.setHeader('X-Cache-Status', 'HIT');
      setApiCache(res, 120);
      return res.json(cached);
    }

    const clients = listLocalClients();
    const response = {
      personalData: getLocalAdminValue('personalData', {}),
      bioContent: getLocalAdminValue('bioContent', {}),
      siteText: getLocalAdminValue('siteText', {}),
      latestWorkPosts: getLocalAdminValue('latestWorkPosts', []),
      clients: clients.clients,
      clientsPagination: clients.pagination,
      source: 'local-fallback',
    };

    setCache('home-data:local', response);
    setApiCache(res, 120);
    return res.json(response);
  }
  if (!requireDatabase(res)) return;

  try {
    const cached = getCache('home-data');
    if (cached) {
      res.setHeader('X-Cache-Status', 'HIT');
      setApiCache(res, 120);
      return res.json(cached);
    }

    const [adminValues, clients] = await Promise.all([
      getAdminValues([
        { key: 'personalData', fallback: {} },
        { key: 'bioContent', fallback: {} },
        { key: 'siteText', fallback: {} },
        { key: 'latestWorkPosts', fallback: [] },
      ]),
      listClients(),
    ]);

    const response = {
      personalData: adminValues.personalData || {},
      bioContent: adminValues.bioContent || {},
      siteText: adminValues.siteText || {},
      latestWorkPosts: adminValues.latestWorkPosts || [],
      clients: clients.clients,
      clientsPagination: clients.pagination,
      source: 'database',
    };

    setCache('home-data', response);
    setApiCache(res, 120);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin-data', async (req, res) => {
  const { key, value } = req.body;
  if (!key || value === undefined) {
    return res.status(400).json({ error: 'Missing key or value' });
  }
  if (!requireDatabase(res)) return;

  try {
    await setAdminValue(key, value);
    res.json({ success: true, source: 'database' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin-data', async (req, res) => {
  if (canUseLocalContentFallback()) {
    const response = { source: 'local-fallback', data: localContent };
    setApiCache(res, 60);
    return res.json(response);
  }
  if (!requireDatabase(res)) return;

  try {
    const cached = getCache('all-admin-data');
    if (cached) {
      res.setHeader('X-Cache-Status', 'HIT');
      setApiCache(res, 60);
      return res.json(cached);
    }

    const result = await dbQuery('SELECT key, value FROM admin_data ORDER BY key');
    const data = result.rows.reduce((acc, row) => {
      acc[row.key] = parseJson(row.value, row.value);
      return acc;
    }, {});

    const response = { source: 'database', data };
    setCache('all-admin-data', response);
    setApiCache(res, 60);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin-data/all', async (req, res) => {
  if (canUseLocalContentFallback()) {
    const rows = Object.entries(localContent).map(([key, value]) => ({
      key,
      value: JSON.stringify(value),
    }));
    return res.json({ source: 'local-fallback', rows });
  }
  if (!requireDatabase(res)) return;

  try {
    const result = await dbQuery('SELECT key, value FROM admin_data ORDER BY key');
    res.json({ source: 'database', rows: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin-data/:key', async (req, res) => {
  if (canUseLocalContentFallback()) {
    const value = getLocalAdminValue(req.params.key, null);
    if (value === null) return res.status(404).json({ error: 'Not found' });
    setApiCache(res, 120);
    return res.json({ value, source: 'local-fallback' });
  }
  if (!requireDatabase(res)) return;

  try {
    const value = await getAdminValue(req.params.key, null);
    if (value === null) return res.status(404).json({ error: 'Not found' });
    setApiCache(res, 120);
    res.json({ value, source: 'database' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/clients', async (req, res) => {
  if (canUseLocalContentFallback()) {
    const includeMedia = String(req.query.includeMedia || '').toLowerCase() === 'true';
    const page = Number.isFinite(Number(req.query.page)) ? Number(req.query.page) : 1;
    const limit = Number.isFinite(Number(req.query.limit)) ? Number(req.query.limit) : undefined;
    const response = listLocalClients({
      page,
      limit,
      search: req.query.search,
      category: req.query.category,
      includeMedia,
    });
    setApiCache(res, includeMedia ? 30 : 120);
    return res.json(response);
  }
  if (!requireDatabase(res)) return;

  try {
    const includeMedia = String(req.query.includeMedia || '').toLowerCase() === 'true';
    const page = Number.isFinite(Number(req.query.page)) ? Number(req.query.page) : 1;
    const limit = Number.isFinite(Number(req.query.limit)) ? Number(req.query.limit) : undefined;
    const response = await listClients({
      page,
      limit,
      search: req.query.search,
      category: req.query.category,
      includeMedia,
    });
    setApiCache(res, includeMedia ? 30 : 120);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/clients/:id', async (req, res) => {
  if (canUseLocalContentFallback()) {
    const clientId = Number(req.params.id);
    if (!Number.isSafeInteger(clientId)) {
      return res.status(400).json({ error: 'Invalid client id' });
    }

    const includeMedia = String(req.query.includeMedia || '').toLowerCase() === 'true';
    const client = getLocalClientById(clientId, includeMedia);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    setApiCache(res, includeMedia ? 30 : 120);
    return res.json({ client, source: 'local-fallback' });
  }
  if (!requireDatabase(res)) return;

  try {
    const clientId = Number(req.params.id);
    if (!Number.isSafeInteger(clientId)) {
      return res.status(400).json({ error: 'Invalid client id' });
    }

    const includeMedia = String(req.query.includeMedia || '').toLowerCase() === 'true';
    const client = await getClientById(clientId, includeMedia);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    setApiCache(res, includeMedia ? 30 : 120);
    res.json({ client, source: 'database' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/clients/:id/media', async (req, res) => {
  const dedupeMediaItems = (items) => {
    const seen = new Set();
    const list = Array.isArray(items) ? items : [];
    const result = [];

    for (const item of list) {
      const url = text(item?.url);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      result.push(item);
    }

    return result;
  };

  if (canUseLocalContentFallback()) {
    const clientId = Number(req.params.id);
    if (!Number.isSafeInteger(clientId)) {
      return res.status(400).json({ error: 'Invalid client id' });
    }

    const client = getLocalClientById(clientId, true);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    const uniqueMedia = dedupeMediaItems(client.media);
    const uniqueImages = uniqueStrings(uniqueMedia.map((entry) => entry?.url));

    const response = {
      clientId,
      media: uniqueMedia,
      images: uniqueImages,
      count: uniqueMedia.length,
      source: 'local-fallback',
    };
    setApiCache(res, 30);
    return res.json(response);
  }
  if (!requireDatabase(res)) return;

  try {
    const clientId = Number(req.params.id);
    if (!Number.isSafeInteger(clientId)) {
      return res.status(400).json({ error: 'Invalid client id' });
    }

    const cacheKey = `client-media:${clientId}`;
    const cached = getCache(cacheKey);
    if (cached) {
      res.setHeader('X-Cache-Status', 'HIT');
      setApiCache(res, 60);
      return res.json(cached);
    }

    const client = await getClientById(clientId, true);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const uniqueMedia = dedupeMediaItems(client.media || []);
    const uniqueImages = uniqueStrings([
      ...(Array.isArray(client.images) ? client.images : []),
      ...uniqueMedia.map((entry) => entry?.url),
    ]);

    const response = {
      clientId,
      media: uniqueMedia,
      images: uniqueImages,
      count: uniqueMedia.length,
      source: 'database',
    };

    setCache(cacheKey, response);
    setApiCache(res, 60);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/clients', async (req, res) => {
  const { clients } = req.body;
  if (!Array.isArray(clients)) {
    return res.status(400).json({ error: 'clients must be an array' });
  }
  if (clients.length === 0) {
    return res.status(400).json({ error: 'Refusing to replace clients with an empty array' });
  }
  if (!requireDatabase(res)) return;

  try {
    await withTransaction(async (dbClient) => {
      await dbClient.query('DELETE FROM client_media');
      await dbClient.query('DELETE FROM clients');

      for (const [index, client] of clients.entries()) {
        await upsertClient(dbClient, normalizeClient(client, Date.now() + index));
      }
    });

    clearCache();
    res.json({ success: true, count: clients.length, source: 'database' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/clients/add', async (req, res) => {
  if (!requireDatabase(res)) return;

  try {
    const prepared = normalizeClient(req.body, Date.now());
    await withTransaction(async (dbClient) => upsertClient(dbClient, prepared));
    clearCache();
    res.json({ success: true, client: await getClientById(prepared.id, true), source: 'database' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/clients/:id', async (req, res) => {
  if (!requireDatabase(res)) return;

  try {
    const clientId = Number(req.params.id);
    if (!Number.isSafeInteger(clientId)) {
      return res.status(400).json({ error: 'Invalid client id' });
    }

    const existing = await getClientById(clientId, true);
    if (!existing) return res.status(404).json({ error: 'Client not found' });

    const prepared = normalizeClient(
      {
        ...existing,
        ...req.body,
        id: clientId,
        images: Array.isArray(req.body.images) ? req.body.images : existing.images || [],
      },
      clientId
    );

    await withTransaction(async (dbClient) => upsertClient(dbClient, prepared));
    clearCache();
    res.json({ success: true, client: await getClientById(clientId, true), source: 'database' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/clients/:id', async (req, res) => {
  if (!requireDatabase(res)) return;

  try {
    const clientId = Number(req.params.id);
    if (!Number.isSafeInteger(clientId)) {
      return res.status(400).json({ error: 'Invalid client id' });
    }

    const result = await dbQuery('DELETE FROM clients WHERE id = $1', [clientId]);
    clearCache();
    res.json({ success: true, deleted: result.rowCount, source: 'database' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/media/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const folder = buildMediaRoute(req.body.clientFolder || 'misc');
    res.json({
      success: true,
      url: mediaUrl(`/clients/${folder}/${req.file.filename}`),
      path: req.file.path,
      filename: req.file.filename,
      size: req.file.size,
      type: mediaType(req.file.filename),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/media/upload-multiple', upload.array('files', 50), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files uploaded' });
    }

    const folder = buildMediaRoute(req.body.clientFolder || 'misc');
    const files = req.files.map((file) => ({
      url: mediaUrl(`/clients/${folder}/${file.filename}`),
      filename: file.filename,
      size: file.size,
      type: mediaType(file.filename),
    }));

    res.json({ success: true, files, count: files.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.use((req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate, no-transform');
  res.vary('Accept-Encoding');
  res.removeHeader('Content-Encoding');
  res.sendFile(path.join(distPath, 'index.html'));
});

initializeDatabase().catch((error) => {
  databaseError = error.message;
  console.warn('Database startup failed:', error.message);
});

if (pool && typeof pool.on === 'function') {
  pool.on('error', (error) => {
    databaseReady = false;
    databaseError = error.message;
  });
}

setInterval(() => {
  if (pool && !databaseReady) {
    initializeDatabase().catch((error) => {
      databaseError = error.message;
    });
  }
}, 30000).unref();

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Cache TTL: ${CACHE_TTL / 1000} seconds`);
});
