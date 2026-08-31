from agno.agent import Agent
from agents.shared import db, model, PROMPT_INJECTION_PATTERNS
from tools.simulation_tools import (
    run_code,
    get_runnable_functions,
    get_full_text_from_paper,
    search_user_paper_ids,
)
from agno.guardrails import PromptInjectionGuardrail

simulation_agent = Agent(
    name="Simulation Assistant",
    model=model,
    db=db,
    tools=[
        search_user_paper_ids, get_full_text_from_paper,get_runnable_functions, run_code
    ],     
    enable_user_memories=True, 
    instructions=[
        "Always respond in Italian.",
        "Only take action (extract, test, run, simulate code) when explicitly requested.",
        "Workflow to extract/run code from a paper: "
        "1) search_user_paper_ids to find the paper_id from the title given by the user; "
        "2) get_full_text_from_paper with that paper_id; "
        "3) get_runnable_functions on the retrieved text. "
        "If the user only asks to see the code, stop here and show it.",
        "If the user asks to run the code: use real data/parameters from the paper if available; "
        "otherwise invent plausible data consistent with the function's expected types/shapes, explicitly "
        "stating in your response that the data is invented and which values you used. Then call run_code.",
        "If you already have the code snippet and the user asks to run it, use run_code directly "
        "(skip steps 1-3), using data provided by the user if available.",
        # prevent the agent from stopping after stating intent to run a tool, without actually running it
        "Complete the entire necessary tool chain within the same turn before responding: don't stop "
        "at a statement of intent without having already executed the tools and obtained their results.",
        "If a tool fails or returns no result, explicitly report this to the user.",
    ],
    pre_hooks=[
        PromptInjectionGuardrail(injection_patterns=PROMPT_INJECTION_PATTERNS),
    ],
    markdown=True,  
    debug_mode=True,
)