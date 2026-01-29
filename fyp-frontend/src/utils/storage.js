/**
 * LocalStorage utilities for history management
 * Stores screening and chat history entries in the browser
 */

const STORAGE_KEY = 'mh_agent_history';

/**
 * Saves a history entry to localStorage
 * @param {Object} entry - History entry object with id, type, timestamp, and data
 */
export function saveHistoryEntry(entry) {
  try {
    const existingEntries = getHistoryEntries();
    const updatedEntries = [entry, ...existingEntries]; // Most recent first
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedEntries));
  } catch (error) {
    console.error('Error saving history entry:', error);
  }
}

/**
 * Retrieves all history entries from localStorage
 * @returns {Array} Array of history entries, sorted by most recent first
 */
export function getHistoryEntries() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const entries = JSON.parse(stored);
    // Validate it's an array
    if (!Array.isArray(entries)) return [];
    
    // Sort by timestamp (most recent first) as a safety measure
    return entries.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA;
    });
  } catch (error) {
    console.error('Error reading history entries:', error);
    return [];
  }
}

/**
 * Clears all history entries from localStorage
 */
export function clearHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing history:', error);
  }
}

