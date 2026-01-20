@echo off
echo.
echo ================================================
echo    CYBERAGIESX COGNITIVE FIREWALL PLATFORM
echo ================================================
echo.
echo Starting CyberAgiesX Platform...
echo.

start "" "prototypes\neuroshield_platform.html"
echo ✅ Main Platform launched!
echo.
timeout /t 2 /nobreak >nul

start "" "prototypes\security_scanner.html"
echo ✅ Security Scanner launched!
echo.
timeout /t 2 /nobreak >nul

start "" "prototypes\neuroshield_mobile.html"
echo ✅ Mobile Interface launched!
echo.

echo ================================================
echo    ALL COMPONENTS LAUNCHED SUCCESSFULLY!
echo ================================================
echo.
echo Your browser should now show all CyberAgiesX components.
echo Press any key to close this window...
pause >nul

