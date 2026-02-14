from unittest.mock import MagicMock, patch


@patch("src.services.pdf_extraction.pdfplumber")
def test_extract_pdfplumber_returns_text(mock_pdfplumber):
    mock_page = MagicMock()
    mock_page.extract_text.return_value = "Trata-se de acao de cobranca."
    mock_page.extract_tables.return_value = []

    mock_pdf = MagicMock()
    mock_pdf.pages = [mock_page]
    mock_pdf.__enter__ = MagicMock(return_value=mock_pdf)
    mock_pdf.__exit__ = MagicMock(return_value=False)
    mock_pdfplumber.open.return_value = mock_pdf

    from src.services.pdf_extraction import PdfExtractionService

    svc = PdfExtractionService()
    result = svc.extract_pdfplumber(b"%PDF-1.4 fake")

    assert "Trata-se" in result["text"]
    assert result["metadata"]["pages"] == 1


@patch("src.services.pdf_extraction.pdfplumber")
def test_extract_pdfplumber_extracts_tables(mock_pdfplumber):
    mock_page = MagicMock()
    mock_page.extract_text.return_value = "Content"
    mock_page.extract_tables.return_value = [
        [["Col1", "Col2"], ["A", "B"], ["C", "D"]]
    ]

    mock_pdf = MagicMock()
    mock_pdf.pages = [mock_page]
    mock_pdf.__enter__ = MagicMock(return_value=mock_pdf)
    mock_pdf.__exit__ = MagicMock(return_value=False)
    mock_pdfplumber.open.return_value = mock_pdf

    from src.services.pdf_extraction import PdfExtractionService

    svc = PdfExtractionService()
    result = svc.extract_pdfplumber(b"%PDF-1.4")

    assert len(result["tables"]) == 1
    assert result["tables"][0]["headers"] == ["Col1", "Col2"]
    assert result["tables"][0]["rows"] == [["A", "B"], ["C", "D"]]


@patch("src.services.pdf_extraction.pdfplumber")
def test_extract_handles_empty_pages(mock_pdfplumber):
    mock_page = MagicMock()
    mock_page.extract_text.return_value = None
    mock_page.extract_tables.return_value = None

    mock_pdf = MagicMock()
    mock_pdf.pages = [mock_page]
    mock_pdf.__enter__ = MagicMock(return_value=mock_pdf)
    mock_pdf.__exit__ = MagicMock(return_value=False)
    mock_pdfplumber.open.return_value = mock_pdf

    from src.services.pdf_extraction import PdfExtractionService

    svc = PdfExtractionService()
    result = svc.extract_pdfplumber(b"%PDF-1.4")

    assert result["text"] == ""
    assert result["tables"] == []
