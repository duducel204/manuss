$ErrorActionPreference = "Stop"

$RawBase = "https://raw.githubusercontent.com/duducel204/manuss/90c3d4c3be17a404eb0e188396e5e6aacfe67fa8/windows"
$TempDir = Join-Path $env:TEMP "manuss-mcp-bootstrap"
$SetupFile = Join-Path $TempDir "setup_mcp.ps1"
$StartFile = Join-Path $TempDir "start_mcp.ps1"

New-Item -ItemType Directory -Force -Path $TempDir | Out-Null
Invoke-WebRequest -UseBasicParsing -Uri "$RawBase/setup_mcp.ps1" -OutFile $SetupFile
Invoke-WebRequest -UseBasicParsing -Uri "$RawBase/start_mcp.ps1" -OutFile $StartFile

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $SetupFile
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $StartFile
