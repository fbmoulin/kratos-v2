from unittest.mock import MagicMock, patch

import src.services.database as db_mod
from src.models.extraction import (
    DocumentStatus,
    ExtractionMetadata,
    ExtractionMethod,
    ExtractionResult,
    PageContent,
)


@patch("src.services.database.create_client")
def test_save_extraction_inserts_row(mock_create_client):
    db_mod._client = None
    mock_table = MagicMock()
    mock_table.insert.return_value.execute.return_value = None
    mock_client = MagicMock()
    mock_client.table.return_value = mock_table
    mock_create_client.return_value = mock_client

    result = ExtractionResult(
        document_id="doc-1",
        raw_text="extracted text",
        pages=[PageContent(page_number=1, text="extracted text", images_count=2)],
        metadata=ExtractionMetadata(
            total_pages=1,
            total_tables=0,
            extraction_method=ExtractionMethod.pdfplumber,
        ),
    )

    db_mod.save_extraction("doc-1", result)

    mock_client.table.assert_called_with("extractions")
    insert_data = mock_table.insert.call_args[0][0]
    assert insert_data["document_id"] == "doc-1"
    assert insert_data["raw_text"] == "extracted text"
    assert insert_data["extraction_method"] == "pdfplumber"
    assert insert_data["tables_count"] == 0
    assert insert_data["images_count"] == 2
    assert "content_json" in insert_data


@patch("src.services.database.create_client")
def test_update_document_status_to_completed(mock_create_client):
    db_mod._client = None
    mock_table = MagicMock()
    mock_table.update.return_value.eq.return_value.execute.return_value = None
    mock_client = MagicMock()
    mock_client.table.return_value = mock_table
    mock_create_client.return_value = mock_client

    db_mod.update_document_status("doc-1", "completed", pages=5)

    mock_client.table.assert_called_with("documents")
    update_data = mock_table.update.call_args[0][0]
    assert update_data["status"] == "completed"
    assert update_data["pages"] == 5


@patch("src.services.database.create_client")
def test_update_document_status_to_failed(mock_create_client):
    db_mod._client = None
    mock_table = MagicMock()
    mock_table.update.return_value.eq.return_value.execute.return_value = None
    mock_client = MagicMock()
    mock_client.table.return_value = mock_table
    mock_create_client.return_value = mock_client

    db_mod.update_document_status("doc-1", "failed", error_message="Extraction timeout")

    update_data = mock_table.update.call_args[0][0]
    assert update_data["status"] == "failed"
    assert update_data["error_message"] == "Extraction timeout"
