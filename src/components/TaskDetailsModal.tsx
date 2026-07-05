import { useMemo } from 'react'
import { Calendar, Clock, Edit, Tag, Trash, AlertCircle, CheckCircle, Circle } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useTasks } from '../hooks/useTasks'
import { useCategories } from '../hooks/useCategories'
import { Modal } from './ui/Modal'
import { GlassButton } from './ui/GlassButton'
import { CategoryBadge } from './ui/CategoryBadge'
import { formatDayLabel, formatTime } from '../utils/date.utils'
import { getPriorityColor, getPriorityLabel } from '../utils/priority.utils'

export function TaskDetailsModal() {
  const isOpen = useAppStore((state) => state.isDetailsModalOpen)
  const detailsTaskId = useAppStore((state) => state.detailsTaskId)
  const close = useAppStore((state) => state.closeDetailsModal)
  const openEditTaskModal = useAppStore((state) => state.openEditTaskModal)
  
  const { tasks, toggleDone, deleteTask } = useTasks()
  const { categories } = useCategories()

  const task = useMemo(() => tasks.find((t) => t.id === detailsTaskId), [tasks, detailsTaskId])
  
  const category = useMemo(() => {
    if (!task) return undefined
    return categories.find((c) => c.id === task.categoryId)
  }, [categories, task])

  if (!task) {
    return null
  }

  const accent = task.color || category?.color || getPriorityColor(task.priority)
  const hasTime = task.timeStart || task.timeEnd

  const handleEdit = () => {
    if (task.id) {
      close()
      openEditTaskModal(task.id)
    }
  }

  const handleDelete = async () => {
    if (task.id) {
      if (confirm('Are you sure you want to delete this task?')) {
        close()
        await deleteTask(task.id)
      }
    }
  }

  const handleToggle = async () => {
    if (task.id) {
      await toggleDone(task.id)
    }
  }

  const footer = (
    <>
      <GlassButton
        variant="danger"
        className="flex-1"
        onClick={handleDelete}
      >
        <Trash className="mr-2 size-4" />
        Delete
      </GlassButton>
      <GlassButton
        variant="ghost"
        className="flex-1"
        onClick={handleEdit}
      >
        <Edit className="mr-2 size-4" />
        Edit
      </GlassButton>
      <GlassButton
        className="flex-1"
        onClick={close}
      >
        Close
      </GlassButton>
    </>
  )

  return (
    <Modal isOpen={isOpen} onClose={close} title="Task Details" footer={footer}>
      <div className="space-y-6">
        {/* Title & Complete Toggle */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="mt-1 w-2 self-stretch rounded-full" style={{ backgroundColor: accent }} />
            <div>
              <h2 className={`text-xl font-bold text-slate-900 dark:text-white ${task.isDone ? 'line-through opacity-60' : ''}`}>
                {task.title}
              </h2>
              {task.description ? (
                <p className="mt-2 text-sm whitespace-pre-wrap text-slate-600 dark:text-slate-300">
                  {task.description}
                </p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggle}
            className="text-primary hover:opacity-85 transition-opacity"
            aria-label="Toggle completion status"
          >
            {task.isDone ? (
              <CheckCircle className="size-7 fill-primary text-white" />
            ) : (
              <Circle className="size-7 text-slate-300 dark:text-slate-500" />
            )}
          </button>
        </div>

        <hr className="border-white/10" />

        {/* Metadatas */}
        <div className="space-y-4">
          {/* Date */}
          <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
            <Calendar className="size-5 text-slate-400" />
            <div>
              <span className="font-medium">Date: </span>
              {formatDayLabel(task.date)}
            </div>
          </div>

          {/* Timebox */}
          <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
            <Clock className="size-5 text-slate-400" />
            <div>
              <span className="font-medium">Time: </span>
              {hasTime ? (
                <span>
                  {task.timeStart ? formatTime(task.timeStart) : 'Any time'}
                  {task.timeEnd ? ` - ${formatTime(task.timeEnd)}` : ''}
                </span>
              ) : (
                <span>All day</span>
              )}
            </div>
          </div>

          {/* Category */}
          <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
            <Tag className="size-5 text-slate-400" />
            <div className="flex items-center gap-2">
              <span className="font-medium">Category: </span>
              <CategoryBadge category={category} />
            </div>
          </div>

          {/* Priority */}
          <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
            <AlertCircle className="size-5 text-slate-400" />
            <div className="flex items-center gap-2">
              <span className="font-medium">Priority: </span>
              <span className="font-semibold" style={{ color: getPriorityColor(task.priority) }}>
                {getPriorityLabel(task.priority)}
              </span>
            </div>
          </div>

          {/* Color Accent Preview */}
          {task.color ? (
            <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
              <div className="size-5 rounded-full border border-white/20" style={{ backgroundColor: task.color }} />
              <div>
                <span className="font-medium">Custom Accent: </span>
                <span className="font-mono text-xs uppercase">{task.color}</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </Modal>
  )
}
