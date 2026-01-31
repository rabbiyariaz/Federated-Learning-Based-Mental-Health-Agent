import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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
  const calculateStudyDay = () => {
    const studyData = JSON.parse(localStorage.getItem('studyData')) || {};
    const consentData = JSON.parse(localStorage.getItem('userConsent')) || {};

    if (!consentData.consentDate) return 1;

    const consentDate = new Date(consentData.consentDate);
    const today = new Date();

    // Calculate days between consent and today
    const daysDifference = Math.floor(
      (today - consentDate) / (1000 * 60 * 60 * 24)
    );

    // Study days are 0-13 mapped to display 1-14
    return Math.min(daysDifference + 1, 14);
  };

  /**
   * Validate all questions answered
   * All questions must have a value (including composite Q5)
   */
  const isFormComplete = () => {
    const sliderCount = EMA_QUESTIONS.filter(q => q.type === 'slider').length;
    const sliderAnswered = Object.keys(responses).filter(key => key !== '5').length;
    
    // Check if all slider questions are answered (excluding Q5)
    if (sliderAnswered !== sliderCount) return false;
    
    // Check if Q5 radio and severity are both answered
    if (!compositeResponse || !responses[5]) return false;
    
    return true;
  };

  /**
   * Handle form submission
   * - Calculate study day
   * - Save to localStorage with metadata
   * - Navigate to dashboard
   */
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!isFormComplete() || alreadySubmittedToday) return;

    // Calculate which day of the study this is (1-14)
    const studyDay = calculateStudyDay();

    // Get existing study data
    const studyData = JSON.parse(localStorage.getItem('studyData')) || {};
    const emaEntries = studyData.emaEntries || [];

    // Prepare EMA entry with metadata
    const emaEntry = {
      responses: responses, // Question responses: { 1: 3, 2: 4, ... }
      compositeResponse: compositeResponse, // Q5 radio button selection
      studyDay: studyDay, // Day 1-14
      dateSubmitted: todayDate, // Human-readable date
      submittedAt: new Date().toISOString(), // ISO timestamp for audit trail
    };

    // Add to array of EMA entries
    emaEntries.push(emaEntry);
    studyData.emaEntries = emaEntries;

    // Save back to localStorage
    localStorage.setItem('studyData', JSON.stringify(studyData));

    // Log for debugging (remove in production)
    console.log("EMA Submitted:", emaEntry);

    // Navigate to dashboard
    navigate('/dashboard');
  };

  const studyDay = calculateStudyDay();

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
              Progress: <span className="font-semibold">{Object.keys(responses).length}/{EMA_QUESTIONS.length} questions</span>
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
