import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Auth state is fully persisted via Zustand `persist` middleware (localStorage: 'erp-auth').
// No demo user seeding here — the user must log in properly via LoginPage.
// On refresh, Zustand rehydrates the session automatically.

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
