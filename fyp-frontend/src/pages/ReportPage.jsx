import { useState, useEffect } from 'react';
import { getPHQSeverityLabel } from '../utils/scoring';

/**
 * ReportPage Component - Automated Report Generation
 * 
 * Purpose: Generate summary report of PHQ-8 and EMA data
 * - Shows baseline and endpoint PHQ-8 scores
 * - Displays EMA completion statistics
 * - Simulates PDF report generation
 * 
 * Academic Context: FYP - Depression Symptom Monitoring System
 * Report generation demonstrates automated symptom summary for clinical review
 */

export default function ReportPage() {
  const [studyData, setStudyData] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);

  /**
   * Load data from localStorage on mount
   */
  useEffect(() => {
    const data = JSON.parse(localStorage.getItem('studyData')) || {};
    setStudyData(data);
  }, []);

  /**
   * Calculate EMA completion statistics
   */
  const getEMAStats = () => {
    const emaEntries = studyData?.emaEntries || [];
    const uniqueDays = new Set(emaEntries.map((entry) => entry.studyDay));
    const completed = uniqueDays.size;
    const total = 14;
    const percentage = Math.round((completed / total) * 100);

    return { completed, total, percentage };
  };

  /**
   * Get PHQ-8 scores
   */
  const getPHQScores = () => {
    const baseline = studyData?.phq8?.totalScore || null;
    const followUp = studyData?.phq14?.totalScore || null;

    return { baseline, followUp };
  };

  /**
   * Simulate report generation
   * In production, this would call a backend API to generate PDF
   */
  const handleGenerateReport = async () => {
    setGenerating(true);
    setReportGenerated(false);

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Generate report summary text
    const { baseline, followUp } = getPHQScores();
    const { completed, total, percentage } = getEMAStats();
    const consentData = JSON.parse(localStorage.getItem('userConsent')) || {};
    const consentDate = consentData.consentDate
      ? new Date(consentData.consentDate).toLocaleDateString()
      : 'N/A';

    const reportContent = `
DEPRESSION SYMPTOM MONITORING STUDY
Final Year Project Report
=====================================

Study Period: ${consentDate} - ${new Date().toLocaleDateString()}

BASELINE ASSESSMENT (PHQ-8)
---------------------------
Day 0 Total Score: ${baseline !== null ? baseline : 'Not completed'}
${baseline !== null ? `Severity Category: ${getPHQSeverityLabel(baseline)}` : ''}
${baseline !== null ? 'Score Range: 0-24 (monitoring only, not diagnostic)' : ''}

FOLLOW-UP ASSESSMENT (PHQ-8)
-----------------------------
Day 14 Total Score: ${followUp !== null ? followUp : 'Not yet completed'}
${followUp !== null ? `Severity Category: ${getPHQSeverityLabel(followUp)}` : ''}
${followUp !== null ? `Change from Baseline: ${followUp - baseline >= 0 ? '+' : ''}${followUp - baseline}` : ''}

DAILY ASSESSMENTS (EMA)
------------------------
Days Completed: ${completed} / ${total}
Completion Rate: ${percentage}%
${completed === total ? '✓ All daily assessments completed' : `⚠ ${total - completed} days remaining`}

SUMMARY
--------
This report provides a summary of symptom monitoring data collected over a 14-day period. 
Data is for monitoring purposes only and does not constitute a clinical diagnosis.

For interpretation and clinical decisions, consult a qualified healthcare professional.

Report Generated: ${new Date().toLocaleString()}
=====================================
    `.trim();

    // Create a Blob and trigger download
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `symptom-monitoring-report-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setGenerating(false);
    setReportGenerated(true);
  };

  const { baseline, followUp } = getPHQScores();
  const { completed, total, percentage } = getEMAStats();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Study Report
          </h1>
          <p className="text-gray-600">
            Generate a comprehensive summary of your symptom monitoring data
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* PHQ Baseline Card */}
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">
              PHQ-8 Baseline (Day 0)
            </h3>
            {baseline !== null ? (
              <div>
                <p className="text-4xl font-bold text-gray-800">{baseline}</p>
                <p className="text-xs text-gray-500 mt-1">out of 24</p>
                <p className="text-sm font-semibold text-blue-600 mt-2">
                  {getPHQSeverityLabel(baseline)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Not completed</p>
            )}
          </div>

          {/* PHQ Follow-up Card */}
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">
              PHQ-8 Follow-up (Day 14)
            </h3>
            {followUp !== null ? (
              <div>
                <p className="text-4xl font-bold text-gray-800">{followUp}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {followUp - baseline >= 0 ? '+' : ''}
                  {followUp - baseline} from baseline
                </p>
                <p className="text-sm font-semibold text-green-600 mt-2">
                  {getPHQSeverityLabel(followUp)}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-500">Not yet completed</p>
                <p className="text-xs text-gray-400 mt-1">
                  Complete on Day 14
                </p>
              </div>
            )}
          </div>

          {/* EMA Completion Card */}
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-purple-500">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">
              Daily Check-ins
            </h3>
            <p className="text-4xl font-bold text-gray-800">{percentage}%</p>
            <p className="text-xs text-gray-500 mt-1">
              {completed} of {total} days completed
            </p>
          </div>
        </div>

        {/* Report Details */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Report Details
          </h2>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-700">
                Study Start Date
              </span>
              <span className="text-sm text-gray-600">
                {JSON.parse(localStorage.getItem('userConsent') || '{}').consentDate
                  ? new Date(
                      JSON.parse(localStorage.getItem('userConsent')).consentDate
                    ).toLocaleDateString()
                  : 'N/A'}
              </span>
            </div>

            <div className="flex justify-between items-center py-3 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-700">
                Baseline Assessment Status
              </span>
              <span
                className={`text-sm font-semibold ${
                  baseline !== null ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {baseline !== null ? '✓ Completed' : '✗ Not Completed'}
              </span>
            </div>

            <div className="flex justify-between items-center py-3 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-700">
                Follow-up Assessment Status
              </span>
              <span
                className={`text-sm font-semibold ${
                  followUp !== null ? 'text-green-600' : 'text-gray-500'
                }`}
              >
                {followUp !== null ? '✓ Completed' : 'Pending'}
              </span>
            </div>

            <div className="flex justify-between items-center py-3 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-700">
                Daily Entries Completed
              </span>
              <span className="text-sm text-gray-600">
                {completed} / {total}
              </span>
            </div>

            <div className="flex justify-between items-center py-3">
              <span className="text-sm font-medium text-gray-700">
                Overall Completion
              </span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <span className="text-sm font-semibold text-gray-700">
                  {percentage}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Generate Report Button */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Generate Report
          </h2>
          
          <p className="text-sm text-gray-600 mb-6">
            Generate a comprehensive text-based report of your symptom monitoring data. 
            This report includes PHQ-8 scores, EMA completion statistics, and study timeline. 
            <strong> Note:</strong> This is a summary report for monitoring purposes only and does not 
            constitute a clinical diagnosis.
          </p>

          {reportGenerated && (
            <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-4">
              <p className="text-green-800 font-semibold">
                ✓ Report generated successfully!
              </p>
              <p className="text-green-700 text-sm mt-1">
                Your report has been downloaded. Check your downloads folder.
              </p>
            </div>
          )}

          <button
            onClick={handleGenerateReport}
            disabled={generating || baseline === null}
            className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
              generating
                ? 'bg-gray-400 text-white cursor-wait'
                : baseline === null
                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
            }`}
          >
            {generating ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Generating Report...
              </>
            ) : baseline === null ? (
              'Complete Baseline Assessment First'
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z"
                    clipRule="evenodd"
                  />
                </svg>
                Generate Report
              </>
            )}
          </button>

          {baseline === null && (
            <p className="text-xs text-gray-500 mt-3 text-center">
              You must complete the baseline PHQ-8 assessment before generating a report.
            </p>
          )}
        </div>

        {/* Disclaimer */}
        <div className="mt-8 bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <p className="text-sm text-yellow-800">
            <strong>Academic Disclaimer:</strong> This report generation feature is for demonstration 
            purposes as part of a Final Year Project. In a production system, reports would be generated 
            by a secure backend server and potentially reviewed by healthcare professionals before delivery.
          </p>
        </div>
      </div>
    </div>
  );
}
