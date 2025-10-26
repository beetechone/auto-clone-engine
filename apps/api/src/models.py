"""SQLAlchemy models for QR items, folders, tags, and audit log."""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, ForeignKey, DateTime, Text, CheckConstraint, UniqueConstraint, Index, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class Account(Base):
    """User account model."""
    __tablename__ = "accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False)
    auth_sub = Column(String, unique=True, nullable=False)  # Auth0 subject ID
    plan = Column(String, default="free")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    qr_items = relationship("QRItem", back_populates="owner", cascade="all, delete-orphan")
    folders = relationship("Folder", back_populates="owner", cascade="all, delete-orphan")
    tags = relationship("Tag", back_populates="owner", cascade="all, delete-orphan")


class QRItem(Base):
    """QR code item with soft delete support."""
    __tablename__ = "qr_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    type = Column(String, nullable=False)
    payload = Column(JSONB, nullable=False)
    options = Column(JSONB, nullable=False, default={})
    folder_id = Column(UUID(as_uuid=True), ForeignKey("folders.id", ondelete="SET NULL"), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Constraints
    __table_args__ = (
        CheckConstraint("type IN ('url', 'text', 'wifi', 'vcard', 'event')", name="qr_item_type_check"),
        Index("idx_qr_items_owner", "owner_id"),
        Index("idx_qr_items_deleted", "owner_id", "deleted_at"),
        Index("idx_qr_items_folder", "folder_id"),
    )

    # Relationships
    owner = relationship("Account", back_populates="qr_items")
    folder = relationship("Folder", back_populates="qr_items")
    tags = relationship("Tag", secondary="qr_item_tags", back_populates="qr_items")


class Folder(Base):
    """Folder for organizing QR codes."""
    __tablename__ = "folders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("folders.id", ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Constraints
    __table_args__ = (
        UniqueConstraint("owner_id", "name", "parent_id", name="unique_folder_name_per_user"),
        Index("idx_folders_owner", "owner_id"),
    )

    # Relationships
    owner = relationship("Account", back_populates="folders")
    qr_items = relationship("QRItem", back_populates="folder")
    children = relationship("Folder", backref="parent", remote_side=[id])


class Tag(Base):
    """Tag for categorizing QR codes."""
    __tablename__ = "tags"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(50), nullable=False)
    color = Column(String(7), default="#0070f3")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Constraints
    __table_args__ = (
        UniqueConstraint("owner_id", "name", name="unique_tag_name_per_user"),
        Index("idx_tags_owner", "owner_id"),
    )

    # Relationships
    owner = relationship("Account", back_populates="tags")
    qr_items = relationship("QRItem", secondary="qr_item_tags", back_populates="tags")


class QRItemTag(Base):
    """Many-to-many relationship between QR items and tags."""
    __tablename__ = "qr_item_tags"

    qr_item_id = Column(UUID(as_uuid=True), ForeignKey("qr_items.id", ondelete="CASCADE"), primary_key=True)
    tag_id = Column(UUID(as_uuid=True), ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AuditLog(Base):
    """Audit log for tracking user actions."""
    __tablename__ = "audit_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True)
    action = Column(String, nullable=False)  # create, update, delete, restore, export
    resource_type = Column(String, nullable=False)  # qr_item, folder, tag
    resource_id = Column(UUID(as_uuid=True), nullable=False)
    extra_data = Column(JSONB, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Indexes
    __table_args__ = (
        Index("idx_audit_log_user", "user_id", "created_at"),
    )
