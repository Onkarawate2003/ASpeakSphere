"""Spelling normalization layer — accent-aware spelling comparison.

Phase M13 — Global English Accent & Voice Personalization (Phase 5/6).

Quiz grading and writing feedback must respect the user's chosen English
variety. A learner studying British English should not be marked wrong
for writing ``"colour"`` even if the answer key stores ``"color"``, and
vice-versa.

:class:`SpellingMapper` builds a bidirectional equivalence map from the
spelling groups in :class:`AccentManager` so that any spelling of a
concept is accepted as equivalent to any other spelling of the same
concept. This makes grading accent-agnostic: ``"color"`` ≡ ``"colour"``
≡ ``"colours"`` ≡ ``"color"``.

Usage::

    from app.services.spelling_mapper import spelling_mapper

    if spelling_mapper.is_equivalent("colour", "color"):
        # accept the answer
        ...

    normalized = spelling_mapper.normalize_to_accent("color", "uk")
    # → "colour"
"""

from __future__ import annotations

import re
from typing import Dict, List, Optional, Set

from app.services.accent_manager import AccentCode, accent_manager


def _normalize_token(token: str) -> str:
    """Lowercase and strip surrounding punctuation/whitespace."""
    return re.sub(r"[^\w'-]", "", (token or "").strip().lower())


class SpellingMapper:
    """Accent-aware spelling equivalence and normalization.

    Builds an in-memory equivalence map from the spelling groups in the
    :class:`AccentManager` on first use (cached). Stateless thereafter.

    The map is bidirectional: every spelling in a group is equivalent to
    every other spelling in the same group. This means a quiz answer key
    written in American English will accept British, Australian, and
    Neutral spellings (and vice-versa) without any per-question config.
    """

    def __init__(self) -> None:
        self._accent_manager = accent_manager
        self._equivalence: Dict[str, Set[str]] = {}
        self._built = False

    def _ensure_built(self) -> None:
        """Lazily build the equivalence map from spelling groups."""
        if self._built:
            return
        for group in self._accent_manager.get_spelling(None):
            # Collect all spellings in this group (all accents).
            spellings = {
                _normalize_token(v)
                for key, v in group.items()
                if key != "concept" and v
            }
            spellings.discard("")
            if not spellings:
                continue
            # Every spelling maps to the full set of equivalents.
            for spelling in spellings:
                existing = self._equivalence.get(spelling, set())
                self._equivalence[spelling] = existing | spellings
        self._built = True

    def is_equivalent(self, a: str, b: str) -> bool:
        """Return ``True`` when ``a`` and ``b`` are the same word or
        accent-variant spellings of the same concept.

        Comparison is case-insensitive and ignores surrounding
        punctuation. Two identical tokens are always equivalent.
        """
        na, nb = _normalize_token(a), _normalize_token(b)
        if not na or not nb:
            return False
        if na == nb:
            return True
        self._ensure_built()
        return nb in self._equivalence.get(na, set())

    def normalize_to_accent(self, word: str, accent: Optional[AccentCode]) -> str:
        """Return ``word`` rewritten in the spelling of ``accent``.

        If ``word`` is a known accent-variant spelling, it is converted to
        the target accent's spelling of the same concept. Otherwise it is
        returned unchanged (lowercased, stripped). This is useful for
        presenting model answers in the learner's own variety.
        """
        normalized = _normalize_token(word)
        if not normalized:
            return ""
        self._ensure_built()
        equivalents = self._equivalence.get(normalized)
        if not equivalents:
            return normalized
        target_accent = self._accent_manager.normalize(accent)
        for group in self._accent_manager.get_spelling(accent):
            target_spelling = _normalize_token(group.get(target_accent, ""))
            if target_spelling and target_spelling in equivalents:
                return target_spelling
        return normalized

    def equivalents(self, word: str) -> List[str]:
        """Return all accent-variant spellings equivalent to ``word``.

        Useful for showing the learner the acceptable spellings, or for
        building fuzzy answer keys. The list is deduplicated and excludes
        the input word's exact form only if it is not itself a known
        variant.
        """
        normalized = _normalize_token(word)
        if not normalized:
            return []
        self._ensure_built()
        return sorted(self._equivalence.get(normalized, {normalized}))


#: The application-wide :class:`SpellingMapper` instance.
spelling_mapper: SpellingMapper = SpellingMapper()


__all__ = ["SpellingMapper", "spelling_mapper"]
