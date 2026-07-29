from unittest.mock import MagicMock, patch

from app.schemas.vocabulary import VocabularySearchResponse
from app.services.ai_service import AIServiceError


def _save_word(client, headers, word="serendipity"):
    """Helper: save a word via the API and return the response JSON."""
    payload = {
        "word": word,
        "pronunciation": "/ˌsɛrənˈdɪpɪti/",
        "part_of_speech": "Noun",
        "meaning": "A pleasant surprise.",
        "example": "Finding this café was pure serendipity.",
        "synonyms": ["fluke", "chance"],
        "antonyms": ["plan"],
    }
    response = client.post("/api/v1/vocabulary/save", json=payload, headers=headers)
    assert response.status_code == 201
    return response.json()


def test_list_saved_words_empty(client, auth_headers):
    """A user with no saved words gets an empty list (not 404)."""
    response = client.get("/api/v1/vocabulary/saved", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == []


def test_list_saved_words_returns_user_words_newest_first(client, auth_headers):
    """Saved words are returned newest-first with the full SavedWordResponse shape."""
    first = _save_word(client, auth_headers, word="resilient")
    second = _save_word(client, auth_headers, word="eloquent")

    response = client.get("/api/v1/vocabulary/saved", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    # Newest first
    assert data[0]["word"] == "eloquent"
    assert data[1]["word"] == "resilient"
    # Response shape matches SavedWordResponse
    entry = data[0]
    assert set(entry.keys()) == {
        "id", "user_id", "word", "pronunciation", "part_of_speech",
        "meaning", "example", "synonyms", "antonyms", "created_at",
    }
    assert entry["synonyms"] == second["synonyms"]
    assert entry["antonyms"] == second["antonyms"]


def test_list_saved_words_isolates_users(client, auth_headers, second_auth_headers):
    """A user only sees their own saved words, never another user's."""
    _save_word(client, auth_headers, word="resilient")
    _save_word(client, second_auth_headers, word="eloquent")

    response = client.get("/api/v1/vocabulary/saved", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["word"] == "resilient"


def test_list_saved_words_requires_auth(client):
    """The endpoint is protected — no token yields 401, not the data."""
    response = client.get("/api/v1/vocabulary/saved")
    assert response.status_code == 401


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
