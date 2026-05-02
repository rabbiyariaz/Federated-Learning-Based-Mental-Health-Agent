import { getOrCreateToken } from '../api/backend';

/**
 * Mock API functions for the mental health AI agent
 * These will be replaced with real API calls later
 */

/**
 * Analyzes text input and optional mood data
 * @param {string} text - The journal-style text input
 * @param {Object} moodData - Optional mood data from MoodQuestions component
 * @returns {Promise<Object>} Analysis results with emotions, risk, and explanation
 */
export async function analyzeText(text, moodData = null) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Mock response - in real implementation, this would be a fetch call
  // POST /api/analyze
  const mockEmotions = [
    ['sadness', 'anxiety'],
    ['fear', 'sadness'],
    ['joy', 'love'],
    ['anger', 'disgust'],
    ['sadness', 'fear', 'anxiety'],
  ];

  const mockRisks = ['low', 'medium', 'high'];
  const mockExplanations = [
    'Your text reflects persistent low mood indicators that may benefit from professional support.',
    'The analysis suggests moderate emotional distress. Consider speaking with a mental health professional.',
    'Your responses indicate some emotional challenges. Professional guidance could be helpful.',
    'The text shows signs of emotional well-being, but continued self-monitoring is recommended.',
  ];

  // Simple mock logic based on text length and content
  const textLength = text.length;
  const hasNegativeWords = /(sad|depressed|anxious|worried|stressed|tired|exhausted|hopeless|lonely)/i.test(text);
  
  let riskLevel = 'low';
  let emotions = mockEmotions[0];
  let explanation = mockExplanations[3];

  if (hasNegativeWords || textLength > 200) {
    if (textLength > 500 || hasNegativeWords) {
      riskLevel = 'medium';
      emotions = mockEmotions[1];
      explanation = mockExplanations[0];
    } else {
      riskLevel = 'low';
      emotions = mockEmotions[0];
      explanation = mockExplanations[2];
    }
  }

  // Adjust based on mood data if provided
  if (moodData) {
    const avgMood = (moodData.sleep + moodData.energy) / 2;
    if (avgMood <= 2 || moodData.appetite === 'decrease') {
      if (riskLevel === 'low') riskLevel = 'medium';
      else if (riskLevel === 'medium') riskLevel = 'high';
      explanation = mockExplanations[1];
    }
  }

  return {
    emotions,
    risk: riskLevel,
    explanation,
  };
}

/**
 * Sends a chat message to the agent
 * @param {string} message - The user's chat message
 * @param {Array} history - Optional chat history
 * @returns {Promise<Object>} Agent response
 */
// export async function sendChatMessage(message, history = []) {
//   // Simulate API delay (1 second for realism)
//   await new Promise(resolve => setTimeout(resolve, 1000));

//   // Mock responses based on message content
//   const lowerMessage = message.toLowerCase();
  
//   // Simple keyword-based mock responses for demonstration
//   const responses = [
//     "I understand that you're going through a difficult time. It's important to remember that your feelings are valid, and seeking support is a sign of strength.",
//     "Thank you for sharing that with me. It sounds like you're dealing with a lot right now. Have you considered speaking with a mental health professional about these concerns?",
//     "I hear you. It's completely normal to experience ups and downs. Remember that you don't have to face these challenges alone - there are resources and people who want to help.",
//     "I appreciate you opening up. What you're describing sounds challenging. Would it be helpful to explore some coping strategies together?",
//     "Thank you for trusting me with your thoughts. It takes courage to express what you're feeling. Remember, professional support is available when you're ready.",
//   ];

//   // Context-aware mock responses
//   let response = responses[Math.floor(Math.random() * responses.length)];
  
//   if (lowerMessage.includes('sad') || lowerMessage.includes('depressed') || lowerMessage.includes('down')) {
//     response = "I can sense that you're feeling low right now. These feelings can be really difficult to navigate. Have you noticed any patterns in when these feelings tend to be stronger?";
//   } else if (lowerMessage.includes('anxious') || lowerMessage.includes('worried') || lowerMessage.includes('stress')) {
//     response = "Anxiety and worry can feel overwhelming. It's helpful to remember that these feelings, while uncomfortable, are temporary. Have you tried any breathing exercises or grounding techniques?";
//   } else if (lowerMessage.includes('help') || lowerMessage.includes('support')) {
//     response = "I'm glad you're reaching out. There are many resources available, including mental health professionals, crisis helplines, and support groups. Would you like me to share some information about finding professional help?";
//   } else if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
//     response = "You're very welcome. I'm here to listen and support you. Remember, taking care of your mental health is important, and you're taking positive steps by engaging in this conversation.";
//   } else if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
//     response = "Hello! I'm here to listen and provide support. How are you feeling today? Feel free to share what's on your mind.";
//   }

//   return {
//     response: response,
//   };
// }

const CHAT_API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000")
  .trim()
  .replace(/\/+$/, "");

export async function sendChatMessage(message, history = []) {
  const body = JSON.stringify({
    message,
    history: (history || []).map(m => ({
      text: m.text ?? "",
      type: (m.type ?? m.sender ?? m.role ?? "").toString().toLowerCase() === "user" ? "user" : "agent",
      timestamp: m.timestamp ?? null,
    })),
  });

  let token = await getOrCreateToken();
  let res = await fetch(`${CHAT_API_BASE}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body,
  });

  if (res.status === 401) {
    localStorage.removeItem("token");
    token = await getOrCreateToken();
    res = await fetch(`${CHAT_API_BASE}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body,
    });
  }

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Chat API failed: ${res.status} ${txt}`);
  }

  return await res.json();
}

export async function getChatHistory() {
  let token = await getOrCreateToken();
  let res = await fetch(`${CHAT_API_BASE}/chat/history`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 401) {
    localStorage.removeItem("token");
    token = await getOrCreateToken();
    res = await fetch(`${CHAT_API_BASE}/chat/history`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Chat history failed: ${res.status} ${txt}`);
  }

  return await res.json();
}

export async function clearChatHistory() {
  let token = await getOrCreateToken();
  let res = await fetch(`${CHAT_API_BASE}/chat/history`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 401) {
    localStorage.removeItem("token");
    token = await getOrCreateToken();
    res = await fetch(`${CHAT_API_BASE}/chat/history`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Clear chat history failed: ${res.status} ${txt}`);
  }

  return await res.json();
}


export async function getFederatedMetrics() {
  const res = await fetch("http://127.0.0.1:8000/api/federated/metrics");

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Federated metrics API failed: ${res.status} ${txt}`);
  }

  return await res.json();
}

export async function simulateFederatedRound() {
  const res = await fetch("http://127.0.0.1:8000/api/federated/rounds/simulate", {
    method: "POST",
  });

  if (!res.ok) {
    throw new Error(`Federated round simulation failed: ${res.statusText}`);
  }

  return await res.json();
}

export async function resetFederatedSimulation() {
  const res = await fetch("http://127.0.0.1:8000/api/federated/reset", {
    method: "POST",
  });

  if (!res.ok) {
    throw new Error(`Federated reset failed: ${res.statusText}`);
  }

  return await res.json();
}

