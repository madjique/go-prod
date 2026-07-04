import Dexie, { type Table } from 'dexie'
import type {
  AgentMemory,
  AgentSummary,
  AppSettings,
  Category,
  Conversation,
  Message,
  Task,
} from './models'

export class GoProdDB extends Dexie {
  tasks!: Table<Task>
  categories!: Table<Category>
  conversations!: Table<Conversation>
  messages!: Table<Message>
  agentMemory!: Table<AgentMemory>
  agentSummaries!: Table<AgentSummary>
  settings!: Table<AppSettings>

  constructor() {
    super('GoProdDB')
    this.version(1).stores({
      tasks: '++id, date, categoryId, priority, isDone, createdAt',
      categories: '++id, name',
      conversations: '++id, createdAt, updatedAt',
      messages: '++id, conversationId, role, createdAt',
      agentMemory: '++id, key, importance, category',
      agentSummaries: '++id, conversationId, createdAt',
      settings: '++id',
    })
  }
}

export const db = new GoProdDB()

export async function seedDefaultData() {
  const count = await db.categories.count()
  if (count === 0) {
    await db.categories.bulkAdd([
      { name: 'Work', color: '#6366f1' },
      { name: 'Personal', color: '#8b5cf6' },
      { name: 'Health', color: '#10b981' },
      { name: 'Learning', color: '#f59e0b' },
      { name: 'Social', color: '#ec4899' },
      { name: 'Admin', color: '#6b7280' },
    ])
  }

  const settingsCount = await db.settings.count()
  if (settingsCount === 0) {
    await db.settings.add({
      theme: 'system',
      aiProvider: 'openai',
      aiModel: 'gpt-4o',
      apiKey: '',
      workStartHour: 9,
      workEndHour: 17,
      sleepStartHour: 23,
      sleepEndHour: 7,
      onboardingCompleted: false,
      calendarAccess: false,
    })
  }
}
