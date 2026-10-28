SIGNUP = {"email": "ana@example.com", "display_name": "Ana", "password": "correct horse 1"}


def test_recipes_need_login(client):
    res = client.get("/")
    assert res.status_code == 302
    assert "/login" in res.headers["Location"]


def test_signup_then_see_recipes(client):
    assert client.post("/signup", data=SIGNUP).status_code == 302
    assert client.get("/").status_code == 200


def test_wrong_password_is_rejected(client):
    client.post("/signup", data=SIGNUP)
    client.post("/logout")
    res = client.post("/login", data={"email": SIGNUP["email"], "password": "wrong"})
    assert res.status_code == 200
