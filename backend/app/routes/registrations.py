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

    # ── 1. Event must exist ────────────────────
    event = db.query(Event).filter(Event.id == payload.event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # ── 2. Duplicate registration check ───────
    # Block if an active (confirmed or waitlist) registration already exists
    # for this email + event combination. Cancelled registrations are allowed
    # to re-register (the user cancelled and wants back in).
    existing = (
        db.query(Registration)
        .filter(
            Registration.event_id == payload.event_id,
            Registration.email    == payload.email,
            Registration.status   != RegistrationStatus.cancelled
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An active registration for this email already exists "
                   f"(status: {existing.status.value})"
        )

    # ── 3. Seat tracking & overbooking guard ──
    # seats_left is always derived live from the DB — never trust a cached value.
    # If the event is exactly full (seats_left == 0), we still allow registration
    # but place it on the waitlist. Overbooking (registered > capacity) is
    # impossible because we only increment registered when seats are available.
    seats_left = event.capacity - event.registered
    is_waitlist = seats_left < payload.seats

    reg = Registration(
        **payload.model_dump(),
        status=RegistrationStatus.waitlist if is_waitlist else RegistrationStatus.confirmed
    )

    if is_waitlist:
        # Waitlisted — seats are NOT added to registered count, only to waitlist counter
        event.waitlist += payload.seats
    else:
        # Confirmed — only increment by exactly the seats requested, never beyond capacity
        event.registered += payload.seats

    db.add(reg)
    db.commit()
    db.refresh(reg)
    return reg


# ── CANCEL registration ────────────────────────
@router.patch("/{reg_id}/cancel", response_model=RegistrationResponse)
def cancel_registration(reg_id: int, db: Session = Depends(get_db)):

    # ── 1. Registration must exist ─────────────
    reg = db.query(Registration).filter(Registration.id == reg_id).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")

    # ── 2. Guard: already cancelled ───────────
    if reg.status == RegistrationStatus.cancelled:
        raise HTTPException(status_code=400, detail="Registration already cancelled")

    # ── 3. Capture original status BEFORE mutation ─
    # Critical: we need to know if this was confirmed or waitlisted
    # to decide whether to restore seats and trigger waitlist promotion.
    original_status = reg.status
    reg.status      = RegistrationStatus.cancelled

    event = db.query(Event).filter(Event.id == reg.event_id).first()

    if event:
        if original_status == RegistrationStatus.confirmed:
            # ── 4a. Restore confirmed seats to the pool ──
            event.registered = max(0, event.registered - reg.seats)
            db.commit()

            # ── 5. Waitlist promotion ──────────────────
            # Freed seat → promote oldest waitlisted registration.
            # registered count stays balanced: we just freed seats and will
            # immediately reassign them to the promoted person.
            waiter = (
                db.query(Registration)
                .filter(
                    Registration.event_id == reg.event_id,
                    Registration.status   == RegistrationStatus.waitlist
                )
                .order_by(Registration.registered_at.asc())
                .first()
            )
            if waiter:
                waiter.status     = RegistrationStatus.confirmed
                event.registered += waiter.seats
                event.waitlist    = max(0, event.waitlist - waiter.seats)
                db.commit()
                db.refresh(waiter)

        elif original_status == RegistrationStatus.waitlist:
            # ── 4b. Remove from waitlist counter ──────
            # No seat was ever held, so no promotion needed — just shrink waitlist.
            event.waitlist = max(0, event.waitlist - reg.seats)
            db.commit()

    db.refresh(reg)
    return reg


# ── DELETE registration ────────────────────────
@router.delete("/{reg_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_registration(reg_id: int, db: Session = Depends(get_db)):
    reg = db.query(Registration).filter(Registration.id == reg_id).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")

    # ── Restore seat counts on hard delete ────
    # If a confirmed registration is hard-deleted (admin action), seats must be
    # freed and the waitlist promoted, same as a cancellation.
    event = db.query(Event).filter(Event.id == reg.event_id).first()
    if event and reg.status == RegistrationStatus.confirmed:
        event.registered = max(0, event.registered - reg.seats)
        db.commit()

        # Promote from waitlist after freeing seats
        waiter = (
            db.query(Registration)
            .filter(
                Registration.event_id == reg.event_id,
                Registration.status   == RegistrationStatus.waitlist
            )
            .order_by(Registration.registered_at.asc())
            .first()
        )
        if waiter:
            waiter.status     = RegistrationStatus.confirmed
            event.registered += waiter.seats
            event.waitlist    = max(0, event.waitlist - waiter.seats)
            db.commit()

    elif event and reg.status == RegistrationStatus.waitlist:
        # If a waitlisted registration is deleted, just shrink the waitlist counter
        event.waitlist = max(0, event.waitlist - reg.seats)
        db.commit()

    db.delete(reg)
    db.commit()