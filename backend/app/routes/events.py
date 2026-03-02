from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.models.models import Event, Registration, RegistrationStatus
from app.schemas.schemas import EventCreate, EventUpdate, EventResponse, MessageResponse

router = APIRouter(prefix="/events", tags=["Events"])


# ── GET all events ─────────────────────────────
@router.get("/", response_model=List[EventResponse])
def get_events(
    # ── Existing filters ──────────────────────
    category:     Optional[str]  = Query(None, description="Filter by category: conference | workshop | summit | networking"),
    search:       Optional[str]  = Query(None, description="Search by title or category name"),

    # ── NEW: Date filters ─────────────────────
    date_from:    Optional[date] = Query(None, description="Show events on or after this date (YYYY-MM-DD)"),
    date_to:      Optional[date] = Query(None, description="Show events on or before this date (YYYY-MM-DD)"),
    event_date:   Optional[date] = Query(None, description="Show events on exactly this date (YYYY-MM-DD)"),

    # ── NEW: Availability filter ───────────────
    availability: Optional[str]  = Query(None, description="Filter by availability: available | waitlist | sold_out"),

    db: Session = Depends(get_db)
):
    query = db.query(Event)

    # ── Category filter ────────────────────────
    if category and category != "all":
        query = query.filter(Event.category == category)

    # ── Search: title OR category ──────────────
    # Previously only searched title — now also matches category name
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            Event.title.ilike(search_term) |
            Event.category.ilike(search_term)
        )

    # ── Date filters ───────────────────────────
    # Three modes:
    #   event_date          → exact single day match
    #   date_from / date_to → open-ended or bounded range (can use one or both)
    if event_date:
        query = query.filter(Event.date == event_date)
    else:
        if date_from:
            query = query.filter(Event.date >= date_from)
        if date_to:
            query = query.filter(Event.date <= date_to)

    # ── Availability filter ────────────────────
    # 'available' → at least one confirmed seat still free
    # 'waitlist'  → fully booked (registered >= capacity), waitlist is open
    # 'sold_out'  → fully booked AND has an active waitlist queue
    if availability == "available":
        query = query.filter(Event.registered < Event.capacity)
    elif availability == "waitlist":
        query = query.filter(Event.registered >= Event.capacity)
    elif availability == "sold_out":
        query = query.filter(
            Event.registered >= Event.capacity,
            Event.waitlist   >  0
        )

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

    # ── Capacity guard ─────────────────────────
    if payload.capacity is not None and payload.capacity < event.registered:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Cannot set capacity to {payload.capacity} — "
                f"{event.registered} seats are already confirmed"
            )
        )

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(event, field, value)

    db.commit()
    db.refresh(event)
    return event


# ── DELETE event ───────────────────────────────
@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(event_id: int, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    db.delete(event)
    db.commit()


# ── GET registrations for an event ────────────
@router.get("/{event_id}/registrations", response_model=List)
def get_event_registrations(event_id: int, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event.registrations