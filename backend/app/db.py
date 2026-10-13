import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# Reads a .env file from the repo root (or backend folder) if one exists.
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./leadflow.db")

# SQLite needs this flag because FastAPI uses more than one thread.
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
