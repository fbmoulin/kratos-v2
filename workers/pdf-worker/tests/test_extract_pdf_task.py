from pathlib import Path
from unittest.mock import MagicMock, patch

from src.models.extraction import (
    DocumentStatus,
    ExtractionMetadata,
    ExtractionMethod,
    ExtractionResult,
    PageContent,
)


def _make_pipeline_result(document_id="doc-1", pages=3):
    return ExtractionResult(
        document_id=document_id,
        status=DocumentStatus.completed,
        raw_text="Extracted legal content",
        pages=[PageContent(page_number=i + 1, text=f"Page {i + 1}") for i in range(pages)],
        metadata=ExtractionMetadata(
            total_pages=pages,
            total_tables=0,
            total_characters=100,
            processing_time_seconds=1.0,
            pdf_hash="abc123",
            extraction_method=ExtractionMethod.pdfplumber,
        ),
    )


@patch("src.tasks.extract_pdf.storage")
@patch("src.tasks.extract_pdf.database")
@patch("src.tasks.extract_pdf.run_pipeline")
def test_process_job_success(mock_pipeline, mock_db, mock_storage):
    mock_storage.download_pdf.return_value = Path("/tmp/test/document.pdf")
    mock_pipeline.return_value = _make_pipeline_result("doc-1", pages=3)

    from src.tasks.extract_pdf import process_pdf_job

    job = {
        "documentId": "doc-1",
        "userId": "user-1",
        "filePath": "user-1/doc-1/test.pdf",
        "fileName": "test.pdf",
    }

    process_pdf_job(job)

    mock_storage.download_pdf.assert_called_once_with("user-1/doc-1/test.pdf", "doc-1")
    mock_pipeline.assert_called_once()
    mock_db.save_extraction.assert_called_once()

    # Last status update should be "completed"
    calls = mock_db.update_document_status.call_args_list
    last_call = calls[-1]
    assert last_call[0][0] == "doc-1"
    assert last_call[0][1] == DocumentStatus.completed.value
    assert last_call[1]["pages"] == 3


@patch("src.tasks.extract_pdf.storage")
@patch("src.tasks.extract_pdf.database")
@patch("src.tasks.extract_pdf.run_pipeline")
def test_process_job_failure_updates_status(mock_pipeline, mock_db, mock_storage):
    mock_storage.download_pdf.side_effect = Exception("Download timeout")

    from src.tasks.extract_pdf import process_pdf_job

    job = {
        "documentId": "doc-2",
        "userId": "user-1",
        "filePath": "user-1/doc-2/fail.pdf",
        "fileName": "fail.pdf",
    }

    process_pdf_job(job)

    # Should have called update_document_status with "failed"
    calls = mock_db.update_document_status.call_args_list
    failed_call = [c for c in calls if c[0][1] == DocumentStatus.failed.value]
    assert len(failed_call) >= 1
    assert "Download timeout" in failed_call[-1][1].get("error_message", "")

    mock_storage.cleanup_temp_file.assert_called_once_with("doc-2")


@patch("src.tasks.extract_pdf.storage")
@patch("src.tasks.extract_pdf.database")
@patch("src.tasks.extract_pdf.run_pipeline")
def test_process_job_pipeline_error(mock_pipeline, mock_db, mock_storage):
    from src.pipeline import PipelineError

    mock_storage.download_pdf.return_value = Path("/tmp/test/document.pdf")
    mock_pipeline.side_effect = PipelineError("PDF has 1000 pages, exceeds limit of 500")

    from src.tasks.extract_pdf import process_pdf_job

    job = {
        "documentId": "doc-3",
        "filePath": "user-1/doc-3/big.pdf",
    }

    process_pdf_job(job)

    calls = mock_db.update_document_status.call_args_list
    failed_call = [c for c in calls if c[0][1] == DocumentStatus.failed.value]
    assert len(failed_call) == 1
    assert "exceeds limit" in failed_call[0][1]["error_message"]


@patch("src.tasks.extract_pdf.storage")
@patch("src.tasks.extract_pdf.database")
@patch("src.tasks.extract_pdf.run_pipeline")
def test_process_job_always_cleans_up(mock_pipeline, mock_db, mock_storage):
    mock_storage.download_pdf.return_value = Path("/tmp/test/document.pdf")
    mock_pipeline.return_value = _make_pipeline_result("doc-4")

    from src.tasks.extract_pdf import process_pdf_job

    process_pdf_job({"documentId": "doc-4", "filePath": "path.pdf"})

    mock_storage.cleanup_temp_file.assert_called_once_with("doc-4")
