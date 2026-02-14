"""
KRATOS v2 - PDF Worker (Celery)
Processamento assíncrono de documentos PDF.
"""

import os
from celery import Celery

# Configuração do Celery
BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")

app = Celery(
    "kratos_pdf_worker",
    broker=BROKER_URL,
    backend=RESULT_BACKEND,
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
    task_soft_time_limit=120,  # 2 minutos soft limit
    task_time_limit=180,  # 3 minutos hard limit
    task_default_retry_delay=30,
    task_max_retries=3,
)

# Auto-discover tasks
app.autodiscover_tasks(["src.tasks"])
