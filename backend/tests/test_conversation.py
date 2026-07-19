def test_conversation_create_retrieve_and_delete(client, auth_headers):
    created = client.post("/api/conversations", json={"practice_type": "speaking"}, headers=auth_headers)
    assert created.status_code == 201
    conversation_id = created.json()["id"]
    assert client.get(f"/api/conversations/{conversation_id}", headers=auth_headers).status_code == 200
    deleted = client.delete(f"/api/conversations/{conversation_id}", headers=auth_headers)
    assert deleted.status_code == 204

def test_conversation_is_not_visible_to_other_user(client, auth_headers, second_auth_headers):
    conversation_id = client.post("/api/conversations", json={"practice_type": "speaking"}, headers=auth_headers).json()["id"]
    assert client.get(f"/api/conversations/{conversation_id}", headers=second_auth_headers).status_code == 404
