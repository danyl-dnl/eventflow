from datetime import date, time, datetime
from sqlalchemy import (
    Column, Integer, String, Date, Time,
    Boolean, ForeignKey, DateTime, Enum, UniqueConstraint
)
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base


class CategoryEnum(str, enum.Enum):
    conference = "conference"
    workshop   = "workshop"
    summit     = "summit"
    networking = "networking"


class StatusEnum(str, enum.Enum):
    upcoming = "upcoming"
    live     = "live"
    past     = "past"


class RegistrationStatus(str, enum.Enum):
    confirmed = "confirmed"
    waitlist  = "waitlist"
    cancelled = "cancelled"


class TicketType(str, enum.Enum):
    general = "general"
    student = "student"
    vip     = "vip"


class RoleEnum(str, enum.Enum):
    admin   = "admin"
    student = "student"


# ── User ───────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    name            = Column(String(255), nullable=False)
    email           = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role            = Column(Enum(RoleEnum), default=RoleEnum.student, nullable=False)
    created_at      = Column(DateTime, default=datetime.utcnow)


# ── Event ──────────────────────────────────────
class Event(Base):
    __tablename__ = "events"

    id          = Column(Integer, primary_key=True, index=True)
    title       = Column(String(255), nullable=False)
    category    = Column(Enum(CategoryEnum), nullable=False)
    date        = Column(Date, nullable=False)
    time        = Column(Time, nullable=False)
    location    = Column(String(255), default="TBD")
    speaker     = Column(String(255), default="TBD")
    capacity    = Column(Integer, nullable=False)
    registered  = Column(Integer, default=0)
    waitlist    = Column(Integer, default=0)
    price       = Column(Integer, default=0)
    status      = Column(Enum(StatusEnum), default=StatusEnum.upcoming)
    created_at  = Column(DateTime, default=datetime.utcnow)

    registrations = relationship(
        "Registration",
        back_populates="event",
        cascade="all, delete-orphan"   # FIX: deleting an event now cleans up its registrations
    )


# ── Registration ───────────────────────────────
class Registration(Base):
    __tablename__ = "registrations"

    id              = Column(Integer, primary_key=True, index=True)
    event_id        = Column(Integer, ForeignKey("events.id"), nullable=False)
    name            = Column(String(255), nullable=False)
    email           = Column(String(255), nullable=False)
    phone           = Column(String(50), nullable=True)
    organisation    = Column(String(255), nullable=True)
    ticket_type     = Column(Enum(TicketType), default=TicketType.general)
    seats           = Column(Integer, default=1)
    status          = Column(Enum(RegistrationStatus), default=RegistrationStatus.confirmed)
    registered_at   = Column(DateTime, default=datetime.utcnow)

    event = relationship("Event", back_populates="registrations")

    __table_args__ = (
        # FIX: prevents the same email from registering for the same event twice
        # Only enforced on active (non-cancelled) registrations — see route-level check
        UniqueConstraint("email", "event_id", name="uq_email_event"),
    )