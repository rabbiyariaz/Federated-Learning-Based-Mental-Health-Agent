/**
 * Utility Functions for Symptom Monitoring Calculations
 * 
 * Purpose: Provide centralized, reusable scoring and analysis functions
 * for PHQ-8 and EMA data across the application
 * 
 * Academic Context: FYP - Depression Symptom Monitoring System
 * These metrics help identify symptom patterns, trends, and stability
 */

/**
 * calculatePHQScore(responses)
 * 
 * Calculates total PHQ-8 score from individual question responses
 * 
 * Args:
 *   responses: Object { questionId: score } where score is 0-3
 *   Example: { 1: 2, 2: 1, 3: 3, 4: 2, 5: 1, 6: 2, 7: 1, 8: 0 }
 * 
 * Returns: Number (0-24 range)
 * 
 * Why This Matters:
 * - PHQ-8 is a validated screening tool for depressive symptoms
 * - Total score integrates all 8 symptom domains
 * - Used at baseline (Day 0) and follow-up (Day 14) to measure change
 * - Score range: 0-24 (higher = more symptoms, for monitoring only)
 * - NOT diagnostic; interpreted only within research context
 * 
 * Clinical Note: In this system, scores are for MONITORING purposes.
 * No severity labels or diagnostic interpretations are provided.
 */
export function calculatePHQScore(responses) {
  if (!responses || Object.keys(responses).length === 0) {
    return 0;
  }

  // Sum all individual question scores (each 0-3)
  const totalScore = Object.values(responses).reduce((sum, score) => {
    return sum + (typeof score === 'number' ? score : 0);
  }, 0);

  // Ensure score is within valid range
  return Math.min(Math.max(totalScore, 0), 24);
}

/**
 * calculateEMAAverage(entries, field)
 * 
 * Calculates the mean (average) of a specific EMA question across multiple days
 * 
 * Args:
 *   entries: Array of EMA entry objects (from localStorage)
 *   field: Question number (1-6) to average
 *   Example: calculateEMAAverage(emaEntries, 1) for Mood
 * 
 * Returns: Number (0-5 range, rounded to 1 decimal place)
 * 
 * Why This Matters:
 * - Identifies overall symptom level across the monitoring period
 * - Higher average = more frequent/intense symptom experience
 * - Useful for tracking whether symptoms are improving, worsening, or stable
 * - Provides context-free summary (no labels like "mild" or "severe")
 * - Used in dashboard visualizations for trend analysis
 * 
 * Research Application:
 * - Aggregates daily experiences into meaningful summaries
 * - Enables comparison within-subject (person vs. their own baseline)
 * - Reduced impact of single-day anomalies or good/bad days
 * - Better reflects habitual symptom patterns
 */
export function calculateEMAAverage(entries, field) {
  if (!entries || entries.length === 0) {
    return 0;
  }

  // Filter entries that have a response for the requested field
  const validScores = entries
    .map((entry) => entry.responses[field])
    .filter((score) => typeof score === 'number' && score > 0);

  if (validScores.length === 0) {
    return 0;
  }

  // Calculate mean and round to 1 decimal place
  const sum = validScores.reduce((acc, score) => acc + score, 0);
  const average = sum / validScores.length;

  return Math.round(average * 10) / 10;
}

/**
 * calculateEMAVariability(entries, field)
 * 
 * Calculates the standard deviation (variability/consistency) of an EMA symptom
 * across multiple days
 * 
 * Args:
 *   entries: Array of EMA entry objects (from localStorage)
 *   field: Question number (1-6) to analyze
 *   Example: calculateEMAVariability(emaEntries, 3) for Energy variability
 * 
 * Returns: Number (0-5 range, rounded to 2 decimal places)
 *          0 = consistent (same score every day)
 *          2+ = highly variable (big fluctuations)
 * 
 * Why This Matters:
 * - Distinguishes between STABLE and FLUCTUATING symptoms
 * - Low variability = consistent symptom pattern (predictable)
 * - High variability = mood/symptom fluctuations (less predictable)
 * - Clinical relevance: Symptom stability is important for treatment planning
 * - Indicates responsiveness to daily stressors or life events
 * 
 * Example Interpretations:
 * - Mood variability SD=0.1: "Person reports very consistent mood day-to-day"
 * - Mood variability SD=1.5: "Person experiences significant mood fluctuations"
 * 
 * Research Applications:
 * - Identifies who has stable vs. episodic symptoms
 * - May correlate with stress exposure or coping mechanisms
 * - Important for personalized monitoring strategies
 * - Helps researchers understand individual symptom patterns
 * 
 * Note: This is standard deviation, which is appropriate for 1-5 scales
 * and provides a normalized measure of spread.
 */
export function calculateEMAVariability(entries, field) {
  if (!entries || entries.length < 2) {
    return 0; // Need at least 2 data points for variability
  }

  // Get all valid scores for the requested field
  const validScores = entries
    .map((entry) => entry.responses[field])
    .filter((score) => typeof score === 'number' && score > 0);

  if (validScores.length < 2) {
    return 0;
  }

  // Calculate mean
  const mean = validScores.reduce((acc, score) => acc + score, 0) / validScores.length;

  // Calculate sum of squared differences from mean
  const sumSquaredDifferences = validScores.reduce(
    (acc, score) => acc + Math.pow(score - mean, 2),
    0
  );

  // Calculate variance and standard deviation
  const variance = sumSquaredDifferences / validScores.length;
  const standardDeviation = Math.sqrt(variance);

  // Round to 2 decimal places
  return Math.round(standardDeviation * 100) / 100;
}

/**
 * Helper: Get all EMA entries from localStorage
 */
export function getEMAEntries() {
  const studyData = JSON.parse(localStorage.getItem('studyData')) || {};
  return studyData.emaEntries || [];
}

/**
 * Helper: Get PHQ-8 baseline score
 */
export function getPHQBaseline() {
  const studyData = JSON.parse(localStorage.getItem('studyData')) || {};
  return studyData.phq8?.totalScore || null;
}

/**
 * Helper: Get PHQ-8 follow-up score (Day 14)
 */
export function getPHQFollowUp() {
  const studyData = JSON.parse(localStorage.getItem('studyData')) || {};
  return studyData.phq14?.totalScore || null;
}

/**
 * Helper: Calculate PHQ-8 change (follow-up - baseline)
 * Returns null if either score is missing
 */
export function calculatePHQChange() {
  const baseline = getPHQBaseline();
  const followUp = getPHQFollowUp();

  if (baseline === null || followUp === null) {
    return null;
  }

  return followUp - baseline;
}

/**
 * Helper: Get EMA completion percentage
 */
export function getEMACompletionPercentage() {
  const entries = getEMAEntries();
  const uniqueDays = new Set(entries.map((entry) => entry.studyDay));
  return Math.round((uniqueDays.size / 14) * 100);
}

/**
 * Helper: Format score summary for display
 * Returns object with calculated metrics for a specific EMA question
 */
export function getEMAQuestionSummary(fieldId) {
  const entries = getEMAEntries();

  return {
    average: calculateEMAAverage(entries, fieldId),
    variability: calculateEMAVariability(entries, fieldId),
    entriesCount: entries.length,
    lastValue: entries.length > 0 ? entries[entries.length - 1].responses[fieldId] : null,
  };
}

/**
 * getPHQSeverityLabel(score)
 * 
 * Interprets PHQ-8 total score into severity categories
 * 
 * Args:
 *   score: Number (0-24 range)
 * 
 * Returns: String severity label
 * 
 * IMPORTANT DISCLAIMER:
 * - These labels are for INFORMATIONAL and RESEARCH purposes only
 * - NOT for diagnostic use
 * - Clinical interpretation requires professional assessment
 * - Used in academic context to demonstrate understanding of PHQ-8
 * 
 * Reference: Kroenke et al., Gen Hosp Psychiatry. 2009;31(3):206-13
 * Standard PHQ-8/PHQ-9 severity thresholds
 */
export function getPHQSeverityLabel(score) {
  if (score < 5) {
    return "Minimal or None";
  } else if (score < 10) {
    return "Mild";
  } else if (score < 15) {
    return "Moderate";
  } else if (score < 20) {
    return "Moderately Severe";
  } else {
    return "Severe";
  }
}
