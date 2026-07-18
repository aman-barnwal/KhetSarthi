from typing import Optional, List, Annotated, Any
from pydantic import BaseModel, Field, BeforeValidator, EmailStr, ConfigDict
from datetime import datetime, timezone
from bson import ObjectId


def _coerce_oid(v: Any) -> str:
    if isinstance(v, ObjectId):
        return str(v)
    return v


PyObjectId = Annotated[str, BeforeValidator(_coerce_oid)]


def now_iso():
    return datetime.now(timezone.utc).isoformat()


class BaseDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")
    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    def to_mongo(self) -> dict:
        d = self.model_dump(by_alias=True, exclude_none=True)
        d.pop("_id", None)
        return d

    @classmethod
    def from_mongo(cls, doc: dict):
        if doc is None:
            return None
        return cls.model_validate(doc)


# ---- Auth ----
class RegisterInput(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class LoginInput(BaseModel):
    email: str = Field(min_length=2, max_length=120)  # email or admin ID
    password: str


class ForgotInput(BaseModel):
    email: EmailStr


class ResetInput(BaseModel):
    token: str
    password: str = Field(min_length=6, max_length=128)


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    language: Optional[str] = None
    role: Optional[str] = None  # farmer | vendor
    onboarded: Optional[bool] = None
    farmer_profile: Optional[dict] = None
    vendor_profile: Optional[dict] = None
    notification_prefs: Optional[dict] = None
    location: Optional[dict] = None  # {lat, lon, village, district, state}


# ---- Feature inputs ----
class CropInput(BaseModel):
    name: str
    variety: Optional[str] = None
    plot: Optional[str] = None
    area: Optional[float] = None
    area_unit: Optional[str] = "acre"
    sowing_date: Optional[str] = None
    growth_stage: Optional[str] = "sowing"
    expected_harvest_date: Optional[str] = None
    notes: Optional[str] = None


class DiaryInput(BaseModel):
    activity_type: str  # sowing, irrigation, fertilizer, pesticide, labor, machinery, rainfall, harvest, transport, other
    crop_id: Optional[str] = None
    date: str
    description: Optional[str] = None
    quantity: Optional[str] = None
    cost: Optional[float] = None


class ExpenseInput(BaseModel):
    category: str  # seeds, fertilizer, crop_protection, labor, machinery, transport, irrigation, rent, storage, misc
    amount: float = Field(gt=0)
    crop_id: Optional[str] = None
    date: str
    note: Optional[str] = None
    kind: str = "expense"  # expense | revenue


class ReminderInput(BaseModel):
    title: str
    reminder_type: str = "other"  # irrigation, fertilizer, spraying, crop_check, harvest, market, scheme, other
    due_date: str
    crop_id: Optional[str] = None
    note: Optional[str] = None


class DemandInput(BaseModel):
    commodity: str
    variety: Optional[str] = None
    quantity: float = Field(gt=0)
    unit: str = "quintal"
    required_by: Optional[str] = None
    quality_grade: Optional[str] = None
    location_text: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    offered_price: Optional[float] = None
    delivery_mode: Optional[str] = "pickup"
    notes: Optional[str] = None


class HarvestInput(BaseModel):
    commodity: str
    variety: Optional[str] = None
    expected_quantity: float = Field(gt=0)
    unit: str = "quintal"
    harvest_window_start: Optional[str] = None
    harvest_window_end: Optional[str] = None
    quality_grade: Optional[str] = None
    location_text: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None


class ListingInput(BaseModel):
    listing_type: str = "produce"  # produce (farmer) | input (vendor)
    title: str
    commodity: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = "quintal"
    grade: Optional[str] = None
    price: Optional[float] = None
    price_unit: Optional[str] = "per quintal"
    harvest_date: Optional[str] = None
    location_text: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    delivery_mode: Optional[str] = "pickup"
    description: Optional[str] = None
    image_base64: Optional[str] = None


class EnquiryInput(BaseModel):
    listing_id: Optional[str] = None
    demand_id: Optional[str] = None
    message: str = Field(min_length=1, max_length=1000)
    offer_price: Optional[float] = None
    quantity: Optional[float] = None


class ChatInput(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    session_id: Optional[str] = None
    language: Optional[str] = "en"


class ScanContext(BaseModel):
    crop_type: Optional[str] = None
    symptoms: Optional[str] = None
    growth_stage: Optional[str] = None
    language: Optional[str] = "en"


class ManagedPriceInput(BaseModel):
    commodity: str = Field(min_length=2, max_length=80)
    unit: str = "quintal"
    msp: Optional[float] = None
    market_price: Optional[float] = None
    fpo_price: Optional[float] = None


class BulkPriceUpdate(BaseModel):
    field: str = "market_price"  # msp | market_price | fpo_price
    mode: str = "percent"        # percent | set
    value: float
    ids: Optional[List[str]] = None  # None = all


class VendorCreateInput(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    business_name: str
    contact: Optional[str] = None
    categories: List[str] = []
    service_area: Optional[str] = None
    location_text: Optional[str] = None
    verified: bool = False


class PriceAlertInput(BaseModel):
    commodity: str
    threshold: float
    direction: str = "above"
