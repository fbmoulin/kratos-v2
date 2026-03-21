"""
KRATOS v2 — PDF Extraction Schemas
Rich models for structured PDF extraction results.
"""

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class DocumentStatus(str, Enum):
    pending = "pending"
    downloading = "downloading"
    extracting = "extracting"
    completed = "completed"
    failed = "failed"


class ExtractionMethod(str, Enum):
    pdfplumber = "pdfplumber"
    hybrid = "hybrid"


class TableCell(BaseModel):
    text: str = ""
    row: int = 0
    col: int = 0


class ExtractedTable(BaseModel):
    page: int
    rows_count: int = 0
    cols_count: int = 0
    cells: list[TableCell] = Field(default_factory=list)
    headers: list[str] = Field(default_factory=list)
    raw_rows: list[list[str]] = Field(default_factory=list)
    html: str = ""
    csv: str = ""
    confidence: float = 1.0


class PageContent(BaseModel):
    page_number: int
    text: str = ""
    tables_count: int = 0
    images_count: int = 0


class ExtractionMetadata(BaseModel):
    total_pages: int = 0
    total_tables: int = 0
    total_characters: int = 0
    processing_time_seconds: float = 0.0
    pdf_hash: str = ""
    extraction_method: ExtractionMethod = ExtractionMethod.pdfplumber


class ExtractionResult(BaseModel):
    document_id: str
    status: DocumentStatus = DocumentStatus.completed
    metadata: ExtractionMetadata = Field(default_factory=ExtractionMetadata)
    raw_text: str = ""
    tables: list[ExtractedTable] = Field(default_factory=list)
    pages: list[PageContent] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)
