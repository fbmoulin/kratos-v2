#!/usr/bin/env python3
"""
Thin stdin/stdout wrapper around the PDF extraction pipeline.
Called by the Node.js Trigger.dev task via execa.

Input (stdin):  JSON: { documentId, filePath, userId }
Output (stdout): JSON: { status, rawText, tablesCount, pageCount, extractionMethod, contentJson }
                  or  { status: "failed", error: "..." }
"""
import json
import sys
import os
import logging

# Add pdf-worker src to path so we can import from it
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_WORKER_DIR = os.path.join(_SCRIPT_DIR, "..", "..", "..", "workers", "pdf-worker")
sys.path.insert(0, _WORKER_DIR)

# Suppress pipeline noise on stdout (only our JSON output should go there)
logging.basicConfig(level=logging.WARNING, stream=sys.stderr)

from src.pipeline import run_pipeline, PipelineError  # noqa: E402
from src.services import storage  # noqa: E402


def main() -> None:
    raw = sys.stdin.read()
    job = json.loads(raw)

    document_id = job["documentId"]
    file_path = job["filePath"]

    try:
        pdf_path = storage.download_pdf(file_path, document_id)
        result = run_pipeline(document_id, pdf_path)

        pages = [
            {"page": p.page_number, "text": p.text, "tables": p.tables_count}
            for p in result.pages
        ]

        print(json.dumps({
            "status": "completed",
            "rawText": result.raw_text,
            "tablesCount": result.metadata.total_tables,
            "pageCount": result.metadata.total_pages,
            "extractionMethod": result.metadata.extraction_method.value,
            "contentJson": {"pages": pages},
        }))

    except PipelineError as e:
        print(json.dumps({"status": "failed", "error": str(e)}))
        sys.exit(1)

    except Exception as e:
        print(json.dumps({"status": "failed", "error": f"Unexpected error: {str(e)}"}))
        sys.exit(1)

    finally:
        try:
            storage.cleanup_temp_file(document_id)
        except Exception:
            pass  # cleanup failure is non-fatal


if __name__ == "__main__":
    main()
