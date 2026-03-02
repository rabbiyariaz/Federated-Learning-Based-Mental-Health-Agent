import re
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

from ml.services.rag_service import RAGService


router = APIRouter(prefix="/chat", tags=["chat"])

rag = RAGService()


class ChatMessage(BaseModel):
    text: str
    type: str  # "user" | "agent"
    timestamp: Optional[str] = None


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = None


@router.post("")
def chat(req: ChatRequest):
    msg = (req.message or "").strip().lower()
    print("DEBUG /chat history_len =", 0 if not req.history else len(req.history))
    if req.history:
     print("DEBUG /chat history_types =", [(m.type, (m.text or "")[:30]) for m in req.history[-4:]])
    if re.fullmatch(r"(hi|hello|hey|yo|hii+|helloo+)\.?", msg):
        return {
            "response": "Hey  I'm here with you. How are you feeling today  and what's been on your mind?"
        }
    # Safety: crisis/self-harm keywords -> immediate support + encourage professional help
    crisis_patterns = [
    r"\b(suicide|kill myself|end my life|want to die|die|self harm|self-harm|hurt myself)\b",
    ]
    if any(re.search(p, msg) for p in crisis_patterns):
      return {
        "response": (
            "I'm really sorry you're feeling this way, you don't have to carry this alone.\n\n"
            "If you're in immediate danger or feel like you might act on these thoughts, please call your local emergency number right now.\n"
            "If you can, reach out to someone you trust and stay with them.\n\n"
            "If you tell me your country (e.g., Pakistan/UK), I can share the right crisis helpline numbers."
        )
    }
    # If message is unclear / random, ask for clarification (neutral tone)
    words = re.findall(r"[a-zA-Z]{2,}", msg)

    STOP = {
        "i","im","i'm","me","my","mine",
        "you","your","yours",
        "a","an","the","and","or","but",
        "is","am","are","was","were","be","been","being",
        "to","of","in","on","at","for","from","with","about",
       "it","this","that","these","those"
      }

    meaningful = [w for w in words if w not in STOP]

    if len(meaningful) < 1:
      return {
        "response": "I'm here with you ,I'm not fully sure I understood that. Can you tell me a bit more about what you mean?"
      }
    # Intent routing: if user explicitly chooses a mode
    if re.search(r"\b(vent|rant|listen|hear me|talk to someone|talk to me|just listen)\b", msg):
     return {"response": "Okay.I'm listening. Tell me what's been going on, start wherever you want."}

    if re.search(r"\b(exercise|calm|breathing|grounding)\b", msg):
      return {"response": "Let's do a quick grounding exercise: name 5 things you can see, 4 you can feel, 3 you can hear, 2 you can smell, and 1 you can taste. Take your time ,what are 5 things you see?"}

    if re.search(r"\b(advice|what should i do|suggest)\b", msg):
     return {"response": "I can help with that. What's the main thing you want to change right now: your thoughts, your emotions, or your situation?"}
    context = rag.retrieve_context(req.message)
    last_user = None
    current = (req.message or "").strip().lower()

    if req.history:
      for m in reversed(req.history):
        if (m.type or "").strip().lower() == "user" and m.text:
            t = m.text.strip()
            if t.lower() == current:
                continue  # skip the current message if it appears in history
            last_user = t
            break

    if "no relevant context" in context.lower():
      response = (
        "I'm here with you. I might not have a perfect reference for this, but we can still talk it through.\n\n"
        "Can you tell me:\n"
        "1) what happened,\n"
        "2) how it's making you feel right now,\n"
        "3) what you need most in this moment (to vent, advice, or a calming exercise)?"
    )
    else:
       prefix = "I hear you."
       if last_user and last_user.lower() != req.message.strip().lower():
          prefix = f"I hear you. Earlier you mentioned: \"{last_user}\"."
       follow_up = "If you want, tell me what part you're most worried about and we'll break it down together."
       if any(x in msg for x in ("sleep", "insomnia", "tired")):
           follow_up = "What time do you usually go to bed and wake up, and what tends to keep you awake?"
       elif any(x in msg for x in ("anxious", "panic", "worried", "overthinking")):
           follow_up = "Is it more in your body (e.g. heart racing, tight chest) or in your thoughts (worry loops)?"
       elif any(x in msg for x in ("study", "studies", "focus", "exam", "assignment", "deadline")):
           follow_up = "What task are you trying to do today, and what feels like it's blocking you?"
       elif any(x in msg for x in ("numb", "empty", "hopeless", "sad", "depressed")):
           follow_up = "Is this feeling new or has it been building? What triggered it most today?"
       response = (
         f"{prefix} Here's what I found that may help:\n\n"
         f"{context}\n\n"
         f"{follow_up}"
)

    return {"response": response}
