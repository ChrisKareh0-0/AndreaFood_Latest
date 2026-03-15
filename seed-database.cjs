// Seed database with all clients and their media URLs
// Run this AFTER copy-files-direct.cjs

const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:8080';
const PUBLIC_CLIENTS = path.join(__dirname, 'public', 'clients');

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

function getMediaFiles(folderPath) {
  if (!fs.existsSync(folderPath)) return [];
  
  return fs.readdirSync(folderPath)
    .filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.mp4', '.jpg', '.jpeg', '.png', '.webm', '.mov'].includes(ext);
    })
    .sort()
    .map(file => `/clients/${path.basename(folderPath)}/${file}`);
}

async function seedDatabase() {
  console.log('🌱 Database Seed Script\n');
  console.log('='.repeat(60));
  console.log('This will add/update all 51 clients in the database');
  console.log('with URLs to their media files');
  console.log('='.repeat(60));
  console.log();

  let added = 0;
  let updated = 0;
  let errors = 0;
  let totalFiles = 0;

  for (const clientName of CLIENT_NAMES) {
    const normalized = normalizeName(clientName);
    const clientFolder = normalized.replace(/\s+/g, '-');
    const folderPath = path.join(PUBLIC_CLIENTS, clientFolder);
    
    const mediaFiles = getMediaFiles(folderPath);
    
    process.stdout.write(`📝 ${clientName} (${mediaFiles.length} files)... `);

    try {
      // Check if client exists
      const clientsRes = await fetch(`${API_BASE}/api/clients`);
      const clientsData = await clientsRes.json();
      const clients = clientsData.clients || [];
      
      const existingClient = clients.find(c => 
        normalizeName(c.name) === normalized
      );

      let result;
      
      if (existingClient) {
        // Update existing client
        const res = await fetch(`${API_BASE}/api/clients/${existingClient.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            images: mediaFiles,
            categories: existingClient.categories || ['Commercial']
          })
        });
        result = await res.json();
        if (result.success) {
          updated++;
          totalFiles += mediaFiles.length;
          console.log(`✓ Updated`);
        } else {
          errors++;
          console.log(`✗ ${result.error}`);
        }
      } else {
        // Add new client
        const res = await fetch(`${API_BASE}/api/clients/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: clientName,
            logo: '',
            images: mediaFiles,
            categories: ['Commercial'],
            description: ''
          })
        });
        result = await res.json();
        if (result.success) {
          added++;
          totalFiles += mediaFiles.length;
          console.log(`✓ Added`);
        } else {
          errors++;
          console.log(`✗ ${result.error}`);
        }
      }
    } catch (err) {
      errors++;
      console.log(`✗ ${err.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Seed Complete!');
  console.log(`   ✅ Clients added: ${added}`);
  console.log(`   ✅ Clients updated: ${updated}`);
  console.log(`   ✅ Total files linked: ${totalFiles}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log('='.repeat(60));
  console.log('\n💡 Your website should now show all clients with their media!');
  console.log('   Visit: http://localhost:8080');
  console.log('   Scroll to "Clients Gallery" section');
}

seedDatabase().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
