import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isSalesRole, isSalesManagerRole } from '../utils/roles'
import SalesNavbar from '../components/SalesNavbar'

import SalesDashboard from '../pages/sales/SalesDashboard'
import SalesMembers from '../pages/sales/SalesMembers'
import SalesRequests from '../pages/sales/SalesRequests'
import SalesProfile from '../pages/sales/SalesProfile'

import SalesManagerDashboard from '../pages/sales-manager/SalesManagerDashboard'
import SalesManagerRequests from '../pages/sales-manager/SalesManagerRequests'
import SalesManagerMembers from '../pages/sales-manager/SalesManagerMembers'
import SalesManagerTeam from '../pages/sales-manager/SalesManagerTeam'
import SalesManagerRepProfilePage from '../pages/sales-manager/SalesManagerRepProfilePage'
import SalesManagerPackages from '../pages/sales-manager/SalesManagerPackages'

const ACCENT = '#0ea5e9'

export default function SalesPortalRoutes() {
  const { user } = useAuth()
  const isManager = isSalesManagerRole(user?.role)

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', ACCENT)
    document.documentElement.style.setProperty('--accent-dark', '#0284c7')
    document.documentElement.style.setProperty('--accent-muted', 'rgba(14, 165, 233, 0.08)')
    document.documentElement.style.setProperty('--accent-border', 'rgba(14, 165, 233, 0.25)')
  }, [])

  if (isManager) {
    return (
      <div className="layout">
        <SalesNavbar />
        <div className="main">
          <Routes>
            <Route path="/sales-manager/dashboard" element={<SalesManagerDashboard />} />
            <Route path="/sales-manager/requests" element={<SalesManagerRequests />} />
            <Route path="/sales-manager/members" element={<SalesManagerMembers />} />
            <Route path="/sales-manager/team" element={<SalesManagerTeam />} />
            <Route path="/sales-manager/team/:id" element={<SalesManagerRepProfilePage />} />
            <Route path="/sales-manager/packages" element={<SalesManagerPackages />} />
            <Route path="*" element={<Navigate to="/sales-manager/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    )
  }

  if (isSalesRole(user?.role)) {
    return (
      <div className="layout">
        <SalesNavbar />
        <div className="main">
          <Routes>
            <Route path="/sales/dashboard" element={<SalesDashboard />} />
            <Route path="/sales/members" element={<SalesMembers />} />
            <Route path="/sales/requests" element={<SalesRequests />} />
            <Route path="/sales/profile" element={<SalesProfile />} />
            <Route path="*" element={<Navigate to="/sales/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    )
  }

  return <Navigate to="/" replace />
}
