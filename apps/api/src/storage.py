"""S3/MinIO storage utilities for template assets."""
import os
import uuid
import boto3
from botocore.client import Config
from fastapi import HTTPException, UploadFile
from .logging_config import setup_logging

logger = setup_logging()

# Allowed MIME types for uploads
ALLOWED_MIME_TYPES = {
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/gif",
    "image/svg+xml",
    "image/webp"
}

# Disallowed file extensions (executables)
DISALLOWED_EXTENSIONS = {
    ".exe", ".bat", ".cmd", ".com", ".pif", ".scr", ".vbs", ".js",
    ".jar", ".app", ".deb", ".rpm", ".dmg", ".pkg", ".sh", ".bin"
}

# Max file size: 5MB
MAX_FILE_SIZE = 5 * 1024 * 1024


def get_s3_client():
    """Get configured S3/MinIO client."""
    endpoint = os.getenv("S3_ENDPOINT", "http://localhost:9000")
    access_key = os.getenv("S3_ACCESS_KEY", "minioadmin")
    secret_key = os.getenv("S3_SECRET_KEY", "minioadmin")
    
    return boto3.client(
        's3',
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=Config(signature_version='s3v4'),
        region_name='us-east-1'
    )


def ensure_bucket_exists():
    """Ensure S3 bucket exists."""
    s3_client = get_s3_client()
    bucket = os.getenv("S3_BUCKET", "assets")
    
    try:
        s3_client.head_bucket(Bucket=bucket)
    except:
        try:
            s3_client.create_bucket(Bucket=bucket)
            logger.info({"event": "s3_bucket_created", "bucket": bucket})
        except Exception as e:
            logger.error({"event": "s3_bucket_create_error", "bucket": bucket, "error": str(e)})


def validate_upload_file(file: UploadFile):
    """Validate uploaded file for security."""
    # Check MIME type
    if file.content_type not in ALLOWED_MIME_TYPES:
        logger.warning({
            "event": "upload_rejected_mime",
            "file_name": file.filename,
            "mime_type": file.content_type
        })
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_MIME_TYPES)}"
        )
    
    # Check file extension
    if file.filename:
        ext = os.path.splitext(file.filename.lower())[1]
        if ext in DISALLOWED_EXTENSIONS:
            logger.warning({
                "event": "upload_rejected_extension",
                "file_name": file.filename,
                "extension": ext
            })
            raise HTTPException(
                status_code=400,
                detail="File extension not allowed for security reasons"
            )
    
    # Check file size
    if file.size and file.size > MAX_FILE_SIZE:
        logger.warning({
            "event": "upload_rejected_size",
            "file_name": file.filename,
            "size": file.size
        })
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE / 1024 / 1024}MB"
        )


async def upload_file_to_s3(file: UploadFile, prefix: str = "") -> tuple[str, str]:
    """Upload file to S3/MinIO and return (key, url)."""
    ensure_bucket_exists()
    
    s3_client = get_s3_client()
    bucket = os.getenv("S3_BUCKET", "assets")
    
    # Generate unique key
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ""
    s3_key = f"{prefix}/{uuid.uuid4()}{file_ext}" if prefix else f"{uuid.uuid4()}{file_ext}"
    
    try:
        # Read file content
        content = await file.read()
        
        # Upload to S3
        s3_client.put_object(
            Bucket=bucket,
            Key=s3_key,
            Body=content,
            ContentType=file.content_type,
            ACL='public-read'  # Make publicly accessible
        )
        
        # Generate public URL
        endpoint = os.getenv("S3_ENDPOINT", "http://localhost:9000")
        s3_url = f"{endpoint}/{bucket}/{s3_key}"
        
        logger.info({
            "event": "file_uploaded",
            "file_name": file.filename,
            "s3_key": s3_key,
            "size": len(content)
        })
        
        return s3_key, s3_url
        
    except Exception as e:
        logger.error({
            "event": "upload_error",
            "file_name": file.filename,
            "error": str(e)
        })
        raise HTTPException(status_code=500, detail="File upload failed")
