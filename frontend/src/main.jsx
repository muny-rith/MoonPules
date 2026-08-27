import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './features/dashboard/dashboard.css'
import './features/product/product.css'
import './features/statistics/statistics.css'
import './features/postTracker/postTracker.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
