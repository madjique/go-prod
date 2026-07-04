import { useState } from 'react'
import { aiModelOptions } from '../agent/modelOptions'
import type { AppSettings } from '../db/models'
import { GlassButton } from '../components/ui/GlassButton'
import { GlassCard } from '../components/ui/GlassCard'
import { useSettingsContext } from '../context/SettingsContext'

const profiles = [
  'Focused maker balancing meetings and deep work',
  'Student building consistent study habits',
  'Founder juggling strategy, product, and people',
  'Creative professional managing energy and deadlines',
]

interface OnboardingFlowProps {
  settings: AppSettings
  updateSettings: ReturnType<typeof useSettingsContext>['updateSettings']
  updateProvider: ReturnType<typeof useSettingsContext>['updateProvider']
  updateModel: ReturnType<typeof useSettingsContext>['updateModel']
  setOnboardingState: ReturnType<typeof useSettingsContext>['setOnboardingState']
}

function OnboardingFlow({
  settings,
  updateSettings,
  updateProvider,
  updateModel,
  setOnboardingState,
}: OnboardingFlowProps) {
  const [step, setStep] = useState(1)
  const [profile, setProfile] = useState(settings.userProfile || profiles[0])
  const [provider, setProvider] = useState<AppSettings['aiProvider']>(settings.aiProvider)
  const [model, setModelValue] = useState(settings.aiModel)
  const [apiKey, setApiKey] = useState(settings.apiKey)
  const [calendarAccess, setCalendarAccess] = useState(settings.calendarAccess)
  const [workStartHour, setWorkStartHour] = useState(settings.workStartHour)
  const [workEndHour, setWorkEndHour] = useState(settings.workEndHour)
  const [sleepStartHour, setSleepStartHour] = useState(settings.sleepStartHour)
  const [sleepEndHour, setSleepEndHour] = useState(settings.sleepEndHour)

  return (
    <div className="bg-mesh flex min-h-screen items-center justify-center px-4 py-8">
      <GlassCard className="w-full max-w-xl space-y-6 p-6 md:p-8">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary/80">Step {step} of 5</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">Welcome to Go Prod</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
            Your focused productivity PWA for time-boxing, planning, and AI-guided momentum.
          </p>
        </div>

        {step === 1 ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-200">
              Let Go Prod know if it can help with your calendar planning.
            </p>
            <label className="flex items-center justify-between gap-3 rounded-2xl bg-white/45 px-4 py-4 dark:bg-white/5">
              <span className="font-medium text-slate-900 dark:text-white">Enable calendar access</span>
              <input
                type="checkbox"
                checked={calendarAccess}
                onChange={(event) => setCalendarAccess(event.target.checked)}
                className="size-5 rounded border-slate-300 text-primary"
              />
            </label>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-3">
            {profiles.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setProfile(item)}
                className={`w-full rounded-2xl px-4 py-4 text-left ${profile === item ? 'bg-primary text-white' : 'bg-white/45 text-slate-700 dark:bg-white/5 dark:text-slate-100'}`}
              >
                {item}
              </button>
            ))}
          </div>
        ) : null}

        {step === 3 ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-2 text-sm">
              <span className="text-slate-600 dark:text-slate-200">Work start</span>
              <input type="number" min={0} max={23} value={workStartHour} onChange={(event) => setWorkStartHour(Number(event.target.value))} className="glass-soft h-12 w-full rounded-2xl px-4 text-slate-900 dark:text-white" />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-slate-600 dark:text-slate-200">Work end</span>
              <input type="number" min={0} max={23} value={workEndHour} onChange={(event) => setWorkEndHour(Number(event.target.value))} className="glass-soft h-12 w-full rounded-2xl px-4 text-slate-900 dark:text-white" />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-slate-600 dark:text-slate-200">Sleep start</span>
              <input type="number" min={0} max={23} value={sleepStartHour} onChange={(event) => setSleepStartHour(Number(event.target.value))} className="glass-soft h-12 w-full rounded-2xl px-4 text-slate-900 dark:text-white" />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-slate-600 dark:text-slate-200">Sleep end</span>
              <input type="number" min={0} max={23} value={sleepEndHour} onChange={(event) => setSleepEndHour(Number(event.target.value))} className="glass-soft h-12 w-full rounded-2xl px-4 text-slate-900 dark:text-white" />
            </label>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-3">
            <select value={provider} onChange={(event) => {
              const value = event.target.value as AppSettings['aiProvider']
              setProvider(value)
              setModelValue(aiModelOptions[value][0])
            }} className="glass-soft h-12 w-full rounded-2xl px-4 text-slate-900 dark:text-white">
              <option value="openai">OpenAI</option>
              <option value="google">Google</option>
              <option value="anthropic">Anthropic</option>
            </select>
            <select value={model} onChange={(event) => setModelValue(event.target.value)} className="glass-soft h-12 w-full rounded-2xl px-4 text-slate-900 dark:text-white">
              {aiModelOptions[provider].map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="API key" className="glass-soft h-12 w-full rounded-2xl px-4 text-slate-900 dark:text-white" />
          </div>
        ) : null}

        {step === 5 ? (
          <div className="space-y-3 rounded-3xl bg-white/45 p-5 dark:bg-white/5">
            <p className="text-sm text-slate-500 dark:text-slate-300">Ready to launch</p>
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-100">
              <li>• Profile: {profile}</li>
              <li>• Work hours: {workStartHour}:00 - {workEndHour}:00</li>
              <li>• Sleep hours: {sleepStartHour}:00 - {sleepEndHour}:00</li>
              <li>• Provider: {provider} / {model}</li>
            </ul>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {step > 1 ? <GlassButton variant="ghost" onClick={() => setStep((current) => current - 1)}>Back</GlassButton> : null}
          {step < 5 ? (
            <GlassButton
              className="ml-auto"
              onClick={async () => {
                if (step === 4) {
                  await updateProvider(provider)
                  await updateModel(model)
                  await updateSettings({ apiKey })
                }
                setStep((current) => current + 1)
              }}
            >
              Continue
            </GlassButton>
          ) : (
            <GlassButton
              className="ml-auto"
              onClick={async () => {
                await updateSettings({
                  userProfile: profile,
                  workStartHour,
                  workEndHour,
                  sleepStartHour,
                  sleepEndHour,
                  apiKey,
                  aiProvider: provider,
                  aiModel: model,
                  calendarAccess,
                  onboardingCompleted: true,
                })
                await setOnboardingState(true)
              }}
            >
              Start using Go Prod
            </GlassButton>
          )}
        </div>
      </GlassCard>
    </div>
  )
}

export function OnboardingPage() {
  const context = useSettingsContext()

  if (!context.settings) {
    return <div className="bg-mesh min-h-screen p-6">Loading...</div>
  }

  return (
    <OnboardingFlow
      settings={context.settings}
      updateSettings={context.updateSettings}
      updateProvider={context.updateProvider}
      updateModel={context.updateModel}
      setOnboardingState={context.setOnboardingState}
    />
  )
}
