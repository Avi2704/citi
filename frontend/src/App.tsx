import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { DashboardLayout } from './layouts/DashboardLayout';
import { ProtectedRoute } from './layouts/ProtectedRoute';
import { AdminPlaceholderPage } from './pages/admin/AdminPlaceholderPage';
import { CitizenDashboardPage } from './pages/citizen/CitizenDashboardPage';
import { CitizenProfilePage } from './pages/citizen/CitizenProfilePage';
import { CitizenReportDetailPage } from './pages/citizen/CitizenReportDetailPage';
import { CitizenReportPage } from './pages/citizen/CitizenReportPage';
import { CitizenReportsPage } from './pages/citizen/CitizenReportsPage';
import { LoginPage } from './pages/public/LoginPage';
import { RegisterPage } from './pages/public/RegisterPage';
import { StaffPlaceholderPage } from './pages/staff/StaffPlaceholderPage';

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<ProtectedRoute allowedRoles={['citizen', 'admin', 'collection_staff']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/citizen/dashboard" element={<CitizenDashboardPage />} />
              <Route path="/citizen/report" element={<CitizenReportPage />} />
              <Route path="/citizen/reports" element={<CitizenReportsPage />} />
              <Route path="/citizen/reports/:id" element={<CitizenReportDetailPage />} />
              <Route path="/citizen/profile" element={<CitizenProfilePage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/admin/dashboard" element={<AdminPlaceholderPage title="Admin Dashboard" />} />
              <Route path="/admin/reports" element={<AdminPlaceholderPage title="Admin Reports" />} />
              <Route path="/admin/reports/:id" element={<AdminPlaceholderPage title="Admin Report Details" />} />
              <Route path="/admin/map" element={<AdminPlaceholderPage title="Admin Map" />} />
              <Route path="/admin/teams" element={<AdminPlaceholderPage title="Teams" />} />
              <Route path="/admin/vehicles" element={<AdminPlaceholderPage title="Vehicles" />} />
              <Route path="/admin/routes" element={<AdminPlaceholderPage title="Routes" />} />
              <Route path="/admin/routes/create" element={<AdminPlaceholderPage title="Create Route" />} />
              <Route path="/admin/routes/:id" element={<AdminPlaceholderPage title="Route Details" />} />
              <Route path="/admin/analytics" element={<AdminPlaceholderPage title="Analytics" />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['collection_staff']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/staff/dashboard" element={<StaffPlaceholderPage title="Staff Dashboard" />} />
              <Route path="/staff/routes/:id" element={<StaffPlaceholderPage title="Assigned Route" />} />
              <Route path="/staff/routes/:id/stops/:stopId" element={<StaffPlaceholderPage title="Route Stop" />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
