#!/bin/bash
set -euo pipefail

# Only run in remote (Claude Code on the web) environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Run asynchronously (session starts while deps install in background)
echo '{"async": true, "asyncTimeout": 300000}'

cd "$CLAUDE_PROJECT_DIR"

# ── Node.js dependencies (pnpm workspaces + Turborepo) ──
pnpm install

# ── Python build tools (needed for native wheel builds) ──
pip install --ignore-installed wheel setuptools

# ── Python dependencies (pdf-worker) ──
pip install -r workers/pdf-worker/requirements.txt
