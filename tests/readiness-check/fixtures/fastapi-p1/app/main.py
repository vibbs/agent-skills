from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import Base, SessionLocal, engine
from app.models import Note

Base.metadata.create_all(bind=engine)

app = FastAPI(title="notes-api")


class NoteIn(BaseModel):
    title: str
    body: str


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/notes")
def list_notes(db: Session = Depends(get_db)):
    return db.query(Note).all()


@app.post("/notes")
def create_note(note: NoteIn, db: Session = Depends(get_db)):
    row = Note(title=note.title, body=note.body)
    db.add(row)
    db.commit()
    print("created note", row.id)
    return row


@app.delete("/notes/{note_id}")
def delete_note(note_id: int, db: Session = Depends(get_db)):
    row = db.get(Note, note_id)
    if row is None:
        raise HTTPException(status_code=404)
    db.delete(row)
    db.commit()
    return {"ok": True}
