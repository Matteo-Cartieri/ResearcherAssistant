from agno.agent import Agent
from agents.shared import db, model, PROMPT_INJECTION_PATTERNS
from tools.analysis_tools import search_user_knowledge, upsert_user_workplan, get_user_workplan, get_full_text_from_paper, search_user_paper_ids 
from agno.guardrails import PromptInjectionGuardrail

analysis_agent = Agent(
    name="Analysis Assistant",
    model=model,
    db=db,
    tools=[search_user_knowledge, upsert_user_workplan, get_user_workplan, search_user_paper_ids, get_full_text_from_paper],
    enable_user_memories=True,
    #add_history_to_context=True,
    instructions=[
        "Always respond in Italian.",
        "For generic questions, use search_user_knowledge to retrieve information from the user's knowledge base.",
        "Never assume or invent paper content. Only provide information that is present in the user's indexed papers.",
        # summarization instructions
        "If user asks to summarize a specific paper,",
        "first use search_user_paper_ids to identify the paper, then use get_full_text_from_paper.",
        "When summarizing a paper, identify the research problem, methodology, main results, contributions,",
        "limitations, and conclusion when this information is available.",
        # comparison instructions
        "When the user explicitly asks to compare two or more papers, identify each paper using ",
        "search_user_paper_ids and retrieve the complete text of each one using get_full_text_from_paper before comparing them.",
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