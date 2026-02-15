"""
KRATOS v2 — PDF Worker (Celery)
Processamento assincrono de documentos PDF.
"""

from celery import Celery

from src.config import settings

app = Celery(
    "kratos_pdf_worker",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)

app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="America/Sao_Paulo",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_soft_time_limit=120,
    task_time_limit=settings.task_timeout_seconds,
    task_default_retry_delay=30,
    task_max_retries=3,
)

app.autodiscover_tasks(["src.tasks"])
