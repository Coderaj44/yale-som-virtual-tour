# Backend: AI professors (FastAPI + PydanticAI)

Every professor in `data/yale_som.db` is a PydanticAI agent. Its prompt is built from the
database (courses, times, rooms, bio) plus a speaking style from `STYLES` in `professors.py`.
All professors share four database tools: `search_courses`, `get_course`, `professor_courses`
and `room_schedule`, so they can answer questions about other classes too.

## Setup

The backend reads `OPENAI_API_KEY` and `AI_MODEL` from the nearest `.env` above this folder.

```bash
cd backend
python3.12 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn main:app --port 8000
```

Then run the front end (`npm run dev` in the repo root). Vite forwards `/api` to port 8000.

## API

- `GET /api/health` shows the model and whether the key loaded (never the key itself)
- `GET /api/professors` lists every professor id, e.g. `tauhid-zaman`
- `POST /api/chat` with `{ "professor_id", "session_id", "message" }` returns `{ "reply", "professor" }`

## Add a speaking style

Add an entry to `STYLES` in `professors.py`, keyed by professor id.
