"""
Smoke test: upload a real PDF, create document row, push Redis job.
Then start the worker (or run it separately) and verify extraction.

Usage: python smoke_test.py <path_to_pdf>
"""

import json
import os
import sys
import time
import uuid

import redis
import requests

SUPABASE_URL = os.environ.get("SUPABASE_URL", "http://127.0.0.1:54321")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz")
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")
QUEUE_KEY = "kratos:jobs:pdf"

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
}


def upload_pdf(pdf_path: str, user_id: str, document_id: str) -> str:
    """Upload PDF to Supabase Storage."""
    file_name = os.path.basename(pdf_path)
    storage_path = f"{user_id}/{document_id}/{file_name}"

    with open(pdf_path, "rb") as f:
        resp = requests.post(
            f"{SUPABASE_URL}/storage/v1/object/documents/{storage_path}",
            headers={**HEADERS, "Content-Type": "application/pdf"},
            data=f,
        )
    resp.raise_for_status()
    print(f"[OK] Uploaded to storage: {storage_path}")
    return storage_path


def create_document_row(document_id: str, user_id: str, file_name: str, storage_path: str):
    """Insert a document row via REST API."""
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/documents",
        headers={**HEADERS, "Content-Type": "application/json", "Prefer": "return=representation"},
        json={
            "id": document_id,
            "user_id": user_id,
            "file_name": file_name,
            "file_path": storage_path,
            "file_size": os.path.getsize(sys.argv[1]),
            "mime_type": "application/pdf",
            "status": "pending",
        },
    )
    if resp.status_code >= 400:
        print(f"[WARN] Document insert: {resp.status_code} {resp.text}")
    else:
        print(f"[OK] Document row created: {document_id}")


def push_job(document_id: str, user_id: str, storage_path: str, file_name: str):
    """Push extraction job to Redis."""
    r = redis.from_url(REDIS_URL)
    job = {
        "documentId": document_id,
        "userId": user_id,
        "filePath": storage_path,
        "fileName": file_name,
    }
    r.lpush(QUEUE_KEY, json.dumps(job))
    print(f"[OK] Job pushed to {QUEUE_KEY}: {document_id}")


def wait_for_extraction(document_id: str, timeout: int = 120):
    """Poll extractions table until result appears."""
    print(f"[..] Waiting for extraction (timeout {timeout}s)...")
    start = time.time()
    while time.time() - start < timeout:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/extractions?document_id=eq.{document_id}&select=id,extraction_method,tables_count,images_count,created_at",
            headers=HEADERS,
        )
        data = resp.json()
        if data and len(data) > 0:
            ext = data[0]
            print(f"[OK] Extraction found!")
            print(f"     ID: {ext['id']}")
            print(f"     Method: {ext['extraction_method']}")
            print(f"     Tables: {ext['tables_count']}")
            print(f"     Images: {ext['images_count']}")
            print(f"     Created: {ext['created_at']}")
            return ext

        # Also check document status
        doc_resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/documents?id=eq.{document_id}&select=status,error_message",
            headers=HEADERS,
        )
        doc = doc_resp.json()
        if doc and doc[0].get("status") == "failed":
            print(f"[FAIL] Document failed: {doc[0].get('error_message')}")
            return None

        time.sleep(2)

    print("[TIMEOUT] No extraction found within timeout")
    return None


def check_raw_text(document_id: str):
    """Fetch and display raw_text preview."""
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/extractions?document_id=eq.{document_id}&select=raw_text",
        headers=HEADERS,
    )
    data = resp.json()
    if data:
        raw = data[0].get("raw_text", "")
        preview = raw[:500] if raw else "(empty)"
        print(f"\n[RAW TEXT PREVIEW] ({len(raw)} chars total)")
        print("-" * 60)
        print(preview)
        print("-" * 60)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python smoke_test.py <path_to_pdf>")
        sys.exit(1)

    pdf_path = sys.argv[1]
    if not os.path.exists(pdf_path):
        print(f"File not found: {pdf_path}")
        sys.exit(1)

    user_id = str(uuid.uuid4())
    document_id = str(uuid.uuid4())
    file_name = os.path.basename(pdf_path)

    print(f"\n=== KRATOS PDF Worker Smoke Test ===")
    print(f"PDF: {pdf_path}")
    print(f"Size: {os.path.getsize(pdf_path) / 1024 / 1024:.1f} MB")
    print(f"Document ID: {document_id}")
    print(f"User ID: {user_id}")
    print()

    storage_path = upload_pdf(pdf_path, user_id, document_id)
    create_document_row(document_id, user_id, file_name, storage_path)
    push_job(document_id, user_id, storage_path, file_name)

    print("\n[INFO] Now start the worker in another terminal:")
    print(f"  cd workers/pdf-worker && python -m src.tasks.extract_pdf")
    print("\nOr press Enter to wait for extraction (if worker is already running)...")

    # Auto-wait
    extraction = wait_for_extraction(document_id)
    if extraction:
        check_raw_text(document_id)
