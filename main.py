from fastapi import Depends, FastAPI
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