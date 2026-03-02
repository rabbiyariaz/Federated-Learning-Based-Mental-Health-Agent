const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000")
  .trim()
  .replace(/\/+$/, "");




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




export async function getOrCreateToken() {
  const existingToken = localStorage.getItem("token");

  if (existingToken) {
    return existingToken;
  }

  const res = await fetch(`${BASE_URL}/api/sessions/create`, {
    method: "POST"
  });

  if (!res.ok) {
    throw new Error("Failed to create session");
  }

  const data = await res.json();
  localStorage.setItem("token", data.access_token);
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

  if (res.status === 401) {
    localStorage.removeItem("token");
    token = await getOrCreateToken();

    res = await fetch(`${BASE_URL}/phq`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
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

  if (res.status === 401) {
    localStorage.removeItem("token");
    token = await getOrCreateToken();

    res = await fetch(`${BASE_URL}/ema`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
  }

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`EMA submission failed: ${res.status} ${msg}`);
  }

  return res.json();
}

export async function fetchEMATodayStatus() {
  let token = await getOrCreateToken();

  let res = await fetch(`${BASE_URL}/ema/today-status`, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  if (res.status === 401) {
    localStorage.removeItem("token");
    token = await getOrCreateToken();

    res = await fetch(`${BASE_URL}/ema/today-status`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
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

  if (res.status === 401) {
    localStorage.removeItem("token");
    token = await getOrCreateToken();

    res = await fetch(`${BASE_URL}/text-entries`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ text })
    });
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

  // If token expired → clear + regenerate once
  if (res.status === 401) {
    localStorage.removeItem("token");
    token = await getOrCreateToken();

    res = await fetch(`${BASE_URL}/report`, {
      signal,
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
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

  // If token expired → clear + regenerate once
  if (res.status === 401) {
    localStorage.removeItem("token");
    token = await getOrCreateToken();

    res = await fetch(`${BASE_URL}/report/weekly-text-risk`, {
      signal,
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
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

  // If token expired → clear and retry once
  if (res.status === 401) {
    localStorage.removeItem("token");
    token = await getOrCreateToken();

    res = await fetch(`${BASE_URL}/api/study/summary`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
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
