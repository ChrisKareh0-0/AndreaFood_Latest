import { useState, useEffect } from 'react'
import './Toast.css'

function Toast({ message, type = 'info', onClose }) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose()
        }, 5000)

        return () => clearTimeout(timer)
    }, [onClose])

    const getIcon = () => {
        switch (type) {
            case 'success':
                return '✓'
            case 'error':
                return '✕'
            case 'warning':
                return '⚠'
            default:
                return 'ℹ'
        }
    }

    return (
        <div className={`toast toast--${type}`}>
            <div className="toast__icon">{getIcon()}</div>
            <div className="toast__message">{message}</div>
            <button className="toast__close" onClick={onClose}>
                ×
            </button>
        </div>
    )
}

function ToastContainer({ toasts, removeToast }) {
    return (
        <div className="toast-container">
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    type={toast.type}
                    onClose={() => removeToast(toast.id)}
                />
            ))}
        </div>
    )
}

export { Toast, ToastContainer }
