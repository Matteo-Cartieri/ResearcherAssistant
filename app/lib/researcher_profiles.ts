import { randomUUID } from "crypto";
import { db } from "./db";

export interface ResearcherProfileInput {
  researchField: string;
  interests: string;
}

export interface ResearcherProfile {
  id: string;
  userId: string;
  researchField: string;
  interests: string;
  createdAt: string;
  updatedAt: string;
}

// create a new researcher profile for the user or update the existing one
export function upsertResearcherProfile(
  userId: string,
  input: ResearcherProfileInput
) {
  const existing = db
    .prepare(`
      SELECT id
      FROM researcher_profiles
      WHERE user_id = ?
    `)
    .get(userId) as { id: string } | undefined;

  if (existing) {
    db.prepare(`
      UPDATE researcher_profiles
      SET
        research_field = ?,
        interests = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      input.researchField,
      input.interests,
      existing.id
    );

    return {
      id: existing.id,
      created: false,
    };
  }

  const id = randomUUID();

  db.prepare(`
    INSERT INTO researcher_profiles (
      id,
      user_id,
      research_field,
      interests
    )
    VALUES (?, ?, ?, ?)
  `).run(
    id,
    userId,
    input.researchField,
    input.interests
  );

  return { id, created: true };
}

// get the researcher profile for a user, or undefined if none exists
export function getResearcherProfile(
  userId: string
): ResearcherProfile | undefined {
  const row = db
    .prepare(`
      SELECT
        id,
        user_id,
        research_field,
        interests,
        created_at,
        updated_at
      FROM researcher_profiles
      WHERE user_id = ?
    `)
    .get(userId) as
    | {
        id: string;
        user_id: string;
        research_field: string;
        interests: string;
        created_at: string;
        updated_at: string;
      }
    | undefined;

  if (!row) {
    return undefined;
  }

  return {
    id: row.id,
    userId: row.user_id,
    researchField: row.research_field,
    interests: row.interests,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}