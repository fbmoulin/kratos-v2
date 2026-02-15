"""
KRATOS v2 — Enhanced pdfplumber Extractor
Per-page text extraction, rich table extraction with HTML/CSV output.
"""

import csv
import io
import logging
from pathlib import Path

import pdfplumber

from src.models.extraction import (
    ExtractedTable,
    PageContent,
    TableCell,
)

logger = logging.getLogger(__name__)


def _open_pdf(source: bytes | Path):
    """Open a PDF from bytes or file path."""
    if isinstance(source, (str, Path)):
        return pdfplumber.open(source)
    return pdfplumber.open(io.BytesIO(source))


def _clean_cell(value) -> str:
    """Normalize a table cell value to string."""
    if value is None:
        return ""
    return str(value).strip()


def _table_to_html(raw_table: list[list]) -> str:
    """Convert a raw pdfplumber table to HTML."""
    if not raw_table:
        return ""
    lines = ["<table>"]
    for i, row in enumerate(raw_table):
        tag = "th" if i == 0 else "td"
        cells = "".join(f"<{tag}>{_clean_cell(c)}</{tag}>" for c in row)
        lines.append(f"<tr>{cells}</tr>")
    lines.append("</table>")
    return "\n".join(lines)


def _table_to_csv(raw_table: list[list]) -> str:
    """Convert a raw pdfplumber table to CSV string."""
    if not raw_table:
        return ""
    buf = io.StringIO()
    writer = csv.writer(buf)
    for row in raw_table:
        writer.writerow([_clean_cell(c) for c in row])
    return buf.getvalue()


def get_page_count(source: bytes | Path) -> int:
    """Return the number of pages in a PDF."""
    with _open_pdf(source) as pdf:
        return len(pdf.pages)


def extract_text_by_page(source: bytes | Path) -> list[PageContent]:
    """Extract text per page, returning PageContent list."""
    pages: list[PageContent] = []
    with _open_pdf(source) as pdf:
        for i, page in enumerate(pdf.pages):
            text = page.extract_text() or ""
            raw_tables = page.extract_tables() or []
            pages.append(
                PageContent(
                    page_number=i + 1,
                    text=text,
                    tables_count=len(raw_tables),
                    images_count=len(page.images) if hasattr(page, "images") else 0,
                )
            )
    return pages


def extract_tables(source: bytes | Path) -> list[ExtractedTable]:
    """Extract all tables from a PDF with rich metadata."""
    tables: list[ExtractedTable] = []
    with _open_pdf(source) as pdf:
        for i, page in enumerate(pdf.pages):
            raw_tables = page.extract_tables() or []
            for raw_table in raw_tables:
                if not raw_table or len(raw_table) == 0:
                    continue

                headers = [_clean_cell(c) for c in raw_table[0]] if raw_table[0] else []
                raw_rows = [
                    [_clean_cell(c) for c in row]
                    for row in raw_table[1:]
                ] if len(raw_table) > 1 else []

                cells: list[TableCell] = []
                for r_idx, row in enumerate(raw_table):
                    for c_idx, cell in enumerate(row):
                        cells.append(TableCell(text=_clean_cell(cell), row=r_idx, col=c_idx))

                rows_count = len(raw_table)
                cols_count = len(raw_table[0]) if raw_table[0] else 0

                tables.append(
                    ExtractedTable(
                        page=i + 1,
                        rows_count=rows_count,
                        cols_count=cols_count,
                        cells=cells,
                        headers=headers,
                        raw_rows=raw_rows,
                        html=_table_to_html(raw_table),
                        csv=_table_to_csv(raw_table),
                    )
                )
    return tables
