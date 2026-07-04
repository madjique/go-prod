import { History, Plus, Send } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { GlassButton } from '../components/ui/GlassButton'
import { GlassCard } from '../components/ui/GlassCard'
import { Modal } from '../components/ui/Modal'
import { useConversations } from '../hooks/useConversations'
import { useSettings } from '../hooks/useSettings'
import { useAppStore } from '../store/useAppStore'
import { useAgent } from '../agent/useAgent'

export function ChatPage() {
  const activeConversationId = useAppStore((state) => state.activeConversationId)
  const setActiveConversationId = useAppStore((state) => state.setActiveConversationId)
  const { conversations, createConversation, getMessages, deleteConversation } = useConversations()
  const { settings } = useSettings()
  const { sendMessage, isStreaming, streamingText, error } = useAgent({
    conversationId: activeConversationId,
  })
  const [input, setInput] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      setActiveConversationId(conversations[0].id ?? null)
      return
    }

    if (!activeConversationId && conversations.length === 0) {
      void createConversation().then((id) => setActiveConversationId(id))
    }
  }, [activeConversationId, conversations, createConversation, setActiveConversationId])

  const messages = useMemo(
    () => (activeConversationId ? getMessages(activeConversationId) : []),
    [activeConversationId, getMessages],
  )

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-3">
        <GlassButton
          variant="ghost"
          size="icon"
          onClick={() => {
            void createConversation().then((id) => {
              setActiveConversationId(id)
              setHistoryOpen(false)
            })
          }}
        >
          <Plus className="size-5" />
        </GlassButton>
        <GlassButton variant="ghost" size="icon" onClick={() => setHistoryOpen(true)}>
          <History className="size-5" />
        </GlassButton>
      </div>

      {!settings?.apiKey ? (
        <GlassCard className="text-sm text-slate-600 dark:text-slate-200">
          Add an AI provider and API key in Settings to start chatting with your coach.
        </GlassCard>
      ) : null}

      <GlassCard className="flex min-h-[60vh] flex-col gap-4 p-0">
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <div className="text-sm text-slate-500 dark:text-slate-300">Ask for planning help, summaries, or task creation.</div>
          ) : null}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[85%] rounded-[24px] px-4 py-3 text-sm ${
                message.role === 'user'
                  ? 'ml-auto bg-primary text-white'
                  : message.role === 'assistant'
                    ? 'glass-soft text-slate-700 dark:text-slate-100'
                    : 'glass-soft border border-dashed text-xs text-slate-500 dark:text-slate-300'
              }`}
            >
              {message.role === 'tool' && message.toolName ? (
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em]">{message.toolName}</div>
              ) : null}
              <div className="whitespace-pre-wrap">{message.content}</div>
            </div>
          ))}
          {isStreaming && streamingText ? (
            <div className="glass-soft max-w-[85%] rounded-[24px] px-4 py-3 text-sm text-slate-700 dark:text-slate-100">
              {streamingText}
            </div>
          ) : null}
          {error ? <div className="text-sm text-red-500">{error}</div> : null}
          <div ref={endRef} />
        </div>
        <form
          className="border-t border-white/20 px-4 py-4"
          onSubmit={(event) => {
            event.preventDefault()
            const value = input.trim()
            if (!value || isStreaming) {
              return
            }
            setInput('')
            void sendMessage(value)
          }}
        >
          <div className="flex items-center gap-3">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Plan my afternoon, summarize today, find focus time..."
              className="glass-soft h-12 flex-1 rounded-2xl px-4 text-sm text-slate-900 dark:text-white"
            />
            <GlassButton size="icon" type="submit" disabled={isStreaming || !input.trim()}>
              <Send className="size-5" />
            </GlassButton>
          </div>
        </form>
      </GlassCard>

      <Modal isOpen={historyOpen} onClose={() => setHistoryOpen(false)} title="Conversation history">
        <div className="space-y-3">
          {conversations.map((conversation) => (
            <GlassCard key={conversation.id} className="flex items-center justify-between gap-3">
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => {
                  setActiveConversationId(conversation.id ?? null)
                  setHistoryOpen(false)
                }}
              >
                <p className="truncate font-medium text-slate-900 dark:text-white">{conversation.title}</p>
                {conversation.summary ? (
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-300">{conversation.summary}</p>
                ) : null}
              </button>
              <GlassButton
                variant="ghost"
                size="sm"
                onClick={async () => {
                  if (conversation.id) {
                    await deleteConversation(conversation.id)
                    if (conversation.id === activeConversationId) {
                      setActiveConversationId(null)
                    }
                  }
                }}
              >
                Delete
              </GlassButton>
            </GlassCard>
          ))}
        </div>
      </Modal>
    </div>
  )
}
