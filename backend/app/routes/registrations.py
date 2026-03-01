from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.models.models import Event, Registration, RegistrationStatus
from app.schemas.schemas import (
    RegistrationCreate, RegistrationResponse,
    RegistrationWithEvent, MessageResponse
)

router = APIRouter(prefix="/registrations", tags=["Registrations"])


# ── GET all registrations ──────────────────────
@router.get("/", response_model=List[RegistrationResponse])
def get_registrations(
    status:   Optional[str] = None,
    search:   Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Registration)
    if status and status != "all":
        query = query.filter(Registration.status == status)
    if search:
        query = query.filter(
            Registration.name.ilike(f"%{search}%") |
            Registration.email.ilike(f"%{search}%")
        )
    return query.order_by(Registration.registered_at.desc()).all()


# ── GET single registration ────────────────────
@router.get("/{reg_id}", response_model=RegistrationWithEvent)
def get_registration(reg_id: int, db: Session = Depends(get_db)):
    reg = db.query(Registration).filter(Registration.id == reg_id).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    return reg


# ── CREATE registration ────────────────────────
@router.post("/", response_model=RegistrationResponse, status_code=status.HTTP_201_CREATED)
def create_registration(payload: RegistrationCreate, db: Session = Depends(get_db)):
    # Fetch the event
    event = db.query(Event).filter(Event.id == payload.event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    seats_left = event.capacity - event.registered
    is_waitlist = seats_left < payload.seats

    reg = Registration(
        **payload.model_dump(),
        status=RegistrationStatus.waitlist if is_waitlist else RegistrationStatus.confirmed
    )

    if is_waitlist:
        event.waitlist += payload.seats
    else:
        event.registered += payload.seats

    db.add(reg)
    db.commit()
    db.refresh(reg)
    return reg


# ── CANCEL registration ────────────────────────
@router.patch("/{reg_id}/cancel", response_model=RegistrationResponse)
def cancel_registration(reg_id: int, db: Session = Depends(get_db)):
    reg = db.query(Registration).filter(Registration.id == reg_id).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    if reg.status == RegistrationStatus.cancelled:
        raise HTTPException(status_code=400, detail="Registration already cancelled")

    event = db.query(Event).filter(Event.id == reg.event_id).first()

    reg.status = RegistrationStatus.cancelled
    if event:
        event.registered = max(0, event.registered - reg.seats)

    db.commit()

    # Promote first person off the waitlist
    waiter = (
        db.query(Registration)
        .filter(
            Registration.event_id == reg.event_id,
            Registration.status == RegistrationStatus.waitlist
        )
        .order_by(Registration.registered_at.asc())
        .first()
    )
    if waiter and event:
        waiter.status     = RegistrationStatus.confirmed
        event.registered += waiter.seats
        event.waitlist    = max(0, event.waitlist - waiter.seats)
        db.commit()
        db.refresh(waiter)

    db.refresh(reg)
    return reg


# ── DELETE registration ────────────────────────
@router.delete("/{reg_id}", response_model=MessageResponse)
def delete_registration(reg_id: int, db: Session = Depends(get_db)):
    reg = db.query(Registration).filter(Registration.id == reg_id).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    db.delete(reg)
    db.commit()
    return {"message": "Registration deleted"}