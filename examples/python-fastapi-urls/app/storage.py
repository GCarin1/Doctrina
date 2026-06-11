import secrets
import sqlite3
from pathlib import Path


class Storage:
    """Tiny SQLite-backed key-value store for short codes."""

    def __init__(self, path: str | Path) -> None:
        self._conn = sqlite3.connect(path)
        self._conn.execute(
            "CREATE TABLE IF NOT EXISTS urls (code TEXT PRIMARY KEY, url TEXT NOT NULL)"
        )
        self._conn.commit()

    def put(self, url: str) -> str:
        code = secrets.token_urlsafe(6)
        self._conn.execute(
            "INSERT INTO urls (code, url) VALUES (?, ?)", (code, url)
        )
        self._conn.commit()
        return code

    def get(self, code: str) -> str | None:
        row = self._conn.execute(
            "SELECT url FROM urls WHERE code = ?", (code,)
        ).fetchone()
        return row[0] if row else None
