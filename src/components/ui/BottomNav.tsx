import { CalendarDays, LayoutGrid, MessageCircle, Settings } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
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
    <nav className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+8px)] z-40 mx-auto w-full max-w-md px-4 md:max-w-3xl">
      <div className="glass mx-auto flex items-center justify-between rounded-full p-1">
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
                'relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-full px-2 py-1.5 text-[10px] sm:text-[11px] font-bold transition-colors duration-300 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 select-none',
                isActive
                  ? 'text-primary'
                  : 'text-slate-500 dark:text-slate-350 hover:text-slate-900 dark:hover:text-white',
              )}
            >
              {isActive ? (
                <motion.div
                  layoutId="activeTabBackground"
                  className="absolute inset-0 bg-primary/10 border border-primary/20 rounded-full z-0"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              ) : null}
              <span className="relative z-10 flex flex-col items-center gap-0.5">
                <Icon className="size-4.5" />
                <span>{item.label}</span>
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
