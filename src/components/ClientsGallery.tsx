import InteractiveBentoGallery from "@/components/ui/interactive-bento-gallery"
import { loadSiteText } from "@/content/siteText"


// Accept mediaItems as a prop or fetch from backend/admin panel

export function ClientsGallery() {
  const siteText = loadSiteText()

  return (
    <section className="w-full bg-[#4a7ba7] py-56 md:py-80 lg:py-96 flex justify-center clients-section">
      <div className="w-full max-w-[1200px] px-8 sm:px-12 md:px-16 lg:px-24 clients-gallery-wrapper">
        <InteractiveBentoGallery
          mediaItems={mediaItems}
          title={siteText.clientsGallery.title}
          description={siteText.clientsGallery.description}
        />
      </div>
    </section>
  )
}
