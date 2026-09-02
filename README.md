# ChartCoach
<<<<<<< HEAD
Chart Coach - Intelligent chart analysis and coaching platform.
=======

Register/login app with an optional face-recognition login and live
identity monitoring: enroll your face, log in with a blink instead of a
password, and get automatically flagged if the camera sees someone else
(or no one) while you're supposed to be logged in.

## Stack

- **Backend**: FastAPI (Python), MySQL (SQLAlchemy + Alembic), InsightFace
  (ArcFace) for face matching, DeepFace for anti-spoofing, JWT auth in an
  httpOnly cookie.
- **Frontend**: Next.js (App Router), TypeScript, Tailwind + daisyUI.

## Prerequisites

- **Python 3.11 or newer** (3.13 is what this was built and tested on)
- **Node.js 18+**
- **MySQL** (any 8.x install works — Laragon, XAMPP, a standalone install, etc.)

## 1. Backend setup

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

Create the database (adjust the MySQL command for your setup):

```sql
CREATE DATABASE chartcoach CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Copy the env file and fill in your own values:

```bash
cp .env.example .env
```

At minimum, set `DATABASE_URL` to match your MySQL user/password, and
generate a real `JWT_SECRET_KEY` (any random string — e.g.
`python -c "import secrets; print(secrets.token_urlsafe(32))"`).

Run the database migrations:

```bash
alembic upgrade head
```

Start the server:

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8001
```

`127.0.0.1` and `8001` are just our own defaults, not a requirement — pick
whatever host/port you want. We used `8001` only because `8000` was already
taken by another local project. If you change the port, update these two
places to match:
- `NEXT_PUBLIC_API_URL` in `frontend/.env.local`
- `FRONTEND_ORIGIN` in `backend/.env` (only if you also change the
  frontend's port — this is what backend CORS uses to allow the browser to
  call the API)

The first request that touches face recognition will download the
InsightFace/DeepFace model weights (a few hundred MB) — this needs
internet access and only happens once.

**Note on `opencv-python`**: this project pins `opencv-python==4.10.0.84`
in `requirements.txt` on purpose. Newer 5.x releases dropped a data file
(`haarcascade_frontalface_default.xml`) that DeepFace's anti-spoofing check
needs — don't upgrade past 4.x without checking that first.

## 2. Frontend setup

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

The app runs at **http://localhost:3000**.

**Important**: use `http://localhost:8001` (not `http://127.0.0.1:8001`) as
`NEXT_PUBLIC_API_URL` in `.env.local`. The login token is stored in an
httpOnly cookie scoped to the hostname `localhost` — if the frontend and
backend don't share that exact hostname, the browser won't send the cookie
back and login will silently not persist.

## Running both together

You need both processes running at the same time, in two terminals:

```bash
# Terminal 1
cd backend && venv\Scripts\activate && uvicorn app.main:app --host 127.0.0.1 --port 8001

# Terminal 2
cd frontend && npm run dev
```

(host/port here are just our defaults — see the note above if you change them)

Then open http://localhost:3000.

## Project structure

```
backend/
  app/
    api/        - route handlers (auth, users, face, monitor)
    core/       - security, face recognition engine, rate limiting
    models/     - SQLAlchemy models
    schemas/    - Pydantic request/response shapes
  alembic/      - database migrations

frontend/
  src/
    app/            - pages (App Router)
    components/     - FaceCapture, etc.
    context/        - AuthContext (login state)
    hooks/          - useFaceMonitor, etc.
    lib/            - api.ts (backend client), camera.ts
```

## Debug tools

- `GET /health` — backend health check
- `/debug/blink` (frontend page) — shows the raw eye-openness numbers
  behind the blink-detection check, useful for tuning if it feels too
  strict or too loose on a different camera/lighting setup
>>>>>>> 2c78202b8ea35454258506381e3657d54dcd698e
