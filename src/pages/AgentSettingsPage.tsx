import { useNavigate } from 'react-router-dom'
import { GlassButton } from '../components/ui/GlassButton'
import { GlassCard } from '../components/ui/GlassCard'
import { useAgentSettings } from '../hooks/useAgentSettings'
import { ArrowLeft, Trash2, Shield, Brain, Cpu, MessageSquare, Receipt } from 'lucide-react'

export function AgentSettingsPage() {
  const navigate = useNavigate()
  const {
    settings,
    customPrompt,
    setCustomPrompt,
    availableModels,
    savePrompt,
    resetPrompt,
    memory,
    deleteMemory,
    clearAllMemory,
    summaries,
    deleteSummary,
    requestLogs,
    clearAllUsageLogs,
    updateProvider,
    updateModel,
    updateApiKey,
  } = useAgentSettings()

  if (!settings) {
    return <GlassCard>Loading settings...</GlassCard>
  }

  const totalCost = requestLogs ? requestLogs.reduce((sum, log) => sum + (log.cost || 0), 0) : 0
  const totalTokens = requestLogs ? requestLogs.reduce((sum, log) => sum + (log.tokenCount || 0), 0) : 0

  return (
    <div className="space-y-6 pt-2">
      <div className="flex items-center gap-3">
        <GlassButton
          variant="ghost"
          size="sm"
          className="size-9 rounded-full p-0 flex items-center justify-center bg-transparent border-white/20 hover:bg-white/40 dark:hover:bg-white/10"
          onClick={() => navigate('/app/settings')}
        >
          <ArrowLeft className="size-5" />
        </GlassButton>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary/80 font-bold">Preferences</p>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">AI Agent Settings</h2>
        </div>
      </div>

      {/* Model Provider Config */}
      <GlassCard className="space-y-4">
        <div className="flex items-center gap-2">
          <Cpu className="size-5 text-primary" />
          <h3 className="text-base font-bold text-slate-950 dark:text-white">Model Connection</h3>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="space-y-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              Provider
              <select
                value={settings.aiProvider}
                onChange={(event) => void updateProvider(event.target.value as any)}
                className="glass-soft h-12 w-full rounded-2xl px-4 text-sm text-slate-900 dark:text-white mt-1 bg-white/50 dark:bg-black/20"
              >
                <option value="openai">OpenAI</option>
                <option value="google">Google Gemini</option>
                <option value="anthropic">Anthropic Claude</option>
              </select>
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              Model Selection
              <select
                value={settings.aiModel}
                onChange={(event) => void updateModel(event.target.value)}
                className="glass-soft h-12 w-full rounded-2xl px-4 text-sm text-slate-900 dark:text-white mt-1 bg-white/50 dark:bg-black/20"
              >
                {availableModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="space-y-1 text-xs font-semibold text-slate-500 dark:text-slate-400 block">
            API Key
            <input
              type="password"
              value={settings.apiKey}
              placeholder="Enter your private API key..."
              onChange={(event) => void updateApiKey(event.target.value)}
              className="glass-soft h-12 w-full rounded-2xl px-4 text-sm text-slate-900 dark:text-white mt-1 bg-white/50 dark:bg-black/20"
            />
          </label>
        </div>
      </GlassCard>

      {/* Prompts Instructions */}
      <GlassCard className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="size-5 text-primary" />
          <h3 className="text-base font-bold text-slate-950 dark:text-white">Custom System Instructions</h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Define how the AI Coach behaves, styles its response, or targets task schedules.
        </p>
        <textarea
          value={customPrompt}
          onChange={(event) => setCustomPrompt(event.target.value)}
          placeholder="You are a personal productivity assistant... Be extremely concise."
          rows={4}
          className="glass-soft w-full rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white bg-white/50 dark:bg-black/20 focus:outline-none"
        />
        <div className="flex gap-2">
          <GlassButton
            size="sm"
            onClick={async () => {
              await savePrompt(customPrompt)
              alert('Instructions saved!')
            }}
          >
            Save prompt
          </GlassButton>
          <GlassButton variant="ghost" size="sm" onClick={resetPrompt}>
            Reset Default
          </GlassButton>
        </div>
      </GlassCard>

      {/* Memory Manager */}
      <GlassCard className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Brain className="size-5 text-primary" />
            <h3 className="text-base font-bold text-slate-950 dark:text-white">Learned User Context</h3>
          </div>
          {memory.length > 0 ? (
            <GlassButton variant="ghost" size="sm" className="text-red-500 hover:text-red-650" onClick={clearAllMemory}>
              Clear memory
            </GlassButton>
          ) : null}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Facts, preferences, and details the AI coach has automatically extracted and remembered.
        </p>
        <div className="space-y-2">
          {memory.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-2xl bg-white/45 px-4 py-3 text-sm dark:bg-white/5 border border-white/50 dark:border-white/5"
            >
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-primary/80 mr-2 bg-primary/10 dark:bg-primary/20 px-2 py-0.5 rounded-full">
                    {item.category}
                  </span>
                  {item.key}
                </div>
                <div className="text-slate-500 dark:text-slate-300 mt-0.5">{item.value}</div>
              </div>
              <GlassButton variant="ghost" size="sm" className="p-1 size-8 rounded-full" onClick={() => deleteMemory(item.id!)}>
                <Trash2 className="size-4 text-slate-400 hover:text-red-500" />
              </GlassButton>
            </div>
          ))}
          {memory.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-450 italic">No user memory slots established yet.</p>
          ) : null}
        </div>
      </GlassCard>

      {/* Usage Logs & Consumed Costs */}
      <GlassCard className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Receipt className="size-5 text-primary" />
            <h3 className="text-base font-bold text-slate-950 dark:text-white">API Call Usage & Estimations</h3>
          </div>
          {requestLogs && requestLogs.length > 0 ? (
            <GlassButton variant="ghost" size="sm" className="text-red-500" onClick={clearAllUsageLogs}>
              Reset Logs
            </GlassButton>
          ) : null}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Summary of tokens and input/output requests made to providers.
        </p>

        <div className="grid grid-cols-2 gap-3 bg-white/30 dark:bg-white/5 rounded-2xl p-4 border border-white/30 dark:border-white/5">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Estimated Total Cost</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">${totalCost.toFixed(5)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Tokens Consumed</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{totalTokens.toLocaleString()}</p>
          </div>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {requestLogs?.map((log) => (
            <div
              key={log.id}
              className="text-xs flex flex-col gap-1.5 rounded-2xl bg-white/45 px-4 py-3 dark:bg-white/5 border border-white/50 dark:border-white/5"
            >
              <div className="flex justify-between items-center text-slate-400">
                <span>{new Date(log.createdAt).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', month: 'short', day: 'numeric' })}</span>
                <span className="font-semibold text-primary">
                  {log.tokenCount} tokens • ${log.cost?.toFixed(5) ?? '$0.00000'}
                </span>
              </div>
              <p className="text-slate-700 dark:text-slate-200 line-clamp-2 italic">
                "{log.content}"
              </p>
            </div>
          ))}
          {(!requestLogs || requestLogs.length === 0) ? (
            <p className="text-sm text-slate-500 dark:text-slate-450 italic">No usage history recorded yet.</p>
          ) : null}
        </div>
      </GlassCard>

      {/* Summaries History */}
      <GlassCard className="space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-5 text-primary" />
          <h3 className="text-base font-bold text-slate-950 dark:text-white">Conversation Summaries</h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Saved snapshot logs of older conversations used to save system prompt space.
        </p>
        <div className="space-y-2">
          {summaries.map((summary) => (
            <div
              key={summary.id}
              className="flex items-center justify-between gap-3 rounded-2xl bg-white/45 px-4 py-3 text-sm dark:bg-white/5 border border-white/50 dark:border-white/5"
            >
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-slate-900 dark:text-white break-words">{summary.summary}</div>
                <div className="mt-1 text-xs text-slate-405 dark:text-slate-400">
                  {summary.period} • ~{summary.tokensSaved} tokens saved
                </div>
              </div>
              <GlassButton variant="ghost" size="sm" className="p-1 size-8 rounded-full" onClick={() => deleteSummary(summary.id!)}>
                <Trash2 className="size-4 text-slate-400 hover:text-red-500" />
              </GlassButton>
            </div>
          ))}
          {summaries.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-450 italic">No summaries compiled yet.</p>
          ) : null}
        </div>
      </GlassCard>
    </div>
  )
}
