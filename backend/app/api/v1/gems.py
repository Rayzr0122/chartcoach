"""
Gems Domain Version 1 API Routes for ChartCoach.
Complies with Sections 26, 27, 28, 29 of Phase 1 Specification.
"""

from fastapi import APIRouter, Depends
from pymongo.database import Database

from app.api.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.services.gem_service import GemService

router = APIRouter(prefix="/api/v1/gems", tags=["gems-v1"])


@router.get("/wallet")
def get_gem_wallet(
    current_user: User = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """
    Returns the user's current spendable Gems balance,
    allocation metrics, and recent immutable ledger transactions.
    """
    service = GemService(db)
    return service.get_wallet_summary(current_user)


@router.get("/packages")
def list_gem_packages(
    db: Database = Depends(get_db),
):
    """
    Returns available top-up gem packages (Section 31-35).
    """
    service = GemService(db)
    return service.list_packages()


from pydantic import BaseModel


class GemCheckoutIn(BaseModel):
    package_id: str


class GemVerifyIn(BaseModel):
    package_id: str
    payment_id: str


@router.post("/checkout")
def checkout_gem_package(
    data: GemCheckoutIn,
    current_user: User = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """
    Initiates payment checkout for a top-up gem pack.
    """
    service = GemService(db)
    packages = service.list_packages()
    pkg = next((p for p in packages if p.get("package_id") == data.package_id), None)
    if not pkg:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gem package not found")

    return {
        "packageId": pkg["package_id"],
        "name": pkg["name"],
        "gems": pkg["gems"],
        "price": pkg["price"],
        "amount": pkg["price"] * 100,
        "currency": "INR",
        "keyId": "rzp_test_mock_key",
        "isMock": True,
    }


@router.post("/verify")
def verify_gem_purchase(
    data: GemVerifyIn,
    current_user: User = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """
    Verifies payment and credits purchased gems to user's wallet.
    """
    service = GemService(db)
    try:
        return service.purchase_gems(
            user=current_user,
            package_id=data.package_id,
            payment_id=data.payment_id,
        )
    except ValueError as exc:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

