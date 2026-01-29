/**
 * RoundTimeline component - Visualizes federated learning training rounds
 * @param {Array} rounds - Array of round objects with round number, metrics, etc.
 */
function RoundTimeline({ rounds }) {
  if (!rounds || rounds.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 text-center">
        <p className="text-slate-400">No training rounds available</p>
      </div>
    );
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Find min/max for scaling
  const losses = rounds.map(r => r.loss);
  const accuracies = rounds.map(r => r.accuracy);
  const minLoss = Math.min(...losses);
  const maxLoss = Math.max(...losses);
  const minAcc = Math.min(...accuracies);
  const maxAcc = Math.max(...accuracies);

  const getLossPercentage = (loss) => {
    const range = maxLoss - minLoss;
    if (range === 0) return 50;
    return ((maxLoss - loss) / range) * 100;
  };

  const getAccuracyPercentage = (acc) => {
    const range = maxAcc - minAcc;
    if (range === 0) return 50;
    return ((acc - minAcc) / range) * 100;
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <h3 className="text-lg font-semibold text-teal-300 mb-4">Training Rounds Timeline</h3>
      
      <div className="space-y-4">
        {rounds.map((round, index) => (
          <div key={round.round} className="relative">
            {/* Round Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm">
                  {round.round}
                </div>
                <div>
                  <span className="text-slate-300 font-medium">Round {round.round}</span>
                  <span className="text-slate-500 text-sm ml-2">{formatTime(round.timestamp)}</span>
                </div>
              </div>
              <div className="text-sm text-slate-400">
                {round.clientsParticipated} clients • {round.trainingTime}s
              </div>
            </div>

            {/* Metrics Bars */}
            <div className="ml-11 space-y-2">
              {/* Loss Bar */}
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Loss</span>
                  <span className="text-slate-300">{round.loss.toFixed(4)}</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full transition-all"
                    style={{ width: `${getLossPercentage(round.loss)}%` }}
                  ></div>
                </div>
              </div>

              {/* Accuracy Bar */}
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Accuracy</span>
                  <span className="text-slate-300">{(round.accuracy * 100).toFixed(2)}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${getAccuracyPercentage(round.accuracy)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Connector Line (except for last item) */}
            {index < rounds.length - 1 && (
              <div className="absolute left-4 top-12 w-0.5 h-4 bg-slate-600"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default RoundTimeline;

