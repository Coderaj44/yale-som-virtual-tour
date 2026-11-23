"""Read-only helpers over data/yale_som.db (the Fall 2026 Yale SOM course catalog)."""

import re
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "yale_som.db"

# columns worth showing to an agent (skips internal ids and empty email column)
COLS = [
    "course_number", "course_title", "course_category", "course_type", "course_session",
    "faculty_1", "daytimes", "room", "section", "units", "course_description", "syllabus", "old_syllabus",
]


def _conn() -> sqlite3.Connection:
    c = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    c.row_factory = sqlite3.Row
    return c


def _rows(sql: str, args: tuple = ()) -> list[dict]:
    with _conn() as c:
        return [dict(r) for r in c.execute(sql, args).fetchall()]


def slugify(faculty: str) -> str:
    """'Zaman, Tauhid' -> 'tauhid-zaman'."""
    last, _, first = faculty.partition(",")
    name = f"{first.strip()} {last.strip()}".strip()
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def display_name(faculty: str) -> str:
    """'Zaman, Tauhid' -> 'Tauhid Zaman'."""
    last, _, first = faculty.partition(",")
    return f"{first.strip()} {last.strip()}".strip()


def all_faculty() -> list[dict]:
    """One row per professor: slug, name, raw DB name, number of course sections."""
    rows = _rows("SELECT faculty_1, COUNT(*) AS n FROM courses WHERE faculty_1 != '' GROUP BY faculty_1 ORDER BY faculty_1")
    return [{"id": slugify(r["faculty_1"]), "name": display_name(r["faculty_1"]), "db_name": r["faculty_1"], "sections": r["n"]} for r in rows]


def faculty_by_slug(slug: str) -> dict | None:
    return next((f for f in all_faculty() if f["id"] == slug), None)


def faculty_bio(db_name: str) -> str:
    rows = _rows("SELECT faculty_bio FROM courses WHERE faculty_1 = ? AND faculty_bio != '' LIMIT 1", (db_name,))
    return rows[0]["faculty_bio"] if rows else ""


def courses_for_faculty(db_name: str) -> list[dict]:
    return _rows(f"SELECT {', '.join(COLS)} FROM courses WHERE faculty_1 = ? ORDER BY course_number, daytimes", (db_name,))


def search_courses(query: str, limit: int = 12) -> list[dict]:
    """Keyword search over number, title, category, description and instructor. Every word must match."""
    words = [w for w in re.split(r"\s+", query.strip()) if w][:6]
    if not words:
        return []
    where = " AND ".join(
        ["(course_number LIKE ? OR course_title LIKE ? OR course_category LIKE ? OR course_description LIKE ? OR faculty_1 LIKE ?)"] * len(words)
    )
    args = tuple(a for w in words for a in [f"%{w}%"] * 5)
    rows = _rows(
        f"SELECT course_number, course_title, course_category, faculty_1, daytimes, room, course_session, units "
        f"FROM courses WHERE {where} ORDER BY course_number LIMIT ?",
        args + (limit,),
    )
    return rows


def course_details(course_number: str) -> list[dict]:
    """All sections of one course, e.g. 'MGT 409' (spacing and case don't matter)."""
    norm = re.sub(r"\s+", "", course_number).upper()
    return _rows(f"SELECT {', '.join(COLS)} FROM courses WHERE REPLACE(UPPER(course_number), ' ', '') = ?", (norm,))


def professor_courses(name: str) -> list[dict]:
    """Courses taught by anyone whose name contains `name` (first or last)."""
    return _rows(
        "SELECT course_number, course_title, faculty_1, daytimes, room, course_session, units, substr(faculty_bio, 1, 400) AS bio "
        "FROM courses WHERE faculty_1 LIKE ? ORDER BY faculty_1, course_number",
        (f"%{name.strip()}%",),
    )


def room_schedule(room: str) -> list[dict]:
    """What meets in a room, e.g. '2200' or 'EVANS 2200'."""
    return _rows(
        "SELECT course_number, course_title, faculty_1, daytimes, course_session FROM courses WHERE room LIKE ? ORDER BY daytimes",
        (f"%{room.strip()}%",),
    )
