@echo off
set /p COMMIT_MSG="Mensagem do commit (padrão: 'Atualização automática'): "
if "%COMMIT_MSG%"=="" set COMMIT_MSG=Atualização automática

echo.
echo Atualizando repositório no GitHub...
git add .
git commit -m "%COMMIT_MSG%"
git push origin main

echo.
echo ✅ Deploy concluído! O GitHub Pages vai atualizar em alguns minutos.
pause