// Complete setup script: Seeds clients and uploads all media
// Run this ONCE to set up everything

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const MEDIA_FOLDER = '/Users/chris/dev/For Chris/Web Materials';
const API_BASE = 'http://localhost:8080';

// All clients from your folder list
const CLIENT_NAMES = [
  "Al Abdallah", "Al Baker", "Al Hallab", "Al Kanater", "Al Kazzi", "Al Massoud", 
  "Al Mouajanati", "Al Saudia Ice Cream", "Amici", "Amour", "Anthony's", "Antika", 
  "Aromate", "Arthaus", "Bakerloo", "Barista", "Bartartine", "Billy Boyz", 
  "Boneless", "Bonesless 28", "Burger Basics", "Burger King", "Burj el hamam", 
  "Casper & Gambinis", "Castania", "Chick N Fish", "Cibo", "City Canteen", 
  "Classic Sandwich", "Coby Nammoura", "Comfort", "Cortina", "Coucou", "Crunchyz", 
  "Darina", "Dipndip", "Diwan El Hashem", "Earth Goods", "Eddy's Street Food", 
  "El Comandante", "El Sada", "French Canteen", "Frunch Eatery", "Furn Beaino", 
  "Gro & Greens", "Gulf Soda", "Hajdi", "Hawa Chicken", "Hi Cream", "Husk", 
  "Insalata"
];

// Normalize client names for matching
function normalizeName(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Get file size in MB
function getFileSizeMB(filePath) {
  const stats = fs.statSync(filePath);
  return (stats.size / (1024 * 1024)).toFixed(2);
}

// Upload file to server
async function uploadFile(filePath, clientFolder) {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  form.append('clientFolder', clientFolder);
  
  try {
    const response = await fetch(`${API_BASE}/api/media/upload`, {
      method: 'POST',
      body: form
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Add or update client in database
async function upsertClient(name, images, categories = ['Commercial']) {
  try {
    // First, try to find existing client
    const clientsRes = await fetch(`${API_BASE}/api/clients`);
    const clientsData = await clientsRes.json();
    const clients = clientsData.clients || [];
    
    const normalized = normalizeName(name);
    let existingClient = clients.find(c => normalizeName(c.name) === normalized);
    
    if (existingClient) {
      // Update existing client
      const updateData = {
        images: images,
        categories: categories
      };
      
      const res = await fetch(`${API_BASE}/api/clients/${existingClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      
      return await res.json();
    } else {
      // Add new client
      const res = await fetch(`${API_BASE}/api/clients/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name,
          logo: '',
          images: images,
          categories: categories,
          description: ''
        })
      });
      
      return await res.json();
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function runSetup() {
  console.log('🚀 Complete Setup Script\n');
  console.log('='.repeat(60));
  console.log('This will:');
  console.log('1. Seed all 51 clients to database');
  console.log('2. Upload all media files from your folder');
  console.log('3. Store file URLs in database');
  console.log('='.repeat(60));
  console.log();

  // Check if media folder exists
  if (!fs.existsSync(MEDIA_FOLDER)) {
    console.error(`❌ Media folder not found: ${MEDIA_FOLDER}`);
    return;
  }

  // Get all client folders
  const clientFolders = fs.readdirSync(MEDIA_FOLDER)
    .filter(item => {
      const itemPath = path.join(MEDIA_FOLDER, item);
      return fs.statSync(itemPath).isDirectory();
    });

  console.log(`📁 Found ${clientFolders.length} client folders\n`);

  let totalClients = 0;
  let totalFiles = 0;
  let totalSize = 0;
  let errors = 0;

  // Process each folder
  for (const folderName of clientFolders) {
    const folderPath = path.join(MEDIA_FOLDER, folderName);
    const normalizedFolder = normalizeName(folderName);
    
    // Find matching client name from our list
    let matchingClientName = null;
    let matchType = '';
    
    // Try exact match first
    const exactMatch = CLIENT_NAMES.find(name => normalizeName(name) === normalizedFolder);
    if (exactMatch) {
      matchingClientName = exactMatch;
      matchType = 'exact';
    } else {
      // Try partial match
      for (const name of CLIENT_NAMES) {
        const normalizedName = normalizeName(name);
        if (normalizedFolder.includes(normalizedName) || normalizedName.includes(normalizedFolder)) {
          matchingClientName = name;
          matchType = 'partial';
          break;
        }
      }
    }

    if (!matchingClientName) {
      console.log(`⚠️  No match for: "${folderName}"`);
      continue;
    }

    console.log(`\n📂 ${folderName} → ${matchingClientName} (${matchType})`);
    totalClients++;

    // Get all media files
    const files = fs.readdirSync(folderPath)
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ext === '.mp4' || ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.webm' || ext === '.mov';
      })
      .sort();

    if (files.length === 0) {
      console.log(`   └─ No media files`);
      // Still create client with empty images
      await upsertClient(matchingClientName, []);
      continue;
    }

    console.log(`   └─ ${files.length} file(s)`);

    // Upload files
    const fileUrls = [];
    const clientFolder = normalizedFolder.replace(/\s+/g, '-');

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filePath = path.join(folderPath, file);
      const sizeMB = getFileSizeMB(filePath);
      
      process.stdout.write(`      [${String(i + 1).padStart(3, '0')}/${files.length}] ${file} (${sizeMB} MB)... `);
      
      const result = await uploadFile(filePath, clientFolder);
      
      if (result.success) {
        fileUrls.push(result.url);
        totalFiles++;
        totalSize += parseFloat(sizeMB);
        console.log('✓');
      } else {
        console.log('✗ ' + (result.error || 'Unknown error'));
        errors++;
      }
    }

    // Update client in database
    if (fileUrls.length > 0) {
      const dbResult = await upsertClient(matchingClientName, fileUrls);
      if (dbResult.success) {
        console.log(`   ✅ Client updated with ${fileUrls.length} files`);
      } else {
        console.log(`   ❌ Database error: ${dbResult.error || 'Failed to update'}`);
        errors++;
      }
    }
  }

  const totalSizeGB = (totalSize / 1024).toFixed(2);
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Setup Complete!');
  console.log(`   ✅ Clients processed: ${totalClients}`);
  console.log(`   ✅ Files uploaded: ${totalFiles}`);
  console.log(`   📦 Total size: ${totalSizeGB} GB (${totalSize.toFixed(0)} MB)`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log('='.repeat(60));
  console.log('\n💡 Next steps:');
  console.log('   1. Check the website - clients should appear in gallery');
  console.log('   2. Deploy to Railway with a Volume mounted at /app/public/clients');
  console.log('   3. Upload files to Railway Volume via SSH');
  console.log();
}

// Run setup
runSetup().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
