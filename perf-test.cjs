const https = require('https');
const http = require('http');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8080';

function requestJson(method, endpoint) {
  return new Promise((resolve) => {
    const url = new URL(endpoint, BASE_URL);
    const lib = url.protocol === 'https:' ? https : http;
    const startTime = Date.now();

    const req = lib.request(url, { method }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        const duration = Date.now() - startTime;
        const sizeKB = Math.round(Buffer.byteLength(data, 'utf8') / 1024);
        let json = null;

        try {
          json = JSON.parse(data);
        } catch {
          json = null;
        }

        resolve({
          endpoint,
          status: res.statusCode,
          ok: res.statusCode >= 200 && res.statusCode < 300,
          duration,
          sizeKB,
          sizeMB: (sizeKB / 1024).toFixed(2),
          body: json,
          error: res.statusCode >= 400
            ? (json?.error || `HTTP ${res.statusCode}`)
            : (!json ? 'Non-JSON success response' : null),
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        endpoint,
        status: 0,
        ok: false,
        duration: Date.now() - startTime,
        sizeKB: 0,
        sizeMB: '0.00',
        body: null,
        error: error.message,
      });
    });

    req.setTimeout(60000, () => {
      req.destroy();
      resolve({
        endpoint,
        status: 0,
        ok: false,
        duration: Date.now() - startTime,
        sizeKB: 0,
        sizeMB: '0.00',
        body: null,
        error: 'Timeout',
      });
    });

    req.end();
  });
}

function requestResource(method, endpoint) {
  return new Promise((resolve) => {
    const url = new URL(endpoint, BASE_URL);
    const lib = url.protocol === 'https:' ? https : http;
    const startTime = Date.now();

    const req = lib.request(url, { method }, (res) => {
      let sizeBytes = 0;
      res.on('data', (chunk) => {
        sizeBytes += chunk.length;
      });
      res.on('end', () => {
        resolve({
          endpoint,
          status: res.statusCode,
          ok: res.statusCode >= 200 && res.statusCode < 300,
          duration: Date.now() - startTime,
          sizeKB: Math.round(sizeBytes / 1024),
          sizeMB: (sizeBytes / 1024 / 1024).toFixed(2),
          contentType: res.headers['content-type'] || '',
          error: res.statusCode >= 400 ? `HTTP ${res.statusCode}` : null,
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        endpoint,
        status: 0,
        ok: false,
        duration: Date.now() - startTime,
        sizeKB: 0,
        sizeMB: '0.00',
        contentType: '',
        error: error.message,
      });
    });

    req.setTimeout(60000, () => {
      req.destroy();
      resolve({
        endpoint,
        status: 0,
        ok: false,
        duration: Date.now() - startTime,
        sizeKB: 0,
        sizeMB: '0.00',
        contentType: '',
        error: 'Timeout',
      });
    });

    req.end();
  });
}

async function runTests() {
  console.log('API performance benchmark');
  console.log(`Base URL: ${BASE_URL}\n`);

  const basicEndpoints = [
    'GET /api/health',
    'GET /api/home-data',
    'GET /api/clients?limit=12',
    'GET /api/admin-data/siteText',
    'GET /api/admin-data/personalData',
  ];

  const results = [];

  for (const entry of basicEndpoints) {
    const [method, endpoint] = entry.split(' ');
    process.stdout.write(`Testing ${endpoint}... `);
    const result = await requestJson(method, endpoint);
    results.push(result);
    if (!result.ok || result.error) {
      console.log(`ERR ${result.duration}ms (${result.error})`);
    } else {
      console.log(`OK ${result.duration}ms (${result.sizeMB}MB)`);
    }
  }

  const clientsResponse = results.find((result) => result.endpoint === '/api/clients?limit=12');
  const firstClientId = clientsResponse?.body?.clients?.[0]?.id;

  if (firstClientId) {
    const detailEndpoint = `/api/clients/${firstClientId}/media`;
    process.stdout.write(`Testing ${detailEndpoint}... `);
    const detailResult = await requestJson('GET', detailEndpoint);
    results.push(detailResult);
    if (!detailResult.ok || detailResult.error) {
      console.log(`ERR ${detailResult.duration}ms (${detailResult.error})`);
    } else {
      console.log(`OK ${detailResult.duration}ms (${detailResult.sizeMB}MB)`);

      const sampleAsset = detailResult.body?.media?.[0]?.url;
      if (sampleAsset) {
        process.stdout.write(`Testing asset ${sampleAsset}... `);
        const assetResult = await requestResource('GET', sampleAsset);
        results.push(assetResult);
        if (!assetResult.ok || assetResult.error) {
          console.log(`ERR ${assetResult.duration}ms (${assetResult.error})`);
        } else {
          console.log(`OK ${assetResult.duration}ms (${assetResult.sizeMB}MB ${assetResult.contentType})`);
        }
      }
    }
  } else {
    console.log('Skipping detail media benchmark because no client id was returned.');
  }

  console.log('\nSummary');
  console.log('Endpoint'.padEnd(36), 'Status'.padEnd(8), 'Time'.padEnd(10), 'Size');
  console.log('─'.repeat(72));

  results.forEach((result) => {
    const status = result.status || 'ERR';
    const time = `${result.duration}ms`;
    const size = `${result.sizeMB}MB`;
    console.log(
      result.endpoint.padEnd(36),
      String(status).padEnd(8),
      time.padEnd(10),
      size
    );
  });

  const slow = results.filter((result) => result.duration > 2000);
  if (slow.length > 0) {
    console.log('\nSlow endpoints (>2s)');
    slow.forEach((result) => {
      console.log(`- ${result.endpoint}: ${result.duration}ms (${result.sizeMB}MB)`);
    });
  }
}

runTests().catch((error) => {
  console.error(error);
  process.exit(1);
});
