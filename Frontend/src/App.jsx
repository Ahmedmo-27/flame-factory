import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';

import Login          from './pages/Login';
import Members        from './pages/Members';
import MemberProfile  from './pages/member/MemberProfile';
import SalesDashboard     from './pages/sales/SalesDashboard';
import SalesMembers       from './pages/sales/SalesMembers';
import SalesRequests      from './pages/sales/SalesRequests';
import SalesTeam          from './pages/sales/SalesTeam';
import SalesPersonProfile from './pages/sales/SalesPersonProfile';
import ManageStaff        from './pages/sales/ManageStaff';
import ManagePackages     from './pages/sales/ManagePackages';
import TargetDashboard    from './pages/sales/TargetDashboard';
import SalesSubscriptions from './pages/sales/SalesSubscriptions';
import CallCenter         from './pages/sales/CallCenter';
import Transfer           from './pages/sales/Transfer';
import PackageRequests    from './pages/accounting/PackageRequests';
import ContractHistory    from './pages/accounting/ContractHistory';
import AccountantDashboard from './pages/accounting/AccountantDashboard';
import CheckIn        from './pages/CheckIn';
import NotFound       from './pages/NotFound';

// ── Protected route wrapper ───────────────────────────────────────────────────
function PrivateRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

// ── Root redirect based on role ───────────────────────────────────────────────
function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (['Sales', 'Sales Manager'].includes(user.role)) return <Navigate to="/sales/dashboard" replace />;
  if (user.role === 'Accountant') return <Navigate to="/accounting/dashboard" replace />;
  return <Navigate to="/members" replace />;
}

// ── Router ────────────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      <Route path="/"      element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />

      {/* Receptionist / Owner */}
      <Route path="/members" element={
        <PrivateRoute roles={['Receptionist', 'Owner', 'Sales Manager', 'Accountant']}>
          <Members />
        </PrivateRoute>
      } />

      {/* Everyone authenticated can view a member profile */}
      <Route path="/members/:id" element={
        <PrivateRoute>
          <MemberProfile />
        </PrivateRoute>
      } />

      {/* Check-in — not available to Accountant */}
      <Route path="/checkin" element={
        <PrivateRoute roles={['Receptionist', 'Owner', 'Sales', 'Sales Manager', 'Coach']}>
          <CheckIn />
        </PrivateRoute>
      } />

      {/* Sales routes */}
      <Route path="/sales/dashboard" element={
        <PrivateRoute roles={['Sales', 'Sales Manager', 'Owner']}>
          <SalesDashboard />
        </PrivateRoute>
      } />
      <Route path="/sales/members" element={
        <PrivateRoute roles={['Sales', 'Sales Manager', 'Owner']}>
          <SalesMembers />
        </PrivateRoute>
      } />
      <Route path="/sales/requests" element={
        <PrivateRoute roles={['Sales', 'Sales Manager', 'Owner']}>
          <SalesRequests />
        </PrivateRoute>
      } />
      <Route path="/sales/team" element={
        <PrivateRoute roles={['Sales Manager', 'Owner', 'Accountant']}>
          <SalesTeam />
        </PrivateRoute>
      } />
      <Route path="/sales/team/:id" element={
        <PrivateRoute roles={['Sales Manager', 'Owner', 'Accountant']}>
          <SalesPersonProfile />
        </PrivateRoute>
      } />
      <Route path="/sales/callcenter" element={
        <PrivateRoute roles={['Sales Manager', 'Owner']}>
          <CallCenter />
        </PrivateRoute>
      } />
      <Route path="/sales/staff" element={
        <PrivateRoute roles={['Sales Manager', 'Owner']}>
          <ManageStaff />
        </PrivateRoute>
      } />
      <Route path="/sales/packages" element={
        <PrivateRoute roles={['Sales Manager', 'Owner']}>
          <ManagePackages />
        </PrivateRoute>
      } />
      <Route path="/sales/targets" element={
        <PrivateRoute roles={['Sales Manager', 'Owner', 'Accountant']}>
          <TargetDashboard />
        </PrivateRoute>
      } />
      <Route path="/sales/subscriptions" element={
        <PrivateRoute roles={['Sales']}>
          <SalesSubscriptions />
        </PrivateRoute>
      } />
      <Route path="/sales/transfer" element={
        <PrivateRoute roles={['Sales Manager', 'Owner']}>
          <Transfer />
        </PrivateRoute>
      } />

      {/* Accountant routes */}
      <Route path="/accounting/dashboard" element={
        <PrivateRoute roles={['Accountant', 'Owner']}>
          <AccountantDashboard />
        </PrivateRoute>
      } />
      <Route path="/accounting/package-requests" element={
        <PrivateRoute roles={['Accountant', 'Owner', 'Sales Manager']}>
          <PackageRequests />
        </PrivateRoute>
      } />
      <Route path="/accounting/contract-history" element={
        <PrivateRoute roles={['Accountant', 'Owner']}>
          <ContractHistory />
        </PrivateRoute>
      } />
      <Route path="/accounting/exceptions" element={<Navigate to="/accounting/package-requests" replace />} />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

// ── App root ──────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 3500,
              style: {
                background: '#191919',
                color:      '#f0f0f0',
                border:     '1px solid #2a2a2a',
                fontSize:   '13px',
                borderRadius: '8px',
              },
              success: { iconTheme: { primary: '#22c55e', secondary: '#191919' } },
              error:   { iconTheme: { primary: '#ef4444', secondary: '#191919' } },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
