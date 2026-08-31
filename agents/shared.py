from agno.db.sqlite import SqliteDb
from agno.knowledge import Knowledge
from agno.knowledge.reader.pdf_reader import PDFReader
from agno.vectordb.lancedb import LanceDb, SearchType
from agno.knowledge.embedder.google import GeminiEmbedder
from agno.models.groq import Groq
from agno.models.google import Gemini
from contextvars import ContextVar

db = SqliteDb(db_file="tmp/research_assistant.db")

model = Gemini(id="gemini-3.6-flash")
#model = Groq(id="openai/gpt-oss-120b")

knowledge = Knowledge(
    vector_db=LanceDb(
        table_name="research_knowledge",
        uri="tmp/lancedb",
        search_type=SearchType.vector,
        embedder=GeminiEmbedder(),
    ),
    readers=PDFReader(chunk=True),
)

PROMPT_INJECTION_PATTERNS = [
    "ignore previous instructions",
    "ignore your instructions",
    "you are now a",
    "forget everything above",
    "override safety",
    "disregard guidelines",
    "system prompt",
    "jailbreak",
    "act as if",
    "pretend you are",
    "roleplay as",
    "simulate being",
    "bypass restrictions",
    "ignore safeguards",
    "admin override",
    "root access",
    "forget everything",
    "ignora le istruzioni",
    "dimentica che sei",
    "sei ora un assistente generico",
]

current_user_id: ContextVar[str | None] = ContextVar("current_user_id", default=None)
