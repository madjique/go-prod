/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, type PropsWithChildren } from 'react'
import { useTheme } from '../hooks/useTheme'

const ThemeContext = createContext<ReturnType<typeof useTheme> | null>(null)

export function ThemeProvider({ children }: PropsWithChildren) {
  const value = useTheme()
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useThemeContext() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider')
  }

  return context
}
