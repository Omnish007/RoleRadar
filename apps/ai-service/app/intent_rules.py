"""Hybrid LLM + deterministic normalization for job-search intent."""

from __future__ import annotations

import re

from .experience_rules import extract_explicit_experience_bounds, extract_posted_days
from .location_rules import canonicalize_location, extract_location_mentions
from .salary_rules import extract_explicit_salary_bounds
from .schemas import SearchIntent
from .search_context_rules import (
    extract_employment_types,
    extract_explicit_exclusions,
    extract_precision,
    extract_search_target,
    extract_work_modes,
)
from .skill_rules import extract_explicit_skills

STACKS: dict[str, dict[str, object]] = {
    "mern": {
        "role": "MERN Stack Developer",
        "skills": ["MongoDB", "Express.js", "React", "Node.js"],
        "alternatives": ["MERN Developer", "Full Stack JavaScript Developer"],
    },
    "mean": {
        "role": "MEAN Stack Developer",
        "skills": ["MongoDB", "Express.js", "Angular", "Node.js"],
        "alternatives": ["MEAN Developer", "Full Stack JavaScript Developer"],
    },
    "pern": {
        "role": "PERN Stack Developer",
        "skills": ["PostgreSQL", "Express.js", "React", "Node.js"],
        "alternatives": ["PERN Developer", "Full Stack JavaScript Developer"],
    },
    "mevn": {
        "role": "MEVN Stack Developer",
        "skills": ["MongoDB", "Express.js", "Vue.js", "Node.js"],
        "alternatives": ["MEVN Developer", "Full Stack JavaScript Developer"],
    },
}
ROLE_RULES: tuple[tuple[str, str], ...] = (
    (r"\breact\s+native\s+(?:developer|engineer)\b", "React Native Developer"),
    (r"\bangular\s+(?:developer|engineer)\b", "Angular Developer"),
    (r"\bvue(?:\.js|js)?\s+(?:developer|engineer)\b", "Vue.js Developer"),
    (r"\bpython\s+(?:backend|back-end)\s+(?:developer|engineer)\b", "Python Backend Engineer"),
    (r"\bnode(?:\.js|js)?\s+(?:backend|back-end)\s+(?:developer|engineer)\b", "Node.js Backend Engineer"),
    (r"\b(?:machine learning|ml)\s+(?:engineer|developer)\b", "Machine Learning Engineer"),
    (r"\b(?:artificial intelligence|ai)\s+(?:engineer|developer)\b", "AI Engineer"),
    (r"\bllm\s+(?:engineer|developer)\b", "LLM Engineer"),
    (r"\b(?:site reliability|sre)\s+engineer\b", "Site Reliability Engineer"),
    (r"\b(?:cloud|platform)\s+engineer\b", "Cloud Engineer"),
    (r"\b(?:cybersecurity|security)\s+(?:engineer|analyst)\b", "Security Engineer"),
    (r"\b(?:product|ux|ui|ui/ux)\s+designer\b", "Product Designer"),
    (r"\bproduct\s+manager\b", "Product Manager"),
    (r"\bdata\s+scientist\b", "Data Scientist"),
    (r"\bdata\s+analyst\b", "Data Analyst"),
    (r"\bdata\s+engineer\b", "Data Engineer"),
    (r"\b(?:business intelligence|bi)\s+analyst\b", "Business Intelligence Analyst"),
    (r"\b(?:frontend|front-end)\s+(?:developer|engineer)\b", "Frontend Developer"),
    (r"\b(?:backend|back-end)\s+(?:developer|engineer)\b", "Backend Developer"),
    (r"\b(?:full[- ]stack)\s+(?:developer|engineer)\b", "Full Stack Developer"),
    (r"\bnext(?:\.js|js)\s+(?:developer|engineer)\b", "Next.js Developer"),
    (r"\b(?:react|react\.js|reactjs)\s+(?:developer|engineer)\b", "React Developer"),
    (r"\bnode(?:\.js|js)\s+(?:developer|engineer)\b", "Node.js Developer"),
    (r"\bpython\s+(?:developer|engineer)\b", "Python Developer"),
    (r"\bjava\s+(?:developer|engineer)\b", "Java Developer"),
    (r"(?<!\w)\.net\s+(?:developer|engineer)\b|\bdotnet\s+(?:developer|engineer)\b|(?<!\w)c#\s+(?:developer|engineer)\b", ".NET Developer"),
    (r"\bphp\s+(?:developer|engineer)\b", "PHP Developer"),
    (r"\b(?:go|golang)\s+(?:developer|engineer)\b", "Go Developer"),
    (r"\bflutter\s+(?:developer|engineer)\b", "Flutter Developer"),
    (r"\b(?:android|ios)\s+(?:developer|engineer)\b", "Mobile Developer"),
    (r"\bdevops\s+(?:engineer|developer)\b", "DevOps Engineer"),
    (r"\b(?:qa|quality assurance)\s+(?:engineer|analyst)\b", "QA Engineer"),
    (r"\b(?:test automation|automation test)\s+engineer\b", "Test Automation Engineer"),
    (r"\bwordpress\s+(?:developer|engineer)\b", "WordPress Developer"),
    (r"\blaravel\s+(?:developer|engineer)\b", "Laravel Developer"),
)
ROLE_ALTERNATIVES: dict[str, list[str]] = {
    "React Developer": ["Frontend Developer", "React Engineer"],
    "React Native Developer": ["React Native Engineer", "Mobile Developer"],
    "Angular Developer": ["Angular Engineer", "Frontend Developer"],
    "Vue.js Developer": ["Vue.js Engineer", "Frontend Developer"],
    "Python Backend Engineer": ["Backend Python Developer", "Python Developer"],
    "Node.js Backend Engineer": ["Backend Node.js Developer", "Node.js Developer"],
    "Node.js Developer": ["Backend Developer", "Node.js Engineer"],
    "Frontend Developer": ["Frontend Engineer", "UI Developer"],
    "Backend Developer": ["Backend Engineer", "Server-Side Developer"],
    "Full Stack Developer": ["Full Stack Engineer"],
    "Python Developer": ["Python Engineer"],
    "Java Developer": ["Java Engineer"],
    "QA Engineer": ["Software Test Engineer", "Test Automation Engineer"],
    "Data Analyst": ["Business Intelligence Analyst"],
}


def _unique(values: list[str], limit: int = 20) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for value in values:
        cleaned = value.strip()
        key = cleaned.casefold()
        if cleaned and key not in seen:
            seen.add(key)
            result.append(cleaned)
        if len(result) >= limit:
            break
    return result


def normalize_search_intent(text: str, draft: SearchIntent) -> SearchIntent:
    """Keep model interpretation but make explicit constraints source-grounded."""
    payload = draft.model_dump()
    normalized_text = re.sub(r"\s+", " ", text).strip()
    lowered = normalized_text.casefold()

    matched_stack: dict[str, object] | None = None
    for acronym, definition in STACKS.items():
        stack_context = re.search(
            rf"\b{acronym}\s+stack\b|\b{acronym}\s+(?:developer|engineer|roles?|jobs?)\b|"
            rf"\b(?:developer|engineer|roles?|jobs?)\b.{{0,24}}\b{acronym}\b",
            lowered,
        )
        if stack_context:
            matched_stack = definition
            payload["primaryRole"] = definition["role"]
            break

    role_hits = sorted(
        (match.start(), canonical_role)
        for pattern, canonical_role in ROLE_RULES
        for match in re.finditer(pattern, lowered)
    )
    explicit_roles = _unique([role for _, role in role_hits], 12)
    # Keep specialized role names from being diluted by a generic overlapping match.
    if "Python Backend Engineer" in explicit_roles:
        explicit_roles = [role for role in explicit_roles if role != "Backend Developer"]
    if "Node.js Backend Engineer" in explicit_roles:
        explicit_roles = [role for role in explicit_roles if role != "Backend Developer"]
    if matched_stack:
        payload["alternativeRoles"] = _unique(
            list(matched_stack["alternatives"])
            + [role for role in explicit_roles if role != payload["primaryRole"]], 12
        )
    elif explicit_roles:
        primary = explicit_roles[0]
        payload["primaryRole"] = primary
        payload["alternativeRoles"] = _unique(
            explicit_roles[1:] + ROLE_ALTERNATIVES.get(primary, []), 12
        )

    required_skills, preferred_skills = extract_explicit_skills(normalized_text)
    stack_skills = list(matched_stack["skills"]) if matched_stack else []
    excluded = extract_explicit_exclusions(normalized_text)
    excluded_lower = {item.casefold() for item in excluded}
    preferred_lower = {item.casefold() for item in preferred_skills}
    is_excluded = lambda skill: any(term in skill.casefold() or skill.casefold() in term for term in excluded_lower)
    required_skills = [skill for skill in required_skills if not is_excluded(skill)]
    preferred_skills = [skill for skill in preferred_skills if not is_excluded(skill)]
    stack_skills = [
        skill for skill in stack_skills
        if not is_excluded(skill) and skill.casefold() not in preferred_lower
    ]
    payload["mustHaveSkills"] = _unique(stack_skills + required_skills, 20)
    payload["preferredSkills"] = _unique(
        [skill for skill in preferred_skills if skill.casefold() not in {v.casefold() for v in payload["mustHaveSkills"]}], 20
    )

    text_locations = extract_location_mentions(normalized_text)
    # Never retain a city inferred only by the model; it must be traceable to source text.
    mentioned = lowered
    model_locations = [
        canonicalize_location(value) for value in payload.get("locations", [])
        if value and re.search(rf"(?<!\w){re.escape(value.casefold())}(?!\w)", mentioned)
    ]
    payload["locations"] = _unique(text_locations + model_locations, 10)

    minimum, maximum = extract_explicit_experience_bounds(normalized_text)
    payload["minExperience"], payload["maxExperience"] = minimum, maximum
    if minimum is not None and maximum is not None and minimum > maximum:
        raise ValueError("The requested experience range is reversed. Please check the minimum and maximum years.")

    payload["workModes"] = extract_work_modes(normalized_text)
    payload["employmentTypes"] = extract_employment_types(normalized_text)
    payload["postedWithinDays"] = extract_posted_days(normalized_text)
    payload["minSalary"], payload["maxSalary"], currency = extract_explicit_salary_bounds(normalized_text)
    payload["currency"] = currency or "INR"
    payload["excludedTerms"] = excluded
    payload["intent"] = extract_search_target(normalized_text)
    payload["precision"] = extract_precision(normalized_text)

    # Always use a readable, stable profile name rather than model boilerplate.
    name_parts = [payload["primaryRole"]]
    if payload["locations"]:
        name_parts.append(payload["locations"][0])
    payload["name"] = " · ".join(name_parts)[:100]
    return SearchIntent.model_validate(payload)
