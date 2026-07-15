from collections.abc import Generator
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
import sqlite3

from .config import settings

SCHEMA = """
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'STUDENT' CHECK(role IN ('STUDENT', 'ADMIN')),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    filename TEXT NOT NULL,
    stored_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'PROCESSING',
    chunk_count INTEGER NOT NULL DEFAULT 0,
    source_url TEXT,
    category TEXT,
    original_path TEXT,
    error TEXT,
    uploaded_by INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(uploaded_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS chunks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    vector TEXT,
    FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS index_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('USER', 'ASSISTANT')),
    content TEXT NOT NULL,
    sources TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chunks_document ON chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_index_metadata_key ON index_metadata(key);
"""


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def connect(path: Path | None = None) -> sqlite3.Connection:
    db_path = path or settings.database_path
    db_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(db_path, check_same_thread=False)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA journal_mode = WAL")
    connection.execute("PRAGMA busy_timeout = 10000")
    return connection


def _table_columns(connection: sqlite3.Connection, table: str) -> set[str]:
    return {
        c["name"] for c in connection.execute(f"PRAGMA table_info({table})").fetchall()
    }


def migrate_database(path: Path | None = None) -> None:
    """处理 schema 升级。"""
    with connect(path) as connection:
        # 1. 旧 chunks.vector 从 NOT NULL 改为 nullable
        columns = _table_columns(connection, "chunks")
        if "vector" in columns:
            vector_col = next(
                (
                    c
                    for c in connection.execute("PRAGMA table_info(chunks)").fetchall()
                    if c["name"] == "vector"
                ),
                None,
            )
            if vector_col and vector_col["notnull"]:
                connection.executescript("""
                    CREATE TABLE chunks_new (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        document_id INTEGER NOT NULL,
                        chunk_index INTEGER NOT NULL,
                        content TEXT NOT NULL,
                        vector TEXT,
                        FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
                    );
                    INSERT INTO chunks_new(id, document_id, chunk_index, content, vector)
                        SELECT id, document_id, chunk_index, content, vector FROM chunks;
                    DROP TABLE chunks;
                    ALTER TABLE chunks_new RENAME TO chunks;
                    CREATE INDEX IF NOT EXISTS idx_chunks_document ON chunks(document_id);
                    """)
        # 2. documents 表新增 source_url / category / original_path
        doc_columns = _table_columns(connection, "documents")
        for col, col_def in (
            ("source_url", "TEXT"),
            ("category", "TEXT"),
            ("original_path", "TEXT"),
        ):
            if col not in doc_columns:
                connection.execute(f"ALTER TABLE documents ADD COLUMN {col} {col_def}")


def init_database(path: Path | None = None) -> None:
    with connect(path) as connection:
        connection.executescript(SCHEMA)
    migrate_database(path)


def get_db() -> Generator[sqlite3.Connection, None, None]:
    connection = connect()
    try:
        yield connection
    finally:
        connection.close()


@contextmanager
def transaction(path: Path | None = None) -> Generator[sqlite3.Connection, None, None]:
    connection = connect(path)
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()
