"use client"
import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react';


// MediaItemType defines the structure of a media item
interface SourceClientType {
    id: number;
    name?: string;
    logo?: string;
    thumbnailUrl?: string;
    images?: string[];
    categories?: string[];
    description?: string;
}

interface MediaItemType {
    id: number;
    type: 'image' | 'video';
    title: string;
    desc: string;
    url: string;
    span: string;
    categories?: string[];
    allImages?: string[];
    sourceClient?: SourceClientType;
}

const isVideoUrl = (url?: string): boolean => {
    return !!url && (url.startsWith('data:video/') || url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.mov'));
};

const getVideoMimeType = (url?: string): string => {
    if (!url) return 'video/mp4';
    if (url.startsWith('data:video/webm')) return 'video/webm';
    if (url.startsWith('data:video/quicktime') || url.startsWith('data:video/mov')) return 'video/quicktime';
    if (url.startsWith('data:video/')) return 'video/mp4';
    if (url.endsWith('.webm')) return 'video/webm';
    if (url.endsWith('.mov')) return 'video/quicktime';
    return 'video/mp4';
};

const resolveClientImages = (item?: MediaItemType | null): string[] => {
    if (!item) return [];

    const directImages = Array.isArray(item.allImages) ? item.allImages : [];
    if (directImages.length > 0) {
        return directImages.filter(Boolean);
    }

    const sourceClientImages = Array.isArray(item.sourceClient?.images) ? item.sourceClient?.images : [];
    const merged = [
        ...sourceClientImages,
        ...(item.sourceClient?.logo ? [item.sourceClient.logo] : []),
        ...(item.sourceClient?.thumbnailUrl ? [item.sourceClient.thumbnailUrl] : []),
        ...(item.url ? [item.url] : []),
    ].filter(Boolean) as string[];

    return Array.from(new Set(merged));
};
// MediaItem component renders either a video or image based on item.type
const MediaItem = ({ item, className, onClick, videoRef }: { 
    item: MediaItemType, 
    className?: string, 
    onClick?: () => void,
    videoRef?: React.RefObject<HTMLVideoElement>
}) => {
    const localVideoRef = useRef<HTMLVideoElement>(null); // Reference for video element
    const videoElementRef = videoRef || localVideoRef; // Use external ref if provided, otherwise use local
    const [isInView, setIsInView] = useState(false); // To track if video is in the viewport
    const [isBuffering, setIsBuffering] = useState(true);  // To track if video is buffering
    const [imgError, setImgError] = useState(false); // Track image load errors
    const [videoError, setVideoError] = useState(false); // Track video load errors

    // Default background for dark mode
    const defaultBg = '#1a1a2e';

    // Intersection Observer to detect if video is in view and play/pause accordingly
    useEffect(() => {
        if (item.type !== 'video' && !isVideoUrl(item.url)) return;

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

        if (videoElementRef.current) {
            observer.observe(videoElementRef.current); // Start observing the video element
        }

        return () => {
            if (videoElementRef.current) {
                observer.unobserve(videoElementRef.current); // Clean up observer when component unmounts
            }
        };
    }, [item.type, item.url]);

    // Handle video play/pause based on whether the video is in view or not
    useEffect(() => {
        if (item.type !== 'video' && !isVideoUrl(item.url)) return;
        if (!isInView) return;

        let mounted = true;

        const handleVideoPlay = async () => {
            if (!videoElementRef.current || !mounted) return;

            try {
                if (videoElementRef.current.readyState >= 3) {
                    setIsBuffering(false);
                    await videoElementRef.current.play(); // Play the video if it's ready
                } else {
                    setIsBuffering(true);
                    await new Promise((resolve) => {
                        if (videoElementRef.current) {
                            videoElementRef.current.oncanplay = resolve; // Wait until the video can start playing
                        }
                    });
                    if (mounted) {
                        setIsBuffering(false);
                        await videoElementRef.current.play();
                    }
                }
            } catch (error) {
                console.warn("Video playback failed:", error);
            }
        };

        handleVideoPlay();

        return () => {
            mounted = false;
            if (videoElementRef.current) {
                videoElementRef.current.pause();
            }
        };
    }, [isInView, item.type, item.url]);

    // Determine if this is a video based on type or URL
    const isVideo = item.type === 'video' || isVideoUrl(item.url);

    // Render video
    if (isVideo) {
        if (videoError || !item.url) {
            return (
                <div className={`${className} flex items-center justify-center bg-gray-900`}>
                    <div className="text-gray-500 text-4xl md:text-5xl font-bold">
                        {item.title?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                </div>
            );
        }

        return (
            <div className={`${className} relative overflow-hidden`}>
                <video
                    ref={videoElementRef}
                    className="w-full h-full object-cover"
                    onClick={onClick}
                    playsInline
                    muted
                    loop
                    preload={isInView ? 'metadata' : 'none'}
                    onError={() => {
                        console.warn('Video failed to load:', item.url?.substring(0, 50));
                        setVideoError(true);
                    }}
                    style={{
                        opacity: isBuffering ? 0.8 : 1,
                        transition: 'opacity 0.2s',
                        transform: 'translateZ(0)',
                        willChange: 'transform',
                    }}
                >
                    <source src={item.url} type={getVideoMimeType(item.url)} />
                </video>
                {isBuffering && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    </div>
                )}
            </div>
        );
    }

    // Render image
    return (
        <div
            className={`${className} cursor-pointer`}
            onClick={onClick}
            style={{
                background: item.url?.startsWith('linear-gradient') ? item.url : defaultBg,
                backgroundColor: item.url?.startsWith('linear-gradient') ? undefined : defaultBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
            }}
        >
            {imgError || !item.url ? (
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
                        console.warn('Image failed to load:', item.url?.substring(0, 50));
                        setImgError(true);
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
}
const GalleryModal = ({ selectedItem, isOpen, onClose }: GalleryModalProps) => {
    const [dockPosition, setDockPosition] = useState({ x: 0, y: 0 });
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Get all images for the selected client (from allImages array or single url)
    const clientImages = resolveClientImages(selectedItem);

    useEffect(() => {
        setCurrentImageIndex(0);
    }, [selectedItem?.id]);

    if (!isOpen || !selectedItem) return null;

    const currentImage = clientImages[currentImageIndex];
    const isCurrentVideo = isVideoUrl(currentImage);

    const currentItem = {
        ...selectedItem,
        url: currentImage,
        type: isCurrentVideo ? 'video' : 'image'
    };

    // Toggle fullscreen
    const toggleFullscreen = async () => {
        const container = document.querySelector('.modal-content-container');
        try {
            if (!document.fullscreenElement) {
                await container?.requestFullscreen();
                setIsFullscreen(true);
            } else {
                await document.exitFullscreen();
                setIsFullscreen(false);
            }
        } catch {
            // Ignore fullscreen failures and keep the modal usable.
        }
    };

    // Listen for fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    // Auto-play video when entering fullscreen
    useEffect(() => {
        if (isFullscreen && isCurrentVideo && videoRef.current) {
            videoRef.current.play().catch(() => {});
        }
    }, [isFullscreen, isCurrentVideo]);

    const handleNext = () => {
        setCurrentImageIndex((prev) => (prev + 1) % clientImages.length);
    };

    const handlePrev = () => {
        setCurrentImageIndex((prev) => (prev - 1 + clientImages.length) % clientImages.length);
    };

    return (
        <>
            {/* Backdrop overlay - click to close */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                onClick={onClose}
            />
            {/* Main Modal */}
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 30
                }}
                className="fixed inset-0 flex items-center justify-center z-[60] pointer-events-none"
            >
                <div
                    className="modal-content-container w-full min-h-screen sm:h-[90vh] md:h-[600px] backdrop-blur-lg
                              rounded-none sm:rounded-lg md:rounded-xl overflow-hidden pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Main Content */}
                    <div className="h-full flex flex-col relative">
                        <div className="flex-1 p-2 sm:p-3 md:p-4 flex items-center justify-center bg-gray-900/80">
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
                                    <MediaItem 
                                        item={currentItem} 
                                        className="w-full h-full object-contain bg-gray-900/20" 
                                        onClick={() => {}}
                                        videoRef={isCurrentVideo ? videoRef : undefined}
                                    />
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
                                    {/* Fullscreen button for videos */}
                                    {isCurrentVideo && (
                                        <button
                                            onClick={toggleFullscreen}
                                            className="absolute top-2 right-2 p-2 rounded-full bg-black/50 text-white
                                                     hover:bg-black/70 transition-colors z-30"
                                            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                                        >
                                            {isFullscreen ? (
                                                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m4-4l-5 5m11-5v-4m0 4h-4m4 0l-5-5" />
                                                </svg>
                                            )}
                                        </button>
                                    )}
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

                    {/* Close Button - positioned at top right of modal */}
                    <motion.button
                        className="absolute top-4 right-4
                                  p-2 rounded-full bg-gray-800 text-white hover:bg-gray-700
                                  text-sm backdrop-blur-md shadow-lg z-40"
                        onClick={onClose}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <X className='w-5 h-5' />
                    </motion.button>
                </div>
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
                className="fixed z-[70] left-1/2 bottom-4 -translate-x-1/2 touch-none"
            >
                <motion.div
                    className="relative rounded-xl bg-sky-400/20 backdrop-blur-xl
                             border border-blue-400/30 shadow-lg
                             cursor-grab active:cursor-grabbing"
                >
                    <div className="flex items-center -space-x-2 px-3 py-2">
                        {clientImages.map((imgUrl, index) => {
                            const thumbItem = { ...selectedItem, url: imgUrl, type: isVideoUrl(imgUrl) ? 'video' : 'image' };
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
    const items = mediaItems;

    useEffect(() => {
        let cancelled = false;

        const loadSelectedMedia = async () => {
            if (!selectedItem) return;

            const existingImages = Array.isArray(selectedItem.allImages)
                ? selectedItem.allImages
                : Array.isArray(selectedItem.sourceClient?.images)
                    ? selectedItem.sourceClient.images
                    : [];

            if (existingImages.length > 0) return;

            try {
                const response = await fetch(`/api/clients/${selectedItem.id}/media`);
                if (!response.ok) return;

                const payload = await response.json();
                const images = Array.isArray(payload.images)
                    ? payload.images
                    : Array.isArray(payload.media)
                        ? payload.media.map((item: { url?: string }) => item.url).filter(Boolean)
                        : [];

                if (cancelled || images.length === 0) return;

                setSelectedItem((current) => {
                    if (!current || current.id !== selectedItem.id) {
                        return current;
                    }

                    return {
                        ...current,
                        allImages: images,
                        sourceClient: {
                            ...current.sourceClient,
                            images,
                        },
                    };
                });
            } catch {
                // Keep the modal usable with the preview item if the media request fails.
            }
        };

        loadSelectedMedia();

        return () => {
            cancelled = true;
        };
    }, [selectedItem]);

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
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <h3 className="text-white text-lg md:text-xl lg:text-2xl font-bold text-center px-4 leading-tight">
                                            {item.title}
                                        </h3>
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
