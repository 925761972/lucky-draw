import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/theme.css'
import App from './App.tsx'
import { RaffleProvider } from './lib/store'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RaffleProvider>
      <App />
    </RaffleProvider>
  </StrictMode>,
)
