import logging
import re
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional

from app.auth import verify_token
from app.database import get_db
from app.models import ChatEntry
from ml.services.rag_service import RAGService
from ml.services.llm_service import LLMService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])

rag = RAGService()
llm = LLMService()


class ChatMessage(BaseModel):
    text: str
    type: str  # "user" | "agent"
    timestamp: Optional[str] = None


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = None


def _try_save_chat_entry(
    db: Session,
    session_id: str,
    user_message: str,
    assistant_response: str,
    rag_mode: Optional[str],
    retrieved_tags: Optional[list],
    crisis_detected: bool,
) -> None:
    try:
        entry = ChatEntry(
            user_id=session_id,
            user_message=user_message,
            assistant_response=assistant_response,
            rag_mode=rag_mode,
            retrieved_tags=retrieved_tags,
            crisis_detected=crisis_detected,
        )
        db.add(entry)
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.warning("Failed to persist chat entry: %s", exc, exc_info=True)


@router.get("/history")
def get_chat_history(
    session_id: str = Depends(verify_token),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(ChatEntry)
        .filter(ChatEntry.user_id == session_id)
        .order_by(ChatEntry.created_at.desc())
        .limit(50)
        .all()
    )
    rows = list(reversed(rows))
    return {
        "history": [
            {
                "id": row.id,
                "user_message": row.user_message,
                "assistant_response": row.assistant_response,
                "rag_mode": row.rag_mode,
                "retrieved_tags": row.retrieved_tags,
                "crisis_detected": row.crisis_detected,
                "created_at": row.created_at.isoformat()
                if row.created_at is not None
                else "",
            }
            for row in rows
        ]
    }


@router.delete("/history")
def delete_chat_history(
    session_id: str = Depends(verify_token),
    db: Session = Depends(get_db),
):
    db.query(ChatEntry).filter(ChatEntry.user_id == session_id).delete(
        synchronize_session=False
    )
    db.commit()
    return {"message": "Chat history cleared successfully."}


@router.post("")
def chat(
    req: ChatRequest,
    session_id: str = Depends(verify_token),
    db: Session = Depends(get_db),
):
    msg = (req.message or "").strip().lower()
    print("DEBUG /chat history_len =", 0 if not req.history else len(req.history))
    if req.history:
        print(
            "DEBUG /chat history_types =",
            [(m.type, (m.text or "")[:30]) for m in req.history[-4:]],
        )
    if re.fullmatch(r"(hi|hello|hey|yo|hii+|helloo+)\.?", msg):
        response = (
            "Hey  I'm here with you. How are you feeling today  and what's been on your mind?"
        )
        _try_save_chat_entry(
            db,
            session_id,
            req.message,
            response,
            "rule_based",
            None,
            False,
        )
        return {"response": response}
    # Safety: crisis/self-harm keywords -> immediate support + encourage professional help
    crisis_patterns = [
        r"\b(suicide|suicidal|kill myself|end my life|want to die|wanna die|do not want to live|don't want to live)\b",
        r"\b(self harm|self-harm|harm myself|hurt myself|hurting myself|cut myself|cutting myself)\b",
        r"\b(i might hurt myself|i may hurt myself|i could hurt myself|i feel like hurting myself)\b",
    ]

    if any(re.search(p, msg) for p in crisis_patterns):
        print("DEBUG crisis route triggered - skipping RAG and LLM")
        response = (
            "I'm really sorry you're feeling this way. Your safety matters right now, and you do not have to handle this alone.\n\n"
            "If you might hurt yourself or feel unable to stay safe, please call your local emergency number now or go to the nearest emergency department. "
            "If possible, move away from anything you could use to hurt yourself and stay near another person.\n\n"
            "Please contact someone you trust right now — a friend, family member, roommate, teacher, or neighbor — and tell them: "
            "\"I’m not safe on my own right now. Can you stay with me or help me get support?\"\n\n"
            "If you tell me your country or region, I can help point you toward the right crisis helpline, but if there is immediate danger, call emergency services first."
        )
        _try_save_chat_entry(
            db,
            session_id,
            req.message,
            response,
            "crisis_safety_gate",
            None,
            True,
        )
        return {"response": response}
    # If message is unclear / random, ask for clarification (neutral tone)
    words = re.findall(r"[a-zA-Z]{2,}", msg)

    STOP = {
        "i",
        "im",
        "i'm",
        "me",
        "my",
        "mine",
        "you",
        "your",
        "yours",
        "a",
        "an",
        "the",
        "and",
        "or",
        "but",
        "is",
        "am",
        "are",
        "was",
        "were",
        "be",
        "been",
        "being",
        "to",
        "of",
        "in",
        "on",
        "at",
        "for",
        "from",
        "with",
        "about",
        "it",
        "this",
        "that",
        "these",
        "those",
    }

    meaningful = [w for w in words if w not in STOP]

    if len(meaningful) < 1:
        response = "I'm here with you ,I'm not fully sure I understood that. Can you tell me a bit more about what you mean?"
        _try_save_chat_entry(
            db,
            session_id,
            req.message,
            response,
            "rule_based",
            None,
            False,
        )
        return {"response": response}
    # Intent routing: if user explicitly chooses a mode
    if re.search(r"\b(vent|rant|listen|hear me|talk to someone|talk to me|just listen)\b", msg):
        response = "Okay.I'm listening. Tell me what's been going on, start wherever you want."
        _try_save_chat_entry(
            db,
            session_id,
            req.message,
            response,
            "rule_based",
            None,
            False,
        )
        return {"response": response}

    if re.search(r"\b(exercise|calm|breathing|grounding)\b", msg):
        response = "Let's do a quick grounding exercise: name 5 things you can see, 4 you can feel, 3 you can hear, 2 you can smell, and 1 you can taste. Take your time ,what are 5 things you see?"
        _try_save_chat_entry(
            db,
            session_id,
            req.message,
            response,
            "rule_based",
            None,
            False,
        )
        return {"response": response}

    if re.search(r"\b(advice|what should i do|suggest)\b", msg):
        response = "I can help with that. What's the main thing you want to change right now: your thoughts, your emotions, or your situation?"
        _try_save_chat_entry(
            db,
            session_id,
            req.message,
            response,
            "rule_based",
            None,
            False,
        )
        return {"response": response}
    context, rag_mode, retrieved_tags = rag.retrieve_context_with_meta(req.message)
    print("DEBUG RAG context found =", "no relevant context" not in context.lower())
    print("DEBUG RAG context preview =", context[:300])

    history_for_llm = []
    if req.history:
        for m in req.history[-6:]:
            msg_type = (m.type or "").strip().lower()
            text = (m.text or "").strip()

            if not text:
                continue

            if msg_type == "user":
                history_for_llm.append({"role": "user", "content": text})
            elif msg_type == "agent":
                history_for_llm.append({"role": "assistant", "content": text})

    response = llm.generate_chat_response(
        user_message=req.message,
        rag_context=context,
        history=history_for_llm,
    )

    _try_save_chat_entry(
        db,
        session_id,
        req.message,
        response,
        rag_mode,
        retrieved_tags,
        False,
    )
    return {"response": response}
