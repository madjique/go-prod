import { format } from 'date-fns'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'light' | 'dark' | 'system'
export type AppTab = 'today' | 'chat' | 'vision' | 'settings'
export type VisionMode = 'week' | 'month'

interface AppState {
  theme: ThemeMode
  activeTab: AppTab
  currentViewDate: string
  isAddTaskModalOpen: boolean
  editingTaskId: number | null
  visionMode: VisionMode
  activeConversationId: number | null
  onboardingCompleted: boolean
  hasHydrated: boolean
  setTheme: (theme: ThemeMode) => void
  setActiveTab: (activeTab: AppTab) => void
  setCurrentViewDate: (date: string) => void
  setIsAddTaskModalOpen: (isOpen: boolean) => void
  setEditingTaskId: (taskId: number | null) => void
  setVisionMode: (mode: VisionMode) => void
  setActiveConversationId: (conversationId: number | null) => void
  setOnboardingCompleted: (completed: boolean) => void
  setHasHydrated: (value: boolean) => void
  openCreateTaskModal: (date?: string) => void
  openEditTaskModal: (taskId: number) => void
}

const today = format(new Date(), 'yyyy-MM-dd')

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'system',
      activeTab: 'today',
      currentViewDate: today,
      isAddTaskModalOpen: false,
      editingTaskId: null,
      visionMode: 'week',
      activeConversationId: null,
      onboardingCompleted: false,
      hasHydrated: false,
      setTheme: (theme) => set({ theme }),
      setActiveTab: (activeTab) => set({ activeTab }),
      setCurrentViewDate: (currentViewDate) => set({ currentViewDate }),
      setIsAddTaskModalOpen: (isAddTaskModalOpen) => set({ isAddTaskModalOpen }),
      setEditingTaskId: (editingTaskId) => set({ editingTaskId }),
      setVisionMode: (visionMode) => set({ visionMode }),
      setActiveConversationId: (activeConversationId) => set({ activeConversationId }),
      setOnboardingCompleted: (onboardingCompleted) => set({ onboardingCompleted }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      openCreateTaskModal: (date) =>
        set({
          currentViewDate: date ?? format(new Date(), 'yyyy-MM-dd'),
          editingTaskId: null,
          isAddTaskModalOpen: true,
        }),
      openEditTaskModal: (editingTaskId) =>
        set({
          editingTaskId,
          isAddTaskModalOpen: true,
        }),
    }),
    {
      name: 'go-prod-store',
      partialize: (state) => ({
        theme: state.theme,
        activeTab: state.activeTab,
        currentViewDate: state.currentViewDate,
        visionMode: state.visionMode,
        activeConversationId: state.activeConversationId,
        onboardingCompleted: state.onboardingCompleted,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    },
  ),
)
