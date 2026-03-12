import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

const categories = ['All', 'TVC', 'Photoshoot', 'Commercial', 'Editorial']

function ClientsGalleryNew({ clientsData = [] }) {
    const [activeFilter, setActiveFilter] = useState('All')
    const [selectedImage, setSelectedImage] = useState(null)

    const safeClients = Array.isArray(clientsData) ? clientsData : [];
    const filteredClients = activeFilter === 'All'
        ? safeClients
        : safeClients.filter(client => client.category === activeFilter);

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
                        {filteredClients.length > 0 ? filteredClients.map((client, index) => (
                            <motion.div
                                key={client.id || index}
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
                                >
                                <img src={client.image || ''} alt={client.name || 'No name'} />
                                <div className="gallery-card-info">
                                    <h4>{client.name || 'Untitled'}</h4>
                                    <p>{client.description || 'No description.'}</p>
                                </div>
                            </motion.div>
                        )) : <div>No clients available.</div>}
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
