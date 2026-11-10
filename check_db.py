import os

from sqlalchemy import inspect

import models  # noqa: F401
from database import Base, engine

print("Database file:", os.path.abspath("challenge_tracker.db"))
print("Models registered:", list(Base.metadata.tables))

Base.metadata.create_all(bind=engine)

inspector = inspect(engine)
tables = inspector.get_table_names()
print("Tables in database:", tables)
for table in tables:
    columns = [col["name"] for col in inspector.get_columns(table)]
    print(table, columns)