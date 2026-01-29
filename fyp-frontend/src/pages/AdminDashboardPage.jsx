import { useState, useEffect } from 'react';
import { getFederatedMetrics } from '../utils/api';
import ClientNode from '../components/ClientNode';
import RoundTimeline from '../components/RoundTimeline';
import MetricsChart from '../components/MetricsChart';

function AdminDashboardPage() {
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadMetrics = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getFederatedMetrics();
      setMetrics(data);
    } catch (err) {
      console.error('Error loading metrics:', err);
      setError('Failed to load federated learning metrics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();

    // Auto-refresh every 5 seconds if enabled
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadMetrics();
      }, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const getModelStatusColor = (status) => {
    switch (status) {
      case 'training':
        return 'bg-blue-600';
      case 'idle':
        return 'bg-slate-600';
      case 'error':
        return 'bg-red-600';
      default:
        return 'bg-teal-600';
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (isLoading && !metrics) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <svg className="animate-spin h-8 w-8 text-teal-400 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-slate-300">Loading federated learning metrics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-900/30 border border-red-600 rounded-lg p-6">
          <p className="text-red-200">{error}</p>
          <button
            onClick={loadMetrics}
            className="mt-4 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-teal-400 mb-2">Federated Learning Dashboard</h1>
          <p className="text-slate-300">
            Monitor federated learning clients, training rounds, and model metrics
          </p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="accent-teal-600"
            />
            <span className="text-sm text-slate-300">Auto-refresh</span>
          </label>
          <button
            onClick={loadMetrics}
            disabled={isLoading}
            className="bg-teal-600 hover:bg-teal-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {metrics && (
        <>
          {/* Global Model Status */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 mb-6">
            <h2 className="text-xl font-semibold text-teal-300 mb-4">Global Model Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 rounded-lg p-4">
                <div className="text-sm text-slate-400 mb-1">Status</div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getModelStatusColor(metrics.globalModel.status)}`}></div>
                  <span className="text-slate-200 font-semibold capitalize">
                    {metrics.globalModel.status}
                  </span>
                </div>
              </div>
              <div className="bg-slate-900 rounded-lg p-4">
                <div className="text-sm text-slate-400 mb-1">Current Round</div>
                <div className="text-slate-200 font-semibold text-lg">
                  {metrics.globalModel.currentRound} / {metrics.globalModel.totalRounds}
                </div>
              </div>
              <div className="bg-slate-900 rounded-lg p-4">
                <div className="text-sm text-slate-400 mb-1">Active Clients</div>
                <div className="text-slate-200 font-semibold text-lg">
                  {metrics.globalModel.activeClients} / {metrics.globalModel.totalClients}
                </div>
              </div>
              <div className="bg-slate-900 rounded-lg p-4">
                <div className="text-sm text-slate-400 mb-1">Model Version</div>
                <div className="text-slate-200 font-semibold">{metrics.globalModel.modelVersion}</div>
              </div>
            </div>
            <div className="mt-4 text-sm text-slate-400">
              Last aggregated: {formatTime(metrics.globalModel.aggregatedAt)}
            </div>
          </div>

          {/* Clients Grid */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-teal-300 mb-4">
              Client Nodes ({metrics.clients.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {metrics.clients.map((client) => (
                <ClientNode key={client.id} client={client} />
              ))}
            </div>
          </div>

          {/* Metrics Chart */}
          <div className="mb-6">
            <MetricsChart rounds={metrics.rounds} />
          </div>

          {/* Round Timeline */}
          <div>
            <RoundTimeline rounds={metrics.rounds} />
          </div>
        </>
      )}
    </div>
  );
}

export default AdminDashboardPage;
