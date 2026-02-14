"""
KRATOS v2 - PDF Extraction Worker
Consumes jobs from Redis list, downloads PDF, extracts content, saves to DB.
"""

import json
import logging
import os
import time

import redis

from src.models.extraction import ExtractionResult
from src.services.database import DatabaseService
from src.services.pdf_extraction import PdfExtractionService
from src.services.storage import StorageService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("kratos.pdf-worker")

QUEUE_KEY = "kratos:jobs:pdf"


def process_pdf_job(job: dict):
    """Process a single PDF extraction job."""
    document_id = job["documentId"]
    file_path = job["filePath"]

    storage = StorageService()
    extractor = PdfExtractionService()
    db = DatabaseService()

    try:
        logger.info(f"Processing document {document_id}")

        # 1. Download PDF from Supabase Storage
        pdf_bytes = storage.download_pdf(file_path)
        logger.info(f"Downloaded {len(pdf_bytes)} bytes for {document_id}")

        # 2. Extract content
        raw_result = extractor.extract(pdf_bytes)

        # 3. Validate with Pydantic
        validated = ExtractionResult(**raw_result)

        # 4. Save extraction to DB
        db.save_extraction(
            document_id=document_id,
            content_json=validated.model_dump(),
            extraction_method=validated.metadata.get("method", "pdfplumber"),
            raw_text=validated.text,
            tables_count=len(validated.tables),
            images_count=len(validated.images),
        )

        # 5. Update document status
        db.update_document_status(
            document_id,
            "completed",
            pages=validated.metadata.get("pages", 0),
        )

        logger.info(f"Completed document {document_id}")

    except Exception as e:
        logger.error(f"Failed document {document_id}: {e}")
        try:
            db.update_document_status(
                document_id, "failed", error_message=str(e)
            )
        except Exception as db_err:
            logger.error(f"Failed to update status for {document_id}: {db_err}")


def worker_loop():
    """Main loop — blocks on Redis BRPOP, processes jobs one at a time."""
    redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")
    r = redis.from_url(redis_url)

    logger.info(f"PDF worker started, listening on {QUEUE_KEY}")

    while True:
        try:
            result = r.brpop(QUEUE_KEY, timeout=5)
            if result:
                _, job_json = result
                job = json.loads(job_json)
                process_pdf_job(job)
        except KeyboardInterrupt:
            logger.info("Worker shutting down")
            break
        except Exception as e:
            logger.error(f"Worker loop error: {e}")
            time.sleep(1)


if __name__ == "__main__":
    worker_loop()
