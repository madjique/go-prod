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
import ReactMarkdown from 'react-markdown'
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
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        // Trigger microphone permission dialog for PWAs and Safari
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          navigator.mediaDevices.getUserMedia({ audio: true })
            .then((stream) => {
              stream.getTracks().forEach((track) => track.stop())
              alert('Microphone access enabled! Please tap the record button again to start.')
            })
            .catch((err) => {
              console.error('[Mic Permission Error]', err)
              alert('Microphone permission is required. Please enable it in settings.')
            })
        }
      }
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript))
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch (e) {
      console.error('[SpeechRecognition Start Error]', e)
    }
  }

  return (
    <div className="flex flex-col min-h-0 h-full relative pt-2">
      {!settings?.apiKey ? (
        <GlassCard className="text-sm text-slate-600 dark:text-slate-200 mb-4">
          Add an AI provider and API key in Settings to start chatting with your coach.
        </GlassCard>
      ) : null}

      <div className="flex-1 space-y-4 px-1 py-4 pb-40 md:pb-28">
        {messages.length === 0 ? (
          <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-12">
            Ask for planning help, summaries, or task creation.
          </div>
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
              className={
                message.role === 'user'
                  ? 'w-fit max-w-[85%] ml-auto bg-gradient-to-br from-primary to-secondary text-white rounded-[24px] px-4 py-3 text-sm shadow-md border border-white/20 whitespace-pre-wrap'
                  : 'max-w-[85%] mr-auto text-sm text-slate-800 dark:text-slate-100 py-1'
              }
            >
              {message.role === 'user' ? (
                message.content
              ) : (
                <ReactMarkdown
                  components={{
                    p: ({ node, ...props }) => <p className="mb-1.5 last:mb-0 leading-relaxed" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2 mt-1 space-y-0.5" {...props} />,
                    ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2 mt-1 space-y-0.5" {...props} />,
                    li: ({ node, ...props }) => <li className="text-sm" {...props} />,
                    strong: ({ node, ...props }) => <strong className="font-semibold text-slate-950 dark:text-white" {...props} />,
                    a: ({ node, ...props }) => <a className="text-primary underline hover:text-primary/80" target="_blank" rel="noopener noreferrer" {...props} />,
                    h1: ({ node, ...props }) => <h1 className="text-base font-bold mb-1 mt-2 text-slate-950 dark:text-white" {...props} />,
                    h2: ({ node, ...props }) => <h2 className="text-sm font-bold mb-1 mt-2 text-slate-950 dark:text-white" {...props} />,
                    h3: ({ node, ...props }) => <h3 className="text-xs font-bold mb-1 mt-2 text-slate-950 dark:text-white" {...props} />,
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              )}
            </div>
          )
        })}
        {isStreaming && streamingText ? (
          <div className="max-w-[85%] mr-auto text-sm text-slate-800 dark:text-slate-100 py-1">
            <ReactMarkdown
              components={{
                p: ({ node, ...props }) => <p className="mb-1.5 last:mb-0 leading-relaxed" {...props} />,
                ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2 mt-1 space-y-0.5" {...props} />,
                ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2 mt-1 space-y-0.5" {...props} />,
                li: ({ node, ...props }) => <li className="text-sm" {...props} />,
                strong: ({ node, ...props }) => <strong className="font-semibold text-slate-950 dark:text-white" {...props} />,
                a: ({ node, ...props }) => <a className="text-primary underline hover:text-primary/80" target="_blank" rel="noopener noreferrer" {...props} />,
                h1: ({ node, ...props }) => <h1 className="text-base font-bold mb-1 mt-2 text-slate-955 dark:text-white" {...props} />,
                h2: ({ node, ...props }) => <h2 className="text-sm font-bold mb-1 mt-2 text-slate-955 dark:text-white" {...props} />,
                h3: ({ node, ...props }) => <h3 className="text-xs font-bold mb-1 mt-2 text-slate-955 dark:text-white" {...props} />,
              }}
            >
              {streamingText}
            </ReactMarkdown>
          </div>
        ) : null}
        {isStreaming && !streamingText ? (
          <div className="mr-auto flex max-w-[85%] items-center gap-2 text-sm text-slate-500 dark:text-slate-400 py-1">
            <span>Thinking</span>
            <div className="flex gap-1">
              <span className="size-2 animate-bounce rounded-full bg-primary/80" style={{ animationDelay: '0ms' }} />
              <span className="size-2 animate-bounce rounded-full bg-primary/80" style={{ animationDelay: '150ms' }} />
              <span className="size-2 animate-bounce rounded-full bg-primary/80" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        ) : null}
        {error ? <div className="text-sm text-red-500 px-2">⚠️ {error}</div> : null}
        <div ref={endRef} />
      </div>

      <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+78px)] md:bottom-6 left-4 right-4 md:left-[calc(16rem+2rem)] md:right-8 z-30 mx-auto max-w-2xl flex items-center gap-2">
        {!isListening && (
          <>
            <GlassButton
              variant="ghost"
              className="size-11 rounded-full p-0 shadow-lg border border-white/50 dark:border-white/10 bg-white/40 dark:bg-black/20 shrink-0"
              onClick={() => {
                void createConversation().then((id) => {
                  setActiveConversationId(id)
                })
              }}
              disabled={messages.length === 0}
              title="New Conversation"
            >
              <Plus className="size-5 animate-none" />
            </GlassButton>

            <GlassButton
              variant="ghost"
              className="size-11 rounded-full p-0 shadow-lg border border-white/50 dark:border-white/10 bg-white/40 dark:bg-black/20 shrink-0"
              onClick={() => setHistoryOpen(true)}
              title="Conversation History"
            >
              <History className="size-5" />
            </GlassButton>
          </>
        )}

        <form
          className="flex-1 glass rounded-full p-1.5 shadow-lg border border-white/50 dark:border-white/10 transition-all duration-300"
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
          {isListening ? (
            <div className="flex items-center justify-between w-full px-4 py-0.5">
              <div className="flex items-center gap-2 shrink-0">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Recording</span>
              </div>
              
              {/* Stretched center wave visualizer */}
              <div className="flex-1 flex items-end justify-center gap-1 h-5 mx-4 overflow-hidden">
                <span className="w-1 bg-red-500 rounded-full animate-voice-bar-1" />
                <span className="w-1 bg-red-500 rounded-full animate-voice-bar-2" />
                <span className="w-1 bg-red-500 rounded-full animate-voice-bar-3" />
                <span className="w-1 bg-red-500 rounded-full animate-voice-bar-4" />
                <span className="w-1 bg-red-500 rounded-full animate-voice-bar-1" />
                <span className="w-1 bg-red-500 rounded-full animate-voice-bar-2" />
                <span className="w-1 bg-red-500 rounded-full animate-voice-bar-3" />
                <span className="w-1 bg-red-500 rounded-full animate-voice-bar-4" />
                <span className="w-1 bg-red-500 rounded-full animate-voice-bar-1" />
                <span className="w-1 bg-red-500 rounded-full animate-voice-bar-2" />
                <span className="w-1 bg-red-500 rounded-full animate-voice-bar-3" />
                <span className="w-1 bg-red-500 rounded-full animate-voice-bar-4" />
              </div>

              <GlassButton
                type="button"
                className="h-8 rounded-full px-3 text-[11px] font-bold bg-red-500/10 hover:bg-red-500/20 text-red-650 dark:text-red-400 border border-red-500/20 flex items-center gap-1 transition-all duration-300 shrink-0"
                onClick={toggleListening}
              >
                <MicOff className="size-3" />
                Stop
              </GlassButton>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Plan my afternoon, summarize today, find focus time..."
                className="h-10 flex-1 bg-transparent px-4 text-sm text-slate-900 dark:text-white focus:outline-none placeholder-slate-400 dark:placeholder-slate-500"
              />
              <GlassButton
                type="button"
                size="icon"
                variant="ghost"
                onClick={toggleListening}
                className="size-10 rounded-full border border-transparent bg-transparent hover:bg-white/30 dark:hover:bg-white/10"
                title="Speak to type"
              >
                <Mic className="size-4" />
              </GlassButton>
              <GlassButton
                size="icon"
                type="submit"
                disabled={isStreaming || !input.trim()}
                className="size-10 rounded-full bg-primary text-white hover:bg-indigo-500"
              >
                <Send className="size-4" />
              </GlassButton>
            </div>
          )}
        </form>
      </div>

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
