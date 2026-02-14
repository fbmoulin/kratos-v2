import os
from datetime import datetime, timezone
from typing import Optional

from supabase import create_client, Client


class DatabaseService:
    def __init__(self):
        self.client: Client = create_client(
            os.environ.get("SUPABASE_URL", ""),
            os.environ.get("SUPABASE_SERVICE_ROLE_KEY", ""),
        )

    def save_extraction(
        self,
        document_id: str,
        content_json: dict,
        extraction_method: str,
        raw_text: str,
        tables_count: int,
        images_count: int,
    ):
        self.client.table("extractions").insert(
            {
                "document_id": document_id,
                "content_json": content_json,
                "extraction_method": extraction_method,
                "raw_text": raw_text,
                "tables_count": tables_count,
                "images_count": images_count,
            }
        ).execute()

    def update_document_status(
        self,
        document_id: str,
        status: str,
        pages: Optional[int] = None,
        error_message: Optional[str] = None,
    ):
        data = {
            "status": status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        if pages is not None:
            data["pages"] = pages
        if error_message is not None:
            data["error_message"] = error_message

        self.client.table("documents").update(data).eq("id", document_id).execute()
