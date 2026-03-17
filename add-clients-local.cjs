// Quick script to add clients to local storage (bypasses database)
const fs = require('fs');
const path = require('path');

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

// Create clients data
const clients = CLIENT_NAMES.map((name, index) => {
  const normalized = normalizeName(name);
  const clientFolder = normalized.replace(/\s+/g, '-');
  const folderPath = path.join(PUBLIC_CLIENTS, clientFolder);
  const mediaFiles = getMediaFiles(folderPath);
  
  return {
    id: 1000000 + index,
    name: name,
    logo: '',
    images: mediaFiles,
    categories: mediaFiles.some(f => f.endsWith('.mp4')) ? ['Commercial', 'TVC'] : ['Commercial'],
    description: ''
  };
});

// Save to local store file
const localStorePath = path.join(__dirname, '.local-store.json');
const localStore = {
  clients: JSON.stringify(clients)
};

fs.writeFileSync(localStorePath, JSON.stringify(localStore, null, 2));

console.log('✅ Local clients file created!');
console.log(`   📁 Location: ${localStorePath}`);
console.log(`   👥 Clients: ${clients.length}`);
console.log(`   📸 Total files: ${clients.reduce((sum, c) => sum + c.images.length, 0)}`);
console.log('\n💡 Restart the server to load local clients:');
console.log('   node server.cjs');
