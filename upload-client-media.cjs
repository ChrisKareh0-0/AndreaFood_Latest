// Script to upload client media from local folder to database
// Scans /Users/chris/dev/For Chris/Web Materials and matches folders to clients
// NOTE: Only uploads 3 smallest images per client to avoid database size limits

const fs = require('fs');
const path = require('path');

const MEDIA_FOLDER = '/Users/chris/dev/For Chris/Web Materials';
const API_BASE = 'http://localhost:8080';
const MAX_FILES_PER_CLIENT = 3; // Limit to avoid database size issues
const MAX_FILE_SIZE_MB = 2; // Skip files larger than this

// Normalize client names for matching (remove special chars, lowercase)
function normalizeName(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Convert file to base64
function fileToBase64(filePath) {
  const data = fs.readFileSync(filePath);
  return `data:${path.extname(filePath) === '.mp4' ? 'video/mp4' : 'image/jpeg'};base64,${data.toString('base64')}`;
}

// Get file size in MB
function getFileSizeMB(filePath) {
  const stats = fs.statSync(filePath);
  return (stats.size / (1024 * 1024)).toFixed(2);
}

async function uploadMedia() {
  console.log('🔍 Scanning media folder...\n');
  
  // Check if folder exists
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
    let bestMatch = '';
    
    // Try exact match first
    if (clientMap.has(normalizedFolder)) {
      matchingClient = clientMap.get(normalizedFolder);
      bestMatch = 'exact';
    } else {
      // Try partial match
      for (const [normalizedName, client] of clientMap.entries()) {
        if (normalizedFolder.includes(normalizedName) || normalizedName.includes(normalizedFolder)) {
          matchingClient = client;
          bestMatch = 'partial';
          break;
        }
      }
    }

    if (!matchingClient) {
      console.log(`⚠️  No matching client for folder: "${folderName}"`);
      totalSkipped++;
      continue;
    }

    console.log(`📂 Processing: ${folderName} → ${matchingClient.name} (${bestMatch} match)`);

    // Get all media files in folder
    const files = fs.readdirSync(folderPath)
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ext === '.mp4' || ext === '.jpg' || ext === '.jpeg';
      })
      .map(file => {
        const filePath = path.join(folderPath, file);
        return { name: file, path: filePath, size: parseFloat(getFileSizeMB(filePath)) };
      })
      .filter(f => f.size <= MAX_FILE_SIZE_MB) // Skip large files
      .sort((a, b) => a.size - b.size) // Sort by size (smallest first)
      .slice(0, MAX_FILES_PER_CLIENT); // Take only smallest files

    if (files.length === 0) {
      console.log(`   └─ No suitable media files found (files too large or none exist)\n`);
      totalSkipped++;
      continue;
    }

    console.log(`   └─ Selected ${files.length} file(s) out of ${fs.readdirSync(folderPath).filter(f => f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.mp4')).length} total`);

    // Process files
    const images = [];
    const videos = [];

    for (const file of files) {
      const ext = path.extname(file.name).toLowerCase();

      try {
        console.log(`      • ${file.name} (${file.size} MB)...`);
        
        const base64 = fileToBase64(file.path);
        
        if (ext === '.mp4') {
          videos.push(base64);
          console.log(`        ✓ Video uploaded`);
        } else {
          images.push(base64);
          console.log(`        ✓ Image uploaded`);
        }

        totalUploaded++;
      } catch (err) {
        console.log(`        ❌ Error: ${err.message}`);
        totalErrors++;
      }
    }

    // Update client in database
    if (images.length > 0 || videos.length > 0) {
      try {
        const updateData = {
          images: [...images, ...videos], // Combine images and videos
          categories: matchingClient.categories || ['Commercial']
        };

        const res = await fetch(`${API_BASE}/api/clients/${matchingClient.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        });

        const result = await res.json();
        if (result.success) {
          console.log(`   ✅ Updated ${matchingClient.name} with ${images.length} images and ${videos.length} videos\n`);
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
  console.log('\n💡 Note: Only ${MAX_FILES_PER_CLIENT} smallest images per client are uploaded');
  console.log('   to avoid database size limitations.');
  console.log('   Files larger than ${MAX_FILE_SIZE_MB}MB are skipped.');
}

// Run the script
uploadMedia().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
