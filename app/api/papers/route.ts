import { NextResponse } from "next/server";
import { auth } from "../../../auth";
import {
  getPapersByUser,
  upsertPaper,
  setPaperSelected,
  getPaperById,
  deletePaper,
  countUsersUsingPaper,
} from "../../../app/lib/papers";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const papers = getPapersByUser(session.user.id);

    return NextResponse.json(
      { papers },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/papers failed:", error);

    return NextResponse.json(
      { error: "Failed to load papers" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const {
      arxiv_id,
      title,
      pdf_url,
      published_at,
    } = body;

    const paper = upsertPaper({
      userId: session.user.id,
      arxivId: arxiv_id,
      title,
      pdfUrl: pdf_url,
      publishedAt: typeof published_at === "string"  ? published_at : null,
    });

    return NextResponse.json(
      { paper },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/papers failed:", error);

    return NextResponse.json(
      { error: "Failed to save paper" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
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
    const selected = body?.selected;

    if (typeof paperId !== "string" ||paperId.length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid paper_id" },
        { status: 400 }
      );
    }

    if (typeof selected !== "boolean") {
      return NextResponse.json(
        { error: "Missing or invalid selected value" },
        { status: 400 }
      );
    }

    const existingPaper = getPaperById(userId,paperId);

    if (!existingPaper) {
      return NextResponse.json(
        { error: "Paper not found" },
        { status: 404 }
      );
    }

    const paper = setPaperSelected(userId,paperId,selected);

    if (!paper) {
      return NextResponse.json(
        { error: "Unable to update paper" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      paper,
    });

  } catch (error) {
    console.error("PATCH /api/papers failed:",error);

    return NextResponse.json(
      {
        error: "Failed to update paper",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const paperId = searchParams.get("paper_id");

    if (!paperId) {
      return NextResponse.json({ error: "Missing paper_id" }, { status: 400 });
    }

    const existingPaper = getPaperById(userId, paperId);
    if (!existingPaper) {
      return NextResponse.json({ error: "Paper not found" }, { status: 404 });
    }

    const wasIndexed = existingPaper.selected;
    const arxivId = existingPaper.arxiv_id;

    const deleted = deletePaper(userId, paperId);
    if (!deleted) {
      return NextResponse.json({ error: "Paper not found" }, { status: 404 });
    }

    if (wasIndexed) {
      const stillNeededByOthers = countUsersUsingPaper(arxivId, userId) > 0;

      const deindexResponse = await fetch(
        `${process.env.PYTHON_AGENT_URL}/knowledge/deindex`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.INTERNAL_API_TOKEN}`,
          },
          body: JSON.stringify({
            user_id: userId,
            paper_id: paperId,
            delete_file: !stillNeededByOthers,
          }),
        }
      );

      if (!deindexResponse.ok) {
        const body = await deindexResponse.text();
        console.error(`Deindex failed for paper ${paperId} after row deletion: ${deindexResponse.status} ${body}`);
      }
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("DELETE /api/papers failed:", error);
    return NextResponse.json({ error: "Failed to delete paper" }, { status: 500 });
  }
}