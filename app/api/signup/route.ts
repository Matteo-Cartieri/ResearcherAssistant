import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { db } from "../../lib/db";

export async function POST(req: NextRequest) {
  const { email, password, name } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const id = randomUUID();
  // insert the new user into the database with the hashed password
  db.prepare("INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)")
    .run(id, email, password_hash, name ?? null);

  return NextResponse.json({ id, email, name });
}