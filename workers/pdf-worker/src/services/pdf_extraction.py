import io
import logging
from typing import Any, Dict

import pdfplumber

logger = logging.getLogger(__name__)


class PdfExtractionService:
    def extract_pdfplumber(self, pdf_bytes: bytes) -> Dict[str, Any]:
        text_parts = []
        tables = []

        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)

                page_tables = page.extract_tables()
                if page_tables:
                    for table in page_tables:
                        if table and len(table) > 0:
                            tables.append(
                                {
                                    "headers": table[0] if table[0] else [],
                                    "rows": table[1:] if len(table) > 1 else [],
                                }
                            )

            return {
                "text": "\n\n".join(text_parts),
                "tables": tables,
                "images": [],
                "metadata": {
                    "pages": len(pdf.pages),
                    "method": "pdfplumber",
                },
            }

    def extract(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """Main extraction entry point. Uses pdfplumber for MVP.
        Docling + hybrid can be added later without changing the interface."""
        return self.extract_pdfplumber(pdf_bytes)
