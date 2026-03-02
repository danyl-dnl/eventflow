# EventFlow: Registration & Capacity Manager

[cite_start]**EventFlow** is a full-stack event registration and capacity management system[cite: 6]. [cite_start]It is designed to allow students to browse and register for events while providing administrators with robust tools to manage the event lifecycle, monitor real-time capacity, and export data[cite: 7].

---

## 🚀 Key Features

* [cite_start]**Real-time Capacity Tracking:** Live capacity bars with fill percentages and a scrolling live ticker banner[cite: 8].
* [cite_start]**Automated Waitlisting:** Intelligent system that auto-waitlists users when full and promotes them automatically upon cancellations[cite: 8, 74].
* [cite_start]**Role-Based Portals:** Distinct, secure interfaces for Students (Event discovery) and Admins (Management & Dashboard)[cite: 8].
* [cite_start]**Interactive Calendar:** Admin-only calendar for event visualization and inline event creation[cite: 8, 68].
* [cite_start]**Data Portability:** Client-side CSV export for registration data across various statuses[cite: 8, 69].
* [cite_start]**JWT Security:** Robust authentication system with role-based access guards[cite: 8, 40].

---

## 🛠 Technology Stack

### Backend
* [cite_start]**Framework:** FastAPI (Python) with Uvicorn ASGI server[cite: 10].
* [cite_start]**Database & ORM:** SQLite with SQLAlchemy (Declarative models)[cite: 10].
* [cite_start]**Migrations:** Alembic for database schema management[cite: 10].
* [cite_start]**Validation:** Pydantic v2 for request/response schemas and field validation[cite: 10].
* [cite_start]**Authentication:** `python-jose` (JWT) and `passlib` (Bcrypt 4.0.1)[cite: 10].

### Frontend
* [cite_start]**Core:** Vanilla JS, HTML5, and CSS3 (No frameworks used)[cite: 10].
* [cite_start]**Design System:** Custom CSS tokens with a "warm parchment" aesthetic[cite: 93, 94].
* [cite_start]**Typography:** *Bebas Neue* for display titles and *Outfit* for body text[cite: 10, 94].

---

## 📂 Project Structure



### Backend (`backend/`)
| File | Purpose |
| :--- | :--- |
| `main.py` | [cite_start]FastAPI entry point and router registration[cite: 13]. |
| `app/models/` | [cite_start]SQLAlchemy ORM models (User, Event, Registration)[cite: 13]. |
| `app/schemas/` | [cite_start]Pydantic request/response schemas[cite: 13]. |
| `app/core/` | [cite_start]Database configuration and Auth utilities[cite: 13]. |
| `app/routes/` | [cite_start]API endpoints for events, registrations, and stats[cite: 13]. |

### Frontend (Root)
| Directory/File | Purpose |
| :--- | :--- |
| `/` | [cite_start]HTML entry points for Student and Admin portals[cite: 15]. |
| `/css/styles.css` | [cite_start]Global design system and component styles[cite: 15]. |
| `/js/auth.js` | [cite_start]In-memory JWT session and route guards[cite: 15]. |
| `/js/app.js` | [cite_start]Main logic for the Student portal[cite: 15]. |
| `/js/admin-app.js`| [cite_start]Main logic for the Admin portal[cite: 15]. |

---

## 🔐 Authentication & Roles

[cite_start]EventFlow uses an **in-memory JWT session** strategy to enhance security[cite: 40].
* [cite_start]**Students:** Can self-register and login via `student-login.html`[cite: 48, 49].
* [cite_start]**Admins:** Accounts are created via `seed.py` only; no public registration is available[cite: 40, 53].
* [cite_start]**Guards:** Frontend guards (`requireStudent`/`requireAdmin`) and backend dependencies ensure role-based access[cite: 40].

---

## ⚙️ Setup & Installation

### 1. Backend Setup
```bash
# Install dependencies
pip install fastapi uvicorn sqlalchemy alembic pydantic[email] "python-jose[cryptography]" "passlib[bcrypt]" bcrypt==4.0.1

# Seed the database (Creates tables + default admin)
cd backend && python seed.py

# Start the API server
uvicorn main:app --reload
