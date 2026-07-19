def test_quiz_retrieval_hides_answers_and_submission_is_graded(client, auth_headers, quiz):
    fetched = client.get("/api/v1/quizzes/lesson/test-lesson", headers=auth_headers)
    assert fetched.status_code == 200
    body = fetched.json()
    assert "correct_answer_index" not in body["questions"][0]
    submitted = client.post(f"/api/v1/quizzes/{quiz.id}/submit", json={"answers": [0, 1]}, headers=auth_headers)
    assert submitted.status_code == 200
    result = submitted.json()
    assert result["score"] == 2 and result["percentage"] == 100
    assert result["xp_awarded"] is True
