import { useCallback, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import type { AppSettings } from '../db/models'
import { useAppStore, type ThemeMode } from '../store/useAppStore'

export function useSettings() {
  const settings = useLiveQuery(() => db.settings.orderBy('id').first(), [], null)
  const setThemeStore = useAppStore((state) => state.setTheme)
  const setOnboardingCompleted = useAppStore((state) => state.setOnboardingCompleted)

  useEffect(() => {
    if (!settings) {
      return
    }

    setThemeStore(settings.theme)
    setOnboardingCompleted(settings.onboardingCompleted)
  }, [setOnboardingCompleted, setThemeStore, settings])

  const updateSettings = useCallback(async (updates: Partial<AppSettings>) => {
    const current = await db.settings.orderBy('id').first()

    if (current?.id) {
      await db.settings.update(current.id, updates)
      return
    }

    await db.settings.add({
      theme: 'system',
      aiProvider: 'openai',
      aiModel: 'gpt-4o',
      apiKey: '',
      workStartHour: 9,
      workEndHour: 17,
      sleepStartHour: 23,
      sleepEndHour: 7,
      onboardingCompleted: false,
      calendarAccess: false,
      ...updates,
    })
  }, [])

  const updateTheme = useCallback(
    async (theme: ThemeMode) => {
      setThemeStore(theme)
      await updateSettings({ theme })
    },
    [setThemeStore, updateSettings],
  )

  const updateApiKey = useCallback(
    async (apiKey: string) => updateSettings({ apiKey }),
    [updateSettings],
  )

  const updateProvider = useCallback(
    async (aiProvider: AppSettings['aiProvider']) => updateSettings({ aiProvider }),
    [updateSettings],
  )

  const updateModel = useCallback(
    async (aiModel: string) => updateSettings({ aiModel }),
    [updateSettings],
  )

  const updateWorkHours = useCallback(
    async (workStartHour: number, workEndHour: number) =>
      updateSettings({ workStartHour, workEndHour }),
    [updateSettings],
  )

  const updateSleepHours = useCallback(
    async (sleepStartHour: number, sleepEndHour: number) =>
      updateSettings({ sleepStartHour, sleepEndHour }),
    [updateSettings],
  )

  const updateUserProfile = useCallback(
    async (userProfile: string) => updateSettings({ userProfile }),
    [updateSettings],
  )

  const updateCalendarAccess = useCallback(
    async (calendarAccess: boolean) => updateSettings({ calendarAccess }),
    [updateSettings],
  )

  const setOnboardingState = useCallback(
    async (onboardingCompleted: boolean) => {
      setOnboardingCompleted(onboardingCompleted)
      await updateSettings({ onboardingCompleted })
    },
    [setOnboardingCompleted, updateSettings],
  )

  return {
    settings,
    isReady: settings !== null,
    updateSettings,
    updateTheme,
    updateApiKey,
    updateProvider,
    updateModel,
    updateWorkHours,
    updateSleepHours,
    updateUserProfile,
    updateCalendarAccess,
    setOnboardingState,
  }
}
