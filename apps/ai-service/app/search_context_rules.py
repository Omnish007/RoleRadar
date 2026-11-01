"""Deterministic parsing of search preferences that should not be hallucinated."""

from __future__ import annotations

import re


def _is_negated(text: str, start: int) -> bool:
    prefix = text[:start]
    boundaries = [prefix.rfind(mark) for mark in (",", ";", ".", "!", "?")]
    segment = prefix[max(boundaries, default=-1) + 1:]
    segment = re.split(r"\b(?:but|except|however)\b", segment, flags=re.IGNORECASE)[-1]
    return bool(re.search(
        r"\b(?:not|no|without|avoid|exclude|excluding|don't\s+want|do\s+not\s+want|"
        r"not\s+interested\s+in)\b", segment, re.IGNORECASE
    ))


def extract_work_modes(text: str) -> list[str]:
    rules = (
        ("remote", r"\b(?:remote|remotely|wfh|work\s+from\s+home|work\s+anywhere|fully\s+distributed)\b"),
        ("hybrid", r"\bhybrid\b"),
        ("onsite", r"\b(?:onsite|on-site|in\s+office|office[- ]based)\b"),
    )
    result: list[str] = []
    for value, pattern in rules:
        if any(not _is_negated(text, match.start()) for match in re.finditer(pattern, text, re.IGNORECASE)):
            result.append(value)
    return result


def extract_employment_types(text: str) -> list[str]:
    rules = (
        ("contract", r"\b(?:contract|contractor|contractual|freelance|freelancer)\b"),
        ("part-time", r"\b(?:part[- ]time|parttime)\b"),
        ("internship", r"\b(?:internship|intern)\b"),
        ("full-time", r"\b(?:full[- ]time|fulltime|permanent)\b"),
    )
    result = [value for value, pattern in rules if any(
        not _is_negated(text, match.start()) for match in re.finditer(pattern, text, re.IGNORECASE)
    )]
    return result or ["full-time"]


def extract_explicit_exclusions(text: str) -> list[str]:
    terms: list[str] = []
    pattern = re.compile(r"\b(?:exclude|excluding|avoid|do\s+not\s+include|don't\s+include|leave\s+out)\s+([^.;!?]+)", re.IGNORECASE)
    for match in pattern.finditer(text):
        phrase = re.split(r"\b(?:in|near|based\s+in|with|having|posted|within|last|past|salary|paying)\b", match.group(1), maxsplit=1, flags=re.IGNORECASE)[0]
        for part in re.split(r"\s+(?:and|or)\s+|,|/", phrase, flags=re.IGNORECASE):
            cleaned = re.sub(r"\s+", " ", part).strip(" ,.-")
            if cleaned and cleaned.casefold() not in {item.casefold() for item in terms}:
                terms.append(cleaned[:100])
    return terms[:20]


def extract_precision(text: str) -> str:
    normalized = text.casefold()
    if re.search(r"\b(?:broad|wide|any related|similar roles|open to|cast a wide net)\b", normalized):
        return "broad"
    if re.search(r"\b(?:precise|strict|exact match|exactly|only these|only this|no adjacent|tightly matched)\b", normalized):
        return "precise"
    return "balanced"


def extract_search_target(text: str) -> str:
    normalized = text.casefold()
    if re.search(r"\b(?:jobs?\s+and\s+hiring\s+posts?|both\s+jobs?\s+and\s+hiring)\b", normalized):
        return "both"
    if re.search(r"\b(?:hiring\s+posts?|recruiters?\s+are\s+hiring|hiring\s+announcements?)\b", normalized):
        return "hiring_posts"
    return "jobs"
