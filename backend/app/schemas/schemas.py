from datetime import date, time, datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, field_validator

from app.models.models import CategoryEnum, StatusEnum, RegistrationStatus, TicketType, RoleEnum


# ══════════════════════════════════════════════
# AUTH SCHEMAS
# ══════════════════════════════════════════════

class UserRegister(BaseModel):
    name:     str
    email:    EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class UserLogin(BaseModel):
    email:    EmailStr
    password: str
    role:     RoleEnum   # client must send the role they're logging in as


class UserResponse(BaseModel):
    id:    int
    name:  str
    email: EmailStr
    role:  RoleEnum

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user:         UserResponse


# ══════════════════════════════════════════════
# EVENT SCHEMAS
# ══════════════════════════════════════════════

class EventBase(BaseModel):
    title:    str
    category: CategoryEnum
    date:     date
    time:     time
    location: str = "TBD"
    speaker:  str = "TBD"
    capacity: int
    price:    int = 0
    status:   StatusEnum = StatusEnum.upcoming


class EventCreate(EventBase):
    @field_validator("capacity")
    @classmethod
    def capacity_must_be_positive(cls, v):
        if v < 1:
            raise ValueError("Capacity must be at least 1")
        return v

    @field_validator("price")
    @classmethod
    def price_must_be_non_negative(cls, v):
        if v < 0:
            raise ValueError("Price cannot be negative")
        return v


class EventUpdate(BaseModel):
    title:    Optional[str]          = None
    category: Optional[CategoryEnum] = None
    date:     Optional[date]         = None
    time:     Optional[time]         = None
    location: Optional[str]          = None
    speaker:  Optional[str]          = None
    capacity: Optional[int]          = None
    price:    Optional[int]          = None
    status:   Optional[StatusEnum]   = None

    @field_validator("capacity")
    @classmethod
    def capacity_must_be_positive(cls, v):
        # FIX: capacity guard at schema level — route will enforce it can't go below registered
        if v is not None and v < 1:
            raise ValueError("Capacity must be at least 1")
        return v

    @field_validator("price")
    @classmethod
    def price_must_be_non_negative(cls, v):
        if v is not None and v < 0:
            raise ValueError("Price cannot be negative")
        return v


class EventResponse(EventBase):
    id:         int
    registered: int
    waitlist:   int
    created_at: datetime

    model_config = {"from_attributes": True}


# ══════════════════════════════════════════════
# REGISTRATION SCHEMAS
# ══════════════════════════════════════════════

class RegistrationBase(BaseModel):
    name:         str
    email:        EmailStr
    phone:        Optional[str] = None
    organisation: Optional[str] = None
    ticket_type:  TicketType = TicketType.general
    seats:        int = 1


class RegistrationCreate(RegistrationBase):
    event_id: int

    @field_validator("seats")
    @classmethod
    def seats_must_be_valid(cls, v):
        if v < 1 or v > 3:
            raise ValueError("Seats must be between 1 and 3")
        return v


class RegistrationResponse(RegistrationBase):
    id:            int
    event_id:      int
    status:        RegistrationStatus
    registered_at: datetime

    model_config = {"from_attributes": True}


class RegistrationWithEvent(RegistrationResponse):
    event: EventResponse


# ══════════════════════════════════════════════
# GENERIC SCHEMAS
# ══════════════════════════════════════════════

class MessageResponse(BaseModel):
    message: str


class StatsResponse(BaseModel):
    total_events:    int
    available_seats: int
    confirmed_regs:  int
    waitlisted:      int