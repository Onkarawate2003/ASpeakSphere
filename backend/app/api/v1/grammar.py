"""Grammar Coach API routes."""

from fastapi import APIRouter, status

from app.schemas.grammar import GrammarCheckRequest, GrammarCheckResponse
from app.services.grammar_service import check_grammar

router = APIRouter(prefix="/grammar", tags=["grammar"])


@router.post(
    "/check",
    response_model=GrammarCheckResponse,
    status_code=status.HTTP_200_OK,
)
def check_grammar_endpoint(payload: GrammarCheckRequest) -> GrammarCheckResponse:
    """Return structured grammar feedback for a validated sentence."""
    return check_grammar(payload.sentence)


__all__ = ["router"]
