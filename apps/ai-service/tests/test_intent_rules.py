from __future__ import annotations

import pytest

from app.experience_rules import extract_explicit_experience_bounds, extract_posted_days
from app.intent_rules import normalize_search_intent
from app.location_rules import extract_location_mentions
from app.schemas import SearchIntent
from app.search_context_rules import (
    extract_employment_types,
    extract_explicit_exclusions,
    extract_precision,
    extract_work_modes,
)
from app.skill_rules import extract_explicit_skills


def test_user_mern_gandhinagar_example_is_normalized_completely():
    result = normalize_search_intent(
        "Mern stack developer in gandhinager with 4 years of experience",
        SearchIntent(primaryRole="Full Stack Developer", name="AI generated search"),
    )
    assert result.name == "MERN Stack Developer · Gandhinagar"
    assert result.primaryRole == "MERN Stack Developer"
    assert result.alternativeRoles == ["MERN Developer", "Full Stack JavaScript Developer"]
    assert result.mustHaveSkills == ["MongoDB", "Express.js", "React", "Node.js"]
    assert result.preferredSkills == []
    assert result.locations == ["Gandhinagar"]
    assert result.minExperience == 4
    assert result.maxExperience is None
    assert result.workModes == []
    assert result.employmentTypes == ["full-time"]
    assert result.minSalary is None and result.maxSalary is None
    assert result.precision == "balanced"


def test_model_guesses_are_removed_when_not_supported_by_the_prompt():
    draft = SearchIntent(
        primaryRole="Software Developer", locations=["Pune"], minExperience=5,
        minSalary=1_200_000, workModes=["remote"], mustHaveSkills=["Kubernetes"],
        excludedTerms=["internship"],
    )
    result = normalize_search_intent("MERN stack developer", draft)
    assert result.locations == []
    assert result.minExperience is None
    assert result.minSalary is None
    assert result.workModes == []
    assert result.mustHaveSkills == ["MongoDB", "Express.js", "React", "Node.js"]
    assert result.excludedTerms == []


def test_explicit_unknown_location_is_preserved_but_technology_is_not_a_location():
    assert extract_location_mentions("Backend developer in Tbilisi with 3 years experience") == ["Tbilisi"]
    assert extract_location_mentions("Backend developer in React with 3 years experience") == []
    assert extract_location_mentions("MERN developer in Azure with 3 years experience") == []


def test_location_aliases_and_multiword_region_are_normalized():
    assert extract_location_mentions("jobs in Gandhinager, Gujarat") == ["Gandhinagar"]
    assert extract_location_mentions("jobs in and around Bangalore") == ["Bengaluru"]
    assert extract_location_mentions("jobs near New York City") == ["New York"]


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("at least 4 years experience", (4.0, None)),
        ("4+ yrs", (4.0, None)),
        ("between 3 and 5 years of experience", (3.0, 5.0)),
        ("3–5 yrs experience", (3.0, 5.0)),
        ("up to 4 years experience", (None, 4.0)),
        ("not more than 6 years of experience", (None, 6.0)),
        ("2 years and 6 months of experience", (2.5, None)),
        ("6 months experience", (0.5, None)),
        ("fresher role", (0.0, None)),
        ("senior role", (None, None)),
    ],
)
def test_experience_phrases(text: str, expected: tuple[float | None, float | None]):
    assert extract_explicit_experience_bounds(text) == expected


def test_role_and_skill_vocabulary_covers_common_engineering_titles():
    result = normalize_search_intent(
        "React Native Developer in Ahmedabad with Flutter and TypeScript",
        SearchIntent(primaryRole="Software Developer"),
    )
    assert result.primaryRole == "React Native Developer"
    assert "React Native" in result.mustHaveSkills
    assert "Flutter" in result.mustHaveSkills
    assert "TypeScript" in result.mustHaveSkills
    assert result.locations == ["Ahmedabad"]


def test_preferred_and_excluded_skills_are_not_marked_as_required():
    required, preferred = extract_explicit_skills(
        "React developer; must have Node.js and MongoDB; TypeScript and AWS are nice to have; exclude Docker"
    )
    assert required == ["React", "Node.js", "MongoDB"]
    assert preferred == ["TypeScript", "AWS"]


def test_stack_exclusion_is_respected():
    result = normalize_search_intent(
        "MERN developer in Ahmedabad, exclude MongoDB",
        SearchIntent(primaryRole="MERN Developer"),
    )
    assert result.mustHaveSkills == ["Express.js", "React", "Node.js"]
    assert result.excludedTerms == ["MongoDB"]


def test_negated_work_modes_and_employment_types_are_not_added():
    assert extract_work_modes("not remote, hybrid only") == ["hybrid"]
    assert extract_work_modes("I do not want onsite or remote work") == []
    assert extract_employment_types("no internship, contract roles only") == ["contract"]


def test_exclusions_precision_and_search_target_are_explicit():
    text = "MERN developer, exclude internships and staffing agencies; jobs and hiring posts; exact match"
    result = normalize_search_intent(text, SearchIntent(primaryRole="Software Developer"))
    assert result.excludedTerms == ["internships", "staffing agencies"]
    assert result.intent == "both"
    assert result.precision == "precise"
    assert extract_precision("open to similar roles") == "broad"
    assert extract_precision("React developer in Ahmedabad") == "balanced"


def test_posting_recency_phrases():
    assert extract_posted_days("posted in the last 24 hours") == 1
    assert extract_posted_days("posted within a week") == 7
    assert extract_posted_days("posted within last 3 days") == 3
    assert extract_posted_days("posted last month") == 30
    assert extract_posted_days("recently posted") is None


def test_negated_work_mode_is_not_misread_as_a_location():
    assert extract_location_mentions("React Native developer in Bangalore, no remote, onsite only") == ["Bengaluru"]


def test_excluding_freshers_does_not_set_zero_years_experience():
    text = "React Native developer in Bangalore, no remote, onsite only, exclude internship and fresher roles"
    result = normalize_search_intent(text, SearchIntent(primaryRole="Software Developer"))
    assert result.minExperience is None
    assert result.locations == ["Bengaluru"]
    assert result.workModes == ["onsite"]
    assert "internship" in result.excludedTerms


def test_specialized_backend_role_does_not_add_redundant_generic_alternative():
    result = normalize_search_intent(
        "Python backend engineer in Pune",
        SearchIntent(primaryRole="Backend Developer"),
    )
    assert result.primaryRole == "Python Backend Engineer"
    assert "Backend Developer" not in result.alternativeRoles


def test_reversed_explicit_experience_range_is_rejected():
    with pytest.raises(ValueError, match="range is reversed"):
        normalize_search_intent(
            "MERN developer with 5 to 3 years experience",
            SearchIntent(primaryRole="MERN Developer"),
        )


def test_react_native_is_not_duplicated_as_react():
    required, preferred = extract_explicit_skills("React Native Developer with TypeScript")
    assert required == ["React Native", "TypeScript"]
    assert preferred == []


def test_language_specific_backend_titles_are_preserved():
    python_result = normalize_search_intent(
        "Python backend engineer in Pune",
        SearchIntent(primaryRole="Backend Developer"),
    )
    node_result = normalize_search_intent(
        "Node.js backend developer in Ahmedabad",
        SearchIntent(primaryRole="Software Developer"),
    )
    assert python_result.primaryRole == "Python Backend Engineer"
    assert node_result.primaryRole == "Node.js Backend Engineer"


@pytest.mark.anyio
async def test_model_output_is_repaired_once_when_it_fails_schema_validation(monkeypatch):
    from app import ollama

    calls = []

    async def fake_generate_structured(_prompt, _schema, _model=None):
        calls.append(True)
        if len(calls) == 1:
            return {"primaryRole": ""}
        return {"primaryRole": "React Developer"}

    monkeypatch.setattr(ollama, "generate_structured", fake_generate_structured)
    result = await ollama.generate_intent("Find React developer jobs")

    assert result.primaryRole == "React Developer"
    assert len(calls) == 2


def test_mean_word_is_not_misread_as_the_mean_stack():
    result = normalize_search_intent(
        "Find the mean salary for Python developer roles in Mumbai",
        SearchIntent(primaryRole="Python Developer"),
    )
    assert result.primaryRole == "Python Developer"
    assert result.locations == ["Mumbai"]


def test_mean_stack_is_recognized_when_used_as_a_stack_title():
    result = normalize_search_intent(
        "MEAN stack developer in Bengaluru",
        SearchIntent(primaryRole="Software Developer"),
    )
    assert result.primaryRole == "MEAN Stack Developer"
    assert result.mustHaveSkills == ["MongoDB", "Express.js", "Angular", "Node.js"]


def test_preferred_skill_heading_applies_to_comma_separated_skill_list():
    required, preferred = extract_explicit_skills(
        "Required: React, Node.js; Preferred skills: AWS, Docker, Kubernetes"
    )
    assert required == ["React", "Node.js"]
    assert preferred == ["AWS", "Docker", "Kubernetes"]
