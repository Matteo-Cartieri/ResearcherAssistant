import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../auth";

const AGENT_OS_URL = "http://localhost:8000";

type AgentOSSession = {
    session_id: string;
    session_name?: string | null;
    agent_id?: string | null;
    user_id?: string | null;
    created_at?: number | string | null;
    updated_at?: number | string | null;
};

function normalizeSession(session: AgentOSSession) {
    return {
        session_id: session.session_id,
        session_name: session.session_name ?? null,
        agent_id: session.agent_id ?? null,
        user_id: session.user_id ?? null,
        created_at: session.created_at ?? null,
        updated_at: session.updated_at ?? null,
    };
}

export async function GET(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const userId = (session.user as { id?: string }).id ?? session.user.email;

        if (!userId) {
            return NextResponse.json(
                { error: "User ID not available" },
                { status: 401 }
            );
        }

        const agentId = req.nextUrl.searchParams.get("agent_id") ?? "search_agent";
        const url = new URL(`${AGENT_OS_URL}/sessions`);

        url.searchParams.set("user_id", userId);
        url.searchParams.set("session_type", "agent");
        url.searchParams.set("agent_id", agentId);
        url.searchParams.set("limit", "50");

        const response = await fetch(url.toString(), {
            method: "GET",
            cache: "no-store",
        });

        if (!response.ok) {
            const body = await response.text();
            console.error("AgentOS GET /sessions failed:",response.status,body);
            return NextResponse.json(
                {
                    error: "Unable to retrieve sessions from AgentOS",
                    details: body,
                },
                { status: response.status }
            );
        }
        const data = await response.json();
        const rawSessions: AgentOSSession[] = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        const sessions = rawSessions.map(normalizeSession);

        return NextResponse.json({
            sessions
        });
    } catch (error) {
        console.error("GET /api/sessions error:", error);
        return NextResponse.json({error: "Internal server error",},{ status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }
        const userId = (session.user as { id?: string }).id ?? session.user.email;

        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }
        const body = await req.json();
        const agentId = typeof body?.agent_id === "string" ? body.agent_id : "search_agent";
        const sessionName = typeof body?.session_name === "string" && body.session_name.trim().length > 0 ? body.session_name.trim() : "Nuova ricerca";

        // create a new session in the AgentOS for the current user and agent
        const response = await fetch(`${AGENT_OS_URL}/sessions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                session_type: "agent",
                agent_id: agentId,
                user_id: userId,
                session_name: sessionName,
            }),
        });

        if (!response.ok) {
            const responseBody = await response.text();
            console.error("AgentOS POST /sessions failed:",response.status,responseBody);

            return NextResponse.json(
                {
                    error: "Unable to create session in AgentOS",
                    details: responseBody,
                },
                { status: response.status }
            );
        }
        const data = await response.json();

        return NextResponse.json({session: normalizeSession(data)}, {status: 201});
    } catch (error) {
        console.error("POST /api/sessions error:", error);
        return NextResponse.json({error: "Internal server error"}, {status: 500});
    }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" },{ status: 401 });
    }

    const sessionId = req.nextUrl.searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session_id" },{ status: 400 });
    }

    console.log("Deleting AgentOS session:", sessionId);

    const deleteUrl = new URL(`${AGENT_OS_URL}/sessions/${encodeURIComponent(sessionId)}`);

    const response = await fetch(
      deleteUrl.toString(),
      {
        method: "DELETE",
        cache: "no-store",
      }
    );

    const body = await response.text();
    console.log("AgentOS DELETE response:",response.status,body);

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Unable to delete session",
          details: body,
        },
        {
          status: response.status,
        }
      );
    }

    return NextResponse.json({
      success: true,
      session_id: sessionId,
    });
  } catch (error) {
    console.error("DELETE /api/sessions error:", error);
    return NextResponse.json({error: "Internal server error"},{ status: 500 });
  }
}