"""Centralized Accent Management layer — the single source of truth.

Phase M13 — Global English Accent & Voice Personalization.

Every feature that generates, evaluates, displays, or speaks English must
consult this module so the user's chosen English variety is applied
consistently across the entire application.

The :class:`AccentManager` exposes, for each supported accent:

  * **Configuration** — code, BCP-47 locale, display label, flag emoji.
  * **Metadata** — human-readable name and description.
  * **Spelling rules** — per-accent spellings for shared concepts.
  * **Vocabulary rules** — regional word choices for shared concepts.
  * **Grammar preferences** — notes on grammatical differences.
  * **Pronunciation configuration** — notes on phonological differences.
  * **AI prompt instructions** — guidance injected into Emma's system prompt.
  * **Voice mapping** — primary/alternate Microsoft Edge TTS voice IDs.

Adding a new accent (e.g. Canadian, Irish, New Zealand, Indian English,
South African) only requires appending a new entry to :data:`_ACCENTS` —
no business logic anywhere else needs to change.

Supported accents (matching the ``EnglishVariant`` enum in
``app.schemas.user_preferences``):

  * ``us``        — American English
  * ``uk``        — British English
  * ``australian`` — Australian English
  * ``neutral``   — International / Neutral English
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

# --------------------------------------------------------------------- #
# Public type aliases
# --------------------------------------------------------------------- #

#: The canonical accent code stored in ``user_preferences.english_variant``.
AccentCode = str

#: A spelling group maps a concept to its spelling in every accent.
#: e.g. ``{"us": "color", "uk": "colour", "australian": "colour", "neutral": "colour"}``
SpellingGroup = Dict[str, str]

#: A vocabulary group maps a concept to the regional word in every accent.
VocabularyGroup = Dict[str, str]


# --------------------------------------------------------------------- #
# Data containers
# --------------------------------------------------------------------- #


@dataclass(frozen=True)
class AccentConfig:
    """Immutable configuration for a single English accent/variety.

    All accent knowledge lives here so the rest of the codebase never
    hardcodes accent-specific details.
    """

    code: AccentCode
    label: str
    locale: str
    flag: str
    description: str

    #: Spelling groups — each dict maps accent codes to the spelling used
    #: in that accent for the same concept.
    spelling: List[SpellingGroup] = field(default_factory=list)

    #: Vocabulary groups — each dict maps accent codes to the regional word
    #: for the same concept. The ``"concept"`` key holds a neutral label.
    vocabulary: List[VocabularyGroup] = field(default_factory=list)

    #: Free-form grammar preference notes for the AI prompt.
    grammar_notes: str = ""

    #: Free-form pronunciation notes for the AI / evaluation prompt.
    pronunciation_notes: str = ""

    #: The instruction block injected into Emma's system prompt.
    prompt_instructions: str = ""

    #: Primary Microsoft Edge TTS voice ID (female, to match Emma).
    primary_voice: str = ""

    #: Alternate Edge TTS voice IDs (for variety / fallback).
    alternate_voices: Tuple[str, ...] = field(default_factory=tuple)

    #: Whisper STT language hint, stored as a BCP-47 locale (e.g.
    #: ``"en-US"``, ``"en-GB"``, ``"en-AU"``, ``"en"``). This locale is
    #: reused for TTS voice selection and may be honored by future STT
    #: providers that support locale-specific codes.
    #:
    #: IMPORTANT: Groq Whisper only accepts base ISO-639-1 codes (``"en"``),
    #: NOT BCP-47 locales. The speech service normalizes this value via
    #: ``_normalize_whisper_language`` before it reaches Groq Whisper, so
    #: all English accents map to ``"en"`` for transcription. The locale is
    #: kept here as the canonical accent metadata; it must never be passed
    #: to Groq Whisper unnormalized.
    stt_language_hint: str = "en"


# --------------------------------------------------------------------- #
# Accent definitions — the single source of truth
# --------------------------------------------------------------------- #

#: Shared spelling groups. Each group is one concept spelled differently.
#: ``neutral`` follows the most internationally recognized spelling (often
#: the British spelling, which is the default in most international exams).
_SPELLING_GROUPS: List[SpellingGroup] = [
    {"us": "color", "uk": "colour", "australian": "colour", "neutral": "colour"},
    {"us": "colors", "uk": "colours", "australian": "colours", "neutral": "colours"},
    {"us": "favorite", "uk": "favourite", "australian": "favourite", "neutral": "favourite"},
    {"us": "favor", "uk": "favour", "australian": "favour", "neutral": "favour"},
    {"us": "honor", "uk": "honour", "australian": "honour", "neutral": "honour"},
    {"us": "behavior", "uk": "behaviour", "australian": "behaviour", "neutral": "behaviour"},
    {"us": "center", "uk": "centre", "australian": "centre", "neutral": "centre"},
    {"us": "meter", "uk": "metre", "australian": "metre", "neutral": "metre"},
    {"us": "liter", "uk": "litre", "australian": "litre", "neutral": "litre"},
    {"us": "traveler", "uk": "traveller", "australian": "traveller", "neutral": "traveller"},
    {"us": "traveled", "uk": "travelled", "australian": "travelled", "neutral": "travelled"},
    {"us": "organize", "uk": "organise", "australian": "organise", "neutral": "organise"},
    {"us": "organization", "uk": "organisation", "australian": "organisation", "neutral": "organisation"},
    {"us": "realize", "uk": "realise", "australian": "realise", "neutral": "realise"},
    {"us": "realized", "uk": "realised", "australian": "realised", "neutral": "realised"},
    {"us": "recognize", "uk": "recognise", "australian": "recognise", "neutral": "recognise"},
    {"us": "analyze", "uk": "analyse", "australian": "analyse", "neutral": "analyse"},
    {"us": "defense", "uk": "defence", "australian": "defence", "neutral": "defence"},
    {"us": "license", "uk": "licence", "australian": "licence", "neutral": "licence"},
    {"us": "practice", "uk": "practise", "australian": "practise", "neutral": "practise"},
    {"us": "program", "uk": "programme", "australian": "programme", "neutral": "programme"},
    {"us": "catalog", "uk": "catalogue", "australian": "catalogue", "neutral": "catalogue"},
    {"us": "dialog", "uk": "dialogue", "australian": "dialogue", "neutral": "dialogue"},
    {"us": "gray", "uk": "grey", "australian": "grey", "neutral": "grey"},
    {"us": "check", "uk": "cheque", "australian": "cheque", "neutral": "cheque"},
    {"us": "tire", "uk": "tyre", "australian": "tyre", "neutral": "tyre"},
    {"us": "aluminum", "uk": "aluminium", "australian": "aluminium", "neutral": "aluminium"},
    {"us": "jewelry", "uk": "jewellery", "australian": "jewellery", "neutral": "jewellery"},
    {"us": "fulfill", "uk": "fulfil", "australian": "fulfil", "neutral": "fulfil"},
    {"us": "enroll", "uk": "enrol", "australian": "enrol", "neutral": "enrol"},
    {"us": "skillful", "uk": "skilful", "australian": "skilful", "neutral": "skilful"},
    {"us": "labeled", "uk": "labelled", "australian": "labelled", "neutral": "labelled"},
    {"us": "modeled", "uk": "modelled", "australian": "modelled", "neutral": "modelled"},
    {"us": "canceled", "uk": "cancelled", "australian": "cancelled", "neutral": "cancelled"},
    {"us": "judgment", "uk": "judgement", "australian": "judgement", "neutral": "judgement"},
    {"us": "acknowledgment", "uk": "acknowledgement", "australian": "acknowledgement", "neutral": "acknowledgement"},
]

#: Shared vocabulary groups. Each group is one concept with a different
#: regional word. The ``"concept"`` key is a neutral label for the concept.
_VOCABULARY_GROUPS: List[VocabularyGroup] = [
    {"concept": "elevator", "us": "elevator", "uk": "lift", "australian": "lift", "neutral": "lift"},
    {"concept": "apartment", "us": "apartment", "uk": "flat", "australian": "flat", "neutral": "flat"},
    {"concept": "vacation", "us": "vacation", "uk": "holiday", "australian": "holiday", "neutral": "holiday"},
    {"concept": "truck", "us": "truck", "uk": "lorry", "australian": "truck", "neutral": "truck"},
    {"concept": "gasoline", "us": "gas", "uk": "petrol", "australian": "petrol", "neutral": "petrol"},
    {"concept": "subway", "us": "subway", "uk": "underground", "australian": "subway", "neutral": "metro"},
    {"concept": "sidewalk", "us": "sidewalk", "uk": "pavement", "australian": "footpath", "neutral": "pavement"},
    {"concept": "faucet", "us": "faucet", "uk": "tap", "australian": "tap", "neutral": "tap"},
    {"concept": "diaper", "us": "diaper", "uk": "nappy", "australian": "nappy", "neutral": "nappy"},
    {"concept": "stroller", "us": "stroller", "uk": "pram", "australian": "pram", "neutral": "pram"},
    {"concept": "trash", "us": "trash", "uk": "rubbish", "australian": "rubbish", "neutral": "rubbish"},
    {"concept": "garbage_can", "us": "garbage can", "uk": "dustbin", "australian": "rubbish bin", "neutral": "rubbish bin"},
    {"concept": "mailbox", "us": "mailbox", "uk": "postbox", "australian": "postbox", "neutral": "postbox"},
    {"concept": "sneakers", "us": "sneakers", "uk": "trainers", "australian": "runners", "neutral": "trainers"},
    {"concept": "sweater", "us": "sweater", "uk": "jumper", "australian": "jumper", "neutral": "jumper"},
    {"concept": "undershirt", "us": "undershirt", "uk": "vest", "australian": "singlet", "neutral": "vest"},
    {"concept": "flashlight", "us": "flashlight", "uk": "torch", "australian": "torch", "neutral": "torch"},
    {"concept": "hood", "us": "hood", "uk": "bonnet", "australian": "bonnet", "neutral": "bonnet"},
    {"concept": "trunk", "us": "trunk", "uk": "boot", "australian": "boot", "neutral": "boot"},
    {"concept": "gas_station", "us": "gas station", "uk": "petrol station", "australian": "servo", "neutral": "petrol station"},
    {"concept": "drugstore", "us": "drugstore", "uk": "pharmacy", "australian": "pharmacy", "neutral": "pharmacy"},
    {"concept": "line", "us": "line", "uk": "queue", "australian": "queue", "neutral": "queue"},
    {"concept": "restroom", "us": "restroom", "uk": "toilet", "australian": "toilet", "neutral": "toilet"},
    {"concept": "fall", "us": "fall", "uk": "autumn", "australian": "autumn", "neutral": "autumn"},
    {"concept": "soccer", "us": "soccer", "uk": "football", "australian": "football", "neutral": "football"},
    {"concept": "friend", "us": "friend", "uk": "mate", "australian": "mate", "neutral": "friend"},
    {"concept": "afternoon", "us": "afternoon", "uk": "afternoon", "australian": "arvo", "neutral": "afternoon"},
    {"concept": "breakfast", "us": "breakfast", "uk": "breakfast", "australian": "brekkie", "neutral": "breakfast"},
    {"concept": "university", "us": "college", "uk": "university", "australian": "uni", "neutral": "university"},
    {"concept": "semester", "us": "semester", "uk": "term", "australian": "semester", "neutral": "term"},
    {"concept": "zip_code", "us": "zip code", "uk": "postcode", "australian": "postcode", "neutral": "postcode"},
    {"concept": "cellphone", "us": "cell phone", "uk": "mobile", "australian": "mobile", "neutral": "mobile"},
    {"concept": "bill_currency", "us": "bill", "uk": "note", "australian": "note", "neutral": "note"},
    {"concept": "lawyer", "us": "attorney", "uk": "solicitor", "australian": "lawyer", "neutral": "lawyer"},
    {"concept": "crosswalk", "us": "crosswalk", "uk": "zebra crossing", "australian": "pedestrian crossing", "neutral": "pedestrian crossing"},
    {"concept": "round_trip", "us": "round trip", "uk": "return", "australian": "return", "neutral": "return"},
    {"concept": "one_way", "us": "one-way", "uk": "single", "australian": "single", "neutral": "single"},
    {"concept": "schedule", "us": "schedule", "uk": "timetable", "australian": "timetable", "neutral": "timetable"},
    {"concept": "eraser", "us": "eraser", "uk": "rubber", "australian": "eraser", "neutral": "eraser"},
    {"concept": "math", "us": "math", "uk": "maths", "australian": "maths", "neutral": "maths"},
]


_ACCENTS: Dict[AccentCode, AccentConfig] = {
    "us": AccentConfig(
        code="us",
        label="American English",
        locale="en-US",
        flag="🇺🇸",
        description="United States English — rhotic, with American spelling and vocabulary.",
        spelling=_SPELLING_GROUPS,
        vocabulary=_VOCABULARY_GROUPS,
        grammar_notes=(
            "Use American grammar: the past participle 'gotten' (e.g. 'I have gotten'), "
            "collective nouns usually take singular verbs ('the team is playing'), "
            "and 'on' for days/dates ('on the weekend'). Use 'have' with 'do' support "
            "('Do you have...?') rather than 'Have you got...?'."
        ),
        pronunciation_notes=(
            "Rhotic pronunciation — pronounce all written 'r' sounds. "
            "Use the American 'æ' in words like 'dance', 'ask', 'fast'. "
            "Use a tapped or flapped 't' between vowels in casual speech "
            "('water' → 'wah-der')."
        ),
        prompt_instructions=(
            "You are speaking American English. Always use American spelling "
            "(color, favorite, center, organize, traveled, aluminum) and American "
            "vocabulary (elevator, apartment, vacation, truck, gas, sidewalk, "
            "restroom, fall, soccer, cell phone, zip code). Use American grammar: "
            "'I have gotten', 'on the weekend', 'Do you have...?'. Pronounce all "
            "'r' sounds (rhotic). Avoid British, Australian, or regional slang."
        ),
        primary_voice="en-US-AriaNeural",
        alternate_voices=("en-US-JennyNeural", "en-US-MichelleNeural"),
        stt_language_hint="en-US",
    ),
    "uk": AccentConfig(
        code="uk",
        label="British English",
        locale="en-GB",
        flag="🇬🇧",
        description="United Kingdom English — non-rhotic, with British spelling and vocabulary.",
        spelling=_SPELLING_GROUPS,
        vocabulary=_VOCABULARY_GROUPS,
        grammar_notes=(
            "Use British grammar: the past participle 'got' (e.g. 'I have got'), "
            "collective nouns often take plural verbs ('the team are playing'), "
            "and 'at' for weekends/holidays ('at the weekend'). Use 'Have you got...?' "
            "or 'Have you...?' rather than 'Do you have...?'."
        ),
        pronunciation_notes=(
            "Non-rhotic pronunciation — do not pronounce 'r' unless it precedes a "
            "vowel. Use the British 'ɑː' in words like 'dance', 'ask', 'fast'. "
            "Pronounce 't' clearly (no flapping): 'water' → 'waw-ter'."
        ),
        prompt_instructions=(
            "You are speaking British English. Always use British spelling "
            "(colour, favourite, centre, organise, travelled, aluminium) and British "
            "vocabulary (lift, flat, holiday, lorry, petrol, underground, pavement, "
            "tap, rubbish, postbox, trainers, jumper, torch, boot, maths). Use British "
            "grammar: 'I have got', 'at the weekend', 'Have you got...?'. Do not "
            "pronounce 'r' unless before a vowel (non-rhotic). Avoid Americanisms and "
            "regional slang."
        ),
        primary_voice="en-GB-SoniaNeural",
        alternate_voices=("en-GB-LibbyNeural", "en-GB-MaisieNeural"),
        stt_language_hint="en-GB",
    ),
    "australian": AccentConfig(
        code="australian",
        label="Australian English",
        locale="en-AU",
        flag="🇦🇺",
        description="Australian English — non-rhotic, with British spelling and unique vocabulary.",
        spelling=_SPELLING_GROUPS,
        vocabulary=_VOCABULARY_GROUPS,
        grammar_notes=(
            "Use Australian grammar: similar to British English ('I have got', "
            "'at the weekend', 'Have you got...?'). Collective nouns often take "
            "plural verbs. Use 'do' for emphasis ('Yeah, I do')."
        ),
        pronunciation_notes=(
            "Non-rhotic pronunciation — do not pronounce 'r' unless before a vowel. "
            "Australian vowels are distinctive: the 'a' in 'dance' is long and front "
            "('da:ns'), and 'i' in 'kit' is more central. Intonation tends to rise at "
            "the end of statements (High Rising Terminal)."
        ),
        prompt_instructions=(
            "You are speaking Australian English. Use British spelling "
            "(colour, favourite, centre, organise, travelled, aluminium) and "
            "Australian vocabulary (lift, flat, holiday, truck, petrol, footpath, "
            "tap, rubbish, postbox, runners, jumper, torch, boot, servo, arvo, "
            "brekkie, uni, maths, mate). Use Australian grammar similar to British "
            "('I have got', 'at the weekend'). Do not pronounce 'r' unless before a "
            "vowel (non-rhotic). You may use common, polite Australian colloquialisms "
            "(mate, arvo, brekkie) naturally, but keep them appropriate for a language "
            "learner. Avoid Americanisms."
        ),
        primary_voice="en-AU-NatashaNeural",
        alternate_voices=("en-AU-AnnetteNeural", "en-AU-CatherineNeural"),
        stt_language_hint="en-AU",
    ),
    "neutral": AccentConfig(
        code="neutral",
        label="International English",
        locale="en",
        flag="🌐",
        description="Neutral International English — clear, globally understood, no strong regional identity.",
        spelling=_SPELLING_GROUPS,
        vocabulary=_VOCABULARY_GROUPS,
        grammar_notes=(
            "Use clear, standard, internationally understood grammar. Prefer forms "
            "that are unambiguous across regions. Avoid region-specific colloquialisms."
        ),
        pronunciation_notes=(
            "Speak clearly and at a measured pace. Avoid strong regional accents or "
            "slang that may confuse international listeners. Pronounce words in their "
            "most internationally recognized form."
        ),
        prompt_instructions=(
            "You are speaking International English — clear, neutral, and globally "
            "understood. Use British spelling by default (colour, favourite, centre, "
            "organise, travelled, aluminium) as it is the most internationally "
            "recognized standard. Choose vocabulary that is widely understood across "
            "regions; when a word is strongly regional, prefer the more widely "
            "recognized form (e.g. 'holiday' over 'vacation', 'lift' over 'elevator', "
            "'mobile' over 'cell phone'). Avoid regional slang, colloquialisms, and "
            "idioms that may confuse international learners. Speak clearly and at a "
            "measured pace."
        ),
        primary_voice="en-US-AriaNeural",
        alternate_voices=("en-GB-SoniaNeural", "en-AU-NatashaNeural"),
        stt_language_hint="en",
    ),
}


# --------------------------------------------------------------------- #
# AccentManager — the public facade
# --------------------------------------------------------------------- #


class AccentManager:
    """Single source of truth for all accent-related configuration.

    This class is stateless and safe to use as a module-level singleton
    (see :data:`accent_manager`). All methods are read-only lookups.

    Usage::

        from app.services.accent_manager import accent_manager

        config = accent_manager.get_config("uk")
        voice = accent_manager.get_voice("uk")
        instructions = accent_manager.get_prompt_instructions("uk")
    """

    #: The default accent used when a user has no preference set.
    DEFAULT_ACCENT: AccentCode = "us"

    def __init__(self, accents: Dict[AccentCode, AccentConfig]) -> None:
        self._accents: Dict[AccentCode, AccentConfig] = dict(accents)

    # -- configuration / metadata ------------------------------------- #

    @property
    def supported_codes(self) -> List[AccentCode]:
        """All accent codes that the system recognizes, in insertion order."""
        return list(self._accents.keys())

    def is_supported(self, code: Optional[str]) -> bool:
        """Return ``True`` when ``code`` is a known, supported accent."""
        return code is not None and code in self._accents

    def normalize(self, code: Optional[str]) -> AccentCode:
        """Return a valid accent code, falling back to the default.

        ``None``, empty strings, and unknown values all resolve to
        :attr:`DEFAULT_ACCENT` so callers never have to handle a missing
        accent separately.
        """
        if code and code in self._accents:
            return code
        return self.DEFAULT_ACCENT

    def get_config(self, code: Optional[str]) -> AccentConfig:
        """Return the full :class:`AccentConfig` for ``code`` (or default)."""
        return self._accents[self.normalize(code)]

    def get_label(self, code: Optional[str]) -> str:
        """Human-readable accent name, e.g. ``"British English"``."""
        return self.get_config(code).label

    def get_locale(self, code: Optional[str]) -> str:
        """BCP-47 locale, e.g. ``"en-GB"``."""
        return self.get_config(code).locale

    def get_flag(self, code: Optional[str]) -> str:
        """Flag emoji for the accent, e.g. ``"🇬🇧"``."""
        return self.get_config(code).flag

    def get_description(self, code: Optional[str]) -> str:
        """Short human-readable description of the accent."""
        return self.get_config(code).description

    # -- AI prompt instructions ---------------------------------------- #

    def get_prompt_instructions(self, code: Optional[str]) -> str:
        """The accent-specific instruction block for Emma's system prompt."""
        return self.get_config(code).prompt_instructions

    def get_grammar_notes(self, code: Optional[str]) -> str:
        """Grammar preference notes for the accent."""
        return self.get_config(code).grammar_notes

    def get_pronunciation_notes(self, code: Optional[str]) -> str:
        """Pronunciation notes for the accent."""
        return self.get_config(code).pronunciation_notes

    # -- voice mapping ------------------------------------------------- #

    def get_voice(self, code: Optional[str]) -> str:
        """Primary Microsoft Edge TTS voice ID for the accent."""
        return self.get_config(code).primary_voice

    def get_alternate_voices(self, code: Optional[str]) -> Tuple[str, ...]:
        """Alternate Edge TTS voice IDs for the accent."""
        return self.get_config(code).alternate_voices

    def get_stt_language_hint(self, code: Optional[str]) -> str:
        """Return the STT language hint for the accent as a BCP-47 locale.

        Returns a locale such as ``"en-US"``, ``"en-GB"``, ``"en-AU"``, or
        ``"en"`` for neutral. This is the canonical accent metadata and is
        reused for TTS voice selection.

        IMPORTANT: Groq Whisper only accepts base ISO-639-1 codes (``"en"``),
        NOT these locales. The speech service normalizes the returned value
        via ``_normalize_whisper_language`` before it reaches Groq Whisper,
        so all English accents map to ``"en"`` for transcription. Callers
        must NOT pass this value directly to Groq Whisper.
        """
        return self.get_config(code).stt_language_hint

    # -- spelling ------------------------------------------------------ #

    def get_spelling(self, code: Optional[str]) -> List[SpellingGroup]:
        """All spelling groups for the accent."""
        return self.get_config(code).spelling

    def get_spelling_for_concept(self, code: Optional[str], concept_index: int) -> str:
        """Return the spelling of a concept (by group index) in the accent."""
        groups = self.get_spelling(code)
        accent = self.normalize(code)
        if 0 <= concept_index < len(groups):
            return groups[concept_index].get(accent, "")
        return ""

    # -- vocabulary ---------------------------------------------------- #

    def get_vocabulary(self, code: Optional[str]) -> List[VocabularyGroup]:
        """All vocabulary groups for the accent."""
        return self.get_config(code).vocabulary

    def get_word_for_concept(self, code: Optional[str], concept: str) -> str:
        """Return the regional word for a concept label in the accent.

        ``concept`` is the ``"concept"`` key value from a vocabulary group
        (e.g. ``"elevator"``, ``"vacation"``). Returns an empty string if
        the concept is unknown.
        """
        accent = self.normalize(code)
        for group in self.get_vocabulary(code):
            if group.get("concept") == concept:
                return group.get(accent, "")
        return ""

    # -- introspection ------------------------------------------------ #

    def all_metadata(self) -> List[Dict[str, str]]:
        """Lightweight metadata for every accent (for API/UI listing).

        Returns a list of dicts with ``code``, ``label``, ``locale``,
        ``flag``, and ``description`` — enough to render an accent picker
        without exposing internal rule data.
        """
        return [
            {
                "code": cfg.code,
                "label": cfg.label,
                "locale": cfg.locale,
                "flag": cfg.flag,
                "description": cfg.description,
            }
            for cfg in self._accents.values()
        ]


# --------------------------------------------------------------------- #
# Module-level singleton
# --------------------------------------------------------------------- #

#: The application-wide :class:`AccentManager` instance. Import this
#: everywhere accent knowledge is needed — never instantiate another.
accent_manager: AccentManager = AccentManager(_ACCENTS)


__all__ = [
    "AccentCode",
    "AccentConfig",
    "AccentManager",
    "SpellingGroup",
    "VocabularyGroup",
    "accent_manager",
]
