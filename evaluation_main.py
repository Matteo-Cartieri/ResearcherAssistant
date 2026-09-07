from dotenv import load_dotenv

load_dotenv()

from evaluation.test_cases import search_agent_cases, analysis_agent_cases, simulation_agent_cases
from evaluation.evaluation import run_test_cases
from agents.search_agent import search_agent
from agents.analysis_agent import analysis_agent
from agents.simulation_agent import simulation_agent
from agents.shared import current_user_id
from knowledge_service import index_paper_for_user
from agno.models.groq import Groq

AGENT_MODEL_NAME = "gemini-3.6-flash" # matches the model used in agents/shared.py
JUDGE_MODEL = Groq(id="openai/gpt-oss-120b") 
OUTPUT_FILE = f"evaluation/results/{AGENT_MODEL_NAME}_results.jsonl"
USER_ID = "805fc0fb-85a9-4b31-a089-d103da2417a3" # replace with user id
current_user_id.set(USER_ID)

# run_test_cases(
#     search_agent,
#     search_agent_cases,
#     user_id=USER_ID,
#     judge_model=JUDGE_MODEL,
#     scoring_threshold=6,
#     output_file=OUTPUT_FILE,
# )

# manually index the papers for the analysis and simulation agents before running their test cases
# index_paper_for_user(
#     user_id=USER_ID,
#     paper_id="dpo_2305_18290",
#     pdf_url="https://arxiv.org/pdf/2305.18290.pdf",
# )
# index_paper_for_user(
#     user_id=USER_ID,
#     paper_id="dpo_1901_08593",
#     pdf_url="https://arxiv.org/pdf/1909.08593",
# )

# index_paper_for_user(
#     user_id=USER_ID,
#     paper_id="2002_05709",
#     pdf_url="https://arxiv.org/pdf/2002.05709",
# )

# run_test_cases(
#     analysis_agent,
#     analysis_agent_cases,
#     user_id=USER_ID,
#     judge_model=JUDGE_MODEL,
#     scoring_threshold=6,
#     output_file=OUTPUT_FILE,
# )

run_test_cases(
    simulation_agent,
    simulation_agent_cases,
    user_id=USER_ID,
    judge_model=JUDGE_MODEL,
    scoring_threshold=6,
    output_file=OUTPUT_FILE,
)