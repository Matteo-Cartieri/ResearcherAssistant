import { NextResponse } from "next/server";
import { auth } from "../../../../auth"; 
import { db } from "../../../lib/db";

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  db.prepare("DELETE FROM users WHERE id = ?").run(session.user.id);

  return NextResponse.json({ success: true });
}