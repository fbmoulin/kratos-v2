from unittest.mock import MagicMock, patch


@patch("src.services.storage.create_client")
def test_download_pdf_returns_bytes(mock_create_client):
    mock_bucket = MagicMock()
    mock_bucket.download.return_value = b"%PDF-1.4 content"
    mock_client = MagicMock()
    mock_client.storage.from_.return_value = mock_bucket
    mock_create_client.return_value = mock_client

    from src.services.storage import StorageService

    svc = StorageService()
    data = svc.download_pdf("user-1/doc-1/test.pdf")

    assert data == b"%PDF-1.4 content"
    mock_client.storage.from_.assert_called_with("documents")
    mock_bucket.download.assert_called_with("user-1/doc-1/test.pdf")


@patch("src.services.storage.create_client")
def test_download_pdf_raises_on_error(mock_create_client):
    mock_bucket = MagicMock()
    mock_bucket.download.side_effect = Exception("Not found")
    mock_client = MagicMock()
    mock_client.storage.from_.return_value = mock_bucket
    mock_create_client.return_value = mock_client

    from src.services.storage import StorageService

    svc = StorageService()
    try:
        svc.download_pdf("invalid/path.pdf")
        assert False, "Should have raised"
    except Exception as e:
        assert "Storage download failed" in str(e)
