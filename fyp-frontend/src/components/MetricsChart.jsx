/**
 * MetricsChart component - Simple visualization of loss and accuracy over rounds
 * @param {Array} rounds - Array of round objects
 */
function MetricsChart({ rounds }) {
  if (!rounds || rounds.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 text-center">
        <p className="text-slate-400">No metrics data available</p>
      </div>
    );
  }

  // Prepare data for visualization
  const maxLoss = Math.max(...rounds.map(r => r.loss));
  const minLoss = Math.min(...rounds.map(r => r.loss));
  const maxAcc = Math.max(...rounds.map(r => r.accuracy));
  const minAcc = Math.min(...rounds.map(r => r.accuracy));

  const chartHeight = 200;
  const chartWidth = 100;
  const padding = 20;

  const getLossY = (loss) => {
    const range = maxLoss - minLoss;
    if (range === 0) return padding;
    return padding + ((loss - minLoss) / range) * (chartHeight - 2 * padding);
  };

  const getAccY = (acc) => {
    const range = maxAcc - minAcc;
    if (range === 0) return padding;
    return padding + ((maxAcc - acc) / range) * (chartHeight - 2 * padding);
  };

  const getX = (index) => {
    return padding + (index / (rounds.length - 1 || 1)) * (chartWidth - 2 * padding);
  };

  // Generate path for loss line
  const lossPath = rounds
    .map((round, index) => {
      const x = getX(index);
      const y = getLossY(round.loss);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  // Generate path for accuracy line
  const accPath = rounds
    .map((round, index) => {
      const x = getX(index);
      const y = getAccY(round.accuracy);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <h3 className="text-lg font-semibold text-teal-300 mb-4">Metrics Over Time</h3>
      
      <div className="relative">
        <svg
          viewBox={`0 0 ${chartWidth + 2 * padding} ${chartHeight + 2 * padding}`}
          className="w-full h-64"
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padding + ratio * (chartHeight - 2 * padding);
            return (
              <line
                key={ratio}
                x1={padding}
                y1={y}
                x2={chartWidth - padding}
                y2={y}
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-slate-700"
              />
            );
          })}

          {/* Loss line */}
          <path
            d={lossPath}
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Accuracy line */}
          <path
            d={accPath}
            fill="none"
            stroke="#22c55e"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points for loss */}
          {rounds.map((round, index) => {
            const x = getX(index);
            const y = getLossY(round.loss);
            return (
              <circle
                key={`loss-${index}`}
                cx={x}
                cy={y}
                r="2"
                fill="#ef4444"
              />
            );
          })}

          {/* Data points for accuracy */}
          {rounds.map((round, index) => {
            const x = getX(index);
            const y = getAccY(round.accuracy);
            return (
              <circle
                key={`acc-${index}`}
                cx={x}
                cy={y}
                r="2"
                fill="#22c55e"
              />
            );
          })}
        </svg>

        {/* Legend */}
        <div className="flex gap-4 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-red-500"></div>
            <span className="text-slate-300">Loss</span>
            <span className="text-slate-500">
              ({minLoss.toFixed(4)} - {maxLoss.toFixed(4)})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-green-500"></div>
            <span className="text-slate-300">Accuracy</span>
            <span className="text-slate-500">
              ({(minAcc * 100).toFixed(1)}% - {(maxAcc * 100).toFixed(1)}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MetricsChart;

