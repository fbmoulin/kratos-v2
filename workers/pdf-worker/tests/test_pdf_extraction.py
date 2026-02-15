from unittest.mock import MagicMock, patch


def _make_mock_pdf(pages_data):
    """Helper: create a mock pdfplumber PDF with given pages.

    pages_data: list of (text, tables, images) tuples.
    """
    mock_pages = []
    for text, tables, images in pages_data:
        page = MagicMock()
        page.extract_text.return_value = text
        page.extract_tables.return_value = tables
        page.images = images or []
        mock_pages.append(page)

    mock_pdf = MagicMock()
    mock_pdf.pages = mock_pages
    mock_pdf.__enter__ = MagicMock(return_value=mock_pdf)
    mock_pdf.__exit__ = MagicMock(return_value=False)
    return mock_pdf


@patch("src.services.pdf_extraction.pdfplumber")
def test_extract_text_by_page_returns_page_content(mock_pdfplumber):
    mock_pdfplumber.open.return_value = _make_mock_pdf([
        ("Trata-se de acao de cobranca.", [], []),
        ("Segunda pagina do documento.", [], []),
    ])

    from src.services.pdf_extraction import extract_text_by_page

    pages = extract_text_by_page(b"%PDF-1.4 fake")

    assert len(pages) == 2
    assert pages[0].page_number == 1
    assert "Trata-se" in pages[0].text
    assert pages[1].page_number == 2
    assert "Segunda" in pages[1].text


@patch("src.services.pdf_extraction.pdfplumber")
def test_extract_tables_returns_rich_table(mock_pdfplumber):
    raw_table = [["Col1", "Col2"], ["A", "B"], ["C", "D"]]
    mock_pdfplumber.open.return_value = _make_mock_pdf([
        ("Content", [raw_table], []),
    ])

    from src.services.pdf_extraction import extract_tables

    tables = extract_tables(b"%PDF-1.4")

    assert len(tables) == 1
    t = tables[0]
    assert t.page == 1
    assert t.headers == ["Col1", "Col2"]
    assert t.raw_rows == [["A", "B"], ["C", "D"]]
    assert t.rows_count == 3
    assert t.cols_count == 2
    assert "<table>" in t.html
    assert "Col1" in t.csv
    assert len(t.cells) == 6  # 3 rows x 2 cols


@patch("src.services.pdf_extraction.pdfplumber")
def test_extract_text_handles_empty_pages(mock_pdfplumber):
    mock_pdfplumber.open.return_value = _make_mock_pdf([
        (None, None, []),
    ])

    from src.services.pdf_extraction import extract_text_by_page

    pages = extract_text_by_page(b"%PDF-1.4")

    assert len(pages) == 1
    assert pages[0].text == ""
    assert pages[0].tables_count == 0


@patch("src.services.pdf_extraction.pdfplumber")
def test_get_page_count(mock_pdfplumber):
    mock_pdfplumber.open.return_value = _make_mock_pdf([
        ("p1", [], []),
        ("p2", [], []),
        ("p3", [], []),
    ])

    from src.services.pdf_extraction import get_page_count

    assert get_page_count(b"%PDF-1.4") == 3


@patch("src.services.pdf_extraction.pdfplumber")
def test_extract_tables_skips_empty_tables(mock_pdfplumber):
    mock_pdfplumber.open.return_value = _make_mock_pdf([
        ("Content", [[], [["Header"], ["Data"]]], []),
    ])

    from src.services.pdf_extraction import extract_tables

    tables = extract_tables(b"%PDF-1.4")
    assert len(tables) == 1
    assert tables[0].headers == ["Header"]
