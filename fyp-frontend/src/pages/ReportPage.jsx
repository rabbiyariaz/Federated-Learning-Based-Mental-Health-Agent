import { useState, useEffect, useMemo  } from 'react';
import { getPHQSeverityLabel } from '../utils/scoring';
import { fetchReport, fetchWeeklyTextRisk, getOrCreateToken } from "../api/backend";


export default function ReportPage() {
  const [report, setReport] = useState(null);
  const [weeklyTextRisk, setWeeklyTextRisk] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [error, setError] = useState(null);

  //

  const completed = report?.ema_days_completed ?? 0;
  const latestPhq = report?.latest_phq ?? null;
const phqProgress = report?.phq_progress ?? null;

const phqList = report?.phq_list ?? [];

const sortedPhq = useMemo(() => {
  return [...phqList].sort(
    (a, b) => new Date(a.submittedAt) - new Date(b.submittedAt)
  );
}, [phqList]);

const baseline = sortedPhq.length > 0
  ? sortedPhq[0].score
  : null;
  
const delta = phqProgress?.change ?? null;
  const total = 7;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    async function loadReport() {
      try {
        const token = await getOrCreateToken();
        const [reportData, weeklyRiskData] = await Promise.all([
          fetchReport(controller.signal),
          fetchWeeklyTextRisk(controller.signal).catch(err => {
            console.warn("Weekly text risk fetch failed:", err);
            return null; // Don't fail the whole page if weekly risk fails
          })
        ]);

        if (isMounted) {
          setReport(reportData);
          setWeeklyTextRisk(weeklyRiskData);
        }
      } catch (err) {
  if (err.name === "AbortError") {
    return; // silently ignore
  }

  console.error("Report fetch error:", err);

  if (isMounted) {
    setError("Could not load report");
  }
} finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadReport();
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);


  const canGenerate = !!latestPhq;

  const handleGenerateReport = async () => {
    if (!report) return;

    setGenerating(true);
    setReportGenerated(false);

    // await new Promise((resolve) => setTimeout(resolve, 2000));

    const consentData =
      JSON.parse(localStorage.getItem('userConsent')) || {};

    const consentDate = consentData.consentDate
      ? new Date(consentData.consentDate).toLocaleDateString()
      : 'N/A';

    const reportContent = `
PERSONAL SYMPTOM MONITORING SUMMARY
====================================

Monitoring Period:
${consentDate} – ${new Date().toLocaleDateString()}

PHQ-8 ASSESSMENTS
-----------------
First Recorded Score: ${baseline ?? 'Not completed'}
${baseline !== null ? `Severity: ${getPHQSeverityLabel(baseline)}` : ''}

Most Recent Score: ${latestPhq?.score ?? 'N/A'}
${latestPhq ? `Current Severity: ${getPHQSeverityLabel(latestPhq.score)}` : ''}

${phqProgress ? `
Recent Change (Last Two Assessments):
  Previous Score: ${phqProgress.previous_score}
  Current Score: ${phqProgress.current_score}
  Change: ${phqProgress.change > 0 ? '+' : ''}${phqProgress.change} points
  Status: ${phqProgress.status}
  Days Between: ${phqProgress.days_between} days
` : ''}



DAILY CHECK-INS
---------------
Days Logged (Recent Week): ${completed} / ${total}
Completion Rate: ${percentage}%

${weeklyTextRisk && weeklyTextRisk.weekly_risk_level !== 'No Data' ? `
WEEKLY TEXT RISK ASSESSMENT
-----------------------------
Risk Level: ${weeklyTextRisk.weekly_risk_level}
Reflections Analyzed: 30



` : ''}WEEKLY MOOD SUMMARY
--------------------
Average Mood Index: ${report?.ema_summary?.weekly_avg_depression ?? 'N/A'}
Mood Trend: ${report?.ema_summary?.trend_depression ?? 'N/A'}

Average Sleep Quality: ${report?.ema_summary?.weekly_avg_sleep ?? 'N/A'}
Sleep Trend: ${report?.ema_summary?.trend_sleep ?? 'N/A'}

Overall Interpretation:
${report?.ema_summary?.clinical_interpretation ?? 'No summary available.'}

Note:
This summary is intended to help you track your mental wellbeing over time.
It does not replace professional medical advice.

Generated on: ${new Date().toLocaleString()}
=====================================
    `.trim();

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

  /* ---------- RENDER ---------- */

  if (loading) {
    return <p className="text-center mt-10">Loading report…</p>;
  }

  if (error) {
    return (
      <p className="text-center mt-10 text-red-600">
        {error}
      </p>
    );
  }

  if (!report) {
    return (
      <p className="text-center mt-10 text-red-600">
        Report unavailable.
      </p>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Your Symptom Monitoring Summary
          </h1>
          <p className="text-gray-600">
  A personal overview of your recent mood and wellbeing patterns.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* PHQ Baseline Card */}
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-emerald-600">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">
              First Assessment

            </h3>
            {baseline !== null ? (
              <div>
                <p className="text-4xl font-bold text-gray-800">{baseline}</p>
                <p className="text-xs text-gray-500 mt-1">out of 24</p>
                <p className="text-sm font-semibold text-emerald-600 mt-2">
                  {getPHQSeverityLabel(baseline)} Depression
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Not completed</p>
            )}
          </div>



          {/* EMA Completion Card */}
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-600">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">
              Daily Check-ins
            </h3>
            <p className="text-4xl font-bold text-gray-800">{percentage}%</p>
            <p className="text-xs text-gray-500 mt-1">
              {completed} of latest {total} days completed
            </p>
          </div>
        </div>

{/* Weekly Text Risk Assessment */}
{weeklyTextRisk && weeklyTextRisk.weekly_risk_level !== 'No Data' && weeklyTextRisk.weekly_risk_level !== 'Insufficient Data' && (
  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg shadow-md p-6 mb-8 border-2 border-purple-200">
    <div className="flex items-center gap-3 mb-4">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
        <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
      </svg>
      <h3 className="text-xl font-bold text-gray-800">
        Weekly Text Risk Assessment
      </h3>
    </div>

    <div className="flex items-center gap-6 mb-4">
      <div className="flex-1">
        <p className="text-sm text-gray-600 mb-2">Risk Level</p>
        <div className={`inline-block px-6 py-3 rounded-lg font-bold text-lg ${
          weeklyTextRisk.weekly_risk_level === 'Low' 
            ? 'bg-emerald-500 text-white'
            : weeklyTextRisk.weekly_risk_level === 'Moderate'
            ? 'bg-amber-500 text-white'
            : weeklyTextRisk.weekly_risk_level === 'Elevated'
            ? 'bg-red-500 text-white'
            : 'bg-gray-300 text-gray-700'
        }`}>
          {weeklyTextRisk.weekly_risk_level}
        </div>
      </div>

      <div className="flex-1">
        <p className="text-sm text-gray-600 mb-2">Total Reflections</p>
        <p className="text-4xl font-bold text-purple-700">
          {weeklyTextRisk.reflection_count}
        </p>
        <p className="text-xs text-gray-500 mt-1">in last 7 days</p>
      </div>
    </div>

    <div className="bg-white rounded-lg p-4 mt-4">
      <p className="text-sm text-gray-700">
        <strong className="text-purple-700">Analysis:</strong> {weeklyTextRisk.message}
      </p>
      {weeklyTextRisk.risk_score !== undefined && (
        <p className="text-xs text-gray-600 mt-2">
          <strong>Risk Score:</strong> {weeklyTextRisk.risk_score} 
          <span className="text-gray-500"> (0 = very low risk, 1 = very high risk)</span>
        </p>
      )}
     
    </div>
  </div>
)}

{/* Show message if insufficient data */}
{weeklyTextRisk && (weeklyTextRisk.weekly_risk_level === 'Insufficient Data' || weeklyTextRisk.weekly_risk_level === 'No Data') && (
  <div className="bg-blue-50 rounded-lg shadow-sm p-6 mb-8 border border-blue-200">
    <div className="flex items-center gap-3">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div>
        <h4 className="font-semibold text-blue-800">Weekly Text Risk Assessment</h4>
        <p className="text-sm text-blue-700 mt-1">
          {weeklyTextRisk.message} Submit at least 3 text reflections to enable weekly risk analysis.
        </p>
      </div>
    </div>
  </div>
)}

{report?.ema_summary && (
  <div className="bg-white rounded-lg shadow-md p-6 mb-8 border border-gray-200">
    <h3 className="text-lg font-semibold text-gray-800 mb-4">
      Weekly EMA Summary
    </h3>

    <div className="space-y-2 text-gray-700">
      <p>
        <strong className="text-gray-900">Depressive Symptom Intensity (0-20 scale):</strong>{" "}
        {report.ema_summary.weekly_avg_depression}
      </p>

      <p>
        <strong className="text-gray-900">Depressive Symptom Trend :</strong>{" "}
        {report.ema_summary.trend_depression === "Insufficient data"
  ? "Not enough recent entries (minimum 4 required)"
  : report.ema_summary.trend_depression}
      </p>

<p>
  <strong className="text-gray-900">Mood Variability:</strong>{" "}
  {report.ema_summary.mood_variability !== null ? (
    <>
      {report.ema_summary.mood_variability.toFixed(2)}{" "}
      
      {/* Interpretation */}
      <span className="text-sm text-gray-700">
        — {report.ema_summary.mood_variability >= 3
          ? "high variability"
          : report.ema_summary.mood_variability >= 1.5
          ? "moderate variability"
          : "low variability"}
      </span>

      {/* Confidence (separate meaning) */}
      <span className="text-sm text-gray-500 ml-1">
        ({report.ema_summary.variability_reliability === "Reliable"
          ? "estimate is reliable"
          : "low confidence"})
      </span>
    </>
  ) : (
    <span className="text-gray-500 text-sm">
      Not enough data (minimum 4 entries in last 7 days required)
    </span>
  )}
</p>

      <p>
        <strong className="text-gray-900">Average Sleep (0-4 scale):</strong>{" "}
        {report.ema_summary.weekly_avg_sleep}
      </p>

      <p>
        <strong className="text-gray-900">Sleep Trend:</strong>{" "}
        {report.ema_summary.trend_sleep}
      </p>

      <p className="mt-4 text-sm text-gray-800">
        <strong>Clinical Interpretation:</strong>{" "}
        {report.ema_summary.clinical_interpretation}
      </p>
    </div>
  </div>
)}

{/* PHQ Progress & Trend Section */}


<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
  <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-emerald-600">
    <h3 className="text-sm font-semibold text-gray-600 mb-2">
      Most Recent Assessment
    </h3>

    {latestPhq ? (
      <>
        <p className="text-4xl font-bold text-gray-800">
          {latestPhq.score}
        </p>
        <p className="text-xs text-gray-500 mt-1">out of 24</p>
        <p className="text-sm font-semibold text-emerald-600 mt-2">
          {getPHQSeverityLabel(latestPhq.score)}
        </p>
      </>
    ) : (
      <p className="text-sm text-gray-500">No assessment yet</p>
    )}
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
                Baseline Assessment Status
              </span>
              <span
                className={`text-sm font-semibold ${
                  baseline !== null ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {baseline !== null ? '✓ Completed' : '✗ Not Completed'}
              </span>
            </div>

            
            <div className="flex justify-between items-center py-3 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-700">
                Latest 7 days Daily Entries Completed
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
                    className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
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
            This report includes PHQ-8 scores, EMA completion statistics. 
            <strong> Note:</strong> This is a summary report for monitoring purposes only and does not 
            constitute a clinical diagnosis.
          </p>

          {reportGenerated && (
            <div className="mb-4 bg-emerald-50 border-l-4 border-emerald-600 p-4">
              <p className="text-emerald-800 font-semibold">
                ✓ Report generated successfully!
              </p>
              <p className="text-emerald-700 text-sm mt-1">
                Your report has been downloaded. Check your downloads folder.
              </p>
            </div>
          )}

          <button
            onClick={handleGenerateReport}
            disabled={generating || !canGenerate}
            className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
              generating
                ? 'bg-gray-400 text-white cursor-wait'
                : !canGenerate
                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer'
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
            ) : !canGenerate ? (
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

          {!canGenerate && (
            <p className="text-xs text-gray-500 mt-3 text-center">
    You need at least one PHQ-8 assessment before generating a report.
            </p>
          )}
        </div>

        {/* Disclaimer */}
        <div className="mt-8 bg-amber-50 border-l-4 border-amber-600 p-4">
  <p className="text-sm text-amber-800">
    This summary is designed to help you understand your mood patterns over time.
    If you are concerned about your symptoms, please consider speaking with a qualified healthcare professional.
  </p>
</div>
      </div>
    </div>
  );
}
