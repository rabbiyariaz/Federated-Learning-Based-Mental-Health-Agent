const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000")
  .trim()
  .replace(/\/+$/, "");

const SESSION_RESTORE_FLAG = "sessionRestoreRequired";
let sessionBootstrapPromise = null;

export class SessionExpiredError extends Error {
  constructor(message = "Session expired. Restore it or start a new one.") {
    super(message);
    this.name = "SessionExpiredError";
    this.code = "SESSION_EXPIRED";
  }
}


/**
 * Check if JWT token has already expired
 */
function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiresAt = payload.exp * 1000;
    return expiresAt <= Date.now();
  } catch (err) {
    console.error('Error decoding token:', err);
    return true;
  }
}


function setSessionRestoreRequired(message) {
  localStorage.setItem(SESSION_RESTORE_FLAG, "true");
  window.dispatchEvent(
    new CustomEvent("session:restore-required", {
      detail: { message },
    })
  );
}


function clearSessionRestoreRequired() {
  localStorage.removeItem(SESSION_RESTORE_FLAG);
}


function emitRecoveryCodeIfPresent(res) {
  const recoveryCode = res.headers.get("X-Recovery-Code");
  if (recoveryCode) {
    window.dispatchEvent(
      new CustomEvent("session:recovery-code", {
        detail: { recoveryCode },
      })
    );
  }
  return res;
}


async function touchSession(token) {
  const res = await fetch(`${BASE_URL}/api/sessions/me`, {
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });

  emitRecoveryCodeIfPresent(res);

  if (!res.ok) {
    const msg = await res.text();
    const err = new Error(`Session touch failed: ${res.status} ${msg}`);
    err.status = res.status;
    throw err;
  }

  return res.json();
}


async function createSession() {
  const res = await fetch(`${BASE_URL}/api/sessions/create`, {
    method: "POST",
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Session creation failed: ${res.status} ${msg}`);
  }

  emitRecoveryCodeIfPresent(res);
  return res.json();
}


async function createAndStoreSession() {
  try {
    const data = await createSession();
    localStorage.setItem("token", data.access_token);
    clearSessionRestoreRequired();
    return {
      token: data.access_token,
      recoveryCode: data.recovery_code ?? null,
      created: true,
    };
  } catch {
    setSessionRestoreRequired("Session invalid. Restore it.");
    throw new SessionExpiredError();
  }
}


export async function getOrCreateToken() {
  const result = await bootstrapSession();
  return result.token;
}

export async function bootstrapSession() {
  const existingToken = localStorage.getItem("token");

  if (!existingToken) {
    return await createAndStoreSession();
  }

  if (isTokenExpired(existingToken)) {
    localStorage.removeItem("token");
    setSessionRestoreRequired("Your session expired. Restore it.");
    throw new SessionExpiredError();
  }

  try {
    await touchSession(existingToken);
    clearSessionRestoreRequired();
    return { token: existingToken, recoveryCode: null, created: false };
  } catch (err) {
    if (err.status === 401) {
      localStorage.removeItem("token");
      setSessionRestoreRequired(
        "Session invalid. Restore with your recovery code or start a new session."
      );
      throw new SessionExpiredError();
    }
    throw err;
  }
}


export async function startNewSession() {
  clearSessionRestoreRequired();
  localStorage.removeItem("token");
  const data = await createSession();
  localStorage.setItem("token", data.access_token);
  return {
    token: data.access_token,
    recoveryCode: data.recovery_code ?? null,
  };
}


export async function restoreSession(recoveryCode) {
  const res = await fetch(`${BASE_URL}/api/sessions/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recovery_code: recoveryCode }),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Session restore failed: ${res.status} ${msg}`);
  }

  emitRecoveryCodeIfPresent(res);
  const data = await res.json();
  localStorage.setItem("token", data.access_token);
  clearSessionRestoreRequired();
  return data.access_token;
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
  let token = await getOrCreateToken();

  let res = await fetch(`${BASE_URL}/phq`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  emitRecoveryCodeIfPresent(res);

  if (res.status === 401) {
    localStorage.removeItem("token");
    setSessionRestoreRequired("Your session expired. Restore it with your recovery code or start a new one.");
    throw new SessionExpiredError();
  }

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`PHQ submission failed: ${res.status} ${msg}`);
  }

  return res.json();
}

/* -------------------------
   EMA API
-------------------------- */

export async function submitEMA(payload) {
  let token = await getOrCreateToken();

  let res = await fetch(`${BASE_URL}/ema`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  emitRecoveryCodeIfPresent(res);

  if (res.status === 401) {
    localStorage.removeItem("token");
    setSessionRestoreRequired("Your session expired. Restore it with your recovery code or start a new one.");
    throw new SessionExpiredError();
  }

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`EMA submission failed: ${res.status} ${msg}`);
  }

  return res.json();
}

export async function fetchEMATodayStatus() {
  let token = await getOrCreateToken();

  // Get client's local date (not UTC)
  const today = new Date();
  const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  let res = await fetch(`${BASE_URL}/ema/today-status?check_date=${localDate}`, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  emitRecoveryCodeIfPresent(res);

  if (res.status === 401) {
    localStorage.removeItem("token");
    setSessionRestoreRequired("Your session expired. Restore it with your recovery code or start a new one.");
    throw new SessionExpiredError();
  }

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`EMA status check failed: ${res.status} ${msg}`);
  }

  return res.json();
}

/* -------------------------
   Text Entry API
-------------------------- */

export async function submitTextEntry(text) {
  let token = await getOrCreateToken();

  let res = await fetch(`${BASE_URL}/text-entries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ text })
  });

  emitRecoveryCodeIfPresent(res);

  if (res.status === 401) {
    localStorage.removeItem("token");
    setSessionRestoreRequired("Your session expired. Restore it with your recovery code or start a new one.");
    throw new SessionExpiredError();
  }

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Text entry submission failed: ${res.status} ${msg}`);
  }

  return res.json();
}

/* -------------------------
   Report API
-------------------------- */
export async function fetchReport(signal) {
  let token = await getOrCreateToken();

  let res = await fetch(`${BASE_URL}/report`, {
    signal,
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  emitRecoveryCodeIfPresent(res);

  if (res.status === 401) {
    localStorage.removeItem("token");
    setSessionRestoreRequired("Your session expired. Restore it with your recovery code or start a new one.");
    throw new SessionExpiredError();
  }

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Report fetch failed: ${res.status} ${msg}`);
  }

  return res.json();
}

export async function fetchWeeklyTextRisk(signal) {
  let token = await getOrCreateToken();

  let res = await fetch(`${BASE_URL}/report/weekly-text-risk`, {
    signal,
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  emitRecoveryCodeIfPresent(res);

  if (res.status === 401) {
    localStorage.removeItem("token");
    setSessionRestoreRequired("Your session expired. Restore it with your recovery code or start a new one.");
    throw new SessionExpiredError();
  }

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Weekly text risk fetch failed: ${res.status} ${msg}`);
  }

  return res.json();
}
/* -------------------------
  DashBoard
-------------------------- */
export async function fetchDashboardSummary() {
  let token = await getOrCreateToken();

  let res = await fetch(`${BASE_URL}/api/study/summary`, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  emitRecoveryCodeIfPresent(res);

  if (res.status === 401) {
    localStorage.removeItem("token");
    setSessionRestoreRequired("Your session expired. Restore it with your recovery code or start a new one.");
    throw new SessionExpiredError();
  }

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Dashboard fetch failed: ${res.status} ${msg}`);
  }

  return res.json();
}



// export async function getOrCreateSessionId() {
//   const existing = localStorage.getItem(SESSION_ID_KEY);

//   if (existing) {
//     try {
//       const res = await fetch(`${BASE_URL}/api/sessions/validate/${existing}`);
//       if (res.ok) {
//         return existing;
//       }
//     } catch (err) {
//       console.error("Session validation failed:", err);
//     }
//   }

//   const session = await createSession();
//   const sessionId = session.session_id;

//   localStorage.setItem(SESSION_ID_KEY, sessionId);
//   localStorage.setItem(USER_ID_KEY, sessionId);

//   return sessionId;
// }
