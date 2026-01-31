import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layout/MainLayout';
import PHQPage from './pages/PHQPage';
import EMAPage from './pages/EMAPage';
import DashboardPage from './pages/DashboardPage';
import ReportPage from './pages/ReportPage';
import HomePage from './pages/HomePage';
import ScreeningPage from './pages/ScreeningPage';
import ChatPage from './pages/ChatPage';
import HistoryPage from './pages/HistoryPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import { checkHealth } from "./api/backend";

/**
 * ProtectedRoute Component
 * Ensures user has given consent before accessing app features
 */
function ProtectedRoute({ element }) {
  const consent = localStorage.getItem('userConsent');
  
  // If no consent given, redirect to consent page
  if (!consent) {
    return <Navigate to="/consent" replace />;
  }
  
  return element;
}

function App() {
  useEffect(() => {
    checkHealth()
      .then((data) => console.log("Backend health:", data))
      .catch((err) => console.error("Backend health error:", err));
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="screening" element={<ScreeningPage />} />
          <Route path="phq" element={<PHQPage />} />
          <Route path="ema" element={<EMAPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="report" element={<ReportPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="admin" element={<AdminDashboardPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
