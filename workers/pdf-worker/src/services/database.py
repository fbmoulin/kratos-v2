"""
KRATOS v2 — Database Service
Saves extraction results and updates document status via Supabase REST API.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from supabase import create_client, Client

from src.config import settings
from src.models.extraction import ExtractionResult

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


def save_extraction(document_id: str, result: ExtractionResult) -> None:
    """
    Save an ExtractionResult to the extractions table.

    Maps to the kratos-v2 schema:
    - raw_text: concatenated text from all pages
    - content_json: full ExtractionResult as dict (tables, pages, metadata)
    - extraction_method: "pdfplumber"
    - tables_count, images_count
    """
    client = _get_client()
    total_images = sum(p.images_count for p in result.pages)

    client.table("extractions").insert(
        {
            "document_id": document_id,
            "raw_text": result.raw_text,
            "content_json": result.model_dump(mode="json"),
            "extraction_method": result.metadata.extraction_method.value,
            "tables_count": result.metadata.total_tables,
            "images_count": total_images,
        }
    ).execute()

    logger.info(f"Saved extraction for document {document_id}")


def update_document_status(
    document_id: str,
    status: str,
    error_message: Optional[str] = None,
    pages: Optional[int] = None,
) -> None:
    """Update the documents table with processing status."""
    client = _get_client()
    data: dict = {
        "status": status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if pages is not None:
        data["pages"] = pages
    if error_message is not None:
        data["error_message"] = error_message

    client.table("documents").update(data).eq("id", document_id).execute()
    logger.debug(f"Updated document {document_id} status to {status}")
