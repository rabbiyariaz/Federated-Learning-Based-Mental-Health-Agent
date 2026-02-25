const BASE_URL = "http://127.0.0.1:8000";
const SESSION_ID_KEY = "sessionId";
const USER_ID_KEY = "userId";

async function createSession() {
  const res = await fetch(`${BASE_URL}/api/sessions/create`, {
    method: "POST",
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Session creation failed: ${res.status} ${msg}`);
  }

  return res.json();
}



export async function getOrCreateSessionId() {
  const existing = localStorage.getItem(SESSION_ID_KEY);

  if (existing) {
    try {
      const res = await fetch(`${BASE_URL}/api/sessions/validate/${existing}`);
      if (res.ok) {
        return existing;
      }
    } catch (err) {
      console.error("Session validation failed:", err);
    }
  }

  const session = await createSession();
  const sessionId = session.session_id;

  localStorage.setItem(SESSION_ID_KEY, sessionId);
  localStorage.setItem(USER_ID_KEY, sessionId);

  return sessionId;
}

export async function checkHealth() {
  const res = await fetch(`${BASE_URL}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}

export async function predictText(text) {
  const res = await fetch(`${BASE_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Predict failed: ${res.status} ${msg}`);
  }

  return res.json();
}


/* -------------------------
   PHQ API
-------------------------- */

export async function submitPHQ(payload) {
  const resolvedPayload = { ...payload };
  if (!resolvedPayload.user_id) {
    resolvedPayload.user_id = await getOrCreateSessionId();
  }

  const res = await fetch(`${BASE_URL}/phq`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(resolvedPayload),
  });

  if (!res.ok) {
  let msg;
  try {
    msg = await res.json();
  } catch {
    msg = await res.text();
  }
  throw new Error(`PHQ submission failed: ${res.status} ${JSON.stringify(msg)}`);
}

  return res.json();
}

/* -------------------------
   EMA API
-------------------------- */

export async function submitEMA(payload) {
  const resolvedPayload = { ...payload };
  if (!resolvedPayload.user_id) {
    resolvedPayload.user_id = await getOrCreateSessionId();
  }

  const res = await fetch(`${BASE_URL}/ema`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(resolvedPayload),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`EMA submission failed: ${res.status} ${msg}`);
  }

  return res.json();
}

/* -------------------------
   Report API
-------------------------- */

export async function fetchReport(userId, signal) {
  const res = await fetch(`${BASE_URL}/report/${userId}`, { signal });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Report fetch failed: ${res.status} ${msg}`);
  }
  return res.json(); // or blob() later for PDF
}

/* -------------------------
  DashBoard
-------------------------- */
export async function fetchDashboardSummary(userId) {
  const res = await fetch(`${BASE_URL}/api/study/${userId}/summary`);
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Dashboard fetch failed: ${res.status} ${msg}`);
  }
  return res.json();
}
