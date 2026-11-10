import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { ConfigError } from './components/common/ConfigError'
import { readSupabaseConfig } from './lib/data'
import './styles/global.css'

const config = readSupabaseConfig()

createRoot(document.getElementById('root')!).render(
  <StrictMode>{config.ok ? <App /> : <ConfigError problems={config.problems} />}</StrictMode>,
)

// The service worker caches the app shell and the exercise catalog (step 7.3).
// Production only, so development always serves fresh files.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .catch(() => {
        // The app works without it; it just won't open offline.
      })
  })
}
