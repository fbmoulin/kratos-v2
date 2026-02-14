from unittest.mock import MagicMock, patch


@patch("src.tasks.extract_pdf.DatabaseService")
@patch("src.tasks.extract_pdf.PdfExtractionService")
@patch("src.tasks.extract_pdf.StorageService")
def test_process_job_success(MockStorage, MockExtractor, MockDb):
    MockStorage.return_value.download_pdf.return_value = b"%PDF-1.4 content"
    MockExtractor.return_value.extract.return_value = {
        "text": "Extracted legal content",
        "tables": [],
        "images": [],
        "metadata": {"pages": 3, "method": "pdfplumber"},
    }

    from src.tasks.extract_pdf import process_pdf_job

    job = {
        "documentId": "doc-1",
        "userId": "user-1",
        "filePath": "user-1/doc-1/test.pdf",
        "fileName": "test.pdf",
    }

    process_pdf_job(job)

    MockStorage.return_value.download_pdf.assert_called_once_with("user-1/doc-1/test.pdf")
    MockExtractor.return_value.extract.assert_called_once()
    MockDb.return_value.save_extraction.assert_called_once()
    MockDb.return_value.update_document_status.assert_called_with(
        "doc-1", "completed", pages=3
    )


@patch("src.tasks.extract_pdf.DatabaseService")
@patch("src.tasks.extract_pdf.PdfExtractionService")
@patch("src.tasks.extract_pdf.StorageService")
def test_process_job_failure_updates_status(MockStorage, MockExtractor, MockDb):
    MockStorage.return_value.download_pdf.side_effect = Exception("Download timeout")

    from src.tasks.extract_pdf import process_pdf_job

    job = {
        "documentId": "doc-2",
        "userId": "user-1",
        "filePath": "user-1/doc-2/fail.pdf",
        "fileName": "fail.pdf",
    }

    process_pdf_job(job)

    MockDb.return_value.update_document_status.assert_called_once()
    call_args = MockDb.return_value.update_document_status.call_args
    assert call_args[0][0] == "doc-2"
    assert call_args[0][1] == "failed"
    assert "error_message" in call_args[1]
    assert "Download timeout" in call_args[1]["error_message"]
