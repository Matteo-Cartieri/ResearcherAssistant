import { NextRequest, NextResponse } from "next/server";
import { getLatestWorkplan, upsertWorkplan } from "../../lib/workplans";
import { auth } from "../../../auth";

export async function POST(request: NextRequest) {
    const isInternalRequest = request.headers.get("x-internal-api-token") === process.env.INTERNAL_API_TOKEN;
    let userId: string | undefined;

    if (isInternalRequest) {
        const body = await request.json();
        userId = body.userId;
        if (!userId) {
            return NextResponse.json({ error: "Missing userId" }, { status: 400 });
        }

        const workplan = upsertWorkplan(userId, {
            title: body.title,
            description: body.description,
            researchDomain: body.researchDomain,
            startDate: body.startDate,
            endDate: body.endDate,
            status: body.status,
        });
        return NextResponse.json(workplan);
    }

    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    // insert or update the workplan for the authenticated user
    const workplan = upsertWorkplan(session.user.id, {
        title: body.title,
        description: body.description,
        researchDomain: body.researchDomain,
        startDate: body.startDate,
        endDate: body.endDate,
        status: body.status,
    });

    return NextResponse.json(workplan);
}

export async function GET(request: NextRequest) {
    const isInternalRequest = request.headers.get("x-internal-api-token") === process.env.INTERNAL_API_TOKEN;

    if (isInternalRequest) {
        const userId = request.nextUrl.searchParams.get("userId");
        if (!userId) {
            return NextResponse.json({ error: "Missing userId" }, { status: 400 });
        }

        const workplan = getLatestWorkplan(userId);
        if (!workplan) {
            return NextResponse.json({ error: "No workplan found" }, { status: 404 });
        }

        return NextResponse.json(workplan);
    }

    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // retrieve the latest workplan for the authenticated user
    const workplan = getLatestWorkplan(session.user.id);
    if (!workplan) {
        return NextResponse.json({ error: "No workplan found" }, { status: 404 });
    }

    return NextResponse.json(workplan);
}