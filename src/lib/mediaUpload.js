function sanitizeFolderSegment(value, fallback = 'unknown') {
  const safe = String(value || '')
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return safe || fallback
}

export function buildMediaFolder(...segments) {
  const parts = segments
    .flatMap((segment) => String(segment || '').split('/'))
    .map((segment) => sanitizeFolderSegment(segment))
    .filter(Boolean)

  return parts.length > 0 ? parts.join('/') : 'unknown'
}

export function extractMediaFolderFromUrl(value) {
  const rawValue = typeof value === 'string' ? value.trim() : ''
  if (!rawValue) return ''

  try {
    const url = new URL(rawValue, 'https://local.invalid')
    const pathname = decodeURIComponent(url.pathname)
    if (!pathname.startsWith('/clients/')) return ''
    const parts = pathname.replace(/^\/clients\//, '').split('/').filter(Boolean)
    return parts.length > 1 ? parts.slice(0, -1).join('/') : ''
  } catch {
    return ''
  }
}

async function readUploadResponse(response) {
  let payload = {}

  try {
    payload = await response.json()
  } catch {
    payload = {}
  }

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Upload failed with status ${response.status}`)
  }

  return payload
}

export async function uploadMediaFile(file, clientFolder) {
  if (!file) {
    throw new Error('No file selected')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('clientFolder', buildMediaFolder(clientFolder))

  const response = await fetch('/api/media/upload', {
    method: 'POST',
    body: formData,
  })

  const payload = await readUploadResponse(response)

  if (!payload.url) {
    throw new Error('Upload completed without a file URL')
  }

  return payload
}

export async function uploadMediaFiles(files, clientFolder) {
  const selectedFiles = Array.from(files || []).filter(Boolean)

  if (selectedFiles.length === 0) {
    throw new Error('No files selected')
  }

  const formData = new FormData()
  selectedFiles.forEach((file) => {
    formData.append('files', file)
  })
  formData.append('clientFolder', buildMediaFolder(clientFolder))

  const response = await fetch('/api/media/upload-multiple', {
    method: 'POST',
    body: formData,
  })

  const payload = await readUploadResponse(response)

  if (!Array.isArray(payload.files)) {
    throw new Error('Upload completed without file details')
  }

  return payload.files
}
