"""
KRATOS v2 — PDF Extraction Pipeline
Orchestrates: validate → hash → extract text → extract tables → build result.
"""

import hashlib
import logging
import time
from pathlib import Path

from src.config import settings
from src.models.extraction import (
    DocumentStatus,
    ExtractionMetadata,
    ExtractionMethod,
    ExtractionResult,
)
from src.services.pdf_extraction import extract_tables, extract_text_by_page, get_page_count

logger = logging.getLogger(__name__)


class PipelineError(Exception):
    """Raised when the pipeline fails validation or processing."""


def _compute_hash(pdf_path: Path) -> str:
    """Compute SHA-256 hash of a PDF file."""
    sha = hashlib.sha256()
    with open(pdf_path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            sha.update(chunk)
    return sha.hexdigest()


def run_pipeline(document_id: str, pdf_path: Path) -> ExtractionResult:
    """
    Run the full extraction pipeline on a PDF file.

    1. Validate page count against config limits
    2. Compute PDF hash (SHA-256)
    3. Extract text by page
    4. Extract tables
    5. Build concatenated raw_text
    6. Construct ExtractionResult with metadata
    """
    start = time.time()

    # 1. Validate page count
    page_count = get_page_count(pdf_path)
    if page_count > settings.max_pages:
        raise PipelineError(
            f"PDF has {page_count} pages, exceeds limit of {settings.max_pages}"
        )
    logger.info(f"[{document_id}] PDF has {page_count} pages")

    # 2. Compute hash
    pdf_hash = _compute_hash(pdf_path)

    # 3. Extract text by page
    pages = extract_text_by_page(pdf_path)

    # 4. Extract tables
    tables = extract_tables(pdf_path)

    # 5. Build raw_text
    raw_text = "\n\n".join(p.text for p in pages if p.text)
    total_chars = sum(len(p.text) for p in pages)
    total_tables = sum(p.tables_count for p in pages)

    elapsed = time.time() - start
    logger.info(
        f"[{document_id}] Extracted {total_chars} chars, "
        f"{total_tables} tables in {elapsed:.1f}s"
    )

    # 6. Construct result
    return ExtractionResult(
        document_id=document_id,
        status=DocumentStatus.completed,
        raw_text=raw_text,
        tables=tables,
        pages=pages,
        metadata=ExtractionMetadata(
            total_pages=page_count,
            total_tables=total_tables,
            total_characters=total_chars,
            processing_time_seconds=round(elapsed, 2),
            pdf_hash=pdf_hash,
            extraction_method=ExtractionMethod.pdfplumber,
        ),
    )
