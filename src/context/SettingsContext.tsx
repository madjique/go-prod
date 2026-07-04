/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, type PropsWithChildren } from 'react'
import { useSettings } from '../hooks/useSettings'

const SettingsContext = createContext<ReturnType<typeof useSettings> | null>(null)

export function SettingsProvider({ children }: PropsWithChildren) {
  const value = useSettings()
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettingsContext() {
  const context = useContext(SettingsContext)

  if (!context) {
    throw new Error('useSettingsContext must be used within a SettingsProvider')
  }

  return context
}
