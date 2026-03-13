"use client"
import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react';


// MediaItemType defines the structure of a media item
interface MediaItemType {
    id: number;
    type: string;
    title: string;
    desc: string;
    url: string;
    span: string;
}
// MediaItem component renders either a video or image based on item.type
const MediaItem = ({ item, className, onClick }: { item: MediaItemType, className?: string, onClick?: () => void }) => {
    const videoRef = useRef<HTMLVideoElement>(null); // Reference for video element
    const [isInView, setIsInView] = useState(false); // To track if video is in the viewport
    const [isBuffering, setIsBuffering] = useState(true);  // To track if video is buffering
    const [imgError, setImgError] = useState(false); // Track image load errors

    // Intersection Observer to detect if video is in view and play/pause accordingly
    useEffect(() => {
        const options = {
            root: null,
            rootMargin: '50px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                setIsInView(entry.isIntersecting); // Set isInView to true if the video is in view
            });
        }, options);

        if (videoRef.current) {
            observer.observe(videoRef.current); // Start observing the video element
        }

        return () => {
            if (videoRef.current) {
                observer.unobserve(videoRef.current); // Clean up observer when component unmounts
            }
        };
    }, []);
    // Handle video play/pause based on whether the video is in view or not
    useEffect(() => {
        let mounted = true;

        const handleVideoPlay = async () => {
            if (!videoRef.current || !isInView || !mounted) return; // Don't play if video is not in view or component is unmounted

            try {
                if (videoRef.current.readyState >= 3) {
                    setIsBuffering(false);
                    await videoRef.current.play(); // Play the video if it's ready
                } else {
                    setIsBuffering(true);
                    await new Promise((resolve) => {
                        if (videoRef.current) {
                            videoRef.current.oncanplay = resolve; // Wait until the video can start playing
                        }
                    });
                    if (mounted) {
                        setIsBuffering(false);
                        await videoRef.current.play();
                    }
                }
            } catch (error) {
                console.warn("Video playback failed:", error);
            }
        };

        if (isInView) {
            handleVideoPlay();
        } else if (videoRef.current) {
            videoRef.current.pause();
        }

        return () => {
            mounted = false;
            if (videoRef.current) {
                videoRef.current.pause();
                videoRef.current.removeAttribute('src');
                videoRef.current.load();
            }
        };
    }, [isInView]);

    // Render either a video or image based on item.type

    if (item.type === 'video') {
        return (
            <div className={`${className} relative overflow-hidden`}>
                <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    onClick={onClick}
                    playsInline
                    muted
                    loop
                    preload="auto"
                    style={{
                        opacity: isBuffering ? 0.8 : 1,
                        transition: 'opacity 0.2s',
                        transform: 'translateZ(0)',
                        willChange: 'transform',
                    }}
                >
                    <source src={item.url} type="video/mp4" />
                </video>
                {isBuffering && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    </div>
                )}
            </div>
        );
    }

    return (
        <div
            className={`${className} cursor-pointer`}
            onClick={onClick}
            style={{
                background: item.url?.startsWith('linear-gradient') ? item.url : 'none',
                backgroundColor: item.url?.startsWith('linear-gradient') ? undefined : '#e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
            }}
        >
            {item.url?.startsWith('linear-gradient') ? (
                <div className="text-white text-4xl md:text-5xl font-bold">
                    {item.title?.charAt(0)?.toUpperCase() || '?'}
                </div>
            ) : item.type === 'video' ? (
                <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    onClick={onClick}
                    playsInline
                    muted
                    loop
                    preload="auto"
                    style={{
                        opacity: isBuffering ? 0.8 : 1,
                        transition: 'opacity 0.2s',
                    }}
                >
                    <source src={item.url} type="video/mp4" />
                </video>
            ) : imgError || !item.url ? (
                <div className="text-gray-500 text-4xl md:text-5xl font-bold">
                    {item.title?.charAt(0)?.toUpperCase() || '?'}
                </div>
            ) : (
                <img
                    src={item.url}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                    onError={() => {
                        console.log('Image failed to load:', item.url?.substring(0, 50))
                        setImgError(true)
                    }}
                    onLoad={() => {
                        console.log('Image loaded successfully:', item.title)
                    }}
                />
            )}
        </div>
    );
};



// GalleryModal component displays the selected media item in a modal
interface GalleryModalProps {
    selectedItem: MediaItemType;
    isOpen: boolean;
    onClose: () => void;
    setSelectedItem: (item: MediaItemType | null) => void;
    mediaItems: MediaItemType[]; // List of media items to display in the modal
}
const GalleryModal = ({ selectedItem, isOpen, onClose, setSelectedItem, mediaItems }: GalleryModalProps) => {
    const [dockPosition, setDockPosition] = useState({ x: 0, y: 0 });  // Track the position of the dockable panel
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    
    // Get all images for the selected client (from allImages array or single url)
    const clientImages = selectedItem?.allImages && selectedItem.allImages.length > 0 
        ? selectedItem.allImages 
        : [selectedItem?.url].filter(Boolean);

    if (!isOpen || !selectedItem) return null; // Return null if the modal is not open

    const currentImage = clientImages[currentImageIndex];
    const currentItem = { ...selectedItem, url: currentImage };

    const handleNext = () => {
        setCurrentImageIndex((prev) => (prev + 1) % clientImages.length);
    };

    const handlePrev = () => {
        setCurrentImageIndex((prev) => (prev - 1 + clientImages.length) % clientImages.length);
    };

    return (
        <>
            {/* Main Modal */}
            <motion.div
                initial={{ scale: 0.98 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.98 }}
                transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 30
                }}
                className="fixed inset-0 w-full min-h-screen sm:h-[90vh] md:h-[600px] backdrop-blur-lg
                          rounded-none sm:rounded-lg md:rounded-xl overflow-hidden z-10"

            >
                {/* Main Content */}
                <div className="h-full flex flex-col relative">
                    <div className="flex-1 p-2 sm:p-3 md:p-4 flex items-center justify-center bg-gray-50/50">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentImageIndex}
                                className="relative w-full aspect-[16/9] max-w-[95%] sm:max-w-[85%] md:max-w-3xl
                                         h-auto max-h-[70vh] rounded-lg overflow-hidden shadow-md"
                                initial={{ y: 20, scale: 0.97, opacity: 0 }}
                                animate={{
                                    y: 0,
                                    scale: 1,
                                    opacity: 1,
                                    transition: {
                                        type: "spring",
                                        stiffness: 500,
                                        damping: 30,
                                        mass: 0.5
                                    }
                                }}
                                exit={{
                                    y: 20,
                                    scale: 0.97,
                                    opacity: 0,
                                    transition: { duration: 0.15 }
                                }}
                            >
                                <MediaItem item={currentItem} className="w-full h-full object-contain bg-gray-900/20" onClick={() => {}} />
                                <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 md:p-4
                                              bg-gradient-to-t from-black/50 to-transparent">
                                    <h3 className="text-white text-base sm:text-lg md:text-xl font-semibold">
                                        {selectedItem.title}
                                        {clientImages.length > 1 && (
                                            <span className="text-white/60 text-sm ml-2">
                                                ({currentImageIndex + 1} / {clientImages.length})
                                            </span>
                                        )}
                                    </h3>
                                    <p className="text-white/80 text-xs sm:text-sm mt-1">
                                        {selectedItem.desc}
                                    </p>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Navigation Arrows for multiple images */}
                    {clientImages.length > 1 && (
                        <>
                            <button
                                onClick={handlePrev}
                                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2 rounded-full 
                                         bg-black/50 text-white hover:bg-black/70 transition-colors z-20"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <button
                                onClick={handleNext}
                                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 rounded-full 
                                         bg-black/50 text-white hover:bg-black/70 transition-colors z-20"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </>
                    )}
                </div>

                {/* Close Button */}
                <motion.button
                    className="absolute top-2 sm:top-2.5 md:top-3 right-2 sm:right-2.5 md:right-3
                              p-2 rounded-full bg-gray-200/80 text-gray-700 hover:bg-gray-300/80
                              text-xs sm:text-sm backdrop-blur-sm z-30"
                    onClick={onClose}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                >
                    <X className='w-3 h-3' />
                </motion.button>

            </motion.div>

            {/* Draggable Dock - Show thumbnails of all client images */}
            <motion.div
                drag
                dragMomentum={false}
                dragElastic={0.1}
                initial={false}
                animate={{ x: dockPosition.x, y: dockPosition.y }}
                onDragEnd={(_, info) => {
                    setDockPosition(prev => ({
                        x: prev.x + info.offset.x,
                        y: prev.y + info.offset.y
                    }));
                }}
                className="fixed z-50 left-1/2 bottom-4 -translate-x-1/2 touch-none"
            >
                <motion.div
                    className="relative rounded-xl bg-sky-400/20 backdrop-blur-xl
                             border border-blue-400/30 shadow-lg
                             cursor-grab active:cursor-grabbing"
                >
                    <div className="flex items-center -space-x-2 px-3 py-2">
                        {clientImages.map((imgUrl, index) => {
                            const thumbItem = { ...selectedItem, url: imgUrl };
                            return (
                                <motion.div
                                    key={index}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setCurrentImageIndex(index);
                                    }}
                                    style={{
                                        zIndex: currentImageIndex === index ? 30 : clientImages.length - index,
                                    }}
                                    className={`
                                        relative group
                                        w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 flex-shrink-0
                                        rounded-lg overflow-hidden
                                        cursor-pointer hover:z-20
                                        ${currentImageIndex === index
                                            ? 'ring-2 ring-white/70 shadow-lg'
                                            : 'hover:ring-2 hover:ring-white/30'}
                                    `}
                                    initial={{ rotate: index % 2 === 0 ? -15 : 15 }}
                                    animate={{
                                        scale: currentImageIndex === index ? 1.2 : 1,
                                        rotate: currentImageIndex === index ? 0 : index % 2 === 0 ? -15 : 15,
                                        y: currentImageIndex === index ? -8 : 0,
                                    }}
                                    whileHover={{
                                        scale: 1.3,
                                        rotate: 0,
                                        y: -10,
                                        transition: { type: "spring", stiffness: 400, damping: 25 }
                                    }}
                                >
                                    <MediaItem item={thumbItem} className="w-full h-full" onClick={() => setCurrentImageIndex(index)} />
                                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-white/20" />
                                    {currentImageIndex === index && (
                                        <motion.div
                                            layoutId="activeGlow"
                                            className="absolute -inset-2 bg-white/20 blur-xl"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ duration: 0.2 }}
                                        />
                                    )}
                                </motion.div>
                            )
                        })}
                    </div>
                </motion.div>
            </motion.div>
        </>
    );
};



interface InteractiveBentoGalleryProps {
    mediaItems: MediaItemType[]
    title: string
    description: string
    showTitle?: boolean
}

const InteractiveBentoGallery: React.FC<InteractiveBentoGalleryProps> = ({ mediaItems, title, description, showTitle = true }) => {
    const [selectedItem, setSelectedItem] = useState<MediaItemType | null>(null);
    const [items, setItems] = useState(mediaItems);
    const [isDragging, setIsDragging] = useState(false);

    return (
        <div className="w-full">
            {/* Keep spacing even when title is hidden */}
            <div className={showTitle ? "pt-12 md:pt-16 lg:pt-20 pb-20 md:pb-28 lg:pb-32 text-center" : "pt-8 pb-8"}>
                {showTitle && (
                    <>
                        <motion.h1
                            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 md:mb-8"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            {title}
                        </motion.h1>
                        <motion.p
                            className="mt-4 md:mt-6 text-base sm:text-lg md:text-xl text-white/90 max-w-2xl mx-auto px-4"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                        >
                            {description}
                        </motion.p>
                    </>
                )}
            </div>
            <AnimatePresence mode="wait">
                {selectedItem ? (
                    <GalleryModal
                        selectedItem={selectedItem}
                        isOpen={true}
                        onClose={() => setSelectedItem(null)}
                        setSelectedItem={setSelectedItem}
                        mediaItems={items}
                    />
                ) : (
                    <motion.div
                        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5 lg:gap-6 auto-rows-[200px] sm:auto-rows-[240px] md:auto-rows-[280px] w-full mx-auto px-8 md:px-16 lg:px-24"
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        variants={{
                            hidden: { opacity: 0 },
                            visible: {
                                opacity: 1,
                                transition: { staggerChildren: 0.1 }
                            }
                        }}
                    >
                        {items.map((item, index) => (
                            <motion.div
                                key={item.id}
                                className={`relative overflow-hidden rounded-xl cursor-pointer ${item.span}`}
                                onClick={() => setSelectedItem(item)}
                                variants={{
                                    hidden: { y: 50, scale: 0.9, opacity: 0 },
                                    visible: {
                                        y: 0,
                                        scale: 1,
                                        opacity: 1,
                                        transition: {
                                            type: "spring",
                                            stiffness: 350,
                                            damping: 25,
                                            delay: index * 0.05
                                        }
                                    }
                                }}
                                whileHover={{ scale: 1.02 }}
                            >
                                <MediaItem
                                    item={item}
                                    className="absolute inset-0 w-full h-full"
                                    onClick={() => setSelectedItem(item)}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300">
                                    <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6">
                                        <h3 className="text-white text-lg md:text-xl lg:text-2xl font-bold mb-2 leading-tight">
                                            {item.title}
                                        </h3>
                                        <p className="text-white/95 text-sm md:text-base leading-relaxed">
                                            {item.desc}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};


export default InteractiveBentoGallery
