import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbDir = path.resolve(__dirname, "../../tmp");
const dbPath = path.join(dbDir, "research_assistant.db");

fs.mkdirSync(dbDir, { recursive: true });

export const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

// create tables to manage users, papers, and workplans
// papers keep info about the papers retrieved by the search_agent and wheter they have been selected and indexed 
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS papers (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,

    arxiv_id TEXT NOT NULL,
    title TEXT NOT NULL,
    pdf_url TEXT NOT NULL,
    published_at TEXT,

    selected INTEGER NOT NULL DEFAULT 0,
    indexed INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
      REFERENCES users(id)
      ON DELETE CASCADE,

    UNIQUE(user_id, arxiv_id)
  );

  CREATE TABLE IF NOT EXISTS workplans (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,

    title TEXT NOT NULL,
    description TEXT,
    research_domain TEXT,

    start_date TEXT,
    end_date TEXT,

    status TEXT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
      REFERENCES users(id)
      ON DELETE CASCADE,

    UNIQUE(user_id, title)
  );

  CREATE TABLE IF NOT EXISTS researcher_profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,

    research_field TEXT,
    interests TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
      REFERENCES users(id)
      ON DELETE CASCADE,

    UNIQUE(user_id)
  );
`);