/**
 * SQLiteRepository - better-sqlite3 implementation of Repository
 *
 * Lightweight, synchronous SQLite storage for images, sessions, and messages.
 *
 * Part of Docker-style layered architecture:
 * Definition → build → Image → run → Agent
 *                        ↓
 *                    Session (external wrapper)
 *
 * @example
 * ```typescript
 * import { SQLiteRepository } from "@deepractice-ai/agentx-node";
 *
 * const repository = new SQLiteRepository("./data/agentx.db");
 * ```
 */

import Database from "better-sqlite3";
import type {
  Repository,
  ImageRecord,
  SessionRecord,
  MessageRecord,
  MessageRole,
} from "@deepractice-ai/agentx-types";

export class SQLiteRepository implements Repository {
  private db: Database.Database;

  constructor(dbPath: string = ":memory:") {
    this.db = new Database(dbPath);
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS images (
        imageId TEXT PRIMARY KEY,
        definition TEXT NOT NULL,
        config TEXT NOT NULL,
        messages TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        sessionId TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        imageId TEXT NOT NULL,
        title TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (imageId) REFERENCES images(imageId) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_imageId ON sessions(imageId);
      CREATE INDEX IF NOT EXISTS idx_sessions_userId ON sessions(userId);

      CREATE TABLE IF NOT EXISTS messages (
        messageId TEXT PRIMARY KEY,
        sessionId TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (sessionId) REFERENCES sessions(sessionId) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_messages_sessionId ON messages(sessionId);
    `);

    // Enable foreign keys
    this.db.pragma("foreign_keys = ON");
  }

  // ==================== Image ====================

  async saveImage(record: ImageRecord): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO images (imageId, definition, config, messages, createdAt)
      VALUES (@imageId, @definition, @config, @messages, @createdAt)
      ON CONFLICT(imageId) DO UPDATE SET
        definition = @definition,
        config = @config,
        messages = @messages
    `);

    stmt.run({
      imageId: record.imageId,
      definition: JSON.stringify(record.definition),
      config: JSON.stringify(record.config),
      messages: JSON.stringify(record.messages),
      createdAt: record.createdAt.toISOString(),
    });
  }

  async findImageById(imageId: string): Promise<ImageRecord | null> {
    const stmt = this.db.prepare("SELECT * FROM images WHERE imageId = ?");
    const row = stmt.get(imageId) as ImageRow | undefined;

    if (!row) return null;

    return this.toImageRecord(row);
  }

  async findAllImages(): Promise<ImageRecord[]> {
    const stmt = this.db.prepare("SELECT * FROM images ORDER BY createdAt DESC");
    const rows = stmt.all() as ImageRow[];

    return rows.map((row) => this.toImageRecord(row));
  }

  async deleteImage(imageId: string): Promise<void> {
    const stmt = this.db.prepare("DELETE FROM images WHERE imageId = ?");
    stmt.run(imageId);
  }

  async imageExists(imageId: string): Promise<boolean> {
    const stmt = this.db.prepare("SELECT 1 FROM images WHERE imageId = ?");
    return stmt.get(imageId) !== undefined;
  }

  // ==================== Session ====================

  async saveSession(record: SessionRecord): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO sessions (sessionId, userId, imageId, title, createdAt, updatedAt)
      VALUES (@sessionId, @userId, @imageId, @title, @createdAt, @updatedAt)
      ON CONFLICT(sessionId) DO UPDATE SET
        title = @title,
        updatedAt = @updatedAt
    `);

    stmt.run({
      sessionId: record.sessionId,
      userId: record.userId,
      imageId: record.imageId,
      title: record.title,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    });
  }

  async findSessionById(sessionId: string): Promise<SessionRecord | null> {
    const stmt = this.db.prepare("SELECT * FROM sessions WHERE sessionId = ?");
    const row = stmt.get(sessionId) as SessionRow | undefined;

    if (!row) return null;

    return this.toSessionRecord(row);
  }

  async findSessionsByImageId(imageId: string): Promise<SessionRecord[]> {
    const stmt = this.db.prepare(
      "SELECT * FROM sessions WHERE imageId = ? ORDER BY createdAt DESC"
    );
    const rows = stmt.all(imageId) as SessionRow[];

    return rows.map((row) => this.toSessionRecord(row));
  }

  async findSessionsByUserId(userId: string): Promise<SessionRecord[]> {
    const stmt = this.db.prepare("SELECT * FROM sessions WHERE userId = ? ORDER BY updatedAt DESC");
    const rows = stmt.all(userId) as SessionRow[];

    return rows.map((row) => this.toSessionRecord(row));
  }

  async findAllSessions(): Promise<SessionRecord[]> {
    const stmt = this.db.prepare("SELECT * FROM sessions ORDER BY updatedAt DESC");
    const rows = stmt.all() as SessionRow[];

    return rows.map((row) => this.toSessionRecord(row));
  }

  async deleteSession(sessionId: string): Promise<void> {
    const stmt = this.db.prepare("DELETE FROM sessions WHERE sessionId = ?");
    stmt.run(sessionId);
  }

  async deleteSessionsByImageId(imageId: string): Promise<void> {
    const stmt = this.db.prepare("DELETE FROM sessions WHERE imageId = ?");
    stmt.run(imageId);
  }

  async sessionExists(sessionId: string): Promise<boolean> {
    const stmt = this.db.prepare("SELECT 1 FROM sessions WHERE sessionId = ?");
    return stmt.get(sessionId) !== undefined;
  }

  // ==================== Message (deprecated) ====================

  async saveMessage(record: MessageRecord): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO messages (messageId, sessionId, role, content, createdAt)
      VALUES (@messageId, @sessionId, @role, @content, @createdAt)
      ON CONFLICT(messageId) DO UPDATE SET
        role = @role,
        content = @content
    `);

    stmt.run({
      messageId: record.messageId,
      sessionId: record.sessionId,
      role: record.role,
      content: JSON.stringify(record.content),
      createdAt: record.createdAt.toISOString(),
    });
  }

  async findMessageById(messageId: string): Promise<MessageRecord | null> {
    const stmt = this.db.prepare("SELECT * FROM messages WHERE messageId = ?");
    const row = stmt.get(messageId) as MessageRow | undefined;

    if (!row) return null;

    return this.toMessageRecord(row);
  }

  async findMessagesBySessionId(sessionId: string): Promise<MessageRecord[]> {
    const stmt = this.db.prepare(
      "SELECT * FROM messages WHERE sessionId = ? ORDER BY createdAt ASC"
    );
    const rows = stmt.all(sessionId) as MessageRow[];

    return rows.map((row) => this.toMessageRecord(row));
  }

  async deleteMessage(messageId: string): Promise<void> {
    const stmt = this.db.prepare("DELETE FROM messages WHERE messageId = ?");
    stmt.run(messageId);
  }

  async deleteMessagesBySessionId(sessionId: string): Promise<void> {
    const stmt = this.db.prepare("DELETE FROM messages WHERE sessionId = ?");
    stmt.run(sessionId);
  }

  async countMessagesBySessionId(sessionId: string): Promise<number> {
    const stmt = this.db.prepare("SELECT COUNT(*) as count FROM messages WHERE sessionId = ?");
    const row = stmt.get(sessionId) as { count: number };
    return row.count;
  }

  // ==================== Helpers ====================

  private toImageRecord(row: ImageRow): ImageRecord {
    return {
      imageId: row.imageId,
      definition: JSON.parse(row.definition),
      config: JSON.parse(row.config),
      messages: JSON.parse(row.messages),
      createdAt: new Date(row.createdAt),
    };
  }

  private toSessionRecord(row: SessionRow): SessionRecord {
    return {
      sessionId: row.sessionId,
      userId: row.userId,
      imageId: row.imageId,
      title: row.title,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  private toMessageRecord(row: MessageRow): MessageRecord {
    return {
      messageId: row.messageId,
      sessionId: row.sessionId,
      role: row.role as MessageRole,
      content: JSON.parse(row.content),
      createdAt: new Date(row.createdAt),
    };
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
  }
}

// Row types for SQLite results
interface ImageRow {
  imageId: string;
  definition: string;
  config: string;
  messages: string;
  createdAt: string;
}

interface SessionRow {
  sessionId: string;
  userId: string;
  imageId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MessageRow {
  messageId: string;
  sessionId: string;
  role: string;
  content: string;
  createdAt: string;
}
