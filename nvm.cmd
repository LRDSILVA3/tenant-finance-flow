@echo off
if "%~1"=="use" (
    if "%~2"=="" (
        if exist .nvmrc (
            for /f "usebackq delims=" %%i in (.nvmrc) do (
                nvm.exe use %%i
                goto :eof
            )
        ) else (
            nvm.exe use
        )
    ) else (
        nvm.exe %*
    )
) else (
    nvm.exe %*
)
