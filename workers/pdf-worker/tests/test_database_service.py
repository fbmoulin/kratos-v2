from unittest.mock import MagicMock, patch


@patch("src.services.database.create_client")
def test_save_extraction_inserts_row(mock_create_client):
    mock_table = MagicMock()
    mock_table.insert.return_value.execute.return_value = None
    mock_client = MagicMock()
    mock_client.table.return_value = mock_table
    mock_create_client.return_value = mock_client

    from src.services.database import DatabaseService

    db = DatabaseService()
    db.save_extraction(
        document_id="doc-1",
        content_json={"text": "content"},
        extraction_method="hybrid",
        raw_text="raw",
        tables_count=1,
        images_count=0,
    )

    mock_client.table.assert_called_with("extractions")
    mock_table.insert.assert_called_once()


@patch("src.services.database.create_client")
def test_update_document_status_to_completed(mock_create_client):
    mock_table = MagicMock()
    mock_table.update.return_value.eq.return_value.execute.return_value = None
    mock_client = MagicMock()
    mock_client.table.return_value = mock_table
    mock_create_client.return_value = mock_client

    from src.services.database import DatabaseService

    db = DatabaseService()
    db.update_document_status("doc-1", "completed", pages=5)

    mock_client.table.assert_called_with("documents")
    update_data = mock_table.update.call_args[0][0]
    assert update_data["status"] == "completed"
    assert update_data["pages"] == 5


@patch("src.services.database.create_client")
def test_update_document_status_to_failed(mock_create_client):
    mock_table = MagicMock()
    mock_table.update.return_value.eq.return_value.execute.return_value = None
    mock_client = MagicMock()
    mock_client.table.return_value = mock_table
    mock_create_client.return_value = mock_client

    from src.services.database import DatabaseService

    db = DatabaseService()
    db.update_document_status("doc-1", "failed", error_message="Extraction timeout")

    update_data = mock_table.update.call_args[0][0]
    assert update_data["status"] == "failed"
    assert update_data["error_message"] == "Extraction timeout"
