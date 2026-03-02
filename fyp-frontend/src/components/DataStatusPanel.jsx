import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchDashboardSummary, getOrCreateToken } from '../api/backend';

/**
 * DataStatusPanel Component
 * Shows user's current assessment status and data completion
 * - PHQ baseline completion
 * - EMA submissions count
 * - Quick links to next steps
 */
export default function DataStatusPanel() {
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
        console.error('Failed to load data status:', err);
        setError('Unable to load your data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-slate-700 rounded w-40 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-slate-700 rounded w-full"></div>
          <div className="h-4 bg-slate-700 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  const phqCompleted = data?.phq && data.phq.length > 0;
  const emaCount = data?.ema ? data.ema.length : 0;
  const latestPhq = data?.phq?.[data.phq.length - 1];

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-teal-400 mb-1">Your Progress</h2>
        <p className="text-sm text-slate-400">Current assessment status</p>
      </div>

      {/* Status Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* PHQ Status */}
        <div className={`rounded-lg p-4 border-2 ${
          phqCompleted 
            ? 'border-green-500/50 bg-green-900/10' 
            : 'border-yellow-500/50 bg-yellow-900/10'
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-300 mb-1">
                Baseline Assessment (PHQ-8)
              </p>
              {phqCompleted ? (
                <div>
                  <p className="text-2xl font-bold text-green-400">✓ Completed</p>
                  {latestPhq && (
                    <p className="text-xs text-slate-400 mt-1">
                      Latest score: <span className="text-slate-300 font-semibold">{latestPhq.totalScore}</span> / 24
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-lg font-semibold text-yellow-400">Not Started</p>
              )}
            </div>
            {phqCompleted && (
              <span className="text-2xl">📋</span>
            )}
          </div>
        </div>

        {/* EMA Status */}
        <div className={`rounded-lg p-4 border-2 ${
          emaCount > 0
            ? 'border-blue-500/50 bg-blue-900/10'
            : 'border-slate-600/50 bg-slate-900/20'
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-300 mb-1">
                Daily Check-ins (EMA)
              </p>
              <p className="text-2xl font-bold text-blue-400">
                {emaCount} {emaCount === 1 ? 'day' : 'days'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                One per day submission
              </p>
            </div>
            <span className="text-2xl">📊</span>
          </div>
        </div>
      </div>

      {/* Recommended Next Steps */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-slate-300">Recommended Next Steps:</p>

        <div className="space-y-2">
          {!phqCompleted && (
            <Link
              to="/phq"
              className="flex items-center gap-3 p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors border border-slate-600 hover:border-teal-500/50"
            >
              <span className="text-lg">1️⃣</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-200">Complete Baseline Assessment</p>
                <p className="text-xs text-slate-400">Fill out the PHQ-8 questionnaire</p>
              </div>
              <span className="text-xl">→</span>
            </Link>
          )}

          {phqCompleted && (
            <Link
              to="/ema"
              className="flex items-center gap-3 p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors border border-slate-600 hover:border-teal-500/50"
            >
              <span className="text-lg">2️⃣</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-200">Complete Daily Check-in</p>
                <p className="text-xs text-slate-400">Fill out the EMA (one per day)</p>
              </div>
              <span className="text-xl">→</span>
            </Link>
          )}

          {phqCompleted && (
            <Link
              to="/dashboard"
              className="flex items-center gap-3 p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors border border-slate-600 hover:border-teal-500/50"
            >
              <span className="text-lg">3️⃣</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-200">View Your Dashboard</p>
                <p className="text-xs text-slate-400">See charts and trends of your data</p>
              </div>
              <span className="text-xl">→</span>
            </Link>
          )}

          {phqCompleted && emaCount > 0 && (
            <Link
              to="/report"
              className="flex items-center gap-3 p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors border border-slate-600 hover:border-teal-500/50"
            >
              <span className="text-lg">4️⃣</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-200">Generate Report</p>
                <p className="text-xs text-slate-400">Download your symptom monitoring summary</p>
              </div>
              <span className="text-xl">→</span>
            </Link>
          )}
        </div>
      </div>

      {/* Info Note */}
      <div className="mt-6 p-3 bg-blue-900/20 border border-blue-700 rounded">
        <p className="text-xs text-blue-300">
          💡 <strong>Tip:</strong> You can take multiple PHQ assessments to track changes over time. 
          Each date only allows one EMA submission (the one-per-day limit).
        </p>
      </div>
    </div>
  );
}
