import { useState, useEffect } from "react"
import InteractiveBentoGallery from "@/components/ui/interactive-bento-gallery"
import { loadSiteText } from "@/content/siteText"

export function ClientsGallery({ mediaItems = [] }) {
  const siteText = loadSiteText()
  const [galleryItems, setGalleryItems] = useState<any[]>([])

  useEffect(() => {
    // Fetch clients from backend to display in gallery
    async function fetchClients() {
      try {
        const res = await fetch('/api/clients')
        const data = await res.json()
        console.log('ClientsGallery API response:', data)
        const clients = Array.isArray(data.clients) ? data.clients : []
        console.log('ClientsGallery clients:', clients)

        // Transform clients to gallery items - one item per client with all images
        const transformedItems = clients
          .filter((client: any) => {
            // Only include clients that have images or logo
            return (client.images && client.images.length > 0) || (client.logo && client.logo.trim() !== '')
          })
          .map((client: any, index: number) => {
            // Get all images for this client (first from images array, fallback to logo)
            const clientImages = client.images && client.images.length > 0 
              ? client.images 
              : [client.logo]

            return {
              id: client.id,
              type: clientImages[0]?.endsWith('.mp4') || client.categories?.includes('TVC') ? 'video' : 'image',
              title: client.name || 'Untitled',
              desc: client.description || 'No description available.',
              url: clientImages[0], // First image as thumbnail
              span: getSpanClass(index),
              categories: client.categories || [],
              allImages: clientImages, // Store all images for modal view
            }
          })

        console.log('ClientsGallery transformedItems:', transformedItems)
        setGalleryItems(transformedItems)
      } catch (err) {
        console.error('Failed to load clients for gallery', err)
      }
    }
    fetchClients()
  }, [])

  // Determine span class based on index for uniform grid layout
  const getSpanClass = (index: number) => {
    // All items have the same size for uniform grid
    return 'col-span-1 row-span-1'
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
          <div className="text-white text-center">No clients to display.</div>
        )}
      </div>
    </section>
  )
}
