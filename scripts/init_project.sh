#!/bin/bash
# Script para inicializar um novo projeto KRATOS v2 a partir do template da skill

set -e

PROJECT_NAME=$1

if [ -z "$PROJECT_NAME" ]; then
  echo "Usage: $0 <project-name>"
  exit 1
fi

echo "🚀 Initializing KRATOS v2 project: $PROJECT_NAME"

# Copiar o template do monorepo
cp -r /home/ubuntu/skills/kratos-v2/templates/kratos-v2-monorepo /home/ubuntu/$PROJECT_NAME

# Limpar arquivos desnecessários
rm -rf /home/ubuntu/$PROJECT_NAME/.git

# Inicializar novo repositório Git
cd /home/ubuntu/$PROJECT_NAME
git init
git add .
git commit -m "Initial commit: KRATOS v2 project scaffold"

echo "✅ Project $PROJECT_NAME initialized successfully at /home/ubuntu/$PROJECT_NAME"
