import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import './ClientsGalleryNew.css'

const clientsData = [
    {
        id: 1,
        name: 'Mövenpick Hotels',
        description: 'Luxury dessert styling campaign',
        category: 'Photoshoot',
        image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&q=80'
    },
    {
        id: 2,
        name: 'Nestlé Middle East',
        description: 'Fresh ingredients photoshoot',
        category: 'TVC',
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80'
    },
    {
        id: 3,
        name: 'Le Pain Quotidien',
        description: 'Artisan bakery collection',
        category: 'Photoshoot',
        image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80'
    },
    {
        id: 4,
        name: 'Starbucks Lebanon',
        description: 'Coffee & pastries menu',
        category: 'Commercial',
        image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80'
    },
    {
        id: 5,
        name: 'Carrefour',
        description: 'Gourmet dining campaign',
        category: 'Editorial',
        image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80'
    },
    {
        id: 6,
        name: 'Spinneys',
        description: 'Organic produce showcase',
        category: 'Photoshoot',
        image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80'
    },
    {
        id: 7,
        name: 'Zaatar W Zeit',
        description: 'Lebanese cuisine styling',
        category: 'TVC',
        image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80'
    },
    {
        id: 8,
        name: 'Patchi Chocolatier',
        description: 'Premium chocolate styling',
        category: 'Editorial',
        image: 'https://images.unsplash.com/photo-1481391243133-f96216dcb5d2?w=800&q=80'
    },
    {
        id: 9,
        name: 'ABC Ashrafieh',
        description: 'Fine dining campaign',
        category: 'Commercial',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80'
    },
    {
        id: 10,
        name: 'Barbar Restaurant',
        description: 'Lebanese mezze spread',
        category: 'Photoshoot',
        image: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=800&q=80'
    }
]

const categories = ['All', 'TVC', 'Photoshoot', 'Commercial', 'Editorial']

function ClientsGalleryNew() {
    const [activeFilter, setActiveFilter] = useState('All')
    const [selectedImage, setSelectedImage] = useState(null)

    const filteredClients = activeFilter === 'All'
        ? clientsData
        : clientsData.filter(client => client.category === activeFilter)

    const handleNext = () => {
        const currentIndex = filteredClients.findIndex(c => c.id === selectedImage.id)
        const nextIndex = (currentIndex + 1) % filteredClients.length
        setSelectedImage(filteredClients[nextIndex])
    }

    const handlePrev = () => {
        const currentIndex = filteredClients.findIndex(c => c.id === selectedImage.id)
        const prevIndex = currentIndex === 0 ? filteredClients.length - 1 : currentIndex - 1
        setSelectedImage(filteredClients[prevIndex])
    }

    return (
        <section className="clients-gallery-new">
            <div className="gallery-container">
                {/* Header */}
                <motion.div
                    className="gallery-header"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <h2 className="gallery-title">Our Clients</h2>
                    <p className="gallery-description">
                        Showcasing our creative partnerships with leading brands across the Middle East
                    </p>
                </motion.div>

                {/* Filter Buttons */}
                <motion.div
                    className="gallery-filters"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    {categories.map((category) => (
                        <button
                            key={category}
                            className={`filter-btn ${activeFilter === category ? 'active' : ''}`}
                            onClick={() => setActiveFilter(category)}
                        >
                            {category}
                        </button>
                    ))}
                </motion.div>

                {/* Masonry Grid */}
                <div className="gallery-grid">
                    <AnimatePresence mode="wait">
                        {filteredClients.map((client, index) => (
                            <motion.div
                                key={client.id}
                                className="gallery-card"
                                layout
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{
                                    duration: 0.5,
                                    delay: index * 0.1,
                                    layout: { duration: 0.4 }
                                }}
                                whileHover={{ scale: 1.03, y: -5 }}
                                onClick={() => setSelectedImage(client)}
                            >
                                <div className="card-image-wrapper">
                                    <img
                                        src={client.image}
                                        alt={client.name}
                                        className="card-image"
                                        loading="lazy"
                                    />
                                    <div className="card-overlay">
                                        <div className="card-content">
                                            <h3 className="card-title">{client.name}</h3>
                                            <p className="card-description">{client.description}</p>
                                            <span className="card-category">{client.category}</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            {/* Lightbox Modal */}
            <AnimatePresence>
                {selectedImage && (
                    <motion.div
                        className="lightbox-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedImage(null)}
                    >
                        <motion.div
                            className="lightbox-content"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ type: "spring", damping: 25 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                className="lightbox-close"
                                onClick={() => setSelectedImage(null)}
                                aria-label="Close"
                            >
                                <X size={24} />
                            </button>

                            <button
                                className="lightbox-nav lightbox-prev"
                                onClick={handlePrev}
                                aria-label="Previous"
                            >
                                <ChevronLeft size={32} />
                            </button>

                            <button
                                className="lightbox-nav lightbox-next"
                                onClick={handleNext}
                                aria-label="Next"
                            >
                                <ChevronRight size={32} />
                            </button>

                            <div className="lightbox-image-wrapper">
                                <img
                                    src={selectedImage.image}
                                    alt={selectedImage.name}
                                    className="lightbox-image"
                                />
                            </div>

                            <div className="lightbox-info">
                                <h3 className="lightbox-title">{selectedImage.name}</h3>
                                <p className="lightbox-description">{selectedImage.description}</p>
                                <span className="lightbox-category">{selectedImage.category}</span>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    )
}

export default ClientsGalleryNew
