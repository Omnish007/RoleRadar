import logging
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[3] / ".env")

from fastapi import FastAPI, HTTPException
from .schemas import ParseRequest, JobDescriptionRequest, ResumeMatchRequest, InterviewRequest, TextSummaryRequest, CompanySummaryRequest, KeywordExpansionRequest
from .ollama import DEFAULT_MODEL, analyze_description, check_ollama, check_model_available, match_resume, generate_interview_questions, summarize_text, summarize_company, expand_keywords

logger = logging.getLogger("roleradar.ai")
app = FastAPI(title="RoleRadar AI Service", version="0.2.0")

@app.get("/health")
async def health():
    available = await check_ollama()
    model_available = await check_model_available() if available else False
    return {
        "status": "ok" if available and model_available else "degraded",
        "ollama": "available" if available else "unavailable",
        "model": DEFAULT_MODEL,
        "model_status": "available" if model_available else "missing" if available else "unknown",
        "service": "roleradar-ai",
    }

@app.post("/v1/search-intent")
async def parse_search_intent(request: ParseRequest):
    try:
        from .graph import build_graph
        graph = build_graph()
        result = await graph.ainvoke({"request_text": request.text})
        return result["intent"]
    except ImportError as exc:
        raise HTTPException(status_code=503, detail="Install the AI service requirements to enable LangGraph workflows.") from exc
    except Exception as exc:
        logger.exception("Search intent parsing failed")
        raise HTTPException(status_code=502, detail="Local model could not parse the search request.") from exc

@app.post("/v1/job-description/analyze")
async def analyze_job(request: JobDescriptionRequest):
    try:
        return await analyze_description(request.job_description)
    except Exception as exc:
        logger.exception("Job description analysis failed")
        raise HTTPException(status_code=502, detail="Local model could not analyze the job description.") from exc

@app.post("/v1/resume/match")
async def resume_match(request: ResumeMatchRequest):
    try:
        return await match_resume(request.resume_text, request.job_description)
    except Exception as exc:
        logger.exception("Resume matching failed")
        raise HTTPException(status_code=502, detail="Local model could not compare the resume and job description.") from exc

@app.post("/v1/interview/questions")
async def interview_questions(request: InterviewRequest):
    try:
        return await generate_interview_questions(request.job_description, request.seniority)
    except Exception as exc:
        logger.exception("Interview question generation failed")
        raise HTTPException(status_code=502, detail="Local model could not generate interview preparation.") from exc

@app.post("/v1/notes/summarize")
async def notes_summary(request: TextSummaryRequest):
    try:
        return await summarize_text(request.text)
    except Exception as exc:
        logger.exception("Notes summarization failed")
        raise HTTPException(status_code=502, detail="Local model could not summarize the notes.") from exc

@app.post("/v1/company/summarize")
async def company_summary(request: CompanySummaryRequest):
    try:
        return await summarize_company(request.company_name, request.source_material)
    except Exception as exc:
        logger.exception("Company summary failed")
        raise HTTPException(status_code=502, detail="Local model could not summarize the supplied company material.") from exc


@app.post("/v1/keywords/expand")
async def keyword_expansion(request: KeywordExpansionRequest):
    try:
        return await expand_keywords(request.role, request.skills, request.context)
    except Exception as exc:
        logger.exception("Keyword expansion failed")
        raise HTTPException(status_code=502, detail="Local model could not expand the search vocabulary.") from exc
