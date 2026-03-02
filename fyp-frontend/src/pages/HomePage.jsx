import { Link } from 'react-router-dom';

function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-green-50 to-white">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center space-y-8">
          {/* Logo & Title */}
          <div className="space-y-4">
            <div className="flex justify-center mb-6">
              <div className="text-6xl">🌿</div>
            </div>
            <h1 className="text-5xl sm:text-6xl font-bold text-emerald-900">
              ConfidMind
            </h1>
            <p className="text-xl text-emerald-700">
              Your personal mental health companion
            </p>
          </div>

          {/* Tagline */}
          <div className="space-y-3 max-w-2xl mx-auto">
            <p className="text-lg text-gray-700">
              Track your mood, understand your patterns, and take care of your mental wellbeing with privacy-preserving AI.
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Link
              to="/phq"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 px-8 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Start Assessment
            </Link>
            <Link
              to="/guide"
              className="border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-semibold py-4 px-8 rounded-lg transition-colors duration-200"
            >
              Learn How to Use
            </Link>
          </div>
        </div>
      </div>

      {/* What Is This Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl p-8 sm:p-12 shadow-sm border border-emerald-100">
          <h2 className="text-3xl font-bold text-emerald-900 mb-6">What is ConfidMind?</h2>
          <p className="text-lg text-gray-700 leading-relaxed">
            ConfidMind is a mental health monitoring tool that helps you track your mood and wellbeing over time. 
            It uses AI-powered analysis to detect emotions in your text and provide supportive insights. 
            Your data stays private and is never centralized all analysis respects your privacy with federated learning technology.
          </p>
        </div>
      </div>

      {/* Safety Disclaimer */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-6 sm:p-8">
          <div className="flex gap-4">
            <div className="text-3xl">⚠️</div>
            <div>
              <h3 className="text-lg font-bold text-amber-900 mb-2">Important Disclaimer</h3>
              <p className="text-amber-900/80">
                This is not a diagnostic tool and cannot confirm whether you have depression or any mental health condition. 
                It is designed to provide general indicators that may suggest you could benefit from speaking with a qualified 
                mental health professional. If you are experiencing distress or in crisis, please contact a mental health professional 
                or emergency services immediately.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          <Link
            to="/progress"
            className="group p-6 bg-white rounded-xl border border-emerald-100 hover:border-emerald-300 hover:shadow-md transition-all"
          >
            <div className="text-4xl mb-3">📊</div>
            <h3 className="font-semibold text-emerald-900 group-hover:text-emerald-700">Your Progress</h3>
            <p className="text-sm text-gray-600 mt-2">View your assessment status</p>
          </Link>

          <Link
            to="/chat"
            className="group p-6 bg-white rounded-xl border border-emerald-100 hover:border-emerald-300 hover:shadow-md transition-all"
          >
            <div className="text-4xl mb-3">💬</div>
            <h3 className="font-semibold text-emerald-900 group-hover:text-emerald-700">Chat with AI</h3>
            <p className="text-sm text-gray-600 mt-2">Get supportive feedback anytime</p>
          </Link>

          <Link
            to="/screening"
            className="group p-6 bg-white rounded-xl border border-emerald-100 hover:border-emerald-300 hover:shadow-md transition-all"
          >
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="font-semibold text-emerald-900 group-hover:text-emerald-700">Text Analysis</h3>
            <p className="text-sm text-gray-600 mt-2">Analyze your text for emotions</p>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-16 text-center text-gray-600 py-8">
        <p className="text-sm">
          Questions? Check out the <Link to="/guide" className="text-emerald-600 hover:text-emerald-700 font-semibold">User Guide</Link>
        </p>
      </div>
    </div>
  );
}

export default HomePage;

