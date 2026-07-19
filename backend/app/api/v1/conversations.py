"""Conversation endpoints.

All routes are mounted under ``/api/conversations`` (see ``main.py``) and
require authentication via ``get_current_user``. Every read/write is scoped to
the authenticated user so a learner can only access their own conversations.

Phase M13 — Global English Accent & Voice Personalization.
``POST /{id}/messages`` passes the authenticated user's accent (and
proficiency level + learning goal) to the AI service so Emma always speaks,
spells and chooses vocabulary in the learner's chosen English variety. The
backend reads the preference directly from ``user_preferences`` — it never
trusts the frontend for this preference.
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.crud.conversations import (
    complete_conversation,
    count_messages,
    create_conversation,
    delete_conversation,
    get_conversation,
    get_user_conversations,
    update_conversation,
)
from app.crud.messages import create_message, get_messages
from app.crud.progress import get_conversation_xp
from app.database import get_db
from app.models.conversations import Conversation
from app.models.users import User
from app.schemas.conversations import (
    ConversationCreate,
    ConversationDetail,
    ConversationListItem,
    ConversationResponse,
    ConversationStatus,
    ConversationUpdate,
    _objectives_from_text,
)
from app.schemas.messages import MessageCreate, MessageResponse, MessageSender
from app.services.ai_service import AIServiceError, generate_ai_reply

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/conversations", tags=["conversations"])


def _user_accent(current_user: User) -> Optional[str]:
    """Return the authenticated user's chosen English accent, or ``None``.

    Phase M13 — the accent lives in ``user_preferences.english_variant``.
    The backend reads it directly from the authenticated user's preferences
    row and never trusts the frontend for this preference. When the user
    has no preferences row or no accent set, ``None`` is returned and the
    AI service falls back to the default accent (American English).
    """
    preferences = getattr(current_user, "preferences", None)
    if preferences is None:
        return None
    return getattr(preferences, "english_variant", None)


def _user_proficiency_level(current_user: User) -> Optional[str]:
    """Return the authenticated user's proficiency level, or ``None``."""
    preferences = getattr(current_user, "preferences", None)
    if preferences is None:
        return None
    return getattr(preferences, "proficiency_level", None)


def _user_learning_goal(current_user: User) -> Optional[str]:
    """Return the authenticated user's learning goal, or ``None``."""
    preferences = getattr(current_user, "preferences", None)
    if preferences is None:
        return None
    return getattr(preferences, "learning_goal", None)


def _get_owned_conversation(
    conversation_id: int,
    current_user: User,
    db: Session,
) -> Conversation:
    """Resolve a conversation owned by ``current_user`` or raise 404.

    A foreign conversation id resolves to 404 (not 403) so existence of other
    users' conversations is never leaked.
    """
    conversation = get_conversation(db, conversation_id=conversation_id, user_id=current_user.id)
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found.",
        )
    return conversation


def conversation_to_response(conversation: Conversation) -> ConversationResponse:
    """Build a ``ConversationResponse`` from a Conversation ORM row.

    The CRUD layer stores ``lesson_objectives`` as a newline-joined TEXT string
    (see ``app.crud.conversations.create_conversation``), but every response
    schema declares it as ``Optional[List[str]]``. Relying on Pydantic's
    ``from_attributes`` would pass the raw string straight through and raise a
    ``ResponseValidationError`` (HTTP 500) — the exact bug that broke
    ``POST /api/conversations``. This helper is the single place that converts
    the stored TEXT back into ``List[str]`` (or ``None``) so every endpoint
    returns a consistent, schema-valid ``ConversationResponse``.

    The list/detail endpoints reuse :func:`conversation_to_dict` (which shares
    the same conversion) and add their model-specific extras (``message_count``
    / ``messages``).
    """
    return ConversationResponse(**conversation_to_dict(conversation))


def conversation_to_dict(conversation: Conversation) -> dict:
    """Return the common conversation fields as a dict.

    ``lesson_objectives`` is always converted from the stored TEXT to
    ``List[str]`` / ``None`` via :func:`_objectives_from_text` here — the single
    source of truth — so no endpoint ever serialises the raw string.
    """
    return {
        "id": conversation.id,
        "user_id": conversation.user_id,
        "practice_type": conversation.practice_type,
        "status": conversation.status,
        "started_at": conversation.started_at,
        "ended_at": conversation.ended_at,
        "duration_seconds": conversation.duration_seconds,
        "created_at": conversation.created_at,
        "lesson_id": conversation.lesson_id,
        "lesson_title": conversation.lesson_title,
        "lesson_objectives": _objectives_from_text(conversation.lesson_objectives),
    }


@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
def create_new_conversation(
    conversation_in: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ConversationResponse:
    """Start a new active conversation for the authenticated user."""
    conversation = create_conversation(db, conversation_in=conversation_in, user_id=current_user.id)
    return conversation_to_response(conversation)


@router.get("", response_model=List[ConversationListItem])
def list_conversations(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[ConversationListItem]:
    """List the authenticated user's conversations, newest first.

    Phase 10.5 — each item now carries ``xp_earned`` (the total XP awarded for
    completing that conversation, read from the ``xp_awards`` ledger) so the
    history list can show "XP earned" per session.
    """
    conversations = get_user_conversations(
        db, user_id=current_user.id, skip=skip, limit=limit
    )
    items: List[ConversationListItem] = []
    for convo in conversations:
        items.append(
            ConversationListItem(
                **conversation_to_dict(convo),
                message_count=count_messages(db, conversation_id=convo.id),
                xp_earned=get_conversation_xp(db, current_user.id, convo.id),
            )
        )
    return items


@router.get("/{conversation_id}", response_model=ConversationDetail)
def get_conversation_detail(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ConversationDetail:
    """Return a single conversation together with its messages.

    Phase 10.5 — the response now carries ``xp_earned`` (the total XP awarded
    for completing this conversation, read from the ``xp_awards`` ledger) so
    the history detail page can show "XP earned" for the session.
    """
    conversation = _get_owned_conversation(conversation_id, current_user, db)
    # Force the messages relationship to load while the session is open so the
    # response serializes without a lazy-load after session close.
    messages = get_messages(db, conversation_id=conversation.id)
    return ConversationDetail(
        **conversation_to_dict(conversation),
        xp_earned=get_conversation_xp(db, current_user.id, conversation.id),
        messages=messages,
    )


@router.patch("/{conversation_id}", response_model=ConversationResponse)
def update_conversation_status(
    conversation_id: int,
    conversation_in: ConversationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ConversationResponse:
    """Partially update a conversation (e.g. transition its status).

    Phase 10 — Progress Tracking & XP System:
    Any transition to ``"ended"`` awards XP exactly once (the award is
    idempotent via the ``xp_awards`` unique constraint). Two paths reach the
    ended state:

      1. The caller sends ``status="ended"`` with no explicit
         ``ended_at``/``duration_seconds`` → ``complete_conversation``
         finalises the session (computes duration from ``started_at``) and
         awards XP internally.
      2. The caller sends ``status="ended"`` together with an explicit
         ``duration_seconds`` (the frontend's normal completion flow) →
         ``update_conversation`` persists the supplied values, then this
         endpoint awards XP via ``complete_conversation`` (which is a no-op
         for the already-ended row but still triggers the idempotent XP
         award).

    Both paths guarantee XP is awarded exactly once per conversation.
    """
    conversation = _get_owned_conversation(conversation_id, current_user, db)

    # Convenience: when the caller transitions to "ended" without supplying an
    # explicit ended_at/duration, finalise the session automatically (this
    # also awards XP).
    if conversation_in.status == ConversationStatus.ended and conversation.status != "ended":
        if conversation_in.ended_at is None and conversation_in.duration_seconds is None:
            conversation = complete_conversation(db, conversation)
            return conversation_to_response(conversation)

    conversation = update_conversation(db, conversation=conversation, conversation_in=conversation_in)

    # Phase 10 — if the update just transitioned the conversation to "ended"
    # (e.g. the frontend sent an explicit duration_seconds), award XP now.
    # ``complete_conversation`` is idempotent: on an already-ended row it
    # skips the duration recompute but still triggers the idempotent XP
    # award (which is itself a no-op if already awarded).
    if (
        conversation_in.status == ConversationStatus.ended
        and conversation.status == "ended"
    ):
        conversation = complete_conversation(db, conversation)

    return conversation_to_response(conversation)


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete a conversation and (via cascade) its messages."""
    conversation = _get_owned_conversation(conversation_id, current_user, db)
    delete_conversation(db, conversation)


@router.post(
    "/{conversation_id}/messages",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_message(
    conversation_id: int,
    message_in: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    """Append a user message and generate Emma's AI reply.

    Flow:
      1. Persist the user's message (``sender="user"``).
      2. Load the *complete* conversation history so Emma remembers earlier turns.
      3. Ask the Groq-powered AI service for a context-aware reply.
      4. Persist Emma's reply (``sender="ai"``).
      5. Return Emma's reply.

    If the AI service fails, the user's message is already saved and remains
    intact — no empty AI message is stored. The caller receives an HTTP error
    describing the failure so the frontend can surface it.
    """
    conversation = _get_owned_conversation(conversation_id, current_user, db)

    # 1. Save the user's message first so it is never lost, even if the AI
    #    call that follows fails.
    user_message = create_message(
        db,
        message_in=message_in,
        conversation_id=conversation.id,
        sender=MessageSender.user,
    )

    # 2. Load the full ordered history (now including the just-saved user
    #    message as its final entry) to give Emma complete context.
    history = get_messages(db, conversation_id=conversation.id)

    # 3. Generate Emma's reply via the Groq AI service. Phase 9 — pass the
    #    persisted lesson so Emma stays focused on today's lesson topic.
    #    Phase M13 — pass the learner's accent, proficiency level and
    #    learning goal (read from the backend preferences row, never the
    #    frontend) so Emma speaks, spells and chooses vocabulary in the
    #    learner's chosen English variety and calibrates to their level.
    try:
        ai_reply_text = generate_ai_reply(
            practice_type=conversation.practice_type,
            history=history,
            latest_user_message=user_message.message,
            accent=_user_accent(current_user),
            proficiency_level=_user_proficiency_level(current_user),
            learning_goal=_user_learning_goal(current_user),
            lesson_title=conversation.lesson_title,
            lesson_objectives=_objectives_from_text(conversation.lesson_objectives),
        )
    except AIServiceError as exc:
        # The user's message is preserved; do NOT save an empty AI reply.
        logger.warning(
            "AI reply failed for conversation %s: %s (status %s)",
            conversation.id,
            exc.message,
            exc.status_code,
        )
        raise HTTPException(
            status_code=exc.status_code,
            detail=exc.message,
        ) from exc

    # 4. Persist Emma's reply.
    ai_message = create_message(
        db,
        message_in=MessageCreate(message=ai_reply_text),
        conversation_id=conversation.id,
        sender=MessageSender.ai,
    )

    # 5. Return Emma's reply so the frontend can display the real response.
    return ai_message


@router.get("/{conversation_id}/messages", response_model=List[MessageResponse])
def list_messages(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[MessageResponse]:
    """Return all messages for a conversation, ordered chronologically."""
    conversation = _get_owned_conversation(conversation_id, current_user, db)
    return get_messages(db, conversation_id=conversation.id)