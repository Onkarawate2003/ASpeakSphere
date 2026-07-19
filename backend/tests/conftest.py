import json
from collections.abc import Generator

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.v1 import auth, progress, quizzes
from app.api.v1 import conversations as conversations_api
from app.database import Base, get_db
from app.models import Conversation, ConversationMessage, Quiz, QuizAttempt, QuizQuestion, User, UserPreferences, UserProgress, XpAward

TEST_DATABASE_URL = "sqlite://"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def database() -> Generator[None, None, None]:
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(autouse=True)
def clean_database() -> Generator[None, None, None]:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield

@pytest.fixture
def app() -> Generator[FastAPI, None, None]:
    test_app = FastAPI()
    test_app.include_router(auth.router, prefix="/api/v1")
    test_app.include_router(progress.router, prefix="/api/v1")
    test_app.include_router(quizzes.router, prefix="/api/v1")
    test_app.include_router(conversations_api.router, prefix="/api")
    def override_get_db() -> Generator[Session, None, None]:
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()
    test_app.dependency_overrides[get_db] = override_get_db
    yield test_app
    test_app.dependency_overrides.clear()

@pytest.fixture
def client(app: FastAPI) -> TestClient:
    return TestClient(app)

@pytest.fixture
def user_payload() -> dict[str, str]:
    return {"first_name": "Test", "last_name": "User", "email": "test@example.com", "password": "secure-password"}

def _verify_and_login(client: TestClient, email: str, password: str) -> dict[str, str]:
    """Register leaves the account unverified (Email Verification), so tests
    that just need an authenticated user bypass the OTP email by marking the
    account verified directly in the DB, then log in for real."""
    db = TestingSessionLocal()
    db.query(User).filter(User.email == email).update({"is_email_verified": True})
    db.commit()
    db.close()
    response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return {"Authorization": f"Bearer {response.json()['access_token']}"}

@pytest.fixture
def auth_headers(client: TestClient, user_payload: dict[str, str]) -> dict[str, str]:
    client.post("/api/v1/auth/register", json=user_payload)
    return _verify_and_login(client, user_payload["email"], user_payload["password"])

@pytest.fixture
def second_auth_headers(client: TestClient) -> dict[str, str]:
    email, password = "other@example.com", "secure-password"
    client.post("/api/v1/auth/register", json={"first_name": "Other", "last_name": "User", "email": email, "password": password})
    return _verify_and_login(client, email, password)

@pytest.fixture
def quiz() -> Quiz:
    db = TestingSessionLocal()
    quiz = Quiz(lesson_id="test-lesson", title="Test quiz", description="Test", difficulty="Beginner")
    db.add(quiz); db.flush()
    for order, answer in enumerate((0, 1), start=1):
        question = QuizQuestion(quiz_id=quiz.id, question_text=f"Question {order}", correct_answer_index=answer, display_order=order, explanation="Explanation")
        question.set_options(["A", "B", "C", "D"])
        db.add(question)
    db.commit(); db.refresh(quiz); db.close()
    return quiz
