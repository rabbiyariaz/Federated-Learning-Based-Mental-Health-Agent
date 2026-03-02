import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getOrCreateToken, submitPHQ } from "../api/backend";

/**
 * PHQPage Component - PHQ-8 Questionnaire
 * 
 * Purpose: Administer the Patient Health Questionnaire-8 (PHQ-8)
 * - Used at Day 0 (baseline) and Day 14 (endpoint)
 * - Non-diagnostic screening tool for depression symptoms
 * - Scoring: 0-3 per question, total 0-24
 * 
 * Academic Context: FYP - Depression Symptom Monitoring System
 * Reference: Kroenke et al., Gen Hosp Psychiatry. 2009;31(3):206-13
 * 
 * IMPORTANT: This is for monitoring/research purposes only
 * Results do NOT indicate diagnosis or severity
 */

// Official PHQ-8 questions
const PHQ8_QUESTIONS = [
  {
    id: 1,
    text: "Little interest or pleasure in doing things",
  },
  {
    id: 2,
    text: "Feeling down, depressed, or hopeless",
  },
  {
    id: 3,
    text: "Trouble falling or staying asleep, or sleeping too much",
  },
  {
    id: 4,
    text: "Feeling tired or having little energy",
  },
  {
    id: 5,
    text: "Poor appetite or overeating",
  },
  {
    id: 6,
    text: "Feeling bad about yourself or that you are a failure or have let yourself or your family down",
  },
  {
    id: 7,
    text: "Trouble concentrating on things, such as reading the newspaper or watching television",
  },
  {
    id: 8,
    text: "Moving or speaking so slowly that other people have noticed? Or the opposite being so fidgety or restless that you have been moving around a lot more than usual",
  },
];

// Response options with their scores
const RESPONSE_OPTIONS = [
  { score: 0, label: "Not at all" },
  { score: 1, label: "Several days" },
  { score: 2, label: "More than half the days" },
  { score: 3, label: "Nearly every day" },
];

export default function PHQPage() {
  const navigate = useNavigate();

  
  // Initialize state: { questionId: score }
  const [responses, setResponses] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [showScaleInfo, setShowScaleInfo] = useState(false);
  const [submissionComplete, setSubmissionComplete] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Handle response selection
   * Updates the response for a specific question
   */
  const handleResponseChange = (questionId, score) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: score,
    }));
    // Clear submission error when user makes changes
    setSubmitted(false);
  };

  /**
   * Validate form completion
   * All 8 questions must be answered
   */
  const isFormComplete = PHQ8_QUESTIONS.length === Object.keys(responses).length;

  /**
   * Calculate PHQ-8 Total Score
   * Sum of all question responses (0-24 range)
   * 
   * Note: Scoring interpretation exists but is NOT displayed
   * (per requirement: no severity labels)
   * Interpretation guide (for reference):
   * - 0-4: Minimal symptoms
   * - 5-9: Mild symptoms
   * - 10-14: Moderate symptoms
   * - 15-19: Moderately severe symptoms
   * - 20-24: Severe symptoms
   */
 

  /**
   * Handle form submission
   * - Validate all questions answered
   * - Submit to backend
   * - Show success message with next steps
   */
const handleSubmit = async (e) => {
  e.preventDefault();
  setError(null);

  if (!isFormComplete) {
    setSubmitted(true);
    window.scrollTo(0, 0);
    return;
  }

  try {
    const token = await getOrCreateToken();
    await submitPHQ({
      user_id: token,
      responses: responses
    });
    setSubmissionComplete(true);
    window.scrollTo(0, 0);
  } catch (err) {
    setError(err.message || "Submission failed. Please try again.");
    window.scrollTo(0, 0);
  }
};

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        
        {/* Success Screen */}
        {submissionComplete ? (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">✅</div>
              <h1 className="text-3xl font-bold text-emerald-600 mb-2">
                Assessment Complete!
              </h1>
              <p className="text-gray-600">
                Your baseline PHQ-8 assessment has been saved successfully.
              </p>
            </div>

            {/* Next Steps */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">What's Next?</h2>
              <ol className="space-y-3 text-gray-700">
                <li className="flex items-start">
                  <span className="font-bold text-emerald-600 mr-3">1.</span>
                  <span>Complete a <strong>Daily Check-in (EMA)</strong> each day to track your mood over time</span>
                </li>
                <li className="flex items-start">
                  <span className="font-bold text-emerald-600 mr-3">2.</span>
                  <span>View your <strong>Dashboard</strong> anytime to see visualizations of your data</span>
                </li>
                <li className="flex items-start">
                  <span className="font-bold text-emerald-600 mr-3">3.</span>
                  <span>Generate a <strong>Report</strong> to get a summary of your mental health monitoring</span>
                </li>
              </ol>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                to="/ema"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors text-center"
              >
                📋 Go to Daily Check-in
              </Link>
              <Link
                to="/dashboard"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors text-center"
              >
                📊 View Dashboard
              </Link>
              <Link
                to="/"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors text-center"
              >
                🏠 Go Home
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Initial Assessment Questionnaire
              </h1>
              <p className="text-gray-600 mb-4">
                Please answer all questions about how you have been feeling over the past two weeks.
              </p>
              
              {/* Collapsible Scale Explanation */}
              <button
                onClick={() => setShowScaleInfo(!showScaleInfo)}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-semibold mb-4 flex items-center gap-2"
              >
                <span>{showScaleInfo ? '▼' : '▶'}</span>
                What do these response options mean?
              </button>
              
              {showScaleInfo && (
                <div className="bg-emerald-50 border border-emerald-200 rounded p-4 mb-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-semibold text-gray-700">Not at all</p>
                      <p className="text-gray-600">0-1 days in the past 2 weeks</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700">Several days</p>
                      <p className="text-gray-600">2-6 days in the past 2 weeks</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700">More than half the days</p>
                      <p className="text-gray-600">7-11 days in the past 2 weeks</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700">Nearly every day</p>
                      <p className="text-gray-600">12-14 days in the past 2 weeks</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="bg-emerald-50 border-l-4 border-emerald-600 p-4">
                <p className="text-sm text-gray-700">
                  <strong>Note:</strong> This is a monitoring tool. Your responses help track patterns over time and are not a diagnosis or clinical assessment.
                </p>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded mb-8">
                <p className="text-red-700 font-semibold">⚠️ {error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
          {/* Questionnaire Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
            <table className="w-full">
              {/* Table Header */}
              <thead>
                <tr className="bg-emerald-50 border-b border-gray-300">
                  <th className="px-4 py-4 text-left text-sm font-semibold text-emerald-700 w-1/2">
                    Problems
                  </th>
                  {RESPONSE_OPTIONS.map((option) => (
                    <th
                      key={option.score}
                      className="px-3 py-4 text-center text-xs font-semibold text-emerald-700"
                    >
                      {option.label}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Table Body */}
              <tbody>
                {PHQ8_QUESTIONS.map((question, index) => (
                  <tr
                    key={question.id}
                    className={`border-b border-gray-200 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    } hover:bg-emerald-50 transition-colors`}
                  >
                    {/* Question Text */}
                    <td className="px-4 py-4 text-sm text-gray-700 font-medium">
                      <span className="text-emerald-600 font-semibold mr-2">{question.id}.</span>
                      {question.text}
                    </td>

                    {/* Radio Options */}
                    {RESPONSE_OPTIONS.map((option) => (
                      <td key={option.score} className="px-3 py-4 text-center">
                        <input
                          type="radio"
                          id={`q${question.id}-option${option.score}`}
                          name={`question-${question.id}`}
                          value={option.score}
                          checked={responses[question.id] === option.score}
                          onChange={(e) =>
                            handleResponseChange(question.id, parseInt(e.target.value))
                          }
                          className="w-5 h-5 text-emerald-600 cursor-pointer"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Validation Error Message */}
          {submitted && !isFormComplete && (
            <div className="mt-8 bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <p className="text-red-700 font-semibold">
                ⚠️ Please answer all questions before submitting
              </p>
            </div>
          )}

          {/* Submit Button */}
          <div className="mt-8">
            <button
              type="submit"
              className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${
                isFormComplete
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer'
                  : 'bg-gray-300 text-gray-600 cursor-not-allowed'
              }`}
            >
              Submit Assessment
            </button>
          </div>

          {/* Progress Indicator */}
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>
              Answered: <span className="font-semibold">{Object.keys(responses).length}</span> / {PHQ8_QUESTIONS.length} questions
            </p>
          </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
