FROM python:3.12-slim

WORKDIR /app

# Instalar dependências do sistema para Docling e pdfplumber
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpoppler-cpp-dev \
    poppler-utils \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

# Copiar e instalar dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código fonte
COPY src/ ./src/

# Executar o worker Celery
CMD ["celery", "-A", "src.celery_app", "worker", "--loglevel=info", "--concurrency=2"]
