"""Library endpoints for QR items, folders, and tags management."""
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc
from pydantic import BaseModel, Field
from .database import get_db
from .models import QRItem, Folder, Tag, AuditLog, Account, QRItemTag
from .auth import require_auth
from .logging_config import setup_logging

logger = setup_logging()
router = APIRouter(prefix="/library", tags=["library"])


# Pydantic schemas
class TagSchema(BaseModel):
    id: UUID
    name: str
    color: str
    created_at: datetime

    model_config = {"from_attributes": True}


class FolderSchema(BaseModel):
    id: UUID
    name: str
    parent_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class QRItemSchema(BaseModel):
    id: UUID
    name: str
    type: str
    payload: dict
    options: dict
    folder_id: Optional[UUID] = None
    tags: List[TagSchema] = []
    deleted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class QRItemCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    type: str = Field(..., pattern="^(url|text|wifi|vcard|event)$")
    payload: dict
    options: dict = {}
    folder_id: Optional[UUID] = None
    tag_ids: List[UUID] = []


class QRItemUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    payload: Optional[dict] = None
    options: Optional[dict] = None
    folder_id: Optional[UUID] = None
    tag_ids: Optional[List[UUID]] = None


class FolderCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    parent_id: Optional[UUID] = None


class FolderUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    parent_id: Optional[UUID] = None


class TagCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    color: str = Field(default="#0070f3", pattern="^#[0-9A-Fa-f]{6}$")


class QRItemListResponse(BaseModel):
    items: List[QRItemSchema]
    total: int
    page: int
    per_page: int


class FolderListResponse(BaseModel):
    folders: List[FolderSchema]


class TagListResponse(BaseModel):
    tags: List[TagSchema]


# Helper functions
def get_user_account(db: Session, user: dict) -> Account:
    """Get or create user account from Auth0 token."""
    auth_sub = user.get("sub")
    email = user.get("email", f"{auth_sub}@auth0.local")
    
    account = db.query(Account).filter(Account.auth_sub == auth_sub).first()
    if not account:
        account = Account(auth_sub=auth_sub, email=email)
        db.add(account)
        db.commit()
        db.refresh(account)
    
    return account


def log_audit(db: Session, user_id: UUID, action: str, resource_type: str, resource_id: UUID, extra_data: dict = None):
    """Log audit event."""
    audit = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        extra_data=extra_data or {}
    )
    db.add(audit)
    db.commit()
    
    logger.info({
        "event": "audit",
        "user_id": str(user_id),
        "action": action,
        "resource_type": resource_type,
        "resource_id": str(resource_id)
    })


# QR Items endpoints
@router.get("/qr-items", response_model=QRItemListResponse)
def list_qr_items(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort_by: str = Query("created_at", pattern="^(name|created_at|updated_at|type)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    folder_id: Optional[UUID] = None,
    tag_id: Optional[UUID] = None,
    search: Optional[str] = None,
    deleted: bool = False,
    user: dict = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """List QR items for authenticated user with pagination, filtering, and sorting."""
    account = get_user_account(db, user)
    
    # Build query
    query = db.query(QRItem).filter(QRItem.owner_id == account.id)
    
    # Filter by deleted status
    if deleted:
        query = query.filter(QRItem.deleted_at.isnot(None))
    else:
        query = query.filter(QRItem.deleted_at.is_(None))
    
    # Filter by folder
    if folder_id:
        query = query.filter(QRItem.folder_id == folder_id)
    
    # Filter by tag
    if tag_id:
        query = query.join(QRItem.tags).filter(Tag.id == tag_id)
    
    # Search by name
    if search:
        query = query.filter(QRItem.name.ilike(f"%{search}%"))
    
    # Count total
    total = query.count()
    
    # Apply sorting
    sort_column = getattr(QRItem, sort_by)
    if sort_order == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(asc(sort_column))
    
    # Paginate
    offset = (page - 1) * per_page
    items = query.offset(offset).limit(per_page).all()
    
    logger.info({
        "event": "list_qr_items",
        "user_id": str(account.id),
        "page": page,
        "per_page": per_page,
        "total": total
    })
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page
    }


@router.post("/qr-items", response_model=QRItemSchema, status_code=201)
def create_qr_item(
    item: QRItemCreate,
    user: dict = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """Create a new QR item."""
    account = get_user_account(db, user)
    
    # Create QR item
    qr_item = QRItem(
        owner_id=account.id,
        name=item.name,
        type=item.type,
        payload=item.payload,
        options=item.options,
        folder_id=item.folder_id
    )
    db.add(qr_item)
    db.flush()
    
    # Add tags
    if item.tag_ids:
        for tag_id in item.tag_ids:
            tag = db.query(Tag).filter(Tag.id == tag_id, Tag.owner_id == account.id).first()
            if tag:
                qr_item.tags.append(tag)
    
    db.commit()
    db.refresh(qr_item)
    
    log_audit(db, account.id, "create", "qr_item", qr_item.id, {"name": item.name, "type": item.type})
    
    logger.info({
        "event": "create_qr_item",
        "user_id": str(account.id),
        "qr_item_id": str(qr_item.id),
        "name": item.name,
        "type": item.type
    })
    
    return qr_item


@router.get("/qr-items/{item_id}", response_model=QRItemSchema)
def get_qr_item(
    item_id: UUID,
    user: dict = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """Get QR item by ID."""
    account = get_user_account(db, user)
    
    qr_item = db.query(QRItem).filter(
        QRItem.id == item_id,
        QRItem.owner_id == account.id
    ).first()
    
    if not qr_item:
        raise HTTPException(status_code=404, detail="QR item not found")
    
    return qr_item


@router.put("/qr-items/{item_id}", response_model=QRItemSchema)
def update_qr_item(
    item_id: UUID,
    item_update: QRItemUpdate,
    user: dict = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """Update QR item."""
    account = get_user_account(db, user)
    
    qr_item = db.query(QRItem).filter(
        QRItem.id == item_id,
        QRItem.owner_id == account.id
    ).first()
    
    if not qr_item:
        raise HTTPException(status_code=404, detail="QR item not found")
    
    # Update fields
    if item_update.name is not None:
        qr_item.name = item_update.name
    if item_update.payload is not None:
        qr_item.payload = item_update.payload
    if item_update.options is not None:
        qr_item.options = item_update.options
    if item_update.folder_id is not None:
        qr_item.folder_id = item_update.folder_id
    
    # Update tags
    if item_update.tag_ids is not None:
        qr_item.tags.clear()
        for tag_id in item_update.tag_ids:
            tag = db.query(Tag).filter(Tag.id == tag_id, Tag.owner_id == account.id).first()
            if tag:
                qr_item.tags.append(tag)
    
    db.commit()
    db.refresh(qr_item)
    
    log_audit(db, account.id, "update", "qr_item", qr_item.id, {"name": qr_item.name})
    
    logger.info({
        "event": "update_qr_item",
        "user_id": str(account.id),
        "qr_item_id": str(item_id)
    })
    
    return qr_item


@router.delete("/qr-items/{item_id}", status_code=204)
def delete_qr_item(
    item_id: UUID,
    user: dict = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """Soft delete QR item."""
    account = get_user_account(db, user)
    
    qr_item = db.query(QRItem).filter(
        QRItem.id == item_id,
        QRItem.owner_id == account.id,
        QRItem.deleted_at.is_(None)
    ).first()
    
    if not qr_item:
        raise HTTPException(status_code=404, detail="QR item not found")
    
    qr_item.deleted_at = datetime.utcnow()
    db.commit()
    
    log_audit(db, account.id, "delete", "qr_item", qr_item.id, {"name": qr_item.name})
    
    logger.info({
        "event": "delete_qr_item",
        "user_id": str(account.id),
        "qr_item_id": str(item_id)
    })


@router.post("/qr-items/{item_id}/restore", response_model=QRItemSchema)
def restore_qr_item(
    item_id: UUID,
    user: dict = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """Restore soft-deleted QR item."""
    account = get_user_account(db, user)
    
    qr_item = db.query(QRItem).filter(
        QRItem.id == item_id,
        QRItem.owner_id == account.id,
        QRItem.deleted_at.isnot(None)
    ).first()
    
    if not qr_item:
        raise HTTPException(status_code=404, detail="Deleted QR item not found")
    
    qr_item.deleted_at = None
    db.commit()
    db.refresh(qr_item)
    
    log_audit(db, account.id, "restore", "qr_item", qr_item.id, {"name": qr_item.name})
    
    logger.info({
        "event": "restore_qr_item",
        "user_id": str(account.id),
        "qr_item_id": str(item_id)
    })
    
    return qr_item


@router.post("/qr-items/{item_id}/duplicate", response_model=QRItemSchema, status_code=201)
def duplicate_qr_item(
    item_id: UUID,
    user: dict = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """Duplicate QR item."""
    account = get_user_account(db, user)
    
    original = db.query(QRItem).filter(
        QRItem.id == item_id,
        QRItem.owner_id == account.id,
        QRItem.deleted_at.is_(None)
    ).first()
    
    if not original:
        raise HTTPException(status_code=404, detail="QR item not found")
    
    # Create duplicate
    duplicate = QRItem(
        owner_id=account.id,
        name=f"{original.name} (Copy)",
        type=original.type,
        payload=original.payload,
        options=original.options,
        folder_id=original.folder_id
    )
    db.add(duplicate)
    db.flush()
    
    # Copy tags
    for tag in original.tags:
        duplicate.tags.append(tag)
    
    db.commit()
    db.refresh(duplicate)
    
    log_audit(db, account.id, "duplicate", "qr_item", duplicate.id, {
        "original_id": str(item_id),
        "name": duplicate.name
    })
    
    logger.info({
        "event": "duplicate_qr_item",
        "user_id": str(account.id),
        "original_id": str(item_id),
        "duplicate_id": str(duplicate.id)
    })
    
    return duplicate


# Folders endpoints
@router.get("/folders", response_model=FolderListResponse)
def list_folders(
    user: dict = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """List all folders for authenticated user."""
    account = get_user_account(db, user)
    
    folders = db.query(Folder).filter(Folder.owner_id == account.id).order_by(Folder.name).all()
    
    logger.info({
        "event": "list_folders",
        "user_id": str(account.id),
        "count": len(folders)
    })
    
    return {"folders": folders}


@router.post("/folders", response_model=FolderSchema, status_code=201)
def create_folder(
    folder: FolderCreate,
    user: dict = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """Create a new folder."""
    account = get_user_account(db, user)
    
    # Check for duplicate name
    existing = db.query(Folder).filter(
        Folder.owner_id == account.id,
        Folder.name == folder.name,
        Folder.parent_id == folder.parent_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Folder with this name already exists")
    
    new_folder = Folder(
        owner_id=account.id,
        name=folder.name,
        parent_id=folder.parent_id
    )
    db.add(new_folder)
    db.commit()
    db.refresh(new_folder)
    
    log_audit(db, account.id, "create", "folder", new_folder.id, {"name": folder.name})
    
    logger.info({
        "event": "create_folder",
        "user_id": str(account.id),
        "folder_id": str(new_folder.id),
        "name": folder.name
    })
    
    return new_folder


@router.put("/folders/{folder_id}", response_model=FolderSchema)
def update_folder(
    folder_id: UUID,
    folder_update: FolderUpdate,
    user: dict = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """Update folder."""
    account = get_user_account(db, user)
    
    folder = db.query(Folder).filter(
        Folder.id == folder_id,
        Folder.owner_id == account.id
    ).first()
    
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    if folder_update.name is not None:
        folder.name = folder_update.name
    if folder_update.parent_id is not None:
        folder.parent_id = folder_update.parent_id
    
    db.commit()
    db.refresh(folder)
    
    log_audit(db, account.id, "update", "folder", folder.id, {"name": folder.name})
    
    logger.info({
        "event": "update_folder",
        "user_id": str(account.id),
        "folder_id": str(folder_id)
    })
    
    return folder


@router.delete("/folders/{folder_id}", status_code=204)
def delete_folder(
    folder_id: UUID,
    user: dict = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """Delete folder."""
    account = get_user_account(db, user)
    
    folder = db.query(Folder).filter(
        Folder.id == folder_id,
        Folder.owner_id == account.id
    ).first()
    
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    db.delete(folder)
    db.commit()
    
    log_audit(db, account.id, "delete", "folder", folder.id, {"name": folder.name})
    
    logger.info({
        "event": "delete_folder",
        "user_id": str(account.id),
        "folder_id": str(folder_id)
    })


# Tags endpoints
@router.get("/tags", response_model=TagListResponse)
def list_tags(
    user: dict = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """List all tags for authenticated user."""
    account = get_user_account(db, user)
    
    tags = db.query(Tag).filter(Tag.owner_id == account.id).order_by(Tag.name).all()
    
    logger.info({
        "event": "list_tags",
        "user_id": str(account.id),
        "count": len(tags)
    })
    
    return {"tags": tags}


@router.post("/tags", response_model=TagSchema, status_code=201)
def create_tag(
    tag: TagCreate,
    user: dict = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """Create a new tag."""
    account = get_user_account(db, user)
    
    # Check for duplicate name
    existing = db.query(Tag).filter(
        Tag.owner_id == account.id,
        Tag.name == tag.name
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Tag with this name already exists")
    
    new_tag = Tag(
        owner_id=account.id,
        name=tag.name,
        color=tag.color
    )
    db.add(new_tag)
    db.commit()
    db.refresh(new_tag)
    
    log_audit(db, account.id, "create", "tag", new_tag.id, {"name": tag.name})
    
    logger.info({
        "event": "create_tag",
        "user_id": str(account.id),
        "tag_id": str(new_tag.id),
        "name": tag.name
    })
    
    return new_tag
