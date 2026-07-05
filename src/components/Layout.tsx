import { useEffect } from 'react'
import { Outlet, useLocation, NavLink } from 'react-router-dom'
import { CalendarDays, LayoutGrid, MessageCircle, Settings } from 'lucide-react'
import { AddTaskModal } from './AddTaskModal'
import { TaskDetailsModal } from './TaskDetailsModal'
import { FAB } from './ui/FAB'
import { BottomNav } from './ui/BottomNav'
import { useAppStore, type AppTab } from '../store/useAppStore'
import { cn } from '../utils/cn'

const tabFromPath = (pathname: string): AppTab => {
  if (pathname.includes('/chat')) return 'chat'
  if (pathname.includes('/vision')) return 'vision'
  if (pathname.includes('/settings')) return 'settings'
  return 'today'
}

const navItems = [
  { label: 'Today', href: '/app/today', icon: CalendarDays, value: 'today' },
  { label: 'Chat', href: '/app/chat', icon: MessageCircle, value: 'chat' },
  { label: 'Vision', href: '/app/vision', icon: LayoutGrid, value: 'vision' },
  { label: 'Settings', href: '/app/settings', icon: Settings, value: 'settings' },
]

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
    <div className="flex h-screen overflow-hidden bg-mesh">
      {/* Desktop Sidebar (Glass) */}
      <nav className="hidden md:flex flex-col w-64 bg-white/40 dark:bg-black/20 backdrop-blur-2xl border-r border-white/50 dark:border-white/10 py-8 px-4 z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.2)]">
        <div className="mb-8 px-4">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary/80">Go Prod</p>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">Workspace</h2>
        </div>
        <div className="flex flex-col gap-2">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={() => setActiveTab(item.value as AppTab)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-4 px-4 py-3 rounded-2xl text-[15px] font-medium transition-all duration-300 border",
                    isActive
                      ? 'bg-white/60 dark:bg-white/10 text-primary shadow-sm border-white/50 dark:border-white/5'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-white/40 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200 border-transparent'
                  )
                }
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            )
          })}
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <main className="flex-1 overflow-y-auto z-0 overscroll-x-none touch-pan-y">
          <div className="mx-auto max-w-4xl px-4 pb-32 pt-[calc(env(safe-area-inset-top,0px)+24px)] md:pt-8 md:px-8">
            <Outlet />
          </div>
        </main>
      </div>

      {activeTab === 'today' ? <FAB onClick={() => openCreateTaskModal(currentViewDate)} /> : null}
      <div className="md:hidden">
        <BottomNav />
      </div>
      <AddTaskModal />
      <TaskDetailsModal />
    </div>
  )
}
