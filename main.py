from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import Base, engine, get_db

Base.metadata.create_all(bind=engine)

app = FastAPI()


@app.get("/")
def read_root():
    return {"message": "Hello, Challenge Tracker!"}


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