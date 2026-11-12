import datetime

from pathlib import Path
from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from progress import calculate_progress
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import models
import schemas
from database import Base, engine, get_db


Base.metadata.create_all(bind=engine)

app = FastAPI()
BASE_DIR = Path(__file__).resolve().parent
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")


@app.get("/", include_in_schema=False)
def serve_index():
    return FileResponse(BASE_DIR / "static" / "index.html")


@app.post("/challenges", response_model=schemas.ChallengeRead, status_code=201)
def create_challenge(
    challenge: schemas.ChallengeCreate, db: Session = Depends(get_db)
):
    db_challenge = models.Challenge(**challenge.model_dump())
    db.add(db_challenge)
    db.commit()
    db.refresh(db_challenge)
    return db_challenge

@app.get("/challenges", response_model=list[schemas.ChallengeRead])
def list_challenges(db: Session = Depends(get_db)):
    return db.query(models.Challenge).order_by(models.Challenge.id).all()


@app.get("/challenges/{challenge_id}", response_model=schemas.ChallengeRead)
def get_challenge(challenge_id: int, db: Session = Depends(get_db)):
    challenge = db.get(models.Challenge, challenge_id)
    if challenge is None:
        raise HTTPException(status_code=404, detail="Challenge not found")
    return challenge


@app.delete("/challenges/{challenge_id}", status_code=204)
def delete_challenge(challenge_id: int, db: Session = Depends(get_db)):
    challenge = db.get(models.Challenge, challenge_id)
    if challenge is None:
        raise HTTPException(status_code=404, detail="Challenge not found")
    db.delete(challenge)
    db.commit()


@app.post(
    "/challenges/{challenge_id}/checkins",
    response_model=schemas.CheckInRead,
    status_code=201,
)
def create_checkin(
    challenge_id: int,
    checkin: schemas.CheckInCreate,
    db: Session = Depends(get_db),
):
    challenge = db.get(models.Challenge, challenge_id)
    if challenge is None:
        raise HTTPException(status_code=404, detail="Challenge not found")

    checkin_date = checkin.date or datetime.date.today()
    last_day = challenge.start_date + datetime.timedelta(
        days=challenge.duration_days - 1
    )
    if checkin_date < challenge.start_date or checkin_date > last_day:
        raise HTTPException(
            status_code=400,
            detail=f"Date must be between {challenge.start_date} and {last_day}",
        )
    if checkin_date > datetime.date.today():
        raise HTTPException(
            status_code=400,
            detail="Cannot check in for a future date",
        )
    db_checkin = models.CheckIn(
        challenge_id=challenge_id,
        date=checkin_date,
        status=checkin.status,
        note=checkin.note,
    )
    db.add(db_checkin)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="A check-in already exists for this date",
        )
    db.refresh(db_checkin)
    return db_checkin


@app.get(
    "/challenges/{challenge_id}/checkins",
    response_model=list[schemas.CheckInRead],
)
def list_checkins(challenge_id: int, db: Session = Depends(get_db)):
    challenge = db.get(models.Challenge, challenge_id)
    if challenge is None:
        raise HTTPException(status_code=404, detail="Challenge not found")
    return (
        db.query(models.CheckIn)
        .filter(models.CheckIn.challenge_id == challenge_id)
        .order_by(models.CheckIn.date)
        .all()
    )


@app.get(
    "/challenges/{challenge_id}/progress",
    response_model=schemas.ProgressRead,
)
def get_progress(challenge_id: int, db: Session = Depends(get_db)):
    challenge = db.get(models.Challenge, challenge_id)
    if challenge is None:
        raise HTTPException(status_code=404, detail="Challenge not found")

    statuses = {checkin.date: checkin.status for checkin in challenge.checkins}

    return calculate_progress(
        start_date=challenge.start_date,
        duration_days=challenge.duration_days,
        strict_mode=challenge.strict_mode,
        statuses=statuses,
        today=datetime.date.today(),
    )


def get_checkin_or_404(
    db: Session, challenge_id: int, checkin_id: int
) -> models.CheckIn:
    checkin = db.get(models.CheckIn, checkin_id)
    if checkin is None or checkin.challenge_id != challenge_id:
        raise HTTPException(status_code=404, detail="Check-in not found")
    return checkin


@app.put(
    "/challenges/{challenge_id}/checkins/{checkin_id}",
    response_model=schemas.CheckInRead,
)
def update_checkin(
    challenge_id: int,
    checkin_id: int,
    update: schemas.CheckInUpdate,
    db: Session = Depends(get_db),
):
    checkin = get_checkin_or_404(db, challenge_id, checkin_id)
    checkin.status = update.status
    checkin.note = update.note
    db.commit()
    db.refresh(checkin)
    return checkin


@app.delete(
    "/challenges/{challenge_id}/checkins/{checkin_id}",
    status_code=204,
)
def delete_checkin(
    challenge_id: int,
    checkin_id: int,
    db: Session = Depends(get_db),
):
    checkin = get_checkin_or_404(db, challenge_id, checkin_id)
    db.delete(checkin)
    db.commit()


@app.patch("/challenges/{challenge_id}", response_model=schemas.ChallengeRead)
def update_challenge(
    challenge_id: int,
    update: schemas.ChallengeUpdate,
    db: Session = Depends(get_db),
):
    challenge = db.get(models.Challenge, challenge_id)
    if challenge is None:
        raise HTTPException(status_code=404, detail="Challenge not found")

    changes = update.model_dump(exclude_unset=True)
    if any(value is None for value in changes.values()):
        raise HTTPException(
            status_code=422,
            detail="Fields cannot be null. Leave a field out to keep it unchanged.",
        )

    new_start = changes.get("start_date", challenge.start_date)
    new_duration = changes.get("duration_days", challenge.duration_days)
    new_last_day = new_start + datetime.timedelta(days=new_duration - 1)
    for checkin in challenge.checkins:
        if checkin.date < new_start or checkin.date > new_last_day:
            raise HTTPException(
                status_code=400,
                detail="Existing check-ins would fall outside the new dates. "
                "Remove them first.",
            )

    for field, value in changes.items():
        setattr(challenge, field, value)
    db.commit()
    db.refresh(challenge)
    return challenge    