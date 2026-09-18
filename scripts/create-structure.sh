#!/usr/bin/env bash
#
# Cria o esqueleto de pastas do backend e do frontend do projeto.
# Não cria package.json, tsconfig.json, Dockerfile nem nenhum código —
# isso é feito manualmente nas próximas etapas do roadmap.
#
# Uso: ./scripts/create-structure.sh   (execute a partir da raiz do repo)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

BACKEND_DIRS=(
  "backend/src/config"
  "backend/src/controllers"
  "backend/src/services"
  "backend/src/routes"
  "backend/src/middlewares"
  "backend/src/lib"
  "backend/src/types"
  "backend/prisma"
)

FRONTEND_DIRS=(
  "frontend/src/assets"
  "frontend/src/components"
  "frontend/src/pages"
  "frontend/src/hooks"
  "frontend/src/services"
  "frontend/src/routes"
  "frontend/src/types"
  "frontend/public"
)

echo "Criando estrutura do backend..."
for dir in "${BACKEND_DIRS[@]}"; do
  mkdir -p "$dir"
  # .gitkeep garante que a pasta vazia seja versionada pelo git
  # (git não versiona diretórios vazios, só arquivos)
  touch "$dir/.gitkeep"
  echo "  OK  $dir"
done

echo "Criando estrutura do frontend..."
for dir in "${FRONTEND_DIRS[@]}"; do
  mkdir -p "$dir"
  touch "$dir/.gitkeep"
  echo "  OK  $dir"
done

echo "Estrutura criada com sucesso."
