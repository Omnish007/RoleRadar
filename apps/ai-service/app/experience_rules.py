"""Explicit experience and recency parsing; no seniority guessing."""

from __future__ import annotations

import re

_NUMBER = r"(\d+(?:\.\d+)?)"
_YEAR = r"(?:years?|yrs?|yr)"


def extract_explicit_experience_bounds(text: str) -> tuple[float | None, float | None]:
    normalized = re.sub(r"\s+", " ", text.casefold())
    fresh_match = re.search(r"\b(?:fresher|freshers|entry[- ]level|no experience|zero experience)\b", normalized)
    if fresh_match:
        clause_start = max((normalized.rfind(mark, 0, fresh_match.start()) for mark in (",", ";", ".", "!", "?")), default=-1) + 1
        prefix = normalized[clause_start:fresh_match.start()]
        excluded = re.search(r"\b(?:exclude|excluding|avoid|without|not|no|don't|do\s+not)\b", prefix)
        if not excluded:
            return 0.0, None

    compound = re.search(rf"{_NUMBER}\s*{_YEAR}\s*(?:and\s*)?(\d+)\s*months?\s+(?:of\s+)?(?:work\s+)?(?:experience|exp)\b", normalized)
    if compound:
        return round(float(compound.group(1)) + int(compound.group(2)) / 12, 2), None
    month_only = re.search(r"\b(\d+)\s*months?\s+(?:of\s+)?(?:work\s+)?(?:experience|exp)\b", normalized)
    if month_only:
        return round(int(month_only.group(1)) / 12, 2), None

    range_match = re.search(
        rf"\bbetween\s+{_NUMBER}\s+(?:and|to|[-–])\s*{_NUMBER}\s*{_YEAR}\b", normalized
    ) or re.search(rf"\b{_NUMBER}\s*(?:to|[-–])\s*{_NUMBER}\s*{_YEAR}\b", normalized)
    if range_match:
        return float(range_match.group(1)), float(range_match.group(2))

    minimum = re.search(
        rf"\b(?:at\s+least|minimum(?:\s+of)?|min\.?|no\s+less\s+than|(?<!not\s)more\s+than|over|above)\s*{_NUMBER}\s*{_YEAR}\b",
        normalized,
    ) or re.search(rf"\b{_NUMBER}\s*\+\s*{_YEAR}\b", normalized) or re.search(
        rf"\b{_NUMBER}\s*{_YEAR}\s+or\s+more\b", normalized
    )
    maximum = re.search(
        rf"\b(?:up\s+to|at\s+most|maximum(?:\s+of)?|max\.?|no\s+more\s+than|not\s+more\s+than|less\s+than|under|below)\s*{_NUMBER}\s*{_YEAR}\b",
        normalized,
    )
    if minimum or maximum:
        return (float(minimum.group(1)) if minimum else None, float(maximum.group(1)) if maximum else None)

    single = re.search(rf"\b{_NUMBER}\s*{_YEAR}\s*(?:of\s+)?(?:work\s+)?(?:experience|exp)\b", normalized)
    return (float(single.group(1)), None) if single else (None, None)


def extract_posted_days(text: str) -> int | None:
    normalized = text.casefold()
    if re.search(r"\b(?:today|past\s+24\s+hours?|last\s+24\s+hours?|past\s+day|last\s+day)\b", normalized):
        return 1
    if re.search(r"\b(?:within|last|past)\s+a\s+week\b", normalized):
        return 7
    day_match = re.search(r"\b(?:last|past|within)\s+(\d{1,3})\s+days?\b", normalized)
    if day_match:
        value = int(day_match.group(1))
        return value if 1 <= value <= 365 else None
    if re.search(r"\b(?:this|last|past)\s+week\b", normalized):
        return 7
    if re.search(r"\b(?:this|last|past)\s+month\b", normalized):
        return 30
    return None
