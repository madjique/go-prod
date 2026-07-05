import { motion } from 'framer-motion'
import type { Category, Task } from '../../db/models'
import { cn } from '../../utils/cn'
import { formatTime } from '../../utils/date.utils'
import { getPriorityColor, getPriorityLabel } from '../../utils/priority.utils'
import { CategoryBadge } from './CategoryBadge'

interface TaskCardProps {
  task: Task
  category?: Category
  onToggle: () => void
  onClick: () => void
}

export function TaskCard({ task, category, onToggle, onClick }: TaskCardProps) {
  const accent = task.color || category?.color || getPriorityColor(task.priority)
  const hasTime = task.timeStart || task.timeEnd

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={cn(
        'glass w-full rounded-[28px] p-4 text-left transition-all duration-300 shadow-sm border border-white/20 hover:bg-white/40 dark:hover:bg-white/10',
        task.isDone && 'opacity-70',
      )}
    >
      <div className="flex items-start gap-4">
        <div className="w-1.5 self-stretch rounded-full" style={{ backgroundColor: accent }} />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3
                className={cn(
                  'text-base font-semibold text-slate-900 dark:text-white',
                  task.isDone && 'line-through opacity-70',
                )}
              >
                {task.title}
              </h3>
              {task.description ? (
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{task.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onToggle()
              }}
              className={cn(
                'mt-1 size-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 flex-shrink-0',
                task.isDone
                  ? 'bg-primary border-primary text-white'
                  : 'border-slate-300 dark:border-slate-600 hover:border-primary',
              )}
              aria-label={`Toggle ${task.title}`}
            >
              {task.isDone ? (
                <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : null}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-300">
            {hasTime ? (
              <span>
                {task.timeStart ? formatTime(task.timeStart) : 'Any time'}
                {task.timeEnd ? ` - ${formatTime(task.timeEnd)}` : ''}
              </span>
            ) : (
              <span>All day</span>
            )}
            <span>•</span>
            <span style={{ color: getPriorityColor(task.priority) }}>{getPriorityLabel(task.priority)}</span>
            <CategoryBadge category={category} />
          </div>
        </div>
      </div>
    </motion.button>
  )
}
