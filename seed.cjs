const pool = require('./db.cjs');

const bioContent = {
  aboutTitle: 'A Glimpse into the Journey..',
  aboutParagraph1: 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.',
  aboutParagraph2: 'Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait onummy nibh euismod tincidunt ut laoreet dolore.',
  servicesDescription: 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat.',
  contactSubtitle: 'Ready to bring your culinary vision to life?',
  contactDescription: "Let's discuss your next foodstyling project & create something truly mouth-watering."
};

const latestWorkPosts = [
  { id: 1, title: 'New campaign highlights', excerpt: 'A quick look at a recent food styling set, focusing on texture, light, and storytelling through color.', imageUrl: '' },
  { id: 2, title: 'Behind the scenes', excerpt: 'From prop selection to final plating — a short behind-the-scenes recap of the process and creative choices.', imageUrl: '' }
];

const siteText = {
  navigation: { home: 'Home', journey: 'Journey', clients: 'Clients', myWork: 'My Work', creativeServices: 'Creative Services', letsConnect: "Let's Connect", login: 'Login' },
  home: {
    meetArtistTitle: 'Meet\nThe\nArtist',
    latestWorkTitle: 'Latest Work',
    latestWorkDescription: 'A selection of recent food styling projects showcasing creativity and attention to detail.',
    myWorkTitle: 'My Work',
    searchPlaceholder: 'Search clients...',
    servicesTitle: 'Creative Services',
    contactTitlePrefix: "Let's",
    contactTitleEmphasis: 'Connect',
    contactNamePlaceholder: 'Your Name',
    contactEmailPlaceholder: 'Your Email',
    contactSubjectPlaceholder: 'Subject',
    contactMessagePlaceholder: 'Your Message',
    contactSendLabel: 'Send Message',
    placeholderArtistPhoto: 'Artist Photo',
    placeholderPicture: 'Picture'
  },
  myWork: { title: 'My Work', searchPlaceholder: 'Search clients...', carouselClientNamePlaceholder: "Client's Name" },
  clientsGallery: { title: 'Clients Gallery', description: '' },
  footer: {
    apronPlaceholder: 'Apron Logo',
    logoPrimary: 'Andrea',
    logoSecondary: 'FoodStyle',
    copyrightPrefix: 'Copyright',
    allRightsReservedSuffix: 'All Rights Reserved',
    poweredByPrefix: 'Powered by',
    poweredByName: 'FourthDimension'
  },
  login: {
    title: 'Admin Login',
    subtitle: 'Welcome back! Please login to your account.',
    usernameLabel: 'Username',
    usernamePlaceholder: 'Enter your username',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter your password',
    submitLabel: 'Login to Dashboard',
    invalidCredentials: 'Invalid credentials',
    defaultCredentialsNote: 'Default credentials: admin / admin123'
  }
};

async function seed() {
  const q = 'INSERT INTO admin_data(key, value) VALUES($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2';

  await pool.query(q, ['bioContent', JSON.stringify(bioContent)]);
  console.log('✅ bioContent seeded');

  await pool.query(q, ['latestWorkPosts', JSON.stringify(latestWorkPosts)]);
  console.log('✅ latestWorkPosts seeded');

  await pool.query(q, ['siteText', JSON.stringify(siteText)]);
  console.log('✅ siteText seeded');

  const result = await pool.query('SELECT key FROM admin_data');
  console.log('\nAll keys in database:', result.rows.map(r => r.key));

  process.exit(0);
}

seed().catch(e => { console.error('ERR:', e.message); process.exit(1); });
