@echo off
title Challenge Tracker server
cd /d "%~dp0"
call venv\Scripts\activate.bat
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --no-use-colors
pause