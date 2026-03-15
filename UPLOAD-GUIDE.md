# Railway Media Upload Guide

## Overview
This script uploads your 25GB of media files to Railway Volume Storage and stores only the URLs in the database.

## Setup (Already Done ✅)
1. Installed `multer` for file uploads
2. Added `/clients` static route to serve files
3. Created upload API endpoints
4. Created upload script

## How It Works

### Local Development
```bash
# 1. Start the server
node server.cjs

# 2. Run the upload script
node upload-to-railway.cjs
```

The script will:
- Scan `/Users/chris/dev/For Chris/Web Materials`
- Match folders to clients in database
- Upload files to `/public/clients/[client-name]/`
- Store URLs in database (e.g., `/clients/al-massoud/image1.jpg`)

### Deploying to Railway

When you deploy to Railway, the files in `/public/clients/` will be deployed with your app.

**IMPORTANT**: For 25GB of files, you have two options:

#### Option A: Deploy Files with Code (Recommended for < 5GB)
```bash
# Files are already in /public/clients/
# Just commit and deploy
git add public/clients/
git commit -m "Add client media files"
git push
```

Railway will deploy everything together.

#### Option B: Upload Files Separately to Railway Volume (For 25GB)

1. **Add a Volume in Railway Dashboard**:
   - Go to your Railway project
   - Click "Volumes" → "New Volume"
   - Mount path: `/app/public/clients`
   - Size: 30GB or more

2. **Upload Files via SSH** (Railway provides SSH access):
   ```bash
   # Railway will give you SSH credentials
   # Then upload files:
   scp -r "/Users/chris/dev/For Chris/Web Materials/"* user@railway.app:/app/public/clients/
   ```

3. **Or use rsync**:
   ```bash
   rsync -avz "/Users/chris/dev/For Chris/Web Materials/" user@railway.app:/app/public/clients/
   ```

## File Structure

```
/app/
├── public/
│   └── clients/
│       ├── al-abdallah/
│       │   ├── image1.jpg
│       │   └── image2.jpg
│       ├── al-baker/
│       │   └── photo.jpg
│       └── ...
├── server.cjs
└── upload-to-railway.cjs
```

## URLs

Files are served from:
- `/clients/[client-folder]/[filename]`

Examples:
- `http://localhost:8080/clients/al-massoud/image1.jpg`
- `http://your-railway.app/clients/burger-king/video1.mp4`

## Database Storage

The database stores only URLs (not base64 data):
```json
{
  "id": 123,
  "name": "Al Massoud",
  "images": [
    "/clients/al-massoud/image1.jpg",
    "/clients/al-massoud/image2.jpg"
  ],
  "categories": ["Commercial"]
}
```

## Running the Upload Script

```bash
cd /Users/chris/dev/Andrea/andrea-portfolio
node upload-to-railway.cjs
```

The script will:
1. ✅ Match folders to clients
2. ✅ Upload files to `/public/clients/[client-name]/`
3. ✅ Update database with URLs
4. ✅ Show progress and summary

## Troubleshooting

### Files not uploading?
- Check server is running: `curl http://localhost:8080/api/clients`
- Check folder permissions: `ls -la public/clients/`

### Files not showing?
- Check database has URLs: Visit Database Viewer in admin
- Check files exist: `ls public/clients/[client-name]/`

### Railway deployment issues?
- Ensure Volume is mounted at `/app/public/clients`
- Check Railway logs for errors
- Verify files uploaded: SSH into Railway instance

## Cost Estimate

Railway Volume Storage:
- **Free tier**: 5GB
- **Paid**: ~$0.20/GB/month
- **25GB**: ~$5/month

This is much cheaper than database storage and much faster for serving files!
