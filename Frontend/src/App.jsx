import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SystemProvider } from './context/SystemContext'
import { usesSalesPortal } from './utils/roles'
import AppRoutes from './routes/AppRoutes'
import SalesPortalRoutes from './routes/SalesPortalRoutes'
import Login from './pages/Login'
import Signup from './pages/Signup'

function Root() {
  const { user } = useAuth()

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  if (usesSalesPortal(user.role)) {
    return <SalesPortalRoutes />
  }

  return (
    <SystemProvider>
      <AppRoutes />
    </SystemProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </BrowserRouter>
  )
}
