import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getOrCreateToken, submitEMA, fetchEMATodayStatus } from "../api/backend";

/**
 * EMAPage Component - Daily Ecological Momentary Assessment
 * 
 * Purpose: Collect daily symptom data for 14 days
 * - Quick (~1-2 min) daily check-ins using slider scales
 * - One submission per calendar day only
 * - Tracks day number (1-14) automatically
 * 
 * Academic Context: FYP - Depression Symptom Monitoring System
 * EMA is a validated method for capturing real-time, real-world symptom data
 */

// Daily EMA questions with slider scale (0-4, where 0 = "Not at all")
const EMA_QUESTIONS = [
  {
    id: 1,
    text: "Today, to what extent did you feel sad, down, or hopeless?",
    type: "slider",
    min: 0,
    max: 4,
    labels: ["Not at all", "Slightly", "Moderately", "Quite a bit", "Extremely"],
  },
  {
    id: 2,
    text: "Today, to what extent did you experience reduced interest or pleasure in activities you usually enjoy?",
    type: "slider",
    min: 0,
    max: 4,
    labels: ["Not at all", "Slightly", "Moderately", "Quite a bit", "Extremely"],
  },
  {
    id: 3,
    text: "Today, to what extent did you feel tired or lacking in energy?",
    type: "slider",
    min: 0,
    max: 4,
    labels: ["Not at all", "Slightly", "Moderately", "Quite a bit", "Extremely"],
  },
  {
    id: 4,
    text: "Today, to what extent did you feel negative about yourself or feel like a failure?",
    type: "slider",
    min: 0,
    max: 4,
    labels: ["Not at all", "Slightly", "Moderately", "Quite a bit", "Extremely"],
  },
  {
    id: 5,
    text: "Please select the option that best describes your main experience today.",
    type: "composite", // Special type: radio selection + severity slider
    radioOptions: [
      "My mind was frequently occupied by racing or negative thoughts",
      "I felt restless or found it difficult to sit still",
    ],
    min: 0,
    max: 4,
    labels: ["Not at all", "Slightly", "Moderately", "Quite a bit", "Extremely"],
  },
  {
    id: 6,
    text: "How would you rate the quality of your sleep last night?",
    type: "slider",
    min: 0,
    max: 4,
    labels: ["Very poor", "Poor", "Fair", "Good", "Very good"],
  },
];

export default function EMAPage() {
  const navigate = useNavigate();

  // State management
  const [responses, setResponses] = useState({});
  const [compositeResponse, setCompositeResponse] = useState(null); // For Q5 radio selection
  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [todayDate, setTodayDate] = useState(new Date().toDateString());
  const [error, setError] = useState(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  /**
   * Initialize component: Check if EMA already submitted today
   * Compare stored date with current date
   */
  useEffect(() => {
    const checkTodayStatus = async () => {
      try {
        const status = await fetchEMATodayStatus();
        if (status?.submitted) {
          setSubmissionStatus("already_submitted");
          setError("Today's EMA has already been submitted. You can submit again tomorrow.");
        }
      } catch (err) {
        setError(err.message || "Could not check today's EMA status.");
      } finally {
        setIsCheckingStatus(false);
      }
    };

    checkTodayStatus();
  }, []);

  /**
   * Handle slider value change
   * Updates state with new response value
   */
  const handleSliderChange = (questionId, value) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: parseInt(value),
    }));
  };

  /**
   * Calculate current study day (1-14)
   * Based on days elapsed since consent
   */

  const normalizeToMidnight = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};





  /**
   * Validate all questions answered
   * All questions must have a value (including composite Q5)
   */
  const isFormComplete = () => {
  for (const q of EMA_QUESTIONS) {
    if (q.type === 'slider' && responses[q.id] === undefined) return false;

    if (q.type === 'composite') {
      if (!compositeResponse || responses[q.id] === undefined) return false;
    }
  }
  return true;
};


  /**
   * Handle form submission
   * - Validate all questions answered
   * - Submit to backend
   * - Show success message with next steps
   */


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!isFormComplete()) return;

    let sessionId;

    try {
      sessionId = await getOrCreateToken();
    } catch (err) {
      setError("Could not create token. Try again.");
      return;
    }

    const todayISODate = new Date().toISOString().split("T")[0];

    const payload = {
      user_id: sessionId,
      date_submitted: todayISODate,
      responses: {
        "1": responses[1],
        "2": responses[2],
        "3": responses[3],
        "4": responses[4],
        "5_severity": responses[5],
        "5_type": compositeResponse,
        "6": responses[6],
      }
    };

    try {
      await submitEMA(payload);
      setSubmissionStatus("submitted");
      window.scrollTo(0, 0);
    } catch (err) {
      if (err.message && err.message.includes("400")) {
        setError("Today's EMA has already been submitted. You can submit again tomorrow.");
        setSubmissionStatus("already_submitted");
      } else {
        setError(err.message || "Submission failed. Try again.");
        setSubmissionStatus("error");
      }
      window.scrollTo(0, 0);
    }
  };

  const completedCount = EMA_QUESTIONS.reduce((count, q) => {
  if (q.type === "slider") {
    return responses[q.id] !== undefined ? count + 1 : count;
  }

  if (q.type === "composite") {
    return compositeResponse && responses[q.id] !== undefined
      ? count + 1
      : count;
  }

  return count;
}, 0);

  if (isCheckingStatus) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm p-6">
          <p className="text-gray-700">Checking today&apos;s check-in status...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Success Screen */}
        {submissionStatus === "submitted" ? (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">✅</div>
              <h1 className="text-3xl font-bold text-emerald-600 mb-2">
                Daily Check-in Complete!
              </h1>
              <p className="text-gray-600">
                Your daily assessment for {todayDate} has been saved successfully.
              </p>
            </div>

            {/* Next Steps */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">What's Next?</h2>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start">
                  <span className="text-emerald-600 mr-3">•</span>
                  <span>Come back <strong>tomorrow</strong> to complete another daily check-in</span>
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-600 mr-3">•</span>
                  <span>View your <strong>Dashboard</strong> to see trends and visualizations</span>
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-600 mr-3">•</span>
                  <span>Generate a <strong>Report</strong> anytime to see your mood summary</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                to="/dashboard"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors text-center"
              >
                📊 View Dashboard
              </Link>
              <Link
                to="/report"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors text-center"
              >
                📄 Generate Report
              </Link>
              <Link
                to="/"
                className="bg-slate-600 hover:bg-slate-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors text-center"
              >
                🏠 Go Home
              </Link>
            </div>
          </div>
        ) : submissionStatus === "already_submitted" ? (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🗓️</div>
              <h1 className="text-3xl font-bold text-amber-600 mb-2">
                Today&apos;s Check-in Already Submitted
              </h1>
              <p className="text-gray-600">
                You already completed your EMA for {todayDate}. Please come back tomorrow.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8">
              <p className="text-amber-800 font-medium">No action is needed right now.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                to="/dashboard"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors text-center"
              >
                📊 View Dashboard
              </Link>
              <Link
                to="/report"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors text-center"
              >
                📄 Generate Report
              </Link>
              <Link
                to="/"
                className="bg-slate-600 hover:bg-slate-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors text-center"
              >
                🏠 Go Home
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h1 className="text-2xl font-bold text-gray-800">Daily Check-in</h1>
              <p className="text-gray-600 text-sm mt-1">
                Daily EMA Check-in • {todayDate}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className={`border-l-4 p-4 rounded mb-6 ${
                submissionStatus === "already_submitted"
                  ? 'bg-yellow-50 border-yellow-500'
                  : 'bg-red-50 border-red-500'
              }`}>
                <p className={`font-semibold ${
                  submissionStatus === "already_submitted"
                    ? 'text-yellow-800'
                    : 'text-red-800'
                }`}>
                  ⚠️ {error}
                </p>
              </div>
            )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {EMA_QUESTIONS.map((question) => (
              <div
                key={question.id}
                className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
              >
                {/* Question Text */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-800">
                    <span className="text-emerald-600 mr-2">{question.id}.</span>
                    {question.text}
                  </label>
                </div>

                {/* Render based on question type */}
                {question.type === 'slider' && (
                  <div className="space-y-3">
                    {/* Slider */}
                    <input
                      type="range"
                      min={question.min}
                      max={question.max}
                      value={responses[question.id] || question.min}
                      onChange={(e) =>
                        handleSliderChange(question.id, e.target.value)
                      }
                      disabled={submissionStatus === "submitted"}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    />

                    {/* Scale Labels */}
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      {question.labels.map((label, idx) => (
                        <span key={idx} className="text-center flex-1">
                          {idx}. {label}
                        </span>
                      ))}
                    </div>

                    {/* Current Value */}
                    {responses[question.id] !== undefined && (
                      <div className="text-center">
                        <span className="text-sm font-semibold text-emerald-600">
                          Selected: {question.labels[responses[question.id]]}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Composite Question (Q5) - Radio + Severity */}
                {question.type === 'composite' && (
                  <div className="space-y-4">
                    {/* Radio Options */}
                    <div className="space-y-3">
                      {question.radioOptions.map((option, idx) => (
                        <div key={idx} className="flex items-start">
                          <input
                            type="radio"
                            id={`q5-radio-${idx}`}
                            name="q5-radio"
                            value={option}
                            checked={compositeResponse === option}
                            onChange={(e) => setCompositeResponse(e.target.value)}
                            disabled={submissionStatus === "submitted"}
                            className="w-4 h-4 text-emerald-600 cursor-pointer mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <label
                            htmlFor={`q5-radio-${idx}`}
                            className="ml-3 text-sm text-gray-700"
                          >
                            {option}
                          </label>
                        </div>
                      ))}
                    </div>

                    {/* Severity Slider (shown after radio selection) */}
                    {compositeResponse && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-sm font-medium text-gray-700 mb-3">
                          How severe was this experience today?
                        </p>
                        <div className="space-y-3">
                          <input
                            type="range"
                            min={question.min}
                            max={question.max}
                            value={responses[question.id] || question.min}
                            onChange={(e) =>
                              handleSliderChange(question.id, e.target.value)
                            }
                            disabled={submissionStatus === "submitted"}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          />

                          {/* Scale Labels */}
                          <div className="flex justify-between items-center text-xs text-gray-500">
                            {question.labels.map((label, idx) => (
                              <span key={idx} className="text-center flex-1">
                                {idx}. {label}
                              </span>
                            ))}
                          </div>

                          {/* Current Value */}
                          {responses[question.id] !== undefined && (
                            <div className="text-center">
                              <span className="text-sm font-semibold text-emerald-600">
                                Selected: {question.labels[responses[question.id]]}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Submit Button */}
          <div className="mt-8">
            <button
              type="submit"
              disabled={!isFormComplete()}
              className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${
                isFormComplete()
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer'
                  : 'bg-gray-300 text-gray-600 cursor-not-allowed'
              }`}
            >
              Submit Daily Check-in
            </button>
          </div>

          {/* Progress Indicator */}
          <div className="mt-4 text-center text-xs text-gray-600">
            <p>
              Progress: <span className="font-semibold">{completedCount}/{EMA_QUESTIONS.length} questions</span>
              {compositeResponse && " • Type selected"}
            </p>
          </div>
            </form>

            {/* Quick Tips */}
            <div className="mt-8 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p className="text-xs text-gray-700">
                <strong>Tip:</strong> This should take about 1-2 minutes. Answer honestly based on today.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
