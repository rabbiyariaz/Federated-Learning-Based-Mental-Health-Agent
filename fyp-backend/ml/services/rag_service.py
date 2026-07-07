from pathlib import Path
import re
import logging
import numpy as np

from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

STOPWORDS = {
    "i","im","i'm","me","my","mine","we","our","you","your","yours",
    "a","an","the","and","or","but","so",
    "is","am","are","was","were","be","been","being",
    "to","of","in","on","at","for","from","with","about",
    "it","this","that","these","those",
    "what","why","how","when","where",
    "do","does","did",
    "feel","feeling","today","lately","really","just"
}
logger = logging.getLogger(__name__)


class RAGService:

    def __init__(self):
        # fyp-backend/ml/rag/data/knowledge_base.txt
        self.kb_path = Path(__file__).resolve().parents[1] / "rag" / "data" / "knowledge_base.txt"
        print(f"RAG KB path: {self.kb_path} (exists={self.kb_path.exists()})")
        self.embedding_model = None
        self.chunks: list[str] = []
        self.chunk_embeddings = None

        try:
            self.embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
        except Exception as exc:
            logger.exception("Failed to load embedding model, using keyword fallback only: %s", exc)
            self.embedding_model = None

        self._build_embedding_index()

    def _chunk_text(self, text: str) -> list[str]:
        """
        Split KB by section tags like [ANXIETY], [PHQ], [SLEEP].
        Each chunk keeps the tag + section content together.
        """
        lines = text.splitlines()
        chunks: list[str] = []
        current_tag = None
        current_body: list[str] = []

        for raw_line in lines:
            line = raw_line.rstrip()
            tag_match = re.fullmatch(r"\[([A-Za-z_]+)\]\s*", line.strip())
            if tag_match:
                if current_tag is not None:
                    body = "\n".join(current_body).strip()
                    if body:
                        chunks.append(f"{current_tag}\n{body}")
                    else:
                        chunks.append(current_tag)
                current_tag = f"[{tag_match.group(1).upper()}]"
                current_body = []
                continue
            current_body.append(line)

        if current_tag is not None:
            body = "\n".join(current_body).strip()
            if body:
                chunks.append(f"{current_tag}\n{body}")
            else:
                chunks.append(current_tag)

        if chunks:
            return [c.strip() for c in chunks if c.strip()]

        # Backward-compatible fallback for untagged KB content.
        raw_chunks = re.split(r"\n\s*\n", text.strip())
        return [chunk.strip() for chunk in raw_chunks if chunk.strip()]

    def _build_embedding_index(self):
        """
        Build semantic retrieval index once at startup.
        Safe no-op if KB/model is unavailable.
        """
        self.chunks = []
        self.chunk_embeddings = None

        if not self.kb_path.exists():
            logger.warning("Knowledge base file not found at %s", self.kb_path)
            return

        text = self.kb_path.read_text(encoding="utf-8", errors="ignore").strip()
        if not text:
            logger.warning("Knowledge base is empty at %s", self.kb_path)
            return

        self.chunks = self._chunk_text(text)
        if not self.chunks:
            logger.warning("No chunks built from knowledge base at %s", self.kb_path)
            return

        if not self.embedding_model:
            return

        try:
            self.chunk_embeddings = self.embedding_model.encode(
                self.chunks,
                convert_to_numpy=True,
                normalize_embeddings=True,
            )
        except Exception as exc:
            logger.exception("Failed to create chunk embeddings, using keyword fallback: %s", exc)
            self.chunk_embeddings = None

    def _semantic_retrieve(self, query: str, top_k: int = 3, min_score: float = 0.25) -> list[tuple[float, str]]:
        if not self.embedding_model or self.chunk_embeddings is None or not self.chunks:
            return []

        query = (query or "").strip()
        if not query:
            return []

        try:
            query_embedding = self.embedding_model.encode(
                [query],
                convert_to_numpy=True,
                normalize_embeddings=True,
            )
            similarities = cosine_similarity(query_embedding, self.chunk_embeddings)[0]
        except Exception as exc:
            logger.exception("Semantic retrieval failed: %s", exc)
            return []

        ranked_indices = np.argsort(similarities)[::-1]

        non_rules: list[tuple[float, str]] = []
        rules: list[tuple[float, str]] = []
        for idx in ranked_indices:
            score = float(similarities[idx])
            if score < min_score:
                continue
            chunk = self.chunks[int(idx)]
            if "[RULES]" in chunk.upper():
                rules.append((score, chunk))
            else:
                non_rules.append((score, chunk))
            if len(non_rules) >= top_k:
                break

        if non_rules:
            return non_rules[:top_k]
        return rules[:top_k]

    @staticmethod
    def _semantic_debug_tag_preview(chunk: str, preview_max: int = 100) -> tuple[str, str]:
        """Extract section tag and short preview for demo logging only."""
        lines = chunk.splitlines()
        if not lines:
            return "[UNTAGGED]", ""
        first = lines[0].strip()
        m = re.match(r"^\[([A-Za-z_]+)\]\s*(.*)$", first)
        if m:
            tag = f"[{m.group(1).upper()}]"
            rest_parts = [p for p in [m.group(2).strip()] + [ln.strip() for ln in lines[1:]] if p]
            preview = " ".join(rest_parts).replace("\n", " ")
            preview = preview.strip() or "(empty body)"
        else:
            tag = "[UNTAGGED]"
            preview = " ".join(ln.strip() for ln in lines if ln.strip()).replace("\n", " ")
        if len(preview) > preview_max:
            preview = preview[:preview_max].rstrip() + "..."
        return tag, preview

    def _keyword_retrieve_context(self, query: str, max_chars: int = 1200) -> str:
        chunks = self.chunks
        if not chunks:
            if not self.kb_path.exists():
                return "Knowledge base not found."
            text = self.kb_path.read_text(encoding="utf-8", errors="ignore").strip()
            if not text:
                return "Knowledge base is empty."
            chunks = self._chunk_text(text)
            if not chunks:
                return "Knowledge base is empty."

        # Extract keywords (length >= 3) from query, case-insensitive.
        raw = re.findall(r"[a-zA-Z]{3,}", (query or "").lower())
        keywords = [w for w in raw if w not in STOPWORDS]

        if not keywords:
            return "No relevant context found."

        scored_chunks = []
        preferred_tags = set()
        if any(w in ("phq", "phq8", "phq-8", "depression", "score", "questionnaire") for w in keywords):
           preferred_tags.add("[phq]")
        if any(w in ("anxious", "anxiety", "panic", "panicking", "overwhelmed", "stress", "stressed", "calm", "breathing", "grounding") for w in keywords):
           preferred_tags.add("[coping]")
        if any(w in ("therapist", "therapy", "counselor", "counselling", "counseling", "doctor", "gp", "professional", "helpline", "hotline", "support") for w in keywords):
           preferred_tags.add("[services]")
        if any(w in ("sleep", "insomnia", "tired", "fatigue", "night", "rest") for w in keywords):
           preferred_tags.add("[sleep]")
        if any(w in ("study","studies","focus","concentrate","exam","assignment","deadline","uni","university","college","work") for w in keywords):
           preferred_tags.add("[study_work]")

        if any(w in ("numb", "empty", "hopeless", "worthless", "sad", "low", "depressed", "lonely") for w in keywords):
           preferred_tags.add("[low_mood]")

        if any(w in ("anxious", "anxiety", "panic", "panicking", "overthinking", "worried", "worry") for w in keywords):
           preferred_tags.add("[anxiety]")
        print("DEBUG preferred_tags =", preferred_tags)
        for chunk in chunks:
            lower_chunk = chunk.lower()
            if "[rules]" in lower_chunk:
              continue
            score = sum(1 for kw in keywords if kw in lower_chunk)

            # Boost tag matches when user query maps to known tag groups.
            if preferred_tags and any(tag in lower_chunk for tag in preferred_tags):
              score += 3
            if score >= 2:
                scored_chunks.append((score, chunk))
        preview = [(s, c.splitlines()[0][:60]) for s, c in scored_chunks[:5]]
        print("DEBUG scored_chunks_count =", len(scored_chunks), "top =", preview)
        if not scored_chunks:
            if preferred_tags:
                tag_chunks = []
                for chunk in chunks:
                    lower_chunk = chunk.lower()
                    if "[rules]" in lower_chunk:
                        continue
                    if any(tag in lower_chunk for tag in preferred_tags):
                        tag_chunks.append(chunk)
                if tag_chunks:
                    top_tag = tag_chunks[:2]
                    result = "\n\n---\n\n".join(top_tag)
                    if len(result) > max_chars:
                        result = result[:max_chars].rstrip()
                    result = re.sub(r"^\[[A-Z_]+\]\s*\n?", "", result, flags=re.MULTILINE)
                    return result
            return "No relevant context found."

        # Sort by score descending and take top 3 chunks.
        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        top_chunks = [c for _score, c in scored_chunks[:3]]

        result = "\n\n---\n\n".join(top_chunks)
        if len(result) > max_chars:
            result = result[:max_chars].rstrip()
        result = re.sub(r"^\[[A-Z_]+\]\s*\n?", "", result, flags=re.MULTILINE)
        return result

    def retrieve_context_with_meta(
        self, query: str, max_chars: int = 1200
    ) -> tuple[str, str, list[str] | None]:
        """
        Same retrieval as retrieve_context; also returns mode and non-sensitive chunk tags.
        """
        results = self._semantic_retrieve(query, top_k=3, min_score=0.25)

        if results:
            print("DEBUG RAG mode = semantic")
            print(
                "DEBUG RAG semantic results =",
                [(round(score, 3), chunk.splitlines()[0][:80]) for score, chunk in results],
            )
            tag_order: list[str] = []
            seen: set[str] = set()
            for rank, (score, chunk) in enumerate(results, start=1):
                tag, preview = self._semantic_debug_tag_preview(chunk)
                print(
                    f"DEBUG RAG selected chunk {rank}: score={round(score, 3)} tag={tag} preview={preview}"
                )
                if tag not in seen:
                    seen.add(tag)
                    tag_order.append(tag)
            retrieved_tags = tag_order or None

            top_chunks = [chunk for _score, chunk in results]
            result = "\n\n---\n\n".join(top_chunks)
            result = re.sub(r"^\[[A-Z_]+\]\s*\n?", "", result, flags=re.MULTILINE)
            if len(result) > max_chars:
                result = result[:max_chars].rstrip()
            return result, "semantic", retrieved_tags

        print("DEBUG RAG mode = keyword_fallback")
        text = self._keyword_retrieve_context(query, max_chars=max_chars)
        return text, "keyword_fallback", None

    def retrieve_context(self, query: str, max_chars: int = 1200) -> str:
        text, _, _ = self.retrieve_context_with_meta(query, max_chars=max_chars)
        return text


