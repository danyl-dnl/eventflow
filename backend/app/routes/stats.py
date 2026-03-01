from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.models import Event, Registration, RegistrationStatus
from app.schemas.schemas import StatsResponse

router = APIRouter(prefix="/stats", tags=["Stats"])


@router.get("/", response_model=StatsResponse)
def get_stats(db: Session = Depends(get_db)):
    total_events = db.query(func.count(Event.id)).scalar()

    available_seats = db.query(
        func.sum(Event.capacity - Event.registered)
    ).scalar() or 0

    confirmed_regs = db.query(func.count(Registration.id)).filter(
        Registration.status == RegistrationStatus.confirmed
    ).scalar()

    waitlisted = db.query(func.count(Registration.id)).filter(
        Registration.status == RegistrationStatus.waitlist
    ).scalar()

    return {
        "total_events":    total_events,
        "available_seats": available_seats,
        "confirmed_regs":  confirmed_regs,
        "waitlisted":      waitlisted,
    }