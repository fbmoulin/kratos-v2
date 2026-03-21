"""
KRATOS v2 — PDF Extraction Configuration
Environment-based settings via pydantic-settings.
"""

from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Supabase
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    storage_bucket: str = "documents"

    # Processing limits
    max_pdf_size_mb: int = 50
    max_pages: int = 500

    # Temp directory for downloaded PDFs
    temp_dir: Path = Path("/tmp/kratos-pdf-worker")

    # Logging
    log_level: str = "INFO"

    model_config = {"env_prefix": "", "case_sensitive": False}

    @property
    def max_pdf_size_bytes(self) -> int:
        return self.max_pdf_size_mb * 1024 * 1024


settings = Settings()
