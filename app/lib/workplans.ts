import { randomUUID } from "crypto";
import { db } from "./db";

export interface WorkplanInput {
  title: string;
  description: string;
  researchDomain: string;
  startDate: string;
  endDate: string;
  status: string;
}

// create a new workplan for the user or update the existing one
export function upsertWorkplan(
  userId: string,
  input: WorkplanInput
) {
  const existing = db
    .prepare(`
      SELECT id
      FROM workplans
      WHERE user_id = ?
    `)
    .get(userId) as { id: string } | undefined;

  if (existing) {
    db.prepare(`
      UPDATE workplans
      SET
        description = ?,
        research_domain = ?,
        start_date = ?,
        end_date = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      input.description,
      input.researchDomain,
      input.startDate,
      input.endDate,
      input.status,
      existing.id
    );

    return {
      id: existing.id,
      created: false,
    };
  }

  const id = randomUUID();

  db.prepare(`
    INSERT INTO workplans (
      id,
      user_id,
      title,
      description,
      research_domain,
      start_date,
      end_date,
      status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    userId,
    input.title,
    input.description,
    input.researchDomain,
    input.startDate,
    input.endDate,
    input.status
  );

  return { id, created: true };
}

// get the latest workplan for the user
export function getLatestWorkplan(userId: string) {
  return db
    .prepare(`
      SELECT
        id,
        title,
        description,
        research_domain,
        start_date,
        end_date,
        status,
        created_at,
        updated_at
      FROM workplans
      WHERE user_id = ?
      ORDER BY updated_at DESC
      LIMIT 1
    `)
    .get(userId);
}