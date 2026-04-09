# Railway Media Upload

This repo uses Railway Postgres for media metadata and a Railway Volume for the actual image and video files.

Production media should stay as relative paths like `/clients/al-baker/A71I0016.jpg` in the database.
The corresponding files should live in the Railway volume mounted at `/app/media`.

## Production Setup

- Volume mount path: `/app/media`
- App environment variable: `MEDIA_STORAGE_PATH=/app/media`
- Upload endpoint: `POST /api/media/upload`
- Public media route: `/clients/*`

With that setup, anything uploaded through the app lands in the Railway volume and is immediately served back from the same `/clients/...` URL already stored in Postgres.

## Media Machine Flow

Clone the repo on the machine that has the raw media library, then run:

```bash
npm ci
```

If Railway Postgres ever needs to be rebuilt from the checked-in manifest, sync the metadata first:

```bash
DATABASE_URL="your_railway_database_url" npm run data:sync
```

Dry-run the media matcher before uploading:

```bash
API_BASE="https://andreafoodstyle.com" \
MEDIA_SOURCE_PATH="/Users/chris/dev/For Chris" \
MEDIA_UPLOAD_CONCURRENCY=1 \
npm run media:upload:dry
```

If your real client folders are nested deeper, point `MEDIA_SOURCE_PATH` at that deeper folder instead:

```bash
API_BASE="https://andreafoodstyle.com" \
MEDIA_SOURCE_PATH="/Users/chris/dev/For Chris/Web Materials" \
MEDIA_UPLOAD_CONCURRENCY=1 \
npm run media:upload:dry
```

When the dry run looks good, run the real upload:

```bash
API_BASE="https://andreafoodstyle.com" \
MEDIA_SOURCE_PATH="/Users/chris/dev/For Chris" \
MEDIA_UPLOAD_CONCURRENCY=1 \
npm run media:upload
```

The uploader is safe to rerun. It uploads to the same `/clients/...` destination paths, so reruns are useful as repair or retry passes.

## What The Uploader Does

1. Reads every `/clients/...` path referenced by `.local-store.json`
2. Scans your local media folder recursively
3. Matches files by exact relative path, nested suffix match, or unique filename
4. Uploads each matched file to the live Railway app
5. Writes `media-upload-report.json` with uploaded, missing, ambiguous, and failed files

## Verification

After the upload finishes, spot-check a few URLs:

```bash
curl -I "https://andreafoodstyle.com/clients/al-baker/A71I0016.jpg"
curl -I "https://andreafoodstyle.com/clients/al-abdallah/ssvid.net---The-Original_1080p.mp4"
BASE_URL=https://andreafoodstyle.com node perf-test.cjs
```

You can also inspect the mounted volume directly:

```bash
railway ssh
ls -la /app/media
```

## Notes

- Railway CLI shell access is useful for verification, not bulk file transfer.
- The uploader uses the live app API because the app service is already mounted to the volume.
- Keep `MEDIA_UPLOAD_CONCURRENCY` low at first. `1` is the safest starting point for large uploads.
