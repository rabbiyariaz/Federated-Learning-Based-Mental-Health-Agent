from pathlib import Path
import re

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
class RAGService:

    def __init__(self):
        # fyp-backend/ml/rag/data/knowledge_base.txt
        self.kb_path = Path(__file__).resolve().parents[1] / "rag" / "data" / "knowledge_base.txt"

    def _chunk_text(self, text: str) -> list[str]:
        """Split text into chunks separated by one or more blank lines."""
        raw_chunks = re.split(r"\n\s*\n", text.strip())
        return [chunk.strip() for chunk in raw_chunks if chunk.strip()]

    def retrieve_context(self, query: str, max_chars: int = 1200) -> str:
        if not self.kb_path.exists():
            return "Knowledge base not found."

        text = self.kb_path.read_text(encoding="utf-8", errors="ignore").strip()
        if not text:
            return "Knowledge base is empty."

        chunks = self._chunk_text(text)
        if not chunks:
            return "Knowledge base is empty."

        # Extract keywords (length >= 3) from query, case-insensitive.
        raw = re.findall(r"[a-zA-Z]{3,}", query.lower())
        keywords = [w for w in raw if w not in STOPWORDS]
        if not keywords:
            return "No relevant context found."

        scored_chunks = []
        prefer_phq = any(w in ("phq", "phq8", "phq-8", "depression", "score", "questionnaire") for w in keywords)
        for chunk in chunks:
            lower_chunk = chunk.lower()
            score = sum(1 for kw in keywords if kw in lower_chunk)

# Boost PHQ-tagged chunks when user is asking PHQ-type queries
            if prefer_phq and "[phq]" in lower_chunk:
              score += 3
            if score >= 2:
                scored_chunks.append((score, chunk))

        if not scored_chunks:
            return "No relevant context found."

        # Sort by score descending and take top 3 chunks.
        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        top_chunks = [c for _score, c in scored_chunks[:3]]

        result = "\n\n---\n\n".join(top_chunks)
        if len(result) > max_chars:
            result = result[:max_chars].rstrip()

        return result


