"""
KRATOS v2 - Task de Extração de PDF
Pipeline: Docling (estrutural) + pdfplumber (tabelas) + Gemini Vision (OCR)
"""

import logging
from typing import Any

from src.celery_app import app

logger = logging.getLogger(__name__)


@app.task(
    bind=True,
    name="kratos.extract_pdf",
    max_retries=3,
    default_retry_delay=30,
    acks_late=True,
)
def extract_pdf(self, document_id: str, file_path: str) -> dict[str, Any]:
    """
    Task principal de extração de PDF.

    Pipeline:
    1. Download do PDF do Supabase Storage
    2. Extração estrutural com Docling (IBM)
    3. Extração de tabelas com pdfplumber
    4. OCR de imagens com Gemini 2.5 Flash Vision
    5. Merge dos resultados
    6. Validação com Pydantic
    7. Salvar no banco de dados
    """
    logger.info(f"Iniciando extração do documento {document_id}")

    try:
        # TODO: Fase 1 - Implementar pipeline completo
        # Step 1: Download do PDF
        # Step 2: Docling extraction
        # Step 3: pdfplumber tables
        # Step 4: Gemini Vision OCR
        # Step 5: Merge results
        # Step 6: Validate with Pydantic
        # Step 7: Save to DB

        result = {
            "document_id": document_id,
            "status": "completed",
            "extraction_method": "docling+pdfplumber+gemini",
            "content": {},
            "metadata": {
                "pages": 0,
                "tables_found": 0,
                "images_found": 0,
            },
        }

        logger.info(f"Extração do documento {document_id} concluída com sucesso")
        return result

    except Exception as exc:
        logger.error(f"Erro na extração do documento {document_id}: {exc}")
        raise self.retry(exc=exc)
