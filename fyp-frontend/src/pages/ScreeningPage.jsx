import { useState } from 'react';
import MoodQuestions from '../components/MoodQuestions';
import ScreeningResults from '../components/ScreeningResults';
import { saveHistoryEntry } from '../utils/storage';
import { predictText } from '../api/backend';

function ScreeningPage() {
  const [text, setText] = useState('');
  const [moodData, setMoodData] = useState(null);
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleMoodChange = (data) => {
    setMoodData(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate text input
    if (!text.trim()) {
      setError('Please enter some text to analyze.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      const backendResult = await predictText(text.trim());
      setResults(backendResult);

      // Save to history
      const historyEntry = {
        id: `screening-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'screening',
        timestamp: new Date().toISOString(),
        data: {
          text: text.trim(),
          textSnippet: text.trim().substring(0, 100) + (text.trim().length > 100 ? '...' : ''),
          emotion: backendResult.emotion,
          phq8_score: backendResult.phq8_score,
          phq8_binary: backendResult.phq8_binary,
          emotion_probs: backendResult.emotion_probs,
          moodData: moodData,
        },
      };
      saveHistoryEntry(historyEntry);
    } catch (err) {
      setError(err.message || 'An error occurred while analyzing your text. Please try again.');
      console.error('Analysis error:', err);
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setText('');
    setMoodData(null);
    setResults(null);
    setError(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-teal-400 mb-2">Mental Health Screening</h1>
        <p className="text-slate-300">
          Enter your thoughts, feelings, or journal entry below. The AI will analyze your text 
          to detect emotions and provide a general risk assessment.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Text Input */}
        <div>
          <label htmlFor="journal-text" className="block text-slate-300 font-medium mb-2">
            Journal Entry or Text Input
          </label>
          <textarea
            id="journal-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type or paste your thoughts, feelings, or journal entry here..."
            className="w-full h-64 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-y"
            disabled={isLoading}
          />
          <p className="mt-2 text-sm text-slate-400">
            {text.length} characters
          </p>
        </div>

        {/* Mood Questions */}
        <MoodQuestions onMoodChange={handleMoodChange} />

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/30 border border-red-600 rounded-lg p-4">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isLoading || !text.trim()}
            className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing...
              </span>
            ) : (
              'Analyze Text'
            )}
          </button>
          
          {results && (
            <button
              type="button"
              onClick={handleReset}
              className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </form>

      {/* Results */}
      {isLoading && (
        <div className="mt-6 text-center text-slate-300">
          Analyzing...
        </div>
      )}

      {results && (
        <div className="mt-6 bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-4">
          <h2 className="text-2xl font-bold text-teal-400 mb-4">Analysis Results</h2>
          
          <div className="space-y-3">
            <div>
              <span className="text-slate-400 font-medium">Emotion: </span>
              <span className="text-slate-100">{results.emotion}</span>
            </div>
            
            <div>
              <span className="text-slate-400 font-medium">PHQ-8 Score: </span>
              <span className="text-slate-100">{results.phq8_score}</span>
            </div>
            
            <div>
              <span className="text-slate-400 font-medium">PHQ-8 Binary: </span>
              <span className="text-slate-100">{results.phq8_binary ? 'Yes' : 'No'}</span>
            </div>

            {results.emotion_probs && (
              <div>
                <span className="text-slate-400 font-medium block mb-2">Emotion Probabilities: </span>
                <div className="bg-slate-900 rounded p-3">
                  {typeof results.emotion_probs === 'object' ? (
                    <ul className="space-y-1">
                      {Object.entries(results.emotion_probs).map(([emotion, prob]) => (
                        <li key={emotion} className="text-slate-200">
                          <span className="capitalize">{emotion}: </span>
                          <span className="text-teal-400">{(typeof prob === 'number' ? (prob * 100).toFixed(1) : prob)}%</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-200">{JSON.stringify(results.emotion_probs)}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ScreeningPage;
