import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Validate environment variables at startup
import { logEnvironmentInfo } from './lib/env'

// Log environment info
logEnvironmentInfo()

createRoot(document.getElementById("root")!).render(<App />);
