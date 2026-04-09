require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./db.cjs');

const localStorePath = path.join(__dirname, '.local-store.json');
const shouldUpdateLegacyKey = !process.argv.includes('--skip-legacy-key');

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
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

function mediaType(url) {
  if ((url || '').startsWith('data:video/')) return 'video';
  return /\.(mp4|webm|mov)$/i.test(url || '') ? 'video' : 'image';
}

function readClientsFromLocalStore() {
  if (!fs.existsSync(localStorePath)) {
    throw new Error(`Local store not found at ${localStorePath}`);
  }

  const payload = JSON.parse(fs.readFileSync(localStorePath, 'utf8'));
  const clients = JSON.parse(payload.clients || '[]');

  if (!Array.isArray(clients) || clients.length === 0) {
    throw new Error('No clients found in .local-store.json');
  }

  return clients;
}

function normalizeClient(client, fallbackId) {
  const id = Number.isSafeInteger(Number(client?.id)) ? Number(client.id) : fallbackId;
  const name = text(client?.name);

  if (!name) {
    throw new Error('Client name is required');
  }

  const images = uniqueStrings(client?.images);
  const logo = text(client?.logo);
  const categories = uniqueStrings(client?.categories);
  const description = text(client?.description);
  const thumbnailUrl = text(client?.thumbnailUrl) || images[0] || logo || '';

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

async function ensureSchema(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS admin_data (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  await client.query(`
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

  await client.query(`
    CREATE TABLE IF NOT EXISTS client_media (
      id BIGSERIAL PRIMARY KEY,
      client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'image',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function main() {
  if (!pool) {
    throw new Error('DATABASE_URL is required to run this sync');
  }

  const sourceClients = readClientsFromLocalStore();
  const normalizedClients = sourceClients.map((client, index) => normalizeClient(client, Date.now() + index));
  const totalMedia = normalizedClients.reduce((sum, client) => sum + client.images.length, 0);

  console.log(`Syncing ${normalizedClients.length} clients and ${totalMedia} media URLs from .local-store.json`);
  console.log(`Legacy admin_data.clients update: ${shouldUpdateLegacyKey ? 'enabled' : 'skipped'}`);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await ensureSchema(client);

    await client.query('DELETE FROM client_media');
    await client.query('DELETE FROM clients');

    for (const entry of normalizedClients) {
      await client.query(
        `
          INSERT INTO clients (id, slug, name, logo, categories, description, thumbnail_url, media_count, updated_at)
          VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, NOW())
        `,
        [
          entry.id,
          entry.slug,
          entry.name,
          entry.logo,
          JSON.stringify(entry.categories),
          entry.description,
          entry.thumbnailUrl,
          entry.images.length,
        ]
      );

      for (const [mediaIndex, url] of entry.images.entries()) {
        await client.query(
          'INSERT INTO client_media (client_id, url, type, sort_order) VALUES ($1, $2, $3, $4)',
          [entry.id, url, mediaType(url), mediaIndex]
        );
      }
    }

    if (shouldUpdateLegacyKey) {
      await client.query(
        `
          INSERT INTO admin_data(key, value)
          VALUES ('clients', $1)
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `,
        [JSON.stringify(sourceClients)]
      );
    }

    await client.query('COMMIT');

    const counts = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM clients) AS clients,
        (SELECT COALESCE(SUM(media_count), 0)::int FROM clients) AS total_media,
        (SELECT COUNT(*)::int FROM clients WHERE media_count > 0) AS clients_with_media,
        (SELECT COUNT(*)::int FROM clients WHERE thumbnail_url LIKE '/clients/%') AS url_thumbnails
    `);

    console.log('Sync complete:');
    console.log(JSON.stringify(counts.rows[0], null, 2));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(`Sync failed: ${error.message}`);
  process.exit(1);
});
