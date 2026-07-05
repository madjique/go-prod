import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AddTaskModal } from './AddTaskModal'
import { TaskDetailsModal } from './TaskDetailsModal'
import { FAB } from './ui/FAB'
import { BottomNav } from './ui/BottomNav'
import { useAppStore, type AppTab } from '../store/useAppStore'

const tabFromPath = (pathname: string): AppTab => {
  if (pathname.includes('/chat')) return 'chat'
  if (pathname.includes('/vision')) return 'vision'
  if (pathname.includes('/settings')) return 'settings'
  return 'today'
}

const tabTitle: Record<AppTab, string> = {
  today: 'Today',
  chat: 'Coach',
  vision: 'Vision',
  settings: 'Settings',
}

export function Layout() {
  const location = useLocation()
  const activeTab = tabFromPath(location.pathname)
  const setActiveTab = useAppStore((state) => state.setActiveTab)
  const openCreateTaskModal = useAppStore((state) => state.openCreateTaskModal)
  const currentViewDate = useAppStore((state) => state.currentViewDate)

  useEffect(() => {
    setActiveTab(activeTab)
  }, [activeTab, setActiveTab])

  return (
    <div className="bg-mesh min-h-screen">
      <div className="mx-auto min-h-screen max-w-4xl px-4 pb-28 pt-6 md:px-6">
        <header className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary/80">Go Prod</p>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{tabTitle[activeTab]}</h1>
          </div>
        </header>
        <Outlet />
      </div>
      {activeTab === 'today' ? <FAB onClick={() => openCreateTaskModal(currentViewDate)} /> : null}
      <BottomNav />
      <AddTaskModal />
      <TaskDetailsModal />
    </div>
  )
}
