# Federated Learning Implementation — ConfidMind

## 1. Overview

ConfidMind includes a **data-driven simulated federated learning (FL)** module for the **GoEmotions** emotion classification task. The module trains a **lightweight linear model** over text partitioned into virtual clients, exposes **aggregate metrics only** over HTTP, and is intended for **FYP demonstration** of federated-style workflows—not as a replacement for the production DistilBERT GoEmotions inference path.

---

## 2. Why Federated Learning

- **Emotion and mental-health text** can be highly sensitive; centralized training on all raw text is often unacceptable for privacy and trust.
- **Federated learning** illustrates how model improvement can proceed when **raw data stays with clients** and only **updates or metrics** are shared with a coordinating server.
- In this prototype, **raw client text never leaves its virtual partition**; the dashboard and API expose **aggregated metrics and client metadata**, not training transcripts.
- The design makes the **privacy story** concrete for reviewers: **local data, global coordination**.

---

## 3. Dataset Used

- **GoEmotions** (Hugging Face) is the source taxonomy; the project maps it to **seven coarse labels** for the demo:
  **anger, disgust, fear, joy, sadness, surprise, neutral**
- **Generated dataset (JSONL):**  
  `fyp-backend/data/emotion_dataset.jsonl`
- **Label metadata (JSON):**  
  `fyp-backend/data/emotion_label_names.json`

---

## 4. Dataset Creation Script

- **Script:** `fyp-backend/scripts/create_goemotions_jsonl.py`
- Loads GoEmotions via **Hugging Face `datasets`**.
- **Maps** fine-grained emotion labels into the **seven coarse labels** above.
- **Deduplicates** rows by text/label where applicable.
- Writes **train / validation / test** splits as JSONL records (each row includes a `split` field and multi-label vectors for the demo classifier).

---

## 5. Client Partitioning

- **Training** rows are split across **five virtual clients** (`client-1` … `client-5`), all running in **one backend process** on a single machine for prototype and demo use.
- **Uneven partition weights** (by design) mimic heterogeneous client data volumes:

  | Client | Share of training partition |
  |--------|-----------------------------|
  | A | 30% |
  | B | 25% |
  | C | 20% |
  | D | 15% |
  | E | 10% |

- Uneven splits make aggregation and weighting behavior easier to explain to stakeholders than five equal slices.

---

## 6. Local Training

- Each participating client **trains only on its partition** of the training split.
- **Features:** TF-IDF (`TfidfVectorizer`, capped vocabulary, n-grams).
- **Classifier:** `sklearn.multiclass.OneVsRestClassifier` wrapping **`SGDClassifier`** (log loss, few iterations) for fast rounds on a laptop.
- The FL path is **deliberately lightweight** so **federated rounds complete in seconds** during live demos.
- The **existing DistilBERT GoEmotions checkpoint** used elsewhere in the app is **not modified or overwritten** by this module.

---

## 7. Federated Rounds

- One **round** = one cycle of **local training** on selected clients followed by **server-side aggregation** of client metrics into global figures.
- A **random subset** of clients may sit **idle** in a round to mimic intermittent participation in real FL.
- **HTTP API (prefix `/api/federated`):**
  - **`POST /api/federated/rounds/simulate`** — advance the simulation by **exactly one** round (or no-op if already at the configured round cap).
  - **`POST /api/federated/reset`** — reset the simulation state.
  - **`GET /api/federated/metrics`** — return **current** metrics **without** simulating a new round (read-only for polling).

---

## 8. Aggregation Method

- Global numbers are computed as **data-size–weighted averages** of per-client validation metrics (**FedAvg-style weighting on metrics**, not on neural network weights).
- **Weights** align with each client’s **training partition size**.
- Reported quantities include **loss** (Hamming-loss–style proxy), **exact-match accuracy**, and **micro-averaged F1**.
- For **multi-label** emotion labels, **micro-F1** is generally **more informative** than exact-match accuracy; the UI and copy call this out where relevant.

---

## 9. Dashboard

- **Frontend route:** `/admin`
- **Navigation:** **FL Dashboard** entry in the main layout (opens the federated demo view).
- The dashboard surfaces:
  - **Global model status** (status, current round, model version, active clients)
  - **Client nodes** (per-client stats and participation)
  - **Metrics chart** — loss, accuracy, and **F1** over rounds
  - **Round timeline** — chronological round summaries
- **Controls:**
  - **Refresh** — `GET /api/federated/metrics`
  - **Simulate Round** — `POST /api/federated/rounds/simulate`
  - **Reset** — `POST /api/federated/reset` (with confirmation)
  - **Auto-refresh** optional polling for metrics only

---

## 10. Backend Files

| File | Role |
|------|------|
| `fyp-backend/ml/services/federated_goemotions_service.py` | Core simulation: data load, partitions, local train/eval, aggregation, round state |
| `fyp-backend/app/routers/federated.py` | REST routes for metrics, simulate, reset, clients, rounds |

---

## 11. Frontend Files

| File | Role |
|------|------|
| `fyp-frontend/src/pages/AdminDashboardPage.jsx` | FL dashboard page, controls, metrics polling |
| `fyp-frontend/src/components/ClientNode.jsx` | Per-client card UI |
| `fyp-frontend/src/components/MetricsChart.jsx` | Loss / accuracy / F1 chart |
| `fyp-frontend/src/components/RoundTimeline.jsx` | Round history presentation |
| `fyp-frontend/src/utils/api.js` | `getFederatedMetrics`, `simulateFederatedRound`, `resetFederatedSimulation` |

---

## 12. Current Limitations

- **Simulated FL:** virtual clients on **one machine**; not deployed across real devices or edge nodes.
- **Aggregation** is at **metrics level**, not full **transformer weight** federation.
- The **TF-IDF + linear** model is **separate** from the **DistilBERT GoEmotions** checkpoint used for production-style inference.
- A **test** split exists in the JSONL pipeline, but **round metrics** shown in the dashboard are driven by **validation-set evaluation** after local training; test-set reporting is not yet wired into the UI.
- **No database persistence** for FL rounds or checkpoints—state lives in the running service until reset or restart.

---

## 13. Future Work

- **Real distributed clients** (separate processes or devices) with a coordination protocol.
- **Flower** (or similar) integration for scalable orchestration.
- **Full model weight aggregation** (e.g. neural checkpoints) where latency and hardware allow.
- **Persistent FL experiment logs** in **PostgreSQL** (rounds, hyperparameters, reproducible runs).
- **Optional live prediction API** for the FL model only if quality and calibration justify exposing it beside DistilBERT.
- **Transformer-based federated fine-tuning** (GPU / Colab) for research-grade emotion models while keeping the current laptop-friendly demo path.
