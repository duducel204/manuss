$ErrorActionPreference = "Stop"

$AppDir = Join-Path $env:LOCALAPPDATA "manuss-mcp"
$ServerFile = Join-Path $AppDir "mcp_server.py"
$TokenFile = Join-Path $env:APPDATA "termux-mcp\token"
$PythonPathFile = Join-Path $AppDir "python-path.txt"
$SetupFile = Join-Path $PSScriptRoot "setup_mcp.ps1"

if (-not (Test-Path $SetupFile)) {
  throw "setup_mcp.ps1 não foi encontrado. Baixe a pasta windows do repositório ou execute o bootstrap remoto documentado em windows/README.md."
}

if (-not (Test-Path $ServerFile) -or -not (Test-Path $TokenFile)) {
  Write-Host "Ponte ainda não instalada. Executando o setup..."
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $SetupFile
}

$pythonPath = $null
if (Test-Path $PythonPathFile) {
  $pythonPath = (Get-Content $PythonPathFile -Raw).Trim()
}
if (-not $pythonPath -or -not (Test-Path $pythonPath)) {
  $python = Get-Command py -ErrorAction SilentlyContinue
  if ($python) {
    $pythonPath = $python.Source
    $pythonArgs = @("-3", $ServerFile)
  } else {
    $python = Get-Command python -ErrorAction SilentlyContinue
    if ($python -and $python.Source -notlike "*WindowsApps*python.exe") {
      $pythonPath = $python.Source
      $pythonArgs = @($ServerFile)
    }
  }
} 

if (-not $pythonPath -or -not (Test-Path $pythonPath)) {
  throw "Python não está disponível. Feche e abra o PowerShell, ou execute novamente o setup após instalar Python."
}
if (-not $pythonArgs) { $pythonArgs = @($ServerFile) }
if (-not (Test-Path $ServerFile)) { throw "Servidor MCP não encontrado após a instalação." }
if (-not (Test-Path $TokenFile)) { throw "Token MCP não encontrado após a instalação." }

$env:TERMUX_MCP_TOKEN_FILE = $TokenFile
$env:TERMUX_MCP_SHELL = (Get-Command powershell.exe).Source
$env:TERMUX_MCP_SHELL_MODE = "powershell"

Write-Host "MCP local ativo em http://127.0.0.1:8765/mcp"
Write-Host "Health: http://127.0.0.1:8765/health"
Write-Host "Header: Authorization: Bearer $([IO.File]::ReadAllText($TokenFile).Trim())"
Write-Host "Mantenha esta janela aberta. Ctrl+C encerra a ponte."

& $pythonPath @pythonArgs
