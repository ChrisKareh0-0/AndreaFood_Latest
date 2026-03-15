// Upload client media to Railway Volume Storage
// Files are stored in /app/public/clients/[client-name]/ and served statically

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const MEDIA_FOLDER = '/Users/chris/dev/For Chris/Web Materials';
const API_BASE = 'http://localhost:8080';

// Normalize client names for matching
function normalizeName(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Get file size in MB
function getFileSizeMB(filePath) {
  const stats = fs.statSync(filePath);
  return (stats.size / (1024 * 1024)).toFixed(2);
}

// Upload file to Railway server
async function uploadFile(filePath, clientFolder) {
  const fileName = path.basename(filePath);
  const ext = path.extname(fileName).toLowerCase();
  
  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    form.append('clientFolder', clientFolder);
    
    const response = await fetch(`${API_BASE}/api/media/upload`, {
      method: 'POST',
      body: form
    });
    
    const result = await response.json();
    
    if (result.success) {
      return {
        success: true,
        url: result.url,
        path: result.path
      };
    } else {
      return {
        success: false,
        error: result.error
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function uploadMedia() {
  console.log('🚂 Railway Media Upload Script\n');
  console.log('=' .repeat(50));
  console.log('This script will:');
  console.log('1. Upload media files to Railway Volume Storage');
  console.log('2. Store file URLs in the database');
  console.log('3. Files will be served from /clients/[client-name]/');
  console.log('='.repeat(50));
  console.log();
  
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
  let totalSize = 0;

  // Process each folder
  for (const folderName of clientFolders) {
    const folderPath = path.join(MEDIA_FOLDER, folderName);
    const normalizedFolder = normalizeName(folderName);
    
    // Find matching client
    let matchingClient = null;
    let matchType = '';
    
    if (clientMap.has(normalizedFolder)) {
      matchingClient = clientMap.get(normalizedFolder);
      matchType = 'exact';
    } else {
      for (const [normalizedName, client] of clientMap.entries()) {
        if (normalizedFolder.includes(normalizedName) || normalizedName.includes(normalizedFolder)) {
          matchingClient = client;
          matchType = 'partial';
          break;
        }
      }
    }

    if (!matchingClient) {
      console.log(`⚠️  No matching client for folder: "${folderName}"`);
      totalSkipped++;
      continue;
    }

    console.log(`\n📂 ${folderName} → ${matchingClient.name} (${matchType})`);

    // Get all media files
    const files = fs.readdirSync(folderPath)
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ext === '.mp4' || ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.webm' || ext === '.mov';
      })
      .sort(); // Sort alphabetically for consistent ordering

    if (files.length === 0) {
      console.log(`   └─ No media files found`);
      continue;
    }

    console.log(`   └─ ${files.length} file(s) to upload`);

    // Upload files
    const fileUrls = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filePath = path.join(folderPath, file);
      const sizeMB = getFileSizeMB(filePath);
      
      process.stdout.write(`      [${String(i + 1).padStart(3, '0')}/${files.length}] ${file} (${sizeMB} MB)... `);
      
      const clientFolder = normalizeName(matchingClient.name).replace(/\s+/g, '-');
      const result = await uploadFile(filePath, clientFolder);
      
      if (result.success) {
        fileUrls.push(result.url);
        totalUploaded++;
        totalSize += parseFloat(sizeMB);
        console.log(`✓`);
      } else {
        console.log(`✗ ${result.error}`);
        totalErrors++;
      }
    }

    // Update client in database with URLs
    if (fileUrls.length > 0) {
      try {
        const updateData = {
          images: fileUrls,
          categories: matchingClient.categories || ['Commercial']
        };

        const res = await fetch(`${API_BASE}/api/clients/${matchingClient.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        });

        const result = await res.json();
        if (result.success) {
          console.log(`   ✅ Updated ${matchingClient.name} with ${fileUrls.length} files\n`);
        } else {
          console.log(`   ❌ Failed to update: ${result.error}\n`);
          totalErrors++;
        }
      } catch (err) {
        console.log(`   ❌ Error updating: ${err.message}\n`);
        totalErrors++;
      }
    } else {
      console.log();
    }
  }

  const totalSizeGB = (totalSize / 1024).toFixed(2);
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Upload Summary:');
  console.log(`   ✅ Files uploaded: ${totalUploaded}`);
  console.log(`   📦 Total size: ${totalSizeGB} GB (${totalSize.toFixed(0)} MB)`);
  console.log(`   ⚠️  Skipped: ${totalSkipped}`);
  console.log(`   ❌ Errors: ${totalErrors}`);
  console.log('='.repeat(50));
  console.log('\n💡 Files are stored in /app/public/clients/ on Railway');
  console.log('   and served from /clients/[client-name]/');
}

// Run the script
uploadMedia().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
