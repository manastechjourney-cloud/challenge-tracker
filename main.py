from fastapi import FastAPI

import models  # noqa: F401
from database import Base, engine

Base.metadata.create_all(bind=engine)

app = FastAPI()


@app.get("/")
def read_root():
    return {"message": "Hello, Challenge Tracker!"}