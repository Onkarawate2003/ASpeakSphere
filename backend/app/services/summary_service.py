"""Background service — AI conversation evaluation persistence.

Phase 1 — AI Conversation Summary Enhancement.

This module provides a single entry-point function
:func:`generate_and_persist_summary` that is designed to run as a FastAPI
``BackgroundTask``.  It owns its own database session so it can safely outlive
the HTTP request that scheduled it, and it handles all failures silently so
that a Groq outage can never surface as an error to the learner.

Architecture note
-----------------
The critical conversation-completion flow (status → "ended", XP awarding,
HTTP response) is fully decoupled from summary generation.  This function
runs *after* the response has already been returned to the client.
"""

from __future__ import annotations

import logging
from typing import List

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.conversations import Conversation
from app.models.messages import ConversationMessage
from app.models.performance import ConversationPerformance
from app.services.ai_service import AIServiceError, generate_conversation_summary

logger = logging.getLogger(__name__)


def generate_and_persist_summary(conversation_id: int) -> None:
    """Generate an AI evaluation and persist it to ``conversation_performance``.

    Intended to be scheduled via FastAPI's ``BackgroundTasks`` — runs after
    the HTTP response is already sent.  Creates and closes its own
    ``SessionLocal`` session so it is never bound to the request's DB session.

    Failure modes are silently logged so that:
    - A Groq outage never raises a 5xx that the user sees.
    - Conversation completion, XP awards, and history always continue to work.
    - The ``conversation_performance`` row simply won't exist for this session;
      the frontend will display a graceful fallback.

    Args:
        conversation_id: Primary key of the ``conversations`` row to evaluate.
    """
    db: Session = SessionLocal()
    try:
        # ------------------------------------------------------------------ #
        # 1. Load the conversation and its messages within our own session.   #
        # ------------------------------------------------------------------ #
        conversation: Conversation | None = (
            db.query(Conversation)
            .filter(Conversation.id == conversation_id)
            .first()
        )
        if conversation is None:
            logger.warning(
                "generate_and_persist_summary: conversation %d not found — skipping.",
                conversation_id,
            )
            return

        messages: List[ConversationMessage] = (
            db.query(ConversationMessage)
            .filter(ConversationMessage.conversation_id == conversation_id)
            .order_by(ConversationMessage.id)
            .all()
        )

        if not messages:
            logger.info(
                "generate_and_persist_summary: conversation %d has no messages — skipping.",
                conversation_id,
            )
            return

        # ------------------------------------------------------------------ #
        # 2. Guard against duplicate evaluation (idempotent).                 #
        # ------------------------------------------------------------------ #
        existing: ConversationPerformance | None = (
            db.query(ConversationPerformance)
            .filter(ConversationPerformance.conversation_id == conversation_id)
            .first()
        )
        if existing is not None:
            logger.info(
                "generate_and_persist_summary: conversation %d already has a "
                "performance record (id=%d) — skipping duplicate.",
                conversation_id,
                existing.id,
            )
            return

        # ------------------------------------------------------------------ #
        # 3. Call Groq and obtain the structured evaluation.                  #
        # ------------------------------------------------------------------ #
        logger.info(
            "generate_and_persist_summary: generating practice-aware summary for conversation %d "
            "(practice_type=%s, %d messages).",
            conversation_id,
            conversation.practice_type,
            len(messages),
        )
        evaluation: dict = generate_conversation_summary(
            messages,
            practice_type=conversation.practice_type,
            lesson_title=conversation.lesson_title,
        )

        # ------------------------------------------------------------------ #
        # 4. Persist the evaluation.                                          #
        # ------------------------------------------------------------------ #
        # strengths and areas_for_improvement come back as lists from the AI
        # service; store them newline-joined (mirrors lesson_objectives pattern).
        performance = ConversationPerformance(
            conversation_id=conversation_id,
            overall_score=evaluation["overall_score"],
            coach_feedback=evaluation["coach_feedback"],
            strengths="\n".join(evaluation.get("strengths", [])),
            areas_for_improvement="\n".join(evaluation.get("areas_for_improvement", [])),
            next_recommendation=evaluation.get("next_recommendation"),
            # details is reserved for future practice-mode-specific metrics.
            details=None,
        )
        db.add(performance)
        db.commit()

        logger.info(
            "generate_and_persist_summary: persisted performance record for "
            "conversation %d (overall_score=%d).",
            conversation_id,
            evaluation["overall_score"],
        )

    except AIServiceError as exc:
        logger.warning(
            "generate_and_persist_summary: AI service error for conversation %d — %s. "
            "Summary will not be available for this session.",
            conversation_id,
            exc.message,
        )
        # Do NOT re-raise — conversation completion must not be affected.
    except Exception:  # noqa: BLE001
        logger.exception(
            "generate_and_persist_summary: unexpected error for conversation %d — "
            "summary will not be available.",
            conversation_id,
        )
        # Do NOT re-raise.
    finally:
        db.close()


__all__ = ["generate_and_persist_summary"]
