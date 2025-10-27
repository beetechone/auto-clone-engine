"""Template endpoints for public gallery and admin management."""
from typing import List, Optional
from uuid import UUID
import json
import hashlib
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from pydantic import BaseModel, Field
from .database import get_db
from .models import Template, TemplateCategory, TemplateAsset, Account
from .auth import require_auth
from .logging_config import setup_logging
from .storage import upload_file_to_s3, validate_upload_file
from .cache import get_cache, set_cache, delete_cache

logger = setup_logging()

# Public router (no auth required)
public_router = APIRouter(prefix="/templates", tags=["templates-public"])

# Admin router (auth required)
admin_router = APIRouter(prefix="/admin/templates", tags=["templates-admin"])


# Pydantic schemas
class TemplateCategorySchema(BaseModel):
    id: UUID
    name: str
    slug: str
    description: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class TemplateAssetSchema(BaseModel):
    id: UUID
    asset_type: str
    file_name: str
    file_size: str
    mime_type: str
    s3_url: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TemplateSchema(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    category_id: Optional[UUID] = None
    category: Optional[TemplateCategorySchema] = None
    type: str
    payload_template: dict
    options_template: dict
    variables: dict
    tags: list
    preview_url: Optional[str] = None
    is_published: bool
    assets: List[TemplateAssetSchema] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TemplateListResponse(BaseModel):
    templates: List[TemplateSchema]
    total: int
    page: int
    per_page: int


class TemplateCategoryListResponse(BaseModel):
    categories: List[TemplateCategorySchema]


class TemplateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    category_id: Optional[UUID] = None
    type: str = Field(..., pattern="^(url|text|wifi|vcard|event)$")
    payload_template: dict
    options_template: dict = {}
    variables: dict = {}
    tags: list = []
    preview_url: Optional[str] = None
    is_published: bool = False


class TemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    category_id: Optional[UUID] = None
    payload_template: Optional[dict] = None
    options_template: Optional[dict] = None
    variables: Optional[dict] = None
    tags: Optional[list] = None
    preview_url: Optional[str] = None
    is_published: Optional[bool] = None


class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=100, pattern="^[a-z0-9-]+$")
    description: Optional[str] = None


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


def check_admin_role(user: dict):
    """Check if user has admin role."""
    # For now, check if user email is in admin list or has admin role in token
    roles = user.get("https://qr-cloner.local/roles", [])
    if "admin" not in roles:
        raise HTTPException(status_code=403, detail="Admin access required")


# Public endpoints (no auth required)
@public_router.get("", response_model=TemplateListResponse)
def list_templates(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort_by: str = Query("created_at", pattern="^(name|created_at|updated_at)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    category_id: Optional[UUID] = None,
    tag: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List published templates with pagination, filtering, and sorting (public)."""
    # Try to get from cache
    cache_key = f"templates:page={page}:per_page={per_page}:sort={sort_by}:{sort_order}:cat={category_id}:tag={tag}:search={search}"
    cached = get_cache(cache_key)
    if cached:
        logger.info({"event": "list_templates_cache_hit", "cache_key": cache_key})
        return json.loads(cached)
    
    # Build query - only published templates
    query = db.query(Template).filter(Template.is_published == True)
    
    # Filter by category
    if category_id:
        query = query.filter(Template.category_id == category_id)
    
    # Filter by tag
    if tag:
        query = query.filter(Template.tags.contains([tag]))
    
    # Search by name or description
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Template.name.ilike(search_pattern)) | 
            (Template.description.ilike(search_pattern))
        )
    
    # Count total
    total = query.count()
    
    # Apply sorting
    sort_column = getattr(Template, sort_by)
    if sort_order == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(asc(sort_column))
    
    # Paginate
    offset = (page - 1) * per_page
    templates = query.offset(offset).limit(per_page).all()
    
    result = {
        "templates": templates,
        "total": total,
        "page": page,
        "per_page": per_page
    }
    
    # Cache for 5 minutes
    set_cache(cache_key, json.dumps(result, default=str), ttl=300)
    
    logger.info({
        "event": "list_templates",
        "page": page,
        "per_page": per_page,
        "total": total,
        "cached": False
    })
    
    return result


@public_router.get("/categories", response_model=TemplateCategoryListResponse)
def list_categories(db: Session = Depends(get_db)):
    """List all template categories (public)."""
    # Try cache first
    cache_key = "template_categories:all"
    cached = get_cache(cache_key)
    if cached:
        return json.loads(cached)
    
    categories = db.query(TemplateCategory).order_by(TemplateCategory.name).all()
    
    result = {"categories": categories}
    
    # Cache for 1 hour
    set_cache(cache_key, json.dumps(result, default=str), ttl=3600)
    
    logger.info({"event": "list_categories", "count": len(categories)})
    
    return result


@public_router.get("/{template_id}", response_model=TemplateSchema)
def get_template(template_id: UUID, db: Session = Depends(get_db)):
    """Get template by ID (public, only if published)."""
    template = db.query(Template).filter(
        Template.id == template_id,
        Template.is_published == True
    ).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    logger.info({"event": "get_template", "template_id": str(template_id)})
    
    return template


# Admin endpoints (auth required)
@admin_router.get("", response_model=TemplateListResponse)
def admin_list_templates(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort_by: str = Query("created_at", pattern="^(name|created_at|updated_at)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    category_id: Optional[UUID] = None,
    is_published: Optional[bool] = None,
    user: dict = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """List all templates (admin, includes unpublished)."""
    check_admin_role(user)
    
    # Build query - all templates
    query = db.query(Template)
    
    # Filter by category
    if category_id:
        query = query.filter(Template.category_id == category_id)
    
    # Filter by published status
    if is_published is not None:
        query = query.filter(Template.is_published == is_published)
    
    # Count total
    total = query.count()
    
    # Apply sorting
    sort_column = getattr(Template, sort_by)
    if sort_order == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(asc(sort_column))
    
    # Paginate
    offset = (page - 1) * per_page
    templates = query.offset(offset).limit(per_page).all()
    
    logger.info({
        "event": "admin_list_templates",
        "user_id": user.get("sub"),
        "page": page,
        "total": total
    })
    
    return {
        "templates": templates,
        "total": total,
        "page": page,
        "per_page": per_page
    }


@admin_router.post("", response_model=TemplateSchema, status_code=201)
def admin_create_template(
    template: TemplateCreate,
    user: dict = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """Create new template (admin)."""
    check_admin_role(user)
    
    new_template = Template(
        name=template.name,
        description=template.description,
        category_id=template.category_id,
        type=template.type,
        payload_template=template.payload_template,
        options_template=template.options_template,
        variables=template.variables,
        tags=template.tags,
        preview_url=template.preview_url,
        is_published=template.is_published
    )
    
    db.add(new_template)
    db.commit()
    db.refresh(new_template)
    
    # Invalidate cache
    delete_cache("templates:*")
    
    logger.info({
        "event": "admin_create_template",
        "user_id": user.get("sub"),
        "template_id": str(new_template.id),
        "name": template.name
    })
    
    return new_template


@admin_router.get("/{template_id}", response_model=TemplateSchema)
def admin_get_template(
    template_id: UUID,
    user: dict = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """Get template by ID (admin, includes unpublished)."""
    check_admin_role(user)
    
    template = db.query(Template).filter(Template.id == template_id).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return template


@admin_router.put("/{template_id}", response_model=TemplateSchema)
def admin_update_template(
    template_id: UUID,
    template_update: TemplateUpdate,
    user: dict = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """Update template (admin)."""
    check_admin_role(user)
    
    template = db.query(Template).filter(Template.id == template_id).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Update fields
    if template_update.name is not None:
        template.name = template_update.name
    if template_update.description is not None:
        template.description = template_update.description
    if template_update.category_id is not None:
        template.category_id = template_update.category_id
    if template_update.payload_template is not None:
        template.payload_template = template_update.payload_template
    if template_update.options_template is not None:
        template.options_template = template_update.options_template
    if template_update.variables is not None:
        template.variables = template_update.variables
    if template_update.tags is not None:
        template.tags = template_update.tags
    if template_update.preview_url is not None:
        template.preview_url = template_update.preview_url
    if template_update.is_published is not None:
        template.is_published = template_update.is_published
    
    db.commit()
    db.refresh(template)
    
    # Invalidate cache
    delete_cache("templates:*")
    
    logger.info({
        "event": "admin_update_template",
        "user_id": user.get("sub"),
        "template_id": str(template_id)
    })
    
    return template


@admin_router.delete("/{template_id}", status_code=204)
def admin_delete_template(
    template_id: UUID,
    user: dict = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """Delete template (admin)."""
    check_admin_role(user)
    
    template = db.query(Template).filter(Template.id == template_id).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    db.delete(template)
    db.commit()
    
    # Invalidate cache
    delete_cache("templates:*")
    
    logger.info({
        "event": "admin_delete_template",
        "user_id": user.get("sub"),
        "template_id": str(template_id)
    })


@admin_router.post("/{template_id}/publish", response_model=TemplateSchema)
def admin_publish_template(
    template_id: UUID,
    user: dict = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """Publish template (admin)."""
    check_admin_role(user)
    
    template = db.query(Template).filter(Template.id == template_id).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    template.is_published = True
    db.commit()
    db.refresh(template)
    
    # Invalidate cache
    delete_cache("templates:*")
    
    logger.info({
        "event": "admin_publish_template",
        "user_id": user.get("sub"),
        "template_id": str(template_id)
    })
    
    return template


@admin_router.post("/{template_id}/unpublish", response_model=TemplateSchema)
def admin_unpublish_template(
    template_id: UUID,
    user: dict = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """Unpublish template (admin)."""
    check_admin_role(user)
    
    template = db.query(Template).filter(Template.id == template_id).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    template.is_published = False
    db.commit()
    db.refresh(template)
    
    # Invalidate cache
    delete_cache("templates:*")
    
    logger.info({
        "event": "admin_unpublish_template",
        "user_id": user.get("sub"),
        "template_id": str(template_id)
    })
    
    return template


# Upload endpoint
@admin_router.post("/upload", status_code=201)
async def admin_upload_asset(
    file: UploadFile = File(...),
    template_id: UUID = Form(...),
    asset_type: str = Form(..., pattern="^(logo|image|icon)$"),
    user: dict = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """Upload asset for template (admin)."""
    check_admin_role(user)
    
    # Validate template exists
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Validate file
    validate_upload_file(file)
    
    # Upload to S3/MinIO
    s3_key, s3_url = await upload_file_to_s3(file, f"templates/{template_id}")
    
    # Save asset record
    asset = TemplateAsset(
        template_id=template_id,
        asset_type=asset_type,
        file_name=file.filename,
        file_size=str(file.size) if file.size else "0",
        mime_type=file.content_type,
        s3_key=s3_key,
        s3_url=s3_url
    )
    
    db.add(asset)
    db.commit()
    db.refresh(asset)
    
    logger.info({
        "event": "admin_upload_asset",
        "user_id": user.get("sub"),
        "template_id": str(template_id),
        "asset_id": str(asset.id),
        "file_name": file.filename
    })
    
    return {
        "id": str(asset.id),
        "s3_url": s3_url,
        "file_name": file.filename
    }


# Category management
@admin_router.post("/categories", response_model=TemplateCategorySchema, status_code=201)
def admin_create_category(
    category: CategoryCreate,
    user: dict = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """Create template category (admin)."""
    check_admin_role(user)
    
    # Check for duplicate
    existing = db.query(TemplateCategory).filter(
        (TemplateCategory.name == category.name) | (TemplateCategory.slug == category.slug)
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Category with this name or slug already exists")
    
    new_category = TemplateCategory(
        name=category.name,
        slug=category.slug,
        description=category.description
    )
    
    db.add(new_category)
    db.commit()
    db.refresh(new_category)
    
    # Invalidate cache
    delete_cache("template_categories:*")
    
    logger.info({
        "event": "admin_create_category",
        "user_id": user.get("sub"),
        "category_id": str(new_category.id),
        "name": category.name
    })
    
    return new_category
