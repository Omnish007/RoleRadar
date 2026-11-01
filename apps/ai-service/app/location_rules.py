"""Conservative location normalization for free-form job-search requests."""

from __future__ import annotations

import re
from difflib import SequenceMatcher

_LOCATION_ALIASES = {
    "gandhinager": "Gandhinagar", "gandhi nagar": "Gandhinagar", "gandhinagar gujarat": "Gandhinagar",
    "gandhinager gujarat": "Gandhinagar",
    "ahemdabad": "Ahmedabad", "ahmadabad": "Ahmedabad", "amdavad": "Ahmedabad",
    "ahmedabad gujarat": "Ahmedabad", "vadodra": "Vadodara", "baroda": "Vadodara",
    "bangalore": "Bengaluru", "banglore": "Bengaluru", "gurgaon": "Gurugram", "gurgoan": "Gurugram",
    "bombay": "Mumbai", "new delhi": "New Delhi", "delhi ncr": "Delhi NCR",
    "trivandrum": "Thiruvananthapuram", "nyc": "New York", "new york city": "New York",
    "sf": "San Francisco", "bay area": "San Francisco Bay Area", "us": "United States",
    "u.s.": "United States", "uk": "United Kingdom", "uae": "UAE",
}
_KNOWN_LOCATIONS = (
    "Ahmedabad", "Gandhinagar", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar",
    "Anand", "Nadiad", "Mumbai", "Pune", "Nashik", "Nagpur", "Thane", "Navi Mumbai",
    "Bengaluru", "Hyderabad", "Chennai", "Kolkata", "New Delhi", "Delhi", "Noida",
    "Gurugram", "Jaipur", "Lucknow", "Indore", "Bhopal", "Chandigarh", "Mohali", "Kochi",
    "Coimbatore", "Mysuru", "Mangaluru", "Thiruvananthapuram", "Patna", "Ranchi", "Dehradun",
    "Guwahati", "Bhubaneswar", "Visakhapatnam", "Vijayawada", "Amritsar", "Ludhiana", "Kanpur",
    "Varanasi", "Agra", "Faridabad", "Ghaziabad", "United States", "United Kingdom", "Canada",
    "Australia", "India", "Germany", "Singapore", "UAE", "Dubai", "London", "Manchester",
    "New York", "San Francisco", "San Francisco Bay Area", "Seattle", "Austin", "Boston", "Chicago",
    "Los Angeles", "Toronto", "Vancouver", "Montreal", "Sydney", "Melbourne", "Brisbane", "Berlin",
    "Munich", "Paris", "Amsterdam", "Zurich", "Dublin", "Tokyo", "Seoul", "Hong Kong",
    "Kuala Lumpur", "Bangkok", "Jakarta", "Cape Town", "Johannesburg", "Lagos", "Nairobi",
    "Riyadh", "Abu Dhabi", "Gujarat", "Maharashtra", "Karnataka", "Telangana", "Tamil Nadu",
    "Kerala", "Rajasthan", "Madhya Pradesh", "Uttar Pradesh", "Haryana", "Punjab", "Goa",
)
_LOCATION_INDEX = {value.casefold(): value for value in _KNOWN_LOCATIONS}
_NON_LOCATION_TERMS = {
    "home", "office", "remote", "hybrid", "onsite", "on site", "work from home", "me", "here",
    "there", "anywhere", "job", "jobs", "role", "roles", "developer", "engineer", "full stack",
    "frontend", "backend", "node", "node js", "react", "react native", "express", "express js",
    "mongodb", "mongo db", "typescript", "javascript", "python", "java", "angular", "vue", "vue js",
    "next js", "nestjs", "spring boot", "dotnet", "net", "c", "c sharp", "c plus plus", "php", "ruby",
    "golang", "rust", "flutter", "dart", "swift", "kotlin", "aws", "gcp", "google cloud", "azure",
    "docker", "kubernetes", "terraform", "redis", "kafka", "graphql", "html", "css", "sql", "mysql",
    "postgresql", "startup", "startups", "company", "companies", "product", "management", "position",
    "team", "environment", "technology", "tech", "mern", "mean", "pern", "mevn", "fresher", "freshers",
    "junior", "senior", "entry level", "mid level", "staff", "principal", "internship", "intern",
}


def _fold(value: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]+", " ", value.casefold())).strip()


def canonicalize_location(value: str, allow_unknown: bool = True) -> str:
    cleaned = re.sub(r"\s+", " ", value.strip(" ,.;")).strip()
    folded = _fold(cleaned)
    if not folded or folded in _NON_LOCATION_TERMS:
        return ""
    if folded in _LOCATION_ALIASES:
        return _LOCATION_ALIASES[folded]
    exact = _LOCATION_INDEX.get(folded)
    if exact:
        return exact
    if len(folded.split()) == 1:
        candidates = [name for name in _KNOWN_LOCATIONS if len(name.split()) == 1]
        best = max(candidates, key=lambda candidate: SequenceMatcher(None, folded, candidate.casefold()).ratio())
        if SequenceMatcher(None, folded, best.casefold()).ratio() >= 0.84:
            return _LOCATION_INDEX[best.casefold()]
    return (cleaned.title() if cleaned.islower() else cleaned) if allow_unknown else ""


def extract_location_mentions(text: str) -> list[str]:
    """Extract places only from explicit location context; never guess a city."""
    mentions: list[str] = []
    pattern = re.compile(
        r"\b(?:in\s+and\s+around|based\s+in|located\s+in|in|near|around|(?<!work )(?<!working )from)\s+([a-z][a-z0-9 ,.'-]{1,70})",
        re.IGNORECASE,
    )
    stop = re.compile(
        r"\b(?:with|having|who|that|for|at\s+least|minimum|maximum|experience|years?|yrs?|months?|"
        r"remote|hybrid|onsite|on-site|work\s+from\s+home|based\s+in|located\s+in|full[- ]time|part[- ]time|contract|"
        r"internship|posted|last|past|within|salary|paying|jobs?|roles?|developer|engineer|analyst|designer|"
        r"consultant|manager|specialist|architect|lead|stack|excluding|exclude|avoid|exact|strict|broad|balanced|only|match|"
        r"no|not|without|don't|do\s+not|never|must|should)\b|[;!?]",
        re.IGNORECASE,
    )
    for match in pattern.finditer(text):
        phrase = stop.split(match.group(1), maxsplit=1)[0].strip(" ,.-")
        if not phrase:
            continue
        # Respect multi-word aliases such as "Gandhinagar Gujarat" before splitting lists.
        whole = canonicalize_location(phrase, allow_unknown=False)
        parts = [whole] if whole else re.split(r"\s+(?:and|or)\s+|,|/", phrase, flags=re.IGNORECASE)
        for part in parts:
            part = re.sub(r"\s+\d+(?:\.\d+)?\+?$", "", part).strip()
            if not re.search(r"[a-z]", part, re.IGNORECASE):
                continue
            normalized = canonicalize_location(part, allow_unknown=True)
            if normalized and normalized.casefold() not in {item.casefold() for item in mentions}:
                mentions.append(normalized)
    return mentions[:10]
