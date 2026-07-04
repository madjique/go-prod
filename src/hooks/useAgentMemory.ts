import { useCallback, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import type { AgentMemory } from '../db/models'

export function useAgentMemory() {
  const memory = useLiveQuery(
    () => db.agentMemory.orderBy('importance').reverse().toArray(),
    [],
    [],
  )

  const getMemoryContext = useCallback(() => {
    if (memory.length === 0) {
      return 'No saved user memory yet.'
    }

    return memory
      .slice(0, 8)
      .map((item) => `- [${item.category}] ${item.key}: ${item.value}`)
      .join('\n')
  }, [memory])

  const updateMemory = useCallback(
    async (
      key: string,
      value: string,
      importance: number,
      category: AgentMemory['category'],
    ) => {
      const existing = await db.agentMemory.where('key').equals(key).first()
      const updatedAt = new Date().toISOString()

      if (existing?.id) {
        await db.agentMemory.update(existing.id, {
          value,
          importance,
          category,
          updatedAt,
        })
        return existing.id
      }

      return db.agentMemory.add({
        key,
        value,
        importance,
        category,
        updatedAt,
      })
    },
    [],
  )

  const deleteMemory = useCallback(async (id: number) => {
    await db.agentMemory.delete(id)
  }, [])

  const clearAllMemory = useCallback(async () => {
    await db.agentMemory.clear()
  }, [])

  const topMemory = useMemo(() => memory.slice(0, 3), [memory])

  return {
    memory,
    topMemory,
    getMemoryContext,
    updateMemory,
    deleteMemory,
    clearAllMemory,
  }
}
