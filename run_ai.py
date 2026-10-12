"""
Root launcher for HEXA AI Chatbot Backend.
Allows running the AI service directly from the project root:
    python run_ai.py
"""
import sys
from pathlib import Path
import uvicorn

ROOT_DIR = Path(__file__).resolve().parent
AI_DIR = ROOT_DIR / "hexa-ai"

if str(AI_DIR) not in sys.path:
    sys.path.insert(0, str(AI_DIR))

from app.config import get_settings

if __name__ == "__main__":
    settings = get_settings()
    print(f"Starting HEXA AI Chatbot Backend on port {settings.port}...")
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=True,
        app_dir=str(AI_DIR),
    )
