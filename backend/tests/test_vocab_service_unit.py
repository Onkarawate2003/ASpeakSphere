from unittest.mock import MagicMock, patch
import pytest
from app.schemas.vocabulary import VocabularySearchResponse
from app.services.ai_service import AIServiceError
from app.services.vocab_service import search_word


def test_search_word_empty_validation():
    with pytest.raises(AIServiceError) as excinfo:
        search_word("   ")
    assert excinfo.value.status_code == 400
    assert "enter an English word" in excinfo.value.message.lower()


@patch("app.services.vocab_service.get_groq_client")
def test_search_word_success(mock_get_client):
    mock_client = MagicMock()
    mock_completion = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = (
        '{\n'
        '  "word": "Beautiful",\n'
        '  "pronunciation": "/ˈbjuːtɪfəl/",\n'
        '  "part_of_speech": "Adjective",\n'
        '  "meaning": "Pleasing the senses or mind aesthetically.",\n'
        '  "example": "She wore a beautiful dress to the wedding."\n'
        '}'
    )
    mock_completion.choices = [mock_choice]
    mock_client.chat.completions.create.return_value = mock_completion
    mock_get_client.return_value = mock_client

    result = search_word("beautiful")
    assert isinstance(result, VocabularySearchResponse)
    assert result.word == "Beautiful"
    assert result.pronunciation == "/ˈbjuːtɪfəl/"
    assert result.part_of_speech == "Adjective"
    assert result.meaning == "Pleasing the senses or mind aesthetically."
    assert result.example == "She wore a beautiful dress to the wedding."
    assert result.synonyms == []
    assert result.antonyms == []
    assert result.translations == {}
    assert result.notes == {}
