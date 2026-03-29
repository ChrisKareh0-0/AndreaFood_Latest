# Performance Optimization Guide

## Current Issues

Based on your database analysis:

| Data Key | Size | Problem |
|----------|------|---------|
| `clients` | **43 MB** | 51 clients with hundreds of image paths |
| `personalData` | **2.5 MB** | Likely contains base64 encoded images |
| `bioContent` | 1 KB | ✅ Fine |
| `siteText` | 2 KB | ✅ Fine |
| `latestWorkPosts` | <1 KB | ✅ Fine |

**Total API payload: ~46 MB** 😱

---

## Why 30+ Second Response Times?

### Root Causes

1. **Massive Database Queries**
   - Reading 43MB JSON blob from PostgreSQL
   - PostgreSQL has to parse and serialize huge JSON
   - Network transfer time for 43MB

2. **No Compression**
   - 43MB sent as raw JSON
   - With gzip: could be ~8-10MB (80% reduction)

3. **No Caching**
   - Every request hits the database
   - Same 43MB fetched repeatedly

4. **Railway Free Tier Limitations**
   - Limited CPU for JSON parsing
   - Database on separate instance = network latency

---

## Solutions (Priority Order)

### 🚀 Quick Wins (1-2 hours, immediate impact)

#### 1. Deploy Optimized Server

I've created `server-optimized.cjs` with:
- ✅ **In-memory caching** (5-minute TTL)
- ✅ **Gzip compression** (60-80% size reduction)
- ✅ **Cache headers** for browser caching

**Deploy steps:**

```bash
# Backup current server
cp server.cjs server.cjs.backup

# Replace with optimized version
cp server-optimized.cjs server.cjs

# Commit and push to Railway
git add server.cjs
git commit -m "Add caching and compression for performance"
git push
```

**Expected improvement:** 30s → 5-10s (cached), 15s (first load)

---

#### 2. Run Performance Test

```bash
# Install Bruno (if not already)
# Download from: https://www.usebruno.com/downloads

# Open Bruno collection
# File: bruno/Portfolio API/

# Update base_url to your Railway URL
# Run all tests and compare response times
```

Or use the CLI test:

```bash
export BASE_URL=https://your-railway-url.railway.app
node perf-test.cjs
```

---

### 📦 Medium Term (1-2 days, major impact)

#### 3. Move Images Out of Database

**Current problem:**
```json
{
  "clients": [
    {
      "name": "Al Baker",
      "images": ["/clients/al-baker/A71I0016.jpg", ... 36 more images]
    }
  ]
}
```

**Better approach:**
```json
{
  "clients": [
    {
      "id": 1000001,
      "name": "Al Baker",
      "logo": "/clients/al-baker/logo.jpg",
      "imageCount": 36,
      "categories": ["Commercial"]
    }
  ]
}
```

**Steps:**

1. **Create a clients metadata table:**
```sql
CREATE TABLE clients_meta (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  logo TEXT,
  categories TEXT[],
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE client_images (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients_meta(id),
  image_url TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

2. **Update API to paginate:**
```javascript
// GET /api/clients?page=1&limit=10
app.get('/api/clients', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  
  const result = await pool.query(
    'SELECT * FROM clients_meta LIMIT $1 OFFSET $2',
    [limit, offset]
  );
  
  res.json({
    clients: result.rows,
    pagination: { page, limit, total: totalCount }
  });
});

// GET /api/clients/:id/images
app.get('/api/clients/:id/images', async (req, res) => {
  const result = await pool.query(
    'SELECT image_url FROM client_images WHERE client_id = $1',
    [req.params.id]
  );
  res.json({ images: result.rows });
});
```

**Expected improvement:** Initial load 43MB → 50KB per page

---

#### 4. Use CDN for Images

**Current:** Images served from Railway volume (slow, expensive)

**Better:** Use Cloudflare R2 or AWS S3

**Steps:**

1. **Create Cloudflare R2 bucket** (10GB free)
2. **Upload images to R2**
3. **Update image URLs in database** to point to CDN

```javascript
const CDN_BASE = 'https://cdn.yourdomain.com';

// When returning client data:
const clientsWithCdn = clients.map(client => ({
  ...client,
  images: client.images.map(img => `${CDN_BASE}${img}`)
}));
```

**Expected improvement:** Image load time 5s → 500ms

---

### 🏗️ Long Term (1 week, complete solution)

#### 5. Separate Frontend from Backend

**Current architecture:**
```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   React     │────▶│ Express API  │────▶│ PostgreSQL  │
│   (Vite)    │     │  (server.cjs)│     │  (Railway)  │
└─────────────┘     └──────────────┘     └─────────────┘
```

**Better architecture:**
```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   React     │────▶│   CDN        │────▶│ Cloudflare  │
│   (Vite)    │     │  (Cloudflare)│     │    R2       │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐     ┌─────────────┐
                    │ Express API  │────▶│ PostgreSQL  │
                    │  (Railway)   │     │  (Railway)  │
                    └──────────────┘     └─────────────┘
```

**Benefits:**
- Static assets cached at edge (50ms response)
- API only serves dynamic data
- Images served from CDN (fast, cheap)
- Railway only handles API requests

---

## Immediate Action Plan

### Today (30 minutes):

1. ✅ Deploy `server-optimized.cjs` to Railway
2. ✅ Run Bruno performance tests
3. ✅ Compare before/after metrics

### This Week (2-3 hours):

1. ⏳ Split client data (metadata vs images)
2. ⏳ Implement pagination
3. ⏳ Set up Cloudflare R2 (free tier)

### Next Week (4-6 hours):

1. ⏳ Migrate images to CDN
2. ⏳ Update frontend to load images on demand
3. ⏳ Implement lazy loading in React

---

## Monitoring

### Railway Dashboard Metrics to Watch

1. **Response Time** (target: <2s for cached, <10s for uncached)
2. **CPU Usage** (high CPU = JSON parsing bottleneck)
3. **Network Out** (43MB per request = expensive!)
4. **Database Connections** (should be <10)

### Add Logging to Server

```javascript
// Add to server.cjs
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});
```

---

## Expected Results

| Metric | Before | After (Optimized) | After (Full Rewrite) |
|--------|--------|-------------------|---------------------|
| `/api/health` | 500ms | 100ms | 50ms |
| `/api/clients` | 30s+ | 5-10s (cached) | 200ms (paginated) |
| `/api/admin-data/personalData` | 5-10s | 1-2s (cached) | 500ms (no images) |
| Total page load | 60s+ | 15-20s | 2-3s |
| Monthly cost | $5-10 | $5-10 | $5-10 + CDN (~$0-5) |

---

## Files Created

| File | Purpose |
|------|---------|
| `bruno/Portfolio API/` | API testing collection |
| `perf-test.cjs` | CLI performance test |
| `server-optimized.cjs` | Server with caching + compression |
| `OPTIMIZATION-GUIDE.md` | This document |

---

## Need Help?

1. **Bruno not working?** → Use `perf-test.cjs` instead
2. **Railway deployment failing?** → Check logs in Railway dashboard
3. **Still slow after optimization?** → Consider the full rewrite approach

---

## Quick Commands

```bash
# Test performance
node perf-test.cjs

# Deploy optimized server
cp server-optimized.cjs server.cjs && git add . && git commit -m "Optimize" && git push

# Check database size
node check-db-simple.cjs
```
