# Cria o esqueleto de pastas do backend e do frontend do projeto.
# Não cria package.json, tsconfig.json, Dockerfile nem nenhum código —
# isso é feito manualmente nas próximas etapas do roadmap.
#
# Uso: .\scripts\create-structure.ps1   (execute a partir da raiz do repo)

$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $PSScriptRoot
Set-Location $RootDir

$BackendDirs = @(
    "backend/src/config",
    "backend/src/controllers",
    "backend/src/services",
    "backend/src/routes",
    "backend/src/middlewares",
    "backend/src/lib",
    "backend/src/types",
    "backend/prisma"
)

$FrontendDirs = @(
    "frontend/src/assets",
    "frontend/src/components",
    "frontend/src/pages",
    "frontend/src/hooks",
    "frontend/src/services",
    "frontend/src/routes",
    "frontend/src/types",
    "frontend/public"
)

Write-Host "Criando estrutura do backend..."
foreach ($dir in $BackendDirs) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    # .gitkeep garante que a pasta vazia seja versionada pelo git
    # (git não versiona diretórios vazios, só arquivos)
    New-Item -ItemType File -Force -Path "$dir/.gitkeep" | Out-Null
    Write-Host "  OK  $dir"
}

Write-Host "Criando estrutura do frontend..."
foreach ($dir in $FrontendDirs) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    New-Item -ItemType File -Force -Path "$dir/.gitkeep" | Out-Null
    Write-Host "  OK  $dir"
}

Write-Host "Estrutura criada com sucesso."
