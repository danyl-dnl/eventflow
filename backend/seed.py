"""
Run this once to seed the database with sample events and a default admin:
    python seed.py
"""
from datetime import date, time
from app.core.database import SessionLocal, engine, Base
from app.core.auth_utils import hash_password
from app.models.models import Event, User, CategoryEnum, StatusEnum, RoleEnum

Base.metadata.create_all(bind=engine)

SAMPLE_EVENTS = [
    Event(title="TechSummit 2025",              category=CategoryEnum.summit,      date=date(2025, 7, 18), time=time(9, 0),  location="HICC, Hyderabad",           speaker="Dr. Priya Sharma", capacity=200, registered=187, waitlist=14, price=0,   status=StatusEnum.live),
    Event(title="AI & ML Workshop",              category=CategoryEnum.workshop,    date=date(2025, 7, 22), time=time(10, 0), location="IIT Bombay",                 speaker="Rahul Mehta",      capacity=60,  registered=31,  waitlist=0,  price=499, status=StatusEnum.upcoming),
    Event(title="Startup Founders Networking",   category=CategoryEnum.networking,  date=date(2025, 7, 25), time=time(18, 0), location="91springboard, Bangalore",   speaker="Panel",            capacity=100, registered=100, waitlist=8,  price=0,   status=StatusEnum.live),
    Event(title="Cloud Architecture Conference", category=CategoryEnum.conference,  date=date(2025, 8, 1),  time=time(9, 30), location="Online — Zoom",              speaker="Amit Verma",       capacity=500, registered=212, waitlist=0,  price=0,   status=StatusEnum.upcoming),
    Event(title="UX Research Workshop",          category=CategoryEnum.workshop,    date=date(2025, 8, 5),  time=time(11, 0), location="Design Hub, Pune",           speaker="Neha Joshi",       capacity=30,  registered=26,  waitlist=5,  price=299, status=StatusEnum.upcoming),
    Event(title="DevOps Bootcamp",               category=CategoryEnum.conference,  date=date(2025, 8, 10), time=time(9, 0),  location="Bangalore Tech Park",        speaker="Sanjay Kumar",     capacity=150, registered=89,  waitlist=0,  price=0,   status=StatusEnum.upcoming),
]

DEFAULT_ADMIN = User(
    name            = "Admin",
    email           = "admin@eventflow.com",
    hashed_password = hash_password("admin123"),
    role            = RoleEnum.admin,
)

db = SessionLocal()
try:
    # Seed events
    if db.query(Event).count() == 0:
        db.add_all(SAMPLE_EVENTS)
        db.commit()
        print(f"✅ Seeded {len(SAMPLE_EVENTS)} events.")
    else:
        print("ℹ️  Events already seeded — skipping.")

    # Seed admin user
    if not db.query(User).filter(User.email == DEFAULT_ADMIN.email).first():
        db.add(DEFAULT_ADMIN)
        db.commit()
        print("✅ Default admin created — email: admin@eventflow.com / password: admin123")
    else:
        print("ℹ️  Admin user already exists — skipping.")

finally:
    db.close()