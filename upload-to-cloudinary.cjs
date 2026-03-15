// Upload client media to Cloudinary and store URLs in database
// Free Cloudinary account: https://cloudinary.com/users/register/free

const fs = require('fs');
const path = require('path');
const { v2: cloudinary } = require('cloudinary');

// ========== CONFIGURATION ==========
const MEDIA_FOLDER = '/Users/chris/dev/For Chris/Web Materials';
const API_BASE = 'http://localhost:8080';

// Get your Cloudinary credentials from https://cloudinary.com/console
const CLOUDINARY_CONFIG = {
  cloud_name: 'YOUR_CLOUD_NAME', // Replace with your Cloudinary cloud name
  api_key: 'YOUR_API_KEY',       // Replace with your API key
  api_secret: 'YOUR_API_SECRET'  // Replace with your API secret
};

// Configure Cloudinary
cloudinary.config({
  cloud_name: CLOUDINARY_CONFIG.cloud_name,
  api_key: CLOUDINARY_CONFIG.api_key,
  api_secret: CLOUDINARY_CONFIG.api_secret
});

// Upload settings
const UPLOAD_SETTINGS = {
  // Image optimization
  image: {
    max_width: 1920,
    max_height: 1080,
    quality: 'auto:good',
    format: 'auto' // Auto-convert to WebP/AVIF for better compression
  },
  // Video optimization
  video: {
    max_width: 1920,
    max_height: 1080,
    quality: 'auto:good'
  }
};

// Normalize client names for matching
function normalizeName(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Upload file to Cloudinary
async function uploadToCloudinary(filePath, folder) {
  const ext = path.extname(filePath).toLowerCase();
  const isVideo = ext === '.mp4' || ext === '.webm' || ext === '.mov';
  
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: `clients/${folder}`,
      resource_type: isVideo ? 'video' : 'image',
      transformation: isVideo ? [
        { width: UPLOAD_SETTINGS.video.max_width, height: UPLOAD_SETTINGS.video.max_height, crop: 'limit' },
        { quality: UPLOAD_SETTINGS.video.quality }
      ] : [
        { width: UPLOAD_SETTINGS.image.max_width, height: UPLOAD_SETTINGS.image.max_height, crop: 'limit' },
        { quality: UPLOAD_SETTINGS.image.quality }
      ],
      eager: isVideo ? [{ width: 854, height: 480, crop: 'scale', format: 'mp4' }] : null
    });
    
    return {
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      size: result.bytes
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function uploadMedia() {
  console.log('🔍 Scanning media folder...\n');
  
  if (!fs.existsSync(MEDIA_FOLDER)) {
    console.error(`❌ Folder not found: ${MEDIA_FOLDER}`);
    return;
  }

  // Get all client folders
  const clientFolders = fs.readdirSync(MEDIA_FOLDER)
    .filter(item => {
      const itemPath = path.join(MEDIA_FOLDER, item);
      return fs.statSync(itemPath).isDirectory();
    });

  console.log(`📁 Found ${clientFolders.length} client folders\n`);

  // Fetch clients from database
  console.log('📡 Fetching clients from database...');
  const clientsRes = await fetch(`${API_BASE}/api/clients`);
  const clientsData = await clientsRes.json();
  const clients = clientsData.clients || [];
  console.log(`✅ Found ${clients.length} clients in database\n`);

  // Create name mapping
  const clientMap = new Map();
  clients.forEach(client => {
    const normalizedName = normalizeName(client.name);
    clientMap.set(normalizedName, client);
  });

  let totalUploaded = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  // Process each folder
  for (const folderName of clientFolders) {
    const folderPath = path.join(MEDIA_FOLDER, folderName);
    const normalizedFolder = normalizeName(folderName);
    
    // Find matching client
    let matchingClient = null;
    
    if (clientMap.has(normalizedFolder)) {
      matchingClient = clientMap.get(normalizedFolder);
    } else {
      for (const [normalizedName, client] of clientMap.entries()) {
        if (normalizedFolder.includes(normalizedName) || normalizedName.includes(normalizedFolder)) {
          matchingClient = client;
          break;
        }
      }
    }

    if (!matchingClient) {
      console.log(`⚠️  No matching client for folder: "${folderName}"`);
      totalSkipped++;
      continue;
    }

    console.log(`\n📂 Processing: ${folderName} → ${matchingClient.name}`);

    // Get all media files
    const files = fs.readdirSync(folderPath)
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ext === '.mp4' || ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.webm' || ext === '.mov';
      });

    if (files.length === 0) {
      console.log(`   └─ No media files found\n`);
      continue;
    }

    console.log(`   └─ Found ${files.length} file(s)`);

    // Upload files
    const imageUrls = [];
    const videoUrls = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filePath = path.join(folderPath, file);
      const stats = fs.statSync(filePath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      
      console.log(`      [${i + 1}/${files.length}] ${file} (${sizeMB} MB)...`);
      
      const result = await uploadToCloudinary(filePath, normalizeName(matchingClient.name));
      
      if (result.success) {
        const ext = path.extname(file).toLowerCase();
        if (ext === '.mp4' || ext === '.webm' || ext === '.mov') {
          videoUrls.push(result.url);
        } else {
          imageUrls.push(result.url);
        }
        console.log(`        ✓ Uploaded: ${result.url}`);
        totalUploaded++;
      } else {
        console.log(`        ❌ Error: ${result.error}`);
        totalErrors++;
      }
    }

    // Update client in database with URLs
    if (imageUrls.length > 0 || videoUrls.length > 0) {
      try {
        const updateData = {
          images: [...imageUrls, ...videoUrls],
          categories: matchingClient.categories || ['Commercial']
        };

        const res = await fetch(`${API_BASE}/api/clients/${matchingClient.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        });

        const result = await res.json();
        if (result.success) {
          console.log(`   ✅ Updated ${matchingClient.name} with ${imageUrls.length} images and ${videoUrls.length} videos\n`);
        } else {
          console.log(`   ❌ Failed to update client: ${result.error}\n`);
          totalErrors++;
        }
      } catch (err) {
        console.log(`   ❌ Error updating client: ${err.message}\n`);
        totalErrors++;
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Upload Summary:');
  console.log(`   ✅ Total files uploaded: ${totalUploaded}`);
  console.log(`   ⚠️  Folders skipped: ${totalSkipped}`);
  console.log(`   ❌ Errors: ${totalErrors}`);
  console.log('='.repeat(50));
}

// Run the script
uploadMedia().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
