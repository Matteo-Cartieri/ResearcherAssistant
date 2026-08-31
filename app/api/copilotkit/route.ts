import { NextRequest,NextResponse  } from "next/server";
import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { HttpAgent } from "@ag-ui/client";
import { auth } from "../../../auth";

function buildRuntime(userId: string) {
  const headers = { "X-User-Id": userId };
  return new CopilotRuntime({
    agents: {
      search_agent: new HttpAgent({ url: "http://localhost:8000/search/agui", headers }),
      analysis_agent: new HttpAgent({ url: "http://localhost:8000/analysis/agui", headers }),
      simulation_agent: new HttpAgent({ url: "http://localhost:8000/simulation/agui", headers }),
    },
  });
}

async function handle(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const runtime = buildRuntime(session.user.id);
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter: new ExperimentalEmptyAdapter(),
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
}

export async function GET(req: NextRequest) {
  return handle(req);
}
export async function POST(req: NextRequest) {
  return handle(req);
}