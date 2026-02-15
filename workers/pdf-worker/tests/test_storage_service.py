from pathlib import Path
from unittest.mock import MagicMock, patch

import src.services.storage as storage_mod


@patch("src.services.storage.create_client")
def test_download_pdf_saves_to_temp_dir(mock_create_client, tmp_path, monkeypatch):
    # Reset singleton
    storage_mod._client = None
    monkeypatch.setattr(storage_mod.settings, "temp_dir", tmp_path)

    mock_bucket = MagicMock()
    mock_bucket.download.return_value = b"%PDF-1.4 content"
    mock_client = MagicMock()
    mock_client.storage.from_.return_value = mock_bucket
    mock_create_client.return_value = mock_client

    pdf_path = storage_mod.download_pdf("user-1/doc-1/test.pdf", "doc-1")

    assert isinstance(pdf_path, Path)
    assert pdf_path.exists()
    assert pdf_path.read_bytes() == b"%PDF-1.4 content"
    mock_client.storage.from_.assert_called_with("documents")
    mock_bucket.download.assert_called_with("user-1/doc-1/test.pdf")


@patch("src.services.storage.create_client")
def test_download_pdf_raises_on_error(mock_create_client):
    storage_mod._client = None
    mock_bucket = MagicMock()
    mock_bucket.download.side_effect = Exception("Not found")
    mock_client = MagicMock()
    mock_client.storage.from_.return_value = mock_bucket
    mock_create_client.return_value = mock_client

    try:
        storage_mod.download_pdf("invalid/path.pdf", "doc-x")
        assert False, "Should have raised"
    except RuntimeError as e:
        assert "Storage download failed" in str(e)


@patch("src.services.storage.create_client")
def test_download_pdf_rejects_oversized(mock_create_client, monkeypatch):
    storage_mod._client = None
    monkeypatch.setattr(storage_mod.settings, "max_pdf_size_mb", 1)

    big_data = b"x" * (2 * 1024 * 1024)  # 2 MB
    mock_bucket = MagicMock()
    mock_bucket.download.return_value = big_data
    mock_client = MagicMock()
    mock_client.storage.from_.return_value = mock_bucket
    mock_create_client.return_value = mock_client

    try:
        storage_mod.download_pdf("path.pdf", "doc-big")
        assert False, "Should have raised"
    except RuntimeError as e:
        assert "exceeds limit" in str(e)


def test_cleanup_temp_file(tmp_path, monkeypatch):
    monkeypatch.setattr(storage_mod.settings, "temp_dir", tmp_path)

    doc_dir = tmp_path / "doc-cleanup"
    doc_dir.mkdir()
    (doc_dir / "document.pdf").write_bytes(b"test")

    storage_mod.cleanup_temp_file("doc-cleanup")

    assert not doc_dir.exists()
