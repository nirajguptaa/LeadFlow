def make_lead(client, **overrides):
    body = {"name": "Jane Doe", **overrides}
    res = client.post("/leads", json=body)
    assert res.status_code == 201, res.text
    return res.json()


def test_create_lead_defaults_to_new(client):
    lead = make_lead(client, company="Acme", phone="555-1")
    assert lead["status"] == "New"
    assert lead["company"] == "Acme"
    assert lead["last_note"] == "Lead created."


def test_create_lead_requires_name(client):
    assert client.post("/leads", json={}).status_code == 422
    assert client.post("/leads", json={"name": "   "}).status_code == 422


def test_blank_company_becomes_null(client):
    lead = make_lead(client, company="  ")
    assert lead["company"] is None


def test_list_shows_last_note(client):
    lead = make_lead(client)
    client.post(f"/leads/{lead['id']}/discussions", json={"note": "Called, no answer"})
    leads = client.get("/leads").json()
    assert leads[0]["last_note"] == "Called, no answer"
    assert leads[0]["last_discussion_at"].endswith("Z")


def test_discussions_are_newest_first(client):
    lead = make_lead(client)
    client.post(f"/leads/{lead['id']}/discussions", json={"note": "first"})
    client.post(f"/leads/{lead['id']}/discussions", json={"note": "second"})
    notes = [d["note"] for d in client.get(f"/leads/{lead['id']}/discussions").json()]
    assert notes == ["second", "first", "Lead created."]


def test_follow_up_is_saved_on_lead(client):
    lead = make_lead(client)
    res = client.post(
        f"/leads/{lead['id']}/discussions",
        json={"note": "Call back", "follow_up_at": "2026-10-14T08:30:00Z"},
    )
    assert res.status_code == 201
    assert client.get(f"/leads/{lead['id']}").json()["follow_up_at"] == "2026-10-14T08:30:00Z"


def test_note_without_follow_up_clears_it(client):
    lead = make_lead(client)
    client.post(
        f"/leads/{lead['id']}/discussions",
        json={"note": "Call back", "follow_up_at": "2026-10-14T08:30:00Z"},
    )
    client.post(f"/leads/{lead['id']}/discussions", json={"note": "Spoke to them"})
    assert client.get(f"/leads/{lead['id']}").json()["follow_up_at"] is None


def test_empty_note_rejected(client):
    lead = make_lead(client)
    assert client.post(f"/leads/{lead['id']}/discussions", json={"note": "  "}).status_code == 422


def test_status_update_persists(client):
    lead = make_lead(client)
    res = client.patch(f"/leads/{lead['id']}", json={"status": "Qualified"})
    assert res.status_code == 200
    assert client.get(f"/leads/{lead['id']}").json()["status"] == "Qualified"


def test_invalid_status_rejected(client):
    lead = make_lead(client)
    assert client.patch(f"/leads/{lead['id']}", json={"status": "Nope"}).status_code == 422


def test_unknown_lead_returns_404(client):
    assert client.get("/leads/999").status_code == 404
    assert client.patch("/leads/999", json={"status": "Won"}).status_code == 404
    assert client.get("/leads/999/discussions").status_code == 404
    assert client.post("/leads/999/discussions", json={"note": "x"}).status_code == 404


def test_filter_by_status_and_search(client):
    make_lead(client, name="Alice Smith", company="Globex")
    bob = make_lead(client, name="Bob Jones")
    client.patch(f"/leads/{bob['id']}", json={"status": "Won"})

    assert [l["name"] for l in client.get("/leads?status=Won").json()] == ["Bob Jones"]
    assert [l["name"] for l in client.get("/leads?search=alice").json()] == ["Alice Smith"]
    assert [l["name"] for l in client.get("/leads?search=globex").json()] == ["Alice Smith"]
    assert client.get("/leads?status=Bad").status_code == 422
