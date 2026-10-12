# Option 1: Running from hexa-ai directory (Recommended)
cd hexa-ai
.\.venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Option 2: Running from root directory
.\hexa-ai\.venv\Scripts\activate
python -m uvicorn app.main:app --app-dir hexa-ai --reload --host 0.0.0.0 --port 8000