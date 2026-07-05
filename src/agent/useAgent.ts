import { useCallback } from 'react'
import type { CoreMessage } from 'ai'
import { db } from '../db/database'
import type { Message } from '../db/models'
import { runAgent, buildConversationSummary, extractMemoryCandidates } from './agent'
import { useAppStore } from '../store/useAppStore'

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
  const isStreaming = useAppStore((state) => state.chatIsStreaming)
  const setIsStreaming = useAppStore((state) => state.setChatIsStreaming)
  const streamingText = useAppStore((state) => state.chatStreamingText)
  const setStreamingText = useAppStore((state) => state.setChatStreamingText)
  const error = useAppStore((state) => state.chatError)
  const setError = useAppStore((state) => state.setChatError)

  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversationId || !content.trim()) {
        return
      }

      console.log('[useAgent] sendMessage triggered with content:', content)
      setIsStreaming(true)
      setStreamingText('')
      setError(null)

      const createdAt = new Date().toISOString()
      console.log('[useAgent] adding user message to db')
      await db.messages.add({
        conversationId,
        role: 'user',
        content: content.trim(),
        createdAt,
      })
      console.log('[useAgent] user message added to db')

      const conversation = await db.conversations.get(conversationId)
      if (conversation?.title.startsWith('Conversation ')) {
        await db.conversations.update(conversationId, {
          title: buildTitleFromMessage(content),
          updatedAt: createdAt,
        })
      }

      console.log('[useAgent] fetching settings, memory, and allMessages')
      const settings = await db.settings.orderBy('id').first()
      const memory = await db.agentMemory.orderBy('importance').reverse().toArray()
      const allMessages = await db.messages
        .where('conversationId')
        .equals(conversationId)
        .sortBy('createdAt')

      if (!settings) {
        console.warn('[useAgent] settings not found')
        setIsStreaming(false)
        setError('Settings are still loading.')
        return
      }
      console.log('[useAgent] settings loaded, provider:', settings.aiProvider, 'model:', settings.aiModel)

      const toolMessages: Omit<Message, 'id'>[] = []

      try {
        console.log('[useAgent] calling runAgent')
        const result = await runAgent({
          messages: toCoreMessages(allMessages),
          settings,
          memory:
            memory.length > 0
              ? memory.map((item) => `- [${item.category}] ${item.key}: ${item.value}`).join('\n')
              : 'No saved user memory yet.',
          userProfile: settings.userProfile || 'A professional looking to improve productivity',
          onTextDelta: (delta) => {
            console.log('[useAgent] text delta:', delta)
            setStreamingText((current) => current + delta)
          },
          onToolResult: async (toolName, resultValue) => {
            console.log('[useAgent] tool result:', toolName, resultValue)
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
        console.log('[useAgent] runAgent completed successfully, result:', result)

        if (toolMessages.length > 0) {
          console.log('[useAgent] saving tool messages:', toolMessages.length)
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
        console.log('[useAgent] saved assistant message to db')

        const updatedMessages = await db.messages
          .where('conversationId')
          .equals(conversationId)
          .sortBy('createdAt')

        console.log('[useAgent] building conversation summary')
        const summary = buildConversationSummary(updatedMessages)
        await db.agentSummaries.where('conversationId').equals(conversationId).delete()
        await db.agentSummaries.add({
          conversationId,
          summary: summary.summary,
          period: summary.period,
          tokensSaved: summary.tokensSaved,
          createdAt: assistantCreatedAt,
        })

        console.log('[useAgent] extracting memory candidates')
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
        console.log('[useAgent] conversation updated')
      } catch (caughtError) {
        console.error('[useAgent] Error caught in sendMessage:', caughtError)
        const message = caughtError instanceof Error ? caughtError.message : 'Unable to reach the AI provider.'
        setError(message)
        await db.messages.add({
          conversationId,
          role: 'assistant',
          content: message,
          createdAt: new Date().toISOString(),
        })
      } finally {
        console.log('[useAgent] sendMessage finally block')
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
