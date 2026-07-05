import { useState, useEffect, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import { useSettingsContext } from '../context/SettingsContext'
import { useAgentMemory } from './useAgentMemory'
import { aiModelOptions } from '../agent/modelOptions'

export function useAgentSettings() {
  const {
    settings,
    updateProvider,
    updateModel,
    updateApiKey,
    updateSettings,
  } = useSettingsContext()

  const { memory, deleteMemory, clearAllMemory } = useAgentMemory()
  const [customPrompt, setCustomPrompt] = useState('')

  useEffect(() => {
    if (settings) {
      setCustomPrompt(settings.customPrompt || '')
    }
  }, [settings])

  const availableModels = useMemo(
    () => (settings?.aiProvider ? aiModelOptions[settings.aiProvider] : []),
    [settings?.aiProvider],
  )

  const summaries = useLiveQuery(
    () => db.agentSummaries.orderBy('createdAt').reverse().toArray(),
    [],
    [],
  )

  // Query assistant messages to extract detailed request consumption logs
  const requestLogs = useLiveQuery(
    async () => {
      const msgs = await db.messages
        .filter((m) => m.role === 'assistant' && (m.tokenCount !== undefined || m.cost !== undefined))
        .toArray()
      
      return msgs.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },
    [],
    [],
  )

  const savePrompt = async (promptValue: string) => {
    const trimmed = promptValue.trim()
    await updateSettings({ customPrompt: trimmed || undefined })
    setCustomPrompt(trimmed)
  }

  const resetPrompt = async () => {
    await updateSettings({ customPrompt: undefined })
    setCustomPrompt('')
  }

  const deleteSummary = async (id: number) => {
    await db.agentSummaries.delete(id)
  }

  const clearAllUsageLogs = async () => {
    const msgs = await db.messages
      .filter((m) => m.role === 'assistant' && (m.tokenCount !== undefined || m.cost !== undefined))
      .toArray()
    await db.transaction('rw', db.messages, async () => {
      for (const m of msgs) {
        if (m.id) {
          await db.messages.update(m.id, { tokenCount: undefined, cost: undefined })
        }
      }
    })
  }

  return {
    settings,
    customPrompt,
    setCustomPrompt,
    availableModels,
    savePrompt,
    resetPrompt,
    
    // Memory
    memory,
    deleteMemory,
    clearAllMemory,
    
    // Summaries
    summaries,
    deleteSummary,
    
    // Logs / Tokens
    requestLogs,
    clearAllUsageLogs,
    
    // Context Actions
    updateProvider,
    updateModel,
    updateApiKey,
  }
}
