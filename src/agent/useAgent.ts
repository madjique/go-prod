import { useCallback, useState } from 'react'
import type { CoreMessage } from 'ai'
import { db } from '../db/database'
import type { Message } from '../db/models'
import { runAgent, buildConversationSummary, extractMemoryCandidates } from './agent'

interface UseAgentOptions {
  conversationId: number | null
}

function getMessageId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function buildTitleFromMessage(content: string) {
  return content.trim().split(/\s+/).slice(0, 6).join(' ').slice(0, 48) || 'New conversation'
}

function toCoreMessages(messages: Message[]): CoreMessage[] {
  return messages
    .filter((message) => message.role !== 'tool')
    .map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: message.content,
    }))
}

export function useAgent({ conversationId }: UseAgentOptions) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversationId || !content.trim()) {
        return
      }

      setIsStreaming(true)
      setStreamingText('')
      setError(null)

      const createdAt = new Date().toISOString()
      await db.messages.add({
        conversationId,
        role: 'user',
        content: content.trim(),
        createdAt,
      })

      const conversation = await db.conversations.get(conversationId)
      if (conversation?.title.startsWith('Conversation ')) {
        await db.conversations.update(conversationId, {
          title: buildTitleFromMessage(content),
          updatedAt: createdAt,
        })
      }

      const settings = await db.settings.orderBy('id').first()
      const memory = await db.agentMemory.orderBy('importance').reverse().toArray()
      const allMessages = await db.messages
        .where('conversationId')
        .equals(conversationId)
        .sortBy('createdAt')

      if (!settings) {
        setIsStreaming(false)
        setError('Settings are still loading.')
        return
      }

      const toolMessages: Omit<Message, 'id'>[] = []

      try {
        const result = await runAgent({
          messages: toCoreMessages(allMessages),
          settings,
          memory:
            memory.length > 0
              ? memory.map((item) => `- [${item.category}] ${item.key}: ${item.value}`).join('\n')
              : 'No saved user memory yet.',
          userProfile: settings.userProfile || 'A professional looking to improve productivity',
          onTextDelta: (delta) => {
            setStreamingText((current) => current + delta)
          },
          onToolResult: async (toolName, resultValue) => {
            toolMessages.push({
              conversationId,
              role: 'tool',
              content: JSON.stringify(resultValue, null, 2),
              toolName,
              toolCallId: getMessageId(),
              createdAt: new Date().toISOString(),
            })
          },
        })

        if (toolMessages.length > 0) {
          await db.messages.bulkAdd(toolMessages)
        }

        const assistantCreatedAt = new Date().toISOString()
        await db.messages.add({
          conversationId,
          role: 'assistant',
          content: result.text.trim() || 'I could not generate a response.',
          createdAt: assistantCreatedAt,
          tokenCount: result.usage.totalTokens,
          cost: result.cost,
        })

        const updatedMessages = await db.messages
          .where('conversationId')
          .equals(conversationId)
          .sortBy('createdAt')

        const summary = buildConversationSummary(updatedMessages)
        await db.agentSummaries.where('conversationId').equals(conversationId).delete()
        await db.agentSummaries.add({
          conversationId,
          summary: summary.summary,
          period: summary.period,
          tokensSaved: summary.tokensSaved,
          createdAt: assistantCreatedAt,
        })

        const extracted = extractMemoryCandidates(`${content}
${result.text}`)
        for (const item of extracted) {
          const existing = await db.agentMemory.where('key').equals(item.key).first()
          const updatedAt = new Date().toISOString()

          if (existing?.id) {
            await db.agentMemory.update(existing.id, {
              value: item.value,
              importance: item.importance,
              category: item.category,
              updatedAt,
            })
          } else {
            await db.agentMemory.add({
              ...item,
              updatedAt,
            })
          }
        }

        await db.conversations.update(conversationId, {
          updatedAt: assistantCreatedAt,
          summary: summary.summary,
        })
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : 'Unable to reach the AI provider.'
        setError(message)
        await db.messages.add({
          conversationId,
          role: 'assistant',
          content: message,
          createdAt: new Date().toISOString(),
        })
      } finally {
        setStreamingText('')
        setIsStreaming(false)
      }
    },
    [conversationId],
  )

  return {
    sendMessage,
    isStreaming,
    streamingText,
    error,
  }
}
