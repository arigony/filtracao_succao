@echo off
setlocal
cd /d "%~dp0"
set "LAB_URL=http://127.0.0.1:4173/"

where py >nul 2>nul
if not errorlevel 1 goto use_py
where python >nul 2>nul
if not errorlevel 1 goto use_python

echo Nao foi encontrado Python no PATH.
echo Instale Python 3 ou execute npm run serve nesta pasta.
pause
exit /b 1

:use_py
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Milliseconds 900; Start-Process '%LAB_URL%'"
echo Laboratorio disponivel em %LAB_URL%
echo Feche esta janela para encerrar o servidor.
py -3 -m http.server 4173 --bind 127.0.0.1
exit /b

:use_python
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Milliseconds 900; Start-Process '%LAB_URL%'"
echo Laboratorio disponivel em %LAB_URL%
echo Feche esta janela para encerrar o servidor.
python -m http.server 4173 --bind 127.0.0.1
exit /b
