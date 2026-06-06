import os
from dotenv import load_dotenv

# Load .env before create_app so env vars are available to config.py
# (no-op if vars are already injected by the platform)
load_dotenv()

from app import create_app

app = create_app()
