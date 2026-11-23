"""FastAPI backend: chat with Yale SOM professor agents.

Run (from this folder):  .venv/bin/uvicorn main:app --port 8000
"""

import logging
import os
from pathlib import Path

from dotenv import load_dotenv

# use the nearest .env walking up from this folder (it lives in the top-level "AI Project Training")
for folder in Path(__file__).resolve().parents:
    if (folder / ".env").is_file():
        load_dotenv(folder / ".env")
        break
os.environ.setdefault("PYDANTIC_AI_NO_BANNER", "1")

from fastapi import FastAPI, HTTPException  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from pydantic import BaseModel, Field  # noqa: E402
from pydantic_ai.exceptions import ModelHTTPError, UnexpectedModelBehavior  # noqa: E402
from pydantic_ai.messages import ModelMessage, ModelRequest, UserPromptPart  # noqa: E402

import db  # noqa: E402
import professors  # noqa: E402

log = logging.getLogger("som")
app = FastAPI(title="Yale SOM Virtual · Professors")
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# chat memory per browser session, kept in this process only (resets on restart)
SESSIONS: dict[str, list[ModelMessage]] = {}
MAX_SESSIONS = 500
MAX_HISTORY = 40  # messages kept per conversation


def trim(msgs: list[ModelMessage]) -> list[ModelMessage]:
    """Keep the newest turns, cutting only where a user message starts (never mid tool call)."""
    if len(msgs) <= MAX_HISTORY:
        return msgs
    for i, m in enumerate(msgs):
        if len(msgs) - i <= MAX_HISTORY and isinstance(m, ModelRequest) and any(isinstance(p, UserPromptPart) for p in m.parts):
            return msgs[i:]
    return msgs[-1:]


class ChatIn(BaseModel):
    professor_id: str = Field(examples=["tauhid-zaman"])
    session_id: str = Field(min_length=4, max_length=80)
    message: str = Field(min_length=1, max_length=2000)


class ChatOut(BaseModel):
    reply: str
    professor: str


@app.get("/api/health")
def health():
    return {"ok": True, "model": os.getenv("AI_MODEL", "gpt-6-luna"), "key_loaded": bool(os.getenv("OPENAI_API_KEY"))}


@app.get("/api/professors")
def list_professors():
    """Every professor in the course database (each one is a chat agent)."""
    return db.all_faculty()


@app.post("/api/chat", response_model=ChatOut)
async def chat(body: ChatIn):
    prof = db.faculty_by_slug(body.professor_id)
    if not prof:
        raise HTTPException(404, f"No professor with id '{body.professor_id}'.")
    key = f"{body.professor_id}:{body.session_id}"
    history = SESSIONS.get(key, [])
    try:
        agent = professors.get_agent(prof)
        result = await agent.run(body.message, message_history=history)
    except RuntimeError as e:  # missing key
        raise HTTPException(500, str(e))
    except ModelHTTPError as e:
        log.warning("model error %s", e.status_code)
        msg = {
            401: "The OpenAI key in .env was rejected. Check OPENAI_API_KEY.",
            404: f"The model '{os.getenv('AI_MODEL', 'gpt-6-luna')}' isn't available to this key. Check AI_MODEL in .env.",
            429: "Too many requests or out of credit at OpenAI. Wait a bit and try again.",
        }.get(e.status_code, "The AI service had a problem. Try again in a moment.")
        raise HTTPException(502, msg)
    except (UnexpectedModelBehavior, TimeoutError, OSError):
        log.exception("chat failed")
        raise HTTPException(502, "The professor lost their train of thought. Try asking again.")

    if len(SESSIONS) >= MAX_SESSIONS and key not in SESSIONS:
        SESSIONS.pop(next(iter(SESSIONS)))
    SESSIONS[key] = trim(result.all_messages())
    return ChatOut(reply=result.output, professor=prof["name"])
