import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layout/MainLayout';
import PHQPage from './pages/PHQPage';
import EMAPage from './pages/EMAPage';
import DashboardPage from './pages/DashboardPage';
import ReportPage from './pages/ReportPage';
import HomePage from './pages/HomePage';
import GuidePage from './pages/GuidePage';
import ProgressPage from './pages/ProgressPage';
import ScreeningPage from './pages/ScreeningPage';
import ChatPage from './pages/ChatPage';
import HistoryPage from './pages/HistoryPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import {
  bootstrapSession,
  checkHealth,
  restoreSession,
  startNewSession,
  SessionExpiredError,
} from "./api/backend";
import { useEffect, useRef, useState } from "react";


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
  const hasInitialized = useRef(false);
  const [sessionNotice, setSessionNotice] = useState(null);
  const [recoveryCodeInput, setRecoveryCodeInput] = useState("");

  const showRestoreNotice = (message) => {
    setSessionNotice({ kind: "restore", message });
  };

  useEffect(() => {
    localStorage.removeItem("sessionRestoreRequired"); 

    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const handleRestoreRequired = (event) => {
      showRestoreNotice(
        event?.detail?.message || "Your session expired. Restore it with your recovery code or start a new one."
      );
    };

    const handleRecoveryCode = (event) => {
      const recoveryCode = event?.detail?.recoveryCode;
      if (recoveryCode) {
        setSessionNotice({ kind: "recovery", recoveryCode });
      }
    };

    window.addEventListener("session:restore-required", handleRestoreRequired);
    window.addEventListener("session:recovery-code", handleRecoveryCode);

    bootstrapSession()
      .then((result) => {
        console.log("Anonymous token:", result.token);
        if (result.recoveryCode) {
          setSessionNotice({ kind: "recovery", recoveryCode: result.recoveryCode });
        }
      })
      .catch((err) => {
        if (err instanceof SessionExpiredError || err?.code === "SESSION_EXPIRED") {
          showRestoreNotice("Your session expired. Restore it with your recovery code or start a new one.");
          return;
        }
        console.error("Token creation error:", err);
      })

    checkHealth()
      .then((data) => console.log("Backend health:", data))
      .catch((err) => console.error("Backend health error:", err));

    return () => {
      window.removeEventListener("session:restore-required", handleRestoreRequired);
      window.removeEventListener("session:recovery-code", handleRecoveryCode);
    };

  }, []);

  const handleRestoreSession = async () => {
    try {
      const token = await restoreSession(recoveryCodeInput.trim());
      console.log("Restored token:", token);
      setSessionNotice(null);
      setRecoveryCodeInput("");
    } catch (err) {
      console.error("Session restore error:", err);
      showRestoreNotice("The recovery code was not accepted. Check it and try again.");
    }
  };

  const handleStartNewSession = async () => {
    try {
      const result = await startNewSession();
      console.log("New session token:", result.token);
      setSessionNotice(
        result.recoveryCode
          ? { kind: "recovery", recoveryCode: result.recoveryCode }
          : null
      );
      setRecoveryCodeInput("");
    } catch (err) {
      console.error("New session error:", err);
    }
  };

  const downloadRecoveryCode = (code) => {
  const content = `Your Recovery Code\n\n${code}\n\nKeep this safe. It is required to restore your session.`;

  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "recovery-code.txt";
  a.click();

  URL.revokeObjectURL(url);
};

  return (
    <>
      {sessionNotice?.kind === "recovery" && (
        <div className="border-b border-amber-300 bg-amber-50 text-slate-900">
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold text-amber-900">Save this recovery code now</p>
              <p className="text-sm text-slate-700">It will be shown once. Keep it safe so you can restore this session.</p>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <code className="rounded-lg bg-slate-900 px-4 py-2 text-amber-200 tracking-[0.2em] text-sm font-semibold">
                {sessionNotice.recoveryCode}
              </code>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(sessionNotice.recoveryCode)}
                className="rounded-lg border border-amber-400 px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
              >
                Copy
              </button>

                <button
                  type="button"
                  onClick={() => downloadRecoveryCode(sessionNotice.recoveryCode)}
                  className="rounded-lg border border-amber-400 px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
                >
                  Download
                </button>

              <button
                type="button"
                onClick={() => setSessionNotice(null)}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
              >
                I&apos;ve saved it
              </button>

            

            </div>
          </div>
        </div>
      )}

      {sessionNotice?.kind === "restore" && (
        <div className="border-b border-sky-300 bg-sky-50 text-slate-900">
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="font-semibold text-sky-900">Restore your previous session</p>
              <p className="text-sm text-slate-700">Enter your recovery code to bring back the existing session and its saved data. Or start a fresh anonymous session if you do not need the old one.</p>
            </div>
            <div className="flex flex-col gap-3 lg:min-w-[32rem]">
              <input
                value={recoveryCodeInput}
                onChange={(event) => setRecoveryCodeInput(event.target.value)}
                placeholder="Recovery code"
                className="w-full rounded-lg border border-sky-200 bg-white px-4 py-2 text-sm outline-none focus:border-sky-500"
              />
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleRestoreSession}
                  className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
                >
                  Restore session
                </button>
                <button
                  type="button"
                  onClick={handleStartNewSession}
                  className="rounded-lg border border-sky-300 px-4 py-2 text-sm font-semibold text-sky-900 hover:bg-sky-100"
                >
                  Start new session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<HomePage />} />
            <Route path="guide" element={<GuidePage />} />
            <Route path="progress" element={<ProgressPage />} />
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
    </>
  );
}



export default App;
