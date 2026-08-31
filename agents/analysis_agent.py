from agno.agent import Agent
from agents.shared import db, model, PROMPT_INJECTION_PATTERNS
from tools.analysis_tools import upsert_user_workplan, get_user_workplan, search_user_papers
from agno.guardrails import PromptInjectionGuardrail

analysis_agent = Agent(
    name="Analysis Assistant",
    model=model,
    db=db,
    tools=[search_user_papers, upsert_user_workplan, get_user_workplan],
    enable_user_memories=True,
    #add_history_to_context=True,
    instructions=[
        "Always respond in Italian.",
        "If you need the content of a paper indexed by the user, use search_user_papers to retrieve it. "
        "Never assume or invent paper content. If the paper is unavailable, do NOT perform any analysis.",
        # summarization instructions
        "When the user explicitly asks to summarize, explain, or tell them about a specific paper,"
        " retrieve the relevant paper content and perform the summarization yourself.",
        "When summarizing a paper, identify the research problem, methodology, main results, contributions,"
        " limitations, and conclusion when this information is available.",
        # comparison instructions
        "When the user explicitly asks to compare two or more papers, retrieve the relevant content"
        " for every paper and perform the comparison yourself.",
        "If information required for a summary or comparison is unavailable, explicitly state it.",
        # workplan instructions
        "When the user mentions to create or update their workplan, use upsert_user_workplan to save it in the database.",
        "When the user mentions to view their workplan, use get_user_workplan to retrieve it from the database.",
        "If the user asks what the workplan is composed of, explain that it includes the title, description, research domain, start date, end date, and status.",
    ],
    pre_hooks=[
        PromptInjectionGuardrail(injection_patterns=PROMPT_INJECTION_PATTERNS),
    ],
    markdown=True,
    debug_mode=True,
)