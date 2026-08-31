import { NextRequest, NextResponse } from "next/server";
import { getResearcherProfile, upsertResearcherProfile } from "../../lib/researcher_profiles";
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

        const profile = upsertResearcherProfile(userId, {
            researchField: body.researchField,
            interests: body.interests,
        });
        return NextResponse.json(profile);
    }

    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    // insert or update the researcher profile for the authenticated user
    const profile = upsertResearcherProfile(session.user.id, {
        researchField: body.researchField,
        interests: body.interests,
    });

    return NextResponse.json(profile);
}

export async function GET(request: NextRequest) {
    const isInternalRequest = request.headers.get("x-internal-api-token") === process.env.INTERNAL_API_TOKEN;

    if (isInternalRequest) {
        const userId = request.nextUrl.searchParams.get("userId");
        if (!userId) {
            return NextResponse.json({ error: "Missing userId" }, { status: 400 });
        }

        const profile = getResearcherProfile(userId);
        if (!profile) {
            return NextResponse.json({ error: "No researcher profile found" }, { status: 404 });
        }

        return NextResponse.json(profile);
    }

    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // retrieve the researcher profile for the authenticated user
    const profile = getResearcherProfile(session.user.id);
    if (!profile) {
        return NextResponse.json({ error: "No researcher profile found" }, { status: 404 });
    }

    return NextResponse.json(profile);
}