import os
import logging
from typing import List, Optional, Dict
from pathlib import Path

from dotenv import load_dotenv
from groq import Groq

logger = logging.getLogger(__name__)


class LLMService:
    def __init__(self):
        env_path = Path(__file__).resolve().parents[2] / ".env"
        load_dotenv(dotenv_path=env_path)

        self.api_key = (os.getenv("GROQ_API_KEY") or "").strip()
        self.model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
        self.client = Groq(api_key=self.api_key) if self.api_key else None

    def generate_chat_response(
        self,
        user_message: str,
        rag_context: str = "",
        history: Optional[List[Dict[str, str]]] = None,
    ) -> str:
        """
        Generate a natural, supportive chatbot response using Groq LLM.
        RAG context is used as supporting information, not copied directly.
        """

        if not self.client:
            logger.warning("GROQ_API_KEY is missing. Falling back to local response.")
            return self._fallback_response(user_message, rag_context)

        system_prompt = (
            "You are ConfidMind, a supportive mental-health companion chatbot for students. "
            "Your role is to provide emotionally supportive, calm, practical, and non-judgmental responses. "
            "You are not a doctor, therapist, or emergency service. "
            "Do not diagnose the user. Do not claim certainty about their mental health condition. "
            "Use the retrieved knowledge context when it is relevant, but do not copy it word-for-word. "
            "If the retrieved context is not relevant, answer naturally using general supportive guidance. "
            "Keep responses concise, warm, and conversational. "
            "Ask one gentle follow-up question at the end. "
            "If the user describes immediate danger, self-harm, suicide, or wanting to die, advise emergency/local crisis support immediately."
        )

        context_block = ""
        if rag_context and "no relevant context" not in rag_context.lower():
            context_block = (
                "Relevant knowledge base context:\n"
                f"{rag_context}\n\n"
                "Use this context only if it genuinely helps answer the user."
            )
        else:
            context_block = (
                "No strong knowledge base context was found. "
                "Respond using safe, general supportive guidance."
            )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "system", "content": context_block},
        ]

        if history:
            for item in history[-6:]:
                role = item.get("role", "user")
                content = item.get("content", "")
                if role in ["user", "assistant"] and content:
                    messages.append({"role": role, "content": content})

        messages.append({"role": "user", "content": user_message})

        try:
            completion = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.4,
                max_tokens=350,
            )
            return completion.choices[0].message.content.strip()

        except Exception as exc:
            logger.exception("Groq LLM call failed: %s", exc)
            return self._fallback_response(user_message, rag_context)

    def _fallback_response(self, user_message: str, rag_context: str = "") -> str:
        if rag_context and "no relevant context" not in rag_context.lower():
            return (
                "I hear you. Based on what I found, this may help:\n\n"
                f"{rag_context}\n\n"
                "Can you tell me which part feels most difficult right now?"
            )

        return (
            "I hear you. I may not have the perfect reference for this, but we can still talk it through. "
            "Can you tell me what happened and how it is making you feel right now?"
        )

