import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './layouts/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { PatientManagementPage } from './pages/PatientManagementPage';
import { PatientDetailPage } from './pages/PatientDetailPage';
import { NewScreeningPage } from './pages/NewScreeningPage';
import { ScreeningHistoryPage } from './pages/ScreeningHistoryPage';
import { ScreeningResultPage } from './pages/ScreeningResultPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ResourceSimulationPage } from './pages/ResourceSimulationPage';
import { ModelStatusPage } from './pages/ModelStatusPage';
import { ArchitecturePage } from './pages/ArchitecturePage';
import { SettingsPage } from './pages/SettingsPage';

// Protected Route wrapper with seamless demo access
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-white text-sm font-semibold">
        Initializing NetraAI Screening Platform...
      </div>
    );
  }

  // If not logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="patients" element={<PatientManagementPage />} />
            <Route path="patients/:id" element={<PatientDetailPage />} />
            <Route path="screenings" element={<ScreeningHistoryPage />} />
            <Route path="screenings/new" element={<NewScreeningPage />} />
            <Route path="screenings/:id" element={<ScreeningResultPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="simulation" element={<ResourceSimulationPage />} />
            <Route path="model-status" element={<ModelStatusPage />} />
            <Route path="architecture" element={<ArchitecturePage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
