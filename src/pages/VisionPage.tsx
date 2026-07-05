import { useNavigate } from 'react-router-dom'
import { GlassButton } from '../components/ui/GlassButton'
import { GlassCard } from '../components/ui/GlassCard'
import { useTasks } from '../hooks/useTasks'
import { useCategories } from '../hooks/useCategories'
import { useAppStore } from '../store/useAppStore'
import { formatDayLabel, formatMonthLabel, formatWeekLabel, getMonthWeeks, getWeekDays, isToday, formatDate } from '../utils/date.utils'
import { addMonths, subMonths, addWeeks, subWeeks, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function VisionPage() {
  const navigate = useNavigate()
  const currentViewDate = useAppStore((state) => state.currentViewDate)
  const setCurrentViewDate = useAppStore((state) => state.setCurrentViewDate)
  const visionMode = useAppStore((state) => state.visionMode)
  const setVisionMode = useAppStore((state) => state.setVisionMode)
  const { getTasksForDate } = useTasks()
  const { categories } = useCategories()
  const weekDays = getWeekDays(currentViewDate)
  const monthWeeks = getMonthWeeks(currentViewDate)

  const handleDayClick = (day: string) => {
    setCurrentViewDate(day)
    navigate('/app/today')
  }

  return (
    <div className="space-y-4">
      <GlassCard className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4">
        <div className="flex items-center justify-between w-full sm:w-auto gap-2">
          <GlassButton
            variant="ghost"
            size="sm"
            className="size-8.5 rounded-full p-0 flex items-center justify-center bg-transparent border-white/20 hover:bg-white/40 dark:hover:bg-white/10 shrink-0"
            onClick={() => {
              const current = parseISO(currentViewDate)
              const prevDate = visionMode === 'week' ? subWeeks(current, 1) : subMonths(current, 1)
              setCurrentViewDate(formatDate(prevDate))
            }}
            title={visionMode === 'week' ? 'Previous week' : 'Previous month'}
          >
            <ChevronLeft className="size-4.5" />
          </GlassButton>
          
          <div className="flex-1 min-w-0 text-center px-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-primary/80 font-bold">
              {visionMode === 'week' ? 'Week View' : 'Month View'}
            </p>
            <h2 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 dark:text-white truncate">
              {visionMode === 'week' ? formatWeekLabel(weekDays[0]) : formatMonthLabel(currentViewDate)}
            </h2>
          </div>

          <GlassButton
            variant="ghost"
            size="sm"
            className="size-8.5 rounded-full p-0 flex items-center justify-center bg-transparent border-white/20 hover:bg-white/40 dark:hover:bg-white/10 shrink-0"
            onClick={() => {
              const current = parseISO(currentViewDate)
              const nextDate = visionMode === 'week' ? addWeeks(current, 1) : addMonths(current, 1)
              setCurrentViewDate(formatDate(nextDate))
            }}
            title={visionMode === 'week' ? 'Next week' : 'Next month'}
          >
            <ChevronRight className="size-4.5" />
          </GlassButton>
        </div>
        
        <div className="flex gap-2 justify-center sm:justify-start w-full sm:w-auto">
          <GlassButton
            variant={visionMode === 'week' ? 'primary' : 'ghost'}
            size="sm"
            className="h-8 text-xs px-3.5 rounded-xl shrink-0"
            onClick={() => setVisionMode('week')}
          >
            Week
          </GlassButton>
          <GlassButton
            variant={visionMode === 'month' ? 'primary' : 'ghost'}
            size="sm"
            className="h-8 text-xs px-3.5 rounded-xl shrink-0"
            onClick={() => setVisionMode('month')}
          >
            Month
          </GlassButton>
        </div>
      </GlassCard>

      {visionMode === 'week' ? (
        <div className="flex flex-col gap-3 md:grid md:grid-cols-7">
          {weekDays.map((day) => {
            const tasks = getTasksForDate(day)
            return (
              <GlassCard
                key={day}
                className="space-y-3 cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => handleDayClick(day)}
              >
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
                    {isToday(day) ? 'Today' : 'Day'}
                  </p>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{formatDayLabel(day)}</h3>
                </div>
                <div className="space-y-2">
                  {tasks.slice(0, 4).map((task) => {
                    const cat = categories.find((c) => c.id === task.categoryId)
                    const accentColor = task.color || cat?.color || '#cbd5e1'
                    return (
                      <div
                        key={task.id}
                        className="rounded-2xl px-3 py-2 text-sm truncate border border-black/5 dark:border-white/5 backdrop-blur-sm"
                        style={{
                          backgroundColor: accentColor.startsWith('#') ? `${accentColor}26` : accentColor,
                          borderLeftWidth: '4px',
                          borderLeftColor: accentColor,
                        }}
                      >
                        {task.title}
                      </div>
                    )
                  })}
                  {tasks.length === 0 ? (
                    <div className="text-sm text-slate-500 dark:text-slate-300">No tasks</div>
                  ) : null}
                </div>
              </GlassCard>
            )
          })}
        </div>
      ) : (
        <div className="grid gap-3">
          {monthWeeks.map((week) => (
            <GlassCard key={week[0]} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-slate-900 dark:text-white">{formatWeekLabel(week[0])}</p>
                <GlassButton
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCurrentViewDate(week[0])
                    setVisionMode('week')
                  }}
                >
                  Open week
                </GlassButton>
              </div>
              <div className="grid grid-cols-7 gap-2 text-center text-xs">
                {week.map((day) => {
                  const dayTasks = getTasksForDate(day)
                  const hasTasks = dayTasks.length > 0
                  const firstTask = dayTasks[0]
                  const firstTaskAccent = firstTask
                    ? (firstTask.color || categories.find((c) => c.id === firstTask.categoryId)?.color)
                    : null

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleDayClick(day)}
                      className={`rounded-2xl px-2 py-3 hover:ring-2 hover:ring-primary/40 transition-all backdrop-blur-sm border border-black/5 dark:border-white/5 ${
                        isToday(day)
                          ? 'bg-primary text-white'
                          : 'bg-white/50 text-slate-700 dark:bg-white/5 dark:text-slate-100'
                      }`}
                      style={{
                        backgroundColor: (!isToday(day) && hasTasks && firstTaskAccent)
                          ? `${firstTaskAccent}26`
                          : undefined,
                        borderColor: (!isToday(day) && hasTasks && firstTaskAccent)
                          ? `${firstTaskAccent}40`
                          : undefined,
                      }}
                    >
                      <div>{day.slice(-2)}</div>
                      <div className="mt-1 text-[10px] opacity-80">{dayTasks.length} tasks</div>
                    </button>
                  )
                })}
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}
