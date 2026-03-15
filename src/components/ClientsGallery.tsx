import { useState, useEffect } from "react"
import InteractiveBentoGallery from "@/components/ui/interactive-bento-gallery"

interface Client {
  id: number
  name: string
  logo: string
  images: string[]
  categories: string[]
  description: string
}

interface GalleryMediaItem {
  id: number
  type: 'image' | 'video'
  title: string
  desc: string
  url: string
  span: string
  categories: string[]
  allImages: string[]
}

export function ClientsGallery() {
  const [galleryItems, setGalleryItems] = useState<GalleryMediaItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchClients() {
      try {
        const res = await fetch('/api/clients')
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }
        const data = await res.json()
        const clients: Client[] = Array.isArray(data.clients) ? data.clients : []

        // Transform clients to gallery items
        const transformedItems: GalleryMediaItem[] = clients
          .filter((client) => {
            // Only include clients that have images or logo
            const hasImages = (client.images && client.images.length > 0)
            const hasLogo = (client.logo && client.logo.trim() !== '')
            return hasImages || hasLogo
          })
          .map((client, index) => {
            // Get all images for this client (images array + logo if exists)
            const allMedia: string[] = []
            
            // Add all images from images array
            if (client.images && client.images.length > 0) {
              allMedia.push(...client.images)
            }
            
            // Add logo if it exists and is not already in images
            if (client.logo && client.logo.trim() !== '') {
              if (!allMedia.includes(client.logo)) {
                allMedia.push(client.logo)
              }
            }

            // Determine type based on first media item or TVC category
            const firstMedia = allMedia[0]
            const isVideo = firstMedia?.endsWith('.mp4') || 
                           firstMedia?.endsWith('.webm') || 
                           firstMedia?.endsWith('.mov') ||
                           client.categories?.includes('TVC')

            return {
              id: client.id,
              type: isVideo ? 'video' : 'image',
              title: client.name || 'Untitled',
              desc: client.description || 'No description available.',
              url: firstMedia, // First media as thumbnail
              span: 'col-span-1 row-span-1',
              categories: client.categories || [],
              allImages: allMedia, // Store all media for modal view
            }
          })

        setGalleryItems(transformedItems)
      } catch (err) {
        console.error('Failed to load clients for gallery', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchClients()
  }, [])

  if (isLoading) {
    return (
      <section className="w-full bg-[#4a7ba7] py-80 md:py-96 lg:py-[600px] flex justify-center items-center clients-section">
        <div className="text-white text-xl">Loading gallery...</div>
      </section>
    )
  }

  return (
    <section className="w-full bg-[#4a7ba7] py-80 md:py-96 lg:py-[600px] flex justify-center clients-section">
      <div className="w-full max-w-[1200px] px-8 sm:px-12 md:px-16 lg:px-24 clients-gallery-wrapper">
        {galleryItems.length > 0 ? (
          <InteractiveBentoGallery
            title=""
            description=""
            mediaItems={galleryItems}
            showTitle={false}
          />
        ) : (
          <div className="text-white text-center text-xl">No clients to display.</div>
        )}
      </div>
    </section>
  )
}
