from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.models import Event, Registration, RegistrationStatus
from app.schemas.schemas import EventCreate, EventUpdate, EventResponse, MessageResponse

router = APIRouter(prefix="/events", tags=["Events"])


# ── GET all events ─────────────────────────────
@router.get("/", response_model=List[EventResponse])
def get_events(
    category: str = None,
    search:   str = None,
    db: Session = Depends(get_db)
):
    query = db.query(Event)
    if category and category != "all":
        query = query.filter(Event.category == category)
    if search:
        query = query.filter(Event.title.ilike(f"%{search}%"))
    return query.order_by(Event.date.asc()).all()


# ── GET single event ───────────────────────────
@router.get("/{event_id}", response_model=EventResponse)
def get_event(event_id: int, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


# ── CREATE event ───────────────────────────────
@router.post("/", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
def create_event(payload: EventCreate, db: Session = Depends(get_db)):
    event = Event(**payload.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


# ── UPDATE event ───────────────────────────────
@router.patch("/{event_id}", response_model=EventResponse)
def update_event(event_id: int, payload: EventUpdate, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(event, field, value)

    db.commit()
    db.refresh(event)
    return event


# ── DELETE event ───────────────────────────────
@router.delete("/{event_id}", response_model=MessageResponse)
def delete_event(event_id: int, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    db.delete(event)
    db.commit()
    return {"message": f"Event '{event.title}' deleted successfully"}


# ── GET registrations for an event ────────────
@router.get("/{event_id}/registrations", response_model=List)
def get_event_registrations(event_id: int, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event.registrations