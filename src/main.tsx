import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// @ts-ignore - Virtual module registered by vite-plugin-pwa
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'
import { seedDefaultData } from './db/database'

// Register PWA service worker with automatic update checks and reload
const updateSW = registerSW({
  onNeedRefresh() {
    console.log('[PWA] Update found, reloading page to apply...')
    window.location.reload()
  },
  onOfflineReady() {
    console.log('[PWA] App is ready for offline use')
  }
})

// Check for updates periodically and when window gains focus
if (typeof window !== 'undefined') {
  window.addEventListener('focus', () => {
    void updateSW()
  })

  // Check every 10 minutes
  setInterval(() => {
    void updateSW()
  }, 10 * 60 * 1000)
}

// Fetch interceptor for debugging network requests
const originalFetch = window.fetch
window.fetch = async (input, init) => {
  console.log('[window.fetch] Request:', input, init)
  try {
    const response = await originalFetch(input, init)
    console.log('[window.fetch] Response Success:', response.url, response.status)
    return response
  } catch (error) {
    console.error('[window.fetch] Response Error:', input, error)
    throw error
  }
}

void seedDefaultData()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
