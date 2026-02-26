import { createContext, useContext, useState, useEffect } from 'react'

const DarkModeContext = createContext()

export function DarkModeProvider({ children }) {
    const [isDarkMode, setIsDarkMode] = useState(() => {
        // Check localStorage for saved preference
        const saved = localStorage.getItem('darkMode')
        return saved ? JSON.parse(saved) : false
    })

    useEffect(() => {
        // Save to localStorage whenever dark mode changes
        localStorage.setItem('darkMode', JSON.stringify(isDarkMode))

        // Add/remove dark-mode class to body
        if (isDarkMode) {
            document.body.classList.add('dark-mode')
        } else {
            document.body.classList.remove('dark-mode')
        }
    }, [isDarkMode])

    const toggleDarkMode = () => {
        setIsDarkMode(prev => !prev)
    }

    return (
        <DarkModeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
            {children}
        </DarkModeContext.Provider>
    )
}

export function useDarkMode() {
    const context = useContext(DarkModeContext)
    if (!context) {
        throw new Error('useDarkMode must be used within a DarkModeProvider')
    }
    return context
}
