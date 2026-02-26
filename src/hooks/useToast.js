import { useState, useCallback } from 'react'

export function useToast() {
    const [toasts, setToasts] = useState([])

    const showToast = useCallback((message, type = 'info') => {
        const id = Date.now() + Math.random()
        setToasts((prev) => [...prev, { id, message, type }])
    }, [])

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, [])

    return { toasts, showToast, removeToast }
}
