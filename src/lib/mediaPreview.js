const normalizeMediaUrl = (value) => {
  if (typeof value !== 'string') return ''
  return value.trim().split('#')[0].split('?')[0].toLowerCase()
}

export const isVideoUrl = (url) => {
  const normalized = normalizeMediaUrl(url)
  return !!normalized && (
    normalized.startsWith('data:video/')
    || normalized.endsWith('.mp4')
    || normalized.endsWith('.webm')
    || normalized.endsWith('.mov')
  )
}

const normalizePreviewSource = (value) => {
  if (typeof value !== 'string') return ''

  const trimmed = value.trim()
  if (!trimmed || trimmed.startsWith('data:')) return ''
  if (trimmed.startsWith('/api/media/preview?')) return trimmed

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed)
      return parsed.pathname.startsWith('/clients/') ? parsed.pathname : trimmed
    } catch {
      return trimmed
    }
  }

  return trimmed
}

export const buildMediaPreviewUrl = (value, options = {}) => {
  const normalized = normalizePreviewSource(value)
  if (!normalized) return ''
  if (normalized.startsWith('/api/media/preview?')) return normalized
  if (isVideoUrl(normalized)) return ''
  if (!normalized.startsWith('/clients/')) return normalized

  const params = new URLSearchParams({
    src: normalized,
  })

  if (options.width) {
    params.set('w', `${Math.round(options.width)}`)
  }

  if (options.height) {
    params.set('h', `${Math.round(options.height)}`)
  }

  if (options.quality) {
    params.set('q', `${Math.round(options.quality)}`)
  }

  return `/api/media/preview?${params.toString()}`
}
