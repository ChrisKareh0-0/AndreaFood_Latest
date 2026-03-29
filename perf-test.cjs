// Performance test script for Railway API
const https = require('https');
const http = require('http');

const BASE_URL = process.env.BASE_URL || 'https://your-railway-url.railway.app';

async function testEndpoint(method, endpoint) {
  return new Promise((resolve) => {
    const url = new URL(endpoint, BASE_URL);
    const lib = url.protocol === 'https:' ? https : http;
    
    const startTime = Date.now();
    
    const req = lib.request(url, { method }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const duration = Date.now() - startTime;
        const sizeKB = Math.round(data.length / 1024);
        resolve({
          endpoint,
          status: res.statusCode,
          duration,
          sizeKB,
          sizeMB: (sizeKB / 1024).toFixed(2)
        });
      });
    });
    
    req.on('error', (err) => {
      resolve({
        endpoint,
        status: 0,
        duration: Date.now() - startTime,
        error: err.message
      });
    });
    
    req.setTimeout(60000, () => {
      req.destroy();
      resolve({
        endpoint,
        status: 0,
        duration: Date.now() - startTime,
        error: 'Timeout'
      });
    });
    
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Performance Test for Railway API\n');
  console.log(`Base URL: ${BASE_URL}\n`);
  console.log('Testing endpoints...\n');
  
  const endpoints = [
    'GET /api/health',
    'GET /api/admin-data/personalData',
    'GET /api/admin-data/bioContent',
    'GET /api/admin-data/siteText',
    'GET /api/admin-data/latestWorkPosts',
    'GET /api/clients',
    'GET /api/admin-data',
  ];
  
  const results = [];
  
  for (const ep of endpoints) {
    const [method, endpoint] = ep.split(' ');
    process.write(`  Testing ${endpoint}... `);
    const result = await testEndpoint(method, endpoint);
    results.push(result);
    
    if (result.error) {
      console.log(`❌ ${result.duration}ms - ${result.error}`);
    } else {
      const statusColor = result.status >= 200 && result.status < 300 ? '✅' : '❌';
      console.log(`${statusColor} ${result.duration}ms - ${result.sizeMB}MB`);
    }
  }
  
  console.log('\n📊 Summary:\n');
  console.log('Endpoint'.padEnd(40), 'Status'.padEnd(8), 'Time'.padEnd(10), 'Size');
  console.log('─'.repeat(70));
  
  results.forEach(r => {
    const status = r.status || 'ERR';
    const time = `${r.duration}ms`;
    const size = r.sizeMB ? `${r.sizeMB}MB` : 'N/A';
    console.log(
      r.endpoint.padEnd(40),
      status.toString().padEnd(8),
      time.padEnd(10),
      size
    );
  });
  
  const slowEndpoints = results.filter(r => r.duration > 5000);
  if (slowEndpoints.length > 0) {
    console.log('\n⚠️  SLOW ENDPOINTS (>5s):\n');
    slowEndpoints.forEach(r => {
      console.log(`   ${r.endpoint}: ${r.duration}ms (${r.sizeMB}MB)`);
    });
  }
}

runTests().catch(console.error);
