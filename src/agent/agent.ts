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
import { GoogleGenAI } from '@google/genai'

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
}: RunAgentOptions): Promise<any> {
  if (!settings.apiKey.trim()) {
    throw new Error('Please add your API key in Settings before using the AI assistant.')
  }

  if (settings.aiProvider === 'google') {
    return runGoogleGenAIAgent({ messages, settings, memory, userProfile, onTextDelta, onToolResult, abortSignal })
  }

  try {
    const result = streamText({
      model: selectModel(settings),
      system: buildSystemPrompt(userProfile, memory, settings),
      messages,
      maxSteps: 5,
      maxRetries: 0, // Fail fast on rate limits, CORS, or quota errors instead of hanging/retrying
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
          const tasksScheduled = (await listTasksBetween(date, date))
            .filter((task) => task.timeStart && task.timeEnd)
            .map((task) => ({
              start: timeToMinutes(task.timeStart!),
              end: timeToMinutes(task.timeEnd!),
            }))

          const calEvents = await db.calendarEvents.where('date').equals(date).toArray()
          const calScheduled = calEvents
            .filter((e) => e.timeStart && e.timeEnd)
            .map((e) => ({
              start: timeToMinutes(e.timeStart!),
              end: timeToMinutes(e.timeEnd!),
            }))

          const scheduled = [...tasksScheduled, ...calScheduled]
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
      getCategories: tool({
        description: agentTools.getCategories.description,
        parameters: schema<Record<string, never>>(agentTools.getCategories.parameters),
        execute: async () => {
          const categories = await db.categories.toArray()
          return emitToolResult(onToolResult, 'getCategories', categories)
        },
      }),
      createCategory: tool({
        description: agentTools.createCategory.description,
        parameters: schema<{ name: string; color: string; icon?: string }>(agentTools.createCategory.parameters),
        execute: async ({ name, color, icon }) => {
          const id = await db.categories.add({ name, color, icon })
          const created = await db.categories.get(id)
          return emitToolResult(onToolResult, 'createCategory', created)
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
  try {
    for await (const delta of result.textStream) {
      streamed += delta
      onTextDelta?.(delta)
    }
  } catch (streamError) {
    console.error('[runAgent] Stream iteration error:', streamError)
    if (!streamed) throw streamError
  }

  const [text, usage] = await Promise.all([
    result.text.catch((e) => {
      console.error('[runAgent] result.text failed:', e)
      return streamed
    }),
    result.usage.catch((e) => {
      console.error('[runAgent] result.usage failed:', e)
      return { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
    }),
  ])

  return {
    text: text || streamed,
    usage,
    cost: estimateCost(settings.aiModel, usage.totalTokens),
  }
} catch (outerError) {
  console.error('[runAgent] Outer execution error:', outerError)
  throw outerError
}
}

export type AgentRunResult = {
  text: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  cost: number
}
export type AgentUsage = LanguageModelUsage

const localTools: Record<string, (args: any) => Promise<any>> = {
  getTasks: async ({ startDate, endDate }) => {
    return listTasksBetween(startDate, endDate ?? startDate)
  },
  createTask: async ({ title, description, date, timeStart, timeEnd, categoryId, priority, color }) => {
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
    return db.tasks.get(id)
  },
  updateTask: async ({ id, ...updates }) => {
    await db.tasks.update(id, { ...updates, updatedAt: new Date().toISOString() })
    return db.tasks.get(id)
  },
  deleteTask: async ({ id }) => {
    await db.tasks.delete(id)
    return { id, deleted: true }
  },
  markTaskDone: async ({ id, isDone }) => {
    await db.tasks.update(id, { isDone, updatedAt: new Date().toISOString() })
    return db.tasks.get(id)
  },
  getSummary: async ({ period, date }) => {
    const start = parseISO(date)
    const endDate =
      period === 'day'
        ? date
        : period === 'week'
          ? format(addDays(start, 6), 'yyyy-MM-dd')
          : format(addDays(start, 30), 'yyyy-MM-dd')
    const tasks = await listTasksBetween(date, endDate)
    return {
      period,
      startDate: date,
      endDate,
      ...summarizeTasks(tasks),
    }
  },
  findFreeSlot: async ({ date, durationMinutes }) => {
    const dbSettings = await db.settings.orderBy('id').first()
    const workStart = dbSettings?.workStartHour ?? 9
    const workEnd = dbSettings?.workEndHour ?? 17

    const tasksScheduled = (await listTasksBetween(date, date))
      .filter((task) => task.timeStart && task.timeEnd)
      .map((task) => ({
        start: timeToMinutes(task.timeStart!),
        end: timeToMinutes(task.timeEnd!),
      }))

    const calEvents = await db.calendarEvents.where('date').equals(date).toArray()
    const calScheduled = calEvents
      .filter((e) => e.timeStart && e.timeEnd)
      .map((e) => ({
        start: timeToMinutes(e.timeStart!),
        end: timeToMinutes(e.timeEnd!),
      }))

    const scheduled = [...tasksScheduled, ...calScheduled]
      .sort((left, right) => left.start - right.start)

    let cursor = workStart * 60
    const boundary = workEnd * 60

    for (const slot of scheduled) {
      if (slot.start - cursor >= durationMinutes) {
        return {
          date,
          start: minutesToTime(cursor),
          end: minutesToTime(cursor + durationMinutes),
        }
      }
      cursor = Math.max(cursor, slot.end)
    }

    if (boundary - cursor >= durationMinutes) {
      return {
        date,
        start: minutesToTime(cursor),
        end: minutesToTime(cursor + durationMinutes),
      }
    }

    return {
      date,
      start: null,
      end: null,
      message: 'No free slot found in work hours.',
    }
  },
  getCategories: async () => {
    return db.categories.toArray()
  },
  createCategory: async ({ name, color, icon }: { name: string; color: string; icon?: string }) => {
    const id = await db.categories.add({ name, color, icon })
    return db.categories.get(id)
  },
  getMemory: async ({ query }) => {
    const items = await db.agentMemory.orderBy('importance').reverse().toArray()
    const filtered = query
      ? items.filter((item) =>
          `${item.key} ${item.value} ${item.category}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
      : items
    return filtered.slice(0, 8)
  },
  updateMemory: async ({ key, value, importance, category }) => {
    const existing = await db.agentMemory.where('key').equals(key).first()
    const updatedAt = new Date().toISOString()

    if (existing?.id) {
      await db.agentMemory.update(existing.id, { value, importance, category, updatedAt })
      return { id: existing.id, key, value, updated: true }
    }

    const id = await db.agentMemory.add({ key, value, importance, category, updatedAt })
    return { id, key, value, updated: false }
  },
}

async function runGoogleGenAIAgent({
  messages,
  settings,
  memory,
  userProfile,
  onTextDelta,
  onToolResult,
  abortSignal,
}: RunAgentOptions): Promise<AgentRunResult> {
  const client = new GoogleGenAI({ apiKey: settings.apiKey })
  
  const contents: any[] = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content as string }],
  }))

  let currentStep = 0
  const maxSteps = 5
  let finalResponseText = ''
  let finalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 }

  while (currentStep < maxSteps) {
    if (abortSignal?.aborted) {
      throw new Error('Agent execution aborted.')
    }

    currentStep++

    const config: any = {
      systemInstruction: buildSystemPrompt(userProfile, memory, settings),
      tools: [
        {
          functionDeclarations: Object.entries(agentTools).map(([name, tool]) => ({
            name,
            description: tool.description,
            parameters: tool.parameters,
          }))
        }
      ],
      temperature: 1,
      maxOutputTokens: 65536,
      topP: 0.95,
    }

    // Configure thinking/reasoning for Gemini 3 and 2.5
    if (settings.aiModel.includes('gemini-3')) {
      config.thinkingConfig = {
        thinkingLevel: 'high'
      }
    } else if (settings.aiModel.includes('gemini-2.5')) {
      config.thinkingConfig = {
        thinkingBudget: -1 // Dynamic thinking budget
      }
    }

    console.log(`[GoogleGenAI] Calling model ${settings.aiModel}, step ${currentStep}`)
    const responseStream = await client.models.generateContentStream({
      model: settings.aiModel,
      contents,
      config,
    })

    let stepText = ''
    let stepFunctionCalls: any[] = []
    const stepParts: any[] = []

    for await (const chunk of responseStream) {
      if (chunk.candidates?.[0]?.content?.parts) {
        stepParts.push(...chunk.candidates[0].content.parts)
      }
      if (chunk.functionCalls) {
        stepFunctionCalls.push(...chunk.functionCalls)
      }
      if (chunk.text) {
        stepText += chunk.text
        onTextDelta?.(chunk.text)
      }
      if (chunk.usageMetadata) {
        finalUsage = {
          promptTokens: chunk.usageMetadata.promptTokenCount || finalUsage.promptTokens,
          completionTokens: chunk.usageMetadata.candidatesTokenCount || finalUsage.completionTokens,
          totalTokens: chunk.usageMetadata.totalTokenCount || finalUsage.totalTokens,
        }
      }
    }

    if (stepFunctionCalls.length > 0) {
      console.log(`[GoogleGenAI] Step ${currentStep} generated function calls:`, stepFunctionCalls)
      
      contents.push({
        role: 'model',
        parts: stepParts,
      })

      const toolResultsParts: any[] = []
      for (const call of stepFunctionCalls) {
        const { name, args } = call
        const executor = localTools[name]
        if (executor) {
          try {
            console.log(`[GoogleGenAI] Executing tool ${name} with args:`, args)
            const resultVal = await executor(args)
            await onToolResult?.(name, resultVal)
            
            toolResultsParts.push({
              functionResponse: {
                name,
                response: { result: resultVal }
              }
            })
          } catch (err) {
            console.error(`[GoogleGenAI] Tool execution error for ${name}:`, err)
            toolResultsParts.push({
              functionResponse: {
                name,
                response: { error: err instanceof Error ? err.message : String(err) }
              }
            })
          }
        }
      }

      contents.push({
        role: 'user',
        parts: toolResultsParts,
      })
    } else {
      finalResponseText = stepText
      break
    }
  }

  if (finalUsage.totalTokens === 0) {
    const chars = finalResponseText.length
    finalUsage = {
      promptTokens: 0,
      completionTokens: Math.round(chars / 4),
      totalTokens: Math.round(chars / 4),
    }
  }

  return {
    text: finalResponseText,
    usage: {
      promptTokens: finalUsage.promptTokens,
      completionTokens: finalUsage.completionTokens,
      totalTokens: finalUsage.totalTokens,
    },
    cost: estimateCost(settings.aiModel, finalUsage.totalTokens),
  }
}
