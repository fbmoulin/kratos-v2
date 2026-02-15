FROM python:3.12-slim

WORKDIR /app

# System deps for pdfplumber
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpoppler-cpp-dev \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Source
COPY src/ ./src/

# Default: BRPOP mode (local dev / simple deploy)
# Override with: celery -A src.celery_app worker --loglevel=info --concurrency=2
CMD ["python", "-m", "src.tasks.extract_pdf"]
