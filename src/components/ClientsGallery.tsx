import { useEffect, useRef, useState } from "react"
import InteractiveBentoGallery from "@/components/ui/interactive-bento-gallery"

interface Client {
  id: number
  name?: string
  logo?: string
  thumbnailUrl?: string
  previewType?: 'image' | 'video'
  mediaCount?: number
  images?: string[]
  categories?: string[]
  description?: string
}

interface GalleryMediaItem {
  id: number
  type: 'image' | 'video'
  title: string
  desc: string
  url: string
  previewUrl?: string
  span: string
  categories: string[]
  sourceClient?: Client
}

interface ClientsGalleryProps {
  clients?: Client[]
  isReady?: boolean
}

const isVideoUrl = (url?: string): boolean => {
  if (!url) return false
  if (url.startsWith('data:video/')) return true
  return url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.mov')
}

const getClientMediaCandidates = (client?: Client): string[] => {
  if (!client) return []

  return [
    ...(client.thumbnailUrl ? [client.thumbnailUrl] : []),
    ...(Array.isArray(client.images) ? client.images : []),
    ...(client.logo ? [client.logo] : []),
  ].filter(Boolean) as string[]
}

const getPreviewUrl = (client?: Client): string => {
  const media = getClientMediaCandidates(client)
  return media.find((url) => !isVideoUrl(url)) || media[0] || ''
}

const buildGalleryItem = (client: Client): GalleryMediaItem | null => {
  const media = getClientMediaCandidates(client)
  const previewUrl = getPreviewUrl(client)
  const primaryUrl = media[0] || previewUrl
  const hasMedia = primaryUrl
    || previewUrl
    || Boolean(client.mediaCount)

  if (!hasMedia) {
    return null
  }

  return {
    id: client.id,
    type: isVideoUrl(primaryUrl) ? 'video' : 'image',
    title: client.name || 'Untitled',
    desc: client.description || 'No description available.',
    url: primaryUrl,
    previewUrl,
    span: 'col-span-1 row-span-1',
    categories: client.categories || [],
    sourceClient: client,
  }
}

export function ClientsGallery({ clients, isReady = false }: ClientsGalleryProps) {
  const [galleryItems, setGalleryItems] = useState<GalleryMediaItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [shouldRenderGallery, setShouldRenderGallery] = useState(false)
  const sectionRef = useRef<HTMLElement | null>(null)
  const itemsPerPage = 12

  useEffect(() => {
    const section = sectionRef.current
    if (!section || shouldRenderGallery) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        const isVisible = entries.some((entry) => entry.isIntersecting)
        if (isVisible) {
          setShouldRenderGallery(true)
          observer.disconnect()
        }
      },
      {
        rootMargin: '300px 0px',
      }
    )

    observer.observe(section)
    return () => observer.disconnect()
  }, [shouldRenderGallery])

  useEffect(() => {
    let cancelled = false

    const syncClients = async () => {
      if (Array.isArray(clients)) {
        const transformedItems = clients
          .map(buildGalleryItem)
          .filter(Boolean) as GalleryMediaItem[]

        if (cancelled) return

        setGalleryItems(transformedItems)
        setIsLoading(!isReady)
        return
      }

      setIsLoading(true)

      try {
        const res = await fetch('/api/clients')
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }

        const data = await res.json()
        const fetchedClients: Client[] = Array.isArray(data.clients) ? data.clients : []
        const transformedItems = fetchedClients
          .map(buildGalleryItem)
          .filter(Boolean) as GalleryMediaItem[]

        if (cancelled) return

        setGalleryItems(transformedItems)
      } catch (err) {
        console.error('Failed to load clients for gallery', err)
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    syncClients()

    return () => {
      cancelled = true
    }
  }, [clients, isReady])

  useEffect(() => {
    setCurrentPage(1)
  }, [galleryItems.length])

  const totalPages = Math.ceil(galleryItems.length / itemsPerPage)
  const paginatedItems = galleryItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return (
    <section
      ref={sectionRef}
      className="w-full bg-[#4a7ba7] py-16 md:py-20 lg:py-24 flex flex-col justify-center items-center clients-section"
    >
      <div className="w-full max-w-[1200px] px-8 sm:px-12 md:px-16 lg:px-24 clients-gallery-wrapper">
        {!shouldRenderGallery ? (
          <div className="text-white text-center text-lg md:text-xl py-24">
            Scroll to load the full gallery.
          </div>
        ) : isLoading ? (
          <div className="text-white text-center text-lg md:text-xl py-24">
            Loading gallery...
          </div>
        ) : paginatedItems.length > 0 ? (
          <InteractiveBentoGallery
            title=""
            description=""
            mediaItems={paginatedItems}
            showTitle={false}
          />
        ) : (
          <div className="text-white text-center text-xl">No clients to display.</div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination-controls" style={{ marginTop: '2rem' }}>
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#fff',
              color: '#4a7ba7',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              opacity: currentPage === 1 ? 0.6 : 1,
              transition: 'all 0.3s ease'
            }}
          >
            ← Previous
          </button>

          <div className="pagination-numbers" style={{ display: 'flex', gap: '0.5rem' }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                style={{
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: currentPage === page ? '#fff' : 'rgba(255,255,255,0.2)',
                  color: currentPage === page ? '#4a7ba7' : '#fff',
                  border: currentPage === page ? '2px solid #fff' : '2px solid rgba(255,255,255,0.3)',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#fff',
              color: '#4a7ba7',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              opacity: currentPage === totalPages ? 0.6 : 1,
              transition: 'all 0.3s ease'
            }}
          >
            Next →
          </button>
        </div>
      )}
    </section>
  )
}
