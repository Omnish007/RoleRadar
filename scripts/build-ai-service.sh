#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AI_ROOT="$ROOT/apps/ai-service"
PYTHON="$AI_ROOT/.venv/bin/python"
OUT="$ROOT/apps/desktop/sidecar/ai-service"
if [[ ! -x "$PYTHON" ]]; then
  echo "AI build requires apps/ai-service/.venv. Create it and install apps/ai-service/requirements.txt first." >&2
  exit 1
fi
rm -rf "$OUT"
mkdir -p "$OUT" "$ROOT/.build/pyinstaller"
"$PYTHON" -m PyInstaller --noconfirm --clean --onedir \
  --name roleradar-ai --distpath "$OUT" \
  --workpath "$ROOT/.build/pyinstaller/work" \
  --specpath "$ROOT/.build/pyinstaller" \
  --paths "$AI_ROOT" \
  --collect-all fastapi --collect-all uvicorn --collect-all pydantic \
  --collect-all httpx --collect-all dotenv --collect-all pydantic_core \
  --collect-all langgraph --collect-all langgraph.checkpoint --collect-all langchain_core \
  --hidden-import app.main --hidden-import app.graph --hidden-import app.schemas \
  "$AI_ROOT/run.py"
BINARY="$OUT/roleradar-ai/roleradar-ai"
if [[ ! -x "$BINARY" ]]; then
  echo "PyInstaller did not produce the expected AI runtime: $BINARY" >&2
  exit 1
fi
echo "Built local AI service: $BINARY"
