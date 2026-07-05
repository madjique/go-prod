import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import type { Task } from '../db/models'
import { useCategories } from '../hooks/useCategories'
import { useTasks } from '../hooks/useTasks'
import { useAppStore } from '../store/useAppStore'
import { GlassButton } from './ui/GlassButton'
import { Modal } from './ui/Modal'

interface TaskFormValues {
  title: string
  description: string
  date: string
  timeStart: string
  timeEnd: string
  categoryId: number
  priority: Task['priority']
  color: string
}

export function AddTaskModal() {
  const isOpen = useAppStore((state) => state.isAddTaskModalOpen)
  const editingTaskId = useAppStore((state) => state.editingTaskId)
  const currentViewDate = useAppStore((state) => state.currentViewDate)
  const setIsOpen = useAppStore((state) => state.setIsAddTaskModalOpen)
  const setEditingTaskId = useAppStore((state) => state.setEditingTaskId)
  const { categories } = useCategories()
  const { tasks, addTask, updateTask, deleteTask } = useTasks()
  const editingTask = tasks.find((task) => task.id === editingTaskId)

  const { register, handleSubmit, reset } = useForm<TaskFormValues>({
    defaultValues: {
      title: '',
      description: '',
      date: currentViewDate,
      timeStart: '',
      timeEnd: '',
      categoryId: 0,
      priority: 'medium',
      color: '',
    },
  })

  useEffect(() => {
    reset({
      title: editingTask?.title ?? '',
      description: editingTask?.description ?? '',
      date: editingTask?.date ?? currentViewDate,
      timeStart: editingTask?.timeStart ?? '',
      timeEnd: editingTask?.timeEnd ?? '',
      categoryId: editingTask?.categoryId ?? categories[0]?.id ?? 0,
      priority: editingTask?.priority ?? 'medium',
      color: editingTask?.color ?? '',
    })
  }, [categories, currentViewDate, editingTask, reset])

  const close = () => {
    setIsOpen(false)
    setEditingTaskId(null)
  }

  const onSubmit = handleSubmit(async (values) => {
    if (!values.title.trim()) {
      return
    }

    const payload = {
      title: values.title.trim(),
      description: values.description.trim() || undefined,
      date: values.date,
      timeStart: values.timeStart || undefined,
      timeEnd: values.timeEnd || undefined,
      categoryId: values.categoryId || categories[0]?.id || 1,
      priority: values.priority,
      color: values.color || undefined,
      isDone: editingTask?.isDone ?? false,
      createdAt: editingTask?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    if (editingTaskId) {
      await updateTask(editingTaskId, payload)
    } else {
      await addTask(payload)
    }

    close()
  })

  const footer = (
    <>
      {editingTaskId ? (
        <GlassButton
          variant="danger"
          className="flex-1"
          onClick={async () => {
            await deleteTask(editingTaskId)
            close()
          }}
        >
          Delete
        </GlassButton>
      ) : null}
      <GlassButton variant="ghost" className="flex-1" onClick={close}>
        Cancel
      </GlassButton>
      <GlassButton className="flex-1" onClick={onSubmit}>
        {editingTaskId ? 'Save task' : 'Add task'}
      </GlassButton>
    </>
  )

  return (
    <Modal isOpen={isOpen} onClose={close} title={editingTaskId ? 'Edit task' : 'Add task'} footer={footer}>
      <form className="space-y-4" onSubmit={onSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Title</span>
          <input
            {...register('title')}
            placeholder="Deep work session"
            className="glass-soft w-full rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Description</span>
          <textarea
            {...register('description')}
            rows={3}
            placeholder="Optional notes"
            className="glass-soft w-full rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Date</span>
            <input
              type="date"
              {...register('date')}
              className="glass-soft w-full rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Priority</span>
            <select
              {...register('priority')}
              className="glass-soft w-full rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Start</span>
            <input
              type="time"
              {...register('timeStart')}
              className="glass-soft w-full rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">End</span>
            <input
              type="time"
              {...register('timeEnd')}
              className="glass-soft w-full rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Category</span>
            <select
              {...register('categoryId', { valueAsNumber: true })}
              className="glass-soft w-full rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Accent</span>
            <input
              type="color"
              {...register('color')}
              className="glass-soft h-[50px] w-full rounded-2xl px-2 py-2"
            />
          </label>
        </div>
      </form>
    </Modal>
  )
}
