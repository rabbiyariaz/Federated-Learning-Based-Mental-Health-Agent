from pathlib import Path
import re
import logging
from typing import List

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

    def _chunk_text(self, text: str) -> List[str]:
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

# Boost PHQ-tagged chunks when user is asking PHQ-type queries
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


