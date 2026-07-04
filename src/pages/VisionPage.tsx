import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GlassButton } from '../components/ui/GlassButton'
import { GlassCard } from '../components/ui/GlassCard'
import { Modal } from '../components/ui/Modal'
import { TaskCard } from '../components/ui/TaskCard'
import { useCategories } from '../hooks/useCategories'
import { useTasks } from '../hooks/useTasks'
import { useAppStore } from '../store/useAppStore'
import { formatDayLabel, formatMonthLabel, formatWeekLabel, getMonthWeeks, getWeekDays, isToday } from '../utils/date.utils'

export function VisionPage() {
  const navigate = useNavigate()
  const currentViewDate = useAppStore((state) => state.currentViewDate)
  const setCurrentViewDate = useAppStore((state) => state.setCurrentViewDate)
  const visionMode = useAppStore((state) => state.visionMode)
  const setVisionMode = useAppStore((state) => state.setVisionMode)
  const openEditTaskModal = useAppStore((state) => state.openEditTaskModal)
  const { categories } = useCategories()
  const { getTasksForDate, toggleDone } = useTasks()
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  )
  const weekDays = getWeekDays(currentViewDate)
  const monthWeeks = getMonthWeeks(currentViewDate)

  return (
    <div className="space-y-4">
      <GlassCard className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-300">
            {visionMode === 'week' ? formatWeekLabel(weekDays[0]) : formatMonthLabel(currentViewDate)}
          </p>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Zoom out and balance the load</h2>
        </div>
        <div className="flex gap-2">
          <GlassButton variant={visionMode === 'week' ? 'primary' : 'ghost'} size="sm" onClick={() => setVisionMode('week')}>
            Week
          </GlassButton>
          <GlassButton variant={visionMode === 'month' ? 'primary' : 'ghost'} size="sm" onClick={() => setVisionMode('month')}>
            Month
          </GlassButton>
        </div>
      </GlassCard>

      {visionMode === 'week' ? (
        <div className="flex gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-7 md:overflow-visible">
          {weekDays.map((day) => {
            const tasks = getTasksForDate(day)
            return (
              <GlassCard
                key={day}
                className="min-w-[220px] space-y-3 md:min-w-0"
                onClick={() => setSelectedDay(day)}
              >
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
                    {isToday(day) ? 'Today' : 'Day'}
                  </p>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{formatDayLabel(day)}</h3>
                </div>
                <div className="space-y-2">
                  {tasks.slice(0, 4).map((task) => (
                    <div key={task.id} className="rounded-2xl bg-white/55 px-3 py-2 text-sm dark:bg-white/5">
                      {task.title}
                    </div>
                  ))}
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
                {week.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={`rounded-2xl px-2 py-3 ${isToday(day) ? 'bg-primary text-white' : 'bg-white/50 text-slate-700 dark:bg-white/5 dark:text-slate-100'}`}
                  >
                    <div>{day.slice(-2)}</div>
                    <div className="mt-1 text-[10px] opacity-80">{getTasksForDate(day).length} tasks</div>
                  </button>
                ))}
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <Modal
        isOpen={selectedDay !== null}
        onClose={() => setSelectedDay(null)}
        title={selectedDay ? formatDayLabel(selectedDay) : 'Day overview'}
      >
        <div className="space-y-3">
          {(selectedDay ? getTasksForDate(selectedDay) : []).map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              category={categoryMap.get(task.categoryId)}
              onToggle={() => void toggleDone(task.id!)}
              onClick={() => openEditTaskModal(task.id!)}
            />
          ))}
          {selectedDay && getTasksForDate(selectedDay).length === 0 ? (
            <GlassCard className="text-sm text-slate-500 dark:text-slate-300">No tasks for this day yet.</GlassCard>
          ) : null}
          {selectedDay ? (
            <GlassButton
              className="w-full"
              onClick={() => {
                setCurrentViewDate(selectedDay)
                setSelectedDay(null)
                navigate('/app/today')
              }}
            >
              Open in Today view
            </GlassButton>
          ) : null}
        </div>
      </Modal>
    </div>
  )
}
