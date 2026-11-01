"""Explicit technical-skill extraction with required/preferred classification."""

from __future__ import annotations

import re

SKILL_RULES: tuple[tuple[str, str], ...] = (
    (r"\breact\s*native\b", "React Native"),
    (r"\bnext(?:\.js|js)\b", "Next.js"),
    (r"\bnest(?:\.js|js)\b", "NestJS"),
    (r"\bexpress(?:\.js|js)?\b", "Express.js"),
    (r"\bnode(?:\.js|js)?\b", "Node.js"),
    (r"\breact(?:\.js|js)?\b(?!\s*native)", "React"),
    (r"\bmongodb\b|\bmongo\s*db\b", "MongoDB"),
    (r"\bpostgres(?:ql)?\b", "PostgreSQL"),
    (r"\bmysql\b", "MySQL"),
    (r"\btypescript\b|(?<![.\w])ts\b", "TypeScript"),
    (r"\bjavascript\b|(?<![.\w])js\b", "JavaScript"),
    (r"\bhtml5?\b", "HTML"),
    (r"\bcss3?\b", "CSS"),
    (r"\btailwind(?:\s+css)?\b", "Tailwind CSS"),
    (r"\bmaterial\s*ui\b|\bmui\b", "Material UI"),
    (r"\bredux\b", "Redux"),
    (r"\bzustand\b", "Zustand"),
    (r"\bsql\b", "SQL"),
    (r"\bnosql\b", "NoSQL"),
    (r"\bpython\b", "Python"),
    (r"\bjava\b", "Java"),
    (r"(?<!\w)c\s*\+\+(?!\w)", "C++"),
    (r"(?<!\w)c#(?!\w)|\bc\s+sharp\b", "C#"),
    (r"(?<![\w+])c(?!\s*(?:\+\+|#))(?=\s|,|;|$)", "C"),
    (r"\bgo(?:lang)?\b", "Go"),
    (r"\brust\b", "Rust"),
    (r"\bphp\b", "PHP"),
    (r"\bruby\b", "Ruby"),
    (r"\bdart\b", "Dart"),
    (r"\bflutter\b", "Flutter"),
    (r"\bswift\b", "Swift"),
    (r"\bkotlin\b", "Kotlin"),
    (r"\bangular\b", "Angular"),
    (r"\bvue(?:\.js|js)?\b", "Vue.js"),
    (r"\bdjango\b", "Django"),
    (r"\bflask\b", "Flask"),
    (r"\bfastapi\b", "FastAPI"),
    (r"\bspring\s*boot\b", "Spring Boot"),
    (r"(?<!\w)\.net\b|\bdotnet\b", ".NET"),
    (r"\blaravel\b", "Laravel"),
    (r"\bwordpress\b", "WordPress"),
    (r"\bdocker\b", "Docker"),
    (r"\bkubernetes\b|\bk8s\b", "Kubernetes"),
    (r"\bterraform\b", "Terraform"),
    (r"\bredis\b", "Redis"),
    (r"\bkafka\b", "Kafka"),
    (r"\brabbitmq\b", "RabbitMQ"),
    (r"\bgraphql\b", "GraphQL"),
    (r"\baws\b", "AWS"),
    (r"\bgcp\b|\bgoogle cloud\b", "Google Cloud"),
    (r"\bazure\b", "Azure"),
    (r"\bfirebase\b", "Firebase"),
    (r"\bplaywright\b", "Playwright"),
    (r"\bcypress\b", "Cypress"),
    (r"\bselenium\b", "Selenium"),
    (r"\bjest\b", "Jest"),
    (r"\bvitest\b", "Vitest"),
    (r"\bgithub actions\b", "GitHub Actions"),
    (r"\bjenkins\b", "Jenkins"),
    (r"\bgit\b", "Git"),
    (r"\blinux\b", "Linux"),
)
_PREFERRED = re.compile(r"\b(preferred|optional|bonus|ideally|nice\s+to\s+have|good\s+to\s+have)\b", re.IGNORECASE)
_REQUIRED = re.compile(r"\b(required|mandatory|must\s+have|must\s+know|need(?:ed)?)\b", re.IGNORECASE)
_EXCLUDED = re.compile(r"\b(not\s+required|not\s+needed|don't\s+need|do\s+not\s+need|without|exclude|excluding|avoid)\b", re.IGNORECASE)


def extract_explicit_skills(text: str) -> tuple[list[str], list[str]]:
    """Return only mentioned skills, ordered as written and tiered by nearby wording."""
    lowered = text.casefold()
    matches: list[tuple[int, str]] = []
    for pattern, skill in SKILL_RULES:
        matches.extend((match.start(), skill) for match in re.finditer(pattern, lowered, re.IGNORECASE))
    matches.sort(key=lambda item: item[0])

    required: list[str] = []
    preferred: list[str] = []
    for position, skill in matches:
        clause_start = max(lowered.rfind(separator, 0, position) for separator in (";", ".", "\n")) + 1
        clause_end = min(
            (index for index in (lowered.find(separator, position) for separator in (";", ".", "\n")) if index >= 0),
            default=len(lowered),
        )
        clause = lowered[clause_start:clause_end]
        relative_position = position - clause_start
        markers = [
            (abs(marker.start() - relative_position), tier)
            for tier, regex in (("preferred", _PREFERRED), ("required", _REQUIRED), ("excluded", _EXCLUDED))
            for marker in regex.finditer(clause)
        ]
        tier = min(markers, default=(0, "required"), key=lambda item: item[0])[1]
        if tier == "excluded":
            continue
        key = skill.casefold()
        target, other = (preferred, required) if tier == "preferred" else (required, preferred)
        if key in {item.casefold() for item in other}:
            if tier == "required":
                other[:] = [item for item in other if item.casefold() != key]
            else:
                continue
        if key not in {item.casefold() for item in target}:
            target.append(skill)
    return required[:20], preferred[:20]
