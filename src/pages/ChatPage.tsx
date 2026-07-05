import { History, Mic, MicOff, Plus, Send } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { GlassButton } from '../components/ui/GlassButton'
import { GlassCard } from '../components/ui/GlassCard'
import { Modal } from '../components/ui/Modal'
import { TaskCard } from '../components/ui/TaskCard'
import { useConversations } from '../hooks/useConversations'
import { useSettings } from '../hooks/useSettings'
import { useAppStore } from '../store/useAppStore'
import { useAgent } from '../agent/useAgent'
import { useTasks } from '../hooks/useTasks'
import { useCategories } from '../hooks/useCategories'
import type { Task } from '../db/models'

function tryParseTask(content: string): Task | null {
  try {
    const parsed = JSON.parse(content)
    if (parsed && typeof parsed === 'object' && 'title' in parsed && 'date' in parsed) {
      return parsed as Task
    }
  } catch {}
  return null
}

export function ChatPage() {
  const activeConversationId = useAppStore((state) => state.activeConversationId)
  const setActiveConversationId = useAppStore((state) => state.setActiveConversationId)
  const openDetailsModal = useAppStore((state) => state.openDetailsModal)
  const { conversations, createConversation, getMessages, deleteConversation } = useConversations()
  const { settings } = useSettings()
  const { categories } = useCategories()
  const { toggleDone } = useTasks()
  const { sendMessage, isStreaming, streamingText, error } = useAgent({
    conversationId: activeConversationId,
  })
  
  const [input, setInput] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [hasInitialized, setHasInitialized] = useState(false)
  
  // Voice Recognition states
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (hasInitialized || !conversations) return

    const isNewSession = !sessionStorage.getItem('chat_session_active')
    
    if (isNewSession) {
      sessionStorage.setItem('chat_session_active', 'true')
      void createConversation().then((id) => {
        setActiveConversationId(id)
        setHasInitialized(true)
      })
    } else {
      if (!activeConversationId && conversations.length === 0) {
        void createConversation().then((id) => {
          setActiveConversationId(id)
          setHasInitialized(true)
        })
      } else if (!activeConversationId && conversations.length > 0) {
        setActiveConversationId(conversations[0].id ?? null)
        setHasInitialized(true)
      } else {
        setHasInitialized(true)
      }
    }
  }, [activeConversationId, conversations, createConversation, hasInitialized, setActiveConversationId])

  const messages = useMemo(
    () => (activeConversationId ? getMessages(activeConversationId) : []),
    [activeConversationId, getMessages],
  )

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Safari.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onerror = (event: any) => {
      console.error('[SpeechRecognition Error]', event.error)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript))
    }

    recognitionRef.current = recognition
    recognition.start()
  }

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
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 max-h-[65vh]">
          {messages.length === 0 ? (
            <div className="text-sm text-slate-500 dark:text-slate-300">Ask for planning help, summaries, or task creation.</div>
          ) : null}
          {messages.map((message) => {
            const task = message.role === 'tool' ? tryParseTask(message.content) : null
            const isTool = message.role === 'tool'

            if (isTool) {
              if (task) {
                const taskCategory = categories.find((c) => c.id === task.categoryId)
                return (
                  <div key={message.id} className="max-w-[90%] mr-auto space-y-1">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Task {message.toolName === 'createTask' ? 'Created' : 'Updated'}
                    </div>
                    <div className="w-full text-left">
                      <TaskCard
                        task={task}
                        category={taskCategory}
                        onToggle={() => void toggleDone(task.id!)}
                        onClick={() => openDetailsModal(task.id!)}
                      />
                    </div>
                  </div>
                )
              }

              const labelMap: Record<string, string> = {
                getTasks: 'Checked tasks list',
                getSummary: 'Compiled summary',
                findFreeSlot: 'Searched calendar for free time',
                getMemory: 'Retrieved context from memory',
                updateMemory: 'Saved info to memory',
                deleteTask: 'Deleted task',
              }
              const label = labelMap[message.toolName || ''] || message.toolName

              return (
                <div key={message.id} className="mr-auto rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 px-3 py-1 text-[11px] text-slate-500 dark:text-slate-400">
                  ⚙️ {label}
                </div>
              )
            }

            return (
              <div
                key={message.id}
                className={`max-w-[85%] rounded-[24px] px-4 py-3 text-sm ${
                  message.role === 'user'
                    ? 'ml-auto bg-primary text-white'
                    : 'glass-soft text-slate-700 dark:text-slate-100'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
            )
          })}
          {isStreaming && streamingText ? (
            <div className="glass-soft max-w-[85%] rounded-[24px] px-4 py-3 text-sm text-slate-700 dark:text-slate-100">
              {streamingText}
            </div>
          ) : null}
          {error ? <div className="text-sm text-red-500 px-2">⚠️ {error}</div> : null}
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
            <GlassButton
              type="button"
              size="icon"
              variant={isListening ? 'primary' : 'ghost'}
              onClick={toggleListening}
              className={isListening ? 'animate-pulse' : ''}
              title="Speak to type"
            >
              {isListening ? <MicOff className="size-5" /> : <Mic className="size-5" />}
            </GlassButton>
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
