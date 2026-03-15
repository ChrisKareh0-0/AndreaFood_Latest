# Railway Deployment Guide

## Complete Setup for 25GB Media Files

This guide will help you deploy your portfolio with all 25GB of client media to Railway.

---

## Part 1: Local Setup (Do This First)

### Step 1: Install Dependencies
```bash
cd /Users/chris/dev/Andrea/andrea-portfolio
npm install
```

### Step 2: Run Complete Setup Script
This will seed all clients and upload media files:

```bash
node setup-complete.cjs
```

This script will:
- ✅ Create all 51 clients in the database
- ✅ Upload all media files to `/public/clients/[client-name]/`
- ✅ Store file URLs in database
- ✅ Show progress for each file

**Wait for it to complete** - this may take 30-60 minutes for 25GB.

### Step 3: Test Locally
```bash
# Start server
node server.cjs

# Visit in browser
http://localhost:8080
```

Check:
- ✅ Clients appear in gallery section
- ✅ Images/videos load correctly
- ✅ Fullscreen video works

---

## Part 2: Railway Deployment

### Step 1: Prepare Your Repository

```bash
# Make sure public folder structure is tracked
mkdir -p public/clients
touch public/.gitkeep
touch public/clients/.gitkeep

# Commit everything
git add .
git commit -m "Setup complete with media upload system"
git push
```

### Step 2: Configure Railway

1. **Go to Railway Dashboard**: https://railway.app
2. **Select your project**
3. **Add a Volume**:
   - Click "Volumes" → "New Volume"
   - **Mount Path**: `/app/public/clients`
   - **Size**: **30 GB** (for your 25GB of files)
   - Click "Add Volume"

### Step 3: Upload Files to Railway

Railway will provide SSH access to upload your files.

#### Option A: Using rsync (Recommended)

```bash
# Get SSH credentials from Railway dashboard
# They look like: root@something.railway.app

# Upload all files
rsync -avz --progress \
  "/Users/chris/dev/For Chris/Web Materials/" \
  root@your-railway-ssh-host:/app/public/clients/
```

#### Option B: Using SCP

```bash
scp -r "/Users/chris/dev/For Chris/Web Materials/"* \
  root@your-railway-ssh-host:/app/public/clients/
```

#### Option C: Using Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Upload files
railway run bash -c "
  cd /app/public/clients
  # Railway CLI doesn't directly support file upload
  # Use SSH instead
"
```

### Step 4: Deploy

1. **Push your code** to GitHub/GitLab
2. **Railway auto-deploys** when you push
3. **Wait for deployment** to complete (~2-5 minutes)

---

## Part 3: Verify Deployment

### Check Files on Railway

SSH into your Railway instance and verify:

```bash
# SSH into Railway (credentials from dashboard)
ssh root@your-railway-ssh-host

# Check files
ls -lh /app/public/clients/
du -sh /app/public/clients/

# Should show ~25GB of files
```

### Check Website

1. Visit your Railway URL: `https://your-project.railway.app`
2. Scroll to **Clients Gallery** section
3. Click on clients to see their media
4. Test videos in fullscreen

### Check Database

Visit: `https://your-project.railway.app/admin`
- Login (admin / admin123)
- Go to **🗄️ Database**
- Check clients have image URLs

---

## Troubleshooting

### Files Not Showing?

**Check if files uploaded correctly:**
```bash
# SSH into Railway
ssh root@your-railway-ssh-host

# List files
ls -la /app/public/clients/

# Check a specific client
ls -la /app/public/clients/al-massoud/
```

**Check database has URLs:**
- Visit Database Viewer in admin panel
- Check if `images` array has URLs like `/clients/al-massoud/image.jpg`

### Database Empty After Deploy?

The Railway PostgreSQL might be slow to connect. The app has a local fallback, but for production:

1. **Check DATABASE_URL** in Railway variables
2. **Wait for DB connection** on startup (check logs)
3. **Re-run setup** if needed:
   ```bash
   # SSH into Railway
   railway run bash
   
   # Inside container
   cd /app
   node setup-complete.cjs
   ```

### Files Too Large?

If some files are >100MB and failing:

1. **Increase upload limit** in `server.cjs`:
   ```javascript
   const upload = multer({ 
     storage: storage,
     limits: { fileSize: 500 * 1024 * 1024 } // 500MB
   });
   ```

2. **Or compress files locally** before upload:
   ```bash
   # Install imagemagick
   brew install imagemagick
   
   # Compress images
   mogrify -path /output/folder -quality 85 -resize 1920x1920\> *.jpg
   ```

---

## Cost Estimate

### Railway Costs

**Free Tier:**
- 5GB storage
- $5/month credit

**Paid (for 25GB):**
- Volume: 25GB × $0.20/GB = **$5/month**
- Plus any compute costs

**Total: ~$5-10/month**

### Alternative: Use CDN for Files

If Railway is too expensive, use:

1. **Cloudflare R2** (10GB free, then $0.015/GB)
2. **AWS S3** (~$0.23/GB = ~$6/month for 25GB)
3. **Backblaze B2** (~$0.005/GB = ~$0.12/month for 25GB!)

I can create scripts for these if needed.

---

## Final Checklist

- [ ] Local setup complete (`node setup-complete.cjs`)
- [ ] Tested locally (`http://localhost:8080`)
- [ ] Railway Volume added (30GB at `/app/public/clients`)
- [ ] Files uploaded to Railway (via SSH/rsync)
- [ ] Code deployed to Railway
- [ ] Website working online
- [ ] All clients visible in gallery
- [ ] Videos play in fullscreen

---

## Support

If you run into issues:

1. **Check Railway logs** in dashboard
2. **SSH into Railway** and check files
3. **Check database** in Database Viewer
4. **Re-run setup script** if needed

Good luck! 🚀
