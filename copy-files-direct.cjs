// Direct file copy script - no HTTP needed
// Copies files directly from media folder to public/clients

const fs = require('fs');
const path = require('path');

const MEDIA_FOLDER = '/Users/chris/dev/For Chris/Web Materials';
const PUBLIC_CLIENTS = path.join(__dirname, 'public', 'clients');

// Client names list
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

function normalizeName(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function copyFolder(src, dst) {
  if (!fs.existsSync(dst)) {
    fs.mkdirSync(dst, { recursive: true });
  }
  
  const files = fs.readdirSync(src);
  let copied = 0;
  let totalSize = 0;
  
  for (const file of files) {
    const srcFile = path.join(src, file);
    const dstFile = path.join(dst, file);
    
    if (fs.statSync(srcFile).isDirectory()) {
      continue; // Skip subdirectories
    }
    
    const ext = path.extname(file).toLowerCase();
    if (!['.mp4', '.jpg', '.jpeg', '.png', '.webm', '.mov'].includes(ext)) {
      continue; // Skip non-media files
    }
    
    try {
      fs.copyFileSync(srcFile, dstFile);
      const size = fs.statSync(dstFile).size;
      copied++;
      totalSize += size;
      console.log(`  ✓ ${file} (${(size/1024/1024).toFixed(2)} MB)`);
    } catch (err) {
      console.log(`  ✗ ${file}: ${err.message}`);
    }
  }
  
  return { copied, totalSize: (totalSize / 1024 / 1024).toFixed(2) };
}

async function runDirectCopy() {
  console.log('📁 Direct File Copy Script\n');
  console.log('='.repeat(60));
  console.log(`Source: ${MEDIA_FOLDER}`);
  console.log(`Destination: ${PUBLIC_CLIENTS}`);
  console.log('='.repeat(60));
  console.log();

  if (!fs.existsSync(MEDIA_FOLDER)) {
    console.error(`❌ Source folder not found: ${MEDIA_FOLDER}`);
    return;
  }

  // Ensure destination exists
  if (!fs.existsSync(PUBLIC_CLIENTS)) {
    fs.mkdirSync(PUBLIC_CLIENTS, { recursive: true });
  }

  const clientFolders = fs.readdirSync(MEDIA_FOLDER)
    .filter(item => {
      const itemPath = path.join(MEDIA_FOLDER, item);
      return fs.statSync(itemPath).isDirectory();
    });

  console.log(`📁 Found ${clientFolders.length} client folders\n`);

  let totalCopied = 0;
  let totalFolders = 0;
  let grandTotalSize = 0;
  const matchedClients = [];

  for (const folderName of clientFolders) {
    const folderPath = path.join(MEDIA_FOLDER, folderName);
    const normalizedFolder = normalizeName(folderName);
    
    // Find matching client
    let matchingClientName = null;
    
    const exactMatch = CLIENT_NAMES.find(name => normalizeName(name) === normalizedFolder);
    if (exactMatch) {
      matchingClientName = exactMatch;
    } else {
      for (const name of CLIENT_NAMES) {
        const normalizedName = normalizeName(name);
        if (normalizedFolder.includes(normalizedName) || normalizedName.includes(normalizedFolder)) {
          matchingClientName = name;
          break;
        }
      }
    }

    if (!matchingClientName) {
      console.log(`⚠️  No match: "${folderName}"`);
      continue;
    }

    console.log(`\n📂 ${folderName} → ${matchingClientName}`);
    totalFolders++;
    matchedClients.push(matchingClientName);

    const clientFolderName = normalizeName(matchingClientName).replace(/\s+/g, '-');
    const dstPath = path.join(PUBLIC_CLIENTS, clientFolderName);
    
    const result = copyFolder(folderPath, dstPath);
    console.log(`   Copied ${result.copied} files (${result.totalSize} MB)`);
    
    totalCopied += result.copied;
    grandTotalSize += parseFloat(result.totalSize);
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Copy Complete!');
  console.log(`   ✅ Clients processed: ${totalFolders}`);
  console.log(`   ✅ Files copied: ${totalCopied}`);
  console.log(`   📦 Total size: ${(grandTotalSize/1024).toFixed(2)} GB (${grandTotalSize.toFixed(0)} MB)`);
  console.log(`   📝 Matched clients: ${matchedClients.length}`);
  console.log('='.repeat(60));
  console.log('\n💡 Files are now in: /public/clients/');
  console.log('   They will be served from: /clients/[client-name]/');
  console.log('\n📋 Next: Run the database seed script to add clients with URLs');
}

runDirectCopy().catch(err => {
  console.error('\n❌ Error:', err);
  process.exit(1);
});
