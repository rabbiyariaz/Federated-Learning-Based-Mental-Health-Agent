import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { getPHQSeverityLabel } from '../utils/scoring';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

/**
 * DashboardPage Component - Symptom Monitoring Dashboard
 * 
 * Purpose: Visualize PHQ-8 and EMA data over time
 * - Shows trend charts for mood, energy, and sleep
 * - Compares baseline (Day 0) vs endpoint (Day 14) PHQ-8 scores
 * - Tracks EMA completion progress
 * 
 * Academic Context: FYP - Depression Symptom Monitoring System
 * Data visualization helps identify patterns and changes over 14-day period
 */

export default function DashboardPage() {
  const navigate = useNavigate();
  const [studyData, setStudyData] = useState(null);
  const [emaData, setEmaData] = useState([]);
  const [phqData, setPhqData] = useState(null);
  const [loading, setLoading] = useState(true);

  /**
   * Load data from localStorage on component mount
   */
  useEffect(() => {
    const loadData = () => {
      const data = JSON.parse(localStorage.getItem('studyData')) || {};
      setStudyData(data);
      setEmaData(data.emaEntries || []);
      setPhqData(data.phq8 || null);
      setLoading(false);
    };

    loadData();
  }, []);

  /**
   * Prepare Mood data for line chart
   * Question 1: Low mood (reversed for display: lower = better)
   */
  const getMoodChartData = () => {
    if (!emaData.length) return null;

    // Sort by study day
    const sortedData = [...emaData].sort((a, b) => a.studyDay - b.studyDay);

    const labels = sortedData.map((entry) => `Day ${entry.studyDay}`);
    const moodScores = sortedData.map((entry) => entry.responses[1] || null);

    return {
      labels,
      datasets: [
        {
          label: 'Mood Score (1=Not at all, 5=Extremely)',
          data: moodScores,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          tension: 0.3,
        },
      ],
    };
  };

  /**
   * Prepare Anhedonia data for line chart
   * Question 2: Reduced interest or pleasure in activities
   */
  const getAnhedoniaChartData = () => {
    if (!emaData.length) return null;

    const sortedData = [...emaData].sort((a, b) => a.studyDay - b.studyDay);

    const labels = sortedData.map((entry) => `Day ${entry.studyDay}`);
    const anhedoniaScores = sortedData.map((entry) => entry.responses[2] || null);

    return {
      labels,
      datasets: [
        {
          label: 'Anhedonia (1=Not at all, 5=Extremely)',
          data: anhedoniaScores,
          borderColor: 'rgb(168, 85, 247)',
          backgroundColor: 'rgba(168, 85, 247, 0.5)',
          tension: 0.3,
        },
      ],
    };
  };

  /**
   * Prepare Self-Criticism data for line chart
   * Question 4: Feeling negative about yourself or failure
   */
  const getSelfCriticismChartData = () => {
    if (!emaData.length) return null;

    const sortedData = [...emaData].sort((a, b) => a.studyDay - b.studyDay);

    const labels = sortedData.map((entry) => `Day ${entry.studyDay}`);
    const selfCriticismScores = sortedData.map((entry) => entry.responses[4] || null);

    return {
      labels,
      datasets: [
        {
          label: 'Self-Criticism (1=Not at all, 5=Extremely)',
          data: selfCriticismScores,
          borderColor: 'rgb(251, 146, 60)',
          backgroundColor: 'rgba(251, 146, 60, 0.5)',
          tension: 0.3,
        },
      ],
    };
  };

  /**
   * Prepare Cognitive/Psychomotor data for line chart
   * Question 5: Racing thoughts or restlessness severity
   */
  const getCognitiveChartData = () => {
    if (!emaData.length) return null;

    const sortedData = [...emaData].sort((a, b) => a.studyDay - b.studyDay);

    const labels = sortedData.map((entry) => `Day ${entry.studyDay}`);
    const cognitiveScores = sortedData.map((entry) => entry.responses[5] || null);

    return {
      labels,
      datasets: [
        {
          label: 'Cognitive/Psychomotor (1=Not at all, 5=Extremely)',
          data: cognitiveScores,
          borderColor: 'rgb(236, 72, 153)',
          backgroundColor: 'rgba(236, 72, 153, 0.5)',
          tension: 0.3,
        },
      ],
    };
  };

  /**
   * Prepare Energy/Sleep data for line chart
   * Shows both Fatigue (Q3) and Sleep Quality (Q6)
   */
  const getEnergyChartData = () => {
    if (!emaData.length) return null;

    const sortedData = [...emaData].sort((a, b) => a.studyDay - b.studyDay);

    const labels = sortedData.map((entry) => `Day ${entry.studyDay}`);
    const fatigueScores = sortedData.map((entry) => entry.responses[3] || null);
    const sleepScores = sortedData.map((entry) => entry.responses[6] || null);

    return {
      labels,
      datasets: [
        {
          label: 'Fatigue (1=Not at all, 5=Extremely)',
          data: fatigueScores,
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.5)',
          tension: 0.3,
        },
        {
          label: 'Sleep Quality (1=Very poor, 5=Very good)',
          data: sleepScores,
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.5)',
          tension: 0.3,
        },
      ],
    };
  };

  /**
   * Prepare PHQ-8 comparison chart (Day 0 vs Day 14)
   * Only shows if both baseline and endpoint data exist
   */
  const getPHQComparisonData = () => {
    // For now, we only have baseline (Day 0)
    // Day 14 would be collected at study end
    if (!phqData) return null;

    // Check if we have a Day 14 PHQ assessment
    const phq14 = studyData?.phq14 || null;

    if (!phq14) {
      // Only Day 0 available
      return {
        labels: ['Baseline (Day 0)'],
        datasets: [
          {
            label: 'PHQ-8 Total Score',
            data: [phqData.totalScore],
            backgroundColor: 'rgba(99, 102, 241, 0.7)',
            borderColor: 'rgb(99, 102, 241)',
            borderWidth: 2,
          },
        ],
      };
    }

    // Both Day 0 and Day 14 available
    return {
      labels: ['Baseline (Day 0)', 'Endpoint (Day 14)'],
      datasets: [
        {
          label: 'PHQ-8 Total Score',
          data: [phqData.totalScore, phq14.totalScore],
          backgroundColor: [
            'rgba(99, 102, 241, 0.7)',
            'rgba(34, 197, 94, 0.7)',
          ],
          borderColor: ['rgb(99, 102, 241)', 'rgb(34, 197, 94)'],
          borderWidth: 2,
        },
      ],
    };
  };

  /**
   * Calculate EMA completion progress
   * Returns number of days completed out of 14
   */
  const getEMAProgress = () => {
    const uniqueDays = new Set(emaData.map((entry) => entry.studyDay));
    return {
      completed: uniqueDays.size,
      total: 14,
      percentage: Math.round((uniqueDays.size / 14) * 100),
    };
  };

  const moodData = getMoodChartData();
  const anhedoniaData = getAnhedoniaChartData();
  const selfCriticismData = getSelfCriticismChartData();
  const cognitiveData = getCognitiveChartData();
  const energyData = getEnergyChartData();
  const phqComparisonData = getPHQComparisonData();
  const emaProgress = getEMAProgress();

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 5,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 24,
        title: {
          display: true,
          text: 'PHQ-8 Score (0-24)',
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading dashboard...</p>
      </div>
    );
  }

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
          
          {emaData.length > 0 ? (
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <div className="bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full transition-all duration-500"
                      style={{ width: `${emaProgress.percentage}%` }}
                    ></div>
                  </div>
                </div>
                <div className="text-sm font-semibold text-gray-700">
                  {emaProgress.completed} / {emaProgress.total} days
                </div>
              </div>
              <p className="text-sm text-gray-600">
                You've completed {emaProgress.completed} daily check-ins. Keep going!
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
                <Line data={moodData} options={chartOptions} />
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
                <Line data={anhedoniaData} options={chartOptions} />
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
            {energyData ? (
              <div className="h-64">
                <Line data={energyData} options={chartOptions} />
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                <p className="text-gray-500 text-sm">
                  No energy/sleep data available yet
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
                <Line data={selfCriticismData} options={chartOptions} />
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
            {cognitiveData ? (
              <div className="h-64">
                <Line data={cognitiveData} options={chartOptions} />
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
          {phqComparisonData ? (
            <div>
              <div className="h-80">
                <Bar data={phqComparisonData} options={barChartOptions} />
              </div>
              
              {/* Severity Interpretation */}
              <div className="mt-4 grid grid-cols-2 gap-4">
                {/* Baseline Severity */}
                <div className="bg-indigo-50 border-l-4 border-indigo-500 p-3">
                  <p className="text-xs text-gray-600 font-semibold">Baseline (Day 0)</p>
                  <p className="text-lg font-bold text-indigo-700">
                    {getPHQSeverityLabel(phqData.totalScore)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Score: {phqData.totalScore}/24</p>
                </div>
                
                {/* Follow-up Severity */}
                {studyData?.phq14 && (
                  <div className="bg-green-50 border-l-4 border-green-500 p-3">
                    <p className="text-xs text-gray-600 font-semibold">Follow-up (Day 14)</p>
                    <p className="text-lg font-bold text-green-700">
                      {getPHQSeverityLabel(studyData.phq14.totalScore)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Score: {studyData.phq14.totalScore}/24
                    </p>
                  </div>
                )}
              </div>
              
              {!studyData?.phq14 && (
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
                  <strong>Disclaimer:</strong> These severity labels are for informational and monitoring purposes only. 
                  They do NOT constitute a clinical diagnosis. Professional assessment is required for any clinical interpretation.
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
            <strong>Dashboard Information:</strong> This dashboard displays your symptom tracking data. 
            Data is stored locally in your browser. Charts update automatically as you complete daily check-ins.
          </p>
        </div>
      </div>
    </div>
  );
}
