from unittest.mock import MagicMock, patch
from app.schemas.vocabulary import VocabularySearchResponse
from app.services.ai_service import AIServiceError


def test_vocabulary_search_empty_word_validation(client, auth_headers):
    response = client.post("/api/v1/vocabulary/search", json={"word": "   "}, headers=auth_headers)
    assert response.status_code == 400
    assert "enter an English word" in response.json()["detail"].lower()


@patch("app.services.vocab_service.get_groq_client")
def test_vocabulary_search_success(mock_get_client, client, auth_headers):
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

    response = client.post("/api/v1/vocabulary/search", json={"word": "beautiful"}, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["word"] == "Beautiful"
    assert data["pronunciation"] == "/ˈbjuːtɪfəl/"
    assert data["part_of_speech"] == "Adjective"
    assert data["meaning"] == "Pleasing the senses or mind aesthetically."
    assert data["example"] == "She wore a beautiful dress to the wedding."
    # Forward-compatible optional fields default to empty
    assert data["synonyms"] == []
    assert data["antonyms"] == []
    assert data["translations"] == {}
    assert data["notes"] == {}


@patch("app.services.vocab_service.get_groq_client")
def test_vocabulary_search_ai_failure_handling(mock_get_client, client, auth_headers):
    mock_client = MagicMock()
    mock_client.chat.completions.create.side_effect = Exception("Groq connection timeout")
    mock_get_client.return_value = mock_client

    response = client.post("/api/v1/vocabulary/search", json={"word": "resilient"}, headers=auth_headers)
    assert response.status_code == 500
    assert "error occurred while searching" in response.json()["detail"].lower()
