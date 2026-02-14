import os
from supabase import create_client, Client


class StorageService:
    def __init__(self):
        self.client: Client = create_client(
            os.environ.get("SUPABASE_URL", ""),
            os.environ.get("SUPABASE_SERVICE_ROLE_KEY", ""),
        )

    def download_pdf(self, file_path: str) -> bytes:
        try:
            data = self.client.storage.from_("documents").download(file_path)
            return data
        except Exception as e:
            raise Exception(f"Storage download failed: {e}")
