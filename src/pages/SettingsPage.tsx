import { useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { aiModelOptions } from '../agent/modelOptions'
import { db } from '../db/database'
import type { AppSettings } from '../db/models'
import { GlassButton } from '../components/ui/GlassButton'
import { GlassCard } from '../components/ui/GlassCard'
import { useAgentMemory } from '../hooks/useAgentMemory'
import { useCategories } from '../hooks/useCategories'
import { useSettingsContext } from '../context/SettingsContext'

export function SettingsPage() {
  const {
    settings,
    updateTheme,
    updateProvider,
    updateModel,
    updateApiKey,
    updateCalendarAccess,
    setOnboardingState,
    updateSettings,
  } = useSettingsContext()
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories()
  const { memory, clearAllMemory } = useAgentMemory()
  const summaries = useLiveQuery(
    () => db.agentSummaries.orderBy('createdAt').reverse().toArray(),
    [],
    [],
  )
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState('#6366f1')
  const availableModels = useMemo(
    () => aiModelOptions[settings?.aiProvider ?? 'openai'],
    [settings?.aiProvider],
  )

  if (!settings) {
    return <GlassCard>Loading settings...</GlassCard>
  }

  const handleExport = async () => {
    const data = {
      tasks: await db.tasks.toArray(),
      categories: await db.categories.toArray(),
      conversations: await db.conversations.toArray(),
      messages: await db.messages.toArray(),
      agentMemory: await db.agentMemory.toArray(),
      agentSummaries: await db.agentSummaries.toArray(),
      settings: await db.settings.toArray(),
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'go-prod-export.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const text = await file.text()
    const data = JSON.parse(text) as Record<string, unknown>

    await db.transaction(
      'rw',
      [db.tasks, db.categories, db.conversations, db.messages, db.agentMemory, db.agentSummaries, db.settings],
      async () => {
        await Promise.all([
          db.tasks.clear(),
          db.categories.clear(),
          db.conversations.clear(),
          db.messages.clear(),
          db.agentMemory.clear(),
          db.agentSummaries.clear(),
          db.settings.clear(),
        ])

        if (Array.isArray(data.tasks) && data.tasks.length > 0) await db.tasks.bulkAdd(data.tasks as never[])
        if (Array.isArray(data.categories) && data.categories.length > 0) await db.categories.bulkAdd(data.categories as never[])
        if (Array.isArray(data.conversations) && data.conversations.length > 0) await db.conversations.bulkAdd(data.conversations as never[])
        if (Array.isArray(data.messages) && data.messages.length > 0) await db.messages.bulkAdd(data.messages as never[])
        if (Array.isArray(data.agentMemory) && data.agentMemory.length > 0) await db.agentMemory.bulkAdd(data.agentMemory as never[])
        if (Array.isArray(data.agentSummaries) && data.agentSummaries.length > 0) await db.agentSummaries.bulkAdd(data.agentSummaries as never[])
        if (Array.isArray(data.settings) && data.settings.length > 0) await db.settings.bulkAdd(data.settings as never[])
      },
    )

    event.target.value = ''
  }

  return (
    <div className="space-y-4">
      <GlassCard className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Theme</h2>
          <p className="text-sm text-slate-500 dark:text-slate-300">Choose how Go Prod should look.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['light', 'dark', 'system'] as const).map((option) => (
            <GlassButton
              key={option}
              variant={settings.theme === option ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => void updateTheme(option)}
            >
              {option}
            </GlassButton>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">AI provider</h2>
          <p className="text-sm text-slate-500 dark:text-slate-300">Connect your preferred model provider.</p>
        </div>
        <select
          value={settings.aiProvider}
          onChange={(event) => void updateProvider(event.target.value as AppSettings['aiProvider'])}
          className="glass-soft h-12 w-full rounded-2xl px-4 text-sm text-slate-900 dark:text-white"
        >
          <option value="openai">OpenAI</option>
          <option value="google">Google</option>
          <option value="anthropic">Anthropic</option>
        </select>
        <select
          value={settings.aiModel}
          onChange={(event) => void updateModel(event.target.value)}
          className="glass-soft h-12 w-full rounded-2xl px-4 text-sm text-slate-900 dark:text-white"
        >
          {availableModels.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
        <input
          type="password"
          value={settings.apiKey}
          placeholder="API key"
          onChange={(event) => void updateApiKey(event.target.value)}
          className="glass-soft h-12 w-full rounded-2xl px-4 text-sm text-slate-900 dark:text-white"
        />
      </GlassCard>

      <GlassCard className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Planner settings</h2>
          <p className="text-sm text-slate-500 dark:text-slate-300">Work hours, sleep, and calendar access.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-2 text-sm">
            <span className="text-slate-600 dark:text-slate-200">Work start</span>
            <input
              type="number"
              min={0}
              max={23}
              value={settings.workStartHour}
              onChange={(event) => void updateSettings({ workStartHour: Number(event.target.value) })}
              className="glass-soft h-12 w-full rounded-2xl px-4 text-slate-900 dark:text-white"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-slate-600 dark:text-slate-200">Work end</span>
            <input
              type="number"
              min={0}
              max={23}
              value={settings.workEndHour}
              onChange={(event) => void updateSettings({ workEndHour: Number(event.target.value) })}
              className="glass-soft h-12 w-full rounded-2xl px-4 text-slate-900 dark:text-white"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-slate-600 dark:text-slate-200">Sleep start</span>
            <input
              type="number"
              min={0}
              max={23}
              value={settings.sleepStartHour}
              onChange={(event) => void updateSettings({ sleepStartHour: Number(event.target.value) })}
              className="glass-soft h-12 w-full rounded-2xl px-4 text-slate-900 dark:text-white"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-slate-600 dark:text-slate-200">Sleep end</span>
            <input
              type="number"
              min={0}
              max={23}
              value={settings.sleepEndHour}
              onChange={(event) => void updateSettings({ sleepEndHour: Number(event.target.value) })}
              className="glass-soft h-12 w-full rounded-2xl px-4 text-slate-900 dark:text-white"
            />
          </label>
        </div>
        <label className="flex items-center justify-between gap-3 rounded-2xl bg-white/40 px-4 py-3 dark:bg-white/5">
          <span className="text-sm text-slate-700 dark:text-slate-100">Calendar access</span>
          <input
            type="checkbox"
            checked={settings.calendarAccess}
            onChange={(event) => void updateCalendarAccess(event.target.checked)}
            className="size-5 rounded border-slate-300 text-primary"
          />
        </label>
      </GlassCard>

      <GlassCard className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Categories</h2>
          <p className="text-sm text-slate-500 dark:text-slate-300">Create and manage task categories.</p>
        </div>
        <div className="grid grid-cols-[1fr_auto_auto] gap-3">
          <input
            value={newCategoryName}
            onChange={(event) => setNewCategoryName(event.target.value)}
            placeholder="New category"
            className="glass-soft h-12 rounded-2xl px-4 text-sm text-slate-900 dark:text-white"
          />
          <input
            type="color"
            value={newCategoryColor}
            onChange={(event) => setNewCategoryColor(event.target.value)}
            className="glass-soft h-12 w-16 rounded-2xl px-2"
          />
          <GlassButton
            size="sm"
            onClick={async () => {
              if (!newCategoryName.trim()) return
              await addCategory({ name: newCategoryName.trim(), color: newCategoryColor })
              setNewCategoryName('')
            }}
          >
            Add
          </GlassButton>
        </div>
        <div className="space-y-3">
          {categories.map((category) => (
            <div key={category.id} className="grid grid-cols-[1fr_auto_auto] gap-3">
              <input
                value={category.name}
                onChange={(event) => void updateCategory(category.id!, { name: event.target.value })}
                className="glass-soft h-12 rounded-2xl px-4 text-sm text-slate-900 dark:text-white"
              />
              <input
                type="color"
                value={category.color}
                onChange={(event) => void updateCategory(category.id!, { color: event.target.value })}
                className="glass-soft h-12 w-16 rounded-2xl px-2"
              />
              <GlassButton variant="danger" size="sm" onClick={() => void deleteCategory(category.id!)}>
                Remove
              </GlassButton>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Import / export</h2>
        <div className="flex flex-wrap gap-3">
          <GlassButton variant="ghost" onClick={handleExport}>Export JSON</GlassButton>
          <GlassButton variant="ghost" onClick={() => fileInputRef.current?.click()}>Import JSON</GlassButton>
          <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={handleImport} />
        </div>
      </GlassCard>

      <GlassCard className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Agent memory</h2>
            <p className="text-sm text-slate-500 dark:text-slate-300">Saved user context for coaching.</p>
          </div>
          <GlassButton variant="ghost" size="sm" onClick={() => void clearAllMemory()}>
            Clear memory
          </GlassButton>
        </div>
        <div className="space-y-2">
          {memory.map((item) => (
            <div key={item.id} className="rounded-2xl bg-white/45 px-4 py-3 text-sm dark:bg-white/5">
              <div className="font-medium text-slate-900 dark:text-white">{item.key}</div>
              <div className="text-slate-500 dark:text-slate-300">{item.value}</div>
            </div>
          ))}
          {memory.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-300">No stored memory yet.</p> : null}
        </div>
      </GlassCard>

      <GlassCard className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Agent summaries</h2>
        <div className="space-y-2">
          {summaries.map((summary) => (
            <div key={summary.id} className="rounded-2xl bg-white/45 px-4 py-3 text-sm dark:bg-white/5">
              <div className="font-medium text-slate-900 dark:text-white">{summary.summary}</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                {summary.period} • ~{summary.tokensSaved} tokens saved
              </div>
            </div>
          ))}
          {summaries.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-300">No summaries yet.</p> : null}
        </div>
      </GlassCard>

      <GlassCard className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Onboarding</h2>
        <p className="text-sm text-slate-500 dark:text-slate-300">Restart onboarding if you want to reconfigure the app.</p>
        <GlassButton variant="secondary" onClick={() => void setOnboardingState(false)}>
          Reset onboarding
        </GlassButton>
      </GlassCard>
    </div>
  )
}
