from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator

RoleText = Annotated[str, Field(min_length=1, max_length=120)]
SkillText = Annotated[str, Field(min_length=1, max_length=80)]
ExcludedText = Annotated[str, Field(min_length=1, max_length=100)]
LocationText = Annotated[str, Field(min_length=1, max_length=120)]
EmploymentType = Literal["full-time", "contract", "part-time", "internship"]


class SearchIntent(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str = Field(default="AI generated search", min_length=1, max_length=100)
    primaryRole: str = Field(min_length=1, max_length=120)
    alternativeRoles: list[RoleText] = Field(default_factory=list, max_length=12)
    mustHaveSkills: list[SkillText] = Field(default_factory=list, max_length=20)
    preferredSkills: list[SkillText] = Field(default_factory=list, max_length=20)
    excludedTerms: list[ExcludedText] = Field(default_factory=list, max_length=20)
    locations: list[LocationText] = Field(default_factory=list, max_length=10)
    minExperience: float | None = Field(default=None, ge=0, le=60)
    maxExperience: float | None = Field(default=None, ge=0, le=60)
    workModes: list[Literal["remote", "hybrid", "onsite"]] = Field(default_factory=list)
    employmentTypes: list[EmploymentType] = Field(default_factory=lambda: ["full-time"], max_length=4)
    postedWithinDays: int | None = Field(default=None, gt=0, le=365)
    minSalary: float | None = Field(default=None, ge=0)
    maxSalary: float | None = Field(default=None, gt=0)
    currency: Literal["INR", "USD", "EUR", "GBP"] = "INR"
    intent: Literal["jobs", "hiring_posts", "both"] = "jobs"
    precision: Literal["broad", "balanced", "precise"] = "balanced"

    @model_validator(mode="after")
    def validate_ranges(self):
        if self.minExperience is not None and self.maxExperience is not None:
            if self.minExperience > self.maxExperience:
                raise ValueError("minExperience cannot exceed maxExperience")
        if self.minSalary is not None and self.maxSalary is not None:
            if self.minSalary > self.maxSalary:
                raise ValueError("minSalary cannot exceed maxSalary")
        for field_name in ("alternativeRoles", "mustHaveSkills", "preferredSkills", "excludedTerms", "locations"):
            values = getattr(self, field_name)
            if any(not value for value in values):
                raise ValueError(f"{field_name} cannot contain blank values")
        return self


class ParseRequest(BaseModel):
    text: str = Field(min_length=5, max_length=4000)


class JobDescriptionRequest(BaseModel):
    job_description: str = Field(min_length=30, max_length=15000)


class ResumeMatchRequest(BaseModel):
    resume_text: str = Field(min_length=50, max_length=20000)
    job_description: str = Field(min_length=30, max_length=15000)


class InterviewRequest(BaseModel):
    job_description: str = Field(min_length=30, max_length=15000)
    seniority: str | None = Field(default=None, max_length=80)


class TextSummaryRequest(BaseModel):
    text: str = Field(min_length=30, max_length=15000)


class CompanySummaryRequest(BaseModel):
    company_name: str = Field(min_length=1, max_length=160)
    source_material: str = Field(min_length=50, max_length=15000)


KeywordSkillText = Annotated[str, Field(min_length=1, max_length=80)]


class KeywordExpansionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    role: str = Field(min_length=2, max_length=160)
    skills: list[KeywordSkillText] = Field(default_factory=list, max_length=30)
    context: str = Field(default="", max_length=2000)


class KeywordExpansionResult(BaseModel):
    alternative_roles: list[str] = Field(default_factory=list, max_length=20)
    required_skill_terms: list[str] = Field(default_factory=list, max_length=30)
    related_skill_terms: list[str] = Field(default_factory=list, max_length=30)
    search_phrases: list[str] = Field(default_factory=list, max_length=20)
    caveats: list[str] = Field(default_factory=list, max_length=10)
