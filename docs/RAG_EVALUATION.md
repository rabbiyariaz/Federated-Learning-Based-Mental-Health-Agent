# RAG Evaluation - ConfidMind

## 1. RAG Architecture

ConfidMind RAG is implemented **directly in FastAPI** (`RAGService` in `fyp-backend/ml/services/rag_service.py`). There is **no LangChain** and **no ChromaDB, FAISS, or other external vector database**—chunks and embeddings live in process memory for the demo stack.

| Layer | Implementation |
|--------|------------------|
| **Knowledge source** | Curated `fyp-backend/ml/rag/data/knowledge_base.txt` with tagged sections (e.g. `[ANXIETY]`, `[PANIC]`, `[SELF_ESTEEM]`) |
| **Chunking** | Tagged sections parsed into chunks at startup |
| **Embeddings** | `SentenceTransformer("all-MiniLM-L6-v2")`; chunk vectors stored with L2-normalized embeddings |
| **Semantic retrieval** | Query embedded the same way; **cosine similarity** vs chunk matrix; top-k above a minimum score |
| **Keyword fallback** | If semantic retrieval yields no qualifying chunks, a **keyword / tag-boost** path scans the KB (still no vector DB) |
| **Generation** | Retrieved text is passed as **supporting context** to **Groq** (`LLMService`, `fyp-backend/ml/services/llm_service.py`), not copied verbatim |

For each user message that reaches RAG (see **§2 Crisis Safety**), the pipeline is: **knowledge_base.txt → embeddings → cosine similarity → (optional) keyword fallback → Groq LLM**. Crisis handling is **before** RAG and LLM.

---

## 2. Crisis Safety

- **Crisis / self-harm** phrasing is matched with **regex patterns** in `fyp-backend/app/routers/chat.py` **before** any RAG or LLM call.
- When a pattern matches, the **crisis route** runs: **no** `retrieve_context`, **no** Groq completion.
- A **fixed, deterministic** safety response is returned (same intent as logged `DEBUG crisis route triggered - skipping RAG and LLM`).
- This avoids probabilistic retrieval or model output on high-risk inputs.

---

## 3. Evaluation Test Cases

| Test Message | Expected Retrieval / Safety Route | Actual Retrieved Chunks | Result |
|---|---|---|---|
| I feel anxious before my exams and I cannot focus | `[ANXIETY]`, `[EXAM_ANXIETY]`, `[STUDY_WORK]` or `[STRESS]` | `[ANXIETY] 0.56, [STUDY_WORK] 0.539, [STRESS] 0.369` | Pass |
| I feel empty and unmotivated | `[MOTIVATION]`, `[LOW_MOOD]`, `[EMOTIONAL_NUMBNESS]` | `[MOTIVATION] 0.508, [LOW_MOOD] 0.458, [LONELINESS] 0.457` | Pass, but retrieval can improve with `[EMOTIONAL_NUMBNESS]` |
| I keep overthinking everything | `[OVERTHINKING]`, `[COPING]`, `[ANXIETY]` | `[OVERTHINKING] 0.644, [COPING] 0.278, [STUDY_WORK] 0.266` | Pass |
| I feel like I am not good enough | `[SELF_ESTEEM]`, `[NEGATIVE_THOUGHTS]` | `[SELF_ESTEEM] 0.458, [NEGATIVE_THOUGHTS] 0.361, [MOTIVATION] 0.315` | Pass |
| I feel lonely even when people are around | `[LONELINESS]`, `[RELATIONSHIPS]` | `[LONELINESS] 0.657, [SELF_ESTEEM] 0.347, [NEGATIVE_THOUGHTS] 0.338` | Pass |
| I had a panic feeling and my heart was racing | `[PANIC]`, `[ANXIETY]`, `[BREATHING]`, `[GROUNDING]` | `[PANIC] 0.55, [ANXIETY] 0.402, [EMOTIONAL_CHECKIN] 0.342` | Pass |
| I do not know what I feel, I just feel weird | `[EMOTIONAL_CHECKIN]`, `[COPING]` | `[EMOTIONAL_CHECKIN] 0.361, [ANXIETY] 0.319, [LONELINESS] 0.267` | Pass |
| I feel like hurting myself | Crisis safety route before RAG/LLM | `DEBUG crisis route triggered - skipping RAG and LLM` | Pass |

---

## 4. Chat Storage and Session Tracking

- **Anonymous JWT**: The frontend obtains a bearer token via `POST /api/sessions/create`; `session_id` is embedded in the JWT (`fyp-backend/app/auth.py`).
- **`POST /chat`** and **`GET/DELETE /chat/history`** use **`verify_token`** so the backend always knows the current anonymous `session_id`.
- **`chat_entries` table** (`ChatEntry` in `fyp-backend/app/models.py`): stores `user_message`, `assistant_response`, safe metadata (`rag_mode`, `retrieved_tags`, `crisis_detected`), and timestamps, **linked with `user_id` → `sessions.session_id`**. Full RAG text is **not** stored server-side for privacy.
- **Reload**: On chat page load, **`GET /chat/history`** restores the latest turns into the UI (paired user/agent bubbles).
- **Clear Chat**: **`DELETE /chat/history`** removes only **`chat_entries`** rows for that session; **PHQ, EMA, `text_entries`, and `sessions` rows are not deleted.**

---

## 5. Current Strengths

- Semantic retrieval is working and consistently returns relevant mental-health support sections.
- Groq LLM generation produces natural, conversational responses based on retrieved context.
- The knowledge base is curated, structured, and safety-focused for student/young-adult support use.
- Crisis route is deterministic and bypasses probabilistic RAG/LLM behavior for high-risk inputs.
- Debug logging includes similarity scores and selected chunk information, which improves transparency during testing.

---

## 6. Current Limitations

- The knowledge base is still relatively small and may miss niche phrasing.
- **No full vector database** yet; embeddings are built in memory at startup (not Chroma/FAISS/PGVector).
- **No admin KB editor** for non-developer updates or staged rollouts.
- **No frontend citations** or “sources used” panel for end users.
- **No long-term memory** beyond persisted **`chat_entries`** and client-side history utilities; RAG does not read past chats for retrieval.
- In some cases, the third retrieved chunk is related but not the best semantic fit.

---

## 7. Future Work

- **Vector store**: ChromaDB, FAISS, or similar if the KB grows and cold-start / memory limits become an issue; optional local embedding index cache for faster startup.
- **Admin KB editor** with versioning and safer publish workflow.
- **Citation display** in the app (or admin-only “sources used” preview tied to evaluation).
- **Privacy / retention policy** for `chat_entries` and exports (align with ethics/IRB).
- **User export and delete controls** beyond “Clear Chat” (e.g. full data export, account-style erasure if the product adds real accounts).
- Expand evaluation with more edge cases, ambiguous phrasing, and multilingual variants.
- Introduce knowledge base versioning for reproducible evaluation runs.
