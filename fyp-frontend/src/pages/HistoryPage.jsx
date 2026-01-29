import { useState, useEffect } from 'react';
import { getHistoryEntries, clearHistory } from '../utils/storage';
import ChatMessage from '../components/ChatMessage';

function HistoryPage() {
  const [entries, setEntries] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'screening', 'chat'
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    const historyEntries = getHistoryEntries();
    setEntries(historyEntries);
  };

  const handleClearHistory = () => {
    const confirmed = window.confirm(
      'Are you sure you want to clear all history? This action cannot be undone.'
    );
    if (confirmed) {
      clearHistory();
      setEntries([]);
      setExpandedId(null);
    }
  };

  const handleToggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const filteredEntries = entries.filter((entry) => {
    if (filter === 'all') return true;
    return entry.type === filter;
  });

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRiskBadgeColor = (risk) => {
    switch (risk) {
      case 'low':
        return 'bg-green-600 text-white';
      case 'medium':
        return 'bg-amber-600 text-white';
      case 'high':
        return 'bg-red-600 text-white';
      default:
        return 'bg-slate-600 text-white';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-teal-400 mb-2">History</h1>
          <p className="text-slate-300">
            View your past screenings and chat sessions
          </p>
        </div>
        {entries.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
          >
            Clear History
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      {entries.length > 0 && (
        <div className="flex gap-2 mb-6 border-b border-slate-700">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 font-medium transition-colors ${
              filter === 'all'
                ? 'text-teal-400 border-b-2 border-teal-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            All ({entries.length})
          </button>
          <button
            onClick={() => setFilter('screening')}
            className={`px-4 py-2 font-medium transition-colors ${
              filter === 'screening'
                ? 'text-teal-400 border-b-2 border-teal-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Screening ({entries.filter(e => e.type === 'screening').length})
          </button>
          <button
            onClick={() => setFilter('chat')}
            className={`px-4 py-2 font-medium transition-colors ${
              filter === 'chat'
                ? 'text-teal-400 border-b-2 border-teal-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Chat ({entries.filter(e => e.type === 'chat').length})
          </button>
        </div>
      )}

      {/* Empty State */}
      {filteredEntries.length === 0 && (
        <div className="bg-slate-800 rounded-lg p-12 border border-slate-700 text-center">
          <div className="text-6xl mb-4">📝</div>
          <h2 className="text-xl font-semibold text-slate-300 mb-2">
            {entries.length === 0
              ? 'No history yet'
              : `No ${filter === 'all' ? '' : filter} entries found`}
          </h2>
          <p className="text-slate-400">
            {entries.length === 0
              ? 'Complete a screening or chat with the agent to see it here.'
              : 'Try selecting a different filter.'}
          </p>
        </div>
      )}

      {/* History Cards */}
      <div className="space-y-4">
        {filteredEntries.map((entry) => (
          <div
            key={entry.id}
            className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden"
          >
            {/* Card Header */}
            <div
              className="p-4 cursor-pointer hover:bg-slate-700/50 transition-colors"
              onClick={() => handleToggleExpand(entry.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        entry.type === 'screening'
                          ? 'bg-teal-600/20 text-teal-300 border border-teal-600/50'
                          : 'bg-blue-600/20 text-blue-300 border border-blue-600/50'
                      }`}
                    >
                      {entry.type === 'screening' ? 'Screening' : 'Chat'}
                    </span>
                    {entry.type === 'screening' && entry.data.depressionRisk && (
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getRiskBadgeColor(
                          entry.data.depressionRisk
                        )}`}
                      >
                        {entry.data.depressionRisk.charAt(0).toUpperCase() +
                          entry.data.depressionRisk.slice(1)}{' '}
                        Risk
                      </span>
                    )}
                    <span className="text-xs text-slate-500">
                      {formatDate(entry.timestamp)}
                    </span>
                  </div>

                  {/* Summary */}
                  <p className="text-slate-300 text-sm">
                    {entry.type === 'screening' ? (
                      <>
                        <span className="font-medium">Emotions:</span>{' '}
                        {entry.data.emotions
                          ?.map((e) => e.charAt(0).toUpperCase() + e.slice(1))
                          .join(', ') || 'None detected'}
                        {' • '}
                        {entry.data.textSnippet || 'No text'}
                      </>
                    ) : (
                      <>
                        <span className="font-medium">Last message:</span>{' '}
                        {entry.data.lastMessage?.substring(0, 100) ||
                          'No messages'}
                        {entry.data.lastMessage?.length > 100 ? '...' : ''}
                        {' • '}
                        {entry.data.messageCount || 0} messages
                      </>
                    )}
                  </p>
                </div>

                {/* Expand/Collapse Icon */}
                <button className="ml-4 text-slate-400 hover:text-slate-300">
                  {expandedId === entry.id ? (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 15l7-7 7 7"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Expanded Details */}
            {expandedId === entry.id && (
              <div className="border-t border-slate-700 p-4 bg-slate-900/50">
                {entry.type === 'screening' ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-teal-300 mb-2">
                        Full Text
                      </h3>
                      <p className="text-slate-300 bg-slate-800 rounded p-3 whitespace-pre-wrap">
                        {entry.data.text || 'No text available'}
                      </p>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-teal-300 mb-2">
                        Analysis Results
                      </h3>
                      <div className="bg-slate-800 rounded p-4 space-y-3">
                        <div>
                          <span className="text-slate-400 text-sm">
                            Detected Emotions:
                          </span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {entry.data.emotions?.map((emotion, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 bg-teal-600/20 text-teal-300 rounded-full text-sm border border-teal-600/50"
                              >
                                {emotion.charAt(0).toUpperCase() +
                                  emotion.slice(1)}
                              </span>
                            )) || (
                              <span className="text-slate-400 text-sm">
                                None detected
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <span className="text-slate-400 text-sm">
                            Depression Risk:
                          </span>
                          <div className="mt-1">
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-semibold ${getRiskBadgeColor(
                                entry.data.depressionRisk
                              )}`}
                            >
                              {entry.data.depressionRisk
                                ? entry.data.depressionRisk
                                    .charAt(0)
                                    .toUpperCase() +
                                  entry.data.depressionRisk.slice(1)
                                : 'Not available'}
                            </span>
                          </div>
                        </div>

                        <div>
                          <span className="text-slate-400 text-sm">
                            Explanation:
                          </span>
                          <p className="text-slate-300 mt-1">
                            {entry.data.explanation || 'No explanation available'}
                          </p>
                        </div>

                        {entry.data.moodData && (
                          <div>
                            <span className="text-slate-400 text-sm">
                              Mood Data:
                            </span>
                            <div className="text-slate-300 mt-1 text-sm">
                              Sleep: {entry.data.moodData.sleep || 'N/A'} / 5,
                              Energy: {entry.data.moodData.energy || 'N/A'} / 5,
                              Appetite:{' '}
                              {entry.data.moodData.appetite || 'N/A'}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-sm font-semibold text-teal-300 mb-3">
                      Chat Messages ({entry.data.messageCount || 0} total)
                    </h3>
                    <div className="bg-slate-800 rounded-lg p-4 max-h-96 overflow-y-auto space-y-3">
                      {entry.data.messages?.map((message, idx) => (
                        <ChatMessage key={idx} message={message} />
                      )) || (
                        <p className="text-slate-400 text-sm">
                          No messages available
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default HistoryPage;
