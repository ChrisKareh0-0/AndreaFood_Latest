import InteractiveBentoGallery from "@/components/ui/interactive-bento-gallery"
import { loadSiteText } from "@/content/siteText"


// Accept mediaItems as a prop or fetch from backend/admin panel

// Removed duplicate function declaration
export function ClientsGallery({ mediaItems = [] }) {
  const siteText = loadSiteText()
  // Use latestWorkPosts from admin panel
  const galleryItems = (window as any).latestWorkPosts || mediaItems || [];

  return (
    <section className="w-full bg-[#4a7ba7] py-56 md:py-80 lg:py-96 flex justify-center clients-section">
      <div className="w-full max-w-[1200px] px-8 sm:px-12 md:px-16 lg:px-24 clients-gallery-wrapper">
        {galleryItems.length > 0 ? (
          <InteractiveBentoGallery
            title={siteText?.clientsGallery?.title || 'Gallery'}
            description={siteText?.clientsGallery?.description || 'No description available.'}
            mediaItems={galleryItems.map((item: any) => ({
              ...item,
              title: item.title || 'Untitled',
              desc: item.desc || 'No description.',
              url: item.url || '',
              span: item.span || '',
            }))}
          />
        ) : (
          <div>No gallery items available.</div>
        )}
      </div>
    </section>
  )
}
