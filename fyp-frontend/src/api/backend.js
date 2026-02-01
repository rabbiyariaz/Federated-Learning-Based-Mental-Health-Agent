const BASE_URL = "http://127.0.0.1:8000";

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
  const res = await fetch(`${BASE_URL}/phq`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
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
  const res = await fetch(`${BASE_URL}/ema`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
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

export async function fetchReport() {
  const res = await fetch(`${BASE_URL}/report`);
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Report fetch failed: ${res.status} ${msg}`);
  }
  return res.json(); // or blob() later for PDF
}
