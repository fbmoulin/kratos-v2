"""
KRATOS v2 — PDF Extraction Worker
Dual mode: Celery task (Docker) + Redis BRPOP loop (local dev).
Both call process_pdf_job() which runs the extraction pipeline.
"""

import json
import logging
import time

import redis

from src.celery_app import app
from src.config import settings
from src.models.extraction import DocumentStatus
from src.pipeline import PipelineError, run_pipeline
from src.services import database, storage

logging.basicConfig(
    level=getattr(logging, settings.log_level, logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("kratos.pdf-worker")


def process_pdf_job(job: dict) -> None:
    """Process a single PDF extraction job through the pipeline."""
    document_id = job["documentId"]
    file_path = job["filePath"]

    try:
        # 1. Downloading
        database.update_document_status(document_id, DocumentStatus.downloading.value)
        pdf_path = storage.download_pdf(file_path, document_id)

        # 2. Extracting
        database.update_document_status(document_id, DocumentStatus.extracting.value)
        result = run_pipeline(document_id, pdf_path)

        # 3. Save extraction
        database.save_extraction(document_id, result)

        # 4. Completed
        database.update_document_status(
            document_id,
            DocumentStatus.completed.value,
            pages=result.metadata.total_pages,
        )
        logger.info(f"Completed document {document_id}")

    except PipelineError as e:
        logger.warning(f"Pipeline validation failed for {document_id}: {e}")
        database.update_document_status(
            document_id, DocumentStatus.failed.value, error_message=str(e)
        )

    except Exception as e:
        logger.error(f"Failed document {document_id}: {e}")
        try:
            database.update_document_status(
                document_id, DocumentStatus.failed.value, error_message=str(e)
            )
        except Exception as db_err:
            logger.error(f"Failed to update status for {document_id}: {db_err}")

    finally:
        storage.cleanup_temp_file(document_id)


# --- Celery task (Docker deployment) ---

@app.task(
    bind=True,
    name="extract_pdf",
    max_retries=3,
    default_retry_delay=30,
    acks_late=True,
)
def extract_pdf_task(self, job: dict) -> dict:
    """Celery task wrapper for PDF extraction."""
    try:
        process_pdf_job(job)
        return {"status": "completed", "documentId": job["documentId"]}
    except Exception as exc:
        logger.error(f"Celery task failed: {exc}")
        raise self.retry(exc=exc)


# --- Redis BRPOP loop (local dev) ---

def worker_loop() -> None:
    """Main loop — blocks on Redis BRPOP, processes jobs one at a time."""
    r = redis.from_url(settings.redis_url)
    queue_key = settings.queue_key

    logger.info(f"PDF worker started (BRPOP mode), listening on {queue_key}")

    while True:
        try:
            result = r.brpop(queue_key, timeout=5)
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
