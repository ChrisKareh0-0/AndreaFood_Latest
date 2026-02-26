import InteractiveBentoGallery from "@/components/ui/interactive-bento-gallery"
import { loadSiteText } from "@/content/siteText"

const mediaItems = [
  {
    id: 1,
    type: "image",
    title: "Mövenpick Hotels",
    desc: "Luxury dessert styling campaign",
    url: "https://images.unsplash.com/photo-1488477181946-6428a0291777",
    span: "col-span-1 row-span-1",
  },
  {
    id: 2,
    type: "image",
    title: "Nestlé Middle East",
    desc: "Fresh ingredients photoshoot",
    url: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd",
    span: "col-span-1 row-span-1",
  },
  {
    id: 3,
    type: "image",
    title: "Le Pain Quotidien",
    desc: "Artisan bakery collection",
    url: "https://images.unsplash.com/photo-1509440159596-0249088772ff",
    span: "col-span-1 row-span-1",
  },
  {
    id: 4,
    type: "image",
    title: "Starbucks Lebanon",
    desc: "Coffee & pastries menu",
    url: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085",
    span: "col-span-1 row-span-1",
  },
  {
    id: 5,
    type: "image",
    title: "Carrefour",
    desc: "Gourmet dining campaign",
    url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0",
    span: "col-span-1 row-span-1",
  },
  {
    id: 6,
    type: "image",
    title: "Spinneys",
    desc: "Organic produce showcase",
    url: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe",
    span: "col-span-1 row-span-1",
  },
  {
    id: 7,
    type: "image",
    title: "Zaatar W Zeit",
    desc: "Lebanese cuisine styling",
    url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38",
    span: "col-span-1 row-span-1",
  },
  {
    id: 8,
    type: "image",
    title: "Patchi Chocolatier",
    desc: "Premium chocolate styling",
    url: "https://images.unsplash.com/photo-1481391243133-f96216dcb5d2",
    span: "col-span-1 row-span-1",
  },
  {
    id: 9,
    type: "image",
    title: "ABC Ashrafieh",
    desc: "Fine dining campaign",
    url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836",
    span: "col-span-1 row-span-1",
  },
  {
    id: 10,
    type: "image",
    title: "Barbar Restaurant",
    desc: "Lebanese mezze spread",
    url: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783",
    span: "col-span-1 row-span-1",
  },
]

export function ClientsGallery() {
  const siteText = loadSiteText()

  return (
    <section className="w-full bg-[#4a7ba7] py-24 md:py-32 lg:py-40 flex justify-center clients-section">
      <div className="w-full max-w-[1400px] px-6 sm:px-8 md:px-12 lg:px-16 clients-gallery-wrapper">
        <InteractiveBentoGallery
          mediaItems={mediaItems}
          title={siteText.clientsGallery.title}
          description={siteText.clientsGallery.description}
        />
      </div>
    </section>
  )
}
