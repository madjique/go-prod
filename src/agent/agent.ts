import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { jsonSchema, streamText, tool, type CoreMessage, type LanguageModelUsage } from 'ai'
import { addDays, format, parseISO } from 'date-fns'
import type { JSONSchema7 } from 'json-schema'
import { db } from '../db/database'
import type { AppSettings, Message, Task } from '../db/models'
import { agentTools } from './tools'
import { buildSystemPrompt } from './systemPrompt'

type ToolResultCallback = (toolName: string, result: unknown) => Promise<void> | void

interface RunAgentOptions {
  messages: CoreMessage[]
  settings: AppSettings
  memory: string
  userProfile: string
  onTextDelta?: (delta: string) => void
  onToolResult?: ToolResultCallback
  abortSignal?: AbortSignal
}

const modelCosts: Array<{ matcher: RegExp; ratePerThousand: number }> = [
  { matcher: /gpt-4o/i, ratePerThousand: 0.01 },
  { matcher: /claude/i, ratePerThousand: 0.012 },
  { matcher: /gemini/i, ratePerThousand: 0.004 },
]

const memoryPatterns = [
  {
    pattern: /my name is ([a-zA-Z][a-zA-Z -]+)/i,
    key: 'name',
    category: 'fact' as const,
    importance: 9,
  },
  {
    pattern: /i(?:'m| am) a[n]? ([^.! ,\n]+)/i,
    key: 'profile',
    category: 'context' as const,
    importance: 7,
  },
  {
    pattern: /i prefer ([^.! ,\n]+)/i,
    key: 'preference',
    category: 'preference' as const,
    importance: 8,
  },
  {
    pattern: /my goal is to ([^.! ,\n]+)/i,
    key: 'goal',
    category: 'goal' as const,
    importance: 8,
  },
  {
    pattern: /i(?:'m| am) working on ([^.! ,\n]+)/i,
    key: 'current-focus',
    category: 'goal' as const,
    importance: 7,
  },
]

function selectModel(settings: AppSettings) {
  switch (settings.aiProvider) {
    case 'google':
      return createGoogleGenerativeAI({ apiKey: settings.apiKey })(settings.aiModel)
    case 'anthropic':
      return createAnthropic({ apiKey: settings.apiKey })(settings.aiModel)
    case 'openai':
    default:
      return createOpenAI({ apiKey: settings.apiKey, compatibility: 'strict' })(settings.aiModel)
  }
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

function minutesToTime(value: number) {
  const hours = Math.floor(value / 60)
  const minutes = value % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

async function emitToolResult(
  onToolResult: ToolResultCallback | undefined,
  toolName: string,
  result: unknown,
) {
  await onToolResult?.(toolName, result)
  return result
}

function schema<T>(value: object) {
  return jsonSchema<T>(value as JSONSchema7)
}

async function listTasksBetween(startDate: string, endDate: string) {
  const tasks = await db.tasks
    .where('date')
    .between(startDate, endDate, true, true)
    .toArray()

  return tasks.sort((left, right) => {
    if ((left.timeStart ?? '') === (right.timeStart ?? '')) {
      return left.title.localeCompare(right.title)
    }

    return (left.timeStart ?? '99:99').localeCompare(right.timeStart ?? '99:99')
  })
}

function summarizeTasks(tasks: Task[]) {
  return {
    total: tasks.length,
    completed: tasks.filter((task) => task.isDone).length,
    remaining: tasks.filter((task) => !task.isDone).length,
    urgent: tasks.filter((task) => task.priority === 'urgent' && !task.isDone).map((task) => task.title),
  }
}

export function estimateCost(modelName: string, totalTokens: number) {
  const matched = modelCosts.find((entry) => entry.matcher.test(modelName))
  const rate = matched?.ratePerThousand ?? 0.005
  return Number(((totalTokens / 1000) * rate).toFixed(4))
}

export function extractMemoryCandidates(conversationText: string) {
  return memoryPatterns
    .map((entry) => {
      const match = conversationText.match(entry.pattern)
      if (!match?.[1]) {
        return null
      }

      return {
        key: entry.key,
        value: match[1].trim(),
        importance: entry.importance,
        category: entry.category,
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
}

export function buildConversationSummary(messages: Pick<Message, 'role' | 'content' | 'createdAt'>[]) {
  const userHighlights = messages
    .filter((message) => message.role === 'user')
    .slice(-3)
    .map((message) => message.content.trim())
    .filter(Boolean)
  const assistantHighlights = messages
    .filter((message) => message.role === 'assistant')
    .slice(-2)
    .map((message) => message.content.trim())
    .filter(Boolean)
  const summary = [
    userHighlights.length > 0 ? `User focus: ${userHighlights.join(' | ')}` : '',
    assistantHighlights.length > 0 ? `Assistant guidance: ${assistantHighlights.join(' | ')}` : '',
  ]
    .filter(Boolean)
    .join(' • ')
    .slice(0, 280)

  const first = messages[0]?.createdAt
  const last = messages.at(-1)?.createdAt
  const period = first && last ? `${first} → ${last}` : 'Current conversation'
  const originalChars = messages.reduce((total, message) => total + message.content.length, 0)
  const tokensSaved = Math.max(0, Math.round(originalChars / 4 - summary.length / 4))

  return {
    summary: summary || 'Conversation started.',
    period,
    tokensSaved,
  }
}

export async function runAgent({
  messages,
  settings,
  memory,
  userProfile,
  onTextDelta,
  onToolResult,
  abortSignal,
}: RunAgentOptions) {
  if (!settings.apiKey.trim()) {
    throw new Error('Please add your API key in Settings before using the AI assistant.')
  }

  const result = streamText({
    model: selectModel(settings),
    system: buildSystemPrompt(userProfile, memory, settings),
    messages,
    maxSteps: 5,
    abortSignal,
    tools: {
      getTasks: tool({
        description: agentTools.getTasks.description,
        parameters: schema<{ startDate: string; endDate?: string }>(agentTools.getTasks.parameters),
        execute: async ({ startDate, endDate }) => {
          const items = await listTasksBetween(startDate, endDate ?? startDate)
          return emitToolResult(onToolResult, 'getTasks', items)
        },
      }),
      createTask: tool({
        description: agentTools.createTask.description,
        parameters: schema<{
          title: string
          description?: string
          date: string
          timeStart?: string
          timeEnd?: string
          categoryId?: number
          priority?: Task['priority']
          color?: string
        }>(agentTools.createTask.parameters),
        execute: async ({ title, description, date, timeStart, timeEnd, categoryId, priority, color }) => {
          const firstCategory = await db.categories.orderBy('id').first()
          const timestamp = new Date().toISOString()
          const id = await db.tasks.add({
            title,
            description,
            date,
            timeStart,
            timeEnd,
            categoryId: categoryId ?? firstCategory?.id ?? 1,
            priority: priority ?? 'medium',
            color,
            isDone: false,
            createdAt: timestamp,
            updatedAt: timestamp,
          })
          const created = await db.tasks.get(id)
          return emitToolResult(onToolResult, 'createTask', created)
        },
      }),
      updateTask: tool({
        description: agentTools.updateTask.description,
        parameters: schema<{
          id: number
          title?: string
          description?: string
          date?: string
          timeStart?: string
          timeEnd?: string
          categoryId?: number
          priority?: Task['priority']
          color?: string
          isDone?: boolean
        }>(agentTools.updateTask.parameters),
        execute: async ({ id, ...updates }) => {
          await db.tasks.update(id, { ...updates, updatedAt: new Date().toISOString() })
          const task = await db.tasks.get(id)
          return emitToolResult(onToolResult, 'updateTask', task ?? { id, updated: false })
        },
      }),
      deleteTask: tool({
        description: agentTools.deleteTask.description,
        parameters: schema<{ id: number }>(agentTools.deleteTask.parameters),
        execute: async ({ id }) => {
          await db.tasks.delete(id)
          return emitToolResult(onToolResult, 'deleteTask', { id, deleted: true })
        },
      }),
      markTaskDone: tool({
        description: agentTools.markTaskDone.description,
        parameters: schema<{ id: number; isDone: boolean }>(agentTools.markTaskDone.parameters),
        execute: async ({ id, isDone }) => {
          await db.tasks.update(id, { isDone, updatedAt: new Date().toISOString() })
          const task = await db.tasks.get(id)
          return emitToolResult(onToolResult, 'markTaskDone', task ?? { id, isDone })
        },
      }),
      getSummary: tool({
        description: agentTools.getSummary.description,
        parameters: schema<{ period: 'day' | 'week' | 'month'; date: string }>(agentTools.getSummary.parameters),
        execute: async ({ period, date }) => {
          const start = parseISO(date)
          const endDate =
            period === 'day'
              ? date
              : period === 'week'
                ? format(addDays(start, 6), 'yyyy-MM-dd')
                : format(addDays(start, 30), 'yyyy-MM-dd')
          const tasks = await listTasksBetween(date, endDate)
          return emitToolResult(onToolResult, 'getSummary', {
            period,
            startDate: date,
            endDate,
            ...summarizeTasks(tasks),
          })
        },
      }),
      findFreeSlot: tool({
        description: agentTools.findFreeSlot.description,
        parameters: schema<{ date: string; durationMinutes: number }>(agentTools.findFreeSlot.parameters),
        execute: async ({ date, durationMinutes }) => {
          const scheduled = (await listTasksBetween(date, date))
            .filter((task) => task.timeStart && task.timeEnd)
            .map((task) => ({
              start: timeToMinutes(task.timeStart!),
              end: timeToMinutes(task.timeEnd!),
            }))
            .sort((left, right) => left.start - right.start)

          let cursor = settings.workStartHour * 60
          const boundary = settings.workEndHour * 60

          for (const slot of scheduled) {
            if (slot.start - cursor >= durationMinutes) {
              const resultSlot = {
                date,
                start: minutesToTime(cursor),
                end: minutesToTime(cursor + durationMinutes),
              }
              return emitToolResult(onToolResult, 'findFreeSlot', resultSlot)
            }
            cursor = Math.max(cursor, slot.end)
          }

          if (boundary - cursor >= durationMinutes) {
            const resultSlot = {
              date,
              start: minutesToTime(cursor),
              end: minutesToTime(cursor + durationMinutes),
            }
            return emitToolResult(onToolResult, 'findFreeSlot', resultSlot)
          }

          return emitToolResult(onToolResult, 'findFreeSlot', {
            date,
            start: null,
            end: null,
            message: 'No free slot found in work hours.',
          })
        },
      }),
      getMemory: tool({
        description: agentTools.getMemory.description,
        parameters: schema<{ query?: string }>(agentTools.getMemory.parameters),
        execute: async ({ query }) => {
          const items = await db.agentMemory.orderBy('importance').reverse().toArray()
          const filtered = query
            ? items.filter((item) =>
                `${item.key} ${item.value} ${item.category}`
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
            : items
          return emitToolResult(onToolResult, 'getMemory', filtered.slice(0, 8))
        },
      }),
      updateMemory: tool({
        description: agentTools.updateMemory.description,
        parameters: schema<{
          key: string
          value: string
          importance: number
          category: 'preference' | 'context' | 'goal' | 'fact'
        }>(agentTools.updateMemory.parameters),
        execute: async ({ key, value, importance, category }) => {
          const existing = await db.agentMemory.where('key').equals(key).first()
          const updatedAt = new Date().toISOString()

          if (existing?.id) {
            await db.agentMemory.update(existing.id, { value, importance, category, updatedAt })
            return emitToolResult(onToolResult, 'updateMemory', {
              id: existing.id,
              key,
              value,
              updated: true,
            })
          }

          const id = await db.agentMemory.add({ key, value, importance, category, updatedAt })
          return emitToolResult(onToolResult, 'updateMemory', { id, key, value, updated: false })
        },
      }),
    },
  })

  let streamed = ''
  for await (const delta of result.textStream) {
    streamed += delta
    onTextDelta?.(delta)
  }

  const [text, usage] = await Promise.all([result.text, result.usage])

  return {
    text: text || streamed,
    usage,
    cost: estimateCost(settings.aiModel, usage.totalTokens),
  }
}

export type AgentRunResult = Awaited<ReturnType<typeof runAgent>>
export type AgentUsage = LanguageModelUsage
