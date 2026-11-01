import pytest
from pydantic import ValidationError
from app.schemas import KeywordExpansionRequest, KeywordExpansionResult, ParseRequest, SearchIntent


def test_search_intent_defaults_are_predictable():
    result = SearchIntent(primaryRole="MERN Developer")
    assert result.precision == "balanced"
    assert result.employmentTypes == ["full-time"]
    assert result.locations == []


def test_search_intent_rejects_invalid_experience_bounds():
    with pytest.raises(ValidationError):
        SearchIntent(primaryRole="Developer", minExperience=6, maxExperience=3)


def test_search_intent_rejects_invalid_salary_bounds():
    with pytest.raises(ValidationError):
        SearchIntent(primaryRole="Developer", minSalary=150000, maxSalary=80000)


def test_search_intent_rejects_blank_skill_values():
    with pytest.raises(ValidationError):
        SearchIntent(primaryRole="Developer", mustHaveSkills=[""])


def test_parse_request_limits_prompt_size():
    with pytest.raises(ValidationError):
        ParseRequest(text="x" * 4001)


def test_search_intent_rejects_unknown_employment_type():
    with pytest.raises(ValidationError):
        SearchIntent(primaryRole="Developer", employmentTypes=["permanent"])

def test_search_intent_rejects_overlong_role_alias():
    with pytest.raises(ValidationError):
        SearchIntent(primaryRole="Developer", alternativeRoles=["x" * 121])


def test_keyword_expansion_request_limits_user_input():
    with pytest.raises(ValidationError):
        KeywordExpansionRequest(role="x")
    with pytest.raises(ValidationError):
        KeywordExpansionRequest(role="Developer", skills=["x" * 81])

def test_keyword_expansion_result_defaults_to_empty_suggestions():
    result = KeywordExpansionResult()
    assert result.alternative_roles == []
    assert result.caveats == []
