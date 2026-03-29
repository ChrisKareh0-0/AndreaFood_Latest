# Portfolio API - Bruno Collection

## Setup

1. **Open Bruno** and import this collection
2. **Update the base URL** in the collection variables:
   - Click on the collection name "Portfolio API"
   - Go to the "Vars" tab
   - Change `url` to your actual Railway URL (e.g., `https://your-project.railway.app`)

## Tests Included

| # | Endpoint | Description | Expected Issue |
|---|----------|-------------|----------------|
| 1 | `GET /api/health` | Health check | Should be fast (<1s) |
| 2 | `GET /api/admin-data/personalData` | Get personal data | ~2.5MB - may be slow |
| 3 | `GET /api/admin-data/bioContent` | Get bio content | Should be fast (~1KB) |
| 4 | `GET /api/admin-data/siteText` | Get site text | Should be fast (~2KB) |
| 5 | `GET /api/admin-data/latestWorkPosts` | Get latest work posts | Should be fast (<1KB) |
| 6 | `GET /api/clients` | Get all clients | **43MB - WILL BE SLOW!** |
| 7 | `GET /api/admin-data` | Get all admin data | **~46MB - VERY SLOW!** |
| 8 | `GET /api/admin-data/all` | Get all as raw rows | Database rows |

## Running Tests

1. Run individual tests by clicking the play button
2. Or run the entire collection sequentially
3. Check response times in the results panel

## Performance Benchmarks

**Good response times:**
- Health: < 500ms
- Small data (<10KB): < 1s
- Medium data (100KB-1MB): 1-3s
- Large data (1-5MB): 3-10s
- **Your clients (43MB): 10-30s+ ⚠️**

## Expected Issues

### 🐌 Slow Endpoints (>30s)

1. **`/api/clients`** - 43MB of client data
   - **Cause**: Large JSON blob in database
   - **Impact**: Every page load fetches this
   
2. **`/api/admin-data/personalData`** - 2.5MB
   - **Cause**: Likely includes base64 images
   - **Impact**: Profile/personal section loads slowly

### Solutions (see OPTIMIZATION-GUIDE.md)

1. **Enable server-side caching** (5min TTL)
2. **Use gzip compression** (60-80% size reduction)
3. **Optimize data storage** (separate images from text)
4. **Use CDN for images** (don't store in database)
5. **Paginate clients** (load on demand)

## CLI Performance Test

Run the Node.js performance test script:

```bash
# Set your Railway URL
export BASE_URL=https://your-project.railway.app

# Run tests
node perf-test.cjs
```

This will test all endpoints and show response times.
