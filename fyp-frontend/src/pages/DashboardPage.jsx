import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchDashboardSummary, getOrCreateToken } from "../api/backend";


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
        const token = await getOrCreateToken();
        const data = await fetchDashboardSummary(token);

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

const { ema = [], phq = [], ema_summary = {} } = study || {};
const formatDate = (d) => new Date(d).toLocaleDateString();

 


  /* ---------------- GENERIC LINE CHART BUILDER ---------------- */

const buildLineChart = ({ question, label, color }) => {
  if (!ema.length) return null;

  const getDate = (entry) => entry.date || entry.submittedAt;

  const sorted = [...ema].sort(
    (a, b) => new Date(getDate(a)) - new Date(getDate(b))
  );

  const recent = sorted.slice(-7); // limit to last 7 entries

  return {
    labels: recent.map(e => formatDate(getDate(e))),
    datasets: [
      {
        label,
        data: recent.map(e => e.responses?.[question] ?? null),
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

  const cognitiveData = useMemo(
  () =>
    buildLineChart({
      question: 6,
      label: "Cognitive/Psychomotor (1–5)",
      color: "rgb(20,184,166)",
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
const sortedPhq = [...phq].sort(
  (a, b) => new Date(a.submittedAt) - new Date(b.submittedAt)
);

const latestPhq = sortedPhq.length > 0
  ? sortedPhq[sortedPhq.length - 1]
  : null;

const previousPhq = sortedPhq.length > 1
  ? sortedPhq[sortedPhq.length - 2]
  : null;
const phqBarData = latestPhq
  ? {
      labels: previousPhq
        ? [formatDate(previousPhq.submittedAt), formatDate(latestPhq.submittedAt)]
        : [formatDate(latestPhq.submittedAt)],
      datasets: [
        {
          label: "PHQ-8 Total Score",
          data: previousPhq
            ? [previousPhq.totalScore, latestPhq.totalScore]
            : [latestPhq.totalScore],
          backgroundColor: previousPhq
            ? ["rgba(34,197,94,0.7)", "rgba(16,185,129,0.7)"]
            : ["rgba(16,185,129,0.7)"],
        },
      ],
    }
  : null;



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
            Track your ongoing symptom patterns and assessment trends
          </p>
        </div>



        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Mood Chart */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Mood Tracking (Recent Trend)
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
              Interest & Pleasure (Recent Trend)
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
              Fatigue & Sleep Quality (Recent Trend)
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
              Self-Criticism (Recent Trend)
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
              Cognitive/Psychomotor Symptoms (Recent Trend)
            </h2>
            {cognitiveData ? (
              <div className="h-64">
                <Line data={cognitiveData} options={lineOptions} />
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
          {latestPhq ? (
            <div>
              <div className="h-80">
                <Bar data={phqBarData} options={barOptions} />
              </div>
              
              {previousPhq && (
                <div className="mt-4 bg-emerald-50 border-l-4 border-emerald-600 p-3">
                  <p className="text-emerald-800 text-sm">
                    <strong>Comparison:</strong> Your PHQ-8 score changed from {previousPhq.totalScore} to {latestPhq.totalScore}.
                  </p>
                </div>
              )}
              
             {!previousPhq && (
  <div className="mt-4 bg-emerald-50 border-l-4 border-emerald-600 p-3">
    <p className="text-emerald-800 text-sm">
      This is your first PHQ-8 assessment. Complete another assessment later to see changes over time.
    </p>
  </div>
)}
              
              {/* Disclaimer */}
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded p-3">
                <p className="text-xs text-amber-800">
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
                  className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 text-sm font-semibold"
                >
                  Complete PHQ-8 Assessment
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
  <h2 className="text-xl font-semibold text-gray-900 mb-4">
  Recent 7-Day EMA Summary
</h2>

{ema.length >= 2 && ema_summary ? (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
    
    <div>
      <p className="text-gray-600">Adherence</p>
      <p className="font-semibold text-gray-900 text-lg">
        {ema_summary.adherence_percent}%
      </p>
    </div>

    <div>
      <p className="text-gray-600">Avg Depression</p>
      <p className="font-semibold text-gray-900 text-lg">
        {ema_summary.weekly_avg_depression?.toFixed(2)}
      </p>
    </div>

    <div>
      <p className="text-gray-600">Mood Variability</p>
      <p className="font-semibold text-gray-900 text-lg">
        {ema_summary.mood_variability?.toFixed(2)}
      </p>
    </div>

    <div>
      <p className="text-gray-600">Trend</p>
      <p className="font-semibold text-gray-900 text-lg">
        {ema_summary.trend_depression}
      </p>
    </div>

  </div>
) : (
  <p className="text-sm text-gray-600">
    Not enough EMA data for summary.
  </p>
)}
</div>

        {/* Info Footer */}
        <div className="mt-8 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            <strong>Dashboard Information:</strong> This dashboard displays your daily monitoring data from EMA entries and PHQ-8 assessments. 
            Charts update automatically as you complete daily check-ins.
          </p>
        </div>
      </div>
    </div>
  );
}
