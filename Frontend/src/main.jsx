import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { runMigration } from './services/migrate.js'

// Migrate old flat localStorage keys → namespaced keys (runs once)
runMigration()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
