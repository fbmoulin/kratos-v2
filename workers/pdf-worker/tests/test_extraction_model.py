import pytest
from pydantic import ValidationError

from src.models.extraction import (
    DocumentStatus,
    ExtractedTable,
    ExtractionMetadata,
    ExtractionMethod,
    ExtractionResult,
    PageContent,
    TableCell,
)


def test_extraction_result_with_all_fields():
    result = ExtractionResult(
        document_id="doc-1",
        status=DocumentStatus.completed,
        raw_text="Trata-se de acao de cobranca...",
        tables=[
            ExtractedTable(
                page=1,
                rows_count=3,
                cols_count=2,
                headers=["Valor", "Data"],
                raw_rows=[["1000", "2026-01-01"]],
                html="<table>...</table>",
                csv="Valor,Data\n1000,2026-01-01\n",
            )
        ],
        pages=[PageContent(page_number=1, text="Trata-se de acao de cobranca...", tables_count=1)],
        metadata=ExtractionMetadata(
            total_pages=3,
            total_tables=1,
            total_characters=100,
            processing_time_seconds=1.5,
            pdf_hash="abc123",
            extraction_method=ExtractionMethod.pdfplumber,
        ),
    )
    assert result.raw_text.startswith("Trata-se")
    assert len(result.tables) == 1
    assert result.metadata.total_pages == 3
    assert result.status == DocumentStatus.completed


def test_extraction_result_defaults():
    result = ExtractionResult(document_id="doc-1")
    assert result.raw_text == ""
    assert result.tables == []
    assert result.pages == []
    assert result.errors == []
    assert result.status == DocumentStatus.completed
    assert result.metadata.extraction_method == ExtractionMethod.pdfplumber


def test_extraction_result_requires_document_id():
    with pytest.raises(ValidationError):
        ExtractionResult()


def test_extraction_result_to_dict():
    result = ExtractionResult(
        document_id="doc-1",
        raw_text="content",
        metadata=ExtractionMetadata(total_pages=1, pdf_hash="hash123"),
    )
    d = result.model_dump()
    assert d["document_id"] == "doc-1"
    assert d["raw_text"] == "content"
    assert d["metadata"]["total_pages"] == 1
    assert d["metadata"]["pdf_hash"] == "hash123"


def test_extracted_table_with_cells():
    table = ExtractedTable(
        page=1,
        rows_count=2,
        cols_count=2,
        cells=[
            TableCell(text="A", row=0, col=0),
            TableCell(text="B", row=0, col=1),
        ],
        headers=["Col1", "Col2"],
        raw_rows=[["A", "B"]],
    )
    assert len(table.cells) == 2
    assert table.cells[0].text == "A"


def test_page_content():
    page = PageContent(page_number=1, text="Hello world", tables_count=2, images_count=1)
    assert page.page_number == 1
    assert page.text == "Hello world"
    assert page.tables_count == 2


def test_document_status_enum():
    assert DocumentStatus.pending.value == "pending"
    assert DocumentStatus.downloading.value == "downloading"
    assert DocumentStatus.extracting.value == "extracting"
    assert DocumentStatus.completed.value == "completed"
    assert DocumentStatus.failed.value == "failed"


def test_extraction_metadata_defaults():
    meta = ExtractionMetadata()
    assert meta.total_pages == 0
    assert meta.total_tables == 0
    assert meta.processing_time_seconds == 0.0
    assert meta.pdf_hash == ""
