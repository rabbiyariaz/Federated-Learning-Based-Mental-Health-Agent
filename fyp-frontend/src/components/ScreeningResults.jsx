/**
 * ScreeningResults component - Displays analysis results
 * @param {Object} results - Results object with emotions, risk, and explanation
 */
function ScreeningResults({ results }) {
  if (!results) return null;

  const { emotions, risk, explanation } = results;

  // Risk level styling
  const riskStyles = {
    low: {
      bg: 'bg-green-900/30',
      border: 'border-green-600',
      text: 'text-green-400',
      label: 'Low Risk',
    },
    medium: {
      bg: 'bg-amber-900/30',
      border: 'border-amber-600',
      text: 'text-amber-400',
      label: 'Medium Risk',
    },
    high: {
      bg: 'bg-red-900/30',
      border: 'border-red-600',
      text: 'text-red-400',
      label: 'High Risk',
    },
  };

  const riskStyle = riskStyles[risk] || riskStyles.medium;

  return (
    <div className="mt-8 space-y-6">
      <h2 className="text-2xl font-bold text-teal-400 mb-4">Analysis Results</h2>

      {/* Detected Emotions */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-teal-300 mb-3">Detected Emotions</h3>
        <div className="flex flex-wrap gap-2">
          {emotions && emotions.length > 0 ? (
            emotions.map((emotion, index) => (
              <span
                key={index}
                className="px-4 py-2 bg-teal-600/20 text-teal-300 rounded-full text-sm font-medium border border-teal-600/50"
              >
                {emotion.charAt(0).toUpperCase() + emotion.slice(1)}
              </span>
            ))
          ) : (
            <span className="text-slate-400">No emotions detected</span>
          )}
        </div>
      </div>

      {/* Depression Risk Indicator */}
      <div className={`${riskStyle.bg} rounded-lg p-6 border-2 ${riskStyle.border}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-slate-200">Depression Risk Indicator</h3>
          <span className={`px-4 py-2 rounded-full font-bold ${riskStyle.text} bg-slate-900/50`}>
            {riskStyle.label}
          </span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-3 mb-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              risk === 'low'
                ? 'bg-green-500 w-1/3'
                : risk === 'medium'
                ? 'bg-amber-500 w-2/3'
                : 'bg-red-500 w-full'
            }`}
          />
        </div>
        <p className="text-sm text-slate-300">
          This indicator is based on text analysis and is not a diagnostic tool.
        </p>
      </div>

      {/* Explanation */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-teal-300 mb-3">Explanation</h3>
        <p className="text-slate-300 leading-relaxed">{explanation}</p>
      </div>

      {/* Reminder */}
      <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-4">
        <p className="text-sm text-blue-200">
          <strong>Remember:</strong> This analysis is for informational purposes only. 
          If you have concerns about your mental health, please consult with a qualified mental health professional.
        </p>
      </div>
    </div>
  );
}

export default ScreeningResults;

