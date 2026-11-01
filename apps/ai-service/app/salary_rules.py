"""Explicit annual-salary parsing for common job-search notation."""

from __future__ import annotations

import re

_NUMBER = r"(\d+(?:\.\d+)?)"
_UNIT_FACTORS = {
    "lpa": 100_000,
    "lakh": 100_000,
    "lakhs": 100_000,
    "crore": 10_000_000,
    "crores": 10_000_000,
    "k": 1_000,
    "thousand": 1_000,
}


def extract_explicit_salary_bounds(text: str) -> tuple[float | None, float | None, str | None]:
    """Return annualized salary bounds only when the request states a salary unit."""
    lowered = text.casefold()
    currency = None
    if "₹" in text or re.search(r"\b(?:inr|rs\.?|rupees?)\b", lowered):
        currency = "INR"
    elif "$" in text or re.search(r"\busd\b", lowered):
        currency = "USD"
    elif "€" in text or re.search(r"\beur\b", lowered):
        currency = "EUR"
    elif "£" in text or re.search(r"\bgbp\b", lowered):
        currency = "GBP"

    unit_pattern = r"(lpa|lakhs?|crores?|k|thousand)"
    salary_context = currency is not None or bool(re.search(r"\b(salary|compensation|pay|package|ctc|per\s+month|per\s+annum|annually)\b", lowered))
    range_match = re.search(
        rf"{_NUMBER}\s*(?:-|to)\s*{_NUMBER}\s*{unit_pattern}\b", lowered, re.IGNORECASE
    )
    if range_match:
        unit = range_match.group(3).casefold()
        if unit == "k" and not salary_context:
            return None, None, currency
        factor = _UNIT_FACTORS[unit]
        return float(range_match.group(1)) * factor, float(range_match.group(2)) * factor, currency

    single_match = re.search(rf"{_NUMBER}\s*{unit_pattern}\b", lowered, re.IGNORECASE)
    if not single_match:
        return None, None, currency
    unit = single_match.group(2).casefold()
    if unit == "k" and not salary_context:
        return None, None, currency

    amount = float(single_match.group(1)) * _UNIT_FACTORS[unit]
    prefix = lowered[max(0, single_match.start() - 28):single_match.start()]
    if re.search(r"\b(?:up\s+to|at\s+most|maximum|max)\b", prefix):
        return None, amount, currency
    return amount, None, currency
