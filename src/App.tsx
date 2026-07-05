import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { Layout } from './components/Layout'
import { SettingsProvider } from './context/SettingsContext'
import { ThemeProvider } from './context/ThemeContext'
import { OnboardingPage } from './pages/OnboardingPage'
import { ChatPage } from './pages/ChatPage'
import { SettingsPage } from './pages/SettingsPage'
import { AgentSettingsPage } from './pages/AgentSettingsPage'
import { TodayPage } from './pages/TodayPage'
import { VisionPage } from './pages/VisionPage'
import { useAppStore } from './store/useAppStore'

function LoadingScreen() {
  return <div className="bg-mesh flex min-h-screen items-center justify-center text-sm text-slate-500">Loading Go Prod...</div>
}

function RootRedirect() {
  const hasHydrated = useAppStore((state) => state.hasHydrated)
  const onboardingCompleted = useAppStore((state) => state.onboardingCompleted)

  if (!hasHydrated) {
    return <LoadingScreen />
  }

  return <Navigate to={onboardingCompleted ? '/app/today' : '/onboarding'} replace />
}

function OnboardingRoute() {
  const hasHydrated = useAppStore((state) => state.hasHydrated)
  const onboardingCompleted = useAppStore((state) => state.onboardingCompleted)

  if (!hasHydrated) {
    return <LoadingScreen />
  }

  if (onboardingCompleted) {
    return <Navigate to="/app/today" replace />
  }

  return <OnboardingPage />
}

function AppRoute() {
  const hasHydrated = useAppStore((state) => state.hasHydrated)
  const onboardingCompleted = useAppStore((state) => state.onboardingCompleted)

  if (!hasHydrated) {
    return <LoadingScreen />
  }

  if (!onboardingCompleted) {
    return <Navigate to="/onboarding" replace />
  }

  return <Layout />
}

const router = createBrowserRouter(
  [
    { path: '/', element: <RootRedirect /> },
    { path: '/onboarding', element: <OnboardingRoute /> },
    {
      path: '/app',
      element: <AppRoute />,
      children: [
        { index: true, element: <Navigate to="today" replace /> },
        { path: 'today', element: <TodayPage /> },
        { path: 'chat', element: <ChatPage /> },
        { path: 'vision', element: <VisionPage /> },
        { path: 'settings', element: <SettingsPage /> },
        { path: 'settings/agent', element: <AgentSettingsPage /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL }
)

export default function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <RouterProvider router={router} />
      </SettingsProvider>
    </ThemeProvider>
  )
}
