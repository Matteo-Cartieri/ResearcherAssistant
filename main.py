from dotenv import load_dotenv

load_dotenv()

from agno.os import AgentOS
from agno.os.interfaces.agui import AGUI
from starlette.middleware.base import BaseHTTPMiddleware
from agents.shared import db,current_user_id
from agents.search_agent import search_agent
from agents.analysis_agent import analysis_agent
from agents.simulation_agent import simulation_agent
from knowledge_api import router as knowledge_router

class UserContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        user_id = request.headers.get("X-User-Id")
        token = current_user_id.set(user_id)
        try:
            return await call_next(request)
        finally:
            current_user_id.reset(token)

agent_os = AgentOS(
    id="Researcher Assistant OS",
    db=db,
    agents=[search_agent, analysis_agent, simulation_agent],
    interfaces=[
        AGUI(agent=search_agent, prefix="/search"), # POST /search/agui           
        AGUI(agent=analysis_agent, prefix="/analysis"), # POST /analysis/agui
        AGUI(agent=simulation_agent, prefix="/simulation"), # POST /simulation/agui
    ],
)

app = agent_os.get_app()
app.add_middleware(UserContextMiddleware)
app.include_router(knowledge_router)
# start the server on port 8000
agent_os.serve(app="main:app", port=8000)