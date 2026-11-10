# Challenge Tracker

A personal web app for running habit challenges such as "30 days no sugar" or "100 days no oil". Create your own challenges, check in daily, and watch your streak and progress grow.

## Features

- Create a challenge with a name, description, duration, start date and mode
- Strict mode (a slip resets the streak) or relaxed mode (a slip is only logged)
- Daily check-in: mark today as done or slipped, with an optional note
- Progress view: current streak, days completed, days left and completion percentage
- List and delete challenges

## Tech stack

- **Backend:** FastAPI
- **Database:** SQLite through SQLAlchemy
- **Frontend:** plain HTML, CSS and JavaScript served by FastAPI
- **Tests:** pytest (logic tests and API tests)

## Getting started (Windows PowerShell)

```powershell
git clone https://github.com/YOUR-USERNAME/challenge-tracker.git
cd challenge-tracker
python -m venv venv
venv\Scripts\activate
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload
```

Then open http://127.0.0.1:8000 for the app, or http://127.0.0.1:8000/docs for the interactive API documentation.

If PowerShell blocks the activation script, run this once:
`Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`

## Running the tests

```powershell
python -m pytest -v
```

The API tests use a throwaway in-memory database, so they never touch your real data.

## API endpoints

| Method | URL | What it does |
|---|---|---|
| POST | `/challenges` | Create a challenge |
| GET | `/challenges` | List all challenges |
| GET | `/challenges/{id}` | Get one challenge |
| DELETE | `/challenges/{id}` | Delete a challenge and its check-ins |
| POST | `/challenges/{id}/checkins` | Add a check-in (done or slipped) |
| GET | `/challenges/{id}/checkins` | List a challenge's check-ins |
| GET | `/challenges/{id}/progress` | Streak, days completed, days left, completion % |

## How progress is calculated

- **Days elapsed** counts from the start date through today, capped at the duration.
- **Completion %** is days done divided by the duration.
- **Current streak** counts consecutive done days backward from today. If today has no check-in yet, counting starts from yesterday.
- **Strict mode:** a slipped day ends the streak.
- **Relaxed mode:** a slipped day is logged but does not end the streak.
- A day with no check-in ends the streak in both modes.

The logic lives in `progress.py` as a pure function, so it is easy to test.

## Project structure

```
challenge-tracker/
├── main.py            FastAPI app and endpoints
├── database.py        database engine, sessions and base class
├── models.py          SQLAlchemy tables (challenges, checkins)
├── schemas.py         request and response shapes (Pydantic)
├── progress.py        streak and progress logic
├── conftest.py        pytest fixture with an in-memory test database
├── test_progress.py   tests for the progress logic
├── test_api.py        tests for the endpoints
├── static/            HTML, CSS and JavaScript
└── requirements.txt   Python dependencies
```

## Ideas for later

- Challenge templates (one-click "30 days no sugar")
- Daily reminders
- Analyse check-in history to show which days I tend to slip, and suggest tips
- Check in for past days from the page