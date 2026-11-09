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
