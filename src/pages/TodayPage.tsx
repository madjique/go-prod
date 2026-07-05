import { addDays, format, parseISO, subDays } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { GlassCard } from '../components/ui/GlassCard'
import { GlassButton } from '../components/ui/GlassButton'
import { TaskCard } from '../components/ui/TaskCard'
import { useCategories } from '../hooks/useCategories'
import { useTasks } from '../hooks/useTasks'
import { useAppStore } from '../store/useAppStore'
import { formatDayLabel, isToday } from '../utils/date.utils'
import { priorityRank } from '../utils/priority.utils'

export function TodayPage() {
  const currentViewDate = useAppStore((state) => state.currentViewDate)
  const setCurrentViewDate = useAppStore((state) => state.setCurrentViewDate)
  const openDetailsModal = useAppStore((state) => state.openDetailsModal)
  const { categories } = useCategories()
  const { getTasksForDate, toggleDone } = useTasks()

  useEffect(() => {
    setCurrentViewDate(format(new Date(), 'yyyy-MM-dd'))
  }, [setCurrentViewDate])

  const tasks = getTasksForDate(currentViewDate)
  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  )

  const allDayTasks = [...tasks]
    .filter((task) => !task.timeStart && !task.timeEnd)
    .sort((left, right) => priorityRank[left.priority] - priorityRank[right.priority])

  const timedTasks = [...tasks]
    .filter((task) => task.timeStart || task.timeEnd)
    .sort((left, right) => (left.timeStart ?? '99:99').localeCompare(right.timeStart ?? '99:99'))

  return (
    <div className="space-y-4">
      <GlassCard className="flex items-center justify-between gap-3">
        <GlassButton
          variant="ghost"
          size="icon"
          onClick={() => setCurrentViewDate(format(subDays(parseISO(currentViewDate), 1), 'yyyy-MM-dd'))}
        >
          <ChevronLeft className="size-5" />
        </GlassButton>
        <button
          type="button"
          onClick={() => setCurrentViewDate(format(new Date(), 'yyyy-MM-dd'))}
          className="text-center"
        >
          <p className="text-sm uppercase tracking-[0.25em] text-primary/80">
            {isToday(currentViewDate) ? 'Today' : 'View day'}
          </p>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            {formatDayLabel(currentViewDate)}
          </h2>
        </button>
        <GlassButton
          variant="ghost"
          size="icon"
          onClick={() => setCurrentViewDate(format(addDays(parseISO(currentViewDate), 1), 'yyyy-MM-dd'))}
        >
          <ChevronRight className="size-5" />
        </GlassButton>
      </GlassCard>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">All-day focus</h3>
          <span className="text-xs text-slate-400">{allDayTasks.length} tasks</span>
        </div>
        {allDayTasks.length > 0 ? (
          allDayTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              category={categoryMap.get(task.categoryId)}
              onToggle={() => void toggleDone(task.id!)}
              onClick={() => openDetailsModal(task.id!)}
            />
          ))
        ) : (
          <GlassCard className="text-sm text-slate-500 dark:text-slate-300">No all-day tasks yet.</GlassCard>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">Time-boxed</h3>
          <span className="text-xs text-slate-400">{timedTasks.length} tasks</span>
        </div>
        {timedTasks.length > 0 ? (
          timedTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              category={categoryMap.get(task.categoryId)}
              onToggle={() => void toggleDone(task.id!)}
              onClick={() => openDetailsModal(task.id!)}
            />
          ))
        ) : (
          <GlassCard className="text-sm text-slate-500 dark:text-slate-300">No scheduled tasks for this day.</GlassCard>
        )}
      </section>
    </div>
  )
}
