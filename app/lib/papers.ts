import { randomUUID } from "crypto";
import { db } from "./db";

export type DbPaper = {
  id: string;
  user_id: string;
  arxiv_id: string;
  title: string;
  pdf_url: string;
  published_at: string | null;
  selected: number;
  indexed: number;
  created_at: string;
  updated_at: string;
};

export type Paper = {
  id: string;
  user_id: string;
  arxiv_id: string;
  title: string;
  pdf_url: string;
  published_at: string | null;
  selected: boolean;
  indexed: boolean;
  created_at: string;
  updated_at: string;
};

function mapPaper(row: DbPaper): Paper {
  return {
    ...row,
    selected: Boolean(row.selected),
    indexed: Boolean(row.indexed),
  };
}

// retrieve all papers for a given user, ordered by descending update date
export function getPapersByUser(userId: string): Paper[] {
  const rows = db
    .prepare(`
      SELECT
        id,
        user_id,
        arxiv_id,
        title,
        pdf_url,
        published_at,
        selected,
        indexed,
        created_at,
        updated_at
      FROM papers
      WHERE user_id = ?
      ORDER BY updated_at DESC
    `)
    .all(userId) as DbPaper[];

  return rows.map(mapPaper);
}

// insert or update a paper for a given user
export function upsertPaper(params: {
  userId: string;
  arxivId: string;
  title: string;
  pdfUrl: string;
  publishedAt?: string | null;
}): Paper {
  const existing = db
    .prepare(`
      SELECT *
      FROM papers
      WHERE user_id = ?
        AND arxiv_id = ?
    `)
    .get(params.userId, params.arxivId) as DbPaper | undefined;

  if (existing) {
    db.prepare(`
      UPDATE papers
      SET
        title = ?,
        pdf_url = ?,
        published_at = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      params.title,
      params.pdfUrl,
      params.publishedAt ?? null,
      existing.id
    );

    const updated = db
      .prepare(`
        SELECT *
        FROM papers
        WHERE id = ?
      `)
      .get(existing.id) as DbPaper;

    return mapPaper(updated);
  }

  const id = randomUUID();

  db.prepare(`
    INSERT INTO papers (
      id,
      user_id,
      arxiv_id,
      title,
      pdf_url,
      published_at,
      selected,
      indexed
    )
    VALUES (?, ?, ?, ?, ?, ?, 0, 0)
  `).run(
    id,
    params.userId,
    params.arxivId,
    params.title,
    params.pdfUrl,
    params.publishedAt ?? null
  );

  const created = db
    .prepare(`
      SELECT *
      FROM papers
      WHERE id = ?
    `)
    .get(id) as DbPaper;

  return mapPaper(created);
}

// update the selected status of a paper for a given user
export function setPaperSelected(userId: string,paperId: string,selected: boolean): Paper | null {
  const result = db
    .prepare(`
      UPDATE papers
      SET
        selected = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND user_id = ?
    `)
    .run(selected ? 1 : 0, paperId, userId);

  if (result.changes === 0) {
    return null;
  }

  const paper = db
    .prepare(`
      SELECT *
      FROM papers
      WHERE id = ?
        AND user_id = ?
    `)
    .get(paperId, userId) as DbPaper;

  return mapPaper(paper);
}

// set the indexed and selected status of a paper for a given user
export function setPaperIndexed(userId: string, paperId: string, indexed: boolean): Paper | null {
  const result = db
    .prepare(`
      UPDATE papers
      SET
        indexed = ?,
        selected = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND user_id = ?
    `)
    .run(indexed ? 1 : 0, indexed ? 1 : 0, paperId, userId);

  if (result.changes === 0) {
    return null;
  }

  const paper = db
    .prepare(`
      SELECT *
      FROM papers
      WHERE id = ?
        AND user_id = ?
    `)
    .get(paperId, userId) as DbPaper;

  return mapPaper(paper);
}

// delete a paper for a given user
export function deletePaper(userId: string, paperId: string): boolean {
  const result = db
    .prepare(`
      DELETE FROM papers
      WHERE id = ?
        AND user_id = ?
    `)
    .run(paperId, userId);

  return result.changes > 0;
}

// count how many users have selected a given paper, excluding the current user
export function countUsersUsingPaper(
  arxivId: string,
  excludingUserId: string
): number {
  const row = db
    .prepare(
      `SELECT COUNT(*) as count
       FROM papers
       WHERE arxiv_id = ? AND user_id != ?`
    )
    .get(arxivId, excludingUserId) as { count: number };

  return row.count;
}

// retrieve a paper by its id for a given user
export function getPaperById(userId: string,paperId: string) {
  const paper = db
    .prepare(`
      SELECT
        id,
        user_id,
        arxiv_id,
        title,
        pdf_url,
        published_at,
        selected,
        indexed,
        created_at,
        updated_at
      FROM papers
      WHERE id = ?
        AND user_id = ?
    `).get(paperId,userId) as DbPaper | undefined;

  if (!paper) {
    return null;
  }

  return mapPaper(paper);
}