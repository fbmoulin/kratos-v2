#!/bin/bash
# Script para executar o pipeline de CI localmente

set -e

PROJECT_DIR=$1

if [ -z "$PROJECT_DIR" ]; then
  echo "Usage: $0 <project-directory>"
  exit 1
fi

cd $PROJECT_DIR

echo "🚀 Running local CI for KRATOS v2..."

# Instalar dependências
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

# Build
echo "🏗️ Building all packages..."
pnpm turbo build

# Lint
echo "🎨 Linting..."
pnpm turbo lint

# Testes
echo "🧪 Running tests..."
pnpm turbo test

echo "✅ Local CI pipeline completed successfully!"
