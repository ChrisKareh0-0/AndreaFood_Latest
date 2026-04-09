require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./db.cjs');

const personalDir = path.join(__dirname, 'public', 'clients', 'site-content', 'personal');
const latestWorkDir = path.join(__dirname, 'public', 'clients', 'site-content', 'latest-work');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function parseDataUri(value) {
  if (typeof value !== 'string' || !value.startsWith('data:')) return null;
  const match = value.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;

  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], 'base64'),
  };
}

function extensionForMimeType(mimeType) {
  const map = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/quicktime': '.mov',
  };

  return map[mimeType] || '';
}

function writeAsset(dirPath, fileName, dataUri) {
  const parsed = parseDataUri(dataUri);
  if (!parsed) return null;

  ensureDir(dirPath);
  const extension = extensionForMimeType(parsed.mimeType) || '.bin';
  const fullPath = path.join(dirPath, `${fileName}${extension}`);
  fs.writeFileSync(fullPath, parsed.buffer);

  const relativePath = `/${path.relative(path.join(__dirname, 'public'), fullPath).replace(/\\/g, '/')}`;
  return relativePath.startsWith('/clients/') ? relativePath : `/clients/${path.relative(path.join(__dirname, 'public', 'clients'), fullPath).replace(/\\/g, '/')}`;
}

async function main() {
  if (!pool) {
    throw new Error('DATABASE_URL is required to extract inline site media');
  }

  const client = await pool.connect();

  try {
    const personalResult = await client.query("SELECT value FROM admin_data WHERE key = 'personalData'");
    const latestWorkResult = await client.query("SELECT value FROM admin_data WHERE key = 'latestWorkPosts'");

    const personalData = personalResult.rows.length > 0 ? JSON.parse(personalResult.rows[0].value) : {};
    const latestWorkPosts = latestWorkResult.rows.length > 0 ? JSON.parse(latestWorkResult.rows[0].value) : [];
    const updates = [];

    const heroPath = writeAsset(personalDir, 'hero-image', personalData.heroImage);
    if (heroPath) {
      personalData.heroImage = heroPath;
      updates.push(`heroImage -> ${heroPath}`);
    }

    const profilePath = writeAsset(personalDir, 'profile-image', personalData.profileImage);
    if (profilePath) {
      personalData.profileImage = profilePath;
      updates.push(`profileImage -> ${profilePath}`);
    }

    const rewrittenPosts = Array.isArray(latestWorkPosts)
      ? latestWorkPosts.map((post) => {
          const postPath = writeAsset(latestWorkDir, `post-${post.id || Date.now()}`, post.imageUrl);
          if (!postPath) return post;
          updates.push(`latestWorkPosts[${post.id}] -> ${postPath}`);
          return { ...post, imageUrl: postPath };
        })
      : latestWorkPosts;

    await client.query('BEGIN');
    await client.query(
      `
        INSERT INTO admin_data(key, value)
        VALUES ('personalData', $1)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
      `,
      [JSON.stringify(personalData)]
    );

    await client.query(
      `
        INSERT INTO admin_data(key, value)
        VALUES ('latestWorkPosts', $1)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
      `,
      [JSON.stringify(rewrittenPosts)]
    );

    await client.query('COMMIT');

    console.log('Inline media extraction complete.');
    if (updates.length === 0) {
      console.log('No inline media fields were found.');
    } else {
      updates.forEach((entry) => console.log(`- ${entry}`));
    }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(`Extraction failed: ${error.message}`);
  process.exit(1);
});
