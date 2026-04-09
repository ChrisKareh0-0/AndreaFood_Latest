"use client"
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, X } from 'lucide-react'
import { buildMediaPreviewUrl, isVideoUrl } from '@/lib/mediaPreview'

interface SourceClientType {
  id: number
  name?: string
  logo?: string
  thumbnailUrl?: string
  images?: string[]
  categories?: string[]
  description?: string
}

interface MediaItemType {
  id: number
  type: 'image' | 'video'
  title: string
  desc: string
  url: string
  previewUrl?: string
  span: string
  categories?: string[]
  allImages?: string[]
  sourceClient?: SourceClientType
}

type MediaRenderVariant = 'grid' | 'modal' | 'thumb'

const getVideoMimeType = (url?: string): string => {
  if (!url) return 'video/mp4'
  const normalized = String(url).toLowerCase()
  if (normalized.startsWith('data:video/webm')) return 'video/webm'
  if (normalized.startsWith('data:video/quicktime') || normalized.startsWith('data:video/mov')) return 'video/quicktime'
  if (normalized.startsWith('data:video/')) return 'video/mp4'
  if (normalized.endsWith('.webm')) return 'video/webm'
  if (normalized.endsWith('.mov')) return 'video/quicktime'
  return 'video/mp4'
}

const uniqueStrings = (values: Array<string | undefined>): string[] => {
  return Array.from(
    new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean))
  )
}

const resolveClientImages = (item?: MediaItemType | null): string[] => {
  if (!item) return []

  const directImages = Array.isArray(item.allImages) ? item.allImages : []
  if (directImages.length > 0) {
    return uniqueStrings(directImages)
  }

  const sourceClientImages = Array.isArray(item.sourceClient?.images) ? item.sourceClient.images : []
  return uniqueStrings([
    ...sourceClientImages,
    item.sourceClient?.logo,
    item.sourceClient?.thumbnailUrl,
    item.previewUrl,
    item.url,
  ])
}

const getImageCandidate = (item?: MediaItemType | null): string => {
  if (!item) return ''

  const candidates = uniqueStrings([
    item.previewUrl,
    ...resolveClientImages(item),
    item.url,
  ])

  return candidates.find((url) => !isVideoUrl(url)) || ''
}

const getDisplayImageUrl = (item?: MediaItemType | null, variant: MediaRenderVariant = 'grid'): string => {
  if (variant === 'modal') {
    const modalCandidates = uniqueStrings([
      ...resolveClientImages(item),
      item?.url,
      item?.previewUrl,
    ])

    return modalCandidates.find((url) => !isVideoUrl(url)) || ''
  }

  const source = getImageCandidate(item)
  if (!source) return ''

  return buildMediaPreviewUrl(source, {
    width: variant === 'thumb' ? 220 : 720,
    height: variant === 'thumb' ? 220 : 720,
    quality: variant === 'thumb' ? 64 : 68,
  }) || source
}

const getVideoPosterUrl = (item?: MediaItemType | null): string => {
  const source = getImageCandidate(item)
  if (!source) return ''

  return buildMediaPreviewUrl(source, {
    width: 1600,
    height: 900,
    quality: 72,
  }) || source
}

const attachImagesToItem = (item: MediaItemType, images: string[]): MediaItemType => ({
  ...item,
  allImages: images,
  sourceClient: {
    ...item.sourceClient,
    images,
  },
})

const MediaItem = ({
  item,
  className,
  onClick,
  variant = 'grid',
}: {
  item: MediaItemType
  className?: string
  onClick?: () => void
  variant?: MediaRenderVariant
}) => {
  const [imgError, setImgError] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const isVideo = item.type === 'video' || isVideoUrl(item.url)
  const displayImageUrl = getDisplayImageUrl(item, variant)
  const videoPosterUrl = isVideo ? getVideoPosterUrl(item) : ''

  useEffect(() => {
    setImgError(false)
    setVideoError(false)
  }, [item.url, item.previewUrl, variant])

  if (isVideo) {
    if (variant === 'modal') {
      if (videoError || !item.url) {
        return (
          <div className={`${className} flex items-center justify-center bg-gray-950`}>
            <div className="text-gray-500 text-4xl md:text-5xl font-bold">
              {item.title?.charAt(0)?.toUpperCase() || '?'}
            </div>
          </div>
        )
      }

      return (
        <div className={`${className} relative overflow-hidden bg-black`}>
          <video
            className="h-full w-full bg-black object-contain"
            controls
            playsInline
            preload="metadata"
            poster={videoPosterUrl || undefined}
            onError={() => setVideoError(true)}
          >
            <source src={item.url} type={getVideoMimeType(item.url)} />
          </video>
        </div>
      )
    }

    return (
      <div
        className={`${className} relative cursor-pointer overflow-hidden bg-gray-950`}
        onClick={onClick}
      >
        {displayImageUrl && !imgError ? (
          <img
            src={displayImageUrl}
            alt={item.title}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
          />
        ) : !videoError && item.url ? (
          <video
            className="h-full w-full object-cover"
            muted
            playsInline
            preload="metadata"
            poster={videoPosterUrl || undefined}
            aria-hidden="true"
            tabIndex={-1}
            onLoadedMetadata={(event) => {
              const video = event.currentTarget
              video.pause()

              try {
                if (Number.isFinite(video.duration) && video.duration > 0.2) {
                  video.currentTime = 0.1
                }
              } catch {
                // Some browsers block programmatic seeking for unloaded metadata.
              }
            }}
            onLoadedData={(event) => {
              event.currentTarget.pause()
            }}
            onError={() => setVideoError(true)}
          >
            <source src={item.url} type={getVideoMimeType(item.url)} />
          </video>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white/80">
            <div className="px-4 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                <Play className="h-5 w-5 fill-current" />
              </div>
              <div className="text-sm font-semibold uppercase tracking-wide">Video</div>
            </div>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="pointer-events-none absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white shadow-lg">
          <Play className="h-4 w-4 fill-current" />
        </div>
      </div>
    )
  }

  const imageUrl = variant === 'modal'
    ? (displayImageUrl || item.url)
    : displayImageUrl

  return (
    <div
      className={`${className} cursor-pointer`}
      onClick={onClick}
      style={{
        backgroundColor: '#1a1a2e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {imgError || !imageUrl ? (
        <div className="text-gray-500 text-4xl md:text-5xl font-bold">
          {item.title?.charAt(0)?.toUpperCase() || '?'}
        </div>
      ) : (
        <img
          src={imageUrl}
          alt={item.title}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => setImgError(true)}
        />
      )}
    </div>
  )
}

interface GalleryModalProps {
  selectedItem: MediaItemType
  isOpen: boolean
  onClose: () => void
}

const GalleryModal = ({ selectedItem, isOpen, onClose }: GalleryModalProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const clientImages = resolveClientImages(selectedItem)

  useEffect(() => {
    setCurrentImageIndex(0)
  }, [selectedItem?.id])

  useEffect(() => {
    if (!isOpen) return undefined

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    const previousBodyOverflow = document.body.style.overflow
    const previousDocumentOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousDocumentOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen || clientImages.length === 0) return undefined

    const preloadTargets = uniqueStrings([
      clientImages[currentImageIndex],
      clientImages[currentImageIndex + 1],
      clientImages[currentImageIndex - 1],
    ])

    const activePreloads: Array<HTMLImageElement | HTMLVideoElement> = []

    preloadTargets.forEach((url) => {
      if (!url) return

      if (isVideoUrl(url)) {
        const video = document.createElement('video')
        video.preload = 'metadata'
        video.src = url
        activePreloads.push(video)
        return
      }

      const image = new Image()
      image.decoding = 'async'
      image.src = url
      activePreloads.push(image)
    })

    return () => {
      activePreloads.forEach((resource) => {
        if (resource instanceof HTMLVideoElement) {
          resource.removeAttribute('src')
          resource.load()
        }
      })
    }
  }, [clientImages, currentImageIndex, isOpen])

  if (!isOpen || !selectedItem) return null

  const currentMedia = clientImages[currentImageIndex] || selectedItem.url
  const currentItem: MediaItemType = {
    ...selectedItem,
    url: currentMedia,
    type: isVideoUrl(currentMedia) ? 'video' : 'image',
    allImages: clientImages,
  }
  const hasMultipleMedia = clientImages.length > 1

  const handleNext = () => {
    if (!hasMultipleMedia) return
    setCurrentImageIndex((prev) => (prev + 1) % clientImages.length)
  }

  const handlePrev = () => {
    if (!hasMultipleMedia) return
    setCurrentImageIndex((prev) => (prev - 1 + clientImages.length) % clientImages.length)
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.97, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 md:p-6 pointer-events-none"
        style={{
          paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
          paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
          paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
        }}
      >
        <div
          className="modal-content-container pointer-events-auto relative flex h-full w-full max-h-full max-w-6xl overflow-hidden rounded-2xl bg-gray-950 shadow-2xl sm:h-[88vh]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex h-full w-full flex-col bg-gray-950">
            <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/10 bg-black/75 px-4 py-3 text-white backdrop-blur-md">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold sm:text-lg">
                  {selectedItem.title}
                </h3>
                <p className="truncate text-xs text-white/70 sm:text-sm">
                  {hasMultipleMedia
                    ? `${currentImageIndex + 1} of ${clientImages.length}`
                    : (selectedItem.categories?.join(' • ') || 'Project media')}
                </p>
              </div>

              <button
                type="button"
                className="flex shrink-0 items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
                onClick={onClose}
                aria-label="Close gallery"
              >
                <X className="h-4 w-4" />
                <span>Close</span>
              </button>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center bg-gray-900/85 px-3 py-3 sm:px-4 md:px-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${selectedItem.id}-${currentImageIndex}`}
                  className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-xl bg-black shadow-xl"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 20, opacity: 0 }}
                >
                  <MediaItem
                    item={currentItem}
                    className="h-full w-full bg-black"
                    variant="modal"
                  />

                  {hasMultipleMedia && (
                    <>
                      <button
                        type="button"
                        onClick={handlePrev}
                        className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white transition-colors hover:bg-black/80 sm:left-4"
                        aria-label="Previous media"
                      >
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={handleNext}
                        className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white transition-colors hover:bg-black/80 sm:right-4"
                        aria-label="Next media"
                      >
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="border-t border-white/10 bg-black/80 px-4 py-3 text-white">
              <p className="text-sm text-white/80 sm:text-base">
                {selectedItem.desc}
              </p>

              {hasMultipleMedia && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {clientImages.map((mediaUrl, index) => {
                    const thumbItem: MediaItemType = {
                      ...selectedItem,
                      url: mediaUrl,
                      previewUrl: selectedItem.previewUrl,
                      type: isVideoUrl(mediaUrl) ? 'video' : 'image',
                      allImages: clientImages,
                    }

                    return (
                      <motion.button
                        key={`${selectedItem.id}-${index}`}
                        type="button"
                        onClick={() => setCurrentImageIndex(index)}
                        className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border transition-all ${
                          currentImageIndex === index
                            ? 'border-white/80 ring-2 ring-white/50'
                            : 'border-white/10 hover:border-white/40'
                        }`}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.98 }}
                        aria-label={`Open media ${index + 1}`}
                      >
                        <MediaItem
                          item={thumbItem}
                          className="h-full w-full"
                          variant="thumb"
                        />
                      </motion.button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  )
}

interface InteractiveBentoGalleryProps {
  mediaItems: MediaItemType[]
  title: string
  description: string
  showTitle?: boolean
}

const InteractiveBentoGallery: React.FC<InteractiveBentoGalleryProps> = ({
  mediaItems,
  title,
  description,
  showTitle = true,
}) => {
  const [selectedItem, setSelectedItem] = useState<MediaItemType | null>(null)
  const cachedMediaRef = useRef<Record<number, string[]>>({})
  const modalHistoryEntryRef = useRef(false)
  const items = mediaItems

  const fetchClientMedia = useCallback(async (item: MediaItemType): Promise<string[]> => {
    if (!item?.id) return []

    const cached = cachedMediaRef.current[item.id]
    if (Array.isArray(cached) && cached.length > 0) {
      return cached
    }

    const existingImages = Array.isArray(item.allImages) && item.allImages.length > 0
      ? item.allImages
      : Array.isArray(item.sourceClient?.images) && item.sourceClient.images.length > 0
        ? item.sourceClient.images
        : []

    if (existingImages.length > 0) {
      cachedMediaRef.current[item.id] = existingImages
      return existingImages
    }

    const response = await fetch(`/api/clients/${item.id}/media`)
    if (!response.ok) {
      throw new Error(`Failed to load media for client ${item.id}`)
    }

    const payload = await response.json()
    const images = Array.isArray(payload.images)
      ? payload.images
      : Array.isArray(payload.media)
        ? payload.media.map((entry: { url?: string }) => entry.url).filter(Boolean)
        : []

    if (images.length > 0) {
      cachedMediaRef.current[item.id] = images
    }

    return images
  }, [])

  const openSelectedItem = useCallback((item: MediaItemType) => {
    const cachedImages = cachedMediaRef.current[item.id]
    setSelectedItem(cachedImages?.length ? attachImagesToItem(item, cachedImages) : item)
  }, [])

  useEffect(() => {
    if (!selectedItem) return undefined

    let cancelled = false

    fetchClientMedia(selectedItem)
      .then((images) => {
        if (cancelled || images.length === 0) return

        setSelectedItem((current) => {
          if (!current || current.id !== selectedItem.id) {
            return current
          }

          return attachImagesToItem(current, images)
        })
      })
      .catch(() => {
        // Keep the modal usable with the preview item if the media request fails.
      })

    return () => {
      cancelled = true
    }
  }, [fetchClientMedia, selectedItem])

  useEffect(() => {
    if (typeof window === 'undefined' || !selectedItem || modalHistoryEntryRef.current) {
      return undefined
    }

    const handlePopState = () => {
      modalHistoryEntryRef.current = false
      setSelectedItem(null)
    }

    window.history.pushState({ ...(window.history.state || {}), galleryModal: true }, '', window.location.href)
    modalHistoryEntryRef.current = true
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [selectedItem?.id])

  useEffect(() => {
    if (!selectedItem) {
      modalHistoryEntryRef.current = false
    }
  }, [selectedItem])

  const closeSelectedItem = useCallback(() => {
    setSelectedItem(null)

    if (typeof window !== 'undefined' && modalHistoryEntryRef.current) {
      modalHistoryEntryRef.current = false
      if (window.history.state?.galleryModal) {
        window.history.back()
      }
    }
  }, [])

  return (
    <div className="w-full">
      <div className={showTitle ? "pb-20 pt-12 text-center md:pb-28 md:pt-16 lg:pb-32 lg:pt-20" : "pb-8 pt-8"}>
        {showTitle && (
          <>
            <motion.h1
              className="mb-6 text-3xl font-bold text-white sm:text-4xl md:mb-8 md:text-5xl lg:text-6xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {title}
            </motion.h1>
            <motion.p
              className="mx-auto mt-4 max-w-2xl px-4 text-base text-white/90 sm:text-lg md:mt-6 md:text-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {description}
            </motion.p>
          </>
        )}
      </div>

      <div className="mx-auto grid w-full auto-rows-[200px] grid-cols-2 gap-4 px-8 sm:grid-cols-3 sm:auto-rows-[240px] sm:px-12 md:grid-cols-4 md:auto-rows-[280px] md:px-16 lg:grid-cols-5 lg:gap-6 lg:px-24">
        {items.map((item) => (
          <div
            key={item.id}
            className={`relative cursor-pointer overflow-hidden rounded-xl transition-transform duration-200 hover:scale-[1.02] ${item.span}`}
            onClick={() => openSelectedItem(item)}
          >
            <MediaItem
              item={item}
              className="absolute inset-0 h-full w-full"
              variant="grid"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent opacity-0 transition-opacity duration-300 hover:opacity-100">
              <div className="absolute inset-0 flex items-center justify-center">
                <h3 className="px-4 text-center text-lg font-bold leading-tight text-white md:text-xl lg:text-2xl">
                  {item.title}
                </h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {selectedItem ? (
          <GalleryModal
            selectedItem={selectedItem}
            isOpen={true}
            onClose={closeSelectedItem}
          />
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export default InteractiveBentoGallery
