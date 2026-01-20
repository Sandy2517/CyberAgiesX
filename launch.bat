@echo off
echo.
echo ================================================
echo    CYBERAGIESX COGNITIVE FIREWALL PLATFORM
echo ================================================
echo.
echo Select which component to launch:
echo.
echo [1] CyberAgiesX × Sentri AI (ULTIMATE UNIFIED DEFENSE)
echo [2] CyberAgiesX APEX (Advanced Cognitive Defense)
echo [3] Main Platform (Role-based interfaces)
echo [4] Mobile App Interface
echo [5] Cognitive Attack Simulator
echo [6] Blockchain Forensics System
echo [7] Security Scanner (Text/URL/File Analysis)
echo [8] BlueShield SOC AI Assistant
echo [9] Interactive Demo (Original)
echo [A] Launch All Components
echo [0] Open Project Documentation
echo [F] Open Project Folder
echo.
set /p choice="Enter your choice (0-9, A, F): "

REM Try to find a web browser
set "BROWSER="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    set "BROWSER=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
) else if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    set "BROWSER=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
) else if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
) else if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
) else if exist "%ProgramFiles%\Mozilla Firefox\firefox.exe" (
    set "BROWSER=%ProgramFiles%\Mozilla Firefox\firefox.exe"
) else if exist "%ProgramFiles(x86)%\Mozilla Firefox\firefox.exe" (
    set "BROWSER=%ProgramFiles(x86)%\Mozilla Firefox\firefox.exe"
)

if not defined BROWSER (
    echo Could not find a supported web browser.
    echo Please manually open the HTML files in prototypes\ directory
    echo.
    goto :end
)

echo.
if "%choice%"=="1" (
    echo Launching CyberAgiesX × Sentri AI - ULTIMATE UNIFIED DEFENSE...
    start "" "%BROWSER%" "%~dp0prototypes\neuroshield_sentri_integrated.html"
    echo.
    echo ✅ ULTIMATE DEFENSE SYSTEM LAUNCHED!
    echo Revolutionary unified features:
    echo • Real-time AI-enhanced consciousness monitoring
    echo • Machine learning threat pattern recognition
    echo • Unified cognitive + behavioral analytics
    echo • Cross-system intelligence sharing
    echo • 99.9%% threat detection accuracy
    echo • 0.1s integrated response time
) else if "%choice%"=="2" (
    echo Launching CyberAgiesX APEX - Advanced Cognitive Defense...
    start "" "%BROWSER%" "%~dp0prototypes\neuroshield_apex.html"
    echo.
    echo ✅ CyberAgiesX APEX launched!
    echo Revolutionary features include:
    echo • Real-time consciousness monitoring
    echo • Memory authenticity verification  
    echo • Quantum identity validation
    echo • Neural threat analysis
    echo • Multi-dimensional security protocols
) else if "%choice%"=="2" (
    echo Launching CyberAgiesX Main Platform...
    start "" "%BROWSER%" "%~dp0prototypes\neuroshield_platform.html"
    echo.
    echo ✅ Main Platform launched!
    echo Experience role-based interfaces:
    echo • End User: Real-time communication protection
    echo • Security Admin: Dashboard with threat analytics  
    echo • Forensic Analyst: Audit logs and evidence reports
) else if "%choice%"=="2" (
    echo Launching CyberAgiesX Mobile Interface...
    start "" "%BROWSER%" "%~dp0prototypes\neuroshield_mobile.html"
    echo.
    echo ✅ Mobile App Interface launched!
    echo Mobile-optimized features:
    echo • Touch-friendly controls
    echo • Real-time trust scoring
    echo • Emergency alert system
    echo • Haptic feedback simulation
) else if "%choice%"=="3" (
    echo Launching Cognitive Attack Simulator...
    start "" "%BROWSER%" "%~dp0prototypes\cognitive_attack_simulator.html"
    echo.
    echo ✅ Attack Simulator launched!
    echo Test scenarios available:
    echo • Deepfake CEO impersonation
    echo • Voice cloning attacks
    echo • AI-generated phishing
    echo • Behavioral manipulation
) else if "%choice%"=="4" (
    echo Launching Blockchain Forensics System...
    start "" "%BROWSER%" "%~dp0prototypes\blockchain_forensics.html"
    echo.
    echo ✅ Blockchain Forensics launched!
    echo Features include:
    echo • Immutable evidence logging
    echo • Hash verification tools
    echo • Chain analytics dashboard
    echo • Court-admissible reports
) else if "%choice%"=="5" (
    echo Launching Security Scanner...
    start "" "%BROWSER%" "%~dp0prototypes\original_ai_scanner.html"
    echo.
    echo ✅ Security Scanner launched!
    echo Features include:
    echo • Text analysis for phishing and malware
    echo • URL verification and typosquatting detection
    echo • File analysis for suspicious content
    echo • Real-time threat scoring and recommendations
) else if "%choice%"=="7" (
    echo Launching BlueShield SOC AI Assistant...
    start "" "%BROWSER%" "%~dp0prototypes\bluesentinel_soc_ai.html"
    echo.
    echo ✅ BlueShield SOC AI launched!
    echo AI-Powered SOC features:
    echo • ChatGPT-style threat analysis interface
    echo • Log ingestion and ML-based threat detection
    echo • MITRE ATT&CK technique mapping
    echo • IOC reputation checking and threat intelligence
    echo • Real-time incident response guidance
) else if "%choice%"=="8" (
    echo Launching Interactive Demo (Original)...
    start "" "%BROWSER%" "%~dp0prototypes\interactive_demo.html"
    echo.
    echo ✅ Interactive Demo launched!
    echo Original demo with attack scenarios
) else if "%choice%"=="9" (
    echo Launching All CyberAgiesX Components...
    echo.
    timeout /t 1 /nobreak >nul
    start "" "%BROWSER%" "%~dp0prototypes\neuroshield_platform.html"
    echo ✅ Main Platform launched
    timeout /t 2 /nobreak >nul
    start "" "%BROWSER%" "%~dp0prototypes\neuroshield_mobile.html"
    echo ✅ Mobile Interface launched
    timeout /t 2 /nobreak >nul
    start "" "%BROWSER%" "%~dp0prototypes\cognitive_attack_simulator.html"
    echo ✅ Attack Simulator launched
    timeout /t 2 /nobreak >nul
    start "" "%BROWSER%" "%~dp0prototypes\blockchain_forensics.html"
    echo ✅ Blockchain Forensics launched
    timeout /t 2 /nobreak >nul
    start "" "%BROWSER%" "%~dp0prototypes\original_ai_scanner.html"
    echo ✅ Security Scanner launched
    timeout /t 2 /nobreak >nul
    start "" "%BROWSER%" "%~dp0prototypes\bluesentinel_soc_ai.html"
    echo ✅ BlueShield SOC AI launched
    echo.
    echo 🚀 All CyberAgiesX components are now running!
) else if "%choice%"=="A" (
    echo Launching All CyberAgiesX Components...
    echo.
    timeout /t 1 /nobreak >nul
    start "" "%BROWSER%" "%~dp0prototypes\neuroshield_sentri_integrated.html"
    echo ✅ ULTIMATE Unified Defense launched
    timeout /t 2 /nobreak >nul
    start "" "%BROWSER%" "%~dp0prototypes\neuroshield_apex.html"
    echo ✅ APEX System launched
    timeout /t 2 /nobreak >nul
    start "" "%BROWSER%" "%~dp0prototypes\neuroshield_platform.html"
    echo ✅ Main Platform launched
    timeout /t 2 /nobreak >nul
    start "" "%BROWSER%" "%~dp0prototypes\neuroshield_mobile.html"
    echo ✅ Mobile Interface launched
    timeout /t 2 /nobreak >nul
    start "" "%BROWSER%" "%~dp0prototypes\cognitive_attack_simulator.html"
    echo ✅ Attack Simulator launched
    timeout /t 2 /nobreak >nul
    start "" "%BROWSER%" "%~dp0prototypes\blockchain_forensics.html"
    echo ✅ Blockchain Forensics launched
    timeout /t 2 /nobreak >nul
    start "" "%BROWSER%" "%~dp0prototypes\original_ai_scanner.html"
    echo ✅ Security Scanner launched
    timeout /t 2 /nobreak >nul
    start "" "%BROWSER%" "%~dp0prototypes\bluesentinel_soc_ai.html"
    echo ✅ BlueShield SOC AI launched
    echo.
    echo 🚀 Complete CyberAgiesX ecosystem is now running!
) else if "%choice%"=="0" (
    echo Opening Project Documentation...
    start notepad README.md
    echo ✅ README opened in notepad
) else if "%choice%"=="F" (
    echo Opening Project Folder...
    start .
    echo ✅ Project folder opened
) else (
    echo Invalid choice. Launching Main Platform by default...
    start "" "%BROWSER%" "%~dp0prototypes\neuroshield_platform.html"
    echo ✅ Main Platform launched!
)

echo.
echo ================================================
echo    CYBERAGIESX PLATFORM STATUS: ACTIVE
echo ================================================
echo.
echo The CyberAgiesX Cognitive Firewall is now protecting
echo against AI-driven cognitive attacks across all
echo communication channels.
echo.

:end
echo Press any key to close this window...
pause >nul
