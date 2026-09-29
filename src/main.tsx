import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from '@/hooks/use-auth'
import { initTelemetry } from '@/lib/analytics'
import './index.css'
import App from './App.tsx'

initTelemetry().catch(console.error);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
