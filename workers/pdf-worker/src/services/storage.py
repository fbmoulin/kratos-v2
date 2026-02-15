"""
KRATOS v2 — Storage Service
Downloads PDFs from Supabase Storage to temp directory.
"""

import logging
from pathlib import Path
from typing import Optional

from supabase import create_client, Client

from src.config import settings

logger = logging.getLogger(__name__)

_client: Optional[Client] = None


def _get_client() -> Client:
    """Lazy-initialize Supabase client."""
    global _client
    if _client is None:
        _client = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key,
        )
    return _client


def download_pdf(storage_path: str, document_id: str) -> Path:
    """
    Download a PDF from Supabase Storage to a temp file.

    Returns the local Path to the downloaded file.
    Raises if download fails or file exceeds size limit.
    """
    client = _get_client()
    bucket = settings.storage_bucket

    try:
        data = client.storage.from_(bucket).download(storage_path)
    except Exception as e:
        raise RuntimeError(f"Storage download failed for {storage_path}: {e}") from e

    if len(data) > settings.max_pdf_size_bytes:
        raise RuntimeError(
            f"PDF size {len(data)} bytes exceeds limit of "
            f"{settings.max_pdf_size_mb} MB"
        )

    # Save to temp dir
    temp_dir = settings.temp_dir / document_id
    temp_dir.mkdir(parents=True, exist_ok=True)
    pdf_path = temp_dir / "document.pdf"
    pdf_path.write_bytes(data)

    logger.info(f"Downloaded {len(data)} bytes to {pdf_path}")
    return pdf_path


def cleanup_temp_file(document_id: str) -> None:
    """Remove the temp directory for a document."""
    temp_dir = settings.temp_dir / document_id
    if temp_dir.exists():
        for f in temp_dir.iterdir():
            f.unlink()
        temp_dir.rmdir()
        logger.debug(f"Cleaned up temp dir {temp_dir}")
