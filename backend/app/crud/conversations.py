"""CRUD operations for the ``conversations`` table.

All functions expect an open SQLAlchemy ``Session``. Ownership scoping is
performed here: every query filters by ``user_id`` so a caller can never
accidentally read or mutate another user's conversation. The API layer still
performs an explicit ownership check (returning 404 for foreign conversations)
to keep HTTP semantics clear.
"""

import logging
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.conversations import Conversation
from app.models.messages import ConversationMessage
from app.schemas.conversations import ConversationCreate, ConversationUpdate

logger = logging.getLogger(__name__)


def get_conversation(db: Session, conversation_id: int, user_id: int) -> Optional[Conversation]:
    """Return a conversation owned by ``user_id``, or ``None`` if not found.

    Filtering by ``user_id`` guarantees that a foreign conversation id resolves
    to ``None`` rather than leaking another user's data.
    """
    return (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id, Conversation.user_id == user_id)
        .first()
    )


def get_user_conversations(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 50,
) -> List[Conversation]:
    """Return a user's conversations, newest first."""
    return (
        db.query(Conversation)
        .filter(Conversation.user_id == user_id)
        .order_by(Conversation.started_at.desc(), Conversation.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def create_conversation(
    db: Session,
    conversation_in: ConversationCreate,
    user_id: int,
) -> Conversation:
    """Create a new active conversation for ``user_id``.

    Phase 9 — persists the selected lesson (id / title / objectives) when
    provided. Objectives are joined into a single newline-separated text blob
    so they fit the ``Text`` column without a separate table. All lesson
    fields are optional so pre-Phase-9 callers keep working.
    """
    objectives_blob: Optional[str] = None
    if conversation_in.lesson_objectives:
        objectives_blob = "\n".join(conversation_in.lesson_objectives)

    conversation = Conversation(
        user_id=user_id,
        practice_type=conversation_in.practice_type.value,
        status="active",
        lesson_id=conversation_in.lesson_id,
        lesson_title=conversation_in.lesson_title,
        lesson_objectives=objectives_blob,
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation


def update_conversation(
    db: Session,
    conversation: Conversation,
    conversation_in: ConversationUpdate,
) -> Conversation:
    """Apply a partial update to an existing conversation.

    Only the fields supplied in ``conversation_in`` (non-``None``) are written.
    """
    payload = conversation_in.model_dump(exclude_unset=True)
    for field, value in payload.items():
        # Normalise enum members to their string values before persisting.
        if hasattr(value, "value"):
            value = value.value
        setattr(conversation, field, value)

    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation


def complete_conversation(db: Session, conversation: Conversation) -> Conversation:
    """Mark a conversation as ended, compute its duration and award XP.

    Sets ``status`` to ``"ended"``, records ``ended_at`` as the current time
    and derives ``duration_seconds`` from ``started_at``. Idempotent: calling
    this on an already-ended conversation leaves the original end time intact.

    Phase 10 — Progress Tracking & XP System:
    Once the conversation is persisted as ended, XP is awarded automatically
    via :func:`award_conversation_completion`. The award is idempotent (the
    ``xp_awards`` unique constraint on ``(user_id, source, reference)``
    guarantees XP is only ever awarded once per conversation), so re-completing
    an already-ended conversation is a safe no-op. XP awarding is wrapped in a
    try/except so a progress-layer failure never rolls back the conversation
    completion itself — the conversation is already committed by then.

    The XP award call is intentionally **unconditional** (outside the
    ``status != "ended"`` guard below). The normal frontend completion flow
    sends an explicit ``duration_seconds`` with the PATCH request, so the
    API endpoint calls :func:`update_conversation` first — which flips the
    status to ``"ended"`` and commits — *before* calling this function. If
    the award were nested inside the guard, the guard would be ``False`` on
    that path and XP would never be awarded. Keeping the call unconditional
    and relying on the idempotent ``xp_awards`` ledger fixes that path while
    remaining safe for re-completions (the duplicate check in
    :func:`award_conversation_completion` makes the second call a no-op).
    """
    needs_commit = False
    if conversation.status != "ended":
        now = datetime.now(timezone.utc)
        conversation.status = "ended"
        conversation.ended_at = now
        if conversation.started_at is not None:
            delta = now - conversation.started_at
            conversation.duration_seconds = int(delta.total_seconds())
        needs_commit = True
    elif conversation.ended_at is None:
        # Already ended (e.g. via ``update_conversation`` with an explicit
        # ``duration_seconds`` from the frontend) but ``ended_at`` was never
        # set — backfill it now so the history detail page can show the
        # session end time. Duration is left intact (the caller supplied it).
        conversation.ended_at = datetime.now(timezone.utc)
        if conversation.duration_seconds is None and conversation.started_at is not None:
            delta = conversation.ended_at - conversation.started_at
            conversation.duration_seconds = int(delta.total_seconds())
        needs_commit = True

    if needs_commit:
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    # Phase 10 — award XP for the completion. A lesson conversation
    # (``lesson_id`` is set) earns the lesson XP bundle; a free-form
    # conversation earns the conversation base + duration bonus. The
    # award is idempotent (the ``xp_awards`` unique constraint guarantees
    # XP is only ever awarded once per conversation), so this is safe even
    # if the conversation was already ended by an earlier update. This
    # call is intentionally OUTSIDE the status guard above — see the
    # docstring for the rationale.
    _award_completion_xp(db, conversation)
    return conversation


def _award_completion_xp(db: Session, conversation: Conversation) -> None:
    """Award XP for a just-completed conversation (best-effort).

    Imported lazily inside the function to avoid a circular import between
    ``crud.conversations`` and ``crud.progress`` at module load time. Any
    exception is logged and swallowed so the conversation completion (already
    committed) is never rolled back.
    """
    try:
        from app.crud.progress import award_conversation_completion

        duration = conversation.duration_seconds or 0
        is_lesson = conversation.lesson_id is not None
        awarded, xp_awarded, _ = award_conversation_completion(
            db,
            user_id=conversation.user_id,
            conversation_id=conversation.id,
            duration_seconds=duration,
            is_lesson=is_lesson,
            lesson_id=conversation.lesson_id,
        )
        if awarded:
            logger.info(
                "Awarded %s XP for conversation %s (user %s, is_lesson=%s)",
                xp_awarded,
                conversation.id,
                conversation.user_id,
                is_lesson,
            )
    except Exception:  # pragma: no cover - defensive: never break completion
        logger.exception(
            "Failed to award XP for conversation %s (user %s)",
            conversation.id,
            conversation.user_id,
        )


def delete_conversation(db: Session, conversation: Conversation) -> None:
    """Delete a conversation (and, via cascade, its messages)."""
    db.delete(conversation)
    db.commit()


def count_messages(db: Session, conversation_id: int) -> int:
    """Return the number of messages attached to a conversation."""
    return (
        db.query(ConversationMessage)
        .filter(ConversationMessage.conversation_id == conversation_id)
        .count()
    )


__all__ = [
    "get_conversation",
    "get_user_conversations",
    "create_conversation",
    "update_conversation",
    "complete_conversation",
    "delete_conversation",
    "count_messages",
]