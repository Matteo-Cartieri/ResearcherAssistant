import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { getPaperById,setPaperIndexed } from "../../../../app/lib/papers";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    const body = await request.json();
    const paperId = body?.paper_id;

    if (typeof paperId !== "string" || !paperId) {
      return NextResponse.json(
        { error: "Missing paper_id" },
        { status: 400 }
      );
    }

    const paper = getPaperById(userId,paperId);

    if (!paper) {
      return NextResponse.json(
        { error: "Paper not found" },
        { status: 404 }
      );
    }

    if (paper.indexed) {
      return NextResponse.json({
        success: true,
        alreadyIndexed: true,
        paper,
      });
    }

    const pythonAgentUrl = process.env.PYTHON_AGENT_URL;
    const internalToken = process.env.INTERNAL_API_TOKEN;

    if (!pythonAgentUrl || !internalToken) {
      console.error("PYTHON_AGENT_URL or INTERNAL_API_TOKEN is not configured");

      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const response = await fetch(
      `${pythonAgentUrl}/knowledge/index`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${internalToken}`,
        },

        body: JSON.stringify({
          user_id: userId,
          paper_id: paper.id,
          pdf_url: paper.pdf_url,
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Python indexing service failed:",response.status,errorBody);
      return NextResponse.json({ error: "Knowledge indexing failed"}, { status: 502 });
    }

    const indexingResult = await response.json();
    const updatedPaper = setPaperIndexed(userId, paperId, true);

    if (!updatedPaper) {
      console.error(`Paper ${paperId} indexed in LanceDB but failed to flag as indexed in SQLite`);
      return NextResponse.json({ error: "Indexed but failed to persist status" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      alreadyIndexed: false,
      paper: updatedPaper,
      indexing: indexingResult,
    });

  } catch (error) {
    console.error("POST /api/knowledge/index failed:",error);
    return NextResponse.json({error: "Failed to index paper"},{ status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const paperId = body?.paper_id;

    if (typeof paperId !== "string" || paperId.length === 0) {
      return NextResponse.json({ error: "Missing or invalid paper_id" }, { status: 400 });
    }

    const paper = getPaperById(userId, paperId);

    if (!paper) {
      return NextResponse.json({ error: "Paper not found" }, { status: 404 });
    }

    if (!paper.indexed) {
      return NextResponse.json({
        success: true,
        alreadyDeindexed: true,
        paper,
      });
    }

    const pythonAgentUrl = process.env.PYTHON_AGENT_URL;
    const internalToken = process.env.INTERNAL_API_TOKEN;

    if (!pythonAgentUrl || !internalToken) {
      console.error("PYTHON_AGENT_URL or INTERNAL_API_TOKEN is not configured");
      return NextResponse.json({ error: "Server configuration error" },{ status: 500 });
    }

    // call the Python agent to remove the paper from the knowledge base
    const res = await fetch(`${pythonAgentUrl}/knowledge/deindex`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${internalToken}`,
      },
      body: JSON.stringify({ user_id: userId, paper_id: paperId }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("Python deindexing service failed:", res.status, errBody);
      return NextResponse.json({ error: "Knowledge deindexing failed" },{ status: 502 });
    }

    // update the paper's indexed status in SQLite
    const updatedPaper = setPaperIndexed(userId, paperId, false);

    if (!updatedPaper) {
      console.error(`Paper ${paperId} deindexed in LanceDB but failed to flag as deindexed in SQLite`);
      return NextResponse.json({ error: "Deindexed but failed to persist status" },{ status: 500 });
    }

    return NextResponse.json({
      success: true,
      alreadyDeindexed: false,
      paper: updatedPaper,
    });
  } catch (error) {
    console.error("DELETE /api/knowledge/index failed:", error);
    return NextResponse.json({ error: "Failed to deindex paper" }, { status: 500 });
  }
}