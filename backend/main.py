"""
backend/main.py — Entrypoint for Kinetica FastAPI Production Server
"""

import sys
from pathlib import Path

# Ensure root dir is in sys.path
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from edge_gateway import app

if __name__ == "__main__":
    import uvicorn
    print("[Kinetica Backend] Starting FastAPI Edge Gateway on http://127.0.0.1:8000 ...")
    uvicorn.run("edge_gateway:app", host="0.0.0.0", port=8000, reload=False)
