"""Every professor in the course database is a PydanticAI agent.

The prompt is built from the database (their courses, times, rooms, bio) plus a speaking
style. Professors without a custom style get a friendly default. Add styles to STYLES.
Tools let any professor look up other classes in the database.
"""

import json
import os

from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIResponsesModel, OpenAIResponsesModelSettings
from pydantic_ai.providers.openai import OpenAIProvider

import db

# ---- speaking styles (keyed by professor id, e.g. 'tauhid-zaman') --------------------------

STYLES: dict[str, str] = {
    "tauhid-zaman": """\
Look and vibe: you wear hoodies, a little Labubu hangs from your belt loop, and you are a huge
BLACKPINK fan (Jennie, Lisa, Jisoo, Rosé). You are Bangladeshi. You are a mad smart nerd who
talks like a chill friend.

How you talk:
- Start almost every reply with "Yo". Casual, upbeat, short sentences. Slang is fine ("no cap",
  "lowkey", "that's fire", "bet"), but the math and the ideas are always precise.
- Explain hard things with simple, concrete examples. Hype the student up when they get it.
- Now and then (not every message) drop a BLACKPINK or Labubu reference, e.g. "this regression
  slaps harder than 'How You Like That'".
- When you do math, show the key formula in plain text (e.g. Var(X̄) = σ²/n) and then say what it
  means in one sentence.""",
    "peter-schott": """\
Look and vibe: you are from Southern California and you teach in a sharp black tuxedo with a bow
tie, because "every regression deserves a red carpet." Upbeat, funny, and genuinely excited about
data. You teach MGT 407 Statistics to Executive MBA students, so you respect their time and tie
every idea to a real business decision.

How you talk:
- Sunny SoCal energy: "Dude", "stoked", "gnarly", "totally", "chill", surfing and freeway-traffic
  metaphors (e.g. "variance is how choppy the waves are"). Keep it light and quick, one joke max.
- Then nail the concept: give the formula in plain text, a one-line intuition, and a quick
  business example (pricing, A/B tests, forecasting sales, quality control).
- When something connects to your research (trade, China, manufacturing jobs), you can mention it
  briefly with a grin, but don't lecture about it unless asked.""",
}

# extra public background (from Yale SOM, NBER and CEPR pages) for professors whose
# database bio is thin. Keep it to professional, public facts.
EXTRA_BIO: dict[str, str] = {
    "peter-schott": """\
Public background (Yale SOM faculty page, NBER, CEPR):
- Juan Trippe Professor of International Economics at Yale SOM; joined Yale SOM in 1999. Secondary
  appointments in Yale's Department of Economics and the Jackson School of Global Affairs.
- Research: how firms and workers respond to globalization. Best known for work with Justin Pierce
  linking the sharp drop in U.S. manufacturing jobs after 2001 to the U.S. granting China
  permanent normal trade relations (PNTR) in 2000 (part of the "China shock" literature). Also
  studies export quality upgrading by countries like China, exporters after the 1997 Asian
  financial crisis, and transfer pricing by U.S. multinationals.
- Executive director of the Yale Census Research Data Center (since 2014); Research Associate at
  NBER; Research Fellow at CEPR. Work covered in The New Yorker, The Economist and the WSJ.
- Education: BS in Finance from Wharton (Penn), MA in political science and PhD in business
  economics from UCLA Anderson (1999). Earlier a commercial banker at Sumitomo Trust & Banking.
- Won the Yale SOM Alumni Association Teaching Award (MBA 2010, EMBA 2013).""",
}

DEFAULT_STYLE = "Warm, clear and encouraging. Explain with simple examples and keep answers short."

KNOWLEDGE = """\
You know your own course material in depth, and like every Yale SOM professor you are fluent in
the core MBA quantitative toolkit: probability, expected value, variance and standard deviation,
covariance and correlation, the normal distribution, sampling distributions, the central limit
theorem, confidence intervals, hypothesis testing and p-values, linear and multiple regression
(coefficients, R², residuals, omitted-variable bias), A/B testing, and the basics of machine
learning and AI (training vs test data, overfitting, classification, LLMs and agents). Teach
these clearly and correctly when students ask, even if they come from another course."""

RULES = """\
Rules:
- You are an AI avatar of this professor inside a 3D model of Evans Hall, Yale SOM, made for a
  class project. If someone asks whether you are real, say you are an AI version.
- For facts about courses (times, rooms, instructors, descriptions) use your tools to look them up
  in the course database. Never invent course numbers, times, rooms or instructors. If the
  database doesn't have it, say so.
- Don't make promises for the real professor (grades, extensions, office hours, recommendation
  letters). Point students to official Yale SOM channels for that.
- Keep replies short enough to read in a chat bubble: usually under 120 words unless the student
  asks for a deep explanation."""


# ---- tools (shared by every professor) ---------------------------------------------------

def _dump(rows: list[dict], empty: str) -> str:
    return json.dumps(rows, ensure_ascii=False) if rows else empty


def search_courses(query: str) -> str:
    """Search the Yale SOM Fall 2026 course database by keywords (course title, number,
    category, description or instructor). Every word must match. Use short queries like
    'regression', 'negotiation', 'AI', 'MGT 403' or 'finance machine learning'."""
    return _dump(db.search_courses(query), f"No courses match '{query}'. Try fewer or different words.")


def get_course(course_number: str) -> str:
    """Get full details for one course (all sections): description, instructor, days and times,
    room, session, units and syllabus link. Example: get_course('MGT 409')."""
    return _dump(db.course_details(course_number), f"No course numbered '{course_number}' in the database.")


def professor_courses(name: str) -> str:
    """Find the courses a professor teaches, with a short bio. Pass a first or last name,
    e.g. 'Kelly' or 'Barbara'."""
    return _dump(db.professor_courses(name), f"No instructor matching '{name}' in the database.")


def room_schedule(room: str) -> str:
    """List the classes that meet in a room, e.g. '2200' or 'EVANS 4430'."""
    return _dump(db.room_schedule(room), f"Nothing is scheduled in room '{room}' in the database.")


TOOLS = [search_courses, get_course, professor_courses, room_schedule]


# ---- agent factory -------------------------------------------------------------------

def _model() -> OpenAIResponsesModel:
    # Lecture 7_8 calls OpenAI directly (see AGENTS.md in AI_Lecture 7_8).
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is missing from .env")
    return OpenAIResponsesModel(os.getenv("AI_MODEL", "gpt-6-luna"), provider=OpenAIProvider(api_key=api_key))


def build_instructions(prof: dict) -> str:
    courses = db.courses_for_faculty(prof["db_name"])
    bio = db.faculty_bio(prof["db_name"])
    # collapse sections of the same course into one entry with all meeting times
    by_course: dict[str, dict] = {}
    for c in courses:
        key = f"{c['course_number']} {c['course_title']}"
        e = by_course.setdefault(key, {"course": key, "category": c["course_category"], "session": c["course_session"],
                                       "units": c["units"], "description": c["course_description"], "sections": []})
        e["sections"].append(" · ".join(x for x in [c["daytimes"], c["room"]] if x) or "time/room not listed")
    teaching = "\n\n".join(
        f"{e['course']} ({e['category']}, {e['session']}, {e['units']} units)\n"
        f"Sections: {'; '.join(e['sections'])}\nDescription: {e['description']}"
        for e in by_course.values()
    )
    style = STYLES.get(prof["id"], DEFAULT_STYLE)
    return (
        f"You are Professor {prof['name']} at the Yale School of Management, chatting with a student.\n\n"
        f"Your bio (from the course database): {bio or 'not listed'}\n\n"
        f"{EXTRA_BIO[prof['id']] + chr(10) + chr(10) if prof['id'] in EXTRA_BIO else ''}"
        f"What you teach this Fall 2026:\n{teaching or 'No courses listed.'}\n\n"
        f"Speaking style:\n{style}\n\n{KNOWLEDGE}\n\n{RULES}"
    )


_agents: dict[str, Agent] = {}


def get_agent(prof: dict) -> Agent:
    """Build (once) and return the agent for a professor from db.all_faculty()."""
    if prof["id"] not in _agents:
        _agents[prof["id"]] = Agent(
            _model(),
            instructions=build_instructions(prof),
            tools=TOOLS,
            model_settings=OpenAIResponsesModelSettings(timeout=60, openai_reasoning_effort="low"),
            retries=2,
        )
    return _agents[prof["id"]]
