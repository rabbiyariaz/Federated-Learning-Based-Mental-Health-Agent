import { useState, useEffect, useMemo  } from 'react';
import { getPHQSeverityLabel } from '../utils/scoring';
import { fetchReport, getOrCreateToken } from "../api/backend";


export default function ReportPage() {
  const [report, setReport] = useState(null);
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
        const data = await fetchReport(controller.signal);

        if (isMounted) {
          setReport(data);
        }
      } catch (err) {
  console.error("Report fetch error:", err);

  if (err.name !== "AbortError" && isMounted) {
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

    // const changeFromBaseline =
    //   baseline !== null && followUp !== null
    //     ? followUp - baseline
    //     : null;

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

${
  delta !== null
    ? `Change Over Time: ${delta > 0 ? '+' : ''}${delta} points`
    : ''
}

DAILY CHECK-INS
---------------
Days Logged (Recent Week): ${completed} / ${total}
Completion Rate: ${percentage}%

WEEKLY MOOD SUMMARY
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
                  {getPHQSeverityLabel(baseline)}
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
              {completed} of {total} days completed
            </p>
          </div>
        </div>

{report?.ema_summary && (
  <div className="bg-white rounded-lg shadow-md p-6 mb-8 border border-gray-200">
    <h3 className="text-lg font-semibold text-gray-800 mb-4">
      Weekly EMA Summary
    </h3>

    <div className="space-y-2 text-gray-700">
      <p>
        <strong className="text-gray-900">Average Depression Index:</strong>{" "}
        {report.ema_summary.weekly_avg_depression}
      </p>

      <p>
        <strong className="text-gray-900">Depression Trend:</strong>{" "}
        {report.ema_summary.trend_depression}
      </p>

      <p>
        <strong className="text-gray-900">Average Sleep:</strong>{" "}
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
