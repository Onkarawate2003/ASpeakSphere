"""Vocabulary mapping layer — presents regional words per accent.

Phase M13 — Global English Accent & Voice Personalization (Phase 7).

Lessons, vocabulary drills, and reading materials should present words in
the learner's chosen variety. A learner studying American English sees
``"elevator"``, while a learner studying British English sees ``"lift"``
for the same concept.

:class:`VocabularyMapper` is a thin facade over the vocabulary groups in
:class:`AccentManager`. It also provides cross-accent translation so the
AI can recognize a learner's regional word and respond with the
equivalent in the learner's own variety.

Usage::

    from app.services.vocabulary_mapper import vocabulary_mapper

    word = vocabulary_mapper.get_word("uk", "elevator")   # → "lift"
    concept = vocabulary_mapper.get_concept("lift")        # → "elevator"
    word = vocabulary_mapper.translate("elevator", "uk")   # → "lift"
"""

from __future__ import annotations

from typing import Dict, List, Optional

from app.services.accent_manager import AccentCode, accent_manager


class VocabularyMapper:
    """Resolves regional vocabulary for an accent.

    Stateless and safe to use as a module-level singleton
    (see :data:`vocabulary_mapper`).
    """

    def __init__(self) -> None:
        self._accent_manager = accent_manager

    def get_word(self, accent: Optional[AccentCode], concept: str) -> str:
        """Return the regional word for ``concept`` in ``accent``.

        ``concept`` is the neutral concept label (the ``"concept"`` key in
        a vocabulary group), e.g. ``"elevator"``, ``"vacation"``. Returns
        an empty string if the concept is unknown.
        """
        return self._accent_manager.get_word_for_concept(accent, concept)

    def get_concept(self, word: str) -> Optional[str]:
        """Return the neutral concept label for a regional ``word``.

        Searches all accents for ``word`` (case-insensitive) and returns
        the concept it belongs to, or ``None`` if it is not a known
        regional word. This lets the AI map a learner's word back to a
        shared concept.
        """
        if not word:
            return None
        target = word.strip().lower()
        for group in self._accent_manager.get_vocabulary(None):
            for key, value in group.items():
                if key == "concept":
                    continue
                if value and value.strip().lower() == target:
                    return group.get("concept")
        return None

    def translate(
        self, word: str, target_accent: Optional[AccentCode]
    ) -> str:
        """Translate a regional ``word`` into the ``target_accent`` variety.

        If ``word`` is a known regional word, returns the equivalent word
        in ``target_accent``. If ``word`` is not a known regional word, it
        is returned unchanged (so non-vocabulary text passes through).
        """
        concept = self.get_concept(word)
        if concept is None:
            return word
        translated = self.get_word(target_accent, concept)
        return translated or word

    def vocabulary_for_accent(self, accent: Optional[AccentCode]) -> List[Dict[str, str]]:
        """Return all vocabulary groups filtered to ``accent``.

        Each entry is ``{"concept": ..., "word": ...}`` — convenient for
        rendering a vocabulary list or flashcards in the learner's
        variety.
        """
        accent_code = self._accent_manager.normalize(accent)
        result: List[Dict[str, str]] = []
        for group in self._accent_manager.get_vocabulary(accent):
            concept = group.get("concept", "")
            word = group.get(accent_code, "")
            if concept and word:
                result.append({"concept": concept, "word": word})
        return result


#: The application-wide :class:`VocabularyMapper` instance.
vocabulary_mapper: VocabularyMapper = VocabularyMapper()


__all__ = ["VocabularyMapper", "vocabulary_mapper"]
