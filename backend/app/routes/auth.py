# ═══════════════════════════════════════════════
# AUTH ROUTES — Register & Login
# ═══════════════════════════════════════════════
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth_utils import hash_password, verify_password, create_access_token
from app.models.models import User, RoleEnum
from app.schemas.schemas import UserRegister, UserLogin, TokenResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["Auth"])


# ── REGISTER (students only — admins are seeded) ─
@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    # Check duplicate email
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists"
        )

    user = User(
        name            = payload.name,
        email           = payload.email,
        hashed_password = hash_password(payload.password),
        role            = RoleEnum.student,   # public registration is always student
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


# ── LOGIN ──────────────────────────────────────
@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Ensure the role they're logging in as matches their actual role
    if user.role != payload.role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"This account is not registered as {payload.role}"
        )

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


# ── ME (verify token + get current user info) ──
@router.get("/me", response_model=UserResponse)
def me(db: Session = Depends(get_db), token: str = None):
    # Lightweight endpoint the frontend can ping to validate a stored token
    from app.core.auth_utils import get_current_user
    from fastapi import Request
    # Handled via get_current_user dependency in protected routes
    # This is intentionally minimal — frontend uses /me to rehydrate session
    raise HTTPException(status_code=501, detail="Use Authorization header")