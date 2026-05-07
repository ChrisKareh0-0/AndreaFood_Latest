require('dotenv').config();

const fs = require('fs');
const path = require('path');

const projectRoot = __dirname;
const localStorePath = path.join(projectRoot, '.local-store.json');
const apiBase = String(
  process.env.API_BASE ||
  process.argv[2] ||
  'https://andreafoodstyle.com'
).trim().replace(/\/$/, '');

function readLocalStore() {
  if (!fs.existsSync(localStorePath)) return {};

  try {
    return JSON.parse(fs.readFileSync(localStorePath, 'utf8'));
  } catch {
    return {};
  }
}

function writeLocalStore(payload) {
  fs.writeFileSync(localStorePath, `${JSON.stringify(payload, null, 2)}\n`);
}

async function fetchJson(endpoint) {
  const response = await fetch(`${apiBase}${endpoint}`);

  if (!response.ok) {
    throw new Error(`${endpoint} failed with HTTP ${response.status}`);
  }

  return response.json();
}

function uniqueStrings(values) {
  const seen = new Set();
  const result = [];

  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }

  return result;
}

function normalizeClient(client) {
  const mediaUrls = Array.isArray(client?.media)
    ? client.media.map((item) => item?.url)
    : [];

  return {
    id: client?.id,
    name: client?.name || '',
    slug: client?.slug || '',
    logo: client?.logo || '',
    thumbnailUrl: client?.thumbnailUrl || '',
    categories: Array.isArray(client?.categories) ? client.categories : [],
    description: client?.description || '',
    images: uniqueStrings([
      ...(Array.isArray(client?.images) ? client.images : []),
      ...mediaUrls,
    ]),
  };
}

async function main() {
  const [homeData, clientsData] = await Promise.all([
    fetchJson('/api/home-data'),
    fetchJson('/api/clients?includeMedia=true&limit=1000'),
  ]);

  const payload = readLocalStore();
  const clients = Array.isArray(clientsData?.clients)
    ? clientsData.clients
    : Array.isArray(homeData?.clients)
      ? homeData.clients
      : [];

  payload.personalData = JSON.stringify(homeData?.personalData || {});
  payload.bioContent = JSON.stringify(homeData?.bioContent || {});
  payload.siteText = JSON.stringify(homeData?.siteText || {});
  payload.latestWorkPosts = JSON.stringify(Array.isArray(homeData?.latestWorkPosts) ? homeData.latestWorkPosts : []);
  payload.clients = JSON.stringify(clients.map(normalizeClient));

  writeLocalStore(payload);

  console.log(`Synced production data from ${apiBase}`);
  console.log(`- personalData: ${Object.keys(homeData?.personalData || {}).length} fields`);
  console.log(`- bioContent: ${Object.keys(homeData?.bioContent || {}).length} fields`);
  console.log(`- siteText: ${Object.keys(homeData?.siteText || {}).length} sections`);
  console.log(`- latestWorkPosts: ${Array.isArray(homeData?.latestWorkPosts) ? homeData.latestWorkPosts.length : 0}`);
  console.log(`- clients: ${clients.length}`);
  console.log(`Wrote ${localStorePath}`);
}

main().catch((error) => {
  console.error(`Production data sync failed: ${error.message}`);
  process.exit(1);
});
