import { useCallback } from 'react'
import { format } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import type { Conversation, Message } from '../db/models'

function createConversationTitle() {
  return `Conversation ${format(new Date(), 'MMM d')}`
}

export function useConversations() {
  const conversations = useLiveQuery(
    () => db.conversations.orderBy('updatedAt').reverse().toArray(),
    [],
    [],
  )
  const messages = useLiveQuery(() => db.messages.orderBy('createdAt').toArray(), [], [])

  const createConversation = useCallback(async () => {
    const timestamp = new Date().toISOString()
    return db.conversations.add({
      title: createConversationTitle(),
      createdAt: timestamp,
      updatedAt: timestamp,
      summary: '',
    })
  }, [])

  const getMessages = useCallback(
    (conversationId: number) =>
      messages
        .filter((message) => message.conversationId === conversationId)
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
    [messages],
  )

  const addMessage = useCallback(async (message: Omit<Message, 'id'>) => {
    const messageId = await db.messages.add(message)
    await db.conversations.update(message.conversationId, {
      updatedAt: message.createdAt,
    })
    return messageId
  }, [])

  const updateConversation = useCallback(
    async (id: number, data: Partial<Omit<Conversation, 'id'>>) => {
      await db.conversations.update(id, data)
    },
    [],
  )

  const deleteConversation = useCallback(async (id: number) => {
    await db.transaction('rw', db.conversations, db.messages, db.agentSummaries, async () => {
      await db.messages.where('conversationId').equals(id).delete()
      await db.agentSummaries.where('conversationId').equals(id).delete()
      await db.conversations.delete(id)
    })
  }, [])

  return {
    conversations,
    messages,
    createConversation,
    getMessages,
    addMessage,
    updateConversation,
    deleteConversation,
  }
}
