import { Link, Outlet, useLocation } from 'react-router-dom';

function MainLayout() {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Navbar */}
      <nav className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo/Brand */}
            <Link to="/" className="flex items-center gap-3 text-xl font-semibold text-teal-400 hover:text-teal-300 transition-colors">
              <img 
                src="/logo.png" 
                alt="ConfidMind Logo" 
                className="h-8 w-8 object-contain"
              />
              <span>ConfidMind</span>
            </Link>

            {/* Navigation Links */}
            <div className="flex space-x-1">
              <Link
                to="/"
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/')
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                Home
              </Link>
              <Link
                to="/screening"
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/screening')
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                Screening
              </Link>
              <Link
                to="/chat"
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/chat')
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                Chat
              </Link>
              <Link
                to="/history"
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/history')
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                History
              </Link>
              <Link
                to="/admin"
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/admin')
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                Admin Dashboard
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
      <footer className="bg-slate-800 border-t border-slate-700 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-slate-400">
            <span className="font-semibold text-amber-500">⚠️ Important:</span> This is a prototype for research purposes. 
            It is not a replacement for professional mental health care. If you are in crisis, please contact a mental health professional or emergency services.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default MainLayout;

