import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrCreateSessionId, submitEMA } from "../api/backend";

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

// Daily EMA questions with slider scale (1-5)
const EMA_QUESTIONS = [
  {
    id: 1,
    text: "Today, to what extent did you feel sad, down, or hopeless?",
    type: "slider",
    min: 1,
    max: 5,
    labels: ["Not at all", "Slightly", "Moderately", "Quite a bit", "Extremely"],
  },
  {
    id: 2,
    text: "Today, to what extent did you experience reduced interest or pleasure in activities you usually enjoy?",
    type: "slider",
    min: 1,
    max: 5,
    labels: ["Not at all", "Slightly", "Moderately", "Quite a bit", "Extremely"],
  },
  {
    id: 3,
    text: "Today, to what extent did you feel tired or lacking in energy?",
    type: "slider",
    min: 1,
    max: 5,
    labels: ["Not at all", "Slightly", "Moderately", "Quite a bit", "Extremely"],
  },
  {
    id: 4,
    text: "Today, to what extent did you feel negative about yourself or feel like a failure?",
    type: "slider",
    min: 1,
    max: 5,
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
    min: 1,
    max: 5,
    labels: ["Not at all", "Slightly", "Moderately", "Quite a bit", "Extremely"],
  },
  {
    id: 6,
    text: "How would you rate the quality of your sleep last night?",
    type: "slider",
    min: 1,
    max: 5,
    labels: ["Very poor", "Poor", "Fair", "Good", "Very good"],
  },
];

export default function EMAPage() {
  const navigate = useNavigate();

  // State management
  const [responses, setResponses] = useState({});
  const [compositeResponse, setCompositeResponse] = useState(null); // For Q5 radio selection
  const [alreadySubmittedToday, setAlreadySubmittedToday] = useState(false);
  const [todayDate, setTodayDate] = useState(new Date().toDateString());

  /**
   * Initialize component: Check if EMA already submitted today
   * Compare stored date with current date
   */
  useEffect(() => {
    const checkTodaySubmission = () => {
      const studyData = JSON.parse(localStorage.getItem('studyData')) || {};
      const emaData = studyData.emaEntries || [];

      // Get today's date as string (e.g., "Fri Jan 31 2025")
      const currentDate = new Date().toDateString();

      // Check if any EMA entry exists for today
      const submittedToday = emaData.some(
        (entry) => new Date(entry.submittedAt).toDateString() === currentDate
      );

      setAlreadySubmittedToday(submittedToday);
      setTodayDate(currentDate);

      // If submitted today, initialize responses with today's data (for display only)
      if (submittedToday) {
        const todayEntry = emaData.find(
          (entry) => new Date(entry.submittedAt).toDateString() === currentDate
        );
        if (todayEntry) {
          setResponses(todayEntry.responses);
          if (todayEntry.compositeResponse) {
            setCompositeResponse(todayEntry.compositeResponse);
          }
        }
      }
    };

    checkTodaySubmission();
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


const calculateStudyDay = () => {
  const consentData = JSON.parse(localStorage.getItem('userConsent')) || {};
  if (!consentData.consentDate) return 1;

  const consentDate = normalizeToMidnight(consentData.consentDate);
  const today = normalizeToMidnight(new Date());

  const daysDifference =
    (today - consentDate) / (1000 * 60 * 60 * 24);

  return Math.min(daysDifference + 1, 14);
};


  /**
   * Validate all questions answered
   * All questions must have a value (including composite Q5)
   */
  const isFormComplete = () => {
  for (const q of EMA_QUESTIONS) {
    if (q.type === 'slider' && responses[q.id] === undefined) return false;

    if (q.type === 'composite') {
      if (!compositeResponse || !responses[q.id]) return false;
    }
  }
  return true;
};


  /**
   * Handle form submission
   * - Calculate study day
   * - Save to localStorage with metadata
   * - Navigate to dashboard
   */


  const handleSubmit = async (e) => {
  e.preventDefault();

  if (!isFormComplete() || alreadySubmittedToday) return;

  let sessionId;

  try {
    sessionId = await getOrCreateSessionId();   // ✅ Single source of truth
  } catch (err) {
    alert("Could not create a session. Please try again.");
    return;
  }

  const todayISODate = new Date().toISOString().split("T")[0];

  const payload = {
    user_id: sessionId,   // ✅ Always use fresh sessionId
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
    navigate('/dashboard');
  } catch (err) {
    if (err.response?.status === 400) {
      alert(err.response.data.detail);
    } else {
      alert("Failed to submit EMA. Please try again.");
    }
  }
};


  const studyDay = calculateStudyDay();
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


  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Daily Check-in</h1>
          <p className="text-gray-600 text-sm mt-1">
            Day <span className="font-semibold">{studyDay}</span> of 14 • {todayDate}
          </p>
        </div>

        {/* Already Submitted Today Message */}
        {alreadySubmittedToday && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded mb-6">
            <p className="text-green-800 font-semibold">
              ✓ Today's entry already completed
            </p>
            <p className="text-green-700 text-sm mt-1">
              You can submit again tomorrow.
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
                    <span className="text-blue-600 mr-2">{question.id}.</span>
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
                      disabled={alreadySubmittedToday}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    />

                    {/* Scale Labels */}
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      {question.labels.map((label, idx) => (
                        <span key={idx} className="text-center flex-1">
                          {idx + 1}. {label}
                        </span>
                      ))}
                    </div>

                    {/* Current Value */}
                    {responses[question.id] && (
                      <div className="text-center">
                        <span className="text-sm font-semibold text-blue-600">
                          Selected: {question.labels[responses[question.id] - 1]}
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
                            disabled={alreadySubmittedToday}
                            className="w-4 h-4 text-blue-600 cursor-pointer mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
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
                            disabled={alreadySubmittedToday}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          />

                          {/* Scale Labels */}
                          <div className="flex justify-between items-center text-xs text-gray-500">
                            {question.labels.map((label, idx) => (
                              <span key={idx} className="text-center flex-1">
                                {idx + 1}. {label}
                              </span>
                            ))}
                          </div>

                          {/* Current Value */}
                          {responses[question.id] && (
                            <div className="text-center">
                              <span className="text-sm font-semibold text-blue-600">
                                Selected: {question.labels[responses[question.id] - 1]}
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
              disabled={!isFormComplete() || alreadySubmittedToday}
              className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${
                isFormComplete() && !alreadySubmittedToday
                  ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                  : 'bg-gray-300 text-gray-600 cursor-not-allowed'
              }`}
            >
              {alreadySubmittedToday ? 'Today\'s Entry Completed' : 'Submit Daily Check-in'}
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
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs text-gray-700">
            <strong>Tip:</strong> This should take about 1-2 minutes. Answer honestly based on today.
          </p>
        </div>
      </div>
    </div>
  );
}
