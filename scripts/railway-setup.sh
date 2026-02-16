#!/bin/bash
# KRATOS v2 — Railway Deployment Setup Script
# Run after: railway login
# Usage: bash scripts/railway-setup.sh

set -euo pipefail

echo "=== KRATOS v2 Railway Setup ==="

# 1. Initialize project
echo ""
echo "Step 1: Initializing Railway project..."
railway init --name kratos-v2

# 2. Add Redis
echo ""
echo "Step 2: Adding Redis service..."
railway add --database redis

# 3. Display next steps (manual via dashboard)
echo ""
echo "=== MANUAL STEPS (Railway Dashboard) ==="
echo ""
echo "1. Go to https://railway.app/dashboard"
echo "2. Open the 'kratos-v2' project"
echo ""
echo "3. API Service (already created by init):"
echo "   - Source: GitHub repo fbmoulin/kratos-v2"
echo "   - Root Directory: / (monorepo root)"
echo "   - Builder: Dockerfile"
echo "   - Dockerfile Path: apps/api/Dockerfile"
echo "   - Watch Patterns: apps/api/**, packages/**"
echo ""
echo "4. Add PDF Worker Service:"
echo "   - New Service → GitHub Repo → fbmoulin/kratos-v2"
echo "   - Root Directory: workers/pdf-worker"
echo "   - Builder: Dockerfile"
echo "   - Dockerfile Path: Dockerfile"
echo "   - Watch Patterns: workers/pdf-worker/**"
echo "   - NO port, NO domain (background worker)"
echo ""
echo "5. Set environment variables (see below)"
echo ""
echo "=== API Service Variables ==="
cat <<'ENVBLOCK'
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://kratos-web.vercel.app
SUPABASE_URL=https://qxttfjlgqkfurxxrorfn.supabase.co
SUPABASE_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
DATABASE_URL=<your-supabase-postgres-connection-string>
REDIS_URL=${{Redis.REDIS_URL}}
ANTHROPIC_API_KEY=<your-key>
GEMINI_API_KEY=<your-key>
OPENAI_API_KEY=<your-key>
ENVBLOCK
echo ""
echo "=== PDF Worker Variables ==="
cat <<'ENVBLOCK'
REDIS_URL=${{Redis.REDIS_URL}}
DATABASE_URL=<your-supabase-postgres-connection-string>
SUPABASE_URL=https://qxttfjlgqkfurxxrorfn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
ENVBLOCK
echo ""
echo "=== Done! ==="
echo "After setting variables, deploy with:"
echo "  railway up --service api --detach"
echo "  railway up --service pdf-worker --detach"
echo ""
echo "Generate domain with:"
echo "  railway domain --service api"
echo ""
echo "Check health with:"
echo "  curl https://<your-domain>/v2/health"
