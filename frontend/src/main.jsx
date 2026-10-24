import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './shared/components/skeletons/skeletons.css'
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

// Register Service Worker for PWA standalone fullscreen
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('MoonPulse Service Worker registered successfully:', registration.scope);
      })
      .catch((error) => {
        console.warn('MoonPulse Service Worker registration failed:', error);
      });
  });
}

