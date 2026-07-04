import { useCallback } from 'react'
import { addDays, format, parseISO } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import type { Task } from '../db/models'

function nowIso() {
  return new Date().toISOString()
}

export function useTasks() {
  const tasks = useLiveQuery(() => db.tasks.orderBy('date').toArray(), [], [])

  const getTasksForDate = useCallback(
    (date: string) => tasks.filter((task) => task.date === date),
    [tasks],
  )

  const getTasksForWeek = useCallback(
    (startDate: string) => {
      const start = parseISO(startDate)
      const end = format(addDays(start, 6), 'yyyy-MM-dd')
      return tasks.filter((task) => task.date >= startDate && task.date <= end)
    },
    [tasks],
  )

  const addTask = useCallback(async (task: Omit<Task, 'id'>) => {
    const timestamp = nowIso()
    return db.tasks.add({
      ...task,
      createdAt: task.createdAt || timestamp,
      updatedAt: timestamp,
    })
  }, [])

  const updateTask = useCallback(async (id: number, data: Partial<Omit<Task, 'id'>>) => {
    await db.tasks.update(id, { ...data, updatedAt: nowIso() })
  }, [])

  const deleteTask = useCallback(async (id: number) => {
    await db.tasks.delete(id)
  }, [])

  const toggleDone = useCallback(async (id: number) => {
    const task = await db.tasks.get(id)

    if (!task) {
      return
    }

    await db.tasks.update(id, {
      isDone: !task.isDone,
      updatedAt: nowIso(),
    })
  }, [])

  return {
    tasks,
    getTasksForDate,
    getTasksForWeek,
    addTask,
    updateTask,
    deleteTask,
    toggleDone,
  }
}
