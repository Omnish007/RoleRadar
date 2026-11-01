import pytest
from fastapi.testclient import TestClient
from app import main

client = TestClient(main.app)

@pytest.mark.anyio
async def test_health_reports_ollama_state(monkeypatch):
    async def available():
        return True
    async def model_available():
        return True
    monkeypatch.setattr(main, "check_ollama", available)
    monkeypatch.setattr(main, "check_model_available", model_available)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["ollama"] == "available"
    assert response.json()["model_status"] == "available"
    assert response.json()["model"] == main.DEFAULT_MODEL


def test_search_intent_rejects_too_short_prompt():
    response = client.post("/v1/search-intent", json={"text": "hi"})
    assert response.status_code == 422


def test_search_intent_omits_null_optional_fields_and_keeps_explicit_experience(monkeypatch):
    import sys
    from types import SimpleNamespace
    from app.intent_rules import normalize_search_intent
    from app.schemas import SearchIntent

    class FakeGraph:
        async def ainvoke(self, state):
            draft = SearchIntent(primaryRole="React Developer")
            result = normalize_search_intent(state["request_text"], draft)
            return {"intent": result.model_dump(exclude_none=True)}

    monkeypatch.setitem(sys.modules, "app.graph", SimpleNamespace(build_graph=FakeGraph))
    response = client.post(
        "/v1/search-intent",
        json={"text": "Find remote React developer jobs with at least 3 years of experience"},
    )

    assert response.status_code == 200, response.text
    result = response.json()
    assert result["minExperience"] == 3
    for optional_field in ("maxExperience", "postedWithinDays", "minSalary", "maxSalary"):
        assert optional_field not in result


def test_explicit_experience_bound_extraction():
    from app.experience_rules import extract_explicit_experience_bounds

    assert extract_explicit_experience_bounds("at least 3 years of experience") == (3.0, None)
    assert extract_explicit_experience_bounds("React developer with 3+ yrs experience") == (3.0, None)
    assert extract_explicit_experience_bounds("between 3 and 5 years of experience") == (3.0, 5.0)
    assert extract_explicit_experience_bounds("up to 4 years experience") == (None, 4.0)


def test_mern_request_is_enriched_with_stack_skills_and_normalized_location():
    from app.intent_rules import normalize_search_intent
    from app.schemas import SearchIntent

    request = "Mern stack developer in gandhinager with 4 years of experience"
    draft = SearchIntent(
        primaryRole="Full Stack Developer",
        locations=["Gandhinager"],
        minExperience=None,
        minSalary=900000,
        workModes=["remote"],
    )
    result = normalize_search_intent(request, draft)

    assert result.primaryRole == "MERN Stack Developer"
    assert result.alternativeRoles == ["MERN Developer", "Full Stack JavaScript Developer"]
    assert result.mustHaveSkills == ["MongoDB", "Express.js", "React", "Node.js"]
    assert result.locations == ["Gandhinagar"]
    assert result.minExperience == 4
    assert result.maxExperience is None
    assert result.workModes == []  # The request did not ask for remote work.
    assert result.minSalary is None  # A model guess is not an explicit user constraint.
    assert result.name == "MERN Stack Developer · Gandhinagar"


def test_explicit_constraints_are_normalized_without_model_guessing():
    from app.intent_rules import normalize_search_intent
    from app.schemas import SearchIntent

    request = "Node.js engineer near Bangalore, remote or hybrid, contract, posted within last 3 days"
    result = normalize_search_intent(request, SearchIntent(primaryRole="Software Developer"))

    assert result.primaryRole == "Node.js Developer"
    assert result.locations == ["Bengaluru"]
    assert result.mustHaveSkills == ["Node.js"]
    assert result.workModes == ["remote", "hybrid"]
    assert result.employmentTypes == ["contract"]
    assert result.postedWithinDays == 3


def test_salary_ranges_are_only_accepted_when_explicit():
    from app.salary_rules import extract_explicit_salary_bounds

    assert extract_explicit_salary_bounds("12-18 LPA") == (1_200_000, 1_800_000, None)
    assert extract_explicit_salary_bounds("at least ₹15 LPA") == (1_500_000, None, "INR")
    assert extract_explicit_salary_bounds("up to $120k") == (None, 120_000, "USD")
    assert extract_explicit_salary_bounds("MERN developer in Ahmedabad") == (None, None, None)
    assert extract_explicit_salary_bounds("Track a platform with 120k users") == (None, None, None)


def test_work_from_home_is_not_misread_as_a_location():
    from app.intent_rules import extract_location_mentions

    assert extract_location_mentions("React developer, work from home") == []
    assert extract_location_mentions("work from home, based in Gandhinager") == ["Gandhinagar"]
    assert extract_location_mentions("jobs in Ahmedabad, Gandhinagar with 4 years experience") == ["Ahmedabad", "Gandhinagar"]


def test_explicitly_preferred_skills_are_not_marked_must_have():
    from app.intent_rules import normalize_search_intent
    from app.schemas import SearchIntent

    result = normalize_search_intent(
        "React developer; must have Node.js and MongoDB; TypeScript and AWS are nice to have",
        SearchIntent(primaryRole="Software Developer", mustHaveSkills=["Docker"], preferredSkills=["Kubernetes"]),
    )

    assert result.primaryRole == "React Developer"
    assert result.mustHaveSkills == ["React", "Node.js", "MongoDB"]
    assert result.preferredSkills == ["TypeScript", "AWS"]


def test_mern_request_can_include_an_explicit_alternative_role():
    from app.intent_rules import normalize_search_intent
    from app.schemas import SearchIntent

    result = normalize_search_intent(
        "MERN stack or React developer in Ahmedabad",
        SearchIntent(primaryRole="Full Stack Developer"),
    )
    assert result.primaryRole == "MERN Stack Developer"
    assert "React Developer" in result.alternativeRoles
