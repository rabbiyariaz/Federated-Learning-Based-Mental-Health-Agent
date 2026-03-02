import { Link, Outlet, useLocation } from 'react-router-dom';

function MainLayout() {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      {/* Navbar */}
      <nav className="bg-white border-b border-emerald-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo/Brand */}
            <Link to="/" className="flex items-center gap-3 text-xl font-bold text-emerald-700 hover:text-emerald-800 transition-colors">
              <span className="text-2xl">🌿</span>
              <span>ConfidMind</span>
            </Link>

            {/* Navigation Links */}
            <div className="flex space-x-1">
              <Link
                to="/"
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/')
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'
                }`}
              >
                Home
              </Link>
              <Link
                to="/guide"
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/guide')
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'
                }`}
              >
                Guide
              </Link>
              <Link
                to="/progress"
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/progress')
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'
                }`}
              >
                Progress
              </Link>
              <Link
                to="/phq"
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/phq')
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'
                }`}
              >
                PHQ-8
              </Link>
              <Link
                to="/ema"
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/ema')
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'
                }`}
              >
                Check-in
              </Link>
              <Link
                to="/dashboard"
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/dashboard')
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/report"
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/report')
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'
                }`}
              >
                Report
              </Link>
              <Link
                to="/chat"
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/chat')
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'
                }`}
              >
                Chat
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-emerald-50 border-t border-emerald-100 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-700">
            <span className="font-semibold text-amber-700">⚠️ Important:</span> This is a prototype for research purposes. 
            It is not a replacement for professional mental health care. If you are in crisis, please contact a mental health professional or emergency services.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default MainLayout;

