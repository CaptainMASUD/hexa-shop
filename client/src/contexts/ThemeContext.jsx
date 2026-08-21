import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import '../index.css'

const ThemeContext = createContext(null)

const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'dark'

  const saved = window.localStorage.getItem('hexa_theme')
  if (saved === 'light' || saved === 'dark') return saved

  return 'dark'
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    const root = document.documentElement
    const isDark = theme === 'dark'

    // Tailwind dark:* utilities depend on this class when darkMode is "class".
    root.classList.toggle('dark', isDark)

    // Keep your existing selectors working too.
    root.classList.toggle('theme-light', !isDark)
    root.dataset.theme = theme
    root.style.colorScheme = theme

    window.localStorage.setItem('hexa_theme', theme)
  }, [theme])

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      isDark: theme === 'dark',
      toggleTheme: () =>
        setTheme((current) => (current === 'dark' ? 'light' : 'dark')),
    }),
    [theme]
  )

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider')
  }

  return context
}
