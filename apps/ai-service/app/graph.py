import re
from functools import lru_cache
from typing import TypedDict
from langgraph.graph import StateGraph, END
from .ollama import generate_intent
from .schemas import SearchIntent
from .intent_rules import normalize_search_intent

class ParseState(TypedDict, total=False):
    request_text: str
    normalized_text: str
    intent: dict
    validation_error: str | None

async def normalize_request(state: ParseState) -> ParseState:
    normalized = re.sub(r"\s+", " ", state["request_text"]).strip()
    if len(normalized) < 5:
        raise ValueError("Search request is too short.")
    return {**state, "normalized_text": normalized}

async def extract_intent(state: ParseState) -> ParseState:
    extracted = await generate_intent(state["normalized_text"])
    return {**state, "intent": extracted.model_dump()}

async def validate_intent(state: ParseState) -> ParseState:
    draft = SearchIntent.model_validate(state["intent"])
    validated = normalize_search_intent(state["normalized_text"], draft)
    # The TypeScript/Zod contract models optional values as absent, not JSON null.
    return {**state, "intent": validated.model_dump(exclude_none=True), "validation_error": None}

@lru_cache(maxsize=1)
def build_graph():
    graph = StateGraph(ParseState)
    graph.add_node("normalize", normalize_request)
    graph.add_node("extract", extract_intent)
    graph.add_node("validate", validate_intent)
    graph.set_entry_point("normalize")
    graph.add_edge("normalize", "extract")
    graph.add_edge("extract", "validate")
    graph.add_edge("validate", END)
    return graph.compile()

intent_graph = build_graph()
