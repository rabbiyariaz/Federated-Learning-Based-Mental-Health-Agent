import { Link } from 'react-router-dom';

function GuidePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-emerald-900 mb-4">
            How to Use ConfidMind
          </h1>
          <p className="text-lg text-gray-700">
            A simple guide to get the most out of your mental health journey with ConfidMind.
          </p>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {/* Assessment Features */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-emerald-900 mb-6">📝 Assessment Features</h2>

            {/* PHQ-8 */}
            <div className="bg-white p-6 rounded-xl border border-emerald-100 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-xl font-bold text-emerald-800 mb-3">PHQ-8 Baseline Assessment</h3>
              <p className="text-gray-700 mb-4">
                Complete an 8-question assessment to establish your baseline mood. This takes about 2-3 minutes.
              </p>
              <div className="bg-emerald-50 p-4 rounded-lg mb-4 border border-emerald-200">
                <p className="text-sm font-semibold text-emerald-900 mb-2">✓ What it does:</p>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li>• Measures your mood and symptoms</li>
                  <li>• Can be taken multiple times to track changes</li>
                  <li>• Your responses are saved for future comparison</li>
                </ul>
              </div>
              <Link
                to="/phq"
                className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
              >
                Start PHQ-8 →
              </Link>
            </div>

            {/* EMA Daily Check-in */}
            <div className="bg-white p-6 rounded-xl border border-emerald-100 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-xl font-bold text-emerald-800 mb-3">💭 Daily Check-in (EMA)</h3>
              <p className="text-gray-700 mb-4">
                A quick 1-2 minute daily assessment to track your mood patterns. One submission per day.
              </p>
              <div className="bg-emerald-50 p-4 rounded-lg mb-4 border border-emerald-200">
                <p className="text-sm font-semibold text-emerald-900 mb-2">✓ What it does:</p>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li>• Captures how you're feeling today</li>
                  <li>• Tracks mood, energy, sleep, and thoughts</li>
                  <li>• Helps identify patterns over time</li>
                </ul>
              </div>
              <Link
                to="/ema"
                className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
              >
                Go to Daily Check-in →
              </Link>
            </div>
          </div>

          {/* Analysis & Insights */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-emerald-900 mb-6">🧠 AI Analysis & Monitoring</h2>

            {/* Text Screening */}
            <div className="bg-white p-6 rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-xl font-bold text-blue-800 mb-3">📄 Text Screening</h3>
              <p className="text-gray-700 mb-4">
                Paste a journal entry or any text to get AI analysis of emotions and mood indicators.
              </p>
              <div className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-200">
                <p className="text-sm font-semibold text-blue-900 mb-2">✓ What it does:</p>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li>• Detects emotions using AI models</li>
                  <li>• Estimates mood risk indicators</li>
                  <li>• Saves results to your history</li>
                </ul>
              </div>
              <Link
                to="/screening"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
              >
                Go to Screening →
              </Link>
            </div>

            {/* Chat with AI */}
            <div className="bg-white p-6 rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-xl font-bold text-blue-800 mb-3">💬 Chat with AI Agent</h3>
              <p className="text-gray-700 mb-4">
                Have a supportive conversation anytime. Get psychoeducational feedback and coping strategies.
              </p>
              <div className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-200">
                <p className="text-sm font-semibold text-blue-900 mb-2">✓ What it does:</p>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li>• Provides supportive conversation</li>
                  <li>• Offers psychoeducational resources</li>
                  <li>• Available anytime you need support</li>
                </ul>
              </div>
              <Link
                to="/chat"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
              >
                Start Chat →
              </Link>
            </div>
          </div>
        </div>

        {/* Recommended Journey */}
        <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-2xl p-8 sm:p-12 border border-emerald-200 mb-16">
          <h2 className="text-3xl font-bold text-emerald-900 mb-8">🎯 Recommended User Journey</h2>

          <div className="space-y-6">
            {[
              {
                step: 1,
                title: "Start with PHQ-8",
                description: "Take the baseline assessment to establish how you're feeling today. This is your starting point.",
                time: "~3 minutes"
              },
              {
                step: 2,
                title: "Daily Check-ins",
                description: "Each day, complete a quick EMA check-in to track your mood. Regular tracking helps identify patterns.",
                time: "~2 minutes per day"
              },
              {
                step: 3,
                title: "View Your Dashboard",
                description: "See visualizations of your EMA data and PHQ history. Watch trends emerge over time.",
                time: "Anytime"
              },
              {
                step: 4,
                title: "Generate a Report",
                description: "Download a comprehensive summary of your mood monitoring and mental health insights.",
                time: "Anytime after data collection"
              },
              {
                step: 5,
                title: "Use Chat & Screening",
                description: "Whenever you need support, use the text screening or chat with the AI agent for insights and guidance.",
                time: "Anytime"
              }
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-emerald-600 text-white font-bold">
                    {item.step}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-emerald-900">{item.title}</h3>
                  <p className="text-gray-700 mt-1">{item.description}</p>
                  <p className="text-sm text-gray-500 mt-2">⏱️ {item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Data & Insights Section */}
        <div className="bg-white rounded-2xl p-8 sm:p-12 border border-emerald-100 shadow-sm mb-16">
          <h2 className="text-2xl font-bold text-emerald-900 mb-6">📊 Viewing Your Data</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-bold text-emerald-800 mb-3">🎯 Dashboard</h3>
              <p className="text-gray-700">
                See all your EMA submissions displayed as charts and graphs. Track mood, energy, sleep, and thought patterns over time. 
                The dashboard updates automatically as you add more data.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-emerald-800 mb-3">📋 Report</h3>
              <p className="text-gray-700">
                Generate a downloadable text report summarizing your latest PHQ score, 7-day mood trends, clinical interpretation, 
                and completion statistics. Perfect for sharing with healthcare providers.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-emerald-800 mb-3">📈 Progress Tracking</h3>
              <p className="text-gray-700">
                View your assessment completion status, latest PHQ score, number of daily check-ins, and overall progress at a glance 
                on your Progress page.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-emerald-800 mb-3">📚 History</h3>
              <p className="text-gray-700">
                Review all your past text screening and chat interactions. Keep track of insights and patterns you've discovered over time.
              </p>
            </div>
          </div>
        </div>

        {/* Tips Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 mb-12">
          <h2 className="text-2xl font-bold text-blue-900 mb-6">💡 Tips for Best Results</h2>
          <ul className="space-y-4 text-gray-700">
            <li className="flex gap-3">
              <span className="text-xl">✓</span>
              <span><strong>Be honest:</strong> Accurate responses help you get meaningful insights.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-xl">✓</span>
              <span><strong>Stay consistent:</strong> Daily check-ins are most valuable when done regularly.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-xl">✓</span>
              <span><strong>Use the tools:</strong> Try screening your text and chatting when you need support between assessments.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-xl">✓</span>
              <span><strong>Review trends:</strong> Look at your dashboard regularly to notice patterns and improvements.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-xl">✓</span>
              <span><strong>Seek help:</strong> If you're struggling, reach out to a mental health professional—this app is a tool, not a replacement for care.</span>
            </li>
          </ul>
        </div>

        {/* CTA Button */}
        <div className="text-center">
          <Link
            to="/"
            className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 px-8 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default GuidePage;
