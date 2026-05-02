import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchDashboardSummary, getOrCreateToken } from '../api/backend';

function ProgressPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const token = await getOrCreateToken();
        const dashboard = await fetchDashboardSummary(token);
        setData(dashboard);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Unable to load your progress data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const phqCompleted = data?.phq && data.phq.length > 0;
  const emaCount = data?.ema ? data.ema.length : 0;
  const latestPhq = data?.phq?.[data.phq.length - 1];
  const firstPhq = data?.phq?.[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <h1 className="text-4xl sm:text-5xl font-bold text-emerald-900 mb-2">Your Progress</h1>
        <p className="text-lg text-gray-700 mb-12">Track your mental health journey at a glance</p>

        {/* Main Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* PHQ Status */}
          <div className={`rounded-xl p-8 border-2 ${
            phqCompleted 
              ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-white shadow-md' 
              : 'border-gray-200 bg-white shadow-sm'
          }`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-2">
                  PHQ-8 Baseline Assessment
                </p>
                {phqCompleted ? (
                  <div>
                    <p className="text-4xl font-bold text-emerald-600 mb-2">✓ Completed</p>
                    {latestPhq && (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-700">
                          Latest: <span className="font-bold">{latestPhq.totalScore}</span> / 24
                        </p>
                        {firstPhq && firstPhq !== latestPhq && (
                          <p className="text-sm text-gray-700">
                            First: <span className="font-bold">{firstPhq.totalScore}</span> / 24
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-gray-400">Not Started</p>
                )}
              </div>
              <span className="text-4xl">{phqCompleted ? '✓' : '○'}</span>
            </div>

            {!phqCompleted && (
              <Link
                to="/phq"
                className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
              >
                Start Assessment →
              </Link>
            )}
          </div>

          {/* EMA Status */}
          <div className={`rounded-xl p-8 border-2 ${
            emaCount > 0
              ? 'border-blue-300 bg-gradient-to-br from-blue-50 to-white shadow-md'
              : 'border-gray-200 bg-white shadow-sm'
          }`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-2">
                  Daily Check-ins (EMA)
                </p>
                <p className="text-4xl font-bold text-blue-600 mb-2">
                  {emaCount}
                </p>
                <p className="text-sm text-gray-700">
                  {emaCount === 0 && 'submissions made (one per day)'}
                  {emaCount === 1 && 'day submitted'}
                  {emaCount > 1 && 'days submitted'}
                </p>
              </div>
              <span className="text-4xl">{emaCount > 0 ? '📊' : '○'}</span>
            </div>

            <Link
              to="/ema"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
            >
              Go to Check-in →
            </Link>
          </div>
        </div>

        {/* What to Do Next */}
        <div className="bg-white rounded-xl border border-emerald-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-emerald-900 mb-6">Next Steps</h2>
          
          <div className="space-y-4">
            {!phqCompleted && (
              <div className="flex gap-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <span className="text-2xl flex-shrink-0">1️⃣</span>
                <div className="flex-1">
                  <p className="font-semibold text-amber-900 mb-2">Complete Your Baseline Assessment</p>
                  <p className="text-sm text-amber-800 mb-3">
                    Start with the PHQ-8 to establish how you're feeling today. This takes only 2-3 minutes.
                  </p>
                  <Link
                    to="/phq"
                    className="inline-block bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                  >
                    Start PHQ-8 →
                  </Link>
                </div>
              </div>
            )}

            {phqCompleted && emaCount === 0 && (
              <div className="flex gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <span className="text-2xl flex-shrink-0">2️⃣</span>
                <div className="flex-1">
                  <p className="font-semibold text-blue-900 mb-2">Complete Your First Daily Check-in</p>
                  <p className="text-sm text-blue-800 mb-3">
                    Take a quick 1-2 minute assessment to track how you're feeling today. You can do this every day.
                  </p>
                  <Link
                    to="/ema"
                    className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                  >
                    Start Daily Check-in →
                  </Link>
                </div>
              </div>
            )}

            {phqCompleted && emaCount > 0 && (
              <div className="flex gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <span className="text-2xl flex-shrink-0">✓</span>
                <div className="flex-1">
                  <p className="font-semibold text-green-900 mb-2">Great! You're tracking your progress</p>
                  <p className="text-sm text-green-800 mb-3">
                    Keep up with your daily check-ins and view your trends on the dashboard.
                  </p>
                </div>
              </div>
            )}

            {phqCompleted && (
              <div className="flex gap-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <span className="text-2xl flex-shrink-0">3️⃣</span>
                <div className="flex-1">
                  <p className="font-semibold text-purple-900 mb-2">View Your Dashboard & Generate Report</p>
                  <p className="text-sm text-purple-800 mb-3">
                    See visualizations of your data and download a comprehensive summary whenever you're ready.
                  </p>
                  <div className="flex gap-2">
                    <Link
                      to="/dashboard"
                      className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                    >
                      Dashboard →
                    </Link>
                    <Link
                      to="/report"
                      className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                    >
                      Report →
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        {phqCompleted && emaCount > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-emerald-900 mb-6">Your Stats</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="text-center">
                <p className="text-4xl font-bold text-emerald-600 mb-2">{data?.phq?.length || 0}</p>
                <p className="text-gray-700">PHQ Assessments Completed</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold text-emerald-600 mb-2">{emaCount}</p>
                <p className="text-gray-700">Daily Check-ins Submitted</p>
              </div>
            </div>
          </div>
        )}

        {/* Other Tools */}
        <div className="bg-white rounded-xl border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-emerald-900 mb-6">Other Tools Available</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              to="/screening"
              className="group p-6 bg-gradient-to-br from-blue-50 to-white rounded-lg border border-blue-200 hover:border-blue-400 hover:shadow-md transition-all"
            >
              <h3 className="text-lg font-bold text-blue-900 mb-2 group-hover:text-blue-700">📄 Text Screening</h3>
              <p className="text-sm text-gray-700">Analyze your text for emotions and mood indicators</p>
            </Link>

            <Link
              to="/chat"
              className="group p-6 bg-gradient-to-br from-green-50 to-white rounded-lg border border-green-200 hover:border-green-400 hover:shadow-md transition-all"
            >
              <h3 className="text-lg font-bold text-green-900 mb-2 group-hover:text-green-700">💬 Chat with AI</h3>
              <p className="text-sm text-gray-700">Get supportive feedback and guidance anytime</p>
            </Link>

            <Link
              to="/history"
              className="group p-6 bg-gradient-to-br from-purple-50 to-white rounded-lg border border-purple-200 hover:border-purple-400 hover:shadow-md transition-all"
            >
              <h3 className="text-lg font-bold text-purple-900 mb-2 group-hover:text-purple-700">📚 View History</h3>
              <p className="text-sm text-gray-700">Review your past text screenings and chats</p>
            </Link>

            <Link
              to="/guide"
              className="group p-6 bg-gradient-to-br from-amber-50 to-white rounded-lg border border-amber-200 hover:border-amber-400 hover:shadow-md transition-all"
            >
              <h3 className="text-lg font-bold text-amber-900 mb-2 group-hover:text-amber-700">📖 User Guide</h3>
              <p className="text-sm text-gray-700">Learn how to use all features</p>
            </Link>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-8">
          <h2 className="text-xl font-bold text-blue-900 mb-4">💡 Tips</h2>
          <ul className="space-y-3 text-gray-700">
            <li className="flex gap-3">
              <span>•</span>
              <span>Check back daily to complete your EMA check-in for the most accurate tracking</span>
            </li>
            <li className="flex gap-3">
              <span>•</span>
              <span>Visit the dashboard regularly to see trends emerging in your data</span>
            </li>
            <li className="flex gap-3">
              <span>•</span>
              <span>Use the text screening or chat whenever you need additional support between assessments</span>
            </li>
            <li className="flex gap-3">
              <span>•</span>
              <span>Remember: This tool complements professional help—it's not a replacement for therapy or medical care</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default ProgressPage;
