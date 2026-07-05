import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { seedDefaultData } from './db/database'

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
