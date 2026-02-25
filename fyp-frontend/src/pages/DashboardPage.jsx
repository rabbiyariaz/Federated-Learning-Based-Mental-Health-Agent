import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchDashboardSummary, getOrCreateSessionId } from "../api/backend";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend
);

export default function DashboardPage() {
  const navigate = useNavigate();

  const [study, setStudy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ---------------- FETCH FROM BACKEND ---------------- */

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        const userId = await getOrCreateSessionId();
        const data = await fetchDashboardSummary(userId);

        if (isMounted) {
          setStudy(data);
        }
      } catch (err) {
        if (isMounted) {
          setError("Unable to load dashboard data");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();
    return () => {
      isMounted = false;
    };
  }, []);

const { ema = [], phq = [], studyDuration = 14 } = study || {};

 


  /* ---------------- GENERIC LINE CHART BUILDER ---------------- */

  const buildLineChart = ({ question, label, color }) => {
    if (!ema.length) return null;

    const sorted = [...ema].sort((a, b) => a.studyDay - b.studyDay);

    return {
      labels: sorted.map(e => `Day ${e.studyDay}`),
      datasets: [
        {
          label,
          data: sorted.map(e => e.responses?.[question] ?? null),
          borderColor: color,
          backgroundColor: color.replace("rgb", "rgba").replace(")", ",0.4)"),
          tension: 0.3,
        },
      ],
    };
  };

  /* ---------------- MEMOIZED CHART DATA ---------------- */

  const moodData = useMemo(
    () =>
      buildLineChart({
        question: 1,
        label: "Low Mood (1–5)",
        color: "rgb(59,130,246)",
      }),
    [ema]
  );

  const anhedoniaData = useMemo(
    () =>
      buildLineChart({
        question: 2,
        label: "Anhedonia (1–5)",
        color: "rgb(168,85,247)",
      }),
    [ema]
  );

  const fatigueData = useMemo(
    () =>
      buildLineChart({
        question: 3,
        label: "Fatigue (1–5)",
        color: "rgb(239,68,68)",
      }),
    [ema]
  );

  const selfCriticismData = useMemo(
    () =>
      buildLineChart({
        question: 4,
        label: "Self-Criticism (1–5)",
        color: "rgb(251,146,60)",
      }),
    [ema]
  );

   /* ---------------- EARLY RETURNS ---------------- */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading dashboard…
      </div>
    );
  }

  if (error || !study) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        {error || "Dashboard unavailable"}
      </div>
    );
  }
  /* ---------------- PHQ BAR CHART ---------------- */

  const baseline = phq.find(p => p.studyDay === 0);
  const endpoint = phq.find(p => p.studyDay === studyDuration);

  const phqBarData = {
    labels: endpoint
      ? ["Baseline (Day 0)", `Endpoint (Day ${studyDuration})`]
      : ["Baseline (Day 0)"],
    datasets: [
      {
        label: "PHQ-8 Total Score",
        data: endpoint
          ? [baseline?.totalScore, endpoint?.totalScore]
          : [baseline?.totalScore],
        backgroundColor: endpoint
          ? ["rgba(99,102,241,0.7)", "rgba(34,197,94,0.7)"]
          : ["rgba(99,102,241,0.7)"],
      },
    ],
  };

  /* ---------------- EMA PROGRESS ---------------- */

  const completedDays = new Set(ema.map(e => e.studyDay)).size;
  const emaPercentage = Math.round((completedDays / studyDuration) * 100);

  /* ---------------- CHART OPTIONS ---------------- */

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        min: 1,
        max: 5,
        ticks: { stepSize: 1 },
      },
    },
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        max: 24,
        title: { display: true, text: "PHQ-8 Score (0–24)" },
      },
    },
  };

  /* ---------------- RENDER ---------------- */



  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Symptom Monitoring Dashboard
          </h1>
          <p className="text-gray-600">
            Track your symptoms and progress over the 14-day study period
          </p>
        </div>

        {/* EMA Progress Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Daily Check-in Progress
          </h2>
          
          {ema.length > 0 ? (
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <div className="bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full transition-all duration-500"
                      style={{ width: `${emaPercentage}%` }}
                    ></div>
                  </div>
                </div>
                <div className="text-sm font-semibold text-gray-700">
                  {completedDays} / {studyDuration} days
                </div>
              </div>
              <p className="text-sm text-gray-600">
                You've completed {completedDays} daily check-ins. Keep going!
              </p>
            </div>
          ) : (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="text-yellow-800 font-semibold">
                No daily check-ins recorded yet
              </p>
              <p className="text-yellow-700 text-sm mt-1">
                Complete your first daily check-in to start tracking your symptoms.
              </p>
              <button
                onClick={() => navigate('/ema')}
                className="mt-3 bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 text-sm font-semibold"
              >
                Go to Daily Check-in
              </button>
            </div>
          )}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Mood Chart */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Mood Tracking (14 Days)
            </h2>
            {moodData ? (
              <div className="h-64">
                <Line data={moodData} options={lineOptions} />
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                <p className="text-gray-500 text-sm">
                  No mood data available yet
                </p>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-3">
              Feeling sad, down, or hopeless • Lower scores are better
            </p>
          </div>

          {/* Anhedonia Chart */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Interest & Pleasure (14 Days)
            </h2>
            {anhedoniaData ? (
              <div className="h-64">
                <Line data={anhedoniaData} options={lineOptions} />
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                <p className="text-gray-500 text-sm">
                  No anhedonia data available yet
                </p>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-3">
              Reduced interest or pleasure in activities • Lower scores are better
            </p>
          </div>

          {/* Energy/Sleep Chart */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Fatigue & Sleep Quality (14 Days)
            </h2>
            {fatigueData ? (
              <div className="h-64">
                <Line data={fatigueData} options={lineOptions} />
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                <p className="text-gray-500 text-sm">
                  No fatigue data available yet
                </p>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-3">
              Fatigue: Lower is better • Sleep: Higher is better
            </p>
          </div>

          {/* Self-Criticism Chart */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Self-Criticism (14 Days)
            </h2>
            {selfCriticismData ? (
              <div className="h-64">
                <Line data={selfCriticismData} options={lineOptions} />
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                <p className="text-gray-500 text-sm">
                  No self-criticism data available yet
                </p>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-3">
              Negative feelings about yourself or failure • Lower scores are better
            </p>
          </div>

          {/* Cognitive/Psychomotor Chart */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Cognitive/Psychomotor Symptoms (14 Days)
            </h2>
            {fatigueData ? (
              <div className="h-64">
                <Line data={fatigueData} options={lineOptions} />
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                <p className="text-gray-500 text-sm">
                  No cognitive/psychomotor data available yet
                </p>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-3">
              Racing thoughts or restlessness severity • Lower scores are better
            </p>
          </div>
        </div>

        {/* PHQ-8 Comparison Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            PHQ-8 Assessment Comparison
          </h2>
          {baseline ? (
            <div>
              <div className="h-80">
                <Bar data={phqBarData} options={barOptions} />
              </div>
              
              {endpoint && (
                <div className="mt-4 bg-blue-50 border-l-4 border-blue-400 p-3">
                  <p className="text-blue-800 text-sm">
                    <strong>Comparison:</strong> Your PHQ-8 score changed from {baseline.totalScore} to {endpoint.totalScore}.
                  </p>
                </div>
              )}
              
              {!endpoint && (
                <div className="mt-4 bg-blue-50 border-l-4 border-blue-400 p-3">
                  <p className="text-blue-800 text-sm">
                    <strong>Note:</strong> Day 14 assessment not yet completed. 
                    Complete your endpoint PHQ-8 on Day 14 to see comparison.
                  </p>
                </div>
              )}
              
              {/* Disclaimer */}
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded p-3">
                <p className="text-xs text-yellow-800">
                  <strong>Disclaimer:</strong> This data is for monitoring and informational purposes only. 
                  It does NOT constitute a clinical diagnosis. Professional assessment is required for any clinical interpretation.
                </p>
              </div>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center bg-gray-50 rounded">
              <div className="text-center">
                <p className="text-gray-500 text-sm mb-3">
                  No PHQ-8 assessment data available
                </p>
                <button
                  onClick={() => navigate('/phq')}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-semibold"
                >
                  Complete PHQ-8 Assessment
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Info Footer */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            <strong>Dashboard Information:</strong> This dashboard displays your daily monitoring data from EMA entries and PHQ-8 assessments. 
            Charts update automatically as you complete daily check-ins.
          </p>
        </div>
      </div>
    </div>
  );
}
