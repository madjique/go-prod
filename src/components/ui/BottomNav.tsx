import { CalendarDays, LayoutGrid, MessageCircle, Settings } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppStore, type AppTab } from '../../store/useAppStore'
import { cn } from '../../utils/cn'

const items: Array<{
  label: string
  value: AppTab
  href: string
  icon: typeof CalendarDays
}> = [
  { label: 'Today', value: 'today', href: '/app/today', icon: CalendarDays },
  { label: 'Chat', value: 'chat', href: '/app/chat', icon: MessageCircle },
  { label: 'Vision', value: 'vision', href: '/app/vision', icon: LayoutGrid },
  { label: 'Settings', value: 'settings', href: '/app/settings', icon: Settings },
]

export function BottomNav() {
  const activeTab = useAppStore((state) => state.activeTab)
  const setActiveTab = useAppStore((state) => state.setActiveTab)
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav className="fixed inset-x-0 bottom-4 z-40 mx-auto w-full max-w-md px-4 md:max-w-3xl">
      <div className="glass mx-auto flex items-center justify-between rounded-full px-3 py-2">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.value || location.pathname === item.href

          return (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                setActiveTab(item.value)
                navigate(item.href)
              }}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-full px-3 py-2 text-xs font-medium transition',
                isActive
                  ? 'bg-primary text-white shadow-lg shadow-indigo-500/25'
                  : 'text-slate-500 dark:text-slate-300',
              )}
            >
              <Icon className="size-5" />
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
