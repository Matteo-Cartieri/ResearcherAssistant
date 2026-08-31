import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../auth";

const AGENT_OS_URL = "http://localhost:8000";

export async function GET(req: NextRequest, { params }: { params: Promise<{ session_id: string }> }) {
    const { session_id } = await params;

    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as { id?: string }).id ?? session.user.email;
    const agentId = req.nextUrl.searchParams.get("agent_id") ?? "search_agent";

    const url = new URL(`${AGENT_OS_URL}/sessions/${session_id}`);
    url.searchParams.set("user_id", userId!);
    url.searchParams.set("agent_id", agentId);

    // retrieve the session data from the agent OS
    const response = await fetch(url.toString(), { method: "GET", cache: "no-store" });
    if (!response.ok) {
        const body = await response.text();
        return NextResponse.json({ error: "Unable to retrieve session", details: body }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
}