import { useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import type { Category } from '../db/models'

export function useCategories() {
  const categories = useLiveQuery(() => db.categories.orderBy('name').toArray(), [], [])

  const addCategory = useCallback(async (category: Omit<Category, 'id'>) => {
    return db.categories.add(category)
  }, [])

  const updateCategory = useCallback(async (id: number, data: Partial<Omit<Category, 'id'>>) => {
    await db.categories.update(id, data)
  }, [])

  const deleteCategory = useCallback(async (id: number) => {
    await db.categories.delete(id)
  }, [])

  return {
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
  }
}
