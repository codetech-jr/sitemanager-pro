import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ProjectProvider } from './lib/ProjectContext';

import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProjectProvider>
      <App />
    </ProjectProvider>
  </StrictMode>,
)
