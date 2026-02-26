import { useState } from 'react'
import './ImageUploader.css'

function ImageUploader({ onUploadComplete, label = "Upload Image", maxSizeKB = 500 }) {
    const [uploading, setUploading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [error, setError] = useState(null)

    const compressImage = (file, maxWidth = 1200, quality = 0.8) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()

            reader.onload = (e) => {
                const img = new Image()

                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas')
                        let width = img.width
                        let height = img.height

                        // Calculate new dimensions while maintaining aspect ratio
                        if (width > maxWidth) {
                            height = (height * maxWidth) / width
                            width = maxWidth
                        }

                        canvas.width = width
                        canvas.height = height

                        const ctx = canvas.getContext('2d')
                        ctx.drawImage(img, 0, 0, width, height)

                        // Convert to base64 with compression
                        const compressedBase64 = canvas.toDataURL('image/jpeg', quality)

                        // Check size (base64 size = length * 3/4 bytes)
                        const sizeInKB = Math.round((compressedBase64.length * 3) / 4 / 1024)

                        if (sizeInKB > maxSizeKB && quality > 0.3) {
                            // Recursively try with lower quality
                            compressImage(file, maxWidth, quality - 0.15).then(resolve).catch(reject)
                        } else if (sizeInKB > maxSizeKB) {
                            reject(new Error(`Image still too large (${sizeInKB}KB after compression). Please use a smaller image.`))
                        } else {
                            resolve({ base64: compressedBase64, sizeKB: sizeInKB })
                        }
                    } catch (err) {
                        reject(new Error('Failed to compress image: ' + (err?.message || err || 'Unknown error')))
                    }
                }

                img.onerror = () => reject(new Error('Failed to load image. Please ensure it\'s a valid image file.'))
                img.src = e.target.result
            }

            reader.onerror = () => reject(new Error('Failed to read file'))
            reader.readAsDataURL(file)
        })
    }

    const handleFileSelect = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Please select an image file')
            return
        }

        // Validate file size (max 5MB original)
        if (file.size > 5 * 1024 * 1024) {
            setError('Original image must be less than 5MB')
            return
        }

        try {
            setUploading(true)
            setProgress(20)
            setError(null)

            const { base64, sizeKB } = await compressImage(file, 1200, 0.8)

            setProgress(80)

            onUploadComplete(base64)

            setProgress(100)
            setTimeout(() => {
                setUploading(false)
                setProgress(0)
            }, 500)
        } catch (err) {
            setError(err.message || 'Upload failed. Please try again.')
            setUploading(false)
            setProgress(0)
        }
    }

    return (
        <div className="image-uploader">
            <label className="upload-btn">
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    disabled={uploading}
                    style={{ display: 'none' }}
                />
                <span className="upload-icon">📤</span>
                <span className="upload-text">
                    {uploading ? 'Processing...' : label}
                </span>
            </label>

            <small className="upload-hint">
                Max {maxSizeKB}KB (images will be compressed automatically)
            </small>

            {uploading && (
                <div className="upload-progress">
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="progress-text">{progress}%</span>
                </div>
            )}

            {error && (
                <div className="upload-error">
                    <span className="error-icon">⚠️</span>
                    <span className="error-text">{error}</span>
                </div>
            )}
        </div>
    )
}

export default ImageUploader
